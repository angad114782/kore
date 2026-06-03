import React, { useState, useEffect } from "react";
import { FileText, Save, Loader2, CheckCircle2, Shield, Lock } from "lucide-react";
import { settingsService } from "../../services/settingsService";
import { toast } from "sonner";

type DocKey = "terms_and_conditions" | "disclaimer" | "privacy_policy";

const DOCS: { key: DocKey; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    key: "terms_and_conditions",
    label: "Terms & Conditions",
    icon: <FileText size={18} />,
    desc: "Purchase terms, delivery conditions, return policy, payment terms etc.",
  },
  {
    key: "disclaimer",
    label: "Disclaimer",
    icon: <Shield size={18} />,
    desc: "Liability disclaimer, product information accuracy etc.",
  },
  {
    key: "privacy_policy",
    label: "Privacy Policy",
    icon: <Lock size={18} />,
    desc: "How distributor data is collected, stored and used.",
  },
];

const TermsPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState<DocKey>("terms_and_conditions");
  const [contents, setContents] = useState<Record<DocKey, string>>({
    terms_and_conditions: "",
    disclaimer: "",
    privacy_policy: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, d, p] = await Promise.all([
          settingsService.get("terms_and_conditions"),
          settingsService.get("disclaimer"),
          settingsService.get("privacy_policy"),
        ]);
        setContents({ terms_and_conditions: t, disclaimer: d, privacy_policy: p });
      } catch {
        toast.error("Failed to load documents");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.save(activeKey, contents[activeKey]);
      toast.success(`${DOCS.find(d => d.key === activeKey)?.label} saved`);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const activeDoc = DOCS.find(d => d.key === activeKey)!;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Terms & Policies</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Distributors must accept these at checkout · shown before every order
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="space-y-2">
          {DOCS.map(doc => (
            <button
              key={doc.key}
              onClick={() => setActiveKey(doc.key)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                activeKey === doc.key
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {doc.icon}
                {doc.label}
              </div>
              <p className={`text-[10px] leading-relaxed ${activeKey === doc.key ? "text-indigo-200" : "text-slate-400"}`}>
                {doc.desc}
              </p>
              {contents[doc.key] && (
                <div className={`flex items-center gap-1 mt-2 text-[9px] font-bold ${activeKey === doc.key ? "text-indigo-200" : "text-emerald-600"}`}>
                  <CheckCircle2 size={10} /> Content saved
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">{activeDoc.icon}</div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{activeDoc.label}</h3>
                <p className="text-[10px] text-slate-400">{activeDoc.desc}</p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-slate-300" size={28} />
              </div>
            ) : (
              <textarea
                value={contents[activeKey]}
                onChange={e => setContents(prev => ({ ...prev, [activeKey]: e.target.value }))}
                placeholder={`Write your ${activeDoc.label} here...\n\nYou can use plain text or simple formatting:\n• Use line breaks for paragraphs\n• Start lines with • for bullet points\n• Use CAPS for headings`}
                className="w-full h-[480px] p-5 text-sm text-slate-700 outline-none resize-none leading-relaxed font-mono"
              />
            )}

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] text-slate-400">
                {contents[activeKey].length} characters · Plain text format
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
