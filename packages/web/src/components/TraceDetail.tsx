import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Trace, StreamingTrace } from '@traceforge/shared';
import { fetchTrace, createTestFromTrace } from '../api/client';
import { StreamingTraceDetail } from './StreamingTraceDetail';

export default function TraceDetail() {
  const { id } = useParams<{ id: string }>();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testName, setTestName] = useState('');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      loadTrace(id);
    }
  }, [id]);

  async function loadTrace(traceId: string) {
    try {
      const data = await fetchTrace(traceId);
      setTrace(data);
      setTestName(`Test from ${traceId.substring(0, 8)}`);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTest() {
    if (!trace || !testName.trim()) return;

    setCreating(true);
    try {
      await createTestFromTrace(trace.id, testName);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to create test: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading trace...</div>
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error || 'Trace not found'}</p>
        <Link to="/" className="mt-2 inline-block text-blue-400 hover:text-blue-300">
          ← Back to traces
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-blue-400 hover:text-blue-300">
          ← Back to traces
        </Link>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-white mb-4">Trace Details</h1>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-400">ID</p>
            <p className="text-white font-mono">{trace.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Timestamp</p>
            <p className="text-white">{new Date(trace.timestamp).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Endpoint</p>
            <p className="text-white font-mono">{trace.endpoint}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Model</p>
            <p className="text-white">{trace.metadata.model || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Duration</p>
            <p className="text-white">{trace.metadata.duration_ms}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Status</p>
            <span
              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                trace.metadata.status === 'success'
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-red-900/30 text-red-400'
              }`}
            >
              {trace.metadata.status}
            </span>
          </div>
          {trace.metadata.tokens_used && (
            <div>
              <p className="text-sm text-gray-400">Tokens Used</p>
              <p className="text-white">{trace.metadata.tokens_used}</p>
            </div>
          )}
        </div>
      </div>

      {/* Streaming Details */}
      {'chunks' in trace && Array.isArray((trace as any).chunks) && (
        <StreamingTraceDetail trace={trace as StreamingTrace} />
      )}

      {trace.response && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Create Test</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Test Name</label>
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter test name..."
              />
            </div>
            <button
              onClick={handleCreateTest}
              disabled={creating || !testName.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white font-medium"
            >
              {creating ? 'Creating...' : 'Save as Test'}
            </button>
            {success && (
              <p className="text-green-400 text-sm">✓ Test created successfully!</p>
            )}
          </div>
        </div>
      )}

      {/* Regular trace view (non-streaming) */}
      {!('chunks' in trace && Array.isArray((trace as any).chunks)) && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Request</h2>
            <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-sm text-gray-300">
              {JSON.stringify(trace.request, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Response</h2>
            {trace.response ? (
              <pre className="bg-gray-900 p-4 rounded overflow-x-auto text-sm text-gray-300">
                {JSON.stringify(trace.response, null, 2)}
              </pre>
            ) : (
              <div className="bg-red-900/20 border border-red-500 rounded p-4">
                <p className="text-red-400">
                  Error: {trace.metadata.error || 'No response available'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
