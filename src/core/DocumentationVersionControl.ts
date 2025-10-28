/**
 * Documentation Version Control System
 * Manages versioning, change tracking, and rollback capabilities for documentation
 */

import { ToolDocumentation } from '../types/documentation.js';

export interface DocumentationVersion {
  id: string;
  documentationId: string;
  version: string;
  changes: string;
  author: string;
  timestamp: Date;
  data: ToolDocumentation;
  changeType: 'create' | 'update' | 'delete' | 'restore';
  parentVersion?: string;
}

export interface VersionDiff {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

export interface VersionControlStats {
  totalVersions: number;
  documentCount: number;
  averageVersionsPerDoc: number;
  mostActiveDocument: string;
  recentActivity: DocumentationVersion[];
}

export class DocumentationVersionControl {
  private versions: Map<string, DocumentationVersion[]> = new Map(); // documentId -> versions
  private versionIndex: Map<string, DocumentationVersion> = new Map(); // versionId -> version

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Load existing version history from storage if available
    this.loadVersionHistory();
  }

  /**
   * Create a new version when documentation is created
   */
  public createVersion(
    documentation: ToolDocumentation,
    author: string,
    changes: string = 'Initial creation'
  ): DocumentationVersion {
    const version: DocumentationVersion = {
      id: this.generateVersionId(documentation.id),
      documentationId: documentation.id,
      version: documentation.version,
      changes,
      author,
      timestamp: new Date(),
      data: { ...documentation },
      changeType: 'create'
    };

    this.addVersion(version);
    return version;
  }

  /**
   * Create a new version when documentation is updated
   */
  public updateVersion(
    oldDoc: ToolDocumentation,
    newDoc: ToolDocumentation,
    author: string,
    changes?: string
  ): DocumentationVersion {
    const diff = this.generateDiff(oldDoc, newDoc);
    const autoChanges = this.generateChangeDescription(diff);
    
    // Validate the changes for potential issues
    const validationWarnings = this.validateChanges(oldDoc, newDoc, diff);
    
    const version: DocumentationVersion = {
      id: this.generateVersionId(newDoc.id),
      documentationId: newDoc.id,
      version: newDoc.version,
      changes: changes || autoChanges,
      author,
      timestamp: new Date(),
      data: { ...newDoc },
      changeType: 'update',
      parentVersion: this.getLatestVersion(newDoc.id)?.id
    };

    // Add validation warnings to the version if any
    if (validationWarnings.length > 0) {
      (version as any).validationWarnings = validationWarnings;
    }

    this.addVersion(version);
    return version;
  }

  /**
   * Create a version when documentation is deleted
   */
  public deleteVersion(
    documentation: ToolDocumentation,
    author: string,
    reason: string = 'Documentation deleted'
  ): DocumentationVersion {
    const version: DocumentationVersion = {
      id: this.generateVersionId(documentation.id),
      documentationId: documentation.id,
      version: documentation.version,
      changes: reason,
      author,
      timestamp: new Date(),
      data: { ...documentation },
      changeType: 'delete',
      parentVersion: this.getLatestVersion(documentation.id)?.id
    };

    this.addVersion(version);
    return version;
  }

  /**
   * Get all versions for a specific documentation
   */
  public getVersionHistory(documentationId: string): DocumentationVersion[] {
    return this.versions.get(documentationId) || [];
  }

  /**
   * Get a specific version by ID
   */
  public getVersion(versionId: string): DocumentationVersion | null {
    return this.versionIndex.get(versionId) || null;
  }

  /**
   * Get the latest version of a documentation
   */
  public getLatestVersion(documentationId: string): DocumentationVersion | null {
    const versions = this.versions.get(documentationId);
    if (!versions || versions.length === 0) return null;
    
    return versions[versions.length - 1];
  }

