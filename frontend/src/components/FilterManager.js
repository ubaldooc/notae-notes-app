import { vaciarPapeleraEnDB, obtenerNotaPorIdDesdeDB } from '../services/db.js';
import { renderizarNotaEnDOM } from './NoteCard.js';
import { abrirEditorNota } from './NoteEditor.js';
import { getSortFunction } from '../utils.js';
import { Modal } from './ModalManager.js';
import { store } from '../services/store.js';

// Module-level variables to hold grid instances
let gridPinned;
let gridUnpinned;
let gridTrash;

// ESTILOS GRUPO ACTIVO
export const actualizarGrupoActivoUI = (groupId) => {
    const allSelectableGroups = document.querySelectorAll('.notes-group, .aside__all-notes, .aside__trash-bin__box');
    allSelectableGroups.forEach(group => {
        let isTarget = false;
        if (groupId === 'trash') {
            isTarget = group.classList.contains('aside__trash-bin__box');
        } else {
            isTarget = (!groupId || groupId === 'all' || groupId === '.muuri-item' || groupId === 'null' || groupId === null || groupId === undefined)
                ? group.classList.contains('aside__all-notes')
                : group.id === groupId;
        }

        if (isTarget) {
            group.classList.add('active');
        } else {
            group.classList.remove('active');
        }
    });
};



// FILTROS DE BUSQUEDA DE MUURI para grupos
export const handleFilter = (groupId) => {
    if (!gridPinned || !gridUnpinned) return;

    const filterSelector = (!groupId || groupId === 'all' || groupId === '.muuri-item' || groupId === 'null' || groupId === null || groupId === undefined)
        ? item => item.getElement().matches('.note-card-container:not(.is-trashed)') // Filtra todo lo que no esté en la papelera
        : `[data-group-id="${groupId}"]`;

    // 1. Primero, mostramos todas las notas (excepto las de la papelera) para "resetear" el layout.
    // Esto ayuda a evitar que las notas aparezcan en lugares extraños al cambiar entre grupos.
    const allNotesSelector = item => item.getElement().matches('.note-card-container:not(.is-trashed)');
    gridPinned.filter(allNotesSelector, { instant: true });
    gridUnpinned.filter(allNotesSelector, { instant: true });

    // Tengo que aplicar este filtro primero porque sin el las notas salen desordenadas y en lugares extraños solitarias
    gridPinned.filter("muuri", { instant: true });
    gridUnpinned.filter("muuri", { instant: true });

    requestAnimationFrame(() => {
        // Aplicamos el filtro del grupo seleccionado.
        gridPinned.filter(filterSelector);
        gridUnpinned.filter(filterSelector);

        // 3. Finalmente, re-ordenamos y compactamos el layout para que todo se vea correcto.
        const currentSortFunction = getSortFunction();
        if (currentSortFunction) {
            gridPinned.sort(currentSortFunction, { layout: 'instant' });
            gridUnpinned.sort(currentSortFunction, { layout: 'instant' });
            gridPinned.layout(true);
            gridUnpinned.layout(true);
        }
    });
};

