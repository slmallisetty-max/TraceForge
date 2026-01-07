/**
 * Pseudonymization Module
 * Provides consistent, reversible masking of PII for audit compliance
 */

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

export interface PseudonymizationConfig {
  /**
   * Secret key for reversible encryption (32 bytes)
   * Should be stored securely (e.g., in secrets manager)
   */
  encryptionKey?: string;

  /**
   * Salt for pseudonymization (prevents rainbow table attacks)
   */
  salt?: string;

  /**
   * Whether pseudonyms are reversible
   * Default: false (one-way hashing)
   */
  reversible?: boolean;
}

export interface PseudonymMapping {
  original: string;
  pseudonym: string;
  type: "email" | "phone" | "name" | "ssn" | "creditCard" | "custom";
  reversible: boolean;
  timestamp: string;
}

export class Pseudonymizer {
  private config: Required<PseudonymizationConfig>;
  private mappings: Map<string, string> = new Map(); // original -> pseudonym
  private reverseMappings: Map<string, string> = new Map(); // pseudonym -> encrypted original
  private counter: number = 0;

  constructor(config: PseudonymizationConfig = {}) {
    this.config = {
      encryptionKey: config.encryptionKey || this.generateKey(),
      salt: config.salt || randomBytes(16).toString("hex"),
      reversible: config.reversible ?? false,
    };
  }

  /**
   * Pseudonymize an email address
   * Example: john.doe@example.com -> USER_001@example.com
   */
  pseudonymizeEmail(email: string): PseudonymMapping {
    const existing = this.mappings.get(email);
    if (existing) {
      return {
        original: email,
        pseudonym: existing,
        type: "email",
        reversible: this.config.reversible,
        timestamp: new Date().toISOString(),
      };
    }

    const [, domain] = email.split("@");
    const pseudonym = `USER_${this.getNextId()}@${domain || "example.com"}`;

    this.storeMapping(email, pseudonym);

    return {
      original: email,
      pseudonym,
      type: "email",
      reversible: this.config.reversible,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pseudonymize a phone number
   * Example: +1-555-123-4567 -> +1-555-XXX-0001
   */
  pseudonymizePhone(phone: string): PseudonymMapping {
    const existing = this.mappings.get(phone);
    if (existing) {
      return {
        original: phone,
        pseudonym: existing,
        type: "phone",
        reversible: this.config.reversible,
        timestamp: new Date().toISOString(),
      };
    }

    // Extract country code if present
    const countryCodeMatch = phone.match(/^\+\d{1,3}/);
    const countryCode = countryCodeMatch ? countryCodeMatch[0] : "";

    const pseudonym = `${countryCode}-XXX-XXX-${this.getNextId()
      .toString()
      .padStart(4, "0")}`;

    this.storeMapping(phone, pseudonym);

    return {
      original: phone,
      pseudonym,
      type: "phone",
      reversible: this.config.reversible,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pseudonymize a name
   * Example: John Doe -> PERSON_001
   */
  pseudonymizeName(name: string): PseudonymMapping {
    const existing = this.mappings.get(name);
    if (existing) {
      return {
        original: name,
        pseudonym: existing,
        type: "name",
        reversible: this.config.reversible,
        timestamp: new Date().toISOString(),
      };
    }

    const pseudonym = `PERSON_${this.getNextId()}`;

    this.storeMapping(name, pseudonym);

    return {
      original: name,
      pseudonym,
      type: "name",
      reversible: this.config.reversible,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pseudonymize an SSN
   * Example: 123-45-6789 -> SSN_001
   */
  pseudonymizeSSN(ssn: string): PseudonymMapping {
    const existing = this.mappings.get(ssn);
    if (existing) {
      return {
        original: ssn,
        pseudonym: existing,
        type: "ssn",
        reversible: this.config.reversible,
        timestamp: new Date().toISOString(),
      };
    }

    const pseudonym = `SSN_${this.getNextId()}`;

    this.storeMapping(ssn, pseudonym);

    return {
      original: ssn,
      pseudonym,
      type: "ssn",
      reversible: this.config.reversible,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pseudonymize a credit card number
   * Example: 4532-1234-5678-9010 -> CARD_001
   */
  pseudonymizeCreditCard(cardNumber: string): PseudonymMapping {
    const existing = this.mappings.get(cardNumber);
    if (existing) {
      return {
        original: cardNumber,
        pseudonym: existing,
        type: "creditCard",
        reversible: this.config.reversible,
        timestamp: new Date().toISOString(),
      };
    }

    const pseudonym = `CARD_${this.getNextId()}`;

    this.storeMapping(cardNumber, pseudonym);

    return {
      original: cardNumber,
      pseudonym,
      type: "creditCard",
      reversible: this.config.reversible,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reverse a pseudonym to get original value (if reversible)
   */
  reverse(pseudonym: string): string | null {
    if (!this.config.reversible) {
      throw new Error(
        "Pseudonymization is not reversible with current configuration"
      );
    }

    const encrypted = this.reverseMappings.get(pseudonym);
    if (!encrypted) {
      return null;
    }

    return this.decrypt(encrypted);
  }

  /**
   * Get all mappings (for audit purposes)
   */
  getAllMappings(): PseudonymMapping[] {
    const mappings: PseudonymMapping[] = [];

    for (const [original, pseudonym] of this.mappings.entries()) {
      mappings.push({
        original,
        pseudonym,
        type: "custom",
        reversible: this.config.reversible,
        timestamp: new Date().toISOString(),
      });
    }

    return mappings;
  }

  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.mappings.clear();
    this.reverseMappings.clear();
    this.counter = 0;
  }

  /**
   * Store mapping (with optional encryption for reversibility)
   */
  private storeMapping(original: string, pseudonym: string): void {
    this.mappings.set(original, pseudonym);

    if (this.config.reversible) {
      const encrypted = this.encrypt(original);
      this.reverseMappings.set(pseudonym, encrypted);
    }
  }

  /**
   * Get next sequential ID
   */
  private getNextId(): number {
    return ++this.counter;
  }

  /**
   * Generate a random encryption key
   */
  private generateKey(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Encrypt a value (for reversible pseudonymization)
   */
  private encrypt(value: string): string {
    const key = Buffer.from(this.config.encryptionKey, "hex");
    const iv = randomBytes(16);
    const cipher = createCipheriv("aes-256-cbc", key, iv);

    let encrypted = cipher.update(value, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  }

  /**
   * Decrypt a value (for reversible pseudonymization)
   */
  private decrypt(encrypted: string): string {
    const [ivHex, encryptedHex] = encrypted.split(":");
    const key = Buffer.from(this.config.encryptionKey, "hex");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", key, iv);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}

/**
 * Singleton pseudonymizer with default config
 */
export const defaultPseudonymizer = new Pseudonymizer();

/**
 * Convenience functions using default pseudonymizer
 */
export function pseudonymizeEmail(email: string): PseudonymMapping {
  return defaultPseudonymizer.pseudonymizeEmail(email);
}

export function pseudonymizePhone(phone: string): PseudonymMapping {
  return defaultPseudonymizer.pseudonymizePhone(phone);
}

export function pseudonymizeName(name: string): PseudonymMapping {
  return defaultPseudonymizer.pseudonymizeName(name);
}

export function pseudonymizeSSN(ssn: string): PseudonymMapping {
  return defaultPseudonymizer.pseudonymizeSSN(ssn);
}

export function pseudonymizeCreditCard(cardNumber: string): PseudonymMapping {
  return defaultPseudonymizer.pseudonymizeCreditCard(cardNumber);
}
