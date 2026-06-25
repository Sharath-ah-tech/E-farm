from django.db import models

class ProductManager(models.Manager):

    def available(self):
        return self.filter(
            stock__gt=0
        )

    def by_owner(self, owner):
        return self.filter(
            owner=owner
        )

    def expensive(self):
        return self.filter(
            price__gte=1000
        )