import { DocumentationManager } from '../DocumentationManager.js';
import {
  ToolDocumentation,
  DocumentationType,
  DocumentationTopic,
  DocumentationStatus
} from '../../types/documentation.js';
import { BuilderType, SkillLevel } from '../../types/common.js';

describe('DocumentationManager', () => {
  let manager: DocumentationManager;
  let sampleDoc: Omit<ToolDocumentation, 'id' | 'createdAt' | 'updatedAt'>;

  beforeEach(() => {
    manager = new DocumentationManager();
    sampleDoc = {
      toolName: BuilderType.BUILDER_IO,
      title: 'Getting Started with Builder.io',
      description: 'A comprehensive guide to building your first website with Builder.io',
      url: 'https://www.builder.io/docs/getting-started',
      type: DocumentationType.TUTORIAL,
      topics: [DocumentationTopic.PROJECT_SETUP, DocumentationTopic.UI_COMPONENTS],
      skillLevel: SkillLevel.BEGINNER,
      status: DocumentationStatus.ACTIVE,
      version: '1.0.0',
      lastValidated: new Date(),
      tags: ['beginner', 'tutorial', 'setup'],
      metadata: {
        author: 'Builder.io Team',
        estimatedReadTime: 15,
        prerequisites: [],
        difficulty: 3
      }
    };
  });

  describe('addDocumentation', () => {
    it('should add documentation and return an ID', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^doc_\d+_[a-z0-9]+$/);
    });

    it('should throw error for invalid documentation', async () => {
      const invalidDoc = { ...sampleDoc, url: 'invalid-url' };
      
      await expect(manager.addDocumentation(invalidDoc)).rejects.toThrow('Invalid documentation data');
    });

    it('should add documentation to search index', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      const searchResults = await manager.searchDocumentation({ query: 'Builder.io' });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].documentation.id).toBe(id);
    });
  });

  describe('getDocumentation', () => {
    it('should retrieve documentation by ID', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      const retrieved = await manager.getDocumentation(id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe(sampleDoc.title);
      expect(retrieved!.toolName).toBe(sampleDoc.toolName);
    });

    it('should return null for non-existent ID', async () => {
      const retrieved = await manager.getDocumentation('non-existent-id');
      
      expect(retrieved).toBeNull();
    });
  });

  describe('updateDocumentation', () => {
    it('should update existing documentation', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      const success = await manager.updateDocumentation(id, {
        title: 'Updated Title',
        status: DocumentationStatus.UNDER_REVIEW
      });
      
      expect(success).toBe(true);
      
      const updated = await manager.getDocumentation(id);
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.status).toBe(DocumentationStatus.UNDER_REVIEW);
    });

    it('should return false for non-existent documentation', async () => {
      const success = await manager.updateDocumentation('non-existent-id', { title: 'New Title' });
      
      expect(success).toBe(false);
    });

    it('should throw error for invalid updates', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      await expect(manager.updateDocumentation(id, { url: 'invalid-url' }))
        .rejects.toThrow('Invalid documentation update');
    });

    it('should update search index when documentation is updated', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      await manager.updateDocumentation(id, { title: 'Advanced Builder.io Guide' });
      
      const searchResults = await manager.searchDocumentation({ query: 'Advanced' });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].documentation.id).toBe(id);
    });
  });

  describe('deleteDocumentation', () => {
    it('should delete existing documentation', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      const success = await manager.deleteDocumentation(id);
      
      expect(success).toBe(true);
      
      const retrieved = await manager.getDocumentation(id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent documentation', async () => {
      const success = await manager.deleteDocumentation('non-existent-id');
      
      expect(success).toBe(false);
    });

    it('should remove from search index when deleted', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      await manager.deleteDocumentation(id);
      
      const searchResults = await manager.searchDocumentation({ query: 'Builder.io' });
      expect(searchResults).toHaveLength(0);
    });
  });

  describe('searchDocumentation', () => {
    beforeEach(async () => {
      // Add multiple documents for testing
      await manager.addDocumentation(sampleDoc);
      
      await manager.addDocumentation({
        ...sampleDoc,
        toolName: BuilderType.FIREBASE_STUDIO,
        title: 'Firebase Authentication Setup',
        description: 'Learn how to set up authentication in Firebase',
        topics: [DocumentationTopic.AUTHENTICATION],
        skillLevel: SkillLevel.INTERMEDIATE,
        tags: ['firebase', 'auth', 'security']
      });
      
      await manager.addDocumentation({
        ...sampleDoc,
        toolName: BuilderType.LOVABLE,
        title: 'Advanced Lovable Features',
        description: 'Explore advanced features in Lovable for experienced developers',
        skillLevel: SkillLevel.ADVANCED,
        topics: [DocumentationTopic.ADVANCED_FEATURES],
        tags: ['advanced', 'features']
      });
    });

    it('should search by text query', async () => {
      const results = await manager.searchDocumentation({ query: 'Firebase' });
      
      expect(results).toHaveLength(1);
      expect(results[0].documentation.title).toContain('Firebase');
    });

    it('should filter by tool name', async () => {
      const results = await manager.searchDocumentation({ toolName: BuilderType.BUILDER_IO });
      
      expect(results).toHaveLength(1);
      expect(results[0].documentation.toolName).toBe(BuilderType.BUILDER_IO);
    });

    it('should filter by skill level', async () => {
      const results = await manager.searchDocumentation({ skillLevel: SkillLevel.ADVANCED });
      
      expect(results).toHaveLength(1);
      expect(results[0].documentation.skillLevel).toBe(SkillLevel.ADVANCED);
    });

    it('should filter by topics', async () => {
      const results = await manager.searchDocumentation({ 
        topics: [DocumentationTopic.AUTHENTICATION] 
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].documentation.topics).toContain(DocumentationTopic.AUTHENTICATION);
    });

    it('should filter by tags', async () => {
      const results = await manager.searchDocumentation({ tags: ['firebase'] });
      
      expect(results).toHaveLength(1);
      expect(results[0].documentation.tags).toContain('firebase');
    });

    it('should combine multiple filters', async () => {
      const results = await manager.searchDocumentation({
        query: 'authentication',
        skillLevel: SkillLevel.INTERMEDIATE,
        topics: [DocumentationTopic.AUTHENTICATION]
      });
      
      expect(results).toHaveLength(1);
      expect(results[0].documentation.title).toContain('Firebase');
    });

    it('should return results sorted by relevance', async () => {
      const results = await manager.searchDocumentation({ query: 'advanced' });
      
      expect(results.length).toBeGreaterThan(0);
      // Results should be sorted by relevance score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i-1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });

    it('should throw error for invalid search query', async () => {
      await expect(manager.searchDocumentation({ skillLevel: 'invalid' as any }))
        .rejects.toThrow('Invalid search query');
    });
  });

  describe('getDocumentationByTool', () => {
    it('should return documentation for specific tool', async () => {
      await manager.addDocumentation(sampleDoc);
      await manager.addDocumentation({
        ...sampleDoc,
        toolName: BuilderType.FIREBASE_STUDIO,
        title: 'Firebase Guide'
      });
      
      const builderDocs = await manager.getDocumentationByTool(BuilderType.BUILDER_IO);
      
      expect(builderDocs).toHaveLength(1);
      expect(builderDocs[0].toolName).toBe(BuilderType.BUILDER_IO);
    });
  });

  describe('validateDocumentation', () => {
    it('should validate documentation and return results', async () => {
      const id = await manager.addDocumentation(sampleDoc);
      
      const result = await manager.validateDocumentation(id);
      
      expect(result.id).toBe(id);
      expect(result.lastChecked).toBeInstanceOf(Date);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should identify outdated documentation', async () => {
      const outdatedDoc = {
        ...sampleDoc,
        lastValidated: new Date('2020-01-01') // Very old date
      };
      const id = await manager.addDocumentation(outdatedDoc);
      
      const result = await manager.validateDocumentation(id);
      
      const outdatedIssue = result.issues.find(issue => issue.type === 'outdated_content');
      expect(outdatedIssue).toBeDefined();
      expect(outdatedIssue!.severity).toBe('medium');
    });

    it('should identify missing metadata', async () => {
      const docWithoutAuthor = {
        ...sampleDoc,
        metadata: { ...sampleDoc.metadata, author: undefined }
      };
      const id = await manager.addDocumentation(docWithoutAuthor);
      
      const result = await manager.validateDocumentation(id);
      
      const missingMetadataIssue = result.issues.find(issue => 
        issue.type === 'missing_metadata' && issue.description.includes('author')
      );
      expect(missingMetadataIssue).toBeDefined();
    });

    it('should throw error for non-existent documentation', async () => {
      await expect(manager.validateDocumentation('non-existent-id'))
        .rejects.toThrow('Documentation with ID non-existent-id not found');
    });
  });

  describe('importDocumentation', () => {
    it('should import multiple documentation items', async () => {
      const docsToImport: ToolDocumentation[] = [
        {
          ...sampleDoc,
          id: 'temp-id-1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          ...sampleDoc,
          id: 'temp-id-2',
          toolName: BuilderType.FIREBASE_STUDIO,
          title: 'Firebase Guide',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      const importedIds = await manager.importDocumentation(docsToImport);
      
      expect(importedIds).toHaveLength(2);
      
      for (const id of importedIds) {
        const doc = await manager.getDocumentation(id);
        expect(doc).toBeDefined();
      }
    });
  });

  describe('exportDocumentation', () => {
    it('should export all documentation when no tool specified', async () => {
      await manager.addDocumentation(sampleDoc);
      await manager.addDocumentation({
        ...sampleDoc,
        toolName: BuilderType.FIREBASE_STUDIO,
        title: 'Firebase Guide'
      });
      
      const exported = await manager.exportDocumentation();
      
      expect(exported).toHaveLength(2);
    });

    it('should export documentation for specific tool', async () => {
      await manager.addDocumentation(sampleDoc);
      await manager.addDocumentation({
        ...sampleDoc,
        toolName: BuilderType.FIREBASE_STUDIO,
        title: 'Firebase Guide'
      });
      
      const exported = await manager.exportDocumentation(BuilderType.BUILDER_IO);
      
      expect(exported).toHaveLength(1);
      expect(exported[0].toolName).toBe(BuilderType.BUILDER_IO);
    });
  });

  describe('getDocumentationStats', () => {
    it('should return comprehensive statistics', async () => {
      await manager.addDocumentation(sampleDoc);
      await manager.addDocumentation({
        ...sampleDoc,
        toolName: BuilderType.FIREBASE_STUDIO,
        skillLevel: SkillLevel.INTERMEDIATE,
        status: DocumentationStatus.UNDER_REVIEW
      });
      
      const stats = await manager.getDocumentationStats();
      
      expect(stats.total).toBe(2);
      expect(stats.byTool[BuilderType.BUILDER_IO]).toBe(1);
      expect(stats.byTool[BuilderType.FIREBASE_STUDIO]).toBe(1);
      expect(stats.bySkillLevel[SkillLevel.BEGINNER]).toBe(1);
      expect(stats.bySkillLevel[SkillLevel.INTERMEDIATE]).toBe(1);
      expect(stats.byStatus[DocumentationStatus.ACTIVE]).toBe(1);
      expect(stats.byStatus[DocumentationStatus.UNDER_REVIEW]).toBe(1);
    });
  });
});