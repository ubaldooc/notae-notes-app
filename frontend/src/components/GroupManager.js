
import DOMPurify from 'dompurify';
import Sortable from 'sortablejs';


import { guardarGrupoEnDB, eliminarGrupoDeDB, actualizarPropiedadesGrupoEnDB, actualizarOrdenGruposEnDB, 
        obtenerNotaPorIdDesdeDB, guardarNotaEnDB } from '../services/db.js';

import { colorearActualizarGrupoEditor } from './NoteEditor.js';

// import { actualizarInfoGrupoEnNoteCards, actualizarInfoGrupoEnNoteCardspecific, filtrarNotasPorGrupo } from './NoteCard.js';
import { actualizarInfoGrupoEnNoteCards, actualizarInfoGrupoEnNoteCardspecific } from './NoteCard.js';

import { validarIDOConvertirElemento } from '../utils.js';

import { handleFilter, actualizarGrupoActivoUI } from './Filters.js';

import Muuri from 'muuri';

import { gridUnpinned } from '../main.js';

// Valores de grupo por defefcto
const groupNameDefault = "Sin grupo";
const groupColorDefault = "#f6f2ea";


const aside = document.querySelector(".aside");
const main = document.querySelector(".main");
const AsideMenuHam = document.getElementById("aside__menuham");


// Elementos del editor
const modalNote = document.getElementById("modal-editor");
const editorNoteContainer = document.querySelector(".editor-container");
const editor = document.getElementById("editor");

const editorGroupName = document.getElementById("editor-group-name");
const editorGroupColor = document.getElementById("editor-group-color");
const editorColorSelector = document.querySelector(".editor-color-selector");

const editorPinNote = document.getElementById("editor-pin");
const editorPinnedIcon = document.getElementById("editor-pinned");
const editorUnpinnedIcon = document.getElementById("editor-unpinned");

const editorSaveNote = document.getElementById("editor-save-btn");
const guardarEditorNoteBtn = document.querySelector(".editor-save-btn");

const editorTitle = document.getElementById("editor-title");   
const editorBody = document.getElementById("editor-body");
const editorCreation = document.getElementById("editor-creation");
const editorLastMod = document.getElementById("editor-last-mod");
const editorcharCounter = document.getElementById("editor-character-counter");

// Contenedor de todas las notas
// const allNotesContainer = document.getElementById("all-notes-container");






// const actualizarLayout = ()=> {
//     grid.layout();
//     grid.refreshItems();
// }



// let notaActualGlobal = null;






// ACTIVAR EL ASIDE
const activarAside = () => {
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

}





// REENDERIZAR NOTAS EN EL DOM
export const renderizarGrupoEnDOM = (groupData) => {
    const { id, name, color } = groupData;

    const groupElement = document.createElement("li");
    groupElement.classList.add("notes-group");
    groupElement.id = id;

    const groupOptionsSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    groupOptionsSVG.classList.add("group-svg", "groupOptionsSVG");
    groupOptionsSVG.setAttribute("width", "100px");
    groupOptionsSVG.setAttribute("height", "100px");
    groupOptionsSVG.setAttribute("viewBox", "0 0 24 24");
    groupOptionsSVG.setAttribute("fill", "#000000");
    groupOptionsSVG.innerHTML = `<g id="SVGRepo_bgCarrier" stroke-width="0"></g>
        <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g>
        <g id="SVGRepo_iconCarrier">
            <path d="M19 13C19.5523 13 20 12.5523 20 12C20 11.4477 19.5523 11 19 11C18.4477 11 18 11.4477 18 12C18 12.5523 18.4477 13 19 13Z" stroke="#828282" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke="#828282" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M5 13C5.55228 13 6 12.5523 6 12C6 11.4477 5.55228 11 5 11C4.44772 11 4 11.4477 4 12C4 12.5523 4.44772 13 5 13Z" stroke="#828282" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </g>`;

    const colorSelector = document.createElement("div");
    colorSelector.classList.add("group-color-selector");
    colorSelector.style.backgroundColor = color;

    const groupName = document.createElement("span");
    groupName.classList.add("group-name");
    groupName.textContent = name;

    const colorIndicator = document.createElement("div");
    colorIndicator.classList.add("group-color-indicator");
    colorIndicator.style.backgroundColor = color;

    groupElement.append(groupOptionsSVG, colorSelector, groupName, colorIndicator);

    const groupsContainer = document.querySelector(".notes-group__container");
    groupsContainer.appendChild(groupElement);
};




