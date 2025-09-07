/**
 * Un store inspirado en Redux para una gestión de estado predecible.
 * El estado solo puede cambiar como resultado de una acción, a través de un reducer.
 */

const initialState = {
    notes: [],
    groups: [],
    user: null,
    isTrashVisible: false,
};

/**
 * El reducer es una función pura que toma el estado actual y una acción,
 * y devuelve el siguiente estado.
 * @param {object} state - El estado actual.
 * @param {object} action - La acción a procesar, con `type` y `payload`.
 * @returns {object} El nuevo estado.
 */
function appReducer(state = initialState, action) {
    switch (action.type) {
        case 'SET_DATA':
            return {
                ...state,
                notes: action.payload.notes || [],
                groups: action.payload.groups || [],
            };

        case 'SET_USER':
            return {
                ...state,
                user: action.payload,
            };

        case 'CLEAR_STATE':
            return { ...initialState };

        case 'UPSERT_NOTE': {
            const note = action.payload;
            const index = state.notes.findIndex(n => n.id === note.id);
            const newNotes = [...state.notes];
            if (index > -1) {
                newNotes[index] = note;
            } else {
                newNotes.unshift(note);
            }
            return { ...state, notes: newNotes };
        }

        case 'UPSERT_NOTES': {
            const notesToUpsert = action.payload;
            const notesMap = new Map(state.notes.map(n => [n.id, n]));
            notesToUpsert.forEach(note => notesMap.set(note.id, note));
            return { ...state, notes: Array.from(notesMap.values()) };
        }

        case 'REMOVE_NOTE':
            return {
                ...state,
                notes: state.notes.filter(n => n.id !== action.payload),
            };

        case 'REMOVE_NOTES': {
            const idsToRemove = new Set(action.payload);
            return {
                ...state,
                notes: state.notes.filter(n => !idsToRemove.has(n.id)),
            };
        }

        case 'UPSERT_GROUP': {
            const group = action.payload;
            const index = state.groups.findIndex(g => g.id === group.id);
            const newGroups = [...state.groups];
            if (index > -1) {
                newGroups[index] = group;
            } else {
                newGroups.push(group);
            }
            return { ...state, groups: newGroups };
        }

        case 'REMOVE_GROUP':
            return {
                ...state,
                groups: state.groups.filter(g => g.id !== action.payload),
            };

        default:
            return state;
    }
}

/**
 * Crea el store que mantiene el estado de la aplicación.
 * @param {Function} reducer - La función que devuelve el siguiente estado.
 * @returns {object} Un objeto con métodos para interactuar con el store.
 */
const createStore = (reducer) => {
    let state;
    const subscribers = [];

    const getState = () => state;

    const subscribe = (callback) => {
        subscribers.push(callback);
        return () => {
            const index = subscribers.indexOf(callback);
            if (index > -1) subscribers.splice(index, 1);
        };
    };

    const dispatch = (action) => {
        // Calcula el nuevo estado usando el reducer.
        state = reducer(state, action);
        // Notifica a todos los suscriptores.
        console.log("Notificando a los suscriptores sobre el cambio de estado...", state);
        subscribers.forEach(callback => callback(state));
    };

    // Inicializa el estado con una acción "dummy".
    dispatch({ type: '@@INIT' });

    return { getState, subscribe, dispatch };
};

export const store = createStore(appReducer);