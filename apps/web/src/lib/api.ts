const API_BASE = 'http://localhost:4000'

export interface Job {
  id: string
  targetUrl: string
  kind: string
  status: string
  result?: ScrapeResult
  error?: string
  metadata?: string
  createdAt: string
  updatedAt: string
}

export interface ScrapeResult {
  title: string
  content: string
  url: string
  metadata: Record<string, any>
  images?: string[]
  links?: string[]
  wordCount: number
  readingTime: number
}

export interface ScrapingPreset {
  id: string
  name: string
  description: string
  kind: string
  options: {
    extractImages?: boolean
    extractLinks?: boolean
    waitForSelector?: string
    maxWaitTime?: number
  }
  icon: string
}

export interface ScrapingPresetsResponse {
  presets: ScrapingPreset[]
}

export interface LinkCacheEntry {
  id: string
  url: string
  title?: string
  description?: string
  domain: string
  contentType: string
  status: string
  lastScraped?: string
  nextScrape?: string
  scrapeInterval: number
  priority: number
  successCount: number
  errorCount: number
  lastError?: string
  metadata?: any
  tags: string[]
  discoveredFrom?: string
  createdAt: string
  updatedAt: string
  scrapes?: LinkScrape[]
  discoveredLinks?: LinkCacheEntry[]
}

export interface LinkScrape {
  id: string
  linkId: string
  jobId?: string
  status: string
  result?: any
  error?: string
  scrapedAt: string
  duration?: number
}

export interface LinkCacheStats {
  total: number
  active: number
  error: number
  pending: number
  byContentType: Record<string, number>
  byDomain: Record<string, number>
}

export interface LinkSearchResponse {
  links: LinkCacheEntry[]
}

