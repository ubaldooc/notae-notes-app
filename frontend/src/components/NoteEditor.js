


import DOMPurify from 'dompurify';

import { formatFecha, validarORestauraNotaJSON, toPastelColorBkgnd } from '../utils.js';
import { guardarNotaEnDB } from '../services/db.js';
import { renderizarNotaEnDOM, verificarYReubicarNota } from './NoteCard.js';




// Elementos del editor
const modalNote = document.getElementById("modal-editor");
const editor = document.getElementById("editor");
const editorTitle = document.getElementById("editor-title");
const editorBody = document.getElementById("editor-body");
const editorCreation = document.getElementById("editor-creation");
const editorLastMod = document.getElementById("editor-last-mod");
const editorcharCounter = document.getElementById("editor-character-counter");
const editorPinnedIcon = document.getElementById("editor-pinned");
const editorUnpinnedIcon = document.getElementById("editor-unpinned");
const editorPinNote = document.getElementById("editor-pin");
const editorGroupColor = document.getElementById("editor-group-color");
const editorGroupName = document.getElementById("editor-group-name");


// Valores de grupo por defefcto
const groupNameDefault = "Sin grupo";
const groupColorDefault = "#f6f2ea";


// VARIABLE DONDE SE ALMACENAN LOS DATOS DE LA NOTA QUE USA EL EDITOR
let notaActualGlobal = null;


// LIMPIA TODO EL EDITOR PARA USARLO NUEVO
const limpiarEditor = () => {
    editorTitle.textContent = "";
    editorBody.textContent = "";
    editorCreation.textContent = "";
    editorLastMod.textContent = "";
    editorcharCounter.textContent = 0;
    editorGroupColor.style.backgroundColor = groupColorDefault || "#f6f2ea";
    editorGroupName.textContent = groupNameDefault || "Sin grupo";
    editor.style.backgroundColor = toPastelColorBkgnd(groupColorDefault || "#f6f2ea");
    editor.dataset.groupId = null;
    editor.dataset.noteId = null;
    notaActualGlobal = null;
    setTimeout(() => focusAndSetCursorAtEnd(editorBody), 50);
};


// ACTUALIZA EL PIN DE LAS NOTAS FIJADAS O DESFIJADAS
let setPinnedJson = (isPinned) => {
    isPinned = notaActualGlobal.pinned;
    if (isPinned === true) {
        editorPinnedIcon.classList.remove('active');
        editorUnpinnedIcon.classList.add('active');
        notaActualGlobal.pinned = true;
    } else if (isPinned === false) {
        editorPinnedIcon.classList.add('active');
        editorUnpinnedIcon.classList.remove('active');
        notaActualGlobal.pinned = false;
    } else {
        console.log("El estado del pin es incorrecto");
    }
}


// PLACEHOLDERS DEL TITULO Y BODY DEL EDITOR
const actualizarPlaceholders = () => {
    if (editorTitle.textContent.length === 0) {
        editorTitle.classList.add("active");
    } else {
        editorTitle.classList.remove("active");
    }

    if (editorBody.textContent.length === 0) {
        editorBody.classList.add("active");
    } else {
        editorBody.classList.remove("active");
    }
};


