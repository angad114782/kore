const Order = require("../models/Order");
const User = require("../models/User");
const MasterCatalog = require("../models/MasterCatalog");

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
      Order.find(q).sort(sortObj).skip(skip).limit(l).lean(),
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
      Order.find(q).sort(sortObj).skip(skip).limit(l).lean(),
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

const updateOrderStatus = async (orderId, status, { billUrl = null, allocatedItems = null } = {}) => {
  try {
    const validStatuses = [
      "BOOKED",
      "PFD",
      "RFD",
      "OFD",
      "RECEIVED",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const updateData = { status };
    if (status === "RECEIVED" && billUrl) {
      updateData.billUrl = billUrl;
    }

    // Handle manual allocation when moving to PFD
    if (status === "PFD" && allocatedItems && Array.isArray(allocatedItems)) {
      let newTotalAmount = 0;
      let newTotalCartons = 0;
      let newTotalPairs = 0;

      for (const allocatedItem of allocatedItems) {
        const orderItem = order.items.find(
          (item) => item.variantId.toString() === allocatedItem.variantId.toString()
        );

        if (orderItem) {
          // Update allocated counts
          orderItem.allocatedCartonCount = allocatedItem.allocatedCartonCount;
          orderItem.allocatedPairCount = allocatedItem.allocatedPairCount;
          orderItem.allocatedSizeQuantities = allocatedItem.allocatedSizeQuantities || {};

          // Recalculate totals based on allocation
          const perPairPrice = orderItem.price / (orderItem.pairCount || 1);
          newTotalAmount += orderItem.allocatedPairCount * perPairPrice;
          newTotalCartons += orderItem.allocatedCartonCount;
          newTotalPairs += orderItem.allocatedPairCount;

          // Deduct from Stock (MasterCatalog)
          const catalogItem = await MasterCatalog.findById(orderItem.articleId);
          if (catalogItem) {
            const variant = catalogItem.variants.id(orderItem.variantId);
            if (variant && variant.sizeMap) {
              // Deduct each size's allocated quantity
              const allocSizes = allocatedItem.allocatedSizeQuantities || {};
              for (const [size, qty] of Object.entries(allocSizes)) {
                if (variant.sizeMap.has(size)) {
                  const currentSizeCell = variant.sizeMap.get(size);
                  currentSizeCell.qty = Math.max(0, currentSizeCell.qty - qty);
                  variant.sizeMap.set(size, currentSizeCell);
                }
              }
              await catalogItem.save();
            }
          }
        }
      }

      updateData.totalAmount = newTotalAmount;
      updateData.totalCartons = newTotalCartons;
      updateData.totalPairs = newTotalPairs;
      
      const discountAmount = (newTotalAmount * (order.discountPercentage || 0)) / 100;
      updateData.discountAmount = discountAmount;
      updateData.finalAmount = newTotalAmount - discountAmount;
      updateData.items = order.items;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return updatedOrder;
  } catch (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
};

const processReturn = async (orderId, variantId, cartons) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");
    if (order.status !== "RECEIVED") throw new Error("Only received orders can be returned");

    const orderItem = order.items.find(item => item.variantId.toString() === variantId.toString());
    if (!orderItem) throw new Error("Item not found in this order");

    const allocCartons = orderItem.allocatedCartonCount || orderItem.cartonCount;
    if (cartons > allocCartons) throw new Error(`Cannot return more than allocated (${allocCartons} cartons)`);

    // Proportional calculation for size restoration
    const ratio = cartons / allocCartons;
    const allocSizes = orderItem.allocatedSizeQuantities || orderItem.sizeQuantities || {};

    const catalogItem = await MasterCatalog.findById(orderItem.articleId);
    if (!catalogItem) throw new Error("Article not found in catalog");

    const variant = catalogItem.variants.id(variantId);
    if (!variant) throw new Error("Variant not found in catalog");

    if (variant.sizeMap) {
      for (const [size, qty] of Object.entries(allocSizes)) {
        const qtyToReturn = Math.round(qty * ratio);
        if (variant.sizeMap.has(size)) {
          const cell = variant.sizeMap.get(size);
          cell.qty = (cell.qty || 0) + qtyToReturn;
          variant.sizeMap.set(size, cell);
        }
      }
      await catalogItem.save();
    }

    // Update order amounts/counts to reflect return (Optional but helpful)
    // For now we just add stock back to master catalog as the priority.
    
    return order;
  } catch (error) {
    throw new Error(`Failed to process return: ${error.message}`);
  }
};

module.exports = {
  createOrder,
  getOrdersByDistributor,
  getAllOrders,
  updateOrderStatus,
  processReturn,
};
