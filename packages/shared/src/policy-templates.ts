/**
 * Built-in policy templates for common use cases
 */

import type { PolicyContract } from './policies.js';

/**
 * PII Protection Policy
 * Prevents disclosure of personally identifiable information
 */
export const PII_PROTECTION_POLICY: PolicyContract = {
  id: 'pii-protection',
  name: 'PII Protection',
  description: 'Detects and blocks personally identifiable information (PII) in responses',
  version: '1.0.0',
  enabled: true,
  tags: ['privacy', 'gdpr', 'ccpa', 'compliance'],
  rules: [
    {
      id: 'no-pii',
      type: 'no-pii',
      description: 'Block all forms of PII',
      severity: 'critical',
      violationMessage: 'Response contains personally identifiable information',
    },
  ],
};

/**
 * Medical Safety Policy (HIPAA-inspired)
 * Ensures medical advice is safe and compliant
 */
export const MEDICAL_SAFETY_POLICY: PolicyContract = {
  id: 'medical-safety',
  name: 'Medical Safety',
  description: 'Ensures medical responses are safe and include appropriate disclaimers',
  version: '1.0.0',
  enabled: true,
  tags: ['healthcare', 'hipaa', 'medical', 'safety'],
  rules: [
    {
      id: 'no-diagnosis',
      type: 'forbidden-content',
      description: 'Prevent definitive medical diagnoses',
      severity: 'critical',
      patterns: [
        /you (have|are suffering from|definitely have)\s+\w+/gi,
        /I diagnose you with/gi,
        /you are diagnosed with/gi,
      ],
      violationMessage: 'Response contains prohibited medical diagnosis language',
    },
    {
      id: 'require-disclaimer',
      type: 'required-content',
      description: 'Require medical disclaimer',
      severity: 'high',
      pattern: /(consult|see) (a|your) (doctor|physician|healthcare provider)/i,
      violationMessage: 'Medical advice must include disclaimer to consult healthcare provider',
    },
    {
      id: 'no-dosage-recommendations',
      type: 'forbidden-content',
      description: 'Prevent specific medication dosage recommendations',
      severity: 'critical',
      patterns: [
        /take \d+\s*(mg|mcg|ml|g)\s+of/gi,
        /dosage.*\d+\s*(mg|mcg|ml)/gi,
      ],
      violationMessage: 'Response contains prohibited medication dosage recommendations',
    },
  ],
};

/**
 * Financial Advice Policy
 * Ensures financial responses include appropriate disclaimers
 */
export const FINANCIAL_ADVICE_POLICY: PolicyContract = {
  id: 'financial-advice',
  name: 'Financial Advice',
  description: 'Ensures financial responses are compliant with regulations',
  version: '1.0.0',
  enabled: true,
  tags: ['finance', 'compliance', 'investment'],
  rules: [
    {
      id: 'no-guarantees',
      type: 'forbidden-content',
      description: 'Prevent guaranteed return claims',
      severity: 'critical',
      patterns: [
        /guaranteed? (return|profit|gains?)/gi,
        /you (will|are guaranteed to) (make|earn|profit)/gi,
        /risk-free investment/gi,
      ],
      violationMessage: 'Response contains prohibited investment guarantees',
    },
    {
      id: 'require-risk-disclosure',
      type: 'required-content',
      description: 'Require risk disclosure',
      severity: 'high',
      patterns: [
        /investments? (involve|carry) risk/i,
        /past performance.*not.*future results/i,
      ],
      violationMessage: 'Financial advice must include risk disclosure',
    },
    {
      id: 'no-specific-stock-advice',
      type: 'forbidden-content',
      description: 'Prevent specific buy/sell recommendations',
      severity: 'high',
      patterns: [
        /you should (buy|sell|invest in) \w+ stock/gi,
        /I recommend (buying|selling|investing in)/gi,
      ],
      violationMessage: 'Response contains prohibited specific investment recommendations',
    },
  ],
};

/**
 * Content Safety Policy
 * Blocks harmful, offensive, or inappropriate content
 */
export const CONTENT_SAFETY_POLICY: PolicyContract = {
  id: 'content-safety',
  name: 'Content Safety',
  description: 'Blocks harmful, offensive, or inappropriate content',
  version: '1.0.0',
  enabled: true,
  tags: ['safety', 'moderation', 'content'],
  rules: [
    {
      id: 'no-violence',
      type: 'forbidden-content',
      description: 'Block violent or graphic content',
      severity: 'critical',
      patterns: [
        /how to (kill|murder|harm|hurt)/gi,
        /instructions? (for|on) making (weapons?|explosives?|bombs?)/gi,
      ],
      violationMessage: 'Response contains violent or harmful content',
    },
    {
      id: 'no-hate-speech',
      type: 'forbidden-content',
      description: 'Block hate speech and discrimination',
      severity: 'critical',
      patterns: [
        /all \w+ are (inferior|stupid|evil|bad)/gi,
      ],
      violationMessage: 'Response contains hate speech or discriminatory content',
    },
    {
      id: 'no-illegal-activities',
      type: 'forbidden-content',
      description: 'Block instructions for illegal activities',
      severity: 'critical',
      patterns: [
        /how to (hack|steal|break into)/gi,
        /how to commit (fraud|theft)/gi,
        /how to (evade|avoid) (taxes|law enforcement)/gi,
      ],
      violationMessage: 'Response contains instructions for illegal activities',
    },
  ],
};

/**
 * Customer Support Policy
 * Ensures customer support responses are professional and helpful
 */
