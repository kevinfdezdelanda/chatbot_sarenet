import json
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
import requests
from .models import Prompt, Chat

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
        print(prompt.descripcion)
        return JsonResponse({'description': prompt.descripcion})
    else:
        return JsonResponse({'description': ''})  
    
# Funcion para obtener el prompt
def get_prompt(request):
    prompt_id = request.GET.get('prompt_id')
    if prompt_id:
        prompt = Prompt.objects.get(id=prompt_id)
        return JsonResponse({'prompt': prompt.texto})
    else:
        return JsonResponse({'prompt': ''})  

def api_view(request):
    system = request.POST.get('system', '')
    user = request.POST.get('user', '')
    
    print(f"Received prompt: {system}")
    def event_stream():
        complete_response = []
        stream = llamar_api(user, system)
        for chunk in stream:
            if chunk:  # Asegura que el chunk no está vacío
                data_str = chunk.decode('utf-8').replace('data: ', '')
                if data_str.strip() == '[DONE]':  # Chequea si es el mensaje de finalización
                    yield "event: done\ndata: \n\n"  # Envía un evento personalizado llamado 'done'
                    break  # Rompe el ciclo para terminar el stream
                else:
                    try:
                        data = json.loads(data_str)
                        if 'choices' in data:
                            for choice in data['choices']:
                                if 'delta' in choice and 'content' in choice['delta']:
                                    partial_response = choice['delta']['content']
                                    complete_response.append(partial_response)
                                    yield f"data: {partial_response}\n\n"
                    except json.JSONDecodeError as e:
                        yield f"data: Error parsing JSON: {str(e)}\n\n"
        final_response = "".join(complete_response)
        registrarLog(user, system, final_response)
    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    return response
    
def llamar_api(user, system):
    url = "http://172.26.215.178:1234/v1/chat/completions"
    headers = {'Content-Type': 'application/json'}
    data = {
        "model": "bartowski/c4ai-command-r-v01-GGUF",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        "temperature": 0.7,
        "max_tokens": -1,
        "stream": True  # Activar el streaming
    }

    # Usar requests para enviar una solicitud POST
    response = requests.post(url, json=data, headers=headers, stream=True)  # Añadir 'stream=True' a la solicitud

    if response.status_code == 200:
        return response.iter_lines()
    else:
        return {'error': 'Request failed', 'status_code': response.status_code}
    
def registrarLog(user_prompt, system_prompt, response):
    nuevo_registro = Chat(pregunta=user_prompt, respuesta=response, id_prompt=Prompt.objects.get(texto=system_prompt))
    nuevo_registro.save()