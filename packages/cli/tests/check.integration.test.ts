import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import type { AISnapshot } from "@traceforge/shared";

const TEST_DIR = "/tmp/traceforge-check-test";
const SNAPSHOTS_DIR = join(TEST_DIR, ".ai-snapshots");

describe("traceforge check command", () => {
  beforeEach(() => {
    // Clean up and create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });

    // Initialize git repo
    execSync("git init", { cwd: TEST_DIR });
    execSync('git config user.email "test@test.com"', { cwd: TEST_DIR });
    execSync('git config user.name "Test User"', { cwd: TEST_DIR });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should exit 0 when no changes detected", () => {
    // Create a baseline snapshot
    const snapshot: AISnapshot = {
      id: "test-snapshot-1",
      test_name: "test_case_1",
      timestamp: new Date().toISOString(),
      git_commit: "baseline",
      inputs: {
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0,
      },
      output: {
        content: "Hi there!",
        finish_reason: "stop",
      },
      metadata: {
        file: "test.py",
        line: 10,
        function: "test_func",
      },
    };

    // Write snapshot
    const snapshotPath = join(SNAPSHOTS_DIR, "test-snapshot-1.json");
    writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

    // Commit to baseline
    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "baseline"', { cwd: TEST_DIR });
    execSync("git branch -M main", { cwd: TEST_DIR });

    // No changes - should pass
    try {
      const output = execSync(
        "traceforge check --baseline main --candidate HEAD",
        {
          cwd: TEST_DIR,
          encoding: "utf-8",
        }
      );
      expect(output).toContain("No AI behavior changes detected");
    } catch (error: any) {
      // Exit code 0 is success, but execSync might still throw
      if (error.status !== 0) {
        throw error;
      }
    }
  });

  it("should exit 1 when model changed", () => {
    // Create baseline snapshot
    const baselineSnapshot: AISnapshot = {
      id: "test-snapshot-2",
      test_name: "test_case_2",
      timestamp: new Date().toISOString(),
      inputs: {
        model: "gpt-4-turbo",
        messages: [{ role: "user", content: "Summarize this" }],
      },
      output: {
        content: "Error: Invalid input format",
        finish_reason: "stop",
      },
      metadata: {
        file: "summarizer.py",
        line: 12,
      },
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-2.json"),
      JSON.stringify(baselineSnapshot, null, 2)
    );

    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "baseline"', { cwd: TEST_DIR });
    execSync("git branch -M main", { cwd: TEST_DIR });

    // Change model in candidate
    const candidateSnapshot: AISnapshot = {
      ...baselineSnapshot,
      inputs: {
        ...baselineSnapshot.inputs,
        model: "gpt-4o",
      },
      output: {
        content: "I apologize, but I cannot process this request",
        finish_reason: "stop",
      },
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-2.json"),
      JSON.stringify(candidateSnapshot, null, 2)
    );

    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "change model"', { cwd: TEST_DIR });

    // Should fail with model change detected
    try {
      execSync("traceforge check --baseline main --candidate HEAD", {
        cwd: TEST_DIR,
        encoding: "utf-8",
      });
      expect.fail("Should have exited with code 1");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout || error.stderr || "";
      expect(output).toContain("AI BEHAVIOR CHANGED");
      expect(output).toContain("Model Changed");
      expect(output).toContain("gpt-4-turbo");
      expect(output).toContain("gpt-4o");
    }
  });

  it("should exit 1 when prompt changed", () => {
    // Create baseline snapshot
    const baselineSnapshot: AISnapshot = {
      id: "test-snapshot-3",
      test_name: "test_case_3",
      timestamp: new Date().toISOString(),
      inputs: {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Classify sentiment as: positive, negative, neutral",
          },
          { role: "user", content: "I love this product!" },
        ],
      },
      output: {
        content: "positive",
        finish_reason: "stop",
      },
      metadata: {},
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-3.json"),
      JSON.stringify(baselineSnapshot, null, 2)
    );

    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "baseline"', { cwd: TEST_DIR });
    execSync("git branch -M main", { cwd: TEST_DIR });

    // Change prompt in candidate
    const candidateSnapshot: AISnapshot = {
      ...baselineSnapshot,
      inputs: {
        ...baselineSnapshot.inputs,
        messages: [
          {
            role: "system",
            content: "Classify sentiment as: positive, negative, neutral, mixed",
          },
          { role: "user", content: "I love this product!" },
        ],
      },
      output: {
        content: "mixed",
        finish_reason: "stop",
      },
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-3.json"),
      JSON.stringify(candidateSnapshot, null, 2)
    );

    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "change prompt"', { cwd: TEST_DIR });

    // Should fail with prompt change detected
    try {
      execSync("traceforge check --baseline main --candidate HEAD", {
        cwd: TEST_DIR,
        encoding: "utf-8",
      });
      expect.fail("Should have exited with code 1");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout || error.stderr || "";
      expect(output).toContain("AI BEHAVIOR CHANGED");
      expect(output).toContain("Prompt Modified");
    }
  });

  it("should exit 1 when output changed", () => {
    // Create baseline snapshot
    const baselineSnapshot: AISnapshot = {
      id: "test-snapshot-4",
      test_name: "test_case_4",
      timestamp: new Date().toISOString(),
      inputs: {
        model: "gpt-4",
        messages: [{ role: "user", content: "Say hello" }],
      },
      output: {
        content: "Hello!",
        finish_reason: "stop",
      },
      metadata: {},
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-4.json"),
      JSON.stringify(baselineSnapshot, null, 2)
    );

    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "baseline"', { cwd: TEST_DIR });
    execSync("git branch -M main", { cwd: TEST_DIR });

    // Change output in candidate (same inputs)
    const candidateSnapshot: AISnapshot = {
      ...baselineSnapshot,
      output: {
        content: "Hi there!",
        finish_reason: "stop",
      },
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-4.json"),
      JSON.stringify(candidateSnapshot, null, 2)
    );

    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "output changed"', { cwd: TEST_DIR });

    // Should fail with output change detected
    try {
      execSync("traceforge check --baseline main --candidate HEAD", {
        cwd: TEST_DIR,
        encoding: "utf-8",
      });
      expect.fail("Should have exited with code 1");
    } catch (error: any) {
      expect(error.status).toBe(1);
      const output = error.stdout || error.stderr || "";
      expect(output).toContain("AI BEHAVIOR CHANGED");
      expect(output).toContain("Output Changed");
    }
  });
});

