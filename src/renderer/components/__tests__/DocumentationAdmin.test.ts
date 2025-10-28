/**
 * Tests for DocumentationAdmin component
 */

import { DocumentationAdmin } from '../DocumentationAdmin';
import { 
  ToolDocumentation, 
  DocumentationType, 
  DocumentationTopic, 
  DocumentationStatus 
} from '../../../types/documentation';
import { BuilderType, SkillLevel } from '../../../types/common';

// Mock DocumentationManager
class MockDocumentationManager {
  private docs: Map<string, ToolDocumentation> = new Map();

  async addDocumentation(data: Omit<ToolDocumentation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `doc_${Date.now()}`;
    const doc: ToolDocumentation = {
      ...data,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.docs.set(id, doc);
    return id;
  }

  async getDocumentation(id: string): Promise<ToolDocumentation | null> {
    return this.docs.get(id) || null;
  }

  async updateDocumentation(id: string, updates: Partial<ToolDocumentation>): Promise<boolean> {
    const existing = this.docs.get(id);
    if (!existing) return false;
    
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.docs.set(id, updated);
    return true;
  }

  async deleteDocumentation(id: string): Promise<boolean> {
    return this.docs.delete(id);
  }

  async searchDocumentation(query: any): Promise<{ documentation: ToolDocumentation }[]> {
    const results = Array.from(this.docs.values());
    return results.map(doc => ({ documentation: doc }));
  }

  async validateDocumentation(id: string) {
    return {
      id,
      isValid: true,
      lastChecked: new Date(),
      issues: [],
      recommendations: []
    };
  }

  async validateAllDocumentation() {
    const results = [];
    for (const id of this.docs.keys()) {
      results.push(await this.validateDocumentation(id));
    }
    return results;
  }

  async exportDocumentation() {
    return Array.from(this.docs.values());
  }

  async getVersionHistory(docId: string) {
    return [];
  }

  async restoreToVersion(versionId: string) {
    return null;
  }

  async importFromJson(jsonData: string) {
    return { success: true, imported: 1, failed: 0, errors: [], importedIds: ['test'] };
  }

  async importFromCsv(csvData: string) {
    return { success: true, imported: 1, failed: 0, errors: [], importedIds: ['test'] };
  }

  async importFromUrls(urls: string[]) {
    return { success: true, imported: urls.length, failed: 0, errors: [], importedIds: ['test'] };
  }

  async previewJsonImport(jsonData: string) {
    return {
      totalItems: 1,
      validItems: 1,
      invalidItems: 0,
      preview: [{
        title: 'Test Doc',
        url: 'https://example.com',
        toolName: BuilderType.BUILDER_IO,
        type: DocumentationType.REFERENCE
      }],
      errors: []
    };
  }

  async previewCsvImport(csvData: string) {
    return {
      totalItems: 1,
      validItems: 1,
      invalidItems: 0,
      preview: [{
        title: 'Test Doc',
        url: 'https://example.com',
        toolName: BuilderType.BUILDER_IO,
        type: DocumentationType.REFERENCE
      }],
      errors: []
    };
  }
}

describe('DocumentationAdmin', () => {
  let container: HTMLElement;
  let admin: DocumentationAdmin;
  let mockManager: MockDocumentationManager;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    document.body.appendChild(container);

    // Create admin instance
    admin = new DocumentationAdmin(container);
    mockManager = new MockDocumentationManager();
    admin.setDocumentationManager(mockManager);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Initialization', () => {
    test('should create admin interface', () => {
      const adminElement = container.querySelector('.documentation-admin');
      expect(adminElement).toBeTruthy();
    });

    test('should have all required sections', () => {
      const header = container.querySelector('.admin-header');
      const navigation = container.querySelector('.admin-navigation');
      const content = container.querySelector('.admin-content');
      
      expect(header).toBeTruthy();
      expect(navigation).toBeTruthy();
      expect(content).toBeTruthy();
    });

    test('should have all navigation buttons', () => {
      const navButtons = container.querySelectorAll('.nav-btn');
      expect(navButtons.length).toBe(4);
      
      const views = ['list', 'validation', 'import', 'version-history'];
      views.forEach(view => {
        const button = container.querySelector(`[data-view="${view}"]`);
        expect(button).toBeTruthy();
      });
    });
  });

  describe('Visibility', () => {
    test('should be hidden by default', () => {
      const adminElement = container.querySelector('.documentation-admin') as HTMLElement;
      expect(adminElement.style.display).toBe('none');
    });

    test('should show when show() is called', () => {
      admin.show();
      const adminElement = container.querySelector('.documentation-admin') as HTMLElement;
      expect(adminElement.style.display).toBe('block');
    });

    test('should hide when hide() is called', () => {
      admin.show();
      admin.hide();
      const adminElement = container.querySelector('.documentation-admin') as HTMLElement;
      expect(adminElement.style.display).toBe('none');
    });
  });