// DRAG AND DROP GRUPOS
export const inicializarDragAndDropGrupos = () => {
    const groupsContainer = document.querySelector(".notes-group__container");
    if (!groupsContainer) return;

    new Sortable(groupsContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: async () => {
            const items = Array.from(groupsContainer.children);
            const gruposActualizados = items.map((item, index) => {
                // Solo necesitamos el 'id' del elemento y su nueva posición ('index')
                // para actualizar el orden en la base de datos.
                return {
                    id: item.id,
                    order: index
                };
            });
            try {
                await actualizarOrdenGruposEnDB(gruposActualizados);
            } catch (error) {
                console.error("Fallo al guardar el nuevo orden de los grupos:", error);
            }
        }
    });
};




// CREAR JSON GRUPO
export const crearGrupo = async () => {
    document.querySelector(".aside").classList.remove("aside-hidden");
    document.querySelector(".main").classList.remove("main-grow");

    // Expandir el aside al añadir un grupo en caso de que este cerrado.
    if (document.querySelector(".aside").classList.contains("aside-hidden")) {
        activarAside();
    }

    if (document.querySelector(".notes-group__container").querySelectorAll(".notes-group").length >= 16) {
        alert("Has alcanzado el límite de 16 grupos.");
        return;
    }

    // Crear estructura del grupo
    const groupID = `group-${crypto.randomUUID()}`;
    const numGruposActual = document.querySelector(".notes-group__container").children.length;

    const newGroupData = {
        id: groupID,
        name: "",
        color: "#f6f2ea",
        order: numGruposActual
    };

    await guardarGrupoEnDB(newGroupData);
    renderizarGrupoEnDOM(newGroupData);
    renombrarGrupo(groupID);
};



// RENOMBRAR GRUPO
export const renombrarGrupo = (groupID) => {
    if (groupID instanceof HTMLElement) {
        groupID = groupID.id;
    }

    const grupoTarget = document.getElementById(groupID);
    const nameTarget = grupoTarget.querySelector(".group-name");
    nameTarget.contentEditable = true;
    nameTarget.setAttribute("autocorrect", "off");
    nameTarget.setAttribute("spellcheck", "false");
    nameTarget.style.outline = "2px solid blue";
    nameTarget.style.background = "#fff";
    nameTarget.style.color = "#000";

    const placeholderDiv = document.createElement("div");
    placeholderDiv.classList.add("group-name-placeholder");
    placeholderDiv.innerText = nameTarget.innerText.trim() === "" ? "Escribe un nombre" : "";
    placeholderDiv.style.position = "absolute";
    placeholderDiv.style.left = "76px";
    placeholderDiv.style.top = "20%";
    placeholderDiv.style.color = "#aaa";
    placeholderDiv.style.fontSize = "14px";
    placeholderDiv.style.alignContent = "center";
    placeholderDiv.style.width = "136px";
    placeholderDiv.style.height = "24px";
    placeholderDiv.style.whiteSpace = "nowrap";
    placeholderDiv.style.paddingLeft = "4px";
    placeholderDiv.style.pointerEvents = "none";
    placeholderDiv.style.userSelect = "none";

    grupoTarget.appendChild(placeholderDiv);

    nameTarget.addEventListener("input", () => {
        placeholderDiv.style.display = nameTarget.innerText.trim() === "" ? "block" : "none";
    });

    nameTarget.addEventListener("beforeinput", (event) => {
        const selection = window.getSelection();
        const isReplacingSelection = !selection.isCollapsed;

        if (nameTarget.textContent.length >= 18 && event.inputType !== "deleteContentBackward" && !isReplacingSelection) {
            event.preventDefault();
            nameTarget.style.outline = "2px solid red";
        } else {
            nameTarget.style.outline = "2px solid blue";
        }
    });

    const closeEditing = async () => {
        const finalName = nameTarget.textContent.trim() || "Nuevo Grupo";
        nameTarget.textContent = finalName;
        nameTarget.contentEditable = false;
        nameTarget.style.outline = "none";
        nameTarget.style.background = "none";
        nameTarget.style.color = "";
        window.getSelection().removeAllRanges();
        placeholderDiv.remove();

        try {
            await actualizarPropiedadesGrupoEnDB(groupID, { name: finalName });
            // Actualizamos el nombre en todas las tarjetas de nota asociadas
            actualizarInfoGrupoEnNoteCards(groupID, { name: finalName });
        } catch (error) {
            console.error("Error al actualizar el nombre del grupo en la DB:", error);
        }

        window.requestAnimationFrame(() => {
            colorearActualizarGrupoEditor(groupID);
        });
    };

    nameTarget.addEventListener("blur", closeEditing);

    nameTarget.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            setTimeout(() => nameTarget.blur(), 0);
        }
    });

    nameTarget.addEventListener("focus", (event) => {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(event.target);
        selection.removeAllRanges();
        selection.addRange(range);
    });

    nameTarget.contentEditable = true;
    
    const grupoActivo = document.querySelector(".notes-group.active");

    // si te da problemas o tirones al renombrar un grupo, puedes intentar quitando el setTimeout.
    setTimeout(() => {
        nameTarget.focus();
    }, 0);

    if (grupoActivo) {
        grupoActivo.classList.add("active");
    }
};






