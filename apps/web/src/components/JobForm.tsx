import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { jobsApi } from '../lib/api'

export function JobForm() {
  const [targetUrl, setTargetUrl] = useState('')
  const [kind, setKind] = useState('generic')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!targetUrl.trim()) return

    setIsSubmitting(true)
    try {
      await jobsApi.create({ targetUrl, kind })
      setTargetUrl('')
      setKind('generic')
      // Trigger refresh of job list (parent component should handle this)
      window.dispatchEvent(new CustomEvent('jobCreated'))
    } catch (error) {
      console.error('Failed to create job:', error)
      alert('Failed to create job')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Scraping Job</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            Target URL
          </label>
          <input
            type="url"
            id="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://example.com"
            className="input w-full"
            required
          />
        </div>

        <div>
          <label htmlFor="kind" className="block text-sm font-medium text-gray-700 mb-1">
            Content Type
          </label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="input w-full"
          >
            <option value="generic">Generic</option>
            <option value="documentation">Documentation</option>
            <option value="blog">Blog</option>
            <option value="news">News</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary flex items-center space-x-2"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span>{isSubmitting ? 'Creating...' : 'Create Job'}</span>
        </button>
      </form>
    </div>
  )
}
