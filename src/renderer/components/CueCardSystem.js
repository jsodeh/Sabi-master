/**
 * CueCardSystem for displaying contextual learning cards
 */

export class CueCardSystem {
    constructor() {
        this.activeCueCards = new Map();
        this.cardIdCounter = 0;
        this.initialize();
    }

    initialize() {
        this.createCueCardContainer();
        this.setupEventListeners();
    }

    createCueCardContainer() {
        // Create container for cue cards if it doesn't exist
        let container = document.getElementById('cueCardContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'cueCardContainer';
            container.className = 'cue-card-container';
            document.body.appendChild(container);
        }
        this.container = container;
    }

    setupEventListeners() {
        // Handle clicks on cue cards
        this.container.addEventListener('click', (e) => {
            const target = e.target;
            const card = target.closest('.cue-card');
            
            if (target.classList.contains('cue-card-close')) {
                const cardId = card?.dataset.cardId;
                if (cardId) {
                    this.hideCueCard(cardId);
                }
            } else if (target.classList.contains('cue-card-expand')) {
                const cardId = card?.dataset.cardId;
                if (cardId) {
                    this.toggleCueCardExpansion(cardId);
                }
            } else if (target.classList.contains('cue-card-action')) {
                const action = target.dataset.action;
                const cardId = card?.dataset.cardId;
                if (action && cardId) {
                    this.handleCueCardAction(cardId, action);
                }
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Escape to close all cue cards
            if (e.key === 'Escape') {
                this.hideAllCueCards();
            }
        });
    }

    displayCueCard(concept, context, options = {}) {
        const cardId = `cue-card-${++this.cardIdCounter}`;
        
        const cueCard = {
            id: cardId,
            concept,
            context,
            position: options.position || 'top-right',
            priority: options.priority || 'normal',
            autoHide: options.autoHide || false,
            autoHideDelay: options.autoHideDelay || 5000,
            expanded: false,
            timestamp: Date.now()
        };

        this.activeCueCards.set(cardId, cueCard);
        this.renderCueCard(cueCard);

        // Auto-hide if specified
        if (cueCard.autoHide) {
            setTimeout(() => {
                this.hideCueCard(cardId);
            }, cueCard.autoHideDelay);
        }

        return cardId;
    }

    renderCueCard(cueCard) {
        const cardElement = document.createElement('div');
        cardElement.className = `cue-card cue-card-${cueCard.position} cue-card-${cueCard.priority}`;
        cardElement.dataset.cardId = cueCard.id;
        
        cardElement.innerHTML = `
            <div class="cue-card-header">
                <div class="cue-card-title">
                    <span class="cue-card-icon">${this.getConceptIcon(cueCard.concept)}</span>
                    <span class="cue-card-concept">${cueCard.concept}</span>
                </div>
                <div class="cue-card-controls">
                    <button class="cue-card-expand" title="Expand/Collapse">
                        <span class="icon">${cueCard.expanded ? '▼' : '▶'}</span>
                    </button>
                    <button class="cue-card-close" title="Close">
                        <span class="icon">✕</span>
                    </button>
                </div>
            </div>
            <div class="cue-card-content ${cueCard.expanded ? 'expanded' : 'collapsed'}">
                ${this.renderCueCardContent(cueCard)}
            </div>
        `;

        // Add animation class
        cardElement.classList.add('cue-card-entering');
        
        this.container.appendChild(cardElement);

        // Trigger animation
        requestAnimationFrame(() => {
            cardElement.classList.remove('cue-card-entering');
            cardElement.classList.add('cue-card-visible');
        });

        // Position the card
        this.positionCueCard(cardElement, cueCard.position);
    }

    renderCueCardContent(cueCard) {
        const content = this.generateCueCardContent(cueCard.concept, cueCard.context);
        
        return `
            <div class="cue-card-body">
                <div class="cue-card-description">
                    ${content.description}
                </div>
                ${content.tips ? `
                    <div class="cue-card-tips">
                        <h5>💡 Tips:</h5>
                        <ul>
                            ${content.tips.map(tip => `<li>${tip}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${content.actions ? `
                    <div class="cue-card-actions">
                        ${content.actions.map(action => `
                            <button class="cue-card-action" data-action="${action.id}">
                                ${action.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateCueCardContent(concept, context) {
        // Generate contextual content based on concept and context
        const contentMap = {
            'text-input': {
                description: 'Use natural language to describe what you want to learn. Be specific about your goals and current skill level.',
                tips: [
                    'Start with "I want to learn..."',
                    'Mention your experience level',
                    'Include specific technologies or tools you\'re interested in'
                ],
                actions: [
                    { id: 'show-examples', label: 'Show Examples' },
                    { id: 'clear-input', label: 'Clear Input' }
                ]
            },
            'voice-input': {
                description: 'Speak naturally about your learning goals. The system will transcribe and process your request.',
                tips: [
                    'Speak clearly and at a normal pace',
                    'Pause briefly between sentences',
                    'You can edit the transcription before submitting'
                ],
                actions: [
                    { id: 'test-microphone', label: 'Test Microphone' }
                ]
            },
            'session-progress': {
                description: 'Track your learning progress through each step. You can navigate between completed steps.',
                tips: [
                    'Green dots indicate completed steps',
                    'Yellow dot shows your current step',
                    'Click on completed steps to review'
                ]
            },
            'learning-step': {
                description: `You're currently working on: ${context.stepTitle || 'a learning step'}`,
                tips: [
                    'Follow the instructions carefully',
                    'Ask for help if you get stuck',
                    'Take your time to understand each concept'
                ],
                actions: [
                    { id: 'need-help', label: 'Need Help?' },
                    { id: 'skip-step', label: 'Skip Step' }
                ]
            }
        };

        return contentMap[concept] || {
            description: `Learning about: ${concept}`,
            tips: ['Take your time to understand the concept', 'Practice makes perfect']
        };
    }

    getConceptIcon(concept) {
        const iconMap = {
            'text-input': '💬',
            'voice-input': '🎤',
            'image-input': '📷',
            'session-progress': '📊',
            'learning-step': '📚',
            'tool-navigation': '🧭',
            'error-help': '⚠️',
            'success': '✅',
            'tip': '💡',
            'warning': '⚠️'
        };
        return iconMap[concept] || '📋';
    }

    positionCueCard(cardElement, position) {
        // Remove any existing position classes
        cardElement.classList.remove('cue-card-top-left', 'cue-card-top-right', 
                                   'cue-card-bottom-left', 'cue-card-bottom-right',
                                   'cue-card-center');
        
        // Add the specified position class
        cardElement.classList.add(`cue-card-${position}`);

        // Adjust position to avoid overlapping with other cards
        this.adjustCardPosition(cardElement, position);
    }

    adjustCardPosition(cardElement, position) {
        const existingCards = this.container.querySelectorAll(`.cue-card-${position}:not([data-card-id="${cardElement.dataset.cardId}"])`);
        
        if (existingCards.length > 0) {
            const offset = existingCards.length * 20; // 20px offset for each existing card
            
            if (position.includes('top')) {
                cardElement.style.top = `${20 + offset}px`;
            } else if (position.includes('bottom')) {
                cardElement.style.bottom = `${20 + offset}px`;
            }
            
            if (position.includes('right')) {
                cardElement.style.right = `${20 + offset}px`;
            } else if (position.includes('left')) {
                cardElement.style.left = `${20 + offset}px`;
            }
        }
    }

    hideCueCard(cardId) {
        const cardElement = this.container.querySelector(`[data-card-id="${cardId}"]`);
        if (cardElement) {
            cardElement.classList.add('cue-card-exiting');
            
            setTimeout(() => {
                cardElement.remove();
                this.activeCueCards.delete(cardId);
            }, 300); // Match CSS transition duration
        }
    }

    hideAllCueCards() {
        const cardIds = Array.from(this.activeCueCards.keys());
        cardIds.forEach(cardId => this.hideCueCard(cardId));
    }

    toggleCueCardExpansion(cardId) {
        const cueCard = this.activeCueCards.get(cardId);
        const cardElement = this.container.querySelector(`[data-card-id="${cardId}"]`);
        
        if (cueCard && cardElement) {
            cueCard.expanded = !cueCard.expanded;
            
            const content = cardElement.querySelector('.cue-card-content');
            const expandBtn = cardElement.querySelector('.cue-card-expand .icon');
            
            if (cueCard.expanded) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                expandBtn.textContent = '▼';
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                expandBtn.textContent = '▶';
            }
        }
    }

    handleCueCardAction(cardId, action) {
        const cueCard = this.activeCueCards.get(cardId);
        if (!cueCard) return;

        switch (action) {
            case 'show-examples':
                this.showInputExamples();
                break;
            case 'clear-input':
                this.clearCurrentInput();
                break;
            case 'test-microphone':
                this.testMicrophone();
                break;
            case 'need-help':
                this.showHelp(cueCard.context);
                break;
            case 'skip-step':
                this.skipCurrentStep();
                break;
            default:
                console.log('Unknown cue card action:', action);
        }
    }

    showInputExamples() {
        const examples = [
            "I want to learn how to build a modern e-commerce website using no-code tools",
            "Teach me React development from beginner to intermediate level",
            "Help me create a mobile app for task management",
            "I need to learn data visualization with Python"
        ];

        this.displayCueCard('examples', { examples }, {
            position: 'center',
            priority: 'high'
        });
    }

    clearCurrentInput() {
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.value = '';
            textInput.focus();
        }
    }

    testMicrophone() {
        // This would integrate with actual microphone testing
        this.displayCueCard('microphone-test', {}, {
            position: 'center',
            autoHide: true,
            autoHideDelay: 3000
        });
    }

    showHelp(context) {
        this.displayCueCard('help', context, {
            position: 'center',
            priority: 'high'
        });
    }

    skipCurrentStep() {
        // This would integrate with the learning session manager
        console.log('Skip current step requested');
    }

    // Public API methods
    updateCueCard(cardId, updates) {
        const cueCard = this.activeCueCards.get(cardId);
        if (cueCard) {
            Object.assign(cueCard, updates);
            this.renderCueCard(cueCard);
        }
    }

    getCueCard(cardId) {
        return this.activeCueCards.get(cardId);
    }

    getAllCueCards() {
        return Array.from(this.activeCueCards.values());
    }

    clearAllCueCards() {
        this.hideAllCueCards();
    }
}