// Importaciones de la capa de servicio/base de datos (DB)
import { guardarNotaEnDB, cargarNotasDesdeDB, obtenerNotasPorGrupoDesdeDB,
    guardarGrupoEnDB, cargarGruposDesdeDB, eliminarGrupoDeDB, actualizarPropiedadesGrupoEnDB,
    obtenerNotaPorIdDesdeDB, actualizarOrdenGruposEnDB, buscarYCorregirDuplicados, actualizarOrdenNotasEnDB
} from './services/db.js';
import { updateUserPreferencesInBackend } from './services/api.js';
import { 
    fetchNotesFromBackend, fetchGroupsFromBackend, syncNoteWithBackend, createGroupInBackend, updateGroupInBackend
} from './services/api.js';


// Importaciones de componentes de la interfaz de usuario (UI)
import { initGroupManager, renderizarGrupoEnDOM, inicializarDragAndDropGrupos} from './components/GroupManager.js';

import { initNoteEditor } from './components/NoteEditor.js';

import { initNoteCard, renderizarNotaEnDOM } from './components/NoteCard.js';

import { initHeader } from './components/Header.js';

import { initFilters } from './components/FilterManager.js';

import { initUtils, getSortFunction } from './utils.js';

import { initKeyboardShortcuts } from './components/KeyboardShortcuts.js';

import { initNotifier } from './components/Notifier.js';

import { initSessionManager } from './services/SessionManager.js';

import { initSelectionManager } from './components/SelectionManager.js';

import { store } from './services/store.js';

import { Modal } from './components/ModalManager.js';

import './styles/styles.css';

/**
 * Mapa de los iconos SVG para cada tipo de ordenamiento.
 * Se define aquí para que sea accesible por varias funciones.
 */