export interface LinkPaginationResponse {
  links: LinkCacheEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface KnowledgeItem {
  id: string
  title: string
  content: string
  source: string
  metadata?: any
  createdAt: string
  updatedAt: string
  similarity?: number
  searchType?: 'semantic' | 'fuzzy' | 'exact'
  matchDetails?: {
    title: number
    content: number
    source: number
  }
}

export interface ChatSession {
  id: string
  messages: any[]
  createdAt: string
  updatedAt: string
}

export interface AIResponse {
  answer: string
  sources: Array<{
    title: string
    source: string
    similarity: number
  }>
}

export interface SearchResponse {
  results: KnowledgeItem[]
  metadata: {
    query: string
    totalResults: number
    filteredResults: number
    paginatedResults: number
    semanticResults: number
    exactResults: number
    fuzzyResults: number
    pagination: {
      currentPage: number
      totalPages: number
      limit: number
      offset: number
      hasNext: boolean
      hasPrev: boolean
    }
    searchTime: string
    filters: {
      matchType: string
      contentType: string
      minSimilarity: number
      sortBy: string
      dateFrom?: string
      dateTo?: string
      fileType: string
      minSize?: string
      maxSize?: string
    }
  }
}

export interface FilterPreset {
  id: string
  name: string
  description: string
  filters: {
    matchType?: string
    contentType?: string
    minSimilarity?: number
    sortBy?: string
    dateFrom?: string
    dateTo?: string
    fileType?: string
    minSize?: string
    maxSize?: string
  }
  icon: string
}

export interface FilterPresetsResponse {
  presets: FilterPreset[]
}

export interface AutocompleteResponse {
  suggestions: string[]
  query: string
  count: number
}

export interface SuggestionsResponse {
  type: 'popular' | 'recent'
  suggestions: Array<{
    term?: string
    count?: number
    title?: string
    source?: string
    createdAt?: string
  }>
  count: number
}

// Jobs API
export const jobsApi = {
  async list(): Promise<Job[]> {
    const response = await fetch(`${API_BASE}/jobs`)
    return response.json()
  },

  async create(data: { 
    targetUrl: string
    kind: string
    options?: {
      extractImages?: boolean
      extractLinks?: boolean
      waitForSelector?: string
      maxWaitTime?: number
    }
  }): Promise<Job> {
    const response = await fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async get(id: string): Promise<Job> {
    const response = await fetch(`${API_BASE}/jobs/${id}`)
    return response.json()
  },

  async getPresets(): Promise<ScrapingPresetsResponse> {
    const response = await fetch(`${API_BASE}/jobs/presets`)
    return response.json()
  },
}

// Knowledge Base API
export const kbApi = {
  async ingest(): Promise<{ message: string; count: number }> {
    const response = await fetch(`${API_BASE}/kb/ingest`, {
      method: 'POST',
    })
    return response.json()
  },

  async search(query: string, options?: { 
    limit?: number
    page?: number
    fuzzy?: boolean
    matchType?: 'all' | 'semantic' | 'fuzzy' | 'exact'
    contentType?: 'all' | 'title' | 'content' | 'source'
    minSimilarity?: number
    sortBy?: 'relevance' | 'date' | 'title' | 'similarity'
    dateFrom?: string
    dateTo?: string
    fileType?: 'all' | 'md' | 'txt' | 'pdf'
    minSize?: string
    maxSize?: string
  }): Promise<SearchResponse> {
    const params = new URLSearchParams({
      q: query,
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.page && { page: options.page.toString() }),
      ...(options?.fuzzy !== undefined && { fuzzy: options.fuzzy.toString() }),
      ...(options?.matchType && { matchType: options.matchType }),
      ...(options?.contentType && { contentType: options.contentType }),
      ...(options?.minSimilarity && { minSimilarity: options.minSimilarity.toString() }),
      ...(options?.sortBy && { sortBy: options.sortBy }),
      ...(options?.dateFrom && { dateFrom: options.dateFrom }),
      ...(options?.dateTo && { dateTo: options.dateTo }),
      ...(options?.fileType && { fileType: options.fileType }),
      ...(options?.minSize && { minSize: options.minSize }),
      ...(options?.maxSize && { maxSize: options.maxSize }),
    })
    const response = await fetch(`${API_BASE}/kb/search?${params}`)
    return response.json()
  },

  async autocomplete(query: string, limit?: number): Promise<AutocompleteResponse> {
    const params = new URLSearchParams({
      q: query,
      ...(limit && { limit: limit.toString() }),
    })
    const response = await fetch(`${API_BASE}/kb/autocomplete?${params}`)
    return response.json()
  },

  async suggestions(type: 'popular' | 'recent' = 'popular', limit?: number): Promise<SuggestionsResponse> {
    const params = new URLSearchParams({
      type,
      ...(limit && { limit: limit.toString() }),
    })
    const response = await fetch(`${API_BASE}/kb/suggestions?${params}`)
    return response.json()
  },

  async list(): Promise<KnowledgeItem[]> {
    const response = await fetch(`${API_BASE}/kb/items`)
    return response.json()
  },

  async getFilterPresets(): Promise<FilterPresetsResponse> {
    const response = await fetch(`${API_BASE}/kb/filter-presets`)
    return response.json()
  },
}

// AI API
export const aiApi = {
  async ask(question: string, sessionId?: string): Promise<AIResponse> {
    const response = await fetch(`${API_BASE}/ai/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, sessionId }),
    })
    return response.json()
  },

  async createSession(): Promise<ChatSession> {
    const response = await fetch(`${API_BASE}/ai/sessions`, {
      method: 'POST',
    })
    return response.json()
  },

  async getSession(id: string): Promise<ChatSession> {
    const response = await fetch(`${API_BASE}/ai/sessions/${id}`)
    return response.json()
  },
}

// Link Management API
export const linksApi = {
  async list(options?: {
    page?: number
    limit?: number
    status?: string
    contentType?: string
    domain?: string
  }): Promise<LinkPaginationResponse> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', options.page.toString())
    if (options?.limit) params.set('limit', options.limit.toString())
    if (options?.status) params.set('status', options.status)
    if (options?.contentType) params.set('contentType', options.contentType)
    if (options?.domain) params.set('domain', options.domain)
    
    const response = await fetch(`${API_BASE}/links?${params}`)
    return response.json()
  },

  async getStats(): Promise<LinkCacheStats> {
    const response = await fetch(`${API_BASE}/links/stats`)
    return response.json()
  },

  async search(query: string, filters?: {
    contentType?: string
    domain?: string
    status?: string
    limit?: number
  }): Promise<LinkSearchResponse> {
    const params = new URLSearchParams({ query })
    if (filters?.contentType) params.set('contentType', filters.contentType)
    if (filters?.domain) params.set('domain', filters.domain)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.limit) params.set('limit', filters.limit.toString())
    
    const response = await fetch(`${API_BASE}/links/search?${params}`)
    return response.json()
  },

  async getReady(limit?: number): Promise<LinkSearchResponse> {
    const params = new URLSearchParams()
    if (limit) params.set('limit', limit.toString())
    
    const response = await fetch(`${API_BASE}/links/ready?${params}`)
    return response.json()
  },

  async create(linkData: {
    url: string
    title?: string
    contentType?: string
    priority?: number
    scrapeInterval?: number
    tags?: string[]
  }): Promise<LinkCacheEntry> {
    const response = await fetch(`${API_BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkData),
    })
    return response.json()
  },

