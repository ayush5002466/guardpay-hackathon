import { useEffect, useState, useCallback, useMemo } from "react";
import { ShieldCheck, TrendingUp, TrendingDown, Clock, Bot } from "lucide-react";
import { supabase, type Settings, type AllowedMerchant, type PurchaseProposal } from "@/lib/supabase";
import SettingsPanel from "./SettingsPanel";
import ProposalsGrid, { computeStatus } from "./ProposalsGrid";

export default function Dashboard() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [merchants, setMerchants] = useState<AllowedMerchant[]>([]);
  const [proposals, setProposals] = useState<PurchaseProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [settingsRes, merchantsRes, proposalsRes] = await Promise.all([
      supabase.from("guardpay_settings").select("*").maybeSingle(),
      supabase.from("allowed_merchants").select("*").order("name"),
      supabase.from("purchase_proposals").select("*").order("created_at", { ascending: false }),
    ]);

    if (settingsRes.error || merchantsRes.error || proposalsRes.error) {
      setError("Could not load data from the database.");
      setLoading(false);
      return;
    }

    setSettings(settingsRes.data as Settings | null);
    setMerchants(merchantsRes.data as AllowedMerchant[]);
    setProposals(proposalsRes.data as PurchaseProposal[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const maxBudget = settings?.max_budget ?? 0;

  const evaluatedProposals = useMemo(
    () =>
      proposals.map((p) => ({
        ...p,
        status: computeStatus(p.price, maxBudget),
        reason: Number(p.price) > maxBudget ? "Exceeds max budget" : "Within budget",
      })),
    [proposals, maxBudget]
  );

  const stats = useMemo(
    () => ({
      approved: evaluatedProposals.filter((p) => p.status === "Approved").length,
      blocked: evaluatedProposals.filter((p) => p.status === "Blocked").length,
      total: evaluatedProposals.length,
    }),
    [evaluatedProposals]
  );

  const totalSpend = useMemo(
    () =>
      evaluatedProposals
        .filter((p) => p.status === "Approved")
        .reduce((sum, p) => sum + Number(p.price), 0),
    [evaluatedProposals]
  );

  const handleBudgetSaved = async (newBudget: number) => {
    await Promise.all(
      proposals.map((p) => {
        const status = computeStatus(p.price, newBudget);
        const reason = Number(p.price) > newBudget ? "Exceeds max budget" : "Within budget";
        return supabase
          .from("purchase_proposals")
          .update({ status, reason })
          .eq("id", p.id);
      })
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400 animate-pulse">Loading GuardPay AI...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">GuardPay AI</h1>
              <p className="text-xs text-slate-500">AI Purchasing Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Guardrails Active</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Approved"
            value={stats.approved}
            subValue={`$${totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`}
            color="emerald"
          />
          <StatCard
            icon={<TrendingDown className="w-5 h-5" />}
            label="Blocked"
            value={stats.blocked}
            subValue="Exceeds max budget"
            color="red"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Max Budget"
            value={`$${maxBudget.toLocaleString("en-US")}`}
            subValue={`${merchants.length} allowed merchants`}
            color="blue"
          />
          <StatCard
            icon={<ShieldCheck className="w-5 h-5" />}
            label="Total Proposals"
            value={stats.total}
            subValue="All tracked items"
            color="amber"
          />
        </div>

        {/* Settings + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SettingsPanel
              settings={settings}
              merchants={merchants}
              onSettingsUpdated={setSettings}
              onMerchantsUpdated={setMerchants}
              onBudgetSaved={handleBudgetSaved}
            />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-semibold text-white">AI Purchase Proposals</h2>
                <span className="text-xs text-slate-500">{stats.total} proposals</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <ProposalsGrid proposals={proposals} maxBudget={maxBudget} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue: string;
  color: "emerald" | "red" | "amber" | "blue";
}) {
  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 transition-all hover:border-slate-600/60 hover:bg-slate-900/80">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{subValue}</div>
    </div>
  );
}
