from django.shortcuts import render
from django.http import HttpResponse
from rest_framework.views import APIView
from .models import (
    Product, ProductList, UserDetail, Cart, Order, OrderItem,
    Payment, Track, ShippingAddress, Discount, Notification, Wishlist, Review, PasswordResetOTP
)
from .serializers import (
    RegisterSerializer, ProductSerializer, UserDetailSerializer,
    CartSerializer, OrderSerializer, OrderItemSerializer, PaymentSerializer,
    TrackSerializer, ShippingAddressSerializer, DiscountSerializer,
    NotificationSerializer, WishlistSerializer, ProductListSerializer,
    ReviewSerializer,
)
from django.contrib.auth.models import User
# Add alongside existing imports
import requests as _http   # external HTTP client — avoid naming clash with DRF
import random
import string
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from rest_framework.response import Response
from rest_framework import status, generics, viewsets, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Sum, F, Count, Q, Avg, Prefetch
from django.shortcuts import get_object_or_404
from .permissions import (
    Is_Farmer, Is_Admin, Is_Customer, Is_Wholesaler, IsFarmerOrWholesaler
)
from rest_framework.filters import OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from .services.checkout import CheckoutService
from .services.invoice import InvoiceService
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from datetime import timedelta, date
import calendar
import hmac as _hmac, hashlib, random, string
import requests as _http
from .models import PasswordResetOTP
from django.core.mail import send_mail
from django.conf import settings

# ── Helpers ───────────────────────────────────────────────────────────────────

def _month_range(year, month):
    _, last_day = calendar.monthrange(year, month)
    return date(year, month, 1), date(year, month, last_day)


def _last_12_months():
    today = date.today()
    result = []
    for i in range(11, -1, -1):
        total = today.year * 12 + (today.month - 1) - i
        y, m = divmod(total, 12)
        m += 1
        start, end = _month_range(y, m)
        result.append((start, end, start.strftime("%b %Y")))
    return result


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        profile = UserDetail.objects.get(user=user)
        return Response(
            {"message": "Registration Successful","access": str(refresh.access_token),
                "refresh": str(refresh),
                "username": user.username,
                "role": profile.role,
                "profile_completed": profile.profile_completed,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if user is None:
            return Response(
                {"error": "Invalid Credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Login Successful",
            "username": user.username,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "role": user.profile.role,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"message": "Logged out"})


class SelectedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = request.user.profile

        if profile.role_locked:
            return Response({"error": "Role already selected."},status=400,)
        role = request.data.get("role")
        if role not in ["customer", "farmer", "wholesaler"]:
            return Response({"error": "Invalid role."},status=400,)
        profile.role = role
        profile.role_locked = True
        profile.save()
        return Response({"message": "Role selected successfully.","role": role,})


# ── Products ──────────────────────────────────────────────────────────────────

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [filters.SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ["name", "category"]
    ordering_fields = ["name", "category"]
    filterset_fields = ["category"]

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        return Product.objects.prefetch_related(
            "listings", "listings__reviews"
        )

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_products(self, request):
        listings = ProductList.objects.filter(
            seller=request.user
        ).select_related("product", "seller", "seller__profile").prefetch_related(
            "reviews"
        )
        serializer = ProductListSerializer(
            listings, many=True, context={"request": request}
        )
        return Response(serializer.data)


class ProductListViewSet(viewsets.ModelViewSet):
    serializer_class = ProductListSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter, filters.SearchFilter]
    filterset_fields = ["product", "seller"]
    search_fields = ["product__name"]
    ordering_fields = ["price", "stock", "created_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsFarmerOrWholesaler()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return ProductList.objects.select_related(
            "product", "seller", "seller__profile"
        ).prefetch_related("reviews")

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


# ── User Profile ──────────────────────────────────────────────────────────────

class UserDetailViewSet(viewsets.ModelViewSet):
    serializer_class = UserDetailSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        return UserDetail.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── Cart ──────────────────────────────────────────────────────────────────────

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user).select_related(
            "listing", "listing__product", "listing__seller"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── Orders ────────────────────────────────────────────────────────────────────

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["status"]
    ordering_fields = ["order_date"]

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.select_related(
                        "listing__product", "listing__seller"
                    ),
                )
            )
            .select_related("payment", "tracking", "shipping_address")
            .order_by("-order_date")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status != "pending":
            return Response({"error": "Only pending orders can be cancelled"}, status=400)
        order.status = "cancelled"
        order.save()
        try:
            order.tracking.status = "cancelled"
            order.tracking.save()
        except Exception:
            pass
        Notification.objects.create(
            user=order.user,
            title=f"Order #{order.id} Cancelled",
            message="Your order has been cancelled as requested.",
            notification_type="order",
        )
        return Response({"message": "Order cancelled"})



class OrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrderItem.objects.select_related(
            "listing__product", "listing__seller", "order"
        ).filter(order__user=self.request.user)


# ── Payment / Track / Shipping ────────────────────────────────────────────────

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [Is_Admin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user)


class TrackViewSet(viewsets.ModelViewSet):
    serializer_class = TrackSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [Is_Admin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return Track.objects.filter(
            order__user=self.request.user
        ).select_related("order")


class ShippingAddressViewSet(viewsets.ModelViewSet):
    serializer_class = ShippingAddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ShippingAddress.objects.filter(order__user=self.request.user)


# ── Wishlist ──────────────────────────────────────────────────────────────────

class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (Wishlist.objects.filter(user=self.request.user).select_related("listing","listing__product","listing__seller",).order_by("-created_at"))

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"message": "All marked as read"})


# ── Checkout & Billing ────────────────────────────────────────────────────────

