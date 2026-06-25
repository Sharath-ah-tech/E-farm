from django.shortcuts import render
from django.http import HttpResponse
from rest_framework.views import APIView
from reportlab.pdfgen import canvas
from .models import (Product, ProductList, UserDetail, Cart, Order, OrderItem, Payment, Track, ShippingAddress, Discount, Notification, Wishlist, Review)
from .serializers import (RegisterSerializer, ProductSerializer, UserDetailSerializer, CartSerializer, OrderSerializer, OrderItemSerializer, PaymentSerializer, TrackSerializer, ShippingAddressSerializer, DiscountSerializer, NotificationSerializer, WishlistSerializer, ProductListSerializer)
from django.contrib.auth.models import User
from django.contrib.auth import authenticate,login, logout
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics
from rest_framework import viewsets
from rest_framework.decorators import action
from django.db.models import Sum, F
from django.shortcuts import get_object_or_404
from .permissions import Is_Farmer, Is_Admin, Is_Customer, Is_Wholesaler, IsFarmerOrWholesaler
from rest_framework.filters import OrderingFilter
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .services.checkout import CheckoutService
from .services.invoice import InvoiceService
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

class LoginView(APIView):
    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")

        user = authenticate(username=username,password=password)
        if user is None:
            return Response(
                {"error": "Invalid Credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        refresh = RefreshToken.for_user(user)
        return Response({'message':'Login Successful',
                         'username':user.username,
                         'access':str(refresh.access_token),
                         'refresh':str(refresh),
                         'role':user.profile.role})

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        logout(request)

        return Response({
            "message": "Logged out"
        })
    
class SelectedView(APIView):
    permission_classes= [IsAuthenticated]
    def post(self, request):
        profile = request.user.profile
        if profile.role_locked:
            return Response({'error':'Role already Selected'}, status = 400)
        
        role = request.data.get('role')
        profile.role = role
        profile.role_locked = True
        profile.save()
        return Response({'message':'Role selected Successfully!'})
# ---------------------------------------------------------------------------------------------------
#----------------------------------------------------------------------------------------------------

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer

    parser_classes = (
        MultiPartParser,
        FormParser,
    )
    
    def get_permissions(self):
        return [IsAuthenticated()]

    filter_backends = [filters.SearchFilter,OrderingFilter,DjangoFilterBackend]

    search_fields = ["name","category"]

    ordering_fields = ["name","category"]

    filterset_fields = ["category"]

    def get_queryset(self):
        return Product.objects.all()

    def perform_create(self, serializer):
        serializer.save()

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated]
    )
    def my_products(self, request):

        listings = ProductList.objects.filter(seller=request.user)
        serializer = ProductListSerializer(listings,many=True)
        return Response(serializer.data)     
# class ProductViewSet(viewsets.ModelViewSet):
#     serializer_class = ProductSerializer
#     def get_permissions(self):
#         if self.action in ['create', 'destroy', 'update', 'partial_update']:
#             return [IsFarmerOrWholesaler()]
#         return[IsAuthenticated()]
    
#     filter_backends = [filters.SearchFilter, OrderingFilter, DjangoFilterBackend]
#     search_fields = ['name', 'description']
#     ordering_fields = ['price', 'stock', 'created_at']
#     filterset_fields = ['price', 'stock']
#     # permission_classes = [IsAuthenticated]

#     # def get_queryset(self):
#     #     return Product.objects.all().available()
#     @action(detail=False, methods=["get"])
#     def my_products(self, request):
#         products = Product.objects.filter(
#             owner=request.user
#         )

#         serializer = self.get_serializer(
#             products,
#             many=True
#         )

#         return Response(serializer.data)

#     def perform_create(self, serializer):
#         serializer.save(owner=self.request.user)

class ProductListViewSet(viewsets.ModelViewSet):

    serializer_class = ProductListSerializer
    permission_classes = [IsAuthenticated]
    def get_permissions(self):
        if self.action in [
        "create",
        "update",
        "partial_update",
        "destroy"
    ]:
            return [IsFarmerOrWholesaler()]

        return [IsAuthenticated()]
    def get_queryset(self):
        return ProductList.objects.select_related("product","seller")

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)


