import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTheme } from "../utils/theme";
import { getOrders } from "../api/orders";

// Updated to match new backend statuses
const ALL_STEPS = [
  { key: "pending",          label: "Order Placed",    icon: "receipt_long",    desc: "Your order has been received." },
  { key: "processing",       label: "Confirmed",       icon: "verified",        desc: "Seller confirmed your order." },
  { key: "packed",           label: "Packed",          icon: "inventory_2",     desc: "Your order has been packed and is ready to ship." },
  { key: "shipped",          label: "Shipped",         icon: "local_shipping",  desc: "Your order is on its way." },
  { key: "out_for_delivery", label: "Out for Delivery",icon: "delivery_dining", desc: "Almost there! Your order is out for delivery." },
  { key: "delivered",        label: "Delivered",       icon: "check_circle",    desc: "Order delivered successfully. Enjoy!" },
];

const STATUS_STEP_MAP = {
  pending:          0,
  processing:       1,
  packed:           2,
  shipped:          3,
  out_for_delivery: 4,
  delivered:        5,
};

const ESTIMATED_DAYS = {
  pending:          5,
  processing:       4,
  packed:           3,
  shipped:          2,
  out_for_delivery: 0,
  delivered:        0,
};

const STATUS_BADGE = {
  pending:          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing:       "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  packed:           "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  shipped:          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  out_for_delivery: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  delivered:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  returned:         "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
}

