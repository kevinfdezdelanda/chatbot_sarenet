var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
var userScrolledUp = false;
var lastScrollTop = 0;

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
	const sendButton = document.getElementById('send-button');
	const textArea = document.getElementById('prompt-textarea');
	const chatbox = document.getElementById('chatbox');
	const idchat = generarID();
	// Funcion para que cuando pulse la tecla "ENTER" envie el mensaje
	textArea.addEventListener('keypress', (event) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			// Si se presiona 'Enter', simula un clic en el botón de envío
			event.preventDefault(); // Para evitar que se agregue una nueva línea en el textarea
			sendButton.click();
		}
	});

	window.addEventListener(
		'scroll',
		() => {
			let currentScrollTop = window.scrollY;
			let windowHeight = window.innerHeight; // La altura de la ventana de visualización
			let totalHeight = document.documentElement.scrollHeight; // La altura total del contenido de la página
			if (currentScrollTop < lastScrollTop) {
				// El usuario está scrolleando hacia arriba
				userScrolledUp = true;
			} else if (currentScrollTop + windowHeight >= totalHeight) {
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
			const idBot = idchat();
			if (idBot == 1) {
				try {
					chat_id = await registrarChat(); // Await the Promise from registrarChat()
					console.log('The chat ID is:', chat_id);
				} catch (error) {
					console.error('Error with chat registration:', error);
					return; // Exit if the chat registration fails
				}
			}

			addMessageToChatbox(userMessage, 'You');
			setTimeout(function () {
				addMessageToChatboxIA(idBot);
				// cuando manda un msg scrolea abajo automaticamente
				window.scroll(0, document.body.scrollHeight);
			}, 300);

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

			try {
				const url = `chat-call/?user=${encodeURIComponent(userMessage)}&origen=${encodeURIComponent('Chat')}&chat=${encodeURIComponent(chat_id)}`;
				const eventSource = new EventSource(url);

				// Borrar el contenido del área de texto
				textArea.value = '';
				contenidoGenerado = '';

				primer_msg = true;
				eventSource.onmessage = function (event) {
					// Desplazar hacia abajo solo si el usuario no ha scrolleado hacia arriba
					if (primer_msg || !userScrolledUp) {
						window.scroll(0, document.body.scrollHeight);
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
							var htmlContent = md.render(contenidoGenerado);
							// Add the content to the appropriate div
							document.getElementById('bot' + idBot).innerHTML = htmlContent;
						}
					} catch (error) {
						console.error('Error parsing JSON:', error, 'Raw Data:', event.data);
					}
				};

				eventSource.addEventListener('done', function (event) {
					console.log('Stream done, closing connection');
					userScrolledUp = false;
                    disable_enable_elements(true);
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
	});
};

function enviarValoracion(id_registro, valoracion, comentario) {
	var data = {
		id_registro: id_registro,
		valoracion: valoracion,
		comentario: comentario,
	};

	fetch('save-rating/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': csrftoken, // Make sure csrftoken is defined or fetched from your environment
		},
		body: JSON.stringify(data),
	})
		.then(function (response) {
			if (!response.ok) {
				throw new Error('Error al enviar la solicitud al servidor');
			}
			return response.json(); // Assuming the server responds with JSON
		})
		.then(function (responseData) {
			console.log('Respuesta del servidor:', responseData);
		})
		.catch(function (error) {
			console.error('Error al enviar la valoración y el comentario:', error);
		});
}

// habilita y deshabilita los campos para no poder hacer otra consulta mientas hay una en marcha
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
            <div class="font-semibold select-none">${author}</div>
            <div class="flex flex-grow flex-col max-w-full">
                <div class="min-h-[20px] text-message flex flex-col items-start gap-3 whitespace-pre-wrap break-words">
                    <div class="text-neutral-600">${message}</div>
                </div>
            </div>
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
                    <div id="bot${idBot}"></div>
                </div>
                </div>
            </div>
        </div>
    `;

	// Agregar el mensaje al principio del chatbox
	chatbox.append(messageDiv);

	// Añado msg generando
	document.getElementById(
		`bot${idBot}`
	).innerHTML = `<div id="msg-generando" class="flex items-center gap-2"><p class="text-blue-500 text-sm">Generando</p><img class="w-4" src="../static/chat/images/loading.gif" alt="cargando" /></div>`;
}

function registrarChat() {
	var data = {
		titulo: 'titulo',
	};

	return fetch('save-chat/', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-CSRFToken': csrftoken,
		},
		body: JSON.stringify(data),
	})
		.then(function (response) {
			if (!response.ok) {
				throw new Error('Error al enviar la solicitud al servidor');
			}
			return response.json();
		})
		.then(function (data) {
			// Manejar la respuesta del servidor si es necesario
			console.log(data);
			return data.id;
		})
		.catch(function (error) {
			// Manejar errores si ocurren
			console.error('Error al enviar la valoración y el comentario:', error);
			return -1;
		});
}
