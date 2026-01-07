/**
 * Policy Engine - Runtime enforcement of policy contracts at proxy level
 * Extends policy evaluation from test-time to production enforcement
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import type { PolicyContract, PolicyEvaluationResult } from "./policies.js";
import { evaluatePolicy } from "./policies.js";

export type PolicyScope = "global" | "organization" | "service" | "test";

export interface EnforceablePolicyContract extends PolicyContract {
  /**
   * Whether to enforce this policy at proxy level (blocks requests/responses)
   * Default: false (test-time only)
   */
  enforce_at_proxy?: boolean;

  /**
   * Organizational scope for this policy
   */
  organization_id?: string;

  /**
   * Service scope for this policy
   */
  service_id?: string;

  /**
   * Policy scope level (determines inheritance)
   */
  scope?: PolicyScope;

  /**
   * Priority for conflict resolution (higher wins)
   * Default: 100
   */
  priority?: number;
}

export interface PolicyEnforcementResult {
  allowed: boolean;
  violations: PolicyEvaluationResult["violations"];
  blockedBy?: string; // Policy ID that blocked the request
  message?: string;
  enforcedPolicies: string[]; // List of policy IDs evaluated
}

export class PolicyEngine {
  private policies: Map<string, EnforceablePolicyContract> = new Map();
  private policiesDirectory: string;

  constructor(policiesDirectory: string = ".traceforge/policies") {
    this.policiesDirectory = policiesDirectory;
  }

  /**
   * Load policies from filesystem
   * Scans for .json files in policies directory and subdirectories
   */
  loadPolicies(): void {
    this.policies.clear();

    if (!existsSync(this.policiesDirectory)) {
      return; // No policies directory
    }

    const loadPoliciesFromDir = (dir: string) => {
      const files = readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = join(dir, file.name);

        if (file.isDirectory()) {
          loadPoliciesFromDir(fullPath);
        } else if (file.name.endsWith(".json")) {
          try {
            const content = readFileSync(fullPath, "utf-8");
            const policy: EnforceablePolicyContract = JSON.parse(content);

            if (policy.id && policy.name) {
              this.policies.set(policy.id, policy);
            }
          } catch (error) {
            console.warn(`Failed to load policy from ${fullPath}:`, error);
          }
        }
      }
    };

    loadPoliciesFromDir(this.policiesDirectory);
  }

  /**
   * Add or update a policy programmatically
   */
  addPolicy(policy: EnforceablePolicyContract): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Remove a policy by ID
   */
  removePolicy(policyId: string): void {
    this.policies.delete(policyId);
  }

  /**
   * Get all loaded policies
   */
  getPolicies(): EnforceablePolicyContract[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get applicable policies for a given context
   * Implements organizational hierarchy: global > org > service > test
   */
  getApplicablePolicies(
    organizationId?: string,
    serviceId?: string,
    enforcedOnly: boolean = true
  ): EnforceablePolicyContract[] {
    const applicable: EnforceablePolicyContract[] = [];

    for (const policy of this.policies.values()) {
      // Skip disabled policies
      if (!policy.enabled) continue;

      // If enforcedOnly, skip non-enforced policies
      if (enforcedOnly && !policy.enforce_at_proxy) continue;

      // Check scope hierarchy
      if (policy.scope === "global") {
        applicable.push(policy);
      } else if (
        policy.scope === "organization" &&
        organizationId === policy.organization_id
      ) {
        applicable.push(policy);
      } else if (
        policy.scope === "service" &&
        serviceId === policy.service_id &&
        organizationId === policy.organization_id
      ) {
        applicable.push(policy);
      } else if (!policy.scope) {
        // Legacy policies without scope - treat as global
        applicable.push(policy);
      }
    }

    // Sort by priority (higher priority first)
    return applicable.sort((a, b) => (b.priority || 100) - (a.priority || 100));
  }

  /**
   * Enforce policies against a response
   * Returns whether the response should be allowed
   */
  async enforce(
    response: string,
    organizationId?: string,
    serviceId?: string
  ): Promise<PolicyEnforcementResult> {
    const applicablePolicies = this.getApplicablePolicies(
      organizationId,
      serviceId,
      true
    );

    if (applicablePolicies.length === 0) {
      return {
        allowed: true,
        violations: [],
        enforcedPolicies: [],
      };
    }

    const allViolations: PolicyEvaluationResult["violations"] = [];
    const enforcedPolicyIds: string[] = [];

    // Evaluate each applicable policy
    for (const policy of applicablePolicies) {
      const result = await evaluatePolicy(response, policy);
      enforcedPolicyIds.push(policy.id);

      if (!result.passed) {
        // Critical or high violations block the response
        if (result.criticalCount > 0 || result.highCount > 0) {
          return {
            allowed: false,
            violations: result.violations,
            blockedBy: policy.id,
            message: `Blocked by policy "${policy.name}" (${policy.id}): ${result.criticalCount} critical, ${result.highCount} high violations`,
            enforcedPolicies: enforcedPolicyIds,
          };
        }

        // Collect medium/low violations for logging
        allViolations.push(...result.violations);
      }
    }

    return {
      allowed: true,
      violations: allViolations,
      enforcedPolicies: enforcedPolicyIds,
      message:
        allViolations.length > 0
          ? `${allViolations.length} non-blocking violations detected`
          : undefined,
    };
  }

  /**
   * Check if a response should be blocked (simple boolean check)
   */
  async shouldBlock(
    response: string,
    organizationId?: string,
    serviceId?: string
  ): Promise<boolean> {
    const result = await this.enforce(response, serviceId, organizationId);
    return !result.allowed;
  }
}
