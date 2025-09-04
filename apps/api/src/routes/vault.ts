import { Router } from 'express';
import { z } from 'zod';
import { VaultManager } from '../lib/vaultManager.js';
import { db } from '../lib/db.js';

const router = Router();
const vaultManager = VaultManager.getInstance();

// POST /vault/ingest/:knowledgeItemId - Ingest a knowledge item into vault
router.post('/ingest/:knowledgeItemId', async (req, res) => {
  try {
    const { knowledgeItemId } = req.params;
    
    const result = await vaultManager.ingestScrapedContent(knowledgeItemId);
    
    if (result.success) {
      res.json({
        message: 'Content successfully ingested into vault',
        vaultPath: result.vaultPath,
        knowledgeItemId
      });
    } else {
      res.status(500).json({ error: 'Failed to ingest content into vault' });
    }
  } catch (error) {
    console.error('Vault ingestion failed:', error);
    res.status(500).json({ error: 'Vault ingestion failed' });
  }
});

// POST /vault/ingest-link/:linkId - Ingest a link's scraped content into vault
router.post('/ingest-link/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;
    
    // First, ingest the link into knowledge base
    const link = await db.linkCache.findUnique({
      where: { id: linkId }
    });
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    // Get the latest scrape result
    const latestScrape = await db.linkScrape.findFirst({
      where: {
        linkId: link.id,
        status: 'completed'
      },
      orderBy: { scrapedAt: 'desc' }
    });
    
    if (!latestScrape || !latestScrape.result) {
      return res.status(400).json({ error: 'No successful scrape found for this link' });
    }
    
    const result = latestScrape.result as any;
    
    // Create knowledge item from scraped content
    const knowledgeItem = await db.knowledgeItem.create({
      data: {
        title: result.title || link.title || link.url,
        content: result.content || '',
        source: link.url,
        metadata: {
          linkId: link.id,
          domain: link.domain,
          contentType: link.contentType,
          scrapedAt: latestScrape.scrapedAt,
          wordCount: result.wordCount,
          readingTime: result.readingTime,
          images: result.images || [],
          links: result.links || []
        }
      }
    });
    
    // Now ingest into vault
    const vaultResult = await vaultManager.ingestScrapedContent(knowledgeItem.id);
    
    if (vaultResult.success) {
      res.json({
        message: 'Link content successfully ingested into vault',
        vaultPath: vaultResult.vaultPath,
        knowledgeItem: {
          id: knowledgeItem.id,
          title: knowledgeItem.title,
          source: knowledgeItem.source
        }
      });
    } else {
      res.status(500).json({ error: 'Failed to ingest link content into vault' });
    }
  } catch (error) {
    console.error('Link vault ingestion failed:', error);
    res.status(500).json({ error: 'Link vault ingestion failed' });
  }
});

