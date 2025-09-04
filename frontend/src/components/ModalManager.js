/**
 * @fileoverview Manages accessible modals, handling focus trapping, keyboard navigation, and state.
 */

/**
 * A reusable class to manage accessible modals.
 * It handles focus trapping, keyboard events (Escape, Tab, Arrows), and state.
 */
export class Modal {
    /**
     * @param {string} modalId The ID of the modal element in the DOM.
     */
    constructor(modalId) {
        this.modalElement = document.getElementById(modalId);
        if (!this.modalElement) {
            throw new Error(`Modal with ID "${modalId}" not found.`);
        }

        this.focusableElements = [];
        this.firstFocusableElement = null;
        this.lastFocusableElement = null;
        this.triggerElement = null; // Element that opened the modal

        // Bind methods to ensure 'this' context is correct
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Opens the modal and sets up accessibility features.
     * @param {object} [options] - Configuration options for opening the modal.
     * @param {HTMLElement} [options.triggerElement] - The element that triggered the modal, to return focus to on close.
     * @param {Function} [options.onConfirm] - Callback function to execute when the confirm action is triggered.
     * @param {Function} [options.onCancel] - Callback function to execute when the cancel action is triggered.
     * @param {Function} [options.onClose] - Callback function to execute when the modal is closed (after confirm/cancel).
     */
    open({ triggerElement = document.activeElement, onConfirm, onCancel, onClose } = {}) {
        this.triggerElement = triggerElement;

        // Get all focusable elements within the modal
        this.focusableElements = Array.from(
            this.modalElement.querySelectorAll(
                'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
            )
        );

        if (this.focusableElements.length > 0) {
            this.firstFocusableElement = this.focusableElements[0];
            this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1];
        } else {
            // Si no hay elementos enfocables, los establecemos en null para evitar errores.
            this.firstFocusableElement = null;
            this.lastFocusableElement = null;
        }

        this.modalElement.style.display = 'flex';
        this.firstFocusableElement?.focus();

        document.addEventListener('keydown', this.handleKeyDown);

        // Store callbacks
        this.onConfirm = onConfirm;
        this.onCancel = onCancel;
        this.onClose = onClose;
    }

    /**
     * Closes the modal and cleans up event listeners.
     */
    close() {
        this.modalElement.style.display = 'none';
        document.removeEventListener('keydown', this.handleKeyDown);

        // Execute the onClose callback if it exists
        if (this.onClose) {
            this.onClose();
        }

        // Return focus to the element that opened the modal
        if (this.triggerElement) {
            this.triggerElement.focus();
        }
    }

    /**
     * Handles keyboard events for the modal.
     * @param {KeyboardEvent} event
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'Escape':
                this.cancel();
                break;

            case 'Tab':
                // Trap focus within the modal
                if (event.shiftKey) { // Shift + Tab
                    if (document.activeElement === this.firstFocusableElement) {
                        this.lastFocusableElement.focus();
                        event.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === this.lastFocusableElement) {
                        this.firstFocusableElement.focus();
                        event.preventDefault();
                    }
                }
                break;

            case 'ArrowLeft':
            case 'ArrowRight':
                // Navigate between buttons with arrow keys
                const currentIndex = this.focusableElements.indexOf(document.activeElement);
                if (currentIndex > -1) {
                    event.preventDefault();
                    const nextIndex = (event.key === 'ArrowRight')
                        ? (currentIndex + 1) % this.focusableElements.length
                        : (currentIndex - 1 + this.focusableElements.length) % this.focusableElements.length;
                    this.focusableElements[nextIndex].focus();
                }
                break;
        }
    }

    /**
     * Executes the confirm action and closes the modal.
     */
    confirm() {
        if (this.onConfirm) this.onConfirm();
        this.close();
    }

    /**
     * Executes the cancel action and closes the modal.
     */
    cancel() {
        if (this.onCancel) this.onCancel();
        this.close();
    }
}