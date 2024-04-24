window.onload = function () {
  select = document.getElementById('promptSelector')
  document.getElementById('promptSelector').addEventListener('change', function(){ 
    obtener_desc(select); 
  });
  input = document.getElementById('texto_prompt')

  document.getElementById('apiCallButton').addEventListener('click', function(){ 
    llamar_api(input, select); 
  });
};

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

async function obtener_prompt(select) {
  var promptId = select.value;
  var prompt = ""; 

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

async function llamar_api(input, select) {
  texto = input.value
  prompt1 = await obtener_prompt(select)
  if(texto != "" && prompt1!=""){
    disable_enable_elements(false);
    document.getElementById('apiResponse').innerHTML = ''; // Limpia contenido anterior
    msg = document.getElementById("msg-generando").style.display = "flex"
    document.getElementById('result').style.display = "block"
    var url = `call-api/?system=${encodeURIComponent(prompt1)}&user=${encodeURIComponent(texto)}`;
    var eventSource = new EventSource(url);
    eventSource.onmessage = function (event) {
      document.getElementById("msg-generando").style.display = "none"
      document.getElementById('apiResponse').innerHTML += event.data;
    };
    eventSource.addEventListener('done', function (event) {
      console.log('Stream done, closing connection');
      eventSource.close(); // Cierra la conexión del lado del cliente
      disable_enable_elements(true);
    });
    eventSource.onerror = function (error) {
      console.error('Error:', error);
      eventSource.close();
      disable_enable_elements(true);
    };
  }
}

function disable_enable_elements(enable){
  boton = document.getElementById('apiCallButton');
  input = document.getElementById('texto_prompt');
  if(enable) {
    boton.disabled = false;
    input.disabled = false;
  }else{
    boton.disabled = true;
    input.value = '';
    input.disabled = true;
  }
}
