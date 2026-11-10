import os
import uuid
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="GuardPay AI Backend",
    version="1.0.0",
    description="Deterministic policy enforcement and payment execution layer for autonomous AI agents."
)

# ==========================================
# CONSTANTS & CONFIGURATION
# ==========================================
MAX_BUDGET: float = 100.00
PAYPAL_SANDBOX_BASE = "https://api-m.sandbox.paypal.com"
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "YOUR_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "YOUR_CLIENT_SECRET")

# In-memory store for blocked transactions pending human review
pending_approvals: Dict[str, Dict[str, Any]] = {}


# ==========================================
# REQUEST / RESPONSE SCHEMAS
# ==========================================
class PurchaseProposalRequest(BaseModel):
    item_name: str = Field(..., example="Developer Tool Subscription")
    price: float = Field(..., gt=0, example=49.99)
    merchant: str = Field(..., example="GitHub")


class PurchaseProposalResponse(BaseModel):
    status: str
    message: str
    pending_approval_id: Optional[str] = None
    order_id: Optional[str] = None
    approval_link: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ==========================================
# PAYPAL REST API V2 INTEGRATION
# ==========================================
async def get_paypal_access_token() -> str:
    """Fetches an OAuth2 Bearer token from PayPal Sandbox using client credentials."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{PAYPAL_SANDBOX_BASE}/v1/oauth2/token",
                data={"grant_type": "client_credentials"},
                auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
                headers={"Accept": "application/json", "Accept-Language": "en_US"},
                timeout=10.0,
            )
            response.raise_for_status()
            return response.json()["access_token"]
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"PayPal Authentication failed: {e.response.text}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error communicating with PayPal: {str(e)}"
            )


async def create_paypal_order(amount: float, currency: str = "USD") -> Dict[str, str]:
    """Creates an Order in PayPal Sandbox using the Orders v2 REST API."""
    access_token = await get_paypal_access_token()

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}",
    }

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": currency,
                    "value": f"{amount:.2f}",
                }
            }
        ],
        "application_context": {
            "return_url": "https://example.com/payment/success",
            "cancel_url": "https://example.com/payment/cancel",
            "user_action": "PAY_NOW"
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{PAYPAL_SANDBOX_BASE}/v2/checkout/orders",
                headers=headers,
                json=payload,
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

            order_id = data["id"]
            
            # Extract the approval URL link for customer/agent redirect
            approval_link = next(
                (link["href"] for link in data.get("links", []) if link["rel"] == "approve"),
                None
            )

            if not approval_link:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="PayPal did not return an approval link."
                )

            return {
                "order_id": order_id,
                "approval_link": approval_link
            }

        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"PayPal Order Creation failed: {e.response.text}"
            )


# ==========================================
# ENDPOINTS
# ==========================================
@app.post(
    "/propose-purchase",
    response_model=PurchaseProposalResponse,
    status_code=status.HTTP_200_OK
)
async def propose_purchase(purchase: PurchaseProposalRequest):
    """
    Evaluates an AI agent's purchase request against a hardcoded policy.
    """
    # Deterministic Guardrail Check (Independent of LLM output)
    if purchase.price > MAX_BUDGET:
        pending_id = str(uuid.uuid4())
        
        pending_approvals[pending_id] = {
            "id": pending_id,
            "item_name": purchase.item_name,
            "price": purchase.price,
            "merchant": purchase.merchant,
            "status": "PENDING_HUMAN_APPROVAL"
        }

        return PurchaseProposalResponse(
            status="BLOCKED",
            message=f"Budget exceeded. Limit is ${MAX_BUDGET:.2f}, but requested amount is ${purchase.price:.2f}.",
            pending_approval_id=pending_id,
            details=pending_approvals[pending_id]
        )

    # Within Budget Policy: Execute PayPal Order Creation
    order_data = await create_paypal_order(amount=purchase.price)

    return PurchaseProposalResponse(
        status="APPROVED",
        message="Purchase authorized by GuardPay policy engine.",
        order_id=order_data["order_id"],
        approval_link=order_data["approval_link"]
    )


@app.get("/pending-approvals", tags=["Admin"])
async def list_pending_approvals():
    """Returns all blocked transactions waiting for human escalation."""
    return {"pending_approvals": list(pending_approvals.values())}