// CAMBIAR COLOR DE GRUPO
export const cambiarColorGrupo = (groupID) => {
    const grupoTarget = document.getElementById(`${groupID}`);
    const colorSelectorTarget = grupoTarget.querySelector(".group-color-selector");
    const colorIndicatorTarget = grupoTarget.querySelector(".group-color-indicator");

    const colorDropdown = document.createElement("div");
    colorDropdown.classList.add("color-palette-dropdown");
    document.querySelector(".aside").appendChild(colorDropdown);

    const colors = ["#FF69B4", "#FF0000", "#FFA500", "#FFFF00", "#ADFF2F", "#008000", "#00FFFF", "#0000FF", "#8A2BE2", "#EE82EE", "#000000", "#E74C3C", "#C0392B", "#FF00FF", "#FF1493", "#F39C12", "#32CD32", "#2ECC71", "#008080", "#3498DB", "#00008B", "#4B0082", "#D2691E", "#800020", "#FF7F50", "#DC143C", "#F8BBD0", "#FFA07A", "#FFD700", "#00FF00", "#FFFACD", "#87CEEB", "#000080", "#E6E6FA", "#A0522D"];

    colors.forEach(color => {
        const colorOption = document.createElement("div");
        colorOption.classList.add("color-option");
        colorOption.setAttribute("data-color", color);
        colorOption.style.backgroundColor = color;
        colorDropdown.appendChild(colorOption);
    });

    colorDropdown.classList.toggle("active");

    const rect = colorSelectorTarget.getBoundingClientRect();
    colorDropdown.style.position = "absolute";
    colorDropdown.style.top = `calc(${rect.top + window.scrollY}px - 196px)`;
    colorDropdown.style.left = `calc(${rect.left + window.scrollX}px + 16px)`;
    

    colorDropdown.addEventListener("click", async (event) => {
        if (event.target.classList.contains("color-option")) {
            const selectedColor = event.target.getAttribute("data-color");
            colorSelectorTarget.style.backgroundColor = selectedColor;
            colorIndicatorTarget.style.backgroundColor = selectedColor;
            colorDropdown.classList.remove("active");

            try {
                await actualizarPropiedadesGrupoEnDB(groupID, { color: selectedColor });
            } catch (error) {
                console.error("Error al actualizar el color del grupo en la DB:", error);
            }

            colorearActualizarGrupoEditor(groupID, selectedColor);
            actualizarInfoGrupoEnNoteCards(groupID, { color: selectedColor });
        }
    });

    document.addEventListener("click", (event) => {
        if (!colorSelectorTarget.contains(event.target) && !colorDropdown.contains(event.target)) {
            colorDropdown.classList.remove("active");
        }
    });
};




