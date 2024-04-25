from django.contrib import admin
from .models import Prompt, Chat

class AdminPrompt(admin.ModelAdmin):
    # Campos que se muestran en el listado de Prompts
    list_display = ["nombre", "descripcion", "texto"]

class AdminChat(admin.ModelAdmin):
    # Campos que se muestran en la lista de Chats
    list_display = ["pregunta", "prompt", "respuesta", "timestamp", "valoracion"]
    
    # Campos por los que se puede filtrar
    list_filter = ["prompt", "valoracion", "timestamp"]
    
    # Para que no se pueda editar ningún campo
    readonly_fields = [field.name for field in Chat._meta.get_fields()]
    
     # Oculta los botones de guardar y añadir
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

admin.site.register(Prompt, AdminPrompt)
admin.site.register(Chat, AdminChat)
