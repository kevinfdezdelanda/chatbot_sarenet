from django.urls import path
from . import views

urlpatterns = [
    path("chat/", views.chat, name="chat"),
    path("", views.busquedas, name="busquedas"),
    path('api/get-prompt-description/', views.get_prompt_description, name='get-prompt-description'),
    path('api/get-prompt/', views.get_prompt, name='get-prompt'),
    path('call-api/', views.api_view, name='call-api'),
]