class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            shipping = request.data.get("shipping_address")
            payment_type = request.data.get("payment_type", "cod")
            order = CheckoutService.checkout(
                request.user,
                shipping_data=shipping,
                payment_type=payment_type,
            )
            return Response({
                "message": "Order placed successfully",
                "order_id": order.id,
                "total_amount": float(order.total_amount),
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class Bill(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, user=request.user)
        items = order.items.select_related(
            "listing__product", "listing__seller"
        ).all()
        bill_items = [
            {
                "product": item.listing.product.name,
                "seller": item.listing.seller.username,
                "quantity": item.quantity,
                "price": float(item.price),
                "total": float(item.total_price),
            }
            for item in items
        ]
        try:
            payment_status = order.payment.status
            payment_type = order.payment.payment_type
        except Exception:
            payment_status = "N/A"
            payment_type = "N/A"
        return Response({
            "order_id": order.id,
            "customer": request.user.username,
            "order_date": order.order_date,
            "products": bill_items,
            "total_amount": float(order.total_amount),
            "payment_status": payment_status,
            "payment_type": payment_type,
        })


class GenerateBillView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, user=request.user)
        return InvoiceService.generate_invoice(order)


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminDashboardView(APIView):
    permission_classes = [Is_Admin]

    def get(self, request):
        revenue = Payment.objects.filter(
            status="paid"
        ).aggregate(total=Sum("amount"))
        return Response({
            "total_orders": Order.objects.count(),
            "total_products": Product.objects.count(),
            "total_users": User.objects.count(),
            "revenue": revenue["total"] or 0,
        })


class RecentOrderView(APIView):
    permission_classes = [Is_Admin]

    def get(self, request):
        orders = Order.objects.order_by("-order_date")[:10]
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)


class UpdateOrderStatusView(APIView):
    permission_classes = [Is_Admin]

    def patch(self, request, pk):
        order = get_object_or_404(Order, id=pk)
        status_value = request.data.get("status")
        order.status = status_value
        order.save()
        try:
            order.tracking.status = status_value
            order.tracking.save()
        except Exception:
            pass
        return Response({"message": "Status updated"})


# ── Role Dashboards ───────────────────────────────────────────────────────────

class FarmerDashboardView(APIView):
    permission_classes = [Is_Farmer]

    def get(self, request):
        products = ProductList.objects.filter(seller=request.user)
        sales = OrderItem.objects.filter(
            listing__seller=request.user
        ).aggregate(total=Sum(F("price") * F("quantity")))
        sales_total = sales["total"] or 0
        purchases = Payment.objects.filter(
            order__user=request.user, status="paid"
        ).aggregate(total=Sum("amount"))
        purchase_total = purchases["total"] or 0
        top_selling = (
            OrderItem.objects.filter(listing__seller=request.user)
            .values("listing__product__name")
            .annotate(total_sold=Sum("quantity"))
            .order_by("-total_sold")
            .first()
        )
        return Response({
            "total_products": products.count(),
            "total_stock": products.aggregate(total=Sum("stock"))["total"] or 0,
            "sales": float(sales_total),
            "purchases": float(purchase_total),
            "net_revenue": float(sales_total - purchase_total),
            "top_selling": (
                top_selling["listing__product__name"] if top_selling else "No Sales"
            ),
        })


class WholesalerDashboardView(APIView):
    permission_classes = [Is_Wholesaler]

    def get(self, request):
        products = ProductList.objects.filter(seller=request.user)
        sales = OrderItem.objects.filter(
            listing__seller=request.user
        ).aggregate(total=Sum(F("price") * F("quantity")))
        sales_total = sales["total"] or 0
        purchases = Payment.objects.filter(
            order__user=request.user, status="paid"
        ).aggregate(total=Sum("amount"))
        purchase_total = purchases["total"] or 0
        top_selling = (
            OrderItem.objects.filter(listing__seller=request.user)
            .values("listing__product__name")
            .annotate(total_sold=Sum("quantity"))
            .order_by("-total_sold")
            .first()
        )
        return Response({
            "total_products": products.count(),
            "total_stock": products.aggregate(total=Sum("stock"))["total"] or 0,
            "sales": float(sales_total),
            "purchases": float(purchase_total),
            "net_revenue": float(sales_total - purchase_total),
            "top_selling": (
                top_selling["listing__product__name"] if top_selling else "No Sales"
            ),
        })


class CustomerDashboardView(APIView):
    permission_classes = [Is_Customer]

    def get(self, request):
        total_orders = Order.objects.filter(user=request.user).count()
        spending = Payment.objects.filter(
            order__user=request.user, status="paid"
        ).aggregate(total=Sum("amount"))
        return Response({
            "total_orders": total_orders,
            "spending": float(spending["total"] or 0),
        })


class DiscountView(APIView):
    permission_classes = [IsFarmerOrWholesaler]

    def patch(self, request, pk):
        listing = get_object_or_404(ProductList, id=pk, seller=request.user)
        pct = int(request.data.get("discount", 0))
        if not (0 <= pct <= 100):
            return Response({"error": "Discount must be 0–100"}, status=400)

        from .models import Discount as DiscountModel
        disc_obj, _ = DiscountModel.objects.update_or_create(
            listing=listing,
            seller=request.user,
            defaults={"discount": pct},
        )

        # Notify ONLY customers who have wishlisted this product
        if pct > 0:
            wishlist_users = Wishlist.objects.filter(
                product=listing.product
            ).select_related("user").values_list("user", flat=True)

            notifications = [
                Notification(
                    user_id           = uid,
                    title             = f"Price Drop! {listing.product.name}",
                    message           = (
                        f"{request.user.username} is offering {pct}% off on "
                        f"{listing.product.name}. New price: ₹{float(disc_obj.discounted_price):.2f}"
                    ),
                    notification_type = "discount",
                )
                for uid in wishlist_users
            ]
            if notifications:
                Notification.objects.bulk_create(notifications)

        return Response({
            "message":          "Discount updated",
            "product":          listing.product.name,
            "discount":         disc_obj.discount,
            "discounted_price": float(disc_obj.discounted_price),
        })



# ── Seller Profile ────────────────────────────────────────────────────────────

class SellerProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, seller_id):
        seller = get_object_or_404(User, id=seller_id)
        try:
            profile = seller.profile
        except Exception:
            return Response({"error": "Seller profile not found"}, status=404)

        reviews = Review.objects.filter(listing__seller=seller)
        avg_rating = reviews.aggregate(avg=Avg("rating"))["avg"] or 0

        return Response({
            "id": seller.id,
            "username": seller.username,
            "first_name": seller.first_name,
            "last_name": seller.last_name,
            "business_name": profile.business_name or "",
            "role": profile.role,
            "district": profile.district or "",
            "state": profile.state or "",
            "address": profile.address or "",
            "phone": profile.phone or "",
            "image": (
                request.build_absolute_uri(profile.image.url)
                if profile.image else None
            ),
            "joined_date": seller.date_joined.strftime("%B %Y"),
            "total_products": ProductList.objects.filter(seller=seller).count(),
            "average_rating": round(float(avg_rating), 1),
            "total_reviews": reviews.count(),
        })


