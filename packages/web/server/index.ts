import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import { join, resolve, dirname } from 'path';
import { readdir, readFile, writeFile, access } from 'fs/promises';
import { existsSync } from 'fs';
import { parse, stringify } from 'yaml';
import type { Trace, Config, Test } from '@traceforge/shared';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find workspace root by looking for pnpm-workspace.yaml
function findWorkspaceRoot(): string {
  let currentDir = process.cwd();
  
  // Traverse up until we find pnpm-workspace.yaml or reach the root
  while (currentDir !== dirname(currentDir)) {
    if (existsSync(join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }
  
  // Fallback to cwd if not found
  return process.cwd();
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const WORKSPACE_ROOT = findWorkspaceRoot();
const TRACES_DIR = resolve(WORKSPACE_ROOT, '.ai-tests/traces');
const TESTS_DIR = resolve(WORKSPACE_ROOT, '.ai-tests/tests');
const CONFIG_PATH = resolve(WORKSPACE_ROOT, '.ai-tests/config.yaml');

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register CORS
await fastify.register(cors, {
  origin: isDevelopment ? 'http://localhost:5173' : true,
});

// API Routes

// GET /api/traces - List all traces
fastify.get('/api/traces', async (request, reply) => {
  try {
    const files = await readdir(TRACES_DIR);
    const traceFiles = files.filter(f => f.endsWith('.json'));

    const traces: Trace[] = [];
    
    for (const file of traceFiles) {
      const content = await readFile(join(TRACES_DIR, file), 'utf-8');
      const trace = JSON.parse(content);
      traces.push(trace);
    }

    // Sort by timestamp descending (newest first)
    traces.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { traces, total: traces.length };
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// GET /api/traces/:id - Get single trace
fastify.get<{ Params: { id: string } }>('/api/traces/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const files = await readdir(TRACES_DIR);
    const traceFile = files.find(f => f.includes(id));

    if (!traceFile) {
      return reply.code(404).send({ error: 'Trace not found' });
    }

    const content = await readFile(join(TRACES_DIR, traceFile), 'utf-8');
    const trace: Trace = JSON.parse(content);

    return { trace };
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// POST /api/tests - Create test from trace
fastify.post<{ Body: { traceId: string; name: string; description?: string } }>(
  '/api/tests',
  async (request, reply) => {
    try {
      const { traceId, name, description } = request.body;

      // Find and load the trace
      const files = await readdir(TRACES_DIR);
      const traceFile = files.find(f => f.includes(traceId));

      if (!traceFile) {
        return reply.code(404).send({ error: 'Trace not found' });
      }

      const content = await readFile(join(TRACES_DIR, traceFile), 'utf-8');
      const trace: Trace = JSON.parse(content);

      if (!trace.response) {
        return reply.code(400).send({ error: 'Cannot create test from failed trace' });
      }

      // Extract response content for default assertion
      let defaultAssertionValue = '';
      if (trace.response.choices && trace.response.choices.length > 0) {
        const firstChoice = trace.response.choices[0];
        if (firstChoice.message?.content) {
          defaultAssertionValue = firstChoice.message.content.substring(0, 50);
        } else if (firstChoice.text) {
          defaultAssertionValue = firstChoice.text.substring(0, 50);
        }
      }

      // Create test
      const test: Test = {
        id: randomUUID(),
        name: name || `Test from ${trace.id.substring(0, 8)}`,
        description,
        trace_id: trace.id,
        request: trace.request,
        assertions: [
          {
            type: 'contains',
            field: 'choices.0.message.content',
            value: defaultAssertionValue,
          },
        ],
        created_at: new Date().toISOString(),
      };

      // Save test as YAML
      const testYaml = stringify(test);
      const filename = `test-${test.id}.yaml`;
      const filepath = join(TESTS_DIR, filename);
      
      await writeFile(filepath, testYaml, 'utf-8');

      return reply.code(201).send({ 
        test,
        filename,
        message: 'Test created successfully' 
      });
    } catch (error: any) {
      request.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  }
);

// GET /api/tests - List all tests
fastify.get('/api/tests', async (request, reply) => {
  try {
    const files = await readdir(TESTS_DIR);
    const testFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    const tests: Test[] = [];
    
    for (const file of testFiles) {
      const content = await readFile(join(TESTS_DIR, file), 'utf-8');
      const test = parse(content);
      tests.push(test);
    }

    // Sort by created_at descending
    tests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { tests, total: tests.length };
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// GET /api/analytics - Get analytics data
fastify.get('/api/analytics', async (request, reply) => {
  try {
    // Load all traces
    const traceFiles = await readdir(TRACES_DIR);
    const traces: Trace[] = [];
    
    for (const file of traceFiles.filter(f => f.endsWith('.json'))) {
      const content = await readFile(join(TRACES_DIR, file), 'utf-8');
      traces.push(JSON.parse(content));
    }

    // Load all tests
    const testFiles = await readdir(TESTS_DIR);
    const tests: Test[] = [];
    
    for (const file of testFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))) {
      const content = await readFile(join(TESTS_DIR, file), 'utf-8');
      tests.push(parse(content));
    }

    // Calculate time ranges
    const now = Date.now();
    const last7Days = now - 7 * 24 * 60 * 60 * 1000;
    const last24Hours = now - 24 * 60 * 60 * 1000;

    // Filter traces by time
    const tracesLast7Days = traces.filter(t => Date.parse(t.timestamp) > last7Days);
    const tracesLast24Hours = traces.filter(t => Date.parse(t.timestamp) > last24Hours);

    // Calculate metrics
    const totalTraces = traces.length;
    const totalTests = tests.length;
    const successfulTraces = traces.filter(t => t.metadata.status === 'success').length;
    const successRate = totalTraces > 0 ? (successfulTraces / totalTraces) * 100 : 0;

    // Extract unique models
    const modelsUsed = [...new Set(traces.map(t => t.request.model))];
    const modelCounts = modelsUsed.map(model => ({
      model,
      count: traces.filter(t => t.request.model === model).length,
    }));

    // Calculate average metrics
    const avgDuration = traces.length > 0
      ? traces.reduce((sum, t) => sum + t.metadata.duration_ms, 0) / traces.length
      : 0;

    const tracesWithTokens = traces.filter(t => t.metadata.tokens_used);
    const avgTokens = tracesWithTokens.length > 0
      ? tracesWithTokens.reduce((sum, t) => sum + (t.metadata.tokens_used || 0), 0) / tracesWithTokens.length
      : 0;

    // Calculate endpoint usage
    const endpoints = [...new Set(traces.map(t => t.endpoint))];
    const endpointCounts = endpoints.map(endpoint => ({
      endpoint,
      count: traces.filter(t => t.endpoint === endpoint).length,
    }));

    // Generate timeline data (last 7 days, grouped by day)
    const timeline: Array<{ date: string; count: number; success: number; error: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = date.setHours(0, 0, 0, 0);
      const dayEnd = date.setHours(23, 59, 59, 999);
      
      const dayTraces = traces.filter(t => {
        const ts = Date.parse(t.timestamp);
        return ts >= dayStart && ts <= dayEnd;
      });

      timeline.push({
        date: dateStr,
        count: dayTraces.length,
        success: dayTraces.filter(t => t.metadata.status === 'success').length,
        error: dayTraces.filter(t => t.metadata.status === 'error').length,
      });
    }

    // Detect streaming traces
    const streamingTraces = traces.filter(t => 'chunks' in t);
    const streamingCount = streamingTraces.length;
    const streamingRate = totalTraces > 0 ? (streamingCount / totalTraces) * 100 : 0;

    return {
      overview: {
        total_traces: totalTraces,
        total_tests: totalTests,
        traces_last_7_days: tracesLast7Days.length,
        traces_last_24_hours: tracesLast24Hours.length,
        success_rate: Math.round(successRate * 10) / 10,
        streaming_rate: Math.round(streamingRate * 10) / 10,
      },
      performance: {
        avg_duration_ms: Math.round(avgDuration),
        avg_tokens: Math.round(avgTokens),
      },
      models: modelCounts.sort((a, b) => b.count - a.count),
      endpoints: endpointCounts.sort((a, b) => b.count - a.count),
      timeline,
    };
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// GET /api/config - Get current configuration
fastify.get('/api/config', async (request, reply) => {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    const config: Config = parse(content);
    return reply.send(config);
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// PUT /api/config - Update configuration
fastify.put('/api/config', async (request, reply) => {
  try {
    const config = request.body as Config;
    
    // Validation
    if (!config.upstream_url || typeof config.upstream_url !== 'string') {
      return reply.code(400).send({ error: 'upstream_url is required and must be a string' });
    }
    if (!config.api_key_env_var || typeof config.api_key_env_var !== 'string') {
      return reply.code(400).send({ error: 'api_key_env_var is required and must be a string' });
    }
    if (typeof config.save_traces !== 'boolean') {
      return reply.code(400).send({ error: 'save_traces must be a boolean' });
    }
    if (!config.proxy_port || typeof config.proxy_port !== 'number' || config.proxy_port < 1 || config.proxy_port > 65535) {
      return reply.code(400).send({ error: 'proxy_port must be a number between 1 and 65535' });
    }
    if (config.web_port !== undefined && (typeof config.web_port !== 'number' || config.web_port < 1 || config.web_port > 65535)) {
      return reply.code(400).send({ error: 'web_port must be a number between 1 and 65535' });
    }
    if (config.max_trace_retention !== undefined && (typeof config.max_trace_retention !== 'number' || config.max_trace_retention < 1)) {
      return reply.code(400).send({ error: 'max_trace_retention must be a positive number' });
    }
    if (config.redact_fields !== undefined && !Array.isArray(config.redact_fields)) {
      return reply.code(400).send({ error: 'redact_fields must be an array' });
    }
    
    // Convert to YAML and save
    const yaml = stringify(config);
    await writeFile(CONFIG_PATH, yaml, 'utf-8');
    
    request.log.info('Configuration updated');
    return reply.send({ success: true, config });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: error.message });
  }
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Serve static files in production
if (!isDevelopment) {
  const clientPath = resolve(__dirname, '../client');
  
  try {
    await access(clientPath);
    await fastify.register(staticFiles, {
      root: clientPath,
      prefix: '/',
    });

    // SPA fallback - serve index.html for all non-API routes
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        reply.code(404).send({ error: 'Not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
    
    fastify.log.info('Serving static files from dist/client');
  } catch (error) {
    fastify.log.warn('Client build not found. Run `pnpm build` to generate production files.');
  }
} else {
  fastify.log.info('Development mode: Client should be served by Vite on port 5173');
}

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || process.env.WEB_PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`\n🚀 TraceForge Web ${isDevelopment ? '(Development)' : '(Production)'}`);
    console.log(`📊 API: http://localhost:${port}/api`);
    if (isDevelopment) {
      console.log(`🎨 UI:  http://localhost:5173 (Vite dev server)`);
      console.log(`💡 Tip: Run 'pnpm dev' from root to start all services`);
    } else {
      console.log(`🎨 UI:  http://localhost:${port}`);
    }
    console.log();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