class UserDetailViewSet(viewsets.ModelViewSet):
    
    serializer_class = UserDetailSerializer
    parser_classes = (
        MultiPartParser,
        FormParser,
    )
    def get_permissions(self):
        return [IsAuthenticated()]
    # permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return UserDetail.objects.filter(user=self.request.user)
    def perform_create(self, serializer):
         serializer.save(user=self.request.user)

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    # def get_permissions(self):
    #     if self.action in ["create", "update", "partialupdate", "destroy"]:
    #         return [Is_Admin()]
    #     return [IsAuthenticated()]
    # permission_classes = [IsAuthenticated]
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
        return OrderItem.objects.select_related("listing","order").filter(order__user=self.request.user)
class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [Is_Admin()]
        return [IsAuthenticated()]
    # permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user)

class TrackViewSet(viewsets.ModelViewSet):
    serializer_class = TrackSerializer
    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [Is_Admin()]
        return [IsAuthenticated()]
    # permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return Track.objects.filter(order__user=self.request.user)

class ShippingAddressViewSet(viewsets.ModelViewSet):
    serializer_class = ShippingAddressSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return ShippingAddress.objects.filter(order__user=self.request.user)
    
# ---------------------------------------------------------------------------------------------------
#----------------------------------------------------------------------------------------------------

class CheckoutView(APIView):
    permission_classes=[IsAuthenticated]
    
    def post(self, request):
        try:
            order = (CheckoutService.checkout(request.user))
            return Response({'message':'Checkout successfully', 'order_id':order.id})   
        except Exception as e:
            return Response(
                {'error':str(e)},status=400
            )
    # @transaction.atomic
    # def post(self, request):
    #     cart_items = Cart.objects.filter(user=request.user)
    #     if not cart_items.exists():
    #         return Response(
    #             {'error':'No items in the cart'},
    #             status=status.HTTP_404_NOT_FOUND
    #         )
    #     total_amount = 0
    #     order = Order.objects.create(user = request.user, status='pending')
    #     for cart_item in cart_items:
    #         OrderItem.objects.create(
    #             order = order,
    #             product = cart_item.product,
    #             quantity = cart_item.quantity,
    #             price = cart_item.product.price
    #          )
    #         if cart_item.quantity > cart_item.product.stock:
    #             return Response(
    #                 {
    #                     "error":f"Not enough stock for {cart_item.product.name}"
    #                 }, status=status.HTTP_400_BAD_REQUEST)
    #         cart_item.product.stock -= cart_item.quantity
    #         cart_item.product.save()
    #         total_amount+=(cart_item.quantity*cart_item.product.price)
    #     order.total_amount = total_amount
    #     order.save()
    #     Payment.objects.create(
    #         order=order,
    #         amount=total_amount,
    #         status="pending"
    #     )

    #     cart_items.delete()

    #     return Response(
    #         {
    #             "message": "Checkout successful",
    #             "order_id": order.id,
    #             "total_amount": total_amount
    #         },
    #         status=status.HTTP_201_CREATED
    #     )

# ---------------------------------------------------------------------------------------------------
#----------------------------------------------------------------------------------------------------

class AdminDashboardView(APIView):
    permission_classes=[Is_Admin]
    def get(self, request):
        total_orders = Order.objects.count()
        total_products = Product.objects.count()
        total_users = User.objects.count()
        revenue = Payment.objects.filter(status = "paid").aggregate(total=Sum('amount'))
        return Response({
            'total_orders':total_orders,
            'total_products':total_products,
            'total_users':total_users,
            'revenue':revenue['total'] or 0
        })
    
class RecentOrderView(APIView):
    permission_classes = [Is_Admin]
    def get(self, request):
        orders = Order.objects.order_by('-order_date')[:10]
        serializer = OrderSerializer(orders, many = True)
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
        return Response(
            {'message':"Status Updated"}
        )