# ── NEW: Customer Orders (for Farmer/Wholesaler) ──────────────────────────────

class CustomerOrdersView(APIView):
    """
    Returns orders placed by customers that include this seller's listings.
    Only accessible to farmers and wholesalers.
    """
    permission_classes = [IsFarmerOrWholesaler]

    def get(self, request):
        status_filter = request.query_params.get("status", "").strip()

        # IDs of orders containing this seller's items
        order_ids = list(
            OrderItem.objects.filter(listing__seller=request.user)
            .values_list("order_id", flat=True)
            .distinct()
        )

        qs = Order.objects.filter(id__in=order_ids).prefetch_related(
            Prefetch(
                "items",
                queryset=OrderItem.objects.filter(
                    listing__seller=request.user
                ).select_related("listing__product", "listing__seller"),
            )
        ).select_related("user", "payment", "tracking").order_by("-order_date")

        if status_filter:
            qs = qs.filter(status=status_filter)

        result = []
        for order in qs:
            items_data = []
            seller_total = 0.0
            for item in order.items.all():
                item_total = float(item.price * item.quantity)
                seller_total += item_total
                image_url = None
                if item.listing.product.image:
                    image_url = request.build_absolute_uri(
                        item.listing.product.image.url
                    )
                items_data.append({
                    "id": item.id,
                    "product_name": item.listing.product.name,
                    "product_image": image_url,
                    "quantity": item.quantity,
                    "price": float(item.price),
                    "units": item.listing.units,
                    "item_total": item_total,
                })

            try:
                payment_status = order.payment.status
                payment_type = order.payment.payment_type
            except Exception:
                payment_status = "pending"
                payment_type = "cod"

            try:
                track_status = order.tracking.status
            except Exception:
                track_status = order.status

            result.append({
                "id": order.id,
                "order_date": order.order_date,
                "customer": order.user.username,
                "customer_id": order.user.id,
                "status": order.status,
                "track_status": track_status,
                "payment_status": payment_status,
                "payment_type": payment_type,
                "items": items_data,
                "seller_total": seller_total,
            })

        return Response(result)


# ── Dashboard Stats ───────────────────────────────────────────────────────────

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role
        today = timezone.now().date()
        month_start = today.replace(day=1)
        data = {"role": role}

        if role in ("farmer", "wholesaler"):
            listings = ProductList.objects.filter(seller=user)
            data["total_products"] = listings.count()
            data["active_products"] = listings.filter(stock__gt=0).count()
            data["out_of_stock"] = listings.filter(stock=0).count()

            oi = OrderItem.objects.filter(listing__seller=user)
            data["today_sales"] = float(
                oi.filter(order__order_date__date=today)
                .aggregate(t=Sum(F("price") * F("quantity")))["t"] or 0
            )
            data["weekly_sales"] = float(
                oi.filter(
                    order__order_date__date__gte=today - timedelta(days=7)
                ).aggregate(t=Sum(F("price") * F("quantity")))["t"] or 0
            )
            data["monthly_sales"] = float(
                oi.filter(order__order_date__date__gte=month_start)
                .aggregate(t=Sum(F("price") * F("quantity")))["t"] or 0
            )
            data["lifetime_sales"] = float(
                oi.aggregate(t=Sum(F("price") * F("quantity")))["t"] or 0
            )

            pays = Payment.objects.filter(order__user=user, status="paid")
            data["today_purchases"] = float(
                pays.filter(payment_date__date=today)
                .aggregate(t=Sum("amount"))["t"] or 0
            )
            data["monthly_purchases"] = float(
                pays.filter(payment_date__date__gte=month_start)
                .aggregate(t=Sum("amount"))["t"] or 0
            )
            data["lifetime_purchases"] = float(
                pays.aggregate(t=Sum("amount"))["t"] or 0
            )
            data["profit"] = data["lifetime_sales"] - data["lifetime_purchases"]
            data["today_profit"] = data["today_sales"] - data["today_purchases"]
            data["monthly_profit"] = (
                data["monthly_sales"] - data["monthly_purchases"]
            )
            data["profit_percentage"] = round(
                data["profit"] / data["lifetime_purchases"] * 100
                if data["lifetime_purchases"] > 0 else 0,
                2,
            )
            seller_orders = Order.objects.filter(
                items__listing__seller=user
            ).distinct()
            data["pending_orders"] = seller_orders.filter(
                status="pending"
            ).count()
            data["delivered_orders"] = seller_orders.filter(
                status="delivered"
            ).count()

        elif role == "customer":
            orders = Order.objects.filter(user=user)
            data["total_orders"] = orders.count()
            data["pending_orders"] = orders.filter(status="pending").count()
            data["delivered_orders"] = orders.filter(
                status="delivered"
            ).count()

            pays = Payment.objects.filter(order__user=user, status="paid")
            data["today_purchases"] = float(
                pays.filter(payment_date__date=today)
                .aggregate(t=Sum("amount"))["t"] or 0
            )
            data["monthly_purchases"] = float(
                pays.filter(payment_date__date__gte=month_start)
                .aggregate(t=Sum("amount"))["t"] or 0
            )
            data["lifetime_purchases"] = float(
                pays.aggregate(t=Sum("amount"))["t"] or 0
            )
            data["wishlist_count"] = Wishlist.objects.filter(user=user).count()

        return Response(data)


class TopSellingProductsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role
        if role in ("farmer", "wholesaler"):
            qs = (
                OrderItem.objects.filter(listing__seller=user)
                .values(
                    "listing__product__id",
                    "listing__product__name",
                    "listing__product__category",
                    "listing__stock",
                )
                .annotate(
                    total_sold=Sum("quantity"),
                    revenue=Sum(F("price") * F("quantity")),
                )
                .order_by("-total_sold")[:10]
            )
        else:
            qs = (
                OrderItem.objects.filter(order__user=user)
                .values(
                    "listing__product__id",
                    "listing__product__name",
                    "listing__product__category",
                    "listing__stock",
                )
                .annotate(
                    total_sold=Sum("quantity"),
                    revenue=Sum(F("price") * F("quantity")),
                )
                .order_by("-total_sold")[:10]
            )

        result = []
        for item in qs:
            image_url = None
            try:
                p = Product.objects.get(id=item["listing__product__id"])
                if p.image:
                    image_url = request.build_absolute_uri(p.image.url)
            except Product.DoesNotExist:
                pass
            result.append({
                "product_id": item["listing__product__id"],
                "product_name": item["listing__product__name"],
                "category": item["listing__product__category"],
                "image": image_url,
                "stock": item["listing__stock"],
                "total_sold": item["total_sold"],
                "revenue": float(item["revenue"] or 0),
            })
        return Response(result)


class RecentTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role
        out = []

        if role in ("farmer", "wholesaler"):
            qs = (
                OrderItem.objects.filter(listing__seller=user)
                .select_related(
                    "order", "order__user", "listing", "listing__product"
                )
                .order_by("-order__order_date")[:20]
            )
            for item in qs:
                out.append({
                    "id": f"TXN-{item.order.id}-{item.id}",
                    "date": item.order.order_date,
                    "product": item.listing.product.name,
                    "buyer": item.order.user.username,
                    "quantity": item.quantity,
                    "amount": float(item.price * item.quantity),
                    "status": item.order.status,
                    "type": "sale",
                })
        elif role == "customer":
            qs = (
                OrderItem.objects.filter(order__user=user)
                .select_related(
                    "order", "listing", "listing__product", "listing__seller"
                )
                .order_by("-order__order_date")[:20]
            )
            for item in qs:
                out.append({
                    "id": f"TXN-{item.order.id}-{item.id}",
                    "date": item.order.order_date,
                    "product": item.listing.product.name,
                    "seller": item.listing.seller.username,
                    "quantity": item.quantity,
                    "amount": float(item.price * item.quantity),
                    "status": item.order.status,
                    "type": "purchase",
                })
        return Response(out)


class AllTransactionsView(APIView):
    permission_classes = [IsAuthenticated]
    PAGE_SIZE = 20

    def get(self, request):
        user = request.user
        role = user.profile.role
        q = request.query_params
        page = max(1, int(q.get("page", 1)))
        search = q.get("search", "").strip()
        status_f = q.get("status", "").strip()
        type_f = q.get("type", "").strip()
        date_from = q.get("dateFrom", "").strip()
        date_to = q.get("dateTo", "").strip()
        out = []
        total = 0

        if role in ("farmer", "wholesaler"):
            if type_f == "purchase":
                return Response({
                    "results": [], "count": 0,
                    "total_pages": 1, "current_page": page,
                })
            qs = OrderItem.objects.filter(
                listing__seller=user
            ).select_related(
                "order", "order__user", "listing", "listing__product"
            )
            if search:
                qs = qs.filter(listing__product__name__icontains=search)
            if status_f:
                qs = qs.filter(order__status=status_f)
            if date_from:
                qs = qs.filter(order__order_date__date__gte=date_from)
            if date_to:
                qs = qs.filter(order__order_date__date__lte=date_to)
            total = qs.count()
            offset = (page - 1) * self.PAGE_SIZE
            for item in qs.order_by("-order__order_date")[
                offset: offset + self.PAGE_SIZE
            ]:
                out.append({
                    "id": f"TXN-{item.order.id}-{item.id}",
                    "date": item.order.order_date,
                    "product": item.listing.product.name,
                    "buyer": item.order.user.username,
                    "quantity": item.quantity,
                    "amount": float(item.price * item.quantity),
                    "status": item.order.status,
                    "type": "sale",
                })

        elif role == "customer":
            if type_f == "sale":
                return Response({
                    "results": [], "count": 0,
                    "total_pages": 1, "current_page": page,
                })
            qs = OrderItem.objects.filter(
                order__user=user
            ).select_related(
                "order", "listing", "listing__product", "listing__seller"
            )
            if search:
                qs = qs.filter(listing__product__name__icontains=search)
            if status_f:
                qs = qs.filter(order__status=status_f)
            if date_from:
                qs = qs.filter(order__order_date__date__gte=date_from)
            if date_to:
                qs = qs.filter(order__order_date__date__lte=date_to)
            total = qs.count()
            offset = (page - 1) * self.PAGE_SIZE
            for item in qs.order_by("-order__order_date")[
                offset: offset + self.PAGE_SIZE
            ]:
                out.append({
                    "id": f"TXN-{item.order.id}-{item.id}",
                    "date": item.order.order_date,
                    "product": item.listing.product.name,
                    "seller": item.listing.seller.username,
                    "quantity": item.quantity,
                    "amount": float(item.price * item.quantity),
                    "status": item.order.status,
                    "type": "purchase",
                })

        total_pages = max(1, (total + self.PAGE_SIZE - 1) // self.PAGE_SIZE)
        return Response({
            "results": out, "count": total,
            "total_pages": total_pages, "current_page": page,
        })


class SalesChartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role
        data = []
        for start, end, label in _last_12_months():
            row = {"month": label}
            if role in ("farmer", "wholesaler"):
                sales = float(
                    OrderItem.objects.filter(
                        listing__seller=user,
                        order__order_date__date__range=[start, end],
                    ).aggregate(t=Sum(F("price") * F("quantity")))["t"] or 0
                )
                purchases = float(
                    Payment.objects.filter(
                        order__user=user, status="paid",
                        payment_date__date__range=[start, end],
                    ).aggregate(t=Sum("amount"))["t"] or 0
                )
                row["sales"] = sales
                row["purchases"] = purchases
                row["profit"] = sales - purchases
            else:
                row["purchases"] = float(
                    Payment.objects.filter(
                        order__user=user, status="paid",
                        payment_date__date__range=[start, end],
                    ).aggregate(t=Sum("amount"))["t"] or 0
                )
            data.append(row)
        return Response(data)


class CategoryDistributionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role
        if role in ("farmer", "wholesaler"):
            qs = (
                OrderItem.objects.filter(listing__seller=user)
                .values("listing__product__category")
                .annotate(
                    total=Sum(F("price") * F("quantity")),
                    count=Sum("quantity"),
                )
                .order_by("-total")
            )
        else:
            qs = (
                OrderItem.objects.filter(order__user=user)
                .values("listing__product__category")
                .annotate(
                    total=Sum(F("price") * F("quantity")),
                    count=Sum("quantity"),
                )
                .order_by("-total")
            )
        return Response([
            {
                "category": item["listing__product__category"],
                "total": float(item["total"] or 0),
                "count": item["count"],
            }
            for item in qs
        ])


class LowStockView(APIView):
    permission_classes = [IsAuthenticated]
    LOW_STOCK_THRESHOLD = 10

    def get(self, request):
        user = request.user
        if user.profile.role not in ("farmer", "wholesaler"):
            return Response([])
        qs = (
            ProductList.objects.filter(
                seller=user, stock__lte=self.LOW_STOCK_THRESHOLD
            ).select_related("product").order_by("stock")
        )
        return Response([
            {
                "id": item.id,
                "product_name": item.product.name,
                "stock": item.stock,
                "category": item.product.category,
            }
            for item in qs
        ])
    
# ─────────────────────────────────────────────────────────────────────────────
# OAuth — Google
# ─────────────────────────────────────────────────────────────────────────────

class GoogleOAuthView(APIView):
    """
    POST /api/auth/google/
    { "access_token": "<google_access_token>" }
    Verifies via Google userinfo endpoint → find/create User → return JWT.
    """

    def post(self, request):
        token = request.data.get("access_token", "").strip()
        if not token:
            return Response({"error": "access_token is required"}, status=400)

        try:
            resp = _http.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"},
                timeout=8,
            )
            if resp.status_code != 200:
                return Response(
                    {"error": "Could not verify Google token"}, status=400
                )

            info = resp.json()
            email = info.get("email", "").strip().lower()
            if not email:
                return Response(
                    {"error": "Email not provided by Google"}, status=400
                )

            given   = info.get("given_name",  "")
            family  = info.get("family_name", "")
            picture = info.get("picture",     "")

            user = User.objects.filter(email=email).first()
            is_new = False

            if not user:
                is_new   = True
                base     = email.split("@")[0]
                username = base
                counter  = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username, email=email,
                    first_name=given, last_name=family,
                )
                user.set_unusable_password()
                user.save()

            # Store picture URL if profile has no image yet
            try:
                prof = user.profile
                if picture and not prof.image:
                    prof.profile_url = picture
                    prof.save()
            except Exception:
                pass

            refresh = RefreshToken.for_user(user)
            try:
                role      = user.profile.role
                completed = user.profile.profile_completed
            except Exception:
                role, completed = "customer", False

            return Response({
                "message":           "Login successful",
                "username":          user.username,
                "access":            str(refresh.access_token),
                "refresh":           str(refresh),
                "role":              role,
                "profile_completed": completed,
                "is_new_user":       is_new,
            })

        except Exception as exc:
            return Response({"error": str(exc)}, status=400)


