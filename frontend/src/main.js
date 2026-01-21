// Importaciones de la capa de servicio/base de datos (DB)
import {
    guardarNotaEnDB, cargarNotasDesdeDB, obtenerNotasPorGrupoDesdeDB,
    guardarGrupoEnDB, cargarGruposDesdeDB, eliminarGrupoDeDB, actualizarPropiedadesGrupoEnDB,
    obtenerNotaPorIdDesdeDB, actualizarOrdenGruposEnDB, buscarYCorregirDuplicados, actualizarOrdenNotasEnDB, closeDb
} from './services/db.js';
import {
    updateUserPreferencesInBackend,
    fetchNotesFromBackend, fetchGroupsFromBackend, syncNoteWithBackend, createGroupInBackend, updateGroupInBackend
} from './services/api.js';


// Importaciones de componentes de la interfaz de usuario (UI)
import { initGroupManager, renderizarGrupoEnDOM, inicializarDragAndDropGrupos } from './components/GroupManager.js';

import { initNoteEditor, abrirEditorNota } from './components/NoteEditor.js';

import { initNoteCard, renderizarNotaEnDOM } from './components/NoteCard.js';

import { initHeader } from './components/Header.js';

import { initFilters } from './components/FilterManager.js';

import { initViewManager, applyView, updateSortButtonUI, applySort } from './components/ViewManager.js';

import { initUtils, getSortFunction, activarAside } from './utils.js';

import { initKeyboardShortcuts } from './components/KeyboardShortcuts.js';

import { initNotifier } from './components/Notifier.js';

import { initSessionManager } from './services/SessionManager.js';

import { initSelectionManager } from './components/SelectionManager.js';

import { store } from './services/store.js';

import { Modal } from './components/ModalManager.js';

import './styles/styles.css';

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

const createNewNote = document.getElementById("mobile-fab-add-note");


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


