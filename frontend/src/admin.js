import { fetchAdminFeedback, resolveFeedbackInBackend, deleteFeedbackFromBackend, sendReplyToFeedback } from './services/api.js';
import { formatFecha } from './utils.js';
import { showNotification } from './components/Notifier.js'; // Asegúrate de que Notifier.js esté disponible

document.addEventListener('DOMContentLoaded', async () => {
    const feedbackContainer = document.getElementById('feedback-list-container');
    const loader = document.getElementById('admin-loader');
    const errorMessage = document.getElementById('admin-error-message');
    const paginationControls = document.getElementById('pagination-controls');
    const filterContainer = document.querySelector('.feedback-filters');
    const searchInput = document.getElementById('admin-search-input');

    let currentPage = 1;
    let currentStatus = 'all';
    let currentSearch = '';
    const limit = 10; // Comentarios por página

    const renderFeedback = (feedback) => {
        const feedbackItem = document.createElement('div');
        feedbackItem.className = `feedback-item ${feedback.isResolved ? 'resolved' : ''}`;
        feedbackItem.innerHTML = `
            <div class="feedback-header">
                <span class="feedback-email">${feedback.userEmail}</span>
                <span class="feedback-date">${formatFecha(feedback.createdAt)}</span>
            </div>
            <p class="feedback-text">${escapeHTML(feedback.feedbackText)}</p>
            <div class="feedback-footer">
                <span>ID Usuario: ${feedback.userId}</span>
                <div class="feedback-actions">
                    ${!feedback.isResolved ? `<button class="resolve-btn" data-id="${feedback._id}">Resuelto</button>` : ''}
                    <button class="reply-btn" data-id="${feedback._id}" data-email="${feedback.userEmail}" ${feedback.isReplied ? 'disabled' : ''}>
                        ${feedback.isReplied ? 'Respondido' : 'Responder'}
                    </button>
                    <button class="delete-btn" data-id="${feedback._id}">Eliminar</button>
                </div>
            </div>
        `;
        return feedbackItem;
    };

    const escapeHTML = (str) => {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode(str));
        return p.innerHTML;
    };

    // Debounce function to delay API calls while typing
    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const renderPagination = (currentPage, totalPages) => {
        paginationControls.innerHTML = '';
        if (totalPages <= 1) return;

        const createButton = (text, page, isDisabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.className = 'page-btn';
            btn.innerHTML = text;
            btn.disabled = isDisabled;
            if (isActive) btn.classList.add('active');
            btn.addEventListener('click', () => loadFeedback(page, currentStatus, currentSearch));
            return btn;
        };

        // Botón "Anterior"
        paginationControls.appendChild(
            createButton('&laquo; Anterior', currentPage - 1, currentPage === 1)
        );

        // Botones de número de página
        for (let i = 1; i <= totalPages; i++) {
            paginationControls.appendChild(
                createButton(i, i, false, i === currentPage)
            );
        }

        // Botón "Siguiente"
        paginationControls.appendChild(
            createButton('Siguiente &raquo;', currentPage + 1, currentPage === totalPages)
        );
    };

    const loadFeedback = async (page = 1, status = 'all', search = '') => {
        loader.style.display = 'flex';
        errorMessage.style.display = 'none';
        feedbackContainer.innerHTML = '';
        paginationControls.innerHTML = '';
        currentPage = page;
        currentStatus = status;
        currentSearch = search;

        try {
            const response = await fetchAdminFeedback(currentPage, limit, currentStatus, currentSearch);
            const { feedbacks, totalPages } = response;

            if (feedbacks.length === 0) {
                errorMessage.textContent = search ? 'No se encontraron resultados para tu búsqueda.' : 'No hay comentarios para mostrar con este filtro.';
                errorMessage.style.display = 'block';
            } else {
                feedbacks.forEach(fb => {
                    feedbackContainer.appendChild(renderFeedback(fb));
                });
                renderPagination(currentPage, totalPages);
            }
        } catch (error) {
            if (error.message.includes('403')) {
                errorMessage.textContent = 'Acceso Denegado. No tienes permisos de administrador.';
            } else if (error.message.includes('401')) {
                errorMessage.textContent = 'No has iniciado sesión. Por favor, inicia sesión en la aplicación principal y vuelve a intentarlo.';
            } else {
                errorMessage.textContent = 'Error al cargar los comentarios.';
            }
            errorMessage.style.display = 'block';
        } finally {
            loader.style.display = 'none';
        }
    };

    // Carga inicial
    loadFeedback(1, 'all', '');

    // Event listener para los filtros
    filterContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            const status = e.target.dataset.filter;
            if (status !== currentStatus) {
                // Actualiza la clase activa en los botones
                filterContainer.querySelector('.filter-btn.active').classList.remove('active');
                e.target.classList.add('active');
                // Carga los comentarios con el nuevo filtro, reseteando a la página 1 y manteniendo la búsqueda
                loadFeedback(1, status, currentSearch);
            }
        }
    });

    // Event listener para el buscador con debounce
    const debouncedLoadFeedback = debounce((searchTerm) => {
        loadFeedback(1, currentStatus, searchTerm);
    }, 300); // 300ms de retraso

    searchInput.addEventListener('input', (e) => {
        debouncedLoadFeedback(e.target.value);
    });

    // Event delegation para los botones de "resolver"
    feedbackContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('resolve-btn')) {
            const feedbackId = e.target.dataset.id;
            const button = e.target;
            const feedbackItem = button.closest('.feedback-item');

            button.disabled = true;
            button.textContent = 'Resolviendo...';

            try {
                await resolveFeedbackInBackend(feedbackId);
                feedbackItem.classList.add('resolved');
                button.remove(); // Elimina el botón una vez que la acción es exitosa
            } catch (error) {
                showNotification('No se pudo marcar como resuelto.', 'error');
                button.disabled = false;
                button.textContent = 'Marcar como Resuelto';
            }
        } else if (e.target.classList.contains('reply-btn')) {
            const feedbackId = e.target.dataset.id;
            const userEmail = e.target.dataset.email;
            const feedbackItem = e.target.closest('.feedback-item');
            const originalText = feedbackItem.querySelector('.feedback-text').textContent;

            // Lógica del modal de respuesta
            const modal = document.getElementById('reply-feedback-modal');
            const emailSpan = document.getElementById('reply-user-email');
            const originalTextEl = document.getElementById('reply-original-text');
            const replyTextarea = document.getElementById('reply-textarea');
            const sendBtn = document.getElementById('sendReplyBtn');
            const closeBtn = modal.querySelector('.delete-group-close-button');

            emailSpan.textContent = userEmail;
            originalTextEl.textContent = originalText;
            replyTextarea.value = '';

            modal.style.display = 'flex';
            replyTextarea.focus();

            const closeModal = () => {
                modal.style.display = 'none';
                sendBtn.onclick = null;
            };

            sendBtn.onclick = async () => {
                const replyText = replyTextarea.value.trim();
                if (!replyText) {
                    showNotification('La respuesta no puede estar vacía.', 'warning');
                    return;
                }

                sendBtn.disabled = true;
                sendBtn.textContent = 'Enviando...';

                try {
                    const response = await sendReplyToFeedback(feedbackId, replyText);
                    showNotification('Respuesta enviada con éxito.', 'success');

                    // Actualizar la UI del item en tiempo real
                    if (response.feedback.isResolved) {
                        feedbackItem.classList.add('resolved');
                    }
                    const replyButton = feedbackItem.querySelector('.reply-btn');
                    if (replyButton && response.feedback.isReplied) {
                        replyButton.textContent = 'Respondido';
                        replyButton.disabled = true;
                    }
                    closeModal();
                } catch (error) {
                    showNotification('No se pudo enviar la respuesta.', 'error');
                } finally {
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Enviar Respuesta';
                }
            };

            closeBtn.onclick = closeModal;
            modal.onclick = (event) => { if (event.target === modal) closeModal(); };

        } else if (e.target.classList.contains('delete-btn')) {
            const feedbackId = e.target.dataset.id;
            const feedbackItem = e.target.closest('.feedback-item');

            // Mostrar modal de confirmación
            const modal = document.getElementById('confirm-modal-delete-feedback');
            const confirmBtn = document.getElementById('confirmDeleteFeedbackBtn');
            const cancelBtn = document.getElementById('cancelDeleteFeedbackBtn');
            const closeBtn = modal.querySelector('.delete-group-close-button');

            modal.style.display = 'flex';

            const closeModal = () => {
                modal.style.display = 'none';
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
                closeBtn.onclick = null;
            };

            confirmBtn.onclick = async () => {
                try {
                    await deleteFeedbackFromBackend(feedbackId);
                    feedbackItem.remove(); // Elimina el elemento del DOM
                    showNotification('Comentario eliminado.', 'success');
                } catch (error) {
                    showNotification('No se pudo eliminar el comentario.', 'error');
                } finally {
                    closeModal();
                }
            };

            cancelBtn.onclick = closeModal;
            closeBtn.onclick = closeModal;
            modal.onclick = (event) => { if (event.target === modal) closeModal(); };
        }
    });
});