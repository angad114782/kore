
import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  MapPin, 
  CreditCard, 
  Calendar,
  Printer,
  Download,
  FileText,
  Upload,
  Loader2,
  ImageIcon,
  ExternalLink
} from 'lucide-react';
import { Order, OrderStatus, Article } from '../../types';
import { getImageUrl } from '../../utils/imageUtils';
import { distributorOrderService } from '../../services/distributorOrderService';
import { toast } from 'sonner';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.BOOKED]: 'Booked',
  [OrderStatus.PFD]: 'Prepare for Delivery',
  [OrderStatus.RFD]: 'Ready for Delivery',
  [OrderStatus.OFD]: 'Out for Delivery',
  [OrderStatus.RECEIVED]: 'Received',
};

interface OrderDetailProps {
  order: Order;
  articles: Article[];
  onBack: () => void;
  isDistributor?: boolean;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ order, articles, onBack, isDistributor = false }) => {
  const [uploading, setUploading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Allocation state for Admins
  const [allocations, setAllocations] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    order.items.forEach(item => {
      if (item.variantId) {
        initial[item.variantId] = {
          variantId: item.variantId,
          allocatedCartonCount: item.allocatedCartonCount ?? item.cartonCount,
          allocatedPairCount: item.allocatedPairCount ?? item.pairCount,
          allocatedSizeQuantities: { ...(item.allocatedSizeQuantities ?? item.sizeQuantities ?? {}) }
        };
      }
    });
    return initial;
  });

  const handleCartonAllocationChange = (variantId: string, newCartonCount: number, originalCartonCount: number, originalPairCount: number, originalSizeQuantities: Record<string, number>) => {
    setAllocations(prev => {
      const cartonCount = Math.max(0, Math.min(newCartonCount, originalCartonCount));
      const ratio = originalCartonCount > 0 ? cartonCount / originalCartonCount : 0;
      
      const newPairCount = Math.round(originalPairCount * ratio);
      const newSizeQuantities: Record<string, number> = {};
      
      Object.entries(originalSizeQuantities).forEach(([size, qty]) => {
        newSizeQuantities[size] = Math.round(qty * ratio);
      });

      return {
        ...prev,
        [variantId]: {
          variantId,
          allocatedCartonCount: cartonCount,
          allocatedPairCount: newPairCount,
          allocatedSizeQuantities: newSizeQuantities
        }
      };
    });
  };

  const handleAllocateAndProceed = async () => {
    try {
      setUploading(true);
      const allocatedItems = Object.values(allocations);
      const updated = await distributorOrderService.updateOrderStatus(
        currentOrder.id, 
        OrderStatus.PFD, 
        allocatedItems
      );
      if (updated) {
        setCurrentOrder(updated);
        toast.success("Allocation saved and Order marked as Preparing for Delivery!");
      }
    } catch (err: any) {
      console.error("Failed to allocate order", err);
      toast.error(err?.response?.data?.message || "Failed to update order");
    } finally {
      setUploading(false);
    }
  };

  const statusSteps = [
    { status: OrderStatus.BOOKED, label: 'Booked', icon: <Clock size={16} /> },
    { status: OrderStatus.PFD, label: 'Prepare for Delivery', icon: <Package size={16} /> },
    { status: OrderStatus.RFD, label: 'Ready for Delivery', icon: <Package size={16} /> },
    { status: OrderStatus.OFD, label: 'Out for Delivery', icon: <Truck size={16} /> },
    { status: OrderStatus.RECEIVED, label: 'Received', icon: <CheckCircle size={16} /> },
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.status === currentOrder.status);

  const handleMarkAsReceived = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      const updated = await distributorOrderService.markAsReceived(currentOrder.id, selectedFile);
      if (updated) {
        setCurrentOrder(updated);
        setSelectedFile(null);
        setFilePreview(null);
        toast.success("Order marked as Received!");
      }
    } catch (err: any) {
      console.error("Failed to mark as received", err);
      toast.error(err?.response?.data?.message || "Failed to mark as received");
    } finally {
      setUploading(false);
    }
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setFilePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null); // PDF — no image preview
      }
    }
  };

  const billFullUrl = currentOrder.billUrl
    ? `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api').replace('/api', '')}${currentOrder.billUrl}`
    : null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Order #{currentOrder.orderNumber || currentOrder.id.slice(-6).toUpperCase()}</h2>
              <StatusBadge status={currentOrder.status} />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={12} /> {currentOrder.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all">
            <Printer size={14} /> Print
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-sm">
            <Download size={14} /> Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          {/* Status Timeline - Compact */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex justify-between">
              {/* Progress Line */}
              <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 z-0">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-1000" 
                  style={{ width: `${(currentStatusIndex / (statusSteps.length - 1)) * 100}%` }}
                ></div>
              </div>

              {statusSteps.map((step, index) => {
                const isActive = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={step.status} className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-2 border-white shadow-sm ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                    } ${isCurrent ? 'ring-2 ring-indigo-100 scale-110' : ''}`}>
                      {isActive && index < currentStatusIndex ? <CheckCircle size={14} /> : step.icon}
                    </div>
                    <span className={`mt-2 text-[8px] font-bold uppercase tracking-wider ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mark as Received — only for distributors when status is OFD */}
            {isDistributor && currentOrder.status === OrderStatus.OFD && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={onFileSelected}
                  className="hidden"
                />

                {/* File preview */}
                {selectedFile && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {filePreview ? (
                      <img src={filePreview} alt="Bill preview" className="max-h-48 mx-auto rounded-lg border border-slate-200 object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <FileText size={36} className="text-violet-400" />
                        <p className="text-xs font-bold text-slate-500">PDF Selected</p>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 text-center mt-2 font-semibold truncate">{selectedFile.name}</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      Change File
                    </button>
                  </div>
                )}

                {!selectedFile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    <Upload size={16} /> Select Bill Image / PDF
                  </button>
                ) : (
                  <button
                    onClick={handleMarkAsReceived}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} /> Mark as Received
                      </>
                    )}
                  </button>
                )}
                <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
                  Upload your bill image or PDF to confirm order receipt
                </p>
              </div>
            )}
          </div>

          {/* Bill Image Section */}
          {billFullUrl && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-violet-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Uploaded Bill</h3>
                </div>
                <a
                  href={billFullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-600 rounded-lg font-bold text-[10px] uppercase hover:bg-violet-600 hover:text-white transition-all tracking-wider"
                >
                  <ExternalLink size={12} /> Open
                </a>
              </div>
              <div className="p-4 flex items-center justify-center bg-slate-50">
                {currentOrder.billUrl?.endsWith('.pdf') ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <FileText size={48} className="text-violet-400" />
                    <p className="text-xs font-bold text-slate-500">PDF Bill Uploaded</p>
                  </div>
                ) : (
                  <img 
                    src={billFullUrl} 
                    alt="Uploaded Bill" 
                    className="max-h-64 rounded-lg border border-slate-200 object-contain"
                  />
                )}
              </div>
            </div>
          )}

          {/* Items Detail - Compact */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Order Items</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {currentOrder.items.map((item, idx) => {
                const article = articles.find(a => a.id === item.articleId);
                const variant = article?.variants?.find(v => v.id === item.variantId);

                return (
                  <div key={idx} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                      <img 
                        src={getImageUrl(variant?.images?.[0] || article?.imageUrl || '')} 
                        alt={article?.name || 'Article'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 truncate tracking-tight">
                        {article?.name || 'Unknown Article'} 
                        {variant && ` - ${variant.color} - ${variant.sizeRange}`}
                      </h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {variant?.color || 'N/A'}
                        </span>
                        {/* Carton-Level Allocation UI for Admins */}
                        {!isDistributor && currentOrder.status === OrderStatus.BOOKED && (
                          <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Carton Allocation</span>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Action Required</span>
                            </div>
                            <div className="flex items-end gap-6">
                              <div className="flex-1 space-y-1.5">
                                <div className="flex justify-between items-center px-1">
                                  <label className="text-[10px] font-bold text-slate-500">Allocated Cartons</label>
                                  <span className="text-[9px] font-black text-slate-400">
                                    Requested: {item.cartonCount}
                                  </span>
                                </div>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={allocations[item.variantId!]?.allocatedCartonCount ?? item.cartonCount}
                                    max={item.cartonCount}
                                    onChange={(e) => handleCartonAllocationChange(
                                      item.variantId!, 
                                      parseInt(e.target.value) || 0, 
                                      item.cartonCount, 
                                      item.pairCount, 
                                      item.sizeQuantities || {}
                                    )}
                                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-300 uppercase">Ctns</span>
                                </div>
                              </div>
                              <div className="bg-white/50 px-4 py-2.5 rounded-xl border border-indigo-100 border-dashed">
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-0.5">Calculated Pairs</p>
                                <p className="text-sm font-black text-indigo-900">
                                  {allocations[item.variantId!]?.allocatedPairCount ?? item.pairCount} <span className="text-[10px] text-slate-400">pairs</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-slate-900 tracking-tight">₹{item.price.toLocaleString()}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">₹{(item.price / (item.pairCount || 1)).toFixed(0)} / Pair</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {!isDistributor && currentOrder.status === OrderStatus.BOOKED && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  disabled={uploading}
                  onClick={handleAllocateAndProceed}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  Allocate & Prepare for Delivery
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar info - Compact */}
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-4 border-b border-white/10 pb-3 text-slate-400">Payment Breakdown</h3>
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Total Cartons</span>
                <span className="font-bold text-white">{currentOrder.totalCartons}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Total Pairs</span>
                <span className="font-bold text-white">{currentOrder.totalPairs}</span>
              </div>
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold text-slate-400">Subtotal</span>
                  <span className="text-sm font-bold text-slate-300">₹{currentOrder.totalAmount.toLocaleString()}</span>
                </div>
                {(currentOrder.discountPercentage || 0) > 0 && (
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-bold text-emerald-400">Discount ({currentOrder.discountPercentage}%)</span>
                    <span className="text-sm font-bold text-emerald-400">-₹{(currentOrder.discountAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-2 border-t border-white/5">
                  <span className="text-xs font-bold text-white">Final Amount</span>
                  <span className="text-xl font-black text-indigo-400 tracking-tight">₹{(currentOrder.finalAmount || currentOrder.totalAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl flex items-center gap-3 mt-4 border border-white/5">
              <CreditCard size={16} className="text-indigo-400" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Terms</p>
                <p className="text-[11px] font-medium">Net 30 Days</p>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Delivery</h3>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-sm text-slate-900 tracking-tight">{currentOrder.distributorName}</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                Warehouse 7A, Logistics Park,<br />
                Indore, MP - 452001
              </p>
              <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
                <p className="text-[10px] font-semibold text-slate-700">+91 99999 88888</p>
                <p className="text-[10px] font-semibold text-slate-700">ops@distributor.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const config = {
    [OrderStatus.BOOKED]: { color: 'bg-indigo-50 text-indigo-500 border-indigo-100' },
    [OrderStatus.PFD]: { color: 'bg-amber-50 text-amber-500 border-amber-100' },
    [OrderStatus.RFD]: { color: 'bg-blue-50 text-blue-500 border-blue-100' },
    [OrderStatus.OFD]: { color: 'bg-emerald-50 text-emerald-500 border-emerald-100' },
    [OrderStatus.RECEIVED]: { color: 'bg-slate-50 text-slate-500 border-slate-100' },
  };

  const { color } = config[status] || { color: 'bg-gray-50 text-gray-500 border-gray-100' };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${color}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

export default OrderDetail;
