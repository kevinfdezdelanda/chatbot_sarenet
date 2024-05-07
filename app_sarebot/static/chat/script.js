window.onload = function () {

    input = document.getElementById('texto_prompt');
    if(input){
        // aumenta el tamaño del textarea segun el contenido
        input.addEventListener('input', function () {
            input.style.height = input.scrollHeight + 'px';
        });
    }
  };