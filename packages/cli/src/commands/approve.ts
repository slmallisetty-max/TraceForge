import { Command } from "commander";
import { readdir, readFile, writeFile } from "fs/promises";
import { resolve, join } from "path";
import { existsSync } from "fs";
import chalk from "chalk";

const SNAPSHOTS_DIR = ".ai-tests/cassettes";

export const approveCommand = new Command("approve")
  .description("Approve changes and update snapshots")
  .action(async () => {
    console.log(chalk.cyan("✅ Approving AI behavior changes...\n"));
    
    if (!existsSync(SNAPSHOTS_DIR)) {
      console.log(chalk.red(`Snapshots directory not found: ${SNAPSHOTS_DIR}`));
      console.log(chalk.gray("\nRun 'traceforge record' first to create snapshots."));
      process.exit(1);
    }

    console.log("To approve changes, regenerate snapshots:");
    console.log(chalk.gray("  $ TRACEFORGE_VCR_MODE=record npm test\n"));
    console.log("Review the changes:");
    console.log(chalk.cyan("  $ git diff .ai-tests/cassettes/\n"));
    console.log("Then commit them:");
    console.log(chalk.cyan("  $ git add .ai-tests/cassettes/"));
    console.log(chalk.cyan('  $ git commit -m "Approve AI behavior changes"'));
    
    process.exit(0);
  });
