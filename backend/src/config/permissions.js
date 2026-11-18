/**
 * Single source of truth for every permission a staff user can be given.
 * The frontend reads this list from GET /api/roles/permissions — nothing about
 * what a role "is allowed to do" is hardcoded anywhere else. Access is stored
 * per user (User.permissions) and chosen when the user is created or edited.
 *
 * The only fixed rule: a `superadmin` account always has every permission so
 * the portal can never be locked out. Superadmin accounts cannot be created.
 */
// Pages a login can see (one checkbox each). The key is the "can open this page" permission.
const PAGES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "po.view", label: "Purchase Orders" },
  { key: "grn", label: "GRN" },
  { key: "vendors", label: "Vendors" },
  { key: "catalogue", label: "Catalogue" },
  { key: "master_stock", label: "Master Stock" },
  { key: "distributors", label: "Distributors" },
  { key: "orders.view", label: "Orders" },
  { key: "returns.view", label: "Returns" },
  { key: "reports.stock", label: "Stock Report" },
  { key: "reports.dispatch", label: "Dispatch Report" },
  { key: "reports.return", label: "Return Report" },
  { key: "bills.view", label: "Vendor Bill/Invoice" },
  { key: "invoices.view", label: "Distributor Invoice" },
  { key: "overdue.view", label: "Overdue Payments" },
  { key: "activity_log", label: "Activity Log" },
];

// Actions inside a module (one checkbox each). `page` is the page permission that is
// switched on automatically when any action is ticked (null = the module has no page of its own).
const MODULES = [
  { id: "po", label: "Purchase Orders", page: "po.view", actions: [
    { key: "po.create", label: "Create" },
    { key: "po.edit", label: "Edit" },
    { key: "po.delete", label: "Delete" },
  ] },
  { id: "grn", label: "GRN", page: "grn", actions: [
    { key: "grn.create", label: "Receive goods (scan & submit GRN)" },
  ] },
  { id: "vendors", label: "Vendors", page: "vendors", actions: [
    { key: "vendors.create", label: "Add" },
    { key: "vendors.edit", label: "Edit / activate / deactivate" },
    { key: "vendors.delete", label: "Delete" },
  ] },
  { id: "catalogue", label: "Catalogue", page: "catalogue", actions: [
    { key: "catalogue.create", label: "Add articles / import CSV" },
    { key: "catalogue.edit", label: "Edit articles, variants & images" },
    { key: "catalogue.delete", label: "Delete" },
  ] },
  { id: "stock", label: "Master Stock", page: "master_stock", actions: [
    { key: "stock.inward", label: "Stock inward" },
    { key: "stock.outward", label: "Stock outward" },
  ] },
  { id: "distributors", label: "Distributors", page: "distributors", actions: [
    { key: "distributors.create", label: "Add" },
    { key: "distributors.edit", label: "Edit / activate / deactivate" },
    { key: "distributors.delete", label: "Delete" },
  ] },
  { id: "orders", label: "Orders", page: "orders.view", actions: [
    { key: "orders.book", label: "Book / confirm" },
    { key: "orders.dispatch", label: "Scan cartons & mark in transit" },
    { key: "orders.receive", label: "Confirm receipt" },
    { key: "orders.edit", label: "Edit" },
    { key: "orders.cancel", label: "Cancel" },
    { key: "orders.delete", label: "Delete pending orders" },
  ] },
  { id: "returns", label: "Returns", page: "returns.view", actions: [
    { key: "returns.process", label: "Process returns" },
  ] },
  { id: "vendor_bills", label: "Vendor Bill/Invoice", page: "bills.view", actions: [
    { key: "bills.approve", label: "Approve bills" },
    { key: "bills.reject", label: "Reject bills" },
    { key: "payments.vendor", label: "Add invoice & record payment" },
  ] },
  { id: "distributor_payments", label: "Distributor Invoice & Overdue Payments", page: "invoices.view", actions: [
    { key: "payments.distributor", label: "Mark payment received" },
  ] },
  { id: "users", label: "User Management", page: null, actions: [
    { key: "users.create", label: "Create users" },
    { key: "users.edit", label: "Edit users & their access" },
    { key: "users.delete", label: "Delete users" },
    { key: "users.reset_password", label: "Reset passwords" },
    { key: "users.roles", label: "Add / delete roles" },
  ] },
  { id: "terms", label: "Terms & Policies", page: null, actions: [
    { key: "terms.manage", label: "Edit terms and policies" },
  ] },
  { id: "notifications", label: "Notifications", page: null, actions: [
    { key: "notifications.manage", label: "Configure notification events" },
  ] },
  { id: "integrations", label: "Integrations", page: null, actions: [
    { key: "integrations.manage", label: "Manage connected services" },
  ] },
];

const PERMISSION_CATALOG = { pages: PAGES, modules: MODULES };

const ALL_PERMISSION_KEYS = [
  ...new Set([
    ...PAGES.map((p) => p.key),
    ...MODULES.flatMap((m) => m.actions.map((a) => a.key)),
  ]),
];

/** Keep only known keys, de-duplicated. */
const cleanPermissions = (list) => {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((k) => String(k).trim()).filter((k) => ALL_PERMISSION_KEYS.includes(k)))];
};

/** A non-superadmin can only hand out permissions they hold themselves. */
const restrictToActor = (actor, list) => {
  const clean = cleanPermissions(list);
  if (actor?.role === "superadmin") return clean;
  const own = Array.isArray(actor?.permissions) ? actor.permissions : [];
  return clean.filter((k) => own.includes(k));
};

module.exports = {
  restrictToActor, PERMISSION_CATALOG, ALL_PERMISSION_KEYS, cleanPermissions };