describe("traceforge check diff command", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });

    execSync("git init", { cwd: TEST_DIR });
    execSync('git config user.email "test@test.com"', { cwd: TEST_DIR });
    execSync('git config user.name "Test User"', { cwd: TEST_DIR });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should show detailed diff for a snapshot", () => {
    // Create baseline snapshot
    const baselineSnapshot: AISnapshot = {
      id: "test-snapshot-diff",
      test_name: "diff_test",
      timestamp: new Date().toISOString(),
      inputs: {
        model: "gpt-4",
        messages: [{ role: "user", content: "Hello" }],
      },
      output: {
        content: "Hi!",
        finish_reason: "stop",
      },
      metadata: {},
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-diff.json"),
      JSON.stringify(baselineSnapshot, null, 2)
    );

    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "baseline"', { cwd: TEST_DIR });
    execSync("git branch -M main", { cwd: TEST_DIR });

    // Change in candidate
    const candidateSnapshot: AISnapshot = {
      ...baselineSnapshot,
      inputs: {
        ...baselineSnapshot.inputs,
        model: "gpt-4o",
      },
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-diff.json"),
      JSON.stringify(candidateSnapshot, null, 2)
    );

    execSync("git add .", { cwd: TEST_DIR });
    execSync('git commit -m "change"', { cwd: TEST_DIR });

    // Run diff command
    try {
      const output = execSync(
        "traceforge check diff --snapshot-id test-snapshot-diff --baseline main --candidate HEAD",
        {
          cwd: TEST_DIR,
          encoding: "utf-8",
        }
      );
      expect(output).toContain("Detailed Diff");
      expect(output).toContain("diff_test");
      expect(output).toContain("gpt-4");
      expect(output).toContain("gpt-4o");
    } catch (error: any) {
      // Check if it's just an exit code issue
      if (error.status === 0 || (error.stdout && error.stdout.includes("Detailed Diff"))) {
        expect(error.stdout).toContain("Detailed Diff");
      } else {
        throw error;
      }
    }
  });
});

describe("traceforge check approve command", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("should approve a specific snapshot", () => {
    // Create a snapshot to approve
    const snapshot: AISnapshot = {
      id: "test-snapshot-approve",
      test_name: "approve_test",
      timestamp: new Date().toISOString(),
      inputs: {
        model: "gpt-4",
        messages: [{ role: "user", content: "Test" }],
      },
      output: {
        content: "Test output",
        finish_reason: "stop",
      },
      metadata: {},
    };

    writeFileSync(
      join(SNAPSHOTS_DIR, "test-snapshot-approve.json"),
      JSON.stringify(snapshot, null, 2)
    );

    // Run approve command
    try {
      const output = execSync(
        'traceforge check approve --snapshot-id test-snapshot-approve --reason "Testing approval"',
        {
          cwd: TEST_DIR,
          encoding: "utf-8",
        }
      );
      expect(output).toContain("Approved");

      // Check that approved file was created
      const approvedPath = join(
        SNAPSHOTS_DIR,
        "test-snapshot-approve.approved.json"
      );
      expect(existsSync(approvedPath)).toBe(true);

      // Verify approved snapshot has approval metadata
      const approvedContent = JSON.parse(
        readFileSync(approvedPath, "utf-8")
      );
      expect(approvedContent.approved).toBe(true);
      expect(approvedContent.approval_reason).toBe("Testing approval");
    } catch (error: any) {
      if (error.status === 0 || (error.stdout && error.stdout.includes("Approved"))) {
        // Success case
        const approvedPath = join(
          SNAPSHOTS_DIR,
          "test-snapshot-approve.approved.json"
        );
        expect(existsSync(approvedPath)).toBe(true);
      } else {
        throw error;
      }
    }
  });
});
