from django.shortcuts import render
from django.http import HttpResponse
from rest_framework.views import APIView
from reportlab.pdfgen import canvas
from .models import (
    Product, ProductList, UserDetail, Cart, Order, OrderItem,
    Payment, Track, ShippingAddress, Discount, Notification, Wishlist, Review
)
from .serializers import (
    RegisterSerializer, ProductSerializer, UserDetailSerializer,
    CartSerializer, OrderSerializer, OrderItemSerializer, PaymentSerializer,
    TrackSerializer, ShippingAddressSerializer, DiscountSerializer,
    NotificationSerializer, WishlistSerializer, ProductListSerializer
)
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics
from rest_framework import viewsets
from rest_framework.decorators import action
from django.db.models import Sum, F, Count, Q
from django.shortcuts import get_object_or_404
from .permissions import Is_Farmer, Is_Admin, Is_Customer, Is_Wholesaler, IsFarmerOrWholesaler
from rest_framework.filters import OrderingFilter
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .services.checkout import CheckoutService
from .services.invoice import InvoiceService
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from datetime import timedelta, date
import calendar


# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────

def _month_range(year, month):
    """Return (start_date, end_date) for the given year/month."""
    _, last_day = calendar.monthrange(year, month)
    return date(year, month, 1), date(year, month, last_day)


def _last_12_months():
    """Return list of (start, end, label) for the last 12 months."""
    today = date.today()
    result = []
    for i in range(11, -1, -1):
        total = today.year * 12 + (today.month - 1) - i
        y, m = divmod(total, 12)
        m += 1
        start, end = _month_range(y, m)
        result.append((start, end, start.strftime("%b %Y")))
    return result


# ─────────────────────────────────────────────
# Existing views (unchanged)
# ─────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer


