import json
import requests
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from .models import Prompt, Registro, Chat


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
    
# Funcion para obtener el prompt
def get_prompt(request):
    prompt_id = request.GET.get('prompt_id')
    if prompt_id:
        prompt = Prompt.objects.get(id=prompt_id)
        return JsonResponse({'prompt': prompt.texto})
    else:
        return JsonResponse({'prompt': ''})  

def api_view(request):
    user = request.GET.get('user', '')
    origen = request.GET.get('origen', '')
    if origen == "Consulta":
        system = request.GET.get('system', '')
    if origen == "Chat":
        system = "Eres un chatbot que responde con respeto y atiende a las necesidades del usuario"
        chat_id = request.GET.get('chat', '')
        chat = Chat.objects.get(id=chat_id)
        more_messages = chat.registros_chat.exists()
        if more_messages:
            messages = get_messages(
                system=system,
                chat=chat,
                next_message=user
            )
    
    def event_stream():
        complete_response = []
        stream = llamar_api(
            user=user,
            system=system,
            messages=messages if origen == "Chat" and more_messages else None
        )
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
        id_registro = registrarLog(
            user_prompt=user,
            system_prompt=system if origen == "Consulta" else None,
            response=final_response,
            origen=origen,
            chat=chat if origen == "Chat" else None
        )
        yield f"event: done\ndata: {id_registro}\n\n"  # Envía un evento personalizado llamado 'done'
    
    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    return response
    
def llamar_api(user, system, messages=None):
    url = "http://172.26.215.178:1234/v1/chat/completions"
    headers = {'Content-Type': 'application/json'}
    if messages is None:
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    data = {
        "model": "bartowski/c4ai-command-r-v01-GGUF",
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": -1,
        "stream": True  # Activar el streaming
    }
    response = requests.post(url, json=data, headers=headers, stream=True)  # Añadir 'stream=True' a la solicitud
    if response.status_code == 200:
        return response.iter_lines()
    else:
        return {'error': 'Request failed', 'status_code': response.status_code}
    
def registrarLog(user_prompt, response, origen, system_prompt=None, chat=None):
    nuevo_registro = Registro(
        pregunta=user_prompt,
        respuesta=response,
        origen=origen
    )
    if system_prompt is not None:
        nuevo_registro.prompt = Prompt.objects.get(texto=system_prompt)
    if chat is not None:
        nuevo_registro.chat = chat
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
        return JsonResponse({'message': 'Valoración registrada correctamente'})
    return JsonResponse({'error': 'Método no permitido'}, status=405)

def registrarNuevoChat(request):
    if request.method == 'POST':
        titulo = "Chat sin título"
        nuevo_chat = Chat(
            titulo=titulo
        )
        nuevo_chat.save()
        return JsonResponse({'message': 'Chat registrado correctamente', 'id': nuevo_chat.id})
    return JsonResponse({'error': 'Método no permitido'}, status=405)

def get_messages(system, chat: Chat, next_message):
    messages = [
        {"role": "system", "content": system}
    ]
    for registro in chat.registros_chat.all():
        messages.append({"role": "user", "content": registro.pregunta})
        messages.append({"role": "assistant", "content": registro.respuesta})
    messages.append({"role": "user", "content": next_message})
    return messages
