import { User, UserRole } from "../types";

/**
 * Access is read from the user's own `permissions` list, which the Super Admin
 * chooses when creating / editing the user. Nothing is implied by the role name.
 * The one fixed rule: a superadmin account always has everything.
 */
export const can = (user: User | null | undefined, ...keys: string[]): boolean => {
  if (!user) return false;
  if (user.role === UserRole.SUPERADMIN) return true;
  if (user.role === UserRole.DISTRIBUTOR) return false;
  const own = user.permissions || [];
  return keys.some((k) => own.includes(k));
};

/** Which permission(s) unlock each staff page (tab). Any one is enough. */
export const TAB_PERMISSIONS: Record<string, string[]> = {
  dashboard: ["dashboard"],
  po: ["po.view"],
  grn: ["grn"],
  vendors: ["vendors"],
  vendor_invoice: ["bills.view"],
  catalogue: ["catalogue"],
  variant_details: ["catalogue"],
  master_inventory: ["master_stock"],
  booking_inventory: ["master_stock"],
  distributors: ["distributors"],
  orders: ["orders.view"],
  distributor_invoice: ["invoices.view"],
  invoice_breakdown: ["invoices.view", "orders.view"],
  dispatch_breakdown: ["reports.dispatch", "orders.view"],
  returns: ["returns.view"],
  accounts: ["bills.view"],
  bills: ["bills.view"],
  overdue_payments: ["overdue.view"],
  report_stock: ["reports.stock"],
  report_dispatch: ["reports.dispatch"],
  report_return: ["reports.return"],
  activity_log: ["activity_log"],
  terms_page: ["terms.manage"],
  users: ["users.create", "users.edit", "users.delete", "users.reset_password", "users.roles"],
  notification_settings: ["notifications.manage"],
  integrations: ["integrations.manage"],
};

/** Pages everyone who is logged in can open. */
const OPEN_TABS = ["profile"];

export const canOpenTab = (user: User | null | undefined, tab: string): boolean => {
  if (!user) return false;
  if (user.role === UserRole.DISTRIBUTOR) return true; // distributor portal is separate
  if (OPEN_TABS.includes(tab)) return true;
  const needed = TAB_PERMISSIONS[tab];
  if (!needed) return user.role === UserRole.SUPERADMIN; // unknown page: superadmin only
  return can(user, ...needed);
};

/** First page this user is allowed to land on. */
export const firstAllowedTab = (user: User | null | undefined): string => {
  const order = ["dashboard", "orders", "po", "grn", "catalogue", "master_inventory", "distributors", "returns", "bills", "overdue_payments", "report_stock", "activity_log", "profile"];
  return order.find((t) => canOpenTab(user, t)) || "profile";
};
