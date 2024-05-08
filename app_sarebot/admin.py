from django.contrib import admin
from django.utils.html import format_html
from .models import Prompt, Registro, Chat

class AdminPrompt(admin.ModelAdmin):
    # Campos que se muestran en el listado de Prompts
    list_display = ["nombre", "descripcion", "texto"]

class AdminRegistro(admin.ModelAdmin):
    # Campos que se muestran en la lista de Chats
    list_display = ["pregunta", "prompt", "respuesta", "timestamp", "valoracion"]
    
    # Campos por los que se puede filtrar
    list_filter = ["prompt", "valoracion", "timestamp"]
    
    # Campos por los que se puede buscar
    search_fields = ["pregunta", "respuesta", "comentario_val"]
    
    def get_fields(self, request, obj=None):
        fields = super().get_fields(request, obj)
        if obj and obj.origen != 'Chat':
            fields.remove('chat')
        return fields
    
    # Para que no se pueda editar ningún campo
    readonly_fields = [field.name for field in Registro._meta.get_fields()]
    
     # Oculta los botones de guardar y añadir
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
    
class AdminChat(admin.ModelAdmin):
    def registros_chat(self, obj):
        registros = obj.registros_chat.all()
        if registros:
            return format_html(
                ''.join(
                    f'<p><a href="/admin/app_sarebot/registro/{registro.id}/">{registro}</a></p>' for registro in registros
                )
            )
        else:
            return 'No hay registros asociados'
        
    registros_chat.short_description = 'Historial'  # Define un nombre para el campo en la interfaz de administración
    
    # Obtiene todos los campos, excepto las relaciones
    readonly_fields = [field.name for field in Chat._meta.get_fields()]
    
     # Oculta los botones de guardar y añadir
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

admin.site.register(Prompt, AdminPrompt)
admin.site.register(Registro, AdminRegistro)
admin.site.register(Chat, AdminChat)
