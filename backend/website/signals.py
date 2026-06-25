from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User

from .models import UserDetail, Order, Track

@receiver(post_save, sender=User)
def create_user(sender, instance, created, **kwargs):
    if created:
        UserDetail.objects.create(user=instance)

@receiver(post_save, sender=Order)
def create_tracking(sender, instance, created, **kwargs):
    if created:
        Track.objects.create(order=instance, status='pending')

@receiver(post_save, sender=Track)
def order_delivered(sender, instance, created, **kwargs):
    if instance.status == 'delivered':
        print('Order Delivered')