# V2 Phase 8: Multi-Provider Support

## Overview

Phase 8 adds support for multiple AI providers beyond OpenAI, enabling TraceForge to work with Anthropic Claude, Google Gemini, and Ollama local models. All responses are converted to OpenAI-compatible format, ensuring unified trace storage and testing.

## Supported Providers

### 1. OpenAI (default)
- **Models**: gpt-4, gpt-3.5-turbo, text-davinci-003, etc.
- **Endpoint**: https://api.openai.com/v1/chat/completions
- **Authentication**: Bearer token in Authorization header
- **API Key**: `OPENAI_API_KEY` environment variable

### 2. Anthropic Claude
- **Models**: claude-3-opus-20240229, claude-3-sonnet-20240229, claude-2.1, etc.
- **Endpoint**: https://api.anthropic.com/v1/messages
- **Authentication**: x-api-key header
- **API Key**: `ANTHROPIC_API_KEY` environment variable
- **Request Format**: Anthropic Messages API
- **Response Conversion**: Converts to OpenAI chat completion format

### 3. Google Gemini
- **Models**: gemini-pro, gemini-pro-vision, etc.
- **Endpoint**: https://generativelanguage.googleapis.com/v1beta/models/:model:generateContent
- **Authentication**: API key in query string
- **API Key**: `GEMINI_API_KEY` environment variable
- **Request Format**: Gemini generateContent API
- **Response Conversion**: Converts to OpenAI chat completion format

### 4. Ollama (local)
- **Models**: llama2, mistral, codellama, phi, vicuna, etc.
- **Endpoint**: http://localhost:11434/v1/chat/completions
- **Authentication**: None (local server)
- **API Key**: Not required
- **Request Format**: OpenAI-compatible (no conversion needed)

## Configuration

### Multi-Provider Config

Create or update your `.ai-tests/config.yaml` file to include multiple providers:

```yaml
# Basic test configuration
test_dir: .ai-tests
trace_dir: .ai-tests/traces
test_pattern: "**/*.test.yaml"

# Multi-provider configuration
providers:
  - type: openai
    name: OpenAI
    base_url: https://api.openai.com
    api_key_env_var: OPENAI_API_KEY
    enabled: true
    default: true

  - type: anthropic
    name: Anthropic Claude
    base_url: https://api.anthropic.com
    api_key_env_var: ANTHROPIC_API_KEY
    enabled: true

  - type: gemini
    name: Google Gemini
    base_url: https://generativelanguage.googleapis.com
    api_key_env_var: GEMINI_API_KEY
    enabled: true

  - type: ollama
    name: Ollama
    base_url: http://localhost:11434
    enabled: true
```

### Environment Variables

Set up API keys in your `.env` file or environment:

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-...

# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini API Key
GEMINI_API_KEY=AIza...

# Ollama runs locally - no API key needed
```

## Provider Detection

TraceForge automatically detects which provider to use based on the model name:

### Model Name Prefixes

- **Anthropic**: `claude-`, `claude`
  - Example: `claude-3-opus-20240229`
  
- **Gemini**: `gemini-`, `gemini`
  - Example: `gemini-pro`
  
- **Ollama**: `llama`, `mistral`, `codellama`, `phi`, `vicuna`
  - Example: `llama2`, `mistral-7b`
  
- **OpenAI**: `gpt-`, `text-`, `davinci`, `curie`, `babbage`, `ada`
  - Example: `gpt-4`, `gpt-3.5-turbo`

### Fallback Logic

1. Check model name prefix against known patterns
2. If no match, check configured providers in order
3. Use the provider marked as `default: true`
4. Fall back to OpenAI if no default is set

## Using Different Providers

### In Tests

Specify the model name in your test file, and TraceForge will automatically route to the correct provider:

```yaml
# Test with Claude
name: Test Claude
request:
  model: claude-3-opus-20240229
  messages:
    - role: user
      content: "Hello!"

# Test with Gemini
name: Test Gemini
request:
  model: gemini-pro
  messages:
    - role: user
      content: "Hello!"

# Test with Ollama
name: Test Ollama
request:
  model: llama2
  messages:
    - role: user
      content: "Hello!"
```

### In Code

When using the proxy, simply change the model name:

```python
import openai

# Point to TraceForge proxy
openai.api_base = "http://localhost:8787/v1"

