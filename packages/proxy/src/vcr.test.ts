import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildRequestSignature, getCassettePath, findCassette, saveCassette, VCRLayer } from '../src/vcr';
import type { LLMRequest, LLMResponse, VCRConfig } from '@traceforge/shared';

describe('VCR', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `traceforge-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('buildRequestSignature', () => {
    const baseRequest: LLMRequest = {
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Hello' },
      ],
    };

    it('should create consistent signatures for identical requests', () => {
      const sig1 = buildRequestSignature('openai', baseRequest);
      const sig2 = buildRequestSignature('openai', baseRequest);
      expect(sig1).toBe(sig2);
    });

    it('should create different signatures for different providers', () => {
      const sig1 = buildRequestSignature('openai', baseRequest);
      const sig2 = buildRequestSignature('anthropic', baseRequest);
      expect(sig1).not.toBe(sig2);
    });

    it('should create different signatures for different messages', () => {
      const request2: LLMRequest = {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Goodbye' },
        ],
      };

      const sig1 = buildRequestSignature('openai', baseRequest);
      const sig2 = buildRequestSignature('openai', request2);
      expect(sig1).not.toBe(sig2);
    });

    it('should ignore temperature in fuzzy mode', () => {
      const request1: LLMRequest = { ...baseRequest, temperature: 0.5 };
      const request2: LLMRequest = { ...baseRequest, temperature: 0.9 };

      const sig1 = buildRequestSignature('openai', request1, 'fuzzy');
      const sig2 = buildRequestSignature('openai', request2, 'fuzzy');
      expect(sig1).toBe(sig2);
    });

    it('should include temperature in exact mode', () => {
      const request1: LLMRequest = { ...baseRequest, temperature: 0.5 };
      const request2: LLMRequest = { ...baseRequest, temperature: 0.9 };

      const sig1 = buildRequestSignature('openai', request1, 'exact');
      const sig2 = buildRequestSignature('openai', request2, 'exact');
      expect(sig1).not.toBe(sig2);
    });

    it('should handle prompt-based requests', () => {
      const promptRequest: LLMRequest = {
        model: 'gpt-3.5-turbo-instruct',
        prompt: 'Once upon a time',
      };

      const sig = buildRequestSignature('openai', promptRequest);
      expect(sig).toBeTruthy();
      expect(sig.length).toBe(64); // SHA256 hex
    });

    it('should include tools in signature', () => {
      const requestWithTools: any = {
        ...baseRequest,
        tools: [{ type: 'function', function: { name: 'get_weather' } }],
      };

      const sig1 = buildRequestSignature('openai', requestWithTools);
      const sig2 = buildRequestSignature('openai', baseRequest);
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('getCassettePath', () => {
    it('should generate correct path', () => {
      const path = getCassettePath('/cassettes', 'openai', 'abc123');
      expect(path).toContain('openai');
      expect(path).toContain('abc123.json');
    });

    it('should use provider subdirectory', () => {
      const path = getCassettePath('/cassettes', 'anthropic', 'def456');
      expect(path).toContain('anthropic');
    });
  });

  describe('saveCassette and findCassette', () => {
    const request: LLMRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    };

    const response: LLMResponse = {
      id: 'test-1',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        },
      ],
    };

    it('should save and load a cassette', async () => {
      const provider = 'openai';
      const signature = 'test-signature';

      await saveCassette(
        testDir,
        provider,
        signature,
        request,
        200,
        { 'content-type': 'application/json' },
        response
      );

      const loaded = await findCassette(testDir, provider, signature);
      expect(loaded).not.toBeNull();
      expect(loaded?.provider).toBe(provider);
      expect(loaded?.request).toEqual(request);
      expect(loaded?.response.status).toBe(200);
      expect(loaded?.response.body).toEqual(response);
    });

    it('should return null for missing cassette', async () => {
      const loaded = await findCassette(testDir, 'openai', 'nonexistent');
      expect(loaded).toBeNull();
    });

    it('should create provider subdirectory', async () => {
      await saveCassette(
        testDir,
        'anthropic',
        'sig1',
        request,
        200,
        {},
        response
      );

      const loaded = await findCassette(testDir, 'anthropic', 'sig1');
      expect(loaded).not.toBeNull();
    });

    it('should include recorded timestamp', async () => {
      await saveCassette(testDir, 'openai', 'sig2', request, 200, {}, response);
      const loaded = await findCassette(testDir, 'openai', 'sig2');
      expect(loaded?.recorded_at).toBeTruthy();
    });
  });

  describe('VCRLayer', () => {
    const request: LLMRequest = {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Test' }],
    };

    const response: LLMResponse = {
      id: 'test-1',
      object: 'chat.completion',
      created: 1234567890,
      model: 'gpt-4',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        },
      ],
    };

    describe('off mode', () => {
      it('should never replay', async () => {
        const config: VCRConfig = {
          mode: 'off',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        const vcr = new VCRLayer(config);
        const cassette = await vcr.shouldReplay('openai', request);
        expect(cassette).toBeNull();
      });

      it('should not record', async () => {
        const config: VCRConfig = {
          mode: 'off',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        const vcr = new VCRLayer(config);
        await vcr.record('openai', request, 200, {}, response);

        const signature = buildRequestSignature('openai', request);
        const loaded = await findCassette(testDir, 'openai', signature);
        expect(loaded).toBeNull();
      });
    });

    describe('record mode', () => {
      it('should not replay cassettes', async () => {
        const config: VCRConfig = {
          mode: 'record',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        // Pre-create a cassette
        const signature = buildRequestSignature('openai', request);
        await saveCassette(testDir, 'openai', signature, request, 200, {}, response);

        const vcr = new VCRLayer(config);
        const cassette = await vcr.shouldReplay('openai', request);
        expect(cassette).toBeNull();
      });

      it('should always record responses', async () => {
        const config: VCRConfig = {
          mode: 'record',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        const vcr = new VCRLayer(config);
        await vcr.record('openai', request, 200, {}, response);

        const signature = buildRequestSignature('openai', request);
        const loaded = await findCassette(testDir, 'openai', signature);
        expect(loaded).not.toBeNull();
      });
    });

    describe('replay mode', () => {
      it('should replay existing cassettes', async () => {
        const config: VCRConfig = {
          mode: 'replay',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        // Pre-create a cassette
        const signature = buildRequestSignature('openai', request);
        await saveCassette(testDir, 'openai', signature, request, 200, {}, response);

        const vcr = new VCRLayer(config);
        const cassette = await vcr.shouldReplay('openai', request);
        expect(cassette).not.toBeNull();
        expect(cassette?.response.body).toEqual(response);
      });

      it('should throw error for missing cassette', async () => {
        const config: VCRConfig = {
          mode: 'replay',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        const vcr = new VCRLayer(config);
        await expect(vcr.shouldReplay('openai', request)).rejects.toThrow('VCR replay miss');
      });

      it('should not record in replay mode', async () => {
        const config: VCRConfig = {
          mode: 'replay',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        const vcr = new VCRLayer(config);
        await vcr.record('openai', request, 200, {}, response);

        const signature = buildRequestSignature('openai', request);
        const loaded = await findCassette(testDir, 'openai', signature);
        expect(loaded).toBeNull();
      });
    });

    describe('auto mode', () => {
      it('should replay existing cassettes', async () => {
        const config: VCRConfig = {
          mode: 'auto',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        // Pre-create a cassette
        const signature = buildRequestSignature('openai', request);
        await saveCassette(testDir, 'openai', signature, request, 200, {}, response);

        const vcr = new VCRLayer(config);
        const cassette = await vcr.shouldReplay('openai', request);
        expect(cassette).not.toBeNull();
      });

      it('should return null for missing cassette (not throw)', async () => {
        const config: VCRConfig = {
          mode: 'auto',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        const vcr = new VCRLayer(config);
        const cassette = await vcr.shouldReplay('openai', request);
        expect(cassette).toBeNull();
      });

      it('should record new requests', async () => {
        const config: VCRConfig = {
          mode: 'auto',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        const vcr = new VCRLayer(config);
        await vcr.record('openai', request, 200, {}, response);

        const signature = buildRequestSignature('openai', request);
        const loaded = await findCassette(testDir, 'openai', signature);
        expect(loaded).not.toBeNull();
      });
    });

    describe('getStats', () => {
      it('should return cassette statistics', async () => {
        const config: VCRConfig = {
          mode: 'auto',
          match_mode: 'fuzzy',
          cassettes_dir: testDir,
        };

        const vcr = new VCRLayer(config);

        // Create some cassettes
        await vcr.record('openai', request, 200, {}, response);
        await vcr.record('anthropic', request, 200, {}, response);
        await vcr.record('openai', { ...request, model: 'gpt-3.5' }, 200, {}, response);

        const stats = await vcr.getStats();
        expect(stats).toHaveLength(2);
        expect(stats.find(s => s.provider === 'openai')?.count).toBe(2);
        expect(stats.find(s => s.provider === 'anthropic')?.count).toBe(1);
      });

      it('should handle missing cassettes directory', async () => {
        const config: VCRConfig = {
          mode: 'auto',
          match_mode: 'fuzzy',
          cassettes_dir: join(testDir, 'nonexistent'),
        };

        const vcr = new VCRLayer(config);
        const stats = await vcr.getStats();
        expect(stats).toEqual([]);
      });
    });
  });
});
