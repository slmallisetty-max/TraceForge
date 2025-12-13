import { useState, useEffect } from 'react';
import { fetchAnalytics, type AnalyticsData } from '../api/client';

export default function Dashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAnalytics() {
    try {
      const data = await fetchAnalytics();
      setAnalytics(data);
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
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
        <p className="text-red-400">Error: {error || 'Failed to load analytics'}</p>
        <button
          onClick={loadAnalytics}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const { overview, performance, models, endpoints, timeline } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">📊 Dashboard</h1>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
        >
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Traces"
          value={overview.total_traces.toLocaleString()}
          icon="📝"
          color="blue"
        />
        <StatCard
          title="Total Tests"
          value={overview.total_tests.toLocaleString()}
          icon="🧪"
          color="purple"
        />
        <StatCard
          title="Last 24h"
          value={overview.traces_last_24_hours.toLocaleString()}
          icon="⏰"
          color="green"
        />
        <StatCard
          title="Last 7 Days"
          value={overview.traces_last_7_days.toLocaleString()}
          icon="📅"
          color="cyan"
        />
        <StatCard
          title="Success Rate"
          value={`${overview.success_rate}%`}
          icon="✓"
          color={overview.success_rate >= 90 ? 'green' : overview.success_rate >= 70 ? 'yellow' : 'red'}
        />
        <StatCard
          title="Streaming"
          value={`${overview.streaming_rate}%`}
          icon="🌊"
          color="indigo"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">⚡ Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Response Time</span>
              <span className="text-white font-mono text-lg">
                {performance.avg_duration_ms}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Token Usage</span>
              <span className="text-white font-mono text-lg">
                {performance.avg_tokens.toLocaleString()} tokens
              </span>
            </div>
          </div>
        </div>

        {/* Models */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🤖 Models Used</h3>
          <div className="space-y-2">
            {models.length > 0 ? (
              models.slice(0, 5).map((model, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-gray-300 truncate">{model.model}</span>
                  <span className="text-blue-400 font-mono">{model.count}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No models used yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">🔌 Endpoint Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {endpoints.length > 0 ? (
            endpoints.map((endpoint, idx) => (
              <div key={idx} className="bg-gray-900 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1 font-mono truncate">
                  {endpoint.endpoint}
                </div>
                <div className="text-2xl font-bold text-white">
                  {endpoint.count.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">requests</div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No endpoints used yet</p>
          )}
        </div>
      </div>

      {/* Timeline Chart */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📈 Activity Timeline (Last 7 Days)</h3>
        {timeline.length > 0 ? (
          <div className="space-y-4">
            {/* Bar Chart */}
            <div className="flex items-end justify-between h-48 gap-2">
              {timeline.map((day, idx) => {
                const maxCount = Math.max(...timeline.map(d => d.count));
                
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '100%' }}>
                      {/* Success bar */}
                      {day.success > 0 && (
                        <div
                          className="bg-green-600 rounded-t"
                          style={{ height: `${(day.success / maxCount) * 100}%` }}
                          title={`${day.success} successful`}
                        />
                      )}
                      {/* Error bar */}
                      {day.error > 0 && (
                        <div
                          className="bg-red-600"
                          style={{ height: `${(day.error / maxCount) * 100}%` }}
                          title={`${day.error} errors`}
                        />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      {new Date(day.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {day.count}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded"></div>
                <span className="text-gray-400">Success</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-600 rounded"></div>
                <span className="text-gray-400">Error</span>
              </div>
            </div>

            {/* Summary Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 border-b border-gray-700">
                  <tr>
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">Success</th>
                    <th className="text-right py-2">Error</th>
                    <th className="text-right py-2">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  {timeline.map((day, idx) => {
                    const rate = day.count > 0 
                      ? ((day.success / day.count) * 100).toFixed(1)
                      : '0.0';
                    
                    return (
                      <tr key={idx} className="border-b border-gray-800">
                        <td className="py-2">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </td>
                        <td className="text-right font-mono">{day.count}</td>
                        <td className="text-right font-mono text-green-400">{day.success}</td>
                        <td className="text-right font-mono text-red-400">{day.error}</td>
                        <td className="text-right font-mono">{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No activity data available</p>
        )}
      </div>

      {/* Footer Note */}
      <div className="text-center text-sm text-gray-500">
        Auto-refreshes every 30 seconds
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'purple' | 'green' | 'cyan' | 'yellow' | 'red' | 'indigo';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'border-blue-700 bg-blue-900/20',
    purple: 'border-purple-700 bg-purple-900/20',
    green: 'border-green-700 bg-green-900/20',
    cyan: 'border-cyan-700 bg-cyan-900/20',
    yellow: 'border-yellow-700 bg-yellow-900/20',
    red: 'border-red-700 bg-red-900/20',
    indigo: 'border-indigo-700 bg-indigo-900/20',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}
