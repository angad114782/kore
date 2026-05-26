import React, { useState, useEffect, useCallback } from "react";
import { RotateCcw, Download, RefreshCw, Calendar } from "lucide-react";
import { reportService } from "../../services/reportService";
import Pagination from "../ui/Pagination";

interface ReturnRow {
  _id: string;
  returnNumber: string;
  orderNumber: string;
  distributorName: string;
  date: string;
  reason: string;
  totalCartons: number;
  totalPairs: number;
  items: any[];
}

interface Summary { totalReturns: number; totalCartons: number; totalPairs: number; }

const LIMIT = 20;

const ReturnReport: React.FC = () => {
  const [rows, setRows]           = useState<ReturnRow[]>([]);
  const [summary, setSummary]     = useState<Summary>({ totalReturns: 0, totalCartons: 0, totalPairs: 0 });
  const [loading, setLoading]     = useState(false);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportService.getReturn({
        page, limit: LIMIT,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      const d = res.data;
      setRows(d.data || []);
      setSummary(d.summary || { totalReturns: 0, totalCartons: 0, totalPairs: 0 });
      setTotal(d.meta?.total || 0);
      setTotalPages(d.meta?.totalPages || 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleFilter = () => { setPage(1); fetch(); };

  const exportCsv = () => {
    const lines = ["Return #,Order #,Distributor,Date,Reason,Cartons,Pairs"];
    rows.forEach(r => {
      lines.push(`"${r.returnNumber}","${r.orderNumber}","${r.distributorName}","${new Date(r.date).toLocaleDateString()}","${r.reason || ""}",${r.totalCartons},${r.totalPairs}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "return_report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <RotateCcw size={20} className="text-rose-500" /> Return Report
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">All product returns from distributors</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Returns",  value: summary.totalReturns.toLocaleString(),  color: "text-rose-600" },
          { label: "Total Cartons",  value: summary.totalCartons.toLocaleString(),  color: "text-amber-600" },
          { label: "Total Pairs",    value: summary.totalPairs.toLocaleString(),    color: "text-slate-700" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
          <div className="relative">
            <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
          <div className="relative">
            <Calendar size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
        </div>
        <button onClick={handleFilter} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all">Apply</button>
        {(startDate || endDate) && (
          <button onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No return data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Return #</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Order #</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Distributor</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Date</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs">Reason</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Cartons</th>
                  <th className="px-4 py-3 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Pairs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-rose-600">#{r.returnNumber}</td>
                    <td className="px-4 py-3 font-mono text-indigo-600">#{r.orderNumber}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{r.distributorName}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.date).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{r.reason || "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{r.totalCartons}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-700">{r.totalPairs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={LIMIT} />
      </div>
    </div>
  );
};

export default ReturnReport;
