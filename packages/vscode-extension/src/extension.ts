import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TracesTreeProvider } from './providers/TracesTreeProvider';
import { TestsTreeProvider } from './providers/TestsTreeProvider';
import { ProxyManager } from './ProxyManager';

export function activate(context: vscode.ExtensionContext) {
  console.log('TraceForge extension is now active');

  // Check if workspace has TraceForge
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  const configPath = path.join(workspaceRoot, '.ai-tests', 'config.yaml');
  if (!fs.existsSync(configPath)) {
    vscode.window.showInformationMessage(
      'TraceForge not initialized. Run "traceforge init" in the terminal.',
      'Learn More'
    ).then(selection => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/traceforge/traceforge'));
      }
    });
    return;
  }

  // Initialize providers
  const tracesProvider = new TracesTreeProvider(workspaceRoot);
  const testsProvider = new TestsTreeProvider(workspaceRoot);
  const proxyManager = new ProxyManager(workspaceRoot);

  // Register tree views
  vscode.window.registerTreeDataProvider('traceforge.traces', tracesProvider);
  vscode.window.registerTreeDataProvider('traceforge.tests', testsProvider);

  // Auto-refresh
  const config = vscode.workspace.getConfiguration('traceforge');
  if (config.get('autoRefresh', true)) {
    const interval = config.get('refreshInterval', 5000);
    const timer = setInterval(() => {
      tracesProvider.refresh();
      testsProvider.refresh();
    }, interval);
    context.subscriptions.push({ dispose: () => clearInterval(timer) });
  }

  // Register commands
  context.subscriptions.push(
    // Trace commands
    vscode.commands.registerCommand('traceforge.refreshTraces', () => {
      tracesProvider.refresh();
    }),

    vscode.commands.registerCommand('traceforge.viewTrace', async (item) => {
      const tracePath = path.join(workspaceRoot, '.ai-tests', 'traces', `${item.id}.json`);
      if (fs.existsSync(tracePath)) {
        const doc = await vscode.workspace.openTextDocument(tracePath);
        await vscode.window.showTextDocument(doc, { preview: false });
      }
    }),

    vscode.commands.registerCommand('traceforge.createTestFromTrace', async (item) => {
      const testName = await vscode.window.showInputBox({
        prompt: 'Enter test name',
        value: `Test from ${item.id.substring(0, 8)}`
      });

      if (!testName) {
        return;
      }

      const terminal = vscode.window.createTerminal('TraceForge');
      terminal.show();
      terminal.sendText(`traceforge test create-from-trace ${item.id} --name "${testName}"`);
      
      setTimeout(() => {
        testsProvider.refresh();
      }, 1000);
    }),

    // Test commands
    vscode.commands.registerCommand('traceforge.refreshTests', () => {
      testsProvider.refresh();
    }),

    vscode.commands.registerCommand('traceforge.runTest', async (item) => {
      const terminal = vscode.window.createTerminal('TraceForge Test');
      terminal.show();
      terminal.sendText(`traceforge test run ${item.filename}`);
    }),

    vscode.commands.registerCommand('traceforge.runAllTests', async () => {
      const terminal = vscode.window.createTerminal('TraceForge Tests');
      terminal.show();
      terminal.sendText('traceforge test run --parallel');
    }),

    vscode.commands.registerCommand('traceforge.openTest', async (item) => {
      const testPath = path.join(workspaceRoot, '.ai-tests', 'tests', item.filename);
      if (fs.existsSync(testPath)) {
        const doc = await vscode.workspace.openTextDocument(testPath);
        await vscode.window.showTextDocument(doc, { preview: false });
      }
    }),

    // Proxy commands
    vscode.commands.registerCommand('traceforge.startProxy', async () => {
      await proxyManager.start();
    }),

    vscode.commands.registerCommand('traceforge.stopProxy', async () => {
      await proxyManager.stop();
    }),

    // Web UI commands
    vscode.commands.registerCommand('traceforge.startWeb', async () => {
      const terminal = vscode.window.createTerminal('TraceForge Web');
      terminal.show();
      terminal.sendText('cd packages/web && npm run dev');
    }),

    vscode.commands.registerCommand('traceforge.openDashboard', async () => {
      const config = vscode.workspace.getConfiguration('traceforge');
      const webPort = config.get('webPort', 3001);
      vscode.env.openExternal(vscode.Uri.parse(`http://localhost:${webPort}/dashboard`));
    })
  );

  // Status bar
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '$(debug-start) TraceForge';
  statusBar.command = 'traceforge.openDashboard';
  statusBar.tooltip = 'Click to open TraceForge dashboard';
  statusBar.show();
  context.subscriptions.push(statusBar);
}

export function deactivate() {
  console.log('TraceForge extension is now deactivated');
}
