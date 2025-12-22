import OpenAI from 'openai';

/**
 * Simple AI agent that provides travel recommendations
 * This demonstrates the typical pattern that needs regression testing
 */
class TravelAgent {
  constructor() {
    // Point to TraceForge proxy
    this.client = new OpenAI({
      baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:3000/v1',
      apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-vcr-replay',
    });
  }

  async getRecommendation(city, interests) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful travel advisor. Provide concise, practical recommendations.',
        },
        {
          role: 'user',
          content: `I'm visiting ${city} and I'm interested in ${interests}. Give me 3 recommendations.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0].message.content;
  }

  async analyzeReview(review) {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analyzer. Classify reviews as positive, negative, or neutral.',
        },
        {
          role: 'user',
          content: review,
        },
      ],
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 50,
    });

    return response.choices[0].message.content;
  }
}

export default TravelAgent;

// Demo usage if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const agent = new TravelAgent();
  
  console.log('🌍 Travel Agent Demo\n');
  
  console.log('Getting recommendation for Paris...');
  const recommendation = await agent.getRecommendation('Paris', 'art and food');
  console.log(recommendation);
  
  console.log('\n---\n');
  
  console.log('Analyzing review...');
  const sentiment = await agent.analyzeReview(
    'The hotel was clean but the staff was rude and unhelpful.'
  );
  console.log(sentiment);
}
