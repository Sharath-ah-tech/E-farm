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
    CustomerDashboardView
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
router.register(r'wishlist',WishlistViewSet,basename='wishlist')
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r"listings",ProductListViewSet, basename='listings')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('select-role/', SelectedView.as_view(), name='select-role'),
    path('', include(router.urls)),
    path("checkout/",CheckoutView.as_view(),name="checkout"),
    path("admindashboard/", AdminDashboardView.as_view(), name="admindashboard"),
    path("farmer-dashboard/", FarmerDashboardView.as_view(), name='farmerdashboard'),
    path("wholesaler-dashboard/", WholesalerDashboardView.as_view(), name='wholesalerdashboard'),
    path("customer-dashboard/", CustomerDashboardView.as_view(),name='customerdashboard'),
    path("recentorder/", RecentOrderView.as_view(), name="recentorder"),
    path("updateorder/", UpdateOrderStatusView.as_view(), name="updateorder"),
    path('discounts/<int:pk>/', DiscountView.as_view(), name='discount'),
    path('generate-bill/<int:order_id>/',GenerateBillView.as_view()),
]