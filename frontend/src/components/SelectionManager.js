import { moverNotaAPapeleraEnDB } from '../services/db.js';
import { duplicarNota, updateNoteSelectionStyle } from './NoteCard.js';

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
    const promises = [];
    for (const noteId of selectedNotes) {
        promises.push(moverNotaAPapeleraEnDB(noteId));
        const noteElement = document.getElementById(noteId);
        if (noteElement) {
            const itemInPinned = gridPinned.getItems(noteElement)[0];
            const itemInUnpinned = gridUnpinned.getItems(noteElement)[0];
            if (itemInPinned) gridPinned.remove([itemInPinned], { removeElements: true });
            if (itemInUnpinned) gridUnpinned.remove([itemInUnpinned], { removeElements: true });
        }
    }
    await Promise.all(promises);
    cancelSelection();
};

/**
 * Duplica todas las notas seleccionadas.
 */
const duplicateSelectedNotes = async () => {
    const promises = [];
    for (const noteId of selectedNotes) {
        promises.push(duplicarNota(noteId));
    }
    await Promise.all(promises);
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