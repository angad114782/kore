import React, { useState, useEffect, useRef } from "react";
import {
  ShoppingCart,
  Plus,
  Info,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";
import { Article, Inventory } from "../../types";

// Props for Shop component
interface ShopProps {
  articles: Article[];
  inventory: Inventory[];
  cart: {
    articleId: string;
    variantId?: string;
    sizeQuantities?: Record<string, number>;
    cartonCount: number;
    pairCount: number;
    price: number;
  }[];
  addToCart: (
    articleId: string,
    variantId: string | undefined,
    sizeQuantities: Record<string, number>
  ) => void;
  removeFromCart: (articleId: string, variantId?: string) => void;
  goToCart: () => void;
}

// parse size range
const parseSizeRange = (range: string): string[] => {
  const match = range.match(/^(\d+)-(\d+)$/);
  if (!match) return [range];

  const start = parseInt(match[1]);
  const end = parseInt(match[2]);

  const sizes: string[] = [];
  for (let i = start; i <= end; i++) sizes.push(String(i));

  return sizes;
};

// Article card component
const ArticleCard: React.FC<{
  article: Article;
  inv?: Inventory;
  inCartPairs: number;
  addToCart: ShopProps["addToCart"];
}> = ({ article, inv, inCartPairs, addToCart }) => {
  const variants = article.variants || [];

  const [selectedVarId, setSelectedVarId] = useState<string | undefined>(
    variants[0]?.id
  );

  const selectedVariant = variants.find((v) => v.id === selectedVarId);

  const sizes = selectedVariant
    ? parseSizeRange(selectedVariant.sizeRange || "")
    : [];

  const [sizeQty, setSizeQty] = useState<Record<string, number>>(() =>
    sizes.reduce((acc, sz) => ({ ...acc, [sz]: 0 }), {})
  );

  useEffect(() => {
    if (selectedVariant) {
      const newSizes = parseSizeRange(selectedVariant.sizeRange || "");

      setSizeQty((prev) => {
        const updated: Record<string, number> = {};
        newSizes.forEach((sz) => {
          updated[sz] = prev[sz] || 0;
        });
        return updated;
      });
    }
  }, [selectedVariant]);

  // image list
  const baseImages = [
    article.imageUrl,
    ...(article.secondaryImages || []).map((s) => s.url),
  ];

  const images =
    baseImages.length > 1
      ? [baseImages[baseImages.length - 1], ...baseImages, baseImages[0]]
      : baseImages;

  const [currentImageIndex, setCurrentImageIndex] = useState(1);
  const [transitionEnabled, setTransitionEnabled] = useState(true);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;

    if (currentImageIndex === images.length - 1) {
      setTimeout(() => {
        setTransitionEnabled(false);
        setCurrentImageIndex(1);
      }, 500);
    }

    if (currentImageIndex === 0) {
      setTimeout(() => {
        setTransitionEnabled(false);
        setCurrentImageIndex(images.length - 2);
      }, 500);
    }
  }, [currentImageIndex, images.length]);

  useEffect(() => {
    if (!transitionEnabled) {
      const id = requestAnimationFrame(() => {
        setTransitionEnabled(true);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [transitionEnabled]);

  const carouselRef = useRef<HTMLDivElement>(null);

  // pointer-based swipe detection covers both touch and mouse input
  const [pointerStart, setPointerStart] = useState<number | null>(null);

  const goNext = () => setCurrentImageIndex((prev) => prev + 1);
  const goPrev = () => setCurrentImageIndex((prev) => prev - 1);

  const handlePointerDown = (e: React.PointerEvent) => {
    // start tracking the horizontal position
    setPointerStart(e.clientX);
    carouselRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pointerStart === null) return;
    const distance = pointerStart - e.clientX;
    if (distance > 50) {
      goNext();
      setPointerStart(e.clientX);
    }
    if (distance < -50) {
      goPrev();
      setPointerStart(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerStart === null) return;

    const distance = pointerStart - e.clientX;
    if (distance > 50) goNext();
    if (distance < -50) goPrev();

    setPointerStart(null);
    carouselRef.current?.releasePointerCapture(e.pointerId);
  };

  // optional: detect cancel events to clear state
  const handlePointerCancel = (e: React.PointerEvent) => {
    setPointerStart(null);
    carouselRef.current?.releasePointerCapture(e.pointerId);
  };

  const totalPairs = Object.values(sizeQty).reduce((s, v) => s + v, 0);
  const valid = totalPairs > 0 && totalPairs % 24 === 0;

  const handleSizeChange = (sz: string, value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setSizeQty((prev) => ({ ...prev, [sz]: num }));
  };

  const handleAdd = () => {
    if (!valid || !selectedVariant) return;

    addToCart(article.id, selectedVariant.id, sizeQty);

    setSizeQty(sizes.reduce((acc, sz) => ({ ...acc, [sz]: 0 }), {}));
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm group hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
      <div
        ref={carouselRef}
        className="relative aspect-square overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ userSelect: "none", touchAction: "pan-y" }}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(-${currentImageIndex * 100}%)`,
            transition: transitionEnabled ? "transform 500ms ease" : "none",
          }}
        >
          {images.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`${article.name} ${idx + 1}`}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              draggable={false}
              className="w-full h-full object-cover flex-shrink-0"
            />
          ))}
        </div>

        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur shadow-sm px-3 py-1.5 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-50">
            {article.category}
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <h4 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {article.name}
          </h4>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-wider uppercase">
            {article.sku}
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="space-y-0.5">
            <p className="text-2xl font-black text-slate-900">
              ₹{article.pricePerPair.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Per Pair (24/Ctn)
            </p>
          </div>

          <div
            className="bg-indigo-50 p-2 rounded-lg"
            title="Assortment Based Booking"
          >
            <Info size={16} className="text-indigo-600" />
          </div>
        </div>

        {variants.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Variant
            </label>
            <select
              value={selectedVarId}
              onChange={(e) => setSelectedVarId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.color} – {v.sizeRange}
                </option>
              ))}
            </select>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            {sizes.map((sz) => (
              <div key={sz} className="flex flex-col">
                <label className="text-xs font-bold text-slate-600">{sz}</label>
                <input
                  type="number"
                  min={0}
                  value={sizeQty[sz] || ""}
                  onChange={(e) => handleSizeChange(sz, e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-xl p-1 text-center"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            disabled={!valid}
            onClick={handleAdd}
            className={`px-5 py-2 rounded-xl font-bold text-white transition-all ${
              valid
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            Add to Cart
          </button>

          <div className="text-sm text-slate-600">
            {totalPairs} pairs {valid && `(${totalPairs / 24} ctn)`}
            {!valid && totalPairs > 0 && (
              <span className="text-red-500 ml-2">must be multiple of 24</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Shop: React.FC<ShopProps> = ({
  articles,
  inventory,
  cart,
  addToCart,
  removeFromCart,
  goToCart,
}) => {
  const cartItemsCount = cart.reduce((sum, item) => sum + item.pairCount, 0);

  return (
    <div className="space-y-8 pb-20">
      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by article name or SKU..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all">
            <Filter size={18} />
            Filter
          </button>

          {cartItemsCount > 0 && (
            <button
              onClick={goToCart}
              className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <ShoppingCart size={18} />
              Checkout ({cartItemsCount})
            </button>
          )}
        </div>
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {articles.map((article) => {
          const inv = inventory.find((i) => i.articleId === article.id);

          const pairsInCart = cart
            .filter((c) => c.articleId === article.id)
            .reduce((sum, i) => sum + i.pairCount, 0);

          return (
            <ArticleCard
              key={article.id}
              article={article}
              inv={inv}
              inCartPairs={pairsInCart}
              addToCart={addToCart}
            />
          );
        })}
      </div>

      {/* Persistent Cart Bar (Mobile) */}
      {cartItemsCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-30 sm:hidden">
          <button
            onClick={goToCart}
            className="w-full bg-indigo-600 text-white p-5 rounded-2xl shadow-2xl flex items-center justify-between font-bold"
          >
            <div className="flex items-center gap-3">
              <ShoppingCart size={24} />
              <span>View Booking Cart</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-white text-indigo-600 px-3 py-1 rounded-lg text-sm">
                {cartItemsCount}
              </span>
              <ArrowRight size={20} />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default Shop;
