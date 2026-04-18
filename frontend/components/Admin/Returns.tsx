import React, { useState, useMemo } from 'react';
import { RotateCcw, Package, ChevronRight, AlertCircle, CheckCircle2, Search, ArrowLeft, Layers, ImageIcon } from 'lucide-react';
import { Order, OrderStatus, Article, Variant } from '../../types';
import SearchableSelect from '../SearchableSelect';
import { distributorOrderService } from '../../services/distributorOrderService';
import { toast } from 'sonner';

interface ReturnsProps {
  orders: Order[];
  articles: Article[];
}

const Returns: React.FC<ReturnsProps> = ({ orders, articles }) => {
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [returnCartons, setReturnCartons] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter for RECEIVED orders only
  const receivedOrders = useMemo(() => 
    orders.filter(o => o.status === OrderStatus.RECEIVED),
    [orders]
  );

  const orderOptions = useMemo(() => 
    receivedOrders.map(o => `${o.orderNumber} - ${o.distributorName}`),
    [receivedOrders]
  );

  const selectedOrder = useMemo(() => 
    receivedOrders.find(o => `${o.orderNumber} - ${o.distributorName}` === selectedOrderId),
    [selectedOrderId, receivedOrders]
  );

  const variantOptions = useMemo(() => {
    if (!selectedOrder) return [];
    return selectedOrder.items.map(item => {
      const article = articles.find(a => a.id === item.articleId);
      const variant = article?.variants?.find(v => v.id === item.variantId || v._id === item.variantId);
      return `${article?.name || 'Unknown'} - ${variant?.color || 'Standard'} (${item.allocatedCartonCount || item.cartonCount} Ctns)`;
    });
  }, [selectedOrder, articles]);

  const selectedItem = useMemo(() => {
    if (!selectedOrder || !selectedVariantId) return null;
    return selectedOrder.items.find(item => {
      const article = articles.find(a => a.id === item.articleId);
      const variant = article?.variants?.find(v => v.id === item.variantId || v._id === item.variantId);
      return `${article?.name || 'Unknown'} - ${variant?.color || 'Standard'} (${item.allocatedCartonCount || item.cartonCount} Ctns)` === selectedVariantId;
    });
  }, [selectedVariantId, selectedOrder, articles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedItem || returnCartons <= 0) {
      toast.error("Please fill all fields correctly");
      return;
    }

    try {
      setIsSubmitting(true);
      await distributorOrderService.processReturn(
        selectedOrder.id,
        selectedItem.variantId,
        returnCartons
      );
      toast.success("Return processed successfully!");
      
      // Reset form
      setSelectedOrderId('');
      setSelectedVariantId('');
      setReturnCartons(0);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to process return");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
            <RotateCcw size={24} />
          </div>
          Inventory Returns
        </h2>
        <p className="text-slate-500 font-medium ml-12">Process product returns from received orders to restore warehouse stock.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Form */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <SearchableSelect
              label="Select Received Order"
              options={orderOptions}
              value={selectedOrderId}
              onChange={(val) => {
                setSelectedOrderId(val);
                setSelectedVariantId('');
                setReturnCartons(0);
              }}
              placeholder="Search Order Number or Party..."
              required
            />

            {selectedOrderId && (
              <SearchableSelect
                label="Select Article / Variant"
                options={variantOptions}
                value={selectedVariantId}
                onChange={(val) => {
                  setSelectedVariantId(val);
                  setReturnCartons(0);
                }}
                placeholder="Choose item from order..."
                required
              />
            )}

            {selectedVariantId && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Return Quantity (Cartons)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={selectedItem?.allocatedCartonCount || selectedItem?.cartonCount}
                      value={returnCartons || ''}
                      onChange={(e) => setReturnCartons(parseInt(e.target.value) || 0)}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      placeholder="0"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-slate-100 shadow-sm">
                       <span className="text-xs font-black text-slate-400 uppercase">Max: {selectedItem?.allocatedCartonCount || selectedItem?.cartonCount}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || returnCartons <= 0}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-200 disabled:shadow-none transition-all flex items-center justify-center gap-3"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <RotateCcw size={18} />
                      Process Return
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Info & Summary Panel */}
        <div className="space-y-6">
          {!selectedOrderId ? (
             <div className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100/50 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 text-indigo-600">
                  <Search size={32} />
                </div>
                <div>
                   <h3 className="font-bold text-slate-900">Select an Order</h3>
                   <p className="text-sm text-slate-500 leading-relaxed px-4">Choose a completed order from the dropdown to view items and start the return process.</p>
                </div>
             </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-right-4">
               <div className="p-6 bg-slate-50/50">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Order Summary</h3>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center font-black text-indigo-600 shadow-sm">
                        #{selectedOrder?.orderNumber.split('-')[1]}
                     </div>
                     <div>
                        <p className="font-bold text-slate-900">{selectedOrder?.distributorName}</p>
                        <p className="text-xs text-slate-500">Ordered on {selectedOrder?.date}</p>
                     </div>
                  </div>
               </div>

               {selectedItem && (
                 <div className="p-6 space-y-4">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Item Detail</h3>
                   <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0">
                         {(() => {
                           const article = articles.find(a => a.id === selectedItem.articleId);
                           return (
                             <img 
                               src={article?.imageUrl} 
                               alt="" 
                               className="w-full h-full object-cover" 
                               onError={(e) => {
                                 (e.target as any).src = 'https://placehold.co/100x100?text=Item';
                               }}
                             />
                           );
                         })()}
                      </div>
                      <div className="flex-1">
                         <p className="font-bold text-slate-900 text-sm">
                           {articles.find(a => a.id === selectedItem.articleId)?.name}
                         </p>
                         <p className="text-xs text-slate-500">
                           {articles.find(a => a.id === selectedItem.articleId)?.variants?.find(v => v.id === selectedItem.variantId || v._id === selectedItem.variantId)?.color}
                         </p>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivered</p>
                         <p className="font-black text-slate-700">{selectedItem.allocatedCartonCount || selectedItem.cartonCount} <span className="text-[10px] font-bold">CTN</span></p>
                      </div>
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Return</p>
                         <p className="font-black text-indigo-600">{returnCartons || 0} <span className="text-[10px] font-bold">CTN</span></p>
                      </div>
                   </div>
                   
                   {returnCartons > 0 && (
                     <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 text-emerald-800">
                        <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
                        <p className="text-xs font-semibold leading-relaxed">
                          This will restore <span className="font-black">{returnCartons * 24} pairs</span> to the master stock for this variant.
                        </p>
                     </div>
                   )}
                 </div>
               )}

               <div className="p-6">
                  <div className="flex gap-3 text-slate-400">
                     <AlertCircle className="shrink-0 mt-0.5" size={16} />
                     <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wider">
                       Returns only restore physical stock. Financial adjustments should be managed separately in Bills.
                     </p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Returns;
