import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { useToast } from "../utils/toast";
import { getCart } from "../api/cart";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  reportRazorpayFailed,
  codCheckout,
} from "../api/payment";
import api from "../api/axios";

// ── Load Razorpay script ───────────────────────────────────────────────────────

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s   = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const inputCls = (theme) =>
  `w-full rounded-xl px-4 py-2.5 text-sm border ${theme.border} ${theme.card} ` +
  `focus:outline-none focus:ring-2 ${theme.ring} text-gray-700 dark:text-gray-200`;

// ── Payment method card ────────────────────────────────────────────────────────

function PaymentMethodCard({ id, label, icon, description, selected, onSelect, disabled }) {
  return (
    <label
      className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
        disabled
          ? "border-gray-100 dark:border-slate-800 opacity-40 cursor-not-allowed"
          : selected
          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
          : "border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600"
      }`}
    >
      <input
        type="radio"
        value={id}
        checked={selected}
        onChange={() => !disabled && onSelect(id)}
        disabled={disabled}
        className="sr-only"
      />
      <span
        className={`material-symbols-outlined text-2xl ${
          selected ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"
        }`}
      >
        {icon}
      </span>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
      </div>
      {selected && (
        <span className="material-symbols-outlined text-emerald-500 flex-shrink-0">
          check_circle
        </span>
      )}
    </label>
  );
}

// ── Main Checkout ──────────────────────────────────────────────────────────────

function Checkout() {
  const [cartItems,    setCartItems]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [placing,      setPlacing]      = useState(false);
  const [error,        setError]        = useState("");
  const [paymentType,  setPaymentType]  = useState("razorpay");

  const [form, setForm] = useState({
    address: "", city: "", state: "",
    postal_code: "", phone: "", country: "India",
  });

  const theme    = getTheme();
  const navigate = useNavigate();
  const toast    = useToast();
  const username = localStorage.getItem("username") || "";

  useEffect(() => {
    // Pre-fill profile data
    api.get("profile/")
      .then((r) => {
        const p = r.data?.results?.[0] ?? (Array.isArray(r.data) ? r.data[0] : r.data);
        if (p) setForm((prev) => ({
          ...prev,
          address: p.address || "",
          state:   p.state   || "",
          phone:   p.phone   || "",
        }));
      })
      .catch(() => {});

    getCart()
      .then((r) => setCartItems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const subtotal = cartItems.reduce(
    (s, i) => s + parseFloat(i.total_price || 0), 0
  );

  const validateForm = () => {
    if (!form.address || !form.city || !form.state || !form.postal_code) {
      setError("Please fill in all required address fields.");
      return false;
    }
    return true;
  };

  // ── COD flow ─────────────────────────────────────────────────────────────────
  const handleCOD = async () => {
    if (!validateForm()) return;
    setPlacing(true);
    setError("");
    try {
      const res = await codCheckout({
        shipping_address: form,
        payment_type:     "cod",
      });
      toast.show("Order placed successfully!", "success");
      navigate(`/orders/${res.data.order_id}?success=1`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // ── Razorpay flow ─────────────────────────────────────────────────────────────
  const handleRazorpay = async () => {
    if (!validateForm()) return;
    setPlacing(true);
    setError("");

    try {
      // 1. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setError("Could not load Razorpay. Check your internet connection.");
        setPlacing(false);
        return;
      }

      // 2. Create Razorpay order on backend
      const orderRes = await createRazorpayOrder();
      const {
        razorpay_order_id,
        amount,
        currency,
        key,
        name,
        description,
        prefill_name,
        prefill_email,
        prefill_contact,
      } = orderRes.data;

      // 3. Open Razorpay modal
      const options = {
        key,
        amount,
        currency,
        name,
        description,
        order_id: razorpay_order_id,
        theme:    { color: "#059669" },

        prefill: {
          name:    prefill_name  || username,
          email:   prefill_email || "",
          contact: form.phone    || prefill_contact || "",
        },

        notes: {
          address: form.address,
          city:    form.city,
          state:   form.state,
        },

        // ── Payment success handler ────────────────────────────────────────────
        handler: async (response) => {
          try {
            const verifyRes = await verifyRazorpayPayment({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              shipping_address:    form,
            });
            toast.show("Payment successful! Order confirmed.", "success");
            navigate(`/orders/${verifyRes.data.order_id}?success=1`);
          } catch (verErr) {
            setError(
              verErr.response?.data?.error ||
              "Payment verification failed. Contact support if you were charged."
            );
            setPlacing(false);
          }
        },

        // ── Payment failure handler ────────────────────────────────────────────
        modal: {
          ondismiss: () => {
            toast.show("Payment cancelled. Your cart is saved.", "info");
            setPlacing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", async (response) => {
        const desc = response.error?.description || "Payment failed";
        await reportRazorpayFailed({
          error_description: desc,
          razorpay_order_id,
        }).catch(() => {});
        setError(`Payment failed: ${desc}. Please try again.`);
        setPlacing(false);
      });

      rzp.open();

    } catch (err) {
      setError(err.response?.data?.error || "Could not initiate payment. Please try again.");
      setPlacing(false);
    }
  };

  const handlePlace = () => {
    if (paymentType === "razorpay") return handleRazorpay();
    return handleCOD();
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className={`${theme.page} min-h-screen flex items-center justify-center`}>
        <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${theme.default}`} />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className={`${theme.page} min-h-screen flex items-center justify-center`}>
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 block mb-3">shopping_cart</span>
          <p className="text-gray-500 font-medium">Your cart is empty</p>
          <button onClick={() => navigate("/home")} className={`mt-4 px-6 py-2.5 rounded-xl font-bold text-white text-sm ${theme.primary}`}>
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.page} min-h-screen pb-10`}>
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <h1 className={`text-2xl font-bold mb-6 ${theme.text}`}>Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* ── Left: Form ── */}
          <div className="lg:col-span-3 space-y-6">

            {/* Shipping Address */}
            <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-6`}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-green-500">local_shipping</span>
                Delivery Address
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Full Address *</label>
                  <textarea rows={2} value={form.address} onChange={set("address")} placeholder="House no., street, area..." className={`${inputCls(theme)} resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">City *</label>
                    <input type="text" value={form.city} onChange={set("city")} placeholder="City" className={inputCls(theme)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">State *</label>
                    <input type="text" value={form.state} onChange={set("state")} placeholder="State" className={inputCls(theme)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Postal Code *</label>
                    <input type="text" value={form.postal_code} onChange={set("postal_code")} placeholder="600001" className={inputCls(theme)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Phone</label>
                    <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" className={inputCls(theme)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-6`}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-green-500">payments</span>
                Payment Method
              </h2>
              <div className="space-y-3">
                <PaymentMethodCard
                  id="razorpay"
                  label="Pay Online"
                  icon="credit_card"
                  description="UPI · Credit/Debit Card · Net Banking · Wallets — powered by Razorpay"
                  selected={paymentType === "razorpay"}
                  onSelect={setPaymentType}
                />
                <PaymentMethodCard
                  id="cod"
                  label="Cash on Delivery"
                  icon="local_atm"
                  description="Pay in cash when your order arrives at your doorstep"
                  selected={paymentType === "cod"}
                  onSelect={setPaymentType}
                />
              </div>

              {paymentType === "razorpay" && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-blue-700 dark:text-blue-400 font-medium">
                    <span className="material-symbols-outlined text-sm">security</span>
                    Secured by Razorpay · 100% Safe & Encrypted
                    <span className="ml-auto flex items-center gap-1 flex-wrap">
                      {["UPI","Visa","Mastercard","BHIM","PhonePe"].map((m) => (
                        <span key={m} className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded text-xs border border-blue-200 dark:border-blue-700">
                          {m}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
                <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">error</span>
                {error}
              </div>
            )}
          </div>

          {/* ── Right: Summary ── */}
          <div className="lg:col-span-2">
            <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-5 sticky top-4`}>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Order Summary
                <span className="text-sm font-normal text-gray-400 ml-2">({cartItems.length} item{cartItems.length !== 1 ? "s" : ""})</span>
              </h3>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <img
                      src={item.product_image || "/vite.svg"}
                      alt={item.product_name}
                      className="w-12 h-12 rounded-lg object-contain bg-gray-50 dark:bg-slate-800 flex-shrink-0"
                      onError={(e) => { e.target.src = "/vite.svg"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{item.product_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">×{item.quantity} {item.units}</p>
                        {item.has_discount && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">
                            -{item.discount_percentage}%
                          </span>
                        )}
                      </div>
                      {item.has_discount && (
                        <p className="text-[10px] text-gray-400 line-through">
                          ₹{parseFloat(item.listing_price || 0).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        ₹{parseFloat(item.total_price || 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className={`border-t ${theme.border} pt-3 space-y-2 text-sm mb-5`}>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Delivery</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
                <div className={`border-t ${theme.border} pt-2 flex justify-between font-bold text-gray-900 dark:text-white text-base`}>
                  <span>Total</span>
                  <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handlePlace}
                disabled={placing}
                className={`
                  w-full py-3 rounded-xl font-bold text-white transition-all
                  flex items-center justify-center gap-2
                  ${theme.primary} hover:shadow-lg active:scale-[0.98]
                  disabled:opacity-60 disabled:cursor-not-allowed
                `}
              >
                {placing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {paymentType === "razorpay" ? "Opening Payment…" : "Placing Order…"}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">
                      {paymentType === "razorpay" ? "credit_card" : "shopping_bag"}
                    </span>
                    {paymentType === "razorpay"
                      ? `Pay ₹${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      : "Place COD Order"}
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm">security</span>
                {paymentType === "razorpay" ? "256-bit SSL · Razorpay secured" : "Pay when delivered · No advance needed"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Checkout;