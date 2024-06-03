var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
var userScrolledUp = false;
var lastScrollTop = 0;
var dicValSelect = {};
var chatIdSelect = null;
var htmlMsgGenerando = `<div id="msg-generando" class="flex items-center gap-2"><p class="text-blue-500 text-sm">Generando</p><img class="w-4" src="../static/chat/images/loading.gif" alt="cargando" /></div>`;
var promptAnterior = {};
var chat_id = null;

window.onload = function () {
    // Obtener elementos del DOM
    const sendButton = document.getElementById('send-button');
    const textArea = document.getElementById('prompt-textarea');
    const chatbox = document.getElementById('chatbox');

    // Obtener el listado de chats
    cargarHistorialChats();

    //Botones popup
    document.getElementById('pop-up-cancelar').addEventListener('click', (event) => {
        event.preventDefault();
        cerrarBorrarChat();
    });

    document.getElementById('pop-up-fondo').addEventListener('click', (event) => {
        event.preventDefault();
        cerrarBorrarChat();
    });

    document.getElementById('pop-up-aceptar').addEventListener('click', (event) => {
        event.preventDefault();
        aceptarBorrarChat();
    });

    // Funcion para que cuando pulse la tecla "ENTER" envie el mensaje
    textArea.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            // Si se presiona 'Enter', simula un clic en el botón de envío
            event.preventDefault(); // Para evitar que se agregue una nueva línea en el textarea
            sendButton.click();
        }
    });

    // aumenta el tamaño del textarea segun el contenido
    textArea.addEventListener('input', function () {
        aumentar_textarea(textArea);
    });

    chatbox.addEventListener(
        'scroll',
        () => {
            let currentScrollTop = chatbox.scrollTop;
            let chatboxHeight = chatbox.clientHeight; // La altura del chatbox visible
            let totalHeight = chatbox.scrollHeight; // La altura total del contenido del chatbox

            if (currentScrollTop < lastScrollTop) {
                // El usuario está desplazándose hacia arriba
                userScrolledUp = true;
            } else if (currentScrollTop + chatboxHeight >= totalHeight) {
                userScrolledUp = false;
            }
            lastScrollTop = currentScrollTop; // Actualizar el último valor conocido del scroll
        },
        false
    );

    // Agregar evento al botón de enviar
    sendButton.addEventListener('click', async function () {
        // Obtener el contenido del área de texto
        const userMessage = textArea.value;
        // Si el mensaje no está vacío
        if (userMessage.trim()) {
            disable_enable_elements(false);
            document.getElementById('msg-inicial').style.display = 'none';

            // Agregar el mensaje al chatbox como "You"
            if (chat_id == null || chat_id === -1) {
                try {
                    chat_id = await registrarChat();
                    console.log('The chat ID is:', chat_id);
                } catch (error) {
                    console.error('Error with chat registration:', error);
                    return;
                }
            }

            addMessageToChatbox(userMessage, 'You');
            setTimeout(function () {
                addMessageToChatboxIA(chat_id);
                // cuando manda un msg scrolea abajo automaticamente
                chatbox.scrollTop = chatbox.scrollHeight;
            }, 300);

            try {
                const url = `chat-call/?user=${encodeURIComponent(userMessage)}&origen=${encodeURIComponent('Chat')}&chat=${encodeURIComponent(chat_id)}`;
                const eventSource = new EventSource(url);

                // Borrar el contenido del área de texto
                textArea.value = '';
                textArea.style.height = '44px';
                contenidoGenerado = '';

                primer_msg = true;
                eventSource.onmessage = function (event) {
                    // Desplazar hacia abajo solo si el usuario no ha scrolleado hacia arriba
                    if (primer_msg || !userScrolledUp) {
                        chatbox.scrollTop = chatbox.scrollHeight;
                    }
                    primer_msg = false;

                    msg = document.getElementById('msg-generando');
                    if (msg) {
                        msg.remove();
                    }
                    try {
                        // Parse the JSON to extract the content
                        var data = JSON.parse(event.data);
                        // Check if the JSON contains the expected content
                        if (data.content) {
                            contenidoGenerado += data.content;
                            var htmlContent = convertMarkdownToHTML(contenidoGenerado);
                            document.getElementById('bot' + chat_id).innerHTML = htmlContent;
                        }
                    } catch (error) {
                        console.error('Error parsing JSON:', error, 'Raw Data:', event.data);
                    }
                };

                eventSource.addEventListener('title', (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        cargarHistorialChats();
                    } catch (error) {
                        console.error('Error parsing title JSON:', error, 'Raw Data:', event.data);
                    }
                });

                eventSource.addEventListener('done', async function (event) {
					console.log('Stream done, closing connection');
					userScrolledUp = false;
					disable_enable_elements(true);
					const id_registro = event.data;
					transformIds(chat_id, id_registro);
					insertar_val(id_registro);
					document.getElementById('id-registro' + id_registro).value = id_registro;
					promptAnterior.idBot = userMessage;
					eventSource.close(); // Cierra la conexión del lado del cliente
				});

                eventSource.onerror = function (error) {
                    console.error('Error:', error);
                    userScrolledUp = false;
                    disable_enable_elements(true);
                    promptAnterior.idBot = userMessage
                    eventSource.close();
                };
            } catch (error) {
                console.error('Error establishing EventSource connection:', error);
            }
        }
    });
};

