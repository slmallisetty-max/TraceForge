import { test, expect, describe } from "vitest";
import Fastify from "fastify";
import { registerAuth, loadAuthConfig, verifyApiKey } from "./auth.js";

describe("Authentication", () => {
  describe("registerAuth", () => {
    test("blocks unauthenticated requests to API routes", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: true,
        apiKey: "test-key-123",
        publicPaths: ["/health"],
      });

      app.get("/api/protected", async () => ({ data: "secret" }));

      const response = await app.inject({
        method: "GET",
        url: "/api/protected",
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toMatchObject({
        error: "Unauthorized",
      });
    });

    test("allows authenticated requests with valid API key", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: true,
        apiKey: "test-key-123",
        publicPaths: ["/health"],
      });

      app.get("/api/protected", async () => ({ data: "secret" }));

      const response = await app.inject({
        method: "GET",
        url: "/api/protected",
        headers: {
          authorization: "Bearer test-key-123",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: "secret" });
    });

    test("allows ApiKey scheme in addition to Bearer", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: true,
        apiKey: "test-key-123",
        publicPaths: ["/health"],
      });

      app.get("/api/data", async () => ({ data: "value" }));

      const response = await app.inject({
        method: "GET",
        url: "/api/data",
        headers: {
          authorization: "ApiKey test-key-123",
        },
      });

      expect(response.statusCode).toBe(200);
    });

    test("rejects invalid API key", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: true,
        apiKey: "test-key-123",
        publicPaths: ["/health"],
      });

      app.get("/api/protected", async () => ({ data: "secret" }));

      const response = await app.inject({
        method: "GET",
        url: "/api/protected",
        headers: {
          authorization: "Bearer wrong-key",
        },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().message).toContain("Invalid API key");
    });

    test("allows access to public paths without auth", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: true,
        apiKey: "test-key-123",
        publicPaths: ["/health", "/api/health"],
      });

      app.get("/api/health", async () => ({ status: "ok" }));

      const response = await app.inject({
        method: "GET",
        url: "/api/health",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "ok" });
    });

    test("allows access to non-API routes (static files)", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: true,
        apiKey: "test-key-123",
        publicPaths: ["/health"],
      });

      app.get("/index.html", async () => "<html></html>");

      const response = await app.inject({
        method: "GET",
        url: "/index.html",
      });

      expect(response.statusCode).toBe(200);
    });

    test("does not require auth when disabled", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: false,
      });

      app.get("/api/protected", async () => ({ data: "secret" }));

      const response = await app.inject({
        method: "GET",
        url: "/api/protected",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: "secret" });
    });

    test("handles JWT authentication when configured", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: true,
        jwtSecret: "test-secret-123",
        publicPaths: ["/health"],
      });

      app.get("/api/protected", async () => ({ data: "secret" }));

      // Generate valid JWT
      const token = app.jwt.sign({ sub: "testuser", role: "admin" });

      const response = await app.inject({
        method: "GET",
        url: "/api/protected",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ data: "secret" });
    });

    test("rejects invalid JWT token", async () => {
      const app = Fastify({ logger: false });

      await registerAuth(app, {
        enabled: true,
        jwtSecret: "test-secret-123",
        publicPaths: ["/health"],
      });

      app.get("/api/protected", async () => ({ data: "secret" }));

      const response = await app.inject({
        method: "GET",
        url: "/api/protected",
        headers: {
          authorization: "Bearer invalid.jwt.token",
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("verifyApiKey", () => {
    test("throws when authorization header is missing", async () => {
      const mockRequest = {
        headers: {},
      } as any;

      await expect(
        verifyApiKey(mockRequest, {} as any, "test-key")
      ).rejects.toThrow("Missing Authorization header");
    });

    test("throws when authorization header has no token", async () => {
      const mockRequest = {
        headers: {
          authorization: "Bearer",
        },
      } as any;

      await expect(
        verifyApiKey(mockRequest, {} as any, "test-key")
      ).rejects.toThrow("Invalid Authorization header format");
    });

    test("throws when scheme is not Bearer or ApiKey", async () => {
      const mockRequest = {
        headers: {
          authorization: "Basic test-key",
        },
      } as any;

      await expect(
        verifyApiKey(mockRequest, {} as any, "test-key")
      ).rejects.toThrow("Unsupported authentication scheme");
    });
  });

  describe("loadAuthConfig", () => {
    test("loads config from environment variables", () => {
      process.env.TRACEFORGE_API_KEY = "env-key";
      process.env.TRACEFORGE_JWT_SECRET = "env-secret";
      process.env.TRACEFORGE_AUTH_ENABLED = "true";

      const config = loadAuthConfig();

      expect(config.enabled).toBe(true);
      expect(config.apiKey).toBe("env-key");
      expect(config.jwtSecret).toBe("env-secret");
      expect(config.publicPaths).toContain("/api/health");

      // Cleanup
      delete process.env.TRACEFORGE_API_KEY;
      delete process.env.TRACEFORGE_JWT_SECRET;
      delete process.env.TRACEFORGE_AUTH_ENABLED;
    });

    test("defaults to enabled when not specified", () => {
      delete process.env.TRACEFORGE_AUTH_ENABLED;

      const config = loadAuthConfig();

      expect(config.enabled).toBe(true);
    });

    test("can be disabled via environment variable", () => {
      process.env.TRACEFORGE_AUTH_ENABLED = "false";

      const config = loadAuthConfig();

      expect(config.enabled).toBe(false);

      delete process.env.TRACEFORGE_AUTH_ENABLED;
    });

    test("uses default JWT secret if not provided", () => {
      delete process.env.TRACEFORGE_JWT_SECRET;

      const config = loadAuthConfig();

      expect(config.jwtSecret).toBe("change-me-in-production");
    });
  });
});
