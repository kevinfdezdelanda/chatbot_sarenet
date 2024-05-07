const csrftoken = "{{ csrf_token }}";
window.onload = function () {
  // Recarga la descripcion del prompt
  select = document.getElementById('promptSelector');
  select.addEventListener('change', function () {
    obtener_desc(select);
  });
  input = document.getElementById('texto_prompt');

  // Al pulsar el boton llama a la api
  document.getElementById('apiCallButton').addEventListener('click', function () {
    llamar_api(input, select);
  });

  // aumenta el tamaño del textarea segun el contenido
  input.addEventListener('input', function () {
    input.style.height = input.scrollHeight + 'px';
  });

  // Al pulsar enter llama a la api
  input.addEventListener('keypress', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      llamar_api(input, select);
    }
  });
};

// obtiene la descripcion del prompt 
function obtener_desc(select) {
  var promptId = select.value;
  if (promptId) {
    fetch(`/api/get-prompt-description/?prompt_id=${promptId}`)
      .then((response) => response.json())
      .then((data) => (document.getElementById('description').innerText = data.description))
      .catch((error) => console.error('Error:', error));
  } else {
    document.getElementById('description').innerText = 'Description will appear here...';
  }
}

// obtiene el prompt seleccionado
async function obtener_prompt(select) {
  var promptId = select.value;
  var prompt = '';

  if (promptId) {
    try {
      const response = await fetch(`/api/get-prompt/?prompt_id=${promptId}`);
      const data = await response.json();
      prompt = data.prompt;
    } catch (error) {
      console.error('Error:', error);
    }
  }
  return prompt;
}

// llama a la api en stream para obtener la respuesta del prompt
async function llamar_api(input, select) {
  //obtengo el texto y el prompt
  texto = input.value;
  prompt1 = await obtener_prompt(select);
  if (texto != '' && prompt1 != '') { // Si estan vacios no hago nada
    disable_enable_elements(false);

    document.getElementById('apiResponse').innerHTML = ''; // Limpia contenido anterior
    msgIa = document.getElementById('msg-generando').style.display = 'flex';
    document.getElementById('result').style.display = 'block';
    document.getElementById('msg-inicial').style.display = 'none';

    // cargo el conversor de markdown
    const md = markdownit({
      html: true,
      linkify: true,
      typographer: true,
      templateTag: 'a11y-dark',
      //aplica estilos a los bloques de codigo de markdown
      highlight: function (str, lang) { 
        let result;
        if (lang && hljs.getLanguage(lang)) {
          try {
            result = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
          } catch (__) {
            result = md.utils.escapeHtml(str);
          }
        } else {
          result = md.utils.escapeHtml(str);
          lang = lang || 'plaintext';
        }
        // devuelve el bloque de codigo y la barra para poder copiarlo
        return `<div class="code-block"><pre class="theme-a11y-dark"><div class="flex bg-black text-neutral-400 justify-between py-2 px-5 rounded-t-md text-xs"><p>${lang}</p><a onclick="copyToClipboard(this)" class="flex gap-2 group"><svg class="fill-neutral-400 w-3 group-hover:fill-neutral-300 transition" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.--><path d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z"/></svg><button class="group-hover:text-neutral-300 transition">Copy code</button></a></div><code class="hljs theme-a11y-dark">${result}</code></pre></div>`;
      },
    });

    // Crea un EventSource que apunta a la api en stream
    var url = `call-api/?system=${encodeURIComponent(prompt1)}&user=${encodeURIComponent(texto)}&origen=${encodeURIComponent("Consulta")}`;
    var eventSource = new EventSource(url);

    // Cuando recibe un msg del stream
    contenidoGenerado = '';
    eventSource.onmessage = function (event) {
      // oculto el msg de generando
      msg = document.getElementById('msg-generando').style.display = 'none';
      try {
        // obtengo el contenido del mensaje y lo transformo de markdown a html
        var data = JSON.parse(event.data);
        if(data.content) {
          contenidoGenerado += data.content;
          var htmlContent = md.render(contenidoGenerado);
          document.getElementById('apiResponse').innerHTML = htmlContent;
        }
      } catch (e) {
        console.error('Error parsing JSON:', e);
      }
    };

    // Cuando finaliza el stream
    eventSource.addEventListener('done', function (event) {
      console.log('Stream done, closing connection');
      console.log('generated data:\n', contenidoGenerado);
      document.getElementById('id-registro').value = event.data;
      eventSource.close(); // Cierra la conexión del lado del cliente
      disable_enable_elements(true);
      var hiddenDiv = document.getElementById('ratingThumbs');
      hiddenDiv.classList.toggle('hidden');
    });

    // Cuando da error el stream
    eventSource.onerror = function (error) {
      console.error('Error:', error);
      eventSource.close();
      disable_enable_elements(true);
    };
  }
}

// habilita y deshabilita los campos para no poder hacer otra consulta mientas hay una en marcha
function disable_enable_elements(enable) {
  boton = document.getElementById('apiCallButton');
  input = document.getElementById('texto_prompt');
  if (enable) {
    boton.disabled = false;
    input.disabled = false;
  } else {
    boton.disabled = true;
    input.disabled = true;
  }
}

// copia el contenido al portapapeles
function copyToClipboard(e) {
  const codeBlock = e.parentElement.nextElementSibling;
  navigator.clipboard.writeText(codeBlock.textContent).then(() => {
    e.lastElementChild.textContent = 'Copiado!';
    setTimeout(() => e.lastElementChild.textContent = 'Copy code', 2000);  // Restablece el texto del botón después de 2 segundos
  }).catch(err => {
    console.error('Error al copiar texto: ', err);
  });
}

// Función para valorar la respuesta
function rateResponse(valoracion) {
  document.getElementById('rating').value = valoracion;
  // Mostrar el área de comentario y el botón de enviar
  document.getElementById('ratingComment').classList.toggle('hidden');
  document.getElementById('ratingButton').classList.toggle('hidden');
}

// Función para enviar la valoración y comentario al servidor
function submitRating() {
  var id_registro = document.getElementById('id-registro').value;
  var valoracion = document.getElementById('rating').value
  var comentario = document.getElementById('comment').value;
  var csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

  
  // Configurar los datos que se enviarán al servidor
  var data = {
    registro: id_registro,
    valoracion: valoracion,
    comentario: comentario
  };

  // Configurar la solicitud AJAX usando Fetch
  fetch('api/save-rating/', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrftoken
      },
      body: JSON.stringify(data)
  })
  .then(function(response) {
      if (!response.ok) {
          throw new Error('Error al enviar la solicitud al servidor');
      }
      return response.json();
  })
  .then(function(data) {
    // Manejar la respuesta del servidor si es necesario
    console.log(data);
  })
  .catch(function(error) {
      // Manejar errores si ocurren
      console.error('Error al enviar la valoración y el comentario:', error);
  });
  document.getElementById('ratingThumbs').classList.toggle('hidden');
  document.getElementById('ratingComment').classList.toggle('hidden');
  document.getElementById('comment').value = '';
  document.getElementById('ratingButton').classList.toggle('hidden');
}
