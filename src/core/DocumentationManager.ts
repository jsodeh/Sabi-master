import {
  ToolDocumentation,
  DocumentationSearchQuery,
  DocumentationSearchResult,
  DocumentationValidationResult,
  ValidationIssue,
  DocumentationType,
  DocumentationTopic,
  DocumentationStatus,
  ToolDocumentationSchema,
  DocumentationSearchQuerySchema
} from '../types/documentation.js';
import { BuilderType, SkillLevel } from '../types/common.js';
import { DocumentationVersionControl, DocumentationVersion } from './DocumentationVersionControl.js';
import { DocumentationBulkImporter, ImportResult, ImportPreview, UrlImportOptions } from './DocumentationBulkImporter.js';

export interface IDocumentationManager {
  // Core CRUD operations
  addDocumentation(documentation: Omit<ToolDocumentation, 'id' | 'createdAt' | 'updatedAt'>, author?: string): Promise<string>;
  getDocumentation(id: string): Promise<ToolDocumentation | null>;
  updateDocumentation(id: string, updates: Partial<ToolDocumentation>, author?: string, changes?: string): Promise<boolean>;
  deleteDocumentation(id: string, author?: string, reason?: string): Promise<boolean>;
  
  // Search and filtering
  searchDocumentation(query: DocumentationSearchQuery): Promise<DocumentationSearchResult[]>;
  getDocumentationByTool(toolName: BuilderType): Promise<ToolDocumentation[]>;
  getDocumentationBySkillLevel(skillLevel: SkillLevel): Promise<ToolDocumentation[]>;
  getDocumentationByTopic(topic: DocumentationTopic): Promise<ToolDocumentation[]>;
  
  // Validation and maintenance
  validateDocumentation(id: string): Promise<DocumentationValidationResult>;
  validateAllDocumentation(): Promise<DocumentationValidationResult[]>;
  updateDocumentationStatus(id: string, status: DocumentationStatus): Promise<boolean>;
  
  // Bulk operations
  importDocumentation(documentationList: ToolDocumentation[]): Promise<string[]>;
  exportDocumentation(toolName?: BuilderType): Promise<ToolDocumentation[]>;
  
  // Version control operations
  getVersionHistory(documentationId: string): Promise<DocumentationVersion[]>;
  restoreToVersion(versionId: string, author?: string): Promise<ToolDocumentation | null>;
  compareVersions(versionId1: string, versionId2: string): Promise<any>;
  
  // Bulk import operations
  importFromJson(jsonData: string): Promise<ImportResult>;
  importFromCsv(csvData: string): Promise<ImportResult>;
  importFromUrls(urls: string[], options?: UrlImportOptions): Promise<ImportResult>;
  previewJsonImport(jsonData: string): Promise<ImportPreview>;
  previewCsvImport(csvData: string): Promise<ImportPreview>;
}

export class DocumentationManager implements IDocumentationManager {
  private documentation: Map<string, ToolDocumentation> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map(); // word -> document IDs
  private versionControl: DocumentationVersionControl;
  private bulkImporter: DocumentationBulkImporter;
  
  constructor() {
    this.initializeSearchIndex();
    this.versionControl = new DocumentationVersionControl();
    this.bulkImporter = new DocumentationBulkImporter(this);
  }

  private initializeSearchIndex(): void {
    // Initialize search index for fast text searching
    this.searchIndex.clear();
  }

  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToSearchIndex(documentation: ToolDocumentation): void {
    const searchableText = [
      documentation.title,
      documentation.description,
      documentation.toolName,
      ...documentation.topics,
      ...documentation.tags
    ].join(' ').toLowerCase();

    const words = searchableText.split(/\s+/).filter(word => word.length > 2);
    
    words.forEach(word => {
      if (!this.searchIndex.has(word)) {
        this.searchIndex.set(word, new Set());
      }
      this.searchIndex.get(word)!.add(documentation.id);
    });
  }

  private removeFromSearchIndex(documentation: ToolDocumentation): void {
    this.searchIndex.forEach((docIds, word) => {
      docIds.delete(documentation.id);
      if (docIds.size === 0) {
        this.searchIndex.delete(word);
      }
    });
  }

