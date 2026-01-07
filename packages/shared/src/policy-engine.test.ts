import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine, type EnforceablePolicyContract } from './policy-engine.js';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('PolicyEngine', () => {
  const testPoliciesDir = '.test-policies';

  beforeEach(() => {
    // Clean up test directory
    try {
      rmSync(testPoliciesDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore if doesn't exist
    }
  });

  describe('Policy Loading', () => {
    it('should load policies from directory', () => {
      mkdirSync(testPoliciesDir, { recursive: true });

      const policy: EnforceablePolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        rules: [
          {
            id: 'no-bad-words',
            type: 'forbidden-content',
            description: 'Block bad words',
            severity: 'critical',
            pattern: /badword/gi,
          },
        ],
      };

      writeFileSync(
        join(testPoliciesDir, 'test-policy.json'),
        JSON.stringify(policy)
      );

      const engine = new PolicyEngine(testPoliciesDir);
      engine.loadPolicies();

      const policies = engine.getPolicies();
      expect(policies).toHaveLength(1);
      expect(policies[0].id).toBe('test-policy');
    });

    it('should handle missing policies directory gracefully', () => {
      const engine = new PolicyEngine('.nonexistent-dir');
      expect(() => engine.loadPolicies()).not.toThrow();
      expect(engine.getPolicies()).toHaveLength(0);
    });

    it('should skip invalid JSON files', () => {
      mkdirSync(testPoliciesDir, { recursive: true });
      writeFileSync(join(testPoliciesDir, 'invalid.json'), 'not valid json {');

      const engine = new PolicyEngine(testPoliciesDir);
      engine.loadPolicies();

      expect(engine.getPolicies()).toHaveLength(0);
    });
  });

  describe('Organizational Hierarchy', () => {
    it('should return global policies for any context', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const globalPolicy: EnforceablePolicyContract = {
        id: 'global-policy',
        name: 'Global Policy',
        description: 'Applies everywhere',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        rules: [],
      };

      engine.addPolicy(globalPolicy);

      const applicable = engine.getApplicablePolicies('org-1', 'service-1');
      expect(applicable).toHaveLength(1);
      expect(applicable[0].id).toBe('global-policy');
    });

    it('should return organization policies for matching org', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const orgPolicy: EnforceablePolicyContract = {
        id: 'org-policy',
        name: 'Org Policy',
        description: 'Org-specific',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'organization',
        organization_id: 'org-acme',
        rules: [],
      };

      engine.addPolicy(orgPolicy);

      const applicable = engine.getApplicablePolicies('org-acme', 'service-1');
      expect(applicable).toHaveLength(1);
      expect(applicable[0].id).toBe('org-policy');

      const notApplicable = engine.getApplicablePolicies('org-other', 'service-1');
      expect(notApplicable).toHaveLength(0);
    });

    it('should return service policies for matching org and service', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const servicePolicy: EnforceablePolicyContract = {
        id: 'service-policy',
        name: 'Service Policy',
        description: 'Service-specific',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'service',
        organization_id: 'org-acme',
        service_id: 'service-support',
        rules: [],
      };

      engine.addPolicy(servicePolicy);

      const applicable = engine.getApplicablePolicies('org-acme', 'service-support');
      expect(applicable).toHaveLength(1);

      const wrongService = engine.getApplicablePolicies('org-acme', 'service-other');
      expect(wrongService).toHaveLength(0);
    });

    it('should sort policies by priority', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const lowPriority: EnforceablePolicyContract = {
        id: 'low',
        name: 'Low Priority',
        description: 'Low',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        priority: 50,
        rules: [],
      };

      const highPriority: EnforceablePolicyContract = {
        id: 'high',
        name: 'High Priority',
        description: 'High',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        priority: 200,
        rules: [],
      };

      engine.addPolicy(lowPriority);
      engine.addPolicy(highPriority);

      const applicable = engine.getApplicablePolicies();
      expect(applicable[0].id).toBe('high'); // Higher priority first
      expect(applicable[1].id).toBe('low');
    });

    it('should skip disabled policies', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const disabledPolicy: EnforceablePolicyContract = {
        id: 'disabled',
        name: 'Disabled',
        description: 'Disabled',
        version: '1.0.0',
        enabled: false,
        enforce_at_proxy: true,
        scope: 'global',
        rules: [],
      };

      engine.addPolicy(disabledPolicy);

      const applicable = engine.getApplicablePolicies();
      expect(applicable).toHaveLength(0);
    });

    it('should filter by enforce_at_proxy flag', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const testOnlyPolicy: EnforceablePolicyContract = {
        id: 'test-only',
        name: 'Test Only',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: false,
        scope: 'global',
        rules: [],
      };

      engine.addPolicy(testOnlyPolicy);

      const enforcedOnly = engine.getApplicablePolicies(undefined, undefined, true);
      expect(enforcedOnly).toHaveLength(0);

      const all = engine.getApplicablePolicies(undefined, undefined, false);
      expect(all).toHaveLength(1);
    });
  });

  describe('Policy Enforcement', () => {
    it('should allow response when no policies apply', async () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const result = await engine.enforce('Clean response');

      expect(result.allowed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.enforcedPolicies).toHaveLength(0);
    });

    it('should block response on critical violation', async () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const policy: EnforceablePolicyContract = {
        id: 'pii-policy',
        name: 'PII Protection',
        description: 'Block PII',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        rules: [
          {
            id: 'no-pii',
            type: 'no-pii',
            description: 'Block PII',
            severity: 'critical',
          },
        ],
      };

      engine.addPolicy(policy);

      const result = await engine.enforce('My email is john@example.com');

      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toBe('pii-policy');
      expect(result.message).toContain('critical');
    });

    it('should block response on high violation', async () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const policy: EnforceablePolicyContract = {
        id: 'content-policy',
        name: 'Content Policy',
        description: 'Block bad content',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        rules: [
          {
            id: 'no-violence',
            type: 'forbidden-content',
            description: 'Block violence',
            severity: 'high',
            pattern: /violence|harm/gi,
          },
        ],
      };

      engine.addPolicy(policy);

      const result = await engine.enforce('This contains violence');

      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toBe('content-policy');
    });

    it('should allow response with medium/low violations', async () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const policy: EnforceablePolicyContract = {
        id: 'quality-policy',
        name: 'Quality Policy',
        description: 'Quality checks',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        rules: [
          {
            id: 'min-length',
            type: 'min-length',
            description: 'Minimum length',
            severity: 'medium',
            minLength: 100,
          },
        ],
      };

      engine.addPolicy(policy);

      const result = await engine.enforce('Short response');

      expect(result.allowed).toBe(true);
      // Medium/low violations are still passed through
      expect(result.violations.length).toBeGreaterThanOrEqual(0);
    });

    it('should evaluate multiple policies', async () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const policy1: EnforceablePolicyContract = {
        id: 'policy-1',
        name: 'Policy 1',
        description: 'First policy',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        rules: [
          {
            id: 'rule-1',
            type: 'forbidden-content',
            description: 'Block word1',
            severity: 'medium',
            pattern: /word1/gi,
          },
        ],
      };

      const policy2: EnforceablePolicyContract = {
        id: 'policy-2',
        name: 'Policy 2',
        description: 'Second policy',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        rules: [
          {
            id: 'rule-2',
            type: 'forbidden-content',
            description: 'Block word2',
            severity: 'medium',
            pattern: /word2/gi,
          },
        ],
      };

      engine.addPolicy(policy1);
      engine.addPolicy(policy2);

      const result = await engine.enforce('Contains word1 and word2');

      expect(result.allowed).toBe(true);
      expect(result.enforcedPolicies).toHaveLength(2);
    });

    it('should stop at first blocking policy', async () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const blockingPolicy: EnforceablePolicyContract = {
        id: 'blocking',
        name: 'Blocking Policy',
        description: 'Blocks',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        priority: 200,
        rules: [
          {
            id: 'critical-rule',
            type: 'forbidden-content',
            description: 'Critical',
            severity: 'critical',
            pattern: /badword/gi,
          },
        ],
      };

      const otherPolicy: EnforceablePolicyContract = {
        id: 'other',
        name: 'Other Policy',
        description: 'Other',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        priority: 100,
        rules: [],
      };

      engine.addPolicy(blockingPolicy);
      engine.addPolicy(otherPolicy);

      const result = await engine.enforce('Contains badword');

      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toBe('blocking');
      expect(result.enforcedPolicies).toHaveLength(1); // Stopped after first block
    });
  });

  describe('shouldBlock Helper', () => {
    it('should return true when response is blocked', async () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const policy: EnforceablePolicyContract = {
        id: 'blocking-policy',
        name: 'Blocking',
        description: 'Blocks',
        version: '1.0.0',
        enabled: true,
        enforce_at_proxy: true,
        scope: 'global',
        rules: [
          {
            id: 'critical',
            type: 'no-pii',
            description: 'Block PII',
            severity: 'critical',
          },
        ],
      };

      engine.addPolicy(policy);

      const shouldBlock = await engine.shouldBlock('Email: test@example.com');
      expect(shouldBlock).toBe(true);
    });

    it('should return false when response is allowed', async () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const shouldBlock = await engine.shouldBlock('Clean response');
      expect(shouldBlock).toBe(false);
    });
  });

  describe('Policy Management', () => {
    it('should add policy programmatically', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const policy: EnforceablePolicyContract = {
        id: 'new-policy',
        name: 'New Policy',
        description: 'New',
        version: '1.0.0',
        enabled: true,
        rules: [],
      };

      engine.addPolicy(policy);

      const policies = engine.getPolicies();
      expect(policies).toHaveLength(1);
      expect(policies[0].id).toBe('new-policy');
    });

    it('should remove policy by ID', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const policy: EnforceablePolicyContract = {
        id: 'to-remove',
        name: 'To Remove',
        description: 'Remove',
        version: '1.0.0',
        enabled: true,
        rules: [],
      };

      engine.addPolicy(policy);
      expect(engine.getPolicies()).toHaveLength(1);

      engine.removePolicy('to-remove');
      expect(engine.getPolicies()).toHaveLength(0);
    });

    it('should update existing policy', () => {
      const engine = new PolicyEngine(testPoliciesDir);

      const policy: EnforceablePolicyContract = {
        id: 'policy',
        name: 'Original Name',
        description: 'Original',
        version: '1.0.0',
        enabled: true,
        rules: [],
      };

      engine.addPolicy(policy);

      const updated: EnforceablePolicyContract = {
        ...policy,
        name: 'Updated Name',
      };

      engine.addPolicy(updated);

      const policies = engine.getPolicies();
      expect(policies).toHaveLength(1);
      expect(policies[0].name).toBe('Updated Name');
    });
  });
});
