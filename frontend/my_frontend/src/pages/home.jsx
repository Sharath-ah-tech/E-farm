import { useEffect, useState } from "react";
import { getTheme } from "../utils/theme";
import { getAllProducts } from "../api/product";
import {
  getDashboardStats,
  getTopSelling,
  getRecentTransactions,
  getLowStock,
} from "../api/dashboard";
import StatCard from "../components/dashboard/StatCard";
import SkeletonCard from "../components/dashboard/SkeletonCard";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import TopSellingProducts from "../components/dashboard/TopSellingProducts";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import ProductCard from "../components/productcard";

const CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Seeds",
  "Tools",
  "Pesticide",
  "Greens",
];

function buildStatCards(stats, role) {
  if (!stats) return [];

  const inr = (v) =>
    `₹${Number(v || 0).toLocaleString("en-IN")}`;
  const abs = (v) => Math.abs(Number(v || 0));

  if (role === "farmer" || role === "wholesaler") {
    const farmerGrad =
      role === "farmer"
        ? "from-emerald-500 to-teal-600"
        : "from-orange-500 to-amber-600";

    return [
      {
        title: "Products Listed",
        value: stats.total_products || 0,
        icon: "inventory_2",
        gradient: farmerGrad,
        subStats: [
          { label: "Active", value: stats.active_products || 0 },
          { label: "Out of Stock", value: stats.out_of_stock || 0 },
        ],
      },
      {
        title: "Total Sales",
        value: inr(stats.lifetime_sales),
        icon: "trending_up",
        gradient: "from-blue-500 to-indigo-600",
        subStats: [
          { label: "Today", value: inr(stats.today_sales) },
          { label: "Monthly", value: inr(stats.monthly_sales) },
        ],
      },
      {
        title: "Purchases",
        value: inr(stats.lifetime_purchases),
        icon: "shopping_bag",
        gradient: "from-purple-500 to-violet-600",
        subStats: [
          { label: "Today", value: inr(stats.today_purchases) },
          { label: "Monthly", value: inr(stats.monthly_purchases) },
        ],
      },
      {
        title: (stats.profit || 0) >= 0 ? "Profit" : "Loss",
        value: inr(abs(stats.profit)),
        icon:
          (stats.profit || 0) >= 0
            ? "account_balance_wallet"
            : "money_off",
        gradient:
          (stats.profit || 0) >= 0
            ? "from-green-500 to-emerald-600"
            : "from-red-500 to-rose-600",
        subStats: [
          { label: "Today", value: inr(abs(stats.today_profit)) },
          { label: "Monthly", value: inr(abs(stats.monthly_profit)) },
        ],
      },
      {
        title: "Pending Orders",
        value: stats.pending_orders || 0,
        icon: "pending_actions",
        gradient: "from-yellow-500 to-orange-500",
        subStats: [],
      },
      {
        title: "Delivered Orders",
        value: stats.delivered_orders || 0,
        icon: "local_shipping",
        gradient: "from-teal-500 to-cyan-600",
        subStats: [],
      },
    ];
  }

  // customer
  return [
    {
      title: "Total Orders",
      value: stats.total_orders || 0,
      icon: "receipt_long",
      gradient: "from-blue-500 to-indigo-600",
      subStats: [
        { label: "Pending", value: stats.pending_orders || 0 },
        { label: "Delivered", value: stats.delivered_orders || 0 },
      ],
    },
    {
      title: "Total Spending",
      value: inr(stats.lifetime_purchases),
      icon: "payments",
      gradient: "from-purple-500 to-violet-600",
      subStats: [
        { label: "Today", value: inr(stats.today_purchases) },
        { label: "Monthly", value: inr(stats.monthly_purchases) },
      ],
    },
    {
      title: "Pending Orders",
      value: stats.pending_orders || 0,
      icon: "pending_actions",
      gradient: "from-yellow-500 to-orange-500",
      subStats: [],
    },
    {
      title: "Delivered Orders",
      value: stats.delivered_orders || 0,
      icon: "check_circle",
      gradient: "from-green-500 to-emerald-600",
      subStats: [],
    },
    {
      title: "Wishlist Items",
      value: stats.wishlist_count || 0,
      icon: "favorite",
      gradient: "from-pink-500 to-rose-600",
      subStats: [],
    },
  ];
}

