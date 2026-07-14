import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  ArrowLeft,
  Copy,
  Building2,
  Phone,
  Mail,
  User,
  CreditCard,
  MapPin,
  Users,
  Landmark,
  CheckCircle2,
  FileText,
  Loader2,
  Percent,
} from "lucide-react";
import { apiFetch } from "../../services/api";
import {
  Vendor,
  VendorAddress,
  VendorContact,
  VendorBankDetail,
} from "../../types";
import { vendorService } from "../../services/vendorService";
import GSTVerifyInput, { type GSTVerifyResult } from "../shared/GSTVerifyInput";
import Switch from "../ui/Switch";
import Pagination from "../ui/Pagination";
import { usePageSize } from "../../utils/usePageSize";

// ─── Empty Defaults ────────────────────────────────────
const emptyAddress = (): VendorAddress => ({
  attention: "",
  country: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  pinCode: "",
  phone: "",
  fax: "",
});

const emptyContact = (): VendorContact => ({
  id: `cp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  salutation: "",
  firstName: "",
  lastName: "",
  email: "",
  workPhone: "",
  mobile: "",
});

const emptyBank = (): VendorBankDetail => ({
  id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
});

const emptyVendor = (): Vendor => ({
  id: "",
  salutation: "",
  firstName: "",
  lastName: "",
  companyName: "",
  displayName: "",
  vendorCode: "",
  email: "",
  workPhone: "",
  mobile: "",
  gstNumber: "",
  cinNumber: "",
  pan: "",
  brand: "",
  msmeRegistered: false,
  currency: "INR- Indian Rupee",
  paymentTerms: "Due on Receipt",
  tds: "5%",
  enablePortal: false,
  isActive: true,
  billingAddress: emptyAddress(),
  shippingAddress: emptyAddress(),
  contactPersons: [],
  bankDetails: [],
});

// ─── Reusable input class ──────────────────────────────
const inputClass =
  "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium text-slate-800 text-sm";
const selectClass =
  "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all font-medium text-slate-700 text-sm cursor-pointer";
const labelClass =
  "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2";

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════
const VendorManager: React.FC = () => {
  // ── Vendor list from API ──
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = usePageSize("vendorManager", 20);

  const fetchVendors = async (p = page) => {
    try {
      setLoading(true);
      const res = await vendorService.listVendors({ page: p, limit: pageSize });
      const mapped = (res.data || []).map((v: any) => ({
        ...v,
        id: v._id || v.id,
      }));
      setVendors(mapped);
      setTotalPages(res.meta?.totalPages || 1);
      setTotal(res.meta?.total || 0);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(page);
  }, [page, pageSize]);

  // Real-time: refresh when vendor created/updated/deleted
  useEffect(() => {
    const handler = () => fetchVendors(1);
    window.addEventListener("vendorRefetch", handler);
    return () => window.removeEventListener("vendorRefetch", handler);
  }, []);

  // ── Draft Persistence ──
  const savedDraftStr = localStorage.getItem("kore_vendor_draft");
  const savedDraft = savedDraftStr ? JSON.parse(savedDraftStr) : null;

  // ── UI state ──
  // Do not restore the 'view' state from draft to prevent staying in the form/details when switching tabs
  const [view, setView] = useState<"list" | "form">("list");
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(
    savedDraft?.editingVendor || null
  );
  const [formData, setFormData] = useState<Vendor>(
    savedDraft?.formData || emptyVendor()
  );
  const [activeFormTab, setActiveFormTab] = useState(
    savedDraft?.activeFormTab || "other"
  );
  const [search, setSearch] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const displayNameTouched = useRef(false);

  // ── TDS Rates ──
  const [tdsRates, setTdsRates] = useState<{ _id: string; name: string; rate: number }[]>([]);
  const [addingTds, setAddingTds] = useState(false);
  const [newTdsInput, setNewTdsInput] = useState("");
  const [savingTds, setSavingTds] = useState(false);

  const fetchTdsRates = async () => {
    try {
      const res = await apiFetch("/tds-rates");
      setTdsRates(res.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchTdsRates(); }, []);

  const handleAddTdsRate = async () => {
    const num = parseFloat(newTdsInput);
    if (!newTdsInput || isNaN(num) || num <= 0) {
      toast.error("Valid rate daalo (e.g. 2, 10)");
      return;
    }
    setSavingTds(true);
    try {
      await apiFetch("/tds-rates", { method: "POST", body: JSON.stringify({ rate: num }) });
      await fetchTdsRates();
      updateField("tds", `${num}%`);
      setNewTdsInput("");
      setAddingTds(false);
      toast.success(`${num}% TDS rate add ho gaya`);
    } catch (e: any) {
      toast.error(e?.message || "Rate add nahi hua");
    } finally {
      setSavingTds(false);
    }
  };

  useEffect(() => {
    if (view === "form") {
      localStorage.setItem(
        "kore_vendor_draft",
        JSON.stringify({
          view,
          editingVendor,
          formData,
          activeFormTab,
        })
      );
    } else {
      localStorage.removeItem("kore_vendor_draft");
    }
  }, [view, editingVendor, formData, activeFormTab]);

  // ── Actions ──
  const openAddForm = () => {
    setFormData(emptyVendor());
    setEditingVendor(null);
    setActiveFormTab("other");
    setConfirmAccountNumber("");
    displayNameTouched.current = false;
    setView("form");
  };

  const openEditForm = (vendor: Vendor) => {
    setFormData({ ...vendor });
    setEditingVendor(vendor);
    setActiveFormTab("other");
    setConfirmAccountNumber("");
    displayNameTouched.current = true; // existing vendor — don't override
    setView("form");
  };

  const cancelForm = () => {
    setView("list");
    setFormData(emptyVendor());
    setEditingVendor(null);
    localStorage.removeItem("kore_vendor_draft");
  };

  const saveVendor = async () => {
    if (!formData.displayName) {
      return toast.error("Display Name is required.");
    }

    const savePromise = async () => {
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, formData);
      } else {
        await vendorService.createVendor(formData);
      }
      await fetchVendors();
      setView("list");
      setFormData(emptyVendor());
      setEditingVendor(null);
      localStorage.removeItem("kore_vendor_draft");
    };

    setLoading(true);
    const promise = savePromise();
    toast.promise(promise, {
      loading: editingVendor ? "Updating vendor..." : "Creating vendor...",
      success: editingVendor
        ? "Vendor updated successfully!"
        : "Vendor created successfully!",
      error: (err) => err.message || "Failed to save vendor",
    });
    promise.finally(() => setLoading(false));
  };

  const deleteVendor = async (id: string) => {
    if (confirm("Are you sure you want to delete this vendor?")) {
      const deletePromise = async () => {
        await vendorService.deleteVendor(id);
        await fetchVendors();
      };

      setLoading(true);
      const promise = deletePromise();
      toast.promise(promise, {
        loading: "Deleting vendor...",
        success: "Vendor deleted successfully!",
        error: (err) => err.message || "Failed to delete vendor",
      });
      promise.finally(() => setLoading(false));
    }
  };

  const handleStatusToggle = async (vendor: Vendor, newStatus: boolean) => {
    const vendorId = vendor.id;
    if (!vendorId) return;

    try {
      await vendorService.updateVendor(vendorId, { isActive: newStatus });
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorId ? { ...v, isActive: newStatus } : v))
      );
      toast.success(
        `Vendor ${newStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // ── Helpers ──
  const updateField = (field: keyof Vendor, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateBillingAddress = (field: keyof VendorAddress, value: string) => {
    setFormData((prev) => ({
      ...prev,
      billingAddress: { ...prev.billingAddress, [field]: value },
    }));
  };

  const updateShippingAddress = (field: keyof VendorAddress, value: string) => {
    setFormData((prev) => ({
      ...prev,
      shippingAddress: { ...prev.shippingAddress, [field]: value },
    }));
  };

  const copyBillingToShipping = () => {
    setFormData((prev) => ({
      ...prev,
      shippingAddress: { ...prev.billingAddress },
    }));
  };

  // const addContactPerson = () => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     contactPersons: [...prev.contactPersons, emptyContact()],
  //   }));
  // };

  // const removeContactPerson = (id: string) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     contactPersons: prev.contactPersons.filter((c) => c.id !== id),
  //   }));
  // };

  // const updateContactPerson = (
  //   id: string,
  //   field: keyof VendorContact,
  //   value: string
  // ) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     contactPersons: prev.contactPersons.map((c) =>
  //       c.id === id ? { ...c, [field]: value } : c
  //     ),
  //   }));
  // };

  const addBankDetail = () => {
    setFormData((prev) => ({
      ...prev,
      bankDetails: [...prev.bankDetails, emptyBank()],
    }));
  };

  const removeBankDetail = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      bankDetails: prev.bankDetails.filter((b) => b.id !== id),
    }));
  };

  const updateBankDetail = (
    id: string,
    field: keyof VendorBankDetail,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      bankDetails: prev.bankDetails.map((b) =>
        b.id === id ? { ...b, [field]: value } : b
      ),
    }));
  };

  // ── Filtered vendors ──
  const filteredVendors = vendors.filter(
    (v) =>
      v.displayName.toLowerCase().includes(search.toLowerCase()) ||
      v.companyName.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Form Tabs ───
  const formTabs = [
    { key: "other", label: "Other Details", icon: <FileText size={14} /> },
    { key: "address", label: "Address", icon: <MapPin size={14} /> },
    { key: "bank", label: "Bank Details", icon: <Landmark size={14} /> },
  ];

  // Indian states
  const indianStates = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Delhi",
    "Jammu & Kashmir",
    "Ladakh",
    "Puducherry",
    "Chandigarh",
    "Andaman & Nicobar",
    "Dadra & Nagar Haveli",
    "Lakshadweep",
  ];

  // ═════════════════ RENDER ═════════════════

  // ─── LIST VIEW ──────────────────────────
  if (view === "list") {
    return (
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
              <Truck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Vendors
              </h2>
              <p className="text-slate-500 text-xs font-medium">
                Manage your vendor and supplier directory
              </p>
            </div>
          </div>

          <button
            onClick={openAddForm}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 hover:-translate-y-0.5"
          >
            <Plus size={18} />
            Add Vendor
          </button>
        </div>

        {/* Search & Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          {/* Search */}
          <div className="p-4 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search vendors by name, company, or email…"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all text-sm font-medium text-slate-700"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          {filteredVendors.length === 0 ? (
            <div className="py-20 text-center">
              <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                <Truck size={32} className="text-slate-300" />
              </div>
              <p className="text-slate-400 font-semibold text-sm">
                {vendors.length === 0
                  ? 'No vendors added yet. Click "Add Vendor" to get started.'
                  : "No vendors match your search."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Display Name
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-indigo-600 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      onClick={() => openEditForm(vendor)}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            {vendor.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                            {vendor.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {vendor.companyName || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {vendor.email || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {vendor.workPhone || vendor.mobile || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={vendor.isActive !== false}
                            onCheckedChange={(checked) =>
                              handleStatusToggle(vendor, checked)
                            }
                            className="scale-90"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteVendor(vendor.id);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} itemsPerPage={pageSize} onPageSizeChange={setPageSize} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── FORM VIEW ──────────────────────────
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={cancelForm}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20">
            <Truck size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {editingVendor ? "Edit Vendor" : "New Vendor"}
            </h2>
            <p className="text-slate-500 text-xs font-medium">
              {editingVendor
                ? `Editing ${editingVendor.displayName}`
                : "Add a new vendor to your directory"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* ── Top section: Primary fields ── */}
        <div className="p-6 md:p-8 border-b border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PRIMARY CONTACT */}
            <div>
              <label className={labelClass}>Primary Contact</label>
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr] gap-2">
                <select
                  disabled={loading}
                  className={selectClass}
                  value={formData.salutation}
                  onChange={(e) => updateField("salutation", e.target.value)}
                >
                  <option value="">Salutation</option>
                  <option>Mr.</option>
                  <option>Ms.</option>
                  <option>Mrs.</option>
                  <option>Dr.</option>
                </select>
                <input
                  disabled={loading}
                  type="text"
                  placeholder="First Name"
                  className={inputClass}
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
                <input
                  disabled={loading}
                  type="text"
                  placeholder="Last Name"
                  className={inputClass}
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
              </div>
            </div>

            {/* COMPANY NAME */}
            <div>
              <label className={labelClass}>Company Name</label>
              <input
                disabled={loading}
                type="text"
                className={inputClass}
                value={formData.companyName}
                placeholder="Company Name"
                onChange={(e) => {
                  updateField("companyName", e.target.value);
                  if (!displayNameTouched.current) {
                    updateField("displayName", e.target.value);
                  }
                }}
              />
            </div>

            {/* DISPLAY NAME */}
            <div>
              <label className={labelClass}>
                Display Name <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-[1fr_150px] gap-2">
                <input
                  disabled={loading}
                  type="text"
                  required
                  className={inputClass}
                  value={formData.displayName}
                  placeholder="Display Name"
                  onChange={(e) => {
                    displayNameTouched.current = true;
                    updateField("displayName", e.target.value);
                  }}
                />
                <input
                  disabled={loading}
                  type="text"
                  placeholder="VendorCode"
                  className={inputClass}
                  value={formData.vendorCode}
                  onChange={(e) =>
                    updateField("vendorCode", e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>

            {/* EMAIL */}
            <div>
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  disabled={loading}
                  type="email"
                  className={`${inputClass} pl-10`}
                  value={formData.email}
                  placeholder="Email Address"
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </div>
            </div>

            {/* PHONE */}
            <div className="md:col-span-2">
              <label className={labelClass}>Phone</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex gap-2">
                  <span className="shrink-0 flex items-center px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">
                    +91
                  </span>
                  <input
                    disabled={loading}
                    type="text"
                    placeholder="Work Phone"
                    className={inputClass}
                    value={formData.workPhone}
                    onChange={(e) => updateField("workPhone", e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <span className="shrink-0 flex items-center px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">
                    +91
                  </span>
                  <input
                    disabled={loading}
                    type="text"
                    placeholder="Mobile"
                    className={inputClass}
                    value={formData.mobile}
                    onChange={(e) => updateField("mobile", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="border-b border-slate-100 px-6 md:px-8">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {formTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFormTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeFormTab === tab.key
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="p-6 md:p-8">
          {/* ─── OTHER DETAILS ─── */}
          {activeFormTab === "other" && (
            <div className="space-y-6 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>GST Number</label>
                  <GSTVerifyInput
                    value={formData.gstNumber}
                    onChange={(val) => updateField("gstNumber", val)}
                    inputClass={inputClass}
                    onVerified={(data: GSTVerifyResult) => {
                      if (data.pan) updateField("pan", data.pan);
                      if (data.tradeName || data.legalName) {
                        const name = data.tradeName || data.legalName || "";
                        if (!formData.companyName) updateField("companyName", name);
                        if (!formData.displayName)  updateField("displayName",  name);
                      }
                      if (data.address) {
                        updateField("billingAddress", {
                          ...formData.billingAddress,
                          address1: data.address.address1,
                          address2: data.address.address2,
                          city:     data.address.city,
                          state:    data.address.state,
                          pinCode:  data.address.pinCode,
                        } as VendorAddress);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>CIN Number</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.cinNumber}
                    onChange={(e) =>
                      updateField("cinNumber", e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>PAN</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.pan}
                    onChange={(e) =>
                      updateField("pan", e.target.value.toUpperCase())
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Brand</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={formData.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                  />
                </div>
              </div>


              <div>
                <label className={labelClass}>Currency</label>
                <select
                  className={selectClass}
                  value={formData.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                >
                  <option>INR- Indian Rupee</option>
                  <option>USD- US Dollar</option>
                  {/* <option>EUR- Euro</option>
                  <option>GBP- British Pound</option> */}
                </select>
              </div>

              <div>
                <label className={labelClass}>Payment Terms</label>
                <select
                  className={selectClass}
                  value={formData.paymentTerms}
                  onChange={(e) => updateField("paymentTerms", e.target.value)}
                >
                  <option>Due on Receipt</option>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Net 45</option>
                  <option>Net 60</option>
                  <option>Due end of the month</option>
                  <option>Due end of next month</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>GST Rate</label>
                <div className="flex gap-2 items-center">
                  <select
                    className={selectClass}
                    value={formData.tds}
                    onChange={(e) => updateField("tds", e.target.value)}
                  >
                    <option value="">Select GST Rate</option>
                    {tdsRates.map((r) => (
                      <option key={r._id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                  {!addingTds ? (
                    <button
                      type="button"
                      onClick={() => setAddingTds(true)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all whitespace-nowrap"
                    >
                      <Plus size={13} /> Add New
                    </button>
                  ) : (
                    <div className="shrink-0 flex items-center gap-1.5">
                      <div className="relative">
                        <Percent size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="e.g. 18"
                          value={newTdsInput}
                          onChange={(e) => setNewTdsInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddTdsRate();
                            if (e.key === "Escape") { setAddingTds(false); setNewTdsInput(""); }
                          }}
                          autoFocus
                          className="w-24 pl-7 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm font-medium text-slate-800"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddTdsRate}
                        disabled={savingTds}
                        className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {savingTds ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAddingTds(false); setNewTdsInput(""); }}
                        className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Existing rates as deletable chips */}
                {tdsRates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tdsRates.map((r) => (
                      <span
                        key={r._id}
                        className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600"
                      >
                        {r.name}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await apiFetch(`/tds-rates/${r._id}`, { method: "DELETE" });
                              if (formData.tds === r.name) updateField("tds", "");
                              await fetchTdsRates();
                            } catch (e: any) {
                              toast.error(e?.message || "Delete nahi hua");
                            }
                          }}
                          className="p-0.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                          title={`Delete ${r.name}`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── ADDRESS ─── */}
          {activeFormTab === "address" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Billing Address */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-100">
                    <MapPin size={14} className="text-indigo-500" /> Billing
                    Address
                  </h4>
                  {renderAddressFields(
                    formData.billingAddress,
                    updateBillingAddress,
                    indianStates
                  )}
                </div>

                {/* Shipping Address */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <MapPin size={14} className="text-emerald-500" /> Shipping
                      Address
                    </h4>
                    <button
                      type="button"
                      onClick={copyBillingToShipping}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      <Copy size={12} />
                      Copy billing address
                    </button>
                  </div>
                  {renderAddressFields(
                    formData.shippingAddress,
                    updateShippingAddress,
                    indianStates
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─── BANK DETAILS ─── */}
          {activeFormTab === "bank" && (
            <div className="space-y-6">
              {formData.bankDetails.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                    <Landmark size={28} className="text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-semibold text-sm mb-4">
                    No bank details added yet.
                  </p>
                  <button
                    type="button"
                    onClick={addBankDetail}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20"
                  >
                    <Plus size={16} />
                    Add New Bank
                  </button>
                </div>
              ) : (
                <>
                  {formData.bankDetails.map((bank, idx) => (
                    <div
                      key={bank.id}
                      className="p-5 bg-slate-50/50 border border-slate-200 rounded-xl space-y-4 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Bank #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeBankDetail(bank.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                        <div>
                          <label className={labelClass}>
                            Account Holder Name
                          </label>
                          <input
                            type="text"
                            className={inputClass}
                            value={bank.accountHolderName}
                            onChange={(e) =>
                              updateBankDetail(
                                bank.id,
                                "accountHolderName",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Bank Name</label>
                          <input
                            type="text"
                            className={inputClass}
                            value={bank.bankName}
                            onChange={(e) =>
                              updateBankDetail(
                                bank.id,
                                "bankName",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            Account Number{" "}
                            <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="password"
                            className={inputClass}
                            value={bank.accountNumber}
                            onChange={(e) =>
                              updateBankDetail(
                                bank.id,
                                "accountNumber",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass + " text-rose-500"}>
                            Re-enter Account Number{" "}
                            <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            className={inputClass}
                            value={confirmAccountNumber}
                            onChange={(e) =>
                              setConfirmAccountNumber(e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>
                            IFSC <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            className={inputClass}
                            value={bank.ifsc}
                            onChange={(e) =>
                              updateBankDetail(
                                bank.id,
                                "ifsc",
                                e.target.value.toUpperCase()
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addBankDetail}
                    className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <Plus size={16} />
                    Add New Bank
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 md:px-8 flex justify-between items-center">
          <p className="text-xs text-slate-400 font-medium hidden sm:block">
            Required fields are marked with{" "}
            <span className="text-rose-500">*</span>
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={cancelForm}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveVendor}
              className="flex-1 sm:flex-none px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <CheckCircle2 size={18} />
              {editingVendor ? "Update Vendor" : "Save Vendor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Address Fields Helper ──────────────────────
function renderAddressFields(
  addr: VendorAddress,
  onChange: (field: keyof VendorAddress, value: string) => void,
  states: string[]
) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Attention</label>
        <input
          type="text"
          className={inputClass}
          value={addr.attention}
          onChange={(e) => onChange("attention", e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>Country / Region</label>
        <select
          className={selectClass}
          value={addr.country}
          onChange={(e) => onChange("country", e.target.value)}
        >
          <option value="">Select</option>
          <option>India</option>
          <option>United States</option>
          <option>United Kingdom</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Address</label>
        <input
          type="text"
          placeholder="Street 1"
          className={`${inputClass} mb-3`}
          value={addr.address1}
          onChange={(e) => onChange("address1", e.target.value)}
        />
        <input
          type="text"
          placeholder="Street 2"
          className={inputClass}
          value={addr.address2}
          onChange={(e) => onChange("address2", e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>City</label>
        <input
          type="text"
          className={inputClass}
          value={addr.city}
          onChange={(e) => onChange("city", e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>State</label>
        <select
          className={selectClass}
          value={addr.state}
          onChange={(e) => onChange("state", e.target.value)}
        >
          <option value="">Select or type to add</option>
          {states.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Pin Code</label>
        <input
          type="text"
          className={inputClass}
          value={addr.pinCode}
          onChange={(e) => onChange("pinCode", e.target.value)}
        />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <div className="flex gap-2">
          <span className="shrink-0 flex items-center px-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">
            +91
          </span>
          <input
            type="text"
            className={inputClass}
            value={addr.phone}
            onChange={(e) => onChange("phone", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Fax Number</label>
        <input
          type="text"
          className={inputClass}
          value={addr.fax}
          onChange={(e) => onChange("fax", e.target.value)}
        />
      </div>
    </div>
  );
}

export default VendorManager;