# ─────────────────────────────────────────────────────────────────────────────
# OAuth — Facebook
# ─────────────────────────────────────────────────────────────────────────────

class FacebookOAuthView(APIView):
    """
    POST /api/auth/facebook/
    { "access_token": "<fb_user_access_token>" }
    Verifies via Graph API → find/create User → return JWT.
    """

    def post(self, request):
        token = request.data.get("access_token", "").strip()
        if not token:
            return Response({"error": "access_token is required"}, status=400)

        try:
            resp = _http.get(
                "https://graph.facebook.com/me",
                params={
                    "fields":       "id,name,email,first_name,last_name,picture.type(large)",
                    "access_token": token,
                },
                timeout=8,
            )
            if resp.status_code != 200:
                return Response(
                    {"error": "Could not verify Facebook token"}, status=400
                )

            data = resp.json()
            if "error" in data:
                return Response(
                    {"error": data["error"].get("message", "Facebook error")},
                    status=400,
                )

            email = data.get("email", "").strip().lower()
            if not email:
                return Response(
                    {
                        "error": (
                            "Facebook did not share your email. "
                            "Please grant the email permission and try again."
                        )
                    },
                    status=400,
                )

            given       = data.get("first_name", "")
            family      = data.get("last_name",  "")
            picture_url = (
                data.get("picture", {})
                    .get("data", {})
                    .get("url", "")
            )

            user = User.objects.filter(email=email).first()
            is_new = False

            if not user:
                is_new   = True
                base     = email.split("@")[0]
                username = base
                counter  = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base}{counter}"
                    counter += 1

                user = User.objects.create_user(
                    username=username, email=email,
                    first_name=given, last_name=family,
                )
                user.set_unusable_password()
                user.save()

            try:
                prof = user.profile
                if picture_url and not prof.image:
                    prof.profile_url = picture_url
                    prof.save()
            except Exception:
                pass

            refresh = RefreshToken.for_user(user)
            try:
                role      = user.profile.role
                completed = user.profile.profile_completed
            except Exception:
                role, completed = "customer", False

            return Response({
                "message":           "Login successful",
                "username":          user.username,
                "access":            str(refresh.access_token),
                "refresh":           str(refresh),
                "role":              role,
                "profile_completed": completed,
                "is_new_user":       is_new,
            })

        except Exception as exc:
            return Response({"error": str(exc)}, status=400)


# ─────────────────────────────────────────────────────────────────────────────
# Search Autocomplete
# ─────────────────────────────────────────────────────────────────────────────

