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