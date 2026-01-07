import type { FastifyRequest, FastifyReply } from "fastify";
import type { Trace, LLMRequest, LLMResponse } from "@traceforge/shared";
import { v4 as uuidv4 } from "uuid";
import { TraceStorage } from "../storage-file";

export async function ollamaHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  providerConfig: { base_url: string }
): Promise<void> {
  const startTime = Date.now();
  const traceId = uuidv4();
  const body = request.body as LLMRequest;

  // Extract session headers
  const sessionId =
    (request.headers["x-traceforge-session-id"] as string) || uuidv4();
  const stepIndex = parseInt(
    (request.headers["x-traceforge-step-index"] as string) || "0",
    10
  );
  const parentTraceId = request.headers["x-traceforge-parent-trace-id"] as
    | string
    | undefined;
  const stateHeader = request.headers["x-traceforge-state"] as
    | string
    | undefined;
  let stateSnapshot: Record<string, any> | undefined;

  try {
    stateSnapshot = stateHeader ? JSON.parse(stateHeader) : undefined;
  } catch (error) {
    request.log.warn({ error }, "Failed to parse X-TraceForge-State header");
  }

  try {
    // Ollama uses OpenAI-compatible API with 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(
      `${providerConfig.base_url}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

    const ollamaResponse = (await response.json()) as LLMResponse;
    const duration = Date.now() - startTime;

    // Save trace
    const trace: Trace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      endpoint: "/v1/chat/completions (Ollama)",
      request: body,
      response: ollamaResponse,
      metadata: {
        duration_ms: duration,
        tokens_used: ollamaResponse.usage?.total_tokens,
        model: body.model,
        status: "success",
      },
      session_id: sessionId,
      step_index: stepIndex,
      parent_trace_id: parentTraceId,
      state_snapshot: stateSnapshot,
    };

    await TraceStorage.saveTrace(trace);

    // Return session context headers
    reply.header("X-TraceForge-Session-ID", sessionId);
    reply.header("X-TraceForge-Trace-ID", traceId);
    reply.header("X-TraceForge-Next-Step", (stepIndex + 1).toString());

    reply.code(response.status).send(ollamaResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    const trace: Trace = {
      id: traceId,
      timestamp: new Date().toISOString(),
      endpoint: "/v1/chat/completions (Ollama)",
      request: body,
      response: null,
      metadata: {
        duration_ms: duration,
        model: body.model,
        status: "error",
        error: error.message,
      },
      session_id: sessionId,
      step_index: stepIndex,
      parent_trace_id: parentTraceId,
      state_snapshot: stateSnapshot,
    };

    await TraceStorage.saveTrace(trace);

    // Return session context headers even on error
    reply.header("X-TraceForge-Session-ID", sessionId);
    reply.header("X-TraceForge-Trace-ID", traceId);
    reply.header("X-TraceForge-Next-Step", (stepIndex + 1).toString());

    reply.code(500).send({
      error: {
        message: error.message,
        type: "ollama_error",
      },
    });
  }
}
