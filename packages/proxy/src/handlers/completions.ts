import type { FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import type { LLMRequest, LLMResponse, Trace } from "@traceforge/shared";
import { LLMRequestSchema } from "@traceforge/shared";
import { loadConfig, getApiKey } from "../config.js";
import { TraceStorage } from "../storage-file.js";
import { ZodError } from "zod";

export async function completionsHandler(
  request: FastifyRequest<{ Body: LLMRequest }>,
  reply: FastifyReply
) {
  const startTime = Date.now();
  const traceId = uuidv4();
  const timestamp = new Date().toISOString();

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
    const config = await loadConfig();
    const apiKey = getApiKey(config);

    // Validate request body
    const llmRequest = LLMRequestSchema.parse(request.body);

    // Forward request to upstream provider with 30s timeout
    const upstreamUrl = `${config.upstream_url}/v1/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(llmRequest),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const llmResponse = (await response.json()) as LLMResponse;
    const duration = Date.now() - startTime;

    // Save trace if enabled
    if (config.save_traces) {
      const trace: Trace = {
        id: traceId,
        timestamp,
        endpoint: "/v1/completions",
        request: llmRequest,
        response: llmResponse,
        metadata: {
          duration_ms: duration,
          tokens_used: llmResponse.usage?.total_tokens,
          model: llmResponse.model,
          status: "success",
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
    reply.header("X-TraceForge-Session-ID", sessionId);
    reply.header("X-TraceForge-Trace-ID", traceId);
    reply.header("X-TraceForge-Next-Step", (stepIndex + 1).toString());

    // Return response to client
    return reply.code(response.status).send(llmResponse);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Handle validation errors
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          message: "Invalid request body",
          type: "invalid_request_error",
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
        endpoint: "/v1/completions",
        request: request.body,
        response: null,
        metadata: {
          duration_ms: duration,
          status: "error",
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
    reply.header("X-TraceForge-Session-ID", sessionId);
    reply.header("X-TraceForge-Trace-ID", traceId);
    reply.header("X-TraceForge-Next-Step", (stepIndex + 1).toString());

    request.log.error(error);
    return reply.code(500).send({
      error: {
        message: error.message || "Internal server error",
        type: "proxy_error",
      },
    });
  }
}
