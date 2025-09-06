import { moverNotasAPapeleraEnDB } from '../services/db.js';
import { duplicarNota, updateNoteSelectionStyle, moverNotaAPapelera } from './NoteCard.js';
import { store } from '../services/store.js';

// Module-level variables to be initialized
let gridPinned;
let gridUnpinned;

const selectedNotes = new Set();
let selectionToolbar;
let selectionCount;
let duplicateSelectedBtn;
let deleteSelectedBtn;
let cancelSelectionBtn;

/**
 * Muestra u oculta la barra de herramientas de selección y actualiza el contador.
 */
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

/**
 * Cancela la selección múltiple, limpiando el conjunto de notas y los estilos.
 */
const cancelSelection = () => {
    selectedNotes.forEach(noteId => {
        updateNoteSelectionStyle(noteId, false);
    });
    selectedNotes.clear();
    updateSelectionToolbar();
};

/**
 * Mueve todas las notas seleccionadas a la papelera.
 */
const deleteSelectedNotes = async () => {
    const noteIdsToDelete = Array.from(selectedNotes);
    if (noteIdsToDelete.length === 0) return;

    try {
        await moverNotasAPapeleraEnDB(noteIdsToDelete);
        // Actualizamos el estado de cada nota a 'trashed' en el store.
        const { notes } = store.getState();
        noteIdsToDelete.forEach(id => {
            const nota = notes.find(n => n.id === id);
            if (nota) {
                store.upsertNote({ ...nota, status: 'trashed' });
            }
        });

        // --- INICIO: Eliminación visual de las notas ---
        // Este es el paso que faltaba.
        // Iteramos sobre los IDs y eliminamos cada nota de la instancia de Muuri correspondiente.
        const itemsToRemovePinned = [];
        const itemsToRemoveUnpinned = [];
        noteIdsToDelete.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const item = gridPinned.getItem(element) || gridUnpinned.getItem(element);
                if (item) item.getGrid().remove([item], { removeElements: true });
            }
        });
        // --- FIN: Eliminación visual de las notas ---

    } catch (error) {
        console.error("Error al eliminar las notas seleccionadas:", error);
        // Aquí podrías mostrar una notificación de error al usuario.
    }
    cancelSelection();
};

/**
 * Duplica todas las notas seleccionadas.
 */
const duplicateSelectedNotes = async () => {
    // Usamos un bucle for...of para procesar las duplicaciones secuencialmente
    // y evitar problemas de concurrencia.
    for (const noteId of selectedNotes) {
        // La función duplicarNota ahora devolverá la nueva nota creada.
        const nuevaNota = await duplicarNota(noteId);
        if (nuevaNota) {
            // Añadimos la nueva nota directamente al store.
            store.upsertNote(nuevaNota);
        }
    }
    cancelSelection();
};

/**
 * Añade o quita una nota del conjunto de selección.
 * @param {string} noteId - El ID de la nota a seleccionar/deseleccionar.
 */
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

export const initSelectionManager = (grids) => {
    gridPinned = grids.gridPinned;
    gridUnpinned = grids.gridUnpinned;

    selectionToolbar = document.getElementById('selection-toolbar');
    selectionCount = document.getElementById('selection-count');
    duplicateSelectedBtn = document.getElementById('duplicate-selected-btn');
    deleteSelectedBtn = document.getElementById('delete-selected-btn');
    cancelSelectionBtn = document.getElementById('cancel-selection-btn');

    document.addEventListener('toggle-note-selection', (e) => handleNoteSelection(e.detail.noteId));
    document.addEventListener('escape-pressed-shortcut', () => { if (selectedNotes.size > 0) cancelSelection(); });

    duplicateSelectedBtn.addEventListener('click', duplicateSelectedNotes);
    deleteSelectedBtn.addEventListener('click', deleteSelectedNotes);
    cancelSelectionBtn.addEventListener('click', cancelSelection);

    console.log("SelectionManager inicializado.");
};