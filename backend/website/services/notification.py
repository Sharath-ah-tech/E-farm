from ..models import Notification

class NotificationService:

    @staticmethod
    def create_notification(
        user,
        title,
        message
    ):
        return Notification.objects.create(
            user=user,
            title=title,
            message=message
        )
    @staticmethod
    def order_placed(user, order):
        return Notification.objects.create(
        user=user,
        title="Order Placed",
        message=f"Your order #{order.id} has been placed successfully.",
        notification_type="order"
    )
    @staticmethod
    def order_shipped(user, order):
        return Notification.objects.create(
        user=user,
        title="Order Shipped",
        message=f"Order #{order.id} has been shipped.",
        notification_type="order"
    )
    @staticmethod
    def order_delivered(user, order):
        return Notification.objects.create(
        user=user,
        title="Order Delivered",
        message=f"Order #{order.id} has been delivered.",
        notification_type="order"
    )
    @staticmethod
    def payment_success(user, payment):
        return Notification.objects.create(
        user=user,
        title="Payment Successful",
        message=f"₹{payment.amount} payment received.",
        notification_type="payment"
    )
    @staticmethod
    def payment_failed(user, payment):
        return Notification.objects.create(
        user=user,
        title="Payment Failed",
        message=f"Payment of ₹{payment.amount} failed.",
        notification_type="payment"
    )
    @staticmethod
    def review_added(product_owner, review):
        return Notification.objects.create(
        user=product_owner,
        title="New Review",
        message=f"{review.user.username} rated your product {review.product.name} with {review.rating} stars.",
        notification_type="review"
    )
    @staticmethod
    def discount_added(user, product, discount):
        return Notification.objects.create(
        user=user,
        title="Discount Added",
        message=f"{discount}% discount is available on {product.name}.",
        notification_type="discount"
    )
    @staticmethod
    def discount_added(user, product, discount):
        return Notification.objects.create(
        user=user,
        title="Discount Added",
        message=f"{discount}% discount is available on {product.name}.",
        notification_type="discount"
    )
    @staticmethod
    def low_stock(user, product):
        return Notification.objects.create(
        user=user,
        title="Low Stock Alert",
        message=f"{product.name} stock is running low.",
        notification_type="stock"
    )
    @staticmethod
    def broadcast(title, message):
        from django.contrib.auth.models import User

        notifications = [
        Notification(
            user=user,
            title=title,
            message=message,
            notification_type="system"
        )
        for user in User.objects.all()
    ]

        Notification.objects.bulk_create(
        notifications
    )
        