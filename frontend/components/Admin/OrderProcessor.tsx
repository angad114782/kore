import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Download, 
  Search, 
  Filter,
  X,
  User,
  ChevronRight,
  Loader2,
  FileText,
  ImageIcon
} from 'lucide-react';
import { Order, OrderStatus, Article, Inventory } from '../../types';
import OrderDetail from '../Distributor/OrderDetail';
import { distributorOrderService } from '../../services/distributorOrderService';
import Pagination from '../ui/Pagination';
import { toast } from 'sonner';

interface OrderProcessorProps {
  articles: Article[];
  inventory: Inventory[];
  updateStatus: (id: string, status: OrderStatus) => void;
  isLoading?: boolean;
  lastUpdated?: Date;
}

const OrderProcessor: React.FC<OrderProcessorProps> = ({ articles, inventory, updateStatus, isLoading: globalLoading, lastUpdated }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  // Pagination & Server-side State
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDesc, setSortDesc] = useState(true);

  const fetchOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await distributorOrderService.getAllOrders({
        page: currentPage,
        limit: 10,
        q: searchQuery,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortDesc
      });
      setOrders(res.items);
      setMeta(res.meta);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      toast.error("Failed to load orders");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, startDate, endDate, sortBy, sortDesc]);

  // Refetch when dependencies change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Also refetch when global lastUpdated changes (socket update)
  useEffect(() => {
    if (lastUpdated) fetchOrders(true); // Silent update for socket events
  }, [lastUpdated]);

  const selectedOrder = useMemo(() => 
    orders.find(o => o.id === selectedOrderId), 
    [orders, selectedOrderId]
  );

  if (selectedOrder) {
    return (
      <OrderDetail 
        order={selectedOrder} 
        articles={articles} 
        inventory={inventory}
        onBack={() => setSelectedOrderId(null)} 
      />
    );
  }

  const isAnyLoading = loading || globalLoading;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      {/* Header - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Purchase Orders</h2>
          <p className="text-slate-400 text-xs font-medium">Manage distributor sales flow</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg">
              <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${isAnyLoading ? 'animate-pulse' : ''}`} />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Last Synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          )}
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Filters - Compact */}
      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-xs text-slate-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
              className="px-2 py-1.5 rounded-xl bg-slate-50 border-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium text-slate-600 outline-none"
            />
            <span className="text-slate-300 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
              className="px-2 py-1.5 rounded-xl bg-slate-50 border-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium text-slate-600 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}-${sortDesc}`}
              onChange={(e) => {
                const [val, desc] = e.target.value.split('-');
                setSortBy(val);
                setSortDesc(desc === 'true');
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 rounded-xl bg-slate-50 border-none focus:ring-1 focus:ring-indigo-500 text-xs font-medium text-slate-600 outline-none cursor-pointer"
            >
              <option value="createdAt-true">Newest First</option>
              <option value="createdAt-false">Oldest First</option>
              <option value="finalAmount-true">Amount: High to Low</option>
              <option value="finalAmount-false">Amount: Low to High</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto scrollbar-hide">
          <Filter className="text-slate-300 mr-1 shrink-0" size={14} />
          {(['ALL', ...Object.values(OrderStatus)] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                statusFilter === status 
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* List - Compact */}
      <div className="relative min-h-[200px]">
        {loading && !orders.length && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {orders.map(order => (
            <div 
              key={order.id} 
              onClick={() => setSelectedOrderId(order.id)}
              className="bg-white rounded-xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-all group overflow-hidden cursor-pointer"
            >
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-4 items-center flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 text-slate-400`}>
                    <Package size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="font-bold text-sm text-slate-900 tracking-tight">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</h4>
                      <StatusBadge status={order.status} />
                    </div>
                    
                    {/* Non-Interactive Progress Timeline */}
                    <div className="mb-2 hidden md:block">
                      <OrderProgress 
                        status={order.status} 
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5"><User size={12} className="text-slate-300" /> {order.distributorName}</span>
                      <span className="flex items-center gap-1.5"><Clock size={12} /> {order.date}</span>
                      <span className="text-indigo-600 font-black">₹{(order.finalAmount || order.totalAmount).toLocaleString()}</span>
                      
                      {/* Carton Analytics */}
                      <div className="flex items-center gap-3 ml-2 pl-4 border-l border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[8px] text-slate-400">Total</span>
                          <span className="text-slate-900 font-bold">{order.totalCartons}ctn</span>
                        </div>
                        {(() => {
                          const allocated = order.items.reduce((acc, item) => acc + (item.allocatedCartonCount ?? 0), 0);
                          const fulfilled = order.status === OrderStatus.RECEIVED ? allocated : 0;
                          const pending = order.totalCartons - fulfilled;
                          return (
                            <>
                              <div className="flex flex-col">
                                <span className="text-[8px] text-emerald-500"> Delivered</span>
                                <span className={`font-bold ${fulfilled > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{fulfilled}ctn</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[8px] text-amber-500">Pending</span>
                                <span className={`font-bold ${pending > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{pending}ctn</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0" onClick={(e) => e.stopPropagation()}>
                  <div className="md:hidden">
                    <StatusBadge status={order.status} />
                  </div>
                  
                  <div className="flex gap-2">
                    {order.status === OrderStatus.BOOKED && (
                      <span className="px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg font-bold text-[9px] uppercase tracking-wider border border-slate-100 flex items-center gap-1.5">
                        <Loader2 size={10} className="animate-spin" /> Allocation Required
                      </span>
                    )}
                    {order.status === OrderStatus.RECEIVED && order.billUrl && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';
                          window.open(`${baseUrl.replace('/api', '')}${order.billUrl}`, '_blank');
                        }}
                        className="px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg font-bold text-[10px] uppercase hover:bg-violet-600 hover:text-white transition-all tracking-wider flex items-center gap-1.5"
                      >
                        <FileText size={12} /> View Bill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {orders.length === 0 && !loading && (
            <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-200 text-center">
              <Package className="text-slate-200 mx-auto mb-3" size={32} />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No matching orders</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={meta.totalPages}
          onPageChange={setCurrentPage}
          totalItems={meta.total}
          itemsPerPage={meta.limit}
        />
      )}
    </div>
  );
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.BOOKED]: 'Booked',
  [OrderStatus.PFD]: 'Prepare for Delivery',
  [OrderStatus.RFD]: 'Ready for Delivery',
  [OrderStatus.OFD]: 'Out for Delivery',
  [OrderStatus.RECEIVED]: 'Received',
  [OrderStatus.PENDING]: 'Pending',
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
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${color}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

const OrderProgress: React.FC<{ 
  status: OrderStatus;
}> = ({ status }) => {
  const stages = [
    OrderStatus.BOOKED,
    OrderStatus.PFD,
    OrderStatus.RFD,
    OrderStatus.OFD,
    OrderStatus.RECEIVED
  ];
  
  const currentIndex = stages.indexOf(status);
  
  return (
    <div className="flex items-center gap-1.5 w-full max-w-[320px]">
      {stages.map((s, idx) => {
        const isCompleted = idx <= currentIndex;
        const isActive = idx === currentIndex;
        
        return (
          <React.Fragment key={s}>
            <div
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 relative group/step ${
                isCompleted ? 'bg-indigo-600' : 'bg-slate-100'
              } ${isActive ? 'ring-2 ring-indigo-500/20' : ''}`}
            >
              {/* Tooltip */}
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover/step:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {STATUS_LABELS[s] || s}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div className={`w-0.5 h-0.5 rounded-full ${idx < currentIndex ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default OrderProcessor;
