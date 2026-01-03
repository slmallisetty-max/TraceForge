import { describe, it, expect } from 'vitest';
import {
  evaluateQualityGates,
  formatGateSummary,
  generateBadge,
  getExitCode,
  type QualityGateConfig,
} from './ci-gating.js';
import type { TestResult } from './types.js';

describe('evaluateQualityGates', () => {
  const createTestResult = (passed: boolean, policyViolations?: any[]): TestResult => ({
    test_id: 'test-123',
    passed,
    assertions: [],
    response: { id: 'resp-123', object: 'chat.completion', created: 123, model: 'gpt-4', choices: [] },
    duration_ms: 100,
    timestamp: new Date().toISOString(),
    policy_violations: policyViolations,
  });

  it('should pass all gates when all tests pass', () => {
    const results: TestResult[] = [
      createTestResult(true),
      createTestResult(true),
      createTestResult(true),
    ];

    const gateResult = evaluateQualityGates(results);

    expect(gateResult.passed).toBe(true);
    expect(gateResult.total_tests).toBe(3);
    expect(gateResult.passed_tests).toBe(3);
    expect(gateResult.failed_tests).toBe(0);
    expect(gateResult.pass_rate).toBe(100);
    expect(gateResult.gate_failures).toHaveLength(0);
  });

  it('should fail test_failure gate when tests fail', () => {
    const results: TestResult[] = [
      createTestResult(true),
      createTestResult(false),
      createTestResult(false),
    ];

    const gateResult = evaluateQualityGates(results);

    expect(gateResult.passed).toBe(false);
    expect(gateResult.passed_tests).toBe(1);
    expect(gateResult.failed_tests).toBe(2);
    expect(gateResult.pass_rate).toBeCloseTo(33.3, 1);
    
    const testFailureGate = gateResult.gate_failures.find(f => f.gate === 'test_failure');
    expect(testFailureGate).toBeDefined();
    expect(testFailureGate?.severity).toBe('critical');
    expect(testFailureGate?.actual).toBe(2);
  });

  it('should fail pass_rate gate when below threshold', () => {
    const results: TestResult[] = [
      createTestResult(true),
      createTestResult(true),
      createTestResult(false),
      createTestResult(false),
      createTestResult(false),
    ];

    const config: QualityGateConfig = {
      min_pass_rate: 50,  // Require 50% pass rate
    };

    const gateResult = evaluateQualityGates(results, config);

    expect(gateResult.passed).toBe(false);
    expect(gateResult.pass_rate).toBe(40);
    
    const passRateGate = gateResult.gate_failures.find(f => f.gate === 'pass_rate');
    expect(passRateGate).toBeDefined();
    expect(passRateGate?.threshold).toBe(50);
    expect(passRateGate?.actual).toBe(40);
  });

  it('should detect critical policy violations', () => {
    const results: TestResult[] = [
      createTestResult(true),
      createTestResult(false, [
        { ruleId: 'pii-check', severity: 'critical', message: 'PII detected' },
      ]),
    ];

    const gateResult = evaluateQualityGates(results);

    expect(gateResult.passed).toBe(false);
    expect(gateResult.policy_violations_count).toBe(1);
    
    const policyGate = gateResult.gate_failures.find(f => f.gate === 'policy_violations');
    expect(policyGate).toBeDefined();
    expect(policyGate?.severity).toBe('critical');
    expect(policyGate?.actual).toBe(1);
  });

  it('should detect high-severity policy violations', () => {
    const results: TestResult[] = [
      createTestResult(true),
      createTestResult(false, [
        { ruleId: 'disclaimer-check', severity: 'high', message: 'Missing disclaimer' },
        { ruleId: 'tone-check', severity: 'medium', message: 'Wrong tone' },
      ]),
    ];

    const gateResult = evaluateQualityGates(results);

    expect(gateResult.passed).toBe(false);
    expect(gateResult.policy_violations_count).toBe(2);
    
    const policyGate = gateResult.gate_failures.find(f => f.gate === 'policy_violations');
    expect(policyGate).toBeDefined();
    expect(policyGate?.severity).toBe('high');
  });

  it('should calculate max risk severity from policy violations', () => {
    const results: TestResult[] = [
      createTestResult(true, [
        { ruleId: 'rule1', severity: 'medium', message: 'Medium issue' },
      ]),
      createTestResult(true, [
        { ruleId: 'rule2', severity: 'high', message: 'High issue' },
      ]),
      createTestResult(true, [
        { ruleId: 'rule3', severity: 'critical', message: 'Critical issue' },
      ]),
    ];

    const gateResult = evaluateQualityGates(results);

    expect(gateResult.max_risk_severity).toBe(10);  // Critical = 10
  });

  it('should fail risk_threshold gate when severity exceeds threshold', () => {
    const results: TestResult[] = [
      createTestResult(true, [
        { ruleId: 'rule1', severity: 'high', message: 'High severity' },
      ]),
    ];

    const config: QualityGateConfig = {
      max_risk_severity: 5,  // Only allow low/medium
    };

    const gateResult = evaluateQualityGates(results, config);

    expect(gateResult.passed).toBe(false);
    expect(gateResult.max_risk_severity).toBe(8);  // High = 8
    
    const riskGate = gateResult.gate_failures.find(f => f.gate === 'risk_threshold');
    expect(riskGate).toBeDefined();
    expect(riskGate?.threshold).toBe(5);
    expect(riskGate?.actual).toBe(8);
  });

  it('should allow disabling specific gates', () => {
    const results: TestResult[] = [
      createTestResult(false),  // Test failure
    ];

    const config: QualityGateConfig = {
      fail_on_test_failure: false,  // Disable test failure gate
      min_pass_rate: 0,  // Allow 0% pass rate
    };

    const gateResult = evaluateQualityGates(results, config);

    expect(gateResult.passed).toBe(true);  // Should pass despite test failure
    expect(gateResult.failed_tests).toBe(1);
  });

  it('should pass when gates are disabled', () => {
    const results: TestResult[] = [
      createTestResult(false),
      createTestResult(false),
      createTestResult(false),
    ];

    const config: QualityGateConfig = {
      enabled: false,  // Disable all gates
    };

    const gateResult = evaluateQualityGates(results, config);

    expect(gateResult.passed).toBe(true);
    expect(gateResult.gate_failures).toHaveLength(0);
  });

  it('should handle empty test results', () => {
    const results: TestResult[] = [];

    const config: QualityGateConfig = {
      min_pass_rate: 0,  // Allow 0% pass rate for empty results
    };

    const gateResult = evaluateQualityGates(results, config);

    expect(gateResult.passed).toBe(true);
    expect(gateResult.total_tests).toBe(0);
    expect(gateResult.pass_rate).toBe(0);
  });

  it('should check baseline requirement when enabled', () => {
    const results: TestResult[] = [
      createTestResult(true),
      { ...createTestResult(true), response: null },  // No baseline
    ];

    const config: QualityGateConfig = {
      require_baselines: true,
    };

    const gateResult = evaluateQualityGates(results, config);

    expect(gateResult.passed).toBe(false);
    
    const baselineGate = gateResult.gate_failures.find(f => f.gate === 'baseline_requirement');
    expect(baselineGate).toBeDefined();
    expect(baselineGate?.actual).toBe(1);
  });

  it('should correctly assign severity levels to failures', () => {
    const results: TestResult[] = [
      createTestResult(true),
      createTestResult(true),
      createTestResult(false),
      createTestResult(false),
      createTestResult(false),  // 40% pass rate (2/5)
    ];

    const config: QualityGateConfig = {
      min_pass_rate: 50,  // Require 50%, will get 40%
      fail_on_test_failure: false,  // Disable test_failure gate to only test pass_rate
    };

    const gateResult = evaluateQualityGates(results, config);

    expect(gateResult.pass_rate).toBe(40);
    const passRateGate = gateResult.gate_failures.find(f => f.gate === 'pass_rate');
    expect(passRateGate).toBeDefined();
    expect(passRateGate?.severity).toBe('critical');  // 40% < 50%
  });
});

