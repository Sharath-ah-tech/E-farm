import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getAllProducts } from "../api/product";
import ProductCard from "../components/productcard";

// ── Banner data ──────────────────────────────────────────────────────────────

const BANNERS = [
  {
    id: 1,
    badge:    "100% Fresh Produce",
    title:    "Farm Fresh to Your Doorstep",
    subtitle: "Source directly from certified farmers across India",
    cta:      "Shop Now",
    category: null,
    emoji:    "🌾",
    gradient: "from-emerald-800 via-green-700 to-teal-800",
    accent:   "from-lime-400 to-emerald-400",
  },
  {
    id: 2,
    badge:    "New Arrivals",
    title:    "Premium Seeds & Farming Tools",
    subtitle: "Everything you need for a productive harvest season",
    cta:      "Explore",
    category: "Seeds",
    emoji:    "🌱",
    gradient: "from-amber-800 via-orange-700 to-yellow-700",
    accent:   "from-yellow-300 to-amber-400",
  },
  {
    id: 3,
    badge:    "Wholesale Deals",
    title:    "Bulk Orders at Best Prices",
    subtitle: "Directly from verified wholesalers — no middlemen",
    cta:      "View Deals",
    category: null,
    emoji:    "🚜",
    gradient: "from-blue-900 via-indigo-800 to-purple-800",
    accent:   "from-blue-300 to-indigo-400",
  },
  {
    id: 4,
    badge:    "Certified Organic",
    title:    "Organic Vegetables & Greens",
    subtitle: "Chemical-free, freshly harvested from local farms",
    cta:      "Shop Organic",
    category: "Vegetables",
    emoji:    "🥦",
    gradient: "from-green-900 via-emerald-800 to-cyan-800",
    accent:   "from-green-300 to-teal-400",
  },
];

// ── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "All",       icon: "🛒", color: "from-gray-500 to-slate-600"    },
  { name: "Vegetables",icon: "🥦", color: "from-green-500 to-emerald-600" },
  { name: "Fruits",    icon: "🍎", color: "from-red-500 to-rose-600"      },
  { name: "Seeds",     icon: "🌱", color: "from-yellow-500 to-amber-600"  },
  { name: "Tools",     icon: "🔧", color: "from-zinc-500 to-gray-600"     },
  { name: "Pesticide", icon: "🧪", color: "from-blue-500 to-indigo-600"   },
  { name: "Greens",    icon: "🥬", color: "from-teal-500 to-cyan-600"     },
];

// ── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonProductCard() {
  return (
    <div className="rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse overflow-hidden flex flex-col">
      <div className="h-40 bg-gray-300 dark:bg-slate-700" />
      <div className="p-3 space-y-2">
        <div className="h-2.5 w-14 rounded bg-gray-300 dark:bg-slate-700" />
        <div className="h-3.5 w-full rounded bg-gray-300 dark:bg-slate-700" />
        <div className="h-3 w-20 rounded bg-gray-300 dark:bg-slate-700" />
        <div className="h-8 rounded-xl bg-gray-300 dark:bg-slate-700 mt-2" />
      </div>
    </div>
  );
}

// ── Banner Carousel ──────────────────────────────────────────────────────────

