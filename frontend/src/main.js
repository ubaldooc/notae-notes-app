// Importaciones de la capa de servicio/base de datos (DB)
import { guardarNotaEnDB, cargarNotasDesdeDB, eliminarNotaDeDB, obtenerNotasPorGrupoDesdeDB,
    guardarGrupoEnDB, cargarGruposDesdeDB, eliminarGrupoDeDB, actualizarPropiedadesGrupoEnDB,
    obtenerNotaPorIdDesdeDB, actualizarOrdenGruposEnDB, buscarYCorregirDuplicados } from './services/db.js';


// Importaciones de componentes de la interfaz de usuario (UI)
import { initGroupManager, renderizarGrupoEnDOM, inicializarDragAndDropGrupos} from './components/GroupManager.js';

import { initNoteEditor } from './components/NoteEditor.js';

import { renderizarNotaEnDOM, updateNoteSelectionStyle, duplicarNota } from './components/NoteCard.js';

import { initHeader } from './components/header.js';

import { initFilters } from './components/Filters.js';

import { initUtils } from './utils.js';

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

// Contenedor de todas las notas
// const allNotesContainer = document.getElementById("all-notes-container");






// FUNCION PARA ORDENAR LAS NOTAS POR PINNED Y FECHA. Esta funcion se usa con grid.sort(ordenarNotas); para que funcione
export const ordenarNotas =(itemA, itemB) => {
    // Obtener los elementos DOM de los ítems de Muuri
    const elementA = itemA.getElement();
    const elementB = itemB.getElement();
    
    // Obtener el estado 'pinned' y la fecha de cada elemento
    const isPinnedA = elementA.getAttribute('data-pinned') === 'true';
    const isPinnedB = elementB.getAttribute('data-pinned') === 'true';
    
    const dateA = new Date(elementA.getAttribute('data-updated-at'));
    const dateB = new Date(elementB.getAttribute('data-updated-at'));

    // Lógica de ordenación:
    // 1. Si uno está fijado y el otro no, ordena por pinned.
    if (isPinnedA && !isPinnedB) {
    return -1; // 'a' va primero
    }
    if (!isPinnedA && isPinnedB) {
    return 1; // 'b' va primero
    }

    // 2. Si ambos tienen el mismo estado (fijado o no fijado), ordena por fecha descendente.
    // La comparación de fechas funciona restándolas. dateB - dateA da el orden descendente.
    return dateB - dateA;
}


