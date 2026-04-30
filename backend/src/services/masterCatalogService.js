const mongoose = require("mongoose");
const MasterCatalog = require("../models/MasterCatalog");

const ALLOWED_PAGE_LIMITS = [10, 20, 30, 50, 100, 200, 500, 1000];

const parseMaybeJson = (val, fallback) => {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const parseBoolean = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }

  return fallback;
};

const normalizeLimit = (limit) => {
  const parsed = Number(limit);
  if (ALLOWED_PAGE_LIMITS.includes(parsed)) return parsed;
  return 10;
};

const normalizePage = (page) => {
  const parsed = Number(page);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return parsed;
};

const makeFileUrl = (req, filePath) => {
  return filePath.replace(/\\/g, "/");
};

const buildColorMediaPayload = (req, productColors = []) => {
  const files = Array.isArray(req.files) ? req.files : [];
  const colorMedia = [];

  for (const color of productColors) {
    const fieldName = `images_${color}`;
    const colorFiles = files.filter((f) => f.fieldname === fieldName);

    if (!colorFiles.length) continue;

    const images = colorFiles.map((f, idx) => ({
      url: makeFileUrl(req, f.path),
      key: f.path,
      isCover: idx === 0,
    }));

    colorMedia.push({
      color,
      images,
    });
  }

  return colorMedia;
};

const buildFlatImagesFromColorMedia = (colorMedia = []) => {
  const allImages = [];

  colorMedia.forEach((cm) => {
    cm.images.forEach((img) => {
      allImages.push({
        url: img.url,
        key: img.key || "",
      });
    });
  });

  return {
    primaryImage: allImages[0] || { url: "", key: "" },
    secondaryImages: allImages.slice(1),
  };
};

const normalizeVariants = (variantsRaw) => {
  const variants = Array.isArray(variantsRaw) ? variantsRaw : [];

  return variants.map((v) => {
    const sizeMap = {};
    const sizeQuantities = {};
    const sizeSkus = {};

    // 1. Process Assortment (Breakup)
    if (v.sizeQuantities && typeof v.sizeQuantities === "object") {
      Object.keys(v.sizeQuantities).forEach((size) => {
        sizeQuantities[size] = Number(v.sizeQuantities[size] || 0);
        sizeSkus[size] = v.sizeSkus?.[size] || "";
      });
    }

    // 2. Process Inventory Stock (Physical Warehouse Qty)
    if (v.sizeMap && typeof v.sizeMap === "object") {
      Object.keys(v.sizeMap).forEach((size) => {
        const cell = v.sizeMap[size] || {};
        sizeMap[size] = {
          qty: Number(cell.qty || 0),
          sku: cell.sku || "",
        };
      });
    } else if (v.sizeQuantities && typeof v.sizeQuantities === "object") {
      // Fallback: Initialize stock to 0 but keep SKU
      Object.keys(v.sizeQuantities).forEach((size) => {
        sizeMap[size] = {
          qty: 0,
          sku: v.sizeSkus?.[size] || "",
        };
      });
    }

    return {
      _id: v._id || v.id || undefined,
      itemName: v.itemName,
      color: v.color || "",
      sizeRange: v.sizeRange || "",
      sizeRangeId: v.sizeRangeId || "",
      costPrice: Number(v.costPrice || 0),
      sellingPrice: Number(v.sellingPrice || 0),
      mrp: Number(v.mrp || 0),
      hsnCode: v.hsnCode || "",
      sizeMap,
      sizeQuantities,
      sizeSkus,
      isActive: parseBoolean(v.isActive, true),
    };
  });
};

const makeCompositeKey = (v) => {
  return `${(v.color || "").trim().toLowerCase()}|${(v.sizeRange || "")
    .trim()
    .toLowerCase()}|${(v.sizeRangeId || "").trim()}`;
};

const makeLegacyFallbackKey = (v) => {
  return `${(v.itemName || "").trim().toLowerCase()}|${(v.color || "")
    .trim()
    .toLowerCase()}|${(v.sizeRange || "").trim().toLowerCase()}`;
};

