import type { FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import type { LLMRequest, LLMResponse, Trace } from "@traceforge/shared";
import { PolicyEngine } from "@traceforge/shared";
import { loadConfig, getApiKey } from "../config.js";
import { TraceStorage } from "../storage-file.js";
import { VCRLayer } from "../vcr.js";

// Initialize policy engine (singleton)
let policyEngine: PolicyEngine | null = null;
function getPolicyEngine(): PolicyEngine {
  if (!policyEngine) {
    policyEngine = new PolicyEngine(".traceforge/policies");
    try {
      policyEngine.loadPolicies();
    } catch (error) {
      console.warn("Failed to load policies:", error);
    }
  }
  return policyEngine;
}

export async function chatCompletionsHandler(
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
  const stepId = request.headers["x-traceforge-step-id"] as string | undefined;
  const parentStepId = request.headers["x-traceforge-parent-step-id"] as
    | string
    | undefined;
  const organizationId = request.headers["x-traceforge-organization-id"] as
    | string
    | undefined;
  const serviceId = request.headers["x-traceforge-service-id"] as
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
    const llmRequest = request.body;

    // Initialize VCR layer
    const vcr = config.vcr ? new VCRLayer(config.vcr) : null;

    // Check if we should replay from cassette
    if (vcr && config.vcr!.mode !== "off") {
      const cassette = await vcr.shouldReplay("openai", llmRequest);

      if (cassette) {
        const duration = Date.now() - startTime;
        request.log.info(`VCR replay hit for openai request`);

        // Save trace if enabled
        if (config.save_traces) {
          const trace: Trace = {
            id: traceId,
            timestamp,
            endpoint: "/v1/chat/completions (VCR replay)",
            request: llmRequest,
            response: cassette.response.body as LLMResponse,
            metadata: {
              duration_ms: duration,
              tokens_used: (cassette.response.body as LLMResponse).usage
                ?.total_tokens,
              model: (cassette.response.body as LLMResponse).model,
              status: "success",
            },
            session_id: sessionId,
            step_index: stepIndex,
            parent_trace_id: parentTraceId,
            state_snapshot: stateSnapshot,
          };

          await TraceStorage.saveTrace(trace);
        }

        // Return session context headers
        reply.header("X-TraceForge-Session-ID", sessionId);
        reply.header("X-TraceForge-Trace-ID", traceId);
        reply.header("X-TraceForge-Next-Step", (stepIndex + 1).toString());

        return reply
          .code(cassette.response.status)
          .send(cassette.response.body);
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
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(llmRequest),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const llmResponse = (await response.json()) as LLMResponse;
      const duration = Date.now() - startTime;

      // Policy enforcement: Check response against policies
      const engine = getPolicyEngine();
      const responseText = llmResponse.choices?.[0]?.message?.content || "";
      if (
        responseText &&
        process.env.TRACEFORGE_DISABLE_POLICY_ENFORCEMENT !== "true"
      ) {
        try {
          const policyResult = await engine.enforce(
            responseText,
            organizationId,
            serviceId
          );

          if (!policyResult.allowed) {
            request.log.warn(
              {
                traceId,
                blockedBy: policyResult.blockedBy,
                message: policyResult.message,
              },
              "Response blocked by policy"
            );

            // Return policy violation error
            reply.header("X-TraceForge-Session-ID", sessionId);
            reply.header("X-TraceForge-Trace-ID", traceId);
            reply.header("X-TraceForge-Policy-Blocked", "true");
            reply.header(
              "X-TraceForge-Blocked-By",
              policyResult.blockedBy || "unknown"
            );

            return reply.code(403).send({
              error: {
                message: policyResult.message || "Response blocked by policy",
                type: "policy_violation",
                policy_id: policyResult.blockedBy,
                violations: policyResult.violations.slice(0, 3), // Limit to 3 for brevity
              },
            });
          }

          // Log non-blocking violations
          if (policyResult.violations.length > 0) {
            request.log.info(
              {
                traceId,
                violations: policyResult.violations.length,
                message: policyResult.message,
              },
              "Non-blocking policy violations detected"
            );
          }
        } catch (policyError: any) {
          request.log.error(
            { error: policyError },
            "Policy enforcement failed"
          );
          // Don't block on policy engine errors
        }
      }

      // Record cassette if VCR is enabled
      if (vcr) {
        await vcr.record(
          "openai",
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
          endpoint: "/v1/chat/completions",
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
          step_id: stepId,
          parent_step_id: parentStepId,
          organization_id: organizationId,
          service_id: serviceId,
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
    } catch (fetchError: any) {
      clearTimeout(timeout);
      if (fetchError.name === "AbortError") {
        throw new Error(
          "Request timeout: upstream provider took longer than 30 seconds"
        );
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
        endpoint: "/v1/chat/completions",
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
