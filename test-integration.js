#!/usr/bin/env node

/**
 * Cross-platform integration test script
 * Works on Windows, Linux, and macOS
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import { resolve } from 'path';

const isWindows = process.platform === 'win32';
const PROXY_PORT = 8787;
const WEB_PORT = 3001;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function startProcess(command, args, name) {
  log(`Starting ${name}...`, 'cyan');
  
  const proc = spawn(command, args, {
    stdio: 'pipe',
    shell: isWindows,
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  proc.stdout?.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      log(`[${name}] ${output}`, 'reset');
    }
  });

  proc.stderr?.on('data', (data) => {
    const output = data.toString().trim();
    if (output && !output.includes('ExperimentalWarning')) {
      log(`[${name} ERROR] ${output}`, 'yellow');
    }
  });

  return proc;
}

async function waitForPort(port, maxAttempts = 30) {
  log(`Waiting for port ${port} to be ready...`, 'yellow');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        log(`✓ Port ${port} is ready!`, 'green');
        return true;
      }
    } catch {
      // Port not ready yet
    }
    await sleep(1000);
  }
  
  throw new Error(`Port ${port} did not become ready in time`);
}

async function runTests() {
  log('\n🚀 Starting TraceForge Integration Tests\n', 'cyan');
  
  const processes = [];
  
  try {
    // Start proxy server
    const proxyProc = startProcess(
      'pnpm',
      ['--filter', '@traceforge/proxy', 'start'],
      'Proxy'
    );
    processes.push(proxyProc);
    await waitForPort(PROXY_PORT);

    // Start web server
    const webProc = startProcess(
      'pnpm',
      ['--filter', '@traceforge/web', 'preview'],
      'Web'
    );
    processes.push(webProc);
    await waitForPort(WEB_PORT);

    log('\n✓ All services started successfully!\n', 'green');

    // Test 1: Proxy health check
    log('Test 1: Proxy health check...', 'cyan');
    const proxyHealth = await fetch(`http://localhost:${PROXY_PORT}/health`);
    const proxyData = await proxyHealth.json();
    if (proxyData.status === 'ok') {
      log('✓ Proxy health check passed', 'green');
    } else {
      throw new Error('Proxy health check failed');
    }

    // Test 2: Web API health check
    log('Test 2: Web API health check...', 'cyan');
    const webHealth = await fetch(`http://localhost:${WEB_PORT}/api/health`);
    const webData = await webHealth.json();
    if (webData.status === 'ok') {
      log('✓ Web API health check passed', 'green');
    } else {
      throw new Error('Web API health check failed');
    }

    // Test 3: Make a test request to proxy
    log('Test 3: Making test request to proxy...', 'cyan');
    const testRequest = {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello, this is a test' }],
      max_tokens: 10,
    };

    const response = await fetch(`http://localhost:${PROXY_PORT}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest),
    });

    if (response.status === 400 || response.status === 401) {
      log('✓ Proxy validation working (expected auth error)', 'green');
    } else if (response.ok) {
      log('✓ Proxy request succeeded', 'green');
    } else {
      log(`⚠ Proxy returned status ${response.status}`, 'yellow');
    }

    // Test 4: Fetch traces from web API
    log('Test 4: Fetching traces from web API...', 'cyan');
    const tracesResponse = await fetch(`http://localhost:${WEB_PORT}/api/traces`);
    const tracesData = await tracesResponse.json();
    if (Array.isArray(tracesData.traces)) {
      log(`✓ Traces endpoint working (${tracesData.total} traces)`, 'green');
    } else {
      throw new Error('Traces endpoint failed');
    }

    log('\n✅ All integration tests passed!\n', 'green');
    process.exit(0);
    
  } catch (error) {
    log(`\n❌ Integration tests failed: ${error.message}\n`, 'red');
    process.exit(1);
  } finally {
    // Cleanup: kill all processes
    log('\nCleaning up processes...', 'yellow');
    for (const proc of processes) {
      try {
        if (isWindows) {
          // On Windows, use taskkill to kill the entire process tree
          spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t']);
        } else {
          proc.kill('SIGTERM');
        }
      } catch {
        // Ignore errors during cleanup
      }
    }
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}\n`, 'red');
  process.exit(1);
});
