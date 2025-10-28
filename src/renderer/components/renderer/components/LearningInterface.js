/**
 * Main learning interface component that handles user input and session management
 */
export class LearningInterface {
    constructor(container) {
        this.container = container;
        this.state = {
            isSessionActive: false,
            currentInput: '',
            inputType: 'text',
            isProcessing: false,
            sessionProgress: 0,
            currentStep: '',
            error: null
        };
        this.callbacks = {};
        this.initialize();
    }
    initialize() {
        this.render();
        this.attachEventListeners();
    }
    onLearningRequest(callback) {
        this.callbacks.onLearningRequest = callback;
    }
    onInputTypeChange(callback) {
        this.callbacks.onInputTypeChange = callback;
    }
    onSessionControl(callback) {
        this.callbacks.onSessionControl = callback;
    }
    updateState(updates) {
        this.state = { ...this.state, ...updates };
        this.render();
    }
    render() {
        // Update session status indicator
        const statusIndicator = document.getElementById('sessionStatusIndicator');
        const statusText = document.getElementById('sessionStatusText');
        const sessionControls = document.getElementById('sessionControls');
        const inputArea = document.getElementById('inputArea');
        const progressContainer = document.getElementById('sessionProgressContainer');
        const currentStepDisplay = document.getElementById('currentStepDisplay');
        const errorDisplay = document.getElementById('errorDisplay');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${this.state.isSessionActive ? 'active' : ''}`;
        }
        if (statusText) {
            statusText.textContent = this.state.isSessionActive ? 'Learning Session Active' : 'Ready to Learn';
        }
        if (sessionControls) {
            sessionControls.innerHTML = this.renderSessionControls();
        }
        if (inputArea) {
            inputArea.innerHTML = this.renderInputArea();
        }
        if (progressContainer) {
            if (this.state.isSessionActive) {
                progressContainer.style.display = 'block';
                progressContainer.innerHTML = this.renderProgressIndicator();
            }
            else {
                progressContainer.style.display = 'none';
            }
        }
        if (currentStepDisplay) {
            if (this.state.currentStep) {
                currentStepDisplay.style.display = 'block';
                currentStepDisplay.innerHTML = this.renderCurrentStep();
            }
            else {
                currentStepDisplay.style.display = 'none';
            }
        }
        if (errorDisplay) {
            if (this.state.error) {
                errorDisplay.style.display = 'block';
                errorDisplay.innerHTML = this.renderError();
            }
            else {
                errorDisplay.style.display = 'none';
            }
        }
        // Update input type buttons
        this.updateInputTypeButtons();
    }
    renderSessionControls() {
        if (!this.state.isSessionActive) {
            return `
        <button class="control-btn primary" id="startSession">
          <span class="icon">▶️</span>
          Start Learning
        </button>
      `;
        }
        return `
      <button class="control-btn secondary" id="pauseSession">
        <span class="icon">⏸️</span>
        Pause
      </button>
      <button class="control-btn danger" id="stopSession">
        <span class="icon">⏹️</span>
        Stop
      </button>
    `;
    }
    renderProgressIndicator() {
        return `
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${this.state.sessionProgress}%"></div>
        </div>
        <div class="progress-text">${Math.round(this.state.sessionProgress)}% Complete</div>
      </div>
    `;
    }
    updateInputTypeButtons() {
        const buttons = document.querySelectorAll('.input-type-btn');
        buttons.forEach(button => {
            const btn = button;
            const type = btn.dataset.type;
            if (type === this.state.inputType) {
                btn.classList.add('active');
            }
            else {
                btn.classList.remove('active');
            }
        });
    }
    renderInputArea() {
        switch (this.state.inputType) {
            case 'text':
                return `
          <div class="text-input-area">
            <div class="input-header">
              <h4>Text Input</h4>
              <p class="input-description">Describe what you'd like to learn in natural language</p>
            </div>
            <textarea 
              id="textInput" 
              placeholder="Example: 'Teach me how to build a modern e-commerce website using no-code tools'"
              rows="5"
              ${this.state.isProcessing ? 'disabled' : ''}
            >${this.state.currentInput}</textarea>
            <div class="input-actions">
              <button 
                class="submit-btn ${this.state.isProcessing ? 'processing' : ''}" 
                id="submitText"
                ${this.state.isProcessing || !this.state.currentInput.trim() ? 'disabled' : ''}
              >
                ${this.state.isProcessing ?
                    '<span class="loading"></span>Processing...' :
                    '<span class="icon">🚀</span>Start Learning'}
              </button>
              ${this.state.currentInput.trim() ? `
                <button class="clear-btn" id="clearText">
                  <span class="icon">🗑️</span>Clear
                </button>
              ` : ''}
            </div>
          </div>
        `;
            case 'voice':
                return `
          <div class="voice-input-area">
            <div class="input-header">
              <h4>Voice Input</h4>
              <p class="input-description">Speak naturally about what you want to learn</p>
            </div>
            <div class="voice-visualizer ${this.state.isProcessing ? 'recording' : ''}">
              <div class="voice-icon">${this.state.isProcessing ? '🔴' : '🎤'}</div>
              <div class="voice-status">
                ${this.state.isProcessing ? 'Listening... Speak now' : 'Click to start recording'}
              </div>
              ${this.state.isProcessing ? `
                <div class="voice-waveform">
                  <div class="wave"></div>
                  <div class="wave"></div>
                  <div class="wave"></div>
                  <div class="wave"></div>
                </div>
              ` : ''}
            </div>
            <div class="voice-controls">
              <button 
                class="voice-btn ${this.state.isProcessing ? 'recording' : ''}" 
                id="voiceInput"
              >
                ${this.state.isProcessing ?
                    '<span class="icon">⏹️</span>Stop Recording' :
                    '<span class="icon">🎤</span>Start Recording'}
              </button>
            </div>
            ${this.state.currentInput ? `
              <div class="transcription">
                <div class="transcription-header">
                  <strong>Transcription:</strong>
                  <button class="edit-transcription" id="editTranscription">Edit</button>
                </div>
                <div class="transcription-text">${this.state.currentInput}</div>
                <button class="submit-btn" id="submitVoice">
                  <span class="icon">🚀</span>Start Learning
                </button>
              </div>
            ` : ''}
          </div>
        `;
            case 'image':
                return `
          <div class="image-input-area">
            <div class="input-header">
              <h4>Image Input</h4>
              <p class="input-description">Upload a screenshot, diagram, or reference image</p>
            </div>
            <div class="image-drop-zone ${this.state.currentInput ? 'has-image' : ''}" id="imageDropZone">
              ${!this.state.currentInput ? `
                <div class="drop-zone-content">
                  <span class="icon">📷</span>
                  <p class="main-text">Drop an image here or click to select</p>
                  <p class="hint">Supported formats: JPG, PNG, GIF, WebP</p>
                  <p class="hint">Max size: 10MB</p>
                </div>
              ` : ''}
              <input type="file" id="imageInput" accept="image/*" style="display: none;">
            </div>
            ${this.state.currentInput ? `
              <div class="image-preview">
                <img src="${this.state.currentInput}" alt="Uploaded image" />
                <div class="image-actions">
                  <button class="remove-image" id="removeImage">
                    <span class="icon">🗑️</span>Remove
                  </button>
                  <button class="submit-btn" id="submitImage">
                    <span class="icon">🚀</span>Analyze & Learn
                  </button>
                </div>
              </div>
              <div class="image-description">
                <textarea 
                  id="imageDescription" 
                  placeholder="Optional: Describe what you want to learn from this image..."
                  rows="3"
                ></textarea>
              </div>
            ` : ''}
          </div>
        `;
            default:
                return '';
        }
    }
    renderCurrentStep() {
        return `
      <div class="current-step">
        <div class="step-header">
          <span class="step-icon">📍</span>
          <span class="step-title">Current Step</span>
        </div>
        <div class="step-content">${this.state.currentStep}</div>
      </div>
    `;
    }
    renderError() {
        return `
      <div class="error-display">
        <div class="error-header">
          <span class="error-icon">⚠️</span>
          <span class="error-title">Error</span>
        </div>
        <div class="error-content">${this.state.error}</div>
        <button class="error-dismiss" id="dismissError">Dismiss</button>
      </div>
    `;
    }
    attachEventListeners() {
        // Use document-level event delegation since we're updating existing DOM elements
        document.addEventListener('click', this.handleDocumentClick.bind(this));
        document.addEventListener('input', this.handleDocumentInput.bind(this));
        document.addEventListener('change', this.handleDocumentChange.bind(this));
        // Set up drag and drop listeners
        this.setupDragAndDrop();
    }
    handleDocumentClick(e) {
        const target = e.target;
        const btn = target.closest('button');
        // Input type selection
        if (target.classList.contains('input-type-btn') || target.closest('.input-type-btn')) {
            const inputBtn = target.closest('.input-type-btn');
            const type = inputBtn.dataset.type;
            if (type) {
                this.handleInputTypeChange(type);
            }
        }
        // Session controls
        else if (btn?.id === 'startSessionBtn') {
            this.callbacks.onSessionControl?.('start');
        }
        else if (btn?.id === 'pauseSession') {
            this.callbacks.onSessionControl?.('pause');
        }
        else if (btn?.id === 'stopSession') {
            this.callbacks.onSessionControl?.('stop');
        }
        // Submit buttons
        else if (btn?.id === 'submitText' && !this.state.isProcessing) {
            this.handleSubmitRequest();
        }
        else if (btn?.id === 'submitVoice' && !this.state.isProcessing) {
            this.handleSubmitRequest();
        }
        else if (btn?.id === 'submitImage' && !this.state.isProcessing) {
            this.handleSubmitRequest();
        }
        // Clear button
        else if (btn?.id === 'clearText') {
            this.handleClearInput();
        }
        // Voice input
        else if (btn?.id === 'voiceInput') {
            this.handleVoiceInput();
        }
        // Image input
        else if (target.closest('#imageDropZone') && !target.closest('.image-preview')) {
            const fileInput = document.getElementById('imageInput');
            fileInput?.click();
        }
        else if (btn?.id === 'removeImage') {
            this.handleRemoveImage();
        }
        // Edit transcription
        else if (btn?.id === 'editTranscription') {
            this.handleEditTranscription();
        }
        // Error dismissal
        else if (btn?.id === 'dismissError') {
            this.updateState({ error: null });
        }
    }
    handleDocumentInput(e) {
        const target = e.target;
        if (target.id === 'textInput') {
            this.state.currentInput = target.value;
            this.render();
        }
        else if (target.id === 'imageDescription') {
            // Store image description for context
            this.state.currentInput = target.value;
        }
    }
    handleDocumentChange(e) {
        const target = e.target;
        if (target.id === 'imageInput' && target.files?.[0]) {
            this.handleImageInput(target.files[0]);
        }
    }
    setupDragAndDrop() {
        // Set up drag and drop for image input
        const setupDropZone = () => {
            const dropZone = document.getElementById('imageDropZone');
            if (dropZone && this.state.inputType === 'image') {
                dropZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropZone.classList.add('drag-over');
                });
                dropZone.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    dropZone.classList.remove('drag-over');
                });
                dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropZone.classList.remove('drag-over');
                    const files = e.dataTransfer?.files;
                    if (files?.[0] && files[0].type.startsWith('image/')) {
                        this.handleImageInput(files[0]);
                    }
                });
            }
        };
        // Set up initially and after each render
        setupDropZone();
        // Use MutationObserver to set up drag and drop when DOM changes
        const observer = new MutationObserver(() => {
            if (this.state.inputType === 'image') {
                setupDropZone();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    handleInputTypeChange(type) {
        this.state.inputType = type;
        this.state.currentInput = '';
        this.callbacks.onInputTypeChange?.(type);
        this.render();
    }
    handleSubmitRequest() {
        if (!this.state.currentInput.trim())
            return;
        const request = {
            id: crypto.randomUUID(),
            userId: 'current-user', // This would come from user session
            objective: this.state.currentInput.trim(),
            inputType: this.state.inputType,
            rawInput: this.state.currentInput.trim(),
            timestamp: new Date()
        };
        this.callbacks.onLearningRequest?.(request);
    }
    async handleVoiceInput() {
        if (this.state.isProcessing) {
            // Stop recording
            this.updateState({ isProcessing: false });
            return;
        }
        try {
            this.updateState({ isProcessing: true, error: null });
            // This would integrate with the actual speech recognition
            // For now, simulate the process
            await new Promise(resolve => setTimeout(resolve, 2000));
            const mockTranscription = "I want to learn how to build a modern web application";
            this.updateState({
                isProcessing: false,
                currentInput: mockTranscription
            });
        }
        catch (error) {
            this.updateState({
                isProcessing: false,
                error: 'Failed to process voice input. Please try again.'
            });
        }
    }
    handleImageInput(file) {
        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.updateState({
                error: 'Image file is too large. Please select an image smaller than 10MB.'
            });
            return;
        }
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.updateState({
                error: 'Please select a valid image file (JPG, PNG, GIF, WebP).'
            });
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            this.updateState({ currentInput: result, error: null });
        };
        reader.onerror = () => {
            this.updateState({
                error: 'Failed to read the image file. Please try again.'
            });
        };
        reader.readAsDataURL(file);
    }
    handleClearInput() {
        this.updateState({ currentInput: '', error: null });
        // Clear the actual input element
        const textInput = document.getElementById('textInput');
        if (textInput) {
            textInput.value = '';
            textInput.focus();
        }
    }
    handleRemoveImage() {
        this.updateState({ currentInput: '', error: null });
        // Reset file input
        const fileInput = document.getElementById('imageInput');
        if (fileInput) {
            fileInput.value = '';
        }
    }
    handleEditTranscription() {
        // Convert transcription to editable text area
        const transcriptionText = document.querySelector('.transcription-text');
        if (transcriptionText) {
            const currentText = this.state.currentInput;
            transcriptionText.innerHTML = `
        <textarea 
          id="editableTranscription" 
          rows="3" 
          style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: white; font-family: inherit; resize: vertical;"
        >${currentText}</textarea>
        <div style="margin-top: 10px; display: flex; gap: 10px;">
          <button id="saveTranscription" style="padding: 6px 12px; background: #28ca42; border: none; border-radius: 6px; color: white; cursor: pointer;">Save</button>
          <button id="cancelEdit" style="padding: 6px 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 6px; color: white; cursor: pointer;">Cancel</button>
        </div>
      `;
            // Add event listeners for save/cancel
            const saveBtn = document.getElementById('saveTranscription');
            const cancelBtn = document.getElementById('cancelEdit');
            const editableArea = document.getElementById('editableTranscription');
            saveBtn?.addEventListener('click', () => {
                this.state.currentInput = editableArea.value;
                this.render();
            });
            cancelBtn?.addEventListener('click', () => {
                this.render();
            });
            editableArea?.focus();
        }
    }
    // Enhanced voice input with better error handling
    async handleVoiceInputEnhanced() {
        if (this.state.isProcessing) {
            // Stop recording
            this.updateState({ isProcessing: false });
            return;
        }
        try {
            // Check for speech recognition support
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                this.updateState({
                    error: 'Speech recognition is not supported in this browser. Please use Chrome or Edge.'
                });
                return;
            }
            this.updateState({ isProcessing: true, error: null });
            // Initialize speech recognition
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            let finalTranscript = '';
            recognition.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    }
                    else {
                        interimTranscript += transcript;
                    }
                }
                // Update with interim results
                this.state.currentInput = finalTranscript + interimTranscript;
                this.render();
            };
            recognition.onerror = (event) => {
                this.updateState({
                    isProcessing: false,
                    error: `Speech recognition error: ${event.error}. Please try again.`
                });
            };
            recognition.onend = () => {
                this.updateState({
                    isProcessing: false,
                    currentInput: finalTranscript || this.state.currentInput
                });
            };
            recognition.start();
        }
        catch (error) {
            this.updateState({
                isProcessing: false,
                error: 'Failed to start voice recognition. Please try again.'
            });
        }
    }
    // Public methods for external control
    showInterface() {
        const welcomeSection = document.querySelector('.welcome-section');
        const learningInterface = document.querySelector('.learning-interface');
        if (welcomeSection)
            welcomeSection.classList.add('hidden');
        if (learningInterface)
            learningInterface.classList.remove('hidden');
    }
    hideInterface() {
        const welcomeSection = document.querySelector('.welcome-section');
        const learningInterface = document.querySelector('.learning-interface');
        if (welcomeSection)
            welcomeSection.classList.remove('hidden');
        if (learningInterface)
            learningInterface.classList.add('hidden');
    }
    setPreferences(preferences) {
        // Apply theme
        document.body.className = `theme-${preferences.theme}`;
        // Apply accessibility settings
        if (preferences.accessibility.highContrast) {
            document.body.classList.add('high-contrast');
        }
        if (preferences.accessibility.reducedMotion) {
            document.body.classList.add('reduced-motion');
        }
        // Apply font size
        document.body.style.fontSize = preferences.fontSize === 'small' ? '14px' :
            preferences.fontSize === 'large' ? '18px' : '16px';
    }
}
