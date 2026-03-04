import React, { useState } from "react";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Tag,
  Package,
  Layers,
  ArrowRightLeft,
  Copy,
  Check,
} from "lucide-react";
import { Article, Variant } from "../../types";

interface VariantDetailsPageProps {
  article: Article;
  variant: Variant;
  onBack: () => void;
  onEditArticle: (id: string) => void;
  onDelete: (id: string) => void;
}

const VariantDetailsPage: React.FC<VariantDetailsPageProps> = ({
  article,
  variant,
  onBack,
  onEditArticle,
  onDelete,
}) => {
  const [activeImage, setActiveImage] = useState(0);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const imgSrc = (url: string | undefined) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `http://localhost:5005${url}`;
  };

  const allImages = [
    article.imageUrl,
    ...((article.secondaryImages || []) as any[]).map((img: any) => img.url || img),
  ].filter(Boolean);

  const variantName = variant.itemName || `${article.name} – ${variant.color}`;
  const sizes = Object.keys(variant.sizeSkus || {});
  const totalPairs = Object.values(variant.sizeQuantities || {}).reduce(
    (s, v) => s + (Number(v) || 0),
    0
  );
  // Clear identity: Variant SKU or Article SKU, no auto-generated strings
  const primarySku = variant.sku || article.sku || "";

  const copySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
  };

  const mrp = variant.mrp || article.mrp || 0;
  const selling = variant.sellingPrice || 0;
  const cost = variant.costPrice || 0;
  const margin = selling > 0 && cost > 0 ? Math.round(((selling - cost) / selling) * 100) : 0;

  return (
    <div className="max-w-full mx-auto space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Catalogue
        </button>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEditArticle(article.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            <Edit2 size={14} /> Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${article.name}"?`)) onDelete(article.id);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ─── Col 1: Image ─── */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 sticky top-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative">
              {allImages.length > 0 ? (
                <img
                  src={imgSrc(allImages[activeImage])}
                  alt={variantName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Package size={48} />
                </div>
              )}
              {allImages.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                  {activeImage + 1}/{allImages.length}
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`w-12 h-12 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      i === activeImage
                        ? "border-indigo-500 ring-2 ring-indigo-200"
                        : "border-slate-200 hover:border-slate-300 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={imgSrc(img)} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Col 2: Core Details ─── */}
        <div className="lg:col-span-5 space-y-4">
          {/* Identity Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900 leading-snug truncate">{variantName}</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Master: <span className="font-medium text-slate-500">{article.name}</span>
                </p>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                  article.status === "WISHLIST"
                    ? "bg-rose-50 text-rose-600 border border-rose-100"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                }`}
              >
                {article.status === "WISHLIST" ? "Wish" : "Live"}
              </span>
            </div>

            {/* SKU + Tags */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => copySku(primarySku)}
                  className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                  {copiedSku === primarySku ? <Check size={11} /> : <Copy size={11} />}
                  {primarySku}
                </button>
              <Badge icon={<Tag size={8} />} text={article.category} />
              {article.productCategory && <Badge icon={<Package size={8} />} text={article.productCategory} />}
              {article.brand && <Badge icon={<Layers size={8} />} text={article.brand} />}
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-4 gap-2">
            <PriceBox label="MRP" value={mrp} accent="indigo" />
            <PriceBox label="Selling" value={selling} accent="emerald" />
            <PriceBox label="Cost" value={cost} accent="slate" />
            <div className={`rounded-xl border p-3 flex flex-col justify-center ${
              margin > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200"
            }`}>
              <p className={`text-[9px] font-black uppercase tracking-wider ${margin > 0 ? "text-amber-400" : "text-slate-400"}`}>Margin</p>
              <p className={`text-lg font-black leading-tight ${margin > 0 ? "text-amber-600" : "text-slate-400"}`}>{margin}%</p>
            </div>
          </div>
        </div>

        {/* ─── Col 3: Specs sidebar ─── */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Specifications</h3>
            <SpecRow label="Color" value={variant.color || "—"} dot={variant.color} />
            <SpecRow label="Sole Color" value={article.soleColor || "—"} />
            <SpecRow label="HSN Code" value={variant.hsnCode || "—"} mono />
            <SpecRow label="Total Pairs" value={String(totalPairs)} badge={totalPairs > 0 && totalPairs % 24 === 0 ? "emerald" : undefined} />
            <SpecRow label="Size Range" value={article.selectedSizes?.join(", ") || "—"} />
            <SpecRow label="Manufacturer" value={article.manufacturer || "—"} />
            <SpecRow label="Unit" value={article.unit || "—"} />
            {article.status === "WISHLIST" && (
              <SpecRow label="Expected Date" value={article.expectedDate || "Required"} badge={!article.expectedDate ? "rose" : undefined} />
            )}
          </div>
        </div>
      </div>

      {/* ─── Full Width: Size Breakdown Table ─── */}
      {sizes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 uppercase tracking-widest">
              <ArrowRightLeft size={16} className="text-indigo-500" />
              Variant Size Breakdown
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Inventory:</span>
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                totalPairs > 0 && totalPairs % 24 === 0
                  ? "bg-emerald-50 text-emerald-600 shadow-sm"
                  : totalPairs > 0
                  ? "bg-indigo-50 text-indigo-600 shadow-sm"
                  : "bg-slate-100 text-slate-500"
              }`}>
                {totalPairs} prs
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Size</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Available Stock</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap text-right pr-12">Full Master SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sizes.map((sz) => {
                  const qty = variant.sizeQuantities?.[sz] || 0;
                  const sku = variant.sizeSkus[sz] || "";
                  return (
                    <tr key={sz} className="hover:bg-indigo-50/20 transition-all group">
                      <td className="px-6 py-4.5">
                        <span className="text-base font-bold text-slate-800">{sz}</span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                          qty > 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400 border border-slate-100"
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${qty > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                          {qty} prs
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right pr-12">
                        {sku ? (
                          <code className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100/50 whitespace-nowrap tracking-tight inline-block">
                            {sku}
                          </code>
                        ) : (
                          <span className="text-xs text-slate-300 italic font-medium">Not defined</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantDetailsPage;

/* ── Sub-components ── */

const Badge: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[9px] font-bold uppercase tracking-wider border border-slate-200">
    {icon} {text}
  </span>
);

const PriceBox: React.FC<{
  label: string;
  value: number;
  accent: "indigo" | "emerald" | "slate";
}> = ({ label, value, accent }) => {
  const c = {
    indigo: { bg: "bg-indigo-50 border-indigo-100", label: "text-indigo-400", val: "text-indigo-700" },
    emerald: { bg: "bg-emerald-50 border-emerald-100", label: "text-emerald-400", val: "text-emerald-700" },
    slate: { bg: "bg-slate-50 border-slate-200", label: "text-slate-400", val: "text-slate-700" },
  }[accent];
  return (
    <div className={`rounded-xl border p-3 ${c.bg}`}>
      <p className={`text-[9px] font-black uppercase tracking-wider ${c.label}`}>{label}</p>
      <p className={`text-lg font-black leading-tight ${c.val}`}>₹{value.toLocaleString()}</p>
    </div>
  );
};

const SpecRow: React.FC<{
  label: string;
  value: string;
  dot?: string;
  mono?: boolean;
  badge?: "emerald" | "rose";
}> = ({ label, value, dot, mono, badge }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-xs text-slate-400 font-medium">{label}</span>
    <div className="flex items-center gap-1.5">
      {dot && (
        <span
          className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
          style={{ backgroundColor: dot.toLowerCase() }}
        />
      )}
      <span className={`text-sm font-semibold ${
        badge === "emerald"
          ? "text-emerald-600"
          : badge === "rose"
          ? "text-rose-500"
          : "text-slate-700"
      } ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  </div>
);
