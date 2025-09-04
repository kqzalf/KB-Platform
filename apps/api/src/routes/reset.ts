import { Router } from 'express';
import { z } from 'zod';
import { ResetManager } from '../lib/resetManager.js';

const router = Router();
const resetManager = ResetManager.getInstance();

const resetOptionsSchema = z.object({
  clearKnowledgeItems: z.boolean().optional().default(true),
  clearLinks: z.boolean().optional().default(true),
  clearJobs: z.boolean().optional().default(true),
  clearVault: z.boolean().optional().default(true),
  reinitializeVault: z.boolean().optional().default(true),
  preserveOriginalVault: z.boolean().optional().default(true),
});

// POST /reset/system - Reset entire system to default state
router.post('/system', async (req, res) => {
  try {
    const options = resetOptionsSchema.parse(req.body);
    
    const result = await resetManager.resetSystem(options);
    
    if (result.success) {
      res.json({
        message: 'System reset successfully',
        cleared: result.cleared,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Reset failed',
        message: result.message,
        cleared: result.cleared
      });
    }
  } catch (error) {
    console.error('Reset system failed:', error);
    res.status(500).json({ 
      error: 'Reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /reset/database - Reset only database (keep vault)
router.post('/database', async (req, res) => {
  try {
    const options = {
      clearKnowledgeItems: true,
      clearLinks: true,
      clearJobs: true,
      clearVault: false,
      reinitializeVault: false,
      preserveOriginalVault: true,
    };
    
    const result = await resetManager.resetSystem(options);
    
    if (result.success) {
      res.json({
        message: 'Database reset successfully',
        cleared: result.cleared,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Database reset failed',
        message: result.message,
        cleared: result.cleared
      });
    }
  } catch (error) {
    console.error('Database reset failed:', error);
    res.status(500).json({ 
      error: 'Database reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /reset/vault - Reset only vault external resources
router.post('/vault', async (req, res) => {
  try {
    const options = {
      clearKnowledgeItems: false,
      clearLinks: false,
      clearJobs: false,
      clearVault: true,
      reinitializeVault: true,
      preserveOriginalVault: true,
    };
    
    const result = await resetManager.resetSystem(options);
    
    if (result.success) {
      res.json({
        message: 'Vault reset successfully',
        cleared: result.cleared,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Vault reset failed',
        message: result.message,
        cleared: result.cleared
      });
    }
  } catch (error) {
    console.error('Vault reset failed:', error);
    res.status(500).json({ 
      error: 'Vault reset failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /reset/vault-complete - Complete vault recreation
router.post('/vault-complete', async (req, res) => {
  try {
    const options = {
      clearKnowledgeItems: false,
      clearLinks: false,
      clearJobs: false,
      clearVault: true,
      reinitializeVault: true,
      preserveOriginalVault: false, // Complete recreation
    };
    
    const result = await resetManager.resetSystem(options);
    
    if (result.success) {
      res.json({
        message: 'Vault completely recreated successfully',
        cleared: result.cleared,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Vault recreation failed',
        message: result.message,
        cleared: result.cleared
      });
    }
  } catch (error) {
    console.error('Vault recreation failed:', error);
    res.status(500).json({ 
      error: 'Vault recreation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /reset/stats - Get current system statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await resetManager.getSystemStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get system stats:', error);
    res.status(500).json({ 
      error: 'Failed to get system statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /reset/status - Get reset status and available options
router.get('/status', async (req, res) => {
  try {
    const stats = await resetManager.getSystemStats();
    
    res.json({
      system: {
        knowledgeItems: stats.knowledgeItems,
        links: stats.links,
        jobs: stats.jobs,
        vaultFiles: stats.vaultFiles,
        totalItems: stats.knowledgeItems + stats.links + stats.jobs + stats.vaultFiles
      },
      resetOptions: {
        system: {
          description: 'Reset entire system (database + vault)',
          endpoint: 'POST /reset/system',
          clears: ['knowledgeItems', 'links', 'jobs', 'vaultFiles']
        },
        database: {
          description: 'Reset only database (keep vault)',
          endpoint: 'POST /reset/database',
          clears: ['knowledgeItems', 'links', 'jobs']
        },
        vault: {
          description: 'Reset only vault external resources',
          endpoint: 'POST /reset/vault',
          clears: ['vaultFiles']
        },
        vaultComplete: {
          description: 'Complete vault recreation (delete and recreate entire vault)',
          endpoint: 'POST /reset/vault-complete',
          clears: ['vaultFiles']
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get reset status:', error);
    res.status(500).json({ 
      error: 'Failed to get reset status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as resetRouter };
