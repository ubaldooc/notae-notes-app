import DOMPurify from 'dompurify';
import { formatFechaNoteCard, generateDynamicBackgroundColor, validarIDOConvertirElemento, getSortFunction } from '../utils.js';
import { obtenerNotaPorIdDesdeDB, guardarNotaEnDB, moverNotaAPapeleraEnDB, restaurarNotaEnDB, eliminarNotaPermanentementeDeDB } from '../services/db.js';
import { abrirEditorNota, initNoteEditor } from './NoteEditor.js';
import { showNotification } from './Notifier.js';
import { Modal } from './ModalManager.js';
import { store } from '../services/store.js';


import Muuri from 'muuri';

import { gridUnpinned, gridPinned, gridTrash } from '../main.js';



// Elementos del DOM necesarios
// const allNotesContainer = document.getElementById("all-notes-container");


// Valores de grupo por defefcto
const groupNameDefault = "Sin grupo";
const groupColorDefault = "#f6f2ea";

const SVG_ICONS_TRASH = {
    RESTORE: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M12.5 8C9.81 8 7.45 8.99 5.6 10.6L2 7V16H11L7.38 12.38C8.77 11.22 10.54 10.5 12.5 10.5C16.04 10.5 19.05 12.81 20.1 16L22.47 15.2C21.07 10.83 17.15 8 12.5 8Z" fill="#000000"></path></g></svg>`,
    DELETE_PERMANENTLY: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10 11V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M14 11V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M4 7H20" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M6 7H12H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M19 5L5 19" stroke="#c02121" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`
};

/**
 * Genera el string HTML para una tarjeta de nota.
 * @param {object} noteData - Los datos de la nota.
 * @param {boolean} isTrashed - Si la nota está en la papelera.
 * @returns {string} El string HTML del elemento de la nota.
 */
const createNoteHTML = (noteData, isTrashed) => {
    const sanitizedTitle = DOMPurify.sanitize(noteData.title);
    const sanitizedBody = DOMPurify.sanitize(noteData.body);
    const lastModified = `Ultima edición: ${formatFechaNoteCard(noteData.updatedAt)}`;

    const pinIcons = `
        <div class="note-pin">
            <svg class="note-unpinned note-hidden-options" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: ${noteData.pinned ? 'none' : 'block'};"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M15.9894 4.9502L16.52 4.42014V4.42014L15.9894 4.9502ZM19.0716 8.03562L18.541 8.56568L19.0716 8.03562ZM8.73837 19.429L8.20777 19.9591L8.73837 19.429ZM4.62169 15.3081L5.15229 14.7781L4.62169 15.3081ZM17.5669 14.9943L17.3032 14.2922L17.5669 14.9943ZM15.6498 15.7146L15.9136 16.4167H15.9136L15.6498 15.7146ZM8.3322 8.38177L7.62798 8.12375L8.3322 8.38177ZM9.02665 6.48636L9.73087 6.74438V6.74438L9.02665 6.48636ZM5.84504 10.6735L6.04438 11.3965L5.84504 10.6735ZM7.30167 10.1351L6.86346 9.52646L6.86346 9.52646L7.30167 10.1351ZM7.67582 9.79038L8.24665 10.2768H8.24665L7.67582 9.79038ZM14.251 16.3805L14.742 16.9475L14.742 16.9475L14.251 16.3805ZM13.3806 18.2012L12.6574 18.0022V18.0022L13.3806 18.2012ZM13.9169 16.7466L13.3075 16.3094L13.3075 16.3094L13.9169 16.7466ZM2.71846 12.7552L1.96848 12.76L1.96848 12.76L2.71846 12.7552ZM2.93045 11.9521L2.28053 11.5778H2.28053L2.93045 11.9521ZM11.3052 21.3431L11.3064 20.5931H11.3064L11.3052 21.3431ZM12.0933 21.1347L11.7215 20.4833L11.7215 20.4833L12.0933 21.1347ZM11.6973 2.03606L11.8588 2.76845L11.6973 2.03606ZM1.4694 21.4699C1.17666 21.763 1.1769 22.2379 1.46994 22.5306C1.76298 22.8233 2.23786 22.8231 2.5306 22.5301L1.4694 21.4699ZM7.18383 17.8721C7.47657 17.5791 7.47633 17.1042 7.18329 16.8114C6.89024 16.5187 6.41537 16.5189 6.12263 16.812L7.18383 17.8721ZM15.4588 5.48026L18.541 8.56568L19.6022 7.50556L16.52 4.42014L15.4588 5.48026ZM9.26897 18.8989L5.15229 14.7781L4.09109 15.8382L8.20777 19.9591L9.26897 18.8989ZM17.3032 14.2922L15.386 15.0125L15.9136 16.4167L17.8307 15.6964L17.3032 14.2922ZM9.03642 8.63979L9.73087 6.74438L8.32243 6.22834L7.62798 8.12375L9.03642 8.63979ZM6.04438 11.3965C6.75583 11.2003 7.29719 11.0625 7.73987 10.7438L6.86346 9.52646C6.69053 9.65097 6.46601 9.72428 5.6457 9.95044L6.04438 11.3965ZM7.62798 8.12375C7.33502 8.92332 7.24338 9.14153 7.10499 9.30391L8.24665 10.2768C8.60041 9.86175 8.7823 9.33337 9.03642 8.63979L7.62798 8.12375ZM7.73987 10.7438C7.92696 10.6091 8.09712 10.4523 8.24665 10.2768L7.10499 9.30391C7.0337 9.38757 6.9526 9.46229 6.86346 9.52646L7.73987 10.7438ZM15.386 15.0125C14.697 15.2714 14.1716 15.4571 13.76 15.8135L14.742 16.9475C14.9028 16.8082 15.1192 16.7152 15.9136 16.4167L15.386 15.0125ZM14.1037 18.4001C14.329 17.5813 14.4021 17.3569 14.5263 17.1838L13.3075 16.3094C12.9902 16.7517 12.8529 17.2919 12.6574 18.0022L14.1037 18.4001ZM13.76 15.8135C13.5903 15.9605 13.4384 16.1269 13.3075 16.3094L14.5263 17.1838C14.5887 17.0968 14.6611 17.0175 14.742 16.9475L13.76 15.8135ZM5.15229 14.7781C4.50615 14.1313 4.06799 13.691 3.78366 13.3338C3.49835 12.9753 3.46889 12.8201 3.46845 12.7505L1.96848 12.76C1.97215 13.3422 2.26127 13.8297 2.61002 14.2679C2.95976 14.7073 3.47115 15.2176 4.09109 15.8382L5.15229 14.7781ZM5.6457 9.95044C4.80048 10.1835 4.10396 10.3743 3.58296 10.5835C3.06341 10.792 2.57116 11.0732 2.28053 11.5778L3.58038 12.3264C3.615 12.2663 3.71693 12.146 4.1418 11.9755C4.56523 11.8055 5.16337 11.6394 6.04438 11.3965L5.6457 9.95044ZM3.46845 12.7505C3.46751 12.6016 3.50616 12.4553 3.58038 12.3264L2.28053 11.5778C2.07354 11.9372 1.96586 12.3452 1.96848 12.76L3.46845 12.7505ZM8.20777 19.9591C8.83164 20.5836 9.34464 21.0987 9.78647 21.4506C10.227 21.8015 10.7179 22.0922 11.3041 22.0931L11.3064 20.5931C11.2369 20.593 11.0814 20.5644 10.721 20.2773C10.3618 19.9912 9.91923 19.5499 9.26897 18.8989L8.20777 19.9591ZM12.6574 18.0022C12.4133 18.8897 12.2462 19.4924 12.0751 19.9188C11.9033 20.3467 11.7821 20.4487 11.7215 20.4833L12.465 21.7861C12.974 21.4956 13.2573 21.0004 13.4671 20.4775C13.6776 19.9532 13.8694 19.2516 14.1037 18.4001L12.6574 18.0022ZM11.3041 22.0931C11.7112 22.0937 12.1114 21.9879 12.465 21.7861L11.7215 20.4833C11.595 20.5555 11.4519 20.5933 11.3064 20.5931L11.3041 22.0931ZM18.541 8.56568C19.6045 9.63022 20.3403 10.3695 20.7917 10.9788C21.2353 11.5774 21.2863 11.8959 21.2321 12.1464L22.6982 12.4634C22.8881 11.5854 22.5382 10.8162 21.9969 10.0857C21.4635 9.36592 20.6305 8.53486 19.6022 7.50556L18.541 8.56568ZM17.8307 15.6964C19.1921 15.1849 20.294 14.773 21.0771 14.3384C21.8718 13.8973 22.5083 13.3416 22.6982 12.4634L21.2321 12.1464C21.178 12.3968 21.0001 12.6655 20.3491 13.0268C19.6865 13.3946 18.7112 13.7632 17.3032 14.2922L17.8307 15.6964ZM16.52 4.42014C15.4841 3.3832 14.6481 2.54353 13.9246 2.00638C13.1908 1.46165 12.4175 1.10912 11.5357 1.30367L11.8588 2.76845C12.1086 2.71335 12.4277 2.7633 13.0304 3.21075C13.6433 3.66579 14.3876 4.40801 15.4588 5.48026L16.52 4.42014ZM9.73087 6.74438C10.2525 5.32075 10.6161 4.33403 10.9812 3.66315C11.3402 3.00338 11.609 2.82357 11.8588 2.76845L11.5357 1.30367C10.654 1.49819 10.1005 2.14332 9.66362 2.94618C9.23278 3.73793 8.82688 4.85154 8.32243 6.22834L9.73087 6.74438ZM2.5306 22.5301L7.18383 17.8721L6.12263 16.812L1.4694 21.4699L2.5306 22.5301Z" fill="#1C274C"></path></g></svg>
            <svg class="note-pinned" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: ${noteData.pinned ? 'block' : 'none'};"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M19.1835 7.80516L16.2188 4.83755C14.1921 2.8089 13.1788 1.79457 12.0904 2.03468C11.0021 2.2748 10.5086 3.62155 9.5217 6.31506L8.85373 8.1381C8.59063 8.85617 8.45908 9.2152 8.22239 9.49292C8.11619 9.61754 7.99536 9.72887 7.86251 9.82451C7.56644 10.0377 7.19811 10.1392 6.46145 10.3423C4.80107 10.8 3.97088 11.0289 3.65804 11.5721C3.5228 11.8069 3.45242 12.0735 3.45413 12.3446C3.45809 12.9715 4.06698 13.581 5.28476 14.8L6.69935 16.2163L2.22345 20.6964C1.92552 20.9946 1.92552 21.4782 2.22345 21.7764C2.52138 22.0746 3.00443 22.0746 3.30236 21.7764L7.77841 17.2961L9.24441 18.7635C10.4699 19.9902 11.0827 20.6036 11.7134 20.6045C11.9792 20.6049 12.2404 20.5358 12.4713 20.4041C13.0192 20.0914 13.2493 19.2551 13.7095 17.5825C13.9119 16.8472 14.013 16.4795 14.2254 16.1835C14.3184 16.054 14.4262 15.9358 14.5468 15.8314C14.8221 15.593 15.1788 15.459 15.8922 15.191L17.7362 14.4981C20.4 13.4973 21.7319 12.9969 21.9667 11.9115C22.2014 10.826 21.1954 9.81905 19.1835 7.80516Z" fill="#1C274C"></path></g></svg>
        </div>
    `;

    const optionsIcon = `<svg class="note-options-btn note-hidden-options" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" transform="rotate(90)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M7 12C7 13.1046 6.10457 14 5 14C3.89543 14 3 13.1046 3 12C3 10.8954 3.89543 10 5 10C6.10457 10 7 10.8954 7 12Z"></path><path d="M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z"></path><path d="M21 12C21 13.1046 20.1046 14 19 14C17.8954 14 17 13.1046 17 12C17 10.8954 17.8954 10 19 10C20.1046 10 21 10.8954 21 12Z"></path></g></svg>`;

    let rightSideTools = '';
    if (isTrashed) {
        rightSideTools = `
            <div class="note-trash-actions">
                <button title="Restaurar nota" class="note-trash-btn note-trash-restore-btn">${SVG_ICONS_TRASH.RESTORE}</button>
                <button title="Eliminar permanentemente" class="note-trash-btn note-trash-delete-btn">${SVG_ICONS_TRASH.DELETE_PERMANENTLY}</button>
            </div>
        `;
    } else {
        rightSideTools = `
            ${pinIcons}
            ${optionsIcon}
        `;
    }

    let deletionInfo = '';
    if (isTrashed) {
        const expirationDate = new Date(noteData.updatedAt);
        expirationDate.setDate(expirationDate.getDate() + 30);
        const daysRemaining = Math.ceil((expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        let text = 'Se eliminará pronto';
        if (daysRemaining > 1) text = `Se eliminará en ${daysRemaining} días`;
        else if (daysRemaining === 1) text = `Se eliminará en 1 día`;
        deletionInfo = `<div class="note-deletion-info">${text}</div>`;
    }

    return `
        <div class="note-card ${isTrashed ? 'is-trashed' : ''}">
            ${!isTrashed ? '<div class="note-multiple-selector note-hidden-options"></div>' : ''}
            <div class="note-tools-container">
                <div class="note-group">
                    <div class="note-group-color ${isTrashed ? 'disabled' : ''}"></div>
                    <div class="note-group-name"></div>
                </div>
                <div class="note-tools-right-side">
                    ${rightSideTools}
                </div>
            </div>
            <div class="note-text">
                <div class="note-title" spellcheck="false">${sanitizedTitle}</div>
                <div class="note-body" spellcheck="false">${sanitizedBody}</div>
            </div>
            <div class="note-footer">
                <div class="note-last-modified note-hidden-options">${lastModified}</div>
                ${deletionInfo}
            </div>
        </div>
    `;
};




/**
 * Actualiza o inserta una nota en el store despachando una acción.
 * @param {object} noteData - Los datos completos de la nota a actualizar o insertar.
 */
export const actualizarNotaEnStore = (noteData) => {
    store.dispatch({ type: 'UPSERT_NOTE', payload: noteData });
};

// REENDERIZAR LAS NOTE CARDS EN EL CONTENEDOR DE MUURI
export const renderizarNotaEnDOM = (noteData, { isTrashed = false } = {}) => {
    const existingNoteCard = document.getElementById(noteData.id);
    // --- LÓGICA DE ACTUALIZACIÓN (SI LA NOTA YA EXISTE) ---
    // Esto es mucho más eficiente que destruir y recrear el elemento.
    if (existingNoteCard) {
        // Actualiza los datasets que usa Muuri para ordenar y filtrar
        if (existingNoteCard.dataset.groupId !== noteData.groupId) {
            existingNoteCard.dataset.groupId = noteData.groupId;
            // Actualiza el color y nombre del grupo solo si el grupo cambió
            actualizarInfoGrupoEnNoteCard(noteData.id, noteData.groupId);
        }
        if (existingNoteCard.dataset.pinned !== String(noteData.pinned)) {
            existingNoteCard.dataset.pinned = noteData.pinned;
            // Actualiza el icono del pin solo si el estado cambió
            const pinnedIcon = existingNoteCard.querySelector('.note-pinned');
            const unpinnedIcon = existingNoteCard.querySelector('.note-unpinned');
            if (pinnedIcon && unpinnedIcon) {
                pinnedIcon.style.display = noteData.pinned ? 'block' : 'none';
                unpinnedIcon.style.display = noteData.pinned ? 'none' : 'block';
            }
            // Verifica si la nota debe moverse entre los grids de fijadas/no fijadas
            verificarYReubicarNota(noteData.id, noteData.pinned);
        }
        if (existingNoteCard.dataset.updatedAt !== noteData.updatedAt) {
            existingNoteCard.dataset.updatedAt = noteData.updatedAt;
            const lastModEl = existingNoteCard.querySelector('.note-last-modified');
            if (lastModEl) lastModEl.textContent = `Ultima edición: ${formatFechaNoteCard(noteData.updatedAt)}`;
        }

        // Actualiza el contenido visible de la nota
        const titleEl = existingNoteCard.querySelector('.note-title');
        if (titleEl && titleEl.innerHTML !== noteData.title) titleEl.innerHTML = DOMPurify.sanitize(noteData.title);
        
        const bodyEl = existingNoteCard.querySelector('.note-body');
        if (bodyEl && bodyEl.innerHTML !== noteData.body) bodyEl.innerHTML = DOMPurify.sanitize(noteData.body);
        return; // Salimos de la función porque ya terminamos de actualizar.
    }

    // --- LÓGICA DE CREACIÓN (SI LA NOTA NO EXISTE) ---
    const noteCardContainer = document.createElement('article');
    noteCardContainer.className = 'note-card-container';
    noteCardContainer.id = noteData.id;
    noteCardContainer.dataset.groupId = noteData.groupId;
    noteCardContainer.dataset.pinned = noteData.pinned; // <-- Atributo para el estado de pin
    noteCardContainer.dataset.updatedAt = noteData.updatedAt; // <-- Atributo para la fecha
    noteCardContainer.dataset.customOrder = noteData.customOrder || -1; // <-- Atributo para el orden personalizado


    // Usamos la plantilla para generar el HTML y lo asignamos de una sola vez.
    noteCardContainer.innerHTML = createNoteHTML(noteData, isTrashed);

    // --- ASIGNACIÓN DE EVENTOS ---
    // Ahora que el HTML está en el DOM, buscamos los elementos interactivos y les asignamos sus listeners.
    // Esto se llama "delegación de eventos" a nivel de componente.

    if (isTrashed) {
        // Listeners para la vista de papelera
        const restoreBtn = noteCardContainer.querySelector('.note-trash-restore-btn');
        const deleteBtn = noteCardContainer.querySelector('.note-trash-delete-btn');

        if (restoreBtn) {
            restoreBtn.onclick = async (e) => {
                e.stopPropagation();
                try {
                    const notaRestaurada = await restaurarNotaEnDB(noteData.id);
                    actualizarNotaEnStore(notaRestaurada); // Actualiza el store

                    // Eliminamos la nota del grid de la papelera para que el layout se actualice.
                    const itemToRemove = gridTrash.getItem(noteCardContainer);
                    if (itemToRemove) {
                        gridTrash.remove([itemToRemove], { removeElements: true });
                    } else noteCardContainer.remove(); // Fallback por si no se encuentra en Muuri

                    renderizarNotaEnDOM(notaRestaurada);
                } catch (error) {
                    console.error(`Error al restaurar la nota ${noteData.id}:`, error);
                    showNotification('No se pudo restaurar la nota.', 'error');
                }
            };
        }

        if (deleteBtn) {
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                // 1. Obtenemos el modal y sus botones.
                const confirmModal = new Modal('confirm-modal-delete-note');
                const modalElement = document.getElementById('confirm-modal-delete-note');
                const confirmBtn = document.getElementById('confirmDeleteNoteBtn');
                const cancelBtn = document.getElementById('cancelDeleteNoteBtn');
                const closeBtn = modalElement.querySelector('.delete-group-close-button');

                // 2. Asignamos las acciones a los botones del modal.
                confirmBtn.onclick = () => confirmModal.confirm();
                cancelBtn.onclick = () => confirmModal.cancel();
                closeBtn.onclick = () => confirmModal.cancel();
                modalElement.onclick = (event) => { if (event.target === modalElement) confirmModal.cancel(); };

                // 3. Abrimos el modal y definimos qué hacer si el usuario confirma.
                confirmModal.open({
                    triggerElement: deleteBtn,
                    onConfirm: async () => {
                        await eliminarNotaPermanentementeDeDB(noteData.id);
                        store.dispatch({ type: 'REMOVE_NOTE', payload: noteData.id }); // 1. Elimina del store
                        
                        // 2. Eliminamos la nota de la instancia de Muuri para que el layout se actualice.
                        const itemToRemove = gridTrash.getItem(noteCardContainer);
                        if (itemToRemove) {
                            gridTrash.remove([itemToRemove], { removeElements: true });
                        } else noteCardContainer.remove(); // Fallback por si no se encuentra en Muuri

                        showNotification('Nota eliminada permanentemente.', 'success');
                    }
                });
            };
        }
    } else {
        // Listeners para la vista principal
        const notePin = noteCardContainer.querySelector('.note-pin');
        if (notePin) {
            notePin.addEventListener('click', (event) => {
                event.stopPropagation();
                togglePinEstado(noteData.id);
            });
        }

        const multipleSelector = noteCardContainer.querySelector('.note-multiple-selector');
        if (multipleSelector) {
            multipleSelector.addEventListener('click', (event) => {
                event.stopPropagation();
                const selectionEvent = new CustomEvent('toggle-note-selection', {
                    detail: { noteId: noteData.id },
                    bubbles: true,
                    composed: true
                });
                noteCardContainer.dispatchEvent(selectionEvent);
            });
        }
    }

    // --- LÓGICA DE INSERCIÓN EN EL DOM ---
    if (isTrashed) {
        // Ahora usamos el grid de Muuri para la papelera
        if (gridTrash) gridTrash.add(noteCardContainer);
    } else {
        const targetGrid = noteData.pinned ? gridPinned : gridUnpinned;
        if (targetGrid) {
            targetGrid.add(noteCardContainer, { index: 0 });
        }
    }

    // Finalmente, coloreamos la nota.
    actualizarInfoGrupoEnNoteCard(noteData.id, noteData.groupId);
};


// ACTUALIZAR LA INFROMACION DE GRUPO DE TODAS LAS NOTE CARDS DE UN GRUPO, ACTUALIZA EL NOMBRE Y EL COLOR DEL GRUPO AL QUE PERTENECE
export const actualizarInfoGrupoEnNoteCards = (groupID, updates = {}) => {
    const { notes, groups } = store.getState();
    const groupMap = new Map(groups.map(g => [g.id, g]));

    // Caso especial: Limpiar notas de grupos que ya no existen.
    if (!groupID) {
        const notesToClean = notes.filter(note => note.groupId && !groupMap.has(note.groupId));
        notesToClean.forEach(note => {
            const noteCard = document.getElementById(note.id);
            if (noteCard) {
                const groupColorEl = noteCard.querySelector(".note-group-color");
                const groupNameEl = noteCard.querySelector(".note-group-name");
                if (groupColorEl) groupColorEl.style.backgroundColor = groupColorDefault;
                if (groupNameEl) groupNameEl.textContent = groupNameDefault;
                noteCard.style.backgroundColor = generateDynamicBackgroundColor(groupColorDefault);
                noteCard.dataset.groupId = 'null';
                // Actualizar el estado en el store también
                store.dispatch({ type: 'UPSERT_NOTE', payload: { ...note, groupId: null } });
            }
        });
        return;
    }


    // Actualizar todas las notas de un grupo específico.
    // const notesInGroup = document.querySelectorAll(`#all-notes-container [data-group-id="${groupID}"]`);
    const notesInGroup = document.querySelectorAll(
        `#unpinned-notes-container [data-group-id="${groupID}"], #pinned-notes-container [data-group-id="${groupID}"]`
    );

    notesInGroup.forEach(note => {
        const noteCard = document.getElementById(note.id);
        if (!noteCard) return;

        if (updates.color) {
            const groupColorEl = noteCard.querySelector(".note-group-color");
            if (groupColorEl) groupColorEl.style.backgroundColor = updates.color;
            noteCard.style.backgroundColor = generateDynamicBackgroundColor(updates.color);
        }
        if (updates.name) {
            const groupNameEl = noteCard.querySelector(".note-group-name");
            if (groupNameEl) groupNameEl.textContent = updates.name;
        }
    });
};




// ACTUALIZAR LA INFROMACION DE GRUPO DE UNA NOTE CARDS ESPECIFICA, ACTUALIZA EL NOMBRE Y EL COLOR DEL GRUPO AL QUE PERTENECE UNA NOTE CARD ESPECIFICAE
export const actualizarInfoGrupoEnNoteCard = (noteID, groupID) => {
    const noteCard = document.getElementById(noteID);
    if (!noteCard) {
        console.error(`Error: No se encontró la nota con ID '${noteID}' para colorear.`);
        return;
    }

    const noteGroupColor = noteCard.querySelector(".note-group-color");
    const noteGroupName = noteCard.querySelector(".note-group-name");

    if (!noteGroupColor || !noteGroupName) {
        console.log("No se encuentran los contenedores de grupo en la nota");
        return;
    }

    if (!groupID || groupID === 'null') {
        noteGroupColor.style.backgroundColor = groupColorDefault;
        noteGroupName.textContent = groupNameDefault;
        noteCard.style.backgroundColor = generateDynamicBackgroundColor(groupColorDefault);
        noteCard.dataset.groupId = 'null';
        return;
    }

    const { groups } = store.getState();
    const group = groups.find(g => g.id === groupID);

    if (group) {
        noteCard.style.backgroundColor = generateDynamicBackgroundColor(group.color);
        noteGroupColor.style.backgroundColor = group.color;
        noteGroupName.textContent = group.name;
        noteCard.dataset.groupId = groupID;
    } else {
        console.warn(`Grupo con ID '${groupID}' no encontrado en el store. Asignando valores por defecto a la nota '${noteID}'.`);
        actualizarInfoGrupoEnNoteCard(noteID, null); // Llama recursivamente para asignar valores por defecto
    }
};



//  NO  ME SIRVE, NI SIQUIERA NECESITO USARLA
// FUNCION PARA BUSCAR ELEMENTOS DE MUURI, AUNQUE ME PARECE UN POCO INUTIL PORQUE PUEDO BUSCARLO MANUALMENTE Y COMPROBAR SI ES CONTENEDO DE MUURI CON CLOSEST.
// Suponiendo que 'grid' es una instancia de Muuri
// y 'noteId' es el ID de la nota que quieres buscar.
// function isNoteInGrid(grid, noteId) {
//     // 1. Obtenemos todos los items del grid.
//     const allItems = grid.getItems();
    
//     // 2. Usamos el método find() para buscar el ítem.
//     const foundItem = allItems.find(item => {
//       // 3. Comprobamos si el elemento DOM del ítem tiene el ID que buscamos.
//       // También podrías buscar por una clase, un atributo de datos, etc.
//       return item.getElement().id === noteId;
//     });
    
//     // 4. Devolvemos true si se encontró el ítem, false si no.
//     return !!foundItem;
// }
  




// ACTUALIZAR ICONO DE PIN EN UNA NOTA (Solo cambia el icono)
const actualizarPinUI = (noteId, isPinned) => {
    const noteCard = document.getElementById(noteId);
    if (!noteCard) return;

    noteCard.dataset.pinned = isPinned; // Actualiza el dataset

    const pinnedIcon = noteCard.querySelector('.note-pinned');
    const unpinnedIcon = noteCard.querySelector('.note-unpinned');

    if (pinnedIcon && unpinnedIcon) {
        pinnedIcon.style.display = isPinned ? 'block' : 'none';
        unpinnedIcon.style.display = isPinned ? 'none' : 'block';
    }
};


// CAMBIA EL ESTADO DEL PIN DE UNA NOTA (cambia el estado en la base de datos pero la funcion actualizarPinUI dentro es la encargada del icono)
const togglePinEstado = async (noteId) => {
    const { notes } = store.getState();
    const nota = notes.find(n => n.id === noteId);
    if (!nota) return;

    const notaActualizada = {
        ...nota,
        pinned: !nota.pinned,
    };

    await guardarNotaEnDB(notaActualizada); // Guarda en la DB y sincroniza
    actualizarNotaEnStore(notaActualizada); // Actualiza el estado en el store
    actualizarPinUI(noteId, notaActualizada.pinned); // Actualiza el icono del pin con el nuevo estado

    // Llama a la nueva función para mover la nota si es necesario.
    // La función se encargará de reordenar los grids después de mover la nota.
    verificarYReubicarNota(noteId, notaActualizada.pinned);
};



// REUBICAR NOTA EN CASO DE QUE ESTE EN CONTENEDOR EQUIVOCADO, PASA NOTAS DE CONTENEDOR PIN A UNPINNED Y VICEVERSA
/**
 * Verifica si una nota está en el contenedor de Muuri correcto (fijado o no fijado)
 * y la mueve si es necesario.
 * @param {string} noteId - El ID de la nota.
 * @param {boolean} isPinned - El estado de fijado de la nota.
 */
export const verificarYReubicarNota = (noteId, isPinned) => {
    // const noteElement = document.getElementById(noteId);
    // if (!noteElement) return;

    const sortFunction = getSortFunction();
    if (!sortFunction) {
        // Si el orden es 'custom' o inválido, no hacemos nada.
        return;
    }

    const noteElement = document.getElementById(noteId);
    if (!noteElement) return;

    const itemInPinned = gridPinned.getItems(noteElement)[0];
    const itemInUnpinned = gridUnpinned.getItems(noteElement)[0];
    const item = itemInPinned || itemInUnpinned;

    if (!item) {
        console.warn(`Muuri item for note ${noteId} not found. Cannot update layout.`);
        return;
    }

        // --- PASO CLAVE: Actualizar las dimensiones del item en Muuri ---
    // Antes de cualquier ordenamiento o movimiento, le decimos a Muuri que
    // el tamaño de este elemento puede haber cambiado. Esto es crucial para
    // que el layout se recalcule correctamente y no haya solapamientos.
    item.getGrid().refreshItems([item]);

    // Callback para reordenar los grids cuando la animación de mover termina.
    
    const onMoveFinish = () => {
        gridPinned.sort(sortFunction, { layout: 'instant' });
        gridUnpinned.sort(sortFunction, { layout: 'instant' });
    };

    if (isPinned && itemInUnpinned) {
        console.log(`Moviendo nota ${noteId} al contenedor de notas fijadas.`);
        gridUnpinned.send(itemInUnpinned, gridPinned, 0, { onFinish: onMoveFinish });
    } else if (!isPinned && itemInPinned) {
        console.log(`Moviendo nota ${noteId} al contenedor de notas no fijadas.`);
        gridPinned.send(itemInPinned, gridUnpinned, 0, { onFinish: onMoveFinish });
    } else {
        // Si la nota no se mueve de grid, simplemente reordenamos ambos grids.
        // La llamada a refreshItems() anterior ya actualizó las dimensiones,
        // así que solo necesitamos forzar un relayout para compactar el espacio.
        const grid = item.getGrid();
        grid.layout(true);
    }
};




// ELIMINAR NOTA, PENDIENTE CREAR UNA CARPETA DE PAPELERIA TEMPORAL PARA ENVIAR LAS NOTAS ELIMINADAS.
export const moverNotaAPapelera = async (noteId) => {
    const notaElement = document.getElementById(noteId);
    const { notes } = store.getState();
    const nota = notes.find(n => n.id === noteId);
    if (!nota) return;
 
    try {
        // 1. Mueve la nota a la papelera en la DB (local y backend).
        await moverNotaAPapeleraEnDB(nota.id);
        // 2. Actualiza el estado de la nota en el store a 'trashed' en lugar de eliminarla.
        actualizarNotaEnStore({ ...nota, status: 'trashed' });
        
        console.log(`Nota con ID ${noteId} movida a la papelera correctamente.`);
        showNotification('Nota movida a la papelera.', 'info');
    } catch (error) {
        console.error(`Error en el proceso de eliminación de la nota ${noteId}:`, error);
        showNotification('No se pudo mover la nota a la papelera.', 'error');
    }
};



// DUPLICAR NOTA
export const duplicarNota = async (noteId) => {
    try {
        // 1. Obtener la nota original del store
        const { notes } = store.getState();
        const notaOriginal = notes.find(n => n.id === noteId);
        if (!notaOriginal) {
            console.error(`No se encontró la nota con ID ${noteId} para duplicar.`);
            return null;
        }

        // 2. Crear el objeto de la nueva nota (la copia)
        const notaDuplicada = {
            ...notaOriginal, // Copia todas las propiedades de la nota original
            id: `note-${crypto.randomUUID()}`, // Asigna un nuevo ID único
            title: notaOriginal.title ? `${notaOriginal.title} (Copia)` : 'Copia', // Maneja títulos vacíos
            createdAt: new Date().toISOString(), // Establece la fecha de creación actual
            updatedAt: new Date().toISOString(), // Establece la fecha de actualización actual,
        };

        // 3. Guardar la nueva nota en la base de datos
        await guardarNotaEnDB(notaDuplicada);
        // La función `duplicarNota` ahora es más limpia. Su única responsabilidad es crear
        // el objeto de la nota duplicada y guardarlo en la DB. No actualiza el store
        // ni la UI directamente; quien la llama (SelectionManager) se encargará de eso.
        console.log(`Nota ${noteId} duplicada exitosamente con el nuevo ID ${notaDuplicada.id}.`);
        
        // 4. Devolver la nota recién creada para que el llamador pueda actualizar el store en lote.
        return notaDuplicada;
    } catch (error) {
        console.error(`Error al duplicar la nota ${noteId}:`, error);
        return null;
    }
};












// CREAR CADA UNA DE LAS OPCIONES DEL DROPDOWN OPCIONES NOTA
const createNoteOptionElement = (name, text, svg) => {
    const noteOption = document.createElement("div");
    noteOption.classList.add("note-option");
    // Usamos 'data-action' para ser más semánticos con la acción que representa.
    noteOption.dataset.action = name; 
    noteOption.innerHTML = `${svg} <span>${text}</span>`;
    return noteOption;
};

// Mapa de SVG para evitar duplicaciones y mejorar la organización
const SVG_ICONS = {
    DELETE_NOTE: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10 11V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M14 11V17" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M4 7H20" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M6 7H12H18V18C18 19.6569 16.6569 21 15 21H9C7.34315 21 6 19.6569 6 18V7Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    DUPLICATE_NOTE: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M18 20.75H12C11.8011 20.75 11.6103 20.671 11.4697 20.5303C11.329 20.3897 11.25 20.1989 11.25 20C11.25 19.8011 11.329 19.6103 11.4697 19.4697C11.6103 19.329 11.8011 19.25 12 19.25H18C18.3315 19.25 18.6495 19.1183 18.8839 18.8839C19.1183 18.6495 19.25 18.3315 19.25 18V6C19.25 5.66848 19.1183 5.35054 18.8839 5.11612C18.6495 4.8817 18.3315 4.75 18 4.75H6C5.66848 4.75 5.35054 4.8817 5.11612 5.11612C4.8817 5.35054 4.75 5.66848 4.75 6V12C4.75 12.1989 4.67098 12.3897 4.53033 12.5303C4.38968 12.671 4.19891 12.75 4 12.75C3.80109 12.75 3.61032 12.671 3.46967 12.5303C3.32902 12.3897 3.25 12.1989 3.25 12V6C3.25 5.27065 3.53973 4.57118 4.05546 4.05546C4.57118 3.53973 5.27065 3.25 6 3.25H18C18.7293 3.25 19.4288 3.53973 19.9445 4.05546C20.4603 4.57118 20.75 5.27065 20.75 6V18C20.75 18.7293 20.4603 19.4288 19.9445 19.9445C19.4288 20.4603 18.7293 20.75 18 20.75Z" fill="#000000"></path> <path d="M16 12.75C15.8019 12.7474 15.6126 12.6676 15.4725 12.5275C15.3324 12.3874 15.2526 12.1981 15.25 12V8.75H12C11.8011 8.75 11.6103 8.67098 11.4697 8.53033C11.329 8.38968 11.25 8.19891 11.25 8C11.25 7.80109 11.329 7.61032 11.4697 7.46967C11.6103 7.32902 11.8011 7.25 12 7.25H16C16.1981 7.25259 16.3874 7.33244 16.5275 7.47253C16.6676 7.61263 16.7474 7.80189 16.75 8V12C16.7474 12.1981 16.6676 12.3874 16.5275 12.5275C16.3874 12.6676 16.1981 12.7474 16 12.75Z" fill="#000000"></path> <path d="M11.5 13.25C11.3071 13.2352 11.1276 13.1455 11 13C10.877 12.8625 10.809 12.6845 10.809 12.5C10.809 12.3155 10.877 12.1375 11 12L15.5 7.5C15.6422 7.36752 15.8302 7.29539 16.0245 7.29882C16.2188 7.30225 16.4042 7.38096 16.5416 7.51838C16.679 7.65579 16.7578 7.84117 16.7612 8.03548C16.7646 8.22978 16.6925 8.41782 16.56 8.56L12 13C11.8724 13.1455 11.6929 13.2352 11.5 13.25Z" fill="#000000"></path> <path d="M8 20.75H5C4.53668 20.7474 4.09309 20.5622 3.76546 20.2345C3.43784 19.9069 3.25263 19.4633 3.25 19V16C3.25263 15.5367 3.43784 15.0931 3.76546 14.7655C4.09309 14.4378 4.53668 14.2526 5 14.25H8C8.46332 14.2526 8.90691 14.4378 9.23454 14.7655C9.56216 15.0931 9.74738 15.5367 9.75 16V19C9.74738 19.4633 9.56216 19.9069 9.23454 20.2345C8.90691 20.5622 8.46332 20.7474 8 20.75ZM5 15.75C4.9337 15.75 4.87011 15.7763 4.82322 15.8232C4.77634 15.8701 4.75 15.9337 4.75 16V19C4.75 19.0663 4.77634 19.1299 4.82322 19.1768C4.87011 19.2237 4.9337 19.25 5 19.25H8C8.0663 19.25 8.12989 19.2237 8.17678 19.1768C8.22366 19.1299 8.25 19.0663 8.25 19V16C8.25 15.9337 8.22366 15.8701 8.17678 15.8232C8.12989 15.7763 8.0663 15.75 8 15.75H5Z" fill="#000000"></path> </g></svg>`,
    // Puedes añadir más SVGs aquí para otras opciones
};

// Este listener estaría SIEMPRE activo, por ejemplo, al cargar la página
document.addEventListener("click", (event) => {
    const clickedBtn = event.target.closest(".note-options-btn");
    const clickedDropdown = event.target.closest(".note-options-dropdown");
    const currentOpenDropdown = document.querySelector(".note-options-dropdown");

    // Lógica para abrir/cerrar el dropdown al hacer clic en el botón
    if (clickedBtn) {
        const noteElement = clickedBtn.closest(".note-card-container");
        if (noteElement) {
            const noteID = noteElement.id;
            // Llama a opcionesNota que ahora solo se encarga de crear/eliminar el suyo
            opcionesNota(noteID);
        }
    }
    // Lógica para cerrar el dropdown si se hace clic fuera
    else if (currentOpenDropdown && !clickedDropdown) {
        // Si hay un dropdown abierto y el clic no fue dentro de él ni en un botón de dropdown
        currentOpenDropdown.remove();
        // Nota: Si closeAndRemoveDropdown hace más cosas (como limpiar listeners internos del dropdown),
        // necesitarías una forma de invocarla aquí o mover esa lógica fuera.
        // Para simplificar, asumimos que 'remove()' es suficiente.
    }
});

// CREAR TODO EL DROPDOWN DE OPCIONES DE NOTA
const opcionesNota = (notaID) => {
    const targetNotaId = notaID instanceof HTMLElement ? notaID.id : notaID;
    const notaTarget = document.getElementById(targetNotaId);
    if (!notaTarget) {
        console.error(`Error: No se encontró la nota con ID "${targetNotaId}"`);
        return;
    }

    const existingDropdown = document.querySelector(".note-options-dropdown");

    // Aquí solo se encarga de cerrar si es el mismo, o cerrar el otro antes de crear el suyo
    if (existingDropdown && existingDropdown.dataset.noteId === targetNotaId) {
        existingDropdown.remove();
        return;
    } else if (existingDropdown) {
        existingDropdown.remove();
    }

    // Crear el dropdown
    const noteOptionsDropdown = document.createElement("div");
    noteOptionsDropdown.classList.add("note-options-dropdown");
    noteOptionsDropdown.dataset.noteId = targetNotaId;


    // Posicionar el dropdown
    noteOptionsDropdown.appendChild(createNoteOptionElement("duplicate-note", "Duplicar nota", SVG_ICONS.DUPLICATE_NOTE));
    noteOptionsDropdown.appendChild(createNoteOptionElement("delete-note", "Eliminar nota", SVG_ICONS.DELETE_NOTE));
    notaTarget.appendChild(noteOptionsDropdown);

    requestAnimationFrame(() => {
        noteOptionsDropdown.classList.add("active-options-dropdown");
    });
    // noteOptionsDropdown.classList.add("active-options-dropdown");

    // NOTA: Los listeners internos del dropdown (como handleOptionClick) irían aquí,
    noteOptionsDropdown.addEventListener("click", async (event) => {
        const selectedOptionElement = event.target.closest(".note-option");
        if (selectedOptionElement) {
            const selectedAction = selectedOptionElement.dataset.action;
            switch (selectedAction) {
                case "delete-note":                
                    try {
                        // Movemos la nota a la papelera
                        await moverNotaAPapelera(targetNotaId);
                    } catch (error) {
                        // El error ya se loguea dentro de la función moverNotaAPapelera
                        showNotification('No se pudo mover la nota a la papelera.', 'error');
                        // Podemos mostrar una notificación al usuario si quisiéramos
                        console.error("No se pudo completar la eliminación de la nota.");
                    }
                    break;
                case "duplicate-note":
                    try {
                        // 1. Llamamos a duplicarNota, que ahora devuelve la nota recién creada.
                        const nuevaNota = await duplicarNota(targetNotaId);
                        // 2. Si la duplicación fue exitosa, actualizamos el store.
                        // El store se encargará de que la UI se renderice de nuevo.                        
                        if (nuevaNota) actualizarNotaEnStore(nuevaNota);

                    } catch (error) {
                        showNotification('No se pudo duplicar la nota.', 'error');
                        console.error("No se pudo completar la duplicación de la nota.");
                    }
                    break;
            }
            // El dropdown solo se cierra si la acción se completa o falla.
            // La eliminación del dropdown ya no interfiere con la de la nota.
            noteOptionsDropdown.remove();
        }
    });

    // El cierre lo maneja el listener global.
};




// ABRIR NOTA EN EL EDITOR AL HACER CLICK (CON DETECCIÓN DE ARRASTRE)
let isDragging = false;
let startX, startY;
const allNotesContainers = document.querySelectorAll('#unpinned-notes-container, #pinned-notes-container');

// Itera sobre cada elemento del NodeList
allNotesContainers.forEach(container => {
    container.addEventListener('mousedown', (e) => {
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
    });

    container.addEventListener('mousemove', (e) => {
        // Si el mouse se mueve más de 5px, consideramos que es un arrastre.
        if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
            isDragging = true;
        }
    });

    container.addEventListener('click', async (event) => {
        // Si se detectó un arrastre, no abrir la nota y reiniciar el estado.
        if (isDragging) {
            isDragging = false;
            return;
        }

        const noteCard = event.target.closest('.note-card-container');
        
        // Si no se hizo clic en una nota, no hacer nada.
        if (!noteCard) {
            return;
        }

        // Si estamos en modo selección, un clic en la tarjeta la selecciona/deselecciona.
        if (document.body.classList.contains('selection-mode-active')) {
            // Prevenimos la acción si se hizo clic en un botón interno de la nota.
            if (event.target.closest('.note-options-btn') || event.target.closest('.note-pin') || event.target.closest('.note-group-color')) {
                return;
            }
            
            // Despachamos el evento de selección.
            const selectionEvent = new CustomEvent('toggle-note-selection', {
                detail: { noteId: noteCard.id },
                bubbles: true,
                composed: true
            });
            noteCard.dispatchEvent(selectionEvent);
            return; // Importante: detenemos la ejecución para no abrir el editor.
        }
        
        // --- Comportamiento normal (sin modo selección) ---

        // Si se hizo clic en un botón de acción, el pin, el selector o el dropdown, no hacer nada.
        if (event.target.closest('.note-options-btn') || 
            event.target.closest('.note-pin') ||
            event.target.closest('.note-multiple-selector') ||
            event.target.closest('.note-group-color') ||
            event.target.closest('.available-groups-dropdown') ||
            event.target.closest('.note-option')
        ) {
            return;
        }

        const noteId = noteCard.id;
        try {
            const nota = await obtenerNotaPorIdDesdeDB(noteId);
            if (nota) {
                abrirEditorNota(nota);
            } else {
                console.error(`No se encontró la nota con ID ${noteId} en la base de datos.`);
            }
        } catch (error) {
            console.error('Error al obtener la nota para editar:', error);
        }
    });
});





