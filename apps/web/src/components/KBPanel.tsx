import { useState, useEffect, useRef } from 'react'
import { Search, Upload, MessageSquare, Loader2, TrendingUp, Filter, History, Star, X, Sparkles, ChevronLeft, ChevronRight, Bookmark, Calendar, FileText, Hash, Settings } from 'lucide-react'
import { kbApi, aiApi, KnowledgeItem, AIResponse, SearchResponse, SuggestionsResponse } from '../lib/api'
import { MarkdownViewer } from './MarkdownViewer'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'

export function KBPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<KnowledgeItem[]>([])
  const [searchMetadata, setSearchMetadata] = useState<SearchResponse['metadata'] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<AIResponse['sources']>([])
  const [isAsking, setIsAsking] = useState(false)
  const [isIngesting, setIsIngesting] = useState(false)
  
  // Predictive search state
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([])
  const [popularSuggestions, setPopularSuggestions] = useState<SuggestionsResponse['suggestions']>([])
  const [recentSuggestions, setRecentSuggestions] = useState<SuggestionsResponse['suggestions']>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  
  // Enhanced UX state
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [savedSearches, setSavedSearches] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title' | 'similarity'>('relevance')
  const [matchType, setMatchType] = useState<'all' | 'semantic' | 'fuzzy' | 'exact'>('all')
  const [contentType, setContentType] = useState<'all' | 'title' | 'content' | 'source'>('all')
  const [minSimilarity, setMinSimilarity] = useState(0.1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [fileType, setFileType] = useState<'all' | 'md' | 'txt' | 'pdf'>('all')
  const [minSize, setMinSize] = useState('')
  const [maxSize, setMaxSize] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [resultsPerPage, setResultsPerPage] = useState(10)
  const [filterPresets, setFilterPresets] = useState<any[]>([])
  const [savedFilterPresets, setSavedFilterPresets] = useState<any[]>([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [showSearchTips, setShowSearchTips] = useState(false)
  const [isHoveringSearch, setIsHoveringSearch] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  
  // Markdown viewer state
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerContent, setViewerContent] = useState<{
    content: string
    title: string
    source: string
  } | null>(null)
  
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimeoutRef = useRef<number>()

  // Load popular and recent suggestions on component mount
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const [popular, recent] = await Promise.all([
          kbApi.suggestions('popular', 8),
          kbApi.suggestions('recent', 5)
        ])
        setPopularSuggestions(popular.suggestions)
        setRecentSuggestions(recent.suggestions)
      } catch (error) {
        console.error('Failed to load suggestions:', error)
      }
    }
    loadSuggestions()
    
    // Load search history, saved searches, and filter presets from localStorage
    const savedHistory = localStorage.getItem('kb-search-history')
    const savedSearches = localStorage.getItem('kb-saved-searches')
    const savedFilterPresets = localStorage.getItem('kb-saved-filter-presets')
    if (savedHistory) setSearchHistory(JSON.parse(savedHistory))
    if (savedSearches) setSavedSearches(JSON.parse(savedSearches))
    if (savedFilterPresets) setSavedFilterPresets(JSON.parse(savedFilterPresets))
    
    // Load filter presets from API
    kbApi.getFilterPresets().then(response => {
      setFilterPresets(response.presets)
    }).catch(error => {
      console.error('Failed to load filter presets:', error)
    })
  }, [])

  // Debounced autocomplete - only when hovering or focused
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if ((isHoveringSearch || isSearchFocused) && searchQuery.length >= 2) {
      debounceTimeoutRef.current = window.setTimeout(async () => {
        try {
          const response = await kbApi.autocomplete(searchQuery, 5)
          setAutocompleteSuggestions(response.suggestions)
          setShowSuggestions(true)
        } catch (error) {
          console.error('Autocomplete failed:', error)
        }
      }, 300)
    } else if (isHoveringSearch || isSearchFocused) {
      // Show suggestions even without query when hovering/focused
      setShowSuggestions(true)
    } else {
      setAutocompleteSuggestions([])
      setShowSuggestions(false)
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [searchQuery, isHoveringSearch, isSearchFocused])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    setShowSuggestions(false)
    
    // Add to search history
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10)
    setSearchHistory(newHistory)
    localStorage.setItem('kb-search-history', JSON.stringify(newHistory))
    
    try {
      const response = await kbApi.search(searchQuery, { 
        limit: resultsPerPage,
        page: currentPage,
        fuzzy: true,
        matchType,
        contentType,
        minSimilarity,
        sortBy,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        fileType,
        minSize: minSize || undefined,
        maxSize: maxSize || undefined
      })
      
      setSearchResults(response.results)
      setSearchMetadata(response.metadata)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    handleSearch()
  }

  const handleSaveSearch = (query: string) => {
    if (!savedSearches.includes(query)) {
      const newSaved = [...savedSearches, query].slice(0, 10)
      setSavedSearches(newSaved)
      localStorage.setItem('kb-saved-searches', JSON.stringify(newSaved))
    }
  }

  const handleRemoveSavedSearch = (query: string) => {
    const newSaved = savedSearches.filter(s => s !== query)
    setSavedSearches(newSaved)
    localStorage.setItem('kb-saved-searches', JSON.stringify(newSaved))
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setSearchMetadata(null)
    setShowSuggestions(false)
    if (searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query)
    setShowSuggestions(false)
    handleSearch()
  }

  const handleViewContent = (item: KnowledgeItem) => {
    setViewerContent({
      content: item.content,
      title: item.title,
      source: item.source
    })
    setViewerOpen(true)
  }

  const handleCloseViewer = () => {
    setViewerOpen(false)
    setViewerContent(null)
  }

  // Filter preset functions
  const handleApplyPreset = (preset: any) => {
    const filters = preset.filters
    if (filters.matchType) setMatchType(filters.matchType)
    if (filters.contentType) setContentType(filters.contentType)
    if (filters.minSimilarity) setMinSimilarity(filters.minSimilarity)
    if (filters.sortBy) setSortBy(filters.sortBy)
    if (filters.dateFrom) setDateFrom(filters.dateFrom)
    if (filters.dateTo) setDateTo(filters.dateTo)
    if (filters.fileType) setFileType(filters.fileType)
    if (filters.minSize) setMinSize(filters.minSize)
    if (filters.maxSize) setMaxSize(filters.maxSize)
    setCurrentPage(1) // Reset to first page when applying preset
  }

  const handleSaveCurrentFilters = () => {
    const presetName = prompt('Enter a name for this filter preset:')
    if (presetName) {
      const newPreset = {
        id: Date.now().toString(),
        name: presetName,
        description: 'Custom filter preset',
        filters: {
          matchType,
          contentType,
          minSimilarity,
          sortBy,
          dateFrom,
          dateTo,
          fileType,
          minSize,
          maxSize
        },
        icon: '⭐'
      }
      const updatedPresets = [...savedFilterPresets, newPreset]
      setSavedFilterPresets(updatedPresets)
      localStorage.setItem('kb-saved-filter-presets', JSON.stringify(updatedPresets))
    }
  }

  // Pagination functions
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (searchQuery) {
      handleSearch()
    }
  }

  const handleResultsPerPageChange = (perPage: number) => {
    setResultsPerPage(perPage)
    setCurrentPage(1)
    if (searchQuery) {
      handleSearch()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    const allSuggestions = [...autocompleteSuggestions, ...popularSuggestions.map(s => s.term || s.title || ''), ...recentSuggestions.map(s => s.title || '')].filter(Boolean)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0 && allSuggestions[selectedSuggestionIndex]) {
          handleSuggestionClick(allSuggestions[selectedSuggestionIndex])
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  const handleAsk = async () => {
    if (!question.trim()) return
    
    setIsAsking(true)
    try {
      const response = await aiApi.ask(question)
      setAnswer(response.answer)
      setSources(response.sources)
    } catch (error) {
      console.error('Ask failed:', error)
      setAnswer('Sorry, I encountered an error while processing your question.')
    } finally {
      setIsAsking(false)
    }
  }

  const handleIngest = async () => {
    setIsIngesting(true)
    try {
      const result = await kbApi.ingest()
      alert(`Successfully ingested ${result.count} files`)
    } catch (error) {
      console.error('Ingest failed:', error)
      alert('Failed to ingest knowledge base')
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Ingest Section */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
            <p className="text-sm text-gray-600">Ingest your vault content into the knowledge base</p>
          </div>
          <button
            onClick={handleIngest}
            disabled={isIngesting}
            className="btn btn-primary flex items-center space-x-2"
          >
            {isIngesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{isIngesting ? 'Ingesting...' : 'Ingest Vault'}</span>
          </button>
        </div>
      </div>

      {/* Enhanced Search Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Smart Search</h3>
            <button
              onClick={() => setShowSearchTips(!showSearchTips)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Tips
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
                showFilters ? 'bg-blue-100 text-blue-700 shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-sm'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Search Tips */}
        {showSearchTips && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">💡 Search Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Use quotes for exact phrases: "workflow automation"</li>
                <li>• Try different keywords if results are limited</li>
                <li>• Use filters to narrow down results by type or date</li>
                <li>• Save frequent searches for quick access</li>
              </ul>
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative mb-4">
          <div className="flex space-x-2">
            <div 
              className={`flex-1 relative transition-all duration-200 ${
                isHoveringSearch ? 'transform scale-[1.01]' : ''
              }`}
              onMouseEnter={() => setIsHoveringSearch(true)}
              onMouseLeave={() => setIsHoveringSearch(false)}
            >
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsSearchFocused(true)
                    setShowSuggestions(true)
                  }}
                  onBlur={() => {
                    setIsSearchFocused(false)
                    // Delay hiding suggestions to allow clicking on them
                    setTimeout(() => {
                      if (!isHoveringSearch) {
                        setShowSuggestions(false)
                      }
                    }, 150)
                  }}
                  placeholder="Search your knowledge base... (try 'workflow', 'automation', or 'scripts')"
                  className={`w-full px-4 py-3 pr-20 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200 ${
                    isHoveringSearch 
                      ? 'border-blue-300 shadow-md shadow-blue-100' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search className="h-4 w-4" />
                </div>
              </div>
              
              {/* Enhanced Predictive Search Suggestions */}
              {showSuggestions && (isHoveringSearch || isSearchFocused) && (
                <div 
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
                  onMouseEnter={() => setIsHoveringSearch(true)}
                  onMouseLeave={() => setIsHoveringSearch(false)}
                >
                  {/* Search History */}
                  {searchQuery.length < 2 && searchHistory.length > 0 && (
                    <div className="p-3 border-b">
                      <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                        <History className="w-3 h-3" />
                        Recent Searches
                      </div>
                      <div className="space-y-1">
                        {searchHistory.slice(0, 5).map((query, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between px-3 py-2 rounded cursor-pointer hover:bg-blue-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            onClick={() => handleQuickSearch(query)}
                          >
                            <span className="text-sm text-gray-700">{query}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSaveSearch(query)
                              }}
                              className="text-gray-400 hover:text-yellow-500 transition-colors duration-200 hover:scale-110"
                            >
                              <Star className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Saved Searches */}
                  {searchQuery.length < 2 && savedSearches.length > 0 && (
                    <div className="p-3 border-b">
                      <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Saved Searches
                      </div>
                      <div className="space-y-1">
                        {savedSearches.slice(0, 3).map((query, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between px-2 py-1 rounded cursor-pointer hover:bg-gray-50"
                            onClick={() => handleQuickSearch(query)}
                          >
                            <span className="text-sm text-gray-700">{query}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveSavedSearch(query)
                              }}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Autocomplete Suggestions */}
                  {autocompleteSuggestions.length > 0 && (
                    <div className="p-3">
                      <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Suggestions
                      </div>
                      {autocompleteSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className={`px-3 py-2 rounded cursor-pointer hover:bg-blue-50 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                            index === selectedSuggestionIndex ? 'bg-blue-100 shadow-sm' : ''
                          }`}
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <div className="text-sm text-gray-800 flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-blue-500" />
                            {suggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Popular Suggestions */}
                  {searchQuery.length < 2 && popularSuggestions.length > 0 && (
                    <div className="p-3 border-t">
                      <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Popular Topics
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {popularSuggestions.slice(0, 6).map((suggestion, index) => (
                          <div
                            key={index}
                            className={`px-2 py-2 rounded cursor-pointer hover:bg-green-50 text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                              index + autocompleteSuggestions.length === selectedSuggestionIndex ? 'bg-green-100 shadow-sm' : ''
                            }`}
                            onClick={() => handleSuggestionClick(suggestion.term || suggestion.title || '')}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-green-500" />
                                {suggestion.term || suggestion.title}
                              </span>
                              {suggestion.count && (
                                <span className="text-gray-400 ml-1 bg-gray-100 px-1 rounded text-xs">{suggestion.count}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Enhanced Search Filters */}
        {showFilters && (
          <div className="mb-4 p-6 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg shadow-sm">
            {/* Filter Presets */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Bookmark className="h-4 w-4" />
                  Filter Presets
                </h4>
                <button
                  onClick={handleSaveCurrentFilters}
                  className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
                >
                  Save Current
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {filterPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="flex flex-col items-center p-2 text-xs bg-white border border-gray-200 rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <span className="text-lg mb-1">{preset.icon}</span>
                    <span className="font-medium text-gray-700">{preset.name}</span>
                  </button>
                ))}
                {savedFilterPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className="flex flex-col items-center p-2 text-xs bg-yellow-50 border border-yellow-200 rounded-md hover:bg-yellow-100 hover:border-yellow-300 transition-colors"
                  >
                    <span className="text-lg mb-1">{preset.icon}</span>
                    <span className="font-medium text-gray-700">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Match Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  🎯 Match Type
                </label>
                <select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="all">All Matches</option>
                  <option value="exact">Exact Matches</option>
                  <option value="semantic">Semantic Matches</option>
                  <option value="fuzzy">Fuzzy Matches</option>
                </select>
              </div>

              {/* Content Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  📄 Content Type
                </label>
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="all">All Content</option>
                  <option value="title">Title Matches</option>
                  <option value="content">Content Matches</option>
                  <option value="source">Source Matches</option>
                </select>
              </div>

              {/* Sort By Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  🔄 Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="relevance">Relevance</option>
                  <option value="similarity">Similarity</option>
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                </select>
              </div>

              {/* Similarity Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  📊 Min Similarity
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={minSimilarity}
                    onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">
                    {Math.round(minSimilarity * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="mb-4">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Settings className="h-4 w-4" />
                {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
              </button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Date To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* File Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    File Type
                  </label>
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Files</option>
                    <option value="md">Markdown (.md)</option>
                    <option value="txt">Text (.txt)</option>
                    <option value="pdf">PDF (.pdf)</option>
                  </select>
                </div>

                {/* Size Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Hash className="h-4 w-4" />
                    Min Size (chars)
                  </label>
                  <input
                    type="number"
                    value={minSize}
                    onChange={(e) => setMinSize(e.target.value)}
                    placeholder="e.g., 1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Hash className="h-4 w-4" />
                    Max Size (chars)
                  </label>
                  <input
                    type="number"
                    value={maxSize}
                    onChange={(e) => setMaxSize(e.target.value)}
                    placeholder="e.g., 10000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Filter Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>💡 Tip: Use presets for quick filtering, advanced filters for precise control</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setMatchType('all')
                    setContentType('all')
                    setSortBy('relevance')
                    setMinSimilarity(0.1)
                    setDateFrom('')
                    setDateTo('')
                    setFileType('all')
                    setMinSize('')
                    setMaxSize('')
                    setCurrentPage(1)
                  }}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Reset All
                </button>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors shadow-sm"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-semibold text-gray-900">Search Results</h4>
                {searchMetadata && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {searchMetadata.paginatedResults} shown
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {searchMetadata.filteredResults} filtered
                    </span>
                    <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded-full">
                      {searchMetadata.totalResults} total
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                      {searchMetadata.exactResults} exact
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      {searchMetadata.semanticResults} semantic
                    </span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                      {searchMetadata.fuzzyResults} fuzzy
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveSearch(searchQuery)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-yellow-600 transition-colors"
                >
                  <Star className="h-4 w-4" />
                  Save Search
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {searchResults.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h5 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                        {item.title}
                      </h5>
                      <p className="text-sm text-gray-500 mb-2">
                        📁 {item.source}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {item.searchType && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          item.searchType === 'exact' 
                            ? 'bg-red-100 text-red-700' 
                            : item.searchType === 'semantic' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {item.searchType}
                        </span>
                      )}
                      {item.similarity && (
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${item.similarity * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {Math.round(item.similarity * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3 line-clamp-3 leading-relaxed">
                    {item.content.substring(0, 300)}
                    {item.content.length > 300 && '...'}
                  </p>
                  
                  {item.matchDetails && (
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      {item.matchDetails.title > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          Title: {Math.round(item.matchDetails.title * 100)}%
                        </span>
                      )}
                      {item.matchDetails.content > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          Content: {Math.round(item.matchDetails.content * 100)}%
                        </span>
                      )}
                      {item.matchDetails.source > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                          Source: {Math.round(item.matchDetails.source * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="text-xs text-gray-400">
                      Created: {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => handleViewContent(item)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors hover:underline"
                    >
                      View Full Content →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {searchResults.length > 0 && searchMetadata && (
          <div className="mt-6 flex items-center justify-between bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Results per page:</span>
                <select
                  value={resultsPerPage}
                  onChange={(e) => handleResultsPerPageChange(parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Showing {searchMetadata.pagination.offset + 1}-{Math.min(searchMetadata.pagination.offset + searchMetadata.pagination.limit, searchMetadata.filteredResults)} of {searchMetadata.filteredResults} results
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!searchMetadata.pagination.hasPrev}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, searchMetadata.pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(searchMetadata.pagination.totalPages - 4, currentPage - 2)) + i
                  if (pageNum > searchMetadata.pagination.totalPages) return null
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!searchMetadata.pagination.hasNext}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* No Results State */}
        {searchQuery && searchResults.length === 0 && !isSearching && (
          <div className="mt-6 text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 mb-4">
              Try different keywords or check your spelling
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setMatchType('all')}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Show All Results
              </button>
              <button
                onClick={handleClearSearch}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Ask Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ask AI</h3>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your knowledge base..."
              className="input flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleAsk()}
            />
            <button
              onClick={handleAsk}
              disabled={isAsking}
              className="btn btn-primary flex items-center space-x-2"
            >
              {isAsking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              <span>Ask</span>
            </button>
          </div>

          {answer && (
            <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <h4 className="text-lg font-semibold text-gray-900">AI Answer</h4>
              </div>
              
              {/* Enhanced AI Response with Markdown Support */}
              <div className="prose prose-lg max-w-none mb-6">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeRaw]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 mt-3">
                        {children}
                      </h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-base font-semibold text-gray-800 mb-1 mt-2">
                        {children}
                      </h4>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 mb-3 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-3 text-gray-700 space-y-1 ml-4">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-3 text-gray-700 space-y-1 ml-4">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700">
                        {children}
                      </li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-3 bg-blue-50 text-gray-700 italic rounded-r">
                        {children}
                      </blockquote>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className
                      if (isInline) {
                        return (
                          <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        )
                      }
                      return (
                        <code className={className}>
                          {children}
                        </code>
                      )
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-auto mb-3 text-sm">
                        {children}
                      </pre>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-3">
                        <table className="min-w-full border border-gray-200 rounded-lg">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-50">
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-3 py-2 text-sm text-gray-600 border-b border-gray-100">
                        {children}
                      </td>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-gray-800">
                        {children}
                      </em>
                    ),
                    hr: () => (
                      <hr className="border-gray-200 my-4" />
                    ),
                  }}
                >
                  {answer}
                </ReactMarkdown>
              </div>
              
              {sources.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-gray-600" />
                    <h5 className="font-semibold text-gray-900">Sources</h5>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {sources.length} reference{sources.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {sources.map((source, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h6 className="font-medium text-gray-900 mb-1">{source.title}</h6>
                            <p className="text-sm text-gray-500 mb-2">{source.source}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 transition-all duration-300"
                                  style={{ width: `${source.similarity * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 font-medium">
                                {Math.round(source.similarity * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Markdown Viewer Modal */}
      {viewerContent && (
        <MarkdownViewer
          content={viewerContent.content}
          title={viewerContent.title}
          source={viewerContent.source}
          isOpen={viewerOpen}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  )
}
