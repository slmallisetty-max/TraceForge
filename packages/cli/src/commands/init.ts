import { Command } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import chalk from 'chalk';

export const initCommand = new Command('init')
  .description('Initialize TraceForge in current directory')
  .action(async () => {
    try {
      const baseDir = resolve(process.cwd(), '.ai-tests');
      
      if (existsSync(baseDir)) {
        console.log(chalk.yellow('⚠️  .ai-tests directory already exists'));
        return;
      }

      // Create directories
      await mkdir(resolve(baseDir, 'traces'), { recursive: true });
      await mkdir(resolve(baseDir, 'tests'), { recursive: true });

      // Create default config
      const defaultConfig = `# TraceForge Configuration

# Upstream LLM provider URL
upstream_url: https://api.openai.com

# Environment variable containing the API key
api_key_env_var: OPENAI_API_KEY

# Whether to save traces
save_traces: true

# Proxy server port
proxy_port: 8787

# Web UI port
web_port: 3001

# Maximum trace retention in days (optional)
# max_trace_retention: 30

# Fields to redact from traces (optional)
# redact_fields:
#   - api_key
#   - authorization
`;

      await writeFile(resolve(baseDir, 'config.yaml'), defaultConfig, 'utf-8');

      console.log(chalk.green('✓ TraceForge initialized successfully!\n'));
      console.log('Created:');
      console.log(chalk.cyan('  .ai-tests/'));
      console.log(chalk.cyan('  .ai-tests/traces/'));
      console.log(chalk.cyan('  .ai-tests/tests/'));
      console.log(chalk.cyan('  .ai-tests/config.yaml'));
      console.log('\nNext steps:');
      console.log('  1. Start the proxy: ' + chalk.bold('npx @traceforge/proxy'));
      console.log('  2. Configure your app to use: ' + chalk.bold('http://localhost:8787/v1'));
      console.log('  3. View traces: ' + chalk.bold('traceforge trace list'));
    } catch (error: any) {
      console.error(chalk.red('Error initializing TraceForge:'), error.message);
      process.exit(1);
    }
  });
