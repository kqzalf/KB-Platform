import React, { useState, useEffect } from 'react';
import {
  Link,
  Search,
  Plus,
  RefreshCw,
  Filter,
  MoreVertical,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Globe,
  Database,
  FolderOpen
} from 'lucide-react';
import { linksApi, vaultApi, LinkCacheEntry, LinkCacheStats } from '../lib/api';

interface LinksPanelProps {
  className?: string;
}

export const LinksPanel: React.FC<LinksPanelProps> = ({ className = '' }) => {
  const [links, setLinks] = useState<LinkCacheEntry[]>([]);
  const [stats, setStats] = useState<LinkCacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLinks, setSelectedLinks] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    contentType: '',
    domain: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLink, setNewLink] = useState({
    url: '',
    title: '',
    contentType: 'unknown',
    priority: 5,
    tags: [] as string[]
  });

  // Load links and stats
  useEffect(() => {
    loadLinks();
    loadStats();
  }, [pagination.page, filters]);

  const loadLinks = async () => {
    try {
      setLoading(true);
      const response = await linksApi.list({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      setLinks(response.links);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load links:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await linksApi.getStats();
      setStats(stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadLinks();
      return;
    }

    try {
      setLoading(true);
      const response = await linksApi.search(searchQuery, {
        ...filters,
        limit: pagination.limit
      });
      setLinks(response?.links || []);
    } catch (error) {
      console.error('Search failed:', error);
      setLinks([]); // Ensure links is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    try {
      await linksApi.create(newLink);
      setNewLink({ url: '', title: '', contentType: 'unknown', priority: 5, tags: [] });
      setShowAddForm(false);
      loadLinks();
      loadStats();
    } catch (error) {
      console.error('Failed to add link:', error);
    }
  };

  const handleBulkAction = async (action: 'delete' | 'scrape' | 'update' | 'ingest' | 'vault-ingest', updates?: any) => {
    if (selectedLinks.length === 0) return;

    try {
      if (action === 'ingest') {
        const result = await linksApi.bulkIngest(selectedLinks);
        alert(`${result.message}\nErrors: ${result.errors.length}`);
      } else if (action === 'vault-ingest') {
        const result = await vaultApi.bulkIngestLinks(selectedLinks);
        alert(`${result.message}\nErrors: ${result.errors.length}`);
      } else {
        await linksApi.bulkOperation(action, selectedLinks, updates);
      }
      setSelectedLinks([]);
      loadLinks();
      loadStats();
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    }
  };

  const handleScheduleScraping = async (linkId: string) => {
    try {
      await linksApi.scheduleScraping(linkId);
      loadLinks();
    } catch (error) {
      console.error('Failed to schedule scraping:', error);
    }
  };

  const handleIngestLink = async (linkId: string) => {
    try {
      const result = await linksApi.ingestLink(linkId);
      alert(`Successfully ingested: ${result.knowledgeItem.title}`);
      loadLinks();
    } catch (error) {
      console.error('Failed to ingest link:', error);
      alert('Failed to ingest link. Make sure the link has been scraped successfully.');
    }
  };

  const handleVaultIngestLink = async (linkId: string) => {
    try {
      const result = await vaultApi.ingestLink(linkId);
      alert(`Successfully ingested to vault: ${result.knowledgeItem.title}\nPath: ${result.vaultPath}`);
      loadLinks();
    } catch (error) {
      console.error('Failed to ingest link to vault:', error);
      alert('Failed to ingest link to vault. Make sure the link has been scraped successfully.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'inactive': return <Pause className="h-4 w-4 text-gray-600" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getContentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'blog': 'bg-blue-100 text-blue-800',
      'news': 'bg-red-100 text-red-800',
      'documentation': 'bg-green-100 text-green-800',
      'api': 'bg-purple-100 text-purple-800',
      'tutorial': 'bg-orange-100 text-orange-800',
      'wiki': 'bg-gray-100 text-gray-800',
      'unknown': 'bg-gray-100 text-gray-600'
    };
    return colors[type] || colors['unknown'];
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Link Cache</h2>
          <p className="text-gray-600">Manage and monitor your link collection</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Link</span>
          </button>
          <button
            onClick={loadLinks}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total Links</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Errors</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.error}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search links..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="error">Error</option>
              <option value="blocked">Blocked</option>
            </select>
            <select
              value={filters.contentType}
              onChange={(e) => setFilters({ ...filters, contentType: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="blog">Blog</option>
              <option value="news">News</option>
              <option value="documentation">Documentation</option>
              <option value="api">API</option>
              <option value="tutorial">Tutorial</option>
              <option value="wiki">Wiki</option>
            </select>
            <input
              type="text"
              placeholder="Domain filter..."
              value={filters.domain}
              onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedLinks.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-blue-800">
              {selectedLinks.length} link{selectedLinks.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('scrape')}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Schedule Scraping
              </button>
                      <button
          onClick={() => handleBulkAction('ingest')}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Ingest to KB
        </button>
        <button
          onClick={() => handleBulkAction('vault-ingest')}
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          Ingest to Vault
        </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600">Loading links...</p>
          </div>
        ) : (links || []).length === 0 ? (
          <div className="p-8 text-center">
            <Link className="h-12 w-12 mx-auto text-gray-400" />
            <p className="mt-2 text-gray-600">No links found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {links.map((link) => (
              <div key={link.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedLinks.includes(link.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLinks([...selectedLinks, link.id]);
                        } else {
                          setSelectedLinks(selectedLinks.filter(id => id !== link.id));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getStatusIcon(link.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getContentTypeColor(link.contentType)}`}>
                          {link.contentType}
                        </span>
                        <span className="text-xs text-gray-500">Priority: {link.priority}</span>
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-blue-600 hover:underline"
                        >
                          {link.title || link.url}
                        </a>
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{link.url}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Globe className="h-3 w-3" />
                          <span>{link.domain}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Every {formatInterval(link.scrapeInterval)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>{link.successCount} success</span>
                        </span>
                        {link.errorCount > 0 && (
                          <span className="flex items-center space-x-1 text-red-600">
                            <XCircle className="h-3 w-3" />
                            <span>{link.errorCount} errors</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                              <div className="flex items-center space-x-2">
              <button
                onClick={() => handleScheduleScraping(link.id)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Schedule scraping"
              >
                <Play className="h-4 w-4" />
              </button>
                                      <button
                          onClick={() => handleIngestLink(link.id)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Ingest into knowledge base"
                        >
                          <Database className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleVaultIngestLink(link.id)}
                          className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Ingest into Obsidian vault"
                        >
                          <FolderOpen className="h-4 w-4" />
                        </button>
              <button
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} links
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Link title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                <select
                  value={newLink.contentType}
                  onChange={(e) => setNewLink({ ...newLink, contentType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="unknown">Unknown</option>
                  <option value="blog">Blog</option>
                  <option value="news">News</option>
                  <option value="documentation">Documentation</option>
                  <option value="api">API</option>
                  <option value="tutorial">Tutorial</option>
                  <option value="wiki">Wiki</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newLink.priority}
                  onChange={(e) => setNewLink({ ...newLink, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLink}
                disabled={!newLink.url}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
