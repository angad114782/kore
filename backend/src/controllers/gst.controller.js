const axios = require("axios");
const Settings = require("../models/Settings");

const GST_STATE_MAP = {
  "01": "Jammu & Kashmir",       "02": "Himachal Pradesh",    "03": "Punjab",
  "04": "Chandigarh",             "05": "Uttarakhand",         "06": "Haryana",
  "07": "Delhi",                  "08": "Rajasthan",           "09": "Uttar Pradesh",
  "10": "Bihar",                  "11": "Sikkim",              "12": "Arunachal Pradesh",
  "13": "Nagaland",               "14": "Manipur",             "15": "Mizoram",
  "16": "Tripura",                "17": "Meghalaya",           "18": "Assam",
  "19": "West Bengal",            "20": "Jharkhand",           "21": "Odisha",
  "22": "Chhattisgarh",           "23": "Madhya Pradesh",      "24": "Gujarat",
  "25": "Daman & Diu",            "26": "Dadra & Nagar Haveli","27": "Maharashtra",
  "29": "Karnataka",              "30": "Goa",                 "31": "Lakshadweep",
  "32": "Kerala",                 "33": "Tamil Nadu",          "34": "Puducherry",
  "35": "Andaman & Nicobar",     "36": "Telangana",            "37": "Andhra Pradesh",
  "38": "Ladakh",
};

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;


// ── GSTVerify.co.in API ───────────────────────────────────────────────────────
// GET https://gstverify.co.in/api/v1/verify/:gstin
// Header: x-api-key
function buildGSTVerifyAddress(data) {
  // Raw address has em-dash before pincode: "..., Rajasthan — 301411"
  const rawAddr = (data.address || "").replace(/\s*[—–-]\s*\d{6}\s*$/, "").trim();
  const parts = rawAddr.split(",").map(s => s.trim()).filter(Boolean);
  // Drop trailing part if it duplicates the state name
  const stateName = (data.state || "").trim().toLowerCase();
  if (parts.length > 1 && parts[parts.length - 1].toLowerCase() === stateName) parts.pop();
  return {
    address1: parts.slice(0, 2).join(", "),
    address2: parts.slice(2).join(", "),
    city:     data.district  || "",
    state:    data.state     || "",
    pinCode:  data.pincode   || "",
  };
}

async function callGSTVerifyAPI(gstin, apiKey) {
  if (!apiKey) return null;

  const res = await axios.get(
    `https://gstverify.co.in/api/v1/verify/${gstin}`,
    {
      headers: { "x-api-key": apiKey },
      timeout: 12000,
    }
  );

  if (!res.data?.success) {
    throw new Error(res.data?.message || "GSTVerify API error");
  }

  const d = res.data.data || {};
  return {
    pan:          (d.pan          || gstin.slice(2, 12)).trim(),
    legalName:    (d.legal_name   || "").trim(),
    tradeName:    (d.trade_name   || d.legal_name || "").trim(),
    gstStatus:    (d.status       || "").trim(),
    constitution: (d.constitution || "").trim(),
    dealerType:   (d.taxpayer_type || "").trim(),
    regDate:      (d.registration_date || "").trim(),
    address:      buildGSTVerifyAddress(d),
    stateCode:    (d.state_code   || gstin.slice(0, 2)).trim(),
  };
}

// ── Main verify handler ───────────────────────────────────────────────────────
const verifyGST = async (req, res) => {
  try {
    const gstin = (req.params.gstin || "").trim().toUpperCase();

    if (!GST_REGEX.test(gstin)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GSTIN format",
      });
    }

    const stateCode = gstin.slice(0, 2);
    const pan       = gstin.slice(2, 12);
    const state     = GST_STATE_MAP[stateCode] || null;

    const keyDoc = await Settings.findOne({ key: "gstverify_api_key" }).lean();
    const apiKey = keyDoc?.value || process.env.GSTVERIFY_API_KEY || "";

    if (!apiKey) {
      return res.json({
        success: true,
        data: {
          gstin, pan, stateCode, state,
          legalName: null, tradeName: null, gstStatus: null,
          constitution: null, dealerType: null, regDate: null,
          address: null,
          source: "local",
          apiConfigured: false,
        },
      });
    }

    let apiData = null;
    try {
      apiData = await callGSTVerifyAPI(gstin, apiKey);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      return res.status(400).json({ success: false, message: msg });
    }

    return res.json({
      success: true,
      data: {
        gstin,
        pan:          apiData.pan          || pan,
        stateCode:    apiData.stateCode    || stateCode,
        state:        apiData.address?.state || state,
        legalName:    apiData.legalName    || null,
        tradeName:    apiData.tradeName    || null,
        gstStatus:    apiData.gstStatus    || null,
        constitution: apiData.constitution || null,
        dealerType:   apiData.dealerType   || null,
        regDate:      apiData.regDate      || null,
        address:      apiData.address      || null,
        source: "api",
        apiConfigured: true,
      },
    });
  } catch (error) {
    console.error("GST verify error:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { verifyGST };
