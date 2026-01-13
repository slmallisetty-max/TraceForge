#!/usr/bin/env node

import { Command } from "commander";
import { recordCommand } from "./commands/record.js";
import { testCommand } from "./commands/test.js";
import { approveCommand } from "./commands/approve.js";

const program = new Command();

program
  .name("traceforge")
  .description(
    "If your AI output changes, your build will fail."
  )
  .version("0.1.0");

// Register only the 3 MVP commands
program.addCommand(recordCommand);
program.addCommand(testCommand);
program.addCommand(approveCommand);

// Show helpful message if no command specified
if (process.argv.length === 2) {
  console.log(`
🔥 TraceForge - If your AI output changes, your build will fail.

MVP Commands:
  ${"\x1b[36m"}traceforge record${"\x1b[0m"}    Record AI responses as snapshots
  ${"\x1b[36m"}traceforge test${"\x1b[0m"}      Replay snapshots, fail on any difference
  ${"\x1b[36m"}traceforge approve${"\x1b[0m"}   Approve changes and update snapshots

For help: ${"\x1b[36m"}traceforge --help${"\x1b[0m"}
`);
  process.exit(0);
}

program.parse();