export let gridUnpinned;
export let gridPinned;
export let gridTrash;
document.addEventListener('DOMContentLoaded', async () => {
    // --- INICIALIZACIÓN DE LA APLICACIÓN ---
    // La lógica de inicialización ahora espera a que el SessionManager
    // termine de configurar la sesión y la UI del Header.
    document.addEventListener('initial-ui-load-complete', async () => {
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

    // Inicializa la tercera instancia de Muuri para la papelera
    gridTrash = new Muuri('#trash-notes-container', {
        // La papelera no necesita drag & drop
        dragEnabled: false,
        layout: {
            fillGaps: true
        },
    });

    // --- LÓGICA DEL MODAL DE ORDEN PERSONALIZADO ---
    const showCustomOrderModal = async (triggerElement) => {
        const customOrderModal = new Modal('custom-order-modal');
        const modalElement = document.getElementById('custom-order-modal');
        const setNewOrderBtn = document.getElementById('setNewCustomOrderBtn');
        const switchToOrderBtn = document.getElementById('switchToCustomOrderBtn');
        const cancelBtn = document.getElementById('cancelOrderChangeBtn');

        const closeBtn = modalElement.querySelector('.delete-group-close-button');

        // Acción para "Cancelar" (deshace el arrastre)
        const cancelDrag = () => {
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
                    const allItems = gridPinned.getItems().concat(gridUnpinned.getItems());
                    const notasParaActualizar = allItems.map((item, index) => ({ id: item.getElement().id, order: index }));
                    if (notasParaActualizar.length > 0) await actualizarOrdenNotasEnDB(notasParaActualizar);
                    localStorage.setItem('noteSortOrder', 'custom');
                    updateSortButtonUI();
                    if (localStorage.getItem('user')) updateUserPreferencesInBackend({ noteSortOrder: 'custom' }).catch(console.warn);
                } else if (document.activeElement === switchToOrderBtn) {
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
                return;
            }

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
            }
        }
        // Limpiamos el array para la próxima operación de arrastre.
        initialDragOrder = [];
    };


    // --- LÓGICA MÓVIL (FAB, BACKDROP Y DELETE ZONE) ---
    const mobileFab = document.getElementById('mobile-fab-add-note');
    if (mobileFab) {
        mobileFab.addEventListener('click', () => abrirEditorNota());
    }

    const asideBackdrop = document.querySelector('.aside-backdrop');
    if (asideBackdrop) {
        asideBackdrop.addEventListener('click', () => activarAside());
    }

    const mobileDeleteZone = document.getElementById('mobile-delete-zone');
    const handleDragMove = (item, event) => {
        if (window.innerWidth > 768 || !mobileDeleteZone) return;
        const rect = mobileDeleteZone.getBoundingClientRect();
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);

        const isOver = (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
        );

        if (isOver) mobileDeleteZone.classList.add('hover');
        else mobileDeleteZone.classList.remove('hover');
    };

    const handleDragStartMobile = () => {
        if (window.innerWidth <= 768 && mobileDeleteZone) mobileDeleteZone.classList.add('active');
        handleDragStart();
    };

    const handleDragEndMobile = async (item) => {
        if (window.innerWidth <= 768 && mobileDeleteZone && mobileDeleteZone.classList.contains('hover')) {
            const { moverNotaAPapelera } = await import('./components/NoteCard.js');
            await moverNotaAPapelera(item.getElement().id);
        }
        if (mobileDeleteZone) {
            mobileDeleteZone.classList.remove('active');
            mobileDeleteZone.classList.remove('hover');
        }
        handleDragEnd(item);
    };

    // Asignamos el listener a ambas instancias de Muuri
    gridUnpinned.on('dragStart', handleDragStartMobile);
    gridPinned.on('dragStart', handleDragStartMobile);
    gridUnpinned.on('dragMove', handleDragMove);
    gridPinned.on('dragMove', handleDragMove);
    gridUnpinned.on('dragEnd', handleDragEndMobile);
    gridPinned.on('dragEnd', handleDragEndMobile);

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
            // 6. O si la nota fue eliminada (no está en el estado actual pero sí en el anterior).
            if (previousNote && currentNote.status === 'trashed' && previousNote.status !== 'trashed') {
                // Si la nota acaba de ser movida a la papelera, la marcamos para ser eliminada de la vista principal.
                notesToRemove.push(noteId);
            }

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

        // Si se actualizó al menos una nota, disparamos un evento 'resize' después de un breve
        // retraso para darle tiempo al DOM a actualizarse. Esto fuerza a Muuri a recalcular
        // el layout, lo cual es crucial para la vista masonry si el tamaño de una nota cambió.
        if (notesToUpsert.length > 0) {
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 500); // 0.5 segundos de retraso
        }

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

            // 4. Sincronizar notas y grupos. No usamos `await` aquí para no bloquear el renderizado.
            // La UI se puede mostrar con los datos locales mientras la sincronización ocurre en segundo plano.
            console.log('--- Sincronizando Notas ---');
            sincronizarEntidades(localNotesMap, backendNotesMap, guardarNotaEnDB, syncNoteWithBackend, syncNoteWithBackend);

            console.log('--- Sincronizando Grupos ---');
            sincronizarEntidades(localGroupsMap, backendGroupsMap, guardarGrupoEnDB, createGroupInBackend, updateGroupInBackend);

            // 5. Ejecutar todas las promesas de sincronización en segundo plano.
            Promise.all(syncPromises).then(() => {
            }).catch(err => {
                console.error("Ocurrió un error durante la sincronización en segundo plano:", err);
            });

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
            store.dispatch({ type: 'SET_DATA', payload: { notes: finalNotes, groups: finalGroups } });

            // 8. Inicializar funcionalidades.
            inicializarDragAndDropGrupos();

            // --- CORRECCIÓN EXPLÍCITA PARA EL MENSAJE 'SIN NOTAS' ---
            // Al cambiar de sesión, queremos que el mensaje se actualice inmediatamente con el texto correcto
            // (basado en si hay usuario o no), sin esperar a ciclos de renderizado del store.
            if (noNotesMessage) {
                const activeNotes = finalNotes.filter(n => n.status === 'active');
                // IMPORTANTE: store.state.isTrashVisible podría no estar disponible aquí directamente si no lo importamos.
                // Asumimos que al cargar/sincronizar NO estamos en la papelera.
                if (activeNotes.length === 0 && finalGroups.length === 0) {
                    noNotesMessage.style.display = 'block';
                    noNotesMessage.innerHTML = user ? 'Crea tu primera nota para empezar.' : 'Tus notas se guardarán aquí, en tu navegador.';
                } else {
                    noNotesMessage.style.display = 'none';
                }
            }
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
        applyView(localStorage.getItem('noteView') || 'masonry', false);
        updateSortButtonUI();

        // Ahora, limpiamos la UI y cargamos los datos, que ya usarán las preferencias correctas.
        store.dispatch({ type: 'CLEAR_STATE' }); // Limpia el estado, lo que limpiará la UI
        await sincronizarYcargarDatos();
    });

    document.addEventListener('session-cleared', async () => {
        console.log('Sesión cerrada. Cambiando a modo invitado...');
        store.dispatch({ type: 'CLEAR_STATE' }); // Limpia el estado, lo que limpiará la UI
        await sincronizarYcargarDatos();
    });


    // Inicializar los listeners de los demas archivos
    initGroupManager();
    initNoteEditor();
    initNoteCard();
    initFilters({ gridPinned, gridUnpinned, gridTrash });
    initKeyboardShortcuts();
    initSelectionManager({ gridPinned, gridUnpinned });
    initViewManager({ gridPinned, gridUnpinned });

    // Suscribimos la función de renderizado a los cambios del store.
    store.subscribe(renderAppFromState);

    document.addEventListener('data-imported', async () => {
        console.log('Evento data-imported detectado. Recargando datos...');
        store.dispatch({ type: 'CLEAR_STATE' });
        await sincronizarYcargarDatos();
    });

    // Listener para cambios de datos que requieren una recarga completa
    document.addEventListener('data-changed', async (event) => {
        console.log(`Evento data-changed detectado desde ${event.detail.source}. Recargando datos...`);
        await sincronizarYcargarDatos();
    });

    // Hacemos visible el body una vez que todo el JS inicial se ha ejecutado.
    // Esto, junto con el CSS, previene el FOUC.
    document.body.classList.add('loaded');
});
