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

  try {
    // Call Anthropic API
    const response = await fetch(`${providerConfig.base_url}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': providerConfig.api_key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

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
    };

    await TraceStorage.saveTrace(trace);

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
    };

    await TraceStorage.saveTrace(trace);

    reply.code(500).send({
      error: {
        message: error.message,
        type: 'anthropic_error',
      },
    });
  }
}
