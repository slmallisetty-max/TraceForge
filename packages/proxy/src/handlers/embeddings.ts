import type { FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import type {
  EmbeddingRequest,
  EmbeddingResponse,
  Trace,
} from "@traceforge/shared";
import { EmbeddingRequestSchema } from "@traceforge/shared";
import { loadConfig, getApiKey } from "../config.js";
import { TraceStorage } from "../storage-file.js";
import { ZodError } from "zod";

export async function embeddingsHandler(
  request: FastifyRequest<{ Body: EmbeddingRequest }>,
  reply: FastifyReply
) {
  const startTime = Date.now();
  const traceId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    const config = await loadConfig();
    const apiKey = getApiKey(config);

    // Validate request body
    const embeddingRequest = EmbeddingRequestSchema.parse(request.body);

    // Forward request to upstream provider with 30s timeout
    const upstreamUrl = `${config.upstream_url}/v1/embeddings`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(embeddingRequest),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const embeddingResponse = (await response.json()) as EmbeddingResponse;
    const duration = Date.now() - startTime;

    // Save trace if enabled
    if (config.save_traces) {
      const trace: Trace = {
        id: traceId,
        timestamp,
        endpoint: "/v1/embeddings",
        request: embeddingRequest as any,
        response: embeddingResponse as any,
        metadata: {
          duration_ms: duration,
          tokens_used: embeddingResponse.usage?.total_tokens,
          model: embeddingResponse.model,
          status: "success",
        },
      };

      await TraceStorage.saveTrace(trace);
      request.log.info(`Trace saved: ${traceId}`);
    }

    // Return response to client
    return reply.code(response.status).send(embeddingResponse);
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
        endpoint: "/v1/embeddings",
        request: request.body as any,
        response: null,
        metadata: {
          duration_ms: duration,
          status: "error",
          error: error.message,
        },
      };

      await TraceStorage.saveTrace(trace);
    }

    request.log.error(error);
    return reply.code(500).send({
      error: {
        message: error.message || "Internal server error",
        type: "proxy_error",
      },
    });
  }
}
