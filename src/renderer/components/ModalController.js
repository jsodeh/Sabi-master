/**
 * ModalController for interactive dialogs and confirmations
 */

export class ModalController {
    constructor() {
        this.activeModals = new Map();
        this.modalIdCounter = 0;
        this.modalStack = [];
        this.initialize();
    }

    initialize() {
        this.createModalContainer();
        this.setupEventListeners();
    }

    createModalContainer() {
        let container = document.getElementById('modalContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modalContainer';
            container.className = 'modal-container';
            document.body.appendChild(container);
        }
        this.container = container;
    }

    setupEventListeners() {
        // Handle clicks on modal overlay and buttons
        this.container.addEventListener('click', (e) => {
            const target = e.target;
            
            // Close modal when clicking overlay
            if (target.classList.contains('modal-overlay')) {
                const modal = target.querySelector('.modal');
                const modalId = modal?.dataset.modalId;
                if (modalId) {
                    const modalData = this.activeModals.get(modalId);
                    if (modalData && modalData.options.closeOnOverlayClick !== false) {
                        this.closeModal(modalId);
                    }
                }
            }
            
            // Handle modal action buttons
            if (target.classList.contains('modal-action')) {
                const modal = target.closest('.modal');
                const modalId = modal?.dataset.modalId;
                const action = target.dataset.action;
                
                if (modalId && action) {
                    this.handleModalAction(modalId, action, target);
                }
            }
            
            // Handle modal close button
            if (target.classList.contains('modal-close')) {
                const modal = target.closest('.modal');
                const modalId = modal?.dataset.modalId;
                if (modalId) {
                    this.closeModal(modalId);
                }
            }
        });

        // Handle keyboard events
        document.addEventListener('keydown', (e) => {
            if (this.modalStack.length > 0) {
                const topModalId = this.modalStack[this.modalStack.length - 1];
                const modalData = this.activeModals.get(topModalId);
                
                if (e.key === 'Escape' && modalData?.options.closeOnEscape !== false) {
                    this.closeModal(topModalId);
                } else if (e.key === 'Enter' && modalData?.options.confirmOnEnter) {
                    const confirmButton = document.querySelector(`[data-modal-id="${topModalId}"] .modal-action[data-action="confirm"]`);
                    if (confirmButton) {
                        confirmButton.click();
                    }
                }
            }
        });
    }

    showModal(type, options = {}) {
        const modalId = `modal-${++this.modalIdCounter}`;
        
        const modalData = {
            id: modalId,
            type,
            options: {
                title: options.title || '',
                message: options.message || '',
                closeOnOverlayClick: options.closeOnOverlayClick !== false,
                closeOnEscape: options.closeOnEscape !== false,
                confirmOnEnter: options.confirmOnEnter || false,
                size: options.size || 'medium',
                theme: options.theme || 'default',
                ...options
            },
            callbacks: {
                onConfirm: options.onConfirm,
                onCancel: options.onCancel,
                onClose: options.onClose
            }
        };

        this.activeModals.set(modalId, modalData);
        this.modalStack.push(modalId);
        
        this.renderModal(modalData);
        
        // Focus management
        setTimeout(() => {
            this.focusModal(modalId);
        }, 100);

        return modalId;
    }

    renderModal(modalData) {
        const modalElement = document.createElement('div');
        modalElement.className = `modal-overlay modal-${modalData.options.theme}`;
        
        modalElement.innerHTML = `
            <div class="modal modal-${modalData.options.size}" data-modal-id="${modalData.id}" role="dialog" aria-modal="true">
                ${this.renderModalContent(modalData)}
            </div>
        `;

        this.container.appendChild(modalElement);

        // Add animation
        requestAnimationFrame(() => {
            modalElement.classList.add('modal-visible');
        });

        // Update body class to prevent scrolling
        document.body.classList.add('modal-open');
    }

    renderModalContent(modalData) {
        switch (modalData.type) {
            case 'confirm':
                return this.renderConfirmModal(modalData);
            case 'alert':
                return this.renderAlertModal(modalData);
            case 'prompt':
                return this.renderPromptModal(modalData);
            case 'progress':
                return this.renderProgressModal(modalData);
            case 'learning-milestone':
                return this.renderLearningMilestoneModal(modalData);
            case 'error':
                return this.renderErrorModal(modalData);
            case 'help':
                return this.renderHelpModal(modalData);
            default:
                return this.renderCustomModal(modalData);
        }
    }

