import json
import requests
from sentence_transformers import SentenceTransformer
from llama_index.core import Settings, SimpleDirectoryReader, SummaryIndex, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.tools import QueryEngineTool
from llama_index.core.query_engine.router_query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector

class LocalEmbedding:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)

    def get_embeddings(self, text_list):
        return self.model.encode(text_list)

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
def mostrar_respuesta(respuesta):
    for chunk in respuesta:
        if chunk:
            data_str = chunk.decode('utf-8').strip()
            if data_str.startswith('data: '):
                data_str = data_str[len('data: '):]  # Eliminar 'data: ' del comienzo
            if data_str and data_str != '[DONE]':  # Chequea si es el mensaje de finalización
                try:
                    data = json.loads(data_str)
                    for choice in data.get('choices', []):
                        delta = choice.get('delta', {})
                        if 'content' in delta:
                            print(delta['content'], end='')  # Usar end='' para imprimir en la misma línea
                except json.JSONDecodeError:
                    continue

def main():
    # Carga de documentos.
    documents = SimpleDirectoryReader(input_dir="data").load_data()
    
    # Definición del splitter. Se define el tamaño de los chunks de los documentos.
    splitter = SentenceSplitter(chunk_size=1024)
    
    # Coge los documentos y los divide según el splitter. Se obtienen nodos.
    nodes = splitter.get_nodes_from_documents(documents)
    
    # Modelo de embeddings
    Settings.embed_model = LocalEmbedding()
    
    # Índices
    summary_index = SummaryIndex(nodes)
    vector_index = VectorStoreIndex(nodes)
    
    # Motores de consulta
    summary_query_engine = summary_index.as_query_engine(
        response_mode="tree_summarize",
        use_async=True,
    )
    vector_query_engine = vector_index.as_query_engine()
    
    # Herramientas de consulta
    summary_tool = QueryEngineTool.from_defaults(
        query_engine=summary_query_engine,
        description=(
            "Useful for summarization questions related to MetaGPT"
        ),
    )

    vector_tool = QueryEngineTool.from_defaults(
        query_engine=vector_query_engine,
        description=(
            "Useful for retrieving specific context from the MetaGPT paper."
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
    
    response = query_engine.query(
        "¿Quien es el responsable del departamento de IA de SareNet?"
    )
    print(str(response))
        
    # Query
    # respuesta = llamar_api("¿Quien es el responsable del departamento de IA de SareNet?", "Answer the questions from user concisely. If you don't know a specific answer, just say it.")
    # print(mostrar_respuesta(respuesta))

if __name__ == "__main__":
    main()