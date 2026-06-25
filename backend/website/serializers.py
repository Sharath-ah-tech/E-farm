from .models import Product, UserDetail, Cart, Order, OrderItem, Payment, Track, ShippingAddress, Discount, Wishlist, Review, Feedback, Notification, ProductList
from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
# from rest_framework.authtoken.models import Token

class UserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']
        
class RegisterSerializer(ModelSerializer):
    email = serializers.EmailField(
        required = True,
        validators = [UniqueValidator(queryset=User.objects.all())]
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    role = serializers.CharField(
        write_only=True,
        required=False
    )
    class Meta:
        model = User
        fields = ('first_name','last_name','username', 'password', 'email', 'role')
    def create(self, validated_data):
        role = validated_data.pop('role', 'customer')
        user = User.objects.create_user(
        username=validated_data['username'],
        email=validated_data['email'],
        password=validated_data['password'],
        first_name=validated_data['first_name'],
        last_name=validated_data['last_name']
)

        # Update the profile role created by signals
        profile = user.profile
        profile.role = role
        profile.save()

        return user
    
class ProductSerializer(ModelSerializer):

    seller_count = serializers.ReadOnlyField()
    lowest_price = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()

    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id","name","category","image","image_url","seller_count","lowest_price","average_rating",]

    def get_image_url(self, obj):
        request = self.context.get("request")

        if obj.image:
            return request.build_absolute_uri(
                obj.image.url
            )

        return None
    
class ProductListSerializer(ModelSerializer):

    seller_name = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    review_count = serializers.ReadOnlyField()

    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    product_image = serializers.SerializerMethodField()

    class Meta:
        model = ProductList

        fields = ["id","product","product_name","product_image","seller","seller_name","description",
                  "price","stock","units","average_rating","review_count","created_at",]

    def get_product_image(self, obj):
        request = self.context.get("request")

        if obj.product.image:
            return request.build_absolute_uri(
                obj.product.image.url
            )

        return None

class UserDetailSerializer(ModelSerializer):

    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    profile_completed = serializers.SerializerMethodField()

    class Meta:
        model = UserDetail
        fields = "__all__"

    def get_profile_completed(self, obj):
        return bool(
            obj.address and
            obj.phone
        )

class CartSerializer(ModelSerializer):

    product_name = serializers.CharField(source="listing.product.name",read_only=True)
    seller_name = serializers.CharField(source="listing.seller.username",read_only=True)
    class Meta:
        model = Cart
        fields = "__all__"
        read_only_fields = ["user"]

class OrderSerializer(ModelSerializer):
    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields=['user']

class OrderItemSerializer(ModelSerializer):
    class Meta:
        model = OrderItem
        fields = "__all__"

class PaymentSerializer(ModelSerializer):
    class Meta:
        model = Payment
        fields = "__all__"

class TrackSerializer(ModelSerializer):
    class Meta:
        model = Track
        fields = "__all__"

class ShippingAddressSerializer(ModelSerializer):
    class Meta:
        model = ShippingAddress
        fields = "__all__"

class DiscountSerializer(ModelSerializer):
    discounted_price = serializers.ReadOnlyField()
    class Meta:
        model = Discount
        fields = "__all__"

class WishlistSerializer(ModelSerializer):
    class Meta:
        model = Wishlist
        fields = "__all__"
        read_only_fields=['user']

class ReviewSerializer(ModelSerializer):

    username = serializers.CharField(
        source="user.username",
        read_only=True
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "user",
            "username",
            "listing",
            "rating",
            "review",
            "created_at",
        ]

class FeedbackSerializer(ModelSerializer):
    class Meta:
        model = Feedback
        fields = "__all__" 

class NotificationSerializer(ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"