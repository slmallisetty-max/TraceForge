# Known Limitations

This document tracks known limitations and design decisions for TraceForge.baseline.

## 🌊 Streaming Response VCR Support

**Status:** Not Implemented (By Design)

### The Issue

The streaming chat completions handler (`packages/proxy/src/handlers/streaming-chat-completions.ts`) does **not** integrate with VCR mode. When using `stream: true` in requests:

- ✅ Requests are proxied to the upstream provider
- ✅ Traces are saved after the stream completes
- ❌ VCR cassettes are NOT created for streaming requests
- ❌ Streaming requests CANNOT be replayed from cassettes

### Why Not Implemented

Per [VCR_IMPLEMENTATION.md](./VCR_IMPLEMENTATION.md#whats-not-implemented-by-design), streaming response re-chunking was intentionally excluded to keep the implementation simple and maintainable.

**Technical Challenges:**

1. **Chunk Timing Storage**
   - Need to store not just chunks but inter-chunk timing (delta_ms)
   - Storage format becomes significantly more complex

2. **Replay Complexity**
   - Must simulate streaming with accurate timing
   - Need to handle backpressure correctly
   - Must properly emit `[DONE]` marker

3. **Limited Testing Value**
   - Most regression tests work better with non-streaming requests
   - Streaming tests are inherently timing-dependent
   - Deterministic output is what matters, not streaming behavior

### Recommended Workaround

**For VCR-enabled tests, disable streaming:**

```javascript
// ❌ Won't work with VCR replay
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  stream: true,  // ← Cassettes not created
});

// ✅ Works with VCR replay
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  stream: false,  // ← Cassettes work normally
});
```

The final output is identical; only the delivery mechanism differs.

### When You MUST Test Streaming

If you need to test streaming behavior specifically:

1. **Use `record` or `passthrough` mode** (requires API key)
2. **Test streaming logic separately** from content regression testing
3. **Mock at a higher level** in your application code

```javascript
// Test streaming handler logic
it('should handle streaming chunks correctly', async () => {
  // Use passthrough mode
  process.env.TRACEFORGE_VCR_MODE = 'passthrough';
  
  const stream = await openai.chat.completions.create({
    stream: true,
    // ...
  });
  
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  
  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks[chunks.length - 1]).toBe('[DONE]');
});
```

### Future Implementation

If streaming VCR support becomes critical, the implementation would need:

1. **Enhanced Cassette Format**
   ```json
   {
     "request": {...},
     "response": {
       "streaming": true,
       "chunks": [
         { "data": "...", "delta_ms": 50 },
         { "data": "...", "delta_ms": 30 },
         { "data": "[DONE]", "delta_ms": 20 }
       ]
     }
   }
   ```

2. **Replay Stream Generator**
   ```typescript
   async function* replayStreamingResponse(cassette) {
     for (const chunk of cassette.response.chunks) {
       await sleep(chunk.delta_ms);
       yield chunk.data;
     }
   }
   ```

3. **VCR Integration in Streaming Handler**
   - Check for cassette before upstream fetch
   - Fall back to replay generator if found
   - Record chunks + timing in record mode

**Estimated Effort:** 2-3 days of development + testing

**Priority:** Low (workaround is simple and effective)

---

## 📝 Other Known Limitations

### 1. Provider-Specific Behavior

Some providers have subtle differences in response format that may not be fully captured:

- **Ollama**: Custom headers may differ from OpenAI
- **Gemini**: Response structure variations
- **Azure OpenAI**: Deployment-specific quirks

**Impact:** Low  
**Workaround:** Test with the specific provider in passthrough mode

### 2. Token Count Estimates

Token counting is estimated using `gpt-4` tokenizer for all providers:

```typescript
// May not match provider's actual count
const tokens = estimateTokens(text);
```

**Impact:** Low (only affects metrics)  
**Workaround:** Use provider's actual token count from response

### 3. Redaction Pattern Completeness

Built-in redaction patterns may not cover all sensitive data formats:

- Regional phone number formats
- Non-US SSN formats
- Custom PII patterns

**Impact:** Medium  
**Workaround:** Add custom patterns in config

```yaml
redaction:
  patterns:
    - name: "custom_id"
      pattern: "CID-\\d{8}"
      replacement: "[CUSTOM_ID]"
```

---

## 🔮 Future Enhancements

These are potential improvements not yet prioritized:

- [ ] Streaming VCR support (see above)
- [ ] Provider-specific token counters
- [ ] ML-based PII detection
- [ ] Cassette migration tools
- [ ] Binary data support (images, audio)
- [ ] Multi-step conversation replay
- [ ] Parallel request batching for VCR

---

*This document is maintained as limitations are discovered or addressed. Last updated: 2025-12-22*
