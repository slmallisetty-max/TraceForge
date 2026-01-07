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
    // Call Gemini API with 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(
      `${providerConfig.base_url}/v1beta/models/${providerConfig.model}:generateContent?key=${providerConfig.api_key}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

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
        type: 'gemini_error',
      },
    });
  }
}
