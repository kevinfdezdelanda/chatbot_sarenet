import json
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
import requests
from .models import Prompt, Registro
def chat(request):
    return render(request, 'app_sarebot/chat.html')

def busquedas(request):
    prompts = Prompt.objects.all()
    return render(request, 'app_sarebot/index.html', {'prompts': prompts})

def chat_api_view(request):
    user = request.GET.get('userMessage', '')
    def event_stream():
        complete_response = []
        stream = chat_llamar_api(user)
        print("stream",stream)
        for chunk in stream:
            if chunk:  # Asegura que el chunk no está vacío
                data_str = chunk.decode('utf-8').replace('data: ', '')
                if data_str.strip() == '[DONE]':  # Chequea si es el mensaje de finalización
                    yield "event: done\ndata: \n\n"  # Envía un evento personalizado llamado 'done'
                    break  # Rompe el ciclo para terminar el stream
                else:
                    try:
                        data = json.loads(data_str)
                        print(data)
                        if 'choices' in data:
                            for choice in data['choices']:
                                if 'delta' in choice and 'content' in choice['delta']:
                                    yield f"data: {choice['delta']['content']}\n\n"
                    except json.JSONDecodeError as e:
                        yield f"data: Error parsing JSON: {str(e)}\n\n"
    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    print(response)
    return response

def chat_llamar_api(texto):
    url = "http://172.26.215.178:1234/v1/chat/completions"
    headers = {'Content-Type': 'application/json'}
    print(texto)
    data = {
        "model": "bartowski/c4ai-command-r-v01-GGUF",
        "messages": [
            {"role": "system", "content": "Responde con respeto y con las necesidades del usuario"},
            {"role": "user", "content": texto}
        ],
        "temperature": 0.7,
        "max_tokens": -1,
        "stream": True  # Activar el streaming
    }

    # Usar requests para enviar una solicitud POST
    response = requests.post(url, json=data, headers=headers, stream=True)  # Añadir 'stream=True' a la solicitud
    if response.status_code == 200:
        print("Success")
        return response.iter_lines()
    else:
        print("No-success")
        return {'error': 'Request failed', 'status_code': response.status_code}

# Funcion para actualizar la descripción de los prompts
def get_prompt_description(request):
    prompt_id = request.GET.get('prompt_id')
    if prompt_id:
        prompt = Prompt.objects.get(id=prompt_id)
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
    system = request.GET.get('system', '')
    user = request.GET.get('user', '')
    origen = request.GET.get('origen', '')
    def event_stream():
        complete_response = []
        stream = llamar_api(user, system)
        for chunk in stream:
            if chunk:  # Asegura que el chunk no está vacío
                data_str = chunk.decode('utf-8').replace('data: ', '')
                if data_str.strip() != '[DONE]':  # Chequea si es el mensaje de finalización
                    try:
                        data = json.loads(data_str)
                        if 'choices' in data:
                            for choice in data['choices']:
                                partial_response = choice['delta']
                                if 'delta' in choice and 'content' in partial_response:
                                    complete_response.append(partial_response['content'])
                                    yield f"data: {json.dumps(partial_response)}\n\n"
                    except json.JSONDecodeError as e:
                        yield f"data: Error parsing JSON: {str(e)}\n\n"
                else:
                    break  # Rompe el ciclo para terminar el stream
        final_response = "".join(complete_response)
        id_registro = registrarLog(user, system, final_response, origen)
        yield f"event: done\ndata: {id_registro}\n\n"  # Envía un evento personalizado llamado 'done'
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
        "temperature": 0.4,
        "max_tokens": -1,
        "stream": True  # Activar el streaming
    }

    # Usar requests para enviar una solicitud POST
    response = requests.post(url, json=data, headers=headers, stream=True)  # Añadir 'stream=True' a la solicitud

    if response.status_code == 200:
        return response.iter_lines()
    else:
        return {'error': 'Request failed', 'status_code': response.status_code}
    
def registrarLog(user_prompt, system_prompt, response, origen):
    nuevo_registro = Registro(
        pregunta=user_prompt,
        respuesta=response,
        prompt=Prompt.objects.get(texto=system_prompt),
        origen=origen
    )
    nuevo_registro.save()
    return nuevo_registro.id
    
def registrarValoracion(request):
    if request.method == 'POST':
        data = json.loads(request.body)
    
        id_registro = data.get('registro')
        valoracion = data.get('valoracion')
        comentario = data.get('comentario')
        
        objeto_registro = Registro.objects.get(id=id_registro)
        objeto_registro.valoracion = bool(int(valoracion))
        if comentario.strip():
            objeto_registro.comentario_val = comentario
        objeto_registro.save()
        
        # Return a JsonResponse indicating success or any relevant data
        return JsonResponse({'message': 'Valoración registrada correctamente'})

    # Handle GET or other request methods
    return JsonResponse({'error': 'Método no permitido'}, status=405)