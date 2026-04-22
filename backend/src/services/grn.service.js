const GRNDraft = require("../models/grn.model");

const PAIRS_PER_CARTON = 24;

const todayYYMMDD = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
};

const makeCartonBarcode = (refType, refNo, serial) => {
  // refNo: "1023" from "PO-1023"
  const dateStr = todayYYMMDD();
  return `CTN-${dateStr}-${refType}-${refNo}-${String(serial).padStart(
    3,
    "0"
  )}`;
};

const makeGRNNo = (articleName, poNo, sequence) => {
  const cleanArticle = (articleName || "ITEM").split("-")[0].substring(0, 3).toUpperCase();
  const cleanPO = (poNo || "PO").split("-").pop().slice(-5).toUpperCase();
  const dateStr = todayYYMMDD();
  return `GRN-${cleanArticle}-${cleanPO}-${dateStr}-${String(sequence).padStart(3, "0")}`;
};

// when running in production we want to return actual PO and catalogue references
const PurchaseOrder = require("../models/PurchaseOrder");
const MasterCatalog = require("../models/MasterCatalog");
const Brand = require("../models/Brand");
const Counter = require("../models/Counter");

// helper to get next sequence
const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

// helper to build regex for search
const makeRegex = (str) => {
  if (!str) return null;
  return new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
};

exports.listReferences = async (search = "") => {
  const q = (search || "").trim();
  const regex = makeRegex(q);

  // fetch PO docs matching search (po number or vendor name)
  const poFilter = { isDeleted: false, billStatus: "APPROVED" };
  if (regex) {
    poFilter.$or = [
      { poNumber: regex },
      { vendorName: regex },
      { "items.itemName": regex },
    ];
  }
  // include minimal item information so we can show names in dropdown
  const poDocs = await PurchaseOrder.find(poFilter)
    .select("poNumber vendorName items.itemName items.sku")
    .limit(100)
    .lean();

  // fetch catalog items matching search (article name)
  const catFilter = { isDeleted: false };
  if (regex) {
    catFilter.articleName = regex;
  }
  let catDocs = await MasterCatalog.find(catFilter)
    .select("articleName brandId")
    .limit(100)
    .lean();

  // populate brand name for catalogs
  const brandIds = [
    ...new Set(catDocs.map((c) => c.brandId?.toString())),
  ].filter(Boolean);
  const brands = brandIds.length
    ? await Brand.find({ _id: { $in: brandIds } })
        .select("name")
        .lean()
    : [];
  const brandMap = brands.reduce((acc, b) => {
    acc[b._id.toString()] = b.name;
    return acc;
  }, {});

  // map to unified structure
  const list = [];

  poDocs.forEach((po) => {
    // build a small summary of items we care about for display
    let articleDesc = "";
    if (po.items && po.items.length > 0) {
      const names = po.items.map((it) => it.itemName || it.sku).filter(Boolean);
      articleDesc = names.slice(0, 2).join(", ");
      if (names.length > 2) articleDesc += ` (+${names.length - 2} more)`;
    }
    list.push({
      id: po.poNumber,
      refType: "PO",
      party: po.vendorName,
      article: articleDesc,
    });
  });

  catDocs.forEach((cat) => {
    list.push({
      id: `CAT-${cat._id}`,
      refType: "CAT",
      party: brandMap[cat.brandId?.toString()] || "",
      article: cat.articleName,
    });
  });

  return list;
};

exports.createDraft = async ({ refType, refId }) => {
  if (!refType || !refId) throw new Error("refType and refId required");

  // create fresh draft
  const draft = await GRNDraft.create({
    refType,
    refId,
    currentPairs: [],
    cartons: [],
    scannedSet: [],
    cartonSerial: 1,
    status: "DRAFT",
  });

  return draft;
};

exports.getDraft = async (draftId) => {
  const draft = await GRNDraft.findById(draftId);
  if (!draft) throw new Error("Draft not found");
  return draft;
};

