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
          results = await runTestsParallel(tests, concurrency, options.progress !== false);
        } else {
          results = await runTestsSequential(tests, options.progress !== false);
        }

        // Summary
        const passed = results.filter(r => r.passed).length;
        const failed = results.length - passed;

        console.log(chalk.bold('\n=== Summary ==='));
        console.log(`Total: ${results.length}`);
        console.log(chalk.green(`✓ Passed: ${passed}`));
        console.log(chalk.red(`✗ Failed: ${failed}`));

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

        if (!options.watch) {
          process.exit(failed > 0 ? 1 : 0);
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
  showProgress: boolean
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const progress = showProgress ? new ProgressReporter(tests.length) : null;

  // Process tests in batches
  for (let i = 0; i < tests.length; i += concurrency) {
    const batch = tests.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async ({ test }) => {
        progress?.start(test.name);
        const result = await runTest(test);
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
  showProgress: boolean
): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const progress = showProgress ? new ProgressReporter(tests.length) : null;

  for (const { test } of tests) {
    progress?.start(test.name);
    const result = await runTest(test);
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
async function runTest(test: Test): Promise<TestResult> {
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

      // Prepare metadata for assertions
      const metadata = {
        duration_ms: duration,
        status: response.ok ? 'success' as const : 'error' as const,
        model: test.request.model,
        tokens_used: llmResponse.usage?.total_tokens,
      };

      // Run assertions using new validator
      const assertionResults = evaluateAssertions(
        test.assertions,
        llmResponse,
        metadata
      );
      
      const allPassed = assertionResults.every(r => r.passed);

      // Run teardown fixtures
      if (test.fixtures?.teardown) {
        await runFixtures(test.fixtures.teardown, test.fixtures.env);
      }

      return {
        test_id: test.id,
        passed: allPassed,
        assertions: assertionResults,
        response: llmResponse,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      };
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


