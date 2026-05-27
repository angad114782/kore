import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Clock, X, IndianRupee, Loader2 } from 'lucide-react';
import { orderService } from '../../services/orderService';
import { toast } from 'sonner';

interface OverdueOrder {
  _id: string;
  orderNumber: string;
  distributorName: string;
  date: string;
  deliveredAt?: string;
  finalAmount?: number;
  totalAmount: number;
  daysSinceDelivery: number;
  urgency: 'YELLOW' | 'RED';
  status: string;
}

interface OverduePaymentsProps {
  isAdmin?: boolean;
  onPaymentMarked?: () => void;
}

const OverduePayments: React.FC<OverduePaymentsProps> = ({ isAdmin = false, onPaymentMarked }) => {
  const [orders, setOrders] = useState<OverdueOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await orderService.getOverdueOrders();
      setOrders(res.data?.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async () => {
    if (!confirmId) return;
    setMarking(true);
    try {
      await orderService.markOrderPaid(confirmId, note);
      toast.success('Payment marked as received');
      setConfirmId(null);
      setNote('');
      load();
      onPaymentMarked?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to mark payment');
    } finally {
      setMarking(false);
    }
  };

  if (!loading && orders.length === 0) return null;

  const red = orders.filter(o => o.urgency === 'RED');
  const yellow = orders.filter(o => o.urgency === 'YELLOW');

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-50 rounded-xl">
              <AlertTriangle size={18} className="text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Overdue Payments</h3>
              <p className="text-[10px] text-slate-400">Delivered orders awaiting payment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {red.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black">
                {red.length} Critical
              </span>
            )}
            {yellow.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black">
                {yellow.length} Warning
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map(o => {
              const isRed = o.urgency === 'RED';
              const amount = o.finalAmount || o.totalAmount || 0;
              return (
                <div
                  key={o._id}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                    isRed
                      ? 'bg-rose-50/60 hover:bg-rose-50'
                      : 'bg-amber-50/40 hover:bg-amber-50/70'
                  }`}
                >
                  {/* Urgency dot */}
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRed ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{o.orderNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${isRed ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                        {o.daysSinceDelivery}d overdue
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{o.distributorName}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-0.5 justify-end">
                      <IndianRupee size={11} className="text-slate-600" />
                      <span className="font-black text-sm text-slate-800">{amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <Clock size={9} className="text-slate-400" />
                      <span className="text-[9px] text-slate-400">{new Date(o.deliveredAt || o.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => { setConfirmId(o._id); setNote(''); }}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      <CheckCircle size={12} /> Mark Paid
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mark Paid confirmation modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <CheckCircle size={22} className="text-emerald-600" />
              </div>
              <button onClick={() => setConfirmId(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Mark Payment Received</h3>
            <p className="text-sm text-slate-500 mb-4">
              {orders.find(o => o._id === confirmId)?.orderNumber} — {orders.find(o => o._id === confirmId)?.distributorName}
            </p>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Note <span className="font-normal text-slate-400">(optional)</span></label>
            <input
              type="text"
              placeholder="e.g. Cheque, NEFT, Cash..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 mb-4"
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={marking}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {marking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OverduePayments;
