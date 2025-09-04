import { abrirEditorNota } from './NoteEditor.js';
import { activarAside } from '../utils.js';

/**
 * Inicializa los atajos de teclado globales de la aplicación.
 */
export const initKeyboardShortcuts = () => {
    console.log("Keyboard shortcuts initialized.");

    document.addEventListener('keydown', (event) => {
        // Usamos event.ctrlKey para Windows/Linux y event.metaKey para macOS (Cmd).
        const isCtrlOrCmd = event.ctrlKey || event.metaKey;

        // No hacer nada si se está editando un campo de texto (como el nombre de un grupo)
        if (event.target.isContentEditable && event.target.classList.contains('group-name')) {
            return;
        }

        // --- Atajos Globales ---
        if (isCtrlOrCmd) {
            switch (event.key.toLowerCase()) {
                // Ctrl + N: Crear nueva nota
                case 'n':
                    event.preventDefault();
                    abrirEditorNota();
                    break;

                // Ctrl + S: Guardar nota actual en el editor
                case 's':
                    event.preventDefault();
                    // Despachamos un evento para que el editor lo maneje,
                    // ya que el estado de la nota actual es interno al editor.
                    document.dispatchEvent(new CustomEvent('save-note-shortcut'));
                    break;

                // Ctrl + B: Alternar la barra lateral
                case 'b':
                    event.preventDefault();
                    activarAside();
                    break;

                // Ctrl + F: Poner el foco en la barra de búsqueda
                case 'f':
                    event.preventDefault();
                    document.getElementById('id__search')?.focus();
                    break;
            }
        }

        // --- Atajos sin modificador (como Escape) ---
        switch (event.key) {
            // Escape: Cerrar modales, cancelar selección, etc.
            case 'Escape':
                // Despachamos eventos para que cada componente decida si debe actuar.
                document.dispatchEvent(new CustomEvent('escape-pressed-shortcut'));
                break;
        }
    });
};