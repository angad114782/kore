import React, { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Package,
  Loader2,
  Building2,
  CalendarDays,
  Hash,
  Truck,
  FileText,
  User,
  ChevronDown,
  ScanLine,
  Warehouse,
  Boxes,
  ChevronRight,
  RotateCcw,
  MapPin,
} from "lucide-react";
import {
  grnService,
  MockPODetail,
  MockPOItem,
  MockPORef,
} from "../../services/grnService";
import SearchableSelect from "../SearchableSelect";

/* ═══════════════════ Types ═══════════════════ */

type GRNForm = {
  grnDate: string;
  vendorInvoiceNo: string;
  vendorChallanNo: string;
  vehicleNo: string;
  eWayBillNo: string;
  receivedBy: string;
  warehouse: string;
  remarks: string;
};

type GRNHistoryItem = {
  grnNo: string;
  refId: string;
  cartons: number;
  createdAt: string;
};

// Track scan state per size across all items
type ScanState = Record<
  string, // itemName
  Record<
    string, // size
    boolean[] // array of booleans per box (scanned or not)
  >
>;

/* ═══════════════════ Helpers ═══════════════════ */

const todayISODate = () => new Date().toISOString().slice(0, 10);

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN");
};

/* ═══════════════════ Component ═══════════════════ */

