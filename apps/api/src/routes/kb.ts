import { Router } from 'express';
import { db } from '../lib/db.js';
import { generateEmbedding } from '../lib/llm.js';
import { glob } from 'glob';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const router = Router();

// POST /kb/ingest - Ingest vault content (fully recursive)
router.post('/ingest', async (req, res) => {
  try {
    const vaultPath = join(process.cwd(), 'vault/KnowledgeBase');
    
    // Use recursive glob pattern to get ALL .md files in ALL subdirectories
    const files = await glob('**/*.md', { 
      cwd: vaultPath,
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
    });
    
    console.log(`Found ${files.length} markdown files to process`);
    
    let ingested = 0;
    let errors = 0;
    let skipped = 0;
    let emptyFiles = 0;
    let shortFiles = 0;
    
    // Process all files (no limit)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const filePath = join(vaultPath, file);
        
        // Check if it's actually a file, not a directory
        const stats = statSync(filePath);
        if (!stats.isFile()) {
          skipped++;
          continue;
        }
        
        const content = readFileSync(filePath, 'utf-8');
        
        // Skip empty files
        if (content.trim().length === 0) {
          emptyFiles++;
          continue;
        }
        
        const { data: frontmatter, content: markdown } = matter(content);
        
        const title = typeof frontmatter.title === 'string' ? frontmatter.title : file.replace('.md', '');
        const fullContent = `${title}\n\n${markdown}`;
        
        // Skip if content is too short (less than 50 characters)
        if (fullContent.length < 50) {
          shortFiles++;
          continue;
        }
        
        // Generate embedding
        const embedding = await generateEmbedding(fullContent);
        
        // Store in database
        await db.knowledgeItem.upsert({
          where: { id: file }, // Use file path as unique identifier
          update: {
            title,
            content: fullContent,
            source: file,
            embeddings: embedding,
            metadata: frontmatter,
          },
          create: {
            id: file, // Use file path as unique identifier
            title,
            content: fullContent,
            source: file,
            embeddings: embedding,
            metadata: frontmatter,
          },
        });
        
        ingested++;
        
        // Log progress every 10 files
        if (ingested % 10 === 0) {
          console.log(`Processed ${ingested}/${files.length} files (${Math.round((ingested/files.length) * 100)}%)`);
        }
        
      } catch (fileError) {
        console.error(`Error processing file ${file}:`, fileError);
        errors++;
      }
    }
    
    console.log(`Ingestion complete: ${ingested} ingested, ${errors} errors, ${emptyFiles} empty, ${shortFiles} short, ${files.length} total`);
    
    res.json({ 
      message: `Successfully ingested ${ingested} files (${errors} errors, ${emptyFiles} empty, ${shortFiles} short, ${files.length} total files found)`,
      count: ingested,
      errors,
      emptyFiles,
      shortFiles,
      total: files.length
    });
  } catch (error) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: 'Failed to ingest knowledge base', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// GET /kb/search - Enhanced predictive search with advanced filtering
