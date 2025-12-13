import type { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import type { LLMRequest, LLMResponse, Trace } from '@traceforge/shared';
import { loadConfig, getApiKey } from '../config.js';
import { TraceStorage } from '../storage.js';

export async function chatCompletionsHandler(
  request: FastifyRequest<{ Body: LLMRequest }>,
  reply: FastifyReply
) {
  const startTime = Date.now();
  const traceId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    const config = await loadConfig();
    const apiKey = getApiKey(config);
    const llmRequest = request.body;

    // Forward request to upstream provider
    const upstreamUrl = `${config.upstream_url}/v1/chat/completions`;
    
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(llmRequest),
    });

    const llmResponse = await response.json() as LLMResponse;
    const duration = Date.now() - startTime;

    // Save trace if enabled
    if (config.save_traces) {
      const trace: Trace = {
        id: traceId,
        timestamp,
        endpoint: '/v1/chat/completions',
        request: llmRequest,
        response: llmResponse,
        metadata: {
          duration_ms: duration,
          tokens_used: llmResponse.usage?.total_tokens,
          model: llmResponse.model,
          status: 'success',
        },
      };

      await TraceStorage.saveTrace(trace);
      request.log.info(`Trace saved: ${traceId}`);
    }

    // Return response to client
    return reply.code(response.status).send(llmResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Save error trace
    const config = await loadConfig();
    if (config.save_traces) {
      const trace: Trace = {
        id: traceId,
        timestamp,
        endpoint: '/v1/chat/completions',
        request: request.body,
        response: null,
        metadata: {
          duration_ms: duration,
          status: 'error',
          error: error.message,
        },
      };

      await TraceStorage.saveTrace(trace);
    }

    request.log.error(error);
    return reply.code(500).send({
      error: {
        message: error.message || 'Internal server error',
        type: 'proxy_error',
      },
    });
  }
}
