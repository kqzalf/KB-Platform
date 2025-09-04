import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as cheerio from 'cheerio';

export interface ScrapeResult {
  title: string;
  content: string;
  url: string;
  metadata: Record<string, any>;
  images?: string[];
  links?: string[];
  videoLinks?: string[];
  wordCount: number;
  readingTime: number;
}

export interface ScrapingOptions {
  waitForSelector?: string;
  extractImages?: boolean;
  extractLinks?: boolean;
  maxWaitTime?: number;
  userAgent?: string;
  viewport?: { width: number; height: number };
}

export class WebScraper {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async init() {
    this.browser = await chromium.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
  }

  async scrape(url: string, kind: string, options: ScrapingOptions = {}): Promise<ScrapeResult> {
    if (!this.browser || !this.context) {
      await this.init();
    }

    const page = await this.context!.newPage();
    
    try {
      // Set up page with better error handling
      page.on('pageerror', (error) => {
        console.warn(`Page error on ${url}:`, error.message);
      });

      page.on('requestfailed', (request) => {
        console.warn(`Request failed on ${url}:`, request.url(), request.failure()?.errorText);
      });

      // Navigate with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          console.warn(`Navigation failed, retrying... (${retries} attempts left)`);
          await page.waitForTimeout(2000);
        }
      }

      // Wait for specific selector if provided
      if (options.waitForSelector) {
        try {
          await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
        } catch (error) {
          console.warn(`Selector ${options.waitForSelector} not found, continuing...`);
        }
      }

      // Wait for content to load based on kind
      const waitTime = this.getWaitTimeForKind(kind);
      await page.waitForTimeout(waitTime);

      // Extract content using Playwright's built-in methods
      const [title, content, metadata, images, links, videoLinks] = await Promise.all([
        this.extractTitle(page),
        this.extractContent(page, kind),
        this.extractMetadata(page),
        options.extractImages ? this.extractImages(page) : Promise.resolve([]),
        options.extractLinks ? this.extractLinks(page) : Promise.resolve([]),
        this.extractVideoLinks(page)
      ]);

      const textContent = this.cleanText(content);
      const wordCount = this.countWords(textContent);
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed

