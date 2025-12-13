import chalk from 'chalk';

export class ProgressReporter {
  private total: number;
  private completed: number = 0;
  private passed: number = 0;
  private failed: number = 0;
  private startTime: number;

  constructor(total: number) {
    this.total = total;
    this.startTime = Date.now();
  }

  start(_testName: string): void {
    this.update();
  }

  complete(_testName: string, passed: boolean): void {
    this.completed++;
    if (passed) {
      this.passed++;
    } else {
      this.failed++;
    }
    this.update();
  }

  private update(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const percentage = Math.round((this.completed / this.total) * 100);
    const bar = this.createProgressBar(percentage);
    
    // Clear line and write progress
    process.stdout.write('\r\x1b[K');
    process.stdout.write(
      `${bar} ${percentage}% | ` +
      chalk.green(`${this.passed} passed`) + ' | ' +
      chalk.red(`${this.failed} failed`) + ' | ' +
      chalk.gray(`${this.completed}/${this.total}`) + ' | ' +
      chalk.gray(`${elapsed}s`)
    );
  }

  private createProgressBar(percentage: number): string {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return (
      chalk.cyan('█'.repeat(filled)) +
      chalk.gray('░'.repeat(empty))
    );
  }

  finish(): void {
    process.stdout.write('\n');
  }

  getSummary(): { total: number; passed: number; failed: number; duration: number } {
    return {
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      duration: Date.now() - this.startTime,
    };
  }
}
