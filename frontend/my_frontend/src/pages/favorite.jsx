import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getWishlist, removeWishlist } from "../api/wishlist";
import { addToCart } from "../api/cart";

function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carting, setCarting] = useState({});
  const [carted, setCarted] = useState({});
  const theme = getTheme();
  const navigate = useNavigate();

  useEffect(() => {
    getWishlist()
      .then((r) => setItems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  const handleRemove = async (id) => {
    await removeWishlist(id).catch(console.error);
    setItems((p) => p.filter((i) => i.id !== id));
  };

  const handleAddToCart = async (wishlistItem) => {
    const listingId = wishlistItem.listing_id;
    if (!listingId) return;
    setCarting((p) => ({ ...p, [wishlistItem.id]: true }));
    try {
      await addToCart(listingId, 1);
      setCarted((p) => ({ ...p, [wishlistItem.id]: true }));
      setTimeout(
        () => setCarted((p) => ({ ...p, [wishlistItem.id]: false })),
        2500,
      );
    } catch (e) {
      console.error(e);
    } finally {
      setCarting((p) => ({ ...p, [wishlistItem.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className={`${theme.page} min-h-screen`}>
        <div className="max-w-5xl mx-auto px-4 pt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.page} min-h-screen`}>
      <div className="max-w-5xl mx-auto px-4 pt-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${theme.text}`}>
            My Wishlist
            <span className="text-gray-400 dark:text-gray-500 text-sm font-normal ml-2">
              ({items.length} item{items.length !== 1 ? "s" : ""})
            </span>
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-8xl text-gray-300 dark:text-slate-600 block mb-4">
              favorite_border
            </span>
            <h2 className="text-2xl font-bold text-gray-500 dark:text-gray-400 mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-400 dark:text-gray-500 mb-6">
              Save products you like and come back to them anytime
            </p>
            <button
              onClick={() => navigate("/home")}
              className={`px-8 py-3 rounded-xl font-bold text-white ${theme.primary} transition`}
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((item) => (
              <WishlistCard
                key={item.id}
                item={item}
                theme={theme}
                onRemove={handleRemove}
                onAddToCart={handleAddToCart}
                onBuyNow={() => {
                  handleAddToCart(item).then(() => navigate("/cart"));
                }}
                onView={() => navigate(`/productdetail/${item.listing_id}`)}
                carting={carting[item.id]}
                carted={carted[item.id]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WishlistCard({
  item,
  theme,
  onRemove,
  onAddToCart,
  onBuyNow,
  onView,
  carting,
  carted,
}) {
  const inStock = item.stock > 0;

  return (
    <div
      className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col`}
    >
      {/* Image */}
      <div className="relative h-44 bg-gray-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
        <img
          src={item.product_image || "/vite.svg"}
          alt={item.product_name}
          className="h-full w-full object-contain p-3"
          onError={(e) => {
            e.target.src = "/vite.svg";
          }}
        />
        {!inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-red-500 px-3 py-1 rounded-full">
              Out of Stock
            </span>
          </div>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow transition active:scale-90"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${theme.text}`}
        >
          {item.product_category}
        </span>
        <h3
          className="text-sm font-semibold text-gray-800 dark:text-white mt-0.5 line-clamp-2 cursor-pointer hover:underline"
          onClick={onView}
        >
          {item.product_name}
        </h3>

        {/* <div className="flex items-center gap-1 mt-1">
          <span className="text-yellow-400 text-sm">
            {"★".repeat(Math.round(item.average_rating || 0))}
            <span className="text-gray-300 dark:text-gray-700">
              {"★".repeat(5 - Math.round(item.average_rating || 0))}
            </span>
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {Number(item.average_rating || 0).toFixed(1)}
          </span>
        </div> */}

        <div className="mt-1.5">
          <span className="text-base font-bold text-gray-900 dark:text-white">
            ₹{item.price}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
            per items
          </span>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Seller: {item.seller_name}
        </p>
        <p
          className={`text-xs mt-1 ${
            item.stock > 0 ? "text-green-600" : "text-red-500"
          }`}
        >
          {item.stock > 0 ? `${item.stock} in stock` : "Out of Stock"}
        </p>

        {/* Buttons */}
        <div className="mt-3 space-y-2">
          <button
            onClick={() => onAddToCart(item)}
            disabled={!inStock || carting}
            className={`w-full py-2 rounded-xl text-xs font-bold border transition-all active:scale-[0.98] ${
              carted
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300"
                : inStock
                  ? `border-current ${theme.text} ${theme.secondary} hover:shadow`
                  : "border-gray-200 dark:border-slate-700 text-gray-300 cursor-not-allowed"
            }`}
          >
            {carting ? (
              <span className="flex items-center justify-center gap-1">
                <span className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" />
                Adding…
              </span>
            ) : carted ? (
              "✓ Added to Cart!"
            ) : (
              "Add to Cart"
            )}
          </button>
          <button
            onClick={onBuyNow}
            disabled={!inStock}
            className={`w-full py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-[0.98] ${
              inStock
                ? `${theme.primary} hover:shadow-md`
                : "bg-gray-200 dark:bg-slate-700 cursor-not-allowed"
            }`}
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default Wishlist;
