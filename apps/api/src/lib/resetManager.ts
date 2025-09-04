import { db } from './db.js';
import { config } from './config.js';
import { readdirSync, statSync, unlinkSync, rmdirSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

export interface ResetOptions {
  clearKnowledgeItems?: boolean;
  clearLinks?: boolean;
  clearJobs?: boolean;
  clearVault?: boolean;
  reinitializeVault?: boolean;
  preserveOriginalVault?: boolean;
}

export class ResetManager {
  private static instance: ResetManager;
  private vaultPath: string;

  private constructor() {
    this.vaultPath = config.vaultPath || './vault';
  }

  public static getInstance(): ResetManager {
    if (!ResetManager.instance) {
      ResetManager.instance = new ResetManager();
    }
    return ResetManager.instance;
  }

  /**
   * Reset the entire system to default state
   */
  public async resetSystem(options: ResetOptions = {}): Promise<{
    success: boolean;
    message: string;
    cleared: {
      knowledgeItems: number;
      links: number;
      jobs: number;
      vaultFiles: number;
    };
  }> {
    const defaults: ResetOptions = {
      clearKnowledgeItems: true,
      clearLinks: true,
      clearJobs: true,
      clearVault: true,
      reinitializeVault: true,
      preserveOriginalVault: false, // Default to complete vault recreation
      ...options
    };

    const cleared = {
      knowledgeItems: 0,
      links: 0,
      jobs: 0,
      vaultFiles: 0
    };

    try {
      // Clear database tables
      if (defaults.clearKnowledgeItems) {
        const deletedItems = await db.knowledgeItem.deleteMany({});
        cleared.knowledgeItems = deletedItems.count;
      }

      if (defaults.clearLinks) {
        const deletedLinks = await db.linkCache.deleteMany({});
        cleared.links = deletedLinks.count;
      }

      if (defaults.clearJobs) {
        const deletedJobs = await db.job.deleteMany({});
        cleared.jobs = deletedJobs.count;
      }

      // Clear vault external resources
      if (defaults.clearVault) {
        if (defaults.preserveOriginalVault) {
          const vaultFiles = await this.clearVaultExternalResources(true);
          cleared.vaultFiles = vaultFiles;
        } else {
          // Complete vault recreation
          const vaultFiles = await this.recreateVaultStructure();
          cleared.vaultFiles = vaultFiles;
        }
      }

      // Reinitialize vault structure (only if not doing complete recreation)
      if (defaults.reinitializeVault && defaults.preserveOriginalVault) {
        await this.reinitializeVaultStructure();
      }

      return {
        success: true,
        message: 'System reset successfully',
        cleared
      };
    } catch (error) {
      console.error('Reset failed:', error);
      return {
        success: false,
        message: `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        cleared
      };
    }
  }

  /**
   * Clear external resources from vault while preserving original content
   */
  private async clearVaultExternalResources(preserveOriginal: boolean = true): Promise<number> {
    let filesDeleted = 0;
    
    try {
      const externalResourcesPath = join(this.vaultPath, 'KnowledgeBase', '09-EXTERNAL-RESOURCES');
      
      if (preserveOriginal) {
        // Only clear the external resources directory
        if (this.directoryExists(externalResourcesPath)) {
          filesDeleted = await this.deleteDirectoryContents(externalResourcesPath);
        }
      } else {
        // Clear entire vault except core structure
        const vaultPath = join(this.vaultPath, 'KnowledgeBase');
        if (this.directoryExists(vaultPath)) {
          const entries = readdirSync(vaultPath);
          for (const entry of entries) {
            const entryPath = join(vaultPath, entry);
            const stats = statSync(entryPath);
            
            if (stats.isDirectory()) {
              if (entry.startsWith('09-EXTERNAL-RESOURCES')) {
                filesDeleted += await this.deleteDirectoryContents(entryPath);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to clear vault external resources:', error);
    }

    return filesDeleted;
  }

  /**
   * Completely delete and recreate the vault structure
   */
  private async recreateVaultStructure(): Promise<number> {
    let filesDeleted = 0;
    
    try {
      // Delete the entire vault directory contents (but not the directory itself due to Docker volume mount)
      if (this.directoryExists(this.vaultPath)) {
        filesDeleted = await this.deleteDirectoryContents(this.vaultPath);
        // Don't try to remove the directory itself as it's mounted in Docker
      } else {
        // Create the vault directory if it doesn't exist
        this.ensureDirectoryExists(this.vaultPath);
      }

      // Recreate the complete vault structure
      await this.createCompleteVaultStructure();
      
    } catch (error) {
      console.error('Failed to recreate vault structure:', error);
      throw error;
    }

    return filesDeleted;
  }

  /**
   * Create the complete vault structure from scratch
   */
  private async createCompleteVaultStructure(): Promise<void> {
    try {
      // Create main vault directory
      this.ensureDirectoryExists(this.vaultPath);
      
      // Create KnowledgeBase directory
      const knowledgeBasePath = join(this.vaultPath, 'KnowledgeBase');
      this.ensureDirectoryExists(knowledgeBasePath);

      // Create main index file
      const mainIndexContent = this.generateMainVaultIndex();
      const mainIndexPath = join(knowledgeBasePath, '00-INDEX.md');
      writeFileSync(mainIndexPath, mainIndexContent, 'utf-8');

      // Create core directories
      const coreDirectories = [
        '00-META',
        '01-CORE-DOCUMENTATION',
        '02-OPERATIONS',
        '03-TECHNOLOGY',
        '04-COMPLIANCE',
        '05-TRAINING',
        '06-RESOURCES',
        '07-ARCHIVE',
        '08-TOOLS',
        '09-EXTERNAL-RESOURCES'
      ];

      for (const dir of coreDirectories) {
        const dirPath = join(knowledgeBasePath, dir);
        this.ensureDirectoryExists(dirPath);
        
        // Create index file for each directory
        const indexContent = this.generateDirectoryIndex(dir);
        const indexPath = join(dirPath, '00-INDEX.md');
        writeFileSync(indexPath, indexContent, 'utf-8');
      }

      // Create external resources subdirectories
      await this.createExternalResourcesStructure(knowledgeBasePath);

      // Create README file
      const readmeContent = this.generateVaultReadme();
      const readmePath = join(this.vaultPath, 'README.md');
      writeFileSync(readmePath, readmeContent, 'utf-8');

    } catch (error) {
      console.error('Failed to create complete vault structure:', error);
      throw error;
    }
  }

  /**
   * Create external resources structure
   */
  private async createExternalResourcesStructure(knowledgeBasePath: string): Promise<void> {
    const externalResourcesPath = join(knowledgeBasePath, '09-EXTERNAL-RESOURCES');
    
    const categories = [
      '00-GENERAL',
      '01-DOCUMENTATION',
      '02-BLOGS',
      '03-NEWS',
      '04-TUTORIALS',
      '05-APIS',
      '06-FORUMS',
      '07-GITHUB',
      '08-STACKOVERFLOW'
    ];

    // Create main external resources index
    const mainIndexContent = this.generateMainExternalResourcesIndex();
    const mainIndexPath = join(externalResourcesPath, '00-INDEX.md');
    writeFileSync(mainIndexPath, mainIndexContent, 'utf-8');

    // Create category directories
    for (const category of categories) {
      const categoryPath = join(externalResourcesPath, category);
      this.ensureDirectoryExists(categoryPath);
      
      // Create index file for each category
      const indexContent = this.generateCategoryIndex(category);
      const indexPath = join(categoryPath, '00-INDEX.md');
      writeFileSync(indexPath, indexContent, 'utf-8');
    }
  }

  /**
   * Reinitialize vault structure with default directories and files
   */
  private async reinitializeVaultStructure(): Promise<void> {
    try {
      // Create external resources directory structure
      const categories = [
        '00-GENERAL',
        '01-DOCUMENTATION',
        '02-BLOGS',
        '03-NEWS',
        '04-TUTORIALS',
        '05-APIS',
        '06-FORUMS',
        '07-GITHUB',
        '08-STACKOVERFLOW'
      ];

      const externalResourcesPath = join(this.vaultPath, 'KnowledgeBase', '09-EXTERNAL-RESOURCES');
      
      // Create main directory
      this.ensureDirectoryExists(externalResourcesPath);

      // Create category directories
      for (const category of categories) {
        const categoryPath = join(externalResourcesPath, category);
        this.ensureDirectoryExists(categoryPath);
        
        // Create index file for each category
        const indexContent = this.generateCategoryIndex(category);
        const indexPath = join(categoryPath, '00-INDEX.md');
        writeFileSync(indexPath, indexContent, 'utf-8');
      }

      // Create main external resources index
      const mainIndexContent = this.generateMainExternalResourcesIndex();
      const mainIndexPath = join(externalResourcesPath, '00-INDEX.md');
      writeFileSync(mainIndexPath, mainIndexContent, 'utf-8');

    } catch (error) {
      console.error('Failed to reinitialize vault structure:', error);
      throw error;
    }
  }

  /**
   * Generate category index content
   */
  private generateCategoryIndex(category: string): string {
    const categoryName = category.replace(/-/g, ' ').replace(/^\d+-/, '');
    const currentDate = new Date().toLocaleString();
    
    return `# ${categoryName.toUpperCase()}

**Last Updated:** ${currentDate}

## 📋 Content Index

*No content yet. Scraped content will appear here automatically.*

## 📝 About This Category

This directory contains ${categoryName.toLowerCase()} content that has been automatically scraped and organized from external sources.

### Content Types
- **Automatically Categorized**: Content is placed here based on its type and domain
- **Rich Metadata**: Each file includes source information, tags, and timestamps
- **Searchable**: All content is indexed and searchable through the knowledge base

### How Content Gets Here
1. Links are discovered through web scraping
2. Content is automatically categorized
3. Files are created with proper structure and metadata
4. Index files are automatically updated

---
*This index is automatically maintained by the KB Platform*`;
  }

  /**
   * Generate main vault index
   */
  private generateMainVaultIndex(): string {
    const currentDate = new Date().toLocaleString();
    
    return `# 🏢 Cannabis Dispensary Knowledge Base

**Last Updated:** ${currentDate}

## 📋 Quick Navigation

### Core Operations
- [[02-OPERATIONS/00-INDEX|Standard Operating Procedures]]
- [[02-OPERATIONS/00-INDEX|Operational Procedures]]
- [[02-OPERATIONS/00-INDEX|Company Policies]]

### Technology & Systems
- [[03-TECHNOLOGY/00-INDEX|Dutchie POS System]]
- [[03-TECHNOLOGY/00-INDEX|Hardware Management]]
- [[03-TECHNOLOGY/00-INDEX|Network Infrastructure]]

### Compliance & Security
- [[04-COMPLIANCE/00-INDEX|Regulatory Compliance]]
- [[04-COMPLIANCE/00-INDEX|Security Requirements]]
- [[04-COMPLIANCE/00-INDEX|Audit Preparation]]

### Training & Education
- [[05-TRAINING/00-INDEX|Training Programs]]
- [[05-TRAINING/00-INDEX|Training Materials]]
- [[05-TRAINING/00-INDEX|Certifications]]

### Resources & References
- [[06-RESOURCES/00-INDEX|Documentation]]
- [[06-RESOURCES/00-INDEX|Input Resources]]
- [[06-RESOURCES/00-INDEX|Templates]]

### External Resources
- [[09-EXTERNAL-RESOURCES/00-INDEX|External Resources]] - Scraped and organized content

## 📊 Vault Statistics
- **Total Directories:** 10
- **Auto-Organized:** Yes
- **Searchable:** Yes
- **Last Reset:** ${currentDate}

## 🔗 Quick Links
- [[Daily Operations Checklist]]
- [[Emergency Procedures]]
- [[Staff Training Schedule]]
- [[Compliance Calendar]]

## 📝 Recent Updates
- Vault structure reinitialized: ${currentDate}
- All directories created and indexed
- Ready for content ingestion

---
*This index is automatically maintained by the KB Platform*`;
  }

  /**
   * Generate directory index
   */
  private generateDirectoryIndex(directory: string): string {
    const currentDate = new Date().toLocaleString();
    const dirName = directory.replace(/^\d+-/, '').replace(/-/g, ' ');
    
    return `# ${dirName.toUpperCase()}

**Last Updated:** ${currentDate}

## 📋 Content Index

*No content yet. Content will appear here as it's added.*

## 📝 About This Directory

This directory contains ${dirName.toLowerCase()} related content for the cannabis dispensary knowledge base.

### Content Types
- **Organized Structure**: Content is organized by type and relevance
- **Searchable**: All content is indexed and searchable
- **Maintained**: Index files are automatically updated

### How Content Gets Here
1. Manual addition of relevant content
2. Automatic ingestion from external sources
3. Import from other systems
4. Generated documentation

---
*This index is automatically maintained by the KB Platform*`;
  }

  /**
   * Generate vault README
   */
  private generateVaultReadme(): string {
    const currentDate = new Date().toLocaleString();
    
    return `# 🏢 Cannabis Dispensary Knowledge Base

**Created:** ${currentDate}

## 📖 Overview

This is a comprehensive knowledge base for cannabis dispensary operations, built with Obsidian and managed by the KB Platform.

## 🏗️ Structure

The knowledge base is organized into the following main directories:

- **00-META** - Metadata and configuration files
- **01-CORE-DOCUMENTATION** - Core operational documentation
- **02-OPERATIONS** - Standard operating procedures and workflows
- **03-TECHNOLOGY** - Technology systems and configurations
- **04-COMPLIANCE** - Regulatory compliance and security
- **05-TRAINING** - Training materials and assessments
- **06-RESOURCES** - Resources and reference materials
- **07-ARCHIVE** - Archived and historical content
- **08-TOOLS** - Tools and utilities
- **09-EXTERNAL-RESOURCES** - Scraped and organized external content

## 🔄 How It Works

This knowledge base is automatically managed by the KB Platform:

1. **Content Ingestion**: Automatically scrapes and organizes external content
2. **Smart Categorization**: Content is automatically categorized by type and domain
3. **Rich Metadata**: Each file includes source information, tags, and timestamps
4. **Search Integration**: All content is searchable through the platform
5. **Index Management**: Index files are automatically maintained

## 🚀 Getting Started

1. Navigate to the main index: [[KnowledgeBase/00-INDEX]]
2. Explore the directory structure
3. Use the search functionality to find specific content
4. Add new content through the platform interface

## 📊 Features

- **Automatic Organization**: Content is automatically categorized and organized
- **Rich Search**: Full-text search with semantic understanding
- **Metadata Enrichment**: Automatic tagging and categorization
- **Link Discovery**: Automatic discovery of related content
- **Version Control**: Track changes and updates

---
*This knowledge base is automatically maintained by the KB Platform*`;
  }

  /**
   * Generate main external resources index
   */
  private generateMainExternalResourcesIndex(): string {
    const currentDate = new Date().toLocaleString();
    
    return `# 🌐 External Resources

**Last Updated:** ${currentDate}

## 📋 Quick Navigation

### Content Categories
- [[00-GENERAL/00-INDEX|General Resources]] - Miscellaneous external content
- [[01-DOCUMENTATION/00-INDEX|Documentation]] - Technical docs and API references
- [[02-BLOGS/00-INDEX|Blogs]] - Blog posts and articles
- [[03-NEWS/00-INDEX|News]] - News articles and current events
- [[04-TUTORIALS/00-INDEX|Tutorials]] - Tutorials and how-to guides
- [[05-APIS/00-INDEX|APIs]] - API documentation
- [[06-FORUMS/00-INDEX|Forums]] - Forum discussions and Q&A
- [[07-GITHUB/00-INDEX|GitHub]] - GitHub repositories and code
- [[08-STACKOVERFLOW/00-INDEX|Stack Overflow]] - Stack Overflow Q&A

## 📊 Statistics
- **Total Categories:** 9
- **Auto-Organized:** Yes
- **Searchable:** Yes
- **Last Reset:** ${currentDate}

## 🔄 How It Works

This directory contains content that has been automatically scraped and organized from external sources:

1. **Discovery**: Links are discovered through web scraping
2. **Categorization**: Content is automatically categorized by type and domain
3. **Structuring**: Files are created with rich metadata and proper formatting
4. **Indexing**: Index files are automatically maintained
5. **Integration**: Content is fully integrated with the knowledge base

## 🏷️ Content Features

- **Rich Metadata**: Source URLs, domains, content types, timestamps
- **Smart Tagging**: Automatic tags based on content analysis
- **Clean Formatting**: Obsidian-optimized markdown structure
- **Related Links**: Discovered links from scraped content
- **Image References**: Embedded image links when available

---
*This directory is automatically maintained by the KB Platform*`;
  }

  /**
   * Check if directory exists
   */
  private directoryExists(path: string): boolean {
    try {
      const stats = statSync(path);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  private ensureDirectoryExists(path: string): void {
    try {
      if (!this.directoryExists(path)) {
        mkdirSync(path, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create directory ${path}:`, error);
      throw error;
    }
  }

  /**
   * Delete all contents of a directory
   */
  private async deleteDirectoryContents(dirPath: string): Promise<number> {
    let filesDeleted = 0;
    
    try {
      if (!this.directoryExists(dirPath)) {
        return 0;
      }

      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        const entryPath = join(dirPath, entry);
        const stats = statSync(entryPath);
        
        if (stats.isDirectory()) {
          filesDeleted += await this.deleteDirectoryContents(entryPath);
          rmdirSync(entryPath);
        } else {
          unlinkSync(entryPath);
          filesDeleted++;
        }
      }
    } catch (error) {
      console.error(`Failed to delete directory contents ${dirPath}:`, error);
    }

    return filesDeleted;
  }

  /**
   * Get system statistics
   */
  public async getSystemStats(): Promise<{
    knowledgeItems: number;
    links: number;
    jobs: number;
    vaultFiles: number;
  }> {
    try {
      const [knowledgeItems, links, jobs] = await Promise.all([
        db.knowledgeItem.count(),
        db.linkCache.count(),
        db.job.count()
      ]);

      const vaultFiles = this.countVaultFiles();

      return {
        knowledgeItems,
        links,
        jobs,
        vaultFiles
      };
    } catch (error) {
      console.error('Failed to get system stats:', error);
      return {
        knowledgeItems: 0,
        links: 0,
        jobs: 0,
        vaultFiles: 0
      };
    }
  }

  /**
   * Count files in vault external resources
   */
  private countVaultFiles(): number {
    try {
      const externalResourcesPath = join(this.vaultPath, 'KnowledgeBase', '09-EXTERNAL-RESOURCES');
      return this.countFilesRecursively(externalResourcesPath);
    } catch {
      return 0;
    }
  }

  /**
   * Recursively count files in directory
   */
  private countFilesRecursively(dirPath: string): number {
    let count = 0;
    
    try {
      if (!this.directoryExists(dirPath)) {
        return 0;
      }

      const entries = readdirSync(dirPath);
      
      for (const entry of entries) {
        const entryPath = join(dirPath, entry);
        const stats = statSync(entryPath);
        
        if (stats.isDirectory()) {
          count += this.countFilesRecursively(entryPath);
        } else if (entry.endsWith('.md')) {
          count++;
        }
      }
    } catch (error) {
      console.error(`Failed to count files in ${dirPath}:`, error);
    }

    return count;
  }
}
