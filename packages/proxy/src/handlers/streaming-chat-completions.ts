import type { FastifyRequest, FastifyReply } from 'fastify';
import type { LLMRequest, StreamChunk, StreamingTrace } from '@traceforge/shared';
import { v4 as uuidv4 } from 'uuid';
import { loadConfig } from '../config.js';
import { TraceStorage } from '../storage.js';

interface StreamingChatCompletionsRequest extends FastifyRequest {
  body: LLMRequest;
}

export async function streamingChatCompletionsHandler(
  request: StreamingChatCompletionsRequest,
  reply: FastifyReply
) {
  const config = await loadConfig();
  const traceId = uuidv4();
  const requestStartTime = Date.now();
  
  const chunks: StreamChunk[] = [];
  let firstChunkTime: number | null = null;
  let lastChunkTime = requestStartTime;
  
  try {
    // Forward request to upstream
    const upstreamResponse = await fetch(`${config.upstream_url}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.authorization || '',
      },
      body: JSON.stringify(request.body),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      reply.code(upstreamResponse.status);
      return reply.send(errorText);
    }

    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const reader = upstreamResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim() || line.trim() === 'data: [DONE]') {
          if (line.trim() === 'data: [DONE]') {
            reply.raw.write('data: [DONE]\n\n');
          }
          continue;
        }
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          try {
            const chunk: StreamChunk = JSON.parse(data);
            const now = Date.now();
            
            if (firstChunkTime === null) {
              firstChunkTime = now;
            }
            
            // Add timing information
            chunk.delta_ms = now - lastChunkTime;
            lastChunkTime = now;
            
            chunks.push(chunk);
            
            // Forward chunk to client
            reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
          } catch (e) {
            // Invalid JSON, just forward as-is
            reply.raw.write(`${line}\n`);
          }
        }
      }
    }
    
    reply.raw.end();
    
    // Save streaming trace
    if (config.save_traces && chunks.length > 0) {
      const requestEndTime = Date.now();
      const firstChunkLatency = firstChunkTime ? firstChunkTime - requestStartTime : 0;
      const streamDuration = requestEndTime - (firstChunkTime || requestStartTime);
      
      // Reconstruct full response from chunks
      let fullContent = '';
      let finalModel = chunks[0]?.model || '';
      
      for (const chunk of chunks) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
        }
        if (chunk.model) {
          finalModel = chunk.model;
        }
      }
      
      const streamingTrace: StreamingTrace = {
        id: traceId,
        timestamp: new Date(requestStartTime).toISOString(),
        endpoint: '/v1/chat/completions',
        request: request.body,
        response: {
          id: chunks[0]?.id || '',
          object: 'chat.completion',
          created: chunks[0]?.created || Math.floor(requestStartTime / 1000),
          model: finalModel,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: fullContent,
            },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 0,  // Not available in streaming
            completion_tokens: 0,
            total_tokens: 0,
          },
        },
        metadata: {
          duration_ms: requestEndTime - requestStartTime,
          status: 'success',
          model: finalModel,
        },
        chunks,
        total_chunks: chunks.length,
        stream_duration_ms: streamDuration,
        first_chunk_latency_ms: firstChunkLatency,
      };
      
      await TraceStorage.saveTrace(streamingTrace);
      request.log.info(`Streaming trace saved: ${traceId} (${chunks.length} chunks)`);
    }
    
  } catch (error: any) {
    request.log.error(error, 'Streaming request failed');
    
    if (!reply.raw.headersSent) {
      reply.code(500);
      return reply.send({ error: error.message });
    }
  }
}
