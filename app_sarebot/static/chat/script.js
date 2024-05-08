function generarID() {
    // Inicializamos un contador que almacenará el último ID generado
    let contador = 0;
  
    // Esta función interna generará el próximo ID y lo devolverá
    function proximoID() {
      // Incrementamos el contador para obtener el siguiente ID
      contador++;
      return contador;
    }
  
    // Devolvemos la función interna que genera el próximo ID
    return proximoID;
  }
window.onload = function () {
    // Obtener elementos del DOM
    const sendButton = document.getElementById("send-button");
    const textArea = document.getElementById("prompt-textarea");
    const chatbox = document.getElementById("chatbox");
    const idchat = generarID();
    // Funcion para que cuando pulse la tecla "ENTER" envie el mensaje
    textArea.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          // Si se presiona 'Enter', simula un clic en el botón de envío
          event.preventDefault(); // Para evitar que se agregue una nueva línea en el textarea
          sendButton.click();
        }
      });


    // Función para agregar mensaje al chatbox
    function addMessageToChatbox(message, author) {
        // Crear un nuevo div para el mensaje
        const messageDiv = document.createElement("div");
        messageDiv.className = "flex w-full text-token-text-primary px-4 py-2 justify-center text-base";

        // Estructura del mensaje
        messageDiv.innerHTML = `
        <div class="flex flex-1 text-base mx-auto gap-3 md:px-5 lg:px-1 xl:px-5 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem]">
            <div class="flex-shrink-0 flex flex-col relative items-end">
            <div class="pt-0.5">
                <div class="gizmo-shadow-stroke flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white p-1">
                <img
                    alt="${author}"
                    referrerpolicy="no-referrer"
                    loading="lazy"
                    width="24"
                    height="24"
                    decoding="async"
                    data-nimg="1"
                    class="rounded-sm"
                    src="/static/chat/images/user-avatar.png"
                    style="color: transparent"
                />
                </div>
            </div>
            </div>
            <div class="relative flex w-full flex-col">
                <div class="font-semibold select-none">${author}</div>
                <div class="flex flex-grow flex-col max-w-full">
                    <div class="min-h-[20px] text-message flex flex-col items-start gap-3 whitespace-pre-wrap break-words">
                        <div>${message}</div>
                    </div>
                </div>
            </div>
        </div>      
        `;

        // Agregar el mensaje al principio del chatbox
        chatbox.append(messageDiv);
    }
    function addMessageToChatboxIA(idBot) {
        // Crear un nuevo div para el mensaje
        const messageDiv = document.createElement("div");
        messageDiv.className = "flex w-full text-token-text-primary px-4 py-2 justify-center text-base";

        // Estructura del mensaje
        messageDiv.innerHTML = `
        <div class="flex flex-1 text-base mx-auto gap-3 md:px-5 lg:px-1 xl:px-5 md:max-w-3xl lg:max-w-[40rem] xl:max-w-[48rem]">
            <div class="flex-shrink-0 flex flex-col relative items-end">
            <div class="pt-0.5">
                <div class="gizmo-shadow-stroke flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-white p-1">
                <img
                    alt="SareBot"
                    referrerpolicy="no-referrer"
                    loading="lazy"
                    width="24"
                    height="24"
                    decoding="async"
                    data-nimg="1"
                    class="rounded-sm"
                    src="/static/chat/images/sarebot.png"
                    style="color: transparent"
                />
                </div>
            </div>
            </div>
            <div class="relative flex w-full flex-col">
                <div class="font-semibold select-none">SareBot</div>
                <div class="flex flex-grow flex-col max-w-full">
                    <div class="min-h-[20px] text-message flex flex-col items-start gap-3 whitespace-pre-wrap break-words">
                        <div id="bot${idBot}"></div>
                    </div>
                </div>
            </div>
        </div> 
        `;

        // Agregar el mensaje al principio del chatbox
        chatbox.append(messageDiv);
    }

    // Agregar evento al botón de enviar
    sendButton.addEventListener("click", function () {
        // Obtener el contenido del área de texto
        const userMessage = textArea.value;
        // Si el mensaje no está vacío
        if (userMessage.trim()) {
            // Agregar el mensaje al chatbox como "You"
            const idBot = idchat();
            addMessageToChatbox(userMessage, "You");
            addMessageToChatboxIA(idBot);

            // Borrar el contenido del área de texto
            try {
                const url = `chat-call/?userMessage=${encodeURIComponent(userMessage)}`;
                const eventSource = new EventSource(url);
                textArea.value = "";
                eventSource.onmessage = function (event) {
                    try {
                        // Parse the JSON to extract the content
                        const data = event.data;
                        console.log("base",data)
                        console.log("pulido",data.content)
                        // Check if the JSON contains the expected content
                        if (data) {
                            // Add the content to the appropriate div
                            document.getElementById("bot" + idBot).innerHTML += data;
                        }
                    } catch (error) {
                        console.error('Error parsing JSON:', error, "Raw Data:", event.data);
                    }
                };

                eventSource.addEventListener('done', function (event) {
                    console.log('Stream done, closing connection');
                    eventSource.close(); // Cierra la conexión del lado del cliente
                });

                eventSource.onerror = function (error) {
                    console.error('Error:', error);
                    eventSource.close();
                };

            } catch (error) {
                console.error('Error establishing EventSource connection:', error);
            }
        }
    });
};
