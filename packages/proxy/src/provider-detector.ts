import type { Config, ProviderConfig, ProviderType } from '@traceforge/shared';

export interface DetectedProvider {
  type: ProviderType;
  config: ProviderConfig;
  apiKey: string;
}

// Model prefixes for provider detection
const MODEL_PREFIXES = {
  anthropic: ['claude-', 'claude'],
  gemini: ['gemini-', 'gemini'],
  ollama: ['llama', 'mistral', 'codellama', 'phi', 'vicuna'],
  openai: ['gpt-', 'text-', 'davinci', 'curie', 'babbage', 'ada'],
};

export function detectProvider(
  model: string,
  config: Config
): DetectedProvider | null {
  const modelLower = model.toLowerCase();

  // Check configured providers first
  if (config.providers) {
    for (const provider of config.providers) {
      if (!provider.enabled) continue;

      // Check if model matches provider type
      const prefixes = MODEL_PREFIXES[provider.type] || [];
      if (prefixes.some((prefix) => modelLower.startsWith(prefix))) {
        const apiKey = provider.api_key_env_var
          ? process.env[provider.api_key_env_var] || ''
          : '';

        return {
          type: provider.type,
          config: provider,
          apiKey,
        };
      }

      // Check if this is the default provider
      if (provider.default) {
        const apiKey = provider.api_key_env_var
          ? process.env[provider.api_key_env_var] || ''
          : '';

        return {
          type: provider.type,
          config: provider,
          apiKey,
        };
      }
    }
  }

  // Fall back to model-based detection with default config
  if (modelLower.startsWith('claude')) {
    return {
      type: 'anthropic',
      config: {
        type: 'anthropic',
        name: 'Anthropic',
        base_url: 'https://api.anthropic.com',
        api_key_env_var: 'ANTHROPIC_API_KEY',
      },
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    };
  }

  if (modelLower.startsWith('gemini')) {
    return {
      type: 'gemini',
      config: {
        type: 'gemini',
        name: 'Google Gemini',
        base_url: 'https://generativelanguage.googleapis.com',
        api_key_env_var: 'GOOGLE_API_KEY',
      },
      apiKey: process.env.GOOGLE_API_KEY || '',
    };
  }

  // Check for common local model names (Ollama)
  const ollamaModels = ['llama', 'mistral', 'codellama', 'phi', 'vicuna'];
  if (ollamaModels.some((name) => modelLower.includes(name))) {
    return {
      type: 'ollama',
      config: {
        type: 'ollama',
        name: 'Ollama',
        base_url: 'http://localhost:11434',
      },
      apiKey: '',
    };
  }

  // Default to OpenAI
  return {
    type: 'openai',
    config: {
      type: 'openai',
      name: 'OpenAI',
      base_url: config.upstream_url,
      api_key_env_var: config.api_key_env_var,
    },
    apiKey: process.env[config.api_key_env_var] || '',
  };
}

export function getProviderByType(
  type: ProviderType,
  config: Config
): DetectedProvider | null {
  if (config.providers) {
    const provider = config.providers.find(
      (p) => p.type === type && p.enabled !== false
    );
    if (provider) {
      const apiKey = provider.api_key_env_var
        ? process.env[provider.api_key_env_var] || ''
        : '';
      return {
        type: provider.type,
        config: provider,
        apiKey,
      };
    }
  }

  // Return defaults
  const defaults: Record<ProviderType, DetectedProvider> = {
    openai: {
      type: 'openai',
      config: {
        type: 'openai',
        name: 'OpenAI',
        base_url: config.upstream_url,
        api_key_env_var: config.api_key_env_var,
      },
      apiKey: process.env[config.api_key_env_var] || '',
    },
    anthropic: {
      type: 'anthropic',
      config: {
        type: 'anthropic',
        name: 'Anthropic',
        base_url: 'https://api.anthropic.com',
        api_key_env_var: 'ANTHROPIC_API_KEY',
      },
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    gemini: {
      type: 'gemini',
      config: {
        type: 'gemini',
        name: 'Google Gemini',
        base_url: 'https://generativelanguage.googleapis.com',
        api_key_env_var: 'GOOGLE_API_KEY',
      },
      apiKey: process.env.GOOGLE_API_KEY || '',
    },
    ollama: {
      type: 'ollama',
      config: {
        type: 'ollama',
        name: 'Ollama',
        base_url: 'http://localhost:11434',
      },
      apiKey: '',
    },
  };

  return defaults[type] || null;
}
