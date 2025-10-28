/**
 * ExplanationInterface for real-time action descriptions and reasoning
 */

export class ExplanationInterface {
    constructor(container) {
        this.container = container;
        this.state = {
            isVisible: false,
            currentAction: null,
            actionHistory: [],
            isExpanded: false,
            explanationLevel: 'moderate', // minimal, moderate, detailed
            showReasoning: true,
            autoScroll: true
        };
        this.callbacks = {};
        this.initialize();
    }

    initialize() {
        this.createExplanationPanel();
        this.setupEventListeners();
        this.render();
    }

    createExplanationPanel() {
        // Create the explanation panel if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'explanationInterface';
            this.container.className = 'explanation-interface';
            document.body.appendChild(this.container);
        }
    }

    setupEventListeners() {
        // Handle clicks within the explanation interface
        this.container.addEventListener('click', (e) => {
            const target = e.target;
            
            if (target.classList.contains('explanation-toggle')) {
                this.toggleVisibility();
            } else if (target.classList.contains('explanation-expand')) {
                this.toggleExpansion();
            } else if (target.classList.contains('explanation-clear')) {
                this.clearHistory();
            } else if (target.classList.contains('explanation-level-btn')) {
                const level = target.dataset.level;
                this.setExplanationLevel(level);
            } else if (target.classList.contains('reasoning-toggle')) {
                this.toggleReasoning();
            } else if (target.classList.contains('auto-scroll-toggle')) {
                this.toggleAutoScroll();
            } else if (target.classList.contains('action-item')) {
                const actionId = target.dataset.actionId;
                this.highlightAction(actionId);
            } else if (target.classList.contains('ask-question-btn')) {
                this.showQuestionDialog();
            }
        });

        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + E to toggle explanation interface
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                this.toggleVisibility();
            }
            
            // Ctrl/Cmd + Shift + E to toggle expansion
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.toggleExpansion();
            }
        });
    }

    render() {
        if (!this.state.isVisible) {
            this.container.innerHTML = `
                <div class="explanation-toggle-btn" title="Show Explanations (Ctrl+E)">
                    <span class="icon">💡</span>
                    <span class="label">Explanations</span>
                </div>
            `;
            this.container.className = 'explanation-interface collapsed';
            return;
        }

        this.container.className = `explanation-interface ${this.state.isExpanded ? 'expanded' : 'normal'}`;
        
        this.container.innerHTML = `
            <div class="explanation-header">
                <div class="explanation-title">
                    <span class="icon">💡</span>
                    <span class="title">Real-time Explanations</span>
                    <span class="status-indicator ${this.state.currentAction ? 'active' : 'idle'}"></span>
                </div>
                <div class="explanation-controls">
                    <button class="explanation-expand" title="Toggle Size">
                        <span class="icon">${this.state.isExpanded ? '🔽' : '🔼'}</span>
                    </button>
                    <button class="explanation-toggle" title="Hide Explanations">
                        <span class="icon">✕</span>
                    </button>
                </div>
            </div>

            <div class="explanation-toolbar">
                <div class="explanation-levels">
                    <span class="toolbar-label">Detail Level:</span>
                    <button class="explanation-level-btn ${this.state.explanationLevel === 'minimal' ? 'active' : ''}" 
                            data-level="minimal">Minimal</button>
                    <button class="explanation-level-btn ${this.state.explanationLevel === 'moderate' ? 'active' : ''}" 
                            data-level="moderate">Moderate</button>
                    <button class="explanation-level-btn ${this.state.explanationLevel === 'detailed' ? 'active' : ''}" 
                            data-level="detailed">Detailed</button>
                </div>
                <div class="explanation-options">
                    <label class="option-toggle">
                        <input type="checkbox" class="reasoning-toggle" ${this.state.showReasoning ? 'checked' : ''}>
                        <span>Show Reasoning</span>
                    </label>
                    <label class="option-toggle">
                        <input type="checkbox" class="auto-scroll-toggle" ${this.state.autoScroll ? 'checked' : ''}>
                        <span>Auto Scroll</span>
                    </label>
                </div>
            </div>

            <div class="explanation-content">
                ${this.renderCurrentAction()}
                ${this.renderActionHistory()}
            </div>

            <div class="explanation-footer">
                <button class="ask-question-btn">
                    <span class="icon">❓</span>
                    Ask Question
                </button>
                <button class="explanation-clear">
                    <span class="icon">🗑️</span>
                    Clear History
                </button>
            </div>
        `;

        // Auto-scroll to bottom if enabled
        if (this.state.autoScroll) {
            this.scrollToBottom();
        }
    }

    renderCurrentAction() {
        if (!this.state.currentAction) {
            return `
                <div class="current-action-placeholder">
                    <div class="placeholder-icon">⏳</div>
                    <div class="placeholder-text">Waiting for next action...</div>
                </div>
            `;
        }

        const action = this.state.currentAction;
        return `
            <div class="current-action">
                <div class="action-header">
                    <span class="action-icon">${this.getActionIcon(action.type)}</span>
                    <span class="action-title">Current Action</span>
                    <span class="action-timestamp">${this.formatTimestamp(action.timestamp)}</span>
                </div>
                <div class="action-content">
                    <div class="action-description">
                        ${this.formatActionDescription(action)}
                    </div>
                    ${this.state.showReasoning && action.reasoning ? `
                        <div class="action-reasoning">
                            <div class="reasoning-header">
                                <span class="reasoning-icon">🤔</span>
                                <span class="reasoning-title">Why this action?</span>
                            </div>
                            <div class="reasoning-content">
                                ${action.reasoning}
                            </div>
                        </div>
                    ` : ''}
                    ${action.expectedResult ? `
                        <div class="expected-result">
                            <div class="result-header">
                                <span class="result-icon">🎯</span>
                                <span class="result-title">Expected Result</span>
                            </div>
                            <div class="result-content">
                                ${action.expectedResult}
                            </div>
                        </div>
                    ` : ''}
                </div>
                <div class="action-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${action.progress || 0}%"></div>
                    </div>
                    <div class="progress-text">${action.status || 'In Progress'}</div>
                </div>
            </div>
        `;
    }

    renderActionHistory() {
        if (this.state.actionHistory.length === 0) {
            return '<div class="history-placeholder">No previous actions</div>';
        }

        return `
            <div class="action-history">
                <div class="history-header">
                    <span class="history-icon">📜</span>
                    <span class="history-title">Action History</span>
                    <span class="history-count">(${this.state.actionHistory.length})</span>
                </div>
                <div class="history-list">
                    ${this.state.actionHistory.map((action, index) => `
                        <div class="action-item ${action.status === 'completed' ? 'completed' : action.status === 'failed' ? 'failed' : 'pending'}" 
                             data-action-id="${action.id}">
                            <div class="action-item-header">
                                <span class="action-icon">${this.getActionIcon(action.type)}</span>
                                <span class="action-summary">${this.getActionSummary(action)}</span>
                                <span class="action-timestamp">${this.formatTimestamp(action.timestamp)}</span>
                            </div>
                            ${this.state.explanationLevel !== 'minimal' ? `
                                <div class="action-item-details">
                                    ${action.description}
                                    ${this.state.showReasoning && action.reasoning && this.state.explanationLevel === 'detailed' ? `
                                        <div class="action-reasoning-brief">
                                            <strong>Reasoning:</strong> ${action.reasoning}
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Public API methods
    showAction(action) {
        // Move current action to history if it exists
        if (this.state.currentAction) {
            this.state.actionHistory.unshift({
                ...this.state.currentAction,
                status: this.state.currentAction.status || 'completed'
            });
        }

        // Set new current action
        this.state.currentAction = {
            id: action.id || crypto.randomUUID(),
            type: action.type,
            description: action.description,
            reasoning: action.reasoning,
            expectedResult: action.expectedResult,
            timestamp: action.timestamp || new Date(),
            progress: action.progress || 0,
            status: action.status || 'in_progress'
        };

        // Limit history size
        if (this.state.actionHistory.length > 50) {
            this.state.actionHistory = this.state.actionHistory.slice(0, 50);
        }

        this.render();
        this.callbacks.onActionShown?.(this.state.currentAction);
    }

    updateCurrentAction(updates) {
        if (this.state.currentAction) {
            Object.assign(this.state.currentAction, updates);
            this.render();
        }
    }

    completeCurrentAction(result = null) {
        if (this.state.currentAction) {
            this.state.currentAction.status = 'completed';
            this.state.currentAction.progress = 100;
            if (result) {
                this.state.currentAction.actualResult = result;
            }
            this.render();
        }
    }

    failCurrentAction(error = null) {
        if (this.state.currentAction) {
            this.state.currentAction.status = 'failed';
            if (error) {
                this.state.currentAction.error = error;
            }
            this.render();
        }
    }

    explainAction(actionType, context = {}) {
        const explanations = {
            'navigate': {
                description: `Navigating to ${context.url || 'a new page'}`,
                reasoning: 'Navigation is needed to access the required tools and resources for this learning step.',
                expectedResult: 'The page will load and be ready for interaction'
            },
            'click': {
                description: `Clicking on ${context.element || 'an element'}`,
                reasoning: 'This click will trigger the next step in the learning process.',
                expectedResult: 'The interface will respond and show new options or content'
            },
            'type': {
                description: `Typing "${context.text || 'text'}" into ${context.field || 'a field'}`,
                reasoning: 'This input is required to configure the tool according to your learning objectives.',
                expectedResult: 'The field will be populated and ready for the next step'
            },
            'wait': {
                description: `Waiting for ${context.condition || 'an element to appear'}`,
                reasoning: 'We need to wait for the page to load or process before continuing.',
                expectedResult: 'The expected element or condition will be met'
            },
            'analyze': {
                description: `Analyzing ${context.target || 'the current state'}`,
                reasoning: 'Analysis helps determine the best next steps for your learning journey.',
                expectedResult: 'We will have the information needed to proceed effectively'
            }
        };

        const explanation = explanations[actionType] || {
            description: `Performing ${actionType} action`,
            reasoning: 'This action is part of your personalized learning sequence.',
            expectedResult: 'The action will complete successfully'
        };

        this.showAction({
            type: actionType,
            ...explanation,
            ...context
        });
    }

    // Event handlers
    toggleVisibility() {
        this.state.isVisible = !this.state.isVisible;
        this.render();
        this.callbacks.onVisibilityChange?.(this.state.isVisible);
    }

    toggleExpansion() {
        this.state.isExpanded = !this.state.isExpanded;
        this.render();
    }

    toggleReasoning() {
        this.state.showReasoning = !this.state.showReasoning;
        this.render();
    }

    toggleAutoScroll() {
        this.state.autoScroll = !this.state.autoScroll;
        this.render();
    }

    setExplanationLevel(level) {
        this.state.explanationLevel = level;
        this.render();
        this.callbacks.onLevelChange?.(level);
    }

    clearHistory() {
        this.state.actionHistory = [];
        this.render();
    }

    highlightAction(actionId) {
        // Remove existing highlights
        const highlighted = this.container.querySelectorAll('.action-item.highlighted');
        highlighted.forEach(item => item.classList.remove('highlighted'));

        // Add highlight to selected action
        const actionItem = this.container.querySelector(`[data-action-id="${actionId}"]`);
        if (actionItem) {
            actionItem.classList.add('highlighted');
            actionItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showQuestionDialog() {
        // This would integrate with the modal system
        if (this.callbacks.onQuestionRequest) {
            this.callbacks.onQuestionRequest();
        } else {
            // Fallback to simple prompt
            const question = prompt('What would you like to know about the current action?');
            if (question) {
                this.handleQuestion(question);
            }
        }
    }

    handleQuestion(question) {
        // This would integrate with the AI system to answer questions
        const response = this.generateQuestionResponse(question);
        
        // Show response as a temporary action
        this.showAction({
            type: 'question_response',
            description: `Question: ${question}`,
            reasoning: response,
            expectedResult: 'Your understanding will be improved',
            status: 'completed'
        });
    }

    generateQuestionResponse(question) {
        // Simple question response logic - in real implementation, this would use AI
        const responses = {
            'why': 'This action is necessary to achieve your learning objective and follows best practices.',
            'what': 'This action performs a specific operation that moves you closer to your goal.',
            'how': 'The action is executed by interacting with the interface elements in a specific sequence.',
            'when': 'This action happens at the optimal time in the learning sequence.',
            'where': 'The action takes place in the current tool or interface you are learning about.'
        };

        const questionLower = question.toLowerCase();
        for (const [key, response] of Object.entries(responses)) {
            if (questionLower.includes(key)) {
                return response;
            }
        }

        return 'This action is part of your personalized learning path designed to help you achieve your objectives effectively.';
    }

    // Utility methods
    getActionIcon(actionType) {
        const icons = {
            'navigate': '🧭',
            'click': '👆',
            'type': '⌨️',
            'wait': '⏳',
            'analyze': '🔍',
            'create': '✨',
            'modify': '✏️',
            'delete': '🗑️',
            'save': '💾',
            'load': '📂',
            'question_response': '💬',
            'error': '❌',
            'success': '✅'
        };
        return icons[actionType] || '⚡';
    }

    getActionSummary(action) {
        const summaries = {
            'navigate': `Navigated to page`,
            'click': `Clicked element`,
            'type': `Entered text`,
            'wait': `Waited for condition`,
            'analyze': `Analyzed content`,
            'create': `Created item`,
            'modify': `Modified item`,
            'delete': `Deleted item`,
            'save': `Saved changes`,
            'load': `Loaded content`
        };
        return summaries[action.type] || action.type;
    }

    formatActionDescription(action) {
        if (this.state.explanationLevel === 'minimal') {
            return this.getActionSummary(action);
        } else if (this.state.explanationLevel === 'moderate') {
            return action.description || this.getActionSummary(action);
        } else {
            // Detailed level
            let description = action.description || this.getActionSummary(action);
            if (action.context) {
                description += ` (Context: ${JSON.stringify(action.context)})`;
            }
            return description;
        }
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    }

    scrollToBottom() {
        const content = this.container.querySelector('.explanation-content');
        if (content) {
            content.scrollTop = content.scrollHeight;
        }
    }

    // Callback registration methods
    onActionShown(callback) {
        this.callbacks.onActionShown = callback;
    }

    onVisibilityChange(callback) {
        this.callbacks.onVisibilityChange = callback;
    }

    onLevelChange(callback) {
        this.callbacks.onLevelChange = callback;
    }

    onQuestionRequest(callback) {
        this.callbacks.onQuestionRequest = callback;
    }

    // State management
    getState() {
        return { ...this.state };
    }

    setState(updates) {
        Object.assign(this.state, updates);
        this.render();
    }

    show() {
        this.state.isVisible = true;
        this.render();
    }

    hide() {
        this.state.isVisible = false;
        this.render();
    }
}