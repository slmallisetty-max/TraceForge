import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trace } from '@traceforge/shared';
import { fetchTraces } from '../api/client';

export default function TraceList() {
  const navigate = useNavigate();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedTraces, setSelectedTraces] = useState<string[]>([]);

  useEffect(() => {
    loadTraces();
    // Auto-refresh every 5 seconds
    const interval = setInterval(loadTraces, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadTraces() {
    try {
      const data = await fetchTraces();
      setTraces(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredTraces = traces.filter(
    (trace) =>
      trace.endpoint.toLowerCase().includes(filter.toLowerCase()) ||
      trace.metadata.model?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading traces...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
        <button
          onClick={loadTraces}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleCompare = () => {
    if (selectedTraces.length === 2) {
      navigate(`/diff?id1=${selectedTraces[0]}&id2=${selectedTraces[1]}`);
    }
  };

  const toggleTraceSelection = (traceId: string) => {
    setSelectedTraces(prev => {
      if (prev.includes(traceId)) {
        return prev.filter(id => id !== traceId);
      } else if (prev.length < 2) {
        return [...prev, traceId];
      } else {
        // Replace first selected with new one
        return [prev[1], traceId];
      }
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Traces</h1>
          {selectedTraces.length > 0 && (
            <p className="text-sm text-gray-400 mt-1">
              {selectedTraces.length} trace{selectedTraces.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {selectedTraces.length === 2 && (
            <button
              onClick={handleCompare}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white font-medium"
            >
              🔍 Compare Selected
            </button>
          )}
          <button
            onClick={loadTraces}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by endpoint or model..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredTraces.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">No traces found</p>
          <p className="text-sm text-gray-500">
            Start the proxy and make some LLM requests to see traces here.
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider w-12">
                  Select
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredTraces.map((trace) => (
                <tr
                  key={trace.id}
                  className={`hover:bg-gray-700 ${selectedTraces.includes(trace.id) ? 'bg-gray-700' : ''}`}
                >
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTraces.includes(trace.id)}
                      onChange={() => toggleTraceSelection(trace.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2"
                    />
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-gray-300 cursor-pointer"
                    onClick={() => navigate(`/trace/${trace.id}`)}
                  >
                    {new Date(trace.timestamp).toLocaleString()}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-gray-300 font-mono cursor-pointer"
                    onClick={() => navigate(`/trace/${trace.id}`)}
                  >
                    {trace.endpoint}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-gray-300 cursor-pointer"
                    onClick={() => navigate(`/trace/${trace.id}`)}
                  >
                    {trace.metadata.model || 'N/A'}
                  </td>
                  <td 
                    className="px-4 py-3 text-sm cursor-pointer"
                    onClick={() => navigate(`/trace/${trace.id}`)}
                  >
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trace.metadata.status === 'success'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {trace.metadata.status}
                    </span>
                  </td>
                  <td 
                    className="px-4 py-3 text-sm text-gray-300 cursor-pointer"
                    onClick={() => navigate(`/trace/${trace.id}`)}
                  >
                    {trace.metadata.duration_ms}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-400">
        Showing {filteredTraces.length} of {traces.length} traces
      </div>
    </div>
  );
}
