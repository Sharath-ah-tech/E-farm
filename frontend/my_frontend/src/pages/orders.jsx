import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getOrders, getCustomerOrders, cancelOrder } from "../api/orders";
import { downloadInvoice } from "../api/invoice";
import { useToast } from "../utils/toast";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  shipped: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  out_for_delivery: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PAY_COLOR = {
  pending: "text-yellow-600 dark:text-yellow-400",
  paid: "text-green-600 dark:text-green-400",
  failed: "text-red-600 dark:text-red-400",
  refunded: "text-blue-600 dark:text-blue-400",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
        STATUS_BADGE[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status?.replace(/_/g, " ")}
    </span>
  );
}

function TabBar({ tabs, active, onSelect, theme, counts = {} }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
      {tabs.map((tab) => {
        const count = counts[tab.key] ?? 0;
        return (
          <button
            key={tab.key}
            onClick={() => onSelect(tab.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold transition-all ${
              active === tab.key
                ? `${theme.primary} text-white shadow`
                : `${theme.card} ${theme.text} border ${theme.border} hover:shadow`
            }`}
          >
            {tab.label}
            {tab.key !== "all" && count > 0 && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  active === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── My Purchases order card (same for customer & seller buying) ── */
function PurchaseCard({ order, theme, onCancel, cancelling, navigate }) {
  const firstItem = order.items?.[0];
  return (
    <div
      className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm overflow-hidden hover:shadow-md transition-all`}
    >
      {/* Header */}
      <div
        className={`${theme.secondary} px-5 py-3 flex items-center justify-between flex-wrap gap-2`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            ORDER #{order.id}
          </span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(order.order_date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          {order.payment_status && (
            <span
              className={`text-xs font-semibold ${
                PAY_COLOR[order.payment_status] || "text-gray-500"
              }`}
            >
              {order.payment_type?.toUpperCase()}
              {order.payment_status &&
                ` · ${order.payment_status}`}
            </span>
          )}
          {/* Inside PurchaseCard's action button row */}
          <InlineInvoiceButton orderId={order.id} theme={theme} />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex gap-4 items-center">
        {firstItem && (
          <img
            src={firstItem.product_image || "/vite.svg"}
            alt={firstItem.product_name}
            className="w-14 h-14 rounded-xl object-contain bg-gray-50 dark:bg-slate-800 flex-shrink-0"
            onError={(e) => {
              e.target.src = "/vite.svg";
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          {firstItem && (
            <>
              <p className="font-semibold text-gray-900 dark:text-white truncate">
                {firstItem.product_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Seller: {firstItem.seller_name} · Qty: {firstItem.quantity}
              </p>
            </>
          )}
          {order.items?.length > 1 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              +{order.items.length - 1} more item
              {order.items.length > 2 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ₹{parseFloat(order.total_amount || 0).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div
        className={`border-t ${theme.border} px-5 py-3 flex items-center gap-2 flex-wrap`}
      >
        <button
          onClick={() => navigate(`/orders/${order.id}`)}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${theme.secondary} ${theme.text} border ${theme.border} hover:shadow transition`}
        >
          View Details
        </button>
        {!["delivered", "cancelled"].includes(order.status) && (
          <button
            onClick={() => navigate(`/orders/${order.id}`)}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white ${theme.primary} hover:shadow transition flex items-center gap-1`}
          >
            <span className="material-symbols-outlined text-sm">
              location_on
            </span>
            Track Order
          </button>
        )}
        {order.status === "pending" && (
          <button
            onClick={() => onCancel(order.id)}
            disabled={cancelling}
            className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel Order"}
          </button>
        )}
        {order.status === "delivered" && (
          <button
            onClick={() => navigate("/home")}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:shadow transition"
          >
            Buy Again
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Customer order card (seller viewing orders placed for their listings) ── */
function CustomerOrderCard({ order, theme, navigate }) {
  const firstItem = order.items?.[0];
  return (
    <div
      className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm overflow-hidden hover:shadow-md transition-all`}
    >
      {/* Header */}
      <div
        className={`${theme.secondary} px-5 py-3 flex items-center justify-between flex-wrap gap-2`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
            ORDER #{order.id}
          </span>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(order.order_date).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex gap-4 items-start">
        {firstItem && (
          <img
            src={firstItem.product_image || "/vite.svg"}
            alt={firstItem.product_name}
            className="w-14 h-14 rounded-xl object-contain bg-gray-50 dark:bg-slate-800 flex-shrink-0"
            onError={(e) => {
              e.target.src = "/vite.svg";
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-base text-gray-400">
              person
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {order.customer}
            </span>
          </div>
          {order.items.map((item) => (
            <div
              key={item.id}
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {item.product_name} × {item.quantity} — ₹
              {item.item_total.toLocaleString("en-IN")}
            </div>
          ))}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            ₹{parseFloat(order.seller_total || 0).toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            my earnings
          </p>
          {order.payment_status && (
            <span
              className={`text-xs font-semibold ${
                PAY_COLOR[order.payment_status] || "text-gray-500"
              }`}
            >
              {order.payment_status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
function InlineInvoiceButton({ orderId, theme }) {
  const [downloading, setDownloading] = useState(false);
  const toast = useToast();

  const handleClick = async (e) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const { filename } = await downloadInvoice(orderId);
      toast.show(`${filename} downloaded!`, "success");
    } catch {
      toast.show("Invoice download failed.", "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={downloading}
      className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:shadow transition disabled:opacity-60 flex items-center gap-1"
    >
      {downloading ? (
        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="material-symbols-outlined text-sm">download</span>
      )}
      Invoice
    </button>
  );
}
/* ── Main Orders Page ── */
function Orders() {
  const theme = getTheme();
  const navigate = useNavigate();
  const role = localStorage.getItem("role")?.toLowerCase() || "customer";
  const isSeller = role === "farmer" || role === "wholesaler";

  // Section tabs for sellers
  const [section, setSection] = useState("customer_orders"); // 'customer_orders' | 'my_purchases'

  // Status filter tabs (apply to whichever section is active)
  const [statusTab, setStatusTab] = useState("all");

  // Data
  const [myOrders, setMyOrders] = useState([]); // my purchases
  const [customerOrders, setCustomerOrders] = useState([]); // orders for my listings
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const myRes = await getOrders();
        setMyOrders(myRes.data);

        if (isSeller) {
          const coRes = await getCustomerOrders();
          setCustomerOrders(coRes.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [isSeller]);

  const handleCancel = async (orderId) => {
    if (!confirm("Cancel this order?")) return;
    setCancelling((p) => ({ ...p, [orderId]: true }));
    try {
      await cancelOrder(orderId);
      setMyOrders((p) =>
        p.map((o) =>
          o.id === orderId
            ? { ...o, status: "cancelled", track_status: "cancelled" }
            : o
        )
      );
    } catch (e) {
      alert(e.response?.data?.error || "Failed to cancel order");
    } finally {
      setCancelling((p) => ({ ...p, [orderId]: false }));
    }
  };

  // Determine which list to show
  const activeList =
    !isSeller || section === "my_purchases" ? myOrders : customerOrders;

  const filtered =
    statusTab === "all"
      ? activeList
      : activeList.filter((o) => o.status === statusTab);

  // Count by status for tab badges
  const counts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = activeList.filter((o) => o.status === tab.key).length;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className={`${theme.page} min-h-screen`}>
        <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.page} min-h-screen`}>
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-10">
        <h1 className={`text-2xl font-bold mb-5 ${theme.text}`}>Orders</h1>

        {/* ── Section tabs (seller only) ── */}
        {isSeller && (
          <div className="flex gap-2 mb-5">
            {[
              {
                key: "customer_orders",
                label: "Customer Orders",
                icon: "groups",
                count: customerOrders.length,
              },
              {
                key: "my_purchases",
                label: "My Purchases",
                icon: "shopping_bag",
                count: myOrders.length,
              },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  setSection(s.key);
                  setStatusTab("all");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${
                  section === s.key
                    ? `border-current ${theme.text} ${theme.secondary}`
                    : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {s.icon}
                </span>
                {s.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    section === s.key
                      ? `${theme.primary} text-white`
                      : "bg-gray-100 dark:bg-slate-700 text-gray-500"
                  }`}
                >
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Status filter tabs ── */}
        <div className="mb-5">
          <TabBar
            tabs={STATUS_TABS}
            active={statusTab}
            onSelect={(t) => setStatusTab(t)}
            theme={theme}
            counts={counts}
          />
        </div>

        {/* ── Content ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-7xl text-gray-300 dark:text-slate-600 block mb-3">
              receipt_long
            </span>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              No{statusTab !== "all" ? ` ${statusTab}` : ""}{" "}
              {section === "customer_orders" && isSeller
                ? "customer orders"
                : "orders"}{" "}
              found
            </p>
            {(!isSeller || section === "my_purchases") &&
              statusTab === "all" && (
                <button
                  onClick={() => navigate("/home")}
                  className={`mt-5 px-6 py-2.5 rounded-xl font-bold text-white text-sm ${theme.primary} transition`}
                >
                  Browse Products
                </button>
              )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) =>
              section === "customer_orders" && isSeller ? (
                <CustomerOrderCard
                  key={order.id}
                  order={order}
                  theme={theme}
                  navigate={navigate}
                />
              ) : (
                <PurchaseCard
                  key={order.id}
                  order={order}
                  theme={theme}
                  onCancel={handleCancel}
                  cancelling={cancelling[order.id]}
                  navigate={navigate}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;