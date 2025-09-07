import { loginWithGoogle, logoutFromBackend, updateUserPreferencesInBackend } from './api.js';
import { initDb, deleteDb, closeDb, hasGuestData, importGuestData } from './db.js';
import { showNotification } from '../components/Notifier.js';

import { store } from './store.js';
const GUEST_USER_ID = null;

/**
 * Gestiona el flujo completo de inicio de sesión.
 * @param {object} user - El objeto de usuario recibido del backend.
 */
const handleLoginFlow = async (user) => {
    localStorage.setItem('user', JSON.stringify(user));

    // Guardamos las preferencias del usuario en localStorage para que la UI las use.
    localStorage.setItem('theme', user.theme || 'light');
    localStorage.setItem('noteView', user.noteView || 'grid');
    localStorage.setItem('noteSortOrder', user.noteSortOrder || 'newest');

    await initDb(user.id);

    // Actualizamos el usuario en el store
    store.dispatch({ type: 'SET_USER', payload: user });
    // Dispara un evento global para que la UI (Header, etc.) se actualice.
    document.dispatchEvent(new CustomEvent('session-initialized', { detail: { user } }));
};

/**
 * Se ejecuta tras una respuesta de credenciales de Google.
 * @param {object} response - El objeto de respuesta de Google.
 */
async function handleCredentialResponse(response) {
    const googleToken = response.credential;
    console.log("JWT de Google recibido, enviando al backend para verificación...");

    try {
        const backendResponse = await loginWithGoogle(googleToken);
        await handleLoginFlow(backendResponse.user);
    } catch (error) {
        console.error("Error al verificar el token con el backend:", error);
        showNotification(error.message || "No se pudo iniciar sesión. Inténtalo de nuevo.", "error");
    }
}

/**
 * Inicializa los servicios de identidad de Google y configura el botón de inicio de sesión.
 */
function initializeGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
        console.error("La librería de Google Identity Services no se ha cargado correctamente.");
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
        });

        const customBtn = document.getElementById('custom-google-signin-btn');
        if (customBtn) {
            customBtn.addEventListener('click', () => {
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        console.warn('El prompt de Google no se mostró.');
                    }
                });
            });
        }
    } catch (error) {
        console.error("Error al inicializar Google Sign-In:", error);
    }
}

/**
 * Cierra la sesión del usuario, limpia los datos y cambia a la base de datos de invitado.
 */
export const logout = async () => {
    try {
        await logoutFromBackend();
        console.log("Sesión cerrada en el backend.");
    } catch (error) {
        console.error("Error al cerrar la sesión en el backend:", error);
    }

    const user = JSON.parse(localStorage.getItem('user'));
    localStorage.removeItem('user');
    closeDb();

    if (user && user.id) {
        await deleteDb(user.id);
    }

    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }

    // Cambia a la DB de invitado y notifica a la app.
    await initDb(GUEST_USER_ID);

    // Limpiamos el usuario en el store
    store.dispatch({ type: 'SET_USER', payload: null });
    document.dispatchEvent(new CustomEvent('session-cleared'));
};

/**
 * Comprueba si hay una sesión de usuario guardada al cargar la página e inicializa la DB correspondiente.
 */
const checkExistingSession = async () => {
    const userJSON = localStorage.getItem('user');
    const user = userJSON ? JSON.parse(userJSON) : null;

    if (user) {
        console.log("Sesión existente encontrada. Inicializando DB de usuario.");
        store.dispatch({ type: 'SET_USER', payload: user });
        await initDb(user.id);
        document.dispatchEvent(new CustomEvent('session-initialized', { detail: { user } }));
    } else {
        console.log("No hay sesión. Inicializando DB de invitado.");
        store.dispatch({ type: 'SET_USER', payload: null });
        await initDb(GUEST_USER_ID);
        document.dispatchEvent(new CustomEvent('session-initialized', { detail: { user: null } }));
    }
};

export const initSessionManager = () => {
    initializeGoogleSignIn();
    checkExistingSession();
};