  async get(id: string): Promise<LinkCacheEntry> {
    const response = await fetch(`${API_BASE}/links/${id}`)
    return response.json()
  },

  async update(id: string, updates: {
    title?: string
    contentType?: string
    status?: string
    priority?: number
    scrapeInterval?: number
    tags?: string[]
  }): Promise<LinkCacheEntry> {
    const response = await fetch(`${API_BASE}/links/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    return response.json()
  },

  async delete(id: string): Promise<void> {
    await fetch(`${API_BASE}/links/${id}`, {
      method: 'DELETE',
    })
  },

  async scheduleScraping(id: string): Promise<{ jobId: string; message: string }> {
    const response = await fetch(`${API_BASE}/links/${id}/scrape`, {
      method: 'POST',
    })
    return response.json()
  },

  async bulkOperation(action: 'update' | 'delete' | 'scrape', linkIds: string[], updates?: any): Promise<{ message: string; jobIds?: string[] }> {
    const response = await fetch(`${API_BASE}/links/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, linkIds, updates }),
    })
    return response.json()
  },

  async discoverLinks(sourceUrl: string, content: any, options?: {
    maxLinks?: number
    minConfidence?: number
    contentType?: string
  }): Promise<{ discoveredLinks: any[]; count: number }> {
    const response = await fetch(`${API_BASE}/links/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceUrl, content, options }),
    })
    return response.json()
  },

  async getScrapes(id: string, options?: {
    page?: number
    limit?: number
  }): Promise<{ scrapes: LinkScrape[]; pagination: any }> {
    const params = new URLSearchParams()
    if (options?.page) params.set('page', options.page.toString())
    if (options?.limit) params.set('limit', options.limit.toString())
    
    const response = await fetch(`${API_BASE}/links/${id}/scrapes?${params}`)
    return response.json()
  },

  async ingestLink(id: string): Promise<{ message: string; knowledgeItem: any }> {
    const response = await fetch(`${API_BASE}/links/${id}/ingest`, {
      method: 'POST',
    })
    return response.json()
  },

    async bulkIngest(linkIds: string[], minPriority?: number): Promise<{
    message: string;
    ingestedItems: any[];
    errors: any[]
  }> {
    const response = await fetch(`${API_BASE}/links/bulk-ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkIds, minPriority }),
    })
    return response.json()
  },
}

