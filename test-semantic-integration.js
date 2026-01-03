#!/usr/bin/env node

/**
 * Integration Test for Semantic Assertions
 * Tests semantic assertions with real OpenAI API
 * 
 * Requirements:
 * - OPENAI_API_KEY environment variable set
 * - Proxy and Web servers running (or start them here)
 * 
 * Usage:
 *   node test-semantic-integration.js
 */

import { spawn } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkEnvironment() {
  log('🔍 Checking environment...', 'cyan');
  
  if (!process.env.OPENAI_API_KEY) {
    log('❌ OPENAI_API_KEY not set', 'red');
    log('   Set it with: export OPENAI_API_KEY=sk-...', 'gray');
    return false;
  }
  
  log('✅ OPENAI_API_KEY found', 'green');
  return true;
}

async function setupTestDirectory() {
  log('📁 Setting up test directory...', 'cyan');
  
  const testDir = join(__dirname, '.ai-tests-integration');
  const testsDir = join(testDir, 'tests');
  
  // Clean up old test directory
  try {
    await rm(testDir, { recursive: true, force: true });
  } catch (err) {
    // Ignore if doesn't exist
  }
  
  // Create fresh directories
  await mkdir(testsDir, { recursive: true });
  
  log('✅ Test directory created', 'green');
  return { testDir, testsDir };
}

async function createTestFiles(testsDir) {
  log('📝 Creating test files...', 'cyan');
  
  // Test 1: Basic semantic similarity
  const test1 = {
    id: 'semantic-similarity-1',
    name: 'Basic semantic similarity test',
    description: 'Test that semantic assertion matches similar meaning',
    request: {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'What is the capital of France?'
        }
      ],
      temperature: 0.7,
      max_tokens: 50,
    },
    assertions: [
      {
        type: 'semantic',
        expected: 'Paris is the capital of France',
        threshold: 0.75,
        description: 'Response should convey that Paris is the capital'
      },
      {
        type: 'contains',
        value: 'Paris',
        description: 'Response must mention Paris'
      }
    ]
  };
  
  // Test 2: Semantic contradiction detection
  const test2 = {
    id: 'semantic-contradiction-1',
    name: 'Semantic contradiction test',
    description: 'Test that semantic-contradiction detects forbidden meanings',
    request: {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Tell me about the Eiffel Tower location.'
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
    },
    assertions: [
      {
        type: 'semantic-contradiction',
        forbidden: [
          'The Eiffel Tower is in London',
          'The Eiffel Tower is in Berlin',
          'Paris is not in France'
        ],
        threshold: 0.70,
        description: 'Should not contradict basic geographic facts'
      },
      {
        type: 'contains',
        value: 'Paris',
        description: 'Should mention Paris'
      }
    ]
  };
  
  // Test 3: Semantic with custom field
  const test3 = {
    id: 'semantic-field-selector-1',
    name: 'Semantic assertion with field selector',
    description: 'Test semantic assertion on specific response field',
    request: {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful math tutor. Be concise.'
        },
        {
          role: 'user',
          content: 'What is 7 * 8?'
        }
      ],
      temperature: 0.3,
      max_tokens: 30,
    },
    assertions: [
      {
        type: 'semantic',
        field: 'choices.0.message.content',
        expected: 'The answer is 56',
        threshold: 0.70,
        description: 'Response should convey the answer is 56'
      },
      {
        type: 'token_count',
        max: 50,
        description: 'Response should be concise'
      }
    ]
  };
  
  // Test 4: Multiple semantic assertions
  const test4 = {
    id: 'semantic-multiple-1',
    name: 'Multiple semantic assertions',
    description: 'Test multiple semantic checks in one test',
    request: {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Explain photosynthesis in one sentence.'
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
    },
    assertions: [
      {
        type: 'semantic',
        expected: 'Plants convert sunlight into energy',
        threshold: 0.65,
        description: 'Should convey the basic concept'
      },
      {
        type: 'semantic-contradiction',
        forbidden: [
          'Animals perform photosynthesis',
          'Photosynthesis happens in darkness',
          'Photosynthesis does not need sunlight'
        ],
        threshold: 0.70,
        description: 'Should not have scientific errors'
      },
      {
        type: 'token_count',
        max: 150,
        description: 'Should be concise (one sentence)'
      }
    ]
  };
  
  // Test 5: Low threshold test (should pass with loose matching)
  const test5 = {
    id: 'semantic-low-threshold-1',
    name: 'Low threshold semantic test',
    description: 'Test with low threshold for broad topic matching',
    request: {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Tell me something positive about technology.'
        }
      ],
      temperature: 0.9,
      max_tokens: 80,
    },
    assertions: [
      {
        type: 'semantic',
        expected: 'Technology has benefits and improves lives',
        threshold: 0.55,
        description: 'Should have generally positive sentiment about tech'
      }
    ]
  };
  
  // Write test files
  const tests = [
    ['test1-basic-semantic.yaml', test1],
    ['test2-contradiction.yaml', test2],
    ['test3-field-selector.yaml', test3],
    ['test4-multiple.yaml', test4],
    ['test5-low-threshold.yaml', test5],
  ];
  
  for (const [filename, testData] of tests) {
    const yaml = convertToYAML(testData);
    await writeFile(join(testsDir, filename), yaml);
  }
  
  log(`✅ Created ${tests.length} test files`, 'green');
  return tests.map(t => t[0]);
}

