const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Función auxiliar genérica para realizar llamadas a la API.
 * Centraliza el manejo de errores, la configuración de la petición y el parseo de la respuesta.
 * @param {string} endpoint - La ruta de la API a la que se llamará (ej. '/notes').
 * @param {object} options - Opciones para la función fetch (method, headers, body).
 * @param {string} [successMessage] - Mensaje opcional para mostrar en consola si la llamada es exitosa.
 * @returns {Promise<any>} La respuesta JSON del servidor.
 */
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      // Definimos las cabeceras aquí. Si hay un cuerpo, añadimos Content-Type.
      headers: {
        ...options.headers,
        ...(options.body && { 'Content-Type': 'application/json' }),
      },
      credentials: 'include', // Incluye cookies en todas las peticiones
    });

    if (!response.ok) {
      // Intenta parsear un mensaje de error JSON del backend.
      let errorMessage = `Error del servidor: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        // Si el backend envía un objeto con una propiedad 'message', la usamos.
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Si el cuerpo de la respuesta no es JSON, no hacemos nada y usamos el mensaje por defecto.
        console.warn("La respuesta de error de la API no era JSON.");
      }
      // Lanzamos un error con el mensaje obtenido, que será más descriptivo.
      throw new Error(errorMessage);
    }


    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
  } catch (error) {
    // El error ya fue procesado, aquí solo lo logueamos y lo relanzamos
    // para que el código que llamó a apiCall pueda manejarlo.
    console.error(`Error en API -> ${options.method || 'GET'} ${endpoint}:`, error.message);
    throw error;
  }
};

// --- Rutas de Autenticación ---

// Envía el token de Google al backend para verificación e inicio de sesión.
export const loginWithGoogle = (token) =>
  apiCall('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

// Cierra la sesión en el backend (elimina la cookie)
export const logoutFromBackend = () =>
  apiCall('/auth/logout', { method: 'POST' });

// --- Rutas de la API para Notas ---

// Sincroniza una nota con el backend (crear/actualizar)
export const syncNoteWithBackend = (note) =>
  apiCall('/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  });

// Elimina una nota PERMANENTEMENTE del backend
export const deleteNoteFromBackend = (noteId) =>
  apiCall(`/notes/${noteId}`, { method: 'DELETE' });

// Mueve una nota a la papelera en el backend
export const moveNoteToTrashInBackend = (noteId) =>
  apiCall(`/notes/${noteId}/trash`, { method: 'PUT' });

// Restaura una nota desde la papelera en el backend
export const restoreNoteFromBackend = (noteId) =>
  apiCall(`/notes/${noteId}/restore`, { method: 'PUT' });

// Vacía toda la papelera en el backend
export const emptyTrashInBackend = () =>
  apiCall('/notes/trashed', { method: 'DELETE' });

// Actualiza el orden personalizado de múltiples notas en el backend
export const updateNotesOrderInBackend = (notes) =>
  apiCall('/notes/order', {
    method: 'PUT',
    body: JSON.stringify(notes),
  });

// Obtiene TODAS las notas (activas y en papelera) del backend
export const fetchNotesFromBackend = () => apiCall('/notes');

// --- Rutas de la API para Grupos ---

// Obtiene todos los grupos del backend
export const fetchGroupsFromBackend = () => apiCall('/groups');

// Crea un nuevo grupo en el backend
export const createGroupInBackend = (group) =>
  apiCall('/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(group),
  });

// Actualiza un grupo en el backend
export const updateGroupInBackend = (groupId, updates) =>
  apiCall(`/groups/${groupId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

// Elimina un grupo del backend
export const deleteGroupFromBackend = (groupId) =>
  apiCall(`/groups/${groupId}`, { method: 'DELETE' });

// Actualiza el orden de múltiples grupos en el backend
export const updateGroupsOrderInBackend = (groups) =>
  apiCall('/groups/order', {
    method: 'PUT',
    body: JSON.stringify(groups),
  });

// --- Rutas de la API para Usuario ---

// Actualiza la preferencia de tema del usuario
export const updateUserThemeInBackend = (theme) =>
  apiCall('/user/theme', {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  });

// Actualiza las preferencias de vista y orden del usuario
export const updateUserPreferencesInBackend = (preferences) =>
  apiCall('/user/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });

// --- Rutas de la API para Feedback ---

// Envía el feedback del usuario al backend
export const sendFeedbackToBackend = (feedbackText) =>
  apiCall('/feedback', {
    method: 'POST',
    body: JSON.stringify({ feedbackText }),
  });


// --- Rutas de la API para Administrador ---

// Obtiene todos los comentarios (solo para administradores)
export const fetchAdminFeedback = (page = 1, limit = 10, status = 'all', search = '') =>
  apiCall(`/admin/feedback?page=${page}&limit=${limit}&status=${status}&search=${encodeURIComponent(search)}`);

// Marca un comentario como resuelto
export const resolveFeedbackInBackend = (feedbackId) =>
  apiCall(`/admin/feedback/${feedbackId}/resolve`, { method: 'PUT' });

// Elimina un comentario permanentemente
export const deleteFeedbackFromBackend = (feedbackId) =>
  apiCall(`/admin/feedback/${feedbackId}`, { method: 'DELETE' });

// Envía una respuesta a un comentario
export const sendReplyToFeedback = (feedbackId, replyText) =>
  apiCall(`/admin/feedback/${feedbackId}/reply`, { method: 'POST', body: JSON.stringify({ replyText }) });
