from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg
# ==========================
# Product
# ==========================

class Product(models.Model):
    UNIT_CHOICES = [('kg', 'Kilogram'), ('g', 'Gram'), ('piece', 'Piece'), ('litre', 'Litre'),('ml', 'Millilitre')]
    CATEGORY_CHOICES = [('Pesticide', 'Pesticide'),('Tools', 'Tools'), ('Vegetables', 'Vegetables'), ('Fruits', 'Fruits'), ('Seeds', 'Seeds'), ('Greens', 'Greens'),]
    name = models.CharField(max_length=100)
    image = models.ImageField(upload_to="products/",blank=True,null=True)
    category = models.CharField(max_length=50,choices=CATEGORY_CHOICES,default='Vegetables')
    @property
    def seller_count(self):
        return self.listings.count()
    
    @property
    def lowest_price(self):
        listing = self.listings.order_by("price").first()
        return listing.price if listing else 0
    
    @property
    def average_rating(self):
        ratings = []

        for listing in self.listings.all():
            ratings.extend(listing.reviews.values_list("rating",flat=True))
        if not ratings:
            return 0
        return round(
            sum(ratings) / len(ratings),1)
    
    def __str__(self):
        return self.name

class ProductList(models.Model):

    UNIT_CHOICES = [('kg', 'Kilogram'),('g', 'Gram'),('piece', 'Piece'),('litre', 'Litre'),('ml', 'Millilitre')]
    seller = models.ForeignKey(User,on_delete=models.CASCADE,related_name='listings')
    product = models.ForeignKey(Product,on_delete=models.CASCADE,related_name='listings')
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10,decimal_places=2)
    stock = models.PositiveIntegerField(default=1)
    units = models.CharField(max_length=20,choices=UNIT_CHOICES,default='kg')
    created_at = models.DateTimeField(
        auto_now_add=True)

    @property
    def review_count(self):
        return self.reviews.count()
    
    @property
    def seller_name(self):
        return self.seller.username
    
    @property
    def average_rating(self):
        return (
            self.reviews.aggregate(avg=Avg("rating"))["avg"] or 0)
    class Meta:
        unique_together = ("seller", "product")
        ordering=['product__name']

    def __str__(self):
        return f"{self.product.name} - {self.seller.username}"
    
# ==========================
# User Profile
# ==========================

class UserDetail(models.Model):

    ROLE_CHOICES = [
        ("farmer", "Farmer"),
        ("wholesaler", "Wholesaler"),
        ("customer", "Customer"),
        ("admin", "Admin"),
    ]

    user = models.OneToOneField(User,on_delete=models.CASCADE,related_name="profile")
    address = models.TextField()
    profile_url = models.URLField(blank=True,null=True)
    image = models.ImageField(upload_to='profile/',blank=True, null=True)
    role = models.CharField(max_length=20,choices=ROLE_CHOICES,default="customer")
    role_locked = models.BooleanField(default = False)
    phone = models.CharField(max_length=15,blank=True,null=True)
    district = models.CharField(max_length=100,blank=True,null=True)
    state = models.CharField(max_length=100,blank=True,null=True)
    business_name = models.CharField(max_length=200,blank=True,null=True)
    profile_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} ({self.role})"


# ==========================
# Cart
# ==========================

class Cart(models.Model):

    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="cart_items")
    listing = models.ForeignKey(ProductList,on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default = 1)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def total_price(self):
        return self.quantity * self.listing.price

    class Meta:
        unique_together = ("user", "listing")
        verbose_name_plural = "Carts"

    def __str__(self):
        return f"{self.user.username} - {self.listing.product.name}"


# ==========================
# Order
# ==========================

class Order(models.Model):

    ORDER_STATUS = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("out_for_delivery", "Out For Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="orders")
    status = models.CharField(max_length=30,choices=ORDER_STATUS,default="pending")
    total_amount = models.DecimalField(max_digits=10,decimal_places=2,default=0)
    order_date = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Order #{self.id}"


# ==========================
# Order Items
# ==========================

class OrderItem(models.Model):

    order = models.ForeignKey(Order,on_delete=models.CASCADE,related_name="items")
    listing = models.ForeignKey(ProductList,on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10,decimal_places=2)

    @property
    def total_price(self):
        return self.quantity * self.price

    def __str__(self):
        return f"{self.listing.product.name} x {self.quantity}"


# ==========================
# Tracking
# ==========================

class Track(models.Model):

    TRACK_STATUS = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("out_for_delivery", "Out For Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    order = models.OneToOneField(Order,on_delete=models.CASCADE,related_name="tracking")
    status = models.CharField(max_length=30,choices=TRACK_STATUS,default="pending")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Tracks"

    def __str__(self):
        return f"Order #{self.order.id} - {self.status}"


# ==========================
# Payment
# ==========================

class Payment(models.Model):

    PAYMENT_STATUS = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        ("cancelled", "Cancelled"),
    ]
    PAYMENT_TYPE = [("razorpay","Razorpay"), ("cod", "Cash Out Delivery")]

    order = models.OneToOneField(Order,on_delete=models.CASCADE,related_name="payment")
    amount = models.DecimalField(max_digits=10,decimal_places=2)
    payment_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20,choices=PAYMENT_STATUS,default="pending")
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE, default='razorpay')

    class Meta:
        verbose_name_plural = "Payments"

    def __str__(self):
        return f"Payment for Order #{self.order.id}"


# ==========================
# Shipping Address
# ==========================

class ShippingAddress(models.Model):

    order = models.OneToOneField(Order,on_delete=models.CASCADE,related_name="shipping_address")
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    phone = models.CharField(max_length=15,blank=True,null=True)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.city}, {self.country}"

class Discount(models.Model):

    seller = models.ForeignKey(User,on_delete=models.CASCADE,related_name='discounts')
    listing = models.ForeignKey(ProductList, on_delete=models.CASCADE)
    discount = models.PositiveIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    @property
    def discounted_price(self):
        return self.listing.price - (
            self.listing.price * self.discount / 100
    )

    def __str__(self):
        return f"Discount is {self.discount} and the discounted amount is {self.listing.price * (self.discount*0.01)}"
    
class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wishlist')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='wishlisted_by')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together=('user', 'product')
    def __str__(self):
        return self.product.name
    
class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    listing = models.ForeignKey(ProductList, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    review = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('user', 'listing')
    
    def __str__(self):
        return f"{self.user.username}-{self.listing.product.name}"
    
class Feedback(models.Model):

    user = models.ForeignKey(User,on_delete=models.CASCADE)
    subject = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.subject
    
class Notification(models.Model):

    NOTIFICATION_TYPES = [
        ("order", "Order"),
        ("payment", "Payment"),
        ("review", "Review"),
        ("discount", "Discount"),
        ("stock", "Stock"),
        ("system", "System"),
    ]

    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="notifications")
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20,choices=NOTIFICATION_TYPES,default="system")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ["-created_at"]
    def __str__(self):
        return self.title
    