  async addDocumentation(
    documentationData: Omit<ToolDocumentation, 'id' | 'createdAt' | 'updatedAt'>,
    author: string = 'System'
  ): Promise<string> {
    const id = this.generateId();
    const now = new Date();
    
    const documentation: ToolDocumentation = {
      ...documentationData,
      id,
      createdAt: now,
      updatedAt: now
    };

    // Validate the documentation
    const validationResult = ToolDocumentationSchema.safeParse(documentation);
    if (!validationResult.success) {
      throw new Error(`Invalid documentation data: ${validationResult.error.message}`);
    }

    this.documentation.set(id, documentation);
    this.addToSearchIndex(documentation);
    
    // Create version history entry
    this.versionControl.createVersion(documentation, author);
    
    return id;
  }

  async getDocumentation(id: string): Promise<ToolDocumentation | null> {
    return this.documentation.get(id) || null;
  }

  async updateDocumentation(
    id: string, 
    updates: Partial<ToolDocumentation>, 
    author: string = 'System',
    changes?: string
  ): Promise<boolean> {
    const existing = this.documentation.get(id);
    if (!existing) {
      return false;
    }

    // Remove from search index before updating
    this.removeFromSearchIndex(existing);

    const updated: ToolDocumentation = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    // Validate updated documentation
    const validationResult = ToolDocumentationSchema.safeParse(updated);
    if (!validationResult.success) {
      // Re-add to search index if validation fails
      this.addToSearchIndex(existing);
      throw new Error(`Invalid documentation update: ${validationResult.error.message}`);
    }

    this.documentation.set(id, updated);
    this.addToSearchIndex(updated);
    
    // Create version history entry
    this.versionControl.updateVersion(existing, updated, author, changes);
    
    return true;
  }

  async deleteDocumentation(id: string, author: string = 'System', reason?: string): Promise<boolean> {
    const existing = this.documentation.get(id);
    if (!existing) {
      return false;
    }

    this.removeFromSearchIndex(existing);
    
    // Create version history entry for deletion
    this.versionControl.deleteVersion(existing, author, reason);
    
    return this.documentation.delete(id);
  }

  async searchDocumentation(query: DocumentationSearchQuery): Promise<DocumentationSearchResult[]> {
    // Validate search query
    const validationResult = DocumentationSearchQuerySchema.safeParse(query);
    if (!validationResult.success) {
      throw new Error(`Invalid search query: ${validationResult.error.message}`);
    }

    let candidateIds = new Set<string>();
    
    // Text search
    if (query.query) {
      const searchWords = query.query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      if (searchWords.length > 0) {
        // Find documents that contain any of the search words
        searchWords.forEach(word => {
          const matchingIds = this.searchIndex.get(word);
          if (matchingIds) {
            matchingIds.forEach(id => candidateIds.add(id));
          }
        });
      } else {
        // If no valid search words, include all documents
        candidateIds = new Set(this.documentation.keys());
      }
    } else {
      // If no text query, start with all documents
      candidateIds = new Set(this.documentation.keys());
    }

    // Filter by other criteria
    const results: DocumentationSearchResult[] = [];
    
    for (const id of candidateIds) {
      const doc = this.documentation.get(id);
      if (!doc) continue;

      // Apply filters
      if (query.toolName && doc.toolName !== query.toolName) continue;
      if (query.type && doc.type !== query.type) continue;
      if (query.skillLevel && doc.skillLevel !== query.skillLevel) continue;
      if (query.status && doc.status !== query.status) continue;
      
      if (query.topics && query.topics.length > 0) {
        const hasMatchingTopic = query.topics.some(topic => doc.topics.includes(topic));
        if (!hasMatchingTopic) continue;
      }
      
      if (query.tags && query.tags.length > 0) {
        const hasMatchingTag = query.tags.some(tag => doc.tags.includes(tag));
        if (!hasMatchingTag) continue;
      }

      // Calculate relevance score
      let relevanceScore = 1;
      const matchedFields: string[] = [];

      if (query.query) {
        const searchWords = query.query.toLowerCase().split(/\s+/);
        const docText = [doc.title, doc.description, ...doc.tags].join(' ').toLowerCase();
        
        searchWords.forEach(word => {
          if (docText.includes(word)) {
            relevanceScore += 1;
            if (doc.title.toLowerCase().includes(word)) {
              relevanceScore += 2; // Title matches are more relevant
              matchedFields.push('title');
            }
            if (doc.description.toLowerCase().includes(word)) {
              matchedFields.push('description');
            }
          }
        });
      }

      results.push({
        documentation: doc,
        relevanceScore,
        matchedFields: [...new Set(matchedFields)] // Remove duplicates
      });
    }

    // Sort by relevance score (descending)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async getDocumentationByTool(toolName: BuilderType): Promise<ToolDocumentation[]> {
    const results = await this.searchDocumentation({ toolName });
    return results.map(result => result.documentation);
  }

