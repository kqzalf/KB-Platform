import { Worker } from 'bullmq';
import { config } from './lib/config.js';
import { WebScraper } from './lib/scraper.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const http = require('http');

const scraper = new WebScraper();

// Helper functions to communicate with API using native HTTP
async function updateJobStatus(jobId: string, status: string) {
  const apiUrl = process.env.API_URL || 'http://api:4000';
  const url = new URL(`${apiUrl}/jobs/${jobId}`);
  
  const postData = JSON.stringify({ status });
  
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise<void>((resolve, reject) => {
    const req = http.request(options, (res: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
    });

    req.on('error', (err: any) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function updateJobResult(jobId: string, status: string, result?: any, error?: string) {
  const apiUrl = process.env.API_URL || 'http://api:4000';
  const url = new URL(`${apiUrl}/jobs/${jobId}`);
  
  const data: any = { status };
  if (result) data.result = result;
  if (error) data.error = error;
  
  const postData = JSON.stringify(data);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise<void>((resolve, reject) => {
    const req = http.request(options, (res: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
    });

    req.on('error', (err: any) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function updateLinkAfterScraping(linkId: string, jobId: string, result?: any, error?: string) {
  const apiUrl = process.env.API_URL || 'http://api:4000';
  const url = new URL(`${apiUrl}/links/${linkId}/update-scrape`);
  
  const data: any = { jobId };
  if (result) data.result = result;
  if (error) data.error = error;
  
  const postData = JSON.stringify(data);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise<void>((resolve, reject) => {
    const req = http.request(options, (res: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`✅ Updated link ${linkId} after scraping`);
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
    });

    req.on('error', (err: any) => {
      console.warn(`Failed to update link ${linkId} after scraping:`, err);
      resolve(); // Don't fail the job if link update fails
    });

    req.write(postData);
    req.end();
  });
}

async function discoverLinksFromContent(sourceUrl: string, result: any) {
  if (!result.links || result.links.length === 0) {
    return;
  }

  try {
    const apiUrl = process.env.API_URL || 'http://api:4000';
    const url = new URL(`${apiUrl}/links/discover`);
    
    const data = {
      sourceUrl,
      content: result,
      options: {
        maxLinks: 20,
        minConfidence: 0.4
      }
    };
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise<void>((resolve, reject) => {
      const req = http.request(options, (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Discovered links from ${sourceUrl}`);
          resolve();
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });

      req.on('error', (err: any) => {
        console.warn(`Failed to discover links from ${sourceUrl}:`, err);
        resolve(); // Don't fail the job if link discovery fails
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    console.warn(`Failed to discover links from ${sourceUrl}:`, error);
  }
}

async function autoIngestScrapedContent(linkId: string, jobId: string, result: any) {
  try {
    const apiUrl = process.env.API_URL || 'http://api:4000';
    
    // First, ingest into knowledge base
    const kbUrl = new URL(`${apiUrl}/links/${linkId}/ingest`);
    const kbOptions = {
      hostname: kbUrl.hostname,
      port: kbUrl.port || 80,
      path: kbUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0
      }
    };

    const kbResponse = await new Promise<any>((resolve, reject) => {
      const req = http.request(kbOptions, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`KB Ingestion failed: ${parsed.error || 'Unknown error'}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse KB response: ${e}`));
          }
        });
      });

      req.on('error', (err: any) => reject(err));
      req.end();
    });

    console.log(`Auto-ingested link ${linkId} into knowledge base: ${kbResponse.knowledgeItem?.title}`);

    // Then, ingest into vault
    const vaultUrl = new URL(`${apiUrl}/vault/ingest-link/${linkId}`);
    const vaultOptions = {
      hostname: vaultUrl.hostname,
      port: vaultUrl.port || 80,
      path: vaultUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': 0
      }
    };

    const vaultResponse = await new Promise<any>((resolve, reject) => {
      const req = http.request(vaultOptions, (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`Vault Ingestion failed: ${parsed.error || 'Unknown error'}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse vault response: ${e}`));
          }
        });
      });

      req.on('error', (err: any) => reject(err));
      req.end();
    });

    console.log(`Auto-ingested link ${linkId} into vault: ${vaultResponse.vaultPath}`);

  } catch (error) {
    console.error(`Auto-ingestion failed for link ${linkId}:`, error);
    // Don't throw - we don't want to fail the entire job if auto-ingestion fails
  }
}

const worker = new Worker(
  'scraping-jobs',
  async (job) => {
    const { jobId, targetUrl, kind, options = {} } = job.data;
    
    console.log(`Processing job ${jobId} for ${targetUrl} (${kind})`);
    
    try {
      // Update job status to processing via API
      await updateJobStatus(jobId, 'processing');
      
      // Use provided options or defaults
      const scrapingOptions = {
        extractImages: options.extractImages ?? true,
        extractLinks: options.extractLinks ?? true,
        waitForSelector: options.waitForSelector || (kind === 'documentation' ? 'main' : undefined),
        maxWaitTime: options.maxWaitTime || 10000
      };
      
      const result = await scraper.scrape(targetUrl, kind, scrapingOptions);
      
      // Store the result via API
      await updateJobResult(jobId, 'completed', result);
      
      // Discover and cache new links from the scraped content
      await discoverLinksFromContent(targetUrl, result);
      
      // Update link cache if this was a scheduled scrape
      if (options.linkId) {
        await updateLinkAfterScraping(options.linkId, jobId, result);
        
        // Auto-ingest the scraped content into knowledge base and vault
        await autoIngestScrapedContent(options.linkId, jobId, result);
      }
      
      console.log(`Job ${jobId} completed successfully`);
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      
      await updateJobResult(jobId, 'failed', null, error instanceof Error ? error.message : 'Unknown error');
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 3,
  }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

console.log('🚀 Worker started, waiting for jobs...');

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  await scraper.close();
  process.exit(0);
});