exports.create = async (req) => {
  const body = req.body || {};

  const articleName = (body.articleName || "").trim();

  const productColors = parseMaybeJson(body.productColors, []);
  const sizeRanges = parseMaybeJson(body.sizeRanges, []);
  const variants = normalizeVariants(parseMaybeJson(body.variants, []));

  const colorMedia = buildColorMediaPayload(
    req,
    Array.isArray(productColors) ? productColors : []
  );

  const { primaryImage, secondaryImages } =
    buildFlatImagesFromColorMedia(colorMedia);

  if (!primaryImage?.url) {
    const err = new Error("At least one product image is required");
    err.statusCode = 400;
    throw err;
  }

  const doc = await MasterCatalog.create({
    articleName: body.articleName,
    soleColor: body.soleColor,
    mrp: Number(body.mrp || 0),
    gender: body.gender,
    categoryId: body.categoryId,
    brandId: body.brandId,
    manufacturerCompanyId: body.manufacturerCompanyId,
    unitId: body.unitId,
    productColors: Array.isArray(productColors) ? productColors : [],
    sizeRanges: Array.isArray(sizeRanges) ? sizeRanges : [],
    stage: body.stage || "AVAILABLE",
    expectedAvailableDate: body.expectedAvailableDate || null,
    isActive: parseBoolean(body.isActive, true),
    primaryImage,
    secondaryImages,
    colorMedia,
    variants,
  });

  return doc;
};

exports.list = async (query) => {
  const {
    q,
    stage,
    categoryId,
    brandId,
    manufacturerCompanyId,
    gender,
    isActive,
    page = 1,
    limit = 10,
  } = query;

  const normalizedPage = normalizePage(page);
  const normalizedLimit = normalizeLimit(limit);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const filter = { isDeleted: false };

  if (stage) filter.stage = stage;
  if (gender) filter.gender = gender;

  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    filter.categoryId = categoryId;
  }

  if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
    filter.brandId = brandId;
  }

  if (
    manufacturerCompanyId &&
    mongoose.Types.ObjectId.isValid(manufacturerCompanyId)
  ) {
    filter.manufacturerCompanyId = manufacturerCompanyId;
  }

  const parsedIsActive = parseBoolean(isActive, undefined);
  if (parsedIsActive !== undefined) {
    filter.isActive = parsedIsActive;
  }

  if (q) {
    filter.$or = [
      { articleName: { $regex: q, $options: "i" } },
      { soleColor: { $regex: q, $options: "i" } },
      { productColors: { $in: [new RegExp(q, "i")] } },
      { "variants.itemName": { $regex: q, $options: "i" } },
      { "variants.color": { $regex: q, $options: "i" } },
      { "variants.hsnCode": { $regex: q, $options: "i" } },
      { "variants.sizeRange": { $regex: q, $options: "i" } },
    ];
  }

  const items = await MasterCatalog.find(filter)
    .populate("categoryId", "name")
    .populate("brandId", "name")
    .populate("manufacturerCompanyId", "name")
    .populate("unitId", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(normalizedLimit)
    .lean();

  const total = await MasterCatalog.countDocuments(filter);

  return {
    items,
    total,
    page: normalizedPage,
    limit: normalizedLimit,
    totalPages: Math.ceil(total / normalizedLimit) || 1,
    hasNextPage: normalizedPage < Math.ceil(total / normalizedLimit),
    hasPrevPage: normalizedPage > 1,
    pageSizeOptions: ALLOWED_PAGE_LIMITS,
  };
};

exports.getById = async (id) => {
  const doc = await MasterCatalog.findOne({ _id: id, isDeleted: false })
    .populate("categoryId", "name")
    .populate("brandId", "name")
    .populate("manufacturerCompanyId", "name")
    .populate("unitId", "name")
    .lean();

  if (!doc) {
    const err = new Error("Not found");
    err.statusCode = 404;
    throw err;
  }

  return doc;
};