  /**
   * Restore documentation to a previous version
   */
  public restoreToVersion(
    versionId: string,
    author: string,
    reason: string = 'Restored from previous version'
  ): DocumentationVersion | null {
    const targetVersion = this.getVersion(versionId);
    if (!targetVersion) return null;

    const restoredVersion: DocumentationVersion = {
      id: this.generateVersionId(targetVersion.documentationId),
      documentationId: targetVersion.documentationId,
      version: this.incrementVersion(targetVersion.version),
      changes: `${reason} (restored from version ${targetVersion.version})`,
      author,
      timestamp: new Date(),
      data: { 
        ...targetVersion.data,
        version: this.incrementVersion(targetVersion.version),
        updatedAt: new Date()
      },
      changeType: 'restore',
      parentVersion: this.getLatestVersion(targetVersion.documentationId)?.id
    };

    this.addVersion(restoredVersion);
    return restoredVersion;
  }

  /**
   * Compare two versions and generate a diff
   */
  public compareVersions(versionId1: string, versionId2: string): VersionDiff[] {
    const version1 = this.getVersion(versionId1);
    const version2 = this.getVersion(versionId2);
    
    if (!version1 || !version2) return [];
    
    return this.generateDiff(version1.data, version2.data);
  }

  /**
   * Get version control statistics
   */
  public getStats(): VersionControlStats {
    const allVersions = Array.from(this.versionIndex.values());
    const documentIds = Array.from(this.versions.keys());
    
    let mostActiveDocument = '';
    let maxVersions = 0;
    
    for (const [docId, versions] of this.versions.entries()) {
      if (versions.length > maxVersions) {
        maxVersions = versions.length;
        mostActiveDocument = docId;
      }
    }

    const recentActivity = allVersions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalVersions: allVersions.length,
      documentCount: documentIds.length,
      averageVersionsPerDoc: documentIds.length > 0 ? allVersions.length / documentIds.length : 0,
      mostActiveDocument,
      recentActivity
    };
  }

  /**
   * Clean up old versions (keep only last N versions per document)
   */
  public cleanupOldVersions(keepCount: number = 10): number {
    let cleanedCount = 0;
    
    for (const [docId, versions] of this.versions.entries()) {
      if (versions.length > keepCount) {
        const toRemove = versions.slice(0, versions.length - keepCount);
        const toKeep = versions.slice(-keepCount);
        
        // Remove from version index
        toRemove.forEach(version => {
          this.versionIndex.delete(version.id);
          cleanedCount++;
        });
        
        // Update versions map
        this.versions.set(docId, toKeep);
      }
    }
    
    this.saveVersionHistory();
    return cleanedCount;
  }

  /**
   * Export version history for backup
   */
  public exportVersionHistory(): { versions: DocumentationVersion[], exportDate: Date } {
    const allVersions = Array.from(this.versionIndex.values());
    return {
      versions: allVersions,
      exportDate: new Date()
    };
  }

  /**
   * Import version history from backup
   */
  public importVersionHistory(data: { versions: DocumentationVersion[] }): number {
    let importedCount = 0;
    
    data.versions.forEach(version => {
      if (!this.versionIndex.has(version.id)) {
        this.addVersion(version);
        importedCount++;
      }
    });
    
    this.saveVersionHistory();
    return importedCount;
  }

  // Private helper methods
  private addVersion(version: DocumentationVersion): void {
    // Add to version index
    this.versionIndex.set(version.id, version);
    
    // Add to document versions
    if (!this.versions.has(version.documentationId)) {
      this.versions.set(version.documentationId, []);
    }
    
    const docVersions = this.versions.get(version.documentationId)!;
    docVersions.push(version);
    
    // Sort by timestamp
    docVersions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    this.saveVersionHistory();
  }

  private generateVersionId(documentationId: string): string {
    return `${documentationId}_v${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length >= 3) {
      // Increment patch version
      const patch = parseInt(parts[2]) + 1;
      return `${parts[0]}.${parts[1]}.${patch}`;
    } else if (parts.length === 2) {
      // Increment minor version
      const minor = parseInt(parts[1]) + 1;
      return `${parts[0]}.${minor}.0`;
    } else {
      // Increment major version
      const major = parseInt(parts[0]) + 1;
      return `${major}.0.0`;
    }
  }

  private generateDiff(oldDoc: ToolDocumentation, newDoc: ToolDocumentation): VersionDiff[] {
    const diffs: VersionDiff[] = [];
    
    // Compare all fields
    const fields = [
      'title', 'description', 'url', 'toolName', 'type', 'skillLevel', 
      'status', 'version', 'topics', 'tags'
    ];
    
    fields.forEach(field => {
      const oldValue = (oldDoc as any)[field];
      const newValue = (newDoc as any)[field];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        let changeType: 'added' | 'removed' | 'modified' = 'modified';
        
        if (oldValue === undefined || oldValue === null) {
          changeType = 'added';
        } else if (newValue === undefined || newValue === null) {
          changeType = 'removed';
        }
        
        diffs.push({
          field,
          oldValue,
          newValue,
          changeType
        });
      }
    });
    
    // Compare metadata
    if (oldDoc.metadata && newDoc.metadata) {
      const metadataFields = ['author', 'estimatedReadTime', 'difficulty', 'popularity'];
      metadataFields.forEach(field => {
        const oldValue = (oldDoc.metadata as any)[field];
        const newValue = (newDoc.metadata as any)[field];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          diffs.push({
            field: `metadata.${field}`,
            oldValue,
            newValue,
            changeType: oldValue === undefined ? 'added' : 
                       newValue === undefined ? 'removed' : 'modified'
          });
        }
      });
    }
    
    return diffs;
  }

  private generateChangeDescription(diffs: VersionDiff[]): string {
    if (diffs.length === 0) return 'No changes detected';
    
    const changes = diffs.map(diff => {
      switch (diff.changeType) {
        case 'added':
          return `Added ${diff.field}`;
        case 'removed':
          return `Removed ${diff.field}`;
        case 'modified':
          return `Modified ${diff.field}`;
        default:
          return `Changed ${diff.field}`;
      }
    });
    
    return changes.join(', ');
  }

  private validateChanges(oldDoc: ToolDocumentation, newDoc: ToolDocumentation, diffs: VersionDiff[]): string[] {
    const warnings: string[] = [];
    
    // Check for potentially problematic changes
    diffs.forEach(diff => {
      switch (diff.field) {
        case 'url':
          if (diff.changeType === 'modified') {
            warnings.push('URL changed - verify that the new URL is accessible and contains the expected content');
          }
          break;
        case 'toolName':
          if (diff.changeType === 'modified') {
            warnings.push('Tool name changed - this may affect categorization and search results');
          }
          break;
        case 'status':
          if (diff.newValue === 'deprecated' || diff.newValue === 'outdated') {
            warnings.push('Documentation marked as deprecated/outdated - consider updating or removing');
          }
          break;
        case 'skillLevel':
          if (diff.changeType === 'modified') {
            warnings.push('Skill level changed - verify that content difficulty matches the new level');
          }
          break;
        case 'topics':
          if (diff.changeType === 'removed' || (Array.isArray(diff.newValue) && diff.newValue.length === 0)) {
            warnings.push('Topics removed - this may reduce discoverability');
          }
          break;
      }
    });
    
    // Check for missing critical information
    if (!newDoc.metadata.author && !oldDoc.metadata.author) {
      warnings.push('No author information - consider adding author metadata');
    }
    
    if (!newDoc.metadata.estimatedReadTime && !oldDoc.metadata.estimatedReadTime) {
      warnings.push('No estimated read time - consider adding this for better user experience');
    }
    
    // Check for URL format issues
    try {
      new URL(newDoc.url);
    } catch {
      warnings.push('Invalid URL format detected');
    }
    
    return warnings;
  }

  private loadVersionHistory(): void {
    // In a real implementation, this would load from persistent storage
    // For now, we'll start with empty history
    console.log('Version history loaded');
  }

  private saveVersionHistory(): void {
    // In a real implementation, this would save to persistent storage
    // For now, we'll just log
    console.log('Version history saved');
  }
}