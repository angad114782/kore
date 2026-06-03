const User = require("../models/User");
const NotificationConfig = require("../models/NotificationConfig");
const emailSvc = require("./email.service");
const waSvc = require("./whatsapp.service");

// Build plain-text email body for an event
const buildEmailHtml = (event, data) => {
  const lines = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#64748b;font-size:12px">${k}</td><td style="padding:4px 8px;font-weight:600;font-size:12px">${v}</td></tr>`)
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b">${event.replace(/_/g, " ")}</h2>
      <table style="border-collapse:collapse;width:100%;background:#f8fafc;border-radius:8px;overflow:hidden">
        <tbody>${lines}</tbody>
      </table>
      <p style="margin-top:20px;font-size:11px;color:#94a3b8">Kore Kollective — automated notification</p>
    </div>`;
};

// Get phones for given roles (staff users only)
const getUserContacts = async (roles) => {
  const users = await User.find({
    role: { $in: roles },
    isActive: true,
  }).select("email phone name").lean();
  return users;
};

// Dispatcher — call this from any service
const dispatch = async (event, { data = {}, distributorEmail, distributorPhone, subject } = {}) => {
  try {
    const cfg = await NotificationConfig.getSingleton();
    const rule = (cfg.rules || []).find(r => r.event === event);
    if (!rule) return;

    const emailSubject = subject || `[Kore] ${event.replace(/_/g, " ")}`;
    const html = buildEmailHtml(event, data);

    // ── EMAIL ──────────────────────────────────────────────
    if (cfg.emailEnabled && rule.emailEnabled) {
      const staffContacts = await getUserContacts(rule.emailRoles || []);
      const toEmails = staffContacts.map(u => u.email).filter(Boolean);
      if (rule.emailDistributor && distributorEmail) toEmails.push(distributorEmail);

      if (toEmails.length) {
        await emailSvc.sendMail(cfg, { to: toEmails, subject: emailSubject, html }).catch(err =>
          console.error(`[Notification] Email failed for ${event}:`, err.message)
        );
      }
    }

    // ── WHATSAPP ───────────────────────────────────────────
    if (cfg.waEnabled && rule.waEnabled && rule.waTemplate) {
      const staffContacts = await getUserContacts(rule.waRoles || []);
      const phones = staffContacts.map(u => u.phone).filter(Boolean);
      if (rule.waDistributor && distributorPhone) phones.push(distributorPhone);

      for (const phone of phones) {
        await waSvc.sendTemplate(cfg, {
          to: phone,
          template: rule.waTemplate,
          language: rule.waLanguage || "en",
        }).catch(err =>
          console.error(`[Notification] WhatsApp failed for ${event} → ${phone}:`, err.message)
        );
      }
    }
  } catch (err) {
    console.error(`[Notification] dispatch error for ${event}:`, err.message);
  }
};

module.exports = { dispatch };