const sortIcons = {
    newest: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 8H13" stroke-width="2" stroke-linecap="round"></path> <path d="M4 16H9" stroke-width="2" stroke-linecap="round"></path> <path d="M17 4L17 20M17 20L20 17M17 20L14 17" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    oldest: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M4 8H13" stroke-width="2" stroke-linecap="round"></path> <path d="M4 16H9" stroke-width="2" stroke-linecap="round"></path> <path d="M17 20V4M17 4L20 7M17 4L14 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    'title-asc': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M17 4V20M17 4L14 7M17 4L20 7M4 16V10C4 8.89543 4.89543 8 6 8H8C9.10457 8 10 8.89543 10 10V16M4 13H10M4 20H10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    'title-desc': `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M17 20V4M17 20L14 17M17 20L20 17M4 16V10C4 8.89543 4.89543 8 6 8H8C9.10457 8 10 8.89543 10 10V16M4 13H10M4 20H10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`,
    custom: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M14 18V15.5C14 14.1193 12.8807 13 11.5 13C10.1193 13 9 14.1193 9 15.5V21H6C5.44772 21 5 20.5523 5 20V11.134C5 10.493 5.30953 9.89823 5.82843 9.48528L9.29289 6.70711C9.68342 6.39464 10.2178 6.39464 10.6083 6.70711L14.0728 9.48528C14.5917 9.89823 14.9 10.493 14.9 11.134V12M14 18H17.5C18.3284 18 19 17.3284 19 16.5V14.5C19 13.6716 18.3284 13 17.5 13C16.6716 13 16 13.6716 16 14.5V15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>`
};

import Muuri from 'muuri';








// Elementos del panel de grupos.
const groupNameDefault = "Sin grupo";
const groupColorDefault = "#f6f2ea";

// Elementos del editor
const modalNote = document.getElementById("modal-editor");
const editorNoteContainer = document.querySelector(".editor-container");
const editor = document.getElementById("editor");

// const editorGroupName = document.querySelector(".editor-group-name");
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




// FUNCION VIEJA PARA PROBAR A VER SI ERA LA CULPABLE DE QUE APARECIERAN MAL LAS NOTASEN MUURI
// // FUNCION PARA ORDENAR LAS NOTAS POR PINNED Y FECHA. Esta funcion se usa con grid.sort(ordenarNotas); para que funcione
// export const ordenarNotas =(itemA, itemB) => {
//     // Obtener los elementos DOM de los ítems de Muuri
//     const elementA = itemA.getElement();
//     const elementB = itemB.getElement();
    
//     // Obtener el estado 'pinned' y la fecha de cada elemento
//     const isPinnedA = elementA.getAttribute('data-pinned') === 'true';
//     const isPinnedB = elementB.getAttribute('data-pinned') === 'true';
    
//     const dateA = new Date(elementA.getAttribute('data-updated-at'));
//     const dateB = new Date(elementB.getAttribute('data-updated-at'));

//     // Lógica de ordenación:
//     // 1. Si uno está fijado y el otro no, ordena por pinned.
//     if (isPinnedA && !isPinnedB) {
//     return -1; // 'a' va primero
//     }
//     if (!isPinnedA && isPinnedB) {
//     return 1; // 'b' va primero
//     }

//     // 2. Si ambos tienen el mismo estado (fijado o no fijado), ordena por fecha descendente.
//     // La comparación de fechas funciona restándolas. dateB - dateA da el orden descendente.
//     return dateB - dateA;
// }


/**
 * Aplica la preferencia de vista (cuadrícula/lista) a la UI sin animación.
 * @param {string} view - La vista a aplicar ('list' o 'grid').
 */
const applyInitialView = (view) => {
    const gridWrapper = document.querySelector('.grid-wrapper');
    const viewListBtn = document.getElementById('view-list-btn');
    const viewGridBtn = document.getElementById('view-grid-btn');
    if (view === 'list') {
        gridWrapper.classList.add('list-view-active');
        viewListBtn.classList.add('active');
        viewGridBtn.classList.remove('active');
    } else {
        gridWrapper.classList.remove('list-view-active');
        viewGridBtn.classList.add('active');
        viewListBtn.classList.remove('active');
    }
};

const initViewSwitcher = () => {
    const viewGridBtn = document.getElementById('view-grid-btn');
    const viewListBtn = document.getElementById('view-list-btn');
    const gridWrapper = document.querySelector('.grid-wrapper');

    if (!viewGridBtn || !viewListBtn || !gridWrapper) {
        console.error('No se encontraron los elementos para el cambio de vista.');
        return;
    }

    const switchView = (view) => {
        if (gridWrapper.classList.contains('view-changing')) {
            return;
        }

        // 1. Añadir clase para iniciar la animación de fade-out
        gridWrapper.classList.add('view-changing');

        // 2. Esperar a que termine la animación para cambiar el layout
        setTimeout(() => {
            applyInitialView(view);
            if (gridPinned && gridUnpinned) {
                gridPinned.refreshItems().layout(true);
                gridUnpinned.refreshItems().layout(true);
            }

            // 5. Quitar la clase para iniciar la animación de fade-in
            gridWrapper.classList.remove('view-changing');
        }, 200); // Esta duración debe coincidir con la transición CSS de opacidad
    };

    const saveViewPreference = (view) => {
        localStorage.setItem('noteView', view);
        const user = localStorage.getItem('user');
        if (user) {
            // No esperamos la respuesta para no bloquear la UI.
            updateUserPreferencesInBackend({ noteView: view })
                .catch(err => console.warn("No se pudo guardar la preferencia de vista en el backend:", err));
        }
    };

    // Asignar eventos a los botones
    viewListBtn.addEventListener('click', () => { saveViewPreference('list'); switchView('list'); });
    viewGridBtn.addEventListener('click', () => { saveViewPreference('grid'); switchView('grid'); });

    // Aplicar la vista guardada al cargar la página
    applyInitialView(localStorage.getItem('noteView') || 'grid');
};

/**
 * Actualiza la UI del botón de ordenamiento (icono y estado activo)
 * basándose en la preferencia guardada en localStorage.
 */
const updateSortButtonUI = () => {
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

// Hacemos que applySort sea accesible en todo el módulo para poder llamarla desde el modal.
let applySort;
const initSortManager = () => {
    const sortBtn = document.getElementById('sort-options-btn');
    const sortDropdown = document.getElementById('sort-options-dropdown');
    const sortOptions = document.querySelectorAll('.sort-option');
    const gridWrapper = document.querySelector('.grid-wrapper');

    if (!sortBtn || !sortDropdown || !sortOptions.length || !gridWrapper) {
        console.error('No se encontraron los elementos para el ordenamiento.');
        return;
    }

    // --- Lógica de la UI del Dropdown ---
    sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sortDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        if (sortDropdown.classList.contains('active')) {
            sortDropdown.classList.remove('active');
        }
    });

    // --- Lógica de Ordenamiento ---
    applySort = (sortType, withAnimation = true) => {
        localStorage.setItem('noteSortOrder', sortType);

        // Solo sincronizamos con el backend si es una acción del usuario (con animación)
        const user = localStorage.getItem('user');
        if (withAnimation && user) {
            updateUserPreferencesInBackend({ noteSortOrder: sortType })
                .catch(err => console.warn("No se pudo guardar la preferencia de orden en el backend:", err));
        }

        updateSortButtonUI();

        const sortFunction = getSortFunction(sortType);
        // La función getSortFunction ahora maneja 'custom' devolviendo la función correcta,
        // por lo que ya no se necesita un caso especial aquí.
        if (!sortFunction) {
            console.warn(`El tipo de ordenamiento "${sortType}" no es soportado o no tiene una función de comparación.`);
            return;
        }

        if (gridPinned && gridUnpinned) {
            if (withAnimation && !gridWrapper.classList.contains('view-changing')) {
                gridPinned.sort(sortFunction);
                gridUnpinned.sort(sortFunction);
            } else {
                gridPinned.sort(sortFunction, { layout: 'instant' });
                gridUnpinned.sort(sortFunction, { layout: 'instant' });
            }
        }
    };

    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const sortType = e.currentTarget.dataset.sort;
            applySort(sortType);
            sortDropdown.classList.remove('active');
        });
    });

    // Aplicar el orden guardado al cargar la página
    updateSortButtonUI();
};



export let gridUnpinned;
export let gridPinned;
document.addEventListener('DOMContentLoaded', async () => {  
    // --- INICIALIZACIÓN DE LA APLICACIÓN ---
    // La lógica de inicialización ahora espera a que el SessionManager
    // termine de configurar la sesión y la UI del Header.
    document.addEventListener('initial-ui-load-complete', async () => {
        console.log('Carga inicial completa. Sincronizando y renderizando datos...');
        await sincronizarYcargarDatos();
    });

    // Inicializar componentes que no dependen de los datos del usuario.
    initHeader();
    initSessionManager(); // El nuevo gestor de sesión se inicializa aquí.
    initUtils();
    initNotifier();

    // // Espera a que el DOM esté completamente cargado
    // grid = new Muuri('.grid-unpinned', {
    //     // Aquí puedes añadir opciones de configuración
    //     // Por ejemplo, para habilitar arrastrar y soltar
    //     dragEnabled: true,
    //     // layout: {
    //     //     fillGaps: true // Esta es la opción clave
    //     // }
       
    //     // Opciones para deshabilitar las animaciones de entrada y salida
    //     showDuration: 0,
    //     hideDuration: 0,
        
    //     // Otras opciones que controlan la velocidad de las animaciones
    //     // layoutDuration: 0,
    //     // dragSortDuration: 0,
    //     // sortDuration: 0,
    // });


    gridUnpinned = new Muuri('#unpinned-notes-container', {
        dragEnabled: true,
        // dragContainer: document.querySelector(".grid-unpinned-wrapper"),

        // Aquí puedes añadir opciones de configuración
        // Por ejemplo, para habilitar arrastrar y soltar
        layout: {
            fillGaps: true // Esta es la opción clave
        },
       
        // Opciones para deshabilitar las animaciones de entrada y salida
        // showDuration: 0,
        // hideDuration: 0,
        
        // Otras opciones que controlan la velocidad de las animaciones
        // layoutDuration: 0,
        // dragSortDuration: 0,
        // sortDuration: 0,
    });
    
      // Inicializa la segunda instancia de Muuri para el grid-2
    gridPinned = new Muuri('#pinned-notes-container', {
        dragEnabled: true,

        layout: {
            fillGaps: true // Esta es la opción clave
        },
        // showDuration: 0,
        // hideDuration: 0,
    });

    // --- LÓGICA DEL MODAL DE ORDEN PERSONALIZADO ---
    const showCustomOrderModal = (triggerElement) => {
        const customOrderModal = new Modal('custom-order-modal');
        const modalElement = document.getElementById('custom-order-modal');
        const setNewOrderBtn = document.getElementById('setNewCustomOrderBtn');
        const switchToOrderBtn = document.getElementById('switchToCustomOrderBtn');
        const cancelBtn = document.getElementById('cancelOrderChangeBtn');

        const closeBtn = modalElement.querySelector('.delete-group-close-button');

        // Acción para "Cancelar" (deshace el arrastre)
        const cancelDrag = () => {
            console.log("Cancelando cambio de orden y revirtiendo el arrastre.");
            const currentSortOrder = localStorage.getItem('noteSortOrder') || 'newest';
            applySort(currentSortOrder, false); // Re-aplica el orden actual para revertir el arrastre.
        };

                // Asignamos las acciones a los botones.
        // Los botones de acción principal llaman a `confirm()` y los de cancelación a `cancel()`.
        setNewOrderBtn.onclick = () => customOrderModal.confirm();
        switchToOrderBtn.onclick = () => customOrderModal.confirm();
        cancelBtn.onclick = () => customOrderModal.cancel();
        closeBtn.onclick = () => customOrderModal.cancel();
        modalElement.onclick = (event) => { if (event.target === modalElement) customOrderModal.cancel(); };

        // Abrimos el modal y definimos qué hacer en cada caso.
        customOrderModal.open({
            triggerElement: triggerElement,
            // `onConfirm` se ejecutará para "Establecer" y "Cargar".
            // Necesitamos saber qué botón se presionó.
            onConfirm: async () => {
                if (document.activeElement === setNewOrderBtn) {
                    console.log("Estableciendo la vista actual como el nuevo orden personalizado...");
                    const allItems = gridPinned.getItems().concat(gridUnpinned.getItems());
                    const notasParaActualizar = allItems.map((item, index) => ({ id: item.getElement().id, order: index }));
                    if (notasParaActualizar.length > 0) await actualizarOrdenNotasEnDB(notasParaActualizar);
                    localStorage.setItem('noteSortOrder', 'custom');
                    updateSortButtonUI();
                    if (localStorage.getItem('user')) updateUserPreferencesInBackend({ noteSortOrder: 'custom' }).catch(console.warn);
                } else if (document.activeElement === switchToOrderBtn) {
                    console.log("Cambiando a modo 'Personalizado' y cargando el orden guardado...");
                    applySort('custom');
                }
            },
            // `onCancel` se ejecutará para "Cancelar" y el botón de cierre.
            onCancel: cancelDrag
        });
    };

    // --- LÓGICA PARA GUARDAR EL ORDEN PERSONALIZADO ---
    let initialDragOrder = []; // Variable para guardar el orden al iniciar el arrastre

    const handleDragStart = () => {
        const currentSortOrder = localStorage.getItem('noteSortOrder') || 'newest';
        // Solo capturamos el orden si NO estamos en modo 'custom'
        if (currentSortOrder !== 'custom') {
            initialDragOrder = gridPinned.getItems().concat(gridUnpinned.getItems()).map(i => i.getElement().id);
        }
    };

    const handleDragEnd = async (item) => {        
        const currentSortOrder = localStorage.getItem('noteSortOrder') || 'newest';
        
        if (currentSortOrder === 'custom') {
            // Si el modo actual es 'custom', guardamos el nuevo orden directamente.
            const finalItems = gridPinned.getItems().concat(gridUnpinned.getItems());
            const finalOrderIds = finalItems.map(i => i.getElement().id);

            // Comprobamos si el orden realmente cambió para evitar escrituras innecesarias en la DB.
            if (JSON.stringify(initialDragOrder) === JSON.stringify(finalOrderIds)) {
                console.log("El orden personalizado no cambió. No se guarda.");
                return;
            }

            console.log('Guardando orden personalizado...');
            const allItems = gridPinned.getItems().concat(gridUnpinned.getItems());
            const notasParaActualizar = allItems.map((item, index) => {
                const element = item.getElement();
                element.dataset.customOrder = index;
                return { id: element.id, order: index };
            });

            if (notasParaActualizar.length > 0) {
                await actualizarOrdenNotasEnDB(notasParaActualizar);
            }
        } else {
            // Si el modo NO es 'custom', comparamos el orden final con el inicial.
            const finalItems = gridPinned.getItems().concat(gridUnpinned.getItems());
            const finalOrderIds = finalItems.map(i => i.getElement().id);

            // Si el orden es diferente, mostramos el modal.
            if (JSON.stringify(initialDragOrder) !== JSON.stringify(finalOrderIds)) {
                showCustomOrderModal(item.getElement());
            } else {
                console.log("La nota volvió a su posición original. No se muestra el modal.");
            }
        }
        // Limpiamos el array para la próxima operación de arrastre.
        initialDragOrder = [];
    };


    // Asignamos el listener a ambas instancias de Muuri
    gridUnpinned.on('dragStart', handleDragStart);
    gridPinned.on('dragStart', handleDragStart);
    gridUnpinned.on('dragEnd', handleDragEnd);
    gridPinned.on('dragEnd', handleDragEnd);

    // Llamar al método sort() con tu función personalizada
    // Aplicamos el ordenamiento inicial leyendo la preferencia del usuario.
    const initialSortFunction = getSortFunction();
    gridPinned.sort(initialSortFunction);
    gridUnpinned.sort(initialSortFunction);


    // --- LÓGICA DE LIMPIEZA DE UI ---
    /**
     * Limpia completamente la interfaz de usuario, eliminando todas las notas y grupos.
     * Se utiliza al cambiar de usuario o al cerrar sesión.
     */
    const limpiarUI = () => {
        console.log("Limpiando la interfaz de usuario...");
        gridPinned.remove(gridPinned.getItems(), { removeElements: true });
        gridUnpinned.remove(gridUnpinned.getItems(), { removeElements: true });
        
        const groupsContainer = document.querySelector('.notes-group__container');
        if (groupsContainer) groupsContainer.innerHTML = '';

        const noNotesMessage = document.getElementById('no-notes-message');
        if (noNotesMessage) noNotesMessage.style.display = 'none';
    };

    // Variable para guardar el estado anterior y compararlo.
    let previousState = null;

    /**
     * Renderiza la UI completa basándose en el estado actual del store.
     * Esta función se suscribirá a los cambios del store.
     */
    const renderAppFromState = (currentState) => {
        console.log("Renderizando la aplicación desde el estado del store...", currentState);
        const { notes, groups, user, isTrashVisible } = currentState;

        // --- 1. CÁLCULO DE DIFERENCIAS (QUÉ CAMBIÓ) ---
        const previousNotesMap = previousState ? new Map(previousState.notes.map(n => [n.id, n])) : new Map();
        const currentNotesMap = new Map(notes.map(n => [n.id, n]));
        const previousGroupsMap = previousState ? new Map(previousState.groups.map(g => [g.id, g])) : new Map();
        const currentGroupsMap = new Map(groups.map(g => [g.id, g]));

        const notesToRemove = [];
        const notesToUpsert = [];
        const groupsToRemove = [];
        const groupsToUpsert = [];

        // Notas a eliminar: existen en el estado anterior pero no en el actual.
        previousNotesMap.forEach((_, noteId) => {
            if (!currentNotesMap.has(noteId)) {
                notesToRemove.push(noteId);
            }
        });

        // Notas a añadir/actualizar: no existen en el estado anterior o su `updatedAt` ha cambiado.
        currentNotesMap.forEach((currentNote, noteId) => {
            const previousNote = previousNotesMap.get(noteId);
            // Una nota necesita actualizarse si:
            // 1. Es nueva (!previousNote).
            // 2. Su fecha de modificación cambió (contenido editado).
            // 3. Su estado cambió (movida a/desde la papelera).
            // 4. Su estado de 'fijado' cambió.
            // 5. Su grupo asignado cambió.
            if (!previousNote || previousNote.updatedAt !== currentNote.updatedAt || previousNote.status !== currentNote.status ||
                previousNote.pinned !== currentNote.pinned || previousNote.groupId !== currentNote.groupId) {
                notesToUpsert.push(currentNote);
            }
        });

        // Grupos a eliminar
        previousGroupsMap.forEach((_, groupId) => {
            if (!currentGroupsMap.has(groupId)) {
                groupsToRemove.push(groupId);
            }
        });

        // Grupos a añadir/actualizar
        currentGroupsMap.forEach((currentGroup, groupId) => {
            const previousGroup = previousGroupsMap.get(groupId);
            if (!previousGroup || previousGroup.updatedAt !== currentGroup.updatedAt) {
                groupsToUpsert.push(currentGroup);
            }
        });

        // --- 2. APLICACIÓN DE CAMBIOS EN LA UI ---
        
        // Aplicar cambios a las notas
        notesToRemove.forEach(noteId => {
            const noteElement = document.getElementById(noteId);
            if (noteElement) {
                const item = gridPinned.getItem(noteElement) || gridUnpinned.getItem(noteElement);
                if (item) item.getGrid().remove([item], { removeElements: true });
            }
        });

        notesToUpsert.forEach(nota => {
            // Renderizar solo las notas activas en la vista principal.
            // La vista de papelera se gestiona por separado en FilterManager.
            if (nota.status === 'active') {
                renderizarNotaEnDOM(nota);
            }
        });

        // Aplicar cambios a los grupos
        groupsToRemove.forEach(groupId => {
            const groupElement = document.getElementById(groupId);
            if (groupElement) groupElement.remove();
        });

        groupsToUpsert.forEach(group => {
            const existingGroup = document.getElementById(group.id);
            if (existingGroup) existingGroup.remove(); // Simple reemplazo por ahora
            renderizarGrupoEnDOM(group);
        });

        // --- 3. ACTUALIZACIÓN FINAL DEL LAYOUT ---

        // Re-ordenar los grids. Es menos costoso que re-renderizar todo.
        if (gridPinned && gridUnpinned) {
            const sortFunction = getSortFunction();
            gridPinned.sort(sortFunction, { layout: 'instant' });
            gridUnpinned.sort(sortFunction, { layout: 'instant' });
        }

        // Gestionar mensaje de "sin notas"
        const noNotesMessage = document.getElementById('no-notes-message');
        if (noNotesMessage) {
            const activeNotesCount = notes.filter(n => n.status === 'active').length;
            if (activeNotesCount === 0 && groups.length === 0 && !isTrashVisible) {
                noNotesMessage.style.display = 'block';
                noNotesMessage.innerHTML = user ? 'Crea tu primera nota para empezar.' : 'Tus notas se guardarán aquí, en tu navegador.';
            } else {
                noNotesMessage.style.display = 'none';
            }
        }

        // Guardamos el estado actual para la próxima comparación.
        // Usamos structuredClone para una copia profunda eficiente y robusta.
        previousState = structuredClone(currentState);
    };

    
    // --- Lógica de Sincronización y Carga Inicial ---
    /**
     * Sincroniza los datos entre IndexedDB y el backend, fusionando los cambios.
     * La estrategia es "el más reciente gana", basado en el campo `updatedAt`.
     * Finalmente, renderiza la UI con los datos consolidados.
     */
    const sincronizarYcargarDatos = async () => {
        const loader = document.getElementById('sync-loader');
        if (loader) loader.style.display = 'flex';

        const user = JSON.parse(localStorage.getItem('user'));
        const noNotesMessage = document.getElementById('no-notes-message');
 
        try {
            console.log('Iniciando sincronización y carga de datos...');
    
            // Helper para ejecutar promesas de forma segura, devolviendo un valor por defecto en caso de error.
            // Esto hace que la carga inicial sea más robusta frente a fallos de red o del backend.
            const safePromise = async (promise, defaultValue = []) => {
                try {
                    return await promise;
                } catch (error) {
                    console.warn(`Una operación de carga de datos falló y se usará un valor por defecto. Error: ${error.message}`);
                    return defaultValue;
                }
            };

            // 1. Cargar todos los datos locales y del backend en paralelo.
            const [allLocalNotes, allBackendNotes, localGroups, backendGroups] = await Promise.all([
                safePromise(cargarNotasDesdeDB('all')), // Cargar TODAS las notas locales (activas y en papelera)
                user ? safePromise(fetchNotesFromBackend()) : Promise.resolve([]),
                safePromise(cargarGruposDesdeDB()),
                user ? safePromise(fetchGroupsFromBackend()) : Promise.resolve([])
            ]);

            // 2. Crear mapas para una búsqueda eficiente por ID.
            const localNotesMap = new Map(allLocalNotes.map(n => [n.id, n]));
            const backendNotesMap = new Map(allBackendNotes.map(n => [n.id, n]));
            const localGroupsMap = new Map(localGroups.map(g => [g.id, g]));
            const backendGroupsMap = new Map(backendGroups.map(g => [g.id, g]));
    
            const syncPromises = [];
    
            // 3. Función genérica para sincronizar un tipo de dato (notas o grupos).
            const sincronizarEntidades = (localMap, backendMap, localSaveFn, backendCreateFn, backendUpdateFn) => {
                // Si no hay sesión, no hay nada que sincronizar con el backend.
                if (!user) {
                    console.log("Modo invitado: Omitiendo sincronización con el backend.");
                    return;
                }

                const allIds = new Set([...localMap.keys(), ...backendMap.keys()]);
    
                allIds.forEach(id => {
                    const localItem = localMap.get(id); // Esto incluye notas activas y en papelera si se cargaron todas
                    const backendItem = backendMap.get(id);
    
                    if (localItem && !backendItem) {
                        // Existe localmente pero no en el backend (creado offline).
                        console.log(`Sync: Creando en backend item ${id}`);
                        syncPromises.push(backendCreateFn(localItem));
                    } else if (!localItem && backendItem) {
                        // Existe en el backend pero no localmente (nuevo desde otro dispositivo).
                        console.log(`Sync: Creando localmente item ${id}`);
                        // Solo guardamos si no está en la papelera, o si estamos en la vista de papelera
                        // Para la carga inicial, solo queremos los activos.
                        // La lógica de sincronización se complica. Por ahora, guardamos todo.
                        syncPromises.push(localSaveFn(backendItem, false)); 
                    } else if (localItem && backendItem) {
                        // Existe en ambos. Comparamos por fecha de actualización.
                        const localDate = new Date(localItem.updatedAt);
                        const backendDate = new Date(backendItem.updatedAt);
    
                        if (backendDate > localDate) {
                            // El del backend es más nuevo.
                            console.log(`Sync: Actualizando localmente item ${id}`);
                            syncPromises.push(localSaveFn(backendItem, false));
                        } else if (localDate > backendDate) {
                            // El local es más nuevo (editado offline).
                            console.log(`Sync: Actualizando en backend item ${id}`);
                            syncPromises.push(backendUpdateFn(id, localItem));
                        }
                    }
                });
            };
    
            // 4. Sincronizar notas y grupos.
            console.log('--- Sincronizando Notas ---');
            sincronizarEntidades(localNotesMap, backendNotesMap, guardarNotaEnDB, syncNoteWithBackend, syncNoteWithBackend);
    
            console.log('--- Sincronizando Grupos ---');
            sincronizarEntidades(localGroupsMap, backendGroupsMap, guardarGrupoEnDB, createGroupInBackend, updateGroupInBackend);
    
            // 5. Esperar a que todas las operaciones de sincronización terminen.
            await Promise.all(syncPromises);
            console.log('Sincronización completada.');
    
            // 5.5 (Paso de Recuperación): Asegurarse de que todas las notas tengan un estado válido.
            // Esto "recupera" notas antiguas que podrían no tener el campo 'status'.
            console.log('Verificando integridad de los datos locales...');
            const allNotesForCheck = await cargarNotasDesdeDB('all');
            const notesToFix = allNotesForCheck.filter(note => !note.status || (note.status !== 'active' && note.status !== 'trashed'));

            if (notesToFix.length > 0) {
                console.warn(`Se encontraron ${notesToFix.length} notas sin un estado válido. Reparando...`);
                const fixPromises = notesToFix.map(note => {
                    // Asigna 'active' como estado por defecto para recuperarlas.
                    note.status = 'active'; 
                    // Guarda la nota corregida en la DB local sin volver a sincronizar con el backend.
                    return guardarNotaEnDB(note, false); 
                });
                await Promise.all(fixPromises);
                console.log('Reparación de notas completada.');
            }

            // Hacemos lo mismo para los grupos para asegurar que todos tengan timestamps.
            const allGroupsForCheck = await cargarGruposDesdeDB();
            const groupsToFix = allGroupsForCheck.filter(group => !group.updatedAt || !group.createdAt);

            if (groupsToFix.length > 0) {
                console.warn(`Se encontraron ${groupsToFix.length} grupos sin timestamps. Reparando...`);
                const fixGroupPromises = groupsToFix.map(group => {
                    const now = new Date().toISOString();
                    group.createdAt = group.createdAt || now;
                    group.updatedAt = group.updatedAt || now;
                    return guardarGrupoEnDB(group, false);
                });
                await Promise.all(fixGroupPromises);
                console.log('Reparación de grupos completada.');
            }


            // 6. Cargar los datos definitivos desde la DB local y renderizar.
            const [finalNotes, finalGroups] = await Promise.all([
                cargarNotasDesdeDB('all'), // <-- CAMBIO CLAVE: Cargar TODAS las notas (activas y en papelera)
                cargarGruposDesdeDB()
            ]);
    
            // 7. Actualizar el store con los datos finales. La UI se renderizará automáticamente.
            store.setData(finalNotes, finalGroups);
    
            // 8. Inicializar funcionalidades.
            inicializarDragAndDropGrupos();
            console.log('Drag and drop de grupos inicializado.');
        } catch (error) {
            console.error('Error CRÍTICO durante la carga y sincronización inicial de datos:', error);
            // Aquí se podría mostrar un mensaje al usuario de que la app podría no funcionar correctamente.
        } finally {
            // Aseguramos que el loader se oculte siempre, tanto en éxito como en error.
            if (loader) loader.style.display = 'none';
        }
    };


    // --- LISTENERS DE EVENTOS DE SESIÓN ---
    // Escuchamos los eventos personalizados disparados desde Header.js

    // El SessionManager ahora centraliza la lógica de cambio de sesión.
    // Escuchamos sus eventos para recargar los datos.
    document.addEventListener('session-initialized', async (event) => {
        console.log('Sesión inicializada/cambiada. Actualizando UI y recargando datos...');
        
        // Después de iniciar sesión, las preferencias del usuario se guardan en localStorage.
        // Actualizamos la UI de los controles para que reflejen estas preferencias inmediatamente.
        applyInitialView(localStorage.getItem('noteView') || 'grid');
        updateSortButtonUI();

        // Ahora, limpiamos la UI y cargamos los datos, que ya usarán las preferencias correctas.
        store.clearState(); // Limpia el estado, lo que limpiará la UI
        await sincronizarYcargarDatos();
    });

    document.addEventListener('session-cleared', async () => {
        console.log('Sesión cerrada. Cambiando a modo invitado...');
        store.clearState(); // Limpia el estado, lo que limpiará la UI
        await sincronizarYcargarDatos();
    });

    
    // Inicializar los listeners de los demas archivos
    initGroupManager();
    initNoteEditor();
    initNoteCard();
    initFilters({ gridPinned, gridUnpinned });
    initKeyboardShortcuts();
    initSelectionManager({ gridPinned, gridUnpinned });
    initViewSwitcher();
    initSortManager();

    // Suscribimos la función de renderizado a los cambios del store.
    store.subscribe(renderAppFromState);

    document.addEventListener('data-imported', async () => {
        console.log('Evento data-imported detectado. Recargando datos...');
        store.clearState();
        await sincronizarYcargarDatos();
    });

    // Listener para cambios de datos que requieren una recarga completa
    document.addEventListener('data-changed', async (event) => {
        console.log(`Evento data-changed detectado desde ${event.detail.source}. Recargando datos...`);
        await sincronizarYcargarDatos();
    });

});