class SearchView(APIView):
    """
    GET /api/search/?q=<query>
    Returns up to 6 products, 5 categories, 4 sellers for autocomplete UI.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"products": [], "categories": [], "sellers": []})

        # Products
        products = Product.objects.filter(
            name__icontains=q
        ).prefetch_related(
            "listings", "listings__reviews"
        )[:6]

        product_data = []
        for p in products:
            img = None
            if p.image:
                try:
                    img = request.build_absolute_uri(p.image.url)
                except Exception:
                    pass
            product_data.append({
                "id":           p.id,
                "name":         p.name,
                "category":     p.category,
                "image":        img,
                "lowest_price": float(p.lowest_price),
                "seller_count": p.seller_count,
            })

        # Categories (distinct matches)
        categories = list(
            Product.objects.filter(category__icontains=q)
            .values_list("category", flat=True)
            .distinct()[:5]
        )

        # Sellers / businesses / districts
        seller_profiles = UserDetail.objects.filter(
            Q(user__username__icontains=q)
            | Q(business_name__icontains=q)
            | Q(district__icontains=q)
        ).filter(role__in=["farmer", "wholesaler"]).select_related("user")[:4]

        seller_data = [
            {
                "id":            sp.user.id,
                "username":      sp.user.username,
                "business_name": sp.business_name or "",
                "district":      sp.district or "",
                "role":          sp.role,
            }
            for sp in seller_profiles
        ]

        return Response({
            "products":   product_data,
            "categories": categories,
            "sellers":    seller_data,
        })


# ─────────────────────────────────────────────────────────────────────────────
# Seller — manage customer orders (view + update status)
# ─────────────────────────────────────────────────────────────────────────────

class SellerManageOrderView(APIView):
    permission_classes = [IsFarmerOrWholesaler]

    _ORDER = [
        "pending", "processing", "packed", "shipped",
        "out_for_delivery", "delivered",
    ]
    _MESSAGES = {
        "processing":        "Your order has been confirmed by the seller.",
        "packed":            "Your order has been packed and is ready to ship.",
        "shipped":           "Great news! Your order has been shipped.",
        "out_for_delivery":  "Your order is out for delivery — arriving soon!",
        "delivered":         "Your order has been delivered. Enjoy!",
        "cancelled":         "Unfortunately, your order was cancelled by the seller.",
        "returned":          "Your return has been accepted. Refund will be processed soon.",
    }

    def get(self, request):
        status_f = request.query_params.get("status", "").strip()
        order_ids = list(
            OrderItem.objects.filter(listing__seller=request.user)
            .values_list("order_id", flat=True).distinct()
        )
        qs = (
            Order.objects.filter(id__in=order_ids)
            .prefetch_related(
                Prefetch(
                    "items",
                    queryset=OrderItem.objects.filter(
                        listing__seller=request.user
                    ).select_related("listing__product"),
                )
            )
            .select_related("user", "payment", "tracking")
            .order_by("-order_date")
        )
        if status_f:
            qs = qs.filter(status=status_f)

        result = []
        for order in qs:
            seller_total = 0.0
            items_data   = []
            for item in order.items.all():
                total = float(item.price * item.quantity)
                seller_total += total
                img = None
                if item.listing.product.image:
                    try:
                        img = request.build_absolute_uri(item.listing.product.image.url)
                    except Exception:
                        pass
                items_data.append({
                    "id": item.id, "product_name": item.listing.product.name,
                    "product_image": img, "quantity": item.quantity,
                    "price": float(item.price), "units": item.listing.units,
                    "item_total": total,
                })

            try:  pay_status, pay_type = order.payment.status, order.payment.payment_type
            except: pay_status, pay_type = "pending", "cod"
            try:  track_status = order.tracking.status
            except: track_status = order.status

            result.append({
                "id": order.id, "order_date": order.order_date,
                "customer": order.user.username, "customer_id": order.user.id,
                "status": order.status, "track_status": track_status,
                "payment_status": pay_status, "payment_type": pay_type,
                "items": items_data, "seller_total": seller_total,
            })
        return Response(result)

    def patch(self, request, order_id):
        if not OrderItem.objects.filter(
            order_id=order_id,
        listing__seller=request.user,
    ).exists():
            return Response({"error": "Order not found"}, status=403)

        new_status = request.data.get("status", "").strip()

        valid = [
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
    ]

        if new_status not in valid:
            return Response(
            {
                "error": f"Invalid status. Choose: {', '.join(valid)}"
            },
            status=400,
        )

        order = get_object_or_404(Order, id=order_id)

    # Prevent moving backwards
        if new_status not in ("cancelled", "returned"):
            if (
            order.status in self._ORDER
            and new_status in self._ORDER
            and self._ORDER.index(new_status)
            < self._ORDER.index(order.status)
        ):
                return Response(
                {"error": "Cannot move status backward."},
                status=400,
            )

    # Update order status
        order.status = new_status
        order.save()

    # Always create/update tracking
        tracking, created = Track.objects.get_or_create(
            order=order,
        defaults={"status": new_status},
    )

        if not created:
            tracking.status = new_status
            tracking.save(update_fields=["status", "updated_at"])

    # Notify customer
        Notification.objects.create(
            user=order.user,
            title=f"Order #{order.id} — {new_status.replace('_', ' ').title()}",
            message=self._MESSAGES.get(
            new_status,
            f"Status updated to {new_status}",
        ),
        notification_type="order",
    )

        return Response(
        {
            "message": "Status updated successfully",
            "order_id": order.id,
            "status": order.status,
            "track_status": tracking.status,
            "tracking_created": created,
        }
    )

class UserInfoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            prof = request.user.profile
            return Response({
                "is_oauth":          not request.user.has_usable_password(),
                "role_locked":       prof.role_locked,
                "role":              prof.role,
                "profile_completed": prof.profile_completed,
            })
        except Exception:
            return Response({"is_oauth": False, "role_locked": False, "role": "customer"})

class PasswordResetRequestView(APIView):
    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response({"error": "Email is required"}, status=400)

        # Always return same message for security (don't reveal if email exists)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "If that email exists, an OTP has been sent."})

        # Invalidate existing OTPs
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        otp = ''.join(random.choices(string.digits, k=6))
        PasswordResetOTP.objects.create(user=user, otp=otp)

        # Send email
        try:
            send_mail(
                subject      = "E-Farm — Password Reset OTP",
                message      = (
                    f"Hi {user.username},\n\n"
                    f"Your OTP for password reset is: {otp}\n\n"
                    f"This code expires in 10 minutes.\n\n"
                    f"If you did not request this, please ignore this email.\n\n"
                    f"— E-Farm Team"
                ),
                from_email   = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@efarm.com"),
                recipient_list=[email],
                fail_silently=False,
            )
            return Response({"message": "OTP sent to your email."})
        except Exception:
            # Development fallback — include OTP in response
            return Response({
                "message": "OTP generated (configure EMAIL settings for production).",
                "dev_otp": otp,
            })


class PasswordResetVerifyView(APIView):
    def post(self, request):
        otp   = request.data.get("otp",   "").strip()
        email = request.data.get("email", "").strip().lower()
        phone = request.data.get("phone", "").strip()

        if not otp:
            return Response({"error": "OTP is required"}, status=400)

        # Find user by email or phone
        user = None
        if email:
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({"error": "Invalid credentials"}, status=400)
        elif phone:
            try:
                profile = UserDetail.objects.select_related("user").get(phone=phone)
                user    = profile.user
            except UserDetail.DoesNotExist:
                return Response({"error": "Invalid credentials"}, status=400)
        else:
            return Response({"error": "Email or phone is required"}, status=400)

        record = PasswordResetOTP.objects.filter(
            user=user, otp=otp, is_used=False
        ).first()

        if not record:
            return Response({"error": "Invalid OTP. Please check and try again."}, status=400)
        if record.is_expired:
            return Response({"error": "OTP has expired. Please request a new one."}, status=400)

        record.is_used = True
        record.save()

        refresh     = RefreshToken.for_user(user)
        reset_token = str(refresh.access_token)

        return Response({"reset_token": reset_token, "username": user.username})


class PasswordResetConfirmView(APIView):
    def post(self, request):
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError

        reset_token  = request.data.get("reset_token", "").strip()
        new_password = request.data.get("new_password", "").strip()

        if not reset_token or not new_password:
            return Response({"error": "Token and new password required"}, status=400)
        if len(new_password) < 8:
            return Response({"error": "Password must be at least 8 characters"}, status=400)

        try:
            token   = AccessToken(reset_token)
            user_id = token.payload.get("user_id")
            user    = User.objects.get(id=user_id)
        except (TokenError, User.DoesNotExist, Exception):
            return Response({"error": "Invalid or expired reset token"}, status=400)

        user.set_password(new_password)
        user.save()

        return Response({"message": "Password reset successfully. Please log in."})
    
# ─────────────────────────────────────────────────────────────────────────────
# Razorpay
# ─────────────────────────────────────────────────────────────────────────────

class RazorpayCreateOrderView(APIView):
    """
    POST /api/payment/razorpay/create/
    Creates a Razorpay order and returns credentials for the frontend modal.
    Does NOT touch the database order — that happens only after verification.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            import razorpay
        except ImportError:
            return Response(
                {"error": "Razorpay SDK not installed. Run: pip install razorpay"},
                status=500,
            )

        cart_items = Cart.objects.filter(
            user=request.user
        ).select_related("listing")

        if not cart_items.exists():
            return Response({"error": "Cart is empty"}, status=400)

        # Use final_price (discounted) for every item
        total_inr   = sum(
            float(item.listing.final_price) * item.quantity
            for item in cart_items
        )
        amount_paise = int(round(total_inr * 100))  # Razorpay expects paise

        try:
            client    = razorpay.Client(
                auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
            )
            rzp_order = client.order.create({
                "amount":          amount_paise,
                "currency":        "INR",
                "receipt":         f"efarm_{request.user.id}_{int(timezone.now().timestamp())}",
                "payment_capture": 1,  # auto-capture
            })
        except Exception as exc:
            return Response({"error": str(exc)}, status=500)

        try:
            phone = request.user.profile.phone or ""
        except Exception:
            phone = ""

        return Response({
            "razorpay_order_id": rzp_order["id"],
            "amount":            amount_paise,
            "currency":          "INR",
            "key":               settings.RAZORPAY_KEY_ID,
            "name":              "E-Farm Marketplace",
            "description":       "Fresh farm produce, direct from growers",
            "prefill_name":      request.user.get_full_name() or request.user.username,
            "prefill_email":     request.user.email,
            "prefill_contact":   phone,
        })


