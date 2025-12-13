import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Trace, LLMResponse } from '@traceforge/shared';
import { v4 as uuidv4 } from 'uuid';
import { TraceStorage } from '../storage';

interface GeminiRequest {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export async function geminiHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  providerConfig: { base_url: string; api_key: string; model: string }
): Promise<void> {
  const startTime = Date.now();
  const traceId = uuidv4();
  const body = request.body as GeminiRequest;

  try {
    // Call Gemini API
    const response = await fetch(
      `${providerConfig.base_url}/v1beta/models/${providerConfig.model}:generateContent?key=${providerConfig.api_key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const geminiResponse = await response.json() as GeminiResponse;
    const duration = Date.now() - startTime;

    // Convert to OpenAI-compatible format
    const openaiFormat: LLMResponse = {
      id: traceId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: providerConfig.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant' as const,
            content:
              geminiResponse.candidates[0]?.content.parts[0]?.text || '',
          },
          finish_reason: geminiResponse.candidates[0]?.finishReason.toLowerCase(),
        },
      ],
      usage: {
        prompt_tokens: geminiResponse.usageMetadata.promptTokenCount,
        completion_tokens: geminiResponse.usageMetadata.candidatesTokenCount,
        total_tokens: geminiResponse.usageMetadata.totalTokenCount,
      },
    };

    // Save trace
    const trace: Trace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      endpoint: '/v1beta/models/:model:generateContent (Gemini)',
      request: body as any,
      response: openaiFormat,
      metadata: {
        duration_ms: duration,
        tokens_used: openaiFormat.usage?.total_tokens || 0,
        model: providerConfig.model,
        status: 'success',
      },
    };

    await TraceStorage.saveTrace(trace);

    reply.code(response.status).send(openaiFormat);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    const trace: Trace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      endpoint: '/v1beta/models/:model:generateContent (Gemini)',
      request: body as any,
      response: null,
      metadata: {
        duration_ms: duration,
        model: providerConfig.model,
        status: 'error',
        error: error.message,
      },
    };

    await TraceStorage.saveTrace(trace);

    reply.code(500).send({
      error: {
        message: error.message,
        type: 'gemini_error',
      },
    });
  }
}
