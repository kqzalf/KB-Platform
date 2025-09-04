import { db } from './db.js';
import { jobQueue } from './queue.js';
// import { generateEmbedding } from './openai.js';

export interface LinkDiscoveryResult {
  url: string;
  title?: string;
  context?: string;
  confidence: number;
  contentType?: string;
}

export interface LinkCacheEntry {
  id: string;
  url: string;
  title?: string;
  description?: string;
  domain: string;
  contentType: string;
  status: string;
  lastScraped?: Date;
  nextScrape?: Date;
  scrapeInterval: number;
  priority: number;
  successCount: number;
  errorCount: number;
  lastError?: string;
  metadata?: any;
  tags: string[];
  discoveredFrom?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class LinkManager {
  private static instance: LinkManager;
  
  public static getInstance(): LinkManager {
    if (!LinkManager.instance) {
      LinkManager.instance = new LinkManager();
    }
    return LinkManager.instance;
  }

  /**
   * Discover and cache links from scraped content
   */
  async discoverAndCacheLinks(
    sourceUrl: string, 
    scrapedContent: any, 
    options: {
      maxLinks?: number;
      minConfidence?: number;
      contentType?: string;
    } = {}
  ): Promise<LinkDiscoveryResult[]> {
    const { maxLinks = 50, minConfidence = 0.3, contentType = 'unknown' } = options;
    
    const discoveredLinks: LinkDiscoveryResult[] = [];
    
    // Extract links from scraped content
    if (scrapedContent.links && Array.isArray(scrapedContent.links)) {
      for (const link of scrapedContent.links.slice(0, maxLinks)) {
        try {
          const linkInfo = await this.analyzeLink(link, scrapedContent.content);
          
          if (linkInfo.confidence >= minConfidence) {
            discoveredLinks.push(linkInfo);
            
            // Cache the link
            await this.cacheLink({
              url: link,
              title: linkInfo.title,
              contentType: linkInfo.contentType || contentType,
              discoveredFrom: sourceUrl,
              confidence: linkInfo.confidence,
              context: linkInfo.context
            });
          }
        } catch (error) {
          console.warn(`Failed to analyze link ${link}:`, error);
        }
      }
    }
    
    return discoveredLinks;
  }

  /**
   * Analyze a link to determine its relevance and content type
   */
  private async analyzeLink(url: string, context: string): Promise<LinkDiscoveryResult> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      // Basic content type detection based on URL patterns
      let contentType = 'unknown';
      let confidence = 0.5;
      
      // URL pattern analysis
      if (url.includes('/blog/') || url.includes('/post/') || url.includes('/article/')) {
        contentType = 'blog';
        confidence = 0.8;
      } else if (url.includes('/news/') || url.includes('/breaking/') || url.includes('/story/')) {
        contentType = 'news';
        confidence = 0.8;
      } else if (url.includes('/docs/') || url.includes('/documentation/') || url.includes('/guide/')) {
        contentType = 'documentation';
        confidence = 0.9;
      } else if (url.includes('/api/') || url.includes('/reference/')) {
        contentType = 'api';
        confidence = 0.9;
      } else if (url.includes('/tutorial/') || url.includes('/how-to/')) {
        contentType = 'tutorial';
        confidence = 0.8;
      } else if (url.includes('/wiki/') || url.includes('/encyclopedia/')) {
        contentType = 'wiki';
        confidence = 0.7;
      }
      
      // Domain-based confidence adjustment
      const trustedDomains = [
        'github.com', 'stackoverflow.com', 'developer.mozilla.org', 'docs.python.org',
        'nodejs.org', 'reactjs.org', 'vuejs.org', 'angular.io', 'typescriptlang.org',
        'medium.com', 'dev.to', 'hashnode.com', 'freecodecamp.org', 'w3schools.com'
      ];
      
      if (trustedDomains.some(trusted => domain.includes(trusted))) {
        confidence = Math.min(confidence + 0.2, 1.0);
      }
      
      // Context analysis (basic keyword matching)
      const contextLower = context.toLowerCase();
      const relevantKeywords = [
        'tutorial', 'guide', 'documentation', 'api', 'reference', 'example',
        'blog', 'article', 'news', 'update', 'release', 'feature'
      ];
      
      const keywordMatches = relevantKeywords.filter(keyword => 
        contextLower.includes(keyword)
      ).length;
      
      confidence = Math.min(confidence + (keywordMatches * 0.1), 1.0);
      
      return {
        url,
        contentType,
        confidence,
        context: context.substring(0, 200) + '...'
      };
    } catch (error) {
      return {
        url,
        confidence: 0.1,
        context: 'Invalid URL or analysis failed'
      };
    }
  }

  /**
   * Cache a discovered link
   */
  async cacheLink(linkData: {
    url: string;
    title?: string;
    contentType: string;
    discoveredFrom?: string;
    confidence: number;
    context?: string;
  }): Promise<LinkCacheEntry> {
    try {
      const urlObj = new URL(linkData.url);
      const domain = urlObj.hostname;
      
      // Check if link already exists
      const existingLink = await db.linkCache.findUnique({
        where: { url: linkData.url }
      });
      
      if (existingLink) {
        // Update existing link
        const updatedLink = await db.linkCache.update({
          where: { url: linkData.url },
          data: {
            title: linkData.title || existingLink.title,
            contentType: linkData.contentType,
            priority: Math.max(existingLink.priority, Math.floor(linkData.confidence * 10)),
            updatedAt: new Date()
          }
        });
        
        return updatedLink as LinkCacheEntry;
      }
      
      // Detect content type if not provided or is 'unknown'
      const detectedContentType = linkData.contentType === 'unknown' 
        ? this.detectContentType(linkData.url, domain, linkData.title)
        : linkData.contentType;
      
      // Create new link cache entry
      const scrapeInterval = this.getScrapeInterval(detectedContentType);
      const nextScrape = new Date(Date.now() + (scrapeInterval * 1000));
      
      const newLink = await db.linkCache.create({
        data: {
          url: linkData.url,
          title: linkData.title,
          domain,
          contentType: detectedContentType,
          discoveredFrom: linkData.discoveredFrom,
          scrapeInterval,
          nextScrape,
          priority: Math.floor(linkData.confidence * 10),
          metadata: {
            confidence: linkData.confidence,
            context: linkData.context,
            discoveredAt: new Date().toISOString()
          }
        }
      });
      
      return newLink as LinkCacheEntry;
    } catch (error) {
      console.error('Failed to cache link:', error);
      throw error;
    }
  }

  /**
   * Detect content type from URL and domain
   */
  private detectContentType(url: string, domain: string, title?: string): string {
    const urlLower = url.toLowerCase();
    const domainLower = domain.toLowerCase();
    const titleLower = (title || '').toLowerCase();

    // GitHub detection
    if (domainLower.includes('github.com')) {
      if (urlLower.includes('/wiki/')) return 'documentation';
      if (urlLower.includes('/issues/') || urlLower.includes('/pull/')) return 'forum';
      return 'github';
    }

    // Stack Overflow detection
    if (domainLower.includes('stackoverflow.com')) return 'stackoverflow';

    // Documentation sites
    if (domainLower.includes('docs.') || 
        domainLower.includes('documentation') ||
        urlLower.includes('/docs/') ||
        urlLower.includes('/documentation/')) {
      return 'documentation';
    }

    // API documentation
    if (urlLower.includes('/api/') || 
        urlLower.includes('/reference/') ||
        titleLower.includes('api reference') ||
        titleLower.includes('api documentation')) {
      return 'api';
    }

    // Blog detection
    if (domainLower.includes('blog.') || 
        domainLower.includes('medium.com') ||
        domainLower.includes('dev.to') ||
        urlLower.includes('/blog/') ||
        titleLower.includes('blog')) {
      return 'blog';
    }

    // News detection
    if (domainLower.includes('news.') || 
        domainLower.includes('reuters.com') ||
        domainLower.includes('bbc.com') ||
        domainLower.includes('cnn.com') ||
        titleLower.includes('news')) {
      return 'news';
    }

    // Tutorial detection
    if (urlLower.includes('/tutorial/') ||
        urlLower.includes('/guide/') ||
        urlLower.includes('/how-to/') ||
        titleLower.includes('tutorial') ||
        titleLower.includes('guide') ||
        titleLower.includes('how to')) {
      return 'tutorial';
    }

    // Forum detection
    if (domainLower.includes('forum.') ||
        domainLower.includes('discourse.') ||
        urlLower.includes('/forum/') ||
        urlLower.includes('/discussion/') ||
        titleLower.includes('discussion')) {
      return 'forum';
    }

    return 'unknown';
  }

  /**
   * Get scrape interval based on content type
   */
  private getScrapeInterval(contentType: string): number {
    const intervals: Record<string, number> = {
      'news': 3600,        // 1 hour
      'blog': 86400,       // 24 hours
      'documentation': 604800, // 1 week
      'api': 604800,       // 1 week
      'tutorial': 2592000, // 1 month
      'wiki': 2592000,     // 1 month
      'unknown': 86400     // 24 hours default
    };
    
    return intervals[contentType] || intervals['unknown'];
  }

  /**
   * Get links ready for scraping
   */
  async getLinksForScraping(limit: number = 10): Promise<LinkCacheEntry[]> {
    const now = new Date();
    
    const links = await db.linkCache.findMany({
      where: {
        status: 'active',
        OR: [
          { nextScrape: { lte: now } },
          { nextScrape: null }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { nextScrape: 'asc' }
      ],
      take: limit
    });
    
    return links as LinkCacheEntry[];
  }

  /**
   * Schedule scraping for a link
   */
  async scheduleScraping(linkId: string): Promise<string> {
    const link = await db.linkCache.findUnique({
      where: { id: linkId }
    });
    
    if (!link) {
      throw new Error('Link not found');
    }
    
    // Create scraping job
    const job = await db.job.create({
      data: {
        targetUrl: link.url,
        kind: link.contentType
      }
    });
    
    // Add to queue
    await jobQueue.add('scrape', {
      jobId: job.id,
      targetUrl: link.url,
      kind: link.contentType,
      options: {
        extractImages: true,
        extractLinks: true,
        maxWaitTime: 10000,
        linkId: linkId
      }
    });
    
    // Update link status
    await db.linkCache.update({
      where: { id: linkId },
      data: {
        lastScraped: new Date(),
        nextScrape: new Date(Date.now() + (link.scrapeInterval * 1000))
      }
    });
    
    return job.id;
  }

  /**
   * Update link after scraping
   */
  async updateLinkAfterScraping(
    linkId: string, 
    jobId: string, 
    result: any, 
    error?: string
  ): Promise<void> {
    const link = await db.linkCache.findUnique({
      where: { id: linkId }
    });
    
    if (!link) return;
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (error) {
      updateData.errorCount = link.errorCount + 1;
      updateData.lastError = error;
      updateData.status = link.errorCount >= 3 ? 'error' : 'active';
    } else {
      updateData.successCount = link.successCount + 1;
      updateData.lastError = null;
      updateData.status = 'active';
      
      // Update title and description if available
      if (result.title) {
        updateData.title = result.title;
      }
      if (result.metadata?.description) {
        updateData.description = result.metadata.description;
      }
      
      // Discover new links from this content
      if (result.links && result.links.length > 0) {
        await this.discoverAndCacheLinks(link.url, result, {
          maxLinks: 20,
          minConfidence: 0.4
        });
      }
    }
    
    await db.linkCache.update({
      where: { id: linkId },
      data: updateData
    });
    
    // Record the scrape
    await db.linkScrape.create({
      data: {
        linkId,
        jobId,
        status: error ? 'failed' : 'completed',
        result: error ? null : result,
        error,
        scrapedAt: new Date()
      }
    });
  }

  /**
   * Get link cache statistics
   */
  async getCacheStats(): Promise<{
    total: number;
    active: number;
    error: number;
    pending: number;
    byContentType: Record<string, number>;
    byDomain: Record<string, number>;
  }> {
    const [total, active, error, pending, byContentType, byDomain] = await Promise.all([
      db.linkCache.count(),
      db.linkCache.count({ where: { status: 'active' } }),
      db.linkCache.count({ where: { status: 'error' } }),
      db.linkCache.count({ where: { status: 'pending' } }),
      db.linkCache.groupBy({
        by: ['contentType'],
        _count: { contentType: true }
      }),
      db.linkCache.groupBy({
        by: ['domain'],
        _count: { domain: true },
        orderBy: { _count: { domain: 'desc' } },
        take: 10
      })
    ]);
    
    return {
      total,
      active,
      error,
      pending,
      byContentType: byContentType.reduce((acc, item) => {
        acc[item.contentType] = item._count.contentType;
        return acc;
      }, {} as Record<string, number>),
      byDomain: byDomain.reduce((acc, item) => {
        acc[item.domain] = item._count.domain;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Search links in cache
   */
  async searchLinks(query: string, filters: {
    contentType?: string;
    domain?: string;
    status?: string;
    limit?: number;
  } = {}): Promise<LinkCacheEntry[]> {
    const { contentType, domain, status, limit = 20 } = filters;
    
    const where: any = {};
    
    if (contentType) where.contentType = contentType;
    if (domain) where.domain = { contains: domain };
    if (status) where.status = status;
    
    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { url: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }
    
    const links = await db.linkCache.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: limit
    });
    
    return links as LinkCacheEntry[];
  }

  /**
   * Bulk operations
   */
  async bulkUpdateLinks(linkIds: string[], updates: {
    status?: string;
    priority?: number;
    scrapeInterval?: number;
    tags?: string[];
  }): Promise<void> {
    await db.linkCache.updateMany({
      where: { id: { in: linkIds } },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });
  }

  async bulkDeleteLinks(linkIds: string[]): Promise<void> {
    await db.linkCache.deleteMany({
      where: { id: { in: linkIds } }
    });
  }
}
