import { useState, useEffect } from 'react';

interface RedactionAudit {
  id: number;
  trace_id: string;
  field_path: string;
  original_value_hash: string;
  pseudonym: string;
  redacted_at: string;
  user_id?: string;
  reason?: string;
}

interface RedactionAuditLogProps {
  traceId: string;
}

export function RedactionAuditLog({ traceId }: RedactionAuditLogProps) {
  const [audits, setAudits] = useState<RedactionAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadAuditLog();
  }, [traceId]);

  async function loadAuditLog() {
    try {
      const response = await fetch(`/api/traces/${traceId}/redaction-audit`);
      if (!response.ok) {
        // If endpoint doesn't exist yet, gracefully handle
        if (response.status === 404) {
          setAudits([]);
          setError(null);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setAudits(data.audits || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Redaction Audit Log</h2>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (audits.length === 0) {
    return null; // Don't show if no redactions
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Redaction Audit Log</h2>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          {expanded ? 'Hide' : 'Show'} ({audits.length} redactions)
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded p-3 mb-4">
          <p className="text-red-400 text-sm">Error loading audit log: {error}</p>
        </div>
      )}

      {expanded && (
        <div className="space-y-3">
          {audits.map((audit) => (
            <div
              key={audit.id}
              className="bg-gray-900 border border-gray-700 rounded p-4"
            >
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400">Field Path</p>
                  <p className="text-white font-mono">{audit.field_path}</p>
                </div>
                <div>
                  <p className="text-gray-400">Pseudonym</p>
                  <p className="text-green-400 font-mono">{audit.pseudonym}</p>
                </div>
                <div>
                  <p className="text-gray-400">Redacted At</p>
                  <p className="text-white">
                    {new Date(audit.redacted_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Original Hash</p>
                  <p className="text-gray-500 font-mono text-xs truncate">
                    {audit.original_value_hash}
                  </p>
                </div>
                {audit.user_id && (
                  <div>
                    <p className="text-gray-400">User</p>
                    <p className="text-white">{audit.user_id}</p>
                  </div>
                )}
                {audit.reason && (
                  <div className="col-span-2">
                    <p className="text-gray-400">Reason</p>
                    <p className="text-white">{audit.reason}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500">
        <p>
          🔒 Redacted data is pseudonymized with reversible encryption. Contact your
          administrator to decrypt sensitive fields.
        </p>
      </div>
    </div>
  );
}
