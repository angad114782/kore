const service = require("../services/purchaseOrderService");
const activityLog = require("../services/activityLog.service");
const { emitPOEvent } = require("../socket");

const sendError = (res, err) => {
  const code = err.statusCode || 500;
  return res.status(code).json({ message: err.message || "Server error" });
};

exports.createPO = async (req, res) => {
  try {
    const doc = await service.create(req.body);

    activityLog.createLog({
      action: "PO_CREATED",
      entityType: "PO",
      entityId: String(doc._id),
      description: `PO (${String(doc._id).slice(-6)}) created by ${req.user?.name || "admin"}`,
      metadata: { poNumber: doc.poNumber, vendor: doc.vendorName },
      user: req.user,
    });

    emitPOEvent("poCreated", { poId: String(doc._id), poNumber: doc.poNumber, vendorName: doc.vendorName });
    return res.status(201).json({ message: "PO created", data: doc });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.listPOs = async (req, res) => {
  try {
    const result = await service.list(req.query);

    return res.json({
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        pageSizeOptions: result.pageSizeOptions,
      },
    });
  } catch (err) {
    return sendError(res, err);
  }
};

// ✅ bill list
exports.listBills = async (req, res) => {
  try {
    const result = await service.listBills(req.query);

    return res.json({
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
        pageSizeOptions: result.pageSizeOptions,
      },
    });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.getPOById = async (req, res) => {
  try {
    const doc = await service.getById(req.params.id);
    return res.json({ data: doc });
  } catch (err) {
    return sendError(res, err);
  }
};

// ✅ bill detail
exports.getBillById = async (req, res) => {
  try {
    const doc = await service.getBillById(req.params.id);
    return res.json({ data: doc });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.updatePO = async (req, res) => {
  try {
    const doc = await service.update(req.params.id, req.body);

    activityLog.createLog({
      action: "PO_UPDATED",
      entityType: "PO",
      entityId: String(req.params.id),
      description: `PO (${String(req.params.id).slice(-6)}) updated by ${req.user?.name || "admin"}`,
      user: req.user,
    });

    emitPOEvent("poUpdated", { poId: String(req.params.id), poNumber: doc.poNumber });
    return res.json({ message: "PO updated", data: doc });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.approveBill = async (req, res) => {
  try {
    const doc = await service.approveBill(req.params.id, req.body);

    activityLog.createLog({
      action: "PO_APPROVED",
      entityType: "PO",
      entityId: String(req.params.id),
      description: `PO/Bill #${doc.poNumber} approved by ${req.user?.name || "admin"}`,
      user: req.user,
    });

    emitPOEvent("billApproved", { poId: String(req.params.id), poNumber: doc.poNumber, vendorName: doc.vendorName });
    return res.json({ message: "Bill approved successfully", data: doc });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.rejectBill = async (req, res) => {
  try {
    const doc = await service.rejectBill(req.params.id, req.body);

    activityLog.createLog({
      action: "PO_REJECTED",
      entityType: "PO",
      entityId: String(req.params.id),
      description: `PO/Bill #${doc.poNumber} rejected by ${req.user?.name || "admin"}`,
      metadata: { reason: req.body.reason },
      user: req.user,
    });

    emitPOEvent("billRejected", { poId: String(req.params.id), poNumber: doc.poNumber, reason: req.body.reason });
    return res.json({ message: "Bill rejected successfully", data: doc });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.addInvoice = async (req, res) => {
  try {
    const doc = await service.addInvoice(req.params.id, req.body);
    const latest = doc.invoices[doc.invoices.length - 1];

    activityLog.createLog({
      action: "PO_INVOICE_ADDED",
      entityType: "PO",
      entityId: String(req.params.id),
      description: `Vendor invoice ${latest?.invoiceNumber ? `#${latest.invoiceNumber} ` : ""}(₹${latest?.invoiceAmount.toLocaleString()}) logged for PO #${doc.poNumber} by ${req.user?.name || "admin"} (${doc.invoices.length} invoice(s) total)`,
      user: req.user,
    });

    emitPOEvent("poUpdated", { poId: String(req.params.id), poNumber: doc.poNumber });
    return res.json({ message: "Invoice added", data: doc });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const doc = await service.recordPayment(req.params.id, {
      ...req.body,
      recordedBy: req.user?.name || "admin",
    });

    activityLog.createLog({
      action: "PO_PAYMENT_RECORDED",
      entityType: "PO",
      entityId: String(req.params.id),
      description: `₹${Number(req.body.amount).toLocaleString()} paid to vendor for PO #${doc.poNumber} by ${req.user?.name || "admin"}`,
      metadata: { amount: req.body.amount, note: req.body.note },
      user: req.user,
    });

    emitPOEvent("poUpdated", { poId: String(req.params.id), poNumber: doc.poNumber });
    return res.json({ message: "Payment recorded", data: doc });
  } catch (err) {
    return sendError(res, err);
  }
};

exports.deletePO = async (req, res) => {
  try {
    const PurchaseOrder = require("../models/PurchaseOrder");
    const po = await PurchaseOrder.findById(req.params.id).select("poNumber vendorName").lean();
    await service.softDelete(req.params.id);

    activityLog.createLog({
      action: "PO_DELETED",
      entityType: "PO",
      entityId: String(req.params.id),
      description: `PO ${po?.poNumber || req.params.id} deleted by ${req.user?.name || "admin"}`,
      user: req.user,
    });

    emitPOEvent("poDeleted", { poId: String(req.params.id), poNumber: po?.poNumber || "", vendorName: po?.vendorName || "" });
    return res.json({ message: "PO deleted" });
  } catch (err) {
    return sendError(res, err);
  }
};
// POST /purchase-orders/:id/send-email — mail the PO (PDF and/or CSV) to chosen recipients.
// Files are generated by the browser (same layout as the download buttons) and uploaded here.
exports.emailPO = async (req, res) => {
  try {
    const PurchaseOrder = require("../models/PurchaseOrder");
    const NotificationConfig = require("../models/NotificationConfig");
    const { sendMailStrict } = require("../services/email.service");

    const po = await PurchaseOrder.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!po) return res.status(404).json({ message: "Purchase order not found" });

    let to = [];
    try { to = JSON.parse(req.body.to || "[]"); } catch { to = String(req.body.to || "").split(","); }
    to = [...new Set(to.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const bad = to.filter((e) => !valid.test(e));
    if (!to.length) return res.status(400).json({ message: "Select at least one recipient" });
    if (bad.length) return res.status(400).json({ message: `Invalid email: ${bad.join(", ")}` });
    if (to.length > 10) return res.status(400).json({ message: "At most 10 recipients" });

    const base = po.poNumber || `PO-${String(po._id).slice(-6).toUpperCase()}`;
    const attachments = [];
    const pdf = req.files?.pdf?.[0];
    const csv = req.files?.csv?.[0];
    if (pdf) attachments.push({ filename: `${base}.pdf`, content: pdf.buffer, contentType: "application/pdf" });
    if (csv) attachments.push({ filename: `${base}.csv`, content: csv.buffer, contentType: "text/csv" });
    if (!attachments.length) return res.status(400).json({ message: "Attach at least a PDF or a CSV" });

    const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const cfg = await NotificationConfig.getSingleton();
    const company = cfg.smtpFromName || "Kore Kollective";
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1e293b">
      <p>Dear ${esc(po.vendorName || "Sir/Madam")},</p>
      <p>Please find attached Purchase Order <b>${esc(base)}</b>${po.deliveryDate ? ` with expected delivery on <b>${esc(String(po.deliveryDate).slice(0, 10))}</b>` : ""}.</p>
      <p>Total value: <b>&#8377;${Number(po.total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</b></p>
      <p>Kindly confirm receipt of this order.</p>
      <p>Regards,<br/>${esc(company)}</p></div>`;

    await sendMailStrict(cfg, { to, subject: `Purchase Order ${base} from ${company}`, html, attachments });

    activityLog.createLog({
      action: "PO_EMAILED",
      entityType: "PO",
      entityId: String(po._id),
      description: `PO ${base} emailed to ${to.join(", ")} by ${req.user?.name || "admin"}`,
      metadata: { poNumber: po.poNumber, to, files: attachments.map((a) => a.filename) },
      user: req.user,
    });
    return res.json({ message: `PO emailed to ${to.length} recipient(s)`, data: { to } });
  } catch (err) {
    return sendError(res, err);
  }
};