  async getDocumentationBySkillLevel(skillLevel: SkillLevel): Promise<ToolDocumentation[]> {
    const results = await this.searchDocumentation({ skillLevel });
    return results.map(result => result.documentation);
  }

  async getDocumentationByTopic(topic: DocumentationTopic): Promise<ToolDocumentation[]> {
    const results = await this.searchDocumentation({ topics: [topic] });
    return results.map(result => result.documentation);
  }

  async validateDocumentation(id: string): Promise<DocumentationValidationResult> {
    const doc = this.documentation.get(id);
    if (!doc) {
      throw new Error(`Documentation with ID ${id} not found`);
    }

    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // URL validation
    try {
      const url = new URL(doc.url);
      
      // Check for suspicious URLs
      if (url.hostname === 'localhost' || url.hostname.startsWith('127.') || url.hostname.startsWith('192.168.')) {
        issues.push({
          type: 'broken_link',
          severity: 'high',
          description: 'URL points to localhost or private network',
          suggestedFix: 'Update to a publicly accessible URL'
        });
      }
      
      // Check for HTTP vs HTTPS
      if (url.protocol === 'http:') {
        issues.push({
          type: 'broken_link',
          severity: 'low',
          description: 'URL uses HTTP instead of HTTPS',
          suggestedFix: 'Consider updating to HTTPS for better security'
        });
      }
      
    } catch {
      issues.push({
        type: 'broken_link',
        severity: 'high',
        description: 'Invalid or malformed URL',
        suggestedFix: 'Update the URL to a valid format'
      });
    }

    // Content freshness validation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    if (doc.lastValidated < sixtyDaysAgo) {
      issues.push({
        type: 'outdated_content',
        severity: 'high',
        description: 'Documentation has not been validated in over 60 days',
        suggestedFix: 'Urgently review and update the documentation content'
      });
    } else if (doc.lastValidated < thirtyDaysAgo) {
      issues.push({
        type: 'outdated_content',
        severity: 'medium',
        description: 'Documentation has not been validated in over 30 days',
        suggestedFix: 'Review and update the documentation content'
      });
    }

    // Metadata validation
    if (!doc.metadata.author) {
      issues.push({
        type: 'missing_metadata',
        severity: 'low',
        description: 'Missing author information',
        suggestedFix: 'Add author information to metadata'
      });
    }

    if (!doc.metadata.estimatedReadTime) {
      recommendations.push('Consider adding estimated read time to improve user experience');
    }

    if (doc.topics.length === 0) {
      issues.push({
        type: 'missing_metadata',
        severity: 'medium',
        description: 'No topics assigned to documentation',
        suggestedFix: 'Add relevant topics to improve discoverability'
      });
    }

    if (doc.tags.length === 0) {
      recommendations.push('Consider adding tags to improve searchability');
    }

    // Content quality validation
    if (doc.title.length < 10) {
      issues.push({
        type: 'missing_metadata',
        severity: 'medium',
        description: 'Title is too short (less than 10 characters)',
        suggestedFix: 'Provide a more descriptive title'
      });
    }

    if (doc.description.length < 50) {
      issues.push({
        type: 'missing_metadata',
        severity: 'medium',
        description: 'Description is too short (less than 50 characters)',
        suggestedFix: 'Provide a more detailed description'
      });
    }

    // Status validation
    if (doc.status === 'deprecated' || doc.status === 'outdated') {
      recommendations.push('Consider updating or removing deprecated/outdated documentation');
    }

    // Accessibility validation
    if (doc.skillLevel === 'beginner' && doc.topics.includes('advanced_features' as any)) {
      issues.push({
        type: 'accessibility',
        severity: 'medium',
        description: 'Beginner-level documentation contains advanced topics',
        suggestedFix: 'Review skill level assignment or content complexity'
      });
    }

    // Version validation
    const versionPattern = /^\d+\.\d+\.\d+$/;
    if (!versionPattern.test(doc.version)) {
      issues.push({
        type: 'missing_metadata',
        severity: 'low',
        description: 'Version does not follow semantic versioning (x.y.z)',
        suggestedFix: 'Update version to follow semantic versioning format'
      });
    }

