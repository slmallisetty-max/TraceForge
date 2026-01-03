import { describe, it, expect } from 'vitest';
import {
  evaluatePolicy,
  formatPolicyResult,
  type PolicyContract,
} from './policies.js';
import {
  PII_PROTECTION_POLICY,
  MEDICAL_SAFETY_POLICY,
  FINANCIAL_ADVICE_POLICY,
  CONTENT_SAFETY_POLICY,
  CUSTOMER_SUPPORT_POLICY,
  getPolicyTemplate,
  listPolicyTemplates,
} from './policy-templates.js';

describe('Policy Contracts', () => {
  describe('evaluatePolicy', () => {
    it('should pass when no violations found', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'test-rule',
            type: 'forbidden-content',
            description: 'Block bad words',
            severity: 'high',
            pattern: /badword/gi,
          },
        ],
      };

      const response = 'This is a clean response.';
      const result = await evaluatePolicy(response, policy);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.criticalCount).toBe(0);
      expect(result.highCount).toBe(0);
    });

    it('should detect forbidden content violations', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'no-bad-words',
            type: 'forbidden-content',
            description: 'Block bad words',
            severity: 'high',
            pattern: /badword/gi,
          },
        ],
      };

      const response = 'This contains a badword.';
      const result = await evaluatePolicy(response, policy);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleId).toBe('no-bad-words');
      expect(result.violations[0].severity).toBe('high');
      expect(result.violations[0].matched).toBe('badword');
    });

    it('should detect multiple violations', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'no-bad-words',
            type: 'forbidden-content',
            description: 'Block bad words',
            severity: 'high',
            patterns: [/badword/gi, /forbidden/gi],
          },
        ],
      };

      const response = 'This has badword and forbidden content.';
      const result = await evaluatePolicy(response, policy);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.highCount).toBe(2);
    });

    it('should check required content', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'require-disclaimer',
            type: 'required-content',
            description: 'Require disclaimer',
            severity: 'high',
            pattern: /disclaimer/i,
          },
        ],
      };

      const resultWithout = await evaluatePolicy('This response has no warning.', policy);
      expect(resultWithout.passed).toBe(false);
      expect(resultWithout.violations).toHaveLength(1);

      const resultWith = await evaluatePolicy('This includes a disclaimer.', policy);
      expect(resultWith.passed).toBe(true);
      expect(resultWith.violations).toHaveLength(0);
    });

    it('should enforce maximum length', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'max-length',
            type: 'max-length',
            description: 'Max 50 chars',
            severity: 'medium',
            maxLength: 50,
          },
        ],
      };

      const shortResponse = 'Short response.';
      const resultShort = await evaluatePolicy(shortResponse, policy);
      expect(resultShort.passed).toBe(true);

      const longResponse = 'This is a very long response that exceeds fifty characters.';
      const resultLong = await evaluatePolicy(longResponse, policy);
      expect(resultLong.passed).toBe(true); // Medium severity doesn't fail
      expect(resultLong.violations).toHaveLength(1);
      expect(resultLong.mediumCount).toBe(1);
    });

    it('should enforce minimum length', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'min-length',
            type: 'min-length',
            description: 'Min 20 chars',
            severity: 'low',
            minLength: 20,
          },
        ],
      };

      const shortResponse = 'Too short.';
      const result = await evaluatePolicy(shortResponse, policy);
      expect(result.passed).toBe(true); // Low severity doesn't fail
      expect(result.violations).toHaveLength(1);
      expect(result.lowCount).toBe(1);
    });

    it('should detect PII', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'no-pii',
            type: 'no-pii',
            description: 'Block PII',
            severity: 'critical',
          },
        ],
      };

      const responseWithEmail = 'Contact me at john@example.com';
      const resultEmail = await evaluatePolicy(responseWithEmail, policy);
      expect(resultEmail.passed).toBe(false);
      expect(resultEmail.violations.length).toBeGreaterThan(0);
      expect(resultEmail.criticalCount).toBeGreaterThan(0);

      const responseWithPhone = 'Call me at 555-123-4567';
      const resultPhone = await evaluatePolicy(responseWithPhone, policy);
      expect(resultPhone.passed).toBe(false);
      expect(resultPhone.violations.length).toBeGreaterThan(0);

      const cleanResponse = 'Contact me through the website';
      const resultClean = await evaluatePolicy(cleanResponse, policy);
      expect(resultClean.passed).toBe(true);
    });

    it('should skip disabled rules', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'disabled-rule',
            type: 'forbidden-content',
            description: 'Disabled',
            severity: 'critical',
            pattern: /badword/gi,
            enabled: false,
          },
        ],
      };

      const response = 'This has badword.';
      const result = await evaluatePolicy(response, policy);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should skip disabled policies', async () => {
      const policy: PolicyContract = {
        id: 'test-policy',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: false,
        rules: [
          {
            id: 'test-rule',
            type: 'forbidden-content',
            description: 'Test',
            severity: 'critical',
            pattern: /badword/gi,
          },
        ],
      };

      const response = 'This has badword.';
      const result = await evaluatePolicy(response, policy);
      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Policy Templates', () => {
    it('should have PII protection template', () => {
      expect(PII_PROTECTION_POLICY).toBeDefined();
      expect(PII_PROTECTION_POLICY.id).toBe('pii-protection');
      expect(PII_PROTECTION_POLICY.rules.length).toBeGreaterThan(0);
    });

    it('should detect email in PII policy', async () => {
      const response = 'My email is test@example.com';
      const result = await evaluatePolicy(response, PII_PROTECTION_POLICY);
      expect(result.passed).toBe(false);
      expect(result.criticalCount).toBeGreaterThan(0);
    });

    it('should have medical safety template', () => {
      expect(MEDICAL_SAFETY_POLICY).toBeDefined();
      expect(MEDICAL_SAFETY_POLICY.id).toBe('medical-safety');
    });

    it('should detect diagnosis language in medical policy', async () => {
      const response = 'You have diabetes based on your symptoms.';
      const result = await evaluatePolicy(response, MEDICAL_SAFETY_POLICY);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should have financial advice template', () => {
      expect(FINANCIAL_ADVICE_POLICY).toBeDefined();
      expect(FINANCIAL_ADVICE_POLICY.id).toBe('financial-advice');
    });

    it('should detect guaranteed returns in financial policy', async () => {
      const response = 'This investment has guaranteed returns of 20%.';
      const result = await evaluatePolicy(response, FINANCIAL_ADVICE_POLICY);
      expect(result.passed).toBe(false);
      expect(result.criticalCount).toBeGreaterThan(0);
    });

    it('should have content safety template', () => {
      expect(CONTENT_SAFETY_POLICY).toBeDefined();
      expect(CONTENT_SAFETY_POLICY.id).toBe('content-safety');
    });

    it('should detect violent content in content safety policy', async () => {
      const response = 'Here is how to harm someone...';
      const result = await evaluatePolicy(response, CONTENT_SAFETY_POLICY);
      expect(result.passed).toBe(false);
      expect(result.criticalCount).toBeGreaterThan(0);
    });

    it('should have customer support template', () => {
      expect(CUSTOMER_SUPPORT_POLICY).toBeDefined();
      expect(CUSTOMER_SUPPORT_POLICY.id).toBe('customer-support');
    });

    it('should get policy template by ID', () => {
      const policy = getPolicyTemplate('pii-protection');
      expect(policy).toBeDefined();
      expect(policy?.id).toBe('pii-protection');
    });

    it('should list all policy templates', () => {
      const templates = listPolicyTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.id === 'pii-protection')).toBe(true);
      expect(templates.some(t => t.id === 'medical-safety')).toBe(true);
      expect(templates.some(t => t.id === 'financial-advice')).toBe(true);
    });
  });

  describe('formatPolicyResult', () => {
    it('should format passing result', async () => {
      const policy: PolicyContract = {
        id: 'test',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [],
      };

      const result = await evaluatePolicy('Clean response', policy);
      const formatted = formatPolicyResult(result);

      expect(formatted).toContain('✅');
      expect(formatted).toContain('PASSED');
      expect(formatted).toContain('Test Policy');
    });

    it('should format failing result with violations', async () => {
      const policy: PolicyContract = {
        id: 'test',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'test-rule',
            type: 'forbidden-content',
            description: 'Test',
            severity: 'critical',
            pattern: /badword/gi,
          },
        ],
      };

      const result = await evaluatePolicy('Has badword', policy);
      const formatted = formatPolicyResult(result);

      expect(formatted).toContain('❌');
      expect(formatted).toContain('FAILED');
      expect(formatted).toContain('🔴');
      expect(formatted).toContain('Critical: 1');
      expect(formatted).toContain('badword');
    });

    it('should show all severity levels', async () => {
      const policy: PolicyContract = {
        id: 'test',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          { id: 'r1', type: 'forbidden-content', description: '', severity: 'critical', pattern: /c/gi },
          { id: 'r2', type: 'forbidden-content', description: '', severity: 'high', pattern: /h/gi },
          { id: 'r3', type: 'forbidden-content', description: '', severity: 'medium', pattern: /m/gi },
          { id: 'r4', type: 'forbidden-content', description: '', severity: 'low', pattern: /l/gi },
        ],
      };

      const result = await evaluatePolicy('c h m l', policy);
      const formatted = formatPolicyResult(result);

      expect(formatted).toContain('🔴 Critical: 1');
      expect(formatted).toContain('🟠 High: 1');
      expect(formatted).toContain('🟡 Medium: 1');
      expect(formatted).toContain('🟢 Low: 1');
    });
  });

  describe('Custom Validators', () => {
    it('should support custom validation functions', async () => {
      const policy: PolicyContract = {
        id: 'test',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'custom-rule',
            type: 'custom',
            description: 'Custom validation',
            severity: 'high',
            customValidator: (response: string) => response.length < 100,
          },
        ],
      };

      const shortResponse = 'Short';
      const resultShort = await evaluatePolicy(shortResponse, policy);
      expect(resultShort.passed).toBe(true);

      const longResponse = 'A'.repeat(150);
      const resultLong = await evaluatePolicy(longResponse, policy);
      expect(resultLong.passed).toBe(false);
    });

    it('should handle async custom validators', async () => {
      const policy: PolicyContract = {
        id: 'test',
        name: 'Test Policy',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'async-rule',
            type: 'custom',
            description: 'Async validation',
            severity: 'high',
            customValidator: async (response: string) => {
              await new Promise(resolve => setTimeout(resolve, 10));
              return response.includes('valid');
            },
          },
        ],
      };

      const valid = await evaluatePolicy('This is valid', policy);
      expect(valid.passed).toBe(true);

      const invalid = await evaluatePolicy('This is not', policy);
      expect(invalid.passed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response', async () => {
      const policy: PolicyContract = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'test',
            type: 'forbidden-content',
            description: 'Test',
            severity: 'high',
            pattern: /test/gi,
          },
        ],
      };

      const result = await evaluatePolicy('', policy);
      expect(result.passed).toBe(true);
    });

    it('should handle very long responses', async () => {
      const policy: PolicyContract = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'test',
            type: 'forbidden-content',
            description: 'Test',
            severity: 'high',
            pattern: /badword/gi,
          },
        ],
      };

      const longResponse = 'clean '.repeat(10000);
      const result = await evaluatePolicy(longResponse, policy);
      expect(result.passed).toBe(true);
    });

    it('should handle unicode and special characters', async () => {
      const policy: PolicyContract = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        version: '1.0.0',
        enabled: true,
        rules: [
          {
            id: 'test',
            type: 'forbidden-content',
            description: 'Test',
            severity: 'high',
            pattern: /禁止/gi,  // Chinese characters
          },
        ],
      };

      const result = await evaluatePolicy('This has 禁止 content', policy);
      expect(result.passed).toBe(false);
      expect(result.violations[0].matched).toBe('禁止');
    });
  });
});
