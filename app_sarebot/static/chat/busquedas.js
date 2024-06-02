var csrftoken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

var val_selec = -1;

var ratingThumbs = null;
var val_negativa_0 = null;
var val_negativa_1 = null;
var val_positiva_0 = null;
var val_positiva_1 = null;
var val_exitosa = null;
var val_error = null;
var val_text_button = null;

var promptAnterior = null;

window.onload = function () {
	ratingThumbs = document.getElementById('ratingThumbs');
	val_negativa_0 = document.getElementById('val-negativa-0');
	val_negativa_1 = document.getElementById('val-negativa-1');
	val_positiva_0 = document.getElementById('val-positiva-0');
	val_positiva_1 = document.getElementById('val-positiva-1');
	val_exitosa = document.getElementById('val_exitosa');
	val_error = document.getElementById('val_error');
	val_text_button = document.getElementById('val-text-button');

    input = document.getElementById('texto_prompt');
	// Al pulsar el boton llama a la api
	document.getElementById('apiCallButton').addEventListener('click', function () {
		llamar_api(input, "Follow instructions");
	});

	// aumenta el tamaño del textarea segun el contenido
	input.addEventListener('input', function () {
		aumentar_textarea(input);
	});

	// Al pulsar enter llama a la api
	input.addEventListener('keypress', function (event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			llamar_api(input, "Follow instructions");
		}
	});

	document.getElementById('val-positiva').addEventListener('click', function (event) {
		document.getElementById('rating').value = 1;
		val_selec = rateResponse(1, val_text_button, val_positiva_0, val_positiva_1, val_negativa_1, val_negativa_0, val_selec);
	});

	document.getElementById('val-negativa').addEventListener('click', function (event) {
		document.getElementById('rating').value = 0;
		val_selec = rateResponse(0, val_text_button, val_positiva_0, val_positiva_1, val_negativa_1, val_negativa_0, val_selec);
	});

	document.getElementById('sendButton').addEventListener('click', function (event) {
		var id_registro = document.getElementById('id-registro').value;
		var valoracion = document.getElementById('rating').value;
		var comentario = document.getElementById('comment').value;
		submitRating("api/save-rating/", id_registro, valoracion, comentario, ratingThumbs, val_exitosa, val_error);
	});

	document.getElementById('comment').addEventListener('keypress', function (event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			var id_registro = document.getElementById('id-registro').value;
			var valoracion = document.getElementById('rating').value;
			var comentario = document.getElementById('comment').value;
			submitRating("api/save-rating/", id_registro, valoracion, comentario, ratingThumbs, val_exitosa, val_error);
		}
	});

	document.getElementById('regenerateMsg').addEventListener('click', function (event) {
		regenerarmsg();
	});
};

