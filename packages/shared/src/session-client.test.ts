import { describe, it, expect, beforeEach } from "vitest";
import { SessionTracker } from "./session-client";

describe("SessionTracker", () => {
  let tracker: SessionTracker;

  beforeEach(() => {
    tracker = new SessionTracker();
  });

  describe("initialization", () => {
    it("generates a session ID automatically", () => {
      const sessionId = tracker.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it("uses provided session ID", () => {
      const customTracker = new SessionTracker("custom-session-id");
      expect(customTracker.getSessionId()).toBe("custom-session-id");
    });

    it("starts at step 0", () => {
      expect(tracker.getCurrentStep()).toBe(0);
    });

    it("starts with empty state", () => {
      const state = tracker.getState();
      expect(state).toEqual({});
    });
  });

  describe("state management", () => {
    it("sets and retrieves state", () => {
      tracker.setState("key1", "value1");
      tracker.setState("key2", 123);

      const state = tracker.getState();
      expect(state.key1).toBe("value1");
      expect(state.key2).toBe(123);
    });

    it("updates existing state", () => {
      tracker.setState("count", 1);
      tracker.setState("count", 2);

      const state = tracker.getState();
      expect(state.count).toBe(2);
    });

    it("returns a copy of state", () => {
      tracker.setState("key", "value");
      const state1 = tracker.getState();
      const state2 = tracker.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different objects
    });
  });

  describe("step tracking", () => {
    it("increments step index", () => {
      expect(tracker.getCurrentStep()).toBe(0);

      tracker.nextStep();
      expect(tracker.getCurrentStep()).toBe(1);

      tracker.nextStep();
      expect(tracker.getCurrentStep()).toBe(2);
    });

    it("includes step index in headers", () => {
      const headers1 = tracker.getHeaders();
      expect(headers1["X-TraceForge-Step-Index"]).toBe("0");

      tracker.nextStep();
      const headers2 = tracker.getHeaders();
      expect(headers2["X-TraceForge-Step-Index"]).toBe("1");
    });
  });

  describe("session lifecycle", () => {
    it("starts a new session", () => {
      tracker.setState("old", "data");
      tracker.nextStep();
      const oldSessionId = tracker.getSessionId();

      tracker.start();

      // New session should have new ID
      expect(tracker.getSessionId()).not.toBe(oldSessionId);

      // State should be reset
      expect(tracker.getState()).toEqual({});

      // Step should be reset
      expect(tracker.getCurrentStep()).toBe(0);
    });

    it("ends a session", () => {
      tracker.end();
      // End is currently a no-op, but should not throw
      expect(tracker.getSessionId()).toBeDefined();
    });
  });

  describe("header generation", () => {
    it("generates session headers", () => {
      const headers = tracker.getHeaders();

      expect(headers["X-TraceForge-Session-ID"]).toBeDefined();
      expect(headers["X-TraceForge-Step-Index"]).toBe("0");
    });

    it("includes parent trace ID when set", () => {
      tracker.setParentTraceId("parent-trace-123");
      const headers = tracker.getHeaders();

      expect(headers["X-TraceForge-Parent-Trace-ID"]).toBe("parent-trace-123");
    });

    it("omits parent trace ID when not set", () => {
      const headers = tracker.getHeaders();
      expect(headers["X-TraceForge-Parent-Trace-ID"]).toBeUndefined();
    });

    it("includes state when present", () => {
      tracker.setState("user_query", "Book a flight");
      tracker.setState("tool", "search_flights");

      const headers = tracker.getHeaders();
      const stateHeader = headers["X-TraceForge-State"];

      expect(stateHeader).toBeDefined();
      const parsedState = JSON.parse(stateHeader);
      expect(parsedState.user_query).toBe("Book a flight");
      expect(parsedState.tool).toBe("search_flights");
    });

    it("omits state header when empty", () => {
      const headers = tracker.getHeaders();
      expect(headers["X-TraceForge-State"]).toBeUndefined();
    });
  });

  describe("parent trace ID", () => {
    it("sets and includes parent trace ID", () => {
      tracker.setParentTraceId("parent-123");
      const headers = tracker.getHeaders();
      expect(headers["X-TraceForge-Parent-Trace-ID"]).toBe("parent-123");
    });
  });

  describe("integration scenario", () => {
    it("simulates a multi-step agent workflow", () => {
      // Step 1: User query
      tracker.setState("user_query", "Book a flight to Paris");
      const headers1 = tracker.getHeaders();

      expect(headers1["X-TraceForge-Step-Index"]).toBe("0");
      expect(JSON.parse(headers1["X-TraceForge-State"]).user_query).toBe(
        "Book a flight to Paris"
      );

      // Step 2: Tool call
      tracker.nextStep();
      tracker.setState("tool_called", "search_flights");
      tracker.setState("search_params", { destination: "Paris", date: "2024-06-01" });
      const headers2 = tracker.getHeaders();

      expect(headers2["X-TraceForge-Step-Index"]).toBe("1");
      expect(JSON.parse(headers2["X-TraceForge-State"]).tool_called).toBe(
        "search_flights"
      );

      // Step 3: Present results
      tracker.nextStep();
      tracker.setState("results_count", 5);
      const headers3 = tracker.getHeaders();

      expect(headers3["X-TraceForge-Step-Index"]).toBe("2");
      expect(JSON.parse(headers3["X-TraceForge-State"]).results_count).toBe(5);

      // End session
      tracker.end();
    });
  });
});
