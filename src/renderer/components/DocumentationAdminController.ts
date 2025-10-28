/**
 * Documentation Admin Controller
 * Integrates DocumentationAdmin with the main application
 */

import { DocumentationAdmin } from './DocumentationAdmin.js';
import { DocumentationManager } from '../../core/DocumentationManager.js';
import { DocumentationValidationResult } from '../../types/documentation.js';

export interface DocumentationAdminControllerOptions {
  container: HTMLElement;
  documentationManager?: DocumentationManager;
  onDocumentationChange?: () => void;
  onValidationComplete?: (results: DocumentationValidationResult[]) => void;
}

export class DocumentationAdminController {
  private admin: DocumentationAdmin;
  private documentationManager: DocumentationManager;
  private isInitialized: boolean = false;

  constructor(options: DocumentationAdminControllerOptions) {
    this.admin = new DocumentationAdmin(options.container.id || 'documentation-admin-container');
    this.documentationManager = options.documentationManager || new DocumentationManager();
    
    this.setupIntegration();
    
    // Set up callbacks
    if (options.onDocumentationChange) {
      this.admin.onDocumentationChange(options.onDocumentationChange);
    }
    
    if (options.onValidationComplete) {
      this.admin.onValidationComplete(options.onValidationComplete);
    }
  }

  private setupIntegration(): void {
    // Connect the admin interface with the documentation manager
    this.admin.setDocumentationManager(this.documentationManager);
    
    // Set up global reference for onclick handlers
    if (typeof window !== 'undefined') {
      window.documentationAdmin = this.admin;
    }
    
    // Set up default callbacks
    this.admin.onDocumentationChange(() => {
      this.handleDocumentationChange();
    });
    
    this.admin.onValidationComplete((results) => {
      this.handleValidationComplete(results);
    });
    
    this.isInitialized = true;
  }

  private handleDocumentationChange(): void {
    console.log('Documentation changed - refreshing related components');
    // This could trigger updates to other parts of the application
    // that depend on documentation data
  }

  private handleValidationComplete(results: DocumentationValidationResult[]): void {
    console.log(`Validation completed for ${results.length} documents`);
    
    const invalidCount = results.filter(r => !r.isValid).length;
    const highIssueCount = results.filter(r => 
      r.issues.some(issue => issue.severity === 'high')
    ).length;
    
    if (invalidCount > 0) {
      console.warn(`${invalidCount} documents have validation issues`);
    }
    
    if (highIssueCount > 0) {
      console.error(`${highIssueCount} documents have high-severity issues`);
    }
  }

  // Public API
  public show(): void {
    if (!this.isInitialized) {
      throw new Error('DocumentationAdminController not initialized');
    }
    this.admin.show();
  }

  public hide(): void {
    this.admin.hide();
  }

  public getDocumentationManager(): DocumentationManager {
    return this.documentationManager;
  }

  public getAdmin(): DocumentationAdmin {
    return this.admin;
  }

  // Utility methods for external integration
  public async validateAllDocumentation(): Promise<DocumentationValidationResult[]> {
    return await this.documentationManager.validateAllDocumentation();
  }

  public async getDocumentationStats() {
    return await this.documentationManager.getDocumentationStats();
  }

  public async exportDocumentation(toolName?: any) {
    return await this.documentationManager.exportDocumentation(toolName);
  }

  public async importDocumentationFromFile(file: File): Promise<any> {
    const content = await this.readFileContent(file);
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'json':
        return await this.documentationManager.importFromJson(content);
      case 'csv':
        return await this.documentationManager.importFromCsv(content);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Cleanup
  public destroy(): void {
    this.admin.hide();
    
    // Clean up global reference
    if (typeof window !== 'undefined' && window.documentationAdmin === this.admin) {
      (window as any).documentationAdmin = undefined;
    }
    
    this.isInitialized = false;
  }
}

// Factory function for easy creation
export function createDocumentationAdminController(
  container: HTMLElement,
  options: Partial<DocumentationAdminControllerOptions> = {}
): DocumentationAdminController {
  return new DocumentationAdminController({
    container,
    ...options
  });
}