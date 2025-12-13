import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Trace, LLMRequest, LLMResponse } from '@traceforge/shared';
import { v4 as uuidv4 } from 'uuid';
import { TraceStorage } from '../storage';

export async function ollamaHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  providerConfig: { base_url: string }
): Promise<void> {
  const startTime = Date.now();
  const traceId = uuidv4();
  const body = request.body as LLMRequest;

  try {
    // Ollama uses OpenAI-compatible API
    const response = await fetch(`${providerConfig.base_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const ollamaResponse = await response.json() as LLMResponse;
    const duration = Date.now() - startTime;

    // Save trace
    const trace: Trace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      endpoint: '/v1/chat/completions (Ollama)',
      request: body,
      response: ollamaResponse,
      metadata: {
        duration_ms: duration,
        tokens_used: ollamaResponse.usage?.total_tokens,
        model: body.model,
        status: 'success',
      },
    };

    await TraceStorage.saveTrace(trace);

    reply.code(response.status).send(ollamaResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    const trace: Trace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      endpoint: '/v1/chat/completions (Ollama)',
      request: body,
      response: null,
      metadata: {
        duration_ms: duration,
        model: body.model,
        status: 'error',
        error: error.message,
      },
    };

    await TraceStorage.saveTrace(trace);

    reply.code(500).send({
      error: {
        message: error.message,
        type: 'ollama_error',
      },
    });
  }
}
