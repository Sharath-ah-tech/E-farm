import api from "./axios";

/**
 * Step 1 — Create a Razorpay order on the backend.
 * Returns {razorpay_order_id, amount, key, ...}
 */
export const createRazorpayOrder = () =>
  api.post("payment/razorpay/create/");

/**
 * Step 2 — Verify Razorpay payment signature on the backend.
 * Creates the DB Order only if verification passes.
 */
export const verifyRazorpayPayment = (payload) =>
  api.post("payment/razorpay/verify/", payload);

/**
 * Log a failed Razorpay payment (cart is NOT cleared).
 */
export const reportRazorpayFailed = (payload) =>
  api.post("payment/razorpay/failed/", payload);

/**
 * COD checkout (existing flow).
 */
export const codCheckout = (payload) =>
  api.post("checkout/", payload);