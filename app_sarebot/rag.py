import json
import requests
from django.http import StreamingHttpResponse
from typing import Optional, List, Mapping, Any
from llama_index.core import Settings, SimpleDirectoryReader, SummaryIndex, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.tools import QueryEngineTool
from llama_index.core.query_engine.router_query_engine import RouterQueryEngine
from llama_index.core.selectors import LLMSingleSelector
from llama_index.core.llms import CustomLLM, CompletionResponse, CompletionResponseGen, LLMMetadata
from llama_index.core.llms.callbacks import llm_completion_callback
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

    def call_api(self, user, system="Follow instructions.", messages=None, stream=False):
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
                for chunk in response.iter_lines():
                    if chunk:  # Ensure the chunk is not empty
                        data_str = chunk.decode('utf-8').replace('data: ', '')
                        if data_str.strip() != '[DONE]':  # Check if it's the end message
                            data = json.loads(data_str)
                            if 'choices' in data:
                                for choice in data['choices']:
                                    partial_response = choice['delta']
                                    if 'delta' in choice and 'content' in partial_response:
                                        yield partial_response['content']
        else:
            raise Exception(f"Request failed with status code {response.status_code}")
        
    @llm_completion_callback()
    def complete(self, prompt: str, **kwargs: Any) -> CompletionResponse:
        response_text = self.call_api(prompt)
        return CompletionResponse(text=response_text)
    
    @llm_completion_callback()
    def stream_complete(self, prompt: str, **kwargs: Any) -> CompletionResponseGen:
        response_text = self.call_api(prompt, stream=True)
        response = ""
        for token in response_text:
            response += token
            yield CompletionResponse(text=response, delta=token)


def search_rag(request):
    # Carga de documentos.
    documents = SimpleDirectoryReader(input_dir="data").load_data()
    
    # Definición del splitter. Se define el tamaño de los chunks de los documentos.
    splitter = SentenceSplitter(chunk_size=1024)
    
    # Coge los documentos y los divide según el splitter. Se obtienen nodos.
    nodes = splitter.get_nodes_from_documents(documents)
    
    # LLM
    Settings.llm = CustomModel()
    
    # Modelo de embeddings
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5"
    )
    
    # Índices
    summary_index = SummaryIndex(nodes)
    vector_index = VectorStoreIndex(nodes)
    
    # Motores de consulta
    summary_query_engine = summary_index.as_query_engine(
        # response_mode="tree_summarize",
        # use_async=True,
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
    
    # Query
    response = vector_query_engine.query(
        request.GET.get('user', '')
    )

    user_query = request.GET.get('user', '')

    def stream_response():
        response = vector_query_engine.query(user_query)
        for chunk in response.response_gen:
            yield f'data: {json.dumps({"content": chunk})}\n\n'
        yield f'data: {json.dumps({"event": "done"})}\n\n'
    
    return StreamingHttpResponse(stream_response(), content_type='text/event-stream')

if __name__ == "__main__":
    search_rag()