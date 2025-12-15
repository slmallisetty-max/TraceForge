import { Command } from 'commander';
import { spawn } from 'child_process';
import { platform } from 'os';

export const startCommand = new Command('start')
  .description('Start TraceForge services')
  .option('-p, --proxy-only', 'Start only the proxy server')
  .option('-w, --web-only', 'Start only the web server')
  .option('-d, --detached', 'Run services in background (not yet implemented)')
  .action(async (options) => {
    const isWindows = platform() === 'win32';
    
    console.log('🚀 Starting TraceForge...\n');

    if (options.proxyOnly) {
      console.log('Starting proxy server only...');
      startService('proxy');
    } else if (options.webOnly) {
      console.log('Starting web server only...');
      startService('web');
    } else {
      console.log('Starting all services...\n');
      console.log('💡 Tip: Use Ctrl+C to stop all services\n');
      
      // Try to use pnpm dev directly - simpler and more reliable
      const pnpmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';
      
      const child = spawn(pnpmCmd, ['dev'], {
        stdio: 'inherit',
        shell: true,
        cwd: process.cwd(),
      });

      child.on('error', (error) => {
        console.error(`❌ Failed to start services: ${error.message}`);
        console.error('\nMake sure you are in the TraceForge root directory.');
        console.error('Try running manually: pnpm dev');
        process.exit(1);
      });

      child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`\n❌ Services exited with code ${code}`);
          process.exit(code);
        }
      });

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        console.log('\n\n🛑 Stopping services...');
        child.kill('SIGINT');
        process.exit(0);
      });
    }
  });

function startService(service: 'proxy' | 'web') {
  const isWindows = platform() === 'win32';
  
  const child = spawn(
    isWindows ? 'pnpm.cmd' : 'pnpm',
    ['--filter', `@traceforge/${service}`, 'dev'],
    {
      stdio: 'inherit',
      shell: true,
    }
  );

  child.on('error', (error) => {
    console.error(`❌ Failed to start ${service}: ${error.message}`);
    process.exit(1);
  });

  process.on('SIGINT', () => {
    console.log(`\n\n🛑 Stopping ${service}...`);
    child.kill('SIGINT');
    process.exit(0);
  });
}
