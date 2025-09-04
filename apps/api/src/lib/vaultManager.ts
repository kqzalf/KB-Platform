import fs from 'fs/promises';
import path from 'path';
import { config } from './config.js';
import { db } from './db.js';

export class VaultManager {
  private vaultPath: string;
  private static instance: VaultManager;

  private constructor() {
    this.vaultPath = config.vaultPath;
  }

  public static getInstance(): VaultManager {
    if (!VaultManager.instance) {
      VaultManager.instance = new VaultManager();
    }
    return VaultManager.instance;
  }

  async getAllFiles(): Promise<string[]> {
    const files: string[] = [];
    await this.scanDirectory(this.vaultPath, files);
    return files.filter(file => file.endsWith('.md'));
  }

  private async scanDirectory(dir: string, files: string[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, files);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error);
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return '';
    }
  }

  async getFileStats(filePath: string): Promise<{ size: number; mtime: Date } | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error) {
      console.error(`Error getting stats for ${filePath}:`, error);
      return null;
    }
  }

  async ingestScrapedContent(knowledgeItemId: string): Promise<{ success: boolean; vaultPath?: string; error?: string }> {
    try {
      const knowledgeItem = await db.knowledgeItem.findUnique({
        where: { id: knowledgeItemId }
      });

      if (!knowledgeItem) {
        return { success: false, error: 'Knowledge item not found' };
      }

      // Create a safe filename from the title
      const safeTitle = knowledgeItem.title
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .substring(0, 100);

      const fileName = `${safeTitle}-${knowledgeItemId.substring(0, 8)}.md`;
      const vaultPath = path.join(this.vaultPath, 'KnowledgeBase', '09-EXTERNAL-RESOURCES', '00-GENERAL', fileName);

      // Ensure directory exists
      await fs.mkdir(path.dirname(vaultPath), { recursive: true });

      // Create markdown content
      const content = `# ${knowledgeItem.title}

**Source:** ${knowledgeItem.source}
**Created:** ${new Date().toISOString()}

---

${knowledgeItem.content}

---

*This content was automatically scraped and ingested into the knowledge base.*`;

      await fs.writeFile(vaultPath, content, 'utf-8');

      return { success: true, vaultPath };
    } catch (error) {
      console.error('Error ingesting content:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getVaultStats(): Promise<{ totalFiles: number; totalSize: number; categories: any[] }> {
    try {
      const files = await this.getAllFiles();
      let totalSize = 0;

      for (const file of files) {
        const stats = await this.getFileStats(file);
        if (stats) {
          totalSize += stats.size;
        }
      }

      // Get category counts
      const categories = [
        { name: 'Documentation', path: '09-EXTERNAL-RESOURCES/01-DOCUMENTATION', count: 0 },
        { name: 'Blogs', path: '09-EXTERNAL-RESOURCES/02-BLOGS', count: 0 },
        { name: 'News', path: '09-EXTERNAL-RESOURCES/03-NEWS', count: 0 },
        { name: 'Tutorials', path: '09-EXTERNAL-RESOURCES/04-TUTORIALS', count: 0 },
        { name: 'APIs', path: '09-EXTERNAL-RESOURCES/05-APIS', count: 0 },
        { name: 'Forums', path: '09-EXTERNAL-RESOURCES/06-FORUMS', count: 0 },
        { name: 'GitHub', path: '09-EXTERNAL-RESOURCES/07-GITHUB', count: 0 },
        { name: 'Stack Overflow', path: '09-EXTERNAL-RESOURCES/08-STACKOVERFLOW', count: 0 },
        { name: 'General', path: '09-EXTERNAL-RESOURCES/00-GENERAL', count: 0 },
      ];

      for (const file of files) {
        for (const category of categories) {
          if (file.includes(category.path)) {
            category.count++;
            break;
          }
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        categories
      };
    } catch (error) {
      console.error('Error getting vault stats:', error);
      return { totalFiles: 0, totalSize: 0, categories: [] };
    }
  }
}