exports.update = async (req, id) => {
  const body = req.body || {};

  const doc = await MasterCatalog.findOne({ _id: id, isDeleted: false });
  if (!doc) {
    const err = new Error("Not found");
    err.statusCode = 404;
    throw err;
  }

  const patch = {
    articleName: body.articleName,
    soleColor: body.soleColor,
    mrp: body.mrp !== undefined ? Number(body.mrp || 0) : undefined,
    gender: body.gender,
    categoryId: body.categoryId,
    brandId: body.brandId,
    manufacturerCompanyId: body.manufacturerCompanyId,
    unitId: body.unitId,
    stage: body.stage,
    expectedAvailableDate: body.expectedAvailableDate || null,
    isActive: parseBoolean(body.isActive, undefined),
  };

  Object.keys(patch).forEach((k) => {
    if (patch[k] !== undefined) doc[k] = patch[k];
  });

  if (body.productColors !== undefined) {
    const productColors = parseMaybeJson(body.productColors, []);
    doc.productColors = Array.isArray(productColors) ? productColors : [];
  }

  if (body.sizeRanges !== undefined) {
    const sizeRanges = parseMaybeJson(body.sizeRanges, []);
    doc.sizeRanges = Array.isArray(sizeRanges) ? sizeRanges : [];
  }

  if (body.variants !== undefined) {
    const variantsRaw = parseMaybeJson(body.variants, []);
    const normalized = normalizeVariants(variantsRaw);

    const existingById = new Map(
      doc.variants.map((v) => [v._id.toString(), v])
    );

    const existingByComposite = new Map(
      doc.variants.map((v) => [makeCompositeKey(v), v])
    );

    const existingByLegacyFallback = new Map(
      doc.variants.map((v) => [makeLegacyFallbackKey(v), v])
    );

    const newVariants = [];

    normalized.forEach((v) => {
      let matched = null;

      // 1. Primary match by DB _id
      if (v._id && existingById.has(v._id.toString())) {
        matched = existingById.get(v._id.toString());
      }

      // 2. Secondary match by color + sizeRange + sizeRangeId
      if (!matched && v.sizeRangeId) {
        const compositeKey = makeCompositeKey(v);
        if (existingByComposite.has(compositeKey)) {
          matched = existingByComposite.get(compositeKey);
        }
      }

      // 3. Legacy fallback for old data
      if (!matched) {
        const fallbackKey = makeLegacyFallbackKey(v);
        if (existingByLegacyFallback.has(fallbackKey)) {
          matched = existingByLegacyFallback.get(fallbackKey);
        }
      }

      if (matched) {
        matched.itemName = v.itemName;
        matched.color = v.color;
        matched.sizeRange = v.sizeRange;
        matched.sizeRangeId = v.sizeRangeId || matched.sizeRangeId || "";
        matched.costPrice = v.costPrice;
        matched.sellingPrice = v.sellingPrice;
        matched.mrp = v.mrp;
        matched.hsnCode = v.hsnCode;
        matched.sizeMap = v.sizeMap;
        matched.sizeQuantities = v.sizeQuantities;
        matched.sizeSkus = v.sizeSkus;
        matched.isActive = v.isActive;

        existingById.delete(matched._id.toString());
        existingByComposite.delete(makeCompositeKey(matched));
        existingByLegacyFallback.delete(makeLegacyFallbackKey(matched));

        newVariants.push(matched);
      } else {
        const vCopy = { ...v };
        delete vCopy._id;
        newVariants.push(vCopy);
      }
    });

    doc.variants = newVariants;
  }

  const hasNewColorImages =
    Array.isArray(req.files) &&
    req.files.some((f) => f.fieldname && f.fieldname.startsWith("images_"));

  const replaceColorMedia =
    body.replaceColorMedia === "true" || body.replaceColorMedia === true;

  if (hasNewColorImages) {
    const incomingColorMedia = buildColorMediaPayload(req, doc.productColors);

    if (replaceColorMedia) {
      doc.colorMedia = incomingColorMedia;
    } else {
      const existingMap = new Map(
        (doc.colorMedia || []).map((cm) => [cm.color, cm.images || []])
      );

      incomingColorMedia.forEach((cm) => {
        const oldImages = existingMap.get(cm.color) || [];
        existingMap.set(cm.color, [...oldImages, ...cm.images]);
      });

      doc.colorMedia = Array.from(existingMap.entries()).map(
        ([color, images]) => ({
          color,
          images: images.map((img, idx) => ({
            ...img,
            isCover: idx === 0,
          })),
        })
      );
    }

    const { primaryImage, secondaryImages } = buildFlatImagesFromColorMedia(
      doc.colorMedia
    );
    doc.primaryImage = primaryImage;
    doc.secondaryImages = secondaryImages;
  }

  await doc.save();
  return doc;
};

exports.toggleActive = async (id) => {
  const doc = await MasterCatalog.findOne({ _id: id, isDeleted: false });
  if (!doc) {
    const err = new Error("Not found");
    err.statusCode = 404;
    throw err;
  }

  doc.isActive = !doc.isActive;
  await doc.save();
  return doc;
};

exports.softDelete = async (id) => {
  const doc = await MasterCatalog.findOne({ _id: id, isDeleted: false });
  if (!doc) {
    const err = new Error("Not found");
    err.statusCode = 404;
    throw err;
  }

  doc.isDeleted = true;
  await doc.save();
  return true;
};

