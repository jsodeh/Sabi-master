/**
 * Documentation Bulk Import System
 * Handles importing documentation from various sources (JSON, CSV, URLs)
 */

import { 
  ToolDocumentation, 
  DocumentationType, 
  DocumentationTopic, 
  DocumentationStatus 
} from '../types/documentation.js';
import { BuilderType, SkillLevel } from '../types/common.js';

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: ImportError[];
  importedIds: string[];
}

export interface ImportError {
  row?: number;
  url?: string;
  field?: string;
  message: string;
  data?: any;
}

export interface ImportPreview {
  totalItems: number;
  validItems: number;
  invalidItems: number;
  preview: Partial<ToolDocumentation>[];
  errors: ImportError[];
}

export interface UrlImportOptions {
  defaultTool?: BuilderType;
  defaultType?: DocumentationType;
  defaultSkillLevel?: SkillLevel;
  defaultStatus?: DocumentationStatus;
  autoDetectMetadata?: boolean;
  validateUrls?: boolean;
}

export class DocumentationBulkImporter {
  private documentationManager: any;

  constructor(documentationManager: any) {
    this.documentationManager = documentationManager;
  }

  /**
   * Import documentation from JSON file
   */
  public async importFromJson(jsonData: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      importedIds: []
    };

    try {
      const data = JSON.parse(jsonData);
      const documentationList = Array.isArray(data) ? data : [data];

      for (let i = 0; i < documentationList.length; i++) {
        try {
          const docData = this.validateAndTransformJsonItem(documentationList[i], i);
          const id = await this.documentationManager.addDocumentation(docData);
          result.importedIds.push(id);
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : 'Unknown error',
            data: documentationList[i]
          });
        }
      }

      result.success = result.imported > 0;
      return result;
    } catch (error) {
      result.errors.push({
        message: `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return result;
    }
  }

  /**
   * Import documentation from CSV data
   */
  public async importFromCsv(csvData: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      importedIds: []
    };

    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        result.errors.push({ message: 'CSV must have at least a header row and one data row' });
        return result;
      }

      const headers = this.parseCsvLine(lines[0]);
      const requiredHeaders = ['title', 'description', 'url', 'toolName'];
      
      // Validate headers
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        result.errors.push({
          message: `Missing required headers: ${missingHeaders.join(', ')}`
        });
        return result;
      }

      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = this.parseCsvLine(lines[i]);
          const docData = this.validateAndTransformCsvRow(headers, values, i);
          const id = await this.documentationManager.addDocumentation(docData);
          result.importedIds.push(id);
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      result.success = result.imported > 0;
      return result;
    } catch (error) {
      result.errors.push({
        message: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return result;
    }
  }

  /**
   * Import documentation from URL list
   */
  public async importFromUrls(
    urls: string[], 
    options: UrlImportOptions = {}
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
      importedIds: []
    };

    const defaultOptions: Required<UrlImportOptions> = {
      defaultTool: BuilderType.BUILDER_IO,
      defaultType: DocumentationType.REFERENCE,
      defaultSkillLevel: SkillLevel.BEGINNER,
      defaultStatus: DocumentationStatus.ACTIVE,
      autoDetectMetadata: true,
      validateUrls: true,
      ...options
    };

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (!url) continue;

      try {
        // Validate URL format
        new URL(url);

        // Optionally validate URL accessibility
        if (defaultOptions.validateUrls) {
          const isAccessible = await this.validateUrlAccessibility(url);
          if (!isAccessible) {
            result.failed++;
            result.errors.push({
              url,
              message: 'URL is not accessible'
            });
            continue;
          }
        }

        // Extract metadata if enabled
        let metadata = {};
        if (defaultOptions.autoDetectMetadata) {
          metadata = await this.extractUrlMetadata(url);
        }

        const docData: Omit<ToolDocumentation, 'id' | 'createdAt' | 'updatedAt'> = {
          title: (metadata as any).title || this.generateTitleFromUrl(url),
          description: (metadata as any).description || `Documentation for ${url}`,
          url,
          baseUrl: new URL(url).origin,
          toolName: this.detectToolFromUrl(url) || defaultOptions.defaultTool,
          type: defaultOptions.defaultType,
          skillLevel: defaultOptions.defaultSkillLevel,
          status: defaultOptions.defaultStatus,
          version: '1.0.0',
          topics: this.detectTopicsFromUrl(url),
          tags: this.generateTagsFromUrl(url),
          lastValidated: new Date(),
          lastUpdated: new Date(),
          metadata: {
            author: (metadata as any).author,
            estimatedReadTime: (metadata as any).readTime,
            ...metadata
          }
        };

        const id = await this.documentationManager.addDocumentation(docData);
        result.importedIds.push(id);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          url,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.imported > 0;
    return result;
  }

  /**
   * Preview import data before actual import
   */
  public async previewJsonImport(jsonData: string): Promise<ImportPreview> {
    const preview: ImportPreview = {
      totalItems: 0,
      validItems: 0,
      invalidItems: 0,
      preview: [],
      errors: []
    };

    try {
      const data = JSON.parse(jsonData);
      const documentationList = Array.isArray(data) ? data : [data];
      preview.totalItems = documentationList.length;

      for (let i = 0; i < Math.min(documentationList.length, 10); i++) {
        try {
          const docData = this.validateAndTransformJsonItem(documentationList[i], i);
          preview.preview.push(docData);
          preview.validItems++;
        } catch (error) {
          preview.invalidItems++;
          preview.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : 'Unknown error',
            data: documentationList[i]
          });
        }
      }

      // Count remaining valid/invalid items without processing them
      for (let i = 10; i < documentationList.length; i++) {
        try {
          this.validateAndTransformJsonItem(documentationList[i], i);
          preview.validItems++;
        } catch (error) {
          preview.invalidItems++;
        }
      }
    } catch (error) {
      preview.errors.push({
        message: `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return preview;
  }

  /**
   * Preview CSV import
   */
  public async previewCsvImport(csvData: string): Promise<ImportPreview> {
    const preview: ImportPreview = {
      totalItems: 0,
      validItems: 0,
      invalidItems: 0,
      preview: [],
      errors: []
    };

    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        preview.errors.push({ message: 'CSV must have at least a header row and one data row' });
        return preview;
      }

      const headers = this.parseCsvLine(lines[0]);
      preview.totalItems = lines.length - 1;

      // Process preview rows
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        try {
          const values = this.parseCsvLine(lines[i]);
          const docData = this.validateAndTransformCsvRow(headers, values, i);
          preview.preview.push(docData);
          preview.validItems++;
        } catch (error) {
          preview.invalidItems++;
          preview.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Count remaining valid/invalid items
      for (let i = 11; i < lines.length; i++) {
        try {
          const values = this.parseCsvLine(lines[i]);
          this.validateAndTransformCsvRow(headers, values, i);
          preview.validItems++;
        } catch (error) {
          preview.invalidItems++;
        }
      }
    } catch (error) {
      preview.errors.push({
        message: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return preview;
  }

  // Private helper methods
  private validateAndTransformJsonItem(
    item: any, 
    index: number
  ): Omit<ToolDocumentation, 'id' | 'createdAt' | 'updatedAt'> {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid item format');
    }

    // Required fields
    if (!item.title || typeof item.title !== 'string') {
      throw new Error('Missing or invalid title');
    }
    if (!item.description || typeof item.description !== 'string') {
      throw new Error('Missing or invalid description');
    }
    if (!item.url || typeof item.url !== 'string') {
      throw new Error('Missing or invalid URL');
    }

    // Validate URL format
    try {
      new URL(item.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Validate enums
    if (item.toolName && !Object.values(BuilderType).includes(item.toolName)) {
      throw new Error(`Invalid toolName: ${item.toolName}`);
    }
    if (item.type && !Object.values(DocumentationType).includes(item.type)) {
      throw new Error(`Invalid type: ${item.type}`);
    }
    if (item.skillLevel && !Object.values(SkillLevel).includes(item.skillLevel)) {
      throw new Error(`Invalid skillLevel: ${item.skillLevel}`);
    }
    if (item.status && !Object.values(DocumentationStatus).includes(item.status)) {
      throw new Error(`Invalid status: ${item.status}`);
    }

    // Validate topics array
    if (item.topics && Array.isArray(item.topics)) {
      const invalidTopics = item.topics.filter((topic: any) => 
        !Object.values(DocumentationTopic).includes(topic)
      );
      if (invalidTopics.length > 0) {
        throw new Error(`Invalid topics: ${invalidTopics.join(', ')}`);
      }
    }

    return {
      title: item.title,
      description: item.description,
      url: item.url,
      baseUrl: item.baseUrl || (item.url ? new URL(item.url).origin : ''),
      toolName: item.toolName || BuilderType.BUILDER_IO,
      type: item.type || DocumentationType.REFERENCE,
      skillLevel: item.skillLevel || SkillLevel.BEGINNER,
      status: item.status || DocumentationStatus.ACTIVE,
      version: item.version || '1.0.0',
      topics: item.topics || [],
      tags: Array.isArray(item.tags) ? item.tags : [],
      lastValidated: new Date(),
      lastUpdated: new Date(),
      metadata: {
        author: item.metadata?.author || item.author,
        estimatedReadTime: item.metadata?.estimatedReadTime || item.readTime,
        difficulty: item.metadata?.difficulty,
        popularity: item.metadata?.popularity,
        ...item.metadata
      }
    };
  }

  private validateAndTransformCsvRow(
    headers: string[], 
    values: string[], 
    rowIndex: number
  ): Omit<ToolDocumentation, 'id' | 'createdAt' | 'updatedAt'> {
    if (headers.length !== values.length) {
      throw new Error(`Row has ${values.length} values but expected ${headers.length}`);
    }

    const row: any = {};
    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() || '';
    });

    // Required fields
    if (!row.title) throw new Error('Missing title');
    if (!row.description) throw new Error('Missing description');
    if (!row.url) throw new Error('Missing URL');

    // Validate URL
    try {
      new URL(row.url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Parse arrays
    const topics = row.topics ? 
      row.topics.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];
    const tags = row.tags ? 
      row.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [];

    return {
      title: row.title,
      description: row.description,
      url: row.url,
      baseUrl: row.baseUrl || (row.url ? new URL(row.url).origin : ''),
      toolName: row.toolName || BuilderType.BUILDER_IO,
      type: row.type || DocumentationType.REFERENCE,
      skillLevel: row.skillLevel || SkillLevel.BEGINNER,
      status: row.status || DocumentationStatus.ACTIVE,
      version: row.version || '1.0.0',
      topics,
      tags,
      lastValidated: new Date(),
      lastUpdated: new Date(),
      metadata: {
        author: row.author,
        estimatedReadTime: row.readTime ? parseInt(row.readTime) : undefined,
        difficulty: row.difficulty ? parseInt(row.difficulty) : undefined
      }
    };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  private async validateUrlAccessibility(url: string): Promise<boolean> {
    try {
      // Basic URL validation
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return false;
      }

      // In a browser environment, we can't make arbitrary HTTP requests due to CORS
      // In a real implementation with a backend, you would make an HTTP request here
      // For now, we'll do enhanced validation based on URL structure
      
      // Check for common invalid patterns
      const hostname = urlObj.hostname.toLowerCase();
      if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
        return false; // Local URLs are not accessible publicly
      }
      
      // Check for valid TLD
      const tldPattern = /\.[a-z]{2,}$/i;
      if (!tldPattern.test(hostname)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private async extractUrlMetadata(url: string): Promise<any> {
    // In a real implementation, this would fetch the page and extract metadata
    // For now, we'll return basic metadata based on URL analysis
    const urlObj = new URL(url);
    
    return {
      title: this.generateTitleFromUrl(url),
      description: `Documentation from ${urlObj.hostname}`,
      author: urlObj.hostname
    };
  }

  private generateTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const segments = path.split('/').filter(s => s);
      
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        return lastSegment
          .replace(/[-_]/g, ' ')
          .replace(/\.(html?|php|aspx?)$/i, '')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
      
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return 'Imported Documentation';
    }
  }

  private detectToolFromUrl(url: string): BuilderType | null {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('builder.io')) return BuilderType.BUILDER_IO;
    if (urlLower.includes('firebase')) return BuilderType.FIREBASE_STUDIO;
    if (urlLower.includes('lovable')) return BuilderType.LOVABLE;
    if (urlLower.includes('bolt.new')) return BuilderType.BOLT_NEW;
    if (urlLower.includes('replit')) return BuilderType.REPLIT;
    
    return null;
  }

  private detectTopicsFromUrl(url: string): DocumentationTopic[] {
    const topics: DocumentationTopic[] = [];
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('auth')) topics.push(DocumentationTopic.AUTHENTICATION);
    if (urlLower.includes('setup') || urlLower.includes('getting-started')) {
      topics.push(DocumentationTopic.PROJECT_SETUP);
    }
    if (urlLower.includes('component')) topics.push(DocumentationTopic.UI_COMPONENTS);
    if (urlLower.includes('deploy')) topics.push(DocumentationTopic.DEPLOYMENT);
    if (urlLower.includes('style') || urlLower.includes('css')) {
      topics.push(DocumentationTopic.STYLING);
    }
    if (urlLower.includes('data') || urlLower.includes('database')) {
      topics.push(DocumentationTopic.DATA_MANAGEMENT);
    }
    if (urlLower.includes('integration') || urlLower.includes('api')) {
      topics.push(DocumentationTopic.INTEGRATIONS);
    }
    
    return topics;
  }

  private generateTagsFromUrl(url: string): string[] {
    const tags: string[] = [];
    const urlObj = new URL(url);
    
    // Add hostname as tag
    tags.push(urlObj.hostname.replace(/^www\./, ''));
    
    // Add path segments as tags
    const segments = urlObj.pathname.split('/').filter(s => s && s.length > 2);
    tags.push(...segments.slice(0, 3)); // Limit to first 3 segments
    
    return tags;
  }
}