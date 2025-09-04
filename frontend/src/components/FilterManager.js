import { vaciarPapeleraEnDB, obtenerNotaPorIdDesdeDB } from '../services/db.js';
import { renderizarNotaEnDOM } from './NoteCard.js';
import { abrirEditorNota } from './NoteEditor.js';
import { getSortFunction } from '../utils.js';
import { Modal } from './ModalManager.js';
import { store } from '../services/store.js';

// Module-level variables to hold grid instances
let gridPinned;
let gridUnpinned;

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

    gridPinned.filter(filterSelector, { instant: true });
    gridUnpinned.filter(filterSelector, { instant: true });

    // Después de filtrar, es crucial re-ordenar y recalcular el layout.
    // 1. Obtenemos la función de ordenamiento actual para no resetear la preferencia del usuario.
    const currentSortFunction = getSortFunction();
    if (currentSortFunction) {
        // 2. Aplicamos el ordenamiento y forzamos un layout inmediato para evitar animaciones bruscas.
        // Encadenamos las operaciones: sort -> layout.
        // El { layout: 'instant' } en sort previene la animación de ordenamiento.
        // El layout(true) final asegura que los elementos se compacten instantáneamente.
        // No es estrictamente necesario usar .then() aquí, ya que Muuri puede encadenar estas llamadas.
        gridPinned.sort(currentSortFunction, { layout: 'instant' });
        gridPinned.layout(true);
        gridUnpinned.sort(currentSortFunction, { layout: 'instant' });
        gridUnpinned.layout(true);
    }
};

const showTrashView = async () => {
    // 1. Ocultar los grids principales de Muuri y mostrar un contenedor para la papelera
    document.querySelector('.grid-pinned').style.display = 'none';
    document.querySelector('.grid-unpinned').style.display = 'none';
    gridPinned?.hide(gridPinned.getItems(), { instant: true });
    gridUnpinned?.hide(gridUnpinned.getItems(), { instant: true });

    // 2. Crear o encontrar el contenedor de la papelera y su cabecera
    let trashViewContainer = document.getElementById('trash-view-container');
    if (!trashViewContainer) {
        trashViewContainer = document.createElement('div');
        trashViewContainer.id = 'trash-view-container';
        trashViewContainer.innerHTML = `
            <div class="trash-header">
                <button id="empty-trash-btn" class="empty-trash-button">Vaciar Papelera</button>
            </div>
            <div id="trash-notes-container" class="trash-grid"></div>
        `;
        document.querySelector('.grid-wrapper').appendChild(trashViewContainer);
    }
    trashViewContainer.style.display = 'block';

    const trashNotesContainer = document.getElementById('trash-notes-container');
    const emptyTrashBtn = document.getElementById('empty-trash-btn');
    trashNotesContainer.innerHTML = ''; // Limpiar contenido previo

    // 3. Cargar notas y configurar el botón
    // Obtenemos las notas de la papelera desde el store, que es la fuente de verdad.
    const trashedNotes = store.getState().notes.filter(n => n.status === 'trashed');
    const noNotesMessage = document.getElementById('no-notes-message');

    if (trashedNotes.length > 0) {
        noNotesMessage.style.display = 'none';
        emptyTrashBtn.style.display = 'inline-block'; // Mostrar botón
        trashedNotes.forEach(note => {
            renderizarNotaEnDOM(note, { isTrashed: true });
        });
    } else {
        noNotesMessage.style.display = 'block';
        noNotesMessage.innerHTML = 'La papelera está vacía.';
        emptyTrashBtn.style.display = 'none'; // Ocultar botón
    }

    // 5. Añadir listener para abrir notas en modo solo lectura
    trashNotesContainer.addEventListener('click', async (event) => {
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
    });

    // 4. Asignar el evento al botón (se reasigna cada vez, lo que es seguro)
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
                    await vaciarPapeleraEnDB();
                    trashNotesContainer.innerHTML = '';
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
    document.querySelector('.grid-pinned').style.display = ''; // Usar '' para volver al estilo por defecto de CSS
    document.querySelector('.grid-unpinned').style.display = '';
    
    // Mostrar todos los items en los grids de Muuri
    gridPinned?.show(gridPinned.getItems(), { instant: true });
    gridUnpinned?.show(gridUnpinned.getItems(), { instant: true });
    
    // Forzar un relayout para evitar problemas visuales
    if (gridPinned) gridPinned.refreshItems().layout();
    if (gridUnpinned) gridUnpinned.refreshItems().layout();
};



// LISTENERS DE FILTROS
export const initFilters = (grids) => {
    gridPinned = grids.gridPinned;
    gridUnpinned = grids.gridUnpinned;

    if (!gridPinned || !gridUnpinned) return;

    const visiblePinnedItems = gridPinned.getItems().filter(item => item.isVisible());
    const visibleItemPinnedCount = visiblePinnedItems.length;

    const pinnedNotesContainer = document.getElementById('pinned-notes-container');
    if (visibleItemPinnedCount === 0) {
        pinnedNotesContainer.style.marginBottom = '0px';
    } else {
        pinnedNotesContainer.style.marginBottom = '60px';
    }

    // Manejar el mensaje de "no hay notas" después de cualquier cambio de layout
    const handleLayoutEnd = () => {
        const visiblePinnedItems = gridPinned.getItems().filter(item => item.isVisible());
        const visibleUnpinnedItems = gridUnpinned.getItems().filter(item => item.isVisible());
        const visibleItemPinnedCount = visiblePinnedItems.length;
        const visibleItemUnpinnedCount = visibleUnpinnedItems.length;
        console.log(`Visible items count: ${visibleItemPinnedCount} pinned, ${visibleItemUnpinnedCount} unpinned`); // Log for debugging

        const noNotesMessage = document.getElementById('no-notes-message');
        if (noNotesMessage) {
            // Solo mostrar el mensaje si no estamos en la vista de papelera
            const trashContainer = document.getElementById('trash-notes-container');
            const isTrashVisible = trashContainer && trashContainer.style.display !== 'none';

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
    console.log("FilterManager inicializado.");
};