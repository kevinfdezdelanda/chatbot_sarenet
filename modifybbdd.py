from app_sarebot.models import Chat, Registro, Prompt
from django.contrib.contenttypes.models import ContentType

def crearRegistroChat():
    chat = Chat.objects.get(id=1)
    registro_chat = Registro.objects.create(
        pregunta="¿Cómo puedo hacer Y en el chat?",
        respuesta="Puedes hacer X de la siguiente manera...",
        valoracion=True,
        comentario_val="Buena explicación",
        origen="Chat",
        prompt=Prompt.objects.get(id=1),
        chat = chat
    )
    
crearRegistroChat()

# registro_a_editar = Registro.objects.get(id=3)
# registro_a_editar.chat = Chat.objects.get(id=1)
# registro_a_editar.save()