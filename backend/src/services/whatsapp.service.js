const axios = require("axios");

const WA_API_VERSION = "v19.0";

const sendTemplate = async (cfg, { to, template, language = "en", components = [] }) => {
  if (!cfg.waEnabled || !cfg.waToken || !cfg.waPhoneNumberId) return;
  const phone = String(to).replace(/\D/g, "");
  if (!phone || phone.length < 10) return;

  await axios.post(
    `https://graph.facebook.com/${WA_API_VERSION}/${cfg.waPhoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: template,
        language: { code: language },
        components,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${cfg.waToken}`,
        "Content-Type": "application/json",
      },
    }
  );
};

const sendText = async (cfg, { to, text }) => {
  if (!cfg.waEnabled || !cfg.waToken || !cfg.waPhoneNumberId) return;
  const phone = String(to).replace(/\D/g, "");
  if (!phone || phone.length < 10) return;

  await axios.post(
    `https://graph.facebook.com/${WA_API_VERSION}/${cfg.waPhoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${cfg.waToken}`,
        "Content-Type": "application/json",
      },
    }
  );
};

module.exports = { sendTemplate, sendText };