const GRN: React.FC = () => {
  /* ── Step 1: PO Selection ── */
  const [poRefs, setPoRefs] = useState<MockPORef[]>([]);
  const [selectedPOId, setSelectedPOId] = useState("");
  const [poDetail, setPoDetail] = useState<MockPODetail | null>(null);
  const [poLoading, setPoLoading] = useState(false);

  /* ── Step 2: GRN Info ── */
  const [form, setForm] = useState<GRNForm>({
    grnDate: todayISODate(),
    vendorInvoiceNo: "",
    vendorChallanNo: "",
    vehicleNo: "",
    eWayBillNo: "",
    receivedBy: "",
    warehouse: "",
    remarks: "",
  });

  /* ── Step 3: Item receiving ── */
  const [selectedItemName, setSelectedItemName] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [scanState, setScanState] = useState<ScanState>({});
  const [scanInput, setScanInput] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  /* ── History ── */
  const [grnHistory, setGrnHistory] = useState<GRNHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"scan" | "history">("scan");

  const [submitting, setSubmitting] = useState(false);

  /* ── Load PO list ── */
  useEffect(() => {
    grnService.listReferences("").then((res) => {
      setPoRefs(res.data || []);
    });
  }, []);

  /* ── Load GRN History ── */
  useEffect(() => {
    grnService
      .history()
      .then((res) => {
        setGrnHistory(
          (res.data || []).map((h: any) => ({
            grnNo: h.grnNo,
            refId: h.refId,
            cartons: h.cartons,
            createdAt: h.createdAt,
          }))
        );
      })
      .catch(() => {});
  }, []);

  /* ── Load PO detail when selected ── */
  useEffect(() => {
    if (!selectedPOId) {
      setPoDetail(null);
      return;
    }
    setPoLoading(true);
    grnService
      .getReferenceDetail(selectedPOId)
      .then((res) => {
        const data = res.data as MockPODetail | null;
        setPoDetail(data);
        // Initialize scan state
        if (data) {
          const state: ScanState = {};
          data.items.forEach((item) => {
            state[item.itemName] = {};
            Object.entries(item.sizeMap).forEach(([size, sizeData]) => {
              state[item.itemName][size] = Array(sizeData.qty).fill(false);
            });
          });
          setScanState(state);
        }
      })
      .catch(() => {
        toast.error("Failed to load PO details");
        setPoDetail(null);
      })
      .finally(() => setPoLoading(false));
  }, [selectedPOId]);

  /* ── Derived data ── */
  const selectedItem = useMemo(
    () => poDetail?.items.find((i) => i.itemName === selectedItemName) || null,
    [poDetail, selectedItemName]
  );

  const sizes = useMemo(() => {
    if (!selectedItem) return [];
    return Object.keys(selectedItem.sizeMap).sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [selectedItem]);

  const sizeData = useMemo(() => {
    if (!selectedItem || !selectedSize) return null;
    return selectedItem.sizeMap[selectedSize] || null;
  }, [selectedItem, selectedSize]);

  const boxes = useMemo(() => {
    if (!selectedItem || !selectedSize || !scanState[selectedItemName])
      return [];
    return scanState[selectedItemName][selectedSize] || [];
  }, [selectedItem, selectedSize, scanState, selectedItemName]);

  // Count scanned boxes for current size
  const scannedCount = boxes.filter(Boolean).length;
  const totalBoxes = boxes.length;

  // Overall progress
  const overallProgress = useMemo(() => {
    let totalBoxesAll = 0;
    let scannedAll = 0;
    Object.values(scanState).forEach((sizes) => {
      Object.values(sizes).forEach((boxArr) => {
        totalBoxesAll += boxArr.length;
        scannedAll += boxArr.filter(Boolean).length;
      });
    });
    return { total: totalBoxesAll, scanned: scannedAll };
  }, [scanState]);

  // Item-level progress
  const getItemProgress = (itemName: string) => {
    const sizes = scanState[itemName];
    if (!sizes) return { total: 0, scanned: 0 };
    let total = 0,
      scanned = 0;
    Object.values(sizes).forEach((arr) => {
      total += arr.length;
      scanned += arr.filter(Boolean).length;
    });
    return { total, scanned };
  };

  // Size-level progress for an item
  const getSizeProgress = (itemName: string, size: string) => {
    const arr = scanState[itemName]?.[size];
    if (!arr) return { total: 0, scanned: 0 };
    return { total: arr.length, scanned: arr.filter(Boolean).length };
  };

  /* ── Scan handler ── */
  const handleScan = () => {
    const code = scanInput.trim();
    if (!code) return;

    if (!selectedItem || !selectedSize || !sizeData) {
      toast.error("Please select an item and size first.");
      setScanInput("");
      return;
    }

    // Check if scanned SKU matches the expected SKU for this size
    if (code !== sizeData.sku) {
      toast.error(`Invalid SKU. Expected: ${sizeData.sku}`);
      setScanInput("");
      return;
    }

    // Find first unscanned box
    const currentBoxes = scanState[selectedItemName]?.[selectedSize] || [];
    const firstEmpty = currentBoxes.findIndex((b) => !b);
    if (firstEmpty === -1) {
      toast.error("All boxes for this size are already scanned.");
      setScanInput("");
      return;
    }

    // Mark box as scanned
    setScanState((prev) => {
      const updated = { ...prev };
      updated[selectedItemName] = { ...updated[selectedItemName] };
      updated[selectedItemName][selectedSize] = [
        ...updated[selectedItemName][selectedSize],
      ];
      updated[selectedItemName][selectedSize][firstEmpty] = true;
      return updated;
    });

    toast.success(`Box ${firstEmpty + 1} scanned successfully`);
    setScanInput("");
    scanInputRef.current?.focus();
  };

  /* ── Reset size scans ── */
  const resetSizeScans = () => {
    if (!selectedItemName || !selectedSize) return;
    setScanState((prev) => {
      const updated = { ...prev };
      updated[selectedItemName] = { ...updated[selectedItemName] };
      updated[selectedItemName][selectedSize] = updated[selectedItemName][
        selectedSize
      ].map(() => false);
      return updated;
    });
    toast.success("Size scans reset");
  };

  /* ── Form update ── */
  const updateForm = <K extends keyof GRNForm>(key: K, value: GRNForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* ── Reset all ── */
  const resetAll = () => {
    setSelectedPOId("");
    setPoDetail(null);
    setSelectedItemName("");
    setSelectedSize("");
    setScanState({});
    setScanInput("");
    setForm({
      grnDate: todayISODate(),
      vendorInvoiceNo: "",
      vendorChallanNo: "",
      vehicleNo: "",
      eWayBillNo: "",
      receivedBy: "",
      warehouse: "",
      remarks: "",
    });
  };

  /* ── Submit ── */
  const canSubmit = !!poDetail && overallProgress.scanned > 0;

  const submitGRN = async () => {
    if (!canSubmit || !poDetail) return;
    setSubmitting(true);

    try {
      const res = await grnService.create({
        poId: poDetail.id,
        form,
        scanState,
        totals: overallProgress,
      });

      setGrnHistory((prev) => [
        {
          grnNo: res.data?.grnNo || `GRN-${Date.now()}`,
          refId: poDetail.id,
          cartons: overallProgress.scanned,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);

      toast.success("GRN submitted successfully");
      resetAll();
    } catch {
      toast.error("Failed to submit GRN");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── PO dropdown options ── */
  const poOptions = poRefs.map(
    (po) => `${po.poNo} • ${po.vendor} • ${po.article}`
  );
  const selectedPOLabel = poRefs.find((p) => p.id === selectedPOId)
    ? `${selectedPOId} • ${poRefs.find((p) => p.id === selectedPOId)?.vendor} • ${poRefs.find((p) => p.id === selectedPOId)?.article}`
    : "";

  /* ── Item dropdown options ── */
  const itemOptions = (poDetail?.items || []).map((i) => i.itemName);

  /* ── Size dropdown options ── */
  const sizeOptions = sizes.map((s) => `Size ${s}`);
  const selectedSizeLabel = selectedSize ? `Size ${selectedSize}` : "";

  /* ═══════════════════ RENDER ═══════════════════ */

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-visible">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <ClipboardList className="text-emerald-600" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Goods Receipt Note
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select PO, fill basic info, receive items by scanning SKUs.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "scan"}
                onClick={() => setActiveTab("scan")}
                label="Create GRN"
              />
              <TabButton
                active={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                label="History"
              />
            </div>
          </div>
        </div>

        {activeTab === "scan" && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* ── Overall Progress Bar (if PO selected) ── */}
            {poDetail && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-sm font-black text-slate-900">
                    Overall Receiving Progress
                  </p>
                  <p className="text-sm font-bold text-slate-600">
                    {overallProgress.scanned} / {overallProgress.total} boxes
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${
                        overallProgress.total
                          ? (overallProgress.scanned / overallProgress.total) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* ═══ STEP 1: Select PO ═══ */}
            <SectionCard
              icon={<Hash size={18} className="text-indigo-600" />}
              title="1. Select Purchase Order"
              className="z-[60]" // For dropdown visibility
              action={
                selectedPOId ? (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                ) : null
              }
            >
              <div className="max-w-lg">
                <SearchableSelect
                  label="Purchase Order"
                  options={poOptions}
                  value={selectedPOLabel}
                  onChange={(val) => {
                    const poNo = val.split(" • ")[0];
                    const ref = poRefs.find((p) => p.poNo === poNo);
                    if (ref) {
                      setSelectedPOId(ref.id);
                      setSelectedItemName("");
                      setSelectedSize("");
                    }
                  }}
                  placeholder="Search and select PO..."
                />
              </div>

              {poLoading && (
                <div className="mt-6 flex items-center justify-center gap-2 py-10 text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Loading PO details...
                </div>
              )}

              {poDetail && !poLoading && (
                <div className="mt-6 space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    PO Summary
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoCard
                      icon={<Hash size={16} />}
                      label="PO Number"
                      value={poDetail.poNo}
                    />
                    <InfoCard
                      icon={<Building2 size={16} />}
                      label="Vendor"
                      value={poDetail.vendorName}
                    />
                    <InfoCard
                      icon={<CalendarDays size={16} />}
                      label="PO Date"
                      value={formatDate(poDetail.poDate)}
                    />
                    <InfoCard
                      icon={<Truck size={16} />}
                      label="Delivery Date"
                      value={formatDate(poDetail.deliveryDate)}
                    />
                    <InfoCard
                      icon={<MapPin size={16} />}
                      label="Ship To"
                      value={poDetail.shipTo}
                    />
                    <InfoCard
                      icon={<Boxes size={16} />}
                      label="Total Qty"
                      value={String(poDetail.totalQty)}
                    />
                    <InfoCard
                      icon={<Package size={16} />}
                      label="Items"
                      value={`${poDetail.items.length} variants`}
                    />
                    <InfoCard
                      icon={<FileText size={16} />}
                      label="Vendor Code"
                      value={poDetail.vendorCode}
                    />
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ═══ STEP 2: GRN Basic Info ═══ */}
            {poDetail && (
              <SectionCard
                icon={<User size={18} className="text-emerald-600" />}
                title="2. GRN Basic Information"
              >
                {/* PO context banner */}
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <Hash size={16} className="text-indigo-600" />
                  <span className="text-sm font-bold text-indigo-900">
                    {poDetail?.poNo}
                  </span>
                  <span className="text-sm text-indigo-600">
                    • {poDetail?.vendorName}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormInput
                    label="GRN Date"
                    type="date"
                    value={form.grnDate}
                    onChange={(v) => updateForm("grnDate", v)}
                  />
                  <FormInput
                    label="Received By"
                    value={form.receivedBy}
                    onChange={(v) => updateForm("receivedBy", v)}
                  />
                  <FormInput
                    label="Vendor Invoice No"
                    value={form.vendorInvoiceNo}
                    onChange={(v) => updateForm("vendorInvoiceNo", v)}
                  />
                  <FormInput
                    label="Vendor Challan No"
                    value={form.vendorChallanNo}
                    onChange={(v) => updateForm("vendorChallanNo", v)}
                  />
                  <FormInput
                    label="Vehicle No"
                    value={form.vehicleNo}
                    onChange={(v) => updateForm("vehicleNo", v)}
                  />
                  <FormInput
                    label="E-Way Bill No"
                    value={form.eWayBillNo}
                    onChange={(v) => updateForm("eWayBillNo", v)}
                  />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <FormInput
                      label="Warehouse / Location"
                      value={form.warehouse}
                      onChange={(v) => updateForm("warehouse", v)}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <FormTextArea
                      label="Remarks"
                      value={form.remarks}
                      onChange={(v) => updateForm("remarks", v)}
                    />
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ═══ STEP 3: Item Receiving ═══ */}
            {poDetail && (
              <div className="space-y-6">
                {/* PO context banner */}
                <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <Hash size={16} className="text-indigo-600" />
                  <span className="text-sm font-bold text-indigo-900">
                    {poDetail.poNo}
                  </span>
                  <span className="text-sm text-indigo-600">
                    • {poDetail.vendorName}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                  {/* ── Left: Dropdowns & Scanner ── */}
                  <div className="xl:col-span-5 space-y-5">
                    <SectionCard
                      icon={<ScanLine size={18} className="text-slate-900" />}
                      title="3. Select Item & Scan"
                      className="z-[50]" // ensure stacking over below cards if dropdown opens
                    >
                      <div className="space-y-5">
                        {/* Item dropdown */}
                        <SearchableSelect
                          label="PO Item"
                          options={itemOptions}
                          value={selectedItemName}
                          onChange={(val) => {
                            setSelectedItemName(val);
                            setSelectedSize("");
                            setScanInput("");
                          }}
                          placeholder="Select item to receive..."
                        />

                        {/* Size dropdown */}
                        {selectedItem && (
                          <div className="relative z-[49]">
                            <SearchableSelect
                              label="Size"
                              options={sizeOptions}
                              value={selectedSizeLabel}
                              onChange={(val) => {
                                const sz = val.replace("Size ", "");
                                setSelectedSize(sz);
                                setScanInput("");
                                setTimeout(
                                  () => scanInputRef.current?.focus(),
                                  150
                                );
                              }}
                              placeholder="Select size..."
                            />
                          </div>
                        )}

                        {/* Item & size progress cards */}
                        {selectedItem && (
                          <div className="grid grid-cols-2 gap-3 mt-4">
                            {(() => {
                              const ip = getItemProgress(selectedItemName);
                              return (
                                <MiniStatCard
                                  label="Item Progress"
                                  value={`${ip.scanned}/${ip.total}`}
                                  tone={
                                    ip.scanned === ip.total && ip.total > 0
                                      ? "emerald"
                                      : "slate"
                                  }
                                />
                              );
                            })()}
                            {selectedSize &&
                              (() => {
                                const sp = getSizeProgress(
                                  selectedItemName,
                                  selectedSize
                                );
                                return (
                                  <MiniStatCard
                                    label={`Size ${selectedSize}`}
                                    value={`${sp.scanned}/${sp.total}`}
                                    tone={
                                      sp.scanned === sp.total && sp.total > 0
                                        ? "emerald"
                                        : "indigo"
                                    }
                                  />
                                );
                              })()}
                          </div>
                        )}

                        {/* Scanner input */}
                        {selectedSize && sizeData && (
                          <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                              <p className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-1">
                                Expected SKU
                              </p>
                              <p className="font-mono text-lg font-black text-emerald-900">
                                {sizeData.sku}
                              </p>
                            </div>

                            <div className="relative">
                              <ScanLine
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                size={18}
                              />
                              <input
                                ref={scanInputRef}
                                type="text"
                                autoComplete="off"
                                placeholder="Scan or type SKU here..."
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleScan();
                                  }
                                }}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 font-mono text-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleScan}
                                disabled={!scanInput.trim()}
                                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold transition ${
                                  scanInput.trim()
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <ScanLine size={16} />
                                Scan
                              </button>
                              <button
                                type="button"
                                onClick={resetSizeScans}
                                disabled={scannedCount === 0}
                                className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 font-bold transition ${
                                  scannedCount > 0
                                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <RotateCcw size={16} />
                                Reset
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  {/* ── Right: Box Grid & Summary ── */}
                  <div className="xl:col-span-7 space-y-5">
                    {/* Box Grid */}
                    {selectedSize && sizeData && (
                      <SectionCard
                        icon={<Boxes size={18} className="text-indigo-600" />}
                        title={`Boxes — ${selectedItemName} • Size ${selectedSize}`}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm text-slate-600">
                            <span className="font-bold">{scannedCount}</span> of{" "}
                            <span className="font-bold">{totalBoxes}</span> boxes
                            scanned
                          </p>
                          <span className="text-xs font-bold text-slate-500">
                            SKU: {sizeData.sku}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                            style={{
                              width: `${
                                totalBoxes
                                  ? (scannedCount / totalBoxes) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        {/* Box cards */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4">
                          {boxes.map((isScanned, idx) => (
                            <div
                              key={idx}
                              className={`flex flex-col items-center justify-center rounded-2xl border p-4 transition-all duration-300 ${
                                isScanned
                                  ? "border-emerald-300 bg-emerald-50 shadow-sm shadow-emerald-100"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div
                                className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
                                  isScanned
                                    ? "bg-emerald-500 text-white"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                {isScanned ? (
                                  <CheckCircle2 size={20} />
                                ) : (
                                  <span className="text-sm font-bold">
                                    {idx + 1}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-900">
                                Box {idx + 1}
                              </p>
                              <p className="mt-0.5 text-[10px] font-mono text-slate-500">
                                {sizeData.sku}
                              </p>
                              {isScanned && (
                                <span className="mt-1 text-[10px] font-black text-emerald-600">
                                  SCANNED
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {totalBoxes === 0 && (
                          <div className="py-8 text-center text-sm text-slate-400">
                            No boxes found for this size.
                          </div>
                        )}
                      </SectionCard>
                    )}

                    {!selectedSize && selectedItem && (
                      <SectionCard
                        icon={<Boxes size={18} className="text-slate-400" />}
                        title="Box Grid"
                      >
                        <div className="py-12 text-center text-sm text-slate-400">
                          Select a size to view boxes.
                        </div>
                      </SectionCard>
                    )}

                    {!selectedItem && (
                      <SectionCard
                        icon={<Boxes size={18} className="text-slate-400" />}
                        title="Box Grid"
                      >
                        <div className="py-12 text-center text-sm text-slate-400">
                          Select an item to begin receiving.
                        </div>
                      </SectionCard>
                    )}

                    {/* All items progress */}
                    <SectionCard
                      icon={
                        <PackageCheck size={18} className="text-emerald-600" />
                      }
                      title="All Items Status"
                    >
                      <div className="space-y-3">
                        {poDetail.items.map((item) => {
                          const prog = getItemProgress(item.itemName);
                          const pct =
                            prog.total > 0
                              ? (prog.scanned / prog.total) * 100
                              : 0;
                          const isDone =
                            prog.scanned === prog.total && prog.total > 0;
                          const isActive =
                            item.itemName === selectedItemName;

                          return (
                            <button
                              key={item.itemName}
                              type="button"
                              onClick={() => {
                                setSelectedItemName(item.itemName);
                                setSelectedSize("");
                              }}
                              className={`w-full rounded-2xl border p-4 text-left transition ${
                                isActive
                                  ? "border-emerald-300 bg-emerald-50"
                                  : isDone
                                  ? "border-slate-200 bg-slate-50"
                                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {item.itemName}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {item.color} •{" "}
                                    {Object.keys(item.sizeMap).join(", ")}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {isDone ? (
                                    <StatusPill label="DONE" tone="emerald" />
                                  ) : isActive ? (
                                    <StatusPill
                                      label="ACTIVE"
                                      tone="indigo"
                                    />
                                  ) : (
                                    <StatusPill label="OPEN" tone="slate" />
                                  )}
                                  <p className="mt-1 text-xs font-bold text-slate-600">
                                    {prog.scanned}/{prog.total} boxes
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isDone
                                      ? "bg-emerald-500"
                                      : isActive
                                      ? "bg-indigo-500"
                                      : "bg-slate-400"
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </SectionCard>
                  </div>
                </div>

                {/* ── Submit Section ── */}
                <SectionCard
                  icon={<PackageCheck size={18} className="text-slate-900" />}
                  title="Submit GRN"
                >
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-3">
                      {overallProgress.scanned === 0 ? (
                        <BannerMessage
                          icon={<XCircle size={16} />}
                          tone="amber"
                        >
                          Scan at least one box to enable submission.
                        </BannerMessage>
                      ) : (
                        <BannerMessage
                          icon={<CheckCircle2 size={16} />}
                          tone="emerald"
                        >
                          Ready to submit — {overallProgress.scanned} boxes
                          scanned.
                        </BannerMessage>
                      )}

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MiniStatCard
                          label="Total Boxes"
                          value={overallProgress.total}
                          tone="slate"
                        />
                        <MiniStatCard
                          label="Scanned"
                          value={overallProgress.scanned}
                          tone="emerald"
                        />
                        <MiniStatCard
                          label="Pending"
                          value={
                            overallProgress.total - overallProgress.scanned
                          }
                          tone="amber"
                        />
                        <MiniStatCard
                          label="Items"
                          value={poDetail.items.length}
                          tone="indigo"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          Final Action
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Submit to create a GRN entry with all scanned boxes.
                        </p>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={submitGRN}
                          disabled={!canSubmit || submitting}
                          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-black transition ${
                            canSubmit && !submitting
                              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700"
                              : "cursor-not-allowed bg-slate-200 text-slate-400"
                          }`}
                        >
                          {submitting && (
                            <Loader2 size={18} className="animate-spin" />
                          )}
                          Submit GRN
                        </button>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}
          </div>
        )}

        {/* ═══ HISTORY TAB ═══ */}
        {activeTab === "history" && (
          <div className="p-4 sm:p-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Package className="text-indigo-600" size={18} />
                  <p className="font-black text-slate-900">GRN History</p>
                </div>
                <div className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Total{" "}
                  <span className="text-slate-800">{grnHistory.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        GRN No
                      </th>
                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Reference
                      </th>
                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Boxes
                      </th>
                      <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {grnHistory.map((h) => (
                      <tr key={h.grnNo} className="hover:bg-slate-50/70">
                        <td className="px-5 py-4 font-black text-slate-900">
                          {h.grnNo}
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill label={h.refId} tone="indigo" />
                        </td>
                        <td className="px-5 py-4">
                          <StatusPill
                            label={String(h.cartons)}
                            tone="emerald"
                          />
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDateTime(h.createdAt)}
                        </td>
                      </tr>
                    ))}

                    {grnHistory.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12">
                          <EmptyState label="No GRN history yet." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GRN;

/* ═══════════════════ Sub-Components ═══════════════════ */

const SectionCard: React.FC<{
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, action, children, className = "" }) => {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white shadow-sm relative ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-black text-slate-900">{title}</p>
        </div>
        {action}
      </div>
      <div className="p-5 relative">{children}</div>
    </div>
  );
};

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
        active
          ? "bg-emerald-600 text-white shadow-lg shadow-emerald-100"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
};

const InfoCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-black uppercase tracking-widest">{label}</p>
      </div>
      <div className="break-words font-bold text-slate-900">{value || "—"}</div>
    </div>
  );
};

const FormInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}> = ({ label, value, onChange, type = "text" }) => {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
};

const FormTextArea: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
};

const StatusPill: React.FC<{
  label: string;
  tone: "rose" | "amber" | "emerald" | "slate" | "indigo";
}> = ({ label, tone }) => {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "indigo"
      ? "bg-indigo-50 text-indigo-700"
      : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${toneClass}`}
    >
      {label}
    </span>
  );
};

const MiniStatCard: React.FC<{
  label: string;
  value: number | string;
  tone: "slate" | "emerald" | "amber" | "indigo";
}> = ({ label, value, tone }) => {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "indigo"
      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
        {label}
      </p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
};

const BannerMessage: React.FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
  tone: "rose" | "amber" | "emerald" | "slate";
}> = ({ children, icon, tone }) => {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 border-rose-200 text-rose-700"
      : tone === "amber"
      ? "bg-amber-50 border-amber-200 text-amber-800"
      : tone === "emerald"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-slate-100 border-slate-200 text-slate-700";

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${toneClass}`}
    >
      {icon}
      {children}
    </div>
  );
};

const EmptyState: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-400">
      {label}
    </div>
  );
};