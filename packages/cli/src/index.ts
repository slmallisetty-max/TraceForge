#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { traceCommand } from "./commands/trace.js";
import { testCommand } from "./commands/test.js";
import { startCommand } from "./commands/start.js";
import { vcrCommand } from "./commands/vcr.js";
import { embeddingsCommand } from "./commands/embeddings.js";

const program = new Command();

program
  .name("traceforge")
  .description(
    "Local-first AI debugging platform - Simple, unified, developer-friendly"
  )
  .version("0.1.0");

// Register commands
program.addCommand(startCommand);
program.addCommand(initCommand);
program.addCommand(traceCommand);
program.addCommand(testCommand);
program.addCommand(vcrCommand);
program.addCommand(embeddingsCommand);

// Show helpful message if no command specified
if (process.argv.length === 2) {
  console.log(`
🔥 TraceForge - Local-first AI Debugging Platform

Quick Start:
  ${"\x1b[36m"}traceforge start${"\x1b[0m"}          Start all services (proxy + web)
  ${"\x1b[36m"}traceforge init${"\x1b[0m"}           Initialize project
  ${"\x1b[36m"}traceforge trace list${"\x1b[0m"}     List captured traces
  ${"\x1b[36m"}traceforge test run${"\x1b[0m"}       Run tests

Or run from project root:
  ${"\x1b[36m"}pnpm dev${"\x1b[0m"}                 Start all services with hot reload

For help: ${"\x1b[36m"}traceforge --help${"\x1b[0m"}
`);
  process.exit(0);
}

program.parse();
