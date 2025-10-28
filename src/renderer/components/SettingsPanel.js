/**
 * Settings panel component for user preferences and configuration
 */
export class SettingsPanel {
    constructor(container, initialPreferences) {
        this.container = container;
        this.state = {
            isOpen: false,
            activeTab: 'general',
            preferences: initialPreferences,
            hasUnsavedChanges: false
        };
        this.callbacks = {};
        this.initialize();
    }
    initialize() {
        this.render();
        this.attachEventListeners();
    }
    onPreferencesChange(callback) {
        this.callbacks.onPreferencesChange = callback;
    }
    onClose(callback) {
        this.callbacks.onClose = callback;
    }
    open() {
        this.state.isOpen = true;
        this.render();
    }
    close() {
        this.state.isOpen = false;
        this.render();
    }
    updatePreferences(preferences) {
        this.state.preferences = preferences;
        this.state.hasUnsavedChanges = false;
        this.render();
    }
    render() {
        if (!this.state.isOpen) {
            this.container.innerHTML = '';
            return;
        }
        this.container.innerHTML = `
      <div class="settings-overlay">
        <div class="settings-panel">
          <div class="settings-header">
            <h2>Settings</h2>
            <button class="close-btn" id="closeSettings">×</button>
          </div>

          <div class="settings-content">
            <div class="settings-tabs">
              <button class="tab-btn ${this.state.activeTab === 'general' ? 'active' : ''}" 
                      data-tab="general">
                <span class="icon">⚙️</span>
                General
              </button>
              <button class="tab-btn ${this.state.activeTab === 'learning' ? 'active' : ''}" 
                      data-tab="learning">
                <span class="icon">🎓</span>
                Learning
              </button>
              <button class="tab-btn ${this.state.activeTab === 'accessibility' ? 'active' : ''}" 
                      data-tab="accessibility">
                <span class="icon">♿</span>
                Accessibility
              </button>
              <button class="tab-btn ${this.state.activeTab === 'notifications' ? 'active' : ''}" 
                      data-tab="notifications">
                <span class="icon">🔔</span>
                Notifications
              </button>
            </div>

            <div class="settings-body">
              ${this.renderActiveTab()}
            </div>
          </div>

          <div class="settings-footer">
            <button class="btn secondary" id="resetSettings">Reset to Defaults</button>
            <div class="footer-actions">
              <button class="btn secondary" id="cancelSettings">Cancel</button>
              <button class="btn primary ${this.state.hasUnsavedChanges ? '' : 'disabled'}" 
                      id="saveSettings">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }
    renderActiveTab() {
        switch (this.state.activeTab) {
            case 'general':
                return this.renderGeneralTab();
            case 'learning':
                return this.renderLearningTab();
            case 'accessibility':
                return this.renderAccessibilityTab();
            case 'notifications':
                return this.renderNotificationsTab();
            default:
                return '';
        }
    }
    renderGeneralTab() {
        return `
      <div class="tab-content">
        <div class="setting-group">
          <h3>Appearance</h3>
          
          <div class="setting-item">
            <label for="theme">Theme</label>
            <select id="theme" data-setting="theme">
              <option value="light" ${this.state.preferences.theme === 'light' ? 'selected' : ''}>Light</option>
              <option value="dark" ${this.state.preferences.theme === 'dark' ? 'selected' : ''}>Dark</option>
              <option value="auto" ${this.state.preferences.theme === 'auto' ? 'selected' : ''}>Auto</option>
            </select>
          </div>

          <div class="setting-item">
            <label for="fontSize">Font Size</label>
            <select id="fontSize" data-setting="fontSize">
              <option value="small" ${this.state.preferences.fontSize === 'small' ? 'selected' : ''}>Small</option>
              <option value="medium" ${this.state.preferences.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="large" ${this.state.preferences.fontSize === 'large' ? 'selected' : ''}>Large</option>
            </select>
          </div>
        </div>

        <div class="setting-group">
          <h3>Input Preferences</h3>
          
          <div class="setting-item">
            <label for="preferredInputMethod">Preferred Input Method</label>
            <select id="preferredInputMethod" data-setting="preferredInputMethod">
              <option value="text" ${this.state.preferences.preferredInputMethod === 'text' ? 'selected' : ''}>Text</option>
              <option value="voice" ${this.state.preferences.preferredInputMethod === 'voice' ? 'selected' : ''}>Voice</option>
              <option value="image" ${this.state.preferences.preferredInputMethod === 'image' ? 'selected' : ''}>Image</option>
            </select>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="enableVoiceGuidance" 
                   ${this.state.preferences.enableVoiceGuidance ? 'checked' : ''}
                   data-setting="enableVoiceGuidance">
            <label for="enableVoiceGuidance">Enable Voice Guidance</label>
          </div>
        </div>
      </div>
    `;
    }
    renderLearningTab() {
        return `
      <div class="tab-content">
        <div class="setting-group">
          <h3>Learning Style</h3>
          
          <div class="setting-item">
            <label for="explanationDetail">Explanation Detail Level</label>
            <select id="explanationDetail" data-setting="explanationDetail">
              <option value="minimal" ${this.state.preferences.explanationDetail === 'minimal' ? 'selected' : ''}>Minimal</option>
              <option value="moderate" ${this.state.preferences.explanationDetail === 'moderate' ? 'selected' : ''}>Moderate</option>
              <option value="detailed" ${this.state.preferences.explanationDetail === 'detailed' ? 'selected' : ''}>Detailed</option>
            </select>
            <small>How much detail you want in explanations</small>
          </div>

          <div class="setting-item">
            <label for="learningPace">Learning Pace</label>
            <select id="learningPace" data-setting="learningPace">
              <option value="slow" ${this.state.preferences.learningPace === 'slow' ? 'selected' : ''}>Slow</option>
              <option value="normal" ${this.state.preferences.learningPace === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="fast" ${this.state.preferences.learningPace === 'fast' ? 'selected' : ''}>Fast</option>
            </select>
            <small>How quickly you want to progress through steps</small>
          </div>
        </div>

        <div class="setting-group">
          <h3>Learning Features</h3>
          
          <div class="setting-item checkbox">
            <input type="checkbox" id="showCueCards" 
                   ${this.state.preferences.showCueCards ? 'checked' : ''}
                   data-setting="showCueCards">
            <label for="showCueCards">Show Cue Cards</label>
            <small>Display contextual learning cards during sessions</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="autoAdvance" 
                   ${this.state.preferences.autoAdvance ? 'checked' : ''}
                   data-setting="autoAdvance">
            <label for="autoAdvance">Auto-advance Steps</label>
            <small>Automatically move to next step when current step is complete</small>
          </div>
        </div>
      </div>
    `;
    }
    renderAccessibilityTab() {
        return `
      <div class="tab-content">
        <div class="setting-group">
          <h3>Visual Accessibility</h3>
          
          <div class="setting-item checkbox">
            <input type="checkbox" id="highContrast" 
                   ${this.state.preferences.accessibility.highContrast ? 'checked' : ''}
                   data-setting="accessibility.highContrast">
            <label for="highContrast">High Contrast Mode</label>
            <small>Increase contrast for better visibility</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="reducedMotion" 
                   ${this.state.preferences.accessibility.reducedMotion ? 'checked' : ''}
                   data-setting="accessibility.reducedMotion">
            <label for="reducedMotion">Reduce Motion</label>
            <small>Minimize animations and transitions</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="largeClickTargets" 
                   ${this.state.preferences.accessibility.largeClickTargets ? 'checked' : ''}
                   data-setting="accessibility.largeClickTargets">
            <label for="largeClickTargets">Large Click Targets</label>
            <small>Make buttons and interactive elements larger</small>
          </div>
        </div>

        <div class="setting-group">
          <h3>Navigation & Input</h3>
          
          <div class="setting-item checkbox">
            <input type="checkbox" id="keyboardNavigation" 
                   ${this.state.preferences.accessibility.keyboardNavigation ? 'checked' : ''}
                   data-setting="accessibility.keyboardNavigation">
            <label for="keyboardNavigation">Enhanced Keyboard Navigation</label>
            <small>Enable full keyboard navigation support</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="screenReader" 
                   ${this.state.preferences.accessibility.screenReader ? 'checked' : ''}
                   data-setting="accessibility.screenReader">
            <label for="screenReader">Screen Reader Support</label>
            <small>Optimize for screen reader compatibility</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="voiceCommands" 
                   ${this.state.preferences.accessibility.voiceCommands ? 'checked' : ''}
                   data-setting="accessibility.voiceCommands">
            <label for="voiceCommands">Voice Commands</label>
            <small>Enable voice control for navigation</small>
          </div>
        </div>
      </div>
    `;
    }
    renderNotificationsTab() {
        return `
      <div class="tab-content">
        <div class="setting-group">
          <h3>Learning Notifications</h3>
          
          <div class="setting-item checkbox">
            <input type="checkbox" id="stepCompletion" 
                   ${this.state.preferences.notifications.stepCompletion ? 'checked' : ''}
                   data-setting="notifications.stepCompletion">
            <label for="stepCompletion">Step Completion</label>
            <small>Notify when learning steps are completed</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="progressMilestones" 
                   ${this.state.preferences.notifications.progressMilestones ? 'checked' : ''}
                   data-setting="notifications.progressMilestones">
            <label for="progressMilestones">Progress Milestones</label>
            <small>Notify when reaching learning milestones</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="sessionReminders" 
                   ${this.state.preferences.notifications.sessionReminders ? 'checked' : ''}
                   data-setting="notifications.sessionReminders">
            <label for="sessionReminders">Session Reminders</label>
            <small>Remind to continue learning sessions</small>
          </div>
        </div>

        <div class="setting-group">
          <h3>System Notifications</h3>
          
          <div class="setting-item checkbox">
            <input type="checkbox" id="errorAlerts" 
                   ${this.state.preferences.notifications.errorAlerts ? 'checked' : ''}
                   data-setting="notifications.errorAlerts">
            <label for="errorAlerts">Error Alerts</label>
            <small>Notify when errors occur during learning</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="soundEnabled" 
                   ${this.state.preferences.notifications.soundEnabled ? 'checked' : ''}
                   data-setting="notifications.soundEnabled">
            <label for="soundEnabled">Sound Notifications</label>
            <small>Play sounds for notifications</small>
          </div>

          <div class="setting-item checkbox">
            <input type="checkbox" id="vibrationEnabled" 
                   ${this.state.preferences.notifications.vibrationEnabled ? 'checked' : ''}
                   data-setting="notifications.vibrationEnabled">
            <label for="vibrationEnabled">Vibration (if supported)</label>
            <small>Use vibration for notifications</small>
          </div>
        </div>
      </div>
    `;
    }
    attachEventListeners() {
        // Tab switching
        this.container.addEventListener('click', (e) => {
            const target = e.target;
            const tabBtn = target.closest('.tab-btn');
            if (tabBtn) {
                const tab = tabBtn.dataset.tab;
                this.state.activeTab = tab;
                this.render();
            }
        });
        // Close button
        this.container.addEventListener('click', (e) => {
            const target = e.target;
            if (target.id === 'closeSettings' || target.id === 'cancelSettings') {
                this.close();
                this.callbacks.onClose?.();
            }
        });
        // Setting changes
        this.container.addEventListener('change', (e) => {
            const target = e.target;
            const setting = target.dataset.setting;
            if (setting) {
                this.handleSettingChange(setting, target);
            }
        });
        // Save and reset buttons
        this.container.addEventListener('click', (e) => {
            const target = e.target;
            if (target.id === 'saveSettings' && this.state.hasUnsavedChanges) {
                this.saveSettings();
            }
            else if (target.id === 'resetSettings') {
                this.resetToDefaults();
            }
        });
    }
    handleSettingChange(settingPath, element) {
        const value = element.type === 'checkbox' ? element.checked : element.value;
        // Handle nested settings (e.g., "accessibility.highContrast")
        const parts = settingPath.split('.');
        let current = this.state.preferences;
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
        this.state.hasUnsavedChanges = true;
        this.render();
    }
    saveSettings() {
        this.callbacks.onPreferencesChange?.(this.state.preferences);
        this.state.hasUnsavedChanges = false;
        this.render();
    }
    resetToDefaults() {
        const defaultPreferences = {
            explanationDetail: 'moderate',
            learningPace: 'normal',
            preferredInputMethod: 'text',
            enableVoiceGuidance: true,
            showCueCards: true,
            autoAdvance: false,
            theme: 'auto',
            fontSize: 'medium',
            notifications: {
                stepCompletion: true,
                errorAlerts: true,
                progressMilestones: true,
                sessionReminders: false,
                soundEnabled: true,
                vibrationEnabled: false
            },
            accessibility: {
                highContrast: false,
                screenReader: false,
                keyboardNavigation: true,
                reducedMotion: false,
                largeClickTargets: false,
                voiceCommands: false
            }
        };
        this.state.preferences = defaultPreferences;
        this.state.hasUnsavedChanges = true;
        this.render();
    }
}
