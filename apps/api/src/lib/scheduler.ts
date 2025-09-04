import { Worker } from 'bullmq';
import { LinkManager } from './linkManager.js';
import { jobQueue } from './queue.js';

export class LinkScheduler {
  private static instance: LinkScheduler;
  private worker: Worker;
  private isRunning = false;
  
  public static getInstance(): LinkScheduler {
    if (!LinkScheduler.instance) {
      LinkScheduler.instance = new LinkScheduler();
    }
    return LinkScheduler.instance;
  }

  constructor() {
    this.worker = new Worker(
      'link-scheduler',
      async (job) => {
        await this.processScheduledLinks();
      },
          {
      connection: {
        host: 'redis',
        port: 6379,
      },
      concurrency: 1
    }
    );
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Link scheduler started');
    
    // Process links immediately on start
    await this.processScheduledLinks();
    
    // Schedule regular processing every 5 minutes
    setInterval(async () => {
      if (this.isRunning) {
        await this.processScheduledLinks();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop the scheduler
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    await this.worker.close();
    console.log('⏹️ Link scheduler stopped');
  }

  /**
   * Process links that are ready for scraping
   */
  private async processScheduledLinks(): Promise<void> {
    try {
      const linkManager = LinkManager.getInstance();
      const readyLinks = await linkManager.getLinksForScraping(20); // Process up to 20 links at a time
      
      if (readyLinks.length === 0) {
        console.log('📋 No links ready for scraping');
        return;
      }
      
      console.log(`🔄 Processing ${readyLinks.length} links for scraping`);
      
      for (const link of readyLinks) {
        try {
          // Schedule scraping job
          const jobId = await linkManager.scheduleScraping(link.id);
          console.log(`✅ Scheduled scraping for ${link.url} (job: ${jobId})`);
          
          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Failed to schedule scraping for ${link.url}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Failed to process scheduled links:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; workerStatus: string } {
    return {
      isRunning: this.isRunning,
      workerStatus: this.worker.isRunning() ? 'running' : 'stopped'
    };
  }

  /**
   * Manually trigger link processing
   */
  async triggerProcessing(): Promise<void> {
    console.log('🔄 Manual trigger: processing scheduled links');
    await this.processScheduledLinks();
  }
}
