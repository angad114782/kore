import React, { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Search } from "lucide-react";
import { apiFetch } from "../../services/api";
import { toast } from "sonner";

export interface GSTVerifyResult {
  gstin: string;
  pan: string;
  legalName: string | null;
  tradeName: string | null;
  gstStatus: string | null;
  constitution: string | null;
  dealerType: string | null;
  regDate: string | null;
  address: {
    address1: string;
    address2: string;
    city: string;
    state: string;
    pinCode: string;
  } | null;
  source: "api" | "local";
  apiConfigured: boolean;
}

interface Props {
  value: string;
  onChange: (val: string) => void;
  onVerified: (data: GSTVerifyResult) => void;
  inputClass?: string;
  disabled?: boolean;
}

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const GSTVerifyInput: React.FC<Props> = ({ value, onChange, onVerified, inputClass, disabled }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [statusText, setStatusText] = useState("");

  const canVerify = GST_REGEX.test(value.trim().toUpperCase());

  const handleVerify = async () => {
    if (!canVerify) return;
    setLoading(true);
    setStatus("idle");
    try {
      const res = await apiFetch(`/gst/verify/${value.trim().toUpperCase()}`);
      if (!res.success) throw new Error(res.message || "Verification failed");

      const d: GSTVerifyResult = res.data;

      if (!d.apiConfigured) {
        toast.warning("GSTVerify API key not configured — only basic info extracted");
        setStatus("ok");
        setStatusText("Parsed locally");
      } else {
        const st = d.gstStatus?.toLowerCase();
        if (st === "active") {
          setStatus("ok");
          setStatusText(`Active · ${d.tradeName || d.legalName || ""}`);
        } else {
          setStatus("error");
          setStatusText(d.gstStatus || "Inactive");
          toast.warning(`GSTIN status: ${d.gstStatus}`);
        }
      }

      onVerified(d);
    } catch (e: any) {
      setStatus("error");
      setStatusText(e.message || "Failed");
      toast.error(e.message || "GST verification failed");
    } finally {
      setLoading(false);
    }
  };

  const base = inputClass ||
    "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none uppercase";

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={15}
          disabled={disabled}
          value={value}
          onChange={e => {
            onChange(e.target.value.toUpperCase());
            setStatus("idle");
          }}
          className={`flex-1 ${base}`}
          placeholder="e.g. 08BJLPY1185K2ZE"
        />
        <button
          type="button"
          onClick={handleVerify}
          disabled={!canVerify || loading || disabled}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
        >
          {loading
            ? <Loader2 size={13} className="animate-spin" />
            : <Search size={13} />}
          Verify
        </button>
      </div>

      {status !== "idle" && (
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${status === "ok" ? "text-emerald-600" : "text-red-500"}`}>
          {status === "ok"
            ? <CheckCircle2 size={12} />
            : <XCircle size={12} />}
          {statusText}
        </div>
      )}
    </div>
  );
};

export default GSTVerifyInput;
