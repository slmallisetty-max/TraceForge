/**
 * Redaction utility for removing sensitive data from traces
 */

// Sensitive patterns to detect and redact
const SENSITIVE_PATTERNS = {
  // API Keys
  apiKey: /\b(sk-[a-zA-Z0-9]{20,}|api[_-]?key[_-]?[a-zA-Z0-9]{20,})\b/gi,
  
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (US format)
  phone: /\b(\+?1[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
  
  // SSN (US format)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  
  // Bearer tokens
  bearerToken: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  
  // JWT tokens
  jwt: /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
};

// Default headers to redact
const SENSITIVE_HEADERS = [
  'authorization',
  'x-api-key',
  'api-key',
  'apikey',
  'x-auth-token',
  'cookie',
  'set-cookie',
];

// Default field names to redact (case-insensitive)
const SENSITIVE_FIELD_NAMES = [
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'client_secret',
  'private_key',
  'passphrase',
];

export interface RedactionConfig {
  enabled?: boolean;
  redactHeaders?: string[];
  redactFields?: string[];
  redactPatterns?: boolean;
  customPatterns?: RegExp[];
  redactionText?: string;
}

export class Redactor {
  private config: Required<RedactionConfig>;

  constructor(config: RedactionConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      redactHeaders: config.redactHeaders ?? SENSITIVE_HEADERS,
      redactFields: config.redactFields ?? SENSITIVE_FIELD_NAMES,
      redactPatterns: config.redactPatterns ?? true,
      customPatterns: config.customPatterns ?? [],
      redactionText: config.redactionText ?? '[REDACTED]',
    };
  }

  /**
   * Redact sensitive data from a trace object
   */
  redactTrace(trace: any): any {
    if (!this.config.enabled) {
      return trace;
    }

    // Deep clone to avoid mutating original
    const redacted = JSON.parse(JSON.stringify(trace));

    // Redact headers
    if (redacted.request?.headers) {
      redacted.request.headers = this.redactHeaders(redacted.request.headers);
    }

    // Redact request body
    if (redacted.request) {
      redacted.request = this.redactObject(redacted.request);
    }

    // Redact response
    if (redacted.response) {
      redacted.response = this.redactObject(redacted.response);
    }

    return redacted;
  }

  /**
   * Redact sensitive headers
   */
  private redactHeaders(headers: Record<string, any>): Record<string, any> {
    const redacted = { ...headers };
    
    for (const key of Object.keys(redacted)) {
      const lowerKey = key.toLowerCase();
      if (this.config.redactHeaders.some(h => lowerKey.includes(h.toLowerCase()))) {
        redacted[key] = this.config.redactionText;
      }
    }

    return redacted;
  }

  /**
   * Recursively redact sensitive data from an object
   */
  private redactObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redactString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item));
    }

    if (typeof obj === 'object') {
      const redacted: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // Check if field name is sensitive
        if (this.isSensitiveField(key)) {
          redacted[key] = this.config.redactionText;
        } else {
          redacted[key] = this.redactObject(value);
        }
      }

      return redacted;
    }

    return obj;
  }

  /**
   * Redact sensitive patterns from a string
   */
  private redactString(str: string): string {
    if (!this.config.redactPatterns) {
      return str;
    }

    let redacted = str;

    // Apply built-in patterns
    for (const pattern of Object.values(SENSITIVE_PATTERNS)) {
      redacted = redacted.replace(pattern, this.config.redactionText);
    }

    // Apply custom patterns
    for (const pattern of this.config.customPatterns) {
      redacted = redacted.replace(pattern, this.config.redactionText);
    }

    return redacted;
  }

  /**
   * Check if a field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const lower = fieldName.toLowerCase();
    return this.config.redactFields.some(f => lower.includes(f.toLowerCase()));
  }
}

// Export singleton with default config
export const defaultRedactor = new Redactor();

/**
 * Convenience function to redact a trace with default settings
 */
export function redactTrace(trace: any, config?: RedactionConfig): any {
  const redactor = config ? new Redactor(config) : defaultRedactor;
  return redactor.redactTrace(trace);
}
