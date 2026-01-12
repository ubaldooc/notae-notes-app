


export const activarAside = () => {
    const body = document.body;
    body.classList.toggle("aside-collapsed");

    // Guardar el estado en localStorage para persistencia
    if (body.classList.contains("aside-collapsed")) {
        localStorage.setItem("aside-collapsed", "true");
    } else {
        localStorage.setItem("aside-collapsed", "false");
    }

    // Disparamos un evento 'resize' después de que la animación del aside (200ms) termine.
    // Muuri, por defecto, escucha este evento y actualiza su layout automáticamente para
    // reorganizar las notas y ocupar el nuevo espacio disponible.
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 400); // Sincronizado con la transición de 0.4s en styles.css
}

// FUNCION PARA ORDENAR LAS NOTAS POR FECHA. Esta funcion se usa con grid.sort(ordenarNotas); para que funcione
export const ordenarNotas = (itemA, itemB) => {
    const elementA = itemA.getElement();
    const elementB = itemB.getElement();

    const dateA = new Date(elementA.getAttribute('data-updated-at'));
    const dateB = new Date(elementB.getAttribute('data-updated-at'));

    // Ordena por fecha descendente (la más reciente primero).
    // La comparación de fechas funciona restándolas. dateB - dateA da el orden descendente.
    return dateB - dateA;
}

// Nueva función para ordenar por más antiguas primero
export const ordenarNotasAntiguas = (itemA, itemB) => {
    const elementA = itemA.getElement();
    const elementB = itemB.getElement();

    const dateA = new Date(elementA.getAttribute('data-updated-at'));
    const dateB = new Date(elementB.getAttribute('data-updated-at'));

    // Ordena por fecha ascendente (la más antigua primero).
    return dateA - dateB;
}

// Nueva función para ordenar por título alfabético (A-Z)
export const ordenarNotasPorTituloAsc = (itemA, itemB) => {
    const elementA = itemA.getElement();
    const elementB = itemB.getElement();

    // Usamos ?. para evitar errores si el elemento .note-title no existe
    const titleA = elementA.querySelector('.note-title')?.textContent.trim().toLowerCase() || '';
    const titleB = elementB.querySelector('.note-title')?.textContent.trim().toLowerCase() || '';

    return titleA.localeCompare(titleB);
};

// Nueva función para ordenar por título alfabético (Z-A)
export const ordenarNotasPorTituloDesc = (itemA, itemB) => {
    const elementA = itemA.getElement();
    const elementB = itemB.getElement();

    const titleA = elementA.querySelector('.note-title')?.textContent.trim().toLowerCase() || '';
    const titleB = elementB.querySelector('.note-title')?.textContent.trim().toLowerCase() || '';

    // Invertimos la comparación para el orden descendente
    return titleB.localeCompare(titleA);
}

// Nueva función para el ordenamiento personalizado
export const ordenarNotasPersonalizado = (itemA, itemB) => {
    const elementA = itemA.getElement();
    const elementB = itemB.getElement();

    const orderAStr = elementA.getAttribute('data-custom-order');
    const orderBStr = elementB.getAttribute('data-custom-order');

    const orderA = parseInt(orderAStr, 10);
    const orderB = parseInt(orderBStr, 10);

    // Si el valor no es un número (ej. es null, undefined, o no se puede parsear), lo tratamos como Infinity.
    // Esto asegura que las notas sin un orden definido se vayan al final, y que el valor 0 sea tratado correctamente.
    const finalOrderA = isNaN(orderA) ? Infinity : orderA;
    const finalOrderB = isNaN(orderB) ? Infinity : orderB;

    return finalOrderA - finalOrderB;
};

/**
 * Obtiene la función de ordenamiento correcta basándose en la preferencia guardada.
 * @param {string} [sortType] - El tipo de ordenamiento. Si no se provee, se lee de localStorage.
 * @returns {Function | null} La función de ordenamiento a utilizar o null si el tipo es inválido.
 */
