import json
from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from .models import Prompt, Registro, Chat
from .state import get_query_engine
import logging
from .llm_model import llm

            
def chat(request):
    return render(request, 'app_sarebot/chat.html')

def consultas(request):
    prompts = Prompt.objects.all()
    return render(request, 'app_sarebot/index.html', {'prompts': prompts})

def busquedas(request):
    return render(request, 'app_sarebot/busquedas.html')

#Funcion para listar los chats
def listar_chats(request):
    chats = Chat.objects.filter(visible=True).order_by('-id').values('id', 'titulo')
    return JsonResponse(list(chats), safe=False)

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
    system = request.GET.get('system', '') if origen == "Consulta" else "Eres un chatbot que responde con respeto y atiende a las necesidades del usuario"
    chat_id = request.GET.get('chat', '')
    messages = None
    more_messages = False
    chat = None
    
    if origen == "Chat":
        chat = Chat.objects.get(id=chat_id)
        more_messages = chat.registros_chat.exists()
        if more_messages:
            messages = get_messages(system=system, chat=chat, next_message=user)

    def event_stream():
        complete_response = []
        stream = llm.call_api(user=user, system=system, messages=messages if more_messages else None)
        try:
            for chunk in stream:
                if chunk:
                    data_str = chunk.decode('utf-8').replace('data: ', '')
                    if data_str.strip() != '[DONE]':
                        try:
                            data = json.loads(data_str)
                            if 'choices' in data:
                                for choice in data['choices']:
                                    partial_response = choice.get('delta', {}).get('content', '')
                                    if partial_response:
                                        complete_response.append(partial_response)
                                        yield f"data: {json.dumps({'content': partial_response})}\n\n"
                        except json.JSONDecodeError as e:
                            yield f"data: {{'error': 'Error parsing JSON', 'details': '{str(e)}'}}\n\n"
                    else:
                        break
        except Exception as e:
            yield f"data: {{'error': 'Stream error', 'details': '{str(e)}'}}\n\n"

        final_response = "".join(complete_response)
        id_registro = registrarLog(user_prompt=user, system_prompt=system if origen == "Consulta" else None, response=final_response, origen=origen, chat=chat)
        
        if origen == "Chat" and chat.titulo == "Chat sin título":
            nuevo_titulo = obtenerTituloChat(user, final_response)
            chat.titulo = nuevo_titulo
            chat.save()
            yield f"event: title\ndata: {json.dumps({'chat_id': chat.id, 'titulo': nuevo_titulo})}\n\n"
        
        yield f"event: done\ndata: {id_registro}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    return response

    
# def llamar_api(user, system, messages=None, stream=True):
#     url = "http://172.26.215.178:1234/v1/chat/completions"
#     headers = {'Content-Type': 'application/json'}
#     if messages is None:
#         messages = [
#             {"role": "system", "content": system},
#             {"role": "user", "content": user}
#         ]
#     data = {
#         "model": "bartowski/c4ai-command-r-v01-GGUF",
#         "messages": messages,
#         "temperature": 0.4,
#         "max_tokens": -1,
#         "stream": stream  # Activar el streaming
#     }
#     response = requests.post(url, json=data, headers=headers, stream=stream)  # Añadir 'stream=True' a la solicitud
#     if response.status_code == 200:
#         if stream:
#             return response.iter_lines()
#         else:
#             return response.json()
#     else:
#         return {'error': 'Request failed', 'status_code': response.status_code}
    
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
        return JsonResponse({'message': 'Chat registrado correctamente', 'id': nuevo_chat.id, 'titulo': nuevo_chat.titulo})
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

def cargar_chats(request):
    chat_id = request.GET.get('chat_id')
    if chat_id:
        registros = Registro.objects.filter(chat_id=chat_id).values('id', 'pregunta', 'respuesta', 'valoracion')
        return JsonResponse(list(registros), safe=False)
    return JsonResponse({'error': 'No chat ID provided'}, status=400)

def obtenerTituloChat(pregunta, respuesta):
    system = "En base a la pregunta y respuesta que se te da, genera un título que resuma en muy pocas palabras la interacción. Responde directamente con el título, sin introducciones"
    user = (
        f"Pregunta: {pregunta}\n\n"
        f"Respuesta: {respuesta}"
    )
    # Llamamos a la API sin usar stream
    response = llm.call_api(user, system, stream=False)
    titulo = response.get('choices', [{}])[0].get('message', {}).get('content', 'Chat sin título')
    return titulo

def ocultarChat(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            chat_id = data.get('chat_id')
            chat = Chat.objects.get(id=chat_id)
            chat.visible = False
            chat.save()
            return JsonResponse({'success': True})
        except Chat.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Chat not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=400)

def search_rag(request):
    query = request.GET.get('user', '')
    origen = request.GET.get('origen', 'Búsqueda')
    query_engine = get_query_engine()
    
    if not query_engine:
        logging.error("Query engine is not initialized. Ensure documents are indexed.")
        return StreamingHttpResponse("Error: Query engine is not initialized. Ensure documents are indexed.", content_type='text/event-stream')
    
    def event_stream():
        complete_response = []
        response_generator = query_engine.query(query)
        documents_used = []
        
        # Obtengo los archivos usados por el rag y los envio
        for node_with_score in response_generator.source_nodes:
            doc_info = {
                'file_name': node_with_score.node.metadata.get('file_name'),
                'file_path': node_with_score.node.metadata.get('file_path'),
                'score': node_with_score.score
            }
            documents_used.append(doc_info)
        yield f"event: documents_used\ndata: {json.dumps({'documents_used': documents_used})}\n\n"
        
        for response in response_generator.response_gen:
            complete_response.append(response)
            yield f"data: {json.dumps({'content': response})}\n\n"
        final_response = "".join(complete_response)
        id_registro = registrarLog(
            user_prompt=query,
            response=final_response,
            origen=origen
        )
        
        yield f"event: done\ndata: {id_registro}\n\n"

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    return response
