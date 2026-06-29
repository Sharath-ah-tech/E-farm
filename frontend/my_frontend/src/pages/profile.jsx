import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getMediaUrl } from "../utils/media";
import api from "../api/axios";
import {
  getDashboardStats,
  getTopSelling,
  getRecentTransactions,
  getLowStock,
} from "../api/dashboard";
import {
  getProducts,
  updateListing,
  deleteListing,
  applyDiscount,
} from "../api/product";
import StatCard from "../components/dashboard/StatCard";
import SkeletonCard from "../components/dashboard/SkeletonCard";
import DashboardCharts from "../components/dashboard/DashboardCharts";
import TopSellingProducts from "../components/dashboard/TopSellingProducts";
import RecentTransactions from "../components/dashboard/RecentTransactions";

/* ── Helpers ── */
function buildStatCards(stats, role) {
  if (!stats) return [];
  const inr = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
  const abs = (v) => Math.abs(Number(v || 0));

  if (role === "farmer" || role === "wholesaler") {
    return [
      {
        title: "Products Listed",
        value: stats.total_products || 0,
        icon: "inventory_2",
        gradient:
          role === "farmer"
            ? "from-emerald-500 to-teal-600"
            : "from-orange-500 to-amber-600",
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
        icon: (stats.profit || 0) >= 0 ? "account_balance_wallet" : "money_off",
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
        title: "Delivered",
        value: stats.delivered_orders || 0,
        icon: "local_shipping",
        gradient: "from-teal-500 to-cyan-600",
        subStats: [],
      },
    ];
  }

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
      title: "Delivered",
      value: stats.delivered_orders || 0,
      icon: "check_circle",
      gradient: "from-green-500 to-emerald-600",
      subStats: [],
    },
    {
      title: "Wishlist",
      value: stats.wishlist_count || 0,
      icon: "favorite",
      gradient: "from-pink-500 to-rose-600",
      subStats: [],
    },
  ];
}

/* ── ListingCard (inline edit/delete/discount) ── */
function ListingCard({ listing, theme, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(String(listing.price));
  const [editStock, setEditStock] = useState(String(listing.stock));
  const [editDesc, setEditDesc] = useState(listing.description || "");
  const [saving, setSaving] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountVal, setDiscountVal] = useState("");
  const [discounting, setDiscounting] = useState(false);
  const [discountOk, setDiscountOk] = useState(false);
  const [localListing, setLocalListing] = useState(listing);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateListing(listing.id, {
        price: editPrice,
        stock: editStock,
        description: editDesc,
      });
      setLocalListing((p) => ({
        ...p,
        price: editPrice,
        stock: editStock,
        description: editDesc,
      }));
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete listing for "${listing.product_name}"?`)) return;
    try {
      await deleteListing(listing.id);
      onDelete(listing.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscount = async () => {
    const d = parseInt(discountVal, 10);
    if (isNaN(d) || d < 0 || d > 100) return;
    setDiscounting(true);
    try {
      await applyDiscount(listing.id, { discount: d });
      setDiscountOk(true);
      setTimeout(() => {
        setDiscountOk(false);
        setDiscountOpen(false);
        setDiscountVal("");
      }, 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setDiscounting(false);
    }
  };

  const inpCls =
    "w-full rounded-lg px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 " +
    "bg-white dark:bg-slate-800 text-gray-900 dark:text-white " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-400";

  return (
    <div
      className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm overflow-hidden`}
    >
      {/* Image + basic info */}
      <div className="flex gap-3 p-4">
        <img
          src={localListing.product_image || "/vite.svg"}
          alt={localListing.product_name}
          className="w-16 h-16 rounded-xl object-contain bg-gray-50 dark:bg-slate-800 flex-shrink-0"
          onError={(e) => {
            e.target.src = "/vite.svg";
          }}
        />
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-sm ${theme.text} truncate`}>
            {localListing.product_name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {localListing.product_category}
          </p>

          {!editing ? (
            <>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  ₹{localListing.price}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  / {localListing.units}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    localListing.stock > 0
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {localListing.stock > 0
                    ? `${localListing.stock} in stock`
                    : "Out of Stock"}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-400 text-xs">
                  {"★".repeat(Math.round(localListing.average_rating || 0))}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ({localListing.review_count || 0} reviews)
                </span>
              </div>
            </>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 uppercase">
                    Price
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className={inpCls}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 uppercase">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className={inpCls}
                  />
                </div>
              </div>
              <textarea
                rows={2}
                placeholder="Description (optional)"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className={`${inpCls} resize-none`}
              />
            </div>
          )}
        </div>
      </div>

      {/* Discount section */}
      {discountOpen && (
        <div
          className={`px-4 pb-3 border-t ${theme.border} pt-3 flex items-center gap-2`}
        >
          <input
            type="number"
            min="0"
            max="100"
            placeholder="% off"
            value={discountVal}
            onChange={(e) => setDiscountVal(e.target.value)}
            className="w-20 rounded-lg px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
          />
          <button
            onClick={handleDiscount}
            disabled={discounting || !discountVal}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition ${
              discountOk
                ? "bg-green-500"
                : "bg-orange-500 hover:bg-orange-600 disabled:opacity-60"
            }`}
          >
            {discounting ? "…" : discountOk ? "✓ Applied!" : "Apply"}
          </button>
          <button
            onClick={() => setDiscountOpen(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div
        className={`flex items-center gap-2 px-4 py-3 border-t ${theme.border} flex-wrap`}
      >
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${theme.secondary} ${theme.text} border ${theme.border} transition hover:shadow`}
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit
          </button>
        ) : (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white ${theme.primary} disabled:opacity-60 transition`}
            >
              {saving ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-sm">save</span>
              )}
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 transition hover:shadow"
            >
              Cancel
            </button>
          </>
        )}

        <button
          onClick={() => setDiscountOpen((p) => !p)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
        >
          <span className="material-symbols-outlined text-sm">local_offer</span>
          Discount
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
          Delete
        </button>
      </div>
    </div>
  );
}