function convertToYAML(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    
    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          yaml += `${spaces}  -\n`;
          yaml += convertToYAML(item, indent + 2).split('\n').map(line => 
            line ? `  ${line}` : line
          ).join('\n');
        } else {
          yaml += `${spaces}  - ${JSON.stringify(item)}\n`;
        }
      }
    } else if (typeof value === 'object') {
      yaml += `${spaces}${key}:\n`;
      yaml += convertToYAML(value, indent + 1);
    } else if (typeof value === 'string') {
      // Escape strings that need quotes
      const needsQuotes = value.includes(':') || value.includes('#') || value.includes('\n');
      yaml += `${spaces}${key}: ${needsQuotes ? JSON.stringify(value) : value}\n`;
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }
  
  return yaml;
}

async function runTest(testFile, testDir) {
  log(`\n🧪 Running test: ${testFile}`, 'blue');
  
  return new Promise((resolve) => {
    const cliPath = join(__dirname, 'packages', 'cli', 'src', 'index.ts');
    const testPath = join(testDir, 'tests', testFile);
    
    const proc = spawn('npx', ['tsx', cliPath, 'test', 'run', testPath], {
      cwd: __dirname,
      env: {
        ...process.env,
        OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      const success = code === 0;
      
      if (success) {
        log(`  ✅ PASSED`, 'green');
      } else {
        log(`  ❌ FAILED (exit code: ${code})`, 'red');
      }
      
      // Show output if verbose or failed
      if (!success || process.env.VERBOSE) {
        if (stdout) {
          log('\n  Output:', 'gray');
          stdout.split('\n').forEach(line => log(`    ${line}`, 'gray'));
        }
        if (stderr) {
          log('\n  Errors:', 'gray');
          stderr.split('\n').forEach(line => log(`    ${line}`, 'gray'));
        }
      }
      
      resolve({ testFile, success, code, stdout, stderr });
    });
  });
}

async function testEmbeddingCache(testDir) {
  log('\n🗄️  Testing embedding cache...', 'cyan');
  
  const cacheDir = join(testDir, 'embeddings');
  
  // Check if cache files were created
  try {
    const fs = await import('fs');
    const files = await fs.promises.readdir(cacheDir);
    
    if (files.length > 0) {
      log(`✅ Cache working: ${files.length} embedding(s) cached`, 'green');
      
      // Show cache file info
      for (const file of files.slice(0, 3)) { // Show first 3
        const stats = await fs.promises.stat(join(cacheDir, file));
        log(`   ${file} (${stats.size} bytes)`, 'gray');
      }
      
      if (files.length > 3) {
        log(`   ... and ${files.length - 3} more`, 'gray');
      }
      
      return true;
    } else {
      log('⚠️  No cache files created', 'yellow');
      return false;
    }
  } catch (err) {
    log(`⚠️  Cache directory not found: ${err.message}`, 'yellow');
    return false;
  }
}

async function generateReport(results) {
  log('\n📊 Test Results Summary', 'cyan');
  log('═'.repeat(50), 'gray');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  log(`Total: ${total} tests`, 'blue');
  log(`Passed: ${passed} tests`, passed > 0 ? 'green' : 'gray');
  log(`Failed: ${failed} tests`, failed > 0 ? 'red' : 'gray');
  log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`, 'cyan');
  
  if (failed > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.filter(r => !r.success).forEach(r => {
      log(`   • ${r.testFile}`, 'red');
    });
  }
  
  log('═'.repeat(50), 'gray');
  
  return { passed, failed, total };
}

async function main() {
  log('🚀 TraceForge Semantic Assertions Integration Test', 'cyan');
  log('═'.repeat(50), 'gray');
  
  // Check environment
  const envOk = await checkEnvironment();
  if (!envOk) {
    process.exit(1);
  }
  
  // Setup test directory
  const { testDir, testsDir } = await setupTestDirectory();
  
  // Create test files
  const testFiles = await createTestFiles(testsDir);
  
  // Run all tests
  log('\n🧪 Running integration tests...', 'cyan');
  log('   This will make real API calls to OpenAI', 'gray');
  log('   Estimated cost: ~$0.01-0.02', 'gray');
  
  const results = [];
  for (const testFile of testFiles) {
    const result = await runTest(testFile, testDir);
    results.push(result);
    
    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Test embedding cache
  await testEmbeddingCache(testDir);
  
  // Generate report
  const { passed, failed, total } = await generateReport(results);
  
  // Exit with appropriate code
  if (failed > 0) {
    log('\n❌ Some tests failed', 'red');
    process.exit(1);
  } else {
    log('\n✅ All tests passed!', 'green');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    log(`\n💥 Error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  });
}
