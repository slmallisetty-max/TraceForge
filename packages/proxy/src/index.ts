import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';
import { loadConfig } from './config.js';
import { chatCompletionsHandler } from './handlers/chat-completions.js';
import { streamingChatCompletionsHandler } from './handlers/streaming-chat-completions.js';
import { completionsHandler } from './handlers/completions.js';
import { embeddingsHandler } from './handlers/embeddings.js';
import { anthropicHandler } from './handlers/anthropic.js';
import { geminiHandler } from './handlers/gemini.js';
import { ollamaHandler } from './handlers/ollama.js';
import { detectProvider } from './provider-detector.js';

// Load environment variables
config();

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
  origin: true,
});

// Load configuration
const appConfig = await loadConfig();

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// OpenAI-compatible endpoints with multi-provider support
fastify.post('/v1/chat/completions', async (request, reply) => {
  const body = request.body as any;
  
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
});

fastify.post('/v1/completions', completionsHandler);
fastify.post('/v1/embeddings', embeddingsHandler);

// Start server
const start = async () => {
  try {
    const port = appConfig.proxy_port || 8787;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`\n🚀 TraceForge Proxy running on http://localhost:${port}`);
    console.log(`📊 Saving traces to: .ai-tests/traces/`);
    
    // Show configured providers
    if (appConfig.providers && appConfig.providers.length > 0) {
      console.log(`\n🔌 Configured providers:`);
      for (const provider of appConfig.providers) {
        if (provider.enabled !== false) {
          const defaultMarker = provider.default ? ' (default)' : '';
          console.log(`   - ${provider.name} (${provider.type})${defaultMarker}`);
        }
      }
    } else {
      console.log(`\n🔌 Using default provider: OpenAI`);
      console.log(`   Add providers in .ai-tests/config.yaml for multi-provider support`);
    }
    console.log();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  try {
    await fastify.close();
    console.log('Server closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
