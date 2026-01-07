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
  private stepId?: string;
  private parentStepId?: string;
  private organizationId?: string;
  private serviceId?: string;

  /**
   * Create a new session tracker
   * @param sessionId Optional session ID. If not provided, a new UUID will be generated.
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param serviceId Optional service ID for service-level tracking
   */
  constructor(sessionId?: string, organizationId?: string, serviceId?: string) {
    this.sessionId = sessionId || randomUUID();
    this.organizationId = organizationId;
    this.serviceId = serviceId;
  }

  /**
   * Start a new session (resets state and step counter)
   */
  start(): void {
    this.sessionId = randomUUID();
    this.currentStep = 0;
    this.state = {};
    this.parentTraceId = undefined;
    this.stepId = undefined;
    this.parentStepId = undefined;
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
   * Fork a new step branch from current step (DAG support)
   * @returns New step ID for the forked branch
   */
  fork(): string {
    const newStepId = randomUUID();
    this.parentStepId = this.stepId || undefined;
    this.stepId = newStepId;
    this.currentStep++;
    return newStepId;
  }

  /**
   * Join back to parent after parallel execution
   * @param parentStepId The step ID to join back to
   */
  join(parentStepId: string): void {
    this.parentStepId = parentStepId;
    this.stepId = randomUUID();
    this.currentStep++;
  }

  /**
   * Get current step ID
   */
  getStepId(): string | undefined {
    return this.stepId;
  }

  /**
   * Set organization ID for multi-tenant tracking
   */
  setOrganizationId(organizationId: string): void {
    this.organizationId = organizationId;
  }

  /**
   * Set service ID for service-level tracking
   */
  setServiceId(serviceId: string): void {
    this.serviceId = serviceId;
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

    if (this.stepId) {
      headers["X-TraceForge-Step-ID"] = this.stepId;
    }

    if (this.parentStepId) {
      headers["X-TraceForge-Parent-Step-ID"] = this.parentStepId;
    }

    if (this.organizationId) {
      headers["X-TraceForge-Organization-ID"] = this.organizationId;
    }

    if (this.serviceId) {
      headers["X-TraceForge-Service-ID"] = this.serviceId;
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
