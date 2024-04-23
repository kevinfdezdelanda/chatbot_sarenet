from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
import requests
from .models import Prompt

def chat(request):
    return render(request, 'app_sarebot/chat.html')

def busquedas(request):
    prompts = Prompt.objects.all()
    return render(request, 'app_sarebot/index.html', {'prompts': prompts})

# Funcion para actualizar la descripción de los prompts
def get_prompt_description(request):
    prompt_id = request.GET.get('prompt_id')
    if prompt_id:
        prompt = Prompt.objects.get(id=prompt_id)
        return JsonResponse({'description': prompt.descripcion})
    else:
        return JsonResponse({'description': ''})  

def api_view(request):
    result = llamar_api()
    return HttpResponse(result, content_type='text/plain')
    
def llamar_api():
    url = "http://172.26.215.178:1234/v1/chat/completions"
    headers = {'Content-Type': 'application/json'}
    data = {
        "model": "bartowski/c4ai-command-r-v01-GGUF",
        "messages": [
            {"role": "system", "content": "Always answer in rhymes."},
            {"role": "user", "content": "Introduce yourself."}
        ],
        "temperature": 0.7,
        "max_tokens": -1,
        "stream": False
    }

    # Usar requests para enviar una solicitud POST
    response = requests.post(url, json=data, headers=headers)

    # Manejar la respuesta
    if response.status_code == 200:
        response_data = response.json()
        print(response_data)
        # Asegúrate de que el campo 'choices' contiene al menos un elemento
        if response_data['choices']:
            # Extrae el contenido del primer 'choice' y del 'message'
            content = response_data['choices'][0]['message']['content']
            return content
    else:
        return {'error': 'Request failed', 'status_code': response.status_code}