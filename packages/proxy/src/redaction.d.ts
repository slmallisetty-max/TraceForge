/**
 * Redaction utility for removing sensitive data from traces
 */
export interface RedactionConfig {
    enabled?: boolean;
    redactHeaders?: string[];
    redactFields?: string[];
    redactPatterns?: boolean;
    customPatterns?: RegExp[];
    redactionText?: string;
}
export declare class Redactor {
    private config;
    constructor(config?: RedactionConfig);
    /**
     * Redact sensitive data from a trace object
     */
    redactTrace(trace: any): any;
    /**
     * Redact sensitive headers
     */
    private redactHeaders;
    /**
     * Recursively redact sensitive data from an object
     */
    private redactObject;
    /**
     * Redact sensitive patterns from a string
     */
    private redactString;
    /**
     * Check if a field name is sensitive
     */
    private isSensitiveField;
}
export declare const defaultRedactor: Redactor;
/**
 * Convenience function to redact a trace with default settings
 */
export declare function redactTrace(trace: any, config?: RedactionConfig): any;
//# sourceMappingURL=redaction.d.ts.map