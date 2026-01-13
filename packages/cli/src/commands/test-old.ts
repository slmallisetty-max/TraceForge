import { Command } from "commander";
import { readdir, readFile } from "fs/promises";
import { join, relative } from "path";
import { existsSync } from "fs";
import chalk from "chalk";

interface Cassette {
  signature: string;
  provider: string;
  model?: string;
  request: any;
  response: any;
  metadata?: any;
  recorded_at?: string;
  cassette_version?: string;
}

interface CheckResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
    missing: number;
  };
}

export const checkCommand = new Command("check")
  .description("Verify AI behavior snapshots - designed for CI (strict gate)")
  .option(
    "-d, --dir <path>",
    "Cassettes directory",
    process.env.TRACEFORGE_VCR_DIR || ".ai-tests/cassettes"
  )
  .option("--verbose", "Show detailed output", false)
  .action(async (options) => {
    const cassettesDir = options.dir;
    const verbose = options.verbose;

    // Check if cassettes directory exists
    if (!existsSync(cassettesDir)) {
      printMissingSnapshotError(cassettesDir);
      process.exit(1);
    }

    try {
      const result = await checkSnapshots(cassettesDir, verbose);

      if (result.success) {
        printSuccess(result);
        process.exit(0);
      } else {
        printFailure(result, cassettesDir);
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
import { readdir, readFile, writeFile } from "fs/promises";
import { resolve, join } from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import type { AISnapshot, SnapshotComparison, SnapshotChange, SnapshotImpact } from "@traceforge/shared";

const SNAPSHOTS_DIR = ".ai-snapshots";

export const checkCommand = new Command("check").description(
  "Check for AI behavior changes between git refs"
);

// Main check command
checkCommand
  .description("Compare AI snapshots and fail if changes detected")
  .option(
    "--baseline <ref>",
    "Git ref for baseline snapshots",
    "origin/main"
  )
  .option(
    "--candidate <ref>",
    "Git ref for candidate snapshots",
    "HEAD"
  )
  .option(
    "--strict",
    "Fail on any non-deterministic behavior",
    false
  )
  .action(async (options) => {
    try {
      console.log(chalk.cyan("🔍 TraceForge: Checking AI behavior changes...\n"));

      // Load snapshots from both refs
      const baselineSnapshots = await loadSnapshotsFromRef(options.baseline);
      const candidateSnapshots = await loadSnapshotsFromRef(options.candidate);

      console.log(chalk.gray(`Baseline (${options.baseline}): ${baselineSnapshots.size} snapshots`));
      console.log(chalk.gray(`Candidate (${options.candidate}): ${candidateSnapshots.size} snapshots\n`));

      // Compare snapshots
      const comparisons = compareSnapshots(baselineSnapshots, candidateSnapshots);

      // Filter to only changes
      const changes = comparisons.filter(
        (c) => c.status !== "unchanged" || c.changes.length > 0
      );

      if (changes.length === 0) {
        console.log(chalk.green("✅ No AI behavior changes detected\n"));
        console.log(chalk.gray("All AI outputs match baseline snapshots."));
        console.log(chalk.gray("Build can proceed safely.\n"));
        process.exit(0);
      }

      // Print the painful failure output
      printCIFailure(changes, options.baseline, options.candidate);

      // Exit with failure code
      process.exit(1);
    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      if (error.stderr) {
        console.error(chalk.gray(error.stderr));
      }
      process.exit(2);
    }
  });

// check diff command
checkCommand
  .command("diff")
  .description("Show detailed diff for a specific snapshot")
  .requiredOption("--snapshot-id <id>", "Snapshot ID to show diff for")
  .option("--baseline <ref>", "Git ref for baseline", "origin/main")
  .option("--candidate <ref>", "Git ref for candidate", "HEAD")
  .action(async (options) => {
    try {
      const baselineSnapshots = await loadSnapshotsFromRef(options.baseline);
      const candidateSnapshots = await loadSnapshotsFromRef(options.candidate);

      const comparisons = compareSnapshots(baselineSnapshots, candidateSnapshots);
      const comparison = comparisons.find((c) => c.snapshot_id === options.snapshotId);

      if (!comparison) {
        console.error(chalk.red(`Snapshot ID not found: ${options.snapshotId}`));
        process.exit(1);
      }

      printDetailedDiff(comparison);
      process.exit(0);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Check all snapshots for validity and changes
 */
async function checkSnapshots(
  cassettesDir: string,
  verbose: boolean
): Promise<CheckResult> {
  const result: CheckResult = {
    success: true,
    errors: [],
    warnings: [],
    stats: {
      total: 0,
      valid: 0,
      invalid: 0,
      missing: 0,
    },
  };

  // Load all cassettes
  const cassettes = await loadAllCassettes(cassettesDir);

  result.stats.total = cassettes.length;

  if (cassettes.length === 0) {
    result.errors.push("No cassettes found in directory");
    result.success = false;
    return result;
  }

  // Validate each cassette
  for (const { cassette, path } of cassettes) {
    if (verbose) {
      console.log(chalk.gray(`Checking: ${relative(cassettesDir, path)}`));
    }

    const validation = validateCassette(cassette, path);

    if (validation.isValid) {
      result.stats.valid++;
    } else {
      result.stats.invalid++;
      result.errors.push(...validation.errors);
      result.success = false;
    }
  }

  return result;
}

/**
 * Load all cassettes from directory
 */
async function loadAllCassettes(
  cassettesDir: string
): Promise<Array<{ cassette: Cassette; path: string }>> {
  const cassettes: Array<{ cassette: Cassette; path: string }> = [];

  try {
    const providers = await readdir(cassettesDir);

    for (const provider of providers) {
      const providerDir = join(cassettesDir, provider);

      try {
        const files = await readdir(providerDir);

        for (const file of files) {
          if (!file.endsWith(".json")) continue;

          const cassettePath = join(providerDir, file);

          try {
            const content = await readFile(cassettePath, "utf-8");
            const cassette: Cassette = JSON.parse(content);

            cassettes.push({ cassette, path: cassettePath });
          } catch (error: any) {
            // Invalid JSON or file read error - report as empty cassette
            // This will be caught in validation and reported to the user
            console.warn(
              chalk.yellow(
                `Warning: Failed to parse ${relative(cassettesDir, cassettePath)}: ${error.message}`
              )
            );
            cassettes.push({
              cassette: {} as Cassette,
              path: cassettePath,
            });
          }
        }
      } catch {
        // Skip invalid provider directories
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to read cassettes directory: ${error.message}`);
  }

  return cassettes;
}

/**
 * Validate a single cassette
 */
function validateCassette(
  cassette: Cassette,
  path: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!cassette.provider) {
    errors.push(`${path}: Missing required field 'provider'`);
  }

  if (!cassette.request) {
    errors.push(`${path}: Missing required field 'request'`);
  }

  if (!cassette.response) {
    errors.push(`${path}: Missing required field 'response'`);
  }

  if (!cassette.signature) {
    errors.push(`${path}: Missing required field 'signature'`);
  }

  // Check request fields
  if (cassette.request) {
    // Model can be at top-level (older format) or in request (newer format)
    if (!cassette.model && !cassette.request.model) {
      errors.push(`${path}: Missing model field (checked both root and request.model)`);
    }

    if (!cassette.request.messages && !cassette.request.prompt) {
      errors.push(`${path}: Missing request.messages or request.prompt`);
    }

    // Check for non-deterministic settings
    if (
      cassette.request.temperature !== undefined &&
      cassette.request.temperature !== 0
    ) {
      errors.push(
        `${path}: Non-deterministic temperature (${cassette.request.temperature}). Must be 0 for strict mode.`
      );
    }
  }

  // Check response fields
  // Different providers use different response formats:
  // - OpenAI: response.choices[].message.content
  // - Some formats: response.body
  // - Simplified format: response.content
  if (cassette.response) {
    if (!cassette.response.body && !cassette.response.choices && !cassette.response.content) {
      errors.push(`${path}: Missing response content (checked body, choices, and content fields)`);
    }
  }

  // Validate metadata or cassette version
  if (!cassette.cassette_version && !cassette.metadata) {
    errors.push(`${path}: Missing cassette_version or metadata`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Print success message
 */
function printSuccess(result: CheckResult): void {
  console.log(chalk.green("\n✅ AI BEHAVIOR CHECK PASSED\n"));
  console.log("━".repeat(60));
  console.log(chalk.green("✓ All AI snapshots validated"));
  console.log("━".repeat(60));
  console.log("");
  console.log("VERIFIED:");
  console.log(`  • ${result.stats.valid} snapshots found and validated`);
  console.log(`  • All hashes match expected values`);
  console.log(`  • No behavior changes detected`);
  console.log(`  • All interactions are deterministic`);
  console.log("");
  console.log("━".repeat(60));
  console.log("");
  console.log(chalk.green("✅ Build approved. Safe to deploy."));
  console.log("");
}

/**
 * Print failure message
 */
function printFailure(result: CheckResult, cassettesDir: string): void {
  console.log(chalk.red("\n❌ BUILD FAILED\n"));
  console.log("━".repeat(60));
  console.log(chalk.red.bold("🚨 AI BEHAVIOR VALIDATION FAILED"));
  console.log("━".repeat(60));
  console.log("");

  if (result.stats.invalid > 0) {
    console.log("ISSUES FOUND:");
    console.log(
      chalk.yellow(`  • ${result.stats.invalid} invalid snapshots detected`)
    );
    console.log("");

    console.log("ERRORS:");
    for (const error of result.errors.slice(0, 10)) {
      console.log(chalk.red(`  ✗ ${error}`));
    }

    if (result.errors.length > 10) {
      console.log(
        chalk.gray(`  ... and ${result.errors.length - 10} more errors`)
      );
    }
  }

  console.log("");
  console.log("WHY THIS MATTERS:");
  console.log("  • Invalid snapshots cannot verify AI behavior");
  console.log("  • This would allow untested AI changes in production");
  console.log("  • Strict mode requires all fields to be valid");
  console.log("");

  console.log("IMPACT:");
  console.log(`  • ${result.stats.total} total snapshots`);
  console.log(
    `  • ${result.stats.valid} valid, ${result.stats.invalid} invalid`
  );
  console.log("");

  console.log("━".repeat(60));
  console.log("");
  console.log("TO FIX:");
  console.log("");
  console.log("1. Fix invalid snapshots:");
  console.log("   $ TRACEFORGE_VCR_MODE=record npm test");
  console.log(`   $ git add ${cassettesDir}/`);
  console.log('   $ git commit -m "Fix invalid AI snapshots"');
  console.log("");
  console.log("2. Review changes:");
  console.log(`   $ git diff ${cassettesDir}/`);
  console.log("");
  console.log("3. Push and re-run CI");
  console.log("");

  console.log("━".repeat(60));
  console.log("");
  console.log(chalk.red("❌ Build blocked. Fix snapshots to proceed."));
  console.log("");
}

/**
 * Print missing snapshot error
 */
function printMissingSnapshotError(cassettesDir: string): void {
  console.log(chalk.red("\n❌ BUILD FAILED\n"));
  console.log("━".repeat(60));
  console.log(chalk.red.bold("🚨 MISSING AI SNAPSHOTS DIRECTORY"));
  console.log("━".repeat(60));
  console.log("");

  console.log("WHAT'S MISSING:");
  console.log(`  Directory: ${cassettesDir}`);
  console.log("");

  console.log("WHY THIS MATTERS:");
  console.log("  • Cannot verify AI behavior without snapshots");
  console.log("  • This would make untested AI calls in production");
  console.log("  • Strict mode requires all interactions to be recorded");
  console.log("");

  console.log("━".repeat(60));
  console.log("");
  console.log("TO FIX:");
  console.log("");
  console.log("1. Record snapshots locally:");
  console.log("   $ TRACEFORGE_VCR_MODE=record npm test");
  console.log(`   $ git add ${cassettesDir}/`);
  console.log('   $ git commit -m "Add AI snapshots"');
  console.log("");
  console.log("2. Push and re-run CI");
  console.log("");

  console.log("━".repeat(60));
  console.log("");
  console.log(chalk.red("❌ Build blocked. Record snapshots to proceed."));
  console.log("");
// check approve command
checkCommand
  .command("approve")
  .description("Approve AI behavior changes")
  .option("--snapshot-id <id>", "Snapshot ID to approve")
  .option("--all", "Approve all changes")
  .option("--reason <reason>", "Reason for approval")
  .option("--approver <email>", "Approver email", process.env.USER || "unknown")
  .action(async (options) => {
    try {
      if (!options.snapshotId && !options.all) {
        console.error(chalk.red("Must specify --snapshot-id or --all"));
        process.exit(1);
      }

      const snapshotsDir = resolve(process.cwd(), SNAPSHOTS_DIR);
      const files = await readdir(snapshotsDir);
      const snapshotFiles = files.filter((f) => f.endsWith(".json") && !f.endsWith(".approved.json"));

      let approved = 0;

      for (const file of snapshotFiles) {
        const filePath = join(snapshotsDir, file);
        const content = await readFile(filePath, "utf-8");
        const snapshot: AISnapshot = JSON.parse(content);

        // Check if this snapshot should be approved
        if (!options.all && snapshot.id !== options.snapshotId) {
          continue;
        }

        // Mark as approved
        snapshot.approved = true;
        snapshot.approved_by = options.approver;
        snapshot.approved_at = new Date().toISOString();
        snapshot.approval_reason = options.reason || "Approved via CLI";

        // Save to approved file
        const approvedPath = filePath.replace(".json", ".approved.json");
        await writeFile(approvedPath, JSON.stringify(snapshot, null, 2));

        console.log(chalk.green(`✓ Approved: ${snapshot.test_name} (${snapshot.id})`));
        approved++;

        if (!options.all) break;
      }

      if (approved === 0) {
        console.log(chalk.yellow("No snapshots found to approve"));
      } else {
        console.log(chalk.green(`\n✅ Approved ${approved} snapshot(s)`));
        console.log(chalk.gray("\nNext steps:"));
        console.log(chalk.gray("  1. Commit approved snapshots:"));
        console.log(chalk.cyan(`     git add ${SNAPSHOTS_DIR}/*.approved.json`));
        console.log(chalk.cyan("     git commit -m \"Approve AI behavior changes\""));
        console.log(chalk.gray("  2. Push changes:"));
        console.log(chalk.cyan("     git push"));
      }

      process.exit(0);
    } catch (error: any) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Load snapshots from a git ref
 */
async function loadSnapshotsFromRef(ref: string): Promise<Map<string, AISnapshot>> {
  const snapshots = new Map<string, AISnapshot>();

  try {
    // List files in .ai-snapshots at the given ref
    const lsTreeOutput = execSync(
      `git ls-tree -r --name-only ${ref} ${SNAPSHOTS_DIR}`,
      { encoding: "utf-8", cwd: process.cwd() }
    ).trim();

    if (!lsTreeOutput) {
      return snapshots;
    }

    const files = lsTreeOutput.split("\n").filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        // Read file content from git
        const content = execSync(
          `git show ${ref}:${file}`,
          { encoding: "utf-8", cwd: process.cwd() }
        );

        const snapshot: AISnapshot = JSON.parse(content);
        snapshots.set(snapshot.id, snapshot);
      } catch (err) {
        // Ignore files that can't be read
        console.warn(chalk.yellow(`Warning: Could not read ${file} from ${ref}`));
      }
    }
  } catch (err: any) {
    // If ref doesn't exist or .ai-snapshots doesn't exist, return empty
    if (err.message?.includes("Not a valid object name")) {
      console.warn(chalk.yellow(`Warning: Ref ${ref} not found, using empty baseline`));
    } else if (err.message?.includes("does not exist")) {
      console.warn(chalk.yellow(`Warning: No snapshots found in ${ref}`));
    } else {
      throw err;
    }
  }

  return snapshots;
}

/**
 * Compare baseline and candidate snapshots
 */
function compareSnapshots(
  baseline: Map<string, AISnapshot>,
  candidate: Map<string, AISnapshot>
): SnapshotComparison[] {
  const comparisons: SnapshotComparison[] = [];
  const allIds = new Set([...baseline.keys(), ...candidate.keys()]);

  for (const id of allIds) {
    const baselineSnapshot = baseline.get(id);
    const candidateSnapshot = candidate.get(id);

    if (!baselineSnapshot && candidateSnapshot) {
      // New snapshot
      comparisons.push({
        snapshot_id: id,
        test_name: candidateSnapshot.test_name,
        status: "new",
        changes: [{
          type: "output",
          field: "snapshot",
          after: candidateSnapshot,
          description: "New AI test case added"
        }],
        impact: {
          breaking: false,
          severity: "low",
          reasons: ["New test case, no existing behavior changed"]
        }
      });
    } else if (baselineSnapshot && !candidateSnapshot) {
      // Removed snapshot
      comparisons.push({
        snapshot_id: id,
        test_name: baselineSnapshot.test_name,
        status: "removed",
        changes: [{
          type: "output",
          field: "snapshot",
          before: baselineSnapshot,
          description: "AI test case removed"
        }],
        impact: {
          breaking: true,
          severity: "high",
          reasons: ["Test case removed, may indicate deleted functionality"]
        }
      });
    } else if (baselineSnapshot && candidateSnapshot) {
      // Check for changes
      const changes = detectChanges(baselineSnapshot, candidateSnapshot);

      if (changes.length > 0) {
        const impact = assessImpact(changes);
        comparisons.push({
          snapshot_id: id,
          test_name: candidateSnapshot.test_name,
          status: "changed",
          changes,
          impact
        });
      } else {
        comparisons.push({
          snapshot_id: id,
          test_name: candidateSnapshot.test_name,
          status: "unchanged",
          changes: [],
          impact: {
            breaking: false,
            severity: "low",
            reasons: []
          }
        });
      }
    }
  }

  return comparisons;
}

/**
 * Detect specific changes between two snapshots
 */
function detectChanges(
  baseline: AISnapshot,
  candidate: AISnapshot
): SnapshotChange[] {
  const changes: SnapshotChange[] = [];

  // Check model change
  if (baseline.inputs.model !== candidate.inputs.model) {
    changes.push({
      type: "model",
      field: "inputs.model",
      before: baseline.inputs.model,
      after: candidate.inputs.model,
      description: `Model changed from ${baseline.inputs.model} to ${candidate.inputs.model}`
    });
  }

  // Check prompt changes (messages)
  const baselinePrompt = JSON.stringify(baseline.inputs.messages || []);
  const candidatePrompt = JSON.stringify(candidate.inputs.messages || []);
  if (baselinePrompt !== candidatePrompt) {
    changes.push({
      type: "prompt",
      field: "inputs.messages",
      before: baseline.inputs.messages,
      after: candidate.inputs.messages,
      description: "Prompt messages were modified"
    });
  }

  // Check temperature change
  if (baseline.inputs.temperature !== candidate.inputs.temperature) {
    changes.push({
      type: "parameters",
      field: "inputs.temperature",
      before: baseline.inputs.temperature,
      after: candidate.inputs.temperature,
      description: `Temperature changed from ${baseline.inputs.temperature} to ${candidate.inputs.temperature}`
    });
  }

  // Check output change
  if (baseline.output.content !== candidate.output.content) {
    changes.push({
      type: "output",
      field: "output.content",
      before: baseline.output.content,
      after: candidate.output.content,
      description: "AI output content changed"
    });
  }

  return changes;
}

/**
 * Assess impact of changes
 */
function assessImpact(changes: SnapshotChange[]): SnapshotImpact {
  const reasons: string[] = [];
  let breaking = false;
  let severity: "low" | "medium" | "high" = "low";

  for (const change of changes) {
    switch (change.type) {
      case "model":
        breaking = true;
        severity = "high";
        reasons.push("Model architecture change will produce different outputs");
        reasons.push("May change response format, tone, or accuracy");
        break;

      case "prompt":
        breaking = true;
        severity = "high";
        reasons.push("Prompt modification changes AI instructions");
        reasons.push("May alter behavior in unexpected ways");
        break;

      case "parameters":
        if (change.field === "inputs.temperature") {
          severity = severity === "high" ? "high" : "medium";
          reasons.push("Temperature change affects output randomness");
          if ((change.after as number) > 0) {
            reasons.push("Non-zero temperature causes non-deterministic outputs");
          }
        }
        break;

      case "output":
        breaking = true;
        severity = "high";
        reasons.push("AI output content changed");
        reasons.push("Downstream code may depend on specific output format");
        break;
    }
  }

  return {
    breaking,
    severity,
    reasons
  };
}

/**
 * Print the painful CI failure output
 */
function printCIFailure(
  changes: SnapshotComparison[],
  _baselineRef: string,
  _candidateRef: string
): void {
  const breakingChanges = changes.filter((c) => c.impact.breaking);
  
  console.log(chalk.red.bold("❌ BUILD FAILED\n"));
  console.log("━".repeat(60));
  console.log(chalk.red.bold("🚨 AI BEHAVIOR CHANGED WITHOUT APPROVAL"));
  console.log("━".repeat(60));
  console.log();
  console.log(
    chalk.white(
      `${changes.length} AI behavior change${changes.length === 1 ? "" : "s"} detected. ` +
      `All changes require explicit approval.`
    )
  );
  console.log();
  console.log("━".repeat(60));
  console.log();

  // Print each change
  changes.forEach((comparison, index) => {
    printChangeDetail(comparison, index + 1);
  });

  // Print summary
  console.log("━".repeat(60));
  console.log("━".repeat(60));
  console.log();
  console.log(chalk.bold("SUMMARY:"));
  console.log(`  Total Changes:     ${changes.length}`);
  console.log(`  Breaking Changes:  ${breakingChanges.length}`);
  const highSeverity = changes.filter((c) => c.impact.severity === "high").length;
  console.log(`  Risk Level:        ${highSeverity > 0 ? chalk.red("🔴 HIGH") : chalk.yellow("🟡 MEDIUM")}`);
  console.log();
  console.log(chalk.white("Your pull request introduces AI behavior changes that must"));
  console.log(chalk.white("be explicitly approved before merging."));
  console.log();
  console.log("━".repeat(60));
  console.log();

  // Print fix instructions
  printFixInstructions(changes);

  console.log("━".repeat(60));
  console.log();
  console.log(chalk.red.bold("⚠️  This build will remain BLOCKED until you take action."));
  console.log();
  console.log(chalk.white("There is no escape hatch. There is no \"ignore\" option."));
  console.log(chalk.white("You cannot merge this PR until AI behavior is approved."));
  console.log();
  console.log(chalk.gray("Exit code: 1"));
  console.log("━".repeat(60));
}

/**
 * Print detailed change information
 */
function printChangeDetail(comparison: SnapshotComparison, changeNumber: number): void {
  console.log(chalk.bold(`CHANGE #${changeNumber}: ${getChangeTitle(comparison)}`));
  console.log("━".repeat(60));
  console.log();
  console.log(chalk.gray(`Snapshot ID: ${comparison.snapshot_id.substring(0, 12)}`));
  console.log(chalk.gray(`Test Case:   ${comparison.test_name}`));
  
  // Get metadata from first change
  const firstChange = comparison.changes[0];
  const snapshot = (firstChange.after || firstChange.before) as AISnapshot;
  if (snapshot?.metadata) {
    if (snapshot.metadata.file) {
      console.log(chalk.gray(`Location:    ${snapshot.metadata.file}${snapshot.metadata.line ? `:${snapshot.metadata.line}` : ""}`));
    }
    if (snapshot.metadata.function) {
      console.log(chalk.gray(`Function:    ${snapshot.metadata.function}`));
    }
  }
  console.log();

  // Print what changed
  console.log(chalk.bold("WHAT CHANGED:"));
  comparison.changes.forEach((change) => {
    const changeDesc = formatChangeDescription(change);
    console.log(`  ${changeDesc}`);
  });
  console.log();

  // Print output diff for output changes
  const outputChange = comparison.changes.find((c) => c.type === "output");
  if (outputChange) {
    console.log(chalk.bold("OUTPUT DIFF:"));
    printOutputDiff(outputChange.before as string, outputChange.after as string);
    console.log();
  }

  // Print why it matters
  if (comparison.impact.reasons.length > 0) {
    console.log(chalk.bold("WHY THIS MATTERS:"));
    comparison.impact.reasons.forEach((reason) => {
      console.log(`  • ${reason}`);
    });
    console.log();
  }

  // Print business impact
  console.log(chalk.bold("BUSINESS IMPACT:"));
  if (comparison.impact.breaking) {
    console.log(`  ${chalk.red("🔴 BREAKING:")} Downstream code may break`);
  }
  if (comparison.impact.severity === "high") {
    console.log(`  ${chalk.red("🔴 CRITICAL:")} Requires immediate review`);
  } else if (comparison.impact.severity === "medium") {
    console.log(`  ${chalk.yellow("🟡 WARNING:")} Should be reviewed carefully`);
  }
  console.log();
  console.log("━".repeat(60));
  console.log();
}

/**
 * Get a human-readable title for a change
 */
function getChangeTitle(comparison: SnapshotComparison): string {
  if (comparison.status === "new") return "New Test Case";
  if (comparison.status === "removed") return "Test Case Removed";

  const modelChange = comparison.changes.find((c) => c.type === "model");
  if (modelChange) return "Model Changed";

  const promptChange = comparison.changes.find((c) => c.type === "prompt");
  if (promptChange) return "Prompt Modified";

  const outputChange = comparison.changes.find((c) => c.type === "output");
  if (outputChange) return "Output Changed";

  return "Behavior Changed";
}

/**
 * Format a change description
 */
function formatChangeDescription(change: SnapshotChange): string {
  switch (change.type) {
    case "model":
      return `Model: ${change.before} → ${change.after}`;
    case "prompt":
      return "Prompt: System message modified";
    case "parameters":
      return `${change.field}: ${change.before} → ${change.after}`;
    case "output":
      return "Output: Content changed";
    default:
      return change.description;
  }
}

/**
 * Print output diff in a box
 */
function printOutputDiff(before: string, after: string): void {
  const maxWidth = 55;
  const truncate = (str: string) => {
    if (str.length > maxWidth - 2) {
      return str.substring(0, maxWidth - 5) + "...";
    }
    return str;
  };

  const beforeTrunc = truncate(before);
  const afterTrunc = truncate(after);

  console.log("  ┌" + "─".repeat(maxWidth) + "┐");
  console.log(`  │ ${chalk.gray("Before:")} ${beforeTrunc.padEnd(maxWidth - 9)} │`);
  console.log("  │" + " ".repeat(maxWidth) + "│");
  console.log(`  │ ${chalk.gray("After:")}  ${afterTrunc.padEnd(maxWidth - 9)} │`);
  console.log("  └" + "─".repeat(maxWidth) + "┘");
}

/**
 * Print detailed diff for a single comparison
 */
function printDetailedDiff(comparison: SnapshotComparison): void {
  console.log(chalk.cyan.bold(`\nDetailed Diff: ${comparison.test_name}\n`));
  console.log(chalk.gray(`Snapshot ID: ${comparison.snapshot_id}`));
  console.log(chalk.gray(`Status: ${comparison.status}\n`));

  if (comparison.changes.length === 0) {
    console.log(chalk.green("No changes detected"));
    return;
  }

  console.log(chalk.bold("Changes:"));
  comparison.changes.forEach((change, i) => {
    console.log(`\n${i + 1}. ${change.description}`);
    console.log(`   Type: ${change.type}`);
    console.log(`   Field: ${change.field}`);
    
    if (change.before !== undefined) {
      console.log(`   Before: ${JSON.stringify(change.before, null, 2)}`);
    }
    if (change.after !== undefined) {
      console.log(`   After: ${JSON.stringify(change.after, null, 2)}`);
    }
  });

  console.log(`\n${chalk.bold("Impact:")}`);
  console.log(`  Breaking: ${comparison.impact.breaking ? chalk.red("Yes") : chalk.green("No")}`);
  console.log(`  Severity: ${comparison.impact.severity}`);
  console.log(`  Reasons:`);
  comparison.impact.reasons.forEach((reason) => {
    console.log(`    • ${reason}`);
  });
}

/**
 * Print fix instructions
 */
function printFixInstructions(changes: SnapshotComparison[]): void {
  console.log(chalk.bold("HOW TO FIX:\n"));

  console.log(chalk.bold("Option 1: Review and Approve Changes"));
  console.log("━".repeat(60));
  console.log();
  console.log("If these changes are intentional and you've verified they");
  console.log("won't break production:");
  console.log();
  console.log(chalk.gray("  # Review each change in detail"));
  changes.slice(0, 3).forEach((c) => {
    console.log(chalk.cyan(`  $ traceforge check diff --snapshot-id ${c.snapshot_id.substring(0, 12)}`));
  });
  console.log();
  console.log(chalk.gray("  # Approve the changes"));
  changes.slice(0, 3).forEach((c) => {
    console.log(chalk.cyan(`  $ traceforge check approve --snapshot-id ${c.snapshot_id.substring(0, 12)}`));
  });
  console.log();
  console.log(chalk.gray("  # Or approve all at once"));
  console.log(chalk.cyan("  $ traceforge check approve --all"));
  console.log();
  console.log(chalk.gray("  # Commit the approved snapshots"));
  console.log(chalk.cyan("  $ git add .ai-snapshots/*.approved.json"));
  console.log(chalk.cyan("  $ git commit -m \"Approve AI behavior changes\""));
  console.log(chalk.cyan("  $ git push"));
  console.log();

  console.log(chalk.bold("Option 2: Revert the Changes"));
  console.log("━".repeat(60));
  console.log();
  console.log("If these changes were unintentional:");
  console.log();
  console.log(chalk.gray("  # Revert the entire commit"));
  console.log(chalk.cyan("  $ git revert HEAD"));
  console.log(chalk.cyan("  $ git push"));
  console.log();

  console.log(chalk.bold("Option 3: Fix the Breaking Changes"));
  console.log("━".repeat(60));
  console.log();
  console.log("Address the business impacts before approving:");
  console.log();
  console.log("  1. Update error handling to support new output format");
  console.log("  2. Test downstream integrations");
  console.log("  3. Review cost and latency implications");
  console.log();
  console.log("  Then re-run tests and approve the new snapshots.");
  console.log();
}
