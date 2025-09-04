import { useState, useEffect } from 'react';
import {
  RotateCcw,
  Database,
  FolderOpen,
  Trash2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Settings
} from 'lucide-react';
import { resetApi } from '../lib/api';

interface ResetPanelProps {
  className?: string;
}

export function ResetPanel({ className = '' }: ResetPanelProps) {
  const [stats, setStats] = useState({
    knowledgeItems: 0,
    links: 0,
    jobs: 0,
    vaultFiles: 0,
    totalItems: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastReset, setLastReset] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resetType, setResetType] = useState<'system' | 'database' | 'vault' | 'vault-complete' | null>(null);
  const [resetOptions, setResetOptions] = useState({
    clearKnowledgeItems: true,
    clearLinks: true,
    clearJobs: true,
    clearVault: true,
    reinitializeVault: true,
    preserveOriginalVault: true
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const status = await resetApi.getStatus();
      setStats(status.system);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleReset = async (type: 'system' | 'database' | 'vault' | 'vault-complete') => {
    setResetType(type);
    setShowConfirmDialog(true);
  };

  const confirmReset = async () => {
    if (!resetType) return;

    setIsLoading(true);
    try {
      let result;
      
      switch (resetType) {
        case 'system':
          result = await resetApi.resetSystem(resetOptions);
          break;
        case 'database':
          result = await resetApi.resetDatabase();
          break;
        case 'vault':
          result = await resetApi.resetVault();
          break;
        case 'vault-complete':
          result = await resetApi.resetVaultComplete();
          break;
        default:
          throw new Error('Invalid reset type');
      }

      setLastReset(result.timestamp);
      await loadStats();
      
      alert(`Reset completed successfully!\n\nCleared:\n- Knowledge Items: ${result.cleared.knowledgeItems}\n- Links: ${result.cleared.links}\n- Jobs: ${result.cleared.jobs}\n- Vault Files: ${result.cleared.vaultFiles}`);
    } catch (error) {
      console.error('Reset failed:', error);
      alert(`Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setShowConfirmDialog(false);
      setResetType(null);
    }
  };

  const getResetDescription = (type: string) => {
    switch (type) {
      case 'system':
        return 'Reset entire system (database + vault) - This will clear all scraped data and reinitialize everything to default state.';
      case 'database':
        return 'Reset only database (keep vault) - This will clear all knowledge items, links, and jobs but preserve vault files.';
      case 'vault':
        return 'Reset only vault external resources - This will clear all scraped content from vault but keep database data.';
      case 'vault-complete':
        return 'Complete vault recreation - This will delete the entire vault directory and recreate it from scratch with a clean structure.';
      default:
        return '';
    }
  };

  const getResetIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <RotateCcw className="h-5 w-5" />;
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'vault':
        return <FolderOpen className="h-5 w-5" />;
      case 'vault-complete':
        return <Trash2 className="h-5 w-5" />;
      default:
        return <Trash2 className="h-5 w-5" />;
    }
  };

  const getResetColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'database':
        return 'bg-orange-600 hover:bg-orange-700 text-white';
      case 'vault':
        return 'bg-yellow-600 hover:bg-yellow-700 text-white';
      case 'vault-complete':
        return 'bg-purple-600 hover:bg-purple-700 text-white';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">System Reset</h2>
          </div>
          <button
            onClick={loadStats}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Current Statistics */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Current System Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.knowledgeItems}</div>
              <div className="text-sm text-blue-800">Knowledge Items</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.links}</div>
              <div className="text-sm text-green-800">Links</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.jobs}</div>
              <div className="text-sm text-purple-800">Jobs</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.vaultFiles}</div>
              <div className="text-sm text-orange-800">Vault Files</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <strong>Total Items:</strong> {stats.totalItems}
            {lastReset && (
              <span className="ml-4">
                <strong>Last Reset:</strong> {new Date(lastReset).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Reset Options */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Reset Options</h3>
          
          {/* System Reset */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getResetIcon('system')}
                  <h4 className="text-lg font-medium text-gray-900">Full System Reset</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Reset entire system (database + vault) - This will clear all scraped data and reinitialize everything to default state.
                </p>
                <div className="text-xs text-gray-500">
                  Clears: Knowledge Items, Links, Jobs, Vault Files
                </div>
              </div>
              <button
                onClick={() => handleReset('system')}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${getResetColor('system')}`}
              >
                Reset System
              </button>
            </div>
          </div>

          {/* Database Reset */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getResetIcon('database')}
                  <h4 className="text-lg font-medium text-gray-900">Database Reset</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Reset only database (keep vault) - This will clear all knowledge items, links, and jobs but preserve vault files.
                </p>
                <div className="text-xs text-gray-500">
                  Clears: Knowledge Items, Links, Jobs
                </div>
              </div>
              <button
                onClick={() => handleReset('database')}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${getResetColor('database')}`}
              >
                Reset Database
              </button>
            </div>
          </div>

          {/* Vault Reset */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getResetIcon('vault')}
                  <h4 className="text-lg font-medium text-gray-900">Vault Reset</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Reset only vault external resources - This will clear all scraped content from vault but keep database data.
                </p>
                <div className="text-xs text-gray-500">
                  Clears: Vault Files
                </div>
              </div>
              <button
                onClick={() => handleReset('vault')}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${getResetColor('vault')}`}
              >
                Reset Vault
              </button>
            </div>
          </div>

          {/* Complete Vault Recreation */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getResetIcon('vault-complete')}
                  <h4 className="text-lg font-medium text-gray-900">Complete Vault Recreation</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Complete vault recreation - This will delete the entire vault directory and recreate it from scratch with a clean structure.
                </p>
                <div className="text-xs text-gray-500">
                  Clears: Entire Vault Directory
                </div>
              </div>
              <button
                onClick={() => handleReset('vault-complete')}
                disabled={isLoading}
                className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${getResetColor('vault-complete')}`}
              >
                Recreate Vault
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Options (for system reset) */}
        {resetType === 'system' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-md font-medium text-gray-900 mb-3">Advanced Options</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={resetOptions.clearKnowledgeItems}
                  onChange={(e) => setResetOptions({...resetOptions, clearKnowledgeItems: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Clear Knowledge Items</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={resetOptions.clearLinks}
                  onChange={(e) => setResetOptions({...resetOptions, clearLinks: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Clear Links</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={resetOptions.clearJobs}
                  onChange={(e) => setResetOptions({...resetOptions, clearJobs: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Clear Jobs</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={resetOptions.clearVault}
                  onChange={(e) => setResetOptions({...resetOptions, clearVault: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Clear Vault Files</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={resetOptions.reinitializeVault}
                  onChange={(e) => setResetOptions({...resetOptions, reinitializeVault: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Reinitialize Vault Structure</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={resetOptions.preserveOriginalVault}
                  onChange={(e) => setResetOptions({...resetOptions, preserveOriginalVault: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Preserve Original Vault Content</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && resetType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-medium text-gray-900">Confirm Reset</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {getResetDescription(resetType)}
            </p>
            <p className="text-sm font-medium text-red-600 mb-6">
              This action cannot be undone. Are you sure you want to continue?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${getResetColor(resetType)}`}
              >
                {isLoading ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