describe('formatGateSummary', () => {
  it('should format passing gate result', () => {
    const gateResult = evaluateQualityGates([
      { test_id: 'test-1', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
      { test_id: 'test-2', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
    ]);

    const summary = formatGateSummary(gateResult);

    expect(summary).toContain('✅ **Quality Gates: PASSED**');
    expect(summary).toContain('**Total Tests**: 2');
    expect(summary).toContain('**Passed**: 2 ✓');
    expect(summary).toContain('**Failed**: 0 ✗');
    expect(summary).toContain('**Pass Rate**: 100.0%');
  });

  it('should format failing gate result with failures', () => {
    const gateResult = evaluateQualityGates([
      { test_id: 'test-1', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
      { test_id: 'test-2', passed: false, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
    ]);

    const summary = formatGateSummary(gateResult);

    expect(summary).toContain('❌ **Quality Gates: FAILED**');
    expect(summary).toContain('### Gate Failures');
    expect(summary).toContain('test_failure');
  });

  it('should include policy violations in summary', () => {
    const gateResult = evaluateQualityGates([
      {
        test_id: 'test-1',
        passed: false,
        assertions: [],
        response: null,
        duration_ms: 100,
        timestamp: '2026-01-03T00:00:00Z',
        policy_violations: [
          { ruleId: 'pii', severity: 'critical', message: 'PII detected' },
        ],
      },
    ]);

    const summary = formatGateSummary(gateResult);

    expect(summary).toContain('**Policy Violations**: 1');
    expect(summary).toContain('**Max Risk Severity**: 10/10');
  });

  it('should use correct emojis for severity levels', () => {
    const results: TestResult[] = [{ test_id: 'test-1', passed: false, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' }];
    
    const gateResult = evaluateQualityGates(results);
    const summary = formatGateSummary(gateResult);

    expect(summary).toMatch(/🔴.*test_failure/);  // Critical = red circle
  });
});

describe('generateBadge', () => {
  it('should generate passing badge', () => {
    const gateResult = evaluateQualityGates([
      { test_id: 'test-1', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
      { test_id: 'test-2', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
    ]);

    const badge = generateBadge(gateResult);

    expect(badge).toContain('<svg');
    expect(badge).toContain('AI Tests');
    expect(badge).toContain('passing (100%)');
    expect(badge).toContain('#4c1');  // Green color
  });

  it('should generate failing badge', () => {
    const gateResult = evaluateQualityGates([
      { test_id: 'test-1', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
      { test_id: 'test-2', passed: false, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
    ]);

    const badge = generateBadge(gateResult);

    expect(badge).toContain('failing (50%)');
    expect(badge).toContain('#e05d44');  // Red color
  });

  it('should be valid SVG', () => {
    const gateResult = evaluateQualityGates([
      { test_id: 'test-1', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
    ]);

    const badge = generateBadge(gateResult);

    expect(badge).toMatch(/^<svg.*<\/svg>$/s);
    expect(badge).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe('getExitCode', () => {
  it('should return 0 when gates pass', () => {
    const gateResult = evaluateQualityGates([
      { test_id: 'test-1', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
    ]);

    expect(getExitCode(gateResult)).toBe(0);
  });

  it('should return 1 for critical failures', () => {
    const gateResult = evaluateQualityGates([
      { test_id: 'test-1', passed: false, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
    ]);

    expect(getExitCode(gateResult)).toBe(1);
  });

  it('should return 1 for high severity failures', () => {
    const results: TestResult[] = [
      {
        test_id: 'test-1',
        passed: false,
        assertions: [],
        response: null,
        duration_ms: 100,
        timestamp: '2026-01-03T00:00:00Z',
        policy_violations: [
          { ruleId: 'rule1', severity: 'high', message: 'High severity' },
        ],
      },
    ];

    const gateResult = evaluateQualityGates(results);

    expect(getExitCode(gateResult)).toBe(1);
  });

  it('should return 1 for medium/low failures', () => {
    const config: QualityGateConfig = {
      min_pass_rate: 100,  // Unrealistic, will fail with medium severity
    };

    const gateResult = evaluateQualityGates([
      { test_id: 'test-1', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
      { test_id: 'test-2', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
      { test_id: 'test-3', passed: true, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
      { test_id: 'test-4', passed: false, assertions: [], response: null, duration_ms: 100, timestamp: '2026-01-03T00:00:00Z' },
    ], config);

    // Pass rate = 75%, which triggers medium severity for pass_rate gate
    expect(getExitCode(gateResult)).toBe(1);
  });
});
