from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RegisterView,
    LoginView,
    ProductViewSet,
    UserDetailViewSet,
    CartViewSet,
    OrderViewSet,
    OrderItemViewSet,
    PaymentViewSet,
    TrackViewSet,
    ShippingAddressViewSet,
    LogoutView,
    CheckoutView,
    AdminDashboardView,
    RecentOrderView,
    DiscountView,
    SelectedView,
    UpdateOrderStatusView,
    GenerateBillView,
    WishlistViewSet,
    NotificationViewSet,
    ProductListViewSet,
    FarmerDashboardView,
    WholesalerDashboardView,
    CustomerDashboardView,
    # ── New dashboard views ──
    DashboardStatsView,
    TopSellingProductsView,
    RecentTransactionsView,
    AllTransactionsView,
    SalesChartView,
    CategoryDistributionView,
    LowStockView,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='products')
router.register(r'profile', UserDetailViewSet, basename='user-details')
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='orders')
router.register(r'order-items', OrderItemViewSet, basename='order-items')
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'tracks', TrackViewSet, basename='tracks')
router.register(r'shipping', ShippingAddressViewSet, basename='shipping')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'listings', ProductListViewSet, basename='listings')

urlpatterns = [
    # ── Auth ──
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('select-role/', SelectedView.as_view(), name='select-role'),

    # ── Router ──
    path('', include(router.urls)),

    # ── Checkout & billing ──
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('generate-bill/<int:order_id>/', GenerateBillView.as_view()),

    # ── Admin ──
    path('admindashboard/', AdminDashboardView.as_view(), name='admindashboard'),
    path('recentorder/', RecentOrderView.as_view(), name='recentorder'),
    path('updateorder/<int:pk>/', UpdateOrderStatusView.as_view(), name='updateorder'),

    # ── Role dashboards (legacy) ──
    path('farmer-dashboard/', FarmerDashboardView.as_view(), name='farmerdashboard'),
    path('wholesaler-dashboard/', WholesalerDashboardView.as_view(), name='wholesalerdashboard'),
    path('customer-dashboard/', CustomerDashboardView.as_view(), name='customerdashboard'),

    # ── Discounts ──
    path('discounts/<int:pk>/', DiscountView.as_view(), name='discount'),

    # ── New dashboard endpoints ──
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/top-selling/', TopSellingProductsView.as_view(), name='dashboard-top-selling'),
    path('dashboard/transactions/recent/', RecentTransactionsView.as_view(), name='dashboard-transactions-recent'),
    path('dashboard/transactions/all/', AllTransactionsView.as_view(), name='dashboard-transactions-all'),
    path('dashboard/sales-chart/', SalesChartView.as_view(), name='dashboard-sales-chart'),
    path('dashboard/category-distribution/', CategoryDistributionView.as_view(), name='dashboard-category-distribution'),
    path('dashboard/low-stock/', LowStockView.as_view(), name='dashboard-low-stock'),
]