// ELIMINAR GRUPO
export const eliminarGrupo = (identificadorGrupo) => {
    const groupID = validarIDOConvertirElemento(identificadorGrupo);

    if (!groupID) {
        console.error("No se pudo obtener un ID de grupo válido. La operación de eliminación ha sido cancelada.");
        return;
    }

    const grupoTarget = document.getElementById(groupID);

    if (grupoTarget) {
        const modal = document.getElementById('confirm-modal-delete-group');
        const confirmBtn = document.getElementById('confirmDeleteGroupBtn');
        const cancelBtn = document.getElementById('cancelDeleteGroupBtn');
        const closeBtn = document.querySelector('.delete-group-close-button');
        const modalMessage = modal.querySelector('p');

        const groupName = grupoTarget.querySelector(".group-name").textContent;
        const sanitizedGroupName = DOMPurify.sanitize(groupName);
        modalMessage.innerHTML = `¿Estás seguro de eliminar el grupo \"<span style=\"color: red; font-weight: bold;\">${sanitizedGroupName}</span>\"? Todas las notas del grupo se volverán notas sin grupo.`;
        modal.style.display = 'flex';
        confirmBtn.focus();

        // Función para manejar los eventos del teclado en el modal
        const handleModalKeys = (event) => {
            // 1. Cerrar el modal con la tecla Escape
            if (event.key === 'Escape') {
                closeModalAndCleanup();
            }

            // 2. Navegar entre botones con las flechas izquierda y derecha
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                event.preventDefault(); // Evita que la página se desplace
                if (document.activeElement === confirmBtn) {
                    cancelBtn.focus();
                } else {
                    confirmBtn.focus();
                }
            }
        };

        // Función centralizada para cerrar el modal y limpiar los listeners
        const closeModalAndCleanup = () => {
            modal.style.display = 'none';
            window.removeEventListener('keydown', handleModalKeys);
            // Limpiamos los onclick para evitar múltiples asignaciones si el modal se abre de nuevo
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
            modal.onclick = null;
        };

        // Añadimos el listener de teclado cuando se abre el modal
        window.addEventListener('keydown', handleModalKeys);

        confirmBtn.onclick = async () => {
            try {
                await eliminarGrupoDeDB(groupID);
                grupoTarget.remove();
                colorearActualizarGrupoEditor(null);
                actualizarInfoGrupoEnNoteCards(null, {});
                handleFilter('all');
                actualizarGrupoActivoUI('all');

                // Suponiendo que 'grid' es tu instancia de Muuri
                gridUnpinned.refreshItems().layout();
            } catch (error) {
                console.error(`Error al eliminar el grupo ${groupID} de la DB:`, error);
            }
            closeModalAndCleanup();
        };

        cancelBtn.onclick = closeModalAndCleanup;
        closeBtn.onclick = closeModalAndCleanup;

        // Cierra el modal si se hace clic fuera de su contenido
        modal.onclick = (event) => {
            if (event.target === modal) {
                closeModalAndCleanup();
            }
        };

    } else {
        console.error(`Error: No se encontró el grupo con ID ${groupID}`);
    }
};