function ProgressBar({ currentStep, total }) {
  const pct = total <= 1 ? 100 : (currentStep / (total - 1)) * 100;
  return (
    <div className="relative h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

function Timeline({ status }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
        <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-white text-lg">cancel</span>
        </div>
        <div>
          <p className="font-bold text-red-700 dark:text-red-400">Order Cancelled</p>
          <p className="text-xs text-red-500 dark:text-red-500">This order was cancelled and will not be fulfilled.</p>
        </div>
      </div>
    );
  }

  if (status === "returned") {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
        <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-white text-lg">keyboard_return</span>
        </div>
        <div>
          <p className="font-bold text-gray-700 dark:text-gray-300">Order Returned</p>
          <p className="text-xs text-gray-500">Return accepted. Refund will be processed.</p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_STEP_MAP[status] ?? 0;

  return (
    <div className="relative pl-2">
      {/* Vertical line */}
      <div className="absolute left-7 top-5 bottom-5 w-0.5 bg-gray-200 dark:bg-slate-700" />
      {/* Green progress */}
      <div
        className="absolute left-7 top-5 w-0.5 bg-green-500 transition-all duration-700"
        style={{ height: `${currentIdx > 0 ? (currentIdx / (ALL_STEPS.length - 1)) * 100 : 0}%` }}
      />
      <div className="space-y-5">
        {ALL_STEPS.map((step, idx) => {
          const done    = idx <= currentIdx;
          const current = idx === currentIdx;
          return (
            <div key={step.key} className="relative flex items-start gap-4">
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${done ? "bg-green-500 text-white shadow-md" : "bg-gray-100 dark:bg-slate-800 text-gray-400"} ${current ? "ring-4 ring-green-200 dark:ring-green-900" : ""}`}>
                <span className="material-symbols-outlined text-lg">{done && !current ? "check" : step.icon}</span>
              </div>
              <div className={`pt-1.5 flex-1 ${done ? "" : "opacity-40"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-bold ${done ? "text-gray-900 dark:text-white" : "text-gray-400"}`}>{step.label}</p>
                  {current && (
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Track() {
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [filter,     setFilter]     = useState("active");
  const theme    = getTheme();
  const navigate = useNavigate();

  useEffect(() => {
    getOrders()
      .then((r) => {
        setOrders(r.data);
        const first = r.data.find((o) => !["delivered","cancelled","returned"].includes(o.status));
        if (first) setSelectedId(first.id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeOrders    = orders.filter((o) => !["delivered","cancelled","returned"].includes(o.status));
  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const displayList     = filter === "active" ? activeOrders : deliveredOrders;
  const selectedOrder   = orders.find((o) => o.id === selectedId);
  const trackStatus     = selectedOrder?.track_status || selectedOrder?.status || "pending";
  const currentStepIdx  = STATUS_STEP_MAP[trackStatus] ?? 0;

  if (loading) {
    return (
      <div className={`${theme.page} min-h-screen`}>
        <div className="max-w-4xl mx-auto px-4 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="md:col-span-2 space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse"/>)}</div>
            <div className="md:col-span-3 h-80 rounded-2xl bg-gray-200 dark:bg-slate-800 animate-pulse"/>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.page} min-h-screen pb-10`}>
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <h1 className={`text-2xl font-bold mb-1 ${theme.text}`}>Track Orders</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{activeOrders.length} active order{activeOrders.length!==1?"s":""}</p>

        {orders.length === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-7xl text-gray-300 dark:text-slate-600 block mb-3">delivery_dining</span>
            <p className="text-gray-500 font-medium">No orders to track yet</p>
            <button onClick={() => navigate("/home")} className={`mt-5 px-6 py-2.5 rounded-xl font-bold text-white text-sm ${theme.primary}`}>Browse Products</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left: order list */}
            <div className="md:col-span-2">
              <div className="flex gap-2 mb-4">
                {[{key:"active",label:`Active (${activeOrders.length})`},{key:"delivered",label:`Done (${deliveredOrders.length})`}].map((f) => (
                  <button key={f.key} onClick={() => setFilter(f.key)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${filter===f.key?`${theme.primary} text-white shadow`:`${theme.card} ${theme.text} border ${theme.border} hover:shadow`}`}>{f.label}</button>
                ))}
              </div>

              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {displayList.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm">No {filter} orders</div>
                ) : displayList.map((order) => {
                  const ts        = order.track_status || order.status;
                  const stepIdx   = STATUS_STEP_MAP[ts] ?? 0;
                  const stepLabel = ALL_STEPS[stepIdx]?.label || ts;
                  const firstItem = order.items?.[0];
                  return (
                    <button key={order.id} onClick={() => setSelectedId(order.id)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedId===order.id?`border-current ${theme.text} ${theme.secondary}`:`border-gray-200 dark:border-slate-700 ${theme.card} hover:border-gray-300 dark:hover:border-slate-600`}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400">#{order.id}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[order.status]||"bg-gray-100 text-gray-600"}`}>{order.status.replace(/_/g," ")}</span>
                      </div>
                      {firstItem && <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{firstItem.product_name}</p>}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{new Date(order.order_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${order.status==="delivered"?"bg-green-500":"bg-blue-500 animate-pulse"}`}/>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{stepLabel}</span>
                      </div>
                      <div className="mt-2"><ProgressBar currentStep={stepIdx} total={ALL_STEPS.length}/></div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: timeline detail */}
            <div className="md:col-span-3">
              {!selectedOrder ? (
                <div className={`${theme.card} rounded-2xl border ${theme.border} p-10 text-center`}>
                  <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-slate-600 block mb-3">local_shipping</span>
                  <p className="text-gray-500">Select an order to view tracking details</p>
                </div>
              ) : (
                <div className={`${theme.card} rounded-2xl border ${theme.border} shadow-sm p-6`}>
                  <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order #{selectedOrder.id}</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Placed on {new Date(selectedOrder.order_date).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"})}
                      </p>
                    </div>
                    <button onClick={() => navigate(`/orders/${selectedOrder.id}`)} className={`text-xs font-semibold ${theme.text} border ${theme.border} px-3 py-1.5 rounded-xl hover:shadow transition`}>
                      Full Details
                    </button>
                  </div>

                  {/* Info grid */}
                  <div className={`grid grid-cols-2 gap-3 mb-5 p-4 rounded-xl ${theme.secondary}`}>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tracking ID</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">EF-{String(selectedOrder.id).padStart(6,"0")}</p>
                    </div>
                    {!["delivered","cancelled","returned"].includes(trackStatus) && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Est. Delivery</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{addDays(selectedOrder.order_date, ESTIMATED_DAYS[trackStatus]??3)}</p>
                      </div>
                    )}
                    {selectedOrder.items?.[0]?.seller_name && (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Seller</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedOrder.items[0].seller_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Courier</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">EFarm Express</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase mb-1.5">
                      <span>Order Placed</span>
                      <span>{["cancelled","returned"].includes(trackStatus) ? trackStatus.charAt(0).toUpperCase()+trackStatus.slice(1) : "Delivered"}</span>
                    </div>
                    <ProgressBar currentStep={currentStepIdx} total={ALL_STEPS.length}/>
                  </div>

                  {/* Full timeline */}
                  <Timeline status={trackStatus}/>

                  {/* Items */}
                  {selectedOrder.items?.length > 0 && (
                    <div className={`mt-5 pt-5 border-t ${theme.border} space-y-2`}>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Items in this order</p>
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <img src={item.product_image||"/vite.svg"} alt={item.product_name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 dark:bg-slate-800 flex-shrink-0" onError={(e)=>{e.target.src="/vite.svg"}}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product_name}</p>
                            <p className="text-xs text-gray-400">{item.quantity} × ₹{item.price} ({item.units})</p>
                          </div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white">₹{parseFloat(item.item_total||0).toLocaleString("en-IN")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Track;