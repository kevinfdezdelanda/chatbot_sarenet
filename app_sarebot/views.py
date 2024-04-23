from django.shortcuts import render
import openai

# Configura el cliente de OpenAI
client = openai.OpenAI(
    base_url="http://ip_que_ya_os_diré:1234/v1",
    api_key="lm-studio"
)

def chat_view(request):
    if request.method == 'POST':
        user_message = request.POST.get('message')
        if user_message:
            # Obtiene la respuesta de GPT
            completion = client.chat.completions.create(
                model="bartowski/c4ai-command-r-v01-GGUF/c4ai-command-r-v01-Q6_K.gguf",
                messages=[
                    {"role": "system", "content": "Always answer in rhymes."},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7
            )
            bot_response = completion.choices[0].message['content']
            return render(request, 'chat/chat.html', {'user_message': user_message, 'bot_response': bot_response})
    return render(request, 'chat/chat.html')

# Asegúrate de actualizar chat/urls.py para usar chat_view
