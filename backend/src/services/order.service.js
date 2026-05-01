const Order = require("../models/Order");
const User = require("../models/User");
const MasterCatalog = require("../models/MasterCatalog");
const Return = require("../models/Return");

const generateNextOrderNumber = async () => {
  const lastOrder = await Order.findOne()
    .sort({ createdAt: -1 })
    .select("orderNumber")
    .lean();

  if (!lastOrder || !lastOrder.orderNumber) {
    return "OR-00001";
  }

  const lastNum = lastOrder.orderNumber.match(/OR-(\d+)/)?.[1];
  const next = (lastNum ? parseInt(lastNum, 10) : 0) + 1;

  return `OR-${String(next).padStart(5, "0")}`;
};

const generateNextReturnNumber = async () => {
  const lastRet = await Return.findOne()
    .sort({ createdAt: -1 })
    .select("returnNumber")
    .lean();

  if (!lastRet || !lastRet.returnNumber) {
    return "RET-00001";
  }

  const lastNum = lastRet.returnNumber.match(/RET-(\d+)/)?.[1];
  const next = (lastNum ? parseInt(lastNum, 10) : 0) + 1;

  return `RET-${String(next).padStart(5, "0")}`;
};

const createOrder = async (distributorId, orderData) => {
  try {
    const distributor = await User.findById(distributorId);
    if (!distributor) {
      throw new Error("Distributor not found");
    }

    let distrName = distributor.name || distributor.email;
    if (distributor.companyName) {
      distrName = `${distributor.companyName} (${distrName})`;
    }

    const { items, totalAmount, totalCartons, totalPairs, date } = orderData;

    let discountPercentage = 0;
    let creditLimit = 0;
    if (distributor.distributorId) {
      const Distributor = require("../models/Distributor");
      const distProfile = await Distributor.findById(distributor.distributorId).lean();
      if (distProfile) {
        discountPercentage = distProfile.discountPercentage || 0;
        creditLimit = typeof distProfile.creditLimit === 'number' ? distProfile.creditLimit : 0;
      }
    }

    const discountAmount = (totalAmount * discountPercentage) / 100;
    const finalAmount = totalAmount - discountAmount;

    // Strict credit limit validation
    if (creditLimit === 0) {
      throw new Error("You have no credit limit to book an order. Please contact administrator.");
    }
    
    const pendingOrders = await Order.aggregate([
      { $match: { distributorId: distributor._id, status: { $ne: "RECEIVED" } } },
      { $group: { _id: null, totalPending: { $sum: { $ifNull: ["$finalAmount", "$totalAmount"] } } } }
    ]);
    const pendingValue = pendingOrders[0]?.totalPending || 0;
    
    if (pendingValue + finalAmount > creditLimit) {
      const available = creditLimit - pendingValue;
      throw new Error(`Credit limit exceeded. Available credit: ₹${available > 0 ? available.toLocaleString() : 0}. Required: ₹${finalAmount.toLocaleString()}`);
    }

    // Use provided date or fallback to today
    const orderDate =
      date || new Date().toISOString().split("T")[0];

    const orderNumber = await generateNextOrderNumber();

    const order = new Order({
      orderNumber,
      distributorId,
      distributorName: distrName,
      date: orderDate,
      status: "BOOKED",
      items,
      totalAmount,
      totalCartons,
      totalPairs,
      discountPercentage,
      discountAmount,
      finalAmount,
    });

    const savedOrder = await order.save();
    return savedOrder;
  } catch (error) {
    throw new Error(`Failed to create order: ${error.message}`);
  }
};

const normalizePage = (page) => Math.max(parseInt(page, 10) || 1, 1);
const normalizeLimit = (limit) => Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

