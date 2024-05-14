window.onload = function () {};

//aumentar el textarea segun el contenido
function aumentar_textarea(textArea) {
	textArea.style.height = '44px'; // vuelve al tamaño original para que pueda recalcular de mejor manera el scrollHeight (arregla el fallo de que al borrar no disminuye)
	textArea.style.height = textArea.scrollHeight + 'px';
}

function crear_conversor_markdown() {
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
	return md;
}

//////////// VALORACIONES /////////////

// Función para enviar la valoración y comentario al servidor
function submitRating(api_url, id_registro, valoracion, comentario, ratingThumbs, val_exitosa, val_error) {

	// Configurar los datos que se enviarán al servidor
	var data = {
		registro: id_registro,
		valoracion: valoracion,
		comentario: comentario,
	};

	// Configurar la solicitud AJAX usando Fetch
	fetch(api_url, {
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
		.then(function (responseData) {
			// Manejar la respuesta del servidor si es necesario
			console.log('Respuesta del servidor:', responseData);
			mostrar_ocultar_val(false, true, ratingThumbs, val_exitosa, val_error);
		})
		.catch(function (error) {
			// Manejar errores si ocurren
			console.error('Error al enviar la valoración y el comentario:', error);
			mostrar_ocultar_val(false, false, ratingThumbs, val_exitosa, val_error);
		});
}

// Muestra y oculta las valoraciones y mensajes de error y exito
function mostrar_ocultar_val(mostrar, exito, ratingThumbs, val_exitosa, val_error) {
	if (mostrar) {
		ratingThumbs.classList.remove('hidden');
		ratingThumbs.classList.add('flex');
	} else if (exito == null) {
		ratingThumbs.classList.add('hidden');
		ratingThumbs.classList.remove('flex');
		val_exitosa.classList.add('hidden');
		val_exitosa.classList.remove('flex');
	} else if (exito) {
		ratingThumbs.classList.add('hidden');
		ratingThumbs.classList.remove('flex');
		val_exitosa.classList.remove('hidden');
		val_exitosa.classList.add('flex');
	} else {
		ratingThumbs.classList.add('hidden');
		ratingThumbs.classList.remove('flex');
		val_error.classList.remove('hidden');
		val_error.classList.add('flex');
	}
}

// cambia el estado del icono del pulgar arriba
function cambiar_icono_val_1(pulsado, val_positiva_0, val_positiva_1) {
	if (pulsado) {
		val_positiva_0.classList.add('hidden');
		val_positiva_1.classList.remove('hidden');
	} else {
		val_positiva_0.classList.remove('hidden');
		val_positiva_1.classList.add('hidden');
	}
}

// cambia el estado del icono del pulgar abajo
function cambiar_icono_val_0(pulsado, val_negativa_1, val_negativa_0) {
	if (pulsado) {
		val_negativa_0.classList.add('hidden');
		val_negativa_1.classList.remove('hidden');
	} else {
		val_negativa_0.classList.remove('hidden');
		val_negativa_1.classList.add('hidden');
	}
}

// Muestra o oculta el text area y el boton y actualiza los iconos de las valoraciones
function mostrar_ocultar_comentario_val(val_text_button, val_positiva_0 = null, val_positiva_1 = null, val_negativa_1 = null, val_negativa_0 = null, val_selec, idBot = null) {
	if (val_selec != -1) {
		if (val_selec == 1) {
			cambiar_icono_val_1(true, val_positiva_0, val_positiva_1);
			cambiar_icono_val_0(false, val_negativa_1, val_negativa_0);
		} else {
			cambiar_icono_val_0(true, val_negativa_1, val_negativa_0);
			cambiar_icono_val_1(false, val_positiva_0, val_positiva_1);
		}
		val_text_button.style.maxHeight = '500px';

		var alturaTotalContenido = document.documentElement.scrollHeight;
		var alturaVisible = window.innerHeight;
		var posicionScrollActual = window.scrollY;

		// si la peticion viene de la pagina chat (idBot != null) y el scroll esta abajo hace un scroll para ver el textarea completo
		if (idBot != null && posicionScrollActual + alturaVisible >= alturaTotalContenido) {
			setTimeout(function () {
				window.scrollBy({ top: 300, left: 0, behavior: 'smooth' });
			}, 150);
		}
	} else {
		cambiar_icono_val_0(false, val_negativa_1, val_negativa_0);
		cambiar_icono_val_1(false, val_positiva_0, val_positiva_1);
		val_text_button.style.maxHeight = '0px';
	}
}

// Función para valorar la respuesta
function rateResponse(valoracion, val_text_button, val_positiva_0, val_positiva_1, val_negativa_1, val_negativa_0, val_selec, idBot = null) {
	// document.getElementById('rating').value = valoracion;
	// Mostrar el área de comentario y el botón de enviar
	if (valoracion === val_selec) {
		val_selec = -1;
	} else {
		val_selec = valoracion;
	}

	if (!idBot) {
		var idBot = null;
	}

	mostrar_ocultar_comentario_val(val_text_button, val_positiva_0, val_positiva_1, val_negativa_1, val_negativa_0, val_selec, idBot);
	return val_selec;
}
