import { updateUserPreferencesInBackend } from '../services/api.js';
import { getSortFunction } from '../utils.js';
import { Modal } from './ModalManager.js';

/**
 * Mapa de los iconos SVG para cada tipo de ordenamiento.
 */
const sortIcons = {
    newest: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 8H13" stroke-width="2" stroke-linecap="round"></path> <path d="M4 16H9" stroke-width="2" stroke-linecap="round"></path> <path d="M17 4L17 20M17 20L20 17M17 20L14 17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    oldest: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 8H13" stroke-width="2" stroke-linecap="round"></path> <path d="M4 16H9" stroke-width="2" stroke-linecap="round"></path> <path d="M17 20V4M17 4L20 7M17 4L14 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    'title-asc': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M17 4V20M17 4L14 7M17 4L20 7M4 16V10C4 8.89543 4.89543 8 6 8H8C9.10457 8 10 8.89543 10 10V16M4 13H10M4 20H10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    'title-desc': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M17 20V4M17 20L14 17M17 20L20 17M4 16V10C4 8.89543 4.89543 8 6 8H8C9.10457 8 10 8.89543 10 10V16M4 13H10M4 20H10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    custom: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14 18V15.5C14 14.1193 12.8807 13 11.5 13C10.1193 13 9 14.1193 9 15.5V21H6C5.44772 21 5 20.5523 5 20V11.134C5 10.493 5.30953 9.89823 5.82843 9.48528L9.29289 6.70711C9.68342 6.39464 10.2178 6.39464 10.6083 6.70711L14.0728 9.48528C14.5917 9.89823 14.9 10.493 14.9 11.134V12M14 18H17.5C18.3284 18 19 17.3284 19 16.5V14.5C19 13.6716 18.3284 13 17.5 13C16.6716 13 16 13.6716 16 14.5V15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`
};

let gridPinned;
let gridUnpinned;

/**
 * Aplica la preferencia de vista (cuadrícula/lista) a la UI.
 * @param {string} view - La vista a aplicar ('list', 'grid', 'masonry').
 * @param {boolean} withAnimation - Si se debe aplicar la animación de cambio.
 */
export const applyView = (view, withAnimation = true) => {
    const gridWrapper = document.querySelector('.grid-wrapper');
    const viewListBtn = document.getElementById('view-list-btn');
    const viewGridBtn = document.getElementById('view-grid-btn');
    const viewMasonryBtn = document.getElementById('view-masonry-btn');

    if (gridWrapper.classList.contains(`${view}-view-active`)) return;

    const applyClasses = () => {
        gridWrapper.classList.remove('list-view-active', 'grid-view-active', 'masonry-view-active');
        [viewListBtn, viewGridBtn, viewMasonryBtn].forEach(btn => btn.classList.remove('active'));

        if (view === 'list') {
            gridWrapper.classList.add('list-view-active');
            viewListBtn.classList.add('active');
        } else if (view === 'masonry') {
            gridWrapper.classList.add('masonry-view-active');
            viewMasonryBtn.classList.add('active');
        } else {
            gridWrapper.classList.add('grid-view-active');
            viewGridBtn.classList.add('active');
        }
    };

    if (withAnimation) {
        gridWrapper.classList.add('view-changing');
        setTimeout(() => {
            applyClasses();
            if (gridPinned && gridUnpinned) {
                gridPinned.refreshItems().layout(true);
                gridUnpinned.refreshItems().layout(true);
            }
            gridWrapper.classList.remove('view-changing');
        }, 150);
    } else {
        applyClasses();
    }
};

/**
 * Aplica el ordenamiento a los grids de notas.
 * @param {string} sortType - El tipo de ordenamiento.
 * @param {boolean} [withAnimation=true] - Si se debe animar el cambio.
 */
export const applySort = (sortType, withAnimation = true) => {
    localStorage.setItem('noteSortOrder', sortType);

    const user = localStorage.getItem('user');
    if (withAnimation && user) {
        updateUserPreferencesInBackend({ noteSortOrder: sortType })
            .catch(err => console.warn("No se pudo guardar la preferencia de orden en el backend:", err));
    }

    updateSortButtonUI();

    const sortFunction = getSortFunction(sortType);
    if (!sortFunction) return;

    if (gridPinned && gridUnpinned) {
        const gridWrapper = document.querySelector('.grid-wrapper');
        if (withAnimation && !gridWrapper.classList.contains('view-changing')) {
            gridPinned.sort(sortFunction);
            gridUnpinned.sort(sortFunction);
        } else {
            gridPinned.sort(sortFunction, { layout: 'instant' });
            gridUnpinned.sort(sortFunction, { layout: 'instant' });
        }
    }
};

/**
 * Actualiza la UI del botón de ordenamiento (icono y estado activo).
 */
export const updateSortButtonUI = () => {
    const sortType = localStorage.getItem('noteSortOrder') || 'newest';
    const sortBtn = document.getElementById('sort-options-btn');
    const sortOptions = document.querySelectorAll('.sort-option');

    if (sortIcons[sortType]) {
        sortBtn.innerHTML = sortIcons[sortType];
    }
    sortOptions.forEach(opt => {
        opt.classList.toggle('active', opt.dataset.sort === sortType);
    });
};

export const initViewManager = (grids) => {
    gridPinned = grids.gridPinned;
    gridUnpinned = grids.gridUnpinned;

    // --- View Switcher ---
    const viewGridBtn = document.getElementById('view-grid-btn');
    const viewListBtn = document.getElementById('view-list-btn');
    const viewMasonryBtn = document.getElementById('view-masonry-btn');

    const saveViewPreference = (view) => {
        localStorage.setItem('noteView', view);
        if (localStorage.getItem('user')) {
            updateUserPreferencesInBackend({ noteView: view }).catch(console.warn);
        }
    };

    viewListBtn.addEventListener('click', () => { saveViewPreference('list'); applyView('list'); });
    viewGridBtn.addEventListener('click', () => { saveViewPreference('grid'); applyView('grid'); });
    viewMasonryBtn.addEventListener('click', () => { saveViewPreference('masonry'); applyView('masonry'); });

    // --- Sort Manager ---
    const sortBtn = document.getElementById('sort-options-btn');
    const sortDropdown = document.getElementById('sort-options-dropdown');
    const sortOptions = document.querySelectorAll('.sort-option');

    sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => sortDropdown.classList.remove('active'));

    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            applySort(e.currentTarget.dataset.sort);
            sortDropdown.classList.remove('active');
        });
    });

    // --- Initial State ---
    applyView(localStorage.getItem('noteView') || 'masonry', false);
    updateSortButtonUI();

    console.log("ViewManager inicializado.");
};