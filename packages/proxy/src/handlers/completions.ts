import type { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import type { LLMRequest, LLMResponse, Trace } from '@traceforge/shared';
import { LLMRequestSchema } from '@traceforge/shared';
import { loadConfig, getApiKey } from '../config.js';
import { TraceStorage } from '../storage.js';
import { ZodError } from 'zod';

export async function completionsHandler(
  request: FastifyRequest<{ Body: LLMRequest }>,
  reply: FastifyReply
) {
  const startTime = Date.now();
  const traceId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    const config = await loadConfig();
    const apiKey = getApiKey(config);
    
    // Validate request body
    const llmRequest = LLMRequestSchema.parse(request.body);

    // Forward request to upstream provider with 30s timeout
    const upstreamUrl = `${config.upstream_url}/v1/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(llmRequest),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const llmResponse = await response.json() as LLMResponse;
    const duration = Date.now() - startTime;

    // Save trace if enabled
    if (config.save_traces) {
      const trace: Trace = {
        id: traceId,
        timestamp,
        endpoint: '/v1/completions',
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
    
    // Handle validation errors
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          message: 'Invalid request body',
          type: 'invalid_request_error',
          details: error.errors,
        },
      });
    }
    
    // Save error trace
    const config = await loadConfig();
    if (config.save_traces) {
      const trace: Trace = {
        id: traceId,
        timestamp,
        endpoint: '/v1/completions',
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
