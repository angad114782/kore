const NotificationConfig = require("../models/NotificationConfig");
const emailSvc = require("../services/email.service");
const waSvc = require("../services/whatsapp.service");

const getConfig = async (req, res) => {
  try {
    const cfg = await NotificationConfig.getSingleton();
    // Mask password in response
    const safe = { ...cfg, smtpPass: cfg.smtpPass ? "••••••••" : "", waToken: cfg.waToken ? "••••••••" : "" };
    res.json({ success: true, data: safe });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const saveConfig = async (req, res) => {
  try {
    const body = req.body;
    const existing = await NotificationConfig.findOne();
    const update = { ...body };

    // Don't overwrite masked secrets
    if (update.smtpPass === "••••••••") delete update.smtpPass;
    if (update.waToken  === "••••••••") delete update.waToken;

    let doc;
    if (existing) {
      Object.assign(existing, update);
      doc = await existing.save();
    } else {
      doc = await NotificationConfig.create(update);
    }
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const testEmail = async (req, res) => {
  try {
    const cfg = await NotificationConfig.findOne().lean();
    if (!cfg) return res.status(400).json({ success: false, message: "Email not configured" });
    await emailSvc.testConnection(cfg);
    // Send a test mail to the requesting user
    await emailSvc.sendMail(cfg, {
      to: req.user.email,
      subject: "[Kore] Test Email",
      html: "<p>Test email from Kore Kollective notification system. If you see this, SMTP is working!</p>",
    });
    res.json({ success: true, message: `Test email sent to ${req.user.email}` });
  } catch (e) {
    res.status(500).json({ success: false, message: `SMTP Error: ${e.message}` });
  }
};

const testWhatsapp = async (req, res) => {
  try {
    const cfg = await NotificationConfig.findOne().lean();
    const { phone, template } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone number required" });
    await waSvc.sendTemplate(cfg, { to: phone, template: template || "hello_world", language: "en" });
    res.json({ success: true, message: `Test WhatsApp sent to ${phone}` });
  } catch (e) {
    res.status(500).json({ success: false, message: `WhatsApp Error: ${e.message}` });
  }
};

const getEvents = (req, res) => {
  res.json({ success: true, data: NotificationConfig.EVENTS, groups: NotificationConfig.EVENT_GROUPS });
};

const getRoles = (req, res) => {
  res.json({ success: true, data: NotificationConfig.ADMIN_ROLES });
};

module.exports = { getConfig, saveConfig, testEmail, testWhatsapp, getEvents, getRoles };
