import { useState, useEffect } from 'react'
import { 
  Globe, 
  Play, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  Image, 
  Link, 
  FileText, 
  Calendar,
  Settings,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react'
import { jobsApi, Job, ScrapingPreset } from '../lib/api'

export function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [presets, setPresets] = useState<ScrapingPreset[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  
  // Form state
  const [targetUrl, setTargetUrl] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<ScrapingPreset | null>(null)
  const [customOptions, setCustomOptions] = useState({
    extractImages: true,
    extractLinks: true,
    waitForSelector: '',
    maxWaitTime: 10000
  })

  // Load jobs and presets on mount
  useEffect(() => {
    loadJobs()
    loadPresets()
    
    // Auto-refresh jobs every 5 seconds
    const interval = setInterval(loadJobs, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadJobs = async () => {
    try {
      const jobsData = await jobsApi.list()
      setJobs(jobsData)
    } catch (error) {
      console.error('Failed to load jobs:', error)
    }
  }

  const loadPresets = async () => {
    try {
      const response = await jobsApi.getPresets()
      setPresets(response.presets)
      if (response.presets.length > 0) {
        setSelectedPreset(response.presets[0])
      }
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetUrl || !selectedPreset) return

    setIsCreating(true)
    try {
      const jobData = {
        targetUrl,
        kind: selectedPreset.kind,
        options: {
          ...selectedPreset.options,
          ...customOptions
        }
      }

      await jobsApi.create(jobData)
      setTargetUrl('')
      setShowCreateForm(false)
      await loadJobs()
    } catch (error) {
      console.error('Failed to create job:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handlePresetSelect = (preset: ScrapingPreset) => {
    setSelectedPreset(preset)
    setCustomOptions({
      extractImages: preset.options.extractImages ?? true,
      extractLinks: preset.options.extractLinks ?? true,
      waitForSelector: preset.options.waitForSelector || '',
      maxWaitTime: preset.options.maxWaitTime || 10000
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleViewResult = (job: Job) => {
    setSelectedJob(job)
  }

  const handleIngestResult = async (job: Job) => {
    if (!job.result) return
    
    try {
      // Here you would call the KB ingest API with the job result
      console.log('Ingesting job result:', job.result)
      // await kbApi.ingestFromJob(job.result)
    } catch (error) {
      console.error('Failed to ingest job result:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Web Scraping Jobs
          </h2>
          <p className="text-gray-600 mt-1">Manage and monitor web scraping operations</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadJobs}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Play className="h-4 w-4" />
            New Job
          </button>
        </div>
      </div>

      {/* Create Job Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Scraping Job</h3>
          
          <form onSubmit={handleCreateJob} className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target URL
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Preset Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scraping Preset
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      selectedPreset?.id === preset.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{preset.icon}</span>
                      <span className="font-medium text-gray-900">{preset.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Options */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Custom Options
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="extractImages"
                    checked={customOptions.extractImages}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, extractImages: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="extractImages" className="text-sm text-gray-700 flex items-center gap-1">
                    <Image className="h-4 w-4" />
                    Extract Images
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="extractLinks"
                    checked={customOptions.extractLinks}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, extractLinks: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="extractLinks" className="text-sm text-gray-700 flex items-center gap-1">
                    <Link className="h-4 w-4" />
                    Extract Links
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wait for Selector
                  </label>
                  <input
                    type="text"
                    value={customOptions.waitForSelector}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, waitForSelector: e.target.value }))}
                    placeholder="e.g., main, .content"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Wait Time (ms)
                  </label>
                  <input
                    type="number"
                    value={customOptions.maxWaitTime}
                    onChange={(e) => setCustomOptions(prev => ({ ...prev, maxWaitTime: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !targetUrl || !selectedPreset}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isCreating ? 'Creating...' : 'Create Job'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Jobs</h3>
        </div>
        
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Globe className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No scraping jobs yet. Create your first job to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(job.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{job.kind}</span>
                    </div>
                    
                    <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                      {job.result?.title || job.targetUrl}
                    </h4>
                    
                    <p className="text-sm text-gray-500 truncate mb-2">
                      {job.targetUrl}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(job.createdAt)}
                      </span>
                      {job.result && (
                        <>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {job.result.wordCount} words
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {job.result.readingTime} min read
                          </span>
                          {job.result.images && job.result.images.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              {job.result.images.length} images
                            </span>
                          )}
                          {job.result.links && job.result.links.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              {job.result.links.length} links
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {job.status === 'completed' && job.result && (
                      <>
                        <button
                          onClick={() => handleViewResult(job)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        <button
                          onClick={() => handleIngestResult(job)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:text-green-800 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Ingest
                        </button>
                      </>
                    )}
                    <a
                      href={job.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Visit
                    </a>
                  </div>
                </div>
                
                {job.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {job.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Result Modal */}
      {selectedJob && selectedJob.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{selectedJob.result.title}</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {/* Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium text-gray-700">Word Count</div>
                    <div className="text-gray-900">{selectedJob.result.wordCount}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium text-gray-700">Reading Time</div>
                    <div className="text-gray-900">{selectedJob.result.readingTime} min</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium text-gray-700">Images</div>
                    <div className="text-gray-900">{selectedJob.result.images?.length || 0}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="font-medium text-gray-700">Links</div>
                    <div className="text-gray-900">{selectedJob.result.links?.length || 0}</div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-900 mb-2">Content Preview</h4>
                  <p className="text-sm text-gray-700 line-clamp-6">
                    {selectedJob.result.content}
                  </p>
                </div>
                
                {/* Images */}
                {selectedJob.result.images && selectedJob.result.images.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Images</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {selectedJob.result.images.slice(0, 8).map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Image ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Links */}
                {selectedJob.result.links && selectedJob.result.links.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Links</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {selectedJob.result.links.slice(0, 10).map((link, index) => (
                        <a
                          key={index}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:text-blue-800 truncate"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
