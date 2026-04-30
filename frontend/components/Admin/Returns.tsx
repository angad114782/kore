import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  RotateCcw, Search, Package, ImageIcon, X, History, Barcode,
  Trash2, ArrowRight, ShieldCheck, Loader2, Info, Plus, Minus
} from 'lucide-react';
import { Order, OrderStatus, Article } from '../../types';
import { distributorOrderService } from '../../services/distributorOrderService';
import { getImageUrl } from '../../utils/imageUtils';
import { toast } from 'sonner';

interface ReturnsProps {
  orders: Order[];
  articles: Article[];
  onSuccess?: () => void;
  onInward?: (articleId: string, cartons: number) => void;
}

interface ReturnEntry {
  variantId: string;
  articleId: string;
  orderId: string;
  orderNumber: string;
  count: number;
  maxCount: number;
  sku: string;
  articleName: string;
  color: string;
  sizeRange: string;
  image: string;
}

type TabType = 'new' | 'history';

const Returns: React.FC<ReturnsProps> = ({ orders, articles, onSuccess, onInward }) => {
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [returnEntries, setReturnEntries] = useState<ReturnEntry[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  const eligibleOrders = useMemo(() =>
    orders.filter(o =>
      [OrderStatus.RECEIVED, OrderStatus.PARTIAL, OrderStatus.OFD].includes(o.status) &&
      o.items.some(item => (item as any).fulfilledCartonCount > 0)
    ),
    [orders]
  );

  useEffect(() => {
    if (activeTab === 'new') setTimeout(() => scanInputRef.current?.focus(), 100);
  }, [activeTab]);

  const getVariantImage = (variantId: string, articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    const variant = article?.variants?.find(v => v.id === variantId || v._id === variantId);
    const colorMedia = (article as any)?.colorMedia || [];
    const matched = colorMedia.find((cm: any) => cm.color?.toLowerCase() === variant?.color?.toLowerCase());
    const img = matched?.images?.[0]?.url || variant?.images?.[0] || article?.imageUrl;
    return img ? getImageUrl(img) : '';
  };

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await distributorOrderService.getReturnHistory();
      setHistoryItems(res.items);
    } catch { toast.error('Failed to load return history'); }
    finally { setIsLoadingHistory(false); }
  };

  useEffect(() => { if (activeTab === 'history') fetchHistory(); }, [activeTab]);

  const handleScanSKU = (sku: string) => {
    const cleanSku = sku.trim();
    if (!cleanSku) return;
    const normalizedInput = cleanSku.toLowerCase().replace(/\s+/g, '');
    let match: { order: Order; item: any; variant: any } | null = null;

    for (const order of eligibleOrders) {
      for (const item of order.items) {
        if (!((item as any).fulfilledCartonCount > 0)) continue;
        const article = articles.find(a => a.id === item.articleId);
        if (!article) continue;
        const variant = article.variants?.find(v => v.id === item.variantId || v._id === item.variantId);
        if (!variant) continue;
        if (variant.sku && variant.sku.toLowerCase().replace(/\s+/g, '') === normalizedInput) {
          match = { order, item, variant }; break;
        }
        const cartonSKU = `${article.name}-${variant.color}-${variant.sizeRange}`.toLowerCase().replace(/\s+/g, '');
        if (normalizedInput === cartonSKU) { match = { order, item, variant }; break; }
      }
      if (match) break;
    }

    if (!match) { toast.error('SKU not found in any delivered orders.'); setScanInput(''); return; }

    const { order, item, variant } = match;
    const delivered = (item as any).fulfilledCartonCount || 0;
    if (delivered <= 0) {
      toast.error(`No delivered cartons for this SKU in Order ${order.orderNumber}.`);
      setScanInput(''); return;
    }

    setReturnEntries(prev => {
      const existingIdx = prev.findIndex(e => e.variantId === item.variantId && e.orderId === order.id);
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        if (existing.count >= delivered) {
          toast.error(`Limit: only ${delivered} cartons delivered in Order ${order.orderNumber}.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIdx] = { ...existing, count: existing.count + 1 };
        toast.success(`Updated: ${updated[existingIdx].count}/${delivered} cartons`);
        return updated;
      }
      const article = articles.find(a => a.id === item.articleId);
      toast.success(`Added from Order ${order.orderNumber}`);
      return [...prev, {
        variantId: item.variantId, articleId: item.articleId,
        orderId: order.id, orderNumber: order.orderNumber || 'N/A',
        count: 1, maxCount: delivered,
        sku: variant.sku || 'N/A',
        articleName: article?.name || 'Unknown',
        color: variant.color || 'N/A',
        sizeRange: variant.sizeRange || 'N/A',
        image: getVariantImage(item.variantId, item.articleId),
      }];
    });
    setScanInput('');
  };

  const updateEntryCount = (idx: number, delta: number) => {
    setReturnEntries(prev => {
      const updated = [...prev];
      const entry = updated[idx];
      const newCount = Math.max(1, Math.min(entry.maxCount, entry.count + delta));
      if (newCount === entry.count && delta > 0) toast.error('Maximum delivered units reached.');
      updated[idx] = { ...entry, count: newCount };
      return updated;
    });
  };

  const removeEntry = (idx: number) => setReturnEntries(prev => prev.filter((_, i) => i !== idx));

  const totalReturnCartons = useMemo(() => returnEntries.reduce((s, e) => s + e.count, 0), [returnEntries]);

  const handleSubmit = async () => {
    if (returnEntries.length === 0) return;
    if (!returnReason.trim()) { toast.error('Please enter a return reason.'); return; }
    try {
      setIsSubmitting(true);
      const grouped = returnEntries.reduce((acc, entry) => {
        if (!acc[entry.orderId]) acc[entry.orderId] = [];
        acc[entry.orderId].push({ variantId: entry.variantId, cartons: entry.count });
        return acc;
      }, {} as Record<string, { variantId: string; cartons: number }[]>);

      for (const [orderId, items] of Object.entries(grouped)) {
        await distributorOrderService.processReturn(orderId, items, returnReason);
        if (onInward) items.forEach(item => {
          const entry = returnEntries.find(e => e.variantId === item.variantId && e.orderId === orderId);
          if (entry) onInward(entry.articleId, item.cartons);
        });
      }
      toast.success(`Return of ${totalReturnCartons} cartons processed.`);
      setReturnEntries([]); setReturnReason('');
      if (onSuccess) onSuccess();
      setActiveTab('history');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to process return');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw size={18} className="text-indigo-600" /> Returns
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">Process stock returns and view history</p>
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          {(['new', 'history'] as TabType[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${
                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab === 'new' ? 'Process Return' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Left: Scanner + Manifest */}
          <div className="lg:col-span-3 flex flex-col gap-4">

            {/* Scanner */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Scan / Enter SKU</p>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all bg-slate-50">
                <Barcode size={15} className="text-slate-300 shrink-0" />
                <input
                  ref={scanInputRef} type="text"
                  placeholder="Scan barcode or type SKU and press Enter..."
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-300 outline-none"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleScanSKU(scanInput)}
                />
                {scanInput && <button onClick={() => setScanInput('')} className="text-slate-300 hover:text-slate-500"><X size={13} /></button>}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Format: <span className="font-mono">ArticleName-Color-SizeRange</span>
                &nbsp;·&nbsp; e.g. <span className="font-mono text-slate-500">Puma-Red-2-5</span>
              </p>
            </div>

            {/* Manifest */}
            <div className="bg-white border border-slate-200 rounded-xl flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                  Manifest
                  {returnEntries.length > 0 && (
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full text-[10px] font-bold flex items-center justify-center">
                      {returnEntries.length}
                    </span>
                  )}
                </span>
                {returnEntries.length > 0 && (
                  <button onClick={() => setReturnEntries([])} className="text-[11px] text-rose-400 hover:text-rose-600 font-medium">
                    Clear all
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                {returnEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-200 mb-3">
                      <Package size={20} />
                    </div>
                    <p className="text-sm text-slate-300 font-medium">No items scanned yet</p>
                  </div>
                ) : returnEntries.map((entry, idx) => (
                  <div key={`${entry.orderId}-${entry.variantId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      {entry.image ? <img src={entry.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-2 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 truncate">
                        {entry.articleName}
                        <span className="text-slate-300 font-normal">·</span>
                        <span className="text-slate-500 font-normal">{entry.color} · {entry.sizeRange}</span>
                      </div>
                      <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {entry.orderNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                        <button onClick={() => updateEntryCount(idx, -1)} className="px-2 py-1.5 text-slate-400 hover:bg-slate-100 transition-colors"><Minus size={11} /></button>
                        <span className="px-2.5 text-sm font-bold text-slate-800 border-x border-slate-200 min-w-[32px] text-center">{entry.count}</span>
                        <button onClick={() => updateEntryCount(idx, 1)} className="px-2 py-1.5 text-slate-400 hover:bg-slate-100 transition-colors"><Plus size={11} /></button>
                      </div>
                      <span className="text-[10px] text-slate-400 w-10 text-right">/{entry.maxCount}</span>
                      <button onClick={() => removeEntry(idx)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Summary + Reason + Submit */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Summary</p>
              <div className="space-y-2.5">
                <div className="flex justify-between"><span className="text-xs text-slate-500">SKUs</span><span className="text-sm font-bold text-slate-800">{returnEntries.length}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Total Cartons</span><span className="text-sm font-bold text-indigo-600">{totalReturnCartons}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Orders</span><span className="text-sm font-bold text-slate-800">{new Set(returnEntries.map(e => e.orderId)).size}</span></div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Return Reason <span className="text-rose-400">*</span>
              </label>
              <textarea rows={5}
                placeholder="Describe the quality issue or reason..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 placeholder:text-slate-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                value={returnReason} onChange={e => setReturnReason(e.target.value)}
              />
            </div>

            <button onClick={handleSubmit}
              disabled={isSubmitting || returnEntries.length === 0 || !returnReason.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {isSubmitting ? 'Processing...' : 'Submit Return'}
            </button>
          </div>
        </div>

      ) : (
        /* History */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <History size={15} className="text-slate-400" /> Return History
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
              <input type="text" placeholder="Search..." className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 placeholder:text-slate-300 outline-none focus:border-indigo-400 w-44 transition-all" />
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={22} className="text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-200 mb-3"><RotateCcw size={20} /></div>
              <p className="text-sm text-slate-400 font-medium">No returns yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {['Return #', 'Date', 'Distributor', 'Order', 'Cartons', ''].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {historyItems.map(ret => (
                    <tr key={ret._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5"><span className="text-xs font-mono font-bold text-slate-800">{ret.returnNumber}</span></td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-700">{new Date(ret.createdAt).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400">{new Date(ret.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-5 py-3.5"><span className="text-xs text-slate-700">{ret.distributorName}</span></td>
                      <td className="px-5 py-3.5"><span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{ret.orderNumber}</span></td>
                      <td className="px-5 py-3.5"><span className="text-sm font-bold text-slate-800">{ret.totalCartons}</span></td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => setSelectedHistoryItem(ret)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:border-slate-400 hover:text-slate-900 transition-all">
                          View <ArrowRight size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Return</span>
                  <span className="text-base font-bold text-slate-900 font-mono">{selectedHistoryItem.returnNumber}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{new Date(selectedHistoryItem.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedHistoryItem(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"><X size={17} /></button>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
              {[
                { label: 'Order', value: selectedHistoryItem.orderNumber },
                { label: 'Cartons', value: selectedHistoryItem.totalCartons },
                { label: 'Pairs', value: selectedHistoryItem.totalPairs, accent: true },
              ].map(s => (
                <div key={s.label} className="px-5 py-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{s.label}</p>
                  <p className={`text-sm font-bold ${s.accent ? 'text-indigo-600' : 'text-slate-800'}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 max-h-60 overflow-y-auto space-y-2">
              {selectedHistoryItem.items.map((item: any, idx: number) => {
                const art = articles.find(a => a.id === item.articleId);
                const vari = art?.variants?.find((v: any) => v.id === item.variantId || v._id === item.variantId);
                const img = getVariantImage(item.variantId, item.articleId);
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                      {img ? <img src={img} className="w-full h-full object-cover" /> : <Package size={16} className="w-full h-full p-2 text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{art?.name || '—'}</p>
                      <p className="text-[10px] text-slate-400">{vari?.color || '—'} · {vari?.sizeRange || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">{item.cartonCount} ctn</p>
                      <p className="text-[10px] text-indigo-500">{item.pairCount} pairs</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedHistoryItem.reason && (
              <div className="px-6 pb-4">
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Return Reason</p>
                  <p className="text-xs text-amber-800 leading-relaxed">{selectedHistoryItem.reason}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => window.print()} className="text-xs text-slate-400 hover:text-slate-700 transition-colors">Print receipt</button>
              <button onClick={() => setSelectedHistoryItem(null)} className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-indigo-600 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;
