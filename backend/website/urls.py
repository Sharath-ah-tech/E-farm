from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, LogoutView, SelectedView,
    ProductViewSet, ProductListViewSet, UserDetailViewSet,
    CartViewSet, OrderViewSet, OrderItemViewSet,
    PaymentViewSet, TrackViewSet, ShippingAddressViewSet,
    WishlistViewSet, NotificationViewSet, ReviewViewSet,
    CheckoutView, Bill, GenerateBillView,
    AdminDashboardView, RecentOrderView, UpdateOrderStatusView,
    FarmerDashboardView, WholesalerDashboardView, CustomerDashboardView,
    DiscountView, SellerProfileView, CustomerOrdersView,
    DashboardStatsView, TopSellingProductsView,
    RecentTransactionsView, AllTransactionsView,
    SalesChartView, CategoryDistributionView, LowStockView,
    GoogleOAuthView, FacebookOAuthView, SearchView,
    SellerManageOrderView,
    UserInfoView,
    PasswordResetRequestView, PasswordResetVerifyView, PasswordResetConfirmView,
    # ── NEW ──
    RazorpayCreateOrderView, RazorpayVerifyView, RazorpayFailedView,
    PhoneOTPRequestView,WishlistStatusView
)

router = DefaultRouter()
router.register(r"products",      ProductViewSet,         basename="products")
router.register(r"profile",       UserDetailViewSet,      basename="user-details")
router.register(r"cart",          CartViewSet,            basename="cart")
router.register(r"orders",        OrderViewSet,           basename="orders")
router.register(r"order-items",   OrderItemViewSet,       basename="order-items")
router.register(r"payments",      PaymentViewSet,         basename="payments")
router.register(r"tracks",        TrackViewSet,           basename="tracks")
router.register(r"shipping",      ShippingAddressViewSet, basename="shipping")
router.register(r"wishlist",      WishlistViewSet,        basename="wishlist")
router.register(r"notifications", NotificationViewSet,    basename="notifications")
router.register(r"listings",      ProductListViewSet,     basename="listings")
router.register(r"reviews",       ReviewViewSet,          basename="reviews")

urlpatterns = [
    # Auth
    path("register/",    RegisterView.as_view()),
    path("login/",       LoginView.as_view()),
    path("logout/",      LogoutView.as_view()),
    path("select-role/", SelectedView.as_view()),

    # OAuth
    path("auth/google/",   GoogleOAuthView.as_view()),
    path("auth/facebook/", FacebookOAuthView.as_view()),
    path("user-info/",     UserInfoView.as_view()),

    # Router
    path("", include(router.urls)),

    # Checkout & billing
    path("checkout/",                     CheckoutView.as_view()),
    path("bill/<int:order_id>/",          Bill.as_view()),
    path("generate-bill/<int:order_id>/", GenerateBillView.as_view()),

    # ── Razorpay ──────────────────────────────────────────────────────────────
    path("payment/razorpay/create/",  RazorpayCreateOrderView.as_view(), name="razorpay-create"),
    path("payment/razorpay/verify/",  RazorpayVerifyView.as_view(),       name="razorpay-verify"),
    path("payment/razorpay/failed/",  RazorpayFailedView.as_view(),       name="razorpay-failed"),

    # Admin
    path("admindashboard/",          AdminDashboardView.as_view()),
    path("recentorder/",             RecentOrderView.as_view()),
    path("updateorder/<int:pk>/",    UpdateOrderStatusView.as_view()),

    # Role dashboards
    path("farmer-dashboard/",     FarmerDashboardView.as_view()),
    path("wholesaler-dashboard/", WholesalerDashboardView.as_view()),
    path("customer-dashboard/",   CustomerDashboardView.as_view()),

    # Discounts
    path("discounts/<int:pk>/", DiscountView.as_view()),

    # Profiles & search
    path("seller/<int:seller_id>/", SellerProfileView.as_view()),
    path("search/",                 SearchView.as_view()),

    # Orders
    path("customer-orders/",               CustomerOrdersView.as_view()),
    path("seller-orders/",                 SellerManageOrderView.as_view()),
    path("seller-orders/<int:order_id>/",  SellerManageOrderView.as_view()),

    # Password reset
    path("password-reset/request/",      PasswordResetRequestView.as_view()),
    path("password-reset/verify/",       PasswordResetVerifyView.as_view()),
    path("password-reset/confirm/",      PasswordResetConfirmView.as_view()),
    # ── NEW: phone OTP ──
    path("password-reset/phone/request/", PhoneOTPRequestView.as_view(), name="phone-otp"),

    # Dashboard
    path("dashboard/stats/",                 DashboardStatsView.as_view()),
    path("dashboard/top-selling/",           TopSellingProductsView.as_view()),
    path("dashboard/transactions/recent/",   RecentTransactionsView.as_view()),
    path("dashboard/transactions/all/",      AllTransactionsView.as_view()),
    path("dashboard/sales-chart/",           SalesChartView.as_view()),
    path("dashboard/category-distribution/", CategoryDistributionView.as_view()),
    path("dashboard/low-stock/",             LowStockView.as_view()),
    path("wishlist-status/", WishlistStatusView.as_view(), name="wishlist-status"),
]