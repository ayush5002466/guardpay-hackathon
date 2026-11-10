import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Settings = {
  id: string;
  max_budget: number;
  updated_at: string;
};

export type AllowedMerchant = {
  id: string;
  name: string;
  category: string;
  created_at: string;
};

export type ProposalStatus = "Approved" | "Blocked" | "Pending";

export type PurchaseProposal = {
  id: string;
  item: string;
  price: number;
  merchant: string;
  status: ProposalStatus;
  reason: string | null;
  created_at: string;
};
