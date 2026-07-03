import { memo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getMediaUrl } from "../utils/media";
import { getTheme } from "../utils/theme";
import { useWishlist } from "../contexts/WishlistContext";
import { useToast } from "../utils/toast";

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

// Days since product was created (used for "New" badge — approximated via id recency)
const NEW_THRESHOLD_DAYS = 14;

function ProductCardInner({ product }) {
  const theme = getTheme();
  const toast = useToast();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [wlBusy, setWlBusy] = useState(false);

  const wishlisted = isWishlisted(product.id);

  const inStock =
    product.has_stock === true ||
    Number(product.total_stock || 0) > 0 ||
    (product.seller_count > 0 && Number(product.lowest_price) > 0);

  const lowStock = inStock && Number(product.total_stock || 0) > 0 && Number(product.total_stock) <= 15;
  const bestSeller = (product.review_count || 0) >= 10 && Number(product.average_rating || 0) >= 4;
  const isNew = product.created_at
    ? (Date.now() - new Date(product.created_at).getTime()) / 86400000 <= NEW_THRESHOLD_DAYS
    : false;

  const handleWishlist = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (wlBusy) return;
      setWlBusy(true);
      const willBeWishlisted = !wishlisted;
      const ok = await toggleWishlist(product.id);
      setWlBusy(false);
      if (ok) {
        toast.show(
          willBeWishlisted ? "Added to wishlist" : "Removed from wishlist",
          "success",
          1800
        );
      } else {
        toast.show("Could not update wishlist. Try again.", "error");
      }
    },
    [wlBusy, wishlisted, toggleWishlist, product.id, toast]
  );

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col">
      {/* ── Image ── */}
      <div className="relative overflow-hidden bg-gray-50 dark:bg-slate-800 flex-shrink-0">
        <img
          src={getMediaUrl(product.image)}
          alt={product.name}
          loading="lazy"
          className="w-full h-40 object-contain p-2 group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.target.src = "/vite.svg"; }}
        />

        {/* Badges — priority: out of stock > low stock > best seller > new */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {!inStock && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shadow">
              Out of Stock
            </span>
          )}
          {inStock && lowStock && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full shadow">
              Only {product.total_stock} left
            </span>
          )}
          {inStock && bestSeller && (
            <span className="px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold rounded-full shadow flex items-center gap-0.5">
              🔥 Best Seller
            </span>
          )}
          {inStock && !bestSeller && isNew && (
            <span className="px-2 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full shadow">
              ✨ New
            </span>
          )}
        </div>

        {/* Wishlist button — driven entirely by context */}
        <button
          onClick={handleWishlist}
          disabled={wlBusy}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 ${
            wishlisted
              ? "bg-red-500 text-white"
              : "bg-white dark:bg-slate-700 text-gray-300 hover:text-red-400"
          }`}
        >
          <span className="material-symbols-outlined text-lg leading-none">
            {wishlisted ? "favorite" : "favorite_border"}
          </span>
        </button>

        {inStock && (
          <div className="absolute bottom-2 left-2">
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
              📦 Free Delivery
            </span>
          </div>
        )}
      </div>

      {/* ── Info ── */}
      <div className="p-3 flex flex-col flex-1">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${theme.text}`}>
          {product.category}
        </span>

        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mt-0.5 line-clamp-2 leading-snug flex-1">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mt-1.5">
          <StarRow rating={product.average_rating} />
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            ({Number(product.average_rating || 0).toFixed(1)})
            {product.review_count > 0 && <span className="ml-1">{product.review_count} reviews</span>}
          </span>
        </div>

        {/* Price (already discounted via Product.lowest_price → final_price) */}
        <div className="mt-1.5">
          <span className="text-base font-bold text-gray-900 dark:text-white">
            ₹{product.lowest_price}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">onwards</span>
        </div>

        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {product.seller_count} seller{product.seller_count !== 1 ? "s" : ""}
          </p>
          {product.total_stock > 0 && (
            <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">
              {product.total_stock} in stock
            </p>
          )}
        </div>

        <Link
          to={`/productdetail/${product.id}`}
          className={`block w-full text-center mt-2.5 py-2 rounded-xl text-xs font-bold text-white transition-all duration-200 ${
            inStock
              ? `${theme.primary} hover:shadow-md active:scale-[0.98]`
              : "bg-gray-200 dark:bg-slate-700 text-gray-400 pointer-events-none"
          }`}
        >
          {inStock ? "View Sellers" : "Unavailable"}
        </Link>
      </div>
    </div>
  );
}

// ── Memoized export — re-renders only when product data or its id changes ──────
const ProductCard = memo(ProductCardInner, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.lowest_price === next.product.lowest_price &&
    prev.product.total_stock === next.product.total_stock &&
    prev.product.average_rating === next.product.average_rating
  );
});

export default ProductCard;