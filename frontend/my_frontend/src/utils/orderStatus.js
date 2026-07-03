export const ALL_STEPS = [
  { key: "pending",          label: "Order Placed",     icon: "receipt_long",    desc: "Your order has been received successfully." },
  { key: "processing",       label: "Confirmed",        icon: "verified",        desc: "The seller has confirmed your order." },
  { key: "packed",           label: "Packed",           icon: "inventory_2",     desc: "Your order has been packed and is ready to ship." },
  { key: "shipped",          label: "Shipped",          icon: "local_shipping",  desc: "Your order is on its way." },
  { key: "out_for_delivery", label: "Out for Delivery", icon: "delivery_dining", desc: "Almost there! Your order is out for delivery." },
  { key: "delivered",        label: "Delivered",        icon: "check_circle",    desc: "Your order has been delivered. Enjoy!" },
];

export const STATUS_STEP_MAP = ALL_STEPS.reduce((acc, step, idx) => {
  acc[step.key] = idx;
  return acc;
}, {});

export const ESTIMATED_DAYS = {
  pending: 5, processing: 4, packed: 3, shipped: 2, out_for_delivery: 0, delivered: 0,
};

/** Returns the active step index for any backend status string. Unknown
 * or terminal statuses (cancelled/returned) return -1 — callers must
 * check for those explicitly rather than falling through to step 0. */
export function getStepIndex(status) {
  if (status === "cancelled" || status === "returned") return -1;
  return STATUS_STEP_MAP[status] ?? 0;
}