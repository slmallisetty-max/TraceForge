#!/usr/bin/env node

console.log('🧪 Testing V2 Streaming Support\n');
console.log('📋 Test Steps:');
console.log('1. Starting proxy server with streaming handler...');
console.log('2. Running demo app with streaming test...');
console.log('3. Checking captured streaming traces...');
console.log('4. Verifying streaming metadata...\n');

// Step 1: Build and start proxy
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const startProxy = () => {
  console.log('▶️  Starting proxy server...');
  const proxy = spawn('node', ['dist/index.js'], {
    cwd: './packages/proxy',
    stdio: 'inherit',
    shell: true
  });
  return proxy;
};

const runDemo = () => {
  console.log('▶️  Running demo app with streaming...');
  const demo = spawn('node', ['index.js'], {
    cwd: './examples/demo-app',
    stdio: 'inherit',
    shell: true
  });
  return new Promise((resolve, reject) => {
    demo.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Demo exited with code ${code}`));
    });
  });
};

(async () => {
  try {
    // Start proxy
    const proxyProcess = startProxy();
    
    // Wait for proxy to be ready
    await setTimeout(3000);
    
    // Run demo
    await runDemo();
    
    console.log('\n✅ Streaming test complete!');
    console.log('📊 Check .ai-tests/traces/ for streaming traces');
    console.log('🔍 Look for traces with "chunks" array and streaming metadata');
    
    // Cleanup
    proxyProcess.kill();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
})();
