// Writes e2e-results/findings.md: every failed test grouped by severity, taken from its tag.
//   @critical — core functionality broken (login, data not saving)
//   @high     — wrong role permissions (e.g. an employee can see revenue)
//   @medium   — UI problems (pagination, a page failing to render, console errors)
//   @low      — cosmetic
// A failing test with no tag is reported as medium.
import fs from 'node:fs';
import path from 'node:path';

const ORDER = ['critical', 'high', 'medium', 'low'];

export default class SeverityReporter {
  constructor(options = {}) {
    this.outputFile = options.outputFile || 'e2e-results/findings.md';
    this.failures = [];
    this.counts = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
  }

  onTestEnd(test, result) {
    if (result.status === 'skipped') { this.counts.skipped += 1; return; }
    const last = test.results.length === 1 || result.retry === test.retries;
    if (!last && result.status !== 'passed') return;
    if (result.status === 'passed') {
      this.counts[result.retry > 0 ? 'flaky' : 'passed'] += 1;
      return;
    }
    this.counts.failed += 1;
    const tag = (test.tags || []).map((t) => t.replace('@', '')).find((t) => ORDER.includes(t)) || 'medium';
    const project = test.parent?.project()?.name || '';
    // Strip terminal colour codes from Playwright's error text.
    // eslint-disable-next-line no-control-regex
    const message = (result.error?.message || '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 12).join('\n');
    this.failures.push({ severity: tag, title: test.titlePath().slice(1).join(' › '), project, message, location: `${test.location.file.split(/[\\/]/).slice(-1)[0]}:${test.location.line}` });
  }

  onEnd(result) {
    const lines = [
      '# E2E Findings',
      '',
      `Run finished: ${new Date().toISOString()} — overall **${result.status}**`,
      '',
      `Passed: ${this.counts.passed} · Failed: ${this.counts.failed} · Flaky: ${this.counts.flaky} · Skipped: ${this.counts.skipped}`,
      '',
    ];
    if (this.failures.length === 0) {
      lines.push('No failures. 🎉');
    }
    for (const sev of ORDER) {
      const items = this.failures.filter((f) => f.severity === sev);
      if (!items.length) continue;
      lines.push(`## ${sev.toUpperCase()} (${items.length})`, '');
      for (const f of items) {
        lines.push(`### [${f.project}] ${f.title}`, '', `\`${f.location}\``, '', '```', f.message, '```', '');
      }
    }
    fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
    fs.writeFileSync(this.outputFile, lines.join('\n'));
    console.log(`\nSeverity report: ${this.outputFile}`);
  }
}
