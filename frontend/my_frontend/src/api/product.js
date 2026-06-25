import api from './axios'

const normalizeProductList = (response) => ({
  ...response,
  data: Array.isArray(response.data)
    ? response.data
    : response.data?.results || [],
});

export const getProducts=()=>api.get("products/my_products/").then(normalizeProductList)
export const getAllProducts=()=>api.get("products/").then(normalizeProductList)
export const addProducts=(data)=>api.post("products/",data)
export const deleteProducts=(id)=>api.post(`products/${id}/`)
export const applyDiscount = (id, data) =>api.patch(`discounts/${id}/`, data);
export const getListings = (productId) =>api.get(`listings/?product=${productId}`);
