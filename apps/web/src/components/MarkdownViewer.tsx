import { useState } from 'react'
import { X, Copy, Download, ExternalLink, Eye, EyeOff } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'

interface MarkdownViewerProps {
  content: string
  title: string
  source: string
  isOpen: boolean
  onClose: () => void
}

export function MarkdownViewer({ content, title, source, isOpen, onClose }: MarkdownViewerProps) {
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {source}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
            >
              {showRaw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showRaw ? 'Preview' : 'Raw'}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
            >
              <Copy className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {showRaw ? (
            <div className="p-6">
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono text-gray-800 whitespace-pre-wrap">
                {content}
              </pre>
            </div>
          ) : (
            <div className="p-6 prose prose-lg max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                  // Custom styling for markdown elements
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold text-gray-800 mb-3 mt-6">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-semibold text-gray-800 mb-2 mt-4">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-semibold text-gray-800 mb-2 mt-3">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 text-gray-700 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 text-gray-700 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700">
                      {children}
                    </li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-blue-50 text-gray-700 italic">
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
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto mb-4 text-sm">
                      {children}
                    </pre>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto mb-4">
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
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
                      {children}
                    </td>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {children}
                    </a>
                  ),
                  img: ({ src, alt }) => (
                    <img
                      src={src}
                      alt={alt}
                      className="max-w-full h-auto rounded-lg shadow-sm mb-4"
                    />
                  ),
                  hr: () => (
                    <hr className="border-gray-200 my-6" />
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>📄 Markdown Document</span>
              <span>•</span>
              <span>{content.length.toLocaleString()} characters</span>
              <span>•</span>
              <span>{content.split('\n').length} lines</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {showRaw ? 'Raw Mode' : 'Preview Mode'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
