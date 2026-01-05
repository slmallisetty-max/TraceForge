// Test script for VCR Strict CI Mode validation
// Usage: node test-strict-mode.js

const http = require('http');

async function testOpenAI() {
  console.log(`\n🧪 Testing VCR Mode: ${process.env.TRACEFORGE_VCR_MODE || 'off'}`);
  console.log(`📍 Target: http://localhost:8787/v1/chat/completions`);
  console.log(`🔑 API Key: ${process.env.OPENAI_API_KEY ? '****' + process.env.OPENAI_API_KEY.slice(-4) : '(not set)'}\n`);

  const data = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Say exactly: Hello from TraceForge!' }],
    temperature: 0,  // Deterministic for replay
  });

  const options = {
    hostname: 'localhost',
    port: 8787,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'test-key'}`,
      'Content-Length': Buffer.byteLength(data),
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      
      console.log(`📡 Response Status: ${res.statusCode}`);
      
      res.on('data', chunk => body += chunk);
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          
          if (res.statusCode === 200) {
            console.log(`✅ Success!`);
            console.log(`📝 Response: ${response.choices[0].message.content}`);
            resolve(response);
          } else {
            console.log(`❌ API Error: ${response.error?.message || JSON.stringify(response)}`);
            reject(new Error(response.error?.message || 'API request failed'));
          }
        } catch (err) {
          console.log(`❌ Parse Error: ${err.message}`);
          console.log(`📄 Body: ${body.substring(0, 500)}`);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ Request Error: ${err.message}`);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

// Run test
console.log('\n' + '='.repeat(60));
console.log('🚀 TraceForge VCR Strict Mode Test');
console.log('='.repeat(60));

testOpenAI()
  .then(() => {
    console.log('\n✅ TEST PASSED');
    console.log('='.repeat(60) + '\n');
    process.exit(0);
  })
  .catch((err) => {
    console.log('\n❌ TEST FAILED');
    console.log(`💥 Error: ${err.message}`);
    console.log('='.repeat(60) + '\n');
    process.exit(1);
  });