exports.scanPair = async (draftId, pairBarcodeRaw) => {
  const pairBarcode = (pairBarcodeRaw || "").trim();
  if (!pairBarcode) throw new Error("pairBarcode required");

  const draft = await GRNDraft.findById(draftId);
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "DRAFT") throw new Error("GRN already submitted");

  // add
  draft.currentPairs.push(pairBarcode);
  draft.scannedSet.push(pairBarcode);

  // auto lock at 24
  if (draft.currentPairs.length === PAIRS_PER_CARTON) {
    const refNo = String(draft.refId).split("-")[1] || draft.refId; // "1023"
    const cartonBarcode = makeCartonBarcode(
      draft.refType,
      refNo,
      draft.cartonSerial
    );

    draft.cartons.unshift({
      cartonBarcode,
      pairBarcodes: [...draft.currentPairs],
      lockedAt: new Date(),
    });

    draft.cartonSerial += 1;
    draft.currentPairs = [];
  }

  await draft.save();

  return draft;
};

exports.bulkScan = async (draftId, cartonsPayload) => {
  if (!Array.isArray(cartonsPayload)) throw new Error("cartons payload must be an array");

  const draft = await GRNDraft.findById(draftId);
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "DRAFT") throw new Error("GRN already submitted");

  // Fetch already received cartons for this reference to prevent duplicates
  const doneMap = await exports.getReceivedCartons(draft.refId);

  let modified = false;
  for (const carton of cartonsPayload) {
    const { cartonIndex, pairBarcodes, itemName, variantId } = carton;
    if (!pairBarcodes || pairBarcodes.length === 0) continue;

    // Check for duplicates
    if (itemName && doneMap[itemName] && doneMap[itemName].includes((cartonIndex || 1) - 1)) {
      throw new Error(`Carton ${cartonIndex} for "${itemName}" has already been received in a previous GRN.`);
    }

    // Use the explicit cartonIndex for the serial number
    const refNo = String(draft.refId).split("-")[1] || draft.refId;
    const cartonBarcode = makeCartonBarcode(draft.refType, refNo, cartonIndex || draft.cartonSerial);

    draft.cartons.unshift({
      cartonBarcode,
      itemName: itemName || "", 
      variantId: variantId || "", // Save ID for reliable stock updates
      pairBarcodes: [...pairBarcodes],
      lockedAt: new Date(),
    });

    // Mark these pairs as scanned so rescanning prevents duplicates if logic depends on it
    pairBarcodes.forEach(b => draft.scannedSet.push(b));
    modified = true;
    
    // Increment cartonSerial just in case it's used elsewhere, though we now rely on explicit indices
    draft.cartonSerial = Math.max(draft.cartonSerial, (cartonIndex || draft.cartonSerial) + 1);
  }

  // Clear currentPairs since we bulk inserted locked cartons directly
  draft.currentPairs = [];

  if (modified) {
    await draft.save();
  }
  return draft;
};

exports.rescanCurrent = async (draftId) => {
  const draft = await GRNDraft.findById(draftId);
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "DRAFT") throw new Error("GRN already submitted");

  // remove currentPairs from scannedSet
  const removeSet = new Set(draft.currentPairs);
  draft.scannedSet = draft.scannedSet.filter((x) => !removeSet.has(x));

  draft.currentPairs = [];
  await draft.save();

  return draft;
};

exports.removeCarton = async (draftId, cartonBarcode) => {
  const draft = await GRNDraft.findById(draftId);
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "DRAFT") throw new Error("GRN already submitted");

  const target = draft.cartons.find((c) => c.cartonBarcode === cartonBarcode);
  if (!target) throw new Error("Carton not found");

  // remove its pairs from scannedSet
  const removeSet = new Set(target.pairBarcodes);
  draft.scannedSet = draft.scannedSet.filter((x) => !removeSet.has(x));

  // remove carton
  draft.cartons = draft.cartons.filter(
    (c) => c.cartonBarcode !== cartonBarcode
  );

  await draft.save();
  return draft;
};

