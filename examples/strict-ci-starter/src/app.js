// Simple AI application that summarizes text
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
});

export async function summarizeText(text) {
  const response = await client.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that summarizes text concisely.'
      },
      {
        role: 'user',
        content: `Summarize this text in one sentence: ${text}`
      }
    ],
    temperature: 0, // Deterministic for testing
  });

  return response.choices[0].message.content;
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const sampleText = `
    TraceForge is an execution record and replay layer for AI systems.
    It guarantees that no AI behavior change reaches production without
    a recorded execution and verified replay. This makes AI systems
    reproducible, verifiable, and auditable.
  `;

  console.log('Input:', sampleText.trim());
  console.log('\nGenerating summary...\n');

  summarizeText(sampleText)
    .then(summary => {
      console.log('Summary:', summary);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