      return {
        title,
        content: textContent,
        url,
        metadata: {
          ...metadata,
          kind,
          scrapedAt: new Date().toISOString(),
          wordCount,
          readingTime,
          statusCode: 200
        },
        images,
        links,
        videoLinks,
        wordCount,
        readingTime
      };
    } catch (error) {
      console.error(`Scraping failed for ${url}:`, error);
      throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await page.close();
    }
  }

  private async extractTitle(page: Page): Promise<string> {
    try {
      // Try multiple title extraction methods
      const title = await page.evaluate(() => {
        // Try Open Graph title first
        const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        if (ogTitle) return ogTitle;

        // Try Twitter title
        const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
        if (twitterTitle) return twitterTitle;

        // Try document title
        if (document.title) return document.title;

        // Try first h1
        const h1 = document.querySelector('h1');
        if (h1) return h1.textContent?.trim() || '';

        // Try first h2
        const h2 = document.querySelector('h2');
        if (h2) return h2.textContent?.trim() || '';

        return 'Untitled';
      });

      return title || 'Untitled';
    } catch (error) {
      return 'Untitled';
    }
  }

  private async extractContent(page: Page, kind: string): Promise<string> {
    try {
      const content = await page.evaluate((contentKind) => {
        // Remove unwanted elements
        const unwantedSelectors = [
          'script', 'style', 'nav', 'header', 'footer', 'aside',
          '.advertisement', '.ads', '.sidebar', '.menu', '.navigation',
          '.social-share', '.comments', '.related-posts', '.newsletter',
          '.cookie-banner', '.popup', '.modal', '.overlay', '.banner',
          '.promo', '.sponsor', '.affiliate', '.tracking', '.analytics'
        ];

        unwantedSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });

        // Extract content based on kind with better selectors
        let contentSelectors: string[] = [];
        
        switch (contentKind) {
          case 'blog':
            contentSelectors = [
              'article', '.post', '.entry', '.blog-post', '.article-content',
              'main', '.content', '.post-content', '.entry-content'
            ];
            break;
          case 'news':
            contentSelectors = [
              'article', '.story', '.news-content', '.article-body',
              'main', '.content', '.story-content', '.news-article'
            ];
            break;
          case 'documentation':
            contentSelectors = [
              'main', '.content', '.documentation', '.docs-content',
              'article', '.doc-content', '.guide-content', '.manual'
            ];
            break;
          case 'tutorial':
            contentSelectors = [
              'article', '.tutorial', '.guide', '.how-to', '.lesson',
              'main', '.content', '.tutorial-content', '.guide-content'
            ];
            break;
          default:
            contentSelectors = [
              'main', 'article', '.content', '.main-content',
              '.page-content', '.post-content', 'body'
            ];
        }

        // Try each selector until we find content
        let contentElement: Element | null = null;
        for (const selector of contentSelectors) {
          contentElement = document.querySelector(selector);
          if (contentElement && contentElement.textContent?.trim()) {
            break;
          }
        }

        if (!contentElement) {
          contentElement = document.body;
        }

        // Extract structured content with better formatting
        const extractStructuredContent = (element: Element): string => {
          let content = '';
          
          // Process headings
          const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
          headings.forEach((heading, index) => {
            const level = parseInt(heading.tagName.charAt(1));
            const text = heading.textContent?.trim();
            if (text) {
              content += `${'#'.repeat(level)} ${text}\n\n`;
            }
          });

          // Process paragraphs
          const paragraphs = element.querySelectorAll('p');
          paragraphs.forEach(p => {
            const text = p.textContent?.trim();
            if (text && text.length > 10) { // Filter out very short paragraphs
              content += `${text}\n\n`;
            }
          });

          // Process lists
          const lists = element.querySelectorAll('ul, ol');
          lists.forEach(list => {
            const items = list.querySelectorAll('li');
            items.forEach(item => {
              const text = item.textContent?.trim();
              if (text) {
                content += `- ${text}\n`;
              }
            });
            content += '\n';
          });

          // Process code blocks
          const codeBlocks = element.querySelectorAll('pre, code');
          codeBlocks.forEach(code => {
            const text = code.textContent?.trim();
            if (text) {
              content += `\`\`\`\n${text}\n\`\`\`\n\n`;
            }
          });

          // Process blockquotes
          const quotes = element.querySelectorAll('blockquote');
          quotes.forEach(quote => {
            const text = quote.textContent?.trim();
            if (text) {
              content += `> ${text}\n\n`;
            }
          });

          // If no structured content found, fall back to text content
          if (!content.trim()) {
            content = element.textContent || '';
          }

          return content;
        };

        return extractStructuredContent(contentElement);
      }, kind);

      return content;
    } catch (error) {
      console.warn('Content extraction failed, falling back to body text');
      return await page.textContent('body') || '';
    }
  }

  private async extractMetadata(page: Page): Promise<Record<string, any>> {
    try {
      const metadata = await page.evaluate(() => {
        const meta: Record<string, any> = {};

        // Standard meta tags
        const metaTags = [
          'description', 'keywords', 'author', 'robots',
          'viewport', 'generator', 'theme-color'
        ];

        metaTags.forEach(name => {
          const element = document.querySelector(`meta[name="${name}"]`);
          if (element) {
            meta[name] = element.getAttribute('content') || '';
          }
        });

        // Open Graph tags
        const ogTags = [
          'og:title', 'og:description', 'og:image', 'og:url',
          'og:type', 'og:site_name', 'og:locale'
        ];

        ogTags.forEach(property => {
          const element = document.querySelector(`meta[property="${property}"]`);
          if (element) {
            meta[property.replace('og:', 'og_')] = element.getAttribute('content') || '';
          }
        });

        // Twitter tags
        const twitterTags = [
          'twitter:card', 'twitter:title', 'twitter:description',
          'twitter:image', 'twitter:site', 'twitter:creator'
        ];

        twitterTags.forEach(name => {
          const element = document.querySelector(`meta[name="${name}"]`);
          if (element) {
            meta[name.replace('twitter:', 'twitter_')] = element.getAttribute('content') || '';
          }
        });

        // Article specific
        const articleTags = [
          'article:published_time', 'article:modified_time',
          'article:author', 'article:section', 'article:tag'
        ];

        articleTags.forEach(property => {
          const element = document.querySelector(`meta[property="${property}"]`);
          if (element) {
            meta[property.replace('article:', 'article_')] = element.getAttribute('content') || '';
          }
        });

        // Language
        meta.language = document.documentElement.lang || '';

        return meta;
      });

      return metadata;
    } catch (error) {
      console.warn('Metadata extraction failed');
      return {};
    }
  }

  private async extractImages(page: Page): Promise<string[]> {
    try {
      const images = await page.evaluate(() => {
        const imgElements = document.querySelectorAll('img');
        const imageUrls: string[] = [];

        imgElements.forEach(img => {
          const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
          if (src && !src.startsWith('data:') && !src.includes('pixel') && !src.includes('tracking')) {
            imageUrls.push(src);
          }
        });

        return imageUrls.slice(0, 10); // Limit to 10 images
      });

      return images;
    } catch (error) {
      console.warn('Image extraction failed');
      return [];
    }
  }

  private async extractLinks(page: Page): Promise<string[]> {
    try {
      const links = await page.evaluate(() => {
        const linkElements = document.querySelectorAll('a[href]');
        const linkUrls: string[] = [];

        linkElements.forEach(link => {
          const href = link.getAttribute('href');
          if (href && href.startsWith('http') && !href.includes('javascript:')) {
            linkUrls.push(href);
          }
        });

        return [...new Set(linkUrls)].slice(0, 20); // Limit to 20 unique links
      });

      return links;
    } catch (error) {
      console.warn('Link extraction failed');
      return [];
    }
  }

  private async extractVideoLinks(page: Page): Promise<string[]> {
    try {
      const videoLinks = await page.evaluate(() => {
        const videoUrls: string[] = [];

        // Extract video elements
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          const src = video.getAttribute('src');
          if (src) {
            videoUrls.push(src);
          }
          
          // Check for source elements within video
          const sources = video.querySelectorAll('source');
          sources.forEach(source => {
            const sourceSrc = source.getAttribute('src');
            if (sourceSrc) {
              videoUrls.push(sourceSrc);
            }
          });
        });

        // Extract iframe embeds (YouTube, Vimeo, etc.)
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
          const src = iframe.getAttribute('src');
          if (src && (
            src.includes('youtube.com') || 
            src.includes('youtu.be') || 
            src.includes('vimeo.com') ||
            src.includes('dailymotion.com') ||
            src.includes('twitch.tv') ||
            src.includes('player.vimeo.com')
          )) {
            videoUrls.push(src);
          }
        });

        // Extract links to video platforms
        const links = document.querySelectorAll('a[href]');
        links.forEach(link => {
          const href = link.getAttribute('href');
          if (href && (
            href.includes('youtube.com/watch') ||
            href.includes('youtu.be/') ||
            href.includes('vimeo.com/') ||
            href.includes('dailymotion.com/video') ||
            href.includes('twitch.tv/videos') ||
            href.includes('.mp4') ||
            href.includes('.webm') ||
            href.includes('.mov') ||
            href.includes('.avi')
          )) {
            videoUrls.push(href);
          }
        });

        // Extract video URLs from data attributes
        const elementsWithVideoData = document.querySelectorAll('[data-video], [data-src], [data-video-url]');
        elementsWithVideoData.forEach(element => {
          const videoUrl = element.getAttribute('data-video') || 
                          element.getAttribute('data-src') || 
                          element.getAttribute('data-video-url');
          if (videoUrl && videoUrl.startsWith('http')) {
            videoUrls.push(videoUrl);
          }
        });

        return [...new Set(videoUrls)].slice(0, 10); // Limit to 10 unique video links
      });

      return videoLinks;
    } catch (error) {
      console.warn('Video link extraction failed');
      return [];
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
      .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs
      .replace(/\n /g, '\n') // Remove spaces at start of lines
      .replace(/ \n/g, '\n') // Remove spaces at end of lines
      .trim();
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private getWaitTimeForKind(kind: string): number {
    switch (kind) {
      case 'blog':
        return 3000;
      case 'news':
        return 2000;
      case 'documentation':
        return 4000;
      default:
        return 2000;
    }
  }

  async close() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
