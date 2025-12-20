import { readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import type { Config } from '@traceforge/shared';

const DEFAULT_CONFIG: Config = {
  upstream_url: 'https://api.openai.com',
  api_key_env_var: 'OPENAI_API_KEY',
  save_traces: true,
  proxy_port: 8787,
  web_port: 3001,
};

const CONFIG_PATH = resolve(process.cwd(), '.ai-tests/config.yaml');

// Cache the loaded config
let cachedConfig: Config | null = null;

export async function loadConfig(): Promise<Config> {
  // Return cached config if already loaded
  if (cachedConfig !== null) {
    return cachedConfig;
  }

  // Create .ai-tests directory if it doesn't exist
  const aiTestsDir = resolve(process.cwd(), '.ai-tests');
  if (!existsSync(aiTestsDir)) {
    await mkdir(aiTestsDir, { recursive: true });
    await mkdir(resolve(aiTestsDir, 'traces'), { recursive: true });
    await mkdir(resolve(aiTestsDir, 'tests'), { recursive: true });
  }

  // Try to load config file
  if (existsSync(CONFIG_PATH)) {
    try {
      const content = await readFile(CONFIG_PATH, 'utf-8');
      const userConfig = parse(content);
      const loadedConfig = { ...DEFAULT_CONFIG, ...userConfig };
      cachedConfig = loadedConfig;
      return loadedConfig;
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
      cachedConfig = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }

  cachedConfig = DEFAULT_CONFIG;
  return DEFAULT_CONFIG;
}

export function getApiKey(config: Config): string {
  const apiKey = process.env[config.api_key_env_var];
  if (!apiKey) {
    throw new Error(`API key not found in environment variable: ${config.api_key_env_var}`);
  }
  return apiKey;
}
