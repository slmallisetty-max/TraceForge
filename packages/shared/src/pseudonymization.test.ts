import { describe, it, expect, beforeEach } from "vitest";
import { Pseudonymizer } from "./pseudonymization.js";

describe("Pseudonymizer", () => {
  let pseudonymizer: Pseudonymizer;

  beforeEach(() => {
    pseudonymizer = new Pseudonymizer();
  });

  describe("Email Pseudonymization", () => {
    it("should pseudonymize email addresses", () => {
      const result = pseudonymizer.pseudonymizeEmail("john.doe@example.com");

      expect(result.pseudonym).toMatch(/^USER_\d+@example\.com$/);
      expect(result.type).toBe("email");
      expect(result.original).toBe("john.doe@example.com");
    });

    it("should preserve domain in pseudonym", () => {
      const result = pseudonymizer.pseudonymizeEmail("alice@company.org");

      expect(result.pseudonym).toContain("@company.org");
    });

    it("should return consistent pseudonyms for same email", () => {
      const result1 = pseudonymizer.pseudonymizeEmail("john@example.com");
      const result2 = pseudonymizer.pseudonymizeEmail("john@example.com");

      expect(result1.pseudonym).toBe(result2.pseudonym);
    });

    it("should generate different pseudonyms for different emails", () => {
      const result1 = pseudonymizer.pseudonymizeEmail("john@example.com");
      const result2 = pseudonymizer.pseudonymizeEmail("jane@example.com");

      expect(result1.pseudonym).not.toBe(result2.pseudonym);
    });
  });

  describe("Phone Number Pseudonymization", () => {
    it("should pseudonymize phone numbers", () => {
      const result = pseudonymizer.pseudonymizePhone("+1-555-123-4567");

      expect(result.pseudonym).toMatch(/^\+1-XXX-XXX-\d{4}$/);
      expect(result.type).toBe("phone");
    });

    it("should preserve country code", () => {
      const result = pseudonymizer.pseudonymizePhone("+44-555-123-4567");

      expect(result.pseudonym).toContain("+44");
    });

    it("should return consistent pseudonyms", () => {
      const result1 = pseudonymizer.pseudonymizePhone("+1-555-123-4567");
      const result2 = pseudonymizer.pseudonymizePhone("+1-555-123-4567");

      expect(result1.pseudonym).toBe(result2.pseudonym);
    });
  });

  describe("Name Pseudonymization", () => {
    it("should pseudonymize names", () => {
      const result = pseudonymizer.pseudonymizeName("John Doe");

      expect(result.pseudonym).toMatch(/^PERSON_\d+$/);
      expect(result.type).toBe("name");
      expect(result.original).toBe("John Doe");
    });

    it("should return consistent pseudonyms", () => {
      const result1 = pseudonymizer.pseudonymizeName("Alice Smith");
      const result2 = pseudonymizer.pseudonymizeName("Alice Smith");

      expect(result1.pseudonym).toBe(result2.pseudonym);
    });
  });

  describe("SSN Pseudonymization", () => {
    it("should pseudonymize SSNs", () => {
      const result = pseudonymizer.pseudonymizeSSN("123-45-6789");

      expect(result.pseudonym).toMatch(/^SSN_\d+$/);
      expect(result.type).toBe("ssn");
    });

    it("should return consistent pseudonyms", () => {
      const result1 = pseudonymizer.pseudonymizeSSN("123-45-6789");
      const result2 = pseudonymizer.pseudonymizeSSN("123-45-6789");

      expect(result1.pseudonym).toBe(result2.pseudonym);
    });
  });

  describe("Credit Card Pseudonymization", () => {
    it("should pseudonymize credit card numbers", () => {
      const result = pseudonymizer.pseudonymizeCreditCard(
        "4532-1234-5678-9010"
      );

      expect(result.pseudonym).toMatch(/^CARD_\d+$/);
      expect(result.type).toBe("creditCard");
    });

    it("should return consistent pseudonyms", () => {
      const result1 = pseudonymizer.pseudonymizeCreditCard(
        "4532-1234-5678-9010"
      );
      const result2 = pseudonymizer.pseudonymizeCreditCard(
        "4532-1234-5678-9010"
      );

      expect(result1.pseudonym).toBe(result2.pseudonym);
    });
  });

  describe("Reversibility", () => {
    it("should support reversible pseudonymization when configured", () => {
      const reversiblePseudonymizer = new Pseudonymizer({
        reversible: true,
        encryptionKey: "0".repeat(64), // 32 bytes hex
      });

      const result =
        reversiblePseudonymizer.pseudonymizeEmail("john@example.com");
      const reversed = reversiblePseudonymizer.reverse(result.pseudonym);

      expect(reversed).toBe("john@example.com");
    });

    it("should throw error when reversing non-reversible pseudonym", () => {
      const nonReversible = new Pseudonymizer({ reversible: false });

      expect(() => {
        nonReversible.reverse("USER_001@example.com");
      }).toThrow("not reversible");
    });

    it("should return null for unknown pseudonym", () => {
      const reversible = new Pseudonymizer({ reversible: true });

      const reversed = reversible.reverse("UNKNOWN_999@example.com");

      expect(reversed).toBeNull();
    });

    it("should correctly encrypt and decrypt multiple values", () => {
      const reversible = new Pseudonymizer({ reversible: true });

      const email1 = reversible.pseudonymizeEmail("alice@example.com");
      const email2 = reversible.pseudonymizeEmail("bob@example.com");

      expect(reversible.reverse(email1.pseudonym)).toBe("alice@example.com");
      expect(reversible.reverse(email2.pseudonym)).toBe("bob@example.com");
    });
  });

  describe("Mapping Management", () => {
    it("should track all mappings", () => {
      pseudonymizer.pseudonymizeEmail("john@example.com");
      pseudonymizer.pseudonymizeName("Jane Doe");
      pseudonymizer.pseudonymizePhone("+1-555-123-4567");

      const mappings = pseudonymizer.getAllMappings();

      expect(mappings).toHaveLength(3);
    });

    it("should clear all mappings", () => {
      pseudonymizer.pseudonymizeEmail("john@example.com");
      pseudonymizer.pseudonymizeEmail("jane@example.com");

      expect(pseudonymizer.getAllMappings()).toHaveLength(2);

      pseudonymizer.clearMappings();

      expect(pseudonymizer.getAllMappings()).toHaveLength(0);
    });

    it("should reset counter after clearing", () => {
      pseudonymizer.pseudonymizeEmail("first@example.com");
      const firstId =
        pseudonymizer.pseudonymizeEmail("first@example.com").pseudonym;

      pseudonymizer.clearMappings();

      pseudonymizer.pseudonymizeEmail("second@example.com");
      const secondId =
        pseudonymizer.pseudonymizeEmail("second@example.com").pseudonym;

      expect(firstId).toBe(secondId); // Counter reset
    });
  });

  describe("Timestamp Tracking", () => {
    it("should include timestamp in mapping", () => {
      const before = new Date().toISOString();
      const result = pseudonymizer.pseudonymizeEmail("john@example.com");
      const after = new Date().toISOString();

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle email without domain", () => {
      const result = pseudonymizer.pseudonymizeEmail("nodomain");

      expect(result.pseudonym).toContain("@example.com"); // Default domain
    });

    it("should handle empty string gracefully", () => {
      const result = pseudonymizer.pseudonymizeEmail("");

      expect(result.pseudonym).toBeDefined();
      expect(result.type).toBe("email");
    });

    it("should handle special characters in name", () => {
      const result = pseudonymizer.pseudonymizeName("Jean-Pierre O'Reilly");

      expect(result.pseudonym).toMatch(/^PERSON_\d+$/);
      expect(result.original).toBe("Jean-Pierre O'Reilly");
    });

    it("should handle phone without country code", () => {
      const result = pseudonymizer.pseudonymizePhone("555-123-4567");

      expect(result.pseudonym).toBeDefined();
      expect(result.type).toBe("phone");
    });
  });

  describe("Configuration", () => {
    it("should use provided encryption key", () => {
      const customKey = "a".repeat(64);
      const pseudo1 = new Pseudonymizer({
        reversible: true,
        encryptionKey: customKey,
      });
      const pseudo2 = new Pseudonymizer({
        reversible: true,
        encryptionKey: customKey,
      });

      const result1 = pseudo1.pseudonymizeEmail("test@example.com");
      const result2 = pseudo2.pseudonymizeEmail("test@example.com");

      // Different instances with same key produce same pseudonym
      // because counter starts at 0 for both
      expect(result1.pseudonym).toBe(result2.pseudonym);
    });

    it("should indicate reversibility in mapping", () => {
      const reversible = new Pseudonymizer({ reversible: true });
      const nonReversible = new Pseudonymizer({ reversible: false });

      const result1 = reversible.pseudonymizeEmail("test@example.com");
      const result2 = nonReversible.pseudonymizeEmail("test@example.com");

      expect(result1.reversible).toBe(true);
      expect(result2.reversible).toBe(false);
    });
  });
});
