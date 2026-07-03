import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getMediaUrl } from "../utils/media";
import api from "../api/axios";
import { getListings } from "../api/product";
import { useWishlist } from "../contexts/WishlistContext";
import { getPricing, formatINR } from "../utils/pricing";
import {
  getProductReviews,
  addReview,
  updateReview,
  deleteReview,
} from "../api/reviews";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StarRow({ rating, max = 5, size = "text-base" }) {
  const filled = Math.round(Number(rating) || 0);
  return (
    <div className="flex">
      {[...Array(max)].map((_, i) => (
        <span
          key={i}
          className={`${size} ${
            i < filled ? "text-yellow-400" : "text-gray-200 dark:text-gray-700"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className={`text-3xl transition-transform hover:scale-110 active:scale-90 ${
            s <= (hovered || value)
              ? "text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ── Seller Card ───────────────────────────────────────────────────────────────

function SellerCard({ listing, theme, onAddToCart, onBuyNow, adding, added }) {
  const navigate = useNavigate();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [wlBusy, setWlBusy] = useState(false);
  const inStock = listing.stock > 0;
  console.log(listing.product)
  // Per-product lookup — listing.product is THIS listing's product id only.
  const wishlisted = isWishlisted(listing.product);

  const handleWishlist = async () => {
    if (wlBusy) return;
    setWlBusy(true);
    await toggleWishlist(listing.product);
    setWlBusy(false);
  };

  const { original, final, pct, hasDiscount, saved } = getPricing(listing);

  return (
    <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col`}>
      {/* Seller header — unchanged from before */}
      <div className={`px-5 pt-5 pb-4 ${theme.secondary}`}>
        <div className="flex items-start gap-3">
          {listing.seller_photo ? (
            <img
              src={listing.seller_photo}
              alt={listing.seller_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-slate-700 shadow flex-shrink-0"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow bg-gradient-to-br ${
              listing.seller_role === "farmer" ? "from-emerald-500 to-teal-600" : "from-orange-500 to-amber-600"
            }`}>
              {listing.seller_name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => navigate(`/seller/${listing.seller}`)} className={`font-bold text-sm ${theme.text} hover:underline truncate max-w-[140px]`}>
                {listing.seller_name}
              </button>
              {listing.seller_business_name && (
                <span className="flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-[10px] font-bold">
                  <span className="material-symbols-outlined text-xs">verified</span>Verified
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${theme.secondary} ${theme.text}`}>
                {listing.seller_role || "Seller"}
              </span>
            </div>
            {listing.seller_business_name && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">🏢 {listing.seller_business_name}</p>
            )}
            {(listing.seller_district || listing.seller_state) && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">location_on</span>
                {[listing.seller_district, listing.seller_state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Price & details */}
      <div className="px-5 py-4 flex-1 flex flex-col">
        <div className="flex items-end justify-between mb-1 flex-wrap gap-1">
          <div>
            {hasDiscount ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatINR(final)}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500 line-through">{formatINR(original)}</span>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">
                  {pct}% OFF
                </span>
              </div>
            ) : (
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatINR(original)}</span>
            )}
            <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/ {listing.units}</span>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            inStock ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {inStock ? `${listing.stock} in stock` : "Out of Stock"}
          </span>
        </div>

        {hasDiscount && (
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">
            You save {formatINR(saved)}
          </p>
        )}

        <div className="flex items-center gap-2 mb-2">
          <StarRow rating={listing.average_rating} size="text-sm" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {Number(listing.average_rating || 0).toFixed(1)}
            {listing.review_count > 0 && ` (${listing.review_count} review${listing.review_count !== 1 ? "s" : ""})`}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
          <span className="material-symbols-outlined text-sm text-green-500">local_shipping</span>
          Free delivery · Expected 2–4 days
        </p>

        {listing.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 italic">"{listing.description}"</p>
        )}

        <div className="flex gap-2 mt-auto">
          <button
            onClick={() => onBuyNow(listing.id)}
            disabled={!inStock}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] ${
              inStock ? `${theme.primary} hover:shadow-md` : "bg-gray-200 dark:bg-slate-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            Buy Now
          </button>

          <button
            onClick={() => onAddToCart(listing.id)}
            disabled={!inStock || adding}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-[0.97] ${
              added
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
                : inStock
                ? `border-current ${theme.text} ${theme.secondary} hover:shadow`
                : "border-gray-200 dark:border-slate-700 text-gray-300 cursor-not-allowed"
            }`}
          >
            {adding ? (
              <span className="flex items-center justify-center gap-1">
                <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" />Adding…
              </span>
            ) : added ? "✓ Added!" : "Add to Cart"}
          </button>

          <button
            onClick={handleWishlist}
            disabled={wlBusy}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
              wishlisted ? "bg-red-500 text-white border-red-500" : `${theme.secondary} ${theme.text} border-current hover:shadow`
            }`}
          >
            <span className="material-symbols-outlined text-xl">{wishlisted ? "favorite" : "favorite_border"}</span>
          </button>

          <button disabled title="Chat coming soon" className="w-11 h-11 rounded-xl flex items-center justify-center border border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600 cursor-not-allowed">
            <span className="material-symbols-outlined text-xl">chat</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────

function ReviewCard({ review, theme, onEdit, onDelete }) {
  return (
    <div className={`p-4 rounded-xl border ${theme.border} ${theme.secondary}`}>
      <div className="flex items-start justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm overflow-hidden bg-gradient-to-br ${theme.title}`}
          >
            {review.user_image ? (
              <img
                src={review.user_image}
                alt={review.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              review.username?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              {review.username}
            </p>
            {review.seller_name && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Purchased from {review.seller_name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StarRow rating={review.rating} size="text-sm" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {new Date(review.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {review.review}
      </p>

      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full border border-green-200 dark:border-green-800">
          <span className="material-symbols-outlined text-xs">verified</span>
          Verified Purchase
        </span>

        {review.is_own && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(review)}
              className={`text-xs font-semibold ${theme.text} flex items-center gap-1 hover:opacity-70 transition`}
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit
            </button>
            <button
              onClick={() => onDelete(review.id)}
              className="text-xs font-semibold text-red-500 dark:text-red-400 flex items-center gap-1 hover:opacity-70 transition"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = getTheme();

  const [product, setProduct] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});
  const [addedToCart, setAddedToCart] = useState({});

  // Seller sort
  const [sellerSort, setSellerSort] = useState("price");

  // Review sort
  const [reviewSort, setReviewSort] = useState("newest");

  // Add review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [selectedListing, setSelectedListing] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState({ text: "", ok: true });

  // Edit review
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [canReviewMap, setCanReviewMap] = useState({});

  useEffect(() => {
    let mounted = true;

    Promise.all([api.get(`products/${id}/`), getListings(id)])
      .then(([prodRes, listRes]) => {
        if (!mounted) return;
        setProduct(prodRes.data);
        const lst = listRes.data;
        setListings(lst);
        if (lst.length > 0) setSelectedListing(String(lst[0].id));
      })
      .catch(console.error)
      .finally(() => mounted && setLoading(false));

    getProductReviews(id)
      .then((r) => mounted && setReviews(r.data?.results || r.data || []))
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, [id]);
  // ── Inside useEffect, after fetching listings ──────────────────────────────


// After listings are loaded, check can_review for each listing
useEffect(() => {
  if (listings.length === 0) return;
  Promise.all(
    listings.map(async (l) => {
      try {
        const res = await api.get(`reviews/can-review/?listing=${l.id}`);
        return [l.id, res.data];
      } catch {
        return [l.id, { can_review: false, reason: "error" }];
      }
    })
  ).then((results) => {
    setCanReviewMap(Object.fromEntries(results));
  });
}, [listings]);

  // Sorted sellers
  const sortedListings = useMemo(() => {
    const lst = [...listings];
    switch (sellerSort) {
      case "price":
        return lst.sort((a, b) => Number(a.price) - Number(b.price));
      case "rating":
        return lst.sort(
          (a, b) => (b.average_rating || 0) - (a.average_rating || 0)
        );
      case "stock":
        return lst.sort((a, b) => (b.stock || 0) - (a.stock || 0));
      case "newest":
        return lst.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      default:
        return lst;
    }
  }, [listings, sellerSort]);

  // Sorted reviews
  const sortedReviews = useMemo(() => {
    const rv = [...reviews];
    switch (reviewSort) {
      case "newest":
        return rv.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      case "highest":
        return rv.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "lowest":
        return rv.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      default:
        return rv;
    }
  }, [reviews, reviewSort]);

  // Cart actions
  const handleAddToCart = async (listingId) => {
    setAddingToCart((p) => ({ ...p, [listingId]: true }));
    try {
      await api.post("cart/", { listing: listingId, quantity: 1 });
      setAddedToCart((p) => ({ ...p, [listingId]: true }));
      setTimeout(
        () => setAddedToCart((p) => ({ ...p, [listingId]: false })),
        2500
      );
    } catch (err) {
      console.error(err);
    } finally {
      setAddingToCart((p) => ({ ...p, [listingId]: false }));
    }
  };

  const handleBuyNow = async (listingId) => {
    await handleAddToCart(listingId);
    navigate("/cart");
  };

  // Submit review
  const handleSubmitReview = async () => {
  if (!selectedListing) {
    setReviewMsg({ text: "Please select a seller.", ok: false });
    return;
  }
  if (!reviewText.trim()) {
    setReviewMsg({ text: "Please write your review.", ok: false });
    return;
  }
  setSubmitting(true);
  setReviewMsg({ text: "", ok: true });
  try {
    await addReview({
      listing: Number(selectedListing),
      rating:  reviewRating,
      review:  reviewText,
    });
    setReviewMsg({ text: "Review submitted! Thank you.", ok: true });
    setReviewText("");
    setReviewRating(5);
    // Refresh reviews
    const r = await getProductReviews(id);
    setReviews(r.data?.results || r.data || []);
    // Mark this listing as already_reviewed in local map
    setCanReviewMap((p) => ({
      ...p,
      [Number(selectedListing)]: {
        ...p[Number(selectedListing)],
        can_review:       false,
        already_reviewed: true,
      },
    }));
  } catch (err) {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.non_field_errors?.[0] ||
      "Failed to submit. You may have already reviewed this seller.";
    setReviewMsg({ text: msg, ok: false });
  } finally {
    setSubmitting(false);
  }
};

  // Edit review
  const handleStartEdit = (review) => {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditText(review.review);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      await updateReview(editingId, { rating: editRating, review: editText });
      setReviews((p) =>
        p.map((r) =>
          r.id === editingId
            ? { ...r, rating: editRating, review: editText }
            : r
        )
      );
      setEditingId(null);
    } catch (e) {
      console.error(e);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm("Delete your review? This cannot be undone.")) return;
    try {
      await deleteReview(reviewId);
      setReviews((p) => p.filter((r) => r.id !== reviewId));
    } catch (e) {
      console.error(e);
    }
  };

  // Rating stats
  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
        ).toFixed(1)
      : 0;

  const ratingDist = [5, 4, 3, 2, 1].map((n) => {
    const count = reviews.filter((r) => r.rating === n).length;
    return {
      stars: n,
      count,
      pct: reviews.length > 0 ? (count / reviews.length) * 100 : 0,
    };
  });

  // ── Loading ──
  if (loading) {
    return (
      <div className={`${theme.page} min-h-screen`}>
        <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-72 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-6 rounded bg-gray-200 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div
        className={`${theme.page} min-h-screen flex items-center justify-center`}
      >
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 block mb-3">
            search_off
          </span>
          <p className="text-gray-500 font-medium">Product not found</p>
          <button
            onClick={() => navigate("/home")}
            className={`mt-4 px-6 py-2.5 rounded-xl font-bold text-white text-sm ${theme.primary}`}
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm border ${theme.border} ${theme.card} focus:outline-none focus:ring-2 ${theme.ring} text-gray-700 dark:text-gray-200`;

  return (
    <div className={`${theme.page} min-h-screen pb-10`}>
      <div className="max-w-6xl mx-auto px-4 pt-6">

        {/* ─── Breadcrumb ─── */}
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-5">
          <button onClick={() => navigate("/home")} className="hover:underline">
            Home
          </button>
          <span>›</span>
          <span>{product.category}</span>
          <span>›</span>
          <span className={`font-semibold ${theme.text}`}>{product.name}</span>
        </div>

        {/* ─── Product Hero ─── */}
        <div
          className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-6 mb-8`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Image */}
            <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-8 flex items-center justify-center min-h-56">
              <img
                src={getMediaUrl(product.image)}
                alt={product.name}
                className="max-h-56 object-contain drop-shadow-md"
                onError={(e) => {
                  e.target.src = "/vite.svg";
                }}
              />
            </div>

            {/* Info */}
            <div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${theme.secondary} ${theme.text} mb-3`}
              >
                {product.category}
              </span>

              <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">
                {product.name}
              </h1>

              <div className="flex items-center gap-3 mt-3">
                <StarRow rating={product.average_rating} size="text-xl" />
                <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                  {Number(product.average_rating || 0).toFixed(1)}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">
                  ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                </span>
              </div>

              <div className="mt-5 space-y-2.5">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-base text-green-500">
                    storefront
                  </span>
                  {product.seller_count} seller
                  {product.seller_count !== 1 ? "s" : ""} available
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-base text-green-500">
                    currency_rupee
                  </span>
                  Starting from{" "}
                  <span className="font-bold text-gray-900 dark:text-white text-base">
                    ₹{product.lowest_price}
                  </span>
                </div>
                {product.total_stock > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="material-symbols-outlined text-base text-green-500">
                      inventory_2
                    </span>
                    {product.total_stock} units total in stock
                  </div>
                )}
                {!product.has_stock && (
                  <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined text-base">
                      warning
                    </span>
                    Currently out of stock across all sellers
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-base text-green-500">
                    local_shipping
                  </span>
                  Free delivery available
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Sellers ─── */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h2 className={`text-xl font-bold ${theme.text}`}>
              {listings.length} Seller{listings.length !== 1 ? "s" : ""}{" "}
              Available
            </h2>

            {listings.length > 1 && (
              <select
                value={sellerSort}
                onChange={(e) => setSellerSort(e.target.value)}
                className={`${inputCls} w-auto`}
              >
                <option value="price">Sort: Lowest Price</option>
                <option value="rating">Sort: Highest Rating</option>
                <option value="stock">Sort: Most Stock</option>
                <option value="newest">Sort: Newest</option>
              </select>
            )}
          </div>

          {listings.length === 0 ? (
            <div
              className={`${theme.card} rounded-2xl border ${theme.border} p-14 text-center shadow-sm`}
            >
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-slate-600 block mb-3">
                storefront
              </span>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-lg">
                No sellers yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Be the first to list this product for sale
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedListings.map((listing) => (
                <SellerCard
                  key={listing.id}
                  listing={listing}
                  theme={theme}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  adding={addingToCart[listing.id]}
                  added={addedToCart[listing.id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── Reviews ─── */}
        <div
          className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-6`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className={`text-xl font-bold ${theme.text}`}>
              Customer Reviews
            </h2>
            {reviews.length > 1 && (
              <select
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value)}
                className={`${inputCls} w-auto`}
              >
                <option value="newest">Newest First</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            )}
          </div>

          {/* Rating overview */}
          {reviews.length > 0 && (
            <div className="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b border-gray-100 dark:border-slate-800">
              <div className="text-center flex-shrink-0">
                <div className="text-6xl font-black text-gray-900 dark:text-white">
                  {avgRating}
                </div>
                <StarRow rating={avgRating} size="text-2xl" />
                <div className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {ratingDist.map((d) => (
                  <div key={d.stars} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-6 text-right">
                      {d.stars}★
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all duration-700"
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 w-6">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Review list */}
          {reviews.length === 0 ? (
            <div className="text-center py-10 mb-6">
              <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-slate-600 block mb-3">
                rate_review
              </span>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No reviews yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Purchase this product and be the first to review it
              </p>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {sortedReviews.map((review) => {
                // Inline edit form
                if (editingId === review.id) {
                  return (
                    <div
                      key={review.id}
                      className={`p-5 rounded-2xl border-2 ${theme.secondary}`}
                      style={{ borderColor: "currentColor" }}
                    >
                      <p
                        className={`text-sm font-bold ${theme.text} mb-4`}
                      >
                        ✏️ Edit Your Review
                      </p>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
                            Rating
                          </label>
                          <StarPicker
                            value={editRating}
                            onChange={setEditRating}
                          />
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                            Review
                          </label>
                          <textarea
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className={`${inputCls} resize-none`}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={editSaving}
                            className={`px-5 py-2 rounded-xl text-sm font-bold text-white ${theme.primary} disabled:opacity-60 transition active:scale-[0.98]`}
                          >
                            {editSaving ? (
                              <span className="flex items-center gap-1">
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Saving…
                              </span>
                            ) : (
                              "Save Review"
                            )}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className={`px-5 py-2 rounded-xl text-sm font-bold ${theme.secondary} ${theme.text} border ${theme.border} transition hover:shadow`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    theme={theme}
                    onEdit={handleStartEdit}
                    onDelete={handleDeleteReview}
                  />
                );
              })}
            </div>
          )}

          {/* ─── Add Review Form ─── */}
{listings.length > 0 && (
  <div className={`pt-6 border-t ${theme.border}`}>
    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5">
      Write a Review
    </h3>

    <div className="space-y-4">
      {/* Seller selector */}
      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
          Select Seller *
        </label>
        <select
          value={selectedListing}
          onChange={(e) => {
            setSelectedListing(e.target.value);
            setReviewMsg({ text: "", ok: true });
          }}
          className={inputCls}
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.seller_name}
              {l.seller_business_name ? ` — ${l.seller_business_name}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* ── Purchase gate ── */}
      {selectedListing && (() => {
        const info = canReviewMap[Number(selectedListing)];
        if (!info) return null;

        if (!info.has_purchased) {
          return (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                shopping_bag
              </span>
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Purchase required
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  You can only review sellers you have purchased from. Buy this
                  listing and receive your order to unlock reviews.
                </p>
              </div>
            </div>
          );
        }

        if (info.already_reviewed) {
          return (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
              <span className="material-symbols-outlined text-blue-500 flex-shrink-0 mt-0.5">
                rate_review
              </span>
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  Already reviewed
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                  You've already reviewed this seller. Find your review above to
                  edit or delete it.
                </p>
              </div>
            </div>
          );
        }

        // can_review === true — show the form
        return (
          <>
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                Your Rating *
              </label>
              <StarPicker value={reviewRating} onChange={setReviewRating} />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
                Your Review *
              </label>
              <textarea
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this product and seller…"
                className={`${inputCls} resize-y`}
              />
            </div>

            {reviewMsg.text && (
              <div className={`text-sm px-4 py-3 rounded-xl flex gap-2 ${
                reviewMsg.ok
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}>
                <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">
                  {reviewMsg.ok ? "check_circle" : "error"}
                </span>
                {reviewMsg.text}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmitReview}
                disabled={submitting || !reviewText.trim()}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all ${
                  submitting || !reviewText.trim()
                    ? "opacity-60 cursor-not-allowed bg-gray-400"
                    : `${theme.primary} hover:shadow-md active:scale-[0.98]`
                }`}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting…
                  </span>
                ) : "Submit Review"}
              </button>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">verified</span>
                Verified Purchase
              </span>
            </div>
          </>
        );
      })()}
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}

export default ProductDetails;