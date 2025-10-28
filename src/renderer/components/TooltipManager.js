/**
 * TooltipManager for contextual help and information
 */

export class TooltipManager {
    constructor() {
        this.activeTooltips = new Map();
        this.tooltipIdCounter = 0;
        this.hoverDelay = 500; // ms
        this.hideDelay = 200; // ms
        this.initialize();
    }

    initialize() {
        this.createTooltipContainer();
        this.setupGlobalEventListeners();
        this.registerTooltipElements();
    }

    createTooltipContainer() {
        let container = document.getElementById('tooltipContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'tooltipContainer';
            container.className = 'tooltip-container';
            document.body.appendChild(container);
        }
        this.container = container;
    }

    setupGlobalEventListeners() {
        // Handle mouse events for tooltip triggers
        document.addEventListener('mouseenter', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.handleMouseEnter(target, e);
            }
        }, true);

        document.addEventListener('mouseleave', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.handleMouseLeave(target, e);
            }
        }, true);

        // Handle focus events for keyboard accessibility
        document.addEventListener('focusin', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.showTooltip(target);
            }
        });

        document.addEventListener('focusout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.hideTooltip(target);
            }
        });

        // Handle scroll and resize to reposition tooltips
        window.addEventListener('scroll', () => {
            this.repositionAllTooltips();
        });

        window.addEventListener('resize', () => {
            this.repositionAllTooltips();
        });
    }

    registerTooltipElements() {
        // Register common UI elements with tooltips
        this.registerTooltip('.input-type-btn[data-type="text"]', {
            content: 'Type your learning request in natural language',
            position: 'bottom'
        });

        this.registerTooltip('.input-type-btn[data-type="voice"]', {
            content: 'Use voice input to describe what you want to learn',
            position: 'bottom'
        });

        this.registerTooltip('.input-type-btn[data-type="image"]', {
            content: 'Upload an image or screenshot for visual learning context',
            position: 'bottom'
        });

        this.registerTooltip('.submit-btn', {
            content: 'Start your personalized learning session',
            position: 'top'
        });

        this.registerTooltip('.settings-btn', {
            content: 'Customize your learning preferences and accessibility options',
            position: 'left'
        });

        this.registerTooltip('.step-dot', {
            content: 'Click to navigate to this learning step',
            position: 'top'
        });

        this.registerTooltip('.end-session-btn', {
            content: 'End the current learning session and save progress',
            position: 'top'
        });
    }

    registerTooltip(selector, options) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.setAttribute('data-tooltip', options.content);
            element.setAttribute('data-tooltip-position', options.position || 'top');
            
            if (options.delay) {
                element.setAttribute('data-tooltip-delay', options.delay);
            }
            
            if (options.theme) {
                element.setAttribute('data-tooltip-theme', options.theme);
            }
        });
    }

    handleMouseEnter(element, event) {
        const delay = parseInt(element.getAttribute('data-tooltip-delay')) || this.hoverDelay;
        
        // Clear any existing timeout for this element
        if (element._tooltipTimeout) {
            clearTimeout(element._tooltipTimeout);
        }

        element._tooltipTimeout = setTimeout(() => {
            this.showTooltip(element, event);
        }, delay);
    }

    handleMouseLeave(element, event) {
        // Clear the show timeout
        if (element._tooltipTimeout) {
            clearTimeout(element._tooltipTimeout);
            element._tooltipTimeout = null;
        }

        // Hide tooltip after a short delay
        setTimeout(() => {
            this.hideTooltip(element);
        }, this.hideDelay);
    }

    showTooltip(element, event = null) {
        const content = element.getAttribute('data-tooltip');
        const position = element.getAttribute('data-tooltip-position') || 'top';
        const theme = element.getAttribute('data-tooltip-theme') || 'default';
        
        if (!content) return;

        const tooltipId = `tooltip-${++this.tooltipIdCounter}`;
        
        const tooltip = {
            id: tooltipId,
            element,
            content,
            position,
            theme,
            visible: false
        };

        // Hide any existing tooltip for this element
        this.hideTooltip(element);

        // Create tooltip element
        const tooltipElement = this.createTooltipElement(tooltip);
        this.container.appendChild(tooltipElement);

        // Position the tooltip
        this.positionTooltip(tooltipElement, element, position);

        // Store reference
        this.activeTooltips.set(element, tooltip);
        element._tooltipId = tooltipId;

        // Show with animation
        requestAnimationFrame(() => {
            tooltipElement.classList.add('tooltip-visible');
            tooltip.visible = true;
        });
    }

    createTooltipElement(tooltip) {
        const tooltipElement = document.createElement('div');
        tooltipElement.className = `tooltip tooltip-${tooltip.theme} tooltip-${tooltip.position}`;
        tooltipElement.setAttribute('data-tooltip-id', tooltip.id);
        tooltipElement.setAttribute('role', 'tooltip');
        
        tooltipElement.innerHTML = `
            <div class="tooltip-content">
                ${this.processTooltipContent(tooltip.content)}
            </div>
            <div class="tooltip-arrow"></div>
        `;

        return tooltipElement;
    }

    processTooltipContent(content) {
        // Process content for rich formatting
        if (typeof content === 'string') {
            // Simple text content
            return content;
        } else if (typeof content === 'object') {
            // Rich content object
            let html = '';
            
            if (content.title) {
                html += `<div class="tooltip-title">${content.title}</div>`;
            }
            
            if (content.description) {
                html += `<div class="tooltip-description">${content.description}</div>`;
            }
            
            if (content.shortcut) {
                html += `<div class="tooltip-shortcut">
                    <span class="tooltip-shortcut-label">Shortcut:</span>
                    <kbd>${content.shortcut}</kbd>
                </div>`;
            }
            
            if (content.tips && content.tips.length > 0) {
                html += `<div class="tooltip-tips">
                    <div class="tooltip-tips-title">Tips:</div>
                    <ul>
                        ${content.tips.map(tip => `<li>${tip}</li>`).join('')}
                    </ul>
                </div>`;
            }
            
            return html;
        }
        
        return content.toString();
    }

    positionTooltip(tooltipElement, targetElement, position) {
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left, top;
        
        switch (position) {
            case 'top':
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                top = targetRect.top - tooltipRect.height - 8;
                break;
                
            case 'bottom':
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                top = targetRect.bottom + 8;
                break;
                
            case 'left':
                left = targetRect.left - tooltipRect.width - 8;
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                break;
                
            case 'right':
                left = targetRect.right + 8;
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                break;
                
            default:
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                top = targetRect.top - tooltipRect.height - 8;
        }
        
        // Adjust for viewport boundaries
        if (left < 8) {
            left = 8;
        } else if (left + tooltipRect.width > viewportWidth - 8) {
            left = viewportWidth - tooltipRect.width - 8;
        }
        
        if (top < 8) {
            top = 8;
        } else if (top + tooltipRect.height > viewportHeight - 8) {
            top = viewportHeight - tooltipRect.height - 8;
        }
        
        tooltipElement.style.left = `${left}px`;
        tooltipElement.style.top = `${top}px`;
    }

    hideTooltip(element) {
        const tooltip = this.activeTooltips.get(element);
        if (!tooltip) return;

        const tooltipElement = this.container.querySelector(`[data-tooltip-id="${tooltip.id}"]`);
        if (tooltipElement) {
            tooltipElement.classList.remove('tooltip-visible');
            tooltipElement.classList.add('tooltip-hiding');
            
            setTimeout(() => {
                tooltipElement.remove();
            }, 200); // Match CSS transition duration
        }

        this.activeTooltips.delete(element);
        delete element._tooltipId;
    }

    hideAllTooltips() {
        const elements = Array.from(this.activeTooltips.keys());
        elements.forEach(element => this.hideTooltip(element));
    }

    repositionAllTooltips() {
        this.activeTooltips.forEach((tooltip, element) => {
            const tooltipElement = this.container.querySelector(`[data-tooltip-id="${tooltip.id}"]`);
            if (tooltipElement && tooltip.visible) {
                this.positionTooltip(tooltipElement, element, tooltip.position);
            }
        });
    }

    // Public API methods
    addTooltip(element, content, options = {}) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) return;

        element.setAttribute('data-tooltip', typeof content === 'string' ? content : JSON.stringify(content));
        element.setAttribute('data-tooltip-position', options.position || 'top');
        
        if (options.delay) {
            element.setAttribute('data-tooltip-delay', options.delay);
        }
        
        if (options.theme) {
            element.setAttribute('data-tooltip-theme', options.theme);
        }
    }

    removeTooltip(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) return;

        this.hideTooltip(element);
        element.removeAttribute('data-tooltip');
        element.removeAttribute('data-tooltip-position');
        element.removeAttribute('data-tooltip-delay');
        element.removeAttribute('data-tooltip-theme');
    }

    updateTooltip(element, content, options = {}) {
        this.removeTooltip(element);
        this.addTooltip(element, content, options);
    }

    // Context-aware tooltip methods
    showContextualTooltips(context) {
        switch (context) {
            case 'learning-input':
                this.showLearningInputTooltips();
                break;
            case 'session-active':
                this.showSessionTooltips();
                break;
            case 'settings':
                this.showSettingsTooltips();
                break;
        }
    }

    showLearningInputTooltips() {
        // Show tooltips relevant to learning input
        const textInput = document.getElementById('textInput');
        if (textInput) {
            this.addTooltip(textInput, {
                title: 'Learning Request Input',
                description: 'Describe what you want to learn in natural language',
                tips: [
                    'Be specific about your goals',
                    'Mention your current skill level',
                    'Include preferred tools or technologies'
                ]
            }, { position: 'bottom', theme: 'info' });
        }
    }

    showSessionTooltips() {
        // Show tooltips relevant to active learning sessions
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            this.addTooltip(progressBar, {
                title: 'Learning Progress',
                description: 'Track your progress through the learning session',
                shortcut: 'Ctrl+P'
            }, { position: 'bottom', theme: 'success' });
        }
    }

    showSettingsTooltips() {
        // Show tooltips relevant to settings
        const settingsElements = document.querySelectorAll('.setting-item');
        settingsElements.forEach(element => {
            const label = element.querySelector('label');
            if (label) {
                const settingName = label.textContent;
                this.addTooltip(element, {
                    title: settingName,
                    description: this.getSettingDescription(settingName)
                }, { position: 'right', theme: 'info' });
            }
        });
    }

    getSettingDescription(settingName) {
        const descriptions = {
            'Theme': 'Choose between light, dark, or automatic theme based on system preference',
            'Font Size': 'Adjust text size for better readability',
            'Learning Pace': 'Control how quickly the system progresses through learning steps',
            'Voice Guidance': 'Enable spoken instructions and feedback',
            'High Contrast': 'Increase visual contrast for better accessibility',
            'Reduced Motion': 'Minimize animations and transitions'
        };
        
        return descriptions[settingName] || 'Customize this setting to improve your learning experience';
    }
}