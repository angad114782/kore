import React, { useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import {
  ShoppingBag,
  Package,
  Truck,
  ShoppingCart,
  Clock,
  Loader2,
} from "lucide-react";

import {
  User,
  UserRole,
  Article,
  Order,
  Inventory,
  OrderStatus,
  Assortment,
} from "./types";

import { INITIAL_ARTICLES, MOCK_DISTRIBUTORS, ASSORTMENTS } from "./constants";

import AdminDashboard from "./components/Admin/AdminDashboard";
import MasterInventory from "./components/Admin/MasterInventory";
import BookingInventory from "./components/Admin/BookingInventory";
import OrderProcessor from "./components/Admin/OrderProcessor";
import CatalogueManager from "./components/Admin/CatalogueManager";
import Shop from "./components/Distributor/Shop";
import Wishlist from "./components/Distributor/Wishlist";
import MyOrders from "./components/Distributor/MyOrders";
import Cart from "./components/Distributor/Cart";
import Auth from "./components/Auth";
import POPage from "./components/Admin/POPage";
import GRN from "./components/Admin/GRN";
import ProductMaster from "./components/Admin/ProductMaster";
import VendorManager from "./components/Admin/VendorManager";
import VariantDetailsPage from "./components/Admin/VariantDetailsPage";
import UserManager from "./components/Admin/UserManager";
import DistributorManager from "./components/Admin/DistributorManager";
import ProfilePage from "./components/Admin/ProfilePage";
import Returns from "./components/Admin/Returns";
import ActivityLogPage from "./components/Admin/ActivityLogPage";
import StockReport from "./components/Admin/StockReport";
import DispatchReport from "./components/Admin/DispatchReport";
import ReturnReport from "./components/Admin/ReturnReport";
import AccountantPage from "./components/Admin/AccountantPage";
import PreOrderManager from "./components/Admin/PreOrderManager";
import TermsPage from "./components/Admin/TermsPage";
import NotificationSettings from "./components/Admin/NotificationSettings";
import { masterCatalogService } from "./services/masterCatalogService";
import OverduePayments from "./components/shared/OverduePayments";

// ✅ NEW: Sidebar component (create this file separately)
import Sidebar from "./components/Layout/Sidebar";
import { useKoreStore } from "./store";
import { Toaster, toast } from "sonner";
import Bill from "./components/Admin/Bill";
import { distributorOrderService } from "./services/distributorOrderService";

const App: React.FC = () => {
  const store = useKoreStore();
  const { currentUser: user, checkAuth, isLoadingAuth } = store;

  useEffect(() => {
    checkAuth();
  }, []);

  // Use URL hash for reliable tab persistence
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return hash || localStorage.getItem("kore_activeTab") || "dashboard";
  });

  useEffect(() => {
    localStorage.setItem("kore_activeTab", activeTab);
    window.location.hash = activeTab;

    // Listen for hash changes so browser back/forward buttons work
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && hash !== activeTab) {
        setActiveTab(hash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [activeTab]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMasterForm, setShowMasterForm] = useState(false);

  // Articles state from API
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  // --- Deep Link Draft Persistence ---
  const savedAppDraftStr = localStorage.getItem("kore_app_draft");
  const savedAppDraft = savedAppDraftStr ? JSON.parse(savedAppDraftStr) : null;

  const [editingArticleId, setEditingArticleId] = useState<string | null>(
    savedAppDraft?.editingArticleId || null
  );
  const [viewingVariant, setViewingVariant] = useState<{
    articleId: string;
    variantId: string;
  } | null>(savedAppDraft?.viewingVariant || null);
  const [catalogueExpandedIds, setCatalogueExpandedIds] = useState<Set<string>>(
    new Set(savedAppDraft?.catalogueExpandedIds || [])
  );
  const [previousTab, setPreviousTab] = useState<string>(
    savedAppDraft?.previousTab || "catalogue"
  );

  useEffect(() => {
    localStorage.setItem(
      "kore_app_draft",
      JSON.stringify({
        editingArticleId,
        viewingVariant,
        catalogueExpandedIds: Array.from(catalogueExpandedIds),
        previousTab,
      })
    );
  }, [editingArticleId, viewingVariant, catalogueExpandedIds, previousTab]);

  const handleTabChange = (tab: string) => {
    setShowMasterForm(false);
    setEditingArticleId(null);
    setViewingVariant(null);
    setCatalogueExpandedIds(new Set());
    localStorage.removeItem("kore_app_draft");
    localStorage.removeItem("kore_po_draft");
    setActiveTab(tab);
  };

  const handleViewVariant = (articleId: string, variantId: string) => {
    setPreviousTab("catalogue");
    setViewingVariant({ articleId, variantId });
    setActiveTab("variant_details");
  };

  const handleEditArticle = (id: string) => {
    setPreviousTab(activeTab);
    setEditingArticleId(id);
    setShowMasterForm(true);
    setActiveTab("catalogue");
  };

  const handleAddNewMaster = () => {
    setPreviousTab("catalogue");
    setEditingArticleId(null);
    setShowMasterForm(true);
    setActiveTab("catalogue");
  };

  const fetchArticles = async () => {
    try {
      setLoadingArticles(true);
      const res = await masterCatalogService.listMasterItems();
      const mapped = res.data.map((item: any) => {
        // Normalize variants: convert sizeMap -> sizeSkus/sizeQuantities
        const normalizedVariants = (item.variants || []).map((v: any) => {
          const sizeSkus: Record<string, string> = v.sizeSkus || {};
          const sizeQuantities: Record<string, number> = v.sizeQuantities || {};
          
          // Legacy Fallback: If new dedicated fields are missing, try to restore from sizeMap
          if (Object.keys(sizeQuantities).length === 0 && v.sizeMap) {
            Object.entries(v.sizeMap).forEach(([sz, cell]: [string, any]) => {
              sizeSkus[sz] = cell.sku || "";
              sizeQuantities[sz] = cell.qty || 0;
            });
          }

          return {
            ...v,
            id: v._id || Math.random().toString(36).substr(2, 9),
            sizeSkus,
            sizeQuantities,
          };
        });

        // Use Article's own SKU if available (from backend or master creation)
        const topSku = item.sku || "";

        return {
          id: item._id,
          sku: topSku,
          name: item.articleName,
          category: item.gender,
          assortmentId: item.assortmentId || "",
          productCategory: item.categoryId?.name,
          brand: item.brandId?.name,
          pricePerPair: item.variants?.[0]?.sellingPrice || item.mrp,
          mrp: item.mrp,
          soleColor: item.soleColor,
          manufacturer: item.manufacturerCompanyId?.name,
          unit: item.unitId?.name,
          status: item.stage,
          expectedDate: item.expectedAvailableDate
            ? new Date(item.expectedAvailableDate).toISOString().split("T")[0]
            : "",
          imageUrl: item.primaryImage?.url,
          secondaryImages: item.secondaryImages || [],
          selectedSizes: item.sizeRanges || [],
          selectedColors: item.productColors || [],
          colorMedia: item.colorMedia || [],
          variants: normalizedVariants,
          isActive: item.isActive !== false,
        };
      });
      setArticles(mapped);
    } catch (err) {
      console.error("Failed to fetch articles", err);
    } finally {
      setLoadingArticles(false);
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchArticlesRef.current = fetchArticles;
  }, []);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ── Refs to avoid stale closures inside socket handlers ──
  const userRef = React.useRef(user);
  userRef.current = user;  // always the latest user

  const checkAuthRef = React.useRef(checkAuth);
  checkAuthRef.current = checkAuth;

  // Fetch orders (defined outside useEffect so it can be referenced)
  const fetchOrdersRef = React.useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);
  const fetchArticlesRef = React.useRef<(() => Promise<void>) | undefined>(undefined);

  // Fetch orders with socket.io for real-time updates
  useEffect(() => {
    if (!user) return;

    const fetchOrders = async (silent = false) => {
      if (!silent) setLoadingOrders(true);
      try {
        let items: Order[] = [];
        if (user.role === UserRole.DISTRIBUTOR) {
          const res = await distributorOrderService.getOrdersByDistributor(user.id, { limit: 1000 });
          items = res.items;
        } else {
          const res = await distributorOrderService.getAllOrders({ limit: 1000 });
          items = res.items;
        }
        setOrders(items);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to fetch orders", err);
      } finally {
        if (!silent) setLoadingOrders(false);
      }
    };

    fetchOrdersRef.current = fetchOrders;

    // Initial fetch
    fetchOrders();
  }, [user?.id, user?.role]);

  // ── Stable socket connection (does NOT depend on `user`) ──
  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5005/api";
    const socketBase = API_BASE_URL.replace("/api", "");
    const socket = io(socketBase);

    socket.on("connect", () => {
      console.log("🔌 Connected to socket server");
    });

    socket.on("orderUpdated", (data) => {
      console.log("📦 Order update received:", data);
      const u = userRef.current;
      if (!u) return;

      const isDistributor = u.role === UserRole.DISTRIBUTOR;
      const orderId = String(data.orderId);
      const distributorId = String(data.distributorId);
      
      const isMyOrder = distributorId === String(u.id) || distributorId === String(u.distributorId);

      // Distributors only care about their own orders
      if (isDistributor && !isMyOrder) return;
      
      toast.success(`Order Update: ${orderId.slice(-6).toUpperCase()}`, {
        description: `Status changed to ${data.status?.replace(/_/g, ' ') || 'updated'}`,
        duration: 3000
      });

      // Re-fetch orders for data consistency
      if (fetchOrdersRef.current) {
        fetchOrdersRef.current(true);
      }

      // Always refresh credit limits for distributors
      if (isDistributor) {
        checkAuthRef.current?.(true);
      }
    });

    socket.on("distributorUpdated", (data) => {
      console.log("👤 Distributor profile update received:", data);
      const u = userRef.current;
      if (!u || u.role !== UserRole.DISTRIBUTOR) return;

      if (
        String(data.distributorId) === String(u.distributorId) ||
        String(data.distributorId) === String(u.id)
      ) {
        checkAuthRef.current?.(true);
      }
    });

    socket.on("activityLog", (data) => {
      const u = userRef.current;
      // Only show real-time alerts to admin/superadmin/manager
      if (!u || u.role === UserRole.DISTRIBUTOR) return;

      const label = (data.action as string).replace(/_/g, " ");
      toast.info(`${label}`, {
        description: data.description,
        duration: 4000,
      });
    });

    socket.on("grnSubmitted", (data) => {
      const u = userRef.current;
      if (!u || u.role === UserRole.DISTRIBUTOR) return;
      toast.info(`GRN #${data.grnNumber} submitted`, {
        description: `Vendor: ${data.vendorName || ""} · ${data.totalPairs || ""} pairs`,
        duration: 4000,
      });
      if (fetchArticlesRef.current) fetchArticlesRef.current();
      window.dispatchEvent(new CustomEvent("grnRefetch"));
    });

    socket.on("poCreated", (data) => {
      const u = userRef.current;
      if (!u || u.role === UserRole.DISTRIBUTOR) return;
      toast.info(`PO #${data.poNumber} created`, { description: `Vendor: ${data.vendorName}`, duration: 4000 });
      window.dispatchEvent(new CustomEvent("poRefetch"));
    });

    socket.on("poUpdated", (data) => {
      const u = userRef.current;
      if (!u || u.role === UserRole.DISTRIBUTOR) return;
      toast.info(`PO #${data.poNumber} updated`, { duration: 3000 });
      window.dispatchEvent(new CustomEvent("poRefetch"));
    });

    socket.on("billApproved", (data) => {
      const u = userRef.current;
      if (!u || u.role === UserRole.DISTRIBUTOR) return;
      toast.success(`Bill Approved: PO #${data.poNumber}`, { description: data.vendorName, duration: 4000 });
    });

    socket.on("billRejected", (data) => {
      const u = userRef.current;
      if (!u || u.role === UserRole.DISTRIBUTOR) return;
      toast.error(`Bill Rejected: PO #${data.poNumber}`, { description: data.reason || "", duration: 4000 });
    });

    socket.on("catalogUpdated", () => {
      if (fetchArticlesRef.current) fetchArticlesRef.current();
    });

    socket.on("returnCreated", (data) => {
      const u = userRef.current;
      if (!u) return;
      if (u.role === UserRole.DISTRIBUTOR) {
        // Only notify the distributor whose return it is
        const isMyReturn =
          String(data.distributorId) === String(u.id) ||
          String(data.distributorId) === String(u.distributorId);
        if (!isMyReturn) return;
        toast.info(`Return #${data.returnNumber} submitted`, {
          description: `${data.totalPairs} pairs — Order #${data.orderNumber}`,
          duration: 4000,
        });
      } else {
        // Admin / superadmin — show all returns
        toast.info(`New Return: #${data.returnNumber}`, {
          description: `${data.distributorName} · ${data.totalPairs} pairs`,
          duration: 5000,
        });
        if (fetchOrdersRef.current) fetchOrdersRef.current(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Empty deps = socket connects ONCE, never reconnects

  // ── Periodic credit refresh when distributor is on the cart tab ──
  useEffect(() => {
    if (!user || user.role !== UserRole.DISTRIBUTOR) return;
    if (activeTab !== "cart") return;

    // Refresh credit immediately when entering cart
    checkAuth(true);

    // Then poll every 10 seconds as a reliable fallback
    const interval = setInterval(() => {
      checkAuthRef.current?.(true);
    }, 10_000);

    return () => clearInterval(interval);
  }, [activeTab, user?.id]);

  // Initialize inventory based on articles
  const [inventory, setInventory] = useState<Inventory[]>(() => {
    const saved = localStorage.getItem("kore_inventory");
    if (saved) return JSON.parse(saved);

    return articles.map((a) => ({
      articleId: a.id,
      actualStock: 100,
      reservedStock: 0,
      blockedStock: 0,
      availableStock: 100,
    }));
  });

  // Cart items now track variants and size breakdowns instead of simple carton counts
  type CartItem = {
    articleId: string;
    variantId?: string;
    sizeQuantities?: Record<string, number>;
    cartonCount: number;
    pairCount: number;
    price: number;
  };

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("kore_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("kore_cart", JSON.stringify(cart));
  }, [cart]);

  // PERSISTENCE
  useEffect(() => {
    if (user) {
      localStorage.setItem("kore_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("kore_user");
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("kore_articles", JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem("kore_inventory", JSON.stringify(inventory));
  }, [inventory]);

  // Ensure inventory exists for all articles (useful when adding new articles)
  useEffect(() => {
    setInventory((prev) => {
      const existingIds = prev.map((i) => i.articleId);
      const newArticles = articles.filter((a) => !existingIds.includes(a.id));
      if (newArticles.length === 0) return prev;

      const newInventoryItems = newArticles.map((a) => ({
        articleId: a.id,
        actualStock: 0,
        reservedStock: 0,
        blockedStock: 0,
        availableStock: 0,
      }));
      return [...prev, ...newInventoryItems];
    });
  }, [articles]);

  // DERIVED STATE
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price, 0);
  }, [cart]);

  const cartItemsCount = useMemo(() => {
    // show total cartons in cart for badge/checkout button
    return cart.reduce((sum, item) => sum + item.cartonCount, 0);
  }, [cart]);

  // ACTIONS
  const handleLogin = async (email: string, password: string) => {
    await store.login(email, password);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    store.logout();
    setCart([]);
  };

  // Catalogue Actions
  const addArticle = (article: Article) => {
    setArticles((prev) => [article, ...prev]);
  };

  const updateArticle = (article: Article) => {
    setArticles((prev) => prev.map((a) => (a.id === article.id ? article : a)));
  };

  const deleteArticle = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this master article?"))
      return;

    const deletePromise = async () => {
      await masterCatalogService.deleteMasterItem(id);
      setArticles((prev) => prev.filter((a) => a.id !== id));
      setInventory((prev) => prev.filter((i) => i.articleId !== id));
      setCart((prev) => prev.filter((i) => i.articleId !== id));
    };

    toast.promise(deletePromise(), {
      loading: "Deleting article...",
      success: "Article deleted successfully",
      error: (err: any) => err.message || "Failed to delete article",
    });
  };

  const handleReturnSuccess = async () => {
    // Refresh articles (for stock updates)
    await fetchArticles();
    // Refresh orders (to reflect the new return records and order status changes)
    await fetchOrdersRef.current?.(true);
  };

  // add given sizeQuantities for a particular variant
  const addToCart = (
    articleId: string,
    variantId: string | undefined,
    sizeQuantities: Record<string, number>
  ) => {
    const pairCount = Object.values(sizeQuantities).reduce(
      (s, v) => s + Number(v || 0),
      0
    );
    if (pairCount === 0 || pairCount % 24 !== 0) {
      toast.error("Total pairs must be a positive multiple of 24");
      return;
    }
    const cartonCount = pairCount / 24;

    setCart((prev) => {
      const existing = prev.find(
        (i) => i.articleId === articleId && i.variantId === variantId
      );
      if (existing) {
        const newPairs = existing.pairCount + pairCount;
        return prev.map((i) =>
          i.articleId === articleId && i.variantId === variantId
            ? {
                ...i,
                cartonCount: i.cartonCount + cartonCount,
                pairCount: newPairs,
                price:
                  newPairs *
                  (articles.find((a) => a.id === articleId)?.pricePerPair || 0),
                sizeQuantities: {
                  ...(existing.sizeQuantities || {}),
                  ...sizeQuantities,
                },
              }
            : i
        );
      }
      return [
        ...prev,
        {
          articleId,
          variantId,
          sizeQuantities,
          cartonCount,
          pairCount,
          price:
            pairCount *
            (articles.find((a) => a.id === articleId)?.pricePerPair || 0),
        },
      ];
    });
  };

  // remove an entire variant entry from cart
  const removeFromCart = (articleId: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter(
        (i) => !(i.articleId === articleId && i.variantId === variantId)
      )
    );
  };

  const clearCartItem = (articleId: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter(
        (i) => !(i.articleId === articleId && i.variantId === variantId)
      )
    );
  };

  const handleInwardStock = (articleId: string, cartons: number) => {
    setInventory((prev) =>
      prev.map((inv) => {
        if (inv.articleId === articleId) {
          const newActual = inv.actualStock + cartons;
          return {
            ...inv,
            actualStock: newActual,
            availableStock: newActual - inv.reservedStock,
          };
        }
        return inv;
      })
    );
  };

  const handleOutwardStock = (articleId: string, cartons: number) => {
    setInventory((prev) =>
      prev.map((inv) => {
        if (inv.articleId === articleId) {
          const newActual = Math.max(0, inv.actualStock - cartons);
          return {
            ...inv,
            actualStock: newActual,
            availableStock: newActual - inv.reservedStock,
          };
        }
        return inv;
      })
    );
  };

  const placeOrder = async (gstPercent: number = 5) => {
    if (!user || cart.length === 0) return;

    const availableItems = cart.filter(i => {
      const art = articles.find(a => a.id === i.articleId);
      return art?.status === "AVAILABLE";
    });

    const wishlistItems = cart.filter(i => {
      const art = articles.find(a => a.id === i.articleId);
      return art?.status !== "AVAILABLE";
    });

    const placePromise = async () => {
      await checkAuth(true);
      const freshUser = store.currentUser;

      // ── Credit check (only for AVAILABLE items) ──
      if (freshUser?.role === UserRole.DISTRIBUTOR && availableItems.length > 0) {
        const availCredit = freshUser.availableCredit ?? 0;
        const discPct = freshUser.discountPercentage || 0;
        const orderTotal = availableItems.reduce((sum, i) => sum + i.price, 0);
        const finalAmt = orderTotal - (orderTotal * discPct) / 100;

        if (availCredit === 0) throw new Error("No credit limit available. Contact administrator.");
        if (finalAmt > availCredit) throw new Error(`Credit limit exceeded. Available: ₹${availCredit.toLocaleString()}, Required: ₹${finalAmt.toLocaleString()}`);
      }

      const placed: Order[] = [];

      // ── Place REGULAR order for AVAILABLE items ──
      if (availableItems.length > 0) {
        const payload: Partial<Order> = {
          distributorId: user.id,
          distributorName: user.name,
          date: new Date().toISOString().split("T")[0],
          status: OrderStatus.PENDING,
          orderType: "REGULAR",
          items: availableItems.map(item => ({
            articleId: item.articleId, variantId: item.variantId,
            sizeQuantities: item.sizeQuantities,
            cartonCount: item.cartonCount, pairCount: item.pairCount, price: item.price,
          })),
          totalAmount: availableItems.reduce((s, i) => s + i.price, 0),
          totalCartons: availableItems.reduce((s, i) => s + i.cartonCount, 0),
          totalPairs: availableItems.reduce((s, i) => s + i.pairCount, 0),
        };
        const res = await distributorOrderService.placeOrder(payload);
        placed.push({ ...res, id: (res as any)._id || res.id });
      }

      // ── Place PRE-ORDER for PRE-ORDER (WISHLIST) items ──
      if (wishlistItems.length > 0) {
        const prePayload: Partial<Order> = {
          distributorId: user.id,
          distributorName: user.name,
          date: new Date().toISOString().split("T")[0],
          status: OrderStatus.PRE_BOOKED,
          orderType: "PREORDER",
          items: wishlistItems.map(item => ({
            articleId: item.articleId, variantId: item.variantId,
            sizeQuantities: item.sizeQuantities,
            cartonCount: item.cartonCount, pairCount: item.pairCount, price: item.price,
          })),
          totalAmount: wishlistItems.reduce((s, i) => s + i.price, 0),
          totalCartons: wishlistItems.reduce((s, i) => s + i.cartonCount, 0),
          totalPairs: wishlistItems.reduce((s, i) => s + i.pairCount, 0),
        };
        const res2 = await distributorOrderService.placeOrder(prePayload);
        placed.push({ ...res2, id: (res2 as any)._id || res2.id });
      }

      setOrders(prev => [...placed, ...prev]);
      setCart([]);
      setActiveTab("orders");
      await checkAuth(true);

      const parts = [];
      if (availableItems.length > 0) parts.push("Order placed");
      if (wishlistItems.length > 0) parts.push("Pre-order placed");
      return parts.join(" & ");
    };

    toast.promise(placePromise(), {
      loading: "Placing order...",
      success: (msg) => msg as string,
      error: (err: any) => err?.response?.data?.message || err?.message || "Failed to place order",
    });
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const updatePromise = async () => {
      const updatedOrder = await distributorOrderService.updateOrderStatus(orderId, status);

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId || (o as any)._id === orderId) {
            // dispatch: deduct actual + release reserved (only once)
            if (
              status === OrderStatus.OFD &&
              o.status !== OrderStatus.OFD
            ) {
              setInventory((invs) =>
                invs.map((inv) => {
                  const item = o.items.find(
                    (i) => i.articleId === inv.articleId
                  );
                  if (item) {
                    const newActual = inv.actualStock - item.cartonCount;
                    const newReserved = inv.reservedStock - item.cartonCount;
                    return {
                      ...inv,
                      actualStock: newActual,
                      reservedStock: newReserved,
                      availableStock: newActual - newReserved,
                    };
                  }
                  return inv;
                })
              );
            }
            return updatedOrder || { ...o, status };
          }
          return o;
        })
      );
    };

    toast.promise(updatePromise(), {
      loading: "Updating order status...",
      success: `Order ${orderId} marked as ${status.replace(/_/g, " ")}`,
      error: "Failed to update order status",
    });
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative overflow-x-hidden">
      {/* ✅ Sidebar extracted */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        cartItemsCount={cartItemsCount}
        onLogout={handleLogout}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Content */}
      <main
        className={`flex-1 p-4 md:p-8 pt-20 md:pt-8 transition-all duration-300
  ${isCollapsed ? "md:ml-20" : "md:ml-64"}
`}
      >
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold capitalize text-slate-900">
              {activeTab.replace(/_/g, " ")}
            </h2>
            {/* <p className="text-slate-500 text-sm">
              Kore Kollective Distribution Portal
            </p> */}
          </div>
        </header>

        {/* Content Router */}
        {activeTab === "dashboard" &&
          (user.role !== UserRole.DISTRIBUTOR ? (
            <div className="space-y-6">
              <AdminDashboard
                orders={orders}
                inventory={inventory}
                articles={articles}
                updateStatus={updateOrderStatus}
                loadingOrders={loadingOrders}
                lastUpdated={lastUpdated}
                onSeeAllOverdue={() => handleTabChange("accounts")}
              />
            </div>
          ) : (
            <DistributorDashboard
              user={user}
              orders={orders}
              cartCount={cartItemsCount}
              goToCart={() => setActiveTab("cart")}
            />
          ))}

        {activeTab === "catalogue" && user.role !== UserRole.DISTRIBUTOR && (
          showMasterForm ? (
            <ProductMaster
              addArticle={addArticle}
              updateArticle={updateArticle}
              editingId={editingArticleId}
              initialArticle={articles.find(a => a.id === editingArticleId)}
              onSuccess={() => {
                fetchArticles();
                if (!editingArticleId) setShowMasterForm(false);
              }}
              onCancelEdit={() => {
                setEditingArticleId(null);
                setShowMasterForm(false);
                if (previousTab === "variant_details") setActiveTab("variant_details");
              }}
            />
          ) : (
            <CatalogueManager
              articles={articles}
              addArticle={addArticle}
              updateArticle={updateArticle}
              deleteArticle={deleteArticle}
              onEditArticle={handleEditArticle}
              onViewVariant={handleViewVariant}
              expandedIds={catalogueExpandedIds}
              setExpandedIds={setCatalogueExpandedIds}
              onSuccess={fetchArticles}
              onAddNewMaster={handleAddNewMaster}
            />
          )
        )}

        {activeTab === "variant_details" &&
          viewingVariant &&
          user.role !== UserRole.DISTRIBUTOR &&
          (() => {
            const art = articles.find((a) => a.id === viewingVariant.articleId);
            const vari = art?.variants?.find(
              (v) => v.id === viewingVariant.variantId
            );
            if (!art || !vari)
              return (
                <div className="text-center text-slate-400 py-12">
                  Variant not found.
                </div>
              );
            return (
              <VariantDetailsPage
                article={art}
                variant={vari}
                onBack={() => {
                  setViewingVariant(null);
                  setActiveTab("catalogue");
                }}
                onEditArticle={handleEditArticle}
                onDelete={(id) => {
                  deleteArticle(id);
                  setViewingVariant(null);
                  setActiveTab("catalogue");
                }}
              />
            );
          })()}
        {activeTab === "po" && user.role !== UserRole.DISTRIBUTOR && (
          <POPage articles={articles} onSyncSuccess={fetchArticles} />
        )}
        {activeTab === "grn" && user.role !== UserRole.DISTRIBUTOR && <GRN />}
        {activeTab === "accounts" && user.role !== UserRole.DISTRIBUTOR && (
          <AccountantPage />
        )}

        {/* Legacy redirect — bills tab still works */}
        {activeTab === "bills" && user.role !== UserRole.DISTRIBUTOR && (
          <AccountantPage />
        )}
        {activeTab === "vendors" && user.role !== UserRole.DISTRIBUTOR && (
          <VendorManager />
        )}
        {activeTab === "users" && user.role === UserRole.SUPERADMIN && (
          <UserManager />
        )}
        {activeTab === "master_inventory" &&
          user.role !== UserRole.DISTRIBUTOR && (
            <MasterInventory
              inventory={inventory}
              articles={articles}
              onInward={handleInwardStock}
              onOutward={handleOutwardStock}
              onRefresh={fetchArticles}
            />
          )}

        {activeTab === "booking_inventory" &&
          user.role !== UserRole.DISTRIBUTOR && (
            <BookingInventory
              inventory={inventory}
              articles={articles}
              orders={orders}
            />
          )}

        {activeTab === "orders" &&
          (user.role !== UserRole.DISTRIBUTOR ? (
            <OrderProcessor
              updateStatus={updateOrderStatus}
              articles={articles}
              inventory={inventory}
              isLoading={loadingOrders}
              lastUpdated={lastUpdated}
            />
          ) : (
            <MyOrders
              userId={user.id}
              articles={articles}
              inventory={inventory}
              isLoading={loadingOrders}
              lastUpdated={lastUpdated}
            />
          ))}

        {activeTab === "pre_orders" && user.role !== UserRole.DISTRIBUTOR && (
          <PreOrderManager articles={articles} />
        )}

        {activeTab === "returns" && user.role !== UserRole.DISTRIBUTOR && (
          <Returns orders={orders} articles={articles} onSuccess={handleReturnSuccess} onInward={handleInwardStock} />
        )}

        {activeTab === "shop" && user.role === UserRole.DISTRIBUTOR && (
          <Shop
            articles={articles}
            inventory={inventory}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            goToCart={() => setActiveTab("cart")}
            user={user}
          />
        )}

        {activeTab === "preorder" && user.role === UserRole.DISTRIBUTOR && (
          <Wishlist articles={articles} addToCart={addToCart} />
        )}

        {activeTab === "cart" && user.role === UserRole.DISTRIBUTOR && (
          <Cart
            articles={articles}
            cart={cart}
            clearCartItem={clearCartItem}
            onCheckout={(gst) => placeOrder(gst)}
            total={cartTotal}
            assortments={ASSORTMENTS as Assortment[]}
            user={user}
          />
        )}

        {activeTab === "distributors" && user.role !== UserRole.DISTRIBUTOR && (
          <DistributorManager orders={orders} />
        )}

        {activeTab === "profile" && user && (
          <ProfilePage
            user={user}
            onProfileUpdate={(updatedUser) => {
              store.setCurrentUser(updatedUser);
            }}
          />
        )}

        {activeTab === "activity_log" && user.role !== UserRole.DISTRIBUTOR && (
          <ActivityLogPage />
        )}

        {activeTab === "report_stock"    && user.role !== UserRole.DISTRIBUTOR && <StockReport />}
        {activeTab === "report_dispatch" && user.role !== UserRole.DISTRIBUTOR && <DispatchReport />}
        {activeTab === "report_return"   && user.role !== UserRole.DISTRIBUTOR && <ReturnReport />}

        {activeTab === "overdue_payments" && user.role !== UserRole.DISTRIBUTOR && (
          <AccountantPage />
        )}

        {activeTab === "terms_page" && user.role !== UserRole.DISTRIBUTOR && (
          <TermsPage />
        )}

        {activeTab === "notification_settings" && user.role === UserRole.SUPERADMIN && (
          <NotificationSettings />
        )}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
};

