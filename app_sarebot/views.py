from django.shortcuts import render
from django.http import HttpResponse

def chat(request):
    return render(request, 'app_sarebot/chat.html')

def busquedas(request):
    return render(request, 'app_sarebot/index.html')