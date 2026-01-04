import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyAuth from "@fastify/auth";

export interface AuthConfig {
  enabled: boolean;
  apiKey?: string; // Simple API key auth
  jwtSecret?: string; // JWT-based auth
  publicPaths?: string[]; // Paths that don't require auth
}

/**
 * Load auth configuration from environment
 */
export function loadAuthConfig(): AuthConfig {
  return {
    enabled: process.env.TRACEFORGE_AUTH_ENABLED !== "false", // Default: enabled
    apiKey: process.env.TRACEFORGE_API_KEY,
    jwtSecret: process.env.TRACEFORGE_JWT_SECRET || "change-me-in-production",
    publicPaths: ["/api/health", "/health"],
  };
}

/**
 * API Key authentication strategy
 */
export async function verifyApiKey(
  request: FastifyRequest,
  _reply: FastifyReply,
  apiKey: string
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  // Support both "Bearer <key>" and "ApiKey <key>" formats
  const [scheme, token] = authHeader.split(" ");

  if (!token) {
    throw new Error("Invalid Authorization header format");
  }

  if (scheme === "Bearer" || scheme === "ApiKey") {
    if (token !== apiKey) {
      throw new Error("Invalid API key");
    }
  } else {
    throw new Error(
      'Unsupported authentication scheme. Use "Bearer" or "ApiKey"'
    );
  }
}

/**
 * JWT authentication strategy
 */
export async function verifyJWT(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Register authentication plugins
 */
export async function registerAuth(
  fastify: FastifyInstance,
  config: AuthConfig
) {
  if (!config.enabled) {
    fastify.log.warn(
      "⚠️  Authentication is DISABLED. Do not use in production!"
    );
    return;
  }

  // Register JWT plugin if secret is provided
  if (config.jwtSecret) {
    await fastify.register(fastifyJwt, {
      secret: config.jwtSecret,
    });
  }

  // Register auth plugin
  await fastify.register(fastifyAuth);

  // Add preHandler hook to protect routes
  fastify.addHook("preHandler", async (request, reply) => {
    // Skip public paths
    if (config.publicPaths?.some((path) => request.url.startsWith(path))) {
      return;
    }

    // Skip non-API routes (static files)
    if (!request.url.startsWith("/api")) {
      return;
    }

    try {
      // Try API key auth if configured
      if (config.apiKey) {
        await verifyApiKey(request, reply, config.apiKey);
        request.log.info(
          { userId: "api-key-user" },
          "Authenticated via API key"
        );
        return;
      }

      // Try JWT auth if configured
      if (config.jwtSecret) {
        await verifyJWT(request, reply);
        request.log.info(
          { userId: (request.user as any)?.sub },
          "Authenticated via JWT"
        );
        return;
      }

      // No auth methods configured
      throw new Error("No authentication methods configured");
    } catch (error: any) {
      reply.code(401).send({
        error: "Unauthorized",
        message: error.message || "Authentication required",
      });
    }
  });

  fastify.log.info("✓ Authentication enabled for web API");
}
