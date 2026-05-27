import React, { useState, useMemo, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Trash2,
  Plus,
  Minus,
  History,
  X,
  Package,
  Calendar,
  Barcode,
  Loader2,
  ChevronDown,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { distributorOrderService } from '../../services/distributorOrderService';
import { Order, Article, Return } from '../../types';
import { toast } from 'sonner';
import { getImageUrl } from '../../utils/imageUtils';
import Pagination from '../ui/Pagination';
import { usePageSize } from '../../utils/usePageSize';

interface ReturnsProps {
  orders: Order[];
  articles: Article[];
  onSuccess?: () => void;
  onInward?: (articleId: string, cartons: number) => void;
}

type TabType = 'new' | 'history';

interface ReturnEntry {
  variantId: string;
  articleId: string;
  count: number;
  maxCount: number;
  articleName: string;
  color: string;
  sizeRange: string;
  image: string;
}

const Returns: React.FC<ReturnsProps> = ({ orders, articles, onSuccess, onInward }) => {
  const [activeTab, setActiveTab] = useState<TabType>('new');

  // — new return state —
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number | 'all'>('all');
  const [returnEntries, setReturnEntries] = useState<ReturnEntry[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // — history state —
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<Return[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<Return | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [pageSize, setPageSize] = usePageSize("returns", 20);

  // Eligible orders: RECEIVED, OFD, PARTIAL
  const eligibleOrders = useMemo(
    () => orders.filter((o) => ['RECEIVED', 'PARTIAL', 'OFD'].includes(o.status)),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return eligibleOrders;
    return eligibleOrders.filter(
      (o) =>
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.distributorName || '').toLowerCase().includes(q)
    );
  }, [eligibleOrders, orderSearch]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId),
    [orders, selectedOrderId]
  );

  // Items available for return in the selected order/batch
  const eligibleItems = useMemo(() => {
    if (!selectedOrder) return [];

    // If a specific batch is selected, use batch items; otherwise use order-level items
    if (selectedBatchNumber !== 'all' && selectedOrder.fulfillmentHistory) {
      const batch = selectedOrder.fulfillmentHistory.find(
        (b) => b.batchNumber === selectedBatchNumber
      );
      if (batch) {
        return batch.items.map((bi) => {
          const returned = bi.returnedCartonCount || 0;
          const available = (bi.cartonCount || 0) - returned;
          const article = articles.find(
            (a) =>
              a.id === bi.articleId ||
              a.variants?.some((v) => v.id === bi.variantId || (v as any)._id === bi.variantId)
          );
          const variant = article?.variants?.find(
            (v) => v.id === bi.variantId || (v as any)._id === bi.variantId
          );
          return {
            variantId: bi.variantId,
            articleId: bi.articleId || article?.id || '',
            maxCount: available,
            articleName: article?.name || '—',
            color: variant?.color || '—',
            sizeRange: variant?.sizeRange || '—',
            image: getImageUrl(
              variant?.images?.[0] ||
                (() => {
                  const cm = (article as any)?.colorMedia?.find(
                    (m: any) => m.color?.toLowerCase() === variant?.color?.toLowerCase()
                  );
                  return cm?.images?.[0]?.url;
                })() ||
                article?.imageUrl
            ),
          };
        }).filter((x) => x.maxCount > 0);
      }
    }

    // Order-level: sum fulfilled across all batches per variant, subtract returns
    return selectedOrder.items
      .map((item) => {
        const fulfilled = item.fulfilledCartonCount || 0;
        const returned = item.returnedCartonCount || 0;
        const available = fulfilled - returned;
        const article = articles.find((a) => a.id === item.articleId);
        const variant = article?.variants?.find(
          (v) => v.id === item.variantId || (v as any)._id === item.variantId
        );
        return {
          variantId: item.variantId!,
          articleId: item.articleId,
          maxCount: available,
          articleName: article?.name || '—',
          color: variant?.color || '—',
          sizeRange: variant?.sizeRange || '—',
          image: getImageUrl(
            variant?.images?.[0] ||
              (() => {
                const cm = (article as any)?.colorMedia?.find(
                  (m: any) => m.color?.toLowerCase() === variant?.color?.toLowerCase()
                );
                return cm?.images?.[0]?.url;
              })() ||
              article?.imageUrl
          ),
        };
      })
      .filter((x) => x.maxCount > 0 && x.variantId);
  }, [selectedOrder, selectedBatchNumber, articles]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, historyPage, pageSize]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await distributorOrderService.getReturnHistory({ page: historyPage, limit: pageSize });
      setHistoryItems(res.items);
      setHistoryTotalPages(res.meta?.totalPages || 1);
      setHistoryTotal(res.meta?.total || 0);
    } catch {
      toast.error('Failed to load return history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const addToManifest = (variantId: string) => {
    const item = eligibleItems.find((e) => e.variantId === variantId);
    if (!item) return;
    setReturnEntries((prev) => {
      if (prev.find((e) => e.variantId === variantId)) return prev;
      return [...prev, { ...item, count: 1 }];
    });
  };

  const updateCount = (idx: number, delta: number) => {
    setReturnEntries((prev) => {
      const updated = [...prev];
      const entry = updated[idx];
      const newCount = Math.max(1, Math.min(entry.maxCount, entry.count + delta));
      if (newCount === entry.count && delta > 0) toast.error('Max batch quantity reached.');
      updated[idx] = { ...entry, count: newCount };
      return updated;
    });
  };

  const setCount = (idx: number, val: number) => {
    setReturnEntries((prev) => {
      const updated = [...prev];
      const entry = updated[idx];
      updated[idx] = { ...entry, count: Math.max(1, Math.min(entry.maxCount, val || 1)) };
      return updated;
    });
  };

  const removeEntry = (idx: number) =>
    setReturnEntries((prev) => prev.filter((_, i) => i !== idx));

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    const q = scanInput.trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return;

    const match = eligibleItems.find((item) => {
      const article = articles.find((a) => a.id === item.articleId);
      const variant = article?.variants?.find(
        (v) => v.id === item.variantId || (v as any)._id === item.variantId
      );
      const cartonSku = `${item.articleName}-${item.color}-${item.sizeRange}`
        .toLowerCase()
        .replace(/\s+/g, '');
      const variantSku = (variant?.sku || '').toLowerCase().replace(/\s+/g, '');
      return q === cartonSku || (variantSku && q === variantSku);
    });

    if (!match) {
      toast.error('SKU not found in returnable items.');
      setScanInput('');
      return;
    }

    setReturnEntries((prev) => {
      const existing = prev.find((e) => e.variantId === match.variantId);
      if (existing) {
        const idx = prev.indexOf(existing);
        const newArr = [...prev];
        const newCount = Math.min(existing.count + 1, existing.maxCount);
        newArr[idx] = { ...existing, count: newCount };
        toast.success(`${match.articleName} — count: ${newCount}`);
        return newArr;
      }
      toast.success(`Added: ${match.articleName}`);
      return [...prev, { ...match, count: 1 }];
    });
    setScanInput('');
  };

  const handleSubmit = async () => {
    if (!selectedOrderId || returnEntries.length === 0) return;
    if (!returnReason.trim()) {
      toast.error('Return reason is required');
      return;
    }
    try {
      setIsSubmitting(true);
      const items = returnEntries.map((e) => ({ variantId: e.variantId, cartons: e.count }));
      const batchNum = selectedBatchNumber === 'all' ? undefined : selectedBatchNumber;
      await distributorOrderService.processReturn(selectedOrderId, items, returnReason, batchNum as any);

      if (onInward) {
        returnEntries.forEach((e) => onInward(e.articleId, e.count));
      }
      toast.success('Return processed successfully');
      setReturnEntries([]);
      setReturnReason('');
      setSelectedOrderId(null);
      setSelectedBatchNumber('all');
      onSuccess?.();
      setActiveTab('history');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to process return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetOrder = () => {
    if (returnEntries.length > 0 && !window.confirm('Clear current manifest?')) return;
    setSelectedOrderId(null);
    setSelectedBatchNumber('all');
    setReturnEntries([]);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
            <RotateCcw size={20} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Returns</h1>
            <p className="text-sm text-slate-500">Process and track return requests</p>
          </div>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          {(['new', 'history'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab === 'new' ? 'Process Return' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT — order selection + manifest controls */}
          <div className="space-y-4 lg:sticky lg:top-6">
            {/* Order picker */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                  1. Select Order
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search order / distributor..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                {filteredOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No eligible orders</div>
                ) : (
                  filteredOrders.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        if (selectedOrderId === o.id) return;
                        if (returnEntries.length > 0 && !window.confirm('Clear current manifest?'))
                          return;
                        setSelectedOrderId(o.id);
                        setSelectedBatchNumber('all');
                        setReturnEntries([]);
                      }}
                      className={`w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                        selectedOrderId === o.id ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        o.status === 'RECEIVED' ? 'bg-emerald-500' :
                        o.status === 'OFD' ? 'bg-blue-500' : 'bg-amber-500'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          #{o.orderNumber || o.id.slice(-6).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{o.distributorName}</p>
                      </div>
                      <span className="ml-auto text-[9px] font-bold text-slate-400 uppercase shrink-0">
                        {o.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Batch filter (optional) */}
            {selectedOrder && selectedOrder.fulfillmentHistory && selectedOrder.fulfillmentHistory.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  2. Filter by Batch (Optional)
                </p>
                <div className="relative">
                  <select
                    value={selectedBatchNumber}
                    onChange={(e) => {
                      if (returnEntries.length > 0 && !window.confirm('Clear manifest?')) return;
                      setSelectedBatchNumber(e.target.value === 'all' ? 'all' : Number(e.target.value));
                      setReturnEntries([]);
                    }}
                    className="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-indigo-200 font-bold text-slate-700"
                  >
                    <option value="all">All Batches (order-level)</option>
                    {selectedOrder.fulfillmentHistory.map((b) => (
                      <option key={b.batchNumber} value={b.batchNumber}>
                        Batch #{b.batchNumber} — {new Date(b.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Summary + reason + submit */}
            {selectedOrder && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manifest</p>
                    <p className="text-2xl font-black text-slate-900">
                      {returnEntries.reduce((s, e) => s + e.count, 0)}
                      <span className="text-xs font-semibold text-slate-400 ml-1">cartons</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">SKUs</p>
                    <p className="text-2xl font-black text-indigo-600">{returnEntries.length}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Return Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                    placeholder="Defective / Wrong item / Excess stock..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || returnEntries.length === 0 || !returnReason.trim()}
                  className="w-full py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <ClipboardCheck size={14} />}
                  Confirm Return
                </button>

                <button
                  onClick={resetOrder}
                  className="w-full py-2 text-slate-400 text-[9px] font-bold uppercase tracking-widest hover:text-slate-700 transition-colors"
                >
                  Clear & Start Over
                </button>
              </div>
            )}
          </div>

          {/* RIGHT — items + manifest */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedOrder ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-20 flex flex-col items-center gap-3 text-slate-400">
                <Package size={40} />
                <p className="text-sm font-semibold">Select an order to start</p>
              </div>
            ) : (
              <>
                {/* SKU Scanner */}
                <div className="bg-slate-900 rounded-2xl p-5 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <Barcode size={15} className="text-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Quick Scan</span>
                  </div>
                  <form onSubmit={handleScan}>
                    <input
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      placeholder="Scan barcode / type SKU and press Enter…"
                      className="w-full bg-slate-800/60 rounded-xl px-4 py-2.5 text-sm font-medium placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </form>
                </div>

                {/* Eligible items grid */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                      <Package size={12} className="text-indigo-600" />
                      Returnable Items ({eligibleItems.length})
                    </h3>
                  </div>

                  {eligibleItems.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
                      No returnable items for this selection
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {eligibleItems.map((item) => {
                        const entry = returnEntries.find((e) => e.variantId === item.variantId);
                        const entryIdx = returnEntries.findIndex((e) => e.variantId === item.variantId);
                        const inManifest = !!entry;

                        return (
                          <div
                            key={item.variantId}
                            className={`px-5 py-4 flex items-center gap-4 transition-colors ${
                              inManifest ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Image */}
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                              <img
                                src={item.image}
                                alt={item.articleName}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{item.articleName}</p>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">
                                {item.color} · {item.sizeRange}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                Max returnable:{' '}
                                <span className="font-black text-slate-700">{item.maxCount} ctn</span>
                              </p>
                            </div>

                            {/* Controls */}
                            {inManifest ? (
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                                  <button
                                    onClick={() => updateCount(entryIdx, -1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 hover:text-slate-900 transition-all"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="number"
                                    value={entry!.count}
                                    min={1}
                                    max={entry!.maxCount}
                                    onChange={(e) => setCount(entryIdx, parseInt(e.target.value) || 1)}
                                    className="w-10 text-center bg-transparent text-sm font-black text-slate-900 outline-none"
                                  />
                                  <button
                                    onClick={() => updateCount(entryIdx, 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-slate-500 hover:text-slate-900 transition-all"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                                <button
                                  onClick={() => removeEntry(entryIdx)}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToManifest(item.variantId)}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all"
                              >
                                <Plus size={12} /> Add
                              </button>
                            )}

                            {inManifest && (
                              <CheckCircle2 size={16} className="text-indigo-500 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* History tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoadingHistory ? (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
              <p className="text-xs font-bold uppercase tracking-widest">Loading…</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <History size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-xs font-bold uppercase">No returns yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Ref / Batch', 'Distributor', 'Date', 'Qty', ''].map((h) => (
                      <th key={h} className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedHistoryItem(item)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-xs font-black text-slate-900 font-mono">#{item.returnNumber}</p>
                        {item.batchNumber && (
                          <p className="text-[9px] font-bold text-slate-400">B#{item.batchNumber}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[10px] font-bold text-slate-700">{item.distributorName}</td>
                      <td className="px-5 py-3 text-[10px] font-bold text-slate-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-black text-slate-900">{item.totalCartons}</span>
                        <span className="text-[9px] text-slate-400 ml-1">Ctn</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                          View →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination currentPage={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} totalItems={historyTotal} itemsPerPage={pageSize} onPageSizeChange={setPageSize} />
        </div>
      )}

      {/* History detail modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900 font-mono">
                    {selectedHistoryItem.returnNumber}
                  </span>
                  {selectedHistoryItem.batchNumber && (
                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">
                      Batch #{selectedHistoryItem.batchNumber}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {new Date(selectedHistoryItem.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryItem(null)}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Order', value: '#' + selectedHistoryItem.orderNumber },
                  { label: 'Distributor', value: selectedHistoryItem.distributorName },
                  { label: 'Qty', value: `${selectedHistoryItem.totalCartons} Ctn`, accent: true },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {stat.label}
                    </p>
                    <p className={`text-[10px] font-black uppercase truncate ${stat.accent ? 'text-rose-600' : 'text-slate-900'}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {selectedHistoryItem.items.map((it: any, idx: number) => {
                  const article = articles.find((a) => a.id === it.articleId);
                  const variant = article?.variants?.find(
                    (v) => v.id === it.variantId || (v as any)._id === it.variantId
                  );
                  return (
                    <div key={idx} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                        <img
                          src={getImageUrl(variant?.images?.[0] || article?.imageUrl)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 uppercase truncate">
                          {article?.name || 'Unknown'}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          {variant?.color} · {variant?.sizeRange}
                        </p>
                      </div>
                      <span className="text-xs font-black text-slate-900 shrink-0">
                        {it.cartonCount} ctn
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedHistoryItem.reason && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Reason
                  </p>
                  <p className="text-[10px] font-bold text-slate-600 italic">
                    "{selectedHistoryItem.reason}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;