/* ---------------- DistributorDashboard + StatCard (same file) ---------------- */

const DistributorDashboard: React.FC<{
  user: User;
  orders: Order[];
  cartCount: number;
  goToCart: () => void;
}> = ({ user, orders, cartCount, goToCart }) => {
  const userOrders = orders.filter((o) => o.distributorId === user.id);
  const pending = userOrders.filter(
    (o) => o.status === OrderStatus.BOOKED || o.status === OrderStatus.PFD || o.status === OrderStatus.RFD
  ).length;
  const dispatched = userOrders.filter(
    (o) => o.status === OrderStatus.OFD || o.status === OrderStatus.RECEIVED
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="My Orders"
          value={userOrders.length}
          icon={<ShoppingBag className="text-indigo-600" />}
        />
        <StatCard
          label="Pending"
          value={pending}
          icon={<Clock className="text-amber-600" />}
        />
        <StatCard
          label="In Transit"
          value={dispatched}
          icon={<Truck className="text-emerald-600" />}
        />
        <div
          onClick={goToCart}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
        >
          <div>
            <p className="text-slate-500 text-sm font-medium">Cart Balance</p>
            <p className="text-3xl font-bold mt-1 text-slate-900 group-hover:text-indigo-600 transition-colors">
              {cartCount}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-100">
            <ShoppingCart className="text-indigo-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shipments */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Shipments</h3>
          </div>

          {userOrders.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <Package className="text-slate-200 mb-2" size={40} />
              <p className="text-slate-400 text-sm">No recent bookings found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-indigo-50/20 transition-colors border border-transparent hover:border-indigo-100"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${
                      order.status === OrderStatus.OFD || order.status === OrderStatus.RECEIVED
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-indigo-100 text-indigo-600"
                    }`}>
                      {order.status === OrderStatus.OFD || order.status === OrderStatus.RECEIVED
                        ? <Truck size={20} />
                        : <Clock size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{order.orderNumber || order.id}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{order.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">₹{order.totalAmount.toLocaleString()}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${
                      order.status === OrderStatus.OFD || order.status === OrderStatus.RECEIVED
                        ? "text-emerald-600" : "text-indigo-600"
                    }`}>
                      {order.status.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue Payments */}
        <OverduePayments isAdmin={false} />
      </div>

    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1 text-slate-900">{value}</p>
    </div>
    <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
  </div>
);

export default App;
