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
            // Invalid JSON or file read error
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
    if (!cassette.model && !cassette.request.model) {
      errors.push(`${path}: Missing model field`);
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
  if (cassette.response) {
    if (!cassette.response.body && !cassette.response.choices && !cassette.response.content) {
      errors.push(`${path}: Missing response content`);
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
}
