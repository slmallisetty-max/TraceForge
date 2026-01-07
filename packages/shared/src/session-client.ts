import { randomUUID } from "crypto";

/**
 * SessionTracker helps client applications manage multi-step agentic sessions.
 * It handles session IDs, step tracking, state management, and header generation.
 */
export class SessionTracker {
  private sessionId: string;
  private currentStep: number = 0;
  private state: Record<string, any> = {};
  private parentTraceId?: string;

  /**
   * Create a new session tracker
   * @param sessionId Optional session ID. If not provided, a new UUID will be generated.
   */
  constructor(sessionId?: string) {
    this.sessionId = sessionId || randomUUID();
  }

  /**
   * Start a new session (resets state and step counter)
   */
  start(): void {
    this.sessionId = randomUUID();
    this.currentStep = 0;
    this.state = {};
    this.parentTraceId = undefined;
  }

  /**
   * Update session state
   * @param key State key
   * @param value State value
   */
  setState(key: string, value: any): void {
    this.state[key] = value;
  }

  /**
   * Get current session state
   */
  getState(): Record<string, any> {
    return { ...this.state };
  }

  /**
   * Set the parent trace ID for hierarchical relationships
   * @param traceId Parent trace ID
   */
  setParentTraceId(traceId: string): void {
    this.parentTraceId = traceId;
  }

  /**
   * Get headers for the next API call
   * @returns Headers object with session tracking information
   */
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "X-TraceForge-Session-ID": this.sessionId,
      "X-TraceForge-Step-Index": this.currentStep.toString(),
    };

    if (this.parentTraceId) {
      headers["X-TraceForge-Parent-Trace-ID"] = this.parentTraceId;
    }

    // Only include state if it's not empty
    if (Object.keys(this.state).length > 0) {
      headers["X-TraceForge-State"] = JSON.stringify(this.state);
    }

    return headers;
  }

  /**
   * Increment step counter for the next step
   */
  nextStep(): void {
    this.currentStep++;
  }

  /**
   * Get current step index
   */
  getCurrentStep(): number {
    return this.currentStep;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * End session (optional cleanup)
   */
  end(): void {
    // Optional: Could add any cleanup logic here
    // For now, we just mark the session as complete conceptually
  }
}
