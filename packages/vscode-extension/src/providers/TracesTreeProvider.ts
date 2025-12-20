import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface Trace {
  id: string;
  timestamp: string;
  endpoint: string;
  metadata: {
    duration_ms: number;
    status: 'success' | 'error';
    model?: string;
  };
}

export class TracesTreeProvider implements vscode.TreeDataProvider<TraceItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TraceItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(_element: TraceItem): vscode.TreeItem {
    return _element;
  }

  async getChildren(_element?: TraceItem): Promise<TraceItem[]> {
    if (!this.workspaceRoot) {
      return [];
    }

    const tracesDir = path.join(this.workspaceRoot, '.ai-tests', 'traces');
    
    if (!fs.existsSync(tracesDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(tracesDir);
      const traceFiles = files.filter(f => f.endsWith('.json'));

      const traces: TraceItem[] = [];
      
      for (const file of traceFiles) {
        const content = fs.readFileSync(path.join(tracesDir, file), 'utf-8');
        const trace: Trace = JSON.parse(content);
        traces.push(new TraceItem(trace));
      }

      // Sort by timestamp descending (newest first)
      traces.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      return traces;
    } catch (error) {
      console.error('Error loading traces:', error);
      return [];
    }
  }
}

class TraceItem extends vscode.TreeItem {
  constructor(
    public readonly trace: Trace
  ) {
    const timestamp = new Date(trace.timestamp).toLocaleString();
    const status = trace.metadata.status === 'success' ? '✓' : '✗';
    const duration = `${trace.metadata.duration_ms}ms`;
    const model = trace.metadata.model || 'unknown';
    
    super(`${status} ${model} (${duration})`, vscode.TreeItemCollapsibleState.None);

    this.id = trace.id;
    this.tooltip = [
      `ID: ${trace.id}`,
      `Endpoint: ${trace.endpoint}`,
      `Status: ${trace.metadata.status}`,
      `Duration: ${duration}`,
      `Model: ${model}`,
      `Time: ${timestamp}`
    ].join('\n');

    this.description = timestamp;
    this.contextValue = 'trace';

    // Set icon based on status
    if (trace.metadata.status === 'success') {
      this.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
    } else {
      this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
    }

    // Make clickable
    this.command = {
      command: 'traceforge.viewTrace',
      title: 'View Trace',
      arguments: [this]
    };
  }

  get timestamp(): string {
    return this.trace.timestamp;
  }
}
