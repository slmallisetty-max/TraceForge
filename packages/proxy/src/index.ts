import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { loadConfig, startConfigWatcher, stopConfigWatcher } from './config.js';
import { chatCompletionsHandler } from './handlers/chat-completions.js';
import { streamingChatCompletionsHandler } from './handlers/streaming-chat-completions.js';
import { completionsHandler } from './handlers/completions.js';
import { embeddingsHandler } from './handlers/embeddings.js';
import { anthropicHandler } from './handlers/anthropic.js';
import { geminiHandler } from './handlers/gemini.js';
import { ollamaHandler } from './handlers/ollama.js';
import { detectProvider } from './provider-detector.js';
import { LLMRequestSchema } from '@traceforge/shared';
import { ZodError } from 'zod';
import { storageCircuitBreaker } from './storage-metrics.js';
import { access, constants } from 'fs/promises';

// Load environment variables
config();

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: process.env.NODE_ENV === 'production' ? undefined : {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  bodyLimit: 1048576, // 1MB
});

// Register CORS
await fastify.register(cors, {
  origin: true,
});

// Per-provider rate limiting with dynamic limits
await fastify.register(rateLimit, {
  max: async (request) => {
    // Try to detect provider from request body
    try {
      const body = request.body as any;
      if (body?.model) {
        const provider = detectProvider(body.model, appConfig);
        // Provider-specific limits based on typical API quotas
        const limits: Record<string, number> = {
          'openai': 3500,      // OpenAI: 3,500/min for gpt-3.5, lower for gpt-4
          'anthropic': 1000,   // Anthropic: 1,000/min
          'gemini': 60,        // Gemini: 60/min for free tier
          'ollama': 1000,      // Ollama: local, generous limit
        };
        return limits[provider?.type || 'openai'] || 100;
      }
    } catch {
      // Fall back to default if detection fails
    }
    return 100; // Default conservative limit
  },
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Rate limit per IP + provider combination
    const body = request.body as any;
    const provider = body?.model ? 
      detectProvider(body.model, appConfig)?.type : 'unknown';
    return `${request.ip}:${provider}`;
  },
  errorResponseBuilder: () => ({
    error: {
      message: 'Rate limit exceeded. Please try again later.',
      type: 'rate_limit_error',
    },
  }),
});

// Load configuration
const appConfig = await loadConfig();

// Enhanced health check endpoint with dependency checks
fastify.get('/health', async (_request, reply) => {
  const checks: Record<string, { status: 'ok' | 'degraded' | 'error'; message?: string }> = {
    server: { status: 'ok' },
  };

  // Check trace directory is writable
  try {
    const tracesDir = process.env.TRACEFORGE_TRACES_DIR || '.ai-tests/traces';
    await access(tracesDir, constants.W_OK);
    checks.traceStorage = { status: 'ok' };
  } catch {
    checks.traceStorage = { 
      status: 'error', 
      message: 'Trace directory not writable' 
    };
  }

  // Check config is loadable
  try {
    await loadConfig();
    checks.configuration = { status: 'ok' };
  } catch {
    checks.configuration = { 
      status: 'error', 
      message: 'Failed to load configuration' 
    };
  }

  // Check storage circuit breaker status
  const storageMetrics = storageCircuitBreaker.getMetrics();
  if (storageMetrics.circuitOpen) {
    checks.storageCircuitBreaker = {
      status: 'error',
      message: `Circuit open after ${storageMetrics.consecutiveFailures} failures`,
    };
  } else if (storageMetrics.consecutiveFailures > 3) {
    checks.storageCircuitBreaker = {
      status: 'degraded',
      message: `${storageMetrics.consecutiveFailures} consecutive failures`,
    };
  } else {
    checks.storageCircuitBreaker = { status: 'ok' };
  }

  // Determine overall health
  const hasError = Object.values(checks).some(c => c.status === 'error');
  const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');
  const overallStatus = hasError ? 'error' : hasDegraded ? 'degraded' : 'ok';

  const statusCode = overallStatus === 'error' ? 503 : 200;

  return reply.code(statusCode).send({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Metrics endpoint for monitoring
fastify.get('/metrics', async () => {
  const storageMetrics = storageCircuitBreaker.getMetrics();
  
  return {
    storage: {
      traces_saved_total: storageMetrics.tracesSavedTotal,
      traces_failed_total: storageMetrics.tracesFailedTotal,
      consecutive_failures: storageMetrics.consecutiveFailures,
      circuit_open: storageMetrics.circuitOpen,
      success_rate_percent: storageCircuitBreaker.getSuccessRate().toFixed(2),
    },
    uptime_seconds: Math.floor(process.uptime()),
    memory_usage_mb: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };
});

// OpenAI-compatible endpoints with multi-provider support
fastify.post('/v1/chat/completions', async (request, reply) => {
  try {
    // Validate request body
    const body = LLMRequestSchema.parse(request.body);
    
    // Detect provider based on model
    const provider = detectProvider(body.model, appConfig);
    
    if (!provider) {
      return reply.code(400).send({
        error: {
          message: `Unable to detect provider for model: ${body.model}`,
          type: 'invalid_request_error',
        },
      });
    }

    // Route to appropriate provider handler
    switch (provider.type) {
      case 'anthropic':
        return anthropicHandler(request as any, reply, {
          base_url: provider.config.base_url,
          api_key: provider.apiKey,
        });

      case 'gemini':
        return geminiHandler(request as any, reply, {
          base_url: provider.config.base_url,
          api_key: provider.apiKey,
          model: body.model,
        });

      case 'ollama':
        return ollamaHandler(request as any, reply, {
          base_url: provider.config.base_url,
        });

      case 'openai':
      default:
        // Route to streaming handler if stream is enabled
        if (body.stream === true) {
          return streamingChatCompletionsHandler(request as any, reply);
        }
        return chatCompletionsHandler(request as any, reply);
    }
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          message: 'Invalid request body',
          type: 'invalid_request_error',
          details: error.errors,
        },
      });
    }
    throw error;
  }
});

fastify.post('/v1/completions', completionsHandler);
fastify.post('/v1/embeddings', embeddingsHandler);

// Start server
const start = async () => {
  try {
    const port = appConfig.proxy_port || 8787;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    // Start config file watcher for automatic cache invalidation
    await startConfigWatcher();
    
    fastify.log.info({ port, tracesDir: '.ai-tests/traces/' }, 'TraceForge Proxy started');
    
    // Show configured providers
    if (appConfig.providers && appConfig.providers.length > 0) {
      const enabledProviders = appConfig.providers
        .filter(p => p.enabled !== false)
        .map(p => ({
          name: p.name,
          type: p.type,
          default: p.default || false,
        }));
      fastify.log.info({ providers: enabledProviders }, 'Configured providers');
    } else {
      fastify.log.info('Using default provider: OpenAI');
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  fastify.log.info({ signal }, 'Shutdown signal received, closing gracefully...');
  try {
    await stopConfigWatcher();
    await fastify.close();
    fastify.log.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
