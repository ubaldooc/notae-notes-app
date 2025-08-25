import { gridPinned, gridUnpinned } from '../main.js';



// ESTILOS GRUPO ACTIVO
export const actualizarGrupoActivoUI = (groupId) => {
    const allSelectableGroups = document.querySelectorAll('.notes-group, .aside__all-notes');
    allSelectableGroups.forEach(group => {
        const isTarget = (!groupId || groupId === 'all' || groupId === '.muuri-item' || groupId === 'null' || groupId === null || groupId === undefined)
            ? group.classList.contains('aside__all-notes')
            : group.id === groupId;

        if (isTarget) {
            group.classList.add('active');
        } else {
            group.classList.remove('active');
        }
    });
};



// FILTROS DE BUSQUEDA DE MUURI para grupos
export const handleFilter = (groupId) => {
    const filterSelector = (!groupId || groupId === 'all' || groupId === '.muuri-item' || groupId === 'null' || groupId === null || groupId === undefined)
        ? '.muuri-item'
        : `[data-group-id="${groupId}"]`;
    gridPinned.filter(filterSelector);
    gridUnpinned.filter(filterSelector);
};



// LISTENERS DE FILTROS
export const initFilters = () => {
    
    const visiblePinnedItems = gridPinned.getItems().filter(item => item.isVisible());
    const visibleItemPinnedCount = visiblePinnedItems.length;

    const pinnedNotesContainer = document.getElementById('pinned-notes-container');
    if (visibleItemPinnedCount === 0) {
        pinnedNotesContainer.style.marginBottom = '0px';
    } else {
        pinnedNotesContainer.style.marginBottom = '60px';
    }
    
    // Manejar el mensaje de "no hay notas" después de cualquier cambio de layout
    gridUnpinned.on('layoutEnd', () => {
        const visiblePinnedItems = gridPinned.getItems().filter(item => item.isVisible());
        const visibleUnpinnedItems = gridUnpinned.getItems().filter(item => item.isVisible());
        const visibleItemPinnedCount = visiblePinnedItems.length;
        const visibleItemUnpinnedount = visibleUnpinnedItems.length;
        console.log(`Visible items count: ${visibleItemPinnedCount}`); // Log for debugging

        const noNotesMessage = document.getElementById('no-notes-message');
        if (noNotesMessage) {
            if (visibleItemPinnedCount === 0 && visibleItemUnpinnedount === 0) {
                noNotesMessage.style.display = 'block';
                noNotesMessage.innerHTML = 'No se encontraron notas.';
            } else {
                noNotesMessage.style.display = 'none';
            }
        }
    });

    // BUSCADOR HEADER
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
            gridPinned.filter((item) => {
                const noteCard = item.getElement();
                const titleElement = noteCard.querySelector('.note-title');
                const bodyElement = noteCard.querySelector('.note-body');
                const titleText = titleElement ? titleElement.textContent.toLowerCase() : '';
                const bodyText = bodyElement ? bodyElement.textContent.toLowerCase() : '';
                return titleText.includes(query) || bodyText.includes(query);
            });
            gridUnpinned.filter((item) => {
                const noteCard = item.getElement();
                const titleElement = noteCard.querySelector('.note-title');
                const bodyElement = noteCard.querySelector('.note-body');
                const titleText = titleElement ? titleElement.textContent.toLowerCase() : '';
                const bodyText = bodyElement ? bodyElement.textContent.toLowerCase() : '';
                return titleText.includes(query) || bodyText.includes(query);
            });
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

            if (allNotesButton) {
                handleFilter('all');
                actualizarGrupoActivoUI('all');
            } else if (groupButton) {
                const groupId = groupButton.id;
                handleFilter(groupId);
                actualizarGrupoActivoUI(groupId);
            }
        });
    }
};