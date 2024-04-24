window.onload = function () {
  //   const apiUrl = 'http://172.26.215.178:1234/v1/chat/completions';

  //   const data = {
  //     model: 'bartowski/c4ai-command-r-v01-GGUF',
  //     messages: [
  //       { role: 'system', content: 'Always answer in rhymes.' },
  //       { role: 'user', content: 'Introduce yourself.' },
  //     ],
  //     temperature: 0.7,
  //     max_tokens: -1,
  //     stream: true,
  //   };

  //   fetch(apiUrl, {
  //     method: 'POST', // Método HTTP
  //     headers: {
  //       'Content-Type': 'application/json', // Indica que el cuerpo de la solicitud es JSON
  //     },
  //     body: JSON.stringify(data), // Convierte el objeto JavaScript en una cadena JSON
  //   })
  //     .then((response) => {
  //       if (!response.ok) {
  //         throw new Error('Network response was not ok ' + response.statusText);
  //       }
  //       alert(response.json()); // Procesa la respuesta para convertirla en JSON
  //     })
  //     .then((data) => {
  //       console.log('Success:', data); // Maneja la data de respuesta
  //     })
  //     .catch((error) => {
  //       console.error('Error:', error); // Maneja errores que ocurran durante la solicitud
  //     });

  document.getElementById('promptSelector').addEventListener('change', function () {
    var promptId = this.value;
    if (promptId) {
      fetch(`/api/get-prompt-description/?prompt_id=${promptId}`)
        .then((response) => response.json())
        .then((data) => (document.getElementById('description').innerText = data.description))
        .catch((error) => console.error('Error:', error));
    } else {
      document.getElementById('description').innerText = 'Description will appear here...';
    }
  });
  // document.getElementById('apiCallButton').addEventListener('click', function () {
  //   alert(1);
  //   fetch('call-api/')
  //     .then((response) => response.text())
  //     .then((text) => {
  //       document.getElementById('apiResponse').innerHTML = text;
  //     })
  //     .catch((error) => console.error('Error:', error));
  // });
  document.getElementById('formulario-busqueda').onsubmit = function(event) {
    event.preventDefault();
    var formData = new FormData(this);
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': formData.get('csrfmiddlewaretoken'),
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            document.getElementById('apiResponse').innerText = data.error;
        } else {
            document.getElementById('apiResponse').innerText = data.respuesta;
        }
    })
    .catch(error => console.error('Error:', error));
};
};
