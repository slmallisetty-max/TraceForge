import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import type { Trace } from '@traceforge/shared';
import { calculateRiskScore, formatRiskScore } from '@traceforge/shared';

const TRACES_DIR = resolve(process.cwd(), '.ai-tests/traces');

export const traceCommand = new Command('trace')
  .description('Manage traces');

// trace list command
traceCommand
  .command('list')
  .description('List all captured traces')
  .option('-n, --limit <number>', 'Limit number of results', '20')
  .action(async (options) => {
    try {
      const files = await readdir(TRACES_DIR);
      const traceFiles = files.filter(f => f.endsWith('.json'));

      if (traceFiles.length === 0) {
        console.log(chalk.yellow('No traces found'));
        return;
      }

      // Load traces
      const traces: Trace[] = [];
      const limit = parseInt(options.limit);
      
      for (const file of traceFiles.slice(0, limit)) {
        const content = await readFile(resolve(TRACES_DIR, file), 'utf-8');
        traces.push(JSON.parse(content));
      }

      // Sort by timestamp descending
      traces.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Create table
      const table = new Table({
        head: ['ID', 'Timestamp', 'Endpoint', 'Model', 'Status', 'Duration', 'Type'],
        colWidths: [10, 22, 25, 15, 10, 12, 10],
      });

      for (const trace of traces) {
        const id = trace.id.substring(0, 8);
        const timestamp = new Date(trace.timestamp).toLocaleString();
        const endpoint = trace.endpoint;
        const model = trace.metadata.model || 'N/A';
        const status = trace.metadata.status === 'success' 
          ? chalk.green(trace.metadata.status)
          : chalk.red(trace.metadata.status);
        const duration = `${trace.metadata.duration_ms}ms`;
        const isStreaming = 'chunks' in (trace as any) && Array.isArray((trace as any).chunks);
        const type = isStreaming ? chalk.magenta('Stream') : 'Normal';

        table.push([id, timestamp, endpoint, model, status, duration, type]);
      }

      console.log(table.toString());
      console.log(chalk.gray(`\nShowing ${traces.length} of ${traceFiles.length} traces`));
    } catch (error: any) {
      console.error(chalk.red('Error listing traces:'), error.message);
      process.exit(1);
    }
  });

// trace view command
traceCommand
  .command('view <id>')
  .description('View a specific trace')
  .action(async (id: string) => {
    try {
      const files = await readdir(TRACES_DIR);
      const traceFile = files.find(f => f.includes(id));

      if (!traceFile) {
        console.log(chalk.red(`Trace not found: ${id}`));
        process.exit(1);
      }

      const content = await readFile(resolve(TRACES_DIR, traceFile), 'utf-8');
      const trace: any = JSON.parse(content);
      const isStreaming = 'chunks' in trace && Array.isArray(trace.chunks);

      console.log(chalk.bold('\n=== Trace Details ===\n'));
      console.log(chalk.cyan('ID:'), trace.id);
      console.log(chalk.cyan('Timestamp:'), new Date(trace.timestamp).toLocaleString());
      console.log(chalk.cyan('Endpoint:'), trace.endpoint);
      console.log(chalk.cyan('Model:'), trace.metadata.model || 'N/A');
      console.log(chalk.cyan('Duration:'), `${trace.metadata.duration_ms}ms`);
      console.log(chalk.cyan('Status:'), trace.metadata.status);
      
      if (isStreaming) {
        console.log(chalk.magenta('Mode:'), 'Streaming');
        console.log(chalk.magenta('Total Chunks:'), trace.total_chunks);
        console.log(chalk.magenta('Stream Duration:'), `${trace.stream_duration_ms}ms`);
        console.log(chalk.magenta('First Chunk Latency:'), `${trace.first_chunk_latency_ms}ms`);
      }
      
      if (trace.metadata.tokens_used) {
        console.log(chalk.cyan('Tokens:'), trace.metadata.tokens_used);
      }

      console.log(chalk.bold('\n--- Request ---\n'));
      console.log(JSON.stringify(trace.request, null, 2));

      console.log(chalk.bold('\n--- Response ---\n'));
      if (trace.response) {
        console.log(JSON.stringify(trace.response, null, 2));
      } else {
        console.log(chalk.red('Error:'), trace.metadata.error);
      }
    } catch (error: any) {
      console.error(chalk.red('Error viewing trace:'), error.message);
      process.exit(1);
    }
  });