// llama a la api en stream para obtener la respuesta del prompt
async function llamar_api(input, select, regenerar=false) {
	if (!regenerar) {
		//obtengo el texto y el prompt
		texto = input.value;
		prompt1 = select;
	}else{
		//obtengo el texto y el prompt del msg anterior
		texto = promptAnterior;
		prompt1 = select;
	}
	if (texto != '' && prompt1 != '') {
		// Si estan vacios no hago nada
		disable_enable_elements(false);
		reset_val();
		document.getElementById('apiResponse').innerHTML = ''; // Limpia contenido anterior
		msgIa = document.getElementById('msg-generando').style.display = 'flex';
		document.getElementById('result').style.display = 'block';
		document.getElementById('msg-inicial').style.display = 'none';
		document.getElementById('document-info').style.display = 'none'; // Ocultar el div con la información de documentos

		// cargo el conversor de markdown
		const md = crear_conversor_markdown();

		// Guardo el prompt y el texto para poder regenerar el msg
		promptAnterior = texto;

		// Crea un EventSource que apunta a la api en stream
		var url = `call-api/?system=${encodeURIComponent(prompt1)}&user=${encodeURIComponent(texto)}&origen=${encodeURIComponent('Búsqueda')}`;
		var eventSource = new EventSource(url);

		// Cuando recibe un msg del stream
		contenidoGenerado = '';
		eventSource.onmessage = function (event) {
			// oculto el msg de generando
			msg = document.getElementById('msg-generando').style.display = 'none';
			try {
				// obtengo el contenido del mensaje y lo transformo de markdown a html
				var data = JSON.parse(event.data);
				if (data.content) {
					contenidoGenerado += data.content;
					var htmlContent = convertMarkdownToHTML(contenidoGenerado);
					document.getElementById('apiResponse').innerHTML = htmlContent;
				}
			} catch (e) {
				console.error('Error parsing JSON:', e);
			}
		}; 

		// Cuando recibe información de documentos usados
        eventSource.addEventListener('documents_used', function (event) {
			
            try {
                var data = JSON.parse(event.data);
                var documentsInfo = data.documents_used;
                var quotesList = document.getElementById('quotes-list');
                quotesList.innerHTML = ''; // Limpiar contenido anterior

                documentsInfo.forEach(function (doc, index) {
					añadir_quote(quotesList, doc)
                });

                
            } catch (e) {
                console.error('Error parsing documents JSON:', e);
            }
        });

		// Cuando finaliza el stream
		eventSource.addEventListener('done', function (event) {
			console.log('Stream done, closing connection');
			console.log('generated data:\n', contenidoGenerado);
			document.getElementById('id-registro').value = event.data;
			document.getElementById('document-info').style.display = 'block'; // Mostrar el div con la información de documentos
			eventSource.close(); // Cierra la conexión del lado del cliente
			disable_enable_elements(true);
			mostrar_ocultar_val(true, null, ratingThumbs, val_exitosa, val_error);
		});

		// Cuando da error el stream
		eventSource.onerror = function (error) {
			msg = document.getElementById('msg-generando').style.display = 'none';
			document.getElementById('apiResponse').innerHTML = `<p class="text-red-600">Ha ocurrido un error!</p>`;
			console.error('Error:', error);
			eventSource.close();
			disable_enable_elements(true);
		};
	}
}

// Añade los quotes al div que recibe 
function añadir_quote(divQuotes, quote){
	// Limita el score a dos decimales
    let formattedScore = quote.score.toFixed(2);

	// Convierte la ruta absoluta a una ruta relativa
    let relativePath = quote.file_path.replace(/\\/g, '/').replace(/^.*\/data\//, 'data/');

	quoteHtml = `<div class="relative">
	<a href="${relativePath}" target="_blank" class="py-3 px-4 border border-neutral-200 rounded-md flex max-w-80 overflow-hidden hover:shadow duration-300 group min-w-44">
<label class="absolute -top-2 -right-3 z-50 rounded-3xl bg-neutral-200 text-xs px-3 py-0.5 text-neutral-500" id="quote-score">${formattedScore}</label>
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" class="w-[13px] fill-blue-400 mr-2">
			<!--!Font Awesome Free 6.5.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2024 Fonticons, Inc.-->
			<path
				d="M320 464c8.8 0 16-7.2 16-16V160H256c-17.7 0-32-14.3-32-32V48H64c-8.8 0-16 7.2-16 16V448c0 8.8 7.2 16 16 16H320zM0 64C0 28.7 28.7 0 64 0H229.5c17 0 33.3 6.7 45.3 18.7l90.5 90.5c12 12 18.7 28.3 18.7 45.3V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64z" />
		</svg>
		<p class="truncate text-neutral-600 group-hover:underline" id="quote-name">${quote.file_name}</p>
	</a>
</div>`
	divQuotes.innerHTML += quoteHtml;
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
	navigator.clipboard
		.writeText(codeBlock.textContent)
		.then(() => {
			e.lastElementChild.textContent = 'Copiado!';
			setTimeout(() => (e.lastElementChild.textContent = 'Copy code'), 2000); // Restablece el texto del botón después de 2 segundos
		})
		.catch((err) => {
			console.error('Error al copiar texto: ', err);
		});
}

// Resetea las valoraciones para el siguiente prompt
function reset_val() {
	document.getElementById('comment').value = '';
	val_selec = -1;
	val_text_button.style.maxHeight = '0px';

	cambiar_icono_val_1(false, val_positiva_0, val_positiva_1);
	cambiar_icono_val_0(false, val_negativa_1, val_negativa_0);
	mostrar_ocultar_val(false, null, ratingThumbs, val_exitosa, val_error);
}

function regenerarmsg() {
	llamar_api(null, null, true);
}