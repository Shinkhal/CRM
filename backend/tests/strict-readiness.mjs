/**
 * Reports how far the backend is from TypeScript strict mode.
 *
 * `strict: false` is currently enabled, which means the type system is
 * largely decorative. This script counts the errors that strict mode would
 * report, grouped by rule, so the debt is visible and can only go down.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(process.cwd());
const tsconfig = path.join(root, 'tsconfig.json');

let output = '';
try {
  output = execFileSync(
    'npx',
    ['tsc', '-p', path.join(root, 'tsconfig.strict.json'), '--noEmit', '--pretty', 'false'],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
} catch (error) {
  output = `${error.stdout || ''}${error.stderr || ''}`;
}

const lines = output.split('\n').filter((line) => /error TS\d+/.test(line));
const byRule = new Map();
const byFile = new Map();

for (const line of lines) {
  const ruleMatch = line.match(/error (TS\d+)/);
  const fileMatch = line.match(/^(.+?)\(/);
  const rule = ruleMatch ? ruleMatch[1] : 'unknown';
  const file = fileMatch ? fileMatch[1].replace(root, '.') : 'unknown';
  byRule.set(rule, (byRule.get(rule) || 0) + 1);
  byFile.set(file, (byFile.get(file) || 0) + 1);
}

console.log(`Strict mode readiness: ${lines.length} error(s) across ${byFile.size} file(s)\n`);
console.log('By rule:');
for (const [rule, count] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${rule}`);
}
console.log('\nWorst files:');
for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${String(count).padStart(4)}  ${file}`);
}
console.log('\nTypeScript error reference:');
console.log('  https://www.typescriptlang.org/docs/handbook/2/2/7.html#strict-mode');
