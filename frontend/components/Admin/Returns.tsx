import React, { useState, useMemo } from 'react';
import { RotateCcw, Search, CheckCircle2, AlertCircle, Package, ChevronDown, ImageIcon, X } from 'lucide-react';
import { Order, OrderStatus, Article } from '../../types';
import { distributorOrderService } from '../../services/distributorOrderService';
import { getImageUrl } from '../../utils/imageUtils';
import { toast } from 'sonner';

interface ReturnsProps {
  orders: Order[];
  articles: Article[];
}

interface ReturnEntry {
  variantId: string;
  cartons: number;
}

const Returns: React.FC<ReturnsProps> = ({ orders, articles }) => {
  const [orderSearch, setOrderSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [returnEntries, setReturnEntries] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const receivedOrders = useMemo(() =>
    orders.filter(o => o.status === OrderStatus.RECEIVED),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return receivedOrders;
    const q = orderSearch.toLowerCase();
    return receivedOrders.filter(o =>
      o.orderNumber?.toLowerCase().includes(q) ||
      o.distributorName?.toLowerCase().includes(q)
    );
  }, [orderSearch, receivedOrders]);

  const selectedOrder = useMemo(() =>
    receivedOrders.find(o => o.id === selectedOrderId),
    [selectedOrderId, receivedOrders]
  );

  const selectOrder = (id: string) => {
    setSelectedOrderId(id);
    setReturnEntries({});
    setOrderSearch('');
    setShowDropdown(false);
  };

  const toggleVariant = (variantId: string) => {
    setReturnEntries(prev => {
      const copy = { ...prev };
      if (variantId in copy) {
        delete copy[variantId];
      } else {
        copy[variantId] = 1;
      }
      return copy;
    });
  };

  const setCartonCount = (variantId: string, count: number) => {
    setReturnEntries(prev => ({ ...prev, [variantId]: count }));
  };

  const selectedCount = Object.keys(returnEntries).length;
  const totalReturnCartons = Object.values(returnEntries).reduce((s, c) => s + c, 0);
  const totalReturnPairs = totalReturnCartons * 24;

  const canSubmit = selectedCount > 0 && Object.values(returnEntries).every(c => c > 0);

  const handleSubmit = async () => {
    if (!selectedOrder || !canSubmit) return;

    try {
      setIsSubmitting(true);
      const entries = Object.entries(returnEntries);

      for (const [variantId, cartons] of entries) {
        await distributorOrderService.processReturn(
          selectedOrder.id,
          variantId,
          cartons
        );
      }

      toast.success(`Returned ${totalReturnCartons} cartons (${totalReturnPairs} pairs) from ${entries.length} variant(s)`);
      setSelectedOrderId('');
      setReturnEntries({});
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to process return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVariantImage = (item: any) => {
    const article = articles.find(a => a.id === item.articleId);
    const variant = article?.variants?.find(v => v.id === item.variantId || v._id === item.variantId);
    const colorMedia = (article as any)?.colorMedia || [];
    const matched = colorMedia.find((cm: any) => cm.color?.toLowerCase() === variant?.color?.toLowerCase());
    const img = (matched?.images?.[0]?.url) || variant?.images?.[0] || article?.imageUrl;
    return img ? getImageUrl(img) : '';
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
            <RotateCcw size={20} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Returns</h2>
            <p className="text-[11px] text-slate-400 font-medium">Process multi-variant returns from received orders</p>
          </div>
        </div>
        {receivedOrders.length > 0 && (
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
            {receivedOrders.length} Eligible
          </span>
        )}
      </div>

      {/* Step 1 — Order Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">1</div>
            <div className="flex-1 relative">
              <div
                onClick={() => setShowDropdown(!showDropdown)}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border rounded-xl cursor-pointer transition-all ${
                  showDropdown ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={selectedOrder ? 'text-sm font-semibold text-slate-900' : 'text-sm text-slate-400'}>
                  {selectedOrder ? `${selectedOrder.orderNumber} — ${selectedOrder.distributorName}` : 'Select a received order...'}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
              </div>

              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-2 border-b border-slate-100 flex items-center gap-2">
                    <Search size={14} className="text-slate-400 ml-1" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search order or party..."
                      className="w-full py-1.5 outline-none text-sm"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredOrders.length > 0 ? filteredOrders.map(o => (
                      <div
                        key={o.id}
                        onClick={() => selectOrder(o.id)}
                        className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${
                          selectedOrderId === o.id ? 'bg-indigo-50' : ''
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold text-slate-800">{o.orderNumber}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{o.distributorName} · {o.date}</p>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase">{o.items?.length || 0} items</span>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center text-slate-400 text-xs">No matching orders found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {selectedOrder && (
              <button onClick={() => { setSelectedOrderId(''); setReturnEntries({}); }} className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step 2 — Variant Selection Grid */}
      {selectedOrder && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">2</div>
              <span className="text-sm font-bold text-slate-700">Select variants & enter return qty</span>
            </div>
            {selectedCount > 0 && (
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                {selectedCount} selected
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-50">
            {selectedOrder.items.map((item) => {
              const article = articles.find(a => a.id === item.articleId);
              const variant = article?.variants?.find(v => v.id === item.variantId || v._id === item.variantId);
              const isSelected = item.variantId in returnEntries;
              const maxCtns = item.allocatedCartonCount || item.cartonCount || 0;
              const currentCtns = returnEntries[item.variantId] || 0;
              const imgUrl = getVariantImage(item);

              return (
                <div
                  key={item.variantId}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleVariant(item.variantId)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {isSelected && <CheckCircle2 size={12} />}
                  </button>

                  {/* Image */}
                  <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-slate-200" /></div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {article?.name}{variant ? `-${variant.color}-${variant.sizeRange}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">{variant?.color || 'Standard'} · {maxCtns} CTN delivered</p>
                  </div>

                  {/* Carton Input — only shown when selected */}
                  {isSelected && (
                    <div className="flex items-center gap-2 animate-in fade-in duration-200">
                      <div className="flex items-center bg-white border border-indigo-200 rounded-lg overflow-hidden shadow-sm">
                        <button
                          onClick={() => setCartonCount(item.variantId, Math.max(1, currentCtns - 1))}
                          className="px-2 py-1.5 text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-black"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={maxCtns}
                          value={currentCtns || ''}
                          onChange={(e) => {
                            const v = Math.min(Math.max(1, parseInt(e.target.value) || 0), maxCtns);
                            setCartonCount(item.variantId, v);
                          }}
                          className="w-10 text-center text-sm font-black text-slate-900 outline-none border-x border-indigo-100 py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => setCartonCount(item.variantId, Math.min(maxCtns, currentCtns + 1))}
                          className="px-2 py-1.5 text-indigo-600 hover:bg-indigo-50 transition-colors text-sm font-black"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase w-10">/{maxCtns}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 — Summary & Submit */}
      {selectedOrder && selectedCount > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black shrink-0">3</div>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cartons</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{totalReturnCartons}</p>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pairs</p>
                  <p className="text-lg font-black text-indigo-600 leading-none">{totalReturnPairs}</p>
                </div>
                <div className="h-8 w-px bg-slate-100" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Variants</p>
                  <p className="text-lg font-black text-slate-900 leading-none">{selectedCount}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:bg-slate-200 disabled:shadow-none transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <RotateCcw size={14} />
                  Process Return
                </>
              )}
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="flex gap-2 text-slate-400">
              <AlertCircle className="shrink-0 mt-0.5" size={12} />
              <p className="text-[9px] font-medium leading-relaxed">
                Returns restore physical stock to the warehouse. Financial adjustments should be managed separately in Bills.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedOrder && receivedOrders.length === 0 && (
        <div className="bg-slate-50/50 p-12 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-300 mb-4">
            <Package size={28} />
          </div>
          <h3 className="font-bold text-slate-700 mb-1">No Received Orders</h3>
          <p className="text-xs text-slate-400 max-w-[280px]">Orders must be in "Received" status before returns can be processed.</p>
        </div>
      )}
    </div>
  );
};

export default Returns;
