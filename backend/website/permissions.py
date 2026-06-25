from rest_framework.permissions import BasePermission

class Is_Farmer(BasePermission):
    def has_permission(self, request, view):
        return(
            request.user.is_authenticated and request.user.profile.role == 'farmer'
        )
    
class Is_Admin(BasePermission):
    def has_permission(self, request, view):
        return(
            request.user.is_authenticated and request.user.profile.role == 'admin'
        )
    
class Is_Wholesaler(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.profile.role == 'wholesaler'
        )
class Is_Customer(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and request.user.profile.role == 'customer'
        )

class IsFarmerOrWholesaler(BasePermission):

    def has_permission(self, request, view):

        return (
            request.user.is_authenticated
            and
            request.user.profile.role in [
                "farmer",
                "wholesaler"
            ]
        )
    
