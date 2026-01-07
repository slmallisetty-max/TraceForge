import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { resolve, join } from 'path';
import chalk from 'chalk';
import type { Trace } from '@traceforge/shared';
import {
  calculateSemanticDrift,
  CriticAgent,
  calculateCICDRiskScore,
  generateRiskReport,
  type RiskPolicy
} from '@traceforge/shared';

export const ciCommand = new Command('ci')
  .description('CI/CD risk analysis commands');

// ci check command
ciCommand
  .command('check')
  .description('Run risk analysis on test suite')
  .option('-b, --baseline <path>', 'Baseline traces directory', '.ai-tests/baseline')
  .option('-c, --current <path>', 'Current traces directory', '.ai-tests/traces')
  .option('-t, --threshold <number>', 'Drift threshold', '0.90')
  .option('--block-critical', 'Block deployment on critical changes', true)
  .option('--output <format>', 'Output format: text|json|junit', 'text')
  .action(async (options) => {
    console.log(chalk.cyan('🔍 Running CI/CD Risk Analysis...\n'));

    try {
      // Load policy
      const policy: RiskPolicy = {
        driftThreshold: parseFloat(options.threshold),
        criticThreshold: 80,
        blockOnCritical: options.blockCritical,
        requireManualReview: false
      };

      // Find matching trace pairs
      const tracePairs = await findTracePairs(options.baseline, options.current);

      if (tracePairs.length === 0) {
        console.log(chalk.yellow('⚠️  No matching trace pairs found'));
        process.exit(0);
      }

      console.log(chalk.gray(`Found ${tracePairs.length} test cases to analyze\n`));

      // Initialize critic agent
      const critic = new CriticAgent();

      // Analyze each pair
      const results = [];
      let blockedCount = 0;

      for (let i = 0; i < tracePairs.length; i++) {
        const { baseline, current, name } = tracePairs[i];

        process.stdout.write(chalk.gray(`[${i + 1}/${tracePairs.length}] Analyzing ${name}... `));

        // Calculate semantic drift
        const drift = await calculateSemanticDrift(baseline, current, {
          threshold: policy.driftThreshold
        });

        // Run critic agent
        const criticAnalysis = await critic.analyzeChange(
          drift.baselineText,
          drift.currentText,
          {
            prompt: baseline.request.messages?.[0]?.content,
            model: current.metadata.model
          }
        );

        // Calculate risk score
        const riskScore = calculateCICDRiskScore(drift, criticAnalysis, policy);

        results.push({
          name,
          drift,
          critic: criticAnalysis,
          riskScore
        });

        // Print result
        if (riskScore.shouldBlock) {
          console.log(chalk.red('BLOCKED'));
          blockedCount++;
        } else if (riskScore.level === 'warning') {
          console.log(chalk.yellow('WARNING'));
        } else {
          console.log(chalk.green('PASS'));
        }
      }

      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log(chalk.bold('Summary'));
      console.log('='.repeat(60));

      const passed = results.length - blockedCount;
      console.log(`Total tests: ${results.length}`);
      console.log(chalk.green(`✓ Passed: ${passed}`));
      console.log(chalk.red(`✗ Blocked: ${blockedCount}`));

      // Print detailed reports for blocked tests
      if (blockedCount > 0) {
        console.log('\n' + chalk.red.bold('Blocked Tests Details:'));
        console.log('='.repeat(60));

        for (const result of results) {
          if (result.riskScore.shouldBlock) {
            const report = generateRiskReport(
              result.name,
              result.drift,
              result.critic,
              result.riskScore
            );
            console.log('\n' + report);
            console.log('='.repeat(60));
          }
        }
      }

      // Generate output based on format
      if (options.output === 'json') {
        console.log('\n' + JSON.stringify(results, null, 2));
      } else if (options.output === 'junit') {
        const junit = generateJUnitXML(results);
        console.log('\n' + junit);
      }

      // Exit with appropriate code
      if (blockedCount > 0) {
        console.log(chalk.red('\n❌ CI/CD Check FAILED - Deployment blocked'));
        process.exit(1);
      } else {
        console.log(chalk.green('\n✅ CI/CD Check PASSED - Deployment approved'));
        process.exit(0);
      }

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * Find matching baseline and current trace pairs
 */
async function findTracePairs(
  baselineDir: string,
  currentDir: string
): Promise<Array<{ baseline: Trace; current: Trace; name: string }>> {
  const baselinePath = resolve(process.cwd(), baselineDir);
  const currentPath = resolve(process.cwd(), currentDir);

  // Read all trace files from both directories
  let baselineFiles: string[];
  let currentFiles: string[];

  try {
    baselineFiles = await readdir(baselinePath);
  } catch (_error) {
    console.error(chalk.red(`Error reading baseline directory: ${baselinePath}`));
    return [];
  }

  try {
    currentFiles = await readdir(currentPath);
  } catch (_error) {
    console.error(chalk.red(`Error reading current directory: ${currentPath}`));
    return [];
  }

  const pairs: Array<{ baseline: Trace; current: Trace; name: string }> = [];

  // Match files by name
  for (const baselineFile of baselineFiles) {
    if (!baselineFile.endsWith('.json')) continue;

    // Look for matching current file
    const matchingCurrent = currentFiles.find(f => f === baselineFile);
    if (!matchingCurrent) continue;

    try {
      // Load both traces
      const baselineContent = await readFile(join(baselinePath, baselineFile), 'utf-8');
      const currentContent = await readFile(join(currentPath, matchingCurrent), 'utf-8');

      const baseline: Trace = JSON.parse(baselineContent);
      const current: Trace = JSON.parse(currentContent);

      pairs.push({
        baseline,
        current,
        name: baselineFile.replace('.json', '')
      });
    } catch (_error) {
      console.warn(chalk.yellow(`Warning: Failed to load trace pair ${baselineFile}`));
    }
  }

  return pairs;
}

/**
 * Generate JUnit XML report for CI integration
 */
function generateJUnitXML(results: any[]): string {
  const totalTests = results.length;
  const failures = results.filter(r => r.riskScore.shouldBlock).length;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="${totalTests}" failures="${failures}">
  <testsuite name="TraceForge Risk Analysis" tests="${totalTests}" failures="${failures}">
`;

  for (const result of results) {
    xml += `    <testcase name="${result.name}" classname="RiskAnalysis">`;

    if (result.riskScore.shouldBlock) {
      xml += `
      <failure message="Risk score ${result.riskScore.overall}/100 exceeds threshold">
        ${result.critic.reasoning}
        Drift: ${(result.drift.similarity * 100).toFixed(1)}%
        Category: ${result.critic.category}
      </failure>`;
    }

    xml += `
    </testcase>
`;
  }

  xml += `  </testsuite>
</testsuites>`;

  return xml;
}
