const nodemailer = require("nodemailer");

let _transporter = null;
let _config = null;

const buildTransporter = (cfg) => {
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort || 587,
    secure: cfg.smtpSecure || false,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

const sendMail = async (cfg, { to, subject, html, text }) => {
  if (!cfg.emailEnabled || !cfg.smtpHost || !cfg.smtpUser) return;
  const transporter = buildTransporter(cfg);
  await transporter.sendMail({
    from: `"${cfg.smtpFromName || "Kore Kollective"}" <${cfg.smtpFromEmail || cfg.smtpUser}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
  });
};

const testConnection = async (cfg) => {
  const transporter = buildTransporter(cfg);
  await transporter.verify();
};

// Like sendMail, but supports attachments and THROWS when email is not set up or
// delivery fails, so the caller can tell the user instead of failing silently.
const sendMailStrict = async (cfg, { to, subject, html, text, attachments }) => {
  if (!cfg.emailEnabled || !cfg.smtpHost || !cfg.smtpUser) {
    const err = new Error("Email is not set up. Turn on email and add SMTP details in Notifications settings.");
    err.statusCode = 400;
    throw err;
  }
  const transporter = buildTransporter(cfg);
  return transporter.sendMail({
    from: `"${cfg.smtpFromName || "Kore Kollective"}" <${cfg.smtpFromEmail || cfg.smtpUser}>`,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ""),
    attachments,
  });
};

module.exports = { sendMail, sendMailStrict, testConnection };
