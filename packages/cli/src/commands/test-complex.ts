import { Command } from 'commander';
import { readdir, readFile, writeFile, watch } from 'fs/promises';
import { resolve } from 'path';
import { parse, stringify } from 'yaml';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import Table from 'cli-table3';
import { v4 as uuidv4 } from 'uuid';
import type { Trace, Test, TestResult } from '@traceforge/shared';
import { evaluateAssertions } from '../utils/assertions.js';
import { writeJUnitReport } from '../utils/junit-reporter.js';
import { ProgressReporter } from '../utils/progress-reporter.js';
import {
  evaluatePolicy,
  getPolicyTemplate,
  evaluateQualityGates,
  formatGateSummary,
  generateBadge,
  getExitCode,
} from '@traceforge/shared';

const execAsync = promisify(exec);

const TRACES_DIR = resolve(process.cwd(), '.ai-tests/traces');
const TESTS_DIR = resolve(process.cwd(), '.ai-tests/tests');

export const testCommand = new Command('test')
  .description('Manage and run tests');

// test list command
testCommand
  .command('list')
  .description('List all tests')
  .action(async () => {
    try {
      const files = await readdir(TESTS_DIR);
      const testFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      if (testFiles.length === 0) {
        console.log(chalk.yellow('No tests found'));
        return;
      }

      const table = new Table({
        head: ['Name', 'File', 'Assertions'],
        colWidths: [30, 40, 15],
      });

      for (const file of testFiles) {
        const content = await readFile(resolve(TESTS_DIR, file), 'utf-8');
        const test: Test = parse(content);
        table.push([test.name || 'Unnamed', file, test.assertions.length]);
      }

      console.log(table.toString());
      console.log(chalk.gray(`\nTotal: ${testFiles.length} tests`));
    } catch (error: any) {
      console.error(chalk.red('Error listing tests:'), error.message);
      process.exit(1);
    }
  });