// DROPDOWN DE OPCIONES DE GRUPO
const SVG_DELETE = `<svg viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><g id=\"SVGRepo_bgCarrier\" stroke-width=\"0\"></g><g id=\"SVGRepo_tracerCarrier\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></g><g id=\"SVGRepo_iconCarrier\"> <path d=\"M10 11V17\" stroke=\"#000000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path> <path d=\"M14 11V17\" stroke=\"#000000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path> <path d=\"M4 7H20\" stroke=\"#000000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path> <path d=\"M6 7H12H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z\" stroke=\"#000000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path> <path d=\"M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z\" stroke=\"#000000\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path> </g></svg>`;
const SVG_RENAME = `<svg viewBox=\"0 0 16 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><g id=\"SVGRepo_bgCarrier\" stroke-width=\"0\"></g><g id=\"SVGRepo_tracerCarrier\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke=\"#CCCCCC\" stroke-width=\"0.44800000000000006\"></g><g id=\"SVGRepo_iconCarrier\"> <path d=\"M6 8L2 8L2 6L8 5.24536e-07L14 6L14 8L10 8L10 16L6 16L6 8Z\" fill=\"#000000\"></path> </g></svg>`;
// const SVG_MOVE_UP = `<svg viewBox=\"0 0 16 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><g id=\"SVGRepo_bgCarrier\" stroke-width=\"0\"></g><g id=\"SVGRepo_tracerCarrier\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke=\"#CCCCCC\" stroke-width=\"0.44800000000000006\"></g><g id=\"SVGRepo_iconCarrier\"> <path d=\"M6 8L2 8L2 6L8 5.24536e-07L14 6L14 8L10 8L10 16L6 16L6 8Z\" fill=\"#000000\"></path> </g></svg>`;
// const SVG_MOVE_DOWN = `<svg viewBox=\"0 0 16 16\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><g id=\"SVGRepo_bgCarrier\" stroke-width=\"0\"></g><g id=\"SVGRepo_tracerCarrier\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></g><g id=\"SVGRepo_iconCarrier\"> <path d=\"M10 8L14 8V10L8 16L2 10V8H6V0L10 4.76995e-08V8Z\" fill=\"#000000\"></path> </g></svg>`;

const createOptionElement = (name, text, svg) => {
    const option = document.createElement("div");
    option.classList.add("group-option");
    option.dataset.groupOption = name;
    option.innerHTML = `${svg} <span>${text}</span>`;
    return option;
};

const positionDropdown = (dropdownElement, referenceElement, offsetTop = 0, offsetLeft = 0) => {
    const rect = referenceElement.getBoundingClientRect();
    dropdownElement.style.position = "absolute";
    dropdownElement.style.top = `${rect.top + window.scrollY + offsetTop}px`;
    dropdownElement.style.left = `${rect.left + window.scrollX + offsetLeft}px`;
};

