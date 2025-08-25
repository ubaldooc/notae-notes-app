import { gridUnpinned } from '../main.js';

// --- FUNCIONES DE FILTRADO Y UI ---
// Estas funciones son la 'lógica pura' de tu aplicación.
// No tienen oyentes de eventos, solo realizan acciones.

// Aplicar estilos al grupo activo, Actualizar UI de grupos.
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

// Aplicar filtros de grupo al layout de Muuri.
export const handleFilter = (groupId) => {
    if (!groupId || groupId === 'all' || groupId === '.muuri-item' || groupId === 'null' || groupId === null || groupId === undefined) {
        gridUnpinned.filter('.muuri-item');
    } else {
        gridUnpinned.filter(`[data-group-id="${groupId}"]`);
    }
};

// Función de filtrado centralizada para el buscador de Muuri.
const filterGrid = (query) => {
    gridUnpinned.filter((item) => {
        const noteCard = item.getElement();
        const titleText = noteCard.querySelector('.note-title')?.textContent.toLowerCase() || '';
        const bodyText = noteCard.querySelector('.note-body')?.textContent.toLowerCase() || '';
        return titleText.includes(query) || bodyText.includes(query);
    });
};


// --- FUNCIONES DE INICIALIZACIÓN DE LISTENERS ---
// Se ejecutan una sola vez para configurar los oyentes de eventos.
export const initFilters = () => {

    // 1. Configuración del buscador de notas
    const searchInput = document.getElementById('id__search');
    const clearButton = document.getElementById('clear-search-button');

    // Inicializa el input de búsqueda y el botón de limpiar.
    if (searchInput && clearButton) {
        searchInput.value = '';
        clearButton.style.visibility = 'hidden';

        // Oyente para el input de búsqueda
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.toLowerCase().trim();
            filterGrid(query);
            clearButton.style.visibility = query.length > 0 ? 'visible' : 'hidden';
            if (query.length > 0) {
                actualizarGrupoActivoUI('all');
            }
        });

        // Oyente para el botón de limpiar
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            clearButton.style.visibility = 'hidden';
            searchInput.focus();
            filterGrid('');
            actualizarGrupoActivoUI('all');
        });
    }

    // 2. Configuración del filtro por grupos
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
                actualizarGrupoActivoUI(`all`);
            } else if (groupButton) {
                const groupId = groupButton.id;
                handleFilter(groupId);
                actualizarGrupoActivoUI(groupId);
            }
            // Al hacer clic en un grupo, se "desactiva" la búsqueda 
            // Esto es opcional, pero mantiene la consistencia
            if (searchInput) {
                 searchInput.value = '';
                 clearButton.style.visibility = 'hidden';
                 filterGrid('');
            }
        });
    }
};