from django.db import transaction
from website.models import Cart, Payment, Order, OrderItem, ShippingAddress, Notification


class CheckoutService:
    LOW_STOCK_THRESHOLD = 10

    @staticmethod
    @transaction.atomic
    def checkout(user, shipping_data=None, payment_type="cod"):
        cart_items = Cart.objects.filter(user=user).select_related(
            "listing", "listing__product", "listing__seller"
        )
        if not cart_items.exists():
            raise Exception("Cart is empty")

        total_amount = 0
        order = Order.objects.create(user=user, status="pending")
        sellers_notified = set()

        for cart_item in cart_items:
            listing = cart_item.listing

            if cart_item.quantity > listing.stock:
                raise Exception(
                    f"Not enough stock for '{listing.product.name}'. "
                    f"Available: {listing.stock}"
                )

            # ── Use discounted price ──────────────────────────────────────────
            unit_price   = listing.final_price
            item_total   = unit_price * cart_item.quantity
            total_amount += item_total

            OrderItem.objects.create(
                order    = order,
                listing  = listing,
                quantity = cart_item.quantity,
                price    = unit_price,          # ← discounted price stored here
            )

            listing.stock -= cart_item.quantity
            listing.save()

            # ── Low stock notification → seller ───────────────────────────────
            if listing.stock <= CheckoutService.LOW_STOCK_THRESHOLD:
                Notification.objects.create(
                    user              = listing.seller,
                    title             = f"Low Stock: {listing.product.name}",
                    message           = (
                        f"Stock for '{listing.product.name}' is now "
                        f"{listing.stock} unit(s). Restock soon."
                    ),
                    notification_type = "stock",
                )

            # ── New order notification → seller (once per seller) ─────────────
            if listing.seller.id not in sellers_notified:
                sellers_notified.add(listing.seller.id)
                Notification.objects.create(
                    user              = listing.seller,
                    title             = f"New Order #{order.id}",
                    message           = (
                        f"{user.username} placed a new order. "
                        f"Check your orders to confirm."
                    ),
                    notification_type = "order",
                )

        order.total_amount = total_amount
        order.save()

        Payment.objects.create(
            order        = order,
            amount       = total_amount,
            status       = "pending",
            payment_type = payment_type,
        )

        # Track is created by signal (signals.py)

        if shipping_data:
            ShippingAddress.objects.create(
                order       = order,
                address     = shipping_data.get("address", ""),
                city        = shipping_data.get("city", ""),
                state       = shipping_data.get("state", ""),
                phone       = shipping_data.get("phone", ""),
                postal_code = shipping_data.get("postal_code", ""),
                country     = shipping_data.get("country", "India"),
            )

        # ── Order placed notification → customer ──────────────────────────────
        Notification.objects.create(
            user              = user,
            title             = f"Order #{order.id} Placed",
            message           = (
                f"Your order has been placed successfully. "
                f"Total: ₹{float(total_amount):,.2f}"
            ),
            notification_type = "order",
        )

        cart_items.delete()
        return order