export const opcionesGrupo = (groupID) => {
    const targetGroupId = groupID instanceof HTMLElement ? groupID.id : groupID;
    const grupoTarget = document.getElementById(targetGroupId);

    if (!grupoTarget) {
        console.error(`Error: No se encontró el grupo con ID \"${targetGroupId}\"`);
        return;
    }

    const svgTarget = grupoTarget.querySelector(".groupOptionsSVG");
    if (!svgTarget) {
        console.error(`Error: No se encontró el elemento \".groupOptionsSVG\" dentro del grupo con ID \"${targetGroupId}\"`);
        return;
    }

    let activeDropdown = document.querySelector(".group-options-dropdown.active");

    if (activeDropdown) {
        const currentDropdownGroupId = activeDropdown.dataset.groupId;
        if (currentDropdownGroupId === targetGroupId) {
            activeDropdown.remove();
            activeDropdown = null;
            return;
        } else {
            activeDropdown.remove();
        }
    }

    // Crear el dropdown
    const groupOptionsDropdown = document.createElement("div");
    groupOptionsDropdown.classList.add("group-options-dropdown");
    groupOptionsDropdown.dataset.groupId = targetGroupId;

    // Agregar opciones al dropdown
    groupOptionsDropdown.appendChild(createOptionElement("delete", "Eliminar grupo", SVG_DELETE));
    groupOptionsDropdown.appendChild(createOptionElement("rename", "Renombrar grupo", SVG_RENAME));
    // groupOptionsDropdown.appendChild(createOptionElement("moveUp", "Subir grupo", SVG_MOVE_UP));
    // groupOptionsDropdown.appendChild(createOptionElement("moveDown", "Bajar grupo", SVG_MOVE_DOWN));

    document.querySelector(".aside").appendChild(groupOptionsDropdown);

    // Posicionar el dropdown
    positionDropdown(groupOptionsDropdown, svgTarget, -120, 16);

    groupOptionsDropdown.classList.add("active");

    // Cierra y remueve el dropdown, y limpia los listeners.
    const closeAndRemoveDropdown = () => {
        groupOptionsDropdown.classList.remove("active");
        groupOptionsDropdown.remove();
        groupOptionsDropdown.removeEventListener("click", handleOptionClick);
        document.removeEventListener("click", handleOutsideClick);
        document.removeEventListener("keydown", handleKeydown);
    };

    const handleOptionClick = (event) => {
        const selectedOptionElement = event.target.closest(".group-option");
        if (selectedOptionElement) {
            const selectedOption = selectedOptionElement.dataset.groupOption;

            switch (selectedOption) {
                case "delete":
                    if (typeof eliminarGrupo === 'function') {
                        eliminarGrupo(grupoTarget);
                    }
                    // console.log("Acción para eliminar grupo");
                    break;
                case "rename":
                    if (typeof renombrarGrupo === 'function') {
                        renombrarGrupo(grupoTarget);
                    }
                    // console.log("Acción para renombrar grupo");
                    break;
                // case "moveUp":
                //     // console.log("Acción para subir grupo");
                //     break;
                // case "moveDown":
                //     // console.log("Acción para bajar grupo");
                //     break;
                default:
                    // console.log("Opción no reconocida");
            }
            closeAndRemoveDropdown();
        }
    };

    const handleOutsideClick = (event) => {
        if (!svgTarget.contains(event.target) && !groupOptionsDropdown.contains(event.target)) {
            closeAndRemoveDropdown();
        }
    };

    const handleKeydown = (event) => {
        if (event.key === "Escape") {
            closeAndRemoveDropdown();
        }
    };

    groupOptionsDropdown.addEventListener("click", handleOptionClick);
    document.addEventListener("click", handleOutsideClick);
    document.addEventListener("keydown", handleKeydown);
};






// // DRPODOWN CAMBIAR GRUPO PARA NOTAS Y EDITOR
// Variables globales para controlar el estado del dropdown
let currentVisibleDropdown = null;
let currentDropdownTargetId = null;

const closeDropdownHandler = (event) => {

    if (!currentVisibleDropdown) return;

    const clickedNoteButton = event.target.classList.contains("note-group-color");
    const editorGroupColor = document.getElementById("editor-group-color");
    const clickedEditorButton = editorGroupColor && editorGroupColor.contains(event.target);

    // Si el clic no fue en el propio dropdown Y no fue en el botón que lo abrió
    if (!currentVisibleDropdown.contains(event.target) && !clickedNoteButton && !clickedEditorButton) {
        currentVisibleDropdown.remove();
        document.removeEventListener("click", closeDropdownHandler);
        currentVisibleDropdown = null;
        currentDropdownTargetId = null;
    }
};

