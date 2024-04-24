window.onload = function () {
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
  document.getElementById('apiCallButton').addEventListener('click', function () {
    document.getElementById('apiResponse').innerHTML = '';  // Limpia contenido anterior

    var eventSource = new EventSource('call-api/');
    eventSource.onmessage = function(event) {
        document.getElementById('apiResponse').innerHTML += event.data;
    };
    eventSource.addEventListener('done', function(event) {
        console.log('Stream done, closing connection');
        eventSource.close();  // Cierra la conexión del lado del cliente
    });
    eventSource.onerror = function(error) {
        console.error('Error:', error);
        eventSource.close();
    };
});
};