// Carga el historial de chats
async function cargarHistorialChats() {
    try {
        fetch('listar_chats')
            .then((response) => response.json())
            .then((data) => {
                const chatListUl = document.getElementById('chat-list-ul');
                chatListUl.innerHTML = '';
                data.forEach((chat) => {
                    // Crea un nuevo elemento li y a
                    const li = document.createElement('li');
                    li.className = 'relative whitespace-nowrap overflow-hidden truncate group flex';
                    const a = document.createElement('a');
                    if (chat.id == chatIdSelect) {
                        a.className = 'py-2 w-full bg-neutral-200 truncate';
                    } else {
                        a.className = 'py-2 w-full truncate';
                    }

                    a.href = '#';
                    a.id = `chat${chat.id}`;

                    // Añade el texto y los event listeners
                    a.textContent = chat.titulo;
                    a.addEventListener('click', function (event) {
                        event.preventDefault();
                        cargarChats(chat.id);
                    });

                    // Crea el div y el svg dentro de a
                    const div = document.createElement('div');
                    div.className = 'hidden group-hover:block absolute right-0 top-1/4 bg-neutral-200 px-3 py-0.5';
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 448 512');
                    svg.classList.add('w-4', 'fill-neutral-600', 'hover:fill-red-700');
                    svg.innerHTML = `<path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"/>`;

                    div.appendChild(svg);
                    a.appendChild(div);
                    li.appendChild(a);

                    // Añadir el evento de eliminar
                    svg.addEventListener('click', function (event) {
                        event.stopPropagation(); // Detiene la propagación para no disparar el evento de click del enlace a
                        eliminarChat(chat.id, li);
                    });

                    chatListUl.appendChild(li);
                });
            })
            .catch((error) => console.error('Error fetching chat list:', error));
    } catch (error) {
        console.error('Error parsing JSON:', error, 'Raw Data:', event.data);
    }
}

// Habilita y deshabilita los campos para no poder hacer otra consulta mientas hay una en marcha
function disable_enable_elements(enable) {
    boton = document.getElementById('send-button');
    input = document.getElementById('prompt-textarea');
    if (enable) {
        boton.disabled = false;
        input.disabled = false;
    } else {
        boton.disabled = true;
        input.disabled = true;
    }
}

// Función para agregar mensaje del usuario al chatbox
function addMessageToChatbox(message, author) {
    // Crear un nuevo div para el mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex w-full text-token-text-primary px-4 py-2 justify-center text-base';

    // Estructura del mensaje
    messageDiv.innerHTML = `
    <div class="flex flex-1 text-base mx-auto gap-3 md:px-5 lg:px-1 xl:px-5 md:max-w-3xl lg:max-w-[50rem] xl:max-w-[64rem]">
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
        <div class="font-semibold select-none">${escapeHTML(author)}</div>
        <div class="flex flex-grow flex-col max-w-full">
            <div class="min-h-[20px] text-message flex flex-col items-start gap-3 whitespace-pre-wrap break-words">
                <div class="text-neutral-600">${escapeHTML(message)}</div>
            </div>
        </div>
    </div>
</div>      
`;

    // Agregar el mensaje al principio del chatbox
    chatbox.append(messageDiv);
}