export const CUSTOMER_SUPPORT_POLICY: PolicyContract = {
  id: 'customer-support',
  name: 'Customer Support',
  description: 'Ensures customer support responses are professional and helpful',
  version: '1.0.0',
  enabled: true,
  tags: ['support', 'customer-service', 'quality'],
  rules: [
    {
      id: 'require-positive-sentiment',
      type: 'sentiment',
      description: 'Maintain positive or neutral tone',
      severity: 'medium',
      requiredSentiment: 'positive',
      violationMessage: 'Response tone is too negative for customer support',
    },
    {
      id: 'no-dismissive-language',
      type: 'forbidden-content',
      description: 'Avoid dismissive or rude language',
      severity: 'high',
      patterns: [
        /that's (not my|not our) problem/gi,
        /I (can't|cannot|won't) help you/gi,
        /you should have/gi,
        /it's your fault/gi,
      ],
      violationMessage: 'Response contains dismissive or unhelpful language',
    },
    {
      id: 'require-minimum-length',
      type: 'min-length',
      description: 'Provide detailed responses',
      severity: 'low',
      minLength: 50,
      violationMessage: 'Response is too brief for quality customer support',
    },
  ],
};

/**
 * Legal Compliance Policy
 * Prevents giving legal advice without appropriate disclaimers
 */
export const LEGAL_COMPLIANCE_POLICY: PolicyContract = {
  id: 'legal-compliance',
  name: 'Legal Compliance',
  description: 'Ensures legal responses include appropriate disclaimers',
  version: '1.0.0',
  enabled: true,
  tags: ['legal', 'compliance', 'disclaimer'],
  rules: [
    {
      id: 'no-legal-advice',
      type: 'forbidden-content',
      description: 'Prevent definitive legal advice',
      severity: 'critical',
      patterns: [
        /you should (sue|file a lawsuit)/gi,
        /you have a (strong|good) (case|claim)/gi,
        /you will (win|lose) (the case|in court)/gi,
      ],
      violationMessage: 'Response contains prohibited legal advice',
    },
    {
      id: 'require-lawyer-disclaimer',
      type: 'required-content',
      description: 'Require disclaimer to consult lawyer',
      severity: 'high',
      patterns: [
        /consult (a|an|with) (attorney|lawyer)/i,
        /not legal advice/i,
      ],
      violationMessage: 'Legal information must include disclaimer to consult an attorney',
    },
  ],
};

/**
 * Brand Safety Policy
 * Ensures responses align with brand values and guidelines
 */
export const BRAND_SAFETY_POLICY: PolicyContract = {
  id: 'brand-safety',
  name: 'Brand Safety',
  description: 'Ensures responses align with brand values and guidelines',
  version: '1.0.0',
  enabled: true,
  tags: ['brand', 'marketing', 'quality'],
  rules: [
    {
      id: 'no-profanity',
      type: 'forbidden-content',
      description: 'Block profanity and inappropriate language',
      severity: 'high',
      patterns: [
        /\b(damn|hell|crap|shit|fuck|ass)\b/gi,
      ],
      violationMessage: 'Response contains inappropriate language for brand',
    },
    {
      id: 'require-professional-tone',
      type: 'sentiment',
      description: 'Maintain professional tone',
      severity: 'medium',
      requiredSentiment: 'positive',
      violationMessage: 'Response tone does not meet brand standards',
    },
    {
      id: 'max-response-length',
      type: 'max-length',
      description: 'Keep responses concise',
      severity: 'low',
      maxLength: 500,
      violationMessage: 'Response is too long for optimal user experience',
    },
  ],
};

/**
 * Educational Content Policy
 * Ensures educational responses are accurate and appropriate
 */
export const EDUCATIONAL_CONTENT_POLICY: PolicyContract = {
  id: 'educational-content',
  name: 'Educational Content',
  description: 'Ensures educational responses are accurate and age-appropriate',
  version: '1.0.0',
  enabled: true,
  tags: ['education', 'learning', 'safety'],
  rules: [
    {
      id: 'no-cheating',
      type: 'forbidden-content',
      description: 'Discourage academic dishonesty',
      severity: 'high',
      patterns: [
        /I'll (do|complete|write) (your|the) (homework|assignment|essay)/gi,
        /copy and paste this/gi,
      ],
      violationMessage: 'Response encourages academic dishonesty',
    },
    {
      id: 'require-citations',
      type: 'required-content',
      description: 'Encourage citing sources',
      severity: 'low',
      patterns: [
        /(source|reference|citation)/i,
        /according to/i,
      ],
      violationMessage: 'Educational content should reference sources when appropriate',
    },
  ],
};

/**
 * All built-in policy templates
 */
export const POLICY_TEMPLATES: Record<string, PolicyContract> = {
  'pii-protection': PII_PROTECTION_POLICY,
  'medical-safety': MEDICAL_SAFETY_POLICY,
  'financial-advice': FINANCIAL_ADVICE_POLICY,
  'content-safety': CONTENT_SAFETY_POLICY,
  'customer-support': CUSTOMER_SUPPORT_POLICY,
  'legal-compliance': LEGAL_COMPLIANCE_POLICY,
  'brand-safety': BRAND_SAFETY_POLICY,
  'educational-content': EDUCATIONAL_CONTENT_POLICY,
};

/**
 * Get a policy template by ID
 */
export function getPolicyTemplate(id: string): PolicyContract | undefined {
  return POLICY_TEMPLATES[id];
}

/**
 * List all available policy templates
 */
export function listPolicyTemplates(): PolicyContract[] {
  return Object.values(POLICY_TEMPLATES);
}