// test run command
testCommand
  .command('run [file]')
  .description('Run one or all tests')
  .option('--json', 'Output results as JSON')
  .option('--junit <path>', 'Generate JUnit XML report')
  .option('--parallel', 'Run tests in parallel (default: true)', true)
  .option('--sequential', 'Run tests sequentially')
  .option('--concurrency <number>', 'Maximum parallel tests', '5')
  .option('--watch', 'Watch mode - rerun on file changes')
  .option('--tag <tags...>', 'Run tests with specific tags')
  .option('--no-progress', 'Disable progress bar')
  .option('--with-policy', 'Enable policy evaluation for tests')
  .option('--ci', 'Enable CI mode with quality gates')
  .option('--min-pass-rate <number>', 'Minimum pass rate % for CI (default: 90)', '90')
  .option('--max-risk-severity <number>', 'Maximum risk severity for CI (default: 8)', '8')
  .option('--badge <path>', 'Generate status badge (default: .ai-tests/badge.svg)')
  .option('--summary <path>', 'Generate test summary (default: .ai-tests/summary.md)')
  .action(async (file?: string, options?: any) => {
    const runTests = async () => {
      try {
        let testFiles: string[];
        
        if (file) {
          testFiles = [file];
        } else {
          const files = await readdir(TESTS_DIR);
          testFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
        }

        if (testFiles.length === 0) {
          console.log(chalk.yellow('No tests to run'));
          return;
        }

        // Load all tests
        const tests: Array<{ file: string; test: Test }> = [];
        for (const testFile of testFiles) {
          const content = await readFile(resolve(TESTS_DIR, testFile), 'utf-8');
          const test: Test = parse(content);
          
          // Filter by tags if specified
          if (options.tag && options.tag.length > 0) {
            const testTags = test.tags || [];
            const hasMatchingTag = options.tag.some((tag: string) => testTags.includes(tag));
            if (!hasMatchingTag) continue;
          }
          
          tests.push({ file: testFile, test });
        }

        if (tests.length === 0) {
          console.log(chalk.yellow('No tests match the specified criteria'));
          return;
        }

        console.log(chalk.bold(`\n🧪 Running ${tests.length} test${tests.length === 1 ? '' : 's'}...\n`));

        let results: TestResult[];
        const useParallel = options.sequential ? false : options.parallel;

        if (useParallel) {
          const concurrency = parseInt(options.concurrency, 10);
          results = await runTestsParallel(tests, concurrency, options.progress !== false, options.withPolicy);
        } else {
          results = await runTestsSequential(tests, options.progress !== false, options.withPolicy);
        }

        // Summary
        const passed = results.filter(r => r.passed).length;
        const failed = results.length - passed;

        // CI Mode: Evaluate quality gates
        let gateResult;
        if (options.ci) {
          gateResult = evaluateQualityGates(results, {
            enabled: true,
            fail_on_test_failure: true,
            fail_on_policy_violations: options.withPolicy !== false,
            fail_on_risk_threshold: true,
            max_risk_severity: parseInt(options.maxRiskSeverity || '8', 10),
            min_pass_rate: parseInt(options.minPassRate || '90', 10),
            require_baselines: false,
          });

          // Print quality gate result
          console.log(chalk.bold('\n=== Quality Gates ==='));
          if (gateResult.passed) {
            console.log(chalk.green.bold('✅ ALL GATES PASSED'));
          } else {
            console.log(chalk.red.bold('❌ GATES FAILED'));
            console.log(chalk.red(`\n${gateResult.gate_failures.length} gate${gateResult.gate_failures.length === 1 ? '' : 's'} failed:`));
            for (const failure of gateResult.gate_failures) {
              const emoji = failure.severity === 'critical' ? '🔴' :
                           failure.severity === 'high' ? '🟠' :
                           failure.severity === 'medium' ? '🟡' : '⚪';
              console.log(`  ${emoji} ${failure.gate}: ${failure.reason}`);
            }
          }
        }

        console.log(chalk.bold('\n=== Summary ==='));
        console.log(`Total: ${results.length}`);
        console.log(chalk.green(`✓ Passed: ${passed}`));
        console.log(chalk.red(`✗ Failed: ${failed}`));
        
        if (gateResult) {
          console.log(chalk.cyan(`Pass Rate: ${gateResult.pass_rate.toFixed(1)}%`));
          if (gateResult.policy_violations_count > 0) {
            console.log(chalk.yellow(`Policy Violations: ${gateResult.policy_violations_count}`));
          }
        }

        // Detailed failures
        if (failed > 0) {
          console.log(chalk.bold('\n=== Failures ==='));
          for (const result of results) {
            if (!result.passed) {
              const testData = tests.find(t => t.test.id === result.test_id);
              const testName = testData?.test.name || result.test_id;
              console.log(chalk.red(`\n✗ ${testName}`));
              
              if (result.error) {
                console.log(chalk.red(`  Error: ${result.error}`));
              } else {
                // Show policy violations first
                if (result.policy_violations && result.policy_violations.length > 0) {
                  console.log(chalk.red(`  Policy Violations:`));
                  for (const violation of result.policy_violations) {
                    const severityColor = violation.severity === 'critical' ? chalk.red :
                                         violation.severity === 'high' ? chalk.yellow :
                                         chalk.gray;
                    console.log(severityColor(`    [${violation.severity.toUpperCase()}] ${violation.message}`));
                  }
                }
                
                // Show assertion failures
                for (const assertion of result.assertions) {
                  if (!assertion.passed) {
                    const message = assertion.message || assertion.error || 'Assertion failed';
                    console.log(chalk.red(`  - ${assertion.assertion.type}: ${message}`));
                  }
                }
              }
            }
          }
        }

        // JSON output
        if (options.json) {
          console.log('\n' + JSON.stringify(results, null, 2));
        }

        // JUnit report
        if (options.junit) {
          await writeJUnitReport(results, options.junit);
          console.log(chalk.gray(`\n✓ JUnit report written to: ${options.junit}`));
        }

        // CI Mode: Generate badge and summary
        if (options.ci && gateResult) {
          // Generate badge
          const badgePath = options.badge || resolve(process.cwd(), '.ai-tests/badge.svg');
          const badge = generateBadge(gateResult);
          await writeFile(badgePath, badge, 'utf-8');
          console.log(chalk.gray(`✓ Badge generated: ${badgePath}`));

          // Generate summary
          const summaryPath = options.summary || resolve(process.cwd(), '.ai-tests/summary.md');
          const summary = formatGateSummary(gateResult);
          await writeFile(summaryPath, summary, 'utf-8');
          console.log(chalk.gray(`✓ Summary generated: ${summaryPath}`));
        }

        if (!options.watch) {
          // CI Mode: Use quality gate exit code
          if (options.ci && gateResult) {
            process.exit(getExitCode(gateResult));
          } else {
            process.exit(failed > 0 ? 1 : 0);
          }
        }
      } catch (error: any) {
        console.error(chalk.red('Error running tests:'), error.message);
        if (!options.watch) {
          process.exit(1);
        }
      }
    };

    // Run tests once
    await runTests();

    // Watch mode
    if (options.watch) {
      console.log(chalk.gray('\n👀 Watching for changes... (Press Ctrl+C to exit)'));
      
      try {
        const watcher = watch(TESTS_DIR);
        for await (const event of watcher) {
          console.log(chalk.gray(`\n📝 Change detected: ${event.filename}`));
          await runTests();
          console.log(chalk.gray('\n👀 Watching for changes...'));
        }
      } catch (error: any) {
        if (error.code !== 'ABORT_ERR') {
          console.error(chalk.red('Watch error:'), error.message);
        }
      }
    }
  });

