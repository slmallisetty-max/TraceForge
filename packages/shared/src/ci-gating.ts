/**
 * CI Gating - Quality Gate Evaluation
 * Week 5, 2026 Q1
 * 
 * Evaluates test results against quality gates for CI/CD integration.
 */

import type { TestResult, QualityGateResult, GateFailure } from './types.js';

export interface QualityGateConfig {
  enabled?: boolean;
  fail_on_test_failure?: boolean;
  fail_on_policy_violations?: boolean;
  fail_on_risk_threshold?: boolean;
  max_risk_severity?: number;
  min_pass_rate?: number;
  require_baselines?: boolean;
}

/**
 * Evaluate quality gates for CI/CD integration
 */
export function evaluateQualityGates(
  testResults: TestResult[],
  config: QualityGateConfig = {}
): QualityGateResult {
  const startTime = Date.now();
  
  // Apply defaults
  const gateConfig: Required<QualityGateConfig> = {
    enabled: config.enabled ?? true,
    fail_on_test_failure: config.fail_on_test_failure ?? true,
    fail_on_policy_violations: config.fail_on_policy_violations ?? true,
    fail_on_risk_threshold: config.fail_on_risk_threshold ?? true,
    max_risk_severity: config.max_risk_severity ?? 8,
    min_pass_rate: config.min_pass_rate ?? 90,
    require_baselines: config.require_baselines ?? false,
  };

  // Calculate test statistics
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

  // Count policy violations
  let policyViolationsCount = 0;
  let maxRiskSeverity = 0;

  for (const result of testResults) {
    if (result.policy_violations && result.policy_violations.length > 0) {
      policyViolationsCount += result.policy_violations.length;
      
      // Check for critical/high policy violations
      for (const violation of result.policy_violations) {
        if (violation.severity === 'critical') {
          maxRiskSeverity = Math.max(maxRiskSeverity, 10);
        } else if (violation.severity === 'high') {
          maxRiskSeverity = Math.max(maxRiskSeverity, 8);
        } else if (violation.severity === 'medium') {
          maxRiskSeverity = Math.max(maxRiskSeverity, 5);
        } else if (violation.severity === 'low') {
          maxRiskSeverity = Math.max(maxRiskSeverity, 3);
        }
      }
    }
  }

  // Evaluate gates
  const gateFailures: GateFailure[] = [];

  if (!gateConfig.enabled) {
    // Gates disabled - always pass
    return {
      passed: true,
      test_results: testResults,
      total_tests: totalTests,
      passed_tests: passedTests,
      failed_tests: failedTests,
      pass_rate: passRate,
      policy_violations_count: policyViolationsCount,
      max_risk_severity: maxRiskSeverity,
      gate_failures: [],
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    };
  }

  // Gate 1: Test failure check
  if (gateConfig.fail_on_test_failure && failedTests > 0) {
    gateFailures.push({
      gate: 'test_failure',
      reason: `${failedTests} test${failedTests === 1 ? '' : 's'} failed`,
      threshold: 0,
      actual: failedTests,
      severity: 'critical',
    });
  }

  // Gate 2: Pass rate check
  if (passRate < gateConfig.min_pass_rate) {
    gateFailures.push({
      gate: 'pass_rate',
      reason: `Pass rate ${passRate.toFixed(1)}% is below minimum ${gateConfig.min_pass_rate}%`,
      threshold: gateConfig.min_pass_rate,
      actual: Math.round(passRate * 10) / 10,
      severity: passRate < 50 ? 'critical' : passRate < 75 ? 'high' : 'medium',
    });
  }

  // Gate 3: Policy violations check
  if (gateConfig.fail_on_policy_violations && policyViolationsCount > 0) {
    const criticalViolations = testResults.reduce((sum, r) => {
      return sum + (r.policy_violations?.filter(v => v.severity === 'critical').length || 0);
    }, 0);
    
    const highViolations = testResults.reduce((sum, r) => {
      return sum + (r.policy_violations?.filter(v => v.severity === 'high').length || 0);
    }, 0);

    if (criticalViolations > 0) {
      gateFailures.push({
        gate: 'policy_violations',
        reason: `${criticalViolations} critical policy violation${criticalViolations === 1 ? '' : 's'} detected`,
        threshold: 0,
        actual: criticalViolations,
        severity: 'critical',
      });
    } else if (highViolations > 0) {
      gateFailures.push({
        gate: 'policy_violations',
        reason: `${highViolations} high-severity policy violation${highViolations === 1 ? '' : 's'} detected`,
        threshold: 0,
        actual: highViolations,
        severity: 'high',
      });
    }
  }

  // Gate 4: Risk threshold check
  if (gateConfig.fail_on_risk_threshold && maxRiskSeverity >= gateConfig.max_risk_severity) {
    gateFailures.push({
      gate: 'risk_threshold',
      reason: `Risk severity ${maxRiskSeverity} exceeds threshold ${gateConfig.max_risk_severity}`,
      threshold: gateConfig.max_risk_severity,
      actual: maxRiskSeverity,
      severity: maxRiskSeverity >= 9 ? 'critical' : maxRiskSeverity >= 7 ? 'high' : 'medium',
    });
  }

  // Gate 5: Baseline requirement check
  if (gateConfig.require_baselines) {
    const testsWithoutBaseline = testResults.filter(r => !r.response);
    if (testsWithoutBaseline.length > 0) {
      gateFailures.push({
        gate: 'baseline_requirement',
        reason: `${testsWithoutBaseline.length} test${testsWithoutBaseline.length === 1 ? '' : 's'} missing baseline`,
        threshold: 0,
        actual: testsWithoutBaseline.length,
        severity: 'medium',
      });
    }
  }

  const passed = gateFailures.length === 0;

  return {
    passed,
    test_results: testResults,
    total_tests: totalTests,
    passed_tests: passedTests,
    failed_tests: failedTests,
    pass_rate: passRate,
    policy_violations_count: policyViolationsCount,
    max_risk_severity: maxRiskSeverity,
    gate_failures: gateFailures,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Generate CI-friendly summary text
 */
export function formatGateSummary(result: QualityGateResult): string {
  const { passed, total_tests, passed_tests, failed_tests, pass_rate, gate_failures } = result;
  
  let summary = '';
  
  // Status header
  if (passed) {
    summary += '✅ **Quality Gates: PASSED**\n\n';
  } else {
    summary += '❌ **Quality Gates: FAILED**\n\n';
  }
  
  // Test statistics
  summary += `### Test Results\n`;
  summary += `- **Total Tests**: ${total_tests}\n`;
  summary += `- **Passed**: ${passed_tests} ✓\n`;
  summary += `- **Failed**: ${failed_tests} ✗\n`;
  summary += `- **Pass Rate**: ${pass_rate.toFixed(1)}%\n`;
  
  if (result.policy_violations_count > 0) {
    summary += `- **Policy Violations**: ${result.policy_violations_count}\n`;
  }
  
  if (result.max_risk_severity > 0) {
    summary += `- **Max Risk Severity**: ${result.max_risk_severity}/10\n`;
  }
  
  // Gate failures
  if (gate_failures.length > 0) {
    summary += `\n### Gate Failures\n\n`;
    for (const failure of gate_failures) {
      const emoji = failure.severity === 'critical' ? '🔴' :
                   failure.severity === 'high' ? '🟠' :
                   failure.severity === 'medium' ? '🟡' : '⚪';
      summary += `${emoji} **${failure.gate}**: ${failure.reason}\n`;
    }
  }
  
  summary += `\n---\n`;
  summary += `Generated at ${result.timestamp}\n`;
  
  return summary;
}

/**
 * Generate status badge SVG
 */
export function generateBadge(result: QualityGateResult): string {
  const status = result.passed ? 'passing' : 'failing';
  const color = result.passed ? '#4c1' : '#e05d44';
  const passRate = result.pass_rate.toFixed(0);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="180" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <path fill="#555" d="M0 0h90v20H0z"/>
    <path fill="${color}" d="M90 0h90v20H90z"/>
    <path fill="url(#b)" d="M0 0h180v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="45" y="15" fill="#010101" fill-opacity=".3">AI Tests</text>
    <text x="45" y="14">AI Tests</text>
    <text x="135" y="15" fill="#010101" fill-opacity=".3">${status} (${passRate}%)</text>
    <text x="135" y="14">${status} (${passRate}%)</text>
  </g>
</svg>`;
}

/**
 * Determine exit code for CI
 */
export function getExitCode(result: QualityGateResult): number {
  if (result.passed) {
    return 0;
  }
  
  // Check for critical failures
  const hasCriticalFailure = result.gate_failures.some(f => f.severity === 'critical');
  if (hasCriticalFailure) {
    return 1;  // Critical failure
  }
  
  // High severity failures
  const hasHighFailure = result.gate_failures.some(f => f.severity === 'high');
  if (hasHighFailure) {
    return 1;  // High severity failure
  }
  
  // Medium/low failures
  return 1;  // Still fail, but less severe
}