class FarmerDashboardView(APIView):
    permission_classes = [Is_Farmer]

    def get(self, request):
        products = ProductList.objects.filter(
            seller=request.user
        )

        total_products = products.count()

        total_stock = (
            products.aggregate(
                total=Sum("stock")
            )["total"] or 0
        )

        sales = (
            OrderItem.objects
            .filter(
                listing__seller=request.user
            )
            .aggregate(
                total=Sum(
                    F("price") * F("quantity")
                )
            )
        )

        sales_total = sales["total"] or 0

        purchases = (
            Payment.objects
            .filter(
                order__user=request.user,
                status="paid"
            )
            .aggregate(
                total=Sum("amount")
            )
        )

        purchase_total = (
            purchases["total"] or 0
        )

        net_revenue = (
            sales_total - purchase_total
        )

        top_selling = (
            OrderItem.objects
            .filter(
                listing__seller=request.user
            )
            .values(
                "listing__product__name"
            )
            .annotate(
                total_sold=Sum("quantity")
            )
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
                top_selling[
                    "listing__product__name"
                ]
                if top_selling
                else "No Sales"
            ),
        })
class WholesalerDashboardView(APIView):
    permission_classes = [Is_Wholesaler]

    def get(self, request):

        products = ProductList.objects.filter(
            seller=request.user
        )

        total_products = products.count()

        total_stock = (
            products.aggregate(
                total=Sum("stock")
            )["total"] or 0
        )

        sales = (
            OrderItem.objects
            .filter(
                listing__seller=request.user
            )
            .aggregate(
                total=Sum(
                    F("price") * F("quantity")
                )
            )
        )

        sales_total = sales["total"] or 0

        purchases = (
            Payment.objects
            .filter(
                order__user=request.user,
                status="paid"
            )
            .aggregate(
                total=Sum("amount")
            )
        )

        purchase_total = (
            purchases["total"] or 0
        )

        net_revenue = (
            sales_total - purchase_total
        )

        top_selling = (
            OrderItem.objects
            .filter(
                listing__seller=request.user
            )
            .values(
                "listing__product__name"
            )
            .annotate(
                total_sold=Sum("quantity")
            )
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
                top_selling[
                    "listing__product__name"
                ]
                if top_selling
                else "No Sales"
            ),
        })

class CustomerDashboardView(APIView):
    permission_classes = [Is_Customer]
    def get(self, request):
        total_orders = (Order.objects.filter(user=request.user).count())
        spending = (Payment.objects.filter(order__user = request.user, status='paid')).aggregate(total = Sum('amount'))
        return Response(
            {'total_orders':total_orders, 'spending':spending['total'] or 0}
        )
    
class DiscountView(APIView):
    permission_classes = [IsFarmerOrWholesaler]

    def patch(self, request, pk):
        listing = get_object_or_404(ProductList, id=pk, seller=request.user)
        discount_percentage = int(request.data.get("discount", 0))
        if discount_percentage < 0 or discount_percentage > 100:
            return Response(
                {"error": "Discount must be between 0 and 100"},
                status=400
            )
        discount_obj, created = Discount.objects.update_or_create(
            listing=listing,
            seller=request.user,
            defaults={"discount": discount_percentage}
        )

        # Create a notification for all users
        notification_title = "Discount Added"
        notification_message = f"the discount is added for the product {listing.product.name}"
        
        users = User.objects.all()
        notifications = [
            Notification(
                user=u,
                title=notification_title,
                message=notification_message,
                notification_type="discount"
            )
            for u in users
        ]
        Notification.objects.bulk_create(notifications)

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
        items = order.items.all()
        bill_items = []
        for item in items:
            bill_items.append({
                "product": item.listing.product.name,
                "quantity": item.quantity,
                "price": item.price,
                "total": item.total_price
            })

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
        order = get_object_or_404(Order,id=order_id,user=request.user)
        return InvoiceService.generate_invoice(order)
    
class NotificationViewSet(viewsets.ModelViewSet):

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        )
    
class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

