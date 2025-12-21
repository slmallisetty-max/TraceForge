import type { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import type { LLMRequest, LLMResponse, Trace } from '@traceforge/shared';
import { loadConfig, getApiKey } from '../config.js';
import { TraceStorage } from '../storage.js';
import { VCRLayer } from '../vcr.js';

export async function chatCompletionsHandler(
  request: FastifyRequest<{ Body: LLMRequest }>,
  reply: FastifyReply
) {
  const startTime = Date.now();
  const traceId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    const config = await loadConfig();
    const llmRequest = request.body;

    // Initialize VCR layer
    const vcr = config.vcr ? new VCRLayer(config.vcr) : null;

    // Check if we should replay from cassette
    if (vcr && config.vcr!.mode !== 'off') {
      const cassette = await vcr.shouldReplay('openai', llmRequest);
      
      if (cassette) {
        const duration = Date.now() - startTime;
        request.log.info(`VCR replay hit for openai request`);

        // Save trace if enabled
        if (config.save_traces) {
          const trace: Trace = {
            id: traceId,
            timestamp,
            endpoint: '/v1/chat/completions (VCR replay)',
            request: llmRequest,
            response: cassette.response.body as LLMResponse,
            metadata: {
              duration_ms: duration,
              tokens_used: (cassette.response.body as LLMResponse).usage?.total_tokens,
              model: (cassette.response.body as LLMResponse).model,
              status: 'success',
            },
          };

          await TraceStorage.saveTrace(trace);
        }

        return reply.code(cassette.response.status).send(cassette.response.body);
      }
    }

    // Forward request to upstream provider
    const apiKey = getApiKey(config);
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

    // Record cassette if VCR is enabled
    if (vcr) {
      await vcr.record(
        'openai',
        llmRequest,
        response.status,
        {},
        llmResponse
      );
      request.log.info(`VCR recorded cassette for openai request`);
    }

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