const showTrashView = async () => {
    // 1. Ocultar los contenedores de los grids principales y mostrar el de la papelera
    document.getElementById('pinned-notes-container').style.display = 'none';
    document.getElementById('unpinned-notes-container').style.display = 'none';

    // 2. Encontrar el contenedor de la papelera (que ya existe en el HTML)
    const trashViewContainer = document.getElementById('trash-view-container');
    trashViewContainer.style.display = 'block';

    const emptyTrashBtn = document.getElementById('empty-trash-btn');

    // Limpiar el grid de la papelera antes de añadir nuevos elementos
    if (gridTrash.getItems().length > 0) {
        gridTrash.remove(gridTrash.getItems(), { removeElements: true });
    }

    // 3. Cargar notas de la papelera desde el store y renderizarlas
    // La función renderizarNotaEnDOM ahora las añadirá al gridTrash
    const trashedNotes = store.getState().notes.filter(n => n.status === 'trashed');
    trashedNotes.forEach(note => {
        renderizarNotaEnDOM(note, { isTrashed: true });
    });

    // 4. Gestionar la visibilidad del botón y el mensaje de "papelera vacía"
    const noNotesMessage = document.getElementById('no-notes-message');
    const hasTrashedNotes = trashedNotes.length > 0;
    emptyTrashBtn.style.display = hasTrashedNotes ? 'inline-block' : 'none';
    noNotesMessage.style.display = hasTrashedNotes ? 'none' : 'block';
    if (!hasTrashedNotes) {
        noNotesMessage.style.display = 'block';
        noNotesMessage.innerHTML = 'La papelera está vacía.';
    }

    // 5. Añadir listener para abrir notas en modo solo lectura
    const trashNotesContainer = document.getElementById('trash-notes-container');
    trashNotesContainer.onclick = async (event) => { // Usamos .onclick para reemplazar listeners previos
        const noteCard = event.target.closest('.note-card-container');
        if (!noteCard) return;

        // No abrir si se hizo clic en un botón de acción (restaurar, eliminar)
        if (event.target.closest('.note-trash-btn')) {
            return;
        }

        const noteId = noteCard.id;
        try {
            const nota = await obtenerNotaPorIdDesdeDB(noteId);
            if (nota) {
                abrirEditorNota(nota, { readOnly: true });
            }
        } catch (error) {
            console.error(`Error al abrir la nota ${noteId} desde la papelera:`, error);
        }
    };

    // 6. Asignar el evento al botón (se reasigna cada vez, lo que es seguro)
    // Usando la clase Modal para consistencia
    emptyTrashBtn.onclick = () => {
        const confirmModal = new Modal('confirm-modal-empty-trash');
        const modalElement = document.getElementById('confirm-modal-empty-trash');
        const confirmBtn = document.getElementById('confirmEmptyTrashBtn');
        const cancelBtn = document.getElementById('cancelEmptyTrashBtn');
        const closeBtn = modalElement.querySelector('.delete-group-close-button');

        confirmBtn.onclick = () => confirmModal.confirm();
        cancelBtn.onclick = () => confirmModal.cancel();
        closeBtn.onclick = () => confirmModal.cancel();
        modalElement.onclick = (event) => { if (event.target === modalElement) confirmModal.cancel(); };

        confirmModal.open({
            triggerElement: emptyTrashBtn,
            onConfirm: async () => {
                try {
                    const trashedNoteIds = store.getState().notes.filter(n => n.status === 'trashed').map(n => n.id);
                    await vaciarPapeleraEnDB();
                    // Limpiamos el grid de Muuri
                    gridTrash.remove(gridTrash.getItems(), { removeElements: true }); // Limpia la UI
                    store.dispatch({ type: 'REMOVE_NOTES', payload: trashedNoteIds }); // Actualiza el estado
                    noNotesMessage.style.display = 'block';
                    noNotesMessage.innerHTML = 'La papelera está vacía.';
                    emptyTrashBtn.style.display = 'none';
                } catch (error) {
                    console.error('Error al intentar vaciar la papelera:', error);
                    // Aquí podrías usar showNotification si lo importas
                }
            }
        });
    };
};

const showMainView = () => {
    // Ocultar la vista de la papelera
    const trashViewContainer = document.getElementById('trash-view-container');
    if (trashViewContainer) {
        trashViewContainer.style.display = 'none';
    }

    // Mostrar los grids principales
    document.getElementById('pinned-notes-container').style.display = ''; // Usar '' para volver al estilo por defecto de CSS
    document.getElementById('unpinned-notes-container').style.display = '';

    // Forzar un relayout para evitar problemas visuales
    if (gridPinned) gridPinned.refreshItems().layout();
    if (gridUnpinned) gridUnpinned.refreshItems().layout();
};



