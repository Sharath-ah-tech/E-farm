from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg, Sum
import random, string

class Product(models.Model):
    CATEGORY_CHOICES = [
        ('Pesticide','Pesticide'),('Tools','Tools'),('Vegetables','Vegetables'),
        ('Fruits','Fruits'),('Seeds','Seeds'),('Greens','Greens'),
    ]
    name     = models.CharField(max_length=100)
    image    = models.ImageField(upload_to="products/", blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Vegetables')

    @property
    def seller_count(self):
        return self.listings.count()

    @property
    def lowest_price(self):
        listing = self.listings.filter(stock__gt=0).order_by("price").first()
        if not listing:
            listing = self.listings.order_by("price").first()
        return listing.final_price if listing else 0

    @property
    def total_stock(self):
        return self.listings.aggregate(total=Sum("stock"))["total"] or 0

    @property
    def has_stock(self):
        return self.listings.filter(stock__gt=0).exists()

    @property
    def average_rating(self):
        ratings = []
        for listing in self.listings.all():
            ratings.extend(listing.reviews.values_list("rating", flat=True))
        if not ratings:
            return 0
        return round(sum(ratings) / len(ratings), 1)

    @property
    def review_count(self):
        return sum(l.reviews.count() for l in self.listings.all())

    def __str__(self):
        return self.name


class ProductList(models.Model):
    UNIT_CHOICES = [
        ('kg','Kilogram'),('g','Gram'),('piece','Piece'),
        ('litre','Litre'),('ml','Millilitre'),
    ]
    seller      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    product     = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='listings')
    description = models.TextField(blank=True, null=True)
    price       = models.DecimalField(max_digits=10, decimal_places=2)
    stock       = models.PositiveIntegerField(default=1)
    units       = models.CharField(max_length=20, choices=UNIT_CHOICES, default='kg')
    created_at  = models.DateTimeField(auto_now_add=True)

    @property
    def review_count(self):
        return self.reviews.count()

    @property
    def seller_name(self):
        return self.seller.username

    @property
    def average_rating(self):
        return self.reviews.aggregate(avg=Avg("rating"))["avg"] or 0

    @property
    def discount_percentage(self):
        d = Discount.objects.filter(listing=self).first()
        return d.discount if d else 0

    @property
    def has_discount(self):
        return Discount.objects.filter(listing=self).exists()

    @property
    def final_price(self):
        pct = self.discount_percentage
        if pct > 0:
            from decimal import Decimal
            return round(self.price - self.price * Decimal(str(pct)) / 100, 2)
        return self.price

    class Meta:
        unique_together = ("seller", "product")
        ordering = ['product__name']

    def __str__(self):
        return f"{self.product.name} - {self.seller.username}"


class UserDetail(models.Model):
    ROLE_CHOICES = [
        ("farmer","Farmer"),("wholesaler","Wholesaler"),
        ("customer","Customer"),("admin","Admin"),
    ]
    user              = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    address           = models.TextField(blank=True, default="")
    profile_url       = models.URLField(blank=True, null=True)
    image             = models.ImageField(upload_to='profile/', blank=True, null=True)
    role              = models.CharField(max_length=20, choices=ROLE_CHOICES, default="customer")
    role_locked       = models.BooleanField(default=False)
    phone             = models.CharField(max_length=15, blank=True, null=True)
    district          = models.CharField(max_length=100, blank=True, null=True)
    state             = models.CharField(max_length=100, blank=True, null=True)
    business_name     = models.CharField(max_length=200, blank=True, null=True)
    profile_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class Cart(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name="cart_items")
    listing    = models.ForeignKey(ProductList, on_delete=models.CASCADE)
    quantity   = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def total_price(self):
        return self.quantity * self.listing.final_price

    class Meta:
        unique_together = ("user", "listing")
        verbose_name_plural = "Carts"

    def __str__(self):
        return f"{self.user.username} - {self.listing.product.name}"


class Order(models.Model):
    ORDER_STATUS = [
        ("pending","Pending"),("processing","Confirmed"),
        ("packed","Packed"),("shipped","Shipped"),
        ("out_for_delivery","Out For Delivery"),("delivered","Delivered"),
        ("cancelled","Cancelled"),("returned","Returned"),
    ]
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    status       = models.CharField(max_length=30, choices=ORDER_STATUS, default="pending")
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    order_date   = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Order #{self.id}"


