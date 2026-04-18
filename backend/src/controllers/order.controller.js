const OrderService = require("../services/order.service");
const { emitOrderUpdate } = require("../socket");

const createOrder = async (req, res) => {
  try {
    const distributorId = req.user.id; // Extracted from JWT middleware
    const orderData = req.body;

    const order = await OrderService.createOrder(distributorId, orderData);
    
    // Emit real-time event
    emitOrderUpdate(order);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create order",
    });
  }
};

const getDistributorOrders = async (req, res) => {
  try {
    const distributorId = req.user.id; // Extracted from JWT
    const { page, limit, q, status, startDate, endDate, sortBy, sortDesc } = req.query;
    const result = await OrderService.getOrdersByDistributor(distributorId, { page, limit, search: q, status, startDate, endDate, sortBy, sortDesc });

    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    console.error("Error fetching distributor orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { page, limit, q, status, startDate, endDate, sortBy, sortDesc } = req.query;
    const result = await OrderService.getAllOrders({ page, limit, search: q, status, startDate, endDate, sortBy, sortDesc });

    res.status(200).json({
      success: true,
      message: "All orders fetched successfully",
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch orders",
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, allocatedItems } = req.body;

    // Build billUrl from uploaded file if present
    let billUrl = null;
    if (req.file) {
      billUrl = `/uploads/bills/${req.file.filename}`;
    }

    const updatedOrder = await OrderService.updateOrderStatus(id, status, { billUrl, allocatedItems });

    // Emit real-time event
    emitOrderUpdate(updatedOrder);

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update order status",
    });
  }
};

const processReturn = async (req, res) => {
  try {
    const { orderId, variantId, cartons } = req.body;

    if (!orderId || !variantId || !cartons) {
      return res.status(400).json({
        success: false,
        message: "Order ID, Variant ID, and Cartons are required",
      });
    }

    const order = await OrderService.processReturn(orderId, variantId, parseInt(cartons));

    // Emit real-time event
    emitOrderUpdate(order);

    res.status(200).json({
      success: true,
      message: "Return processed successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error processing return:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to process return",
    });
  }
};

module.exports = {
  createOrder,
  getDistributorOrders,
  getAllOrders,
  updateOrderStatus,
  processReturn,
};
