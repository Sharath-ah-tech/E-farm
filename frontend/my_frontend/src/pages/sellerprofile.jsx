import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getMediaUrl } from "../utils/media";
import api from "../api/axios";

function StarRow({ rating, size = "text-sm" }) {
  const filled = Math.round(Number(rating) || 0);
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`${size} ${
            s <= filled ? "text-yellow-400" : "text-gray-200 dark:text-gray-700"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = getTheme();

  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get(`seller/${id}/`),
      api.get(`listings/?seller=${id}`),
    ])
      .then(([sellerRes, listRes]) => {
        if (!mounted) return;
        setSeller(sellerRes.data);
        const listData = Array.isArray(listRes.data)
          ? listRes.data
          : listRes.data?.results || [];
        setListings(listData);
      })
      .catch(console.error)
      .finally(() => mounted && setLoading(false));

    // Get reviews by this seller
    api
      .get(`reviews/?ordering=-created_at`)
      .then((r) => {
        const all = r.data?.results || r.data || [];
        // Filter reviews where seller_name matches (best-effort)
        if (mounted) setReviews(all.slice(0, 5));
      })
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className={`${theme.page} min-h-screen`}>
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="h-48 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className={`${theme.page} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 block mb-3">
            person_off
          </span>
          <p className="text-gray-500 font-medium">Seller not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.page} min-h-screen pb-10`}>
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* ── Cover + Profile ── */}
        <div
          className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm overflow-hidden mb-6`}
        >
          <div className={`h-32 bg-gradient-to-r ${theme.title}`} />
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row gap-5 items-start md:items-end -mt-10">
              {/* Avatar */}
              <div
                className={`w-24 h-24 rounded-2xl overflow-hidden border-4 border-white dark:border-slate-900 shadow-xl flex-shrink-0 flex items-center justify-center text-3xl font-bold text-white bg-gradient-to-br ${
                  seller.role === "farmer"
                    ? "from-emerald-500 to-teal-600"
                    : "from-orange-500 to-amber-600"
                }`}
              >
                {seller.image ? (
                  <img
                    src={seller.image}
                    alt={seller.username}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                ) : (
                  seller.username?.charAt(0).toUpperCase()
                )}
              </div>

              <div className="flex-1 md:mb-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {seller.username}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${theme.secondary} ${theme.text}`}
                  >
                    {seller.role}
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    Verified Seller
                  </span>
                </div>

                {seller.business_name && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1.5 text-sm">
                    <span className="material-symbols-outlined text-base">business</span>
                    {seller.business_name}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {(seller.district || seller.state) && (
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      {[seller.district, seller.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">calendar_month</span>
                    Member since {seller.joined_date}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Products", value: seller.total_products, icon: "inventory_2" },
            {
              label: "Avg Rating",
              value: (
                <span className="flex items-center gap-1 justify-center">
                  {seller.average_rating}
                  <span className="text-yellow-400">★</span>
                </span>
              ),
              icon: "star",
            },
            { label: "Reviews", value: seller.total_reviews, icon: "rate_review" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-4 text-center`}
            >
              <span
                className={`material-symbols-outlined text-2xl ${theme.text} mb-1 block`}
              >
                {stat.icon}
              </span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Products ── */}
        <h2 className={`text-lg font-bold mb-4 ${theme.text}`}>
          Products by {seller.username} ({listings.length})
        </h2>

        {listings.length === 0 ? (
          <div
            className={`${theme.card} rounded-2xl border ${theme.border} p-10 text-center mb-6`}
          >
            <span className="material-symbols-outlined text-4xl text-gray-300 block mb-2">
              inventory_2
            </span>
            <p className="text-gray-500 dark:text-gray-400">
              No products listed yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {listings.map((listing) => (
              <div
                key={listing.id}
                onClick={() => navigate(`/productdetail/${listing.product}`)}
                className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-4 flex gap-4 hover:shadow-md transition-all cursor-pointer`}
              >
                <img
                  src={listing.product_image || "/vite.svg"}
                  alt={listing.product_name}
                  className="w-16 h-16 rounded-xl object-contain bg-gray-50 dark:bg-slate-800 flex-shrink-0"
                  onError={(e) => { e.target.src = "/vite.svg"; }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {listing.product_name}
                  </p>
                  <p className={`text-[10px] font-bold uppercase ${theme.text}`}>
                    {listing.product?.category || ""}
                  </p>
                  <StarRow rating={listing.average_rating} size="text-xs" />
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      ₹{listing.price}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        listing.stock > 0
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {listing.stock > 0 ? `${listing.stock} in stock` : "Out"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SellerProfile;