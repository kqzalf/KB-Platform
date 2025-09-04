import { useState } from 'react'
import { KBPanel } from './components/KBPanel'
import { JobsPanel } from './components/JobsPanel'
import { LinksPanel } from './components/LinksPanel'
import { ResetPanel } from './components/ResetPanel'
import { Brain, Database, Zap, Link, Settings } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState<'kb' | 'jobs' | 'links' | 'reset'>('kb')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">KB Platform</h1>
            </div>
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('kb')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'kb'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Database className="h-4 w-4" />
                <span>Knowledge Base</span>
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'jobs'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Zap className="h-4 w-4" />
                <span>Jobs</span>
              </button>
                                    <button
                        onClick={() => setActiveTab('links')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeTab === 'links'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Link className="h-4 w-4" />
                        <span>Links</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('reset')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeTab === 'reset'
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Reset</span>
                      </button>
            </nav>
          </div>
        </div>
      </header>

                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'kb' && <KBPanel />}
                {activeTab === 'jobs' && <JobsPanel />}
                {activeTab === 'links' && <LinksPanel />}
                {activeTab === 'reset' && <ResetPanel />}
              </main>
    </div>
  )
}

export default App
