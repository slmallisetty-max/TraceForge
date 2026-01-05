#!/usr/bin/env node

/**
 * Simple validation that cassettes exist and are properly formatted
 * This runs without needing the proxy or API key
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Cassette Validation\n');

const cassettesDir = path.join(__dirname, '.ai-tests', 'cassettes', 'openai');

try {
  // Check if cassettes directory exists
  if (!fs.existsSync(cassettesDir)) {
    console.log('❌ Cassettes directory not found:', cassettesDir);
    console.log('   Expected: .ai-tests/cassettes/openai/\n');
    process.exit(1);
  }

  // List all cassette files
  const files = fs.readdirSync(cassettesDir).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('❌ No cassette files found');
    console.log('   Record snapshots with: TRACEFORGE_VCR_MODE=record npm test\n');
    process.exit(1);
  }

  console.log(`✅ Found ${files.length} cassette file(s):\n`);

  // Validate each cassette
  let allValid = true;
  files.forEach(file => {
    const filePath = path.join(cassettesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
      const cassette = JSON.parse(content);
      
      // Check required fields
      const requiredFields = ['signature', 'provider', 'request', 'response', 'metadata'];
      const missingFields = requiredFields.filter(field => !cassette[field]);
      
      if (missingFields.length > 0) {
        console.log(`❌ ${file}: Missing fields: ${missingFields.join(', ')}`);
        allValid = false;
      } else {
        console.log(`✅ ${file}`);
        console.log(`   Signature: ${cassette.signature}`);
        console.log(`   Provider: ${cassette.provider}`);
        console.log(`   Model: ${cassette.model || 'N/A'}`);
        console.log(`   Recorded: ${cassette.metadata.recorded_at || 'N/A'}`);
        console.log('');
      }
    } catch (err) {
      console.log(`❌ ${file}: Invalid JSON - ${err.message}`);
      allValid = false;
    }
  });

  if (allValid) {
    console.log('✅ All cassettes are valid!\n');
    console.log('Next steps:');
    console.log('  1. Start TraceForge proxy: traceforge-proxy');
    console.log('  2. Set environment: export OPENAI_BASE_URL=http://localhost:8787/v1');
    console.log('  3. Run tests: npm test\n');
    process.exit(0);
  } else {
    console.log('❌ Some cassettes are invalid. See errors above.\n');
    process.exit(1);
  }

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
