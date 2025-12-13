import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';

interface Test {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  assertions: any[];
}

export class TestsTreeProvider implements vscode.TreeDataProvider<TestItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TestItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TestItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TestItem): Promise<TestItem[]> {
    if (!this.workspaceRoot) {
      return [];
    }

    const testsDir = path.join(this.workspaceRoot, '.ai-tests', 'tests');
    
    if (!fs.existsSync(testsDir)) {
      return [];
    }

    try {
      const files = fs.readdirSync(testsDir);
      const testFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      const tests: TestItem[] = [];
      
      for (const file of testFiles) {
        const content = fs.readFileSync(path.join(testsDir, file), 'utf-8');
        const test: Test = yaml.parse(content);
        tests.push(new TestItem(test, file));
      }

      // Sort by name
      tests.sort((a, b) => {
        const aLabel = a.label?.toString() || '';
        const bLabel = b.label?.toString() || '';
        return aLabel.localeCompare(bLabel);
      });

      return tests;
    } catch (error) {
      console.error('Error loading tests:', error);
      return [];
    }
  }
}

class TestItem extends vscode.TreeItem {
  constructor(
    public readonly test: Test,
    public readonly filename: string
  ) {
    super(test.name, vscode.TreeItemCollapsibleState.None);

    this.id = test.id;
    
    const assertionCount = test.assertions?.length || 0;
    const tags = test.tags?.join(', ') || 'no tags';
    
    this.tooltip = [
      `Name: ${test.name}`,
      `File: ${filename}`,
      `Assertions: ${assertionCount}`,
      `Tags: ${tags}`,
      test.description ? `Description: ${test.description}` : ''
    ].filter(Boolean).join('\n');

    this.description = `${assertionCount} assertion${assertionCount === 1 ? '' : 's'}`;
    this.contextValue = 'test';

    // Show tags as badges
    if (test.tags && test.tags.length > 0) {
      this.description += ` • ${test.tags.join(' ')}`;
    }

    // Icon
    this.iconPath = new vscode.ThemeIcon('beaker');

    // Make clickable
    this.command = {
      command: 'traceforge.openTest',
      title: 'Open Test',
      arguments: [this]
    };
  }
}
