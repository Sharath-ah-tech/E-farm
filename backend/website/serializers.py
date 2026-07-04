from .models import (
    Product, UserDetail, Cart, Order, OrderItem, Payment, Track,
    ShippingAddress, Discount, Wishlist, Review, Feedback, Notification, ProductList,
)
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from django.contrib.auth.models import User
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password


class UserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class RegisterSerializer(ModelSerializer):
    email    = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())])
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    role     = serializers.CharField(write_only=True, required=False)

    class Meta:
        model  = User
        fields = ('first_name', 'last_name', 'username', 'password', 'email', 'role')

    def create(self, validated_data):
        role = validated_data.pop('role', 'customer')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )
        profile      = user.profile
        profile.role = role
        profile.save()
        return user


class ProductSerializer(ModelSerializer):
    seller_count   = serializers.ReadOnlyField()
    lowest_price   = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    total_stock    = serializers.ReadOnlyField()
    has_stock      = serializers.ReadOnlyField()
    review_count   = serializers.ReadOnlyField()
    image_url      = serializers.SerializerMethodField()

    class Meta:
        model  = Product
        fields = [
            "id", "name", "category", "image", "image_url",
            "seller_count", "lowest_price", "average_rating",
            "total_stock", "has_stock", "review_count",
        ]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ProductListSerializer(ModelSerializer):
    seller_name          = serializers.ReadOnlyField()
    average_rating       = serializers.ReadOnlyField()
    review_count         = serializers.ReadOnlyField()
    product_name         = serializers.CharField(source="product.name",     read_only=True)
    product_category     = serializers.CharField(source="product.category", read_only=True)
    product_image        = serializers.SerializerMethodField()
    seller_photo         = serializers.SerializerMethodField()
    seller_business_name = serializers.SerializerMethodField()
    seller_district      = serializers.SerializerMethodField()
    seller_state         = serializers.SerializerMethodField()
    seller_role          = serializers.SerializerMethodField()

    # ── Discount fields ───────────────────────────────────────────────────────
    discount_percentage = serializers.ReadOnlyField()
    has_discount        = serializers.ReadOnlyField()
    final_price         = serializers.ReadOnlyField()

    class Meta:
        model  = ProductList
        fields = [
            "id", "product", "product_name", "product_category", "product_image",
            "seller", "seller_name",
            "seller_photo", "seller_business_name", "seller_district",
            "seller_state", "seller_role",
            "description", "price", "stock", "units",
            "average_rating", "review_count", "created_at",
            # discount
            "discount_percentage", "has_discount", "final_price",
        ]
        read_only_fields=['seller']

    def get_product_image(self, obj):
        req = self.context.get("request")
        if obj.product.image and req:
            return req.build_absolute_uri(obj.product.image.url)
        return None

    def _profile(self, obj):
        try:
            return obj.seller.profile
        except Exception:
            return None

    def get_seller_photo(self, obj):
        req = self.context.get("request")
        p   = self._profile(obj)
        if p and p.image and req:
            return req.build_absolute_uri(p.image.url)
        return None

    def get_seller_business_name(self, obj):
        p = self._profile(obj)
        return (p.business_name or "") if p else ""

    def get_seller_district(self, obj):
        p = self._profile(obj)
        return (p.district or "") if p else ""

    def get_seller_state(self, obj):
        p = self._profile(obj)
        return (p.state or "") if p else ""

    def get_seller_role(self, obj):
        p = self._profile(obj)
        return p.role if p else "seller"


class UserDetailSerializer(ModelSerializer):
    username           = serializers.CharField(source="user.username",    read_only=True)
    email              = serializers.CharField(source="user.email",       read_only=True)
    first_name         = serializers.CharField(source="user.first_name",  read_only=True)
    last_name          = serializers.CharField(source="user.last_name",   read_only=True)
    profile_completed  = serializers.SerializerMethodField()
    # NEW — lets frontend know if user registered via OAuth
    is_oauth           = serializers.SerializerMethodField()

    class Meta:
        model  = UserDetail
        fields = "__all__"

    def get_profile_completed(self, obj):
        fields = [obj.address, obj.phone, obj.district, obj.state]
        filled = sum(1 for f in fields if f)
        return round(filled / len(fields) * 100)

    def get_is_oauth(self, obj):
        """True when user has no usable password (Google / Facebook sign-in)."""
        return not obj.user.has_usable_password()


class CartSerializer(ModelSerializer):
    product_name   = serializers.CharField(source="listing.product.name",      read_only=True)
    seller_name    = serializers.CharField(source="listing.seller.username",    read_only=True)
    seller_id      = serializers.IntegerField(source="listing.seller.id",       read_only=True)
    product_image  = serializers.SerializerMethodField()
    listing_price  = serializers.DecimalField(source="listing.price", max_digits=10, decimal_places=2, read_only=True)
    # final price after discount
    final_price    = serializers.DecimalField(source="listing.final_price", max_digits=10, decimal_places=2, read_only=True)
    discount_percentage = serializers.IntegerField(source="listing.discount_percentage", read_only=True)
    has_discount   = serializers.BooleanField(source="listing.has_discount",    read_only=True)
    units          = serializers.CharField(source="listing.units",              read_only=True)
    stock          = serializers.IntegerField(source="listing.stock",           read_only=True)
    total_price    = serializers.SerializerMethodField()

    class Meta:
        model  = Cart
        fields = "__all__"
        read_only_fields = ["user"]

    def get_product_image(self, obj):
        req = self.context.get("request")
        if obj.listing.product.image and req:
            return req.build_absolute_uri(obj.listing.product.image.url)
        return None

    def get_total_price(self, obj):
        return float(obj.quantity * obj.listing.final_price)


