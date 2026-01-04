/**
 * Shared logger utility for TraceForge
 * Provides structured logging with consistent format across all packages
 */

import pino from "pino";

/**
 * Create a logger instance with standard configuration
 */
export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL || process.env.TRACEFORGE_LOG_LEVEL || "info",
    formatters: {
      level: (label) => ({ level: label }),
    },
    transport:
      process.env.NODE_ENV === "production"
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              colorize: true,
            },
          },
  });
}

/**
 * Default logger instance for non-Fastify contexts
 */
export const logger = createLogger("traceforge");

/**
 * Logger for storage operations
 */
export const storageLogger = createLogger("traceforge:storage");

/**
 * Logger for VCR operations
 */
export const vcrLogger = createLogger("traceforge:vcr");

/**
 * Logger for proxy operations
 */
export const proxyLogger = createLogger("traceforge:proxy");

/**
 * Logger for CLI operations
 */
export const cliLogger = createLogger("traceforge:cli");