// Función principal dropdownCambiarGroup
export const dropdownCambiarGroup = (noteID_or_editorFlag) => {
    // Determinar si es una nota específica o el editor
    let isForNote = false;
    let targetID = null;
    if (noteID_or_editorFlag instanceof HTMLElement) {
        isForNote = true;
        targetID = noteID_or_editorFlag.id;
    } else if (typeof noteID_or_editorFlag === 'string') {
        isForNote = true;
        targetID = noteID_or_editorFlag;
    } else {
        isForNote = false;
        targetID = 'editor';
    }
    
    const currentContextId = isForNote ? targetID : 'editor';

    if (currentVisibleDropdown && currentDropdownTargetId === currentContextId) {
        currentVisibleDropdown.remove();
        document.removeEventListener("click", closeDropdownHandler);
        currentVisibleDropdown = null;
        currentDropdownTargetId = null;
        return;
    }

    // Si ya hay un dropdown abierto (pero para un contexto diferente), ciérralo primero
    if (currentVisibleDropdown && currentDropdownTargetId !== currentContextId) {
        currentVisibleDropdown.remove();
        document.removeEventListener("click", closeDropdownHandler);
        currentVisibleDropdown = null;
        currentDropdownTargetId = null;
    }

    const availableGroupsDropdown = document.createElement("div");
    availableGroupsDropdown.classList.add("available-groups-dropdown");
    availableGroupsDropdown.classList.add("active");

    currentVisibleDropdown = availableGroupsDropdown;
    currentDropdownTargetId = currentContextId;

    const createGroupOption = (id, name, color) => {
        const groupElement = document.createElement("div");
        groupElement.classList.add("available-groups");
        groupElement.id = id;

        const colorElement = document.createElement("div");
        colorElement.classList.add("available-group-color");
        colorElement.style.backgroundColor = color;

        const nameElement = document.createElement("span");
        nameElement.classList.add("available-group-name");
        nameElement.textContent = name;

        groupElement.appendChild(colorElement);
        groupElement.appendChild(nameElement);
        availableGroupsDropdown.appendChild(groupElement);

        // console.log(isForNote, targetID);

        groupElement.addEventListener("click", async () => {
            const selectedGroupId = id;
            const domGroupId = selectedGroupId === null ? 'null' : selectedGroupId;

            // Caso 1: Se está actualizando una nota existente.
            // Esto es verdad si el dropdown se abrió desde una tarjeta de nota o desde el editor con una nota cargada.
            if (isForNote && targetID) {
                const noteId = targetID;                

                // Actualizar en la base de datos
                const notaParaActualizar = await obtenerNotaPorIdDesdeDB(noteId);
                if (notaParaActualizar) {
                    notaParaActualizar.groupId = selectedGroupId;
                    await guardarNotaEnDB(notaParaActualizar);
                    console.log(`Nota ${noteId} actualizada con nuevo groupId: ${selectedGroupId}`);
                } else {
                    console.error(`No se encontró la nota con ID ${noteId} para actualizar.`);
                }

                // Actualizar la UI de la tarjeta de nota
                const noteCardElement = document.getElementById(noteId);
                if (noteCardElement) {
                    actualizarInfoGrupoEnNoteCardspecific(noteId, selectedGroupId);
                    noteCardElement.setAttribute('data-group-id', domGroupId);
                }

                // Si el editor está abierto para esta nota, actualizar su UI también
                if (editor && editor.classList.contains("active") && editor.dataset.noteId === noteId) {
                    editor.dataset.groupId = domGroupId;
                    colorearActualizarGrupoEditor(selectedGroupId);
                }

            } else { // Caso 2: Se está asignando un grupo a una nota nueva en el editor.
                if (editor && editor.classList.contains("active")) {
                    // Solo se actualiza el estado del editor. El groupId se guardará con la nota nueva.
                    editor.dataset.groupId = domGroupId;
                    colorearActualizarGrupoEditor(selectedGroupId);
                }
            }

            // Cerrar el dropdown
            if (currentVisibleDropdown) {
                currentVisibleDropdown.remove();
                document.removeEventListener("click", closeDropdownHandler);
                currentVisibleDropdown = null;
                currentDropdownTargetId = null;
            }
        });
    };

    createGroupOption(null, "Sin grupo", "#f6f2ea");

    const availableGroups = document.querySelectorAll(".notes-group");
    availableGroups.forEach(group => {
        const groupID = group.id;
        const groupName = group.querySelector(".group-name")?.textContent.trim() || "Nombre no encontrado";
        const groupColor = window.getComputedStyle(group.querySelector(".group-color-selector"))?.backgroundColor || "Color no encontrado";
        createGroupOption(groupID, groupName, groupColor);
    });

    console.log(isForNote, targetID);
    
    if (isForNote && targetID && !editor.classList.contains("active")) {
        const targetNote = document.getElementById(targetID);
        if (targetNote) {
            targetNote.appendChild(availableGroupsDropdown);
            availableGroupsDropdown.style.position = "absolute";
            availableGroupsDropdown.style.top = `8%`;
            availableGroupsDropdown.style.left = `18%`;
        } else {
            console.warn(`Note with ID ${targetID} not found.`);
            if (currentVisibleDropdown) {
                currentVisibleDropdown.remove();
                document.removeEventListener("click", closeDropdownHandler);
                currentVisibleDropdown = null;
                currentDropdownTargetId = null;
            }
            return;
        }

    } else if (isForNote && editor && editor.classList.contains("active")) {
        const editorGroup = document.getElementById("editor-group");
        if (editorGroup) {
            editorGroup.appendChild(availableGroupsDropdown);
            availableGroupsDropdown.style.position = "absolute";
            availableGroupsDropdown.style.top = `16px`;
            availableGroupsDropdown.style.left = `62px`;
        } else {
            console.warn("Editor group not found.");
            if (currentVisibleDropdown) {
                currentVisibleDropdown.remove();
                document.removeEventListener("click", closeDropdownHandler);
                currentVisibleDropdown = null;
                currentDropdownTargetId = null;
            }
            return;
        }
    } else if (!isForNote && editor && editor.classList.contains("active")) {
        const editorGroup = document.getElementById("editor-group");
        if (editorGroup) {
            editorGroup.appendChild(availableGroupsDropdown);
            availableGroupsDropdown.style.position = "absolute";
            availableGroupsDropdown.style.top = `16px`;
            availableGroupsDropdown.style.left = `62px`;
        } else {
            console.warn("Editor group not found.");
            if (currentVisibleDropdown) {
                currentVisibleDropdown.remove();
                document.removeEventListener("click", closeDropdownHandler);
                currentVisibleDropdown = null;
                currentDropdownTargetId = null;
            }
            return;
        }
    }

    // Remover el listener anterior y añadir el nuevo para evitar duplicados
    document.removeEventListener("click", closeDropdownHandler);
    document.addEventListener("click", closeDropdownHandler);
};


