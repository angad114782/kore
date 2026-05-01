
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  RotateCcw, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  ChevronDown, 
  ClipboardCheck, 
  History, 
  Eye, 
  X, 
  Info, 
  Package, 
  User, 
  Calendar,
  Barcode,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  ListFilter
} from 'lucide-react';
import { distributorOrderService } from '../../services/distributorOrderService';
import { Order, Article, Return } from '../../types';
import SearchableSelect from '../SearchableSelect';
import { toast } from 'sonner';
import { getImageUrl } from '../../utils/imageUtils';

interface ReturnEntry {
  variantId: string;
  articleId: string;
  count: number;
  maxCount: number;
  sku: string;
  articleName: string;
  color: string;
  sizeRange: string;
  image: string;
}

type TabType = 'new' | 'history';

interface ReturnsProps {
  orders: Order[];
  articles: Article[];
  onSuccess?: () => void;
  onInward?: (articleId: string, cartons: number) => void;
}

const Returns: React.FC<ReturnsProps> = ({ orders, articles, onSuccess, onInward }) => {
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number | null>(null);
  const [returnEntries, setReturnEntries] = useState<ReturnEntry[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<Return[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<Return | null>(null);

  // Derived Data
  const eligibleOrders = useMemo(() => 
    orders.filter(o => ["RECEIVED", "PARTIAL", "OFD"].includes(o.status)), 
    [orders]
  );

  const selectedOrder = useMemo(() => 
    orders.find(o => o.id === selectedOrderId), 
    [orders, selectedOrderId]
  );

  const selectedBatch = useMemo(() => 
    selectedOrder?.fulfillmentHistory?.find(b => b.batchNumber === selectedBatchNumber),
    [selectedOrder, selectedBatchNumber]
  );

  // Sync History
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const res = await distributorOrderService.getReturnHistory();
      setHistoryItems(res.items);
    } catch (err) {
      toast.error('Failed to load return history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getVariantImage = (variantId: string, articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return '';
    const variant = article.variants?.find(v => v.id === variantId || (v as any)._id === variantId);
    return getImageUrl(variant?.images?.[0] || article.imageUrl);
  };

  const handleScanSKU = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) {
      toast.error('Please select a shipment batch first');
      setScanInput('');
      return;
    }

    const normalizedInput = scanInput.trim().toLowerCase().replace(/\s+/g, '');
    let match: { item: any; variant: any; article: Article; maxAvailable: number } | null = null;

    for (const batchItem of selectedBatch.items) {
      let article = articles.find(a => a.id === batchItem.articleId);
      if (!article) {
        article = articles.find(a => a.variants?.some(v => v.id === batchItem.variantId || (v as any)._id === batchItem.variantId));
      }
      if (!article) continue;
      
      const variant = article.variants?.find(v => v.id === batchItem.variantId || (v as any)._id === batchItem.variantId);
      if (!variant) continue;

      const cartonSKU = `${article.name}-${variant.color}-${variant.sizeRange}`.toLowerCase().replace(/\s+/g, '');
      const variantSKU = (variant.sku || '').toLowerCase().replace(/\s+/g, '');

      if (normalizedInput === cartonSKU || (variantSKU && normalizedInput === variantSKU)) {
        const delivered = batchItem.cartonCount || 0;
        const previouslyReturned = batchItem.returnedCartonCount || 0;
        const availableInBatch = delivered - previouslyReturned;
        
        if (availableInBatch > 0) {
          const existingInManifest = returnEntries.find(e => e.variantId === batchItem.variantId);
          if (!existingInManifest || existingInManifest.count < availableInBatch) {
            match = { item: batchItem, variant, article, maxAvailable: availableInBatch };
            break;
          }
        }
      }
    }

    if (!match) {
      toast.error('SKU not found in this batch or return limit reached.');
      setScanInput('');
      return;
    }

    const { item, variant, article, maxAvailable } = match;
    
    setReturnEntries(prev => {
      const existingIdx = prev.findIndex(e => e.variantId === item.variantId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].count += 1;
        toast.success(`Count updated: ${updated[existingIdx].count} CTN`);
        return updated;
      }
      
      toast.success(`Item Detected: ${article.name}`);
      return [...prev, {
        variantId: item.variantId,
        articleId: article.id,
        count: 1,
        maxCount: maxAvailable,
        sku: variant.sku || 'N/A',
        articleName: article.name,
        color: variant.color || 'N/A',
        sizeRange: variant.sizeRange || 'N/A',
        image: getVariantImage(item.variantId, article.id),
      }];
    });
    setScanInput('');
  };

  const updateEntryCount = (idx: number, delta: number) => {
    setReturnEntries(prev => {
      const updated = [...prev];
      const entry = updated[idx];
      const newCount = Math.max(1, Math.min(entry.maxCount, entry.count + delta));
      if (newCount === entry.count && delta > 0) toast.error('Maximum batch quantity reached.');
      updated[idx] = { ...entry, count: newCount };
      return updated;
    });
  };

  const removeEntry = (idx: number) => setReturnEntries(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (returnEntries.length === 0 || !selectedOrderId || selectedBatchNumber === null) return;
    if (!returnReason.trim()) { toast.error('Please enter a return reason'); return; }
    
    try {
      setIsSubmitting(true);
      const items = returnEntries.map(e => ({ variantId: e.variantId, cartons: e.count }));
      await distributorOrderService.processReturn(selectedOrderId, items, returnReason, selectedBatchNumber);
      
      if (onInward) {
        returnEntries.forEach(e => onInward(e.articleId, e.count));
      }

      toast.success('Return processed successfully');
      setReturnEntries([]); setReturnReason(''); setSelectedOrderId(null); setSelectedBatchNumber(null);
      if (onSuccess) onSuccess();
      setActiveTab('history');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to process return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-4 lg:p-6">
      <div className="max-w-[1440px] mx-auto">
        
        {/* Top Navigation Bar - More Compact */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
                <RotateCcw size={16} />
              </div>
              Returns
            </h1>
          </div>
          
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(['new', 'history'] as TabType[]).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'new' ? 'Process New' : 'Return History'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'new' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Command & Summary - Compact */}
            <div className="lg:col-span-3 space-y-4 sticky top-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 space-y-6">
                  <div>
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={12} className="text-amber-500" /> Selection
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <SearchableSelect
                          label="Order"
                          options={eligibleOrders.map(o => `${o.id}|${o.orderNumber || o.id.slice(-6).toUpperCase()}|${o.distributorName}`)}
                          value={selectedOrderId ? (eligibleOrders.find(o => o.id === selectedOrderId)?.id + '|' + (eligibleOrders.find(o => o.id === selectedOrderId)?.orderNumber || eligibleOrders.find(o => o.id === selectedOrderId)?.id.slice(-6).toUpperCase()) + '|' + eligibleOrders.find(o => o.id === selectedOrderId)?.distributorName) : ''}
                          onChange={(val) => {
                            if (returnEntries.length > 0 && !window.confirm("Switching orders will clear your manifest. Continue?")) return;
                            const [id] = val.split('|');
                            setSelectedOrderId(id);
                            setSelectedBatchNumber(null);
                            setReturnEntries([]);
                          }}
                          placeholder="Select Order"
                          renderValue={(opt) => {
                            const [, num, dist] = opt.split('|');
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">#{num}</span>
                                <span className="text-[10px] text-slate-400 font-medium truncate">({dist})</span>
                              </div>
                            );
                          }}
                          renderOption={(opt) => {
                            const [, num, dist] = opt.split('|');
                            return (
                              <div className="flex flex-col py-0.5">
                                <span className="font-bold text-slate-900 text-xs">#{num}</span>
                                <span className="text-[9px] text-slate-500">{dist}</span>
                              </div>
                            );
                          }}
                        />
                      </div>

                      {selectedOrder && (
                        <div className="animate-in fade-in slide-in-from-top-1">
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Shipment Batch</label>
                          <div className="relative">
                            <select
                              className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 appearance-none focus:ring-2 focus:ring-indigo-500/20 outline-none"
                              value={selectedBatchNumber || ''}
                              onChange={(e) => {
                                if (returnEntries.length > 0 && !window.confirm("Switching batches will clear your manifest. Continue?")) return;
                                setSelectedBatchNumber(Number(e.target.value));
                                setReturnEntries([]);
                              }}
                            >
                              <option value="">Select Batch</option>
                              {selectedOrder.fulfillmentHistory?.map(batch => (
                                <option key={batch.batchNumber} value={batch.batchNumber}>
                                  #{batch.batchNumber} ({new Date(batch.date).toLocaleDateString()})
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Total Qty</p>
                          <p className="text-2xl font-black text-slate-900">{returnEntries.reduce((s, e) => s + e.count, 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Variants</p>
                          <p className="text-lg font-black text-indigo-600">{returnEntries.length}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Return Reason</label>
                        <textarea
                          rows={2}
                          className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                          placeholder="Reason required..."
                          value={returnReason}
                          onChange={e => setReturnReason(e.target.value)}
                        />
                      </div>

                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || returnEntries.length === 0}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 disabled:bg-slate-200 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <ClipboardCheck size={14} />}
                        Confirm Return
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Column: Scanning & Manifest - Compact */}
            <div className="lg:col-span-6 space-y-6">
              {/* Scanner Box */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Barcode size={16} className="text-indigo-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest">Scanner Ready</h2>
                  </div>
                  {selectedBatch && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">
                      <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[8px] font-black text-green-500 uppercase">Online</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleScanSKU} className="relative">
                  <input
                    type="text"
                    className="w-full bg-slate-800/50 border-border-slate-700/50 rounded-xl px-4 py-3 text-sm font-bold placeholder:text-slate-600 focus:border-indigo-500 transition-all outline-none"
                    placeholder={selectedBatch ? "Scan SKU..." : "Waiting for Batch Selection"}
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    disabled={!selectedBatch}
                    autoFocus
                  />
                </form>
              </div>

              {/* Manifest List - Compact */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px]">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Return Manifest</h3>
                  <span className="text-[8px] font-black text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                    {returnEntries.length} Unique SKUs
                  </span>
                </div>
                
                {returnEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 text-slate-300">
                      <Package size={24} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Manifest Empty</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {returnEntries.map((entry, idx) => (
                      <div key={idx} className="p-4 hover:bg-slate-50/30 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                              <img src={entry.image} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-black text-slate-900 uppercase truncate">{entry.articleName}</h4>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{entry.color} · {entry.sizeRange}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                              <button onClick={() => updateEntryCount(idx, -1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-400 hover:text-slate-900 transition-all">
                                <Minus size={10} />
                              </button>
                              <div className="px-2 text-xs font-black text-slate-900 min-w-[2rem] text-center">
                                {entry.count}
                              </div>
                              <button onClick={() => updateEntryCount(idx, 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white text-slate-400 hover:text-slate-900 transition-all">
                                <Plus size={10} />
                              </button>
                            </div>
                            <button onClick={() => removeEntry(idx)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Reference - Compact */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} className="text-green-500" /> Batch Check
                  </h3>
                </div>
                
                <div className="p-4 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
                  {!selectedBatch ? (
                    <div className="py-10 text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase leading-relaxed">Select batch to verify limits</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedBatch.items.map((bi, idx) => {
                        let article = articles.find(a => a.id === bi.articleId);
                        if (!article) {
                          article = articles.find(a => a.variants?.some(v => v.id === bi.variantId || (v as any)._id === bi.variantId));
                        }
                        const variant = article?.variants?.find(v => v.id === bi.variantId || (v as any)._id === bi.variantId);
                        const prevReturned = bi.returnedCartonCount || 0;
                        const scanningNow = returnEntries.find(e => e.variantId === bi.variantId)?.count || 0;
                        
                        return (
                          <div key={idx} className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                            <div className="flex gap-2 mb-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                <img src={getVariantImage(bi.variantId, article?.id || '')} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] font-black text-slate-900 uppercase truncate">{article?.name || '—'}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{variant?.color || '—'} · {variant?.sizeRange || '—'}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-1">
                              <div className="bg-white p-1.5 rounded-lg text-center border border-slate-100">
                                <p className="text-[7px] font-bold text-slate-400 uppercase">Ship</p>
                                <p className="text-xs font-black text-slate-900">{bi.cartonCount}</p>
                              </div>
                              <div className="bg-rose-50/50 p-1.5 rounded-lg text-center border border-rose-100/50">
                                <p className="text-[7px] font-bold text-rose-400 uppercase">Ret</p>
                                <p className="text-xs font-black text-rose-600">{prevReturned}</p>
                              </div>
                              <div className="bg-indigo-50/50 p-1.5 rounded-lg text-center border border-indigo-100/50">
                                <p className="text-[7px] font-bold text-indigo-400 uppercase">Scan</p>
                                <p className="text-xs font-black text-indigo-600">{scanningNow}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            {isLoadingHistory ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600 mb-2" size={32} />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Loading Records...</p>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-20 text-center">
                <History size={32} className="text-slate-100 mx-auto mb-3" />
                <h3 className="text-xs font-black text-slate-900 uppercase">No History</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ref / Batch</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Distributor</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyItems.map((item) => (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedHistoryItem(item)}
                        className="hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-6 rounded-full bg-rose-500/20" />
                            <div>
                              <p className="text-xs font-black text-slate-900 font-mono">#{item.returnNumber}</p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">B#{item.batchNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-[10px] font-bold text-slate-700 uppercase">{item.distributorName}</p>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(item.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-xs font-black text-slate-900">{item.totalCartons} <span className="text-[9px] text-slate-400 uppercase">Ctn</span></p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal - Also Compacted */}
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">{selectedHistoryItem.returnNumber}</span>
                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase">Batch #{selectedHistoryItem.batchNumber}</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{new Date(selectedHistoryItem.createdAt).toLocaleString()}</p>
                </div>
                <button onClick={() => setSelectedHistoryItem(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Order', value: '#' + selectedHistoryItem.orderNumber },
                    { label: 'Distributor', value: selectedHistoryItem.distributorName },
                    { label: 'Qty', value: selectedHistoryItem.totalCartons + ' Ctn', accent: true },
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className={`text-[10px] font-black uppercase truncate ${stat.accent ? 'text-indigo-600' : 'text-slate-900'}`}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Item Detail</th>
                        <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selectedHistoryItem.items.map((it: any, idx: number) => {
                        const article = articles.find(a => a.id === it.articleId);
                        const variant = article?.variants?.find(v => v.id === it.variantId || (v as any)._id === it.variantId);
                        return (
                          <tr key={idx}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden border border-slate-200">
                                  <img src={getVariantImage(it.variantId, it.articleId)} className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-slate-900 uppercase truncate">{article?.name || 'Unknown'}</p>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase">{variant?.color} · {variant?.sizeRange}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-[10px] font-black text-slate-900">{it.cartonCount}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedHistoryItem.reason && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Reason</p>
                    <p className="text-[10px] font-bold text-slate-600 italic">"{selectedHistoryItem.reason}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Returns;
