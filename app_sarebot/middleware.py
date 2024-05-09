from django.utils.functional import SimpleLazyObject
from django.contrib.auth.models import AnonymousUser

class BypassAdminAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Permitir acceso al admin como si fuera superusuario
        if request.path.startswith('/admin'):
            request.user = SimpleLazyObject(lambda: self.get_superuser(request))
        response = self.get_response(request)
        return response

    def get_superuser(self, request):
        if not hasattr(request, '_cached_superuser'):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            request._cached_superuser = User.objects.filter(is_superuser=True).first()
        return request._cached_superuser
