const nodemailer = require("nodemailer");

let _transporter = null;
let _config = null;

const buildTransporter = (cfg) => {
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort || 587,
    secure: cfg.smtpSecure || false,
    auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
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

module.exports = { sendMail, testConnection };
