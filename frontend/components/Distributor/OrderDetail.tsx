
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
  ExternalLink,
  ChevronRight,
  ShoppingCart,
  FilePlus,
  Phone,
  User as UserIcon,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { Order, OrderStatus, Article, Inventory } from '../../types';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

// Extend jsPDF with autoTable for type safety if needed, but we'll use autoTable(doc, ...)
interface jsPDFWithAutoTable extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}
import { getImageUrl } from '../../utils/imageUtils';
import { distributorOrderService } from '../../services/distributorOrderService';
import { toast } from 'sonner';
import { COMPANY_CONFIG } from '../../constants';

const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.BOOKED]: 'Booked',
  [OrderStatus.PFD]: 'Prepare for Delivery',
  [OrderStatus.RFD]: 'Ready for Delivery',
  [OrderStatus.OFD]: 'Out for Delivery',
  [OrderStatus.RECEIVED]: 'Received',
  [OrderStatus.PENDING]: 'Pending',
};

interface OrderDetailProps {
  order: Order;
  articles: Article[];
  inventory: Inventory[];
  onBack: () => void;
  isDistributor?: boolean;
}

const OrderDetail: React.FC<OrderDetailProps> = ({ order, articles, inventory, onBack, isDistributor = false }) => {
  const [uploading, setUploading] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order>(order);

  // Sync state if order prop changes (real-time updates from parent/socket)
  React.useEffect(() => {
    setCurrentOrder(order);
  }, [order]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New states for Docs
  const [shippingFiles, setShippingFiles] = useState<{ invoice?: File, ewayBill?: File, transportBill?: File }>({});
  const [receiverName, setReceiverName] = useState("");
  const [receiverMobile, setReceiverMobile] = useState("");
  const [receivingNote, setReceivingNote] = useState<File | null>(null);
  const [receivingNotePreview, setReceivingNotePreview] = useState<string | null>(null);

  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const ewayInputRef = useRef<HTMLInputElement>(null);
  const transportInputRef = useRef<HTMLInputElement>(null);
  const receivingNoteInputRef = useRef<HTMLInputElement>(null);

  // Allocation state for Admins — re-derive whenever currentOrder changes
  const [allocations, setAllocations] = useState<Record<string, any>>({});

  // Re-sync allocation state from order data (runs on mount + after save)
  React.useEffect(() => {
    const initial: Record<string, any> = {};
    currentOrder.items.forEach(item => {
      if (item.variantId) {
        initial[item.variantId] = {
          variantId: item.variantId,
          allocatedCartonCount: item.allocatedCartonCount ?? item.cartonCount,
          allocatedPairCount: item.allocatedPairCount ?? item.pairCount,
          allocatedSizeQuantities: { ...(item.allocatedSizeQuantities ?? item.sizeQuantities ?? {}) }
        };
      }
    });
    setAllocations(initial);
  }, [currentOrder]);

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
        { allocatedItems }
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

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    try {
      setUploading(true);
      
      let options: any = {};
      
      // If moving to OFD, include shipping files
      if (newStatus === OrderStatus.OFD) {
        if (!shippingFiles.invoice || !shippingFiles.ewayBill || !shippingFiles.transportBill) {
          toast.error("Please upload all 3 shipping documents (Invoice, E-Way Bill, Transport Bill)");
          setUploading(false);
          return;
        }
        options.files = {
          invoice: shippingFiles.invoice,
          ewayBill: shippingFiles.ewayBill,
          transportBill: shippingFiles.transportBill
        };
      }

      const updated = await distributorOrderService.updateOrderStatus(currentOrder.id, newStatus, options);
      if (updated) {
        setCurrentOrder(updated);
        toast.success(`Order marked as ${STATUS_LABELS[newStatus]}!`);
      }
    } catch (err: any) {
      console.error("Failed to update status", err);
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setUploading(false);
    }
  };

  const handleMarkAsReceived = async () => {
    if (!receivingNote || !receiverName || !receiverMobile) {
      toast.error("Please provide Receiving Note, Receiver Name, and Mobile Number");
      return;
    }
    try {
      setUploading(true);
      const updated = await distributorOrderService.markAsReceived(currentOrder.id, {
        receivingNote,
        receiverName,
        receiverMobile
      });
      if (updated) {
        setCurrentOrder(updated);
        setReceivingNote(null);
        setReceivingNotePreview(null);
        setReceiverName("");
        setReceiverMobile("");
        toast.success("Order marked as Received!");
      }
    } catch (err: any) {
      console.error("Failed to mark as received", err);
      toast.error(err?.response?.data?.message || "Failed to mark as received");
    } finally {
      setUploading(false);
    }
  };

  const onShippingFileSelected = (key: 'invoice' | 'ewayBill' | 'transportBill', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setShippingFiles(prev => ({ ...prev, [key]: file }));
      toast.info(`${key.charAt(0).toUpperCase() + key.slice(1)} added`);
    }
  };

  const onReceivingNoteSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceivingNote(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => setReceivingNotePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setReceivingNotePreview(null);
      }
    }
  };

  const handleDownloadPI = () => {
    const doc = new jsPDF("portrait", "pt", "a4") as jsPDFWithAutoTable;
    
    // Header Section - adapted from exportPO.ts for professional look
    const topTableData: any[] = [];
    
    // Row 1: Company Info vs Distributor Details
    topTableData.push([
      { content: "Company Name", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_CONFIG.name,
      { content: "Party Name", styles: { fontStyle: "bold" } },
      currentOrder.distributorName,
      { content: "PI Date", styles: { fontStyle: "bold" } },
      currentOrder.date,
    ]);

    // Row 2
    topTableData.push([
      { content: "CIN No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_CONFIG.cin,
      { content: "Order ID", styles: { fontStyle: "bold" } },
      currentOrder.orderNumber || currentOrder.id.toUpperCase(),
      { content: "Status", styles: { fontStyle: "bold" } },
      STATUS_LABELS[currentOrder.status],
    ]);

    // Row 3
    topTableData.push([
      { content: "GST No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_CONFIG.gst,
      { content: "Brand", styles: { fontStyle: "bold" } },
      COMPANY_CONFIG.brand,
      { content: "Payment Terms", styles: { fontStyle: "bold" } },
      "Net 30 Days",
    ]);

    // Row 4
    topTableData.push([
      { content: "PAN No.", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_CONFIG.pan,
      { content: "Total Pairs", styles: { fontStyle: "bold" } },
      currentOrder.totalPairs,
      { content: "Total Cartons", styles: { fontStyle: "bold" } },
      currentOrder.totalCartons,
    ]);

    // Row 5: Addresses
    topTableData.push([
      { content: "Invoice To", styles: { fontStyle: "bold", fillColor: [240, 245, 240] } },
      COMPANY_CONFIG.invoiceTo,
      { content: "Ship To", styles: { fontStyle: "bold" } },
      COMPANY_CONFIG.shipTo,
      { content: "Contact", styles: { fontStyle: "bold" } },
      COMPANY_CONFIG.phone,
    ]);

    // Draw Main Title Bar
    autoTable(doc, {
      startY: 20,
      margin: { left: 40, right: 40 },
      theme: "plain",
      styles: { cellPadding: 5, fontSize: 10, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5 },
      body: [
        [
          { content: COMPANY_CONFIG.name, styles: { halign: "left", fontStyle: "bold", fontSize: 11 } },
          { content: "PROFORMA INVOICE", styles: { halign: "center", fontSize: 14, fontStyle: "bold", fillColor: [240, 245, 240] } },
          { content: "", styles: { halign: "right" } },
        ],
      ],
      columnStyles: { 0: { cellWidth: 200 }, 1: { cellWidth: 200 }, 2: { cellWidth: "auto" } }
    });

    // Draw Header Info Grid
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      margin: { left: 40, right: 40 },
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 4, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.5, valign: "middle" },
      columnStyles: {
        0: { cellWidth: 70, fontStyle: "bold" },
        1: { cellWidth: 150 },
        2: { cellWidth: 70, fontStyle: "bold" },
        3: { cellWidth: 110 },
        4: { cellWidth: 60, fontStyle: "bold" },
        5: { cellWidth: "auto" },
      },
      body: topTableData,
    });

    // Item Table Data
    const itemRows = currentOrder.items.map((item, idx) => {
      const article = articles.find(a => a.id === item.articleId);
      const variant = article?.variants?.find(v => v.id === item.variantId);
      const price = variant?.costPrice || 0;
      const totalValue = item.pairCount * price;
      const hsn = article?.sku || '6404'; // Default hsn for footwear if not available
      const gender = article?.category?.toString().charAt(0) || 'M';

      return [
        idx + 1,
        hsn, // HSN
        variant ? `${article?.name}-${variant.color}-${variant.sizeRange}` : (article?.name || 'Item'),
        article?.name || 'Style', // Style No
        variant?.sku || 'SKU',
        variant?.color || 'N/A',
        gender,
        article?.mrp || item.price / (item.pairCount || 1), // MRP
        item.pairCount,
        price.toFixed(2), // Unit Cost
        totalValue.toFixed(2), // Total Value
      ];
    });

    // Draw Items Table
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      margin: { left: 40, right: 40 },
      theme: "grid",
      headStyles: { 
        fillColor: [240, 245, 240], 
        textColor: [0, 0, 0], 
        fontStyle: "bold", 
        fontSize: 7, 
        lineColor: [0, 0, 0], 
        lineWidth: 0.5, 
        halign: "center" 
      },
      styles: { 
        fontSize: 7, 
        cellPadding: 3, 
        textColor: [0, 0, 0], 
        lineColor: [0, 0, 0], 
        lineWidth: 0.5, 
        halign: "center", 
        valign: "middle" 
      },
      head: [["#", "HSN", "STYLE NAME", "STYLE NO", "SKU", "COLOR", "GDR", "MRP", "QTY", "RATE", "TOTAL"]],
      body: itemRows,
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Totals Section
    const subTotal = currentOrder.items.reduce((sum, item) => {
      const art = articles.find(a => a.id === item.articleId);
      const vari = art?.variants?.find(v => v.id === item.variantId);
      return sum + (item.pairCount * (vari?.costPrice || 0));
    }, 0);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Sub Total: Rs. ${subTotal.toLocaleString()}`, 420, finalY);
    doc.text(`Total Qty: ${currentOrder.totalPairs} Pairs`, 420, finalY + 12);
    
    doc.setFontSize(11);
    doc.setTextColor(79, 70, 229);
    doc.text(`FINAL AMOUNT: Rs. ${subTotal.toLocaleString()}`, 420, finalY + 28);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('This is a computer-generated Proforma Invoice. No signature required.', 105, 280, { align: 'center' });

    doc.save(`PI-${currentOrder.orderNumber || currentOrder.id}.pdf`);
    toast.success("Professional Proforma Invoice downloaded!");
  };

  const statusSteps = [
    { status: OrderStatus.BOOKED, label: 'Booked', icon: <Clock size={16} /> },
    { status: OrderStatus.PFD, label: 'Prepare for Delivery', icon: <Package size={16} /> },
    { status: OrderStatus.RFD, label: 'Ready for Delivery', icon: <Package size={16} /> },
    { status: OrderStatus.OFD, label: 'Out for Delivery', icon: <Truck size={16} /> },
    { status: OrderStatus.RECEIVED, label: 'Received', icon: <CheckCircle size={16} /> },
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.status === currentOrder.status);

  const getFullUrl = (path: string | undefined) => {
    if (!path) return null;
    return `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api').replace('/api', '')}${path}`;
  };

  const docLinks = {
    invoice: getFullUrl(currentOrder.invoiceUrl),
    eway: getFullUrl(currentOrder.ewayBillUrl),
    transport: getFullUrl(currentOrder.transportBillUrl),
    receiving: getFullUrl(currentOrder.receivingNoteUrl),
  };



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

            {/* Document Upload Stage (Admin) — Only for RFD -> OFD transition */}
            {!isDistributor && currentOrder.status === OrderStatus.RFD && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">Necessary Shipping Documents</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Invoice Upload */}
                  <div className="relative">
                    <input type="file" ref={invoiceInputRef} className="hidden" onChange={(e) => onShippingFileSelected('invoice', e)} />
                    <button 
                      onClick={() => invoiceInputRef.current?.click()}
                      className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border-dashed border-2 transition-all gap-1 ${
                        shippingFiles.invoice ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {shippingFiles.invoice ? <CheckCircle size={16} className="text-emerald-500" /> : <Upload size={16} className="text-slate-400" />}
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Invoice</span>
                    </button>
                    {shippingFiles.invoice && <p className="text-[8px] text-emerald-600 font-bold truncate mt-1 text-center px-2">{shippingFiles.invoice.name}</p>}
                  </div>

                  {/* E-Way Bill Upload */}
                  <div className="relative">
                    <input type="file" ref={ewayInputRef} className="hidden" onChange={(e) => onShippingFileSelected('ewayBill', e)} />
                    <button 
                      onClick={() => ewayInputRef.current?.click()}
                      className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border-dashed border-2 transition-all gap-1 ${
                        shippingFiles.ewayBill ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {shippingFiles.ewayBill ? <CheckCircle size={16} className="text-emerald-500" /> : <Upload size={16} className="text-slate-400" />}
                      <span className="text-[9px] font-bold text-slate-600 uppercase">E-Way Bill</span>
                    </button>
                    {shippingFiles.ewayBill && <p className="text-[8px] text-emerald-600 font-bold truncate mt-1 text-center px-2">{shippingFiles.ewayBill.name}</p>}
                  </div>

                  {/* Transport Bill Upload */}
                  <div className="relative">
                    <input type="file" ref={transportInputRef} className="hidden" onChange={(e) => onShippingFileSelected('transportBill', e)} />
                    <button 
                      onClick={() => transportInputRef.current?.click()}
                      className={`w-full flex flex-col items-center justify-center p-3 rounded-xl border-dashed border-2 transition-all gap-1 ${
                        shippingFiles.transportBill ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {shippingFiles.transportBill ? <CheckCircle size={16} className="text-emerald-500" /> : <Upload size={16} className="text-slate-400" />}
                      <span className="text-[9px] font-bold text-slate-600 uppercase">Transport Bill</span>
                    </button>
                    {shippingFiles.transportBill && <p className="text-[8px] text-emerald-600 font-bold truncate mt-1 text-center px-2">{shippingFiles.transportBill.name}</p>}
                  </div>
                </div>

                <button
                  onClick={() => handleUpdateStatus(OrderStatus.OFD)}
                  disabled={uploading || !shippingFiles.invoice || !shippingFiles.ewayBill || !shippingFiles.transportBill}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                  Mark as Out for Delivery
                </button>
              </div>
            )}

            {/* Mark as Received — only for distributors when status is OFD */}
            {isDistributor && currentOrder.status === OrderStatus.OFD && (
              <div className="mt-6 pt-4 border-t border-slate-100 space-y-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">Receipt Confirmation</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="relative group">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                      <input 
                        type="text" 
                        placeholder="Receiver Full Name" 
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                      <input 
                        type="text" 
                        placeholder="Mobile Number" 
                        value={receiverMobile}
                        onChange={(e) => setReceiverMobile(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <input type="file" ref={receivingNoteInputRef} className="hidden" onChange={onReceivingNoteSelected} />
                    <button 
                      onClick={() => receivingNoteInputRef.current?.click()}
                      className={`flex-1 flex flex-col items-center justify-center p-4 rounded-xl border-dashed border-2 transition-all gap-1 ${
                        receivingNote ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {receivingNote ? <ImageIcon size={24} className="text-indigo-500" /> : <Upload size={24} className="text-slate-400" />}
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Receiving Note</span>
                    </button>
                    {receivingNote && <p className="text-[8px] text-indigo-600 font-bold truncate text-center px-2">{receivingNote.name}</p>}
                  </div>
                </div>

                <button
                  onClick={handleMarkAsReceived}
                  disabled={uploading || !receivingNote || !receiverName || !receiverMobile}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Confirm Receipt
                </button>
              </div>
            )}
          </div>

          {/* New Documentation Links Section — Moved Up & Restyled */}
          {(docLinks.invoice || docLinks.eway || docLinks.transport || docLinks.receiving) && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-in fade-in zoom-in-95 duration-700 sticky top-4 z-20">
              {docLinks.invoice && (
                <a href={docLinks.invoice} target="_blank" rel="noopener noreferrer" className="group bg-white p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                    <FileText size={20} className="text-indigo-600 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Shipping</p>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600">Tax Invoice</p>
                  </div>
                </a>
              )}
              {docLinks.eway && (
                <a href={docLinks.eway} target="_blank" rel="noopener noreferrer" className="group bg-white p-4 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                    <Truck size={20} className="text-emerald-600 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Transport</p>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600">E-Way Bill</p>
                  </div>
                </a>
              )}
              {docLinks.transport && (
                <a href={docLinks.transport} target="_blank" rel="noopener noreferrer" className="group bg-white p-4 rounded-2xl border-2 border-slate-100 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                    <FilePlus size={20} className="text-amber-600 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Logistics</p>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600">Transport Bill</p>
                  </div>
                </a>
              )}
              {docLinks.receiving && (
                <a href={docLinks.receiving} target="_blank" rel="noopener noreferrer" className="group bg-slate-900 p-4 rounded-2xl border-2 border-slate-800 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-400/10 transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-emerald-400 transition-colors">
                    <ShieldCheck size={20} className="text-emerald-400 group-hover:text-slate-900" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Confirmation</p>
                    <p className="text-sm font-bold text-white">Receiving Note</p>
                  </div>
                </a>
              )}

              {/* Receiver Details — Dedicated Card in the same row */}
              {(currentOrder.receiverName || currentOrder.receiverMobile) && (
                <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 transition-all flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <UserIcon size={20} className="text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Receiver Info</p>
                    <p className="text-sm font-bold text-slate-900 truncate leading-tight mb-0.5">{currentOrder.receiverName || 'Unknown'}</p>
                    {currentOrder.receiverMobile && (
                      <div className="flex items-center gap-1">
                        <Phone size={10} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500">{currentOrder.receiverMobile}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Items Detail - Sleek Rows */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-indigo-600" />
                Order Items
              </h3>
              <span className="text-[10px] font-bold text-slate-400">{currentOrder.items.length} Variants</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30">
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Image</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Article / Variant</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Color</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Stock</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocated Cartons</th>
                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentOrder.items.map((item, idx) => {
                    const article = articles.find(a => a.id === item.articleId);
                    const variant = article?.variants?.find(v => v.id === item.variantId);
                    const inv = inventory.find(i => i.articleId === item.articleId);
                    
                    const itemIsBooked = currentOrder.status === OrderStatus.BOOKED;
                    const price = variant?.costPrice || 0;
                    const amount = item.pairCount * price;

                    return (
                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                            {(() => {
                              const colorMedia = article?.colorMedia || [];
                              const matched = colorMedia.find(cm => cm.color.toLowerCase() === variant?.color?.toLowerCase());
                              const vImg = (matched && matched.images && matched.images.length > 0) 
                                ? matched.images[0].url 
                                : (variant?.images && variant?.images.length > 0 ? variant?.images[0] : article?.imageUrl);
                              
                              return vImg ? (
                                <img 
                                  src={getImageUrl(vImg)} 
                                  alt={variant?.color || article?.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                />
                              ) : (
                                <ImageIcon size={20} className="text-slate-200" />
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm text-slate-900 leading-tight">
                            {article?.name}{variant ? `-${variant.color}-${variant.sizeRange}` : ''}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{variant?.sku || 'NO-SKU'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                            {variant?.color || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-center">
                            <p className="text-sm font-black text-slate-800 leading-none">{Math.abs(inv?.availableStock || 0)}</p>
                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Live</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {itemIsBooked && !isDistributor ? (
                            <div className="flex items-center gap-3">
                              <div className="relative w-24">
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
                                  className="w-full pl-3 pr-8 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-indigo-300">CTN</span>
                              </div>
                              <span className="text-[9px] font-bold text-slate-300 uppercase">of {item.cartonCount} CTN</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900">{item.allocatedCartonCount ?? item.cartonCount} CTN</span>
                              {currentOrder.status === OrderStatus.RECEIVED ? (
                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Fulfilled</span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Pending</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-bold text-sm text-slate-900 tracking-tight">₹{amount.toLocaleString()}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{item.pairCount} Pairs</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {!isDistributor && currentOrder.status === OrderStatus.BOOKED && (
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center gap-4">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation Action</span>
                  <span className="text-xs font-bold text-indigo-600">Review all items before proceeding</span>
                </div>
                <button
                  disabled={uploading}
                  onClick={handleAllocateAndProceed}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
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
              {/* <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Total Pairs</span>
                <span className="font-bold text-white">{currentOrder.totalPairs}</span>
              </div> */}

              {/* Fulfillment Summary */}
              {(() => {
                const allocated = currentOrder.items.reduce((acc, item) => acc + (item.allocatedCartonCount ?? 0), 0);
                const fulfilled = currentOrder.status === OrderStatus.RECEIVED ? allocated : 0;
                const pending = currentOrder.totalCartons - fulfilled;
                return (
                  <div className="pt-3 mt-3 border-t border-white/10 grid grid-cols-2 gap-3">
                    {/* <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mb-0.5">Fulfilled</p>
                      <p className="text-xs font-black text-white">{fulfilled} <span className="text-[8px] text-slate-500 font-bold uppercase">Ctns</span></p>
                    </div> */}
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest mb-0.5">Pending</p>
                      <p className="text-xs font-black text-white">{pending} <span className="text-[8px] text-slate-500 font-bold uppercase">Ctns</span></p>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold text-slate-400">Subtotal</span>
                  <span className="text-sm font-bold text-slate-300">
                    ₹{(currentOrder.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
                {(currentOrder.discountPercentage || 0) > 0 && (
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-bold text-emerald-400">Discount ({currentOrder.discountPercentage}%)</span>
                    <span className="text-sm font-bold text-emerald-400">-₹{(currentOrder.discountAmount || 0).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-2 border-t border-white/5">
                  <span className="text-xs font-bold text-white">Total Amount</span>
                  <span className="text-xl font-black text-indigo-400 tracking-tight">
                    ₹{(currentOrder.finalAmount || currentOrder.totalAmount || 0).toLocaleString()}
                  </span>
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

            {/* Admin Status Transitions */}
            {!isDistributor && (
              <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Order Management</p>
                
                {currentOrder.status === OrderStatus.PFD && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadPI}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 transition-all shadow-md shadow-slate-200/50 active:scale-95"
                    >
                      <FileText size={14} className="text-indigo-600" />
                      PI
                    </button>
                    <button
                      disabled={uploading}
                      onClick={() => handleUpdateStatus(OrderStatus.RFD)}
                      className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                      Ready for Delivery
                    </button>
                  </div>
                )}
                
                {currentOrder.status !== OrderStatus.BOOKED && currentOrder.status !== OrderStatus.RECEIVED && (
                  <p className="text-[8px] text-slate-500 text-center font-bold uppercase tracking-widest mt-2">
                    Current Status: {STATUS_LABELS[currentOrder.status]}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Shipping Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Delivery</h3>
            </div>
            {(() => {
              const d = typeof currentOrder.distributorId === 'object' ? currentOrder.distributorId : null;
              const profile = d?.distributorId;
              const addr = profile?.shippingAddress;
              const email = profile?.email || d?.email || 'N/A';
              const phone = profile?.phone || 'N/A';

              return (
                <div className="space-y-4">
                  <div>
                    <p className="font-bold text-sm text-slate-900 tracking-tight">
                      {profile?.companyName || currentOrder.distributorName}
                    </p>
                    {addr && addr.address1 ? (
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium mt-1">
                        {addr.attention && <span className="block italic text-slate-400">Attn: {addr.attention}</span>}
                        {addr.address1}{addr.address2 ? `, ${addr.address2}` : ''}<br />
                        {addr.city}, {addr.state} - {addr.pinCode}<br />
                        {addr.country}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic mt-1">Shipping address not details available</p>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                        <Phone size={12} className="text-slate-400" />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-700">{phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                        <Mail size={12} className="text-slate-400" />
                      </div>
                      <p className="text-[10px] font-semibold text-slate-700">{email}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
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
    [OrderStatus.PENDING]: { color: 'bg-slate-50 text-slate-400 border-slate-100' },
  };

  const { color } = config[status] || { color: 'bg-gray-50 text-gray-500 border-gray-100' };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${color}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

export default OrderDetail;