    renderConfirmModal(modalData) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">${modalData.options.title || 'Confirm Action'}</h3>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="modal-icon">⚠️</div>
                <div class="modal-message">${modalData.options.message}</div>
            </div>
            <div class="modal-footer">
                <button class="modal-action btn-secondary" data-action="cancel">
                    ${modalData.options.cancelText || 'Cancel'}
                </button>
                <button class="modal-action btn-primary" data-action="confirm">
                    ${modalData.options.confirmText || 'Confirm'}
                </button>
            </div>
        `;
    }

    renderAlertModal(modalData) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">${modalData.options.title || 'Alert'}</h3>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="modal-icon">${modalData.options.icon || 'ℹ️'}</div>
                <div class="modal-message">${modalData.options.message}</div>
            </div>
            <div class="modal-footer">
                <button class="modal-action btn-primary" data-action="ok">
                    ${modalData.options.okText || 'OK'}
                </button>
            </div>
        `;
    }

    renderPromptModal(modalData) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">${modalData.options.title || 'Input Required'}</h3>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="modal-message">${modalData.options.message}</div>
                <div class="modal-input-group">
                    <input 
                        type="${modalData.options.inputType || 'text'}" 
                        class="modal-input" 
                        placeholder="${modalData.options.placeholder || ''}"
                        value="${modalData.options.defaultValue || ''}"
                        ${modalData.options.required ? 'required' : ''}
                    />
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-action btn-secondary" data-action="cancel">
                    ${modalData.options.cancelText || 'Cancel'}
                </button>
                <button class="modal-action btn-primary" data-action="submit">
                    ${modalData.options.submitText || 'Submit'}
                </button>
            </div>
        `;
    }

    renderProgressModal(modalData) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">${modalData.options.title || 'Processing...'}</h3>
                ${modalData.options.closeable ? '<button class="modal-close" aria-label="Close">×</button>' : ''}
            </div>
            <div class="modal-body">
                <div class="modal-progress">
                    <div class="progress-spinner"></div>
                    <div class="modal-message">${modalData.options.message}</div>
                    ${modalData.options.showProgress ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${modalData.options.progress || 0}%"></div>
                        </div>
                        <div class="progress-text">${modalData.options.progress || 0}%</div>
                    ` : ''}
                </div>
            </div>
            ${modalData.options.cancelable ? `
                <div class="modal-footer">
                    <button class="modal-action btn-secondary" data-action="cancel">Cancel</button>
                </div>
            ` : ''}
        `;
    }

    renderLearningMilestoneModal(modalData) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">🎉 ${modalData.options.title || 'Milestone Achieved!'}</h3>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="milestone-content">
                    <div class="milestone-icon">🏆</div>
                    <div class="milestone-message">${modalData.options.message}</div>
                    ${modalData.options.skillsLearned ? `
                        <div class="skills-learned">
                            <h4>Skills Learned:</h4>
                            <div class="skill-badges">
                                ${modalData.options.skillsLearned.map(skill => 
                                    `<span class="skill-badge">${skill}</span>`
                                ).join('')}
                            </div>
                        </div>
                    ` : ''}
                    ${modalData.options.nextSteps ? `
                        <div class="next-steps">
                            <h4>What's Next:</h4>
                            <ul>
                                ${modalData.options.nextSteps.map(step => 
                                    `<li>${step}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-action btn-primary" data-action="continue">
                    Continue Learning
                </button>
            </div>
        `;
    }

    renderErrorModal(modalData) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">❌ ${modalData.options.title || 'Error'}</h3>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="error-content">
                    <div class="error-message">${modalData.options.message}</div>
                    ${modalData.options.details ? `
                        <div class="error-details">
                            <details>
                                <summary>Technical Details</summary>
                                <pre>${modalData.options.details}</pre>
                            </details>
                        </div>
                    ` : ''}
                    ${modalData.options.suggestions ? `
                        <div class="error-suggestions">
                            <h4>Suggestions:</h4>
                            <ul>
                                ${modalData.options.suggestions.map(suggestion => 
                                    `<li>${suggestion}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                ${modalData.options.retry ? `
                    <button class="modal-action btn-secondary" data-action="retry">Retry</button>
                ` : ''}
                <button class="modal-action btn-primary" data-action="ok">OK</button>
            </div>
        `;
    }

    renderHelpModal(modalData) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">❓ ${modalData.options.title || 'Help'}</h3>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                <div class="help-content">
                    ${modalData.options.sections ? modalData.options.sections.map(section => `
                        <div class="help-section">
                            <h4>${section.title}</h4>
                            <div class="help-section-content">${section.content}</div>
                        </div>
                    `).join('') : `<div class="help-message">${modalData.options.message}</div>`}
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-action btn-primary" data-action="ok">Got it</button>
            </div>
        `;
    }

    renderCustomModal(modalData) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">${modalData.options.title}</h3>
                <button class="modal-close" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
                ${modalData.options.content || modalData.options.message}
            </div>
            <div class="modal-footer">
                ${modalData.options.actions ? modalData.options.actions.map(action => `
                    <button class="modal-action ${action.class || 'btn-secondary'}" data-action="${action.id}">
                        ${action.label}
                    </button>
                `).join('') : `
                    <button class="modal-action btn-primary" data-action="ok">OK</button>
                `}
            </div>
        `;
    }

    handleModalAction(modalId, action, buttonElement) {
        const modalData = this.activeModals.get(modalId);
        if (!modalData) return;

        let result = null;

        // Get input value for prompt modals
        if (modalData.type === 'prompt' && action === 'submit') {
            const input = document.querySelector(`[data-modal-id="${modalId}"] .modal-input`);
            result = input ? input.value : null;
        }

        // Call appropriate callback
        switch (action) {
            case 'confirm':
            case 'submit':
            case 'ok':
            case 'continue':
                if (modalData.callbacks.onConfirm) {
                    modalData.callbacks.onConfirm(result);
                }
                this.closeModal(modalId);
                break;
                
            case 'cancel':
                if (modalData.callbacks.onCancel) {
                    modalData.callbacks.onCancel();
                }
                this.closeModal(modalId);
                break;
                
            case 'retry':
                if (modalData.callbacks.onRetry) {
                    modalData.callbacks.onRetry();
                }
                this.closeModal(modalId);
                break;
                
            default:
                // Custom action
                if (modalData.callbacks.onAction) {
                    modalData.callbacks.onAction(action, result);
                }
                if (modalData.options.closeOnAction !== false) {
                    this.closeModal(modalId);
                }
        }
    }

    closeModal(modalId) {
        const modalData = this.activeModals.get(modalId);
        if (!modalData) return;

        const modalElement = this.container.querySelector(`[data-modal-id="${modalId}"]`).parentElement;
        
        if (modalElement) {
            modalElement.classList.remove('modal-visible');
            modalElement.classList.add('modal-hiding');
            
            setTimeout(() => {
                modalElement.remove();
            }, 300); // Match CSS transition duration
        }

        // Remove from stack and map
        const stackIndex = this.modalStack.indexOf(modalId);
        if (stackIndex > -1) {
            this.modalStack.splice(stackIndex, 1);
        }
        this.activeModals.delete(modalId);

        // Call close callback
        if (modalData.callbacks.onClose) {
            modalData.callbacks.onClose();
        }

        // Remove body class if no more modals
        if (this.modalStack.length === 0) {
            document.body.classList.remove('modal-open');
        }

        // Focus previous modal or return focus to document
        if (this.modalStack.length > 0) {
            const previousModalId = this.modalStack[this.modalStack.length - 1];
            this.focusModal(previousModalId);
        }
    }

    focusModal(modalId) {
        const modal = document.querySelector(`[data-modal-id="${modalId}"]`);
        if (modal) {
            const focusableElement = modal.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
            if (focusableElement) {
                focusableElement.focus();
            } else {
                modal.focus();
            }
        }
    }

    updateModal(modalId, updates) {
        const modalData = this.activeModals.get(modalId);
        if (!modalData) return;

        Object.assign(modalData.options, updates);
        
        // Re-render the modal
        const modalElement = document.querySelector(`[data-modal-id="${modalId}"]`);
        if (modalElement) {
            modalElement.innerHTML = this.renderModalContent(modalData);
        }
    }

    closeAllModals() {
        const modalIds = [...this.modalStack];
        modalIds.forEach(modalId => this.closeModal(modalId));
    }

    // Convenience methods
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            this.showModal('confirm', {
                message,
                ...options,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    alert(message, options = {}) {
        return new Promise((resolve) => {
            this.showModal('alert', {
                message,
                ...options,
                onConfirm: resolve
            });
        });
    }

    prompt(message, options = {}) {
        return new Promise((resolve) => {
            this.showModal('prompt', {
                message,
                ...options,
                onConfirm: resolve,
                onCancel: () => resolve(null)
            });
        });
    }

    showProgress(message, options = {}) {
        return this.showModal('progress', {
            message,
            closeable: false,
            ...options
        });
    }

    showLearningMilestone(options = {}) {
        return this.showModal('learning-milestone', options);
    }

    showError(message, options = {}) {
        return this.showModal('error', {
            message,
            ...options
        });
    }

    showHelp(options = {}) {
        return this.showModal('help', options);
    }
}