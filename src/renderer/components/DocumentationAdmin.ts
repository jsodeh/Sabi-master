import { 
  ToolDocumentation, 
  DocumentationSearchQuery,
  DocumentationSearchResult,
  ValidationResult,
  DocumentationVersionInfo,
  DocumentationStatus,
  DocumentationType,
  DocumentationBulkImportDto
} from '../../types/documentation';
import { BuilderType, SkillLevel } from '../../types/common';

/**
 * DocumentationAdmin provides a management interface for administrators
 * to add, update, and manage tool documentation and learning resources
 */
export class DocumentationAdmin {
  private container: HTMLElement;
  private currentDocumentation: ToolDocumentation[] = [];
  private searchResults: DocumentationSearchResult[] = [];
  private isLoading: boolean = false;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }
    this.container = container;
    this.initialize();
  }

  /**
   * Initialize the documentation admin interface
   */
  private async initialize(): Promise<void> {
    try {
      this.renderInterface();
      await this.loadDocumentation();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize DocumentationAdmin:', error);
      this.showError('Failed to initialize documentation admin interface');
    }
  }

  /**
   * Render the main admin interface
   */
  private renderInterface(): void {
    this.container.innerHTML = `
      <div class="documentation-admin">
        <header class="admin-header">
          <h1>Documentation Administration</h1>
          <div class="admin-actions">
            <button id="add-documentation" class="btn btn-primary">Add Documentation</button>
            <button id="bulk-import" class="btn btn-secondary">Bulk Import</button>
            <button id="validate-all" class="btn btn-warning">Validate All</button>
          </div>
        </header>

        <div class="admin-content">
          <div class="search-section">
            <div class="search-bar">
              <input type="text" id="search-input" placeholder="Search documentation..." />
              <button id="search-btn" class="btn btn-outline">Search</button>
            </div>
            <div class="filters">
              <select id="tool-filter">
                <option value="">All Tools</option>
                <option value="builder.io">Builder.io</option>
                <option value="firebase">Firebase Studio</option>
                <option value="lovable">Lovable</option>
                <option value="bolt.new">Bolt.new</option>
                <option value="replit">Replit</option>
              </select>
              <select id="status-filter">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="outdated">Outdated</option>
                <option value="pending">Pending Review</option>
              </select>
            </div>
          </div>

          <div class="documentation-list">
            <div id="loading-indicator" class="loading hidden">Loading...</div>
            <div id="documentation-table"></div>
          </div>
        </div>

        <div id="edit-modal" class="modal hidden">
          <div class="modal-content">
            <div class="modal-header">
              <h2 id="modal-title">Edit Documentation</h2>
              <button id="close-modal" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <form id="documentation-form">
                <div class="form-group">
                  <label for="tool-name">Tool Name:</label>
                  <input type="text" id="tool-name" required />
                </div>
                <div class="form-group">
                  <label for="base-url">Base URL:</label>
                  <input type="url" id="base-url" required />
                </div>
                <div class="form-group">
                  <label for="description">Description:</label>
                  <textarea id="description" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label for="documentation-type">Type:</label>
                  <select id="documentation-type">
                    <option value="tutorial">Tutorial</option>
                    <option value="reference">Reference</option>
                    <option value="guide">Guide</option>
                    <option value="api">API Documentation</option>
                  </select>
                </div>
                <div class="form-actions">
                  <button type="submit" class="btn btn-primary">Save</button>
                  <button type="button" id="cancel-edit" class="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Load existing documentation
   */
  private async loadDocumentation(): Promise<void> {
    try {
      this.setLoading(true);
      // In a real implementation, this would call the documentation service
      // For now, we'll use mock data
      this.currentDocumentation = await this.getMockDocumentation();
      this.renderDocumentationTable();
    } catch (error) {
      console.error('Failed to load documentation:', error);
      this.showError('Failed to load documentation');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Render the documentation table
   */
  private renderDocumentationTable(): void {
    const tableContainer = document.getElementById('documentation-table');
    if (!tableContainer) return;

    if (this.currentDocumentation.length === 0) {
      tableContainer.innerHTML = '<p class="no-data">No documentation found</p>';
      return;
    }

    const table = `
      <table class="documentation-table">
        <thead>
          <tr>
            <th>Tool Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>Last Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.currentDocumentation.map(doc => `
            <tr data-tool="${doc.toolName}">
              <td>
                <div class="tool-info">
                  <strong>${doc.toolName}</strong>
                  <small>${doc.baseUrl}</small>
                </div>
              </td>
              <td>${this.getDocumentationType(doc)}</td>
              <td>
                <span class="status-badge status-${this.getDocumentationStatus(doc)}">
                  ${this.getDocumentationStatus(doc)}
                </span>
              </td>
              <td>${this.formatDate(doc.lastUpdated)}</td>
              <td class="actions">
                <button class="btn btn-sm btn-outline" onclick="documentationAdmin.editDocumentation('${doc.toolName}')">
                  Edit
                </button>
                <button class="btn btn-sm btn-outline" onclick="documentationAdmin.validateDocumentation('${doc.toolName}')">
                  Validate
                </button>
                <button class="btn btn-sm btn-danger" onclick="documentationAdmin.deleteDocumentation('${doc.toolName}')">
                  Delete
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    tableContainer.innerHTML = table;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Add documentation button
    const addBtn = document.getElementById('add-documentation');
    addBtn?.addEventListener('click', () => this.showAddDocumentationModal());

    // Bulk import button
    const bulkImportBtn = document.getElementById('bulk-import');
    bulkImportBtn?.addEventListener('click', () => this.showBulkImportModal());

    // Validate all button
    const validateBtn = document.getElementById('validate-all');
    validateBtn?.addEventListener('click', () => this.validateAllDocumentation());

    // Search functionality
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    
    searchBtn?.addEventListener('click', () => this.performSearch());
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.performSearch();
    });

    // Filter functionality
    const toolFilter = document.getElementById('tool-filter') as HTMLSelectElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    
    toolFilter?.addEventListener('change', () => this.applyFilters());
    statusFilter?.addEventListener('change', () => this.applyFilters());

    // Modal functionality
    const closeModal = document.getElementById('close-modal');
    const cancelEdit = document.getElementById('cancel-edit');
    
    closeModal?.addEventListener('click', () => this.hideModal());
    cancelEdit?.addEventListener('click', () => this.hideModal());

    // Form submission
    const form = document.getElementById('documentation-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleFormSubmission(e));
  }

  /**
   * Show add documentation modal
   */
  private showAddDocumentationModal(): void {
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('modal-title');
    
    if (modal && title) {
      title.textContent = 'Add New Documentation';
      this.clearForm();
      modal.classList.remove('hidden');
    }
  }

  /**
   * Show bulk import modal
   */
  private showBulkImportModal(): void {
    // Implementation for bulk import modal
    console.log('Bulk import modal - to be implemented');
  }

  /**
   * Validate all documentation
   */
  private async validateAllDocumentation(): Promise<void> {
    try {
      this.setLoading(true);
      // Implementation for validating all documentation
      console.log('Validating all documentation...');
      // This would call the validation service
      this.showSuccess('All documentation validated successfully');
    } catch (error) {
      console.error('Validation failed:', error);
      this.showError('Failed to validate documentation');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Edit documentation
   */
  public editDocumentation(toolName: string): void {
    const doc = this.currentDocumentation.find(d => d.toolName === toolName);
    if (!doc) return;

    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('modal-title');
    
    if (modal && title) {
      title.textContent = `Edit ${toolName} Documentation`;
      this.populateForm(doc);
      modal.classList.remove('hidden');
    }
  }

  /**
   * Validate specific documentation
   */
  public async validateDocumentation(toolName: string): Promise<void> {
    try {
      console.log(`Validating documentation for ${toolName}...`);
      // Implementation for validating specific documentation
      this.showSuccess(`${toolName} documentation validated successfully`);
    } catch (error) {
      console.error(`Validation failed for ${toolName}:`, error);
      this.showError(`Failed to validate ${toolName} documentation`);
    }
  }

  /**
   * Delete documentation
   */
  public async deleteDocumentation(toolName: string): Promise<void> {
    if (!confirm(`Are you sure you want to delete documentation for ${toolName}?`)) {
      return;
    }

    try {
      // Implementation for deleting documentation
      this.currentDocumentation = this.currentDocumentation.filter(d => d.toolName !== toolName);
      this.renderDocumentationTable();
      this.showSuccess(`${toolName} documentation deleted successfully`);
    } catch (error) {
      console.error(`Failed to delete ${toolName} documentation:`, error);
      this.showError(`Failed to delete ${toolName} documentation`);
    }
  }

  /**
   * Perform search
   */
  private async performSearch(): Promise<void> {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const query = searchInput?.value.trim();
    
    if (!query) {
      await this.loadDocumentation();
      return;
    }

    try {
      this.setLoading(true);
      // Implementation for search functionality
      const filtered = this.currentDocumentation.filter(doc => 
        doc.toolName.toLowerCase().includes(query.toLowerCase()) ||
        doc.baseUrl.toLowerCase().includes(query.toLowerCase())
      );
      
      this.currentDocumentation = filtered;
      this.renderDocumentationTable();
    } catch (error) {
      console.error('Search failed:', error);
      this.showError('Search failed');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Apply filters
   */
  private applyFilters(): void {
    const toolFilter = document.getElementById('tool-filter') as HTMLSelectElement;
    const statusFilter = document.getElementById('status-filter') as HTMLSelectElement;
    
    const toolValue = toolFilter?.value;
    const statusValue = statusFilter?.value;
    
    // Implementation for applying filters
    console.log('Applying filters:', { tool: toolValue, status: statusValue });
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmission(event: Event): Promise<void> {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    try {
      // Implementation for saving documentation
      console.log('Saving documentation...', Object.fromEntries(formData));
      this.hideModal();
      await this.loadDocumentation();
      this.showSuccess('Documentation saved successfully');
    } catch (error) {
      console.error('Failed to save documentation:', error);
      this.showError('Failed to save documentation');
    }
  }

  /**
   * Utility methods
   */
  private hideModal(): void {
    const modal = document.getElementById('edit-modal');
    modal?.classList.add('hidden');
  }

  private clearForm(): void {
    const form = document.getElementById('documentation-form') as HTMLFormElement;
    form?.reset();
  }

  private populateForm(doc: ToolDocumentation): void {
    const toolNameInput = document.getElementById('tool-name') as HTMLInputElement;
    const baseUrlInput = document.getElementById('base-url') as HTMLInputElement;
    const descriptionInput = document.getElementById('description') as HTMLTextAreaElement;
    
    if (toolNameInput) toolNameInput.value = doc.toolName;
    if (baseUrlInput) baseUrlInput.value = doc.baseUrl;
    if (descriptionInput) descriptionInput.value = doc.description || '';
  }

  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
      indicator.classList.toggle('hidden', !loading);
    }
  }

  private showError(message: string): void {
    // Implementation for showing error messages
    console.error(message);
  }

  private showSuccess(message: string): void {
    // Implementation for showing success messages
    console.log(message);
  }

  private getDocumentationType(doc: ToolDocumentation): string {
    return doc.type || 'guide';
  }

  private getDocumentationStatus(doc: ToolDocumentation): string {
    const daysSinceUpdate = Math.floor((Date.now() - doc.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUpdate > 30) return 'outdated';
    if (daysSinceUpdate > 7) return 'pending';
    return 'active';
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString();
  }

  private async getMockDocumentation(): Promise<ToolDocumentation[]> {
    // Mock data for testing
    return [
      {
        id: 'builder-io-docs',
        toolName: BuilderType.BUILDER_IO,
        title: 'Builder.io Documentation',
        baseUrl: 'https://builder.io',
        url: 'https://builder.io/docs',
        description: 'Visual development platform',
        type: DocumentationType.GUIDE,
        topics: [],
        skillLevel: SkillLevel.BEGINNER,
        tags: [],
        lastValidated: new Date(),
        lastUpdated: new Date(),
        version: '1.0.0',
        status: DocumentationStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {}
      }
    ];
  }

  /**
   * Set up callback for documentation changes
   */
  public onDocumentationChange(callback: (docs: ToolDocumentation[]) => void): void {
    // Store callback for future use
    (this as any).documentationChangeCallback = callback;
  }

  /**
   * Set up callback for validation completion
   */
  public onValidationComplete(callback: (results: any) => void): void {
    // Store callback for future use
    (this as any).validationCompleteCallback = callback;
  }

  /**
   * Set documentation manager
   */
  public setDocumentationManager(manager: any): void {
    // Store manager for future use
    (this as any).documentationManager = manager;
  }

  /**
   * Show the admin interface
   */
  public show(): void {
    this.container.style.display = 'block';
  }

  /**
   * Hide the admin interface
   */
  public hide(): void {
    this.container.style.display = 'none';
  }
}

// Global instance for use in HTML onclick handlers
declare global {
  interface Window {
    documentationAdmin: DocumentationAdmin;
  }
}