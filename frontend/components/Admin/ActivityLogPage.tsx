import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  LogIn,
  ShoppingCart,
  FileText,
  Package,
  Users,
  BookOpen,
  ScanLine,
  RefreshCw,
  Search,
  Calendar,
  X,
} from "lucide-react";
import { activityLogService, ActivityLogEntry } from "../../services/activityLogService";
import Pagination from "../ui/Pagination";
import { usePageSize } from "../../utils/usePageSize";

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  PO_CREATED: "bg-indigo-100 text-indigo-700",
  PO_UPDATED: "bg-indigo-100 text-indigo-700",
  PO_APPROVED: "bg-green-100 text-green-700",
  PO_REJECTED: "bg-red-100 text-red-700",
  PO_DELETED: "bg-red-100 text-red-700",
  ORDER_CREATED: "bg-violet-100 text-violet-700",
  ORDER_STATUS_UPDATED: "bg-violet-100 text-violet-700",
  GRN_SUBMITTED: "bg-teal-100 text-teal-700",
  DISTRIBUTOR_CREATED: "bg-cyan-100 text-cyan-700",
  DISTRIBUTOR_UPDATED: "bg-cyan-100 text-cyan-700",
  DISTRIBUTOR_DELETED: "bg-red-100 text-red-700",
  CATALOG_CREATED: "bg-emerald-100 text-emerald-700",
  CATALOG_UPDATED: "bg-emerald-100 text-emerald-700",
  CATALOG_DELETED: "bg-red-100 text-red-700",
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  LOGIN: <LogIn size={14} />,
  PO_CREATED: <FileText size={14} />,
  PO_UPDATED: <FileText size={14} />,
  PO_APPROVED: <FileText size={14} />,
  PO_REJECTED: <FileText size={14} />,
  PO_DELETED: <FileText size={14} />,
  ORDER_CREATED: <ShoppingCart size={14} />,
  ORDER_STATUS_UPDATED: <ShoppingCart size={14} />,
  GRN_SUBMITTED: <ScanLine size={14} />,
  DISTRIBUTOR_CREATED: <Users size={14} />,
  DISTRIBUTOR_UPDATED: <Users size={14} />,
  DISTRIBUTOR_DELETED: <Users size={14} />,
  CATALOG_CREATED: <BookOpen size={14} />,
  CATALOG_UPDATED: <BookOpen size={14} />,
  CATALOG_DELETED: <BookOpen size={14} />,
};

const ENTITY_FILTERS = ["ALL", "AUTH", "PO", "ORDER", "GRN", "DISTRIBUTOR", "CATALOG"];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DatePreset = "all" | "today" | "yesterday" | "this_week" | "this_month" | "custom";

function getPresetDates(preset: DatePreset): { start?: string; end?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  if (preset === "today") { const t = fmt(now); return { start: t, end: t }; }
  if (preset === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    const ys = fmt(y); return { start: ys, end: ys };
  }
  if (preset === "this_week") {
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1);
    return { start: fmt(mon), end: fmt(now) };
  }
  if (preset === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: fmt(start), end: fmt(now) };
  }
  return {};
}

const ActivityLogPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = usePageSize("activityLog", 30);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const getDateRange = () => {
    if (datePreset === "custom") return { startDate: customStart || undefined, endDate: customEnd || undefined };
    const { start, end } = getPresetDates(datePreset);
    return { startDate: start, endDate: end };
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await activityLogService.list({
        page,
        limit: pageSize,
        entityType: entityFilter === "ALL" ? undefined : entityFilter,
        startDate,
        endDate,
      });
      const data = res?.data ?? res;
      setLogs(Array.isArray(data) ? data : []);
      if (res?.meta) { setTotalPages(res.meta.totalPages ?? 1); setTotal(res.meta.total ?? 0); }
    } catch (err) {
      console.error("ActivityLog fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entityFilter, datePreset, customStart, customEnd]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = search.trim()
    ? logs.filter((l) =>
        l.description.toLowerCase().includes(search.toLowerCase()) ||
        l.userName.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Activity size={20} className="text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Activity Log</h1>
            <p className="text-sm text-slate-500">Track all system actions in real-time</p>
          </div>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        {/* Row 1: Date presets */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={14} className="text-slate-400" />
          {(["all","today","yesterday","this_week","this_month","custom"] as DatePreset[]).map(p => (
            <button
              key={p}
              onClick={() => { setDatePreset(p); setPage(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                datePreset === p ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p === "all" ? "All Time" : p === "this_week" ? "This Week" : p === "this_month" ? "This Month" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}

          {/* Custom date range */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setPage(1); }}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400" />
              <span className="text-slate-300 text-xs">→</span>
              <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setPage(1); }}
                className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-400" />
              {(customStart || customEnd) && (
                <button onClick={() => { setCustomStart(""); setCustomEnd(""); }} className="text-slate-400 hover:text-rose-500">
                  <X size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Row 2: Entity filter + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {ENTITY_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => { setEntityFilter(f); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition border ${
                  entityFilter === f ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description or user..."
                className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <RefreshCw size={28} className="animate-spin" />
            <p className="text-sm">Loading activity logs…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <Package size={32} />
            <p className="text-sm">No activity logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((log) => (
              <div key={log._id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition">
                {/* Icon */}
                <div className={`mt-0.5 flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-500"}`}>
                  {ACTION_ICONS[log.action] ?? <Activity size={14} />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-500"}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">{log.userName}</span>
                    {log.userRole && (
                      <span className="text-[11px] text-slate-400 capitalize">({log.userRole})</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-snug">{log.description}</p>
                </div>

                {/* Time */}
                <div className="text-xs text-slate-400 shrink-0 text-right whitespace-nowrap">
                  {formatTime(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={pageSize} onPageSizeChange={setPageSize} />
    </div>
  );
};

export default ActivityLogPage;
