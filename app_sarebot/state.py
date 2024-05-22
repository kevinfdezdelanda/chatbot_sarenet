import logging
from llama_index.core import SummaryIndex, VectorStoreIndex, Settings, SimpleDirectoryReader
from llama_index.core.tools import QueryEngineTool
from llama_index.core.selectors import LLMSingleSelector
from llama_index.core.query_engine.router_query_engine import RouterQueryEngine
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core.node_parser import SentenceSplitter
from .llm_model import llm

NODES = []
_query_engine = None

def load_and_index_documents():
    global NODES
    documents = SimpleDirectoryReader(input_dir="data").load_data()
    splitter = SentenceSplitter(chunk_size=1024)
    NODES.clear()
    NODES.extend(splitter.get_nodes_from_documents(documents))

def update_query_engine():
    global _query_engine, NODES

    # if not NODES:
    #     logging.warning("NODES is empty. Query engine will not be initialized.")
    #     return

    Settings.llm = llm
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5"
    )

    try:
        # Configurar índices y motores de consulta
        summary_index = SummaryIndex(NODES)
        vector_index = VectorStoreIndex(NODES)

        summary_query_engine = summary_index.as_query_engine(
            response_mode="tree_summarize",
            use_async=True,
            streaming=True
        )
        vector_query_engine = vector_index.as_query_engine(streaming=True)

        summary_tool = QueryEngineTool.from_defaults(
            query_engine=summary_query_engine,
            description="Useful for summarization questions."
        )
        vector_tool = QueryEngineTool.from_defaults(
            query_engine=vector_query_engine,
            description="Useful for retrieving specific context."
        )

        _query_engine = RouterQueryEngine(
            selector=LLMSingleSelector.from_defaults(),
            query_engine_tools=[summary_tool, vector_tool],
            verbose=False
        )
        logging.info("Query engine updated successfully.")
    except Exception as e:
        logging.error(f"Error updating query engine: {e}")

def get_query_engine():
    return _query_engine
