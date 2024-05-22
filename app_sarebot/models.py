from django.db import models
from django.dispatch import receiver
from django.db.models.signals import post_save
from llama_index.core import SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter
from .state import NODES, update_query_engine


class Prompt(models.Model):
    id = models.BigAutoField(primary_key=True, serialize=False)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    texto = models.TextField()
    
    def __str__(self) -> str:
        return f"{self.nombre}"
    
class Chat(models.Model):
    id = models.BigAutoField(primary_key=True)
    titulo = models.CharField(max_length=100, blank=True, null=True)
    visible = models.BooleanField(default=True)
    
    def __str__(self) -> str:
        return f"{self.id} - {self.titulo}"

class Registro(models.Model):
    id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    origen = models.CharField(max_length=20)
    pregunta = models.TextField()
    prompt = models.ForeignKey(Prompt, on_delete=models.PROTECT, blank=True, null=True)  
    respuesta = models.TextField()
    valoracion = models.BooleanField(blank=True, null=True, choices=[(True, 'Buena'), (False, 'Mala')])
    comentario_val = models.CharField(blank=True, max_length=250, null=True)
    chat = models.ForeignKey(Chat, on_delete=models.SET_NULL, null=True, blank=True, related_name='registros_chat')
    
    def __str__(self) -> str:
        return f"{self.pregunta}"
    
class Documento(models.Model):
    id = models.BigAutoField(primary_key=True)
    fichero = models.FileField(upload_to="data/")
    
    def __str__(self) -> str:
        return f"{self.fichero.name.split('/')[-1]}"
    

@receiver(post_save, sender=Documento)
def index_document(sender, instance, **kwargs):
    documents = SimpleDirectoryReader(input_dir="data").load_data()
    splitter = SentenceSplitter(chunk_size=1024)
    global NODES
    NODES.clear()
    NODES.extend(splitter.get_nodes_from_documents(documents))
    print(f"NODES updated: {NODES}")  # Añadir para depuración
    update_query_engine()  # Actualizar el query engine