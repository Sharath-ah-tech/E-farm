from django.db import transaction
from website.models import (Cart, Payment, Order, OrderItem, Track)

class CheckoutService:
    @staticmethod
    @transaction.atomic
    def checkout(user):
        cart_items = Cart.objects.filter(user = user)
        if not cart_items.exists():
            raise Exception('Cart is Empty')
        total_amount = 0
        order = Order.objects.create(user = user, status = 'pending')
        for cart_item in cart_items:
            if(cart_item.quantity > cart_item.product.stock):
                raise Exception('Stock is less')
            OrderItem.objects.create(
                order=order, product = cart_item.product, quantity = cart_item.quantity, price = cart_item.product.price
            )
            total_amount+=(cart_item.product.price*cart_item.quantity)
            cart_item.product.stock-=(cart_item.quantity)
            cart_item.product.save()
        order.total_amount = total_amount
        order.save()

        Payment.objects.create(order = order, amount = total_amount, status = 'pending')
        Track.objects.create(order = order, status = 'pending')

        cart_item.delete()
        return order