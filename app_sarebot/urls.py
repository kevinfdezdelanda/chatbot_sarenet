from django.urls import path
from . import views

urlpatterns = [
    path("", views.busquedas, name="busquedas"),
    path("chat/", views.chat, name="chat"),
    path("api/get-prompt-description/", views.get_prompt_description, name="get-prompt-description"),
    path("api/get-prompt/", views.get_prompt, name="get-prompt"),
    path("api/save-rating/", views.registrarValoracion, name="save-rating"),
    path("call-api/", views.api_view, name="call-api"),
    path("chat/chat-call/", views.chat_api_view, name="chat-call"),
]