class RazorpayVerifyView(APIView):
    """
    POST /api/payment/razorpay/verify/
    Verifies Razorpay signature → creates Order in DB → returns order_id.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        rzp_order_id   = request.data.get("razorpay_order_id",   "").strip()
        rzp_payment_id = request.data.get("razorpay_payment_id", "").strip()
        rzp_signature  = request.data.get("razorpay_signature",  "").strip()
        shipping_data  = request.data.get("shipping_address")

        if not all([rzp_order_id, rzp_payment_id, rzp_signature]):
            return Response({"error": "Incomplete payment data"}, status=400)

        # Prevent replaying the same payment
        if Payment.objects.filter(razorpay_payment_id=rzp_payment_id).exists():
            return Response({"error": "This payment was already processed"}, status=400)

        # ── Signature verification ────────────────────────────────────────────
        body     = f"{rzp_order_id}|{rzp_payment_id}"
        expected = _hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
            body.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not _hmac.compare_digest(expected, rzp_signature):
            Notification.objects.create(
                user              = request.user,
                title             = "Payment Verification Failed",
                message           = (
                    "A payment could not be verified. "
                    "If you were charged, please contact support immediately."
                ),
                notification_type = "payment",
            )
            return Response(
                {"error": "Payment signature invalid. Contact support if you were charged."},
                status=400,
            )

        # ── Signature valid — create the order ────────────────────────────────
        try:
            order = CheckoutService.checkout(
                request.user,
                shipping_data = shipping_data,
                payment_type  = "razorpay",
            )
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)

        # Mark payment as PAID and store Razorpay IDs
        pay                      = order.payment
        pay.status               = "paid"
        pay.razorpay_order_id    = rzp_order_id
        pay.razorpay_payment_id  = rzp_payment_id
        pay.razorpay_signature   = rzp_signature
        pay.save()

        # Notify customer
        Notification.objects.create(
            user              = request.user,
            title             = f"✅ Payment Successful — Order #{order.id}",
            message           = (
                f"Your payment of ₹{float(order.total_amount):,.2f} was received. "
                f"Order #{order.id} is now confirmed."
            ),
            notification_type = "payment",
        )

        return Response({
            "message":      "Payment verified. Order placed successfully.",
            "order_id":     order.id,
            "total_amount": float(order.total_amount),
        })


class RazorpayFailedView(APIView):
    """
    POST /api/payment/razorpay/failed/
    Records a failed payment attempt. Cart is NOT cleared.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        description = request.data.get("error_description", "Payment failed")

        Notification.objects.create(
            user              = request.user,
            title             = "Payment Failed",
            message           = (
                f"Your payment failed: {description}. "
                "Your cart is still saved — please try again."
            ),
            notification_type = "payment",
        )
        return Response({"message": "Failure noted"})


# ─────────────────────────────────────────────────────────────────────────────
# Phone OTP for Password Reset
# ─────────────────────────────────────────────────────────────────────────────