router.get('/search', async (req, res) => {
  try {
    const { 
      q, 
      limit = '10', 
      page = '1',
      fuzzy = 'true',
      matchType = 'all', // 'all', 'semantic', 'fuzzy', 'exact'
      contentType = 'all', // 'all', 'title', 'content', 'source'
      minSimilarity = '0.1',
      sortBy = 'relevance', // 'relevance', 'date', 'title', 'similarity'
      dateFrom,
      dateTo,
      fileType = 'all', // 'all', 'md', 'txt', 'pdf'
      minSize,
      maxSize
    } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter required' });
    }
    
    const searchLimit = parseInt(limit as string) || 10;
    const currentPage = parseInt(page as string) || 1;
    const useFuzzy = fuzzy === 'true';
    const minSim = parseFloat(minSimilarity as string) || 0.1;
    const offset = (currentPage - 1) * searchLimit;
    
    // Generate embedding for semantic search
    const queryEmbedding = await generateEmbedding(q);
    
    // Get all items for search
    const items = await db.knowledgeItem.findMany();
    
    // Enhanced search with different match types
    const queryLower = q.toLowerCase();
    const queryWords = q.toLowerCase().split(/\s+/);
    
    // Semantic similarity search
    const semanticResults = items
      .filter(item => item.embeddings && Array.isArray(item.embeddings))
      .map(item => ({
        ...item,
        similarity: cosineSimilarity(queryEmbedding, item.embeddings as number[]),
        searchType: 'semantic' as const,
        matchDetails: {
          title: 0,
          content: 0,
          source: 0,
        }
      }))
      .filter(item => item.similarity > minSim);
    
    // Exact match search
    const exactResults = items
      .map(item => {
        const titleExact = item.title.toLowerCase().includes(queryLower) ? 1.0 : 0;
        const contentExact = item.content.toLowerCase().includes(queryLower) ? 0.8 : 0;
        const sourceExact = item.source.toLowerCase().includes(queryLower) ? 0.6 : 0;
        
        const maxScore = Math.max(titleExact, contentExact, sourceExact);
        
        return {
          ...item,
          similarity: maxScore,
          searchType: 'exact' as const,
          matchDetails: {
            title: titleExact,
            content: contentExact,
            source: sourceExact,
          }
        };
      })
      .filter(item => item.similarity > 0.5);
    
    // Text-based fuzzy search for additional results
    let fuzzyResults: any[] = [];
    if (useFuzzy) {
      fuzzyResults = items
        .map(item => {
          const titleMatch = fuzzyMatch(item.title, queryLower);
          const contentMatch = fuzzyMatch(item.content, queryLower);
          const sourceMatch = fuzzyMatch(item.source, queryLower);
          
          const maxScore = Math.max(titleMatch, contentMatch, sourceMatch);
          
          return {
            ...item,
            similarity: maxScore,
            searchType: 'fuzzy' as const,
            matchDetails: {
              title: titleMatch,
              content: contentMatch,
              source: sourceMatch,
            }
          };
        })
        .filter(item => item.similarity > 0.3)
        .sort((a, b) => b.similarity - a.similarity);
    }
    
    // Combine and deduplicate results
    const combinedResults = [...semanticResults, ...exactResults, ...fuzzyResults];
    const uniqueResults = combinedResults.reduce((acc: any[], current: any) => {
      const existing = acc.find((item: any) => item.id === current.id);
      if (!existing) {
        acc.push(current);
      } else if (current.similarity > existing.similarity) {
        const index = acc.findIndex((item: any) => item.id === current.id);
        acc[index] = current;
      }
      return acc;
    }, [] as any[]);
    
    // Apply match type filtering
    let filteredResults = uniqueResults;
    if (matchType !== 'all') {
      filteredResults = uniqueResults.filter((item: any) => item.searchType === matchType);
    }
    
    // Apply content type filtering
    if (contentType !== 'all') {
      filteredResults = filteredResults.filter((item: any) => {
        const matchDetails = item.matchDetails;
        switch (contentType) {
          case 'title':
            return matchDetails.title > 0;
          case 'content':
            return matchDetails.content > 0;
          case 'source':
            return matchDetails.source > 0;
          default:
            return true;
        }
      });
    }
    
    // Apply date range filtering
    if (dateFrom || dateTo) {
      filteredResults = filteredResults.filter((item: any) => {
        const itemDate = new Date(item.createdAt);
        if (dateFrom && itemDate < new Date(dateFrom as string)) return false;
        if (dateTo && itemDate > new Date(dateTo as string)) return false;
        return true;
      });
    }
    
    // Apply file type filtering
    if (fileType !== 'all') {
      filteredResults = filteredResults.filter((item: any) => {
        const extension = item.source.split('.').pop()?.toLowerCase();
        return extension === fileType;
      });
    }
    
    // Apply size filtering
    if (minSize || maxSize) {
      filteredResults = filteredResults.filter((item: any) => {
        const contentLength = item.content.length;
        if (minSize && contentLength < parseInt(minSize as string)) return false;
        if (maxSize && contentLength > parseInt(maxSize as string)) return false;
        return true;
      });
    }
    
    // Apply sorting
    let sortedResults = filteredResults;
    switch (sortBy) {
      case 'date':
        sortedResults = filteredResults.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'title':
        sortedResults = filteredResults.sort((a: any, b: any) => 
          a.title.localeCompare(b.title)
        );
        break;
      case 'similarity':
        sortedResults = filteredResults.sort((a: any, b: any) => 
          b.similarity - a.similarity
        );
        break;
      default: // 'relevance'
        sortedResults = filteredResults.sort((a: any, b: any) => {
          // Prioritize exact matches, then semantic, then fuzzy
          const typePriority: { [key: string]: number } = { exact: 3, semantic: 2, fuzzy: 1 };
          const aPriority = typePriority[a.searchType] || 0;
          const bPriority = typePriority[b.searchType] || 0;
          
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          return b.similarity - a.similarity;
        });
    }
    
    // Apply pagination
    const totalResults = sortedResults.length;
    const totalPages = Math.ceil(totalResults / searchLimit);
    const finalResults = sortedResults.slice(offset, offset + searchLimit);
    
    // Add search metadata
    const searchMetadata = {
      query: q,
      totalResults: uniqueResults.length,
      filteredResults: filteredResults.length,
      paginatedResults: finalResults.length,
      semanticResults: semanticResults.length,
      exactResults: exactResults.length,
      fuzzyResults: fuzzyResults.length,
      pagination: {
        currentPage,
        totalPages,
        limit: searchLimit,
        offset,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1
      },
      searchTime: new Date().toISOString(),
      filters: {
        matchType,
        contentType,
        minSimilarity: minSim,
        sortBy,
        dateFrom,
        dateTo,
        fileType,
        minSize,
        maxSize
      }
    };
    
    res.json({
      results: finalResults,
      metadata: searchMetadata,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

// GET /kb/autocomplete - Get search suggestions and autocomplete
router.get('/autocomplete', async (req, res) => {
  try {
    const { q, limit = '5' } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const suggestionLimit = parseInt(limit as string) || 5;
    const queryLower = q.toLowerCase();
    
    // Get all items for suggestion generation
    const items = await db.knowledgeItem.findMany();
    
    // Generate suggestions from titles and content
    const suggestions = new Set<string>();
    
    items.forEach(item => {
      // Add title suggestions
      if (item.title.toLowerCase().includes(queryLower)) {
        suggestions.add(item.title);
      }
      
      // Add content-based suggestions (extract relevant phrases)
      const contentWords = item.content.toLowerCase().split(/\s+/);
      const queryWords = queryLower.split(/\s+/);
      
      // Find phrases that contain the query
      for (let i = 0; i < contentWords.length - queryWords.length + 1; i++) {
        const phrase = contentWords.slice(i, i + queryWords.length).join(' ');
        if (phrase.includes(queryLower)) {
          // Extract a meaningful phrase around the match
          const start = Math.max(0, i - 2);
          const end = Math.min(contentWords.length, i + queryWords.length + 2);
          const suggestion = contentWords.slice(start, end).join(' ');
          if (suggestion.length > q.length && suggestion.length < 100) {
            suggestions.add(suggestion);
          }
        }
      }
    });
    
    // Convert to array, sort by relevance, and limit
    const sortedSuggestions = Array.from(suggestions)
      .sort((a, b) => {
        // Prioritize suggestions that start with the query
        const aStartsWith = a.toLowerCase().startsWith(queryLower);
        const bStartsWith = b.toLowerCase().startsWith(queryLower);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // Then sort by length (shorter is better for autocomplete)
        return a.length - b.length;
      })
      .slice(0, suggestionLimit);
    
    res.json({
      suggestions: sortedSuggestions,
      query: q,
      count: sortedSuggestions.length,
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to get autocomplete suggestions' });
  }
});

// GET /kb/suggestions - Get popular search terms and trending topics
router.get('/suggestions', async (req, res) => {
  try {
    const { type = 'popular', limit = '10' } = req.query;
    const suggestionLimit = parseInt(limit as string) || 10;
    
    const items = await db.knowledgeItem.findMany();
    
    if (type === 'popular') {
      // Generate popular terms from titles and content
      const termCounts = new Map<string, number>();
      
      items.forEach(item => {
        // Extract meaningful terms from titles
        const titleTerms = extractTerms(item.title);
        titleTerms.forEach(term => {
          termCounts.set(term, (termCounts.get(term) || 0) + 1);
        });
        
        // Extract terms from content (less weight)
        const contentTerms = extractTerms(item.content);
        contentTerms.forEach(term => {
          termCounts.set(term, (termCounts.get(term) || 0) + 0.5);
        });
      });
      
      // Sort by frequency and return top terms
      const popularTerms = Array.from(termCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, suggestionLimit)
        .map(([term, count]) => ({ term, count }));
      
      res.json({
        type: 'popular',
        suggestions: popularTerms,
        count: popularTerms.length,
      });
    } else if (type === 'recent') {
      // Get recent items as suggestions
      const recentItems = items
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, suggestionLimit)
        .map(item => ({
          title: item.title,
          source: item.source,
          createdAt: item.createdAt,
        }));
      
      res.json({
        type: 'recent',
        suggestions: recentItems,
        count: recentItems.length,
      });
    } else {
      res.status(400).json({ error: 'Invalid suggestion type. Use "popular" or "recent"' });
    }
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// GET /kb/items - List all knowledge items
router.get('/items', async (req, res) => {
  try {
    const items = await db.knowledgeItem.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch knowledge items' });
  }
});

// Helper function for fuzzy string matching
function fuzzyMatch(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match gets highest score
  if (textLower === queryLower) return 1.0;
  
  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 0.9;
  
  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 0.7;
  
  // Fuzzy matching using Levenshtein distance
  const distance = levenshteinDistance(textLower, queryLower);
  const maxLength = Math.max(textLower.length, queryLower.length);
  
  if (maxLength === 0) return 0;
  
  const similarity = 1 - (distance / maxLength);
  return similarity > 0.3 ? similarity : 0;
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Extract meaningful terms from text
function extractTerms(text: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || !Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// GET /kb/filter-presets - Get available filter presets
router.get('/filter-presets', async (req, res) => {
  try {
    const presets = [
      {
        id: 'recent-docs',
        name: 'Recent Documents',
        description: 'Documents created in the last 30 days',
        filters: {
          dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sortBy: 'date'
        },
        icon: '📅'
      },
      {
        id: 'exact-matches',
        name: 'Exact Matches Only',
        description: 'Find precise string matches',
        filters: {
          matchType: 'exact',
          minSimilarity: 0.8
        },
        icon: '🎯'
      },
      {
        id: 'semantic-search',
        name: 'Semantic Search',
        description: 'Meaning-based search using AI',
        filters: {
          matchType: 'semantic',
          minSimilarity: 0.3
        },
        icon: '🧠'
      },
      {
        id: 'title-only',
        name: 'Title Matches',
        description: 'Search only in document titles',
        filters: {
          contentType: 'title',
          matchType: 'all'
        },
        icon: '📄'
      },
      {
        id: 'large-docs',
        name: 'Large Documents',
        description: 'Documents with 1000+ characters',
        filters: {
          minSize: '1000',
          sortBy: 'similarity'
        },
        icon: '📚'
      },
      {
        id: 'markdown-files',
        name: 'Markdown Files',
        description: 'Only .md files',
        filters: {
          fileType: 'md',
          sortBy: 'relevance'
        },
        icon: '📝'
      }
    ];
    
    res.json({ presets });
  } catch (error) {
    console.error('Filter presets error:', error);
    res.status(500).json({ error: 'Failed to get filter presets' });
  }
});

export { router as kbRouter };