// Permite insertar html en los mensaje como texto plano
function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Inserta el codigo de la valoracion a la respuesta de la ia y le añade los eventos para controlar la valoracion
function insertar_val(idBot) {
    div_val = document.getElementById('val' + idBot);
    div_val.innerHTML = `<div id="ratingThumbs${idBot}" class="flex-col items-start justify-start h-auto flex mt-4 border-t border-neutral-200 pt-4">
    <input type="hidden" id="rating${idBot}" />
    <input type="hidden" id="id-registro${idBot}" />
    <div class="flex justify-between w-full ">
        <!-- BOTON REGENERAR RESPUESTA -->
        <button id="regenerateMsg${idBot}" class="flex gap-1 justify-center items-center px-3 py-2 bg-neutral-100 hover:bg-neutral-50 transition text-red-600 rounded-md text-xs">
            <svg class="w-3 fill-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
                <path d="M0 224c0 17.7 14.3 32 32 32s32-14.3 32-32c0-53 43-96 96-96H320v32c0 12.9 7.8 24.6 19.8 29.6s25.7 2.2 34.9-6.9l64-64c12.5-12.5 12.5-32.8 0-45.3l-64-64c-9.2-9.2-22.9-11.9-34.9-6.9S320 19.1 320 32V64H160C71.6 64 0 135.6 0 224zm512 64c0-17.7-14.3-32-32-32s-32 14.3-32 32c0 53-43 96-96 96H192V352c0-12.9-7.8-24.6-19.8-29.6s-25.7-2.2-34.9 6.9l-64 64c-12.5 12.5-12.5 32.8 0 45.3l64 64c9.2 9.2 22.9 11.9 34.9 6.9s19.8-16.6 19.8-29.6V448H352c88.4 0 160-71.6 160-160zM32 192c-17.7 0-32 14.3-32 32V448c0 17.7 14.3 32 32 32H96c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32H32z"/>
            </svg>
            Regenerar
        </button>
        <!-- BOTONES VALORACION -->
        <div class=" flex items-center justify-end w-full  pr-4">
            <div class="thumb-icon cursor-pointer mr-3.5" id="val-positiva${idBot}">
                <span class="m-auto">
                    <svg id="val-positiva-0${idBot}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-4 fill-neutral-400 hover:fill-lime-400 transition">
                        <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
                        <path d="M323.8 34.8c-38.2-10.9-78.1 11.2-89 49.4l-5.7 20c-3.7 13-10.4 25-19.5 35l-51.3 56.4c-8.9 9.8-8.2 25 1.6 33.9s25 8.2 33.9-1.6l51.3-56.4c14.1-15.5 24.4-34 30.1-54.1l5.7-20c3.6-12.7 16.9-20.1 29.7-16.5s20.1 16.9 16.5 29.7l-5.7 20c-5.7 19.9-14.7 38.7-26.6 55.5c-5.2 7.3-5.8 16.9-1.7 24.9s12.3 13 21.3 13L448 224c8.8 0 16 7.2 16 16c0 6.8-4.3 12.7-10.4 15c-7.4 2.8-13 9-14.9 16.7s.1 15.8 5.3 21.7c2.5 2.8 4 6.5 4 10.6c0 7.8-5.6 14.3-13 15.7c-8.2 1.6-15.1 7.3-18 15.2s-1.6 16.7 3.6 23.3c2.1 2.7 3.4 6.1 3.4 9.9c0 6.7-4.2 12.6-10.2 14.9c-11.5 4.5-17.7 16.9-14.4 28.8c.4 1.3 .6 2.8 .6 4.3c0 8.8-7.2 16-16 16H286.5c-12.6 0-25-3.7-35.5-10.7l-61.7-41.1c-11-7.4-25.9-4.4-33.3 6.7s-4.4 25.9 6.7 33.3l61.7 41.1c18.4 12.3 40 18.8 62.1 18.8H384c34.7 0 62.9-27.6 64-62c14.6-11.7 24-29.7 24-50c0-4.5-.5-8.8-1.3-13c15.4-11.7 25.3-30.2 25.3-51c0-6.5-1-12.8-2.8-18.7C504.8 273.7 512 257.7 512 240c0-35.3-28.6-64-64-64l-92.3 0c4.7-10.4 8.7-21.2 11.8-32.2l5.7-20c10.9-38.2-11.2-78.1-49.4-89zM32 192c-17.7 0-32 14.3-32 32V448c0 17.7 14.3 32 32 32H96c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32H32z"/>
                    </svg>
                    <svg id="val-positiva-1${idBot}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-4 fill-lime-600 hidden">
                        <!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
                        <path d="M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2H464c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48H294.5c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3V320 272 247.1c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192H96c17.7 0 32 14.3 32 32V448c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V224c0-17.7 14.3-32 32-32z"/>
                    </svg>
                </span>
            </div>
            <div class="thumb-icon cursor-pointer" id="val-negativa${idBot}">
                <span class="m-auto">
					<svg id="val-negativa-0${idBot}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-4 fill-neutral-400 hover:fill-red-400 transition">
						<!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
						<path d="M323.8 477.2c-38.2 10.9-78.1-11.2-89-49.4l-5.7-20c-3.7-13-10.4-25-19.5-35l-51.3-56.4c-8.9-9.8-8.2-25 1.6-33.9s25-8.2 33.9 1.6l51.3 56.4c14.1 15.5 24.4 34 30.1 54.1l5.7 20c3.6 12.7 16.9 20.1 29.7 16.5s20.1-16.9 16.5-29.7l-5.7-20c-5.7-19.9-14.7-38.7-26.6-55.5c-5.2-7.3-5.8-16.9-1.7-24.9s12.3-13 21.3-13L448 288c8.8 0 16-7.2 16-16c0-6.8-4.3-12.7-10.4-15c-7.4-2.8-13-9-14.9-16.7s.1-15.8 5.3-21.7c2.5-2.8 4-6.5 4-10.6c0-7.8-5.6-14.3-13-15.7c-8.2-1.6-15.1-7.3-18-15.2s-1.6-16.7 3.6-23.3c2.1-2.7 3.4-6.1 3.4-9.9c0-6.7-4.2-12.6-10.2-14.9c-11.5-4.5-17.7-16.9-14.4-28.8c.4-1.3 .6-2.8 .6-4.3c0-8.8-7.2-16-16-16H286.5c-12.6 0-25 3.7-35.5 10.7l-61.7 41.1c-11 7.4-25.9 4.4-33.3-6.7s-4.4-25.9 6.7-33.3l61.7-41.1c18.4-12.3 40-18.8 62.1-18.8H384c34.7 0 62.9 27.6 64 62c14.6 11.7 24 29.7 24 50c0 4.5-.5 8.8-1.3 13c15.4 11.7 25.3 30.2 25.3 51c0 6.5-1 12.8-2.8 18.7C504.8 238.3 512 254.3 512 272c0 35.3-28.6 64-64 64l-92.3 0c4.7 10.4 8.7 21.2 11.8 32.2l5.7 20c10.9 38.2-11.2 78.1-49.4 89zM32 384c-17.7 0-32-14.3-32-32V128c0-17.7 14.3-32 32-32H96c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32H32z" />
					</svg>
					<svg id="val-negativa-1${idBot}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="w-4 fill-red-600 hidden">
						<!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
						<path d="M313.4 479.1c26-5.2 42.9-30.5 37.7-56.5l-2.3-11.4c-5.3-26.7-15.1-52.1-28.8-75.2H464c26.5 0 48-21.5 48-48c0-18.5-10.5-34.6-25.9-42.6C497 236.6 504 223.1 504 208c0-23.4-16.8-42.9-38.9-47.1c4.4-7.3 6.9-15.8 6.9-24.9c0-21.3-13.9-39.4-33.1-45.6c.7-3.3 1.1-6.8 1.1-10.4c0-26.5-21.5-48-48-48H294.5c-19 0-37.5 5.6-53.3 16.1L202.7 73.8C176 91.6 160 121.6 160 153.7V192v48 24.9c0 29.2 13.3 56.7 36 75l7.4 5.9c26.5 21.2 44.6 51 51.2 84.2l2.3 11.4c5.2 26 30.5 42.9 56.5 37.7zM32 384H96c17.7 0 32-14.3 32-32V128c0-17.7-14.3-32-32-32H32C14.3 96 0 110.3 0 128V352c0 17.7 14.3 32 32 32z" />
					</svg>
                </span>
            </div>
        </div>
    </div>
    <div id="val-text-button${idBot}" class="transition-all duration-500 overflow-hidden max-h-0 w-full flex flex-col items-end gap-2">
        <!-- Textarea -->
        <div id="ratingComment${idBot}" class="mt-4 flex items-center justify-center w-full">
            <textarea
                id="comment${idBot}"
                class="w-full px-3 py-2 border rounded-lg border-neutral-300 placeholder:text-neutral-400 max-h-60"
                placeholder="¿Cómo valoras esta respuesta?"></textarea>
        </div>
        <!-- Button -->
        <div id="ratingButton${idBot}" class="flex mb-4">
            <button id="sendButton${idBot}" class="px-3 py-2 bg-red-500 hover:bg-red-400 transition text-white rounded-md text-sm">Enviar</button>
        </div>
    </div>
</div>
<div id="val_exitosa${idBot}" class="hidden items-center justify-end w-full border-t border-neutral-200 pt-2 mt-4">
    <p class="text-lime-600">Gracias por valorar!</p>
</div>
<div id="val_error${idBot}" class="hidden items-center justify-end w-full border-t border-neutral-200 pt-2 mt-4">
    <p class="text-red-600">Error al valorar!</p>
</div>`;

    // para situar el scroll abajo del todo cuando inserta la valoracion
    if (!userScrolledUp) {
        chatbox.scrollTop = chatbox.scrollHeight;
    }

    // añado al dic de las valoraciones seleccionadas la id de la respuesta con la val por defecto
    dicValSelect.idBot = -1;

    var val_negativa_0 = document.getElementById('val-negativa-0' + idBot);
    var val_negativa_1 = document.getElementById('val-negativa-1' + idBot);
    var val_positiva_0 = document.getElementById('val-positiva-0' + idBot);
    var val_positiva_1 = document.getElementById('val-positiva-1' + idBot);
    var val_text_button = document.getElementById('val-text-button' + idBot);
    var regenerarMsg = document.getElementById('regenerateMsg' + idBot);

    regenerarMsg.addEventListener('click', function (e) {
        regenerarChats(idBot)
    });

    // evento para la valoracion positiva
    document.getElementById('val-positiva' + idBot).addEventListener('click', function (event) {
        document.getElementById('rating' + idBot).value = 1;
        dicValSelect.idBot = rateResponse(1, val_text_button, val_positiva_0, val_positiva_1, val_negativa_1, val_negativa_0, dicValSelect.idBot, idBot);
    });

    // evento para la valoracion negativa
    document.getElementById('val-negativa' + idBot).addEventListener('click', function (event) {
        document.getElementById('rating' + idBot).value = 0;
        dicValSelect.idBot = rateResponse(0, val_text_button, val_positiva_0, val_positiva_1, val_negativa_1, val_negativa_0, dicValSelect.idBot, idBot);
    });

    var ratingThumbs = document.getElementById('ratingThumbs' + idBot);
    var val_exitosa = document.getElementById('val_exitosa' + idBot);
    var val_error = document.getElementById('val_error' + idBot);

    // Evento para enviar la valoracion desde el boton
	document.getElementById('sendButton' + idBot).addEventListener('click', function (event) {
		// var id_registro = document.getElementById('id-registro' + idBot).value;
		// if (!id_registro) {
		// 	console.error('ID de registro inválido:', id_registro);
		// 	alert('Error: ID de registro inválido.');
		// 	return;
		// }
		var valoracion = document.getElementById('rating' + idBot).value;
		var comentario = document.getElementById('comment' + idBot).value;

		submitRating('save-rating/', idBot, valoracion, comentario, ratingThumbs, val_exitosa, val_error);
	});

	// Evento para enviar la valoracion desde el textarea
	document.getElementById('comment' + idBot).addEventListener('keypress', function (event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			// var id_registro = document.getElementById('id-registro' + idBot).value;
			// if (!id_registro) {
			// 	console.error('ID de registro inválido:', id_registro);
			// 	alert('Error: ID de registro inválido.');
			// 	return;
			// }
			var valoracion = document.getElementById('rating' + idBot).value;
			var comentario = document.getElementById('comment' + idBot).value;

			submitRating('save-rating/', idBot, valoracion, comentario, ratingThumbs, val_exitosa, val_error);
		}
	});



}

