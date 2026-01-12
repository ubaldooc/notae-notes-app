// import { filtrarNotasPorGrupo, setSearchTerm } from "./NoteCard";
import { updateUserThemeInBackend, sendFeedbackToBackend } from '../services/api.js';
import { hasGuestData, importGuestData } from '../services/db.js';
import { showNotification } from './Notifier.js';
import { gridUnpinned } from "../main";




// Vaolres por defecto cuando no hay sesion iniciada
const GUEST_IMAGE_PATH = 'src/assets/guest-perfil.webp';
const GUEST_NAME = 'Invitado';

export const initHeader = () => {

    const perfilContainer = document.querySelector(".perfil-container");
    const logoImg = document.querySelector(".logo");
    const perfilImg = perfilContainer.querySelector(".perfil-img");
    const perfilNombre = perfilContainer.querySelector(".perfil-nombre");
    const dropdownPerfilImg = document.querySelector(".dropdown-profile-header .dropdown-perfil-img");
    const dropdownPerfilNombre = document.querySelector(".dropdown-profile-header .dropdown-perfil-nombre");
    const importGuestDataBtn = document.getElementById("import-guest-data-profile-btn");
    const themeToggleText = document.getElementById('theme-toggle-text');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const logoutBtn = document.getElementById("logout-btn");
    const feedbackBtn = document.getElementById("feedback-btn");

    // Hacemos que las imágenes principales no sean arrastrables
    if (logoImg) logoImg.draggable = false;
    if (perfilImg) perfilImg.draggable = false;
    if (dropdownPerfilImg) dropdownPerfilImg.draggable = false;

    // --- LÓGICA DE INICIO DE PÁGINA ---

    /**
     * Muestra u oculta el botón "Importar datos de invitado" según el estado de la sesión y si existen datos de invitado.
     */
    const toggleImportButtonVisibility = async () => {
        const user = localStorage.getItem('user');
        const guestDataExists = await hasGuestData();
        importGuestDataBtn.style.display = (user && guestDataExists) ? 'flex' : 'none';
    };

    /**
     * Actualiza el texto y el título del botón de tema para que coincida con el estado actual.
     */
    const updateThemeButtonUI = () => {
        const isDarkMode = document.body.classList.contains('dark-mode');
        if (themeToggleText) {
            themeToggleText.textContent = isDarkMode ? 'Modo Claro' : 'Modo Oscuro';
        }
        if (themeToggleBtn) {
            themeToggleBtn.title = isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
        }
    };

    // --- LÓGICA DE SESIÓN ---

    /**
     * Actualiza la interfaz para mostrar el estado de "sesión iniciada".
     * @param {object} userData - Datos del usuario (name, picture).
     */
    async function updateUIAfterLogin(userData) {
        perfilImg.src = userData.picture;
        perfilNombre.textContent = userData.name;
        dropdownPerfilImg.src = userData.picture;
        dropdownPerfilNombre.textContent = userData.name;

        // Aplica el tema guardado del usuario, que es la fuente de la verdad.
        if (userData.theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        // Sincroniza localStorage para mantener la consistencia.
        localStorage.setItem('theme', userData.theme || 'light');

        // Actualiza el texto y el ícono del botón de tema
        updateThemeButtonUI();

        perfilContainer.classList.remove("no-session");
        perfilContainer.classList.add("session-active");

    }

    /**
     * Actualiza la interfaz para mostrar el estado de "invitado" (sin sesión).
     */
    async function updateUIAfterLogout() {
        try {
            perfilImg.src = GUEST_IMAGE_PATH;
            perfilNombre.textContent = GUEST_NAME;
            dropdownPerfilImg.src = GUEST_IMAGE_PATH;
            dropdownPerfilNombre.textContent = GUEST_NAME;
            perfilContainer.classList.remove("session-active");
            perfilContainer.classList.add("no-session");

            // Oculta el botón de importación al cerrar sesión
            await toggleImportButtonVisibility();
        } catch (error) {
            console.error("Error actualizando la UI tras logout:", error);
        }
    }

    // --- LÓGICA DE GOOGLE SIGN-IN ---

    /**
     * Finaliza el proceso de inicio de sesión, inicializando la DB del usuario y actualizando la UI.
     * @param {object} user - El objeto de usuario.
     */

    // CERRAR SESION Y OPCIONES DE PERFIL
    const perfilOptions = document.querySelector(".perfil-options-dropdown");

    perfilContainer.addEventListener("click", () => {
        perfilOptions.classList.toggle("active");
    });

    document.addEventListener("click", (event) => {
        // Si el clic es fuera del contenedor del perfil, cerramos el dropdown
        if (perfilOptions.classList.contains("active") && !perfilContainer.contains(event.target)) {
            perfilOptions.classList.remove("active");
        }
    });

    // El botón de logout ahora llama a la función del SessionManager
    logoutBtn.addEventListener('click', async (event) => {
        event.stopPropagation();
        const { logout } = await import('../services/SessionManager.js');
        logout();
    });

    importGuestDataBtn.addEventListener('click', () => {
        const modal = document.getElementById('confirm-modal-import-guest');
        const confirmBtn = document.getElementById('confirmImportGuestBtn');
        const cancelBtn = document.getElementById('cancelImportGuestBtn');
        const closeBtn = modal.querySelector('.delete-group-close-button');

        modal.style.display = 'flex';
        confirmBtn.focus();

        const closeModalAndCleanup = () => {
            modal.style.display = 'none';
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
            closeBtn.onclick = null;
            modal.onclick = null;
        };

        confirmBtn.onclick = async () => {
            try {
                showNotification('Importando datos de invitado...', 'info');
                await importGuestData();
                showNotification('¡Datos importados con éxito!', 'success');

                // Oculta el botón ya que los datos de invitado han sido eliminados
                await toggleImportButtonVisibility();

                // Dispara un evento para que la UI principal se recargue con los nuevos datos
                document.dispatchEvent(new CustomEvent('data-imported'));
            } catch (error) {
                showNotification('Error al importar los datos.', 'error');
            } finally {
                closeModalAndCleanup();
            }
        };

        cancelBtn.onclick = closeModalAndCleanup;
        closeBtn.onclick = closeModalAndCleanup;
        modal.onclick = (event) => {
            if (event.target === modal) closeModalAndCleanup();
        };
    });

    // --- LÓGICA DEL MODAL DE FEEDBACK ---
    feedbackBtn.addEventListener('click', () => {
        const user = localStorage.getItem('user');
        if (!user) {
            showNotification('Debes iniciar sesión para enviar comentarios.', 'warning');
            return;
        }

        const modal = document.getElementById('feedback-modal');
        const textarea = document.getElementById('feedback-textarea');
        const sendBtn = document.getElementById('send-feedback-btn');
        const closeBtn = modal.querySelector('.delete-group-close-button');

        textarea.value = ''; // Limpiar el textarea
        modal.style.display = 'flex';
        textarea.focus();

        const closeModal = () => {
            modal.style.display = 'none';
            sendBtn.onclick = null;
            closeBtn.onclick = null;
            modal.onclick = null;
        };

        sendBtn.onclick = async () => {
            const feedbackText = textarea.value.trim();
            if (feedbackText.length === 0) {
                showNotification('El comentario no puede estar vacío.', 'warning');
                return;
            }

            try {
                sendBtn.disabled = true;
                sendBtn.textContent = 'Enviando...';
                await sendFeedbackToBackend(feedbackText);
                showNotification('¡Gracias por tus comentarios!', 'success');
                closeModal();
            } catch (error) {
                showNotification('No se pudo enviar el comentario. Inténtalo de nuevo.', 'error');
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Enviar';
            }
        };

        closeBtn.onclick = closeModal;
        modal.onclick = (event) => { if (event.target === modal) closeModal(); };
    });

    // --- LÓGICA DEL TEMA OSCURO ---

    // Al cargar, aplica el tema guardado en localStorage (preferencia de invitado o última sesión)
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') document.body.classList.add('dark-mode');
    updateThemeButtonUI(); // Asegura que el botón esté correcto al cargar la página

    themeToggleBtn.addEventListener('click', async () => {
        document.body.classList.toggle('dark-mode');
        updateThemeButtonUI(); // Actualiza el UI del botón inmediatamente

        // Disparamos un evento global para que otros módulos (como NoteCard) puedan reaccionar.
        document.dispatchEvent(new CustomEvent('theme-changed'));

        const newTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';

        // Guardar en localStorage para persistencia de invitado y carga rápida
        localStorage.setItem('theme', newTheme);

        // Si hay un usuario logueado, guardar en la base de datos
        const userJSON = localStorage.getItem('user');
        if (userJSON) {
            try {
                // La API devuelve el tema actualizado, lo que confirma que se guardó.
                const response = await updateUserThemeInBackend(newTheme);

                // Actualizar el objeto de usuario en localStorage para que la próxima recarga tenga el tema correcto.
                const user = JSON.parse(userJSON);
                user.theme = response.user.theme; // Usamos la respuesta del backend como fuente de la verdad.
                localStorage.setItem('user', JSON.stringify(user));

            } catch (error) {
                showNotification('No se pudo guardar la preferencia de tema.', 'error');
                // Si falla el guardado, revertimos el cambio visual para mantener la consistencia.
                document.body.classList.toggle('dark-mode');
                updateThemeButtonUI();
                localStorage.setItem('theme', newTheme === 'dark' ? 'light' : 'dark');
            }
        }
    });

    // --- LISTENERS DE EVENTOS DE SESIÓN ---
    // El Header ahora solo escucha los eventos que dispara el SessionManager.

    document.addEventListener('session-initialized', async (event) => {
        const { user } = event.detail;
        if (user) {
            await updateUIAfterLogin(user);
        } else {
            await updateUIAfterLogout();
        }
        // Comprueba si debe mostrar el botón de importación
        await toggleImportButtonVisibility();
        // Notifica al resto de la app que la carga inicial está lista.
        document.dispatchEvent(new CustomEvent('initial-ui-load-complete'));
    });

    document.addEventListener('session-cleared', async () => {
        await updateUIAfterLogout();
    });

};
