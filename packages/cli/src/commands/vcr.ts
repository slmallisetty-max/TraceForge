import { Command } from 'commander';
import { readdir, rm } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';

const CASSETTES_DIR = process.env.TRACEFORGE_VCR_DIR || '.ai-tests/cassettes';
const VCR_MODE = process.env.TRACEFORGE_VCR_MODE || 'off';
const VCR_MATCH = process.env.TRACEFORGE_VCR_MATCH || 'fuzzy';

export const vcrCommand = new Command('vcr')
  .description('Manage VCR cassettes for deterministic testing');

// vcr status
vcrCommand
  .command('status')
  .description('Show VCR configuration and status')
  .action(async () => {
    console.log(chalk.blue('🎬 VCR Status\n'));
    console.log(`Mode:          ${chalk.yellow(VCR_MODE)}`);
    console.log(`Match mode:    ${chalk.yellow(VCR_MATCH)}`);
    console.log(`Cassettes dir: ${chalk.yellow(CASSETTES_DIR)}`);
    
    if (!existsSync(CASSETTES_DIR)) {
      console.log(chalk.gray('\nNo cassettes directory found.'));
      return;
    }

    try {
      const providers = await readdir(CASSETTES_DIR);
      let totalCassettes = 0;

      console.log(chalk.blue('\n📦 Cassettes by provider:\n'));

      for (const provider of providers) {
        const providerDir = join(CASSETTES_DIR, provider);
        try {
          const files = await readdir(providerDir);
          const cassetteCount = files.filter(f => f.endsWith('.json')).length;
          totalCassettes += cassetteCount;

          if (cassetteCount > 0) {
            console.log(`  ${chalk.green(provider)}: ${cassetteCount} cassettes`);
          }
        } catch {
          // Skip invalid directories
        }
      }

      console.log(chalk.blue(`\nTotal: ${totalCassettes} cassettes`));
    } catch (error: any) {
      console.log(chalk.red(`Error reading cassettes: ${error.message}`));
    }
  });

// vcr list
vcrCommand
  .command('list')
  .description('List all cassettes')
  .action(async () => {
    if (!existsSync(CASSETTES_DIR)) {
      console.log(chalk.gray('No cassettes directory found.'));
      return;
    }

    try {
      const providers = await readdir(CASSETTES_DIR);
      let totalCount = 0;

      for (const provider of providers) {
        const providerDir = join(CASSETTES_DIR, provider);
        try {
          const files = await readdir(providerDir);
          const cassettes = files.filter(f => f.endsWith('.json'));

          if (cassettes.length > 0) {
            console.log(chalk.blue(`\n${provider}:`));
            for (const cassette of cassettes) {
              console.log(`  ${chalk.gray(cassette)}`);
              totalCount++;
            }
          }
        } catch {
          // Skip invalid directories
        }
      }

      console.log(chalk.blue(`\nTotal: ${totalCount} cassettes`));
    } catch (error: any) {
      console.log(chalk.red(`Error listing cassettes: ${error.message}`));
    }
  });

// vcr clean
vcrCommand
  .command('clean')
  .description('Delete all cassettes')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    if (!existsSync(CASSETTES_DIR)) {
      console.log(chalk.gray('No cassettes directory found.'));
      return;
    }

    if (!options.yes) {
      console.log(chalk.yellow('⚠️  This will delete all VCR cassettes.'));
      console.log(chalk.gray('Run with --yes to confirm.\n'));
      return;
    }

    try {
      await rm(CASSETTES_DIR, { recursive: true, force: true });
      console.log(chalk.green('✓ All cassettes deleted'));
    } catch (error: any) {
      console.log(chalk.red(`Error deleting cassettes: ${error.message}`));
    }
  });