const getOrdersByDistributor = async (distributorId, { page = 1, limit = 10, search = "", status = "", startDate, endDate, sortBy = "createdAt", sortDesc = "true" } = {}) => {
  try {
    const p = normalizePage(page);
    const l = normalizeLimit(limit);
    const skip = (p - 1) * l;

    const q = { distributorId };
    if (status) q.status = status;
    if (startDate || endDate) {
      q.createdAt = {};
      if (startDate) q.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        q.createdAt.$lte = end;
      }
    }
    if (search) {
      const cleanSearch = search.startsWith('#') ? search.slice(1) : search;
      q.$or = [
        { orderNumber: { $regex: cleanSearch, $options: "i" } },
        { distributorName: { $regex: cleanSearch, $options: "i" } },
      ];
    }
    
    const sortObj = { [sortBy]: (sortDesc === "true" || sortDesc === true) ? -1 : 1 };

    const [items, total, allStats] = await Promise.all([
      Order.find(q)
        .sort(sortObj)
        .skip(skip)
        .limit(l)
        .populate({
          path: 'distributorId',
          populate: { path: 'distributorId' }
        })
        .lean(),
      Order.countDocuments(q),
      Order.aggregate([
        { $match: q },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: "$totalAmount" },
            activeOrders: {
              $sum: { $cond: [{ $ne: ["$status", "RECEIVED"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const stats = allStats[0] || { totalSpent: 0, activeOrders: 0 };

    return {
      items,
      meta: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
        stats: {
          totalSpent: stats.totalSpent,
          activeOrders: stats.activeOrders,
        },
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }
};

const getAllOrders = async ({ page = 1, limit = 10, search = "", status = "", startDate, endDate, sortBy = "createdAt", sortDesc = "true" } = {}) => {
  try {
    const p = normalizePage(page);
    const l = normalizeLimit(limit);
    const skip = (p - 1) * l;

    const q = {};
    if (status) q.status = status;
    if (startDate || endDate) {
      q.createdAt = {};
      if (startDate) q.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        q.createdAt.$lte = end;
      }
    }
    if (search) {
      const cleanSearch = search.startsWith('#') ? search.slice(1) : search;
      q.$or = [
        { orderNumber: { $regex: cleanSearch, $options: "i" } },
        { distributorName: { $regex: cleanSearch, $options: "i" } },
      ];
    }
    
    const sortObj = { [sortBy]: (sortDesc === "true" || sortDesc === true) ? -1 : 1 };

    const [items, total, allStats] = await Promise.all([
      Order.find(q)
        .sort(sortObj)
        .skip(skip)
        .limit(l)
        .populate({
          path: 'distributorId',
          populate: { path: 'distributorId' }
        })
        .lean(),
      Order.countDocuments(q),
      Order.aggregate([
        { $match: q },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: "$totalAmount" },
            activeOrders: {
              $sum: { $cond: [{ $ne: ["$status", "RECEIVED"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const stats = allStats[0] || { totalSpent: 0, activeOrders: 0 };

    return {
      items,
      meta: {
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l),
        stats: {
          totalSpent: stats.totalSpent,
          activeOrders: stats.activeOrders,
        },
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch all orders: ${error.message}`);
  }
};

const updateOrderStatus = async (orderId, status, { 
  billUrl = null, 
  invoiceUrl = null,
  ewayBillUrl = null,
  transportBillUrl = null,
  receivingNoteUrl = null,
  receiverName = null,
  receiverMobile = null,
  allocatedItems = null,
  blockedItems = null
} = {}) => {
  try {
    const validStatuses = [
      "BOOKED",
      "PFD",
      "RFD",
      "OFD",
      "RECEIVED",
      "PARTIAL"
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const updateData = { status };
    if (billUrl) updateData.billUrl = billUrl;
    if (invoiceUrl) updateData.invoiceUrl = invoiceUrl;
    if (ewayBillUrl) updateData.ewayBillUrl = ewayBillUrl;
    if (transportBillUrl) updateData.transportBillUrl = transportBillUrl;
    if (receivingNoteUrl) updateData.receivingNoteUrl = receivingNoteUrl;
    if (receiverName) updateData.receiverName = receiverName;
    if (receiverMobile) updateData.receiverMobile = receiverMobile;

    // Handle Blocking Update (New Stage)
    const isBlockingUpdate = blockedItems && Array.isArray(blockedItems);
    if (isBlockingUpdate) {
      for (const blockedEntry of blockedItems) {
        const orderItem = order.items.find(
          (item) => item.variantId.toString() === blockedEntry.variantId.toString()
        );

        if (orderItem) {
          const oldBlockedSizes = orderItem.blockedSizeQuantities ? Object.fromEntries(orderItem.blockedSizeQuantities) : {};
          const newBlockedSizes = blockedEntry.blockedSizeQuantities || {};

          const catalogItem = await MasterCatalog.findById(orderItem.articleId);
          if (catalogItem) {
            const variant = catalogItem.variants.id(orderItem.variantId);
            if (variant && variant.sizeMap) {
              const allSizes = new Set([...Object.keys(oldBlockedSizes), ...Object.keys(newBlockedSizes)]);
              
              for (const size of allSizes) {
                const oldVal = Number(oldBlockedSizes[size] || 0);
                const newVal = Number(newBlockedSizes[size] || 0);
                const delta = newVal - oldVal;

                if (delta !== 0 && variant.sizeMap.has(size)) {
                  const currentSizeCell = variant.sizeMap.get(size);
                  // Deduct from Live Qty, Add to Blocked Qty
                  currentSizeCell.qty = Math.max(0, (currentSizeCell.qty || 0) - delta);
                  currentSizeCell.blockedQty = Math.max(0, (currentSizeCell.blockedQty || 0) + delta);
                  variant.sizeMap.set(size, currentSizeCell);
                }
              }
              await catalogItem.save();
            }
          }

          orderItem.blockedCartonCount = Math.max(0, Number(blockedEntry.blockedCartonCount) || 0);
          orderItem.blockedPairCount = Math.max(0, Number(blockedEntry.blockedPairCount) || 0);
          orderItem.blockedSizeQuantities = newBlockedSizes;
        }
      }
      order.markModified("items");
      updateData.items = order.items;
    }

    // Handle manual allocation when moving to / updating PFD or RFD
    const isAllocationUpdate = ["PFD", "RFD", "BOOKED", "PARTIAL"].includes(status) || ["PFD", "RFD"].includes(order.status);
    
    if (isAllocationUpdate && allocatedItems && Array.isArray(allocatedItems)) {
      for (const allocatedItem of allocatedItems) {
        const orderItem = order.items.find(
          (item) => item.variantId.toString() === allocatedItem.variantId.toString()
        );

        if (orderItem) {
          // Constraint: Cannot allocate more than what is currently BLOCKED
          const blockedSizes = orderItem.blockedSizeQuantities ? Object.fromEntries(orderItem.blockedSizeQuantities) : {};
          const newAllocSizes = allocatedItem.allocatedSizeQuantities || {};

          // Validate size-wise
          for (const size in newAllocSizes) {
            const req = Number(newAllocSizes[size] || 0);
            const avail = Number(blockedSizes[size] || 0);
            if (req > avail) {
              throw new Error(`Cannot allocate ${req} pairs for size ${size}. Only ${avail} pairs are blocked.`);
            }
          }

          // Note: We don't deduct from MasterCatalog here because it was already 
          // deducted from 'qty' and added to 'blockedQty' during the Blocking stage.
          // The stock remains in 'blockedQty' until the order is RECEIVED/dispatched.

          // Update allocated counts for the CURRENT batch in the order item
          orderItem.allocatedCartonCount = Math.max(0, Number(allocatedItem.allocatedCartonCount) || 0);
          orderItem.allocatedPairCount = Math.max(0, Number(allocatedItem.allocatedPairCount) || 0);
          orderItem.allocatedSizeQuantities = newAllocSizes;
        }
      }
      order.markModified("items");
      updateData.items = order.items;
    }

    // Handle finalization when moving to RECEIVED
    if (status === "RECEIVED") {
      const currentBatchItems = [];
      let batchAmount = 0;
      let batchCartons = 0;
      let batchPairs = 0;

      let allFulfilled = true;

      for (const item of order.items) {
        if (item.allocatedCartonCount > 0) {
          // record in current batch
          currentBatchItems.push({
            variantId: item.variantId,
            articleId: item.articleId,
            cartonCount: item.allocatedCartonCount,
            pairCount: item.allocatedPairCount,
            sizeQuantities: item.allocatedSizeQuantities
          });

          const perPairPrice = item.price / (item.pairCount || 1);
          batchAmount += item.allocatedPairCount * perPairPrice;
          batchCartons += item.allocatedCartonCount;
          batchPairs += item.allocatedPairCount;

          // update fulfilled counts
          item.fulfilledCartonCount = (item.fulfilledCartonCount || 0) + item.allocatedCartonCount;
          item.fulfilledPairCount = (item.fulfilledPairCount || 0) + item.allocatedPairCount;
          
          const fulfilledSizes = item.fulfilledSizeQuantities ? Object.fromEntries(item.fulfilledSizeQuantities) : {};
          const currentAllocSizes = item.allocatedSizeQuantities ? Object.fromEntries(item.allocatedSizeQuantities) : {};
          
          for (const [size, qty] of Object.entries(currentAllocSizes)) {
            fulfilledSizes[size] = (fulfilledSizes[size] || 0) + qty;
          }
          item.fulfilledSizeQuantities = fulfilledSizes;

          // Reduce the Blocked Stock in MasterCatalog as it's now out of the warehouse
          const catalogItem = await MasterCatalog.findById(item.articleId);
          if (catalogItem) {
            const variant = catalogItem.variants.id(item.variantId);
            if (variant && variant.sizeMap) {
              for (const [size, qty] of Object.entries(currentAllocSizes)) {
                if (variant.sizeMap.has(size)) {
                  const currentSizeCell = variant.sizeMap.get(size);
                  currentSizeCell.blockedQty = Math.max(0, (currentSizeCell.blockedQty || 0) - Number(qty));
                  variant.sizeMap.set(size, currentSizeCell);
                }
              }
              catalogItem.markModified('variants');
              await catalogItem.save();
            }
          }

          // Also reduce the order level blocked counts
          const blockedSizes = item.blockedSizeQuantities ? Object.fromEntries(item.blockedSizeQuantities) : {};
          for (const [size, qty] of Object.entries(currentAllocSizes)) {
            blockedSizes[size] = Math.max(0, (blockedSizes[size] || 0) - Number(qty));
          }
          
          item.blockedSizeQuantities = blockedSizes;
          item.blockedCartonCount = Math.max(0, (item.blockedCartonCount || 0) - item.allocatedCartonCount);
          item.blockedPairCount = Math.max(0, (item.blockedPairCount || 0) - item.allocatedPairCount);

          // reset allocated counts for next batch AFTER using them for subtraction
          item.allocatedCartonCount = 0;
          item.allocatedPairCount = 0;
          item.allocatedSizeQuantities = {};
        }

        if ((item.fulfilledCartonCount || 0) < item.cartonCount) {
          allFulfilled = false;
        }
      }

      const batchNumber = (order.fulfillmentHistory?.length || 0) + 1;
      const historyEntry = {
        batchNumber,
        date: new Date(),
        items: currentBatchItems,
        totalAmount: batchAmount,
        totalCartons: batchCartons,
        totalPairs: batchPairs,
        billUrl: order.billUrl || billUrl,
        invoiceUrl: order.invoiceUrl || invoiceUrl,
        ewayBillUrl: order.ewayBillUrl || ewayBillUrl,
        transportBillUrl: order.transportBillUrl || transportBillUrl,
        receivingNoteUrl: receivingNoteUrl,
        receiverName: receiverName,
        receiverMobile: receiverMobile
      };

      if (!order.fulfillmentHistory) order.fulfillmentHistory = [];
      order.fulfillmentHistory.push(historyEntry);

      // Determine final status
      updateData.status = allFulfilled ? "RECEIVED" : "PARTIAL";
      updateData.items = order.items;
      updateData.fulfillmentHistory = order.fulfillmentHistory;
      order.markModified("items");
      order.markModified("fulfillmentHistory");
      
      // Clear current batch docs from main order fields after archive
      updateData.billUrl = null;
      updateData.invoiceUrl = null;
      updateData.ewayBillUrl = null;
      updateData.transportBillUrl = null;
      updateData.receivingNoteUrl = null;
    }

    // Apply updates to the order object
    Object.assign(order, updateData);
    
    // Save the document (this persists items array changes as well)
    await order.save();
    
    // Re-populate for consistency
    const updatedOrder = await Order.findById(orderId).populate({
      path: 'distributorId',
      populate: { path: 'distributorId' }
    });

    return updatedOrder;
  } catch (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
};

const processReturn = async (orderId, returnData) => {
  try {
    const { items: returnItems, reason, batchNumber } = returnData;
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");
    
    const validStatuses = ["RECEIVED", "PARTIAL", "OFD"];
    if (!validStatuses.includes(order.status)) {
      throw new Error("Only orders with delivered items can be returned");
    }

    const processedItems = [];
    let totalCartons = 0;
    let totalPairs = 0;

    for (const retItem of returnItems) {
      const { variantId, cartons } = retItem;
      const orderItem = order.items.find(item => item.variantId.toString() === variantId.toString());
      if (!orderItem) throw new Error(`Item ${variantId} not found in this order`);

      // Find the specific batch if provided
      let targetBatch = null;
      if (batchNumber) {
        targetBatch = order.fulfillmentHistory.find(b => b.batchNumber === Number(batchNumber));
        if (!targetBatch) throw new Error(`Batch #${batchNumber} not found in order history`);
        
        // Update batch-level returned count safely
        const updatedItems = targetBatch.items.map(bi => {
          if (bi.variantId.toString() === variantId.toString()) {
            return {
              ...bi.toObject(),
              returnedCartonCount: (bi.returnedCartonCount || 0) + cartons
            };
          }
          return bi;
        });
        targetBatch.items = updatedItems;
      }

      // Proportional calculation for size restoration (based on this return's carton count)
      const ratio = cartons / (orderItem.cartonCount || 1);
      const originalSizes = orderItem.sizeQuantities ? Object.fromEntries(orderItem.sizeQuantities) : {};
      
      const catalogItem = await MasterCatalog.findById(orderItem.articleId);
      if (!catalogItem) throw new Error("Article not found in catalog");

      const variant = catalogItem.variants.id(variantId);
      if (!variant) throw new Error("Variant not found in catalog");

      const returnSizeQuantities = {};
      let itemPairs = 0;

      if (variant.sizeMap) {
        for (const [size, qty] of Object.entries(originalSizes)) {
          const qtyToReturn = Math.round(qty * ratio);
          if (qtyToReturn > 0) {
            returnSizeQuantities[size] = qtyToReturn;
            itemPairs += qtyToReturn;

            if (variant.sizeMap.has(size)) {
              const cell = variant.sizeMap.get(size);
              cell.qty = (cell.qty || 0) + qtyToReturn;
              variant.sizeMap.set(size, cell);
            }
          }
        }
        catalogItem.markModified('variants');
        await catalogItem.save();
      }

      // Update Order-level counts
      orderItem.returnedCartonCount = (orderItem.returnedCartonCount || 0) + cartons;
      orderItem.returnedPairCount = (orderItem.returnedPairCount || 0) + itemPairs;
      
      // OPTIONAL: "Remove from fulfilled" as requested
      orderItem.fulfilledCartonCount = Math.max(0, (orderItem.fulfilledCartonCount || 0) - cartons);
      orderItem.fulfilledPairCount = Math.max(0, (orderItem.fulfilledPairCount || 0) - itemPairs);

      processedItems.push({
        variantId: orderItem.variantId,
        articleId: orderItem.articleId,
        cartonCount: cartons,
        pairCount: itemPairs,
        sizeQuantities: returnSizeQuantities
      });

      totalCartons += cartons;
      totalPairs += itemPairs;
    }

    // Record the Return Document
    const returnNumber = await generateNextReturnNumber();
    const newReturn = new Return({
      returnNumber,
      orderId,
      orderNumber: order.orderNumber,
      distributorId: order.distributorId,
      distributorName: order.distributorName,
      items: processedItems,
      totalCartons,
      totalPairs,
      reason,
      batchNumber // Store which batch this return belongs to
    });

    // Finalize order updates
    if (order.status === "RECEIVED") {
      order.status = "PARTIAL"; // Revert to partial if items are returned
    }
    order.markModified("items");
    order.markModified("fulfillmentHistory");
    await order.save();
    
    await newReturn.save();
    return newReturn;
  } catch (error) {
    throw new Error(`Failed to process return: ${error.message}`);
  }
};

const getReturnHistory = async ({ page = 1, limit = 10, search = "" } = {}) => {
  try {
    const skip = (page - 1) * limit;
    const query = {};
    if (search) {
      query.$or = [
        { returnNumber: { $regex: search, $options: "i" } },
        { distributorName: { $regex: search, $options: "i" } },
        { orderNumber: { $regex: search, $options: "i" } }
      ];
    }

    const [items, total] = await Promise.all([
      Return.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Return.countDocuments(query)
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    throw new Error(`Failed to fetch return history: ${error.message}`);
  }
};

module.exports = {
  createOrder,
  getOrdersByDistributor,
  getAllOrders,
  updateOrderStatus,
  processReturn,
  getReturnHistory,
};