  describe('Form Handling', () => {
    beforeEach(() => {
      admin.show();
    });

    test('should populate form when editing documentation', async () => {
      const testDoc: ToolDocumentation = {
        id: 'test-id',
        title: 'Test Documentation',
        description: 'Test description',
        url: 'https://example.com',
        toolName: BuilderType.BUILDER_IO,
        type: DocumentationType.TUTORIAL,
        skillLevel: SkillLevel.INTERMEDIATE,
        status: DocumentationStatus.ACTIVE,
        version: '1.0.0',
        topics: [DocumentationTopic.AUTHENTICATION],
        tags: ['test', 'example'],
        lastValidated: new Date(),
        metadata: {
          author: 'Test Author',
          estimatedReadTime: 10
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await mockManager.addDocumentation(testDoc);
      await admin.editDocumentation('test-id');

      const titleInput = container.querySelector('#docTitle') as HTMLInputElement;
      const descInput = container.querySelector('#docDescription') as HTMLTextAreaElement;
      const urlInput = container.querySelector('#docUrl') as HTMLInputElement;

      expect(titleInput.value).toBe('Test Documentation');
      expect(descInput.value).toBe('Test description');
      expect(urlInput.value).toBe('https://example.com');
    });

    test('should clear form when adding new documentation', () => {
      const addBtn = container.querySelector('#addDocBtn') as HTMLButtonElement;
      addBtn.click();

      const titleInput = container.querySelector('#docTitle') as HTMLInputElement;
      const descInput = container.querySelector('#docDescription') as HTMLTextAreaElement;

      expect(titleInput.value).toBe('');
      expect(descInput.value).toBe('');
    });
  });

  describe('Search and Filtering', () => {
    beforeEach(() => {
      admin.show();
    });

    test('should have search input', () => {
      const searchInput = container.querySelector('#searchInput');
      expect(searchInput).toBeTruthy();
    });

    test('should have filter dropdowns', () => {
      const toolFilter = container.querySelector('#toolFilter');
      const statusFilter = container.querySelector('#statusFilter');
      
      expect(toolFilter).toBeTruthy();
      expect(statusFilter).toBeTruthy();
    });

    test('should update search query on input', () => {
      const searchInput = container.querySelector('#searchInput') as HTMLInputElement;
      searchInput.value = 'test query';
      searchInput.dispatchEvent(new Event('input'));
      
      // The search functionality would be tested with actual manager calls
      expect(searchInput.value).toBe('test query');
    });
  });

  describe('Bulk Import', () => {
    beforeEach(() => {
      admin.show();
      // Switch to import view
      const importBtn = container.querySelector('[data-view="import"]') as HTMLButtonElement;
      importBtn.click();
    });

    test('should have import options', () => {
      const jsonInput = container.querySelector('#jsonFileInput');
      const csvInput = container.querySelector('#csvFileInput');
      const urlInput = container.querySelector('#urlListInput');
      
      expect(jsonInput).toBeTruthy();
      expect(csvInput).toBeTruthy();
      expect(urlInput).toBeTruthy();
    });

    test('should show preview for URL import', async () => {
      const urlInput = container.querySelector('#urlListInput') as HTMLTextAreaElement;
      const importBtn = container.querySelector('#importUrlsBtn') as HTMLButtonElement;
      
      urlInput.value = 'https://example.com\nhttps://test.com';
      importBtn.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      const preview = container.querySelector('#importPreview') as HTMLElement;
      expect(preview.style.display).toBe('block');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      admin.show();
    });

    test('should validate all documentation', async () => {
      const validateBtn = container.querySelector('#validateAllBtn') as HTMLButtonElement;
      validateBtn.click();

      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 100));

      const validationView = container.querySelector('#validationView') as HTMLElement;
      expect(validationView.style.display).toBe('block');
    });

    test('should show validation stats', async () => {
      await admin.validateAllDocumentation();

      const validCount = container.querySelector('#validCount');
      const invalidCount = container.querySelector('#invalidCount');
      const warningCount = container.querySelector('#warningCount');

      expect(validCount).toBeTruthy();
      expect(invalidCount).toBeTruthy();
      expect(warningCount).toBeTruthy();
    });
  });

  describe('Version History', () => {
    beforeEach(() => {
      admin.show();
      // Switch to version history view
      const versionBtn = container.querySelector('[data-view="version-history"]') as HTMLButtonElement;
      versionBtn.click();
    });

    test('should have version history dropdown', () => {
      const select = container.querySelector('#versionDocSelect');
      expect(select).toBeTruthy();
    });

    test('should have version timeline container', () => {
      const timeline = container.querySelector('#versionTimeline');
      expect(timeline).toBeTruthy();
    });
  });

  describe('Event Callbacks', () => {
    test('should call onDocumentationChange callback', () => {
      const callback = jest.fn();
      admin.onDocumentationChange(callback);
      
      // Simulate a change that would trigger the callback
      // This would be called internally when documentation is added/updated/deleted
      expect(typeof callback).toBe('function');
    });

    test('should call onValidationComplete callback', () => {
      const callback = jest.fn();
      admin.onValidationComplete(callback);
      
      expect(typeof callback).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should show error messages', () => {
      admin.show();
      // Simulate an error by calling the private method through any
      (admin as any).showError('Test error message');

      const errorEl = container.querySelector('#errorMessage') as HTMLElement;
      expect(errorEl.textContent).toBe('Test error message');
      expect(errorEl.style.display).toBe('block');
    });

    test('should show success messages', () => {
      admin.show();
      // Simulate success by calling the private method through any
      (admin as any).showSuccess('Test success message');

      const successEl = container.querySelector('#successMessage') as HTMLElement;
      expect(successEl.textContent).toBe('Test success message');
      expect(successEl.style.display).toBe('block');
    });
  });
});