exports.submitDraft = async (draftId, { scannedItemNames } = {}) => {
  const draft = await GRNDraft.findById(draftId);
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "DRAFT") throw new Error("GRN already submitted");

  if (draft.currentPairs.length !== 0) {
    throw new Error(
      `Current carton incomplete (${draft.currentPairs.length}/${PAIRS_PER_CARTON})`
    );
  }
  if (draft.cartons.length === 0) throw new Error("Add at least 1 carton");

  // Fetch PO for metadata
  let vendorName = "";
  let articleName = "";
  let po = null;
  if (draft.refType === "PO") {
    po = await PurchaseOrder.findOne({ poNumber: draft.refId }).lean();
    if (po) {
      vendorName = po.vendorName || "";
      // Use scannedItemNames from frontend if provided, otherwise fall back to first item
      if (scannedItemNames && scannedItemNames.length > 0) {
        articleName = scannedItemNames.join(", ");
      } else {
        articleName = (po.items && po.items[0]?.itemName) || "";
      }
    }
  } else if (draft.refType === "CAT") {
    const cat = await MasterCatalog.findById(draft.refId.replace("CAT-", "")).lean();
    if (cat) {
      articleName = cat.articleName || "";
    }
  }

  const totalPairs = draft.cartons.reduce((sum, c) => sum + c.pairBarcodes.length, 0);

  const sequence = await getNextSequence("grn_no");
  draft.status = "SUBMITTED";
  draft.submittedAt = new Date();
  draft.grnNo = makeGRNNo(articleName, draft.refId, sequence);
  draft.vendorName = vendorName;
  draft.articleName = articleName;
  draft.totalPairs = totalPairs;

  // ─── Inventory Update Logic ──────────────────────────────
  // Group cartons by either variantId (reliable) or itemName (fallback)
  const cartonsByVariant = (draft.cartons || []).reduce((acc, c) => {
    const key = c.variantId || c.itemName || articleName;
    if (!acc[key]) acc[key] = { count: 0, itemName: c.itemName || articleName, variantId: c.variantId };
    acc[key].count += 1;
    return acc;
  }, {});

  for (const [key, info] of Object.entries(cartonsByVariant)) {
    const { variantId, itemName } = info;
    
    let query = variantId 
      ? { "variants._id": variantId } 
      : { "variants.itemName": itemName };

    const catalog = await MasterCatalog.findOne(query);
    if (!catalog) continue;

    let variant = variantId ? catalog.variants.id(variantId) : null;
    if (!variant) {
      variant = catalog.variants.find(v => v.itemName === itemName);
    }

    if (!variant) continue;

    // ─── Actual Scanned Quantity Calculation ───
    // Build a reverse lookup of SKU -> Size Name
    // ⚡ CRITICAL: We prioritize the Purchase Order's sizeMap because barcodes are generated 
    // from the PO's SKU entries, which might differ from the Master Catalog defaults.
    const poItem = po ? po.items.find(it => 
      (it.variantId && String(it.variantId) === String(variant._id)) || 
      (it.itemName === variant.itemName)
    ) : null;

    console.log(`[GRN-SUBMIT-DEBUG] Processing variant "${variant.itemName}" (ID: ${variant._id})`);
    if (po) {
      console.log(`[GRN-SUBMIT-DEBUG] Matched PO: ${po.poNumber}. Item found: ${!!poItem}`);
    }

    const skuToSize = {};
    const poSizeMap = poItem ? (poItem.sizeMap && typeof poItem.sizeMap.toJSON === 'function' ? poItem.sizeMap.toJSON() : (poItem.sizeMap || {})) : {};

    Object.entries(poSizeMap).forEach(([size, cell]) => {
      if (cell && cell.sku) {
        skuToSize[String(cell.sku).trim().toLowerCase()] = size.trim();
      }
    });

    const poSkusCount = Object.keys(skuToSize).length;
    console.log(`[GRN-SUBMIT-DEBUG] SKUs found in PO: ${poSkusCount}`);

    // Fallback: If PO had no SKUs, check Master Catalog
    if (poSkusCount === 0 && variant.sizeMap) {
      console.log(`[GRN-SUBMIT-DEBUG] PO has no SKUs, checking Master Catalog for SKUs...`);
      const masterSizeMap = variant.sizeMap && typeof variant.sizeMap.toJSON === 'function' ? variant.sizeMap.toJSON() : (variant.sizeMap || {});
      Object.entries(masterSizeMap).forEach(([size, cell]) => {
        if (cell && cell.sku) {
          skuToSize[String(cell.sku).trim().toLowerCase()] = size.trim();
        }
      });
      console.log(`[GRN-SUBMIT-DEBUG] Total SKUs after Master check: ${Object.keys(skuToSize).length}`);
    }

    // Filter cartons that belong to THIS specific variant
    const variantCartons = (draft.cartons || []).filter(c => 
      (c.variantId && String(c.variantId) === String(variant._id)) || 
      (c.itemName === variant.itemName)
    );

    console.log(`[GRN-SUBMIT-DEBUG] Found ${variantCartons.length} cartons for this variant in the draft.`);

    const actualCounts = {};
    let matchedBarcodes = 0;
    variantCartons.forEach(carton => {
      (carton.pairBarcodes || []).forEach(barcode => {
        const cleanBar = String(barcode).trim().toLowerCase();
        const size = skuToSize[cleanBar];
        if (size) {
          matchedBarcodes++;
          actualCounts[size] = (actualCounts[size] || 0) + 1;
        }
      });
    });

    console.log(`[GRN-SUBMIT-DEBUG] SKU Matching result: ${matchedBarcodes} pairs matched out of ${variantCartons.length * 24} expected.`);

    // ─── FALLBACK: If SKU matching found nothing, use PO-based quantity breakup ───
    const totalCounted = Object.values(actualCounts).reduce((s, v) => s + v, 0);
    
    if (totalCounted === 0 && variantCartons.length > 0) {
      if (poItem && Object.keys(poSizeMap).length > 0) {
        console.log(`[GRN-SUBMIT-DEBUG] ⚡ SKU match failed. Triggering PO-based fallback for ${variantCartons.length} cartons.`);
        Object.entries(poSizeMap).forEach(([size, cell]) => {
          const cleanSize = size.trim();
          actualCounts[cleanSize] = variantCartons.length * (Number(cell?.qty) || 0);
        });
      } else {
        // Last resort: use Master Catalog assortment
        console.log(`[GRN-SUBMIT-DEBUG] ⚡ SKU match failed & PO data missing. Triggering Master-based fallback.`);
        const sizeQuantitiesData = variant.sizeQuantities && typeof variant.sizeQuantities.toJSON === 'function' 
          ? variant.sizeQuantities.toJSON() : (variant.sizeQuantities || {});

        if (Object.keys(sizeQuantitiesData).length > 0) {
          Object.entries(sizeQuantitiesData).forEach(([size, qtyPerCarton]) => {
            const cleanSize = size.trim();
            actualCounts[cleanSize] = variantCartons.length * (Number(qtyPerCarton) || 0);
          });
        }
      }
    }

    console.log(`[GRN-SUBMIT-DEBUG] Final counts for inventory update:`, actualCounts);

    // ─── Perform Atomic Update with Actual Counts ───
    if (Object.keys(actualCounts).length > 0) {
      const incUpdate = {};
      Object.entries(actualCounts).forEach(([size, count]) => {
        const cleanSize = String(size).trim();
        incUpdate[`variants.$.sizeMap.${cleanSize}.qty`] = count;
      });

      await MasterCatalog.updateOne(
        { "variants._id": variant._id },
        { $inc: incUpdate }
      );
    }
  }

  await draft.save();
  return draft;
};

