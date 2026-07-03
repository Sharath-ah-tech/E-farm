import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getCart, removeFromCart, updateCart } from "../api/cart";

function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const theme = getTheme();
  const navigate = useNavigate();

  useEffect(() => {
    getCart()
      .then((r) => setItems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id) => {
    await removeFromCart(id).catch(console.error);
    setItems((p) => p.filter((i) => i.id !== id));
  };

  const handleQty = async (id, qty) => {
    if (qty < 1) return;
    setUpdating((p) => ({ ...p, [id]: true }));
    try {
      await updateCart(id, qty);
      setItems((p) =>
        p.map((i) =>
          i.id === id
            ? { ...i, quantity: qty, total_price: qty * parseFloat(i.listing_price || 0) }
            : i
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating((p) => ({ ...p, [id]: false }));
    }
  };

  const subtotal = items.reduce(
    (s, i) => s + parseFloat(i.total_price || 0),
    0
  );
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  if (loading) {
    return (
      <div className={`${theme.page} min-h-screen`}>
        <div className="max-w-5xl mx-auto px-4 pt-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`${theme.page} min-h-screen flex items-center justify-center`}
      >
        <div className="text-center">
          <span className="material-symbols-outlined text-8xl text-gray-300 dark:text-slate-600 block mb-4">
            shopping_cart
          </span>
          <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-300 mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-400 dark:text-gray-500 mb-6">
            Discover fresh farm products and add them to your cart
          </p>
          <button
            onClick={() => navigate("/home")}
            className={`px-8 py-3 rounded-xl font-bold text-white ${theme.primary} transition`}
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.page} min-h-screen`}>
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-10">
        <h1 className={`text-2xl font-bold mb-6 ${theme.text}`}>
          Shopping Cart
          <span className="text-gray-400 dark:text-gray-500 text-sm font-normal ml-2">
            ({totalQty} item{totalQty !== 1 ? "s" : ""})
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Items ── */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-4 flex gap-4`}
              >
                <img
                  src={item.product_image || "/vite.svg"}
                  alt={item.product_name}
                  className="w-20 h-20 object-contain rounded-xl bg-gray-50 dark:bg-slate-800 flex-shrink-0"
                  onError={(e) => {
                    e.target.src = "/vite.svg";
                  }}
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {item.product_name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Sold by{" "}
                    <button
                      onClick={() => navigate(`/seller/${item.seller_id}`)}
                      className={`${theme.text} font-medium hover:underline`}
                    >
                      {item.seller_name}
                    </button>
                  </p>
                  <p className="text-xl text-gray-400 dark:text-green-500 tracking-wide font-bold mt-4">
                    ₹{item.listing_price} / {item.units}
                  </p>

                  <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                    {/* Qty control */}
                    <div
                      className={`flex items-center border ${theme.border} rounded-xl overflow-hidden`}
                    >
                      <button
                        onClick={() => handleQty(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updating[item.id]}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                      >
                        <span className="material-symbols-outlined text-sm">
                          remove
                        </span>
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        {updating[item.id] ? (
                          <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          item.quantity
                        )}
                      </span>
                      <button
                        onClick={() => handleQty(item.id, item.quantity + 1)}
                        disabled={
                          item.quantity >= (item.stock || 99) ||
                          updating[item.id]
                        }
                        className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 transition"
                      >
                        <span className="material-symbols-outlined text-sm">
                          add
                        </span>
                      </button>
                    </div>

                    {/* Price + remove */}
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg ${theme.text}`}>
                        ₹
                        {parseFloat(item.total_price || 0).toLocaleString(
                          "en-IN"
                        )}
                      </span>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 transition"
                      >
                        <span className="material-symbols-outlined text-sm">
                          delete
                        </span>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Summary ── */}
          <div className="lg:col-span-1">
            <div
              className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-5 sticky top-4`}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h3>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>
                    Subtotal ({totalQty} item{totalQty !== 1 ? "s" : ""})
                  </span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Delivery</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
              </div>

              <div
                className={`border-t ${theme.border} pt-3 mb-5 flex justify-between font-bold text-gray-900 dark:text-white`}
              >
                <span>Total</span>
                <span className="text-xl">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              <button
                onClick={() => navigate("/checkout")}
                className={`w-full py-3 rounded-xl font-bold text-white ${theme.primary} hover:shadow-lg transition-all duration-200 active:scale-[0.98]`}
              >
                Proceed to Checkout
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  security
                </span>
                Secure & encrypted checkout
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;