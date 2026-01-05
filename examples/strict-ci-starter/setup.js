#!/usr/bin/env node

/**
 * Setup script for TraceForge Strict CI Starter
 * 
 * This script helps new users validate their setup.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🔍 TraceForge Strict CI Starter - Setup Validation\n');

const checks = [];

// Check 1: Node.js version
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major >= 18) {
    console.log('✅ Node.js version:', version);
    checks.push(true);
  } else {
    console.log('❌ Node.js version:', version, '(requires >= 18)');
    checks.push(false);
  }
}

// Check 2: Dependencies installed
function checkDependencies() {
  const packageJson = require('./package.json');
  const deps = Object.keys(packageJson.dependencies || {});
  
  let allInstalled = true;
  deps.forEach(dep => {
    try {
      require.resolve(dep);
      console.log(`✅ Dependency installed: ${dep}`);
    } catch (e) {
      console.log(`❌ Dependency missing: ${dep}`);
      allInstalled = false;
    }
  });
  
  checks.push(allInstalled);
}

// Check 3: TraceForge CLI available
function checkTraceForgeInstalled() {
  return new Promise((resolve) => {
    const child = spawn('traceforge-proxy', ['--version'], { shell: true });
    
    let found = false;
    child.on('error', () => {
      console.log('❌ TraceForge proxy not installed globally');
      console.log('   Run: npm install -g @traceforge/proxy');
      checks.push(false);
      resolve();
    });
    
    child.stdout.on('data', (data) => {
      found = true;
      console.log('✅ TraceForge proxy installed:', data.toString().trim());
    });
    
    child.on('close', (code) => {
      if (found) {
        checks.push(true);
      } else {
        checks.push(false);
        console.log('❌ TraceForge proxy not found');
        console.log('   Run: npm install -g @traceforge/proxy');
      }
      resolve();
    });
  });
}

// Check 4: Cassettes directory exists
function checkCassettesDirectory() {
  const cassettesDir = path.join(__dirname, '.ai-tests', 'cassettes');
  if (fs.existsSync(cassettesDir)) {
    const files = fs.readdirSync(path.join(cassettesDir, 'openai'), { recursive: true });
    console.log(`✅ Cassettes directory exists (${files.length} snapshots)`);
    checks.push(true);
  } else {
    console.log('⚠️  Cassettes directory not found (will be created on first recording)');
    checks.push(true); // Not a failure
  }
}

// Check 5: Environment variables
function checkEnvironment() {
  const requiredVars = ['OPENAI_API_KEY'];
  let allSet = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✅ Environment variable set: ${varName}`);
    } else {
      console.log(`⚠️  Environment variable not set: ${varName}`);
      console.log(`   (Required for recording new snapshots)`);
      allSet = false;
    }
  });
  
  // Not a failure - only needed for recording
  checks.push(true);
}

// Run all checks
async function runChecks() {
  checkNodeVersion();
  checkDependencies();
  await checkTraceForgeInstalled();
  checkCassettesDirectory();
  checkEnvironment();
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  const passed = checks.filter(c => c).length;
  const total = checks.length;
  
  if (passed === total) {
    console.log('✅ All checks passed! You\'re ready to use TraceForge.\n');
    console.log('Next steps:');
    console.log('  1. Start proxy: traceforge-proxy');
    console.log('  2. Run tests:   npm test');
    console.log('  3. View README: cat README.md\n');
  } else {
    console.log(`⚠️  ${total - passed} check(s) failed. Review errors above.\n`);
    process.exit(1);
  }
}

runChecks().catch(err => {
  console.error('❌ Setup validation failed:', err);
  process.exit(1);
});