class PhoneOTPRequestView(APIView):
    """
    POST /api/password-reset/phone/request/
    Sends OTP to a registered phone number via Fast2SMS.
    """

    _MAX_PER_10MIN = 3

    def post(self, request):
        phone = request.data.get("phone", "").strip()
        if not phone:
            return Response({"error": "Phone number is required"}, status=400)

        # Lookup user by phone
        try:
            profile = UserDetail.objects.select_related("user").get(phone=phone)
            user    = profile.user
        except UserDetail.DoesNotExist:
            return Response(
                {"error": "No account found with this phone number."},
                status=404,
            )

        # Rate limit
        cutoff   = timezone.now() - timedelta(minutes=10)
        attempts = PasswordResetOTP.objects.filter(
            user=user, created_at__gte=cutoff
        ).count()
        if attempts >= self._MAX_PER_10MIN:
            return Response(
                {"error": "Too many OTP requests. Please wait 10 minutes."},
                status=429,
            )

        # Invalidate old OTPs and create new one
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        otp = "".join(random.choices(string.digits, k=6))
        PasswordResetOTP.objects.create(user=user, otp=otp, method="phone")

        # Send via Fast2SMS
        api_key = getattr(settings, "FAST2SMS_API_KEY", "")
        if api_key:
            try:
                resp = _http.post(
                    "https://www.fast2sms.com/dev/bulkV2",
                    headers={"authorization": api_key},
                    data={
                        "route":            "otp",
                        "variables_values": otp,
                        "flash":            0,
                        "numbers":          phone,
                    },
                    timeout=8,
                )
                if resp.status_code == 200 and resp.json().get("return"):
                    return Response({"message": "OTP sent to your phone number."})
            except Exception:
                pass

        # Dev fallback
        return Response({
            "message": "OTP generated (set FAST2SMS_API_KEY in settings for live SMS).",
            "dev_otp": otp,
        })


# ─────────────────────────────────────────────────────────────────────────────
# REPLACE the existing ReviewViewSet with this version
# (adds can_review action + purchase verification on create)
# ─────────────────────────────────────────────────────────────────────────────

class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class   = ReviewSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, OrderingFilter]
    filterset_fields   = ["listing", "user"]
    ordering_fields    = ["created_at", "rating"]

    def get_queryset(self):
        product_id = self.request.query_params.get("product")
        qs = Review.objects.select_related(
            "user", "user__profile",
            "listing", "listing__product", "listing__seller",
        )
        if product_id:
            qs = qs.filter(listing__product_id=product_id)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        """Only verified buyers can post a review."""
        listing_id = request.data.get("listing")

        if listing_id:
            # Must have a PAID order containing this listing
            has_purchased = OrderItem.objects.filter(
                order__user           = request.user,
                listing_id            = listing_id,
                order__payment__status = "paid",
            ).exists()

            if not has_purchased:
                return Response(
                    {
                        "error": (
                            "You can only review products you have purchased. "
                            "Buy this listing and receive it before leaving a review."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        review = serializer.save(user=self.request.user)
        # Notify seller
        Notification.objects.create(
            user              = review.listing.seller,
            title             = f"New Review — {review.listing.product.name}",
            message           = (
                f"{self.request.user.username} rated you {review.rating}★: "
                f"\"{review.review[:100]}...\""
            ),
            notification_type = "review",
        )

    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only edit your own reviews.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own reviews.")
        instance.delete()

    @action(detail=False, methods=["get"], url_path="can-review", url_name="can-review",permission_classes=[IsAuthenticated])
    def can_review(self, request):
        """
        GET /api/reviews/can-review/?listing=<id>
        Returns whether the current user can review this listing.
        """
        listing_id = request.query_params.get("listing")
        if not listing_id:
            return Response({"can_review": False, "reason": "No listing specified"})

        has_purchased = OrderItem.objects.filter(
            order__user            = request.user,
            listing_id             = listing_id,
            order__payment__status = "paid",
        ).exists()

        already_reviewed = Review.objects.filter(
            user=request.user, listing_id=listing_id
        ).exists()

        reason = ""
        if not has_purchased:
            reason = "purchase_required"
        elif already_reviewed:
            reason = "already_reviewed"

        return Response({
            "can_review":       has_purchased and not already_reviewed,
            "has_purchased":    has_purchased,
            "already_reviewed": already_reviewed,
            "reason":           reason,
        })
    
# ─── Replace RazorpayCreateOrderView with this hardened version ──────────────

class RazorpayCreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # ── Fail fast with a clear message if keys are missing ────────────────
        key_id     = getattr(settings, "RAZORPAY_KEY_ID", "")
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "")

        if not key_id or not key_secret:
            return Response(
                {
                    "error": (
                        "Payment gateway is not configured. "
                        "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing on server."
                    )
                },
                status=500,
            )

        try:
            import razorpay
        except ImportError:
            return Response(
                {"error": "Razorpay SDK not installed. Run: pip install razorpay"},
                status=500,
            )

        cart_items = Cart.objects.filter(
            user=request.user
        ).select_related("listing")

        if not cart_items.exists():
            return Response({"error": "Cart is empty"}, status=400)

        total_inr    = sum(
            float(item.listing.final_price) * item.quantity
            for item in cart_items
        )
        if total_inr <= 0:
            return Response({"error": "Invalid cart total"}, status=400)

        amount_paise = int(round(total_inr * 100))

        try:
            client    = razorpay.Client(auth=(key_id, key_secret))
            rzp_order = client.order.create({
                "amount":          amount_paise,
                "currency":        "INR",
                "receipt":         f"efarm_{request.user.id}_{int(timezone.now().timestamp())}",
                "payment_capture": 1,
            })
        except razorpay.errors.BadRequestError as exc:
            return Response(
                {"error": f"Razorpay rejected the request: {str(exc)}"},
                status=400,
            )
        except Exception as exc:
            # Catches "Authentication failed" from a bad key pair
            return Response(
                {
                    "error": (
                        "Could not connect to Razorpay. This usually means the "
                        "RAZORPAY_KEY_ID/SECRET pair is invalid or mismatched "
                        f"(test vs live keys). Detail: {str(exc)}"
                    )
                },
                status=500,
            )

        try:
            phone = request.user.profile.phone or ""
        except Exception:
            phone = ""

        return Response({
            "razorpay_order_id": rzp_order["id"],
            "amount":            amount_paise,
            "currency":          "INR",
            "key":               key_id,   # ← always the live server value, never stale
            "name":              "E-Farm Marketplace",
            "description":       "Fresh farm produce, direct from growers",
            "prefill_name":      request.user.get_full_name() or request.user.username,
            "prefill_email":     request.user.email,
            "prefill_contact":   phone,
        })


# ─── NEW: Bulk wishlist status check ──────────────────────────────────────────

class WishlistStatusView(APIView):
    """
    GET /api/wishlist-status/
    Returns the set of product IDs the user has wishlisted —
    used by the frontend to hydrate wishlist state on every page load.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        product_ids = list(
            Wishlist.objects.filter(user=request.user)
            .values_list("product_id", flat=True)
        )
        return Response({"wishlisted_ids": product_ids})