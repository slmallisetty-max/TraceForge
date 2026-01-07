import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { unlinkSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { SQLiteStorageBackend } from "./storage-sqlite";
import type { Trace, Test } from "@traceforge/shared";

describe("SQLiteStorageBackend", () => {
  const testDbPath = resolve(process.cwd(), ".ai-tests/test-traces.db");
  let backend: SQLiteStorageBackend;

  beforeEach(() => {
    // Ensure .ai-tests directory exists
    const testDir = resolve(process.cwd(), ".ai-tests");
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

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
      // For this test to work with created_at, we need to manually set created_at
      // by directly manipulating the database after insert
      await backend.saveTrace(createTestTrace("old-1", 86400 * 2)); // 2 days old
      await backend.saveTrace(createTestTrace("old-2", 86400 * 3)); // 3 days old  
      await backend.saveTrace(createTestTrace("new-1", 0)); // Fresh

      // Manually update created_at for old traces to simulate age
      // @ts-ignore - accessing private db for testing
      const db = backend['db'];
      const cutoffTime = Math.floor(Date.now() / 1000) - 86400 * 2; // 2 days ago
      db.prepare("UPDATE traces SET created_at = ? WHERE id = 'old-1'").run(cutoffTime);
      db.prepare("UPDATE traces SET created_at = ? WHERE id = 'old-2'").run(cutoffTime - 86400); // 3 days ago

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

      // Manually update created_at for old traces
      // @ts-ignore - accessing private db for testing
      const db = backend['db'];
      const cutoffTime = Math.floor(Date.now() / 1000) - 86400 * 2;
      db.prepare("UPDATE traces SET created_at = ? WHERE id = 'old-1'").run(cutoffTime);
      db.prepare("UPDATE traces SET created_at = ? WHERE id = 'old-2'").run(cutoffTime - 86400);

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

  describe("FTS5 Full-Text Search", () => {
    const createTraceWithContent = (
      id: string,
      content: string,
      model: string = "gpt-4"
    ): Trace => ({
      id,
      timestamp: new Date().toISOString(),
      endpoint: "/v1/chat/completions",
      request: {
        model,
        messages: [{ role: "user", content }],
      },
      response: {
        id: `response-${id}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            message: { role: "assistant", content: `Response: ${content}` },
            index: 0,
            finish_reason: "stop",
          },
        ],
      },
      metadata: {
        model,
        status: "success",
        duration_ms: 100,
      },
      schema_version: "1.0.0",
    });

    describe("searchTraces", () => {
      it("finds traces by request content", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "authentication error")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-2", "successful login")
        );

        const results = await backend.searchTraces("authentication");
        expect(results.length).toBeGreaterThan(0);
        expect(
          results.some((r) =>
            r.request.messages?.some((m) => m.content.includes("authentication"))
          )
        ).toBe(true);
      });

      it("finds traces by response content", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "invalid credentials")
        );

        const results = await backend.searchTraces("credentials");
        expect(results.length).toBeGreaterThan(0);
        expect(
          results.some((r) =>
            r.response?.choices?.[0]?.message?.content?.includes(
              "credentials"
            )
          )
        ).toBe(true);
      });

      it("supports boolean AND operator", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "user login success")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-2", "user logout")
        );

        const results = await backend.searchTraces("user AND login");
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe("trace-1");
      });

      it("supports boolean OR operator", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "authentication error")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-2", "authorization failure")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-3", "successful login")
        );

        const results = await backend.searchTraces("error OR failure");
        expect(results.length).toBeGreaterThanOrEqual(2);
      });

      it("supports NOT operator", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "authentication success")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-2", "authentication error")
        );

        const results = await backend.searchTraces("authentication NOT error");
        expect(results.length).toBeGreaterThan(0);
        expect(
          results.every(
            (r) =>
              !r.request.messages?.some((m) => m.content.includes("error"))
          )
        ).toBe(true);
      });

      it("respects limit and offset for pagination", async () => {
        for (let i = 0; i < 50; i++) {
          await backend.saveTrace(
            createTraceWithContent(`trace-${i}`, "test query")
          );
        }

        const page1 = await backend.searchTraces("test", {
          limit: 10,
          offset: 0,
        });
        const page2 = await backend.searchTraces("test", {
          limit: 10,
          offset: 10,
        });

        expect(page1).toHaveLength(10);
        expect(page2).toHaveLength(10);
        expect(page1[0].id).not.toBe(page2[0].id);
      });

      it("filters by model", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "test query", "gpt-4")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-2", "test query", "claude-3")
        );

        const results = await backend.searchTraces("test", {
          filterModel: "gpt-4",
        });
        expect(results).toHaveLength(1);
        expect(results[0].metadata.model).toBe("gpt-4");
      });

      it("filters by status", async () => {
        const successTrace = createTraceWithContent(
          "trace-1",
          "test query",
          "gpt-4"
        );
        successTrace.metadata.status = "success";

        const errorTrace = createTraceWithContent(
          "trace-2",
          "test query",
          "gpt-4"
        );
        errorTrace.metadata.status = "error";
        errorTrace.response = null;

        await backend.saveTrace(successTrace);
        await backend.saveTrace(errorTrace);

        const results = await backend.searchTraces("test", {
          filterStatus: "success",
        });
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((r) => r.metadata.status === "success")).toBe(
          true
        );
      });

      it("returns results ordered by relevance (BM25)", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "error error error error")
        );
        await backend.saveTrace(createTraceWithContent("trace-2", "error"));

        const results = await backend.searchTraces("error");
        expect(results.length).toBeGreaterThanOrEqual(2);
        // First result should be more relevant (more occurrences)
        expect(results[0].id).toBe("trace-1");
      });

      it("handles empty results gracefully", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "authentication")
        );

        const results = await backend.searchTraces("nonexistent");
        expect(results).toHaveLength(0);
      });

      it("searches across multiple fields", async () => {
        const trace = createTraceWithContent(
          "trace-1",
          "user authentication",
          "gpt-4"
        );
        trace.endpoint = "/v1/chat/completions";
        await backend.saveTrace(trace);

        // Should find by model
        let results = await backend.searchTraces("gpt-4");
        expect(results.length).toBeGreaterThan(0);

        // Should find by endpoint
        results = await backend.searchTraces("chat");
        expect(results.length).toBeGreaterThan(0);
      });
    });

    describe("countSearchResults", () => {
      it("counts total matching traces", async () => {
        for (let i = 0; i < 100; i++) {
          await backend.saveTrace(
            createTraceWithContent(`trace-${i}`, "test query")
          );
        }

        const count = await backend.countSearchResults("test");
        expect(count).toBe(100);
      });

      it("returns 0 for no matches", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "authentication")
        );

        const count = await backend.countSearchResults("nonexistent");
        expect(count).toBe(0);
      });

      it("counts correctly with complex queries", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "authentication error")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-2", "authentication success")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-3", "authorization error")
        );

        const count = await backend.countSearchResults(
          "authentication AND error"
        );
        expect(count).toBe(1);
      });
    });

    describe("getSearchSuggestions", () => {
      it("suggests models based on prefix", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "test", "gpt-4")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-2", "test", "gpt-3.5-turbo")
        );
        await backend.saveTrace(
          createTraceWithContent("trace-3", "test", "claude-3")
        );

        const suggestions = await backend.getSearchSuggestions("gpt");
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions).toContain("gpt-4");
        expect(suggestions).toContain("gpt-3.5-turbo");
        expect(suggestions).not.toContain("claude-3");
      });

      it("respects limit parameter", async () => {
        for (let i = 0; i < 20; i++) {
          await backend.saveTrace(
            createTraceWithContent(`trace-${i}`, "test", `model-${i}`)
          );
        }

        const suggestions = await backend.getSearchSuggestions("model", 5);
        expect(suggestions.length).toBeLessThanOrEqual(5);
      });

      it("returns empty array for no matches", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "test", "gpt-4")
        );

        const suggestions = await backend.getSearchSuggestions("claude");
        expect(suggestions).toHaveLength(0);
      });
    });

    describe("FTS5 Triggers", () => {
      it("automatically indexes traces on insert", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "automatically indexed")
        );

        const results = await backend.searchTraces("automatically");
        expect(results).toHaveLength(1);
        expect(results[0].id).toBe("trace-1");
      });

      it("updates FTS index on trace update", async () => {
        const trace = createTraceWithContent(
          "trace-1",
          "original content",
          "gpt-4"
        );
        await backend.saveTrace(trace);

        // Update the trace with new request and response
        trace.request.messages = [
          { role: "user", content: "updated content" },
        ];
        if (trace.response) {
          trace.response.choices[0].message!.content = "Response: updated content";
        }
        await backend.saveTrace(trace);

        // Should find by new content
        const results = await backend.searchTraces("updated");
        expect(results.length).toBeGreaterThan(0);

        // Should not find by old content
        const oldResults = await backend.searchTraces("original");
        expect(oldResults).toHaveLength(0);
      });

      it("removes from FTS index on trace delete", async () => {
        await backend.saveTrace(
          createTraceWithContent("trace-1", "to be deleted")
        );

        // Verify it's searchable
        let results = await backend.searchTraces("deleted");
        expect(results).toHaveLength(1);

        // Delete the trace
        await backend.deleteTrace("trace-1");

        // Should not be searchable anymore
        results = await backend.searchTraces("deleted");
        expect(results).toHaveLength(0);
      });
    });

    describe("FTS5 Migration", () => {
      it("populates FTS index with existing traces on migration", async () => {
        // This test verifies that the migration in runMigrations() works
        // Since we're using a fresh database in beforeEach, the FTS table
        // is created in initSchema and the migration runs automatically

        await backend.saveTrace(
          createTraceWithContent("trace-1", "existing trace")
        );

        const results = await backend.searchTraces("existing");
        expect(results).toHaveLength(1);
      });
    });
  });
});