// LISTENERS NECESARIOS PARA EL FUNCIONAMIENTO DEL EDITOR Y SUS BOTONES E INPUTS
const inicializarEditoresListeners = () => {
    editorPinNote.addEventListener("click", () => {
        if (notaActualGlobal.pinned === true) {
            notaActualGlobal.pinned = false;
            setPinnedJson();
        } else if (notaActualGlobal.pinned === false) {
            notaActualGlobal.pinned = true;
            setPinnedJson();
        } else {
            console.log("Hay un problema con el valor del pin");
        }
    })

    editorTitle.addEventListener("input", (event) => {
        if (notaActualGlobal) {
            notaActualGlobal.title = event.target.textContent;
            notaActualGlobal.updatedAt = new Date().toISOString();
            editorLastMod.textContent = `Ultima edición: ${formatFecha(notaActualGlobal.updatedAt)}`;
            actualizarPlaceholders();
        }
    });

    editorBody.addEventListener("input", (event) => {
        if (notaActualGlobal) {
            notaActualGlobal.body = event.target.textContent;
            notaActualGlobal.updatedAt = new Date().toISOString();
            editorLastMod.textContent = `Ultima edición: ${formatFecha(notaActualGlobal.updatedAt)}`;
            notaActualGlobal.charCount = notaActualGlobal.body.length;
            editorcharCounter.textContent = notaActualGlobal.charCount;
            actualizarPlaceholders();
        }
    });

    editorTitle.addEventListener("beforeinput", (event) => {
        if (editorTitle.textContent.length >= 280 && event.inputType !== "deleteContentBackward") {
            event.preventDefault();
            editorTitle.style.outline = "1px solid red";
        } else {
            editorTitle.style.outline = "none";
        }
    });

    editorBody.addEventListener("beforeinput", (event) => {
        if (editorBody.textContent.length >= 280000 && event.inputType !== "deleteContentBackward") {
            event.preventDefault();
            editorBody.style.outline = "1px solid red";
        } else {
            editorBody.style.outline = "none";
        }
    });

    editorTitle.addEventListener("paste", (e) => {
        e.preventDefault();
        const textoPlano = (e.clipboardData || window.clipboardData).getData("text");
        editorTitle.innerHTML = DOMPurify.sanitize(textoPlano);
        editorTitle.dispatchEvent(new Event("input"));
    });

    const setupPasteHandler = (editorElement) => {
        editorElement.addEventListener("paste", (event) => {
            event.preventDefault();
            const clipboardData = event.clipboardData;
            let textPlain = clipboardData.getData("text/plain");
            const htmlPasted = clipboardData.getData("text/html");
            let contentToPaste = textPlain;
            textPlain = textPlain.trim();
            if (htmlPasted) {
                contentToPaste = DOMPurify.sanitize(htmlPasted.trim());
            }
            contentToPaste = contentToPaste.trimStart();
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const fragment = range.createContextualFragment(contentToPaste);
            const marker = document.createElement('span');
            marker.style.position = 'relative';
            marker.style.display = 'inline';
            marker.style.opacity = '0';
            fragment.appendChild(marker);
            range.insertNode(fragment);
            range.setStartBefore(marker);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            marker.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
            setTimeout(() => {
                if (marker.parentNode) {
                    marker.parentNode.removeChild(marker);
                }
            }, 100);
            editorElement.focus();
            editorElement.dispatchEvent(new Event("input", { bubbles: true }));
        });
    }

    const myEditor = document.getElementById("editor-body");
    if (myEditor) {
        setupPasteHandler(myEditor);
    }

    editorBody.addEventListener("focus", function (event) {
        let div = this;
        let range = document.createRange();
        let selection = window.getSelection();
        if (event.relatedTarget) {
            if (div.childNodes.length > 0) {
                range.selectNodeContents(div);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    });
};



// FUNCION PARA POSICIONAR EL CURSOR AL FINAL DE UN CAMPO DE TEXTO
const focusAndSetCursorAtEnd = (element) => {
    if (!element) return;
    element.focus();
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
};





// ABRIR EL EDITOR 
export const abrirEditorNota = (notaJSON = null) => {    
    limpiarEditor();
    if (!notaJSON) {
        notaActualGlobal = {
            id: `note-${crypto.randomUUID()}`,
            title: "",
            body: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            charCount: 0,
            pinned: false,
            groupId: null,
        };
    } else {
        const notaValidada = validarORestauraNotaJSON(notaJSON);
        if (notaValidada) {
            notaActualGlobal = notaValidada;
        } else {
            console.warn("El JSON es inválido. Creando una nueva nota.")
            notaActualGlobal = {
                id: `note-${crypto.randomUUID()}`,
                title: "",
                body: "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                charCount: 0,
                pinned: false,
                groupId: null,
            };
        }
    }
    colorearActualizarGrupoEditor(notaActualGlobal.groupId)
    setTimeout(() => focusAndSetCursorAtEnd(editorBody), 50);
    modalNote.classList.add("active");
    editor.classList.add("active");
    editorTitle.innerHTML = DOMPurify.sanitize(notaActualGlobal.title);
    editorBody.innerHTML = DOMPurify.sanitize(notaActualGlobal.body);
    editorCreation.textContent = `Creada: ${formatFecha(notaActualGlobal.createdAt)}`;
    editorLastMod.textContent = `Ultima edición: ${formatFecha(notaActualGlobal.updatedAt)}`;
    editorcharCounter.textContent = notaActualGlobal.charCount;
    setPinnedJson(notaActualGlobal.pinned);
    // Asignar dataset de grupo y colorear editor
    if (notaActualGlobal.groupId) {
        editor.dataset.groupId = notaActualGlobal.groupId;
        colorearActualizarGrupoEditor(notaActualGlobal.groupId);
    } else {
        editor.dataset.groupId = null;
        colorearActualizarGrupoEditor(null);
    }
    // Asignar dataset de nota
    if (notaActualGlobal.id) {
        editor.dataset.noteId = notaActualGlobal.id;
    } else {
        editor.dataset.noteId = null;
    }
    
    actualizarPlaceholders();
};


    // FUNCION PARA CERRAR EL EDITOR
export const cerrarEditorUI = () => {
    document.querySelector(".modal-editor").classList.remove("active");
    editor.classList.remove("active");
    notaActualGlobal = null;
};


// MOSTRAR JSON DE NOTA EN CONSOLA
export const infoJSONNota = (nota) => {
    console.log(`Nota con valores: ${JSON.stringify(nota, null, 2)}`);
};



// ACTUALIZAR ESTILOS DEL EDITOR POR GRUPO
export const colorearActualizarGrupoEditor = (groupID, groupColor, groupName) => {

    if (editor.dataset.groupId === groupID) {
        
        if (notaActualGlobal) {
            notaActualGlobal.groupId = groupID;
        }

        if (groupID === null || groupID === undefined) {
            editorGroupColor.style.backgroundColor = groupColorDefault || "#f6f2ea";
            editorGroupName.textContent = groupNameDefault || "Sin grupo";
            let editorBckgndColor = toPastelColorBkgnd(groupColorDefault || "#f6f2ea");
            editor.style.backgroundColor = editorBckgndColor;
            editor.dataset.groupId = null;
            return;
        }

        let finalGroupName = groupName;
        let finalGroupColor = groupColor;

        if (!groupName) {
            const group = document.getElementById(groupID);
            if (group) {
                finalGroupName = group.querySelector(".group-name")?.textContent.trim() || "Nombre no encontrado";
            } else {
                console.log("No se pudo encontrar el grupo para obtener su nombre.");
                editorGroupColor.style.backgroundColor = groupColorDefault || "#f6f2ea";
                editorGroupName.textContent = groupNameDefault || "Sin grupo";
                let editorBckgndColor = toPastelColorBkgnd(groupColorDefault || "#f6f2ea");
                editor.style.backgroundColor = editorBckgndColor;
                if (notaActualGlobal) notaActualGlobal.groupId = null;
                editor.dataset.groupId = null;
                return;
            }
        }

        if (!groupColor) {
            const group = document.getElementById(groupID);
            if (group) {
                finalGroupColor = window.getComputedStyle(group.querySelector(".group-color-selector"))?.backgroundColor || "Color no encontrado";
            } else {
                console.log("No se pudo encontrar el grupo para obtener su color.");
                return;
            }
        }
        editorGroupColor.style.backgroundColor = finalGroupColor;
        editorGroupName.innerHTML = `Grupo: ${DOMPurify.sanitize(finalGroupName)}`;
        editor.dataset.groupId = groupID;

        let editorBckgndColor = toPastelColorBkgnd(finalGroupColor);
        editor.style.backgroundColor = editorBckgndColor;
    } else {
        return
    }
};


// INICIALIZAR LISTENERS Y BOTONES DEL EDITOR
inicializarEditoresListeners();





// // Llamada de prueba
// const notaEjemplo = { id: 12321, title: "Mi nota prrona 1", body: "Texto aquí texto alla, muevelo alv", createdAt: "2024-02-06T07:41:00Z", updatedAt: "2025-06-06T07:41:00Z", charCount: 20, pinned: true, groupId: 99999};
// setTimeout(() => {
//     abrirEditorNota(notaEjemplo);    
// }, 100);

// const notaReparable = { id: 12321, title: "Mi nota prrona 1", body: "Texto aquí texto alla, muevelo alv", createdAt: 767676, updatedAt: "2025-06-06T07:41:00Z", pinned: true};
// const notaConErrores = { id: 456, title: "Nota con errores", body: 12345, createdAt: "2024-02-06T07:41:00Z", pinned: "cierto"}; // 'body' tiene tipo incorrecto, 'groupId' falta.

// const notaValidada = validarORestauraNotaJSON(notaEjemplo);
// const reparada = validarORestauraNotaJSON(notaEjemplo);
// infoJSONNota(reparada);





// GUARDAR NOTA
export const guardarNota = async (notaJSON) => {
    const notaValida = validarORestauraNotaJSON(notaJSON);

    if (notaValida) {
        try {
            await guardarNotaEnDB(notaValida);
            renderizarNotaEnDOM(notaValida);
            // reordenarNotasEnDOM();
            
        } catch (error) {
            console.error("Error en el proceso de guardado:", error);
        }
    } else {
        console.error("El JSON de la nota no es válido y no se pudo reparar.");
    }
};



// INICIALIZAR LOSLISTENERS DEL EDITOR
export const initNoteEditor = () => {

        // Abrir el editor de notas o guardar si se presiona y ya hay una nota abierta
    const addNoteButton = document.getElementById('add-note-btn');
    addNoteButton.addEventListener("click", ()=> {
        // console.log("editor abierto");

        if (!document.querySelector(".modal-editor").classList.contains("active")) {
            abrirEditorNota();
        } else if (document.querySelector(".modal-editor").classList.contains("active")) {
            if (notaActualGlobal) {
                if (editorTitle.textContent.length === 0 && editorBody.textContent.length === 0) {
                    console.log("Ya tienes una nota vacia");
                } else {
                    guardarNota(notaActualGlobal);
    
                    infoJSONNota(notaActualGlobal);
                    abrirEditorNota();
                }
            }
        }
    });


        // GUARDAR NOTA DEL EDITOR MEDIANTE CTRL + ENTER
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            if (document.querySelector(".modal-editor").classList.contains("active") && notaActualGlobal) {
                if (notaActualGlobal.title.length === 0 && notaActualGlobal.body.length === 0) {
                    console.log("Nota vacia descartada");
                    cerrarEditorUI();
                } else {
                    guardarNota(notaActualGlobal);
    
                    infoJSONNota(notaActualGlobal); 
                    abrirEditorNota();
    
                }
            }
        }
    });

    
        // GUARDAR NOTA DEL EDITOR MEDIANTE BOTON GUARDAR
    const editorSaveNote = document.querySelector(".editor-save-btn");
    editorSaveNote.addEventListener("click", () => {
        if (notaActualGlobal) { 
            if (notaActualGlobal.title.length === 0 && notaActualGlobal.body.length === 0) {
                console.log("Nota vacia descartada");
            } else {
                guardarNota(notaActualGlobal);
    
                infoJSONNota(notaActualGlobal);
            }
            cerrarEditorUI(); 
        }
    });

        
        // GUARDAR NOTA DEL EDITOR MEDIANTE CLICK EN EL MODAL
    // const modalNote = document.getElementById("modal-editor");
    modalNote.addEventListener("click", (event) => {
        if (event.target.classList.contains("modal-editor")) {
            if (notaActualGlobal) {
                if (notaActualGlobal.title.length === 0 && notaActualGlobal.body.length === 0) {
                    console.log("Nota vacia descartada");
                } else {
                    // guardarNota(notaActualGlobal, gridInstance);
                    guardarNota(notaActualGlobal);

                    infoJSONNota(notaActualGlobal);
                }
                cerrarEditorUI();
            }
        }
    });


    console.log("initNoteEditor cargado correctamente");
    
}




