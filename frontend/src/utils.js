

import { gridUnpinned } from "./main";




const aside = document.querySelector(".aside");
const main = document.querySelector(".main");
const AsideMenuHam = document.getElementById("aside__menuham");

if (localStorage.getItem("aside") === "true") {
    aside.classList.add("aside-hidden");
    main.classList.add("main-grow");
} else if (localStorage.getItem("aside") === "false") {
    aside.classList.remove("aside-hidden");
    main.classList.remove("main-grow");
}

export const activarAside = () => {

    // main.classList.remove("no-transition");
    // aside.classList.remove("no-transition");
    aside.classList.add("transition-activate");
    main.classList.add("transition-activate");

    aside.classList.toggle("aside-hidden");

    if (aside.classList.contains("aside-hidden")) {
        localStorage.setItem("aside", "true");
        // aside.classList.add("aside-hidden");
        main.classList.add("main-grow");
    } else {
        localStorage.setItem("aside", "false");
        main.classList.remove("main-grow");
    }

    // grid.refreshItems();
    // grid.layout();
}

// AsideMenuHam.addEventListener("click", activarAside);





export const initUtils = () => {
    AsideMenuHam.addEventListener("click", activarAside);
}



// CONVIERTE COLOR A COLORES PASTEL PARA EL BACKGROUND DE LAS NOTAS
export const toPastelColorBkgnd = (colorString) => {
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

    // Modificar el color para hacerlo más pastel (osea acercarlo a blanco)
    let pastelFactor = 0.7;
    r = Math.min(255, Math.round(r + (255 - r) * pastelFactor));
    g = Math.min(255, Math.round(g + (255 - g) * pastelFactor));
    b = Math.min(255, Math.round(b + (255 - b) * pastelFactor));

    return `rgba(${r}, ${g}, ${b}, ${a})`;
};


// FORMATO DE FECHA COMODO PARA EDITOR Y OTRAS COSAS
export const formatFecha = (fechaISO)=> {
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
export const formatFechaNoteCard = (fechaISO)=> {
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
        id: { type: 'string', defaultValue: `note-${crypto.randomUUID()}` },
        title: { type: 'string', defaultValue: "" },
        body: { type: 'string', defaultValue: "" },
        createdAt: { type: 'string', defaultValue: new Date().toISOString() },
        updatedAt: { type: 'string', defaultValue: new Date().toISOString() },
        charCount: { type: 'number', defaultValue: 0 },
        pinned: { type: 'boolean', defaultValue: false },
        groupId: { type: ['string', 'object'], defaultValue: null } // groupId puede ser un string o nulo (typeof null es 'object').
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
            notaReparada[prop] = defaultValue;
        }
    }

    // 6. Retorna el objeto JSON reparado.
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





