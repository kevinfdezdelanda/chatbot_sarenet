from django.db import models

class Conversacion(models.Model):
    id = models.BigAutoField(primary_key=True)

class Chats(models.Model):
    id = models.BigAutoField(primary_key=True)
    pregunta = models.TextField()
    respuesta = models.TextField()
    valoracion = models.BooleanField(blank=True)
    comentario_val = models.CharField(blank=True, max_length=250)
    timestamp = models.DateTimeField(auto_now_add=True)
    id_conversacion = models.ForeignKey(Conversacion, on_delete=models.CASCADE) 