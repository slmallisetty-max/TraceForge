import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync } from "fs";
import { resolve } from "path";
import { SQLiteStorageBackend } from "./storage-sqlite";
import type { Trace, Test } from "@traceforge/shared";

describe("SQLiteStorageBackend", () => {
  const testDbPath = resolve(process.cwd(), ".ai-tests/test-traces.db");
  let backend: SQLiteStorageBackend;

  beforeEach(() => {
    // Clean up any existing test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    backend = new SQLiteStorageBackend(testDbPath);
  });

  afterEach(async () => {
    await backend.close();
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe("Trace operations", () => {
    const createTestTrace = (id: string): Trace => ({
      id,
      timestamp: new Date().toISOString(),
      endpoint: "/v1/chat/completions",
      request: {
        model: "gpt-4",
        messages: [{ role: "user", content: "test" }],
      },
      response: {
        id: "test-response",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-4",
        choices: [
          {
            message: { role: "assistant", content: "response" },
            index: 0,
            finish_reason: "stop",
          },
        ],
      },
      metadata: {
        model: "gpt-4",
        status: "success",
        duration_ms: 100,
      },
      schema_version: "1.0.0",
    });

    it("saves and retrieves a trace", async () => {
      const trace = createTestTrace("trace-1");
      await backend.saveTrace(trace);

      const retrieved = await backend.getTrace("trace-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("trace-1");
      expect(retrieved?.metadata.model).toBe("gpt-4");
    });

    it("returns null for non-existent trace", async () => {
      const retrieved = await backend.getTrace("non-existent");
      expect(retrieved).toBeNull();
    });

    it("counts traces correctly", async () => {
      expect(await backend.countTraces()).toBe(0);

      await backend.saveTrace(createTestTrace("trace-1"));
      expect(await backend.countTraces()).toBe(1);

      await backend.saveTrace(createTestTrace("trace-2"));
      expect(await backend.countTraces()).toBe(2);
    });

    it("lists traces with pagination", async () => {
      for (let i = 1; i <= 5; i++) {
        await backend.saveTrace(createTestTrace(`trace-${i}`));
      }

      const traces = await backend.listTraces({ limit: 2, offset: 1 });
      expect(traces).toHaveLength(2);
    });

    it("lists traces with sorting", async () => {
      const trace1 = createTestTrace("trace-1");
      trace1.timestamp = "2024-01-01T00:00:00Z";
      await backend.saveTrace(trace1);

      const trace2 = createTestTrace("trace-2");
      trace2.timestamp = "2024-01-02T00:00:00Z";
      await backend.saveTrace(trace2);

      const tracesDesc = await backend.listTraces({ sortOrder: "desc" });
      expect(tracesDesc[0].id).toBe("trace-2");

      const tracesAsc = await backend.listTraces({ sortOrder: "asc" });
      expect(tracesAsc[0].id).toBe("trace-1");
    });

    it("filters traces by model", async () => {
      const trace1 = createTestTrace("trace-1");
      trace1.metadata.model = "gpt-4";
      await backend.saveTrace(trace1);

      const trace2 = createTestTrace("trace-2");
      trace2.metadata.model = "gpt-3.5-turbo";
      await backend.saveTrace(trace2);

      const filtered = await backend.listTraces({ filter: { model: "gpt-4" } });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("trace-1");
    });

    it("deletes a trace", async () => {
      await backend.saveTrace(createTestTrace("trace-1"));
      expect(await backend.countTraces()).toBe(1);

      await backend.deleteTrace("trace-1");
      expect(await backend.countTraces()).toBe(0);
    });

    it("replaces existing trace on duplicate ID", async () => {
      const trace1 = createTestTrace("trace-1");
      trace1.metadata.duration_ms = 100;
      await backend.saveTrace(trace1);

      const trace2 = createTestTrace("trace-1");
      trace2.metadata.duration_ms = 200;
      await backend.saveTrace(trace2);

      expect(await backend.countTraces()).toBe(1);
      const retrieved = await backend.getTrace("trace-1");
      expect(retrieved?.metadata.duration_ms).toBe(200);
    });
  });

  describe("Cleanup operations", () => {
    const createTestTrace = (id: string, ageSeconds: number = 0): Trace => ({
      id,
      timestamp: new Date(Date.now() - ageSeconds * 1000).toISOString(),
      endpoint: "/v1/chat/completions",
      request: { model: "gpt-4", messages: [] },
      response: {
        id: "test-response",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-4",
        choices: [
          {
            message: { role: "assistant", content: "ok" },
            index: 0,
            finish_reason: "stop",
          },
        ],
      },
      metadata: { model: "gpt-4", status: "success", duration_ms: 100 },
      schema_version: "1.0.0",
    });

    it("cleans up traces by age", async () => {
      // Save traces with different ages
      await backend.saveTrace(createTestTrace("old-1", 86400 * 2)); // 2 days old
      await backend.saveTrace(createTestTrace("old-2", 86400 * 3)); // 3 days old
      await backend.saveTrace(createTestTrace("new-1", 0)); // Fresh

      // Wait a moment for timestamps to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      const deleted = await backend.cleanup(86400); // Delete older than 1 day
      expect(deleted).toBe(2);
      expect(await backend.countTraces()).toBe(1);
    });

    it("cleans up traces by count", async () => {
      for (let i = 1; i <= 5; i++) {
        await backend.saveTrace(createTestTrace(`trace-${i}`));
      }

      const deleted = await backend.cleanup(undefined, 3); // Keep only newest 3
      expect(deleted).toBe(2);
      expect(await backend.countTraces()).toBe(3);
    });

    it("combines age and count cleanup", async () => {
      await backend.saveTrace(createTestTrace("old-1", 86400 * 2));
      await backend.saveTrace(createTestTrace("old-2", 86400 * 3));
      await backend.saveTrace(createTestTrace("new-1", 0));
      await backend.saveTrace(createTestTrace("new-2", 0));

      await new Promise((resolve) => setTimeout(resolve, 100));

      const deleted = await backend.cleanup(86400, 2); // Max age 1 day, max count 2
      expect(deleted).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Test operations", () => {
    const createTestTest = (id: string): Test => ({
      id,
      name: "Test GPT-4 Response",
      request: {
        model: "gpt-4",
        messages: [{ role: "user", content: "test" }],
      },
      assertions: [
        {
          type: "contains",
          path: "choices[0].message.content",
          expected: "test",
        },
      ],
      created_at: new Date().toISOString(),
    });

    it("saves and retrieves a test", async () => {
      const test = createTestTest("test-1");
      await backend.saveTest(test);

      const retrieved = await backend.getTest("test-1");
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe("test-1");
      expect(retrieved?.name).toBe("Test GPT-4 Response");
    });

    it("lists tests with pagination", async () => {
      for (let i = 1; i <= 5; i++) {
        await backend.saveTest(createTestTest(`test-${i}`));
      }

      const tests = await backend.listTests({ limit: 2, offset: 1 });
      expect(tests).toHaveLength(2);
    });

    it("deletes a test", async () => {
      await backend.saveTest(createTestTest("test-1"));
      const before = await backend.listTests();
      expect(before).toHaveLength(1);

      await backend.deleteTest("test-1");
      const after = await backend.listTests();
      expect(after).toHaveLength(0);
    });
  });

  describe("Session operations", () => {
    const createSessionTrace = (
      id: string,
      sessionId: string,
      stepIndex: number,
      parentTraceId?: string
    ): Trace => ({
      id,
      timestamp: new Date(Date.now() + stepIndex * 1000).toISOString(),
      endpoint: "/v1/chat/completions",
      request: {
        model: "gpt-4",
        messages: [{ role: "user", content: `step ${stepIndex}` }],
      },
      response: {
        id: `response-${id}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-4",
        choices: [
          {
            message: { role: "assistant", content: `response ${stepIndex}` },
            index: 0,
            finish_reason: "stop",
          },
        ],
      },
      metadata: {
        model: "gpt-4",
        status: "success",
        duration_ms: 100 + stepIndex * 10,
        tokens_used: 50 + stepIndex * 5,
      },
      schema_version: "1.0.0",
      session_id: sessionId,
      step_index: stepIndex,
      parent_trace_id: parentTraceId,
      state_snapshot: {
        current_step: stepIndex,
        data: `state-${stepIndex}`,
      },
    });

    it("saves and retrieves traces by session", async () => {
      const sessionId = "session-1";

      // Create 3 traces in a session
      await backend.saveTrace(createSessionTrace("trace-1", sessionId, 0));
      await backend.saveTrace(createSessionTrace("trace-2", sessionId, 1));
      await backend.saveTrace(createSessionTrace("trace-3", sessionId, 2));

      // Create a trace in another session
      await backend.saveTrace(createSessionTrace("trace-4", "session-2", 0));

      const sessionTraces = await backend.listTracesBySession(sessionId);
      expect(sessionTraces).toHaveLength(3);
      expect(sessionTraces[0].step_index).toBe(0);
      expect(sessionTraces[1].step_index).toBe(1);
      expect(sessionTraces[2].step_index).toBe(2);
    });

    it("retrieves session metadata", async () => {
      const sessionId = "session-test";

      // Create traces with different models and tokens
      const trace1 = createSessionTrace("trace-1", sessionId, 0);
      trace1.metadata.model = "gpt-4";
      trace1.metadata.tokens_used = 100;

      const trace2 = createSessionTrace("trace-2", sessionId, 1);
      trace2.metadata.model = "gpt-3.5-turbo";
      trace2.metadata.tokens_used = 50;

      await backend.saveTrace(trace1);
      await backend.saveTrace(trace2);

      const metadata = await backend.getSessionMetadata(sessionId);

      expect(metadata).toBeDefined();
      expect(metadata?.session_id).toBe(sessionId);
      expect(metadata?.total_steps).toBe(2);
      expect(metadata?.models_used).toContain("gpt-4");
      expect(metadata?.models_used).toContain("gpt-3.5-turbo");
      expect(metadata?.total_tokens).toBe(150);
      expect(metadata?.status).toBe("completed");
    });

    it("returns null for non-existent session", async () => {
      const metadata = await backend.getSessionMetadata("non-existent");
      expect(metadata).toBeNull();
    });

    it("handles session with error status", async () => {
      const sessionId = "session-error";

      const trace1 = createSessionTrace("trace-1", sessionId, 0);
      const trace2 = createSessionTrace("trace-2", sessionId, 1);
      trace2.metadata.status = "error";
      trace2.response = null;

      await backend.saveTrace(trace1);
      await backend.saveTrace(trace2);

      const metadata = await backend.getSessionMetadata(sessionId);
      expect(metadata?.status).toBe("failed");
    });

    it("saves traces with state snapshots", async () => {
      const sessionId = "session-state";
      const trace = createSessionTrace("trace-state", sessionId, 0);
      trace.state_snapshot = {
        user_query: "test query",
        tool_calls: ["search", "summarize"],
      };

      await backend.saveTrace(trace);
      const retrieved = await backend.getTrace("trace-state");

      expect(retrieved?.state_snapshot).toBeDefined();
      expect(retrieved?.state_snapshot?.user_query).toBe("test query");
      expect(retrieved?.state_snapshot?.tool_calls).toHaveLength(2);
    });

    it("supports hierarchical traces with parent_trace_id", async () => {
      const sessionId = "session-hierarchy";
      const parentTrace = createSessionTrace("trace-parent", sessionId, 0);
      const childTrace = createSessionTrace(
        "trace-child",
        sessionId,
        1,
        "trace-parent"
      );

      await backend.saveTrace(parentTrace);
      await backend.saveTrace(childTrace);

      const retrieved = await backend.getTrace("trace-child");
      expect(retrieved?.parent_trace_id).toBe("trace-parent");
    });
  });
});