class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(username=username, password=password)
        if user is None:
            return Response(
                {"error": "Invalid Credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Login Successful',
            'username': user.username,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user.profile.role
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
            return Response({'error': 'Role already Selected'}, status=400)
        role = request.data.get('role')
        profile.role = role
        profile.role_locked = True
        profile.save()
        return Response({'message': 'Role selected Successfully!'})


class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_permissions(self):
        return [IsAuthenticated()]

    filter_backends = [filters.SearchFilter, OrderingFilter, DjangoFilterBackend]
    search_fields = ["name", "category"]
    ordering_fields = ["name", "category"]
    filterset_fields = ["category"]

    def get_queryset(self):
        return Product.objects.all()

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_products(self, request):
        listings = ProductList.objects.filter(seller=request.user)
        serializer = ProductListSerializer(listings, many=True)
        return Response(serializer.data)


class ProductListViewSet(viewsets.ModelViewSet):
    serializer_class = ProductListSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsFarmerOrWholesaler()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return ProductList.objects.select_related("product", "seller")

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class UserDetailViewSet(viewsets.ModelViewSet):
    serializer_class = UserDetailSerializer
    parser_classes = (MultiPartParser, FormParser)

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        return UserDetail.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrderItem.objects.select_related(
            "listing", "order"
        ).filter(order__user=self.request.user)


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
        return Track.objects.filter(order__user=self.request.user)


class ShippingAddressViewSet(viewsets.ModelViewSet):
    serializer_class = ShippingAddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ShippingAddress.objects.filter(order__user=self.request.user)


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            order = CheckoutService.checkout(request.user)
            return Response({'message': 'Checkout successfully', 'order_id': order.id})
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class AdminDashboardView(APIView):
    permission_classes = [Is_Admin]

    def get(self, request):
        total_orders = Order.objects.count()
        total_products = Product.objects.count()
        total_users = User.objects.count()
        revenue = Payment.objects.filter(
            status="paid"
        ).aggregate(total=Sum('amount'))
        return Response({
            'total_orders': total_orders,
            'total_products': total_products,
            'total_users': total_users,
            'revenue': revenue['total'] or 0
        })


class RecentOrderView(APIView):
    permission_classes = [Is_Admin]

    def get(self, request):
        orders = Order.objects.order_by('-order_date')[:10]
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)


class UpdateOrderStatusView(APIView):
    permission_classes = [Is_Admin]

    def patch(self, request, pk):
        order = get_object_or_404(Order, id=pk)
        status_value = request.data.get("status")
        order.status = status_value
        order.save()
        track = order.tracking
        track.status = status_value
        track.save()
        return Response({'message': "Status Updated"})


class FarmerDashboardView(APIView):
    permission_classes = [Is_Farmer]

    def get(self, request):
        products = ProductList.objects.filter(seller=request.user)
        total_products = products.count()
        total_stock = products.aggregate(total=Sum("stock"))["total"] or 0
        sales = OrderItem.objects.filter(
            listing__seller=request.user
        ).aggregate(total=Sum(F("price") * F("quantity")))
        sales_total = sales["total"] or 0
        purchases = Payment.objects.filter(
            order__user=request.user, status="paid"
        ).aggregate(total=Sum("amount"))
        purchase_total = purchases["total"] or 0
        net_revenue = sales_total - purchase_total
        top_selling = (
            OrderItem.objects
            .filter(listing__seller=request.user)
            .values("listing__product__name")
            .annotate(total_sold=Sum("quantity"))
            .order_by("-total_sold")
            .first()
        )
        return Response({
            "total_products": total_products,
            "total_stock": total_stock,
            "sales": sales_total,
            "purchases": purchase_total,
            "net_revenue": net_revenue,
            "top_selling": (
                top_selling["listing__product__name"]
                if top_selling else "No Sales"
            ),
        })


class WholesalerDashboardView(APIView):
    permission_classes = [Is_Wholesaler]

    def get(self, request):
        products = ProductList.objects.filter(seller=request.user)
        total_products = products.count()
        total_stock = products.aggregate(total=Sum("stock"))["total"] or 0
        sales = OrderItem.objects.filter(
            listing__seller=request.user
        ).aggregate(total=Sum(F("price") * F("quantity")))
        sales_total = sales["total"] or 0
        purchases = Payment.objects.filter(
            order__user=request.user, status="paid"
        ).aggregate(total=Sum("amount"))
        purchase_total = purchases["total"] or 0
        net_revenue = sales_total - purchase_total
        top_selling = (
            OrderItem.objects
            .filter(listing__seller=request.user)
            .values("listing__product__name")
            .annotate(total_sold=Sum("quantity"))
            .order_by("-total_sold")
            .first()
        )
        return Response({
            "total_products": total_products,
            "total_stock": total_stock,
            "sales": sales_total,
            "purchases": purchase_total,
            "net_revenue": net_revenue,
            "top_selling": (
                top_selling["listing__product__name"]
                if top_selling else "No Sales"
            ),
        })


class CustomerDashboardView(APIView):
    permission_classes = [Is_Customer]

    def get(self, request):
        total_orders = Order.objects.filter(user=request.user).count()
        spending = Payment.objects.filter(
            order__user=request.user, status='paid'
        ).aggregate(total=Sum('amount'))
        return Response({
            'total_orders': total_orders,
            'spending': spending['total'] or 0
        })


class DiscountView(APIView):
    permission_classes = [IsFarmerOrWholesaler]

    def patch(self, request, pk):
        listing = get_object_or_404(
            ProductList, id=pk, seller=request.user
        )
        discount_percentage = int(request.data.get("discount", 0))
        if discount_percentage < 0 or discount_percentage > 100:
            return Response(
                {"error": "Discount must be between 0 and 100"}, status=400
            )
        discount_obj, _ = Discount.objects.update_or_create(
            listing=listing,
            seller=request.user,
            defaults={"discount": discount_percentage}
        )
        users = User.objects.all()
        Notification.objects.bulk_create([
            Notification(
                user=u,
                title="Discount Added",
                message=f"A discount has been added for {listing.product.name}",
                notification_type="discount"
            )
            for u in users
        ])
        return Response({
            "message": "Discount Updated",
            "product": listing.product.name,
            "discount": discount_obj.discount,
            "discounted_price": discount_obj.discounted_price
        })


class Bill(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, user=request.user)
        bill_items = [
            {
                "product": item.listing.product.name,
                "quantity": item.quantity,
                "price": item.price,
                "total": item.total_price
            }
            for item in order.items.all()
        ]
        return Response({
            "order_id": order.id,
            "customer": request.user.username,
            "order_date": order.order_date,
            "products": bill_items,
            "total_amount": order.total_amount,
            "payment_status": order.payment.status,
            "payment_type": order.payment.payment_type
        })


class GenerateBillView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(Order, id=order_id, user=request.user)
        return InvoiceService.generate_invoice(order)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ─────────────────────────────────────────────
# NEW: Dashboard API views
# ─────────────────────────────────────────────

class DashboardStatsView(APIView):
    """Unified dashboard statistics for all roles."""
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
                oi.filter(order__order_date__date__gte=today - timedelta(days=7))
                .aggregate(t=Sum(F("price") * F("quantity")))["t"] or 0
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
            data["today_profit"] = (
                data["today_sales"] - data["today_purchases"]
            )
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
            data["wishlist_count"] = Wishlist.objects.filter(
                user=user
            ).count()

        return Response(data)


class TopSellingProductsView(APIView):
    """Top 10 products by quantity sold (or purchased for customers)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role

        if role in ("farmer", "wholesaler"):
            qs = (
                OrderItem.objects
                .filter(listing__seller=user)
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
                OrderItem.objects
                .filter(order__user=user)
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
                p = Product.objects.get(
                    id=item["listing__product__id"]
                )
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
    """Most recent 20 transactions for the home dashboard widget."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role
        out = []

        if role in ("farmer", "wholesaler"):
            qs = (
                OrderItem.objects
                .filter(listing__seller=user)
                .select_related(
                    "order", "order__user",
                    "listing", "listing__product",
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
                OrderItem.objects
                .filter(order__user=user)
                .select_related(
                    "order",
                    "listing", "listing__product",
                    "listing__seller",
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
    """Paginated, filterable transaction history."""
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
            qs = (
                OrderItem.objects
                .filter(listing__seller=user)
                .select_related(
                    "order", "order__user",
                    "listing", "listing__product",
                )
            )
            if search:
                qs = qs.filter(
                    listing__product__name__icontains=search
                )
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
            qs = (
                OrderItem.objects
                .filter(order__user=user)
                .select_related(
                    "order",
                    "listing", "listing__product",
                    "listing__seller",
                )
            )
            if search:
                qs = qs.filter(
                    listing__product__name__icontains=search
                )
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
            "results": out,
            "count": total,
            "total_pages": total_pages,
            "current_page": page,
        })


class SalesChartView(APIView):
    """Monthly sales / purchases / profit for the last 12 months."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role
        data = []

        for start, end, label in _last_12_months():
            row = {"month": label}

            if role in ("farmer", "wholesaler"):
                sales = float(
                    OrderItem.objects
                    .filter(
                        listing__seller=user,
                        order__order_date__date__range=[start, end],
                    )
                    .aggregate(t=Sum(F("price") * F("quantity")))["t"] or 0
                )
                purchases = float(
                    Payment.objects
                    .filter(
                        order__user=user,
                        status="paid",
                        payment_date__date__range=[start, end],
                    )
                    .aggregate(t=Sum("amount"))["t"] or 0
                )
                row["sales"] = sales
                row["purchases"] = purchases
                row["profit"] = sales - purchases

            else:
                row["purchases"] = float(
                    Payment.objects
                    .filter(
                        order__user=user,
                        status="paid",
                        payment_date__date__range=[start, end],
                    )
                    .aggregate(t=Sum("amount"))["t"] or 0
                )

            data.append(row)

        return Response(data)


class CategoryDistributionView(APIView):
    """Revenue breakdown by product category."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.profile.role

        if role in ("farmer", "wholesaler"):
            qs = (
                OrderItem.objects
                .filter(listing__seller=user)
                .values("listing__product__category")
                .annotate(
                    total=Sum(F("price") * F("quantity")),
                    count=Sum("quantity"),
                )
                .order_by("-total")
            )
        else:
            qs = (
                OrderItem.objects
                .filter(order__user=user)
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
    """Listings with stock at or below the threshold (farmers / wholesalers)."""
    permission_classes = [IsAuthenticated]
    LOW_STOCK_THRESHOLD = 10

    def get(self, request):
        user = request.user
        if user.profile.role not in ("farmer", "wholesaler"):
            return Response([])

        qs = (
            ProductList.objects
            .filter(seller=user, stock__lte=self.LOW_STOCK_THRESHOLD)
            .select_related("product")
            .order_by("stock")
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