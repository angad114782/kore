const mongoose = require("mongoose");

const EVENT_GROUPS = [
  {
    group: "System & Auth",
    events: [
      { event: "USER_LOGIN",              label: "User Login",                          waTemplate: "user_login"              },
      { event: "PASSWORD_RESET",          label: "Password Reset",                      waTemplate: "password_reset"          },
      { event: "USER_CREATED",            label: "New User Created",                    waTemplate: "user_created"            },
      { event: "USER_UPDATED",            label: "User Updated",                        waTemplate: "user_updated"            },
    ],
  },
  {
    group: "Orders",
    events: [
      { event: "ORDER_PLACED",            label: "Order Placed by Distributor",         waTemplate: "order_placed"            },
      { event: "ORDER_BOOKED",            label: "Order Booked by Admin",               waTemplate: "order_booked"            },
      { event: "ORDER_DISPATCHED",        label: "Order Dispatched",                    waTemplate: "order_dispatched"        },
      { event: "ORDER_IN_TRANSIT",        label: "Order In Transit",                    waTemplate: "order_in_transit"        },
      { event: "ORDER_OUT_FOR_DELIVERY",  label: "Order Out for Delivery",              waTemplate: "order_out_for_delivery"  },
      { event: "ORDER_DELIVERED",         label: "Order Delivered",                     waTemplate: "order_delivered"         },
      { event: "ORDER_CANCELLED",         label: "Order Cancelled / Deleted",           waTemplate: "order_cancelled"         },
      { event: "ORDER_EDITED",            label: "Order Edited",                        waTemplate: "order_edited"            },
      { event: "RETURN_PROCESSED",        label: "Return Processed",                    waTemplate: "return_processed"        },
      { event: "PREORDER_RELEASED",       label: "Pre-Order Released to Regular Order", waTemplate: "preorder_released"       },
    ],
  },
  {
    group: "Payments",
    events: [
      { event: "PAYMENT_RECEIVED",        label: "Payment Received",                    waTemplate: "payment_received"        },
      { event: "PAYMENT_OVERDUE",         label: "Payment Overdue Alert",               waTemplate: "payment_overdue"         },
    ],
  },
  {
    group: "Distributors",
    events: [
      { event: "NEW_DISTRIBUTOR",         label: "New Distributor Added",               waTemplate: "new_distributor"         },
      { event: "DISTRIBUTOR_UPDATED",     label: "Distributor Profile Updated",         waTemplate: "distributor_updated"     },
      { event: "DISTRIBUTOR_DELETED",     label: "Distributor Deleted",                 waTemplate: "distributor_deleted"     },
    ],
  },
  {
    group: "Catalogue & Stock",
    events: [
      { event: "CATALOG_CREATED",         label: "New Article Added to Catalogue",      waTemplate: "catalog_created"         },
      { event: "CATALOG_UPDATED",         label: "Catalogue Article Updated",           waTemplate: "catalog_updated"         },
      { event: "CATALOG_DELETED",         label: "Catalogue Article Deleted",           waTemplate: "catalog_deleted"         },
      { event: "STOCK_INWARD",            label: "Stock Inward Movement",               waTemplate: "stock_inward"            },
      { event: "STOCK_OUTWARD",           label: "Stock Outward Movement",              waTemplate: "stock_outward"           },
      { event: "LOW_STOCK_ALERT",         label: "Low Stock Alert",                     waTemplate: "low_stock_alert"         },
    ],
  },
  {
    group: "Purchase Orders & GRN",
    events: [
      { event: "PO_CREATED",             label: "Purchase Order Created",               waTemplate: "po_created"              },
      { event: "PO_UPDATED",             label: "Purchase Order Updated",               waTemplate: "po_updated"              },
      { event: "PO_APPROVED",            label: "Purchase Order Approved",              waTemplate: "po_approved"             },
      { event: "PO_REJECTED",            label: "Purchase Order Rejected",              waTemplate: "po_rejected"             },
      { event: "PO_DELETED",             label: "Purchase Order Deleted",               waTemplate: "po_deleted"              },
      { event: "GRN_SUBMITTED",          label: "GRN Submitted (Stock Received)",       waTemplate: "grn_submitted"           },
    ],
  },
];

const EVENTS = EVENT_GROUPS.flatMap(g => g.events);

const ADMIN_ROLES = ["superadmin", "admin", "manager", "investor"];

const RuleSchema = new mongoose.Schema({
  event:              { type: String, required: true },
  label:              { type: String, required: true },
  emailEnabled:       { type: Boolean, default: false },
  emailRoles:         { type: [String], default: [] },
  emailDistributor:   { type: Boolean, default: false },
  waEnabled:          { type: Boolean, default: false },
  waRoles:            { type: [String], default: [] },
  waDistributor:      { type: Boolean, default: false },
  waTemplate:         { type: String, default: "" },
  waLanguage:         { type: String, default: "en" },
}, { _id: false });

const NotificationConfigSchema = new mongoose.Schema({
  // Email / SMTP
  emailEnabled:   { type: Boolean, default: false },
  smtpHost:       { type: String, default: "" },
  smtpPort:       { type: Number, default: 587 },
  smtpSecure:     { type: Boolean, default: false },
  smtpUser:       { type: String, default: "" },
  smtpPass:       { type: String, default: "" },
  smtpFromName:   { type: String, default: "Kore Kollective" },
  smtpFromEmail:  { type: String, default: "" },

  // WhatsApp Cloud API
  waEnabled:          { type: Boolean, default: false },
  waToken:            { type: String, default: "" },
  waPhoneNumberId:    { type: String, default: "" },
  waBusinessAccountId:{ type: String, default: "" },

  rules: { type: [RuleSchema], default: () => EVENTS.map(e => ({
    event:            e.event,
    label:            e.label,
    emailEnabled:     false,
    emailRoles:       ["superadmin", "admin"],
    emailDistributor: ["ORDER_OUT_FOR_DELIVERY", "ORDER_DELIVERED"].includes(e.event),
    waEnabled:        false,
    waRoles:          ["superadmin", "admin"],
    waDistributor:    ["ORDER_OUT_FOR_DELIVERY", "ORDER_DELIVERED"].includes(e.event),
    waTemplate:       e.waTemplate,
    waLanguage:       "en",
  })) },
}, { timestamps: true });

NotificationConfigSchema.statics.getSingleton = async function () {
  let doc = await this.findOne().lean();
  if (!doc) doc = await this.create({});
  return doc;
};

NotificationConfigSchema.statics.EVENTS = EVENTS;
NotificationConfigSchema.statics.EVENT_GROUPS = EVENT_GROUPS;
NotificationConfigSchema.statics.ADMIN_ROLES = ADMIN_ROLES;

module.exports = mongoose.model("NotificationConfig", NotificationConfigSchema);
