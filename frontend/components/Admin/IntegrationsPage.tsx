import React, { useState, useEffect } from "react";
import { Plug, Eye, EyeOff, Save, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { settingsService } from "../../services/settingsService";
import { toast } from "sonner";

const IntegrationsPage: React.FC = () => {
  const [token, setToken] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await settingsService.getRaw("gstverify_api_key");
        setIsConfigured(res.configured ?? false);
        setToken("");
      } catch {
        toast.error("Failed to load integration settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!token.trim()) {
      toast.error("Token cannot be empty");
      return;
    }
    setSaving(true);
    try {
      await settingsService.save("gstverify_api_key", token.trim());
      setIsConfigured(true);
      setToken("");
      toast.success("GSTVerify API key saved");
    } catch {
      toast.error("Failed to save token");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await settingsService.save("gstverify_api_key", "");
      setIsConfigured(false);
      setToken("");
      toast.success("GSTVerify API key removed");
    } catch {
      toast.error("Failed to remove token");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Integrations</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure third-party API tokens used by the platform
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Plug size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">GSTVerify.co.in API</h3>
                {loading ? (
                  <Loader2 size={12} className="animate-spin text-slate-300" />
                ) : isConfigured ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    <XCircle size={10} /> Not configured
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Used for GST verification when adding / editing distributors
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Status note */}
            {isConfigured && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <span>
                  A token is currently active. To replace it, enter a new token below and save.
                  To disable verification, click <strong>Remove Token</strong>.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder={isConfigured ? "Enter new API key to replace existing" : "Paste your GSTVerify x-api-key"}
                  className="w-full pr-10 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Get your key from{" "}
                <span className="font-mono text-indigo-500">gstverify.co.in → Dashboard</span>
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !token.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-sm"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Token
              </button>
              {isConfigured && (
                <button
                  onClick={handleClear}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-red-500 border border-red-200 rounded-xl text-sm font-bold hover:bg-red-50 disabled:opacity-40 transition-all"
                >
                  Remove Token
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;
