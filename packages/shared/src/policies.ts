/**
 * Policy Contracts for TraceForge
 * Define and enforce safety rules, compliance requirements, and content policies
 */

/**
 * Policy rule types
 */
export type PolicyRuleType =
  | 'forbidden-content'      // Block specific content patterns
  | 'required-content'       // Require specific content
  | 'max-length'            // Maximum response length
  | 'min-length'            // Minimum response length
  | 'no-pii'                // Detect and block PII
  | 'no-hallucination'      // Detect potential hallucinations
  | 'sentiment'             // Enforce sentiment constraints
  | 'format'                // Enforce response format
  | 'custom';               // Custom validation function

/**
 * Severity level for policy violations
 */
export type PolicySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Individual policy rule
 */
export interface PolicyRule {
  id: string;
  type: PolicyRuleType;
  description: string;
  severity: PolicySeverity;
  enabled?: boolean;
  
  // Rule-specific parameters
  pattern?: string | RegExp;        // For pattern matching
  patterns?: (string | RegExp)[];   // Multiple patterns
  maxLength?: number;               // For length constraints
  minLength?: number;
  requiredSentiment?: 'positive' | 'negative' | 'neutral';
  allowedFormats?: string[];        // e.g., ['text', 'json', 'markdown']
  customValidator?: (response: string) => boolean | Promise<boolean>;
  
  // Violation message
  violationMessage?: string;
}

/**
 * Policy contract - collection of rules
 */
export interface PolicyContract {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: PolicyRule[];
  enabled?: boolean;
  
  // Metadata
  tags?: string[];              // e.g., ['healthcare', 'hipaa']
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Policy violation detected during evaluation
 */
export interface PolicyViolation {
  ruleId: string;
  ruleType: PolicyRuleType;
  severity: PolicySeverity;
  message: string;
  matched?: string;             // What matched the pattern
  location?: {                  // Where in response
    start: number;
    end: number;
  };
  suggestion?: string;          // How to fix
}

/**
 * Result of policy evaluation
 */
export interface PolicyEvaluationResult {
  passed: boolean;
  violations: PolicyViolation[];
  contract: PolicyContract;
  timestamp: string;
  
  // Summary
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

/**
 * PII detection patterns
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,
};

/**
 * Evaluate a policy contract against a response
 */
export async function evaluatePolicy(
  response: string,
  contract: PolicyContract
): Promise<PolicyEvaluationResult> {
  if (!contract.enabled) {
    return {
      passed: true,
      violations: [],
      contract,
      timestamp: new Date().toISOString(),
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };
  }

  const violations: PolicyViolation[] = [];

  // Evaluate each rule
  for (const rule of contract.rules) {
    if (rule.enabled === false) continue;

    const ruleViolations = await evaluateRule(response, rule);
    violations.push(...ruleViolations);
  }

  // Count by severity
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const highCount = violations.filter(v => v.severity === 'high').length;
  const mediumCount = violations.filter(v => v.severity === 'medium').length;
  const lowCount = violations.filter(v => v.severity === 'low').length;

  return {
    passed: criticalCount === 0 && highCount === 0,
    violations,
    contract,
    timestamp: new Date().toISOString(),
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
  };
}

/**
 * Evaluate a single policy rule
 */
async function evaluateRule(
  response: string,
  rule: PolicyRule
): Promise<PolicyViolation[]> {
  const violations: PolicyViolation[] = [];

  switch (rule.type) {
    case 'forbidden-content':
      violations.push(...checkForbiddenContent(response, rule));
      break;

    case 'required-content':
      violations.push(...checkRequiredContent(response, rule));
      break;

    case 'max-length':
      violations.push(...checkMaxLength(response, rule));
      break;

    case 'min-length':
      violations.push(...checkMinLength(response, rule));
      break;

    case 'no-pii':
      violations.push(...checkPII(response, rule));
      break;

    case 'sentiment':
      violations.push(...checkSentiment(response, rule));
      break;

    case 'format':
      violations.push(...checkFormat(response, rule));
      break;

    case 'custom':
      violations.push(...await checkCustom(response, rule));
      break;
  }

  return violations;
}

/**
 * Check for forbidden content patterns
 */
function checkForbiddenContent(response: string, rule: PolicyRule): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const patterns = rule.patterns || (rule.pattern ? [rule.pattern] : []);