// Función para agregar mensaje de la ia que esta guardado en el registro de la ia
function addMessageToChatboxChatHistory(message, idBot) {
    // Crear un nuevo div para el mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex w-full text-token-text-primary px-4 py-2 justify-center text-base';

    // Estructura del mensaje
    messageDiv.innerHTML = `
        <div class="flex flex-1 text-base mx-auto gap-3 md:px-5 lg:px-1 xl:px-5 md:max-w-3xl lg:max-w-[50rem] xl:max-w-[64rem]">
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
                    style="color: transparent" />
                </div>
                </div>
            </div>
            <div class="relative flex w-full flex-col">
                <div class="font-semibold select-none">SareBot</div>
                <div class="flex flex-grow flex-col max-w-full">
                <div class="min-h-[20px] text-message flex flex-col items-start">
                    <div class="[&>p]:mb-2 [&>pre]:my-2">${message}</div>
                </div>
                </div>
                <div id="val${idBot}"></div>
            </div>
        </div>
    `;
    // Agregar el mensaje al principio del chatbox
    chatbox.append(messageDiv);

	
}

// Función para agregar mensaje de la ia al chatbox
function addMessageToChatboxIA(idBot) {
    // Crear un nuevo div para el mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex w-full text-token-text-primary px-4 py-2 justify-center text-base';

    // Estructura del mensaje
    messageDiv.innerHTML = `
        <div id="msg${idBot}" class="flex flex-1 text-base mx-auto gap-3 md:px-5 lg:px-1 xl:px-5 md:max-w-3xl lg:max-w-[50rem] xl:max-w-[64rem]">
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
                    style="color: transparent" />
                </div>
                </div>
            </div>
            <div class="relative flex w-full flex-col">
                <div class="font-semibold select-none">SareBot</div>
                <div class="flex flex-grow flex-col max-w-full">
                <div class="min-h-[20px] text-message flex flex-col items-start">
                    <div id="bot${idBot}" class="[&>p]:mb-2 [&>pre]:my-2"></div>
                </div>
                </div>
                <div id="val${idBot}"></div>
            </div>
        </div>
    `;

    // Agregar el mensaje al principio del chatbox
    chatbox.append(messageDiv);

    // Añado msg generando
    document.getElementById(`bot${idBot}`).innerHTML = htmlMsgGenerando;

}

