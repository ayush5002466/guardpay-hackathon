# GuardPay AI: Secure Agentic Commerce

GuardPay AI is the missing trust layer for the AI shopping era. It prevents autonomous AI agents from overspending by enforcing strict, deterministic policy rules before executing payments via the PayPal API.

## Features
- **Deterministic Policy Engine:** AI agents can only propose purchases. Our Python backend checks the price against a hardcoded budget.
- **PayPal Orders v2 Integration:** If the purchase is within budget, the backend securely creates a PayPal checkout link using OAuth Sandbox credentials.
- **Human-in-the-Loop:** High-value purchases are blocked and queued for 1-tap human approval.

## Tech Stack
- **Frontend:** React, Tailwind CSS, AG Grid (Hosted on Bolt.new)
- **Backend:** Python, FastAPI, HTTPX, PayPal REST API

## How to Run the Backend
1. Navigate to the `backend` folder.
2. Install dependencies: `pip install -r requirements.txt`
3. Add your PayPal Sandbox credentials to a `.env` file (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`).
4. Run the server: `uvicorn main:app --reload`
5. The API will be live at `http://127.0.0.1:8000/docs`.

## Links
- **Live UI Demo:** https://guardpay-ai-purchase-3g2v.bolt.host
- **Video Demo:** [INSERT YOUR YOUTUBE LINK HERE LATER]
