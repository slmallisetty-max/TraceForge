import { Command } from "commander";
import chalk from "chalk";

export const recordCommand = new Command("record")
  .description("Record AI responses as snapshots")
  .action(async () => {
    console.log(chalk.cyan("🎬 Recording AI responses...\n"));
    console.log("Set TRACEFORGE_VCR_MODE=record and run your tests:");
    console.log(chalk.gray("  $ TRACEFORGE_VCR_MODE=record npm test\n"));
    console.log("Snapshots will be saved to .ai-tests/cassettes/");
    console.log(chalk.gray("\nThen commit them:"));
    console.log(chalk.cyan("  $ git add .ai-tests/cassettes/"));
    console.log(chalk.cyan('  $ git commit -m "Add AI snapshots"'));
    process.exit(0);
  });
