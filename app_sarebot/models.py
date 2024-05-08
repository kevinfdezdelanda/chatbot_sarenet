from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

# class Conversacion(models.Model):
#     id = models.BigAutoField(primary_key=True)

class Prompt(models.Model):
    id = models.BigAutoField(primary_key=True, serialize=False)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField()
    texto = models.TextField()
    
    def __str__(self) -> str:
        return f"{self.nombre}"
    
class Chat(models.Model):
    id = models.BigAutoField(primary_key=True)
    titulo = models.CharField(max_length=40)
    
    def __str__(self) -> str:
        return f"{self.id} - {self.titulo}"

class Registro(models.Model):
    id = models.BigAutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    pregunta = models.TextField()
    prompt = models.ForeignKey(Prompt, on_delete=models.PROTECT)  
    respuesta = models.TextField()
    valoracion = models.BooleanField(blank=True, null=True, choices=[(True, 'Buena'), (False, 'Mala')])
    comentario_val = models.CharField(blank=True, max_length=250, null=True)
    origen = models.CharField(max_length=20)
    chat = models.ForeignKey(Chat, on_delete=models.SET_NULL, null=True, blank=True, related_name='registros_chat')
    
    def __str__(self) -> str:
        return f"{self.pregunta}"