  for (const pattern of patterns) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'gi') : pattern;
    const matches = response.matchAll(regex);

    for (const match of matches) {
      violations.push({
        ruleId: rule.id,
        ruleType: rule.type,
        severity: rule.severity,
        message: rule.violationMessage || `Forbidden content detected: "${match[0]}"`,
        matched: match[0],
        location: {
          start: match.index || 0,
          end: (match.index || 0) + match[0].length,
        },
        suggestion: 'Remove or rephrase the flagged content',
      });
    }
  }

  return violations;
}

/**
 * Check for required content patterns
 */
function checkRequiredContent(response: string, rule: PolicyRule): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  const patterns = rule.patterns || (rule.pattern ? [rule.pattern] : []);

  for (const pattern of patterns) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    if (!regex.test(response)) {
      violations.push({
        ruleId: rule.id,
        ruleType: rule.type,
        severity: rule.severity,
        message: rule.violationMessage || `Required content missing: "${pattern}"`,
        suggestion: 'Add the required content to the response',
      });
    }
  }

  return violations;
}

/**
 * Check maximum length constraint
 */
function checkMaxLength(response: string, rule: PolicyRule): PolicyViolation[] {
  if (!rule.maxLength) return [];

  if (response.length > rule.maxLength) {
    return [{
      ruleId: rule.id,
      ruleType: rule.type,
      severity: rule.severity,
      message: rule.violationMessage || 
        `Response exceeds maximum length: ${response.length} > ${rule.maxLength} characters`,
      suggestion: 'Reduce response length',
    }];
  }

  return [];
}

/**
 * Check minimum length constraint
 */
function checkMinLength(response: string, rule: PolicyRule): PolicyViolation[] {
  if (!rule.minLength) return [];

  if (response.length < rule.minLength) {
    return [{
      ruleId: rule.id,
      ruleType: rule.type,
      severity: rule.severity,
      message: rule.violationMessage || 
        `Response below minimum length: ${response.length} < ${rule.minLength} characters`,
      suggestion: 'Provide more detailed response',
    }];
  }

  return [];
}

/**
 * Check for PII (Personally Identifiable Information)
 */
function checkPII(response: string, rule: PolicyRule): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = response.matchAll(pattern);

    for (const match of matches) {
      violations.push({
        ruleId: rule.id,
        ruleType: rule.type,
        severity: rule.severity,
        message: rule.violationMessage || `PII detected: ${type}`,
        matched: match[0],
        location: {
          start: match.index || 0,
          end: (match.index || 0) + match[0].length,
        },
        suggestion: `Remove or redact ${type} information`,
      });
    }
  }

  return violations;
}

/**
 * Check sentiment requirements
 */
function checkSentiment(response: string, rule: PolicyRule): PolicyViolation[] {
  if (!rule.requiredSentiment) return [];

  // Simple sentiment analysis based on word lists
  const positiveWords = ['good', 'great', 'excellent', 'wonderful', 'happy', 'pleased', 'satisfied'];
  const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'unhappy', 'disappointed', 'dissatisfied'];

  const words = response.toLowerCase().split(/\s+/);
  const positiveCount = words.filter(w => positiveWords.includes(w)).length;
  const negativeCount = words.filter(w => negativeWords.includes(w)).length;

  let detectedSentiment: 'positive' | 'negative' | 'neutral';
  if (positiveCount > negativeCount) {
    detectedSentiment = 'positive';
  } else if (negativeCount > positiveCount) {
    detectedSentiment = 'negative';
  } else {
    detectedSentiment = 'neutral';
  }

  if (detectedSentiment !== rule.requiredSentiment) {
    return [{
      ruleId: rule.id,
      ruleType: rule.type,
      severity: rule.severity,
      message: rule.violationMessage || 
        `Sentiment mismatch: expected ${rule.requiredSentiment}, detected ${detectedSentiment}`,
      suggestion: `Adjust tone to be more ${rule.requiredSentiment}`,
    }];
  }

  return [];
}