// SELECCION MULTIPLE DE NOTAS

/**
 * Actualiza el estilo visual de una nota para reflejar su estado de selección.
 * @param {string} noteId - El ID de la nota a actualizar.
 * @param {boolean} isSelected - `true` si la nota está seleccionada, `false` si no.
 */
export const updateNoteSelectionStyle = (noteId, isSelected) => {
    const noteCard = document.getElementById(noteId);
    if (!noteCard) return;

    const multipleSelector = noteCard.querySelector('.note-multiple-selector');

    if (isSelected) {
        noteCard.classList.add('is-selected');
        if (multipleSelector) {
            multipleSelector.classList.add('is-selected-selector');
        }
    } else {
        noteCard.classList.remove('is-selected');
        if (multipleSelector) {
            multipleSelector.classList.remove('is-selected-selector');
        }
    }
};

/**
 * Recalcula y aplica el color de fondo a todas las notas visibles en el DOM.
 * Es útil para cuando cambia el tema (claro/oscuro).
 */
const reapplyAllNoteBackgrounds = () => {
    console.log("Reaplicando colores de fondo de las notas por cambio de tema...");
    // Seleccionamos solo las notas que no están en la papelera
    const allNotes = document.querySelectorAll('.note-card-container:not(.is-trashed)');
    allNotes.forEach(noteElement => {
        const noteId = noteElement.id;
        const groupId = noteElement.dataset.groupId;
        // Esta función ahora obtiene el color del grupo desde el store
        // y aplicar el color de fondo correcto usando generateDynamicBackgroundColor.
        actualizarInfoGrupoEnNoteCard(noteId, groupId);
    });
};

export const initNoteCard = () => {
    document.addEventListener('theme-changed', reapplyAllNoteBackgrounds);
};
