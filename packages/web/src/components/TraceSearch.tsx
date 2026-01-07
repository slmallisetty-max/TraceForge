import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trace } from '@traceforge/shared';

export function TraceSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/traces/search?q=${encodeURIComponent(query)}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();
      setResults(data.results);
      setTotalResults(data.total);
    } catch (error: any) {
      console.error('Search failed:', error);
      setError(error.message);
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search traces... (e.g., 'authentication error', 'gpt-4')"
          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
        </div>
      )}

      {totalResults > 0 && (
        <div className="text-sm text-gray-400">
          Found {totalResults} result{totalResults !== 1 ? 's' : ''}
        </div>
      )}

      <div className="space-y-2">
        {results.map((trace) => (
          <div
            key={trace.id}
            onClick={() => navigate(`/trace/${trace.id}`)}
            className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-mono text-sm text-blue-400">
                  {trace.id.substring(0, 8)}
                </div>
                <div className="text-gray-300 mt-1">{trace.endpoint}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {trace.metadata.model} · {new Date(trace.timestamp).toLocaleString()}
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  trace.metadata.status === 'success'
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-red-900/30 text-red-400'
                }`}
              >
                {trace.metadata.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!loading && results.length === 0 && query && (
        <div className="text-center text-gray-500 py-8">
          No results found for "{query}"
        </div>
      )}

      {!query && (
        <div className="text-center text-gray-500 py-8">
          <p className="mb-2">Enter a search query to find traces</p>
          <p className="text-sm">
            Try searching for:
            <span className="block mt-2">
              • Keywords: "authentication", "error"
            </span>
            <span className="block">
              • Models: "gpt-4", "claude-3"
            </span>
            <span className="block">
              • Boolean: "user AND login"
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