/**
 * Check format requirements
 */
function checkFormat(response: string, rule: PolicyRule): PolicyViolation[] {
  if (!rule.allowedFormats || rule.allowedFormats.length === 0) return [];

  const detectedFormats: string[] = [];

  // Check for JSON
  try {
    JSON.parse(response);
    detectedFormats.push('json');
  } catch {
    // Not JSON
  }

  // Check for markdown
  if (/^#{1,6}\s|```|\*\*|__|\[.*\]\(.*\)/.test(response)) {
    detectedFormats.push('markdown');
  }

  // Check for code blocks
  if (/```[\s\S]*```/.test(response)) {
    detectedFormats.push('code');
  }

  // Default to text
  if (detectedFormats.length === 0) {
    detectedFormats.push('text');
  }

  // Check if any detected format is allowed
  const hasAllowedFormat = detectedFormats.some(f => rule.allowedFormats!.includes(f));

  if (!hasAllowedFormat) {
    return [{
      ruleId: rule.id,
      ruleType: rule.type,
      severity: rule.severity,
      message: rule.violationMessage || 
        `Format violation: detected [${detectedFormats.join(', ')}], allowed [${rule.allowedFormats.join(', ')}]`,
      suggestion: `Use one of the allowed formats: ${rule.allowedFormats.join(', ')}`,
    }];
  }

  return [];
}

/**
 * Check custom validation function
 */
async function checkCustom(response: string, rule: PolicyRule): Promise<PolicyViolation[]> {
  if (!rule.customValidator) return [];

  try {
    const isValid = await rule.customValidator(response);
    if (!isValid) {
      return [{
        ruleId: rule.id,
        ruleType: rule.type,
        severity: rule.severity,
        message: rule.violationMessage || 'Custom validation failed',
        suggestion: 'Review custom validation requirements',
      }];
    }
  } catch (error: any) {
    return [{
      ruleId: rule.id,
      ruleType: rule.type,
      severity: 'high',
      message: `Custom validator error: ${error.message}`,
      suggestion: 'Check custom validator implementation',
    }];
  }

  return [];
}

/**
 * Format policy evaluation result for display
 */
export function formatPolicyResult(result: PolicyEvaluationResult): string {
  let output = '';
  
  const statusEmoji = result.passed ? '✅' : '❌';
  output += `${statusEmoji} Policy: ${result.contract.name}\n`;
  output += `   Status: ${result.passed ? 'PASSED' : 'FAILED'}\n`;
  output += `   Violations: ${result.violations.length}\n`;
  
  if (result.criticalCount > 0) {
    output += `   🔴 Critical: ${result.criticalCount}\n`;
  }
  if (result.highCount > 0) {
    output += `   🟠 High: ${result.highCount}\n`;
  }
  if (result.mediumCount > 0) {
    output += `   🟡 Medium: ${result.mediumCount}\n`;
  }
  if (result.lowCount > 0) {
    output += `   🟢 Low: ${result.lowCount}\n`;
  }
  
  if (result.violations.length > 0) {
    output += '\nViolations:\n';
    for (const violation of result.violations) {
      const severityIcon = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      }[violation.severity];
      
      output += `  ${severityIcon} [${violation.ruleId}] ${violation.message}\n`;
      if (violation.matched) {
        output += `     Matched: "${violation.matched}"\n`;
      }
      if (violation.suggestion) {
        output += `     💡 ${violation.suggestion}\n`;
      }
    }
  }
  
  return output;
}
