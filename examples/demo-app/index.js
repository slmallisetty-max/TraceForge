import 'dotenv/config';
import OpenAI from 'openai';

// Configure OpenAI client to use local proxy
const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:8787/v1',
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  console.log('🤖 TraceForge Demo App');
  console.log('📡 Using proxy:', openai.baseURL);
  
  // Test 1: Regular completion
  console.log('\n--- Test 1: Regular Chat Completion ---\n');
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Explain quantum computing in one sentence.' },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    console.log('Response:', completion.choices[0].message.content);
    console.log('✅ Regular request successful!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Test 2: Streaming completion
  console.log('\n--- Test 2: Streaming Chat Completion ---\n');
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Count from 1 to 5 slowly.' },
      ],
      temperature: 0.7,
      max_tokens: 50,
      stream: true,
    });

    let fullContent = '';
    process.stdout.write('Response: ');
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
      process.stdout.write(content);
    }
    
    console.log('\n✅ Streaming request successful!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  console.log('\n📊 Check .ai-tests/traces/ for captured traces');
}

main();
