import React, { useEffect, useState } from "react";
import { X, FileText, Shield, Lock, ChevronRight } from "lucide-react";
import { settingsService } from "../../services/settingsService";

interface TermsModalProps {
  onClose: () => void;
  initialTab?: "terms_and_conditions" | "disclaimer" | "privacy_policy";
}

type TabKey = "terms_and_conditions" | "disclaimer" | "privacy_policy";
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "terms_and_conditions", label: "Terms & Conditions", icon: <FileText size={14} /> },
  { key: "disclaimer",           label: "Disclaimer",         icon: <Shield size={14} /> },
  { key: "privacy_policy",       label: "Privacy Policy",     icon: <Lock size={14} /> },
];

const TermsModal: React.FC<TermsModalProps> = ({ onClose, initialTab = "terms_and_conditions" }) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [contents, setContents] = useState<Record<TabKey, string>>({
    terms_and_conditions: "", disclaimer: "", privacy_policy: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      settingsService.get("terms_and_conditions"),
      settingsService.get("disclaimer"),
      settingsService.get("privacy_policy"),
    ]).then(([t, d, p]) => {
      setContents({ terms_and_conditions: t, disclaimer: d, privacy_policy: p });
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Terms, Policies & Disclaimer</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                activeTab === tab.key
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="text-center text-slate-400 py-10 text-sm">Loading...</div>
          ) : contents[activeTab] ? (
            <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
              {contents[activeTab]}
            </pre>
          ) : (
            <div className="text-center text-slate-400 py-10 text-sm italic">
              No {TABS.find(t => t.key === activeTab)?.label} has been set yet.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
