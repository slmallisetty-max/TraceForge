import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import type { Trace } from "@traceforge/shared";
import { fetchTrace } from "../api/client";
import {
  deepDiff,
  categorizeDiff,
  calculateSimilarity,
  formatValue,
} from "../utils/diff";
import type { JsonDiff, DiffChange } from "../utils/diff";
import { classifySemanticImportance } from "../utils/semantic-diff";

export default function TraceDiff() {
  const [searchParams] = useSearchParams();
  const [trace1, setTrace1] = useState<Trace | null>(null);
  const [trace2, setTrace2] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id1 = searchParams.get("id1");
  const id2 = searchParams.get("id2");

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
        <p className="text-red-400">Error: {error || "Traces not found"}</p>
        <Link
          to="/"
          className="mt-2 inline-block text-blue-400 hover:text-blue-300"
        >
          ← Back to traces
        </Link>
      </div>
    );
  }

  // Compute diffs
  const requestDiff = categorizeDiff(deepDiff(trace1.request, trace2.request));
  const responseDiff = categorizeDiff(
    deepDiff(trace1.response, trace2.response)
  );
  const metadataDiff = categorizeDiff(
    deepDiff(trace1.metadata, trace2.metadata)
  );

  // Classify semantic importance
  const allResponseChanges: DiffChange[] = [
    ...responseDiff.added,
    ...responseDiff.removed,
    ...responseDiff.changed,
  ];
  const semanticAnalysis = classifySemanticImportance(allResponseChanges);

  // Calculate similarities
  const requestSimilarity = calculateSimilarity(trace1.request, trace2.request);
  const responseSimilarity = calculateSimilarity(
    trace1.response,
    trace2.response
  );
  const overallSimilarity = (requestSimilarity + responseSimilarity) / 2;

  const totalChanges =
    requestDiff.added.length +
    requestDiff.removed.length +
    requestDiff.changed.length +
    responseDiff.added.length +
    responseDiff.removed.length +
    responseDiff.changed.length +
    metadataDiff.added.length +
    metadataDiff.removed.length +
    metadataDiff.changed.length;

  const hasMeaningfulChanges = semanticAnalysis.semanticChanges.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-blue-400 hover:text-blue-300">
          ← Back to traces
        </Link>
        <div className="text-lg font-semibold">
          Similarity:
          <span
            className={`ml-2 text-2xl ${
              overallSimilarity > 0.9
                ? "text-green-400"
                : overallSimilarity > 0.7
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {(overallSimilarity * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Semantic Analysis Banner */}
      {allResponseChanges.length > 0 && (
        <div
          className={`border rounded-lg p-4 ${
            hasMeaningfulChanges
              ? "bg-orange-900/20 border-orange-500"
              : "bg-green-900/20 border-green-500"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold">
                {hasMeaningfulChanges
                  ? "⚠️ Semantic Changes Detected"
                  : "✓ Format Changes Only"}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {hasMeaningfulChanges
                  ? `${semanticAnalysis.semanticChanges.length} meaningful change(s), ${semanticAnalysis.formatChanges.length} format change(s)`
                  : `${semanticAnalysis.formatChanges.length} format-only changes (whitespace, IDs, timestamps)`}
              </div>
            </div>
            <div
              className={`px-4 py-2 rounded font-semibold ${
                semanticAnalysis.recommendation === "accept"
                  ? "bg-green-600 text-white"
                  : semanticAnalysis.recommendation === "review"
                  ? "bg-yellow-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {semanticAnalysis.recommendation.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-400 mb-2">Trace 1</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-400">ID:</span>{" "}
              <span className="text-white font-mono">
                {trace1.id.substring(0, 8)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Timestamp:</span>{" "}
              <span className="text-white">
                {new Date(trace1.timestamp).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Model:</span>{" "}
              <span className="text-white">{trace1.metadata.model}</span>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span>{" "}
              <span className="text-white">
                {trace1.metadata.duration_ms}ms
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-400 mb-2">Trace 2</h3>
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-gray-400">ID:</span>{" "}
              <span className="text-white font-mono">
                {trace2.id.substring(0, 8)}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Timestamp:</span>{" "}
              <span className="text-white">
                {new Date(trace2.timestamp).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Model:</span>{" "}
              <span className="text-white">{trace2.metadata.model}</span>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span>{" "}
              <span className="text-white">
                {trace2.metadata.duration_ms}ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">
          📊 Comparison Summary
        </h3>
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">{totalChanges}</div>
            <div className="text-sm text-gray-400">Total Changes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-400">
              {semanticAnalysis.semanticChanges.length}
            </div>
            <div className="text-sm text-gray-400">Semantic</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">
              {semanticAnalysis.formatChanges.length}
            </div>
            <div className="text-sm text-gray-400">Format Only</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">
              {requestDiff.added.length +
                responseDiff.added.length +
                metadataDiff.added.length}
            </div>
            <div className="text-sm text-gray-400">Added</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-400">
              {requestDiff.removed.length +
                responseDiff.removed.length +
                metadataDiff.removed.length}
            </div>
            <div className="text-sm text-gray-400">Removed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">
              {requestDiff.changed.length +
                responseDiff.changed.length +
                metadataDiff.changed.length}
            </div>
            <div className="text-sm text-gray-400">Changed</div>
          </div>
        </div>
      </div>

      {/* Request Diff */}
      {(requestDiff.added.length > 0 ||
        requestDiff.removed.length > 0 ||
        requestDiff.changed.length > 0) && (
        <DiffSection
          title="Request Differences"
          diff={requestDiff}
          similarity={requestSimilarity}
        />
      )}

      {/* Response Diff with Semantic Analysis */}
      {(responseDiff.added.length > 0 ||
        responseDiff.removed.length > 0 ||
        responseDiff.changed.length > 0) && (
        <DiffSection
          title="Response Differences"
          diff={responseDiff}
          similarity={responseSimilarity}
          semanticChanges={semanticAnalysis.semanticChanges}
          formatChanges={semanticAnalysis.formatChanges}
        />
      )}

      {/* Metadata Diff */}
      {(metadataDiff.added.length > 0 ||
        metadataDiff.removed.length > 0 ||
        metadataDiff.changed.length > 0) && (
        <DiffSection
          title="Metadata Differences"
          diff={metadataDiff}
          similarity={calculateSimilarity(trace1.metadata, trace2.metadata)}
        />
      )}

      {totalChanges === 0 && (
        <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 text-center">
          <div className="text-green-400 text-xl font-semibold">
            ✓ Traces are identical
          </div>
          <div className="text-gray-400 mt-2">
            No differences found between the two traces
          </div>
        </div>
      )}
    </div>
  );
}

interface DiffSectionProps {
  title: string;
  diff: JsonDiff;
  similarity: number;
  semanticChanges?: DiffChange[];
  formatChanges?: DiffChange[];
}

function DiffSection({
  title,
  diff,
  similarity,
  semanticChanges,
  formatChanges,
}: DiffSectionProps) {
  const hasSemanticAnalysis = semanticChanges && formatChanges;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-3">
          {hasSemanticAnalysis && semanticChanges.length > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-orange-900/50 border border-orange-500 text-orange-400">
              {semanticChanges.length} semantic
            </span>
          )}
          {hasSemanticAnalysis && formatChanges.length > 0 && (
            <span className="text-xs px-2 py-1 rounded bg-gray-700 border border-gray-600 text-gray-400">
              {formatChanges.length} format
            </span>
          )}
          <span
            className={`text-sm font-medium ${
              similarity > 0.9
                ? "text-green-400"
                : similarity > 0.7
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {(similarity * 100).toFixed(1)}% similar
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Semantic Changes (High Priority) */}
        {hasSemanticAnalysis && semanticChanges.length > 0 && (
          <div className="border-l-4 border-orange-500 pl-3">
            <div className="text-xs font-semibold text-orange-400 mb-2">
              ⚠️ SEMANTIC CHANGES (Review Required)
            </div>
            {semanticChanges.map((change, i) => (
              <ChangeDisplay
                key={`semantic-${i}`}
                change={change}
                isSemanticChange={true}
              />
            ))}
          </div>
        )}

        {/* Format Changes (Low Priority) */}
        {hasSemanticAnalysis && formatChanges.length > 0 && (
          <details className="border-l-4 border-gray-600 pl-3">
            <summary className="text-xs font-semibold text-gray-400 cursor-pointer hover:text-gray-300">
              ℹ️ FORMAT CHANGES ONLY ({formatChanges.length})
            </summary>
            <div className="mt-2 space-y-2">
              {formatChanges.map((change, i) => (
                <ChangeDisplay
                  key={`format-${i}`}
                  change={change}
                  isSemanticChange={false}
                />
              ))}
            </div>
          </details>
        )}

        {/* Original diff display for non-analyzed sections */}
        {!hasSemanticAnalysis && (
          <>
            {/* Changed Fields */}
            {diff.changed.map((change, i) => (
              <ChangeDisplay key={`changed-${i}`} change={change} />
            ))}

            {/* Added Fields */}
            {diff.added.map((change, i) => (
              <ChangeDisplay key={`added-${i}`} change={change} />
            ))}

            {/* Removed Fields */}
            {diff.removed.map((change, i) => (
              <ChangeDisplay key={`removed-${i}`} change={change} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

interface ChangeDisplayProps {
  change: DiffChange;
  isSemanticChange?: boolean;
}

function ChangeDisplay({ change, isSemanticChange }: ChangeDisplayProps) {
  const opacity = isSemanticChange === false ? "opacity-60" : "opacity-100";

  if (change.type === "changed") {
    return (
      <div
        className={`bg-gray-900 rounded-lg p-3 border border-yellow-700/50 ${opacity}`}
      >
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
    );
  }

  if (change.type === "added") {
    return (
      <div
        className={`bg-gray-900 rounded-lg p-3 border border-green-700/50 ${opacity}`}
      >
        <div className="text-xs font-mono text-green-400 mb-2">
          Added: {change.path}
        </div>
        <div className="bg-green-900/20 border border-green-700/50 rounded p-2">
          <pre className="text-xs text-gray-300 overflow-x-auto">
            {formatValue(change.to, 200)}
          </pre>
        </div>
      </div>
    );
  }

  if (change.type === "removed") {
    return (
      <div
        className={`bg-gray-900 rounded-lg p-3 border border-red-700/50 ${opacity}`}
      >
        <div className="text-xs font-mono text-red-400 mb-2">
          Removed: {change.path}
        </div>
        <div className="bg-red-900/20 border border-red-700/50 rounded p-2">
          <pre className="text-xs text-gray-300 overflow-x-auto">
            {formatValue(change.from, 200)}
          </pre>
        </div>
      </div>
    );
  }

  return null;
}