// test create-from-trace command
testCommand
  .command('create-from-trace <traceId>')
  .description('Create a test from a trace')
  .option('-n, --name <name>', 'Test name')
  .action(async (traceId: string, options: any) => {
    try {
      const files = await readdir(TRACES_DIR);
      const traceFile = files.find(f => f.includes(traceId));

      if (!traceFile) {
        console.log(chalk.red(`Trace not found: ${traceId}`));
        process.exit(1);
      }

      const content = await readFile(resolve(TRACES_DIR, traceFile), 'utf-8');
      const trace: Trace = JSON.parse(content);

      if (!trace.response) {
        console.log(chalk.red('Cannot create test from failed trace'));
        process.exit(1);
      }

      // Create test
      const test: Test = {
        id: uuidv4(),
        name: options.name || `Test from ${trace.id.substring(0, 8)}`,
        trace_id: trace.id,
        request: trace.request,
        assertions: [
          {
            type: 'contains',
            field: 'choices.0.message.content',
            value: '', // User needs to fill this
          },
        ],
        created_at: new Date().toISOString(),
      };

      const testYaml = stringify(test);
      const filename = `test-${test.id}.yaml`;
      await writeFile(resolve(TESTS_DIR, filename), testYaml, 'utf-8');

      console.log(chalk.green(`✓ Test created: ${filename}`));
      console.log(chalk.gray('\nEdit the test file to add assertions'));
    } catch (error: any) {
      console.error(chalk.red('Error creating test:'), error.message);
      process.exit(1);
    }
  });

// Run tests in parallel with concurrency limit
async function runTestsParallel(
  tests: Array<{ file: string; test: Test }>,
  concurrency: number,
  showProgress: boolean,
  withPolicy: boolean = false
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const progress = showProgress ? new ProgressReporter(tests.length) : null;

  // Process tests in batches
  for (let i = 0; i < tests.length; i += concurrency) {
    const batch = tests.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async ({ test }) => {
        progress?.start(test.name);
        const result = await runTest(test, withPolicy);
        progress?.complete(test.name, result.passed);
        return result;
      })
    );
    results.push(...batchResults);
  }

  progress?.finish();
  return results;
}

// Run tests sequentially
async function runTestsSequential(
  tests: Array<{ file: string; test: Test }>,
  showProgress: boolean,
  withPolicy: boolean = false
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const progress = showProgress ? new ProgressReporter(tests.length) : null;

  for (const { test } of tests) {
    progress?.start(test.name);
    const result = await runTest(test, withPolicy);
    progress?.complete(test.name, result.passed);
    results.push(result);
  }

  progress?.finish();
  return results;
}

// Run test fixtures
async function runFixtures(
  commands: string[],
  env?: Record<string, string>
): Promise<void> {
  for (const command of commands) {
    try {
      await execAsync(command, {
        env: { ...process.env, ...env },
      });
    } catch (error: any) {
      throw new Error(`Fixture command failed: ${command}\n${error.message}`);
    }
  }
}

// Run a single test
async function runTest(test: Test, withPolicy: boolean = false): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Run setup fixtures
    if (test.fixtures?.setup) {
      await runFixtures(test.fixtures.setup, test.fixtures.env);
    }

    // Set timeout
    const timeout = test.timeout || 30000; // Default 30s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Make API call (hardcoded to localhost proxy for MVP)
      const response = await fetch('http://localhost:8787/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const llmResponse = await response.json() as any;
      const duration = Date.now() - startTime;

      // Extract response content for policy evaluation
      const responseContent = llmResponse?.choices?.[0]?.message?.content || '';

      // Evaluate policies if enabled
      let policyViolations: any[] = [];
      let policyPassed = true;
      
      if (withPolicy && test.policy_contracts && test.policy_contracts.length > 0) {
        for (const policyId of test.policy_contracts) {
          try {
            const policy = getPolicyTemplate(policyId);
            if (policy) {
              const result = await evaluatePolicy(responseContent, policy);
              if (!result.passed) {
                policyPassed = false;
                policyViolations.push(...result.violations);
              }
            }
          } catch (error: any) {
            console.warn(chalk.yellow(`Warning: Could not load policy ${policyId}: ${error.message}`));
          }
        }
      }

      // Prepare metadata for assertions
      const metadata = {
        duration_ms: duration,
        status: response.ok ? 'success' as const : 'error' as const,
        model: test.request.model,
        tokens_used: llmResponse.usage?.total_tokens,
      };

      // Run assertions using new validator
      const assertionResults = await evaluateAssertions(
        test.assertions,
        llmResponse,
        metadata
      );
      
      const allPassed = assertionResults.every(r => r.passed) && policyPassed;

      // Run teardown fixtures
      if (test.fixtures?.teardown) {
        await runFixtures(test.fixtures.teardown, test.fixtures.env);
      }

      const result: TestResult = {
        test_id: test.id,
        passed: allPassed,
        assertions: assertionResults,
        response: llmResponse,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      };
      
      // Add policy violations if they exist
      if (policyViolations.length > 0) {
        result.policy_violations = policyViolations;
      }
      
      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Test timeout after ${timeout}ms`);
      }
      throw error;
    }
  } catch (error: any) {
    // Run teardown even on error
    if (test.fixtures?.teardown) {
      try {
        await runFixtures(test.fixtures.teardown, test.fixtures.env);
      } catch (teardownError) {
        console.warn(chalk.yellow('Warning: Teardown failed'), teardownError);
      }
    }

    return {
      test_id: test.id,
      passed: false,
      assertions: [],
      response: null,
      error: error.message,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}