exports.getReceivedCartons = async (refId) => {
  const submittedGRNs = await GRNDraft.find({ refId, status: "SUBMITTED" }).lean();
  const doneMap = {};

  submittedGRNs.forEach(grn => {
    (grn.cartons || []).forEach(c => {
      const itemName = c.itemName || (grn.articleName.includes(",") ? grn.articleName.split(",")[0].trim() : grn.articleName);
      if (!doneMap[itemName]) doneMap[itemName] = [];
      
      // Extract serial from barcode e.g. CTN-260422-PO-1023-001 -> 0
      const parts = (c.cartonBarcode || "").split("-");
      const serialStr = parts[parts.length - 1]; // "001"
      const serial = parseInt(serialStr, 10);
      
      if (!isNaN(serial) && !doneMap[itemName].includes(serial - 1)) {
        doneMap[itemName].push(serial - 1);
      }
    });
  });

  return doneMap;
};

exports.getHistory = async (search = "") => {
  const q = (search || "").trim();
  const filter = { status: "SUBMITTED" };
  if (q)
    filter.$or = [{ grnNo: new RegExp(q, "i") }, { refId: new RegExp(q, "i") }];

  const list = await GRNDraft.find(filter).sort({ submittedAt: -1 }).limit(50);

  return list.map((d) => ({
    grnId: d._id,
    grnNo: d.grnNo,
    refId: d.refId,
    vendorName: d.vendorName,
    articleName: d.articleName,
    totalPairs: d.totalPairs,
    cartons: d.cartons.length,
    createdAt: d.submittedAt,
  }));
};

exports.getGRNById = async (grnId) => {
  const grn = await GRNDraft.findById(grnId);
  if (!grn) throw new Error("GRN not found");
  return grn;
};
