import React, { useState, useEffect, useCallback } from "react";
import {
  Clock, CheckCircle2, ArrowRight, Search, Package,
  Loader2, ChevronRight, IndianRupee, Calendar, Rocket,
  Filter, RefreshCw, AlertCircle,
} from "lucide-react";
import { Order, OrderStatus, Article } from "../../types";
import { distributorOrderService } from "../../services/distributorOrderService";
import { toast } from "sonner";
import Pagination from "../ui/Pagination";
import { usePageSize } from "../../utils/usePageSize";

const PRE_ORDER_STATUS_LABELS: Record<string, string> = {
  PRE_BOOKED: "Pre-Booked",
  CONFIRMED:  "Confirmed",
};

const statusColors: Record<string, string> = {
  PRE_BOOKED: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED:  "bg-indigo-50 text-indigo-700 border-indigo-200",
};

interface PreOrderManagerProps {
  articles: Article[];
  lastUpdated?: Date;
}

const PreOrderManager: React.FC<PreOrderManagerProps> = ({ articles, lastUpdated }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize("preOrderManager", 20);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PRE_BOOKED" | "CONFIRMED">("ALL");
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await distributorOrderService.getPreOrders({
        page: currentPage, limit: pageSize,
        q: searchQuery || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setOrders(res.items);
      setMeta(res.meta);
    } catch {
      toast.error("Failed to load pre-orders");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => { if (lastUpdated) fetchOrders(true); }, [lastUpdated]);

  const handleConfirm = async (orderId: string, orderNumber?: string) => {
    setActioning(orderId);
    try {
      await distributorOrderService.updateOrderStatus(orderId, OrderStatus.CONFIRMED);
      toast.success(`Pre-order #${orderNumber} confirmed`);
      fetchOrders(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to confirm");
    } finally {
      setActioning(null);
    }
  };

  const handleRelease = async (orderId: string, orderNumber?: string) => {
    setActioning(orderId);
    try {
      await distributorOrderService.releasePreOrder(orderId);
      toast.success(`Pre-order #${orderNumber} released to regular order pipeline`);
      fetchOrders(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to release");
    } finally {
      setActioning(null);
    }
  };

  const totalPreBooked = orders.filter(o => o.status === OrderStatus.PRE_BOOKED).length;
  const totalConfirmed = orders.filter(o => o.status === OrderStatus.CONFIRMED).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pre-Orders</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            B2B Pre-booking pipeline · PRE_BOOKED → CONFIRMED → Released to Regular Order
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalPreBooked > 0 && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
              {totalPreBooked} Awaiting Confirmation
            </span>
          )}
          <button onClick={() => fetchOrders()} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            <RefreshCw size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Flow guide */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Pre-Order Flow (B2B)</p>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: "Distributor Pre-Books", color: "bg-amber-100 text-amber-700", icon: <Clock size={12} /> },
            { label: "→" },
            { label: "Admin Confirms", color: "bg-indigo-100 text-indigo-700", icon: <CheckCircle2 size={12} /> },
            { label: "→" },
            { label: "Article Goes AVAILABLE", color: "bg-slate-100 text-slate-600", icon: <Package size={12} /> },
            { label: "→" },
            { label: "Admin Releases → Regular Order", color: "bg-emerald-100 text-emerald-700", icon: <Rocket size={12} /> },
          ].map((step, i) =>
            step.label === "→"
              ? <ArrowRight key={i} size={14} className="text-slate-300" />
              : (
                <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${step.color}`}>
                  {step.icon}{step.label}
                </div>
              )
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search order / distributor..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium text-slate-900 outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-slate-300" />
          {(["ALL", "PRE_BOOKED", "CONFIRMED"] as const).map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                statusFilter === s
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {s === "ALL" ? "All" : PRE_ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="relative min-h-[200px]">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-indigo-400" size={28} />
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <Clock className="text-slate-200 mx-auto mb-3" size={36} />
            <p className="text-slate-400 text-sm font-bold">No pre-orders yet</p>
            <p className="text-slate-300 text-xs mt-1">Pre-orders appear when distributors book PRE-ORDER items</p>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 gap-2">
            {orders.map(order => {
              const isPreBooked = order.status === OrderStatus.PRE_BOOKED;
              const isConfirmed = order.status === OrderStatus.CONFIRMED;
              const acting = actioning === order.id;
              const artNames = order.items.slice(0, 2).map(item => {
                const art = articles.find(a => a.id === String(item.articleId));
                return art?.name || "Unknown";
              }).join(", ");

              return (
                <div key={order.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-all overflow-hidden">
                  <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex gap-4 items-start sm:items-center flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Clock size={16} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</span>
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${statusColors[order.status] || "bg-slate-50 text-slate-500 border-slate-100"}`}>
                            {PRE_ORDER_STATUS_LABELS[order.status] || order.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-semibold truncate">{order.distributorName}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1"><Calendar size={9} />{order.date}</span>
                          <span>{order.totalCartons} ctns · {order.totalPairs} pairs</span>
                          {artNames && <span className="truncate max-w-[160px]">{artNames}{order.items.length > 2 ? ` +${order.items.length - 2}` : ""}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-0.5 justify-end">
                          <IndianRupee size={11} className="text-slate-600" />
                          <span className="font-black text-sm text-slate-900">{(order.finalAmount || order.totalAmount).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {isPreBooked && (
                          <button
                            onClick={() => handleConfirm(order.id, order.orderNumber)}
                            disabled={acting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                          >
                            {acting ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Confirm
                          </button>
                        )}
                        {isConfirmed && (
                          <button
                            onClick={() => handleRelease(order.id, order.orderNumber)}
                            disabled={acting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50"
                            title="Article is now available — release this pre-order to regular pipeline"
                          >
                            {acting ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
                            Release
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {meta && (
        <Pagination
          currentPage={currentPage}
          totalPages={meta.totalPages}
          onPageChange={setCurrentPage}
          totalItems={meta.total}
          itemsPerPage={pageSize}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
};

export default PreOrderManager;