exports.getVariantStock = async (variantId) => {
  const PurchaseOrder = require("../models/PurchaseOrder");
  const MasterCatalog = require("../models/MasterCatalog");

  const catalog = await MasterCatalog.findOne({ "variants._id": variantId });
  if (!catalog) {
    const err = new Error("Variant not found");
    err.statusCode = 404;
    throw err;
  }

  const variant = catalog.variants.id(variantId);
  if (!variant) {
    const err = new Error("Variant not found in catalog");
    err.statusCode = 404;
    throw err;
  }

  const GRNDraft = require("../models/grn.model");
  const Order = require("../models/Order");
  const Return = require("../models/Return");

  const liveStockMap = {};
  const blockedStockMap = {};
  const poMap = {};

  // 1. Build SKU-to-Size mapping for the variant
  const skuToSize = {};
  const variantSizes = [];
  
  // Robust Map to JSON conversion for Mongoose
  const sizeMapData = variant.sizeMap && typeof variant.sizeMap.toJSON === 'function' ? variant.sizeMap.toJSON() : (variant.sizeMap || {});
  const sizeSkusData = variant.sizeSkus && typeof variant.sizeSkus.toJSON === 'function' ? variant.sizeSkus.toJSON() : (variant.sizeSkus || {});

  Object.entries(sizeMapData).forEach(([size, cell]) => {
    const cleanSize = size.trim();
    variantSizes.push(cleanSize);
    if (cell && cell.sku) {
      skuToSize[String(cell.sku).trim().toLowerCase()] = cleanSize;
    }
    blockedStockMap[cleanSize] = Number(cell?.blockedQty || 0);
  });

  Object.entries(sizeSkusData).forEach(([size, sku]) => {
    if (sku) {
      const cleanSize = size.trim();
      skuToSize[String(sku).trim().toLowerCase()] = cleanSize;
      if (!variantSizes.includes(cleanSize)) variantSizes.push(cleanSize);
    }
  });

  console.log(`[DEBUG DYNAMIC] SKU to Size Map:`, skuToSize);
  console.log(`[DEBUG DYNAMIC] Valid Variant Sizes:`, variantSizes);

  // 2. DYNAMIC CALCULATION: Total Received from GRNs
  const submittedGRNs = await GRNDraft.find({ 
    "cartons.variantId": variantId.toString(),
    status: "SUBMITTED" 
  }).lean();

  console.log(`[LIVE-STOCK-DEBUG] Found ${submittedGRNs.length} submitted GRNs for variant "${variant.itemName}" (ID: ${variantId})`);

  // Fetch unique POs to get their SKU maps and quantity breakups
  const poNumbers = [...new Set(submittedGRNs.filter(g => g.refType === 'PO').map(g => g.refId))];
  const poDocs = await PurchaseOrder.find({ poNumber: { $in: poNumbers } }).lean();
  const poLookup = poDocs.reduce((acc, p) => { acc[p.poNumber] = p; return acc; }, {});

  console.log(`[LIVE-STOCK-DEBUG] Fetched ${poDocs.length} unique POs: ${poNumbers.join(", ")}`);

  // Expand skuToSize with SKUs from all relevant POs
  poDocs.forEach(po => {
    const poItem = po.items.find(it => 
      (it.variantId && String(it.variantId) === variantId.toString())
    );
    if (poItem && poItem.sizeMap) {
      const poSizeMap = poItem.sizeMap && typeof poItem.sizeMap.toJSON === 'function' ? poItem.sizeMap.toJSON() : poItem.sizeMap;
      const skusCount = Object.values(poSizeMap).filter(v => v.sku).length;
      console.log(`[LIVE-STOCK-DEBUG] PO "${po.poNumber}" item match found. SKUs in PO: ${skusCount}`);
      
      Object.entries(poSizeMap).forEach(([size, cell]) => {
        if (cell && cell.sku) {
          skuToSize[String(cell.sku).trim().toLowerCase()] = size.trim();
        }
      });
    } else {
      console.log(`[LIVE-STOCK-DEBUG] PO "${po.poNumber}" - No matching item found for variant "${variant.itemName}"`);
    }
  });

  const totalReceived = {};
  const receivedPerPO = {}; // { poNumber: { size: qty } }
  let totalBarcodesProcessed = 0;
  let totalMatchesFound = 0;

  // ── PRIMARY: SKU-based barcode matching (using Master + all PO SKUs) ──
  submittedGRNs.forEach(grn => {
    (grn.cartons || []).forEach(carton => {
      const isMatch = (carton.variantId && String(carton.variantId) === variantId.toString());
      if (!isMatch) return;

      (carton.pairBarcodes || []).forEach(barcode => {
        totalBarcodesProcessed++;
        const cleanBar = String(barcode).trim().toLowerCase();
        let sz = skuToSize[cleanBar];

        if (!sz) {
          const matchedSize = variantSizes.find(vSize => {
            const lowVSize = String(vSize).toLowerCase();
            return cleanBar.endsWith("-" + lowVSize) || cleanBar.endsWith(" " + lowVSize);
          });
          if (matchedSize) {
            sz = matchedSize;
            skuToSize[cleanBar] = sz;
          }
        }

        if (sz) {
          totalMatchesFound++;
          totalReceived[sz] = (totalReceived[sz] || 0) + 1;

          if (grn.refType === 'PO') {
            const poNum = grn.refId;
            if (!receivedPerPO[poNum]) receivedPerPO[poNum] = {};
            receivedPerPO[poNum][sz] = (receivedPerPO[poNum][sz] || 0) + 1;
          }
        }
      });
    });
  });

  console.log(`[LIVE-STOCK-DEBUG] SKU Matching: Processed ${totalBarcodesProcessed} barcodes, Found ${totalMatchesFound} matches`);

  // ── FALLBACK: Use PO quantity breakup if SKU matching found nothing ──
  const skuMatchedTotal = Object.values(totalReceived).reduce((s, v) => s + v, 0);

  if (skuMatchedTotal === 0 && submittedGRNs.length > 0) {
    console.log(`[LIVE-STOCK-DEBUG] ⚡ NO matches found via SKUs. Triggering PO-based fallback logic...`);
    
    submittedGRNs.forEach(grn => {
      const po = poLookup[grn.refId];
      const poItem = po ? po.items.find(it => 
        (it.variantId && String(it.variantId) === variantId.toString())
      ) : null;
      
      const poSizeMap = poItem ? (poItem.sizeMap && typeof poItem.sizeMap.toJSON === 'function' ? poItem.sizeMap.toJSON() : (poItem.sizeMap || {})) : {};
      const hasPOSizes = Object.keys(poSizeMap).length > 0;

      // Count matching cartons for THIS specific GRN
      let cartonCount = 0;
      (grn.cartons || []).forEach(carton => {
        const isMatch = (carton.variantId && String(carton.variantId) === variantId.toString());
        if (isMatch) cartonCount++;
      });

      if (cartonCount === 0) {
        console.log(`[LIVE-STOCK-DEBUG] GRN ${grn.grnNo}: 0 cartons match this variant.`);
        return;
      }

      if (hasPOSizes) {
        console.log(`[LIVE-STOCK-DEBUG] GRN ${grn.grnNo}: Applying PO "${po.poNumber}" quantity breakup for ${cartonCount} cartons`);
        Object.entries(poSizeMap).forEach(([size, cell]) => {
          const cleanSize = size.trim();
          const added = (cartonCount * (Number(cell?.qty) || 0));
          totalReceived[cleanSize] = (totalReceived[cleanSize] || 0) + added;

          if (grn.refType === 'PO') {
            const poNum = grn.refId;
            if (!receivedPerPO[poNum]) receivedPerPO[poNum] = {};
            receivedPerPO[poNum][cleanSize] = (receivedPerPO[poNum][cleanSize] || 0) + added;
          }
        });
      } else {
        console.log(`[LIVE-STOCK-DEBUG] GRN ${grn.grnNo}: PO data missing, falling back to Master Catalog assortment for ${cartonCount} cartons`);
        const sizeQuantitiesData = variant.sizeQuantities && typeof variant.sizeQuantities.toJSON === 'function' 
          ? variant.sizeQuantities.toJSON() : (variant.sizeQuantities || {});
        Object.entries(sizeQuantitiesData).forEach(([size, qtyPerCarton]) => {
          const cleanSize = size.trim();
          totalReceived[cleanSize] = (totalReceived[cleanSize] || 0) + (cartonCount * (Number(qtyPerCarton) || 0));
        });
      }
    });
  }

  console.log(`[LIVE-STOCK-DEBUG] Final calculated stock:`, totalReceived);

  // 3. DYNAMIC CALCULATION: Total Dispatched from Orders
  const fulfilledOrders = await Order.find({ 
    "items.variantId": variantId, 
    status: { $in: ["PFD", "RFD", "OFD", "RECEIVED", "PARTIAL"] } 
  }).lean();

  const totalDispatched = {};
  fulfilledOrders.forEach(order => {
    const item = (order.items || []).find(i => i.variantId && i.variantId.toString() === variantId.toString());
    if (item && item.fulfilledSizeQuantities) {
      const entries = item.fulfilledSizeQuantities instanceof Map 
        ? Array.from(item.fulfilledSizeQuantities.entries()) 
        : Object.entries(item.fulfilledSizeQuantities);
      
      entries.forEach(([size, qty]) => {
        const cleanSz = size.trim();
        totalDispatched[cleanSz] = (totalDispatched[cleanSz] || 0) + Number(qty || 0);
      });
    }
  });

  // 4. DYNAMIC CALCULATION: Total Returned from Returns
  const returnRecords = await Return.find({
    "items.variantId": variantId
  }).lean();

  const totalReturned = {};
  returnRecords.forEach(ret => {
    const item = (ret.items || []).find(i => i.variantId && i.variantId.toString() === variantId.toString());
    if (item && item.sizeQuantities) {
      const entries = item.sizeQuantities instanceof Map 
        ? Array.from(item.sizeQuantities.entries()) 
        : Object.entries(item.sizeQuantities);
      
      entries.forEach(([size, qty]) => {
        const cleanSz = size.trim();
        totalReturned[cleanSz] = (totalReturned[cleanSz] || 0) + Number(qty || 0);
      });
    }
  });

  console.log(`[DEBUG DYNAMIC] Returned per size:`, totalReturned);

  // 5. Combine: Live Stock = Received + Returned - Dispatched
  variantSizes.forEach(sz => {
    liveStockMap[sz] = Math.max(0, (totalReceived[sz] || 0) + (totalReturned[sz] || 0) - (totalDispatched[sz] || 0));
  });

  // Calculate PO Map for upcoming stock
  const pos = await PurchaseOrder.find({
    isDeleted: false,
    billStatus: "APPROVED",
    "items.variantId": variantId.toString()
  }).lean();

  pos.forEach((po) => {
    const receivedForThisPO = receivedPerPO[po.poNumber] || {};

    (po.items || []).forEach((item) => {
      const isMatch = String(item.variantId) === String(variantId);
      
      if (isMatch && item.sizeMap) {
        Object.entries(item.sizeMap).forEach(([sz, cell]) => {
          const qtyPerCarton = Number(cell?.qty || 0);
          const cartonCount = Number(item.cartonCount || 0);
          const cleanSz = sz.trim();
          
          const totalOrdered = cartonCount * qtyPerCarton;
          const alreadyReceived = receivedForThisPO[cleanSz] || 0;
          const remaining = Math.max(0, totalOrdered - alreadyReceived);
          
          poMap[cleanSz] = (poMap[cleanSz] || 0) + remaining;
        });
      }
    });
  });

  return { poMap, liveStockMap, blockedStockMap };
};