function BannerCarousel({ theme, onCategorySelect }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(
      () => setCurrent((c) => (c + 1) % BANNERS.length),
      5000
    );
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goTo = (idx) => {
    setCurrent(idx);
    resetTimer();
  };

  const prev = () => goTo((current - 1 + BANNERS.length) % BANNERS.length);
  const next = () => goTo((current + 1) % BANNERS.length);

  const banner = BANNERS[current];

  return (
    <div className="relative h-56 sm:h-72 md:h-80 rounded-2xl md:rounded-3xl overflow-hidden select-none shadow-2xl">
      {/* Slides */}
      {BANNERS.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 bg-gradient-to-br ${b.gradient} transition-all duration-700 ease-in-out flex items-center px-6 sm:px-10 md:px-14 ${
            i === current
              ? "opacity-100 translate-x-0"
              : i < current
              ? "opacity-0 -translate-x-full"
              : "opacity-0 translate-x-full"
          }`}
          style={{ willChange: "transform, opacity" }}
        >
          {/* Left text */}
          <div className="flex-1 min-w-0 pr-4 z-10">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${b.accent} bg-opacity-20 border border-white/30 mb-3`}
            >
              {b.badge}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
              {b.title}
            </h2>
            <p className="text-white/80 text-xs sm:text-sm mt-2 line-clamp-2">
              {b.subtitle}
            </p>
            <button
              onClick={() => {
                if (b.category) {
                  onCategorySelect(b.category);
                }
                // Smooth scroll to products
                document.getElementById("product-grid")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={`
                mt-4 px-5 py-2.5 rounded-xl font-bold text-sm text-white
                bg-white/20 hover:bg-white/30 backdrop-blur-sm
                border border-white/30
                transition-all hover:shadow-lg active:scale-[0.98]
              `}
            >
              {b.cta} →
            </button>
          </div>

          {/* Right emoji */}
          <div className="hidden sm:flex flex-shrink-0 items-center justify-center w-28 h-28 md:w-36 md:h-36 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 z-10">
            <span className="text-5xl md:text-6xl">{b.emoji}</span>
          </div>

          {/* Background decoration */}
          <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
          <div className="absolute left-0 bottom-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />
        </div>
      ))}

      {/* Prev / Next */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition backdrop-blur-sm"
      >
        <span className="material-symbols-outlined text-lg">chevron_left</span>
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition backdrop-blur-sm"
      >
        <span className="material-symbols-outlined text-lg">chevron_right</span>
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Category Strip ────────────────────────────────────────────────────────────

function CategoryStrip({ active, onSelect, theme }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar mt-6">
      {CATEGORIES.map((cat) => {
        const isActive = active === cat.name;
        return (
          <button
            key={cat.name}
            onClick={() => onSelect(cat.name)}
            className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all duration-200 group ${
              isActive ? "scale-105" : "hover:scale-105"
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md transition-all ${
                isActive
                  ? `bg-gradient-to-br ${cat.color} ring-2 ring-white dark:ring-slate-700 shadow-lg`
                  : "bg-gray-100 dark:bg-slate-800 grayscale-[30%]"
              }`}
            >
              {cat.icon}
            </div>
            <span
              className={`text-[10px] font-bold whitespace-nowrap ${
                isActive
                  ? theme.text
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {cat.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Section: horizontal scroll row ───────────────────────────────────────────

function ProductRow({ title, icon, products, emptyMsg, theme }) {
  const rowRef = useRef(null);

  const scrollBy = (dir) => {
    if (rowRef.current) rowRef.current.scrollBy({ left: dir * 220, behavior: "smooth" });
  };

  if (products.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg md:text-xl font-bold ${theme.text} flex items-center gap-2`}>
          <span className="text-2xl">{icon}</span>
          {title}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => scrollBy(-1)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition"
          >
            <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-300">chevron_left</span>
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition"
          >
            <span className="material-symbols-outlined text-sm text-gray-600 dark:text-gray-300">chevron_right</span>
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth"
      >
        {products.map((p) => (
          <div key={p.id} className="flex-shrink-0 w-44 md:w-52">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Home ─────────────────────────────────────────────────────────────────

function Home({ searchTerm = "" }) {
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  const theme = getTheme();

  useEffect(() => {
    let mounted = true;
    getAllProducts()
      .then((r) => mounted && setProducts(r.data))
      .catch(console.error)
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  // Filtered by category + search
  const filtered = useMemo(() => {
    let p = products;
    if (activeCategory !== "All") p = p.filter((x) => x.category === activeCategory);
    if (searchTerm) p = p.filter((x) => x.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    return p;
  }, [products, activeCategory, searchTerm]);

  // Feature sections (only for "All" view with no search)
  const showSections = activeCategory === "All" && !searchTerm;

  const popular    = useMemo(() => [...products].sort((a, b) => (b.seller_count || 0) - (a.seller_count || 0)).slice(0, 10), [products]);
  const topRated   = useMemo(() => [...products].filter((p) => (p.average_rating || 0) >= 4).sort((a, b) => b.average_rating - a.average_rating).slice(0, 10), [products]);
  const newArrivals= useMemo(() => [...products].slice(0, 10), [products]);  // API returns newest-first

  return (
    <div className={`${theme.page} min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-10">

        {/* ── Banner ── */}
        <BannerCarousel
          theme={theme}
          onCategorySelect={(cat) => {
            setActiveCategory(cat);
            document
              .getElementById("product-grid")
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {/* ── Category strip ── */}
        <CategoryStrip
          active={activeCategory}
          onSelect={setActiveCategory}
          theme={theme}
        />

        {/* ── Search result label ── */}
        {searchTerm && (
          <div className={`mt-5 text-sm font-medium ${theme.text}`}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for{" "}
            <span className="font-bold">"{searchTerm}"</span>
          </div>
        )}

        {/* ── Featured sections (All + no search) ── */}
        {showSections && !loading && products.length > 0 && (
          <>
            <ProductRow
              title="Popular Right Now"
              icon="🔥"
              products={popular}
              theme={theme}
            />
            {topRated.length > 0 && (
              <ProductRow
                title="Top Rated"
                icon="⭐"
                products={topRated}
                theme={theme}
              />
            )}
            <ProductRow
              title="New Arrivals"
              icon="✨"
              products={newArrivals}
              theme={theme}
            />

            {/* Divider before full grid */}
            <div className="mt-10 mb-6 flex items-center gap-4">
              <div className={`flex-1 h-px border-t ${theme.border}`} />
              <h2 className={`text-base font-bold ${theme.text} flex items-center gap-2 flex-shrink-0`}>
                <span className="material-symbols-outlined text-base">grid_view</span>
                All Categories
              </h2>
              <div className={`flex-1 h-px border-t ${theme.border}`} />
            </div>
          </>
        )}

        {/* ── Product grid ── */}
        <div id="product-grid">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <SkeletonProductCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <span className="material-symbols-outlined text-7xl text-gray-300 dark:text-slate-600 block mb-3">
                search_off
              </span>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                {searchTerm
                  ? `No products found for "${searchTerm}"`
                  : `No products in ${activeCategory} yet`}
              </p>
              {activeCategory !== "All" && (
                <button
                  onClick={() => setActiveCategory("All")}
                  className={`mt-5 px-6 py-2.5 rounded-xl font-bold text-sm text-white ${theme.primary} transition`}
                >
                  Show All Products
                </button>
              )}
            </div>
          ) : showSections ? (
            // Category-by-category grid
            CATEGORIES.filter((c) => c.name !== "All").map((cat) => {
              const catProducts = filtered.filter((p) => p.category === cat.name);
              if (catProducts.length === 0) return null;
              return (
                <div key={cat.name} className="mb-10">
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className={`text-base md:text-lg font-bold ${theme.text} flex items-center gap-2`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      {cat.name}
                    </h3>
                    {catProducts.length > 6 && (
                      <button
                        onClick={() => setActiveCategory(cat.name)}
                        className={`text-xs font-semibold ${theme.text} flex items-center gap-1 hover:opacity-70 transition`}
                      >
                        See all {catProducts.length}
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {catProducts.slice(0, 6).map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            // Single filtered grid (search or specific category)
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;