export const getSortFunction = (sortType) => {
    const type = sortType || localStorage.getItem('noteSortOrder') || 'newest';
    switch (type) {
        case 'newest':
            return ordenarNotas;
        case 'oldest':
            return ordenarNotasAntiguas;
        case 'title-asc':
            return ordenarNotasPorTituloAsc;
        case 'title-desc':
            return ordenarNotasPorTituloDesc;
        case 'custom':
            return ordenarNotasPersonalizado;
        default:
            return ordenarNotas; // Fallback seguro
    }
};







export const initUtils = () => {
    // Restaurar el estado del aside al cargar la página
    if (localStorage.getItem("aside-collapsed") === "true") {
        document.body.classList.add("aside-collapsed");
    } else if (window.innerWidth <= 768) {
        // En móvil, por defecto empezamos colapsados (cerrados)
        document.body.classList.add("aside-collapsed");
    }

    const AsideMenuHam = document.getElementById("aside__menuham");
    if (AsideMenuHam) {
        AsideMenuHam.addEventListener("click", activarAside);
    }

    // Cerrar aside al hacer clic fuera en móvil
    document.addEventListener("click", (event) => {
        const isMobile = window.innerWidth <= 768;
        const body = document.body;
        const aside = document.querySelector(".aside");

        // Si estamos en móvil, el aside NO está colapsado (está abierto)
        // Y el clic NO fue dentro del aside ni en el botón de hamburguesa
        if (isMobile && !body.classList.contains("aside-collapsed")) {
            if (!aside.contains(event.target) && !AsideMenuHam.contains(event.target)) {
                activarAside();
            }
        }
    });

    // Cerrar aside al cambiar de grupo o filtro en móvil
    document.addEventListener("click", (event) => {
        if (window.innerWidth <= 768 && !document.body.classList.contains("aside-collapsed")) {
            if (event.target.closest(".notes-group") || event.target.closest(".aside__all-notes") || event.target.closest(".aside__trash-bin__box")) {
                activarAside();
            }
        }
    });
}



/**
 * Genera un color de fondo dinámico basado en el tema actual (claro u oscuro).
 * En modo claro, aclara el color (lo hace pastel).
 * En modo oscuro, oscurece el color.
 * @param {string} colorString - El color base en formato hex o rgb(a).
 * @returns {string} El color resultante en formato rgba.
 */
export const generateDynamicBackgroundColor = (colorString) => {
    let r, g, b, a;

    // Verificar si el color es hexadecimal y lo convertimos a rgb
    if (colorString.startsWith("#")) {
        const hex = colorString.slice(1);
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        } else {
            console.error("Formato hexadecimal incorrecto");
            return colorString;
        }
        a = 1; // Por defecto, opacidad total para colores hexadecimales
    } else {

        // En caso de que no sea hexadecimal trabajamos con rgba
        let rgbaMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);

        if (!rgbaMatch) {
            console.error("Formato de color incorrecto o no soportado");
            return colorString;
        }

        r = parseInt(rgbaMatch[1]);
        g = parseInt(rgbaMatch[2]);
        b = parseInt(rgbaMatch[3]);
        a = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1;
    }

    const isDarkMode = document.body.classList.contains('dark-mode');

    if (isDarkMode) {
        // En modo oscuro, mezclamos el color con un fondo oscuro para desaturarlo y suavizarlo.
        // Esto evita colores puros y demasiado brillantes que desentonarían.
        const mixFactor = 0.3; // Cuánto del color original se conserva (0.3 = 30%)

        // Color base oscuro para la mezcla (un gris oscuro neutro)
        const baseDarkR = 45;
        const baseDarkG = 52;
        const baseDarkB = 54;

        r = Math.round(r * mixFactor + baseDarkR * (1 - mixFactor));
        g = Math.round(g * mixFactor + baseDarkG * (1 - mixFactor));
        b = Math.round(b * mixFactor + baseDarkB * (1 - mixFactor));
    } else {
        // En modo claro, lo hacemos pastel (lo acercamos al blanco).
        const pastelFactor = 0.7;
        r = Math.min(255, Math.round(r + (255 - r) * pastelFactor));
        g = Math.min(255, Math.round(g + (255 - g) * pastelFactor));
        b = Math.min(255, Math.round(b + (255 - b) * pastelFactor));
    }
    return `rgba(${r}, ${g}, ${b}, ${a})`;
};