// Reset Variant Stock - Surgical Purge of Receipts and Fulfillments
exports.resetVariantStock = async (variantIdStr) => {
  const mongoose = require("mongoose");
  const GRNDraft = require("../models/grn.model");
  const Order = require("../models/Order");

  console.log(`[DEBUG RESET] Starting reset for variant ID: ${variantIdStr}`);
  
  let variantId;
  try {
    variantId = new mongoose.Types.ObjectId(variantIdStr);
  } catch (e) {
    throw new Error("Invalid variant ID format");
  }

  // 1. Delete all SUBMITTED GRNs that contain this variantId
  const grnResult = await GRNDraft.deleteMany({
    "cartons.variantId": variantIdStr, // GRN model uses String for variantId
    status: "SUBMITTED"
  });
  console.log(`[DEBUG RESET] Deleted ${grnResult.deletedCount} GRN documents.`);

  // 2. Surgical Reset of all Order fulfillment data for this variant
  const orderResult = await Order.updateMany(
    { "items.variantId": variantId },
    { 
      $set: { 
        "items.$[elem].fulfilledSizeQuantities": {},
        "items.$[elem].fulfilledCartonCount": 0,
        "items.$[elem].fulfilledPairCount": 0
      } 
    },
    { 
      arrayFilters: [{ "elem.variantId": variantId }],
      multi: true 
    }
  );
  
  console.log(`[DEBUG RESET] Modified ${orderResult.modifiedCount} Order documents.`);

  return { 
    success: true, 
    message: `Reset complete. ${grnResult.deletedCount} GRNs removed, ${orderResult.modifiedCount} Orders cleaned.` 
  };
};