class OrderItem(models.Model):
    order    = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    listing  = models.ForeignKey(ProductList, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price    = models.DecimalField(max_digits=10, decimal_places=2)

    @property
    def total_price(self):
        return self.quantity * self.price

    def __str__(self):
        return f"{self.listing.product.name} x {self.quantity}"


class Track(models.Model):
    TRACK_STATUS = [
        ("pending","Pending"),("processing","Confirmed"),
        ("packed","Packed"),("shipped","Shipped"),
        ("out_for_delivery","Out For Delivery"),("delivered","Delivered"),
        ("cancelled","Cancelled"),("returned","Returned"),
    ]
    order      = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="tracking")
    status     = models.CharField(max_length=30, choices=TRACK_STATUS, default="pending")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Tracks"

    def __str__(self):
        return f"Order #{self.order.id} - {self.status}"


class Payment(models.Model):
    PAYMENT_STATUS = [
        ("pending","Pending"),("paid","Paid"),
        ("failed","Failed"),("refunded","Refunded"),("cancelled","Cancelled"),
    ]
    PAYMENT_TYPE = [("razorpay","Razorpay"),("cod","Cash On Delivery")]

    order                = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="payment")
    amount               = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date         = models.DateTimeField(default=timezone.now)
    status               = models.CharField(max_length=20, choices=PAYMENT_STATUS, default="pending")
    payment_type         = models.CharField(max_length=20, choices=PAYMENT_TYPE, default='cod')
    # ── Razorpay fields ──────────────────────────────────────────────────────
    razorpay_order_id    = models.CharField(max_length=100, blank=True, null=True, unique=True)
    razorpay_payment_id  = models.CharField(max_length=100, blank=True, null=True, unique=True)
    razorpay_signature   = models.CharField(max_length=300, blank=True, null=True)

    class Meta:
        verbose_name_plural = "Payments"

    def __str__(self):
        return f"Payment for Order #{self.order.id}"


class ShippingAddress(models.Model):
    order       = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="shipping_address")
    address     = models.TextField()
    city        = models.CharField(max_length=100)
    state       = models.CharField(max_length=100)
    phone       = models.CharField(max_length=15, blank=True, null=True)
    postal_code = models.CharField(max_length=20)
    country     = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.city}, {self.country}"


class Discount(models.Model):
    seller   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='discounts')
    listing  = models.ForeignKey(ProductList, on_delete=models.CASCADE)
    discount = models.PositiveIntegerField(validators=[MinValueValidator(0), MaxValueValidator(100)])

    @property
    def discounted_price(self):
        return self.listing.price - (self.listing.price * self.discount / 100)

    def __str__(self):
        return f"{self.discount}% off {self.listing.product.name}"


class Wishlist(models.Model):
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="wishlist",)
    listing = models.ForeignKey(ProductList,on_delete=models.CASCADE,related_name="wishlisted_by",null = True, blank = True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ("user", "listing")
    def __str__(self):
        return self.listing.product.name


class Review(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    listing    = models.ForeignKey(ProductList, on_delete=models.CASCADE, related_name='reviews')
    rating     = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    review     = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'listing')

    def __str__(self):
        return f"{self.user.username} - {self.listing.product.name}"


class Feedback(models.Model):
    user       = models.ForeignKey(User, on_delete=models.CASCADE)
    subject    = models.CharField(max_length=200)
    message    = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.subject


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ("order","Order"),("payment","Payment"),("review","Review"),
        ("discount","Discount"),("stock","Stock"),("system","System"),
    ]
    user              = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    title             = models.CharField(max_length=200)
    message           = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default="system")
    is_read           = models.BooleanField(default=False)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class PasswordResetOTP(models.Model):
    METHOD_CHOICES = [("email","Email"),("phone","Phone")]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_otps')
    otp        = models.CharField(max_length=6)
    method     = models.CharField(max_length=10, choices=METHOD_CHOICES, default="email")
    created_at = models.DateTimeField(auto_now_add=True)
    is_used    = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_expired(self):
        from datetime import timedelta
        return timezone.now() > self.created_at + timedelta(minutes=10)

    def __str__(self):
        return f"OTP for {self.user.username} via {self.method}"