// FORMATO DE FECHA COMODO PARA EDITOR Y OTRAS COSAS
export const formatFecha = (fechaISO) => {
    let fecha = new Date(fechaISO);

    let dia = fecha.getDate().toString().padStart(2, '0');
    let mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    let año = fecha.getFullYear();

    let horas = fecha.getHours();
    let minutos = fecha.getMinutes().toString().padStart(2, '0');
    let periodo = horas >= 12 ? "pm" : "am";

    horas = horas % 12 || 12;

    return `${dia}/${mes}/${año} ${horas}:${minutos} ${periodo}`;
}

// FORMATO DE FECHA REDUCIDO PARA LAS NOTECARDS
export const formatFechaNoteCard = (fechaISO) => {
    let fecha = new Date(fechaISO);

    let dia = fecha.getDate().toString().padStart(2, '0');
    let mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    let año = fecha.getFullYear();

    let horas = fecha.getHours();
    let minutos = fecha.getMinutes().toString().padStart(2, '0');
    let periodo = horas >= 12 ? "pm" : "am";

    horas = horas % 12 || 12;

    return `${dia}/${mes}/${año}`;
}


export const validarORestauraNotaJSON = (notaJSON) => {
    // 1. Define un esquema de las propiedades esperadas con sus tipos y valores por defecto.
    const esquemaNota = {
        id: { type: 'string', defaultValue: () => `note-${crypto.randomUUID()}` },
        title: { type: 'string', defaultValue: "" },
        body: { type: 'string', defaultValue: "" },
        createdAt: { type: 'string', defaultValue: () => new Date().toISOString() },
        updatedAt: { type: 'string', defaultValue: () => new Date().toISOString() },
        charCount: { type: 'number', defaultValue: 0 },
        pinned: { type: 'boolean', defaultValue: false },
        groupId: { type: ['string', 'object'], defaultValue: null }, // groupId puede ser un string o nulo (typeof null es 'object').
        status: { type: 'string', defaultValue: 'active' },
        customOrder: { type: 'number', defaultValue: -1 } // -1 indica que no tiene un orden personalizado asignado.
    };

    // 2. Comprobación de formato básico: ¿es un objeto y no es nulo?
    if (!notaJSON || typeof notaJSON !== 'object') {
        console.error("Error de validación: El JSON no es un objeto o es nulo.");
        return false;
    }

    // 3. Verifica las propiedades clave (id, title, body) que no pueden faltar.
    const propiedadesClave = ['id', 'title', 'body'];
    for (const prop of propiedadesClave) {
        // Verifica si la propiedad existe y si su tipo es el esperado.
        if (notaJSON[prop] === undefined || typeof notaJSON[prop] !== esquemaNota[prop].type) {
            console.error(`Error de validación: La propiedad clave '${prop}' no existe o tiene el tipo incorrecto. Se esperaba '${esquemaNota[prop].type}'.`);
            return false; // Si las propiedades clave fallan, la validación completa falla.
        }
    }

    // 4. Si las propiedades clave son correctas, crea un nuevo objeto reparado.
    const notaReparada = {};

    // 5. Itera sobre el esquema para reparar o copiar los valores.
    for (const prop in esquemaNota) {
        const { type, defaultValue } = esquemaNota[prop];

        // Verifica si la propiedad del JSON existe y tiene el tipo correcto.
        // if (notaJSON.hasOwnProperty(prop) && (typeof notaJSON[prop] === type || (Array.isArray(type) && type.includes(typeof notaJSON[prop])))) {
        if (Object.prototype.hasOwnProperty.call(notaJSON, prop) && (typeof notaJSON[prop] === type || (Array.isArray(type) && type.includes(typeof notaJSON[prop])))) {
            // Si la propiedad existe y es del tipo correcto, la copia al objeto reparado.
            notaReparada[prop] = notaJSON[prop];
        } else {
            // Si la propiedad falta o tiene el tipo incorrecto, la resetea a su valor por defecto.
            console.warn(`Reparando JSON: La propiedad '${prop}' se reseteó a su valor por defecto debido a un error.`);
            // Si el valor por defecto es una función, la ejecutamos para obtener un valor dinámico.
            // De lo contrario, usamos el valor estático.
            notaReparada[prop] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        }
    }

    // 6. Verificación final específica para el campo 'status'.
    // Si el estado no es uno de los valores válidos, se establece en 'active'.
    if (notaReparada.status !== 'active' && notaReparada.status !== 'trashed') {
        console.warn(`Reparando JSON: El estado '${notaReparada.status}' no es válido. Se establecerá en 'active'.`);
        notaReparada.status = 'active';
    }

    // 7. Retorna el objeto JSON reparado.
    return notaReparada;
};




