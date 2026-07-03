/**
 * Shared pricing helpers — every page (Cart, Checkout, Product Details,
 * Profile, Favorites) must calculate discounted prices through these
 * functions instead of duplicating the math locally.
 */

// originalPrice - (originalPrice * pct / 100), rounded to 2 decimals
export function getEffectivePrice(originalPrice, discountPercentage = 0) {
  const price = Number(originalPrice) || 0;
  const pct = Number(discountPercentage) || 0;
  if (pct > 0) {
    return Math.round((price - (price * pct) / 100) * 100) / 100;
  }
  return price;
}

export function formatINR(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/**
 * Normalizes pricing from any object shaped like a listing / cart item /
 * order item that carries a base price plus optional discount fields.
 * Accepts `price` OR `listing_price` as the original amount, and prefers
 * a server-computed `final_price` when present (falls back to computing
 * it locally so this still works before the backend responds).
 */
export function getPricing(source = {}) {
  const original = Number(
    source.price ?? source.listing_price ?? source.original_price ?? 0
  );
  const pct = Number(source.discount_percentage ?? 0);
  const hasDiscount = Boolean(source.has_discount) && pct > 0;
  const final = hasDiscount
    ? Number(source.final_price ?? getEffectivePrice(original, pct))
    : original;
  const saved = hasDiscount ? Math.max(0, original - final) : 0;
  return { original, final, pct, hasDiscount, saved };
}

/** effectivePrice = discountedPrice ?? originalPrice — for qty × price math */
export function getEffectiveUnitPrice(source = {}) {
  return getPricing(source).final;
}