import { Command } from 'commander';
import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import type { Trace } from '@traceforge/shared';

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