// trace compare command
traceCommand
  .command('compare <baseline-id> <current-id>')
  .description('Compare two traces and analyze differences')
  .option('--with-risk', 'Include risk scoring analysis')
  .action(async (baselineId: string, currentId: string, options: { withRisk?: boolean }) => {
    try {
      const files = await readdir(TRACES_DIR);
      
      // Find trace files
      const baselineFile = files.find(f => f.includes(baselineId));
      const currentFile = files.find(f => f.includes(currentId));

      if (!baselineFile) {
        console.log(chalk.red(`Baseline trace not found: ${baselineId}`));
        process.exit(1);
      }

      if (!currentFile) {
        console.log(chalk.red(`Current trace not found: ${currentId}`));
        process.exit(1);
      }

      // Load traces
      const baselineContent = await readFile(resolve(TRACES_DIR, baselineFile), 'utf-8');
      const currentContent = await readFile(resolve(TRACES_DIR, currentFile), 'utf-8');
      
      const baseline: Trace = JSON.parse(baselineContent);
      const current: Trace = JSON.parse(currentContent);

      // Extract response text
      const getResponseText = (trace: any): string => {
        if (trace.response?.choices?.[0]?.message?.content) {
          return trace.response.choices[0].message.content;
        }
        if (trace.response?.choices?.[0]?.text) {
          return trace.response.choices[0].text;
        }
        return JSON.stringify(trace.response || {});
      };

      const baselineText = getResponseText(baseline);
      const currentText = getResponseText(current);

      // Display basic comparison
      console.log(chalk.bold('\n=== Trace Comparison ===\n'));
      console.log(chalk.cyan('Baseline ID:'), baseline.id.substring(0, 8));
      console.log(chalk.cyan('Current ID:'), current.id.substring(0, 8));
      console.log(chalk.cyan('Model:'), `${baseline.metadata.model} → ${current.metadata.model}`);
      console.log(chalk.cyan('Duration:'), `${baseline.metadata.duration_ms}ms → ${current.metadata.duration_ms}ms`);
      
      if (baseline.metadata.tokens_used && current.metadata.tokens_used) {
        console.log(chalk.cyan('Tokens:'), `${baseline.metadata.tokens_used} → ${current.metadata.tokens_used}`);
      }

      // Show text diff
      console.log(chalk.bold('\n--- Response Comparison ---\n'));
      console.log(chalk.gray('Baseline length:'), baselineText.length, 'chars');
      console.log(chalk.gray('Current length:'), currentText.length, 'chars');
      
      const lengthDiff = currentText.length - baselineText.length;
      const lengthDiffPercent = ((lengthDiff / baselineText.length) * 100).toFixed(1);
      console.log(chalk.gray('Length difference:'), 
        lengthDiff >= 0 ? chalk.green(`+${lengthDiff}`) : chalk.red(`${lengthDiff}`),
        `(${lengthDiffPercent}%)`
      );

      // Risk scoring (if requested)
      if (options.withRisk) {
        console.log(chalk.bold('\n--- Risk Analysis ---\n'));
        
        try {
          const riskScore = await calculateRiskScore(
            baselineText,
            currentText,
            baseline.metadata,
            current.metadata
          );

          console.log(formatRiskScore(riskScore));
        } catch (error: any) {
          console.error(chalk.yellow('\nWarning: Risk scoring failed:'), error.message);
          console.log(chalk.gray('Tip: Make sure OPENAI_API_KEY is set for semantic analysis'));
        }
      } else {
        console.log(chalk.gray('\nTip: Use --with-risk flag for risk analysis'));
      }

    } catch (error: any) {
      console.error(chalk.red('Error comparing traces:'), error.message);
      process.exit(1);
    }
  });

// trace search command
traceCommand
  .command('search <query>')
  .description('Full-text search across all traces')
  .option('-l, --limit <number>', 'Limit number of results', '20')
  .option('-m, --model <model>', 'Filter by model')
  .option('-s, --status <status>', 'Filter by status (success/error)')
  .action(async (query: string, options: { limit: string; model?: string; status?: string }) => {
    try {
      // Import SQLiteStorageBackend
      const { SQLiteStorageBackend } = await import('../../../proxy/src/storage-sqlite.js');
      const storage = new SQLiteStorageBackend();

      if (!storage.searchTraces) {
        console.log(chalk.red('Full-text search requires SQLite storage backend'));
        process.exit(1);
      }

      console.log(chalk.cyan(`Searching for: "${query}"\n`));

      const results = await storage.searchTraces(query, {
        limit: parseInt(options.limit),
        filterModel: options.model,
        filterStatus: options.status as 'success' | 'error' | undefined,
      });

      if (results.length === 0) {
        console.log(chalk.yellow('No results found'));
        return;
      }

      // Create table
      const table = new Table({
        head: ['ID', 'Timestamp', 'Model', 'Status', 'Endpoint'],
        colWidths: [10, 22, 15, 10, 35],
      });

      for (const trace of results) {
        table.push([
          trace.id.substring(0, 8),
          new Date(trace.timestamp).toLocaleString(),
          trace.metadata.model || 'N/A',
          trace.metadata.status === 'success' ? chalk.green('✓') : chalk.red('✗'),
          trace.endpoint,
        ]);
      }

      console.log(table.toString());
      console.log(chalk.gray(`\nShowing ${results.length} results`));
    } catch (error: any) {
      console.log(chalk.red(`Search failed: ${error.message}`));
      process.exit(1);
    }
  });

