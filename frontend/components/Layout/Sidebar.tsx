// src/components/Layout/Sidebar.tsx
import React from "react";
import {
  LayoutDashboard,
  Factory,
  FileText,
  ScanLine,
  Boxes,
  BookOpen,
  Database,
  ShoppingCart,
  RotateCcw,
  Users,
  BarChart3,
  PackageCheck,
  Truck,
  FileBarChart,
  LogOut,
  Package,
  Menu,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Receipt,
  Shield,
  Activity,
  AlertTriangle,
  IndianRupee,
  ScrollText,
  Bell,
  Plug,
} from "lucide-react";

import { type User as Usertype, UserRole } from "../../types";

type SidebarProps = {
  user: Usertype;
  activeTab: string;
  setActiveTab: (tab: string) => void;

  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;

  cartItemsCount: number;
  onLogout: () => void;

  // ✅ Desktop collapse
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
};

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  cartItemsCount,
  onLogout,
  isCollapsed,
  setIsCollapsed,
}) => {
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    purchases: true,
    inventory: true,
    sales: true,
    partners: true,
    reports: true,
    accounts: true,
  });

  const go = (tab: string) => {
    console.log("Navigating to:", tab);
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((p) => ({ ...p, [key]: !p[key] }));
  };

  React.useEffect(() => {
    if (!isSidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen, setIsSidebarOpen]);

  const GroupHeader: React.FC<{
    icon: React.ReactNode;
    label: string;
    groupKey: string;
  }> = ({ icon, label, groupKey }) => {
    const handleGroupClick = () => {
      if (isCollapsed) {
        setOpenGroups((previous) => ({ ...previous, [groupKey]: true }));
        setIsCollapsed(false);
        return;
      }

      toggleGroup(groupKey);
    };

    return (
      <button
        type="button"
        onClick={handleGroupClick}
        className={cn(
          "flex w-full items-center rounded-lg text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100",
          isCollapsed
            ? "h-11 justify-center px-2"
            : "h-8 justify-between px-3"
        )}
        aria-expanded={openGroups[groupKey]}
        aria-controls={`sidebar-group-${groupKey}`}
        aria-label={label}
        title={isCollapsed ? label : undefined}
      >
        <span className={cn("flex items-center", !isCollapsed && "gap-2")}>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-slate-400">
            {icon}
          </span>
          {!isCollapsed && <span className="truncate">{label}</span>}
        </span>

        {!isCollapsed && (
          <ChevronDown
            size={15}
            className={cn(
              "shrink-0 transition-transform duration-200",
              openGroups[groupKey] && "rotate-180"
            )}
          />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between p-4 bg-white border-b border-slate-200 z-30 h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
            <Package className="text-white" size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">
            Kore <span className="text-indigo-600">Kollective</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-[background-color,color,transform,box-shadow] duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          aria-expanded={isSidebarOpen}
          aria-controls="primary-sidebar"
          aria-label={
            isSidebarOpen ? "Close navigation menu" : "Open navigation menu"
          }
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="primary-sidebar"
        aria-label="Primary navigation"
        className={`
          fixed top-0 left-0 z-20 h-screen bg-white border-r border-slate-200
          flex flex-col overflow-visible transition-[width,transform] duration-300 ease-in-out
          ${isCollapsed ? "w-20" : "w-64"}
          ${
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div
          className={`${
            isSidebarOpen ? "pt-16 md:pt-0" : ""
          } flex h-full min-h-0 flex-col`}
        >
          <header
            className={cn(
              "flex h-16 shrink-0 items-center border-b border-slate-100",
              isCollapsed ? "justify-center px-3" : "px-4"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 items-center",
                isCollapsed ? "justify-center" : "gap-3"
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm shadow-indigo-100">
                <Package className="text-white" size={20} />
              </div>

              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-black tracking-tight text-slate-900">
                    Kore <span className="text-indigo-600">Kollective</span>
                  </p>
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Operations
                  </p>
                </div>
              )}
            </div>
          </header>

          <div
            id="sidebar-navigation"
            className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          >
            <div className={`${isCollapsed ? "p-3" : "p-4"}`}>
              <nav aria-label="Primary navigation" className="space-y-1">
              {/* Dashboard */}
              <NavItem
                icon={<LayoutDashboard size={20} />}
                label="Dashboard"
                active={activeTab === "dashboard"}
                onClick={() => go("dashboard")}
                isCollapsed={isCollapsed}
              />

              {/* Admin menus only */}
              {user.role !== UserRole.DISTRIBUTOR ? (
                <>
                  {/* Manufacturing — hidden for accountant */}
                  {user.role !== UserRole.ACCOUNTANT && (
                    <div className="pt-2">
                      <GroupHeader
                        icon={<Factory size={16} />}
                        label="Purchases"
                        groupKey="purchases"
                      />
                      {!isCollapsed && openGroups.purchases && (
                        <div
                          id="sidebar-group-purchases"
                          className="mt-1 ml-2 space-y-1 border-l border-slate-100 pl-3"
                        >
                          <NavItem
                            icon={<FileText size={18} />}
                            label="PO"
                            active={activeTab === "po"}
                            onClick={() => go("po")}
                            compact
                            isCollapsed={isCollapsed}
                          />
                          <NavItem
                            icon={<ScanLine size={18} />}
                            label="GRN"
                            active={activeTab === "grn"}
                            onClick={() => go("grn")}
                            compact
                            isCollapsed={isCollapsed}
                          />
                          <NavItem
                            icon={<Truck size={18} />}
                            label="Vendors"
                            active={activeTab === "vendors"}
                            onClick={() => go("vendors")}
                            compact
                            isCollapsed={isCollapsed}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inventory — hidden for accountant */}
                  {user.role !== UserRole.ACCOUNTANT && (
                    <div className="pt-2">
                      <GroupHeader
                        icon={<Boxes size={16} />}
                        label="Inventory"
                        groupKey="inventory"
                      />
                      {!isCollapsed && openGroups.inventory && (
                        <div
                          id="sidebar-group-inventory"
                          className="mt-1 ml-2 space-y-1 border-l border-slate-100 pl-3"
                        >
                          <NavItem
                            icon={<BookOpen size={18} />}
                            label="Catalogue"
                            active={activeTab === "catalogue"}
                            onClick={() => go("catalogue")}
                            compact
                            isCollapsed={isCollapsed}
                          />
                          <NavItem
                            icon={<Database size={18} />}
                            label="Master Stock"
                            active={activeTab === "master_inventory"}
                            onClick={() => go("master_inventory")}
                            compact
                            isCollapsed={isCollapsed}
                          />
                          {/* <NavItem
                        icon={<ClipboardList size={18} />}
                        label="Booking Status"
                        active={activeTab === "booking_inventory"}
                        onClick={() => go("booking_inventory")}
                        compact
                        isCollapsed={isCollapsed}
                      /> */}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sales */}
                  <div className="pt-2">
                    <GroupHeader
                      icon={<ShoppingCart size={16} />}
                      label="Sales"
                      groupKey="sales"
                    />
                    {!isCollapsed && openGroups.sales && (
                      <div
                        id="sidebar-group-sales"
                        className="mt-1 ml-2 space-y-1 border-l border-slate-100 pl-3"
                      >
                        <NavItem
                          icon={<Users size={18} />}
                          label="Distributors"
                          active={activeTab === "distributors"}
                          onClick={() => go("distributors")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                        <NavItem
                          icon={<PackageCheck size={18} />}
                          label="Orders"
                          active={activeTab === "orders"}
                          onClick={() => go("orders")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                        <NavItem
                          icon={<RotateCcw size={18} />}
                          label="Returns"
                          active={activeTab === "returns"}
                          onClick={() => go("returns")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                      </div>
                    )}
                  </div>

                  {/* Partners */}
                  {/* <div className="pt-2">
                  <GroupHeader
                    icon={<Users size={16} />}
                    label="Partners"
                    groupKey="partners"
                  />
                  {!isCollapsed && openGroups.partners && (
                    <div className="mt-1 ml-2 space-y-1 border-l border-slate-100 pl-3">
                      <NavItem
                        icon={<Users size={18} />}
                        label="Distributors"
                        active={activeTab === "distributors"}
                        onClick={() => go("distributors")}
                        compact
                        isCollapsed={isCollapsed}
                      />
                    </div>
                  )}
                </div> */}

                  {/* Reports */}
                  <div className="pt-2">
                    <GroupHeader
                      icon={<BarChart3 size={16} />}
                      label="Reports"
                      groupKey="reports"
                    />
                    {!isCollapsed && openGroups.reports && (
                      <div
                        id="sidebar-group-reports"
                        className="mt-1 ml-2 space-y-1 border-l border-slate-100 pl-3"
                      >
                        <NavItem
                          icon={<FileBarChart size={18} />}
                          label="Stock Report"
                          active={activeTab === "report_stock"}
                          onClick={() => go("report_stock")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                        <NavItem
                          icon={<Truck size={18} />}
                          label="Dispatch Report"
                          active={activeTab === "report_dispatch"}
                          onClick={() => go("report_dispatch")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                        <NavItem
                          icon={<RotateCcw size={18} />}
                          label="Return Report"
                          active={activeTab === "report_return"}
                          onClick={() => go("report_return")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                      </div>
                    )}
                  </div>

                  {/* Top-level Users tab for Superadmin */}
                  {(user.role === UserRole.SUPERADMIN ||
                    user.role === UserRole.ADMIN) && (
                    <div className="pt-2">
                      <NavItem
                        icon={<Shield size={20} />}
                        label="Users"
                        active={activeTab === "users"}
                        onClick={() => go("users")}
                        isCollapsed={isCollapsed}
                      />
                    </div>
                  )}

                  {/* Activity Log — visible to superadmin & admin */}
                  {(user.role === UserRole.SUPERADMIN ||
                    user.role === UserRole.ADMIN) && (
                    <div className="pt-2">
                      <NavItem
                        icon={<Activity size={20} />}
                        label="Activity Log"
                        active={activeTab === "activity_log"}
                        onClick={() => go("activity_log")}
                        isCollapsed={isCollapsed}
                      />
                    </div>
                  )}

                  {/* Accounts & Finance */}
                  <div className="pt-2">
                    <GroupHeader
                      icon={<IndianRupee size={16} />}
                      label="Accounts"
                      groupKey="accounts"
                    />
                    {!isCollapsed && openGroups.accounts && (
                      <div
                        id="sidebar-group-accounts"
                        className="mt-1 ml-2 space-y-1 border-l border-slate-100 pl-3"
                      >
                        <NavItem
                          icon={<Receipt size={18} />}
                          label="Vendor Bill/Invoice"
                          active={activeTab === "vendor_invoice"}
                          onClick={() => go("vendor_invoice")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                        <NavItem
                          icon={<FileText size={18} />}
                          label="Distributor Invoice"
                          active={activeTab === "distributor_invoice"}
                          onClick={() => go("distributor_invoice")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                        <NavItem
                          icon={<AlertTriangle size={18} />}
                          label="Overdue Payments"
                          active={activeTab === "overdue_payments"}
                          onClick={() => go("overdue_payments")}
                          compact
                          isCollapsed={isCollapsed}
                        />
                      </div>
                    )}
                  </div>

                  {/* Terms & Conditions — admin editable */}
                  {(user.role === UserRole.SUPERADMIN ||
                    user.role === UserRole.ADMIN) && (
                    <div className="pt-2">
                      <NavItem
                        icon={<ScrollText size={20} />}
                        label="Terms & Policies"
                        active={activeTab === "terms_page"}
                        onClick={() => go("terms_page")}
                        isCollapsed={isCollapsed}
                      />
                    </div>
                  )}
                  {user.role === UserRole.SUPERADMIN && (
                    <div className="pt-2">
                      <NavItem
                        icon={<Bell size={20} />}
                        label="Notifications"
                        active={activeTab === "notification_settings"}
                        onClick={() => go("notification_settings")}
                        isCollapsed={isCollapsed}
                      />
                    </div>
                  )}
                  {user.role === UserRole.SUPERADMIN && (
                    <div className="pt-2">
                      <NavItem
                        icon={<Plug size={20} />}
                        label="Integrations"
                        active={activeTab === "integrations"}
                        onClick={() => go("integrations")}
                        isCollapsed={isCollapsed}
                      />
                    </div>
                  )}
                </>
              ) : (
                /* Distributor menus */
                <>
                  <NavItem
                    icon={<BookOpen size={20} />}
                    label="Catalogue"
                    active={activeTab === "shop"}
                    onClick={() => go("shop")}
                    isCollapsed={isCollapsed}
                  />
                  <NavItem
                    icon={<ShoppingCart size={20} />}
                    label="My Cart"
                    active={activeTab === "cart"}
                    badge={cartItemsCount > 0 ? cartItemsCount : undefined}
                    onClick={() => go("cart")}
                    isCollapsed={isCollapsed}
                  />
                  <NavItem
                    icon={<Clock size={20} />}
                    label="Order History"
                    active={activeTab === "orders"}
                    onClick={() => go("orders")}
                    isCollapsed={isCollapsed}
                  />
                </>
              )}
              </nav>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`shrink-0 border-t border-slate-100 ${
              isCollapsed ? "p-3" : "p-4"
            }`}
          >
            <button
              type="button"
              onClick={() => go("profile")}
              className={cn(
                "mb-3 flex h-11 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100",
                isCollapsed && "justify-center"
              )}
              aria-label={isCollapsed ? "My Profile" : undefined}
              title={isCollapsed ? "My Profile" : undefined}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 font-bold text-indigo-600">
                {(user.companyName || user.name || "").charAt(0).toUpperCase()}
              </div>

              {!isCollapsed && (
                <div className="overflow-hidden">
                  {/* Distributor: show company name as main, person name as sub */}
                  <p className="text-sm font-semibold truncate text-slate-900">
                    {user.companyName || user.name || ""}
                  </p>
                  <p className="text-xs text-slate-500 truncate capitalize">
                    {user.companyName
                      ? user.name
                      : (user.role || "").toLowerCase()}
                  </p>
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className={cn(
                "flex h-10 w-full items-center gap-3 rounded-xl px-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-100",
                isCollapsed && "justify-center"
              )}
              aria-label={isCollapsed ? "Logout" : undefined}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut size={18} />
              {!isCollapsed && "Logout"}
            </button>
          </div>
        </div>

        {/* Desktop Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute top-1/2 -right-5 cursor-pointer z-30 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-indigo-600 shadow-md transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-lg active:scale-[0.96] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100"
          aria-expanded={!isCollapsed}
          aria-controls="primary-sidebar"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>
    </>
  );
};

export default Sidebar;

/* ---------------- NavItem ---------------- */

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  compact?: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}> = ({
  icon,
  label,
  active,
  badge,
  compact = false,
  onClick,
  isCollapsed,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group/nav flex w-full items-center gap-3 rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-100 active:scale-[0.99]",
      compact ? "h-9" : "h-11",
      isCollapsed ? "justify-center px-2" : "px-3",
      active
        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
    )}
    aria-current={active ? "page" : undefined}
    aria-label={isCollapsed ? label : undefined}
    title={isCollapsed ? label : undefined}
  >
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">{icon}</span>
    {!isCollapsed && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}

    {!isCollapsed && badge !== undefined && (
      <span
        className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
          active ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
        }`}
      >
        {badge}
      </span>
    )}
  </button>
);