    return {
      id,
      isValid: issues.filter(issue => issue.severity === 'high').length === 0,
      lastChecked: new Date(),
      issues,
      recommendations
    };
  }

  async validateAllDocumentation(): Promise<DocumentationValidationResult[]> {
    const results: DocumentationValidationResult[] = [];
    
    for (const id of this.documentation.keys()) {
      try {
        const result = await this.validateDocumentation(id);
        results.push(result);
      } catch (error) {
        console.error(`Error validating documentation ${id}:`, error);
      }
    }
    
    return results;
  }

  async updateDocumentationStatus(id: string, status: DocumentationStatus): Promise<boolean> {
    return this.updateDocumentation(id, { status });
  }

  async importDocumentation(documentationList: ToolDocumentation[]): Promise<string[]> {
    const importedIds: string[] = [];
    
    for (const doc of documentationList) {
      try {
        // Remove ID and timestamps to let addDocumentation generate new ones
        const { id, createdAt, updatedAt, ...docData } = doc;
        const newId = await this.addDocumentation(docData);
        importedIds.push(newId);
      } catch (error) {
        console.error(`Error importing documentation:`, error);
        // Continue with other documents even if one fails
      }
    }
    
    return importedIds;
  }

  async exportDocumentation(toolName?: BuilderType): Promise<ToolDocumentation[]> {
    if (toolName) {
      return this.getDocumentationByTool(toolName);
    }
    
    return Array.from(this.documentation.values());
  }

  // Version control operations
  async getVersionHistory(documentationId: string): Promise<DocumentationVersion[]> {
    return this.versionControl.getVersionHistory(documentationId);
  }

  async restoreToVersion(versionId: string, author: string = 'System'): Promise<ToolDocumentation | null> {
    const restoredVersion = this.versionControl.restoreToVersion(versionId, author);
    if (!restoredVersion) return null;

    // Update the documentation in memory
    const restored = restoredVersion.data;
    this.documentation.set(restored.id, restored);
    
    // Update search index
    this.removeFromSearchIndex(restored);
    this.addToSearchIndex(restored);
    
    return restored;
  }

  async compareVersions(versionId1: string, versionId2: string): Promise<any> {
    return this.versionControl.compareVersions(versionId1, versionId2);
  }

  // Bulk import operations
  async importFromJson(jsonData: string): Promise<ImportResult> {
    return this.bulkImporter.importFromJson(jsonData);
  }

  async importFromCsv(csvData: string): Promise<ImportResult> {
    return this.bulkImporter.importFromCsv(csvData);
  }

  async importFromUrls(urls: string[], options?: UrlImportOptions): Promise<ImportResult> {
    return this.bulkImporter.importFromUrls(urls, options);
  }

  async previewJsonImport(jsonData: string): Promise<ImportPreview> {
    return this.bulkImporter.previewJsonImport(jsonData);
  }

  async previewCsvImport(csvData: string): Promise<ImportPreview> {
    return this.bulkImporter.previewCsvImport(csvData);
  }

  // Additional utility methods
  async getDocumentationStats(): Promise<{
    total: number;
    byTool: Record<BuilderType, number>;
    bySkillLevel: Record<SkillLevel, number>;
    byStatus: Record<DocumentationStatus, number>;
  }> {
    const docs = Array.from(this.documentation.values());
    
    const byTool = {} as Record<BuilderType, number>;
    const bySkillLevel = {} as Record<SkillLevel, number>;
    const byStatus = {} as Record<DocumentationStatus, number>;
    
    // Initialize counters
    Object.values(BuilderType).forEach(tool => byTool[tool] = 0);
    Object.values(SkillLevel).forEach(level => bySkillLevel[level] = 0);
    Object.values(DocumentationStatus).forEach(status => byStatus[status] = 0);
    
    docs.forEach(doc => {
      byTool[doc.toolName]++;
      bySkillLevel[doc.skillLevel]++;
      byStatus[doc.status]++;
    });
    
    return {
      total: docs.length,
      byTool,
      bySkillLevel,
      byStatus
    };
  }

  // Version control utility methods
  getVersionControlStats() {
    return this.versionControl.getStats();
  }

  cleanupOldVersions(keepCount: number = 10): number {
    return this.versionControl.cleanupOldVersions(keepCount);
  }

  exportVersionHistory() {
    return this.versionControl.exportVersionHistory();
  }

  importVersionHistory(data: { versions: DocumentationVersion[] }): number {
    return this.versionControl.importVersionHistory(data);
  }
}