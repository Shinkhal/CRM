import assert from 'node:assert/strict';
import { evaluateExpression, evaluateCondition, validateExpression, interpolate } from '../utils/expression.js';

let passed = 0;
let failed = 0;

const check = (label: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`PASS  ${label}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL  ${label} :: ${error instanceof Error ? error.message : error}`);
  }
};

const ctx = {
  doc: {
    stage: 'proposal',
    value: 50000,
    probability: 50,
    isWon: false,
    title: 'Enterprise roll-out',
    tags: ['a', 'b'],
    customer: { name: 'Acme', tier: 'gold' },
  },
  actor: { name: 'Dana' },
  count: 3,
};

check('literals', () => {
  assert.equal(evaluateExpression('42', ctx), 42);
  assert.equal(evaluateExpression("'hello'", ctx), 'hello');
  assert.equal(evaluateExpression('true', ctx), true);
  assert.equal(evaluateExpression('null', ctx), null);
});

check('paths', () => {
  assert.equal(evaluateExpression('doc.stage', ctx), 'proposal');
  assert.equal(evaluateExpression('doc.customer.tier', ctx), 'gold');
  assert.equal(evaluateExpression('doc.missing', ctx), undefined);
  assert.equal(evaluateExpression('doc.missing.deeper', ctx), undefined);
});

check('comparisons', () => {
  assert.equal(evaluateExpression('doc.value > 1000', ctx), true);
  assert.equal(evaluateExpression('doc.value >= 50000', ctx), true);
  assert.equal(evaluateExpression('doc.value < 1000', ctx), false);
  assert.equal(evaluateExpression("doc.stage == 'proposal'", ctx), true);
  assert.equal(evaluateExpression("doc.stage != 'won'", ctx), true);
  assert.equal(evaluateExpression('doc.value == "50000"', ctx), true);
});

check('logical operators', () => {
  assert.equal(evaluateExpression('doc.value > 1000 && doc.probability == 50', ctx), true);
  assert.equal(evaluateExpression('doc.value > 100000 || doc.probability == 50', ctx), true);
  assert.equal(evaluateExpression('!(doc.value > 1000)', ctx), false);
  assert.equal(evaluateExpression('!doc.isWon', ctx), true);
});

check('membership', () => {
  assert.equal(evaluateExpression("doc.stage in ['won', 'lost']", ctx), false);
  assert.equal(evaluateExpression("doc.stage in ['proposal', 'won']", ctx), true);
  assert.equal(evaluateExpression("doc.stage not in ['won', 'lost']", ctx), true);
  assert.equal(evaluateExpression("'a' in doc.tags", ctx), true);
  assert.equal(evaluateExpression("'z' in doc.tags", ctx), false);
  assert.equal(evaluateExpression("'stage' in doc", ctx), true);
});

check('arithmetic', () => {
  assert.equal(evaluateExpression('doc.value * doc.probability / 100', ctx), 25000);
  assert.equal(evaluateExpression('doc.value + 1 - 1', ctx), 50000);
  assert.equal(evaluateExpression('count + 1', ctx), 4);
  assert.equal(evaluateExpression('doc.value % 7', ctx), 50000 % 7);
});

check('parentheses and nesting', () => {
  assert.equal(evaluateExpression('(doc.value + 1) * 2', ctx), 100002);
  assert.equal(
    evaluateExpression("(doc.stage == 'won' || doc.stage == 'lost') && doc.value > 0", ctx),
    false
  );
});

check('prototype access is blocked', () => {
  assert.equal(evaluateExpression('doc.__proto__', ctx), undefined);
  assert.equal(evaluateExpression('doc.constructor', ctx), undefined);
});

check('malformed expressions throw', () => {
  assert.throws(() => evaluateExpression('doc.', ctx));
  assert.throws(() => evaluateExpression('doc.value >', ctx));
  assert.throws(() => evaluateExpression('(doc.value', ctx));
  assert.throws(() => evaluateExpression("'unterminated", ctx));
  assert.throws(() => evaluateExpression('doc.value @ 3', ctx));
});

check('validateExpression reports errors', () => {
  assert.equal(validateExpression('doc.value > 1').valid, true);
  assert.equal(validateExpression('doc.').valid, false);
});

check('evaluateCondition treats an empty expression as true', () => {
  assert.equal(evaluateCondition('', ctx), true);
  assert.equal(evaluateCondition('   ', ctx), true);
  assert.equal(evaluateCondition('doc.value > 1', ctx), true);
  assert.equal(evaluateCondition('doc.value > 1000000', ctx), false);
});

check('interpolation', () => {
  assert.equal(interpolate('Hi {{doc.customer.name}}', ctx), 'Hi Acme');
  assert.equal(interpolate('Value: {{ doc.value }}', ctx), 'Value: 50000');
  assert.equal(interpolate('Missing {{doc.nope}}', ctx), 'Missing {{doc.nope}}');
});

check('negation binds tighter than comparison, like JavaScript', () => {
  /**
   * `!a == b` is `(!a) == b` in JavaScript, not `!(a == b)`. The two only
   * differ when the right hand side is a non-numeric string, because the
   * loose comparison then coerces a boolean against NaN.
   *
   * `!doc.title == 'x'` with a non-empty title:
   *   JavaScript: (false) == 'x'  -> 0 == NaN -> false
   *   previous:  !('title' == 'x') -> !false     -> true
   */
  assert.equal(evaluateExpression("!doc.title == 'x'", ctx), false);
  assert.equal(evaluateExpression("!doc.title != 'x'", ctx), true);
  assert.equal(evaluateExpression('!doc.isWon', ctx), true);
  assert.equal(evaluateExpression('!doc.isWon && doc.value > 1', ctx), true);
});

check('division by zero yields null instead of throwing', () => {
  assert.equal(evaluateExpression('1 / 0', ctx), null);
  assert.equal(evaluateExpression('1 % 0', ctx), null);
  assert.equal(evaluateCondition('1 / 0 > 1', ctx), false);
});

check('a deeply nested expression is rejected', () => {
  const deep = '('.repeat(200) + '1' + ')'.repeat(200);
  assert.throws(() => evaluateExpression(deep, ctx));
});

check('an over long expression is rejected', () => {
  const long = `doc.value == ${'1'.repeat(3000)}`;
  assert.throws(() => evaluateExpression(long, ctx));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
