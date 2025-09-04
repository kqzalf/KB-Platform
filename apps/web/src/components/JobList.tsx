import { useState, useEffect } from 'react'
import { RefreshCw, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { jobsApi, Job } from '../lib/api'

export function JobList() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchJobs = async () => {
    try {
      const jobList = await jobsApi.list()
      setJobs(jobList)
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    
    // Listen for job creation events
    const handleJobCreated = () => {
      fetchJobs()
    }
    
    window.addEventListener('jobCreated', handleJobCreated)
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000)
    
    return () => {
      window.removeEventListener('jobCreated', handleJobCreated)
      clearInterval(interval)
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          <span className="ml-2 text-gray-600">Loading jobs...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Scraping Jobs</h2>
        <button
          onClick={fetchJobs}
          className="btn btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No jobs found. Create your first scraping job above.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusIcon(job.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                      {job.kind}
                    </span>
                  </div>
                  
                  <h3 className="font-medium text-gray-900 mb-1">
                    <a 
                      href={job.targetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 hover:underline"
                    >
                      {job.targetUrl}
                    </a>
                  </h3>
                  
                  <p className="text-sm text-gray-600">
                    Created: {new Date(job.createdAt).toLocaleString()}
                  </p>
                  
                  {job.error && (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {job.error}
                    </p>
                  )}
                  
                  {job.result && (
                    <div className="mt-2">
                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                          View Result
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded border">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(job.result, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