// FUNCION PARA VALIDAR ID O EN CASO DE SER UN ELEMENTO DEL HTML ENTONCES CONVERTIRLO A ID 
// No lo uso mucho pero puede ser util si quiero ser mas estrcito.
export const validarIDOConvertirElemento = (identificador) => {
    if (typeof identificador === 'string' || identificador instanceof String) {
        const elemento = document.getElementById(identificador);
        if (elemento) {
            // console.log(`El identificador \"${identificador}\" corresponde a un elemento HTML.`);
            return elemento.id;
        } else {
            // console.warn(`\"${identificador}\" parece un ID, pero no se encontró un elemento con ese ID.`);
            return null;
        }
    }
    else if (identificador instanceof HTMLElement) {
        if (identificador.id) {
            // console.log(`Se pasó un elemento HTML con ID: ${identificador.id}`);
            return identificador.id;
        } else {
            // console.warn("Se pasó un elemento HTML, pero no tiene un atributo ID.");
            return null;
        }
    }
    else {
        // console.error("El valor proporcionado no es un ID válido ni un elemento HTML.");
        return null;
    }
};

















// // Funcion para extraer el ID de un elemento del DOM o buscar un ID y comprobar si existe.
// export const validarIDOConvertirElemento = (identificador) => {
//     if (typeof identificador === 'string' || identificador instanceof String) {
//         const elemento = document.getElementById(identificador);
//         if (elemento) {
//             return elemento.id;
//         } else {
//             return null;
//         }
//     }
//     else if (identificador instanceof HTMLElement) {
//         if (identificador.id) {
//             return identificador.id;
//         } else {
//             return null;
//         }
//     }
//     else {
//         return null;
//     }
// };





// // COLOCA EL CURSOR AL FINAL DE UN ELEMENTO EDITABLE
// const focusAndSetCursorAtEnd = (element) => {
//     if (!element) return;

//     // 1. Darle foco al elemento para que esté activo.
//     element.focus();

//     // 2. Crear un 'range' (un rango o selección de texto).
//     const range = document.createRange();

//     // 3. Obtener el objeto de selección del navegador.
//     const selection = window.getSelection();

//     // 4. Seleccionar todo el contenido dentro del elemento.
//     range.selectNodeContents(element);

//     // 5. Colapsar el rango al final. El 'false' indica que se mueva al punto final.
//     range.collapse(false);

//     // 6. Limpiar cualquier selección anterior y aplicar nuestro nuevo rango (que ahora es solo el cursor).
//     selection.removeAllRanges();
//     selection.addRange(range);
// };
