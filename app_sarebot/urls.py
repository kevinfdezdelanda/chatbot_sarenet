from django.urls import path
from . import views

urlpatterns = [
    path("", views.busquedas, name="busquedas"),
    path("chat/", views.chat, name="chat"),
    path("api/get-prompt-description/", views.get_prompt_description, name="get-prompt-description"),
    path("api/get-prompt/", views.get_prompt, name="get-prompt"),
    path("api/save-rating/", views.registrarValoracion, name="save-rating"),
    path("chat/save-chat/", views.registrarNuevoChat, name="save-chat"),
    path("chat/save-rating/", views.registrarValoracion, name="save-chat-rating"),
    path("chat/chat-call/", views.api_view, name="chat-call"),
    path("call-api/", views.api_view, name="call-api")
]