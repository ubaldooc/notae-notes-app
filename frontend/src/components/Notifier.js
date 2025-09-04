/**
 * Muestra una notificación no bloqueante (toast) en la pantalla.
 * @param {string} message - El mensaje a mostrar.
 * @param {'info' | 'success' | 'error' | 'warning'} [type='info'] - El tipo de notificación, que determina su color.
 * @param {number} [duration=3000] - La duración en milisegundos antes de que la notificación desaparezca.
 */
export const showNotification = (message, type = 'info', duration = 4000) => {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error('El contenedor de notificaciones no existe en el DOM.');
        // Como fallback, si el notificador no funciona, usamos un alert para errores.
        if (type === 'error') {
            alert(`ERROR: ${message}`);
        }
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Forzamos un reflow para que la animación de entrada funcione correctamente.
    requestAnimationFrame(() => {
        notification.classList.add('visible');
    });

    // Programamos la desaparición de la notificación.
    setTimeout(() => {
        notification.classList.remove('visible');
        // Esperamos a que la animación de salida termine para eliminar el elemento del DOM.
        notification.addEventListener('transitionend', () => notification.remove());
    }, duration);
};

export const initNotifier = () => {
    // Esta función se mantiene por si en el futuro se necesita una inicialización más compleja.
    console.log("Sistema de notificaciones inicializado.");
};