/* ── Profile Page ── */
function Profile() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [topSelling, setTopSelling] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  const theme = getTheme();
  const role = localStorage.getItem("role")?.toLowerCase() || "customer";
  const navigate = useNavigate();

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    // ── Profile ──
    try {
      const res = await api.get("profile/");
      const p =
        res.data?.results?.[0] ??
        (Array.isArray(res.data) ? res.data[0] : res.data);
      setProfile(p);
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoadingProfile(false);
    }

    // ── Dashboard stats ──
    setLoadingStats(true);
    Promise.all([
      getDashboardStats(),
      getTopSelling(),
      getRecentTransactions(),
    ])
      .then(([sRes, tRes, txRes]) => {
        setStats(sRes.data);
        setTopSelling(tRes.data);
        setTransactions(txRes.data);
      })
      .catch(console.error)
      .finally(() => setLoadingStats(false));

    // ── Low stock (sellers only) ──
    if (role !== "customer") {
      getLowStock()
        .then((r) => setLowStock(r.data))
        .catch(console.error);

      // ── My listings ──
      getProducts()
        .then((r) => setMyListings(r.data))
        .catch(console.error);
    }

    // ── Recent notifications ──
    api
      .get("notifications/")
      .then((r) => setNotifications(r.data?.results || r.data || []))
      .catch(console.error);
  };

  const uploadImage = async () => {
    if (!selectedImage || !profile) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", selectedImage);
      await api.patch(`profile/${profile.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadAll();
      setSelectedImage(null);
    } catch (err) {
      console.error(err);
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteListing = (id) => {
    setMyListings((p) => p.filter((l) => l.id !== id));
  };

  const statCards = buildStatCards(stats, role);
  const skeletonCount = role === "customer" ? 5 : 6;
  const gridCols =
    role === "customer"
      ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6";

  if (loadingProfile) {
    return (
      <div
        className={`${theme.page} min-h-screen flex items-center justify-center`}
      >
        <div
          className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${theme.default}`}
        />
      </div>
    );
  }

  return (
    <div className={`${theme.page} min-h-screen`}>
      {/* ── Cover ── */}
      <div className={`h-40 bg-gradient-to-br ${theme.title} `}>
        <button
          onClick={() => navigate("/profile-setup")}
          className="absolute top-4 right-4 flex mt-24 mr-5 items-center gap-1.5 px-4 py-2 bg-black/25 hover:bg-black/35 backdrop-blur-sm text-white rounded-full text-sm font-semibold transition"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          Edit Profile
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* ── Profile Card ── */}
        <div
          className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl border ${theme.border} p-6 -mt-16 mb-6`}
        >
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Avatar + upload */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative">
                <img
                  src={
                    profile?.image
                      ? getMediaUrl(profile.image)
                      : "/vite.svg"
                  }
                  alt="Profile"
                  className="w-28 h-28 rounded-full border-4 border-white dark:border-slate-800 object-cover shadow-xl"
                  onError={(e) => {
                    e.target.src = "/vite.svg";
                  }}
                />
                <label
                  htmlFor="photo-up"
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer shadow-lg transition"
                >
                  <span className="material-symbols-outlined text-sm">
                    photo_camera
                  </span>
                </label>
                <input
                  id="photo-up"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedImage(e.target.files[0])}
                />
              </div>
              {selectedImage && (
                <button
                  onClick={uploadImage}
                  disabled={imageUploading}
                  className="mt-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-full font-semibold transition disabled:opacity-60"
                >
                  {imageUploading ? "Saving…" : "Save Photo"}
                </button>
              )}
            </div>

            {/* ── Profile details — always visible ── */}
            <div className="flex-1 min-w-0">
              {/* Username + Role — primary visibility */}
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white">
                  {profile?.username || localStorage.getItem("username") || "—"}
                </h1>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${theme.secondary} ${theme.text}`}
                >
                  {profile?.role ||
                    localStorage.getItem("role") ||
                    "member"}
                </span>
              </div>

              {/* Business name */}
              {profile?.business_name && (
                <p className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  <span className="material-symbols-outlined text-base text-gray-400">
                    business
                  </span>
                  {profile.business_name}
                </p>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                {profile?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-base">
                      mail
                    </span>
                    {profile.email}
                  </div>
                )}
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-base">
                      phone
                    </span>
                    {profile.phone}
                  </div>
                )}
                {(profile?.district || profile?.state) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-base">
                      location_on
                    </span>
                    {[profile.district, profile.state]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                {profile?.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-base">
                      home
                    </span>
                    <span className="truncate">
                      {profile.address.length > 50
                        ? profile.address.slice(0, 50) + "…"
                        : profile.address}
                    </span>
                  </div>
                )}
              </div>

              {/* Profile completion */}
              {typeof profile?.profile_completed === "number" && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${profile.profile_completed}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {profile.profile_completed}% complete
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Low Stock Alert ── */}
        {lowStock.length > 0 && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-red-500 text-lg">
                warning
              </span>
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">
                Low Stock — {lowStock.length} item
                {lowStock.length !== 1 ? "s" : ""} need restocking
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((item) => (
                <span
                  key={item.id}
                  className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-full text-xs font-medium"
                >
                  {item.product_name}: {item.stock} left
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Stats Cards ── */}
        <div className="mb-8">
          <h2 className={`text-lg font-bold mb-4 ${theme.text}`}>
            Dashboard Overview
          </h2>
          {loadingStats ? (
            <div className={`grid ${gridCols} gap-4`}>
              {[...Array(skeletonCount)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className={`grid ${gridCols} gap-4`}>
              {statCards.map((card, i) => (
                <StatCard key={i} {...card} />
              ))}
            </div>
          )}
        </div>

        {/* ── Charts ── */}
        <div className="mb-8">
          <h2 className={`text-lg font-bold mb-4 ${theme.text}`}>
            Performance Analytics
          </h2>
          <DashboardCharts role={role} />
        </div>

        {/* ── My Listings (Farmer/Wholesaler only) ── */}
        {(role === "farmer" || role === "wholesaler") && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-bold ${theme.text}`}>
                My Product Listings
                <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-2">
                  ({myListings.length})
                </span>
              </h2>
              <button
                onClick={() => navigate("/additem")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white ${theme.primary} hover:shadow-lg transition`}
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add Listing
              </button>
            </div>

            {myListings.length === 0 ? (
              <div
                className={`${theme.card} rounded-2xl border ${theme.border} p-12 text-center`}
              >
                <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-slate-600 block mb-3">
                  inventory_2
                </span>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  No listings yet
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                  Add a listing to start selling
                </p>
                <button
                  onClick={() => navigate("/additem")}
                  className={`mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white ${theme.primary} transition hover:shadow-lg`}
                >
                  Add Your First Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    theme={theme}
                    onDelete={handleDeleteListing}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Two column: Top Selling + Notifications ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TopSellingProducts
            data={topSelling}
            role={role}
            theme={theme}
          />

          {/* Notifications */}
          <div
            className={`${theme.card} rounded-2xl p-6 shadow-lg border ${theme.border}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-base font-bold ${theme.text}`}>
                Recent Notifications
              </h3>
              <button
                onClick={() => navigate("/notification")}
                className={`text-xs font-semibold ${theme.text} hover:opacity-70 transition`}
              >
                View all →
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-slate-600 block mb-2">
                  notifications_none
                </span>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {notifications.slice(0, 6).map((n, i) => (
                  <div
                    key={n.id || i}
                    className={`p-3 rounded-xl border transition-colors ${
                      n.is_read
                        ? `${theme.border} opacity-60`
                        : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`material-symbols-outlined text-base mt-0.5 flex-shrink-0 ${
                          n.is_read ? "text-gray-400" : theme.text
                        }`}
                      >
                        {n.notification_type === "order"
                          ? "receipt_long"
                          : n.notification_type === "discount"
                          ? "local_offer"
                          : n.notification_type === "stock"
                          ? "inventory_2"
                          : "notifications"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Transactions ── */}
        <div className="mb-8">
          <RecentTransactions data={transactions} theme={theme} />
        </div>
      </div>
    </div>
  );
}

export default Profile;