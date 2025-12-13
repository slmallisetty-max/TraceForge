import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';

export class ProxyManager {
  private proxyProcess: child_process.ChildProcess | null = null;
  private statusBarItem: vscode.StatusBarItem;

  constructor(private workspaceRoot: string) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.updateStatusBar(false);
  }

  async start(): Promise<void> {
    if (this.proxyProcess) {
      vscode.window.showWarningMessage('Proxy is already running');
      return;
    }

    try {
      const config = vscode.workspace.getConfiguration('traceforge');
      const proxyPort = config.get('proxyPort', 8787);

      vscode.window.showInformationMessage(`Starting TraceForge proxy on port ${proxyPort}...`);

      // Start proxy process
      const proxyPath = path.join(this.workspaceRoot, 'packages', 'proxy', 'dist', 'index.js');
      
      this.proxyProcess = child_process.spawn('node', [proxyPath], {
        cwd: this.workspaceRoot,
        env: { ...process.env, PROXY_PORT: proxyPort.toString() },
        stdio: 'pipe'
      });

      this.proxyProcess.stdout?.on('data', (data) => {
        console.log(`Proxy: ${data}`);
      });

      this.proxyProcess.stderr?.on('data', (data) => {
        console.error(`Proxy Error: ${data}`);
      });

      this.proxyProcess.on('exit', (code) => {
        console.log(`Proxy exited with code ${code}`);
        this.proxyProcess = null;
        this.updateStatusBar(false);
      });

      // Wait a bit for startup
      await new Promise(resolve => setTimeout(resolve, 2000));

      vscode.window.showInformationMessage(`TraceForge proxy started on port ${proxyPort}`);
      this.updateStatusBar(true, proxyPort);
    } catch (error: any) {
      vscode.window.showErrorMessage(`Failed to start proxy: ${error.message}`);
      this.proxyProcess = null;
      this.updateStatusBar(false);
    }
  }

  async stop(): Promise<void> {
    if (!this.proxyProcess) {
      vscode.window.showWarningMessage('Proxy is not running');
      return;
    }

    this.proxyProcess.kill();
    this.proxyProcess = null;
    this.updateStatusBar(false);
    vscode.window.showInformationMessage('TraceForge proxy stopped');
  }

  private updateStatusBar(running: boolean, port?: number): void {
    if (running && port) {
      this.statusBarItem.text = `$(debug-start) Proxy:${port}`;
      this.statusBarItem.tooltip = 'TraceForge proxy is running. Click to stop.';
      this.statusBarItem.command = 'traceforge.stopProxy';
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      this.statusBarItem.text = '$(debug-stop) Proxy';
      this.statusBarItem.tooltip = 'TraceForge proxy is stopped. Click to start.';
      this.statusBarItem.command = 'traceforge.startProxy';
      this.statusBarItem.backgroundColor = undefined;
    }
    this.statusBarItem.show();
  }

  dispose(): void {
    if (this.proxyProcess) {
      this.proxyProcess.kill();
    }
    this.statusBarItem.dispose();
  }
}