async function registrarChat() {
    const data = {
        titulo: 'Chat sin título',
    };

    try {
        const response = await fetch('save-chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Error al enviar la solicitud al servidor');
        }

        const responseData = await response.json();
        console.log('Chat registrado:', responseData);
        // agregarChatALista(responseData.id, responseData.titulo); // Añadir chat con título provisional
        chatIdSelect = responseData.id;
        cargarHistorialChats();
        return responseData.id;
    } catch (error) {
        console.error('Error al registrar el chat:', error);
        return -1;
    }
}

function cargarChats(chatId) {
    const chatContainer = document.getElementById('chatbox');
    fetch(`cargar_chats/?chat_id=${chatId}`)
        .then((response) => response.json())
        .then((data) => {
            chatContainer.innerHTML = '<div id="msg-inicial"></div>';

            var preguntasMap = new Map();

            // Primero recorremos el array y llenamos el Map
            data.forEach((registro) => {
                // Actualizamos el registro con la pregunta y su última respuesta
                preguntasMap.set(registro.pregunta, registro);
            });

            // Luego recorremos el Map para añadir las preguntas y respuestas al chatbox
            preguntasMap.forEach((registro, pregunta) => {
                addMessageToChatbox(pregunta, 'You');
                const idBot = registro.id; // Use the backend chat ID for each message
                addMessageToChatboxChatHistory(convertMarkdownToHTML(registro.respuesta), idBot);
				

				if (!isRated(registro)) { // Check the `valoracion` field
					insertar_val(idBot);
				}
            });

            chatIdSelect = chatId;
            chat_id = chatId;
            cargarHistorialChats();
        })
        .catch((error) => console.error('Error loading chats:', error));
}