# Use Claude
response = openai.ChatCompletion.create(
    model="claude-3-opus-20240229",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Use Gemini
response = openai.ChatCompletion.create(
    model="gemini-pro",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Use Ollama
response = openai.ChatCompletion.create(
    model="llama2",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## Response Format Conversion

All provider responses are converted to OpenAI-compatible format before being saved as traces:

### Anthropic → OpenAI

```typescript
// Anthropic response
{
  id: "msg_...",
  type: "message",
  role: "assistant",
  content: [{ type: "text", text: "Hello!" }],
  model: "claude-3-opus-20240229",
  stop_reason: "end_turn",
  usage: {
    input_tokens: 10,
    output_tokens: 20
  }
}

// Converted to OpenAI format
{
  id: "msg_...",
  object: "chat.completion",
  created: 1234567890,
  model: "claude-3-opus-20240229",
  choices: [{
    index: 0,
    message: {
      role: "assistant",
      content: "Hello!"
    },
    finish_reason: "end_turn"
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30
  }
}
```

### Gemini → OpenAI

```typescript
// Gemini response
{
  candidates: [{
    content: {
      parts: [{ text: "Hello!" }],
      role: "model"
    },
    finishReason: "STOP"
  }],
  usageMetadata: {
    promptTokenCount: 10,
    candidatesTokenCount: 20,
    totalTokenCount: 30
  }
}

// Converted to OpenAI format
{
  id: "gemini-1234567890",
  object: "chat.completion",
  created: 1234567890,
  model: "gemini-pro",
  choices: [{
    index: 0,
    message: {
      role: "assistant",
      content: "Hello!"
    },
    finish_reason: "stop"
  }],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30
  }
}
```

### Ollama (no conversion)

Ollama already uses OpenAI-compatible format, so no conversion is needed.

## Implementation Details

### Handler Files

- `packages/proxy/src/handlers/anthropic.ts` - Anthropic Claude handler
- `packages/proxy/src/handlers/gemini.ts` - Google Gemini handler
- `packages/proxy/src/handlers/ollama.ts` - Ollama handler
- `packages/proxy/src/provider-detector.ts` - Provider detection logic

### Routing

The proxy's `/v1/chat/completions` endpoint now includes provider detection and routing:

```typescript
fastify.post('/v1/chat/completions', async (request, reply) => {
  const body = request.body as any;
  const provider = detectProvider(body.model, appConfig);
  
  switch (provider.type) {
    case 'anthropic':
      return anthropicHandler(request, reply, provider, appConfig);
    case 'gemini':
      return geminiHandler(request, reply, provider, appConfig);
    case 'ollama':
      return ollamaHandler(request, reply, provider, appConfig);
    case 'openai':
    default:
      return chatCompletionsHandler(request, reply);
  }
});
```

### Trace Storage

All traces are stored in the same unified format, regardless of provider:

```typescript
interface Trace {
  id: string;
  timestamp: string;
  endpoint: string;
  request: any;
  response: LLMResponse; // Always OpenAI format
  metadata: {
    duration_ms: number;
    tokens_used: number;
    model: string;
    status: 'success' | 'error';
    error?: string;
  };
}
```

## Testing Multi-Provider

### Running Tests

```bash
# Test all providers
npm run test

# Test specific provider by model name
npm run test -- --grep "claude"
npm run test -- --grep "gemini"
npm run test -- --grep "llama"
```

### Example Test File

```yaml
tests:
  - name: Compare providers
    variants:
      - model: gpt-4
      - model: claude-3-opus-20240229
      - model: gemini-pro
      - model: llama2
    request:
      messages:
        - role: user
          content: "What is 2+2?"
    assertions:
      - type: content_contains
        field: response.choices[0].message.content
        value: "4"
```

## Migration Guide

### From Single Provider to Multi-Provider

1. **Update config.yaml**: Add `providers` array with your providers
2. **Set API keys**: Add environment variables for each provider
3. **Update tests**: Change model names to use different providers
4. **Run tests**: Verify all providers work correctly

### Existing Traces

Existing traces remain compatible - they're already in OpenAI format.

## Troubleshooting

### Provider Not Detected

- Check model name matches expected prefixes
- Verify provider is enabled in config
- Check provider has `default: true` if needed

### API Key Errors

- Verify environment variable is set: `echo $ANTHROPIC_API_KEY`
- Check variable name matches config: `api_key_env_var`
- Ensure API key has correct permissions

### Ollama Connection Errors

- Start Ollama server: `ollama serve`
- Verify it's running: `curl http://localhost:11434/api/tags`
- Check firewall isn't blocking port 11434

### Conversion Errors

- Check provider response format matches expected structure
- Review handler code for your provider
- Enable debug logging to see raw responses

## Benefits

1. **Unified Testing**: Test across multiple AI providers with the same test suite
2. **Provider Comparison**: Easily compare responses from different models
3. **Flexibility**: Switch providers without changing test code
4. **Local Development**: Use Ollama for free local testing
5. **Cost Optimization**: Route to cheaper providers when appropriate

## Next Steps

- Add more providers (Azure OpenAI, Cohere, etc.)
- Implement provider-specific features (vision, function calling)
- Add provider performance metrics
- Create provider recommendation system
