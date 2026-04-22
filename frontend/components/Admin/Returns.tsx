import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  RotateCcw, Search, CheckCircle2, AlertCircle, Package, 
  ChevronDown, ImageIcon, X, History, Barcode, Trash2, 
  ArrowRight, ShieldCheck, Calendar, User, ShoppingBag,
  ExternalLink, Loader2, Info
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

type TabType = 'new' | 'history';

const Returns: React.FC<ReturnsProps> = ({ orders, articles, onSuccess, onInward }) => {
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [orderSearch, setOrderSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [returnEntries, setReturnEntries] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Scanner state
  const [scanInput, setScanInput] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  
  // History state
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyMeta, setHistoryMeta] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  // Eligible orders: RECEIVED or PARTIAL (or OFD if delivered)
  const eligibleOrders = useMemo(() =>
    orders.filter(o => 
      [OrderStatus.RECEIVED, OrderStatus.PARTIAL, OrderStatus.OFD].includes(o.status) &&
      o.items.some(item => (item as any).fulfilledCartonCount > 0)
    ),
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return eligibleOrders;
    const q = orderSearch.toLowerCase();
    return eligibleOrders.filter(o =>
      o.orderNumber?.toLowerCase().includes(q) ||
      o.distributorName?.toLowerCase().includes(q)
    );
  }, [orderSearch, eligibleOrders]);

  const selectedOrder = useMemo(() =>
    eligibleOrders.find(o => o.id === selectedOrderId),
    [selectedOrderId, eligibleOrders]
  );

  // Fetch History when tab changes
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
      setHistoryMeta(res.meta);
    } catch (err) {
      toast.error('Failed to load return history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const selectOrder = (id: string) => {
    setSelectedOrderId(id);
    setReturnEntries({});
    setOrderSearch('');
    setShowDropdown(false);
    // Focus scan input after a delay to ensure it's rendered
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const handleScanSKU = (sku: string) => {
    if (!selectedOrder) return;
    const cleanSku = sku.trim();
    if (!cleanSku) return;

    // 1. Direct SKU Match (Exact or space-insensitive)
    const normalizedInput = cleanSku.toLowerCase().replace(/\s+/g, "");
    
    let match: { item: any, variant: any } | null = null;

    for (const item of selectedOrder.items) {
      const article = articles.find(a => a.id === item.articleId);
      if (!article) continue;
      const variant = article.variants?.find(v => 
        (v.sku && v.sku.toLowerCase().replace(/\s+/g, "") === normalizedInput) || 
        (v.id === item.variantId || v._id === item.variantId)
      );
      
      if (variant && (variant.sku?.toLowerCase().replace(/\s+/g, "") === normalizedInput)) {
        match = { item, variant };
        break;
      }
    }

    // 2. Dynamic Carton SKU Match (e.g. "Urban Runner-Red-3-5")
    if (!match) {
      for (const item of selectedOrder.items) {
        const article = articles.find(a => a.id === item.articleId);
        if (!article) continue;
        const variant = article.variants?.find(v => v.id === item.variantId || v._id === item.variantId);
        if (!variant) continue;

        // Generate dynamic Carton SKU: [Article Name]-[Color]-[Size Range]
        const cartonSKU = `${article.name}-${variant.color}-${variant.sizeRange}`
          .toLowerCase()
          .replace(/\s+/g, "");

        if (normalizedInput === cartonSKU) {
          match = { item, variant };
          break;
        }
      }
    }

    if (!match) {
      toast.error("SKU not found in this order's delivered items.");
      setScanInput('');
      return;
    }

    const { item, variant } = match;
    const variantId = item.variantId;
    const delivered = (item as any).fulfilledCartonCount || 0;
    const currentlyScanned = returnEntries[variantId] || 0;

    if (currentlyScanned >= delivered) {
      toast.error(`Limit Reached! Only ${delivered} cartons of this SKU were delivered.`);
    } else {
      setReturnEntries(prev => ({
        ...prev,
        [variantId]: currentlyScanned + 1
      }));
      toast.success(`Scanned: ${variant.sku || 'Variant'} (${currentlyScanned + 1}/${delivered})`);
    }

    setScanInput('');
  };

  const removeEntry = (variantId: string) => {
    setReturnEntries(prev => {
      const copy = { ...prev };
      delete copy[variantId];
      return copy;
    });
  };

  const selectedCount = Object.keys(returnEntries).length;
  const totalReturnCartons = Object.values(returnEntries).reduce((s, c) => s + c, 0);

  const handleSubmit = async () => {
    if (!selectedOrder || selectedCount === 0) return;

    try {
      setIsSubmitting(true);
      const items = Object.entries(returnEntries).map(([variantId, cartons]) => ({
        variantId,
        cartons
      }));

      await distributorOrderService.processReturn(selectedOrder.id, items);

      // Sync the global frontend inventory actual stock via onInward
      if (onInward) {
        Object.entries(returnEntries).forEach(([variantId, cartons]) => {
          const item = selectedOrder.items.find((i: any) => i.variantId === variantId);
          if (item && item.articleId) {
            onInward(item.articleId, cartons);
          }
        });
      }

      toast.success(`Successfully processed return of ${totalReturnCartons} cartons.`);
      setSelectedOrderId('');
      setReturnEntries({});
      
      if (onSuccess) {
        onSuccess();
      }
      
      setActiveTab('history');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to process return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVariantImage = (variantId: string, articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    const variant = article?.variants?.find(v => v.id === variantId || v._id === variantId);
    const colorMedia = (article as any)?.colorMedia || [];
    const matched = colorMedia.find((cm: any) => cm.color?.toLowerCase() === variant?.color?.toLowerCase());
    const img = (matched?.images?.[0]?.url) || variant?.images?.[0] || article?.imageUrl;
    return img ? getImageUrl(img) : '';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
            <RotateCcw size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Returns Management</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 underline decoration-indigo-200 underline-offset-4 decoration-2">Inventory Restoration System</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full md:w-fit self-end">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'new' 
                ? 'bg-white text-indigo-600 shadow-xl shadow-slate-200 scale-105' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Package size={16} />
            Process Return
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 md:flex-none px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              activeTab === 'history' 
                ? 'bg-white text-indigo-600 shadow-xl shadow-slate-200 scale-105' 
                : 'text-slate-400 hover:text-slate-600 shadow-inner'
            }`}
          >
            <History size={16} />
            History
          </button>
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Order Selector & Scanner */}
          <div className="lg:col-span-4 space-y-6">
            {/* Step 1: Order Match */}
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg">1</div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Select Source Order</h3>
              </div>
              
              <div className="relative">
                <div
                  onClick={() => setShowDropdown(!showDropdown)}
                  className={`group w-full flex items-center justify-between px-5 py-4 bg-slate-50 border-2 rounded-[1.25rem] cursor-pointer transition-all ${
                    showDropdown ? 'border-indigo-500 bg-white ring-8 ring-indigo-50' : 'border-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${selectedOrder ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {selectedOrder ? 'Active Order' : 'Source Document'}
                    </span>
                    <span className={`text-sm font-bold truncate ${selectedOrder ? 'text-slate-900' : 'text-slate-400'}`}>
                      {selectedOrder ? selectedOrder.orderNumber : 'Click to select order...'}
                    </span>
                  </div>
                  <ChevronDown size={20} className={`text-slate-300 transition-transform duration-300 ${showDropdown ? 'rotate-180 text-indigo-500' : 'group-hover:text-slate-500'}`} />
                </div>

                {showDropdown && (
                  <div className="absolute z-50 w-full mt-3 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl shadow-indigo-600/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><Search size={16} /></div>
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search order or party..."
                        className="w-full bg-transparent outline-none text-sm font-bold text-slate-700"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredOrders.length > 0 ? filteredOrders.map(o => (
                        <div
                          key={o.id}
                          onClick={() => selectOrder(o.id)}
                          className={`px-5 py-3.5 cursor-pointer hover:bg-indigo-50 transition-all flex items-center justify-between border-b border-slate-50 last:border-0 ${
                            selectedOrderId === o.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                          }`}
                        >
                          <div>
                            <p className="text-sm font-black text-slate-800 tracking-tight">{o.orderNumber}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{o.distributorName}</p>
                          </div>
                          <div className="text-right">
                             <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase tracking-widest">{o.status}</div>
                             <p className="text-[9px] text-slate-300 font-black mt-1 uppercase">{o.date}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="px-5 py-10 text-center flex flex-col items-center gap-3">
                          <AlertCircle size={32} className="text-slate-200" />
                          <p className="text-xs text-slate-400 font-bold max-w-[180px]">No eligible orders found with delivered stock.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Scanner UI */}
            <div className={`bg-white rounded-[2rem] border-2 transition-all p-6 shadow-sm ${
              selectedOrder ? 'border-indigo-100 opacity-100' : 'border-slate-50 opacity-50 grayscale'
            }`}>
               <div className="flex items-center gap-3 mb-6">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shadow-lg transition-colors ${
                  selectedOrder ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                }`}>2</div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">SKU Scan Verification</h3>
              </div>

              <div className="relative group">
                <div className={`absolute inset-0 bg-indigo-600/5 rounded-[1.25rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity`}></div>
                <div className={`relative flex items-center bg-slate-50 border-2 rounded-[1.25rem] px-5 py-4 transition-all ${
                  selectedOrder ? 'border-indigo-100 group-focus-within:border-indigo-500 group-focus-within:bg-white' : 'border-slate-50'
                }`}>
                  <Barcode className={`${selectedOrder ? 'text-indigo-600' : 'text-slate-300'} animate-pulse`} size={24} />
                  <input
                    ref={scanInputRef}
                    type="text"
                    disabled={!selectedOrder}
                    placeholder={selectedOrder ? "Scan carton SKU..." : "Select order first..."}
                    className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-black text-slate-800 placeholder:text-slate-300 uppercase tracking-widest"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanSKU(scanInput)}
                  />
                  {scanInput && (
                    <button onClick={() => setScanInput('')} className="p-1 hover:bg-slate-200 rounded-full">
                      <X size={14} className="text-slate-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white"><ShieldCheck size={16} /></div>
                   <div>
                     <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Logic Enforcement</p>
                     <p className="text-[10px] font-bold text-emerald-600/80 leading-tight mt-0.5">Validates against delivered batch quantities automatically.</p>
                   </div>
                </div>
                <p className="text-[9px] text-slate-400 text-center italic font-bold">Press ENTER after manual SKU typing if not auto-scanning.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Scanned Item List */}
          <div className="lg:col-span-8">
            <div className={`bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden min-h-[520px] flex flex-col ${
              selectedOrder ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4'
            } transition-all duration-500`}>
              <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Package size={18} className="text-indigo-600" />
                    Return Cargo Breakdown
                  </h3>
                  {selectedOrder && (
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">
                      Validating items from {selectedOrder.orderNumber}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {selectedCount > 0 && (
                    <div className="flex items-center gap-4 animate-in fade-in zoom-in slide-in-from-right-4 duration-500">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Items</p>
                        <p className="text-sm font-black text-indigo-600 leading-none">{selectedCount}</p>
                      </div>
                      <div className="w-px h-6 bg-slate-200"></div>
                      <div className="text-right mr-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Cartons</p>
                        <p className="text-sm font-black text-slate-900 leading-none">{totalReturnCartons}</p>
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-200 disabled:bg-slate-200 disabled:shadow-none"
                      >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        Process Return
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {!selectedOrder ? (
                  <div className="h-96 flex flex-col items-center justify-center text-center p-12">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6">
                      <ShoppingBag size={48} />
                    </div>
                    <h4 className="text-lg font-black text-slate-300 uppercase tracking-widest">Selection Pending</h4>
                    <p className="text-sm text-slate-300 font-bold max-w-[300px] mt-2 italic">Select a source order from the left panel to begin scanning returned cartoons.</p>
                  </div>
                ) : selectedCount === 0 ? (
                  <div className="h-96 flex flex-col items-center justify-center text-center p-12">
                    <div className="w-24 h-24 bg-indigo-50/50 rounded-[2.5rem] flex items-center justify-center text-indigo-200 mb-6 group relative">
                      <Barcode size={48} className="group-hover:scale-110 transition-all duration-700" />
                      <div className="absolute inset-0 bg-indigo-400/20 rounded-[2.5rem] animate-ping duration-[3000ms]"></div>
                    </div>
                    <h4 className="text-lg font-black text-indigo-400/60 uppercase tracking-widest">Ready to Scan</h4>
                    <p className="text-sm text-slate-400 font-bold max-w-[300px] mt-2">Start scanning carton barcodes. The system will auto-add them based on delivery history.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(returnEntries).map(([variantId, count]) => {
                      const orderItem = selectedOrder.items.find(i => i.variantId === variantId);
                      const article = articles.find(a => a.id === orderItem?.articleId);
                      const variant = article?.variants?.find(v => v.id === variantId || v._id === variantId);
                      const delivered = (orderItem as any)?.fulfilledCartonCount || 0;
                      const img = getVariantImage(variantId, orderItem!.articleId);

                      return (
                        <div 
                          key={variantId} 
                          className="group bg-white rounded-2xl border-2 border-slate-50 p-4 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all flex items-center gap-4 animate-in slide-in-from-bottom-4"
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group-hover:scale-110 transition-all duration-500">
                             {img ? <img src={img} className="w-full h-full object-cover" /> : <ImageIcon className="w-full h-full p-4 text-slate-300" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-widest">Variant</span>
                              <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{article?.name} · {variant?.color}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">SKU: {variant?.sku || 'N/A'}</p>
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 rounded text-[8.5px] font-black text-slate-500 border border-slate-200">
                                <Barcode size={10} />
                                <span>SCANNABLE: {`${article?.name}-${variant?.color}-${variant?.sizeRange}`.replace(/\s+/g, "")}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex flex-col items-end">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Returning</p>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-indigo-600">{count}</span>
                                <span className="text-xs font-bold text-slate-300 tracking-tight italic">/ {delivered} delivered</span>
                              </div>
                            </div>

                            <div className="flex items-center bg-white border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                               <button 
                                onClick={() => setReturnEntries(p => ({ ...p, [variantId]: Math.max(1, count - 1) }))}
                                className="px-3 py-1.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                <ChevronDown className="rotate-180" size={14} />
                              </button>
                               <div className="w-px h-6 bg-slate-100"></div>
                               <button 
                                onClick={() => {
                                  if (count < delivered) {
                                    setReturnEntries(p => ({ ...p, [variantId]: count + 1 }));
                                  } else {
                                    toast.error("Maximum delivered units already selected.");
                                  }
                                }}
                                className="px-3 py-1.5 hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>

                            <button
                              onClick={() => removeEntry(variantId)}
                              className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                            >
                              <Trash2 size={16} />
                            </button>
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
        /* History View */
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><History size={20} /></div>
                   <div>
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Return Audit Logs</h3>
                     <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-widest italic leading-none">View all validated items returned to inventory</p>
                   </div>
                 </div>

                 <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input 
                      type="text" 
                      placeholder="Find return or order..."
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-[11px] font-bold"
                    />
                 </div>
              </div>

              {isLoadingHistory ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Syncing transactions...</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="p-20 flex flex-col items-center justify-center text-center">
                   <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6">
                      <RotateCcw size={40} />
                   </div>
                   <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">No Returns Recorded</h4>
                   <p className="text-xs text-slate-300 font-bold max-w-xs mt-2 italic font-serif">Transactions will appear here once returns are processed and stocked back into the warehouse.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30">
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction ID</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Time</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Distributor / Party</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source Order</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty (Ctn)</th>
                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {historyItems.map((ret) => (
                        <tr key={ret._id} className="hover:bg-indigo-50/20 cursor-default transition-all group">
                          <td className="px-8 py-5">
                            <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">{ret.returnNumber}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2 text-slate-500">
                               <Calendar size={12} className="text-slate-300" />
                               <span className="text-xs font-bold">{new Date(ret.createdAt).toLocaleDateString()}</span>
                               <span className="text-[10px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-tighter">
                                 {new Date(ret.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                               <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg group-hover:bg-indigo-500 group-hover:text-white transition-all"><User size={12} /></div>
                               <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{ret.distributorName}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 w-fit px-2.5 py-1 rounded-lg">
                                <ShoppingBag size={10} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{ret.orderNumber}</span>
                             </div>
                          </td>
                          <td className="px-8 py-5 text-center">
                             <span className="text-sm font-black text-slate-900">{ret.totalCartons}</span>
                          </td>
                          <td className="px-8 py-5 text-right">
                             <button
                               onClick={() => setSelectedHistoryItem(ret)}
                               className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-600 hover:bg-slate-900 hover:text-white hover:shadow-xl transition-all"
                             >
                               Details <ArrowRight size={12} />
                             </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Return Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
              <div className="p-8 border-b-2 border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20"><Info size={24} /></div>
                    <div>
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black text-indigo-500 bg-white px-2 py-0.5 rounded-lg border border-indigo-100 uppercase tracking-widest">Transaction View</span>
                         <h2 className="text-xl font-black text-slate-900 tracking-tighter">{selectedHistoryItem.returnNumber}</h2>
                       </div>
                       <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Processed on {new Date(selectedHistoryItem.createdAt).toLocaleString()}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedHistoryItem(null)} className="p-3 hover:bg-slate-100 rounded-[1.25rem] transition-all text-slate-300 hover:text-slate-900"><X size={24} /></button>
              </div>

              <div className="p-8 max-h-[450px] overflow-y-auto">
                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Original Order</p>
                       <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedHistoryItem.orderNumber}</p>
                    </div>
                    <div className="bg-indigo-50/30 p-5 rounded-[1.5rem] border border-indigo-100">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Total Yield</p>
                       <div className="flex items-center gap-3">
                         <div>
                            <span className="text-lg font-black text-slate-900">{selectedHistoryItem.totalCartons}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Ctn</span>
                         </div>
                         <div className="w-px h-4 bg-indigo-200"></div>
                         <div>
                            <span className="text-lg font-black text-indigo-600">{selectedHistoryItem.totalPairs}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Pairs</span>
                         </div>
                       </div>
                    </div>
                 </div>

                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Itemized Breakdown</h4>
                 <div className="space-y-3">
                    {selectedHistoryItem.items.map((item: any, idx: number) => {
                       const art = articles.find(a => a.id === item.articleId);
                       const vari = art?.variants?.find(v => v.id === item.variantId || v._id === item.variantId);
                       const img = getVariantImage(item.variantId, item.articleId);

                       return (
                         <div key={idx} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 transition-all group">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0">
                               {img ? <img src={img} className="w-full h-full object-cover" /> : <Package size={20} className="w-full h-full p-3 text-slate-200" />}
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{art?.name || 'Unknown Article'}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{vari?.color || 'N/A'} · {vari?.sizeRange || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-sm font-black text-slate-900">{item.cartonCount} CTN</p>
                               <p className="text-[10px] font-bold text-indigo-500 uppercase">{item.pairCount} Pairs</p>
                            </div>
                            <div className="size- break-all flex flex-wrap gap-1 mt-1">
                                {/* Size breakdown logic if needed */}
                            </div>
                         </div>
                       );
                    })}
                 </div>

                 {selectedHistoryItem.reason && (
                   <div className="mt-8 p-5 bg-emerald-50 rounded-[1.5rem] border border-emerald-100 flex gap-4 items-start">
                     <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20"><Info size={16} /></div>
                     <div>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Return Reason</p>
                        <p className="text-xs font-bold text-emerald-800 mt-1 leading-relaxed opacity-80">{selectedHistoryItem.reason}</p>
                     </div>
                   </div>
                 )}
              </div>

              <div className="p-8 bg-slate-50 flex items-center justify-between">
                 <button 
                  onClick={() => window.print()}
                  className="px-6 py-2.5 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:border-slate-900 hover:text-white hover:bg-slate-900 transition-all shadow-sm"
                 >
                   Download Receipt
                 </button>
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    Authorized Audit Entry <ExternalLink size={12} />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Global CSS for Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default Returns;