// Abre el pop-up de eliminar chat
function eliminarChat(chatId, chatElement) {
    const chatName = chatElement.querySelector('a').textContent;
    document.getElementById('pop-up-borrar').classList.remove('hidden');
    document.getElementById('pop-up-borrar').classList.add('flex');
    document.getElementById('pop-up-texto').innerHTML = chatName;
    chatIdSelect = chatId;
}

// Cierra el pop-up de borrar chat
function cerrarBorrarChat() {
    document.getElementById('pop-up-borrar').classList.add('hidden');
    document.getElementById('pop-up-borrar').classList.remove('flex');
    chatElementSelect = null;
    chatIdSelect = null;
}

// borra el chat
function aceptarBorrarChat() {
    chatHtml = document.getElementById(`chat${chatIdSelect}`);
    crearChatBoton = document.getElementById('boton-nuevo-chat');
    fetch('ocultar-chat/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken, // Asegúrate de que csrftoken esté definido
        },
        body: JSON.stringify({ chat_id: chatIdSelect }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Error al eliminar el chat');
            }
            return response.json();
        })
        .then((data) => {
            if (data.success) {
                //si es el chat actual recarga la pagina
                if (chatHtml.classList.contains('bg-neutral-200')) {
                    crearChatBoton.click();
                } else {
                    cargarHistorialChats();
                    cerrarBorrarChat();
                }
            } else {
                alert('Error al eliminar el chat');
            }
        })
        .catch((error) => console.error('Error deleting chat:', error));
}

