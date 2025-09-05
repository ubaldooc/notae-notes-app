/**
 * @fileoverview Un store de estado simple para gestionar el estado global de la aplicación.
 * Proporciona una fuente única de verdad para los datos como notas, grupos y estado del usuario,
* y permite a los componentes suscribirse a los cambios.
 */

const state = {
    user: null,
    notes: [],
    groups: [],
    activeFilter: 'all',
    isTrashVisible: false,
};

const listeners = [];

/**
 * Notifica a todos los suscriptores que el estado ha cambiado.
 */
const notify = () => {
    console.log("Notificando a los suscriptores sobre el cambio de estado...", state);
    listeners.forEach(listener => listener(state));
};

export const store = {
    /**
     * Permite que un componente se suscriba a los cambios de estado.
     * @param {Function} callback - La función a llamar cuando el estado cambie.
     * @returns {Function} Una función para desuscribirse.
     */
    subscribe: (callback) => {
        listeners.push(callback);
        return () => {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    },

    /**
     * Obtiene una copia del estado actual.
     * @returns {object} El estado actual de la aplicación.
     */
    getState: () => {
        return { ...state };
    },

    /**
     * Establece el usuario actual y notifica a los suscriptores.
     * @param {object | null} user - El objeto de usuario o null.
     */
    setUser: (user) => {
        state.user = user;
        notify();
    },

    /**
     * Reemplaza completamente las notas y grupos en el estado.
     * @param {Array} notes - El nuevo array de notas.
     * @param {Array} groups - El nuevo array de grupos.
     */
    setData: (notes, groups) => {
        state.notes = notes;
        state.groups = groups;
        notify();
    },

    /**
     * Añade o actualiza una nota en el estado.
     * @param {object} note - La nota a añadir o actualizar.
     */
    upsertNote: (note) => {
        const index = state.notes.findIndex(n => n.id === note.id);
        if (index > -1) {
            state.notes[index] = note;
        } else {
            state.notes.push(note);
        }
        notify();
    },

    /**
     * Elimina una nota del estado.
     * @param {string} noteId - El ID de la nota a eliminar.
     */
    removeNote: (noteId) => {
        state.notes = state.notes.filter(n => n.id !== noteId);
        notify();
    },

    /**
     * Elimina múltiples notas del estado.
     * @param {string[]} noteIds - Un array de IDs de las notas a eliminar.
     */
    removeNotes: (noteIds) => {
        const idsToRemove = new Set(noteIds);
        state.notes = state.notes.filter(n => !idsToRemove.has(n.id));
        notify();
    },

    /**
     * Añade o actualiza un grupo en el estado.
     * @param {object} group - El grupo a añadir o actualizar.
     */
    upsertGroup: (group) => {
        const index = state.groups.findIndex(g => g.id === group.id);
        if (index > -1) {
            state.groups[index] = group;
        } else {
            state.groups.push(group);
        }
        notify();
    },

    /**
     * Elimina un grupo del estado.
     * @param {string} groupId - El ID del grupo a eliminar.
     */
    removeGroup: (groupId) => {
        state.groups = state.groups.filter(g => g.id !== groupId);
        notify();
    },

    /**
     * Limpia todo el estado, útil para el cierre de sesión.
     */
    clearState: () => {
        state.user = null;
        state.notes = [];
        state.groups = [];
        state.activeFilter = 'all';
        state.isTrashVisible = false;
        notify();
    }
};