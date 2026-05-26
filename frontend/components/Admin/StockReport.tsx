import React, { useState, useEffect, useCallback } from "react";
import { Search, Download, Package, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import { reportService } from "../../services/reportService";
import Pagination from "../ui/Pagination";

interface Variant {
  variantId: string;
  itemName: string;
  color: string;
  sizeRange: string;
  mrp: number;
  listingStatus: string;
  sizeQuantities: Record<string, number>;
}

interface StockRow {
  articleId: string;
  articleName: string;
  sku: string;
  category: string;
  brand: string;
  totalVariants: number;
  variants: Variant[];
}

const LIMIT = 30;

const StockReport: React.FC = () => {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getStock({ page, limit: LIMIT, q: search || undefined });
      const d = res.data;
      setRows(d.data || []);
      setTotal(d.meta?.total || 0);
      setTotalPages(d.meta?.totalPages || 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSearch = () => { setPage(1); setSearch(searchInput); };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportCsv = () => {
    const lines = ["Article,SKU,Category,Brand,Variant,Color,Size Range,MRP,Status,Size Quantities"];
    rows.forEach(r => {
      r.variants.forEach(v => {
        const sizes = Object.entries(v.sizeQuantities).map(([s, q]) => `${s}:${q}`).join(" ");
        lines.push(`"${r.articleName}","${r.sku}","${r.category}","${r.brand}","${v.itemName}","${v.color}","${v.sizeRange}",${v.mrp},"${v.listingStatus}","${sizes}"`);
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stock_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package size={20} className="text-indigo-500" /> Stock Report
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{total} articles in catalogue</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetch} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search article name..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all">Search</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No stock data found</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs w-8"></th>
                <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Article</th>
                <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">SKU</th>
                <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Category</th>
                <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Brand</th>
                <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Variants</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => (
                <React.Fragment key={row.articleId}>
                  <tr
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleExpand(row.articleId)}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {expanded.has(row.articleId) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{row.articleName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sku}</td>
                    <td className="px-4 py-3 text-slate-600">{row.category}</td>
                    <td className="px-4 py-3 text-slate-600">{row.brand}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{row.totalVariants}</span>
                    </td>
                  </tr>
                  {expanded.has(row.articleId) && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-4 bg-slate-50/70">
                        <div className="rounded-xl border border-slate-200 overflow-hidden mt-1">
                          <table className="w-full text-xs">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Variant</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Color</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Size Range</th>
                                <th className="px-3 py-2 text-right font-semibold text-slate-500">MRP</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-500">Carton Assortment</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {row.variants.map(v => (
                                <tr key={v.variantId} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 text-slate-700">{v.itemName}</td>
                                  <td className="px-3 py-2 text-slate-600">{v.color}</td>
                                  <td className="px-3 py-2 font-mono text-slate-500">{v.sizeRange}</td>
                                  <td className="px-3 py-2 text-right font-bold text-indigo-600">₹{v.mrp?.toLocaleString()}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${v.listingStatus === "available" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                      {v.listingStatus?.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-slate-500">
                                    {Object.entries(v.sizeQuantities).sort((a, b) => Number(a[0]) - Number(b[0])).map(([s, q]) => `${s}:${q}`).join("  ")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={LIMIT} />
      </div>
    </div>
  );
};

export default StockReport;
