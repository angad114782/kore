
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  LogOut, 
  Plus, 
  ShoppingCart,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  Map as MapIcon,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Database,
  ClipboardList,
  Layers,
  Menu,
  X
} from 'lucide-react';
import { 
  User, 
  UserRole, 
  Article, 
  Order, 
  Inventory, 
  OrderStatus, 
  OrderItem,
  Assortment
} from './types';
import { INITIAL_ARTICLES, MOCK_DISTRIBUTORS, ASSORTMENTS } from './constants';
import AdminDashboard from './components/Admin/AdminDashboard';
import MasterInventory from './components/Admin/MasterInventory';
import BookingInventory from './components/Admin/BookingInventory';
import OrderProcessor from './components/Admin/OrderProcessor';
import CatalogueManager from './components/Admin/CatalogueManager';
import Shop from './components/Distributor/Shop';
import MyOrders from './components/Distributor/MyOrders';
import Cart from './components/Distributor/Cart';
import Auth from './components/Auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kore_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Articles state - now mutable
  const [articles, setArticles] = useState<Article[]>(() => {
    const saved = localStorage.getItem('kore_articles');
    return saved ? JSON.parse(saved) : INITIAL_ARTICLES;
  });

  const [orders, setOrders] = useState<Order[]>([]);
  
  // Initialize inventory based on articles
  const [inventory, setInventory] = useState<Inventory[]>(() => {
    const saved = localStorage.getItem('kore_inventory');
    if (saved) return JSON.parse(saved);
    
    return articles.map(a => ({
      articleId: a.id,
      actualStock: 100,
      reservedStock: 0,
      availableStock: 100
    }));
  });

  const [cart, setCart] = useState<{ articleId: string; cartons: number }[]>([]);

  // PERSISTENCE
  useEffect(() => {
    if (user) {
      localStorage.setItem('kore_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kore_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('kore_articles', JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem('kore_inventory', JSON.stringify(inventory));
  }, [inventory]);

  // Ensure inventory exists for all articles (useful when adding new articles)
  useEffect(() => {
    setInventory(prev => {
      const existingIds = prev.map(i => i.articleId);
      const newArticles = articles.filter(a => !existingIds.includes(a.id));
      if (newArticles.length === 0) return prev;
      
      const newInventoryItems = newArticles.map(a => ({
        articleId: a.id,
        actualStock: 0,
        reservedStock: 0,
        availableStock: 0
      }));
      return [...prev, ...newInventoryItems];
    });
  }, [articles]);

  // DERIVED STATE
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const article = articles.find(a => a.id === item.articleId);
      return total + (article ? article.pricePerPair * 24 * item.cartons : 0);
    }, 0);
  }, [cart, articles]);

  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.cartons, 0);
  }, [cart]);

  // ACTIONS
  const handleLogin = (userData: User) => {
    setUser(userData);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
  };

  // Catalogue Actions
  const addArticle = (article: Article) => {
    setArticles(prev => [article, ...prev]);
  };

  const updateArticle = (article: Article) => {
    setArticles(prev => prev.map(a => a.id === article.id ? article : a));
  };

  const deleteArticle = (id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id));
    setInventory(prev => prev.filter(i => i.articleId !== id));
    setCart(prev => prev.filter(i => i.articleId !== id));
  };

  const addToCart = (articleId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.articleId === articleId);
      if (existing) {
        return prev.map(i => i.articleId === articleId ? { ...i, cartons: i.cartons + 1 } : i);
      }
      return [...prev, { articleId, cartons: 1 }];
    });
  };

  const removeFromCart = (articleId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.articleId === articleId);
      if (existing?.cartons === 1) {
        return prev.filter(i => i.articleId !== articleId);
      }
      return prev.map(i => i.articleId === articleId ? { ...i, cartons: i.cartons - 1 } : i);
    });
  };

  const clearCartItem = (articleId: string) => {
    setCart(prev => prev.filter(i => i.articleId !== articleId));
  };

  const handleInwardStock = (articleId: string, cartons: number) => {
    setInventory(prev => prev.map(inv => {
      if (inv.articleId === articleId) {
        const newActual = inv.actualStock + cartons;
        return {
          ...inv,
          actualStock: newActual,
          availableStock: newActual - inv.reservedStock
        };
      }
      return inv;
    }));
  };

  const handleOutwardStock = (articleId: string, cartons: number) => {
    setInventory(prev => prev.map(inv => {
      if (inv.articleId === articleId) {
        const newActual = Math.max(0, inv.actualStock - cartons);
        return {
          ...inv,
          actualStock: newActual,
          availableStock: newActual - inv.reservedStock
        };
      }
      return inv;
    }));
  };

  const placeOrder = () => {
    if (!user || cart.length === 0) return;

    const newOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      distributorId: user.id,
      distributorName: user.name,
      date: new Date().toISOString().split('T')[0],
      status: OrderStatus.BOOKED,
      items: cart.map(item => {
        const article = articles.find(a => a.id === item.articleId)!;
        return {
          articleId: item.articleId,
          cartonCount: item.cartons,
          pairCount: item.cartons * 24,
          price: article.pricePerPair * 24 * item.cartons
        };
      }),
      totalAmount: cartTotal,
      totalCartons: cartItemsCount,
      totalPairs: cartItemsCount * 24
    };

    setOrders(prev => [newOrder, ...prev]);
    
    setInventory(prev => prev.map(inv => {
      const cartItem = cart.find(ci => ci.articleId === inv.articleId);
      if (cartItem) {
        const newReserved = inv.reservedStock + cartItem.cartons;
        return {
          ...inv,
          reservedStock: newReserved,
          availableStock: inv.actualStock - newReserved
        };
      }
      return inv;
    }));

    setCart([]);
    setActiveTab('orders');
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        if (status === OrderStatus.DISPATCHED && o.status !== OrderStatus.DISPATCHED) {
          setInventory(invs => invs.map(inv => {
            const item = o.items.find(i => i.articleId === inv.articleId);
            if (item) {
              const newActual = inv.actualStock - item.cartonCount;
              const newReserved = inv.reservedStock - item.cartonCount;
              return {
                ...inv,
                actualStock: newActual,
                reservedStock: newReserved,
                availableStock: newActual - newReserved
              };
            }
            return inv;
          }));
        }
        return { ...o, status };
      }
      return o;
    }));
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 relative overflow-x-hidden">
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between p-4 bg-white border-b border-slate-200 z-30 h-16">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
            <Package className="text-white" size={18} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Kore <span className="text-indigo-600">Kollective</span></h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-20
        w-64 h-screen bg-white border-r border-slate-200 
        flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 pt-16 md:pt-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
              <Package className="text-white" size={24} />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Kore <span className="text-indigo-600">Kollective</span></h1>
          </div>

          <nav className="space-y-1">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
            />
            {user.role === UserRole.ADMIN ? (
              <>
                <NavItem 
                  icon={<Layers size={20} />} 
                  label="Catalogue" 
                  active={activeTab === 'catalogue'} 
                  onClick={() => { setActiveTab('catalogue'); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Database size={20} />} 
                  label="Master Stock" 
                  active={activeTab === 'master_inventory'} 
                  onClick={() => { setActiveTab('master_inventory'); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<ClipboardList size={20} />} 
                  label="Booking Status" 
                  active={activeTab === 'booking_inventory'} 
                  onClick={() => { setActiveTab('booking_inventory'); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Truck size={20} />} 
                  label="All Orders" 
                  active={activeTab === 'orders'} 
                  onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Users size={20} />} 
                  label="Distributors" 
                  active={activeTab === 'distributors'} 
                  onClick={() => { setActiveTab('distributors'); setIsSidebarOpen(false); }} 
                />
              </>
            ) : (
              <>
                <NavItem 
                  icon={<ShoppingBag size={20} />} 
                  label="Catalogue" 
                  active={activeTab === 'shop'} 
                  onClick={() => { setActiveTab('shop'); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<ShoppingCart size={20} />} 
                  label="My Cart" 
                  active={activeTab === 'cart'} 
                  badge={cartItemsCount > 0 ? cartItemsCount : undefined}
                  onClick={() => { setActiveTab('cart'); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Clock size={20} />} 
                  label="Order History" 
                  active={activeTab === 'orders'} 
                  onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }} 
                />
              </>
            )}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 border border-indigo-100">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors w-full p-2 hover:bg-red-50 rounded-lg"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 md:ml-64 transition-all duration-300">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold capitalize text-slate-900">{activeTab.replace(/_/g, ' ')}</h2>
            <p className="text-slate-500 text-sm">Kore Kollective Distribution Portal</p>
          </div>
        </header>

        {/* Content Router */}
        {activeTab === 'dashboard' && (
          user.role === UserRole.ADMIN 
          ? <AdminDashboard orders={orders} inventory={inventory} articles={articles} />
          : <DistributorDashboard user={user} orders={orders} cartCount={cartItemsCount} goToCart={() => setActiveTab('cart')} />
        )}

        {activeTab === 'catalogue' && user.role === UserRole.ADMIN && (
          <CatalogueManager 
            articles={articles} 
            addArticle={addArticle} 
            updateArticle={updateArticle} 
            deleteArticle={deleteArticle} 
          />
        )}

        {activeTab === 'master_inventory' && user.role === UserRole.ADMIN && (
          <MasterInventory 
            inventory={inventory} 
            articles={articles} 
            onInward={handleInwardStock} 
            onOutward={handleOutwardStock} 
          />
        )}

        {activeTab === 'booking_inventory' && user.role === UserRole.ADMIN && (
          <BookingInventory inventory={inventory} articles={articles} orders={orders} />
        )}

        {activeTab === 'orders' && (
          user.role === UserRole.ADMIN 
          ? <OrderProcessor orders={orders} updateStatus={updateOrderStatus} articles={articles} />
          : <MyOrders orders={orders.filter(o => o.distributorId === user.id)} articles={articles} />
        )}

        {activeTab === 'shop' && user.role === UserRole.DISTRIBUTOR && (
          <Shop 
            articles={articles} 
            inventory={inventory}
            cart={cart} 
            addToCart={addToCart} 
            removeFromCart={removeFromCart} 
            goToCart={() => setActiveTab('cart')}
          />
        )}

        {activeTab === 'cart' && user.role === UserRole.DISTRIBUTOR && (
          <Cart 
            articles={articles}
            cart={cart}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            clearCartItem={clearCartItem}
            onCheckout={placeOrder}
            total={cartTotal}
            assortments={ASSORTMENTS}
          />
        )}

        {activeTab === 'distributors' && user.role === UserRole.ADMIN && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Company Name</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Location</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600">Total Orders</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MOCK_DISTRIBUTORS.filter(d => d.role === UserRole.DISTRIBUTOR).map(dist => (
                    <tr key={dist.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{dist.companyName}</td>
                      <td className="px-6 py-4 text-slate-500">{dist.location}</td>
                      <td className="px-6 py-4 text-slate-600">
                         <span className="font-bold">{orders.filter(o => o.distributorId === dist.id).length}</span> Completed
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-indigo-600 hover:text-indigo-800 font-bold text-sm">View Ledger</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ... NavItem, DistributorDashboard, StatCard components remain the same ...

const NavItem: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  badge?: number;
  onClick: () => void;
}> = ({ icon, label, active, badge, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      {label}
    </div>
    {badge !== undefined && (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        active ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

const DistributorDashboard: React.FC<{ user: User; orders: Order[]; cartCount: number; goToCart: () => void }> = ({ user, orders, cartCount, goToCart }) => {
  const userOrders = orders.filter(o => o.distributorId === user.id);
  const pending = userOrders.filter(o => o.status === OrderStatus.BOOKED || o.status === OrderStatus.PENDING).length;
  const dispatched = userOrders.filter(o => o.status === OrderStatus.DISPATCHED).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="My Orders" value={userOrders.length} icon={<ShoppingBag className="text-indigo-600" />} />
        <StatCard label="Pending" value={pending} icon={<Clock className="text-amber-600" />} />
        <StatCard label="In Transit" value={dispatched} icon={<Truck className="text-emerald-600" />} />
        <div 
          onClick={goToCart}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
        >
          <div>
            <p className="text-slate-500 text-sm font-medium">Cart Balance</p>
            <p className="text-3xl font-bold mt-1 text-slate-900 group-hover:text-indigo-600 transition-colors">{cartCount}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-100">
            <ShoppingCart className="text-indigo-600" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Shipments</h3>
            <button className="text-indigo-600 font-bold text-sm">View All</button>
          </div>
          {userOrders.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <Package className="text-slate-200 mb-2" size={40} />
              <p className="text-slate-400 text-sm">No recent bookings found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-indigo-50/20 transition-colors border border-transparent hover:border-indigo-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${
                      order.status === OrderStatus.DISPATCHED ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {order.status === OrderStatus.DISPATCHED ? <Truck size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{order.id}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{order.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">₹{order.totalAmount.toLocaleString()}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${
                      order.status === OrderStatus.DISPATCHED ? 'text-emerald-600' : 'text-indigo-600'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-indigo-600 text-white p-8 rounded-3xl shadow-xl shadow-indigo-100 flex flex-col justify-between relative overflow-hidden">
           <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-2">Grow Your Distribution</h3>
              <p className="text-indigo-100 text-sm max-w-xs leading-relaxed">
                Book more than 50 cartons this month and unlock a 5% early-bird discount on your next purchase.
              </p>
           </div>
           <div className="mt-8 relative z-10">
              <div className="flex justify-between items-end mb-2">
                 <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Monthly Target</p>
                 <p className="text-lg font-bold">14 / 50 <span className="text-sm font-normal">Cartons</span></p>
              </div>
              <div className="w-full bg-indigo-500 h-2.5 rounded-full overflow-hidden">
                 <div className="bg-white h-full rounded-full w-[28%]"></div>
              </div>
           </div>
           {/* Decorative elements */}
           <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
           <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1 text-slate-900">{value}</p>
    </div>
    <div className="p-3 bg-slate-50 rounded-xl">
      {icon}
    </div>
  </div>
);

export default App;