// Vault Management API
export const vaultApi = {
  async ingestKnowledgeItem(knowledgeItemId: string): Promise<{
    message: string;
    vaultPath: string;
    knowledgeItemId: string;
  }> {
    const response = await fetch(`${API_BASE}/vault/ingest/${knowledgeItemId}`, {
      method: 'POST',
    })
    return response.json()
  },

  async ingestLink(linkId: string): Promise<{
    message: string;
    vaultPath: string;
    knowledgeItem: any;
  }> {
    const response = await fetch(`${API_BASE}/vault/ingest-link/${linkId}`, {
      method: 'POST',
    })
    return response.json()
  },

  async bulkIngestKnowledgeItems(knowledgeItemIds: string[]): Promise<{
    message: string;
    results: any[];
    errors: any[];
  }> {
    const response = await fetch(`${API_BASE}/vault/bulk-ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ knowledgeItemIds }),
    })
    return response.json()
  },

  async bulkIngestLinks(linkIds: string[], minPriority?: number): Promise<{
    message: string;
    results: any[];
    errors: any[];
  }> {
    const response = await fetch(`${API_BASE}/vault/bulk-ingest-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkIds, minPriority }),
    })
    return response.json()
  },

  async getStats(): Promise<{
    totalFiles: number;
    categories: Record<string, number>;
    recentAdditions: Array<{ title: string; path: string; date: string }>;
  }> {
    const response = await fetch(`${API_BASE}/vault/stats`)
    return response.json()
  },

  async getCategories(): Promise<{
    categories: Array<{
      id: string;
      name: string;
      path: string;
      description: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE}/vault/categories`)
    return response.json()
  },
}

// Reset Management API
export const resetApi = {
  async resetSystem(options?: {
    clearKnowledgeItems?: boolean;
    clearLinks?: boolean;
    clearJobs?: boolean;
    clearVault?: boolean;
    reinitializeVault?: boolean;
    preserveOriginalVault?: boolean;
  }): Promise<{
    message: string;
    cleared: {
      knowledgeItems: number;
      links: number;
      jobs: number;
      vaultFiles: number;
    };
    timestamp: string;
  }> {
    const response = await fetch(`${API_BASE}/reset/system`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    })
    return response.json()
  },

  async resetDatabase(): Promise<{
    message: string;
    cleared: {
      knowledgeItems: number;
      links: number;
      jobs: number;
      vaultFiles: number;
    };
    timestamp: string;
  }> {
    const response = await fetch(`${API_BASE}/reset/database`, {
      method: 'POST',
    })
    return response.json()
  },

  async resetVault(): Promise<{
    message: string;
    cleared: {
      knowledgeItems: number;
      links: number;
      jobs: number;
      vaultFiles: number;
    };
    timestamp: string;
  }> {
    const response = await fetch(`${API_BASE}/reset/vault`, {
      method: 'POST',
    })
    return response.json()
  },

  async resetVaultComplete(): Promise<{
    message: string;
    cleared: {
      knowledgeItems: number;
      links: number;
      jobs: number;
      vaultFiles: number;
    };
    timestamp: string;
  }> {
    const response = await fetch(`${API_BASE}/reset/vault-complete`, {
      method: 'POST',
    })
    return response.json()
  },

  async getStats(): Promise<{
    knowledgeItems: number;
    links: number;
    jobs: number;
    vaultFiles: number;
    timestamp: string;
  }> {
    const response = await fetch(`${API_BASE}/reset/stats`)
    return response.json()
  },

  async getStatus(): Promise<{
    system: {
      knowledgeItems: number;
      links: number;
      jobs: number;
      vaultFiles: number;
      totalItems: number;
    };
    resetOptions: {
      system: {
        description: string;
        endpoint: string;
        clears: string[];
      };
      database: {
        description: string;
        endpoint: string;
        clears: string[];
      };
      vault: {
        description: string;
        endpoint: string;
        clears: string[];
      };
    };
    timestamp: string;
  }> {
    const response = await fetch(`${API_BASE}/reset/status`)
    return response.json()
  },
}
