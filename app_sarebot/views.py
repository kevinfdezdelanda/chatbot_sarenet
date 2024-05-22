import json
import requests

from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse

from .models import Prompt, Registro, Chat

from typing import Any

from llama_index.core import Settings, SimpleDirectoryReader, SummaryIndex, VectorStoreIndex
from llama_index.core.llms import CustomLLM, CompletionResponse, CompletionResponseGen, LLMMetadata
from llama_index.core.llms.callbacks import llm_completion_callback
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.tools import QueryEngineTool
from llama_index.core.query_engine.router_query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector
from llama_index.embeddings.huggingface import HuggingFaceEmbedding


API_URL = "http://172.26.215.178:1234/v1/chat/completions"
MODEL = "bartowski/c4ai-command-r-v01-GGUF"
TEMPERATURE = 0.4
MAX_TOKENS = -1


class CustomModel(CustomLLM):
    context_window: int = 3900
    num_output: int = 256
    model_name: str = "custom"
    api_url: str = API_URL
    model: str = MODEL
    temperature: float = TEMPERATURE
    max_tokens: int = MAX_TOKENS
    
    @property
    def metadata(self) -> LLMMetadata:
        return LLMMetadata(
            context_window=self.context_window,
            num_output=self.num_output,
            model_name=self.model_name,
        )

    def call_api(self, user, system="Follow instructions.", messages=None, stream=True):
        headers = {'Content-Type': 'application/json'}
        if messages is None:
            messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user}
            ]
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": stream
        }
        response = requests.post(self.api_url, json=data, headers=headers, stream=stream)
        if response.status_code == 200:
            if stream:
                return response.iter_lines()
            else:
                return response.json()
        else:
            raise Exception(f"Request failed with status code {response.status_code}")
        
    @llm_completion_callback()
    def complete(self, prompt: str, **kwargs: Any) -> CompletionResponse:
        response = self.call_api(prompt, stream=False)
        response_text = response['choices'][0]['message']['content']
        return CompletionResponse(text=response_text)
    
    @llm_completion_callback()
    def stream_complete(self, prompt: str, **kwargs: Any) -> CompletionResponseGen:
        response_gen = self.call_api(prompt, stream=True)
        complete_response = ""
        for chunk in response_gen:
            if chunk:
                data_str = chunk.decode('utf-8').replace('data: ', '')
                if data_str.strip() != '[DONE]':  # Check for completion message
                    try:
                        data = json.loads(data_str)
                        if 'choices' in data:
                            for choice in data['choices']:
                                partial_response = choice['delta']
                                if 'delta' in choice and 'content' in partial_response:
                                    complete_response += partial_response['content']
                                    yield CompletionResponse(text=complete_response, delta=partial_response['content'])
                    except json.JSONDecodeError as e:
                        yield CompletionResponse(text=complete_response, delta=f"Error parsing JSON: {str(e)}")
                else:
                    break  # Break the loop to end the stream
            

llm = CustomModel()

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
        stream = llm.call_api(
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
        
        if origen == "Chat" and chat.titulo == "Chat sin título":
            nuevo_titulo = obtenerTituloChat(user, final_response)
            chat.titulo = nuevo_titulo
            chat.save()
            yield f"event: title\ndata: {json.dumps({'chat_id': chat.id, 'titulo': nuevo_titulo})}\n\n"
        
        yield f"event: done\ndata: {id_registro}\n\n"  # Envía un evento personalizado llamado 'done'
    
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
        registros = Registro.objects.filter(chat_id=chat_id).values('id', 'pregunta', 'respuesta')
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
    print(titulo)
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
    # Carga de documentos.
    documents = SimpleDirectoryReader(input_dir="data").load_data()
    
    # Definición del splitter. Se define el tamaño de los chunks de los documentos.
    splitter = SentenceSplitter(chunk_size=1024)
    
    # Coge los documentos y los divide según el splitter. Se obtienen nodos.
    nodes = splitter.get_nodes_from_documents(documents)
    
    # LLM
    Settings.llm = llm
    
    # Modelo de embeddings
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5"
    )
    
    # Índices
    summary_index = SummaryIndex(nodes)
    vector_index = VectorStoreIndex(nodes)
    
    # Motores de consulta
    summary_query_engine = summary_index.as_query_engine(
        response_mode="tree_summarize",
        use_async=True,
        streaming=True
    )
    vector_query_engine = vector_index.as_query_engine(streaming=True)
    
    # Herramientas de consulta
    summary_tool = QueryEngineTool.from_defaults(
        query_engine=summary_query_engine,
        description=(
            "Useful for summarization questions related to the 'documento' file."
        ),
    )

    vector_tool = QueryEngineTool.from_defaults(
        query_engine=vector_query_engine,
        description=(
            "Useful for retrieving specific context from the 'documento' file."
        ),
    )
    
    # Router
    query_engine = RouterQueryEngine(
        selector=LLMSingleSelector.from_defaults(),
        query_engine_tools=[
            summary_tool,
            vector_tool,
        ],
        verbose=True
    )
    
    query = request.GET.get('user', '')
    origen = request.GET.get('origen', 'Búsqueda')
    
    def event_stream():
        complete_response = []
        response_generator = query_engine.query(query)
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
