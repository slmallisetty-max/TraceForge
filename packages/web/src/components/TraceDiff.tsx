import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { Trace } from '@traceforge/shared';
import { fetchTrace } from '../api/client';
import { deepDiff, categorizeDiff, calculateSimilarity, formatValue } from '../utils/diff';
import type { JsonDiff } from '../utils/diff';

export default function TraceDiff() {
  const [searchParams] = useSearchParams();
  const [trace1, setTrace1] = useState<Trace | null>(null);
  const [trace2, setTrace2] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id1 = searchParams.get('id1');
  const id2 = searchParams.get('id2');

  useEffect(() => {
    if (id1 && id2) {
      loadTraces(id1, id2);
    }
  }, [id1, id2]);

  async function loadTraces(traceId1: string, traceId2: string) {
    try {
      const [t1, t2] = await Promise.all([
        fetchTrace(traceId1),
        fetchTrace(traceId2),
      ]);
      setTrace1(t1);
      setTrace2(t2);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading traces...</div>
      </div>
    );
  }

  if (error || !trace1 || !trace2) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error || 'Traces not found'}</p>
        <Link to="/" className="mt-2 inline-block text-blue-400 hover:text-blue-300">
          ← Back to traces
        </Link>
      </div>
    );
  }

  // Compute diffs
  const requestDiff = categorizeDiff(deepDiff(trace1.request, trace2.request));
  const responseDiff = categorizeDiff(deepDiff(trace1.response, trace2.response));
  const metadataDiff = categorizeDiff(deepDiff(trace1.metadata, trace2.metadata));

  // Calculate similarities
  const requestSimilarity = calculateSimilarity(trace1.request, trace2.request);
  const responseSimilarity = calculateSimilarity(trace1.response, trace2.response);
  const overallSimilarity = (requestSimilarity + responseSimilarity) / 2;

  const totalChanges = 
    requestDiff.added.length + requestDiff.removed.length + requestDiff.changed.length +
    responseDiff.added.length + responseDiff.removed.length + responseDiff.changed.length +
    metadataDiff.added.length + metadataDiff.removed.length + metadataDiff.changed.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-blue-400 hover:text-blue-300">
          ← Back to traces
        </Link>
        <div className="text-lg font-semibold">
          Similarity: 
          <span className={`ml-2 text-2xl ${
            overallSimilarity > 0.9 ? 'text-green-400' : 
            overallSimilarity > 0.7 ? 'text-yellow-400' : 
            'text-red-400'
          }`}>
            {(overallSimilarity * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Trace 1</h3>
          <div className="space-y-1 text-sm">
            <div><span className="text-gray-400">ID:</span> <span className="text-white font-mono">{trace1.id.substring(0, 8)}</span></div>
            <div><span className="text-gray-400">Timestamp:</span> <span className="text-white">{new Date(trace1.timestamp).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Model:</span> <span className="text-white">{trace1.metadata.model}</span></div>
            <div><span className="text-gray-400">Duration:</span> <span className="text-white">{trace1.metadata.duration_ms}ms</span></div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-400 mb-2">Trace 2</h3>
          <div className="space-y-1 text-sm">
            <div><span className="text-gray-400">ID:</span> <span className="text-white font-mono">{trace2.id.substring(0, 8)}</span></div>
            <div><span className="text-gray-400">Timestamp:</span> <span className="text-white">{new Date(trace2.timestamp).toLocaleString()}</span></div>
            <div><span className="text-gray-400">Model:</span> <span className="text-white">{trace2.metadata.model}</span></div>
            <div><span className="text-gray-400">Duration:</span> <span className="text-white">{trace2.metadata.duration_ms}ms</span></div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">📊 Comparison Summary</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{totalChanges}</div>
            <div className="text-sm text-gray-400">Total Changes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              {requestDiff.added.length + responseDiff.added.length + metadataDiff.added.length}
            </div>
            <div className="text-sm text-gray-400">Added</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">
              {requestDiff.removed.length + responseDiff.removed.length + metadataDiff.removed.length}
            </div>
            <div className="text-sm text-gray-400">Removed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {requestDiff.changed.length + responseDiff.changed.length + metadataDiff.changed.length}
            </div>
            <div className="text-sm text-gray-400">Changed</div>
          </div>
        </div>
      </div>

      {/* Request Diff */}
      {(requestDiff.added.length > 0 || requestDiff.removed.length > 0 || requestDiff.changed.length > 0) && (
        <DiffSection
          title="Request Differences"
          diff={requestDiff}
          similarity={requestSimilarity}
        />
      )}

      {/* Response Diff */}
      {(responseDiff.added.length > 0 || responseDiff.removed.length > 0 || responseDiff.changed.length > 0) && (
        <DiffSection
          title="Response Differences"
          diff={responseDiff}
          similarity={responseSimilarity}
        />
      )}

      {/* Metadata Diff */}
      {(metadataDiff.added.length > 0 || metadataDiff.removed.length > 0 || metadataDiff.changed.length > 0) && (
        <DiffSection
          title="Metadata Differences"
          diff={metadataDiff}
          similarity={calculateSimilarity(trace1.metadata, trace2.metadata)}
        />
      )}

      {totalChanges === 0 && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 text-center">
          <div className="text-green-400 text-xl font-semibold">✓ Traces are identical</div>
          <div className="text-gray-400 mt-2">No differences found between the two traces</div>
        </div>
      )}
    </div>
  );
}

interface DiffSectionProps {
  title: string;
  diff: JsonDiff;
  similarity: number;
}

function DiffSection({ title, diff, similarity }: DiffSectionProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className={`text-sm font-medium ${
          similarity > 0.9 ? 'text-green-400' : 
          similarity > 0.7 ? 'text-yellow-400' : 
          'text-red-400'
        }`}>
          {(similarity * 100).toFixed(1)}% similar
        </span>
      </div>

      <div className="space-y-3">
        {/* Changed Fields */}
        {diff.changed.map((change, i) => (
          <div key={`changed-${i}`} className="bg-gray-900 rounded-lg p-3 border border-yellow-700/50">
            <div className="text-xs font-mono text-yellow-400 mb-2">
              Changed: {change.path}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-red-900/20 border border-red-700/50 rounded p-2">
                <div className="text-xs text-red-400 mb-1">Trace 1</div>
                <pre className="text-xs text-gray-300 overflow-x-auto">
                  {formatValue(change.from, 200)}
                </pre>
              </div>
              <div className="bg-green-900/20 border border-green-700/50 rounded p-2">
                <div className="text-xs text-green-400 mb-1">Trace 2</div>
                <pre className="text-xs text-gray-300 overflow-x-auto">
                  {formatValue(change.to, 200)}
                </pre>
              </div>
            </div>
          </div>
        ))}

        {/* Added Fields */}
        {diff.added.map((change, i) => (
          <div key={`added-${i}`} className="bg-gray-900 rounded-lg p-3 border border-green-700/50">
            <div className="text-xs font-mono text-green-400 mb-2">
              Added: {change.path}
            </div>
            <div className="bg-green-900/20 border border-green-700/50 rounded p-2">
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {formatValue(change.to, 200)}
              </pre>
            </div>
          </div>
        ))}

        {/* Removed Fields */}
        {diff.removed.map((change, i) => (
          <div key={`removed-${i}`} className="bg-gray-900 rounded-lg p-3 border border-red-700/50">
            <div className="text-xs font-mono text-red-400 mb-2">
              Removed: {change.path}
            </div>
            <div className="bg-red-900/20 border border-red-700/50 rounded p-2">
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {formatValue(change.from, 200)}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