// POST /vault/bulk-ingest - Bulk ingest multiple knowledge items into vault
router.post('/bulk-ingest', async (req, res) => {
  try {
    const { knowledgeItemIds, minPriority = 1 } = req.body;
    
    if (!Array.isArray(knowledgeItemIds) || knowledgeItemIds.length === 0) {
      return res.status(400).json({ error: 'knowledgeItemIds must be a non-empty array' });
    }
    
    const results = [];
    const errors = [];
    
    for (const knowledgeItemId of knowledgeItemIds) {
      try {
        const result = await vaultManager.ingestScrapedContent(knowledgeItemId);
        results.push({
          knowledgeItemId,
          success: result.success,
          vaultPath: result.vaultPath
        });
      } catch (error) {
        errors.push({
          knowledgeItemId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      message: `${results.filter(r => r.success).length} items ingested successfully`,
      results,
      errors
    });
  } catch (error) {
    console.error('Bulk vault ingestion failed:', error);
    res.status(500).json({ error: 'Bulk vault ingestion failed' });
  }
});

// POST /vault/bulk-ingest-links - Bulk ingest multiple links into vault
router.post('/bulk-ingest-links', async (req, res) => {
  try {
    const { linkIds, minPriority = 1 } = req.body;
    
    if (!Array.isArray(linkIds) || linkIds.length === 0) {
      return res.status(400).json({ error: 'linkIds must be a non-empty array' });
    }
    
    const links = await db.linkCache.findMany({
      where: {
        id: { in: linkIds },
        priority: { gte: minPriority }
      }
    });
    
    const results = [];
    const errors = [];
    
    for (const link of links) {
      try {
        // Get the latest scrape result
        const latestScrape = await db.linkScrape.findFirst({
          where: {
            linkId: link.id,
            status: 'completed'
          },
          orderBy: { scrapedAt: 'desc' }
        });
        
        if (!latestScrape || !latestScrape.result) {
          errors.push({ linkId: link.id, error: 'No successful scrape found' });
          continue;
        }
        
        const result = latestScrape.result as any;
        
        // Create knowledge item
        const knowledgeItem = await db.knowledgeItem.create({
          data: {
            title: result.title || link.title || link.url,
            content: result.content || '',
            source: link.url,
            metadata: {
              linkId: link.id,
              domain: link.domain,
              contentType: link.contentType,
              scrapedAt: latestScrape.scrapedAt,
              wordCount: result.wordCount,
              readingTime: result.readingTime,
              images: result.images || [],
              links: result.links || []
            }
          }
        });
        
        // Ingest into vault
        const vaultResult = await vaultManager.ingestScrapedContent(knowledgeItem.id);
        
        results.push({
          linkId: link.id,
          knowledgeItemId: knowledgeItem.id,
          success: vaultResult.success,
          vaultPath: vaultResult.vaultPath
        });
      } catch (error) {
        errors.push({
          linkId: link.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      message: `${results.filter(r => r.success).length} links ingested successfully`,
      results,
      errors
    });
  } catch (error) {
    console.error('Bulk link vault ingestion failed:', error);
    res.status(500).json({ error: 'Bulk link vault ingestion failed' });
  }
});

// GET /vault/stats - Get vault statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await vaultManager.getVaultStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to get vault stats:', error);
    res.status(500).json({ error: 'Failed to get vault stats' });
  }
});

// GET /vault/categories - Get available vault categories
router.get('/categories', async (req, res) => {
  try {
    const categories = [
      {
        id: 'documentation',
        name: 'Documentation',
        path: '09-EXTERNAL-RESOURCES/01-DOCUMENTATION',
        description: 'Technical documentation and API references'
      },
      {
        id: 'blogs',
        name: 'Blogs',
        path: '09-EXTERNAL-RESOURCES/02-BLOGS',
        description: 'Blog posts and articles'
      },
      {
        id: 'news',
        name: 'News',
        path: '09-EXTERNAL-RESOURCES/03-NEWS',
        description: 'News articles and current events'
      },
      {
        id: 'tutorials',
        name: 'Tutorials',
        path: '09-EXTERNAL-RESOURCES/04-TUTORIALS',
        description: 'Tutorials and how-to guides'
      },
      {
        id: 'apis',
        name: 'APIs',
        path: '09-EXTERNAL-RESOURCES/05-APIS',
        description: 'API documentation and references'
      },
      {
        id: 'forums',
        name: 'Forums',
        path: '09-EXTERNAL-RESOURCES/06-FORUMS',
        description: 'Forum discussions and Q&A'
      },
      {
        id: 'github',
        name: 'GitHub',
        path: '09-EXTERNAL-RESOURCES/07-GITHUB',
        description: 'GitHub repositories and code'
      },
      {
        id: 'stackoverflow',
        name: 'Stack Overflow',
        path: '09-EXTERNAL-RESOURCES/08-STACKOVERFLOW',
        description: 'Stack Overflow questions and answers'
      },
      {
        id: 'general',
        name: 'General',
        path: '09-EXTERNAL-RESOURCES/00-GENERAL',
        description: 'General external resources'
      }
    ];
    
    res.json({ categories });
  } catch (error) {
    console.error('Failed to get vault categories:', error);
    res.status(500).json({ error: 'Failed to get vault categories' });
  }
});

export { router as vaultRouter };