export let gridUnpinned;
export let gridPinned;
document.addEventListener('DOMContentLoaded', async () => {  
    // // Espera a que el DOM esté completamente cargado
    // grid = new Muuri('.grid', {
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


    gridUnpinned = new Muuri('.grid', {
        dragEnabled: true,
        // dragContainer: document.querySelector(".grid-wrapper"),

        // Aquí puedes añadir opciones de configuración
        // Por ejemplo, para habilitar arrastrar y soltar
        // layout: {
        //     fillGaps: true // Esta es la opción clave
        // }
       
        // Opciones para deshabilitar las animaciones de entrada y salida
        showDuration: 0,
        hideDuration: 0,
        
        // Otras opciones que controlan la velocidad de las animaciones
        // layoutDuration: 0,
        // dragSortDuration: 0,
        // sortDuration: 0,
    });
    
      // Inicializa la segunda instancia de Muuri para el grid-2
    gridPinned = new Muuri('#pinned-notes-container', {
        dragEnabled: true,
        // dragContainer: document.querySelector(".grid-wrapper"),
        // dragContainer: document.body
    });


    // Estos son ejemplos de como inicializarlos puedes borrarlos todo bien
    // const pinnedGrid = new Muuri('#pinned-notes-container', {
    //     dragEnabled: true
    // });
    
    // const unpinnedGrid = new Muuri('#unpinned-notes-container', {
    //     dragEnabled: true
    // });


      
    // Llamar al método sort() con tu función personalizada
    gridPinned.sort(ordenarNotas);
    gridUnpinned.sort(ordenarNotas);

    




    // Llama a la función que configura el filtro de búsqueda.
    // setupSearchFilter(grid);

 
    // Tarea de mantenimiento: buscar y corregir duplicados al iniciar la app.
    // Esto es útil si sospechas que pudo haber datos corruptos de versiones anteriores.
    // En un entorno de producción, esto podría ser parte de una migración de base de datos.
    await buscarYCorregirDuplicados('notas');
    await buscarYCorregirDuplicados('groups');


    // try {
    //     const notasGuardadas = await cargarNotasDesdeDB();
    //     allNotesContainer.innerHTML = ''; // Limpiar el contenedor por si acaso
    //     notasGuardadas.forEach(nota => {
    //         renderizarNotaEnDOM(nota);
    //     });
    //     console.log('Notas cargadas desde la DB y renderizadas.');
    // } catch (error) {
    //     console.error('Error al cargar las notas iniciales:', error);
    // }
        


    
    // Al cargar la página, activa el filtro "Todas las notas" por defecto.
    // filtrarNotasPorGrupo('all');



    
    // --- Carga Optimizada de Datos ---
    try {
        console.log('Iniciando carga optimizada de datos...');

        // 1. Cargar grupos y notas en paralelo para mayor eficiencia.
        const [gruposGuardados, notasGuardadas] = await Promise.all([
            cargarGruposDesdeDB(), // Ya vienen ordenados por 'order' desde la DB
            cargarNotasDesdeDB()
        ]);

        console.log(`Cargados ${gruposGuardados.length} grupos y ${notasGuardadas.length} notas.`);

        // 2. Renderizar los grupos.
        const groupsContainer = document.querySelector('.notes-group__container');
        groupsContainer.innerHTML = ''; // Limpiar antes de renderizar.
        gruposGuardados.forEach(grupo => {
            renderizarGrupoEnDOM(grupo);
        });
        console.log('Grupos renderizados.');

        // 3. Renderizar las notas.
        // allNotesContainer.innerHTML = ''; // Limpiar el contenedor de notas.
        gridPinned.innerHTML = ''; // Limpiar el contenedor de notas.
        gridUnpinned.innerHTML = ''; // Limpiar el contenedor de notas.
        notasGuardadas.forEach(nota => {
            renderizarNotaEnDOM(nota);
        });
        // 3.5. Una vez renderizadas todas las notas, las ordenamos.
        // reordenarNotasEnDOM();
        // console.log('Notas renderizadas.');
        // grid.sort('updatedAt:desc')
        gridPinned.sort(ordenarNotas);
        gridUnpinned.sort(ordenarNotas);


        // 4. Inicializar el drag and drop.
        inicializarDragAndDropGrupos();
        console.log('Drag and drop de grupos inicializado.');

        // 5. Activar el filtro por defecto.
        // filtrarNotasPorGrupo('all');
        console.log('Carga inicial completada.');
    } catch (error) {
        console.error('Error durante la carga inicial de datos:', error);
    }









    
    // Inicializar los listeners de los demas archivos
    initGroupManager();
    initNoteEditor();
    initHeader();
    initFilters();
    initUtils();




    // --- LÓGICA DE SELECCIÓN MÚLTIPLE ---
    const selectedNotes = new Set();
    const selectionToolbar = document.getElementById('selection-toolbar');
    const selectionCount = document.getElementById('selection-count');
    const duplicateSelectedBtn = document.getElementById('duplicate-selected-btn');
    const deleteSelectedBtn = document.getElementById('delete-selected-btn');
    const cancelSelectionBtn = document.getElementById('cancel-selection-btn');

    // Muestra u oculta la barra de herramientas y actualiza el contador
    const updateSelectionToolbar = () => {
        const count = selectedNotes.size;
        if (count > 0) {
            selectionCount.textContent = `${count} nota${count > 1 ? 's' : ''} seleccionada${count > 1 ? 's' : ''}`;
            selectionToolbar.classList.add('visible');
            document.body.classList.add('selection-mode-active');
        } else {
            selectionToolbar.classList.remove('visible');
            document.body.classList.remove('selection-mode-active');
        }
    };

    // Cancela la selección y limpia los estilos
    const cancelSelection = () => {
        selectedNotes.forEach(noteId => {
            updateNoteSelectionStyle(noteId, false);
        });
        selectedNotes.clear();
        updateSelectionToolbar();
    };

    // Elimina las notas seleccionadas
    const deleteSelectedNotes = async () => {
        const promises = [];
        for (const noteId of selectedNotes) {
            promises.push(eliminarNotaDeDB(noteId));
            const noteElement = document.getElementById(noteId);
            if (noteElement) {
                const itemInPinned = gridPinned.getItems(noteElement)[0];
                const itemInUnpinned = gridUnpinned.getItems(noteElement)[0];
                if (itemInPinned) {
                    gridPinned.remove([itemInPinned], { removeElements: true });
                }
                if (itemInUnpinned) {
                    gridUnpinned.remove([itemInUnpinned], { removeElements: true });
                }
            }
        }
        await Promise.all(promises);
        cancelSelection(); // Limpiar todo después de eliminar
    };

    // Duplica las notas seleccionadas
    const duplicateSelectedNotes = async () => {
        const promises = [];
        for (const noteId of selectedNotes) {
            promises.push(duplicarNota(noteId));
        }
        await Promise.all(promises);
        cancelSelection(); // Limpiar todo después de duplicar
    };

    // Maneja el evento de selección de una nota
    const handleNoteSelection = (noteId) => {
        if (selectedNotes.has(noteId)) {
            selectedNotes.delete(noteId);
            updateNoteSelectionStyle(noteId, false);
        } else {
            selectedNotes.add(noteId);
            updateNoteSelectionStyle(noteId, true);
        }
        updateSelectionToolbar();
    };

    // Listener para el evento personalizado de selección de nota
    document.addEventListener('toggle-note-selection', (e) => {
        handleNoteSelection(e.detail.noteId);
    });

    // Listeners para los botones de la barra de herramientas
    duplicateSelectedBtn.addEventListener('click', duplicateSelectedNotes);
    deleteSelectedBtn.addEventListener('click', deleteSelectedNotes);
    cancelSelectionBtn.addEventListener('click', cancelSelection);

});