async function regenerarChats(idBot) {
	console.log(idBot)
    // Obtener el contenido del área de texto
    const userMessage = promptAnterior.idBot;
    // Si el mensaje no está vacío
    if (userMessage.trim()) {
        disable_enable_elements(false);

        // Añado msg generando
        document.getElementById(`bot${idBot}`).innerHTML = htmlMsgGenerando;

        //ocultar las valoraciones
        document.getElementById(`val${idBot}`).style.display = 'none';
        try {
            const url = `chat-call/?user=${encodeURIComponent(userMessage)}&origen=${encodeURIComponent('Chat')}&chat=${encodeURIComponent(chat_id)}`;
            const eventSource = new EventSource(url);

            contenidoGenerado = '';

            primer_msg = true;
            eventSource.onmessage = function (event) {
                // Desplazar hacia abajo solo si el usuario no ha scrolleado hacia arriba
                if (primer_msg || !userScrolledUp) {
                    chatbox.scrollTop = chatbox.scrollHeight;
                }
                primer_msg = false;

                msg = document.getElementById('msg-generando');
                if (msg) {
                    msg.remove();
                }
                try {
                    // Parse the JSON to extract the content
                    var data = JSON.parse(event.data);
                    // Check if the JSON contains the expected content
                    if (data.content) {
                        contenidoGenerado += data.content;
                        var htmlContent = convertMarkdownToHTML(contenidoGenerado);
						
                        // Add the content to the appropriate div
                        document.getElementById('bot' + idBot).innerHTML = htmlContent;
                    }
                } catch (error) {
                    console.error('Error parsing JSON:', error, 'Raw Data:', event.data);
                }
            };

            eventSource.addEventListener('title', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    cargarHistorialChats();
                } catch (error) {
                    console.error('Error parsing title JSON:', error, 'Raw Data:', event.data);
                }
            });

            eventSource.addEventListener('done', async function (event) {
                console.log('Stream done, closing connection');
                userScrolledUp = false;
                disable_enable_elements(true);
                //ocultar las valoraciones
                document.getElementById(`val${idBot}`).style.display = 'block';
                document.getElementById('id-registro' + idBot).value = event.data;
                eventSource.close(); // Cierra la conexión del lado del cliente
            });

            eventSource.onerror = function (error) {
                console.error('Error:', error);
                userScrolledUp = false;
                disable_enable_elements(true);
                eventSource.close();
            };
        } catch (error) {
            console.error('Error establishing EventSource connection:', error);
        }
    }
}

function isRated(message) {
    return message.valoracion !== null; // Assuming `valoracion` is a boolean field in the message data
}

function transformIds(idBot, newId) {
    const msgElement = document.getElementById(`msg${idBot}`);
    if (msgElement) {
        msgElement.id = `msg${newId}`;
    }

    const botElement = document.getElementById(`bot${idBot}`);
    if (botElement) {
        botElement.id = `bot${newId}`;
    }

    const valElement = document.getElementById(`val${idBot}`);
    if (valElement) {
        valElement.id = `val${newId}`;
    }
}
