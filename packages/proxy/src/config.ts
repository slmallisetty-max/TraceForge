import { readFile, mkdir, watch as fsWatch } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { parse } from 'yaml';
import type { Config } from '@traceforge/shared';
import { getDefaultVCRConfig } from './vcr';

const DEFAULT_CONFIG: Config = {
  upstream_url: 'https://api.openai.com',
  api_key_env_var: 'OPENAI_API_KEY',
  save_traces: true,
  proxy_port: 8787,
  web_port: 3001,
};

// Allow custom config directory via environment variable
const CONFIG_DIR = process.env.TRACEFORGE_CONFIG_DIR || '.ai-tests';
const CONFIG_PATH = resolve(process.cwd(), `${CONFIG_DIR}/config.yaml`);

// Cache the loaded config with TTL
let cachedConfig: Config | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache TTL

// File watcher for automatic cache invalidation
let configWatcherController: AbortController | null = null;

/**
 * Start watching config file for changes
 */
export async function startConfigWatcher(): Promise<void> {
  if (!existsSync(CONFIG_PATH)) {
    return; // No config file to watch yet
  }

  try {
    configWatcherController = new AbortController();
    const watcher = fsWatch(CONFIG_PATH, { signal: configWatcherController.signal });

    // Process file changes asynchronously
    (async () => {
      try {
        for await (const event of watcher) {
          if (event.eventType === 'change') {
            clearConfigCache();
            console.log('[CONFIG] Configuration file changed, cache invalidated');
          }
        }
      } catch (error: any) {
        // Watcher closed or errored, this is normal during shutdown
        if (error.name !== 'AbortError') {
          console.warn('[CONFIG] Config watcher error:', error.message);
        }
      }
    })();
  } catch (error) {
    console.warn('[CONFIG] Failed to start config file watcher:', error);
  }
}

/**
 * Stop watching config file
 */
export async function stopConfigWatcher(): Promise<void> {
  if (configWatcherController) {
    configWatcherController.abort();
    configWatcherController = null;
  }
}

/**
 * Clear the config cache (useful for testing or runtime config updates)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}

export async function loadConfig(): Promise<Config> {
  // Return cached config if within TTL
  const now = Date.now();
  if (cachedConfig !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedConfig;
  }

  // Create .ai-tests directory if it doesn't exist
  const aiTestsDir = resolve(process.cwd(), CONFIG_DIR);
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
      
      // Add VCR config from environment variables or config file
      if (!loadedConfig.vcr) {
        loadedConfig.vcr = getDefaultVCRConfig();
      }
      
      cachedConfig = loadedConfig;
      cacheTimestamp = now;
      return loadedConfig;
    } catch (error) {
      console.warn('Failed to load config, using defaults:', error);
      const defaultWithVCR = { ...DEFAULT_CONFIG, vcr: getDefaultVCRConfig() };
      cachedConfig = defaultWithVCR;
      cacheTimestamp = now;
      return defaultWithVCR;
    }
  }

  const defaultWithVCR = { ...DEFAULT_CONFIG, vcr: getDefaultVCRConfig() };
  cachedConfig = defaultWithVCR;
  cacheTimestamp = now;
  return defaultWithVCR;
}

export function getApiKey(config: Config): string {
  const apiKey = process.env[config.api_key_env_var];
  if (!apiKey) {
    throw new Error(`API key not found in environment variable: ${config.api_key_env_var}`);
  }
  return apiKey;
}