document.addEventListener("click", (event) => {
    if (event.target.classList.contains("note-group-color")) {
        const noteCardContainer = event.target.closest(".note-card-container");
        if (noteCardContainer) {
            dropdownCambiarGroup(noteCardContainer.id);
        } else {
            console.log("No se pudo encontrar el contenedor de la nota.");
        }
    }

    if (editorGroupColor && editor && editor.classList.contains("active") && editorGroupColor.contains(event.target)) {
        const noteCardEditorId = editor.dataset.noteId;
        const elementoEnDOM = document.getElementById(noteCardEditorId);
        if (elementoEnDOM) {
          dropdownCambiarGroup(noteCardEditorId);
        } else {
          dropdownCambiarGroup(null);
        }
    }
});













// INICIALIZAR LISTENERS DE ESTE ARCHIVO
export const initGroupManager = () => {
    
        // Botón de añadir grupo
    const addGroupButton = document.querySelector(".aside__add-group");
    if (addGroupButton) {
        addGroupButton.addEventListener("click", crearGrupo);
    };


        // Dropdown de color de grupo
    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("group-color-selector")) {
            const contenedorPadre = event.target.parentElement.id;
            cambiarColorGrupo(contenedorPadre);
        }
    });


        // Dropdown de opciones de grupo
    document.addEventListener("click", (event) => {
        const svgTarget = event.target.closest(".groupOptionsSVG");

        if (svgTarget) {
            const group = svgTarget.closest(".notes-group");

            if (group) {
                const noteID = group.id;
                // console.log('ID del notes-group más cercano:', noteID);
                opcionesGrupo(noteID);
            } else {
                console.log('Error: No se encontró el elemento ancestro del SVG.');
            }
        }
        // Si el clic no fue en un .groupOptionsSVG (ni en sus hijos), lu función opcionesGrupo
        // se encargará de cerrar cualquier dropdown abierto si es necesario.
    });




    console.log("GroupManager incializado");
    
};

