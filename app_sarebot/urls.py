from django.urls import path
from . import views, rag

urlpatterns = [
    path("", views.consultas, name="consultas"),
    path("chat/", views.chat, name="chat"),
    path("busquedas/", views.busquedas, name="busquedas"),
    path("api/get-prompt-description/", views.get_prompt_description, name="get-prompt-description"),
    path("api/get-prompt/", views.get_prompt, name="get-prompt"),
    path("api/save-rating/", views.registrarValoracion, name="save-rating"),
    path("chat/save-chat/", views.registrarNuevoChat, name="save-chat"),
    path("chat/save-rating/", views.registrarValoracion, name="save-chat-rating"),
    path("chat/chat-call/", views.api_view, name="chat-call"),
    path("call-api/", views.api_view, name="call-api"),
    path('chat/listar_chats/', views.listar_chats, name='listar_chats'),
    path('chat/cargar_chats/', views.cargar_chats, name='cargar_chats'),
    path('chat/ocultar-chat/', views.ocultarChat, name='ocultar-chat'),
    path('busquedas/call-api/', rag.search_rag, name='search-rag')
]