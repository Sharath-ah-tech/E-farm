import api from "./axios";

// Dashboard summary statistics
export const getDashboardStats = () =>
  api.get("dashboard/stats/");

// Top selling / most purchased products
export const getTopSelling = () =>
  api.get("dashboard/top-selling/");

// Recent 20 transactions for the home dashboard
export const getRecentTransactions = () =>
  api.get("dashboard/transactions/recent/");

// All transactions with pagination + filters
export const getAllTransactions = (params = {}) =>
  api.get("dashboard/transactions/all/", { params });

// Monthly sales / purchase / profit chart data (last 12 months)
export const getSalesChart = () =>
  api.get("dashboard/sales-chart/");

// Product category revenue distribution
export const getCategoryDistribution = () =>
  api.get("dashboard/category-distribution/");

// Low-stock listings (farmers / wholesalers only)
export const getLowStock = () =>
  api.get("dashboard/low-stock/");