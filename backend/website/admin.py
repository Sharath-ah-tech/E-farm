from django.contrib import admin
from .models import (
    Product,
    UserDetail,
    Cart,
    Order,
    OrderItem,
    Payment,
    Track,
    ShippingAddress
)

admin.site.register(Product)
admin.site.register(UserDetail)
admin.site.register(Cart)
admin.site.register(Order)
admin.site.register(OrderItem)
admin.site.register(Payment)
admin.site.register(Track)
admin.site.register(ShippingAddress)