class OrderItemSerializer(ModelSerializer):
    product_name   = serializers.CharField(source="listing.product.name",   read_only=True)
    seller_name    = serializers.CharField(source="listing.seller.username", read_only=True)
    seller_id      = serializers.IntegerField(source="listing.seller.id",    read_only=True)
    product_image  = serializers.SerializerMethodField()
    units          = serializers.CharField(source="listing.units",           read_only=True)
    item_total     = serializers.SerializerMethodField()
    original_price = serializers.DecimalField(source="listing.price", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model  = OrderItem
        fields = "__all__"

    def get_product_image(self, obj):
        req = self.context.get("request")
        if obj.listing.product.image and req:
            return req.build_absolute_uri(obj.listing.product.image.url)
        return None

    def get_item_total(self, obj):
        return float(obj.price * obj.quantity)


class ShippingAddressSerializer(ModelSerializer):
    class Meta:
        model  = ShippingAddress
        fields = "__all__"


class OrderSerializer(ModelSerializer):
    items           = OrderItemSerializer(many=True, read_only=True)
    payment_status  = serializers.SerializerMethodField()
    payment_type    = serializers.SerializerMethodField()
    track_status    = serializers.SerializerMethodField()
    track_updated   = serializers.SerializerMethodField()
    shipping        = serializers.SerializerMethodField()

    class Meta:
        model  = Order
        fields = "__all__"
        read_only_fields = ["user"]

    def get_payment_status(self, obj):
        try: return obj.payment.status
        except: return None

    def get_payment_type(self, obj):
        try: return obj.payment.payment_type
        except: return None

    def get_track_status(self, obj):
        try: return obj.tracking.status
        except: return None

    def get_track_updated(self, obj):
        try: return obj.tracking.updated_at
        except: return None

    def get_shipping(self, obj):
        try:
            a = obj.shipping_address
            return {
                "address": a.address, "city": a.city,
                "state": a.state, "postal_code": a.postal_code,
                "country": a.country, "phone": a.phone,
            }
        except: return None


class PaymentSerializer(ModelSerializer):
    class Meta:
        model  = Payment
        fields = "__all__"


class TrackSerializer(ModelSerializer):
    class Meta:
        model  = Track
        fields = "__all__"


class DiscountSerializer(ModelSerializer):
    discounted_price = serializers.ReadOnlyField()
    class Meta:
        model  = Discount
        fields = "__all__"


from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from .models import Wishlist

class WishlistSerializer(ModelSerializer):
    product_name = serializers.CharField(source="listing.product.name",read_only=True,)
    product_category = serializers.CharField(source="listing.product.category",read_only=True,)
    product_image = serializers.SerializerMethodField()
    seller_name = serializers.CharField(source="listing.seller.username",read_only=True,)
    price = serializers.DecimalField(source="listing.price",max_digits=10,decimal_places=2,read_only=True,)
    stock = serializers.IntegerField(source="listing.stock",read_only=True,)
    listing_id = serializers.IntegerField(source="listing.id",read_only=True,)

    class Meta:
        model = Wishlist
        fields = ["id","listing","listing_id","product_name","product_category","product_image","seller_name","price","stock","created_at",]
        read_only_fields = ["user"]
    def get_product_image(self, obj):
        request = self.context.get("request")
        if obj.listing.product.image:
            if request:
                return request.build_absolute_uri(
                    obj.listing.product.image.url
                )
            return obj.listing.product.image.url

        return None


class ReviewSerializer(ModelSerializer):
    username     = serializers.CharField(source="user.username", read_only=True)
    user_image   = serializers.SerializerMethodField()
    seller_name  = serializers.CharField(source="listing.seller.username",  read_only=True)
    product_name = serializers.CharField(source="listing.product.name",     read_only=True)
    is_own       = serializers.SerializerMethodField()

    class Meta:
        model  = Review
        fields = [
            "id", "user", "username", "user_image",
            "listing", "seller_name", "product_name",
            "rating", "review", "created_at", "is_own",
        ]
        read_only_fields = ["user"]

    def get_user_image(self, obj):
        req = self.context.get("request")
        try:
            p = obj.user.profile
            if p.image and req:
                return req.build_absolute_uri(p.image.url)
        except: pass
        return None

    def get_is_own(self, obj):
        req = self.context.get("request")
        if req and req.user.is_authenticated:
            return obj.user == req.user
        return False


class FeedbackSerializer(ModelSerializer):
    class Meta:
        model  = Feedback
        fields = "__all__"


class NotificationSerializer(ModelSerializer):
    class Meta:
        model  = Notification
        fields = "__all__"