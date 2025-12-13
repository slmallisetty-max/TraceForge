#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { traceCommand } from './commands/trace.js';
import { testCommand } from './commands/test.js';

const program = new Command();

program
  .name('traceforge')
  .description('Local-first AI debugging platform')
  .version('0.1.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(traceCommand);
program.addCommand(testCommand);

program.parse();
