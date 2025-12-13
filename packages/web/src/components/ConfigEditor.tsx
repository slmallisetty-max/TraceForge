import React, { useState, useEffect } from 'react';
import { fetchConfig, updateConfig, type Config } from '../api/client';

export default function ConfigEditor() {
  const [config, setConfig] = useState<Config | null>(null);
  const [formData, setFormData] = useState<Config>({
    upstream_url: '',
    api_key_env_var: '',
    save_traces: true,
    proxy_port: 8787,
    web_port: 3001,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchConfig();
      setConfig(data);
      setFormData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Upstream URL validation
    if (!formData.upstream_url) {
      errors.upstream_url = 'Upstream URL is required';
    } else {
      try {
        new URL(formData.upstream_url);
      } catch {
        errors.upstream_url = 'Must be a valid URL';
      }
    }

    // API key env var validation
    if (!formData.api_key_env_var) {
      errors.api_key_env_var = 'API key environment variable is required';
    } else if (!/^[A-Z_][A-Z0-9_]*$/.test(formData.api_key_env_var)) {
      errors.api_key_env_var = 'Must be a valid environment variable name (e.g., OPENAI_API_KEY)';
    }

    // Port validation
    if (!formData.proxy_port || formData.proxy_port < 1 || formData.proxy_port > 65535) {
      errors.proxy_port = 'Proxy port must be between 1 and 65535';
    }

    if (formData.web_port !== undefined && (formData.web_port < 1 || formData.web_port > 65535)) {
      errors.web_port = 'Web port must be between 1 and 65535';
    }

    // Retention validation
    if (formData.max_trace_retention !== undefined && formData.max_trace_retention < 1) {
      errors.max_trace_retention = 'Max trace retention must be at least 1 day';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      await updateConfig(formData);
      
      setSuccess(true);
      setConfig(formData);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setFormData(config);
      setValidationErrors({});
      setError(null);
      setSuccess(false);
    }
  };

  const handleAddRedactField = () => {
    const fields = formData.redact_fields || [];
    setFormData({ ...formData, redact_fields: [...fields, ''] });
  };

  const handleRemoveRedactField = (index: number) => {
    const fields = formData.redact_fields || [];
    setFormData({
      ...formData,
      redact_fields: fields.filter((_, i) => i !== index),
    });
  };

  const handleRedactFieldChange = (index: number, value: string) => {
    const fields = formData.redact_fields || [];
    const updated = [...fields];
    updated[index] = value;
    setFormData({ ...formData, redact_fields: updated });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-400">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">⚙️ Configuration Editor</h1>
        <p className="text-gray-400">
          Edit your TraceForge configuration. Changes will be saved to .ai-tests/config.yaml
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-500 rounded text-red-400">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-900/20 border border-green-500 rounded text-green-400">
          <strong>Success!</strong> Configuration saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Upstream URL */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Upstream URL <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.upstream_url}
            onChange={(e) => setFormData({ ...formData, upstream_url: e.target.value })}
            className={`w-full px-4 py-2 bg-gray-800 border ${
              validationErrors.upstream_url ? 'border-red-500' : 'border-gray-700'
            } rounded text-white focus:outline-none focus:border-blue-500`}
            placeholder="https://api.openai.com"
          />
          {validationErrors.upstream_url && (
            <p className="mt-1 text-sm text-red-400">{validationErrors.upstream_url}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            The LLM provider URL to proxy requests to
          </p>
        </div>

        {/* API Key Environment Variable */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            API Key Environment Variable <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={formData.api_key_env_var}
            onChange={(e) => setFormData({ ...formData, api_key_env_var: e.target.value })}
            className={`w-full px-4 py-2 bg-gray-800 border ${
              validationErrors.api_key_env_var ? 'border-red-500' : 'border-gray-700'
            } rounded text-white focus:outline-none focus:border-blue-500`}
            placeholder="OPENAI_API_KEY"
          />
          {validationErrors.api_key_env_var && (
            <p className="mt-1 text-sm text-red-400">{validationErrors.api_key_env_var}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Name of the environment variable containing your API key
          </p>
        </div>

        {/* Save Traces */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.save_traces}
              onChange={(e) => setFormData({ ...formData, save_traces: e.target.checked })}
              className="w-5 h-5 bg-gray-800 border-gray-700 rounded"
            />
            <span className="text-sm font-medium text-gray-300">Save Traces</span>
          </label>
          <p className="mt-1 ml-8 text-sm text-gray-500">
            Enable to save all proxied requests and responses
          </p>
        </div>

        {/* Ports */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Proxy Port <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={formData.proxy_port}
              onChange={(e) => setFormData({ ...formData, proxy_port: parseInt(e.target.value) })}
              className={`w-full px-4 py-2 bg-gray-800 border ${
                validationErrors.proxy_port ? 'border-red-500' : 'border-gray-700'
              } rounded text-white focus:outline-none focus:border-blue-500`}
              min="1"
              max="65535"
            />
            {validationErrors.proxy_port && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.proxy_port}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">Port for the proxy server</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Web Port (Optional)
            </label>
            <input
              type="number"
              value={formData.web_port || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  web_port: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className={`w-full px-4 py-2 bg-gray-800 border ${
                validationErrors.web_port ? 'border-red-500' : 'border-gray-700'
              } rounded text-white focus:outline-none focus:border-blue-500`}
              min="1"
              max="65535"
              placeholder="3001"
            />
            {validationErrors.web_port && (
              <p className="mt-1 text-sm text-red-400">{validationErrors.web_port}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">Port for the web UI</p>
          </div>
        </div>

        {/* Max Trace Retention */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Trace Retention (Days)
          </label>
          <input
            type="number"
            value={formData.max_trace_retention || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                max_trace_retention: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className={`w-full px-4 py-2 bg-gray-800 border ${
              validationErrors.max_trace_retention ? 'border-red-500' : 'border-gray-700'
            } rounded text-white focus:outline-none focus:border-blue-500`}
            min="1"
            placeholder="30"
          />
          {validationErrors.max_trace_retention && (
            <p className="mt-1 text-sm text-red-400">{validationErrors.max_trace_retention}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            Automatically delete traces older than this many days (leave empty to keep all traces)
          </p>
        </div>

        {/* Redact Fields */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Redact Fields (Optional)
            </label>
            <button
              type="button"
              onClick={handleAddRedactField}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              + Add Field
            </button>
          </div>
          
          {(formData.redact_fields || []).length === 0 ? (
            <p className="text-sm text-gray-500 italic">No fields configured for redaction</p>
          ) : (
            <div className="space-y-2">
              {(formData.redact_fields || []).map((field, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={field}
                    onChange={(e) => handleRedactFieldChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., api_key, authorization"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRedactField(index)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Field names to redact from saved traces (e.g., api_key, authorization)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 pt-4 border-t border-gray-700">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium rounded"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={loadConfig}
            disabled={loading || saving}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium rounded"
          >
            Reload from File
          </button>
        </div>
      </form>

      {/* Configuration Preview */}
      <div className="mt-8 p-6 bg-gray-800 border border-gray-700 rounded">
        <h2 className="text-lg font-semibold text-white mb-4">Current Configuration Preview</h2>
        <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700 rounded">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">💡 Configuration Help</h3>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• <strong>Upstream URL:</strong> The base URL of your LLM provider (e.g., OpenAI, Azure)</li>
          <li>• <strong>API Key:</strong> Set the environment variable before starting the proxy</li>
          <li>• <strong>Ports:</strong> Make sure they don't conflict with other services</li>
          <li>• <strong>Redact Fields:</strong> Protects sensitive data in saved traces</li>
          <li>• <strong>Retention:</strong> Helps manage disk space by auto-deleting old traces</li>
        </ul>
      </div>
    </div>
  );
}