function Home({ searchTerm = "" }) {
  const [stats, setStats] = useState(null);
  const [topSelling, setTopSelling] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [products, setProducts] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);

  const theme = getTheme();
  const role = localStorage.getItem("role")?.toLowerCase() || "customer";
  const username = localStorage.getItem("username") || "User";

  useEffect(() => {
    let mounted = true;

    // Dashboard data (parallel)
    Promise.all([
      getDashboardStats(),
      getTopSelling(),
      getRecentTransactions(),
    ])
      .then(([sRes, tRes, txRes]) => {
        if (!mounted) return;
        setStats(sRes.data);
        setTopSelling(tRes.data);
        setTransactions(txRes.data);
      })
      .catch(console.error)
      .finally(() => {
        if (mounted) setStatsLoading(false);
      });

    // Low stock (sellers only)
    if (role !== "customer") {
      getLowStock()
        .then((r) => mounted && setLowStock(r.data))
        .catch(console.error);
    }

    // Product catalogue
    getAllProducts()
      .then((r) => mounted && setProducts(r.data))
      .catch(console.error)
      .finally(() => mounted && setProductsLoading(false));

    return () => {
      mounted = false;
    };
  }, [role]);

  const statCards = buildStatCards(stats, role);
  const skeletonCount = role === "customer" ? 5 : 6;
  const gridCols =
    role === "customer"
      ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6";

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${theme.page} min-h-screen`}>
      {/* ─── Welcome Header ─── */}
      <div className="px-4 md:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className={`text-xl md:text-2xl font-bold ${theme.text}`}>
              Welcome back, {username}! 👋
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <span
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize ${theme.secondary} ${theme.text}`}
          >
            {role} Dashboard
          </span>
        </div>
      </div>

      {/* ─── Low Stock Alert ─── */}
      {lowStock.length > 0 && (
        <div className="px-4 md:px-6 mt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-red-500 text-lg">
                warning
              </span>
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                Low Stock Alert — {lowStock.length} item
                {lowStock.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.slice(0, 6).map((item) => (
                <span
                  key={item.id}
                  className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-medium"
                >
                  {item.product_name}: {item.stock} left
                </span>
              ))}
              {lowStock.length > 6 && (
                <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                  +{lowStock.length - 6} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Stats Cards ─── */}
      <div className="px-4 md:px-6 mt-6">
        {statsLoading ? (
          <div className={`grid ${gridCols} gap-3 md:gap-4`}>
            {[...Array(skeletonCount)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-3 md:gap-4`}>
            {statCards.map((card, i) => (
              <StatCard key={i} {...card} />
            ))}
          </div>
        )}
      </div>

      {/* ─── Charts ─── */}
      <div className="px-4 md:px-6 mt-8">
        <DashboardCharts role={role} />
      </div>

      {/* ─── Top Selling Products ─── */}
      <div className="px-4 md:px-6 mt-8">
        <TopSellingProducts
          data={topSelling}
          role={role}
          theme={theme}
        />
      </div>

      {/* ─── Recent Transactions ─── */}
      <div className="px-4 md:px-6 mt-8">
        <RecentTransactions data={transactions} theme={theme} />
      </div>

      {/* ─── Product Catalogue (customer) ─── */}
      {role === "customer" && (
        <div className="px-4 md:px-6 mt-10 mb-4">
          <h2 className={`text-xl md:text-2xl font-bold mb-6 ${theme.text}`}>
            Browse Products
          </h2>

          {productsLoading ? (
            <div className="flex justify-center py-10">
              <div
                className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${theme.default}`}
              />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-5xl text-gray-300 block mb-2">
                search_off
              </span>
              <p className="text-gray-500 font-medium">No products found</p>
            </div>
          ) : (
            CATEGORIES.map((cat) => {
              const catProducts = filteredProducts.filter(
                (p) => p.category === cat
              );
              if (catProducts.length === 0) return null;
              return (
                <div key={cat} className="mb-8">
                  <h3
                    className={`text-lg font-bold mb-3 ${theme.text} border-b pb-2 ${theme.border}`}
                  >
                    {cat}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {catProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default Home;