import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { getTheme } from "../utils/theme";
import api from "../api/axios";

const STEPS = [
  { key: "pending", label: "Order Placed", icon: "receipt_long" },
  { key: "processing", label: "Processing", icon: "inventory_2" },
  { key: "shipped", label: "Shipped", icon: "local_shipping" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "delivery_dining" },
  { key: "delivered", label: "Delivered", icon: "check_circle" },
];

const STATUS_ORDER = ["pending", "processing", "shipped", "out_for_delivery", "delivered"];

function Timeline({ status }) {
  const currentIdx =
    status === "cancelled"
      ? -1
      : STATUS_ORDER.indexOf(status);

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <span className="material-symbols-outlined text-2xl text-red-500">cancel</span>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-400">Order Cancelled</p>
          <p className="text-xs text-red-500 dark:text-red-500">This order has been cancelled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200 dark:bg-slate-700" />
      <div
        className="absolute left-5 top-5 w-0.5 bg-green-500 transition-all duration-500"
        style={{
          height: `${currentIdx >= 0 ? (currentIdx / (STEPS.length - 1)) * 100 : 0}%`,
        }}
      />

      <div className="space-y-4">
        {STEPS.map((step, idx) => {
          const done = idx <= currentIdx;
          const current = idx === currentIdx;
          return (
            <div key={step.key} className="relative flex items-start gap-4 pl-0">
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done
                    ? "bg-green-500 text-white shadow-md shadow-green-200 dark:shadow-green-900"
                    : "bg-gray-100 dark:bg-slate-800 text-gray-400"
                } ${current ? "ring-4 ring-green-200 dark:ring-green-900" : ""}`}
              >
                <span className="material-symbols-outlined text-lg">{step.icon}</span>
              </div>
              <div className={`pt-2 ${done ? "" : "opacity-40"}`}>
                <p className={`text-sm font-semibold ${done ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>
                  {step.label}
                </p>
                {current && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Current status</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = getTheme();
  const navigate = useNavigate();
  const isSuccess = searchParams.get("success") === "1";

  useEffect(() => {
    api
      .get(`orders/${id}/`)
      .then((r) => setOrder(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className={`${theme.page} min-h-screen flex items-center justify-center`}>
        <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${theme.default}`} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className={`${theme.page} min-h-screen flex items-center justify-center`}>
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const subtotal = order.items?.reduce(
    (s, i) => s + parseFloat(i.item_total || i.price * i.quantity || 0),
    0
  ) || 0;

  return (
    <div className={`${theme.page} min-h-screen pb-10`}>
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Success banner */}
        {isSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-green-500">check_circle</span>
            <div>
              <p className="font-bold text-green-700 dark:text-green-400">Order Placed Successfully!</p>
              <p className="text-sm text-green-600 dark:text-green-500">
                Your order #{order.id} has been confirmed.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <button
              onClick={() => navigate("/orders")}
              className={`text-sm ${theme.text} hover:opacity-70 flex items-center gap-1 mb-2`}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              My Orders
            </button>
            <h1 className={`text-2xl font-bold ${theme.text}`}>
              Order #{order.id}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Placed on{" "}
              {new Date(order.order_date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <a
            href={`http://127.0.0.1:8000/api/generate-bill/${order.id}/`}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${theme.secondary} ${theme.text} border ${theme.border} hover:shadow transition`}
          >
            <span className="material-symbols-outlined text-base">download</span>
            Invoice
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-5">
            {/* Items */}
            <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-5`}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Items ({order.items?.length || 0})
              </h2>
              <div className="space-y-4">
                {order.items?.map((item) => (
                  <div key={item.id} className={`flex gap-4 pb-4 border-b ${theme.border} last:border-0 last:pb-0`}>
                    <img
                      src={item.product_image || "/vite.svg"}
                      alt={item.product_name}
                      className="w-16 h-16 rounded-xl object-contain bg-gray-50 dark:bg-slate-800 flex-shrink-0"
                      onError={(e) => { e.target.src = "/vite.svg"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Seller:{" "}
                        <button
                          onClick={() => navigate(`/seller/${item.seller_id}`)}
                          className={`${theme.text} font-medium hover:underline`}
                        >
                          {item.seller_name}
                        </button>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {item.quantity} × ₹{item.price} ({item.units})
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900 dark:text-white">
                        ₹{parseFloat(item.item_total || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tracking Timeline */}
            <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-5`}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5">
                Order Timeline
              </h2>
              <Timeline status={order.track_status || order.status} />
            </div>

            {/* Shipping Address */}
            {order.shipping && (
              <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-5`}>
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-green-500">local_shipping</span>
                  Delivery Address
                </h2>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                  <p>{order.shipping.address}</p>
                  <p>
                    {order.shipping.city}, {order.shipping.state} —{" "}
                    {order.shipping.postal_code}
                  </p>
                  <p>{order.shipping.country}</p>
                  {order.shipping.phone && <p>📞 {order.shipping.phone}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Price breakdown */}
            <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-5`}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                Price Breakdown
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Delivery</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
                <div className={`border-t ${theme.border} pt-2 flex justify-between font-bold text-gray-900 dark:text-white`}>
                  <span>Grand Total</span>
                  <span>₹{parseFloat(order.total_amount || 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Payment info */}
            <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-5`}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-green-500">payments</span>
                Payment
              </h2>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Method</span>
                  <span className="font-medium text-gray-900 dark:text-white uppercase">
                    {order.payment_type || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <span
                    className={`font-semibold capitalize ${
                      order.payment_status === "paid"
                        ? "text-green-600"
                        : order.payment_status === "failed"
                        ? "text-red-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {order.payment_status || "pending"}
                  </span>
                </div>
              </div>
            </div>

            {/* Order status */}
            <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-5`}>
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                Order Status
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  {
                    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                    processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                    out_for_delivery: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
                    delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                  }[order.status] || "bg-gray-100 text-gray-600"
                }`}
              >
                {order.status?.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;