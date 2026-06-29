import api from './axios';

const normalizeProductList = (response) => ({
  ...response,
  data: Array.isArray(response.data)
    ? response.data
    : response.data?.results || [],
});

// ── Parent products (Product model) ──────────────────────────────────────────
export const getAllProducts = () =>
  api.get("products/").then(normalizeProductList);

export const addProduct = (data) => api.post("products/", data);

// ── Seller's own listings ─────────────────────────────────────────────────────
export const getProducts = () =>
  api.get("products/my_products/").then(normalizeProductList);

// ── ProductList (child listings) ──────────────────────────────────────────────
export const getListings = (productId) =>
  api.get(`listings/?product=${productId}`).then(normalizeProductList);

export const addListing = (data) => api.post("listings/", data);

export const updateListing = (id, data) => api.patch(`listings/${id}/`, data);

export const deleteListing = (id) => api.delete(`listings/${id}/`);

// ── Discounts ─────────────────────────────────────────────────────────────────
export const applyDiscount = (id, data) => api.patch(`discounts/${id}/`, data);

// Legacy (kept for compatibility)
export const addProducts = (data) => api.post("products/", data);
export const deleteProducts = (id) => api.delete(`products/${id}/`);