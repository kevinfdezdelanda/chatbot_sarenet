import requests
import json

# URL de la API con la IP y el endpoint correctos
api_url = 'http://172.26.215.178:1234/v1/chat/completions'

# Datos a enviar
data = {
    "model": "llama3:70b-instruct",
    "messages": [
        {"role": "user", "content": "Why is the sky blue?"}  # Ejemplo de pregunta para la IA
    ],
    "stream": False
}

# Enviar la solicitud POST
response = requests.post(
    api_url,
    json=data,  # Enviar los datos como JSON
    headers={'Content-Type': 'application/json'}
)

# Verificar el estado de la respuesta
if response.status_code == 200:
    response_data = response.json()  # Obtener el resultado como JSON
    print("Respuesta de la API:", response_data)
else:
    print("Error:", response.status_code, response.text)  # Mensaje de error
