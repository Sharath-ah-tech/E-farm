import api from "./axios";

export const getProfile = () =>
    api.get("/profile/");

export const getFarmerDashboard = () =>
    api.get("/farmer-dashboard/");

export const getWholesalerDashboard = () =>
    api.get("/wholesaler-dashboard/");

export const getCustomerDashboard = () =>
    api.get("/customer-dashboard/");