// LISTENERS DE FILTROS
export const initFilters = (grids) => {
    gridPinned = grids.gridPinned;
    gridUnpinned = grids.gridUnpinned;
    gridTrash = grids.gridTrash;

    if (!gridPinned || !gridUnpinned) return;

    // Manejar el mensaje de "no hay notas" después de cualquier cambio de layout
    const handleLayoutEnd = () => {
        const visiblePinnedItems = gridPinned.getItems().filter(item => item.isVisible());
        const visibleUnpinnedItems = gridUnpinned.getItems().filter(item => item.isVisible());
        const visibleItemPinnedCount = visiblePinnedItems.length;
        const visibleItemUnpinnedCount = visibleUnpinnedItems.length;

        // --- LÓGICA DE MARGEN MEJORADA ---
        // Ajustamos dinámicamente el margen del contenedor de notas fijadas.
        const pinnedNotesContainer = document.getElementById('pinned-notes-container');
        pinnedNotesContainer.style.marginBottom = visibleItemPinnedCount > 0 ? '60px' : '0px';


        const noNotesMessage = document.getElementById('no-notes-message');
        if (noNotesMessage) {
            // Solo mostrar el mensaje si no estamos en la vista de papelera
            const isTrashVisible = document.getElementById('trash-view-container').style.display === 'block';

            if (visibleItemPinnedCount === 0 && visibleItemUnpinnedCount === 0 && !isTrashVisible) {
                noNotesMessage.style.display = 'block';
                noNotesMessage.innerHTML = 'No se encontraron notas.';
            } else {
                noNotesMessage.style.display = 'none';
            }
        }
    };

    gridPinned.on('layoutEnd', handleLayoutEnd);
    gridUnpinned.on('layoutEnd', handleLayoutEnd);

    // BUSCADOR HEADER
    const filterGridByQuery = (grid, query) => {
        grid.filter(item => {
            const noteCard = item.getElement();
            const titleElement = noteCard.querySelector('.note-title');
            const bodyElement = noteCard.querySelector('.note-body');
            const titleText = titleElement ? titleElement.textContent.toLowerCase() : '';
            const bodyText = bodyElement ? bodyElement.textContent.toLowerCase() : '';
            return titleText.includes(query) || bodyText.includes(query);
        });
        // Después de filtrar, es crucial re-ordenar y recalcular el layout.
        // Obtenemos la función de ordenamiento actual para no resetear la preferencia del usuario
        const currentSortFunction = getSortFunction();
        if (currentSortFunction) { // Solo ordenamos si la función es válida
            grid.sort(currentSortFunction, { layout: 'instant' });
        }
    };

    const searchInput = document.getElementById('id__search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.addEventListener('input', () => {
            actualizarGrupoActivoUI('all');

            const clearButton = document.getElementById('clear-search-button');
            if (clearButton) {
                clearButton.style.visibility = searchInput.value.length > 0 ? 'visible' : 'hidden';
            }

            const query = searchInput.value.toLowerCase();
            filterGridByQuery(gridPinned, query);
            filterGridByQuery(gridUnpinned, query);
        });

        const clearButton = document.getElementById('clear-search-button');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                searchInput.value = '';
                handleFilter('all');
                actualizarGrupoActivoUI('all');
                clearButton.style.visibility = 'hidden';
                searchInput.focus();
            });
        }
    }

    // Filtrar notas por grupo
    const parentContainer = document.querySelector('.aside-container');
    if (parentContainer) {
        parentContainer.addEventListener('click', (event) => {
            const clickedElement = event.target;

            if (
                clickedElement.closest('.group-svg') ||
                clickedElement.closest('.group-color-selector') ||
                (clickedElement && clickedElement.contentEditable === 'true')
            ) {
                return;
            }

            const groupButton = clickedElement.closest('.notes-group');
            const allNotesButton = clickedElement.closest('.aside__all-notes');
            const trashButton = clickedElement.closest('.aside__trash-bin__box');

            if (allNotesButton) {
                showMainView();
                handleFilter('all');
                actualizarGrupoActivoUI('all');
            } else if (groupButton) {
                showMainView();
                const groupId = groupButton.id;
                handleFilter(groupId);
                actualizarGrupoActivoUI(groupId);
            } else if (trashButton) {
                showTrashView();
                actualizarGrupoActivoUI('trash');
            }
        });
    }
};