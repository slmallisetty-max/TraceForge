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

  // Extract session headers
  const sessionId = (request.headers['x-traceforge-session-id'] as string) || uuidv4();
  const stepIndex = parseInt((request.headers['x-traceforge-step-index'] as string) || '0', 10);
  const parentTraceId = request.headers['x-traceforge-parent-trace-id'] as string | undefined;
  const stateHeader = request.headers['x-traceforge-state'] as string | undefined;
  let stateSnapshot: Record<string, any> | undefined;
  
  try {
    stateSnapshot = stateHeader ? JSON.parse(stateHeader) : undefined;
  } catch (error) {
    request.log.warn('Failed to parse X-TraceForge-State header:', error);
  }

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
            session_id: sessionId,
            step_index: stepIndex,
            parent_trace_id: parentTraceId,
            state_snapshot: stateSnapshot,
          };

          await TraceStorage.saveTrace(trace);
        }

        // Return session context headers
        reply.header('X-TraceForge-Session-ID', sessionId);
        reply.header('X-TraceForge-Trace-ID', traceId);
        reply.header('X-TraceForge-Next-Step', (stepIndex + 1).toString());

        return reply.code(cassette.response.status).send(cassette.response.body);
      }
    }

    // Forward request to upstream provider
    const apiKey = getApiKey(config);
    const upstreamUrl = `${config.upstream_url}/v1/chat/completions`;
    
    // Add 30 second timeout to prevent hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    try {
      const response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(llmRequest),
        signal: controller.signal,
      });
      clearTimeout(timeout);

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
        session_id: sessionId,
        step_index: stepIndex,
        parent_trace_id: parentTraceId,
        state_snapshot: stateSnapshot,
      };

      await TraceStorage.saveTrace(trace);
      request.log.info(`Trace saved: ${traceId}`);
    }

    // Return session context headers
    reply.header('X-TraceForge-Session-ID', sessionId);
    reply.header('X-TraceForge-Trace-ID', traceId);
    reply.header('X-TraceForge-Next-Step', (stepIndex + 1).toString());

    // Return response to client
      return reply.code(response.status).send(llmResponse);
    } catch (fetchError: any) {
      clearTimeout(timeout);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout: upstream provider took longer than 30 seconds');
      }
      throw fetchError;
    }
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
        session_id: sessionId,
        step_index: stepIndex,
        parent_trace_id: parentTraceId,
        state_snapshot: stateSnapshot,
      };

      await TraceStorage.saveTrace(trace);
    }

    // Return session context headers even on error
    reply.header('X-TraceForge-Session-ID', sessionId);
    reply.header('X-TraceForge-Trace-ID', traceId);
    reply.header('X-TraceForge-Next-Step', (stepIndex + 1).toString());

    request.log.error(error);
    return reply.code(500).send({
      error: {
        message: error.message || 'Internal server error',
        type: 'proxy_error',
      },
    });
  }
}
