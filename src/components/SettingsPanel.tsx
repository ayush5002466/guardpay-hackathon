import { useEffect, useState } from "react";
import { ShieldCheck, Plus, X, Save, Loader2 } from "lucide-react";
import { supabase, type Settings, type AllowedMerchant } from "@/lib/supabase";

type Props = {
  settings: Settings | null;
  merchants: AllowedMerchant[];
  onSettingsUpdated: (s: Settings) => void;
  onMerchantsUpdated: (m: AllowedMerchant[]) => void;
};

export default function SettingsPanel({ settings, merchants, onSettingsUpdated, onMerchantsUpdated }: Props) {
  const [budgetInput, setBudgetInput] = useState("");
  const [newMerchant, setNewMerchant] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [savingBudget, setSavingBudget] = useState(false);
  const [addingMerchant, setAddingMerchant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (settings) setBudgetInput(String(settings.max_budget));
  }, [settings]);

  const handleSaveBudget = async () => {
    const value = parseFloat(budgetInput);
    if (isNaN(value) || value <= 0) {
      setError("Enter a valid positive number for the budget.");
      return;
    }
    setSavingBudget(true);
    setError(null);
    if (!settings) {
      const { data, error: insertError } = await supabase
        .from("guardpay_settings")
        .insert({ max_budget: value })
        .select()
        .single();
      if (insertError) {
        setError(insertError.message);
        setSavingBudget(false);
        return;
      }
      onSettingsUpdated(data as Settings);
    } else {
      const { data, error: updateError } = await supabase
        .from("guardpay_settings")
        .update({ max_budget: value, updated_at: new Date().toISOString() })
        .eq("id", settings.id)
        .select()
        .single();
      if (updateError) {
        setError(updateError.message);
        setSavingBudget(false);
        return;
      }
      onSettingsUpdated(data as Settings);
    }
    setSavingBudget(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const handleAddMerchant = async () => {
    const name = newMerchant.trim();
    if (!name) return;
    setAddingMerchant(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("allowed_merchants")
      .insert({ name, category: newCategory })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      setAddingMerchant(false);
      return;
    }
    onMerchantsUpdated([...merchants, data as AllowedMerchant]);
    setNewMerchant("");
    setNewCategory("General");
    setAddingMerchant(false);
  };

  const handleRemoveMerchant = async (id: string) => {
    const { error: deleteError } = await supabase
      .from("allowed_merchants")
      .delete()
      .eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onMerchantsUpdated(merchants.filter((m) => m.id !== id));
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Settings</h2>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Max Budget */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Max Budget</label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-600/50 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50 transition"
              placeholder="5000"
            />
          </div>
          <button
            onClick={handleSaveBudget}
            disabled={savingBudget}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {savingBudget ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savedFlash ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Allowed Merchants */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Allowed Merchants</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {merchants.length === 0 && (
            <p className="text-sm text-slate-500 italic">No merchants added yet.</p>
          )}
          {merchants.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-2 bg-slate-800 border border-slate-600/40 rounded-full pl-3 pr-1.5 py-1.5 text-sm text-slate-200 group"
            >
              <span className="text-emerald-400 text-xs">{m.category}</span>
              {m.name}
              <button
                onClick={() => handleRemoveMerchant(m.id)}
                className="ml-0.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMerchant}
            onChange={(e) => setNewMerchant(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddMerchant()}
            className="flex-1 bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-500/50 transition"
            placeholder="Add merchant name..."
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/60 transition"
          >
            <option>General</option>
            <option>Electronics</option>
            <option>Office</option>
            <option>Software</option>
            <option>Travel</option>
          </select>
          <button
            onClick={handleAddMerchant}
            disabled={addingMerchant || !newMerchant.trim()}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white text-sm font-medium px-3 py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
