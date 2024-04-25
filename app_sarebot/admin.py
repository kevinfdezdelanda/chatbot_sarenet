from django.contrib import admin
from .models import Prompt, Chat

class SoloLecturaChat(admin.ModelAdmin):
    # Para que no se pueda editar ningún campo
    readonly_fields = [field.name for field in Chat._meta.get_fields()]
    
     # Oculta los botones de guardar y añadir
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

admin.site.register(Prompt, Chat, SoloLecturaChat)
