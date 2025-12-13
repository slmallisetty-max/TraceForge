import { useState, useEffect } from 'react';
import type { StreamingTrace } from '@traceforge/shared';

interface StreamingTraceDetailProps {
  trace: StreamingTrace;
}

export function StreamingTraceDetail({ trace }: StreamingTraceDetailProps) {
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayedContent, setReplayedContent] = useState('');
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);

  const startReplay = () => {
    setIsReplaying(true);
    setReplayedContent('');
    setCurrentChunkIndex(0);
  };

  useEffect(() => {
    if (!isReplaying || currentChunkIndex >= trace.chunks.length) {
      if (currentChunkIndex >= trace.chunks.length && isReplaying) {
        setIsReplaying(false);
      }
      return;
    }

    const chunk = trace.chunks[currentChunkIndex];
    const delay = chunk.delta_ms || 100;

    const timer = setTimeout(() => {
      const content = chunk.choices[0]?.delta?.content || '';
      setReplayedContent((prev) => prev + content);
      setCurrentChunkIndex((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [isReplaying, currentChunkIndex, trace.chunks]);

  return (
    <div className="space-y-4">
      {/* Streaming Metadata */}
      <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-purple-300 mb-3">
          🌊 Streaming Metadata
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Chunks:</span>
            <span className="ml-2 text-white font-mono">{trace.total_chunks}</span>
          </div>
          <div>
            <span className="text-gray-400">Stream Duration:</span>
            <span className="ml-2 text-white font-mono">{trace.stream_duration_ms}ms</span>
          </div>
          <div>
            <span className="text-gray-400">First Chunk Latency:</span>
            <span className="ml-2 text-white font-mono">{trace.first_chunk_latency_ms}ms</span>
          </div>
          <div>
            <span className="text-gray-400">Avg Chunk Time:</span>
            <span className="ml-2 text-white font-mono">
              {Math.round(trace.stream_duration_ms / trace.total_chunks)}ms
            </span>
          </div>
        </div>
      </div>

      {/* Replay Controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-300">
            🎬 Stream Replay
          </h3>
          <button
            onClick={startReplay}
            disabled={isReplaying}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isReplaying
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {isReplaying ? 'Replaying...' : 'Replay Stream'}
          </button>
        </div>
        
        {/* Replay Output */}
        <div className="bg-gray-900 rounded-lg p-4 min-h-[100px] font-mono text-sm text-gray-300">
          {replayedContent || (
            <span className="text-gray-500 italic">
              Click "Replay Stream" to see the streaming response in real-time
            </span>
          )}
        </div>
        
        {/* Progress */}
        {isReplaying && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Chunk {currentChunkIndex} of {trace.total_chunks}</span>
              <span>{Math.round((currentChunkIndex / trace.total_chunks) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(currentChunkIndex / trace.total_chunks) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chunk Timeline */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-300 mb-3">
          📊 Chunk Timeline
        </h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {trace.chunks.map((chunk, index) => (
            <div
              key={index}
              className="flex items-center text-xs font-mono bg-gray-900 rounded p-2"
            >
              <span className="text-gray-500 w-12">#{index + 1}</span>
              <span className="text-purple-400 w-20">+{chunk.delta_ms || 0}ms</span>
              <span className="text-gray-400 flex-1 truncate">
                {chunk.choices[0]?.delta?.content || 
                 chunk.choices[0]?.delta?.role || 
                 '(no content)'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Full Response */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-300 mb-3">
          💬 Complete Response
        </h3>
        <pre className="bg-gray-900 rounded-lg p-4 text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap">
          {trace.response?.choices[0]?.message?.content || 'No content'}
        </pre>
      </div>
    </div>
  );
}
