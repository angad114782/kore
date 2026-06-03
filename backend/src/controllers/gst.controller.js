const axios = require("axios");

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

// ── Surepass GST API ────────────────────────────────────────────────────────
// Docs: https://docs.surepass.io/
// Endpoint: POST https://kyc-api.surepass.io/api/v1/corporate/gstin-advance
// Header:   Authorization: Bearer YOUR_TOKEN
// Body:     { "id": "GSTIN" }
async function callSurepassGSTAPI(gstin) {
  const token = process.env.SUREPASS_TOKEN;
  if (!token) return null;

  const res = await axios.post(
    "https://kyc-api.surepass.io/api/v1/corporate/gstin-advance",
    { id: gstin },
    {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 12000,
    }
  );

  const d = res.data?.data || {};
  if (!d.gstin && !d.business_name && !d.legal_name) {
    throw new Error(res.data?.message || "No data returned");
  }

  // Build address from principal_place_of_business string or address object
  let address = null;
  const ppob = d.principal_place_of_business_fields || d.principal_address || {};
  const ppobStr = d.principal_place_of_business || "";

  if (ppob && (ppob.BuildingName || ppob.Street || ppob.City || ppob.StateName)) {
    address = {
      address1: [ppob.BuildingName, ppob.BuildingNumber, ppob.Street].filter(Boolean).join(", "),
      address2: ppob.Location || "",
      city:     ppob.City || ppob.District || "",
      state:    ppob.StateName || ppob.State || "",
      pincode:  String(ppob.PinCode || ppob.pincode || ""),
    };
  } else if (ppobStr) {
    // Fallback: parse from comma-separated string
    const parts = ppobStr.split(",").map(s => s.trim()).filter(Boolean);
    address = {
      address1: parts.slice(0, 2).join(", "),
      address2: "",
      city:     parts[parts.length - 3] || "",
      state:    d.state || "",
      pincode:  parts[parts.length - 1]?.match(/\d{6}/)?.[0] || "",
    };
  }

  // Fill state from our map if not provided
  const stateCode = gstin.slice(0, 2);
  if (address && !address.state) {
    address.state = GST_STATE_MAP[stateCode] || "";
  }

  return {
    legalName:    (d.legal_name || d.business_name || "").trim(),
    tradeName:    (d.trade_name || d.business_name || d.legal_name || "").trim(),
    gstStatus:    (d.gst_in_status || d.status || "").trim(),
    constitution: (d.constitution_of_business || "").trim(),
    dealerType:   (d.taxpayer_type || "").trim(),
    regDate:      (d.date_of_registration || d.registration_date || "").trim(),
    address,
    stateCode,
  };
}

// ── Main verify handler ───────────────────────────────────────────────────
const verifyGST = async (req, res) => {
  try {
    const gstin = (req.params.gstin || "").trim().toUpperCase();

    if (!GST_REGEX.test(gstin)) {
      return res.status(400).json({
        success: false,
        message: "Invalid GSTIN format (15 chars: 2-digit state + PAN + entity + Z + checksum)",
      });
    }

    const stateCode = gstin.slice(0, 2);
    const pan       = gstin.slice(2, 12);
    const state     = GST_STATE_MAP[stateCode] || null;

    if (!process.env.SUREPASS_TOKEN) {
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
      apiData = await callSurepassGSTAPI(gstin);
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      return res.status(400).json({ success: false, message: msg });
    }

    return res.json({
      success: true,
      data: {
        gstin,
        pan,
        stateCode: apiData.stateCode || stateCode,
        state:     apiData.address?.state || state,
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
