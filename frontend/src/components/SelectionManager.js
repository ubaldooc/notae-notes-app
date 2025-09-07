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
        // 1. Mueve las notas a la papelera en la DB (local y backend).
        await moverNotasAPapeleraEnDB(noteIdsToDelete);
        
        // 2. Actualizamos el estado de las notas a 'trashed' en el store.
        // El store se encargará de que la UI se actualice.
        const { notes: allNotes } = store.getState();
        const notesToUpdate = allNotes
            .filter(note => noteIdsToDelete.includes(note.id))
            .map(note => ({ ...note, status: 'trashed' }));
        
        if (notesToUpdate.length > 0) {
            store.dispatch({ type: 'UPSERT_NOTES', payload: notesToUpdate });
        }

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
    const noteIdsToDuplicate = Array.from(selectedNotes);
  if (noteIdsToDuplicate.length === 0) return;

  try {
    // 1. Creamos todas las promesas de duplicación para ejecutarlas en paralelo.
    const duplicationPromises = noteIdsToDuplicate.map(id => duplicarNota(id));
    // 2. Esperamos a que todas las notas se hayan duplicado y guardado en la DB.
    const nuevasNotas = await Promise.all(duplicationPromises);

    // 3. Filtramos por si alguna promesa falló y actualizamos el store con todas las notas nuevas a la vez.
    const notasValidas = nuevasNotas.filter(Boolean);
    if (notasValidas.length > 0) {
      store.dispatch({ type: 'UPSERT_NOTES', payload: notasValidas });
    }

  } catch (error) {
    console.error("Error al duplicar las notas seleccionadas:", error);
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