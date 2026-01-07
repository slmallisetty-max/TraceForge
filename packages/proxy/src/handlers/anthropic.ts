import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Trace, LLMResponse } from '@traceforge/shared';
import { v4 as uuidv4 } from 'uuid';
import { TraceStorage } from '../storage';

interface AnthropicRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
  system?: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: string; text: string }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export async function anthropicHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  providerConfig: { base_url: string; api_key: string }
): Promise<void> {
  const startTime = Date.now();
  const traceId = uuidv4();
  const body = request.body as AnthropicRequest;

  // Extract session headers
  const sessionId = (request.headers['x-traceforge-session-id'] as string) || uuidv4();
  const stepIndex = parseInt((request.headers['x-traceforge-step-index'] as string) || '0', 10);
  const parentTraceId = request.headers['x-traceforge-parent-trace-id'] as string | undefined;
  const stateHeader = request.headers['x-traceforge-state'] as string | undefined;
  let stateSnapshot: Record<string, any> | undefined;
  
  try {
    stateSnapshot = stateHeader ? JSON.parse(stateHeader) : undefined;
  } catch (error) {
    request.log.warn({ error }, 'Failed to parse X-TraceForge-State header');
  }

  try {
    // Call Anthropic API with 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(`${providerConfig.base_url}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': providerConfig.api_key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const anthropicResponse = await response.json() as AnthropicResponse;
    const duration = Date.now() - startTime;

    // Convert to OpenAI-compatible format for trace
    const openaiFormat: LLMResponse = {
      id: anthropicResponse.id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: anthropicResponse.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant' as const,
            content: anthropicResponse.content[0]?.text || '',
          },
          finish_reason: anthropicResponse.stop_reason,
        },
      ],
      usage: {
        prompt_tokens: anthropicResponse.usage.input_tokens,
        completion_tokens: anthropicResponse.usage.output_tokens,
        total_tokens:
          anthropicResponse.usage.input_tokens +
          anthropicResponse.usage.output_tokens,
      },
    };

    // Save trace
    const trace: Trace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      endpoint: '/v1/messages (Anthropic)',
      request: body as any,
      response: openaiFormat,
      metadata: {
        duration_ms: duration,
        tokens_used: openaiFormat.usage?.total_tokens || 0,
        model: body.model,
        status: 'success',
      },
      session_id: sessionId,
      step_index: stepIndex,
      parent_trace_id: parentTraceId,
      state_snapshot: stateSnapshot,
    };

    await TraceStorage.saveTrace(trace);

    // Return session context headers
    reply.header('X-TraceForge-Session-ID', sessionId);
    reply.header('X-TraceForge-Trace-ID', traceId);
    reply.header('X-TraceForge-Next-Step', (stepIndex + 1).toString());

    // Return OpenAI-compatible response
    reply.code(response.status).send(openaiFormat);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    const trace: Trace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      endpoint: '/v1/messages (Anthropic)',
      request: body as any,
      response: null,
      metadata: {
        duration_ms: duration,
        model: body.model,
        status: 'error',
        error: error.message,
      },
      session_id: sessionId,
      step_index: stepIndex,
      parent_trace_id: parentTraceId,
      state_snapshot: stateSnapshot,
    };

    await TraceStorage.saveTrace(trace);

    // Return session context headers even on error
    reply.header('X-TraceForge-Session-ID', sessionId);
    reply.header('X-TraceForge-Trace-ID', traceId);
    reply.header('X-TraceForge-Next-Step', (stepIndex + 1).toString());

    reply.code(500).send({
      error: {
        message: error.message,
        type: 'anthropic_error',
      },
    });
  }
}
