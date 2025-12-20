import { writeFile } from 'fs/promises';
import type { TestResult, AssertionResult } from '@traceforge/shared';

export interface JUnitTestCase {
  name: string;
  classname: string;
  time: number;
  failure?: {
    message: string;
    type: string;
    text: string;
  };
  error?: {
    message: string;
    type: string;
    text: string;
  };
}

export interface JUnitTestSuite {
  name: string;
  tests: number;
  failures: number;
  errors: number;
  time: number;
  timestamp: string;
  testcases: JUnitTestCase[];
}

export function generateJUnitXML(results: TestResult[], suiteName: string = 'TraceForge Tests'): string {
  const suite: JUnitTestSuite = {
    name: suiteName,
    tests: results.length,
    failures: results.filter(r => !r.passed && !r.error).length,
    errors: results.filter(r => r.error).length,
    time: results.reduce((sum, r) => sum + r.duration_ms, 0) / 1000,
    timestamp: new Date().toISOString(),
    testcases: [],
  };

  for (const result of results) {
    const testcase: JUnitTestCase = {
      name: result.test_id,
      classname: suiteName,
      time: result.duration_ms / 1000,
    };

    if (result.error) {
      testcase.error = {
        message: result.error,
        type: 'Error',
        text: result.error,
      };
    } else if (!result.passed) {
      const failedAssertions = result.assertions.filter((a: AssertionResult) => !a.passed);
      const message = failedAssertions
        .map((a: AssertionResult) => `${a.assertion.type}: ${a.message || a.error || 'Failed'}`)
        .join('\n');
      
      testcase.failure = {
        message: 'Assertion failures',
        type: 'AssertionError',
        text: message,
      };
    }

    suite.testcases.push(testcase);
  }

  return buildXML(suite);
}

function buildXML(suite: JUnitTestSuite): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<testsuites>',
    `  <testsuite name="${escapeXML(suite.name)}" tests="${suite.tests}" failures="${suite.failures}" errors="${suite.errors}" time="${suite.time.toFixed(3)}" timestamp="${suite.timestamp}">`,
  ];

  for (const testcase of suite.testcases) {
    lines.push(`    <testcase name="${escapeXML(testcase.name)}" classname="${escapeXML(testcase.classname)}" time="${testcase.time.toFixed(3)}">`);
    
    if (testcase.failure) {
      lines.push(`      <failure message="${escapeXML(testcase.failure.message)}" type="${escapeXML(testcase.failure.type)}">`);
      lines.push(`${escapeXML(testcase.failure.text)}`);
      lines.push('      </failure>');
    }
    
    if (testcase.error) {
      lines.push(`      <error message="${escapeXML(testcase.error.message)}" type="${escapeXML(testcase.error.type)}">`);
      lines.push(`${escapeXML(testcase.error.text)}`);
      lines.push('      </error>');
    }
    
    lines.push('    </testcase>');
  }

  lines.push('  </testsuite>');
  lines.push('</testsuites>');

  return lines.join('\n');
}

function escapeXML(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function writeJUnitReport(results: TestResult[], outputPath: string, suiteName?: string): Promise<void> {
  const xml = generateJUnitXML(results, suiteName);
  await writeFile(outputPath, xml, 'utf-8');
}
