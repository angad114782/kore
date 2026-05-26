
const { Server } = require("socket.io");

let io;

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust this for production
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// ──────────────────────────────────────────────
// ORDER events  (Admin ↔ Distributor)
// ──────────────────────────────────────────────
const emitOrderUpdate = (order) => {
  if (io) {
    io.emit("orderUpdated", {
      orderId: String(order.id || order._id),
      status: order.status,
      distributorId: String(order.distributorId)
    });
  }
};

// ──────────────────────────────────────────────
// DISTRIBUTOR profile events  (Admin → Distributor)
// e.g. when admin changes credit limit, discount etc.
// ──────────────────────────────────────────────
const emitDistributorUpdate = (distributorId) => {
  if (io) {
    io.emit("distributorUpdated", {
      distributorId: String(distributorId)
    });
  }
};

// ──────────────────────────────────────────────
// RETURN events  (Admin ↔ Distributor)
// ──────────────────────────────────────────────
const emitReturnCreated = (returnDoc) => {
  if (io) {
    io.emit("returnCreated", {
      returnId:        String(returnDoc._id),
      returnNumber:    returnDoc.returnNumber,
      distributorId:   String(returnDoc.distributorId),
      distributorName: returnDoc.distributorName,
      orderNumber:     returnDoc.orderNumber,
      totalPairs:      returnDoc.totalPairs,
    });
  }
};

module.exports = { init, getIO, emitOrderUpdate, emitDistributorUpdate, emitReturnCreated };
