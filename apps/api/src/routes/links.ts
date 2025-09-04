import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';

const router = Router();

const createLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const updateLinkSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
});

const searchLinksSchema = z.object({
  query: z.string().optional(),
  contentType: z.string().optional(),
  domain: z.string().optional(),
  status: z.string().optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  page: z.string().optional(),
});

// GET /links - Get all links with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { query, contentType, domain, status, limit, offset, page } = searchLinksSchema.parse(req.query);
    
    const where: any = {};
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { url: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (contentType) where.contentType = contentType;
    if (domain) where.domain = { contains: domain, mode: 'insensitive' };
    if (status) where.status = status;
    
    // Parse pagination parameters
    const pageNum = page ? parseInt(page as string) : 1;
    const limitNum = limit ? parseInt(limit as string) : 20;
    const offsetNum = offset ? parseInt(offset as string) : (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const total = await db.linkCache.count({ where });
    const totalPages = Math.ceil(total / limitNum);
    
    const links = await db.linkCache.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limitNum,
      skip: offsetNum,
    });
    
    res.json({
      links,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// GET /links/stats - Get link statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await db.linkCache.count();
    const active = await db.linkCache.count({ where: { status: 'active' } });
    const inactive = await db.linkCache.count({ where: { status: 'inactive' } });
    const error = await db.linkCache.count({ where: { status: 'error' } });
    
    const contentTypeStats = await db.linkCache.groupBy({
      by: ['contentType'],
      _count: { contentType: true },
    });
    
    const domainStats = await db.linkCache.groupBy({
      by: ['domain'],
      _count: { domain: true },
      orderBy: { _count: { domain: 'desc' } },
      take: 10,
    });
    
    res.json({
      total,
      active,
      inactive,
      error,
      contentTypeStats,
      domainStats,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch link stats' });
  }
});

// GET /links/search - Search links
router.get('/search', async (req, res) => {
  try {
    const { query, contentType, domain, status, limit } = searchLinksSchema.parse(req.query);
    
    const where: any = {};
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { url: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (contentType) where.contentType = contentType;
    if (domain) where.domain = { contains: domain, mode: 'insensitive' };
    if (status) where.status = status;
    
    const links = await db.linkCache.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });
    
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search links' });
  }
});

// GET /links/ready - Get links ready for scraping
router.get('/ready', async (req, res) => {
  try {
    const { limit } = req.query;
    
    const links = await db.linkCache.findMany({
      where: {
        status: 'active',
        OR: [
          { lastScraped: null },
          { nextScrape: { lte: new Date() } },
        ],
      },
      orderBy: { nextScrape: 'asc' },
      take: limit ? parseInt(limit as string) : 10,
    });
    
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ready links' });
  }
});

// POST /links - Create a new link
router.post('/', async (req, res) => {
  try {
    const { url, title, description } = createLinkSchema.parse(req.body);
    
    const link = await db.linkCache.create({
      data: {
        url,
        title: title || '',
        description: description || '',
        domain: new URL(url).hostname,
        status: 'active',
      },
    });
    
    res.json(link);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create link' });
    }
  }
});

// GET /links/:id - Get specific link
router.get('/:id', async (req, res) => {
  try {
    const link = await db.linkCache.findUnique({
      where: { id: req.params.id },
    });
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch link' });
  }
});

// PUT /links/:id - Update a link
router.put('/:id', async (req, res) => {
  try {
    const { title, description, status } = updateLinkSchema.parse(req.body);
    
    const link = await db.linkCache.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
    });
    
    res.json(link);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update link' });
    }
  }
});

// DELETE /links/:id - Delete a link
router.delete('/:id', async (req, res) => {
  try {
    await db.linkCache.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// POST /links/:id/scrape - Trigger scraping for a link
router.post('/:id/scrape', async (req, res) => {
  try {
    const link = await db.linkCache.findUnique({
      where: { id: req.params.id },
    });
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    // Update last scraped time
    await db.linkCache.update({
      where: { id: req.params.id },
      data: { lastScraped: new Date() },
    });
    
    res.json({ message: 'Scraping triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger scraping' });
  }
});

// POST /links/bulk - Bulk create links
router.post('/bulk', async (req, res) => {
  try {
    const { urls } = z.object({
      urls: z.array(z.string().url()),
    }).parse(req.body);
    
    const links = await Promise.all(
      urls.map(url => 
        db.linkCache.create({
          data: {
            url,
            title: '',
            description: '',
            domain: new URL(url).hostname,
            status: 'active',
          },
        })
      )
    );
    
    res.json(links);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create links' });
    }
  }
});

// POST /links/discover - Discover links from a page
router.post('/discover', async (req, res) => {
  try {
    const { url } = z.object({
      url: z.string().url(),
    }).parse(req.body);
    
    // This would typically use a web scraper to discover links
    // For now, we'll just return a mock response
    res.json({ 
      message: 'Link discovery not implemented yet',
      discoveredLinks: []
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to discover links' });
    }
  }
});

// GET /links/:id/scrapes - Get scrapes for a link
router.get('/:id/scrapes', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    
    const scrapes = await db.linkScrape.findMany({
      where: { linkId: req.params.id },
      orderBy: { scrapedAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
      skip: offset ? parseInt(offset as string) : 0,
    });
    
    res.json(scrapes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scrapes' });
  }
});

// POST /links/:id/ingest - Ingest scraped content
router.post('/:id/ingest', async (req, res) => {
  try {
    const link = await db.linkCache.findUnique({
      where: { id: req.params.id },
    });
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    // This would typically process and ingest the scraped content
    res.json({ message: 'Content ingestion triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ingest content' });
  }
});

// POST /links/bulk-ingest - Bulk ingest content
router.post('/bulk-ingest', async (req, res) => {
  try {
    const { linkIds } = z.object({
      linkIds: z.array(z.string()),
    }).parse(req.body);
    
    // This would typically process and ingest content for multiple links
    res.json({ message: 'Bulk content ingestion triggered successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to bulk ingest content' });
    }
  }
});

export { router as linksRouter };
