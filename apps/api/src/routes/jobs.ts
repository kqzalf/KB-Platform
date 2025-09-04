import { Router } from 'express';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { jobQueue } from '../lib/queue.js';

const router = Router();

const createJobSchema = z.object({
  targetUrl: z.string().url(),
  kind: z.enum(['generic', 'documentation', 'blog', 'news']),
  options: z.object({
    extractImages: z.boolean().optional(),
    extractLinks: z.boolean().optional(),
    waitForSelector: z.string().optional(),
    maxWaitTime: z.number().optional(),
  }).optional(),
});

// GET /jobs - List all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await db.job.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /jobs/presets - Get scraping presets
router.get('/presets', async (req, res) => {
  try {
    const presets = [
      {
        id: 'blog-post',
        name: 'Blog Post',
        description: 'Extract blog post content with images and links',
        kind: 'blog',
        options: {
          extractImages: true,
          extractLinks: true,
          waitForSelector: 'article, .post, .entry',
          maxWaitTime: 5000
        },
        icon: '📝'
      },
      {
        id: 'news-article',
        name: 'News Article',
        description: 'Extract news article content quickly',
        kind: 'news',
        options: {
          extractImages: true,
          extractLinks: false,
          waitForSelector: 'article, .story',
          maxWaitTime: 3000
        },
        icon: '📰'
      },
      {
        id: 'documentation',
        name: 'Documentation',
        description: 'Extract technical documentation with full content',
        kind: 'documentation',
        options: {
          extractImages: true,
          extractLinks: true,
          waitForSelector: 'main, .content, .documentation',
          maxWaitTime: 8000
        },
        icon: '📚'
      },
      {
        id: 'generic-page',
        name: 'Generic Page',
        description: 'Extract any webpage content',
        kind: 'generic',
        options: {
          extractImages: true,
          extractLinks: true,
          maxWaitTime: 10000
        },
        icon: '🌐'
      }
    ];
    
    res.json({ presets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// POST /jobs - Create a new job
router.post('/', async (req, res) => {
  try {
    const { targetUrl, kind, options } = createJobSchema.parse(req.body);
    
    const job = await db.job.create({
      data: { 
        targetUrl, 
        kind
      },
    });
    
    // Add to queue with options
    await jobQueue.add('scrape', {
      jobId: job.id,
      targetUrl,
      kind,
      options: options || {}
    });
    
    res.status(201).json(job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create job' });
    }
  }
});

// GET /jobs/:id - Get specific job
router.get('/:id', async (req, res) => {
  try {
    const job = await db.job.findUnique({
      where: { id: req.params.id },
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// PATCH /jobs/:id - Update job status
router.patch('/:id', async (req, res) => {
  try {
    const updateSchema = z.object({
      status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
      result: z.any().optional(),
      error: z.string().optional(),
    });
    
    const updates = updateSchema.parse(req.body);
    
    const job = await db.job.update({
      where: { id: req.params.id },
      data: updates,
    });
    
    res.json(job);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update job' });
    }
  }
});

export { router as jobsRouter };
