import { createHash } from 'node:crypto';

/**
 * A small, safe expression language for workflow conditions.
 *
 * Workflow conditions have to evaluate a tenant-authored expression against a
 * record, which rules out `eval` and `new Function`. This module implements a
 * recursive descent parser that produces an AST, and an evaluator that walks
 * the AST. Nothing is ever compiled to code.
 *
 * Grammar:
 *
 *   expression  := orExpr
 *   orExpr      := andExpr ( '||' andExpr )*
 *   andExpr     := comparison ( '&&' comparison )*
 *   comparison  := notExpr ( ('==' | '!=' | '>=' | '<=' | '>' | '<' | 'in' | 'not in') notExpr )?
 *   notExpr     := '!' notExpr | additive
 *   additive    := multiplicative ( ('+' | '-') multiplicative )*
 *   multiplicative := unary ( ('*' | '/' | '%') unary )*
 *   unary       := '-' unary | primary
 *   primary     := number | string | 'true' | 'false' | 'null' | array | path | '(' expression ')'
 *   array       := '[' ( expression ( ',' expression )* )? ']'
 *   path        := identifier ( '.' identifier )*
 */

export type ExpressionValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ExpressionValue[]
  | { [key: string]: ExpressionValue };

export class ExpressionError extends Error {
  constructor(message: string, public readonly position?: number) {
    super(message);
    this.name = 'ExpressionError';
  }
}

type TokenType =
  | 'number'
  | 'string'
  | 'identifier'
  | 'operator'
  | 'punctuation'
  | 'eof';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

const PUNCTUATION = ['(', ')', '[', ']', ',', '.'];
const OPERATORS = ['&&', '||', '==', '!=', '>=', '<=', '>', '<', '+', '-', '*', '/', '%', '!'];

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(input[index + 1] || ''))) {
      const start = index;
      while (index < input.length && /[0-9.]/.test(input[index])) index += 1;
      const raw = input.slice(start, index);
      if (!/^[0-9]*\.?[0-9]+$/.test(raw)) {
        throw new ExpressionError(`Invalid number: ${raw}`, start);
      }
      tokens.push({ type: 'number', value: raw, position: start });
      continue;
    }

    // Strings, single or double quoted
    if (char === '"' || char === "'") {
      const quote = char;
      const start = index;
      index += 1;
      let value = '';
      while (index < input.length && input[index] !== quote) {
        if (input[index] === '\\' && index + 1 < input.length) {
          const escaped = input[index + 1];
          value +=
            escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped === 'r' ? '\r' : escaped;
          index += 2;
          continue;
        }
        value += input[index];
        index += 1;
      }
      if (index >= input.length) {
        throw new ExpressionError('Unterminated string literal', start);
      }
      index += 1; // closing quote
      tokens.push({ type: 'string', value, position: start });
      continue;
    }

    // Identifiers and keywords
    if (/[A-Za-z_$]/.test(char)) {
      const start = index;
      while (index < input.length && /[A-Za-z0-9_$]/.test(input[index])) index += 1;
      tokens.push({ type: 'identifier', value: input.slice(start, index), position: start });
      continue;
    }

    // Operators, longest match first
    const operator = OPERATORS.find((candidate) => input.startsWith(candidate, index));
    if (operator) {
      tokens.push({ type: 'operator', value: operator, position: index });
      index += operator.length;
      continue;
    }

    if (PUNCTUATION.includes(char)) {
      tokens.push({ type: 'punctuation', value: char, position: index });
      index += 1;
      continue;
    }

    throw new ExpressionError(`Unexpected character '${char}'`, index);
  }

  tokens.push({ type: 'eof', value: '', position: input.length });
  return tokens;
};

type Node =
  | { kind: 'literal'; value: ExpressionValue }
  | { kind: 'path'; segments: string[] }
  | { kind: 'array'; elements: Node[] }
  | { kind: 'unary'; operator: string; operand: Node }
  | { kind: 'binary'; operator: string; left: Node; right: Node };

/**
 * The deepest nesting the parser accepts. A deeply nested expression
 * recursed until the stack overflowed.
 */
const MAX_PARSE_DEPTH = 32;

/** The longest expression that can be parsed. */
export const MAX_EXPRESSION_LENGTH = 2000;

class Parser {
  private position = 0;

  private depth = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.parseOr();
    this.expect('eof', 'eof');
    return node;
  }

  private peek(): Token {
    return this.tokens[this.position];
  }

  private next(): Token {
    return this.tokens[this.position++];
  }

  private match(value: string, type: TokenType = 'operator'): boolean {
    const token = this.peek();
    if (token.type === type && token.value === value) {
      this.position += 1;
      return true;
    }
    return false;
  }

  private expect(value: string, type: TokenType = 'operator'): Token {
    const token = this.peek();
    const matches =
      type === 'eof'
        ? token.type === 'eof'
        : token.type === type && token.value === value;
    if (!matches) {
      throw new ExpressionError(
        `Expected '${value}' but found '${token.value || 'end of input'}'`,
        token.position
      );
    }
    return this.next();
  }

  private parseOr(): Node {
    this.depth += 1;
    if (this.depth > MAX_PARSE_DEPTH) {
      throw new ExpressionError('The expression is nested too deeply');
    }
    let left = this.parseAnd();
    while (this.match('||')) {
      const right = this.parseAnd();
      left = { kind: 'binary', operator: '||', left, right };
    }
    this.depth -= 1;
    return left;
  }

  private parseAnd(): Node {
    let left = this.parseComparison();
    while (this.match('&&')) {
      const right = this.parseComparison();
      left = { kind: 'binary', operator: '&&', left, right };
    }
    return left;
  }

  private parseNot(): Node {
    if (this.match('!')) {
      return { kind: 'unary', operator: '!', operand: this.parseNot() };
    }
    return this.parseAdditive();
  }

  private parseComparison(): Node {
    const left = this.parseNot();

    for (const operator of ['==', '!=', '>=', '<=', '>', '<']) {
      if (this.match(operator)) {
        return { kind: 'binary', operator, left, right: this.parseNot() };
      }
    }

    // `in` and `not in`
    const token = this.peek();
    if (token.type === 'identifier' && token.value === 'in') {
      this.next();
      return { kind: 'binary', operator: 'in', left, right: this.parseNot() };
    }
    if (token.type === 'identifier' && token.value === 'not') {
      const save = this.position;
      this.next();
      const inToken = this.peek();
      if (inToken.type === 'identifier' && inToken.value === 'in') {
        this.next();
        return { kind: 'binary', operator: 'not in', left, right: this.parseNot() };
      }
      this.position = save;
    }

    return left;
  }

  private parseAdditive(): Node {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'operator' && (this.peek().value === '+' || this.peek().value === '-')) {
      const operator = this.next().value;
      left = { kind: 'binary', operator, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  private parseMultiplicative(): Node {
    let left = this.parseUnary();
    while (
      this.peek().type === 'operator' &&
      (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')
    ) {
      const operator = this.next().value;
      left = { kind: 'binary', operator, left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): Node {
    if (this.match('-')) {
      return { kind: 'unary', operator: '-', operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Node {
    const token = this.peek();

    if (token.type === 'number') {
      this.next();
      return { kind: 'literal', value: Number(token.value) };
    }

    if (token.type === 'string') {
      this.next();
      return { kind: 'literal', value: token.value };
    }

    if (token.type === 'identifier') {
      this.next();
      const lower = token.value.toLowerCase();
      if (lower === 'true') return { kind: 'literal', value: true };
      if (lower === 'false') return { kind: 'literal', value: false };
      if (lower === 'null') return { kind: 'literal', value: null };

      const segments = [token.value];
      while (this.peek().type === 'punctuation' && this.peek().value === '.') {
        this.next();
        const segment = this.next();
        if (segment.type !== 'identifier') {
          throw new ExpressionError('Expected a property name after "."', segment.position);
        }
        segments.push(segment.value);
      }
      return { kind: 'path', segments };
    }

    if (token.type === 'punctuation' && token.value === '(') {
      this.next();
      const node = this.parseOr();
      this.expect(')', 'punctuation');
      return node;
    }

    if (token.type === 'punctuation' && token.value === '[') {
      this.next();
      const elements: Node[] = [];
      if (!(this.peek().type === 'punctuation' && this.peek().value === ']')) {
        elements.push(this.parseOr());
        while (this.peek().type === 'punctuation' && this.peek().value === ',') {
          this.next();
          elements.push(this.parseOr());
        }
      }
      this.expect(']', 'punctuation');
      return { kind: 'array', elements };
    }

    throw new ExpressionError(
      `Unexpected token '${token.value || 'end of input'}'`,
      token.position
    );
  }
}

const truthy = (value: ExpressionValue): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const looseEqual = (left: ExpressionValue, right: ExpressionValue): boolean => {
  if (left === null || left === undefined) return right === null || right === undefined;
  if (right === null || right === undefined) return false;
  if (typeof left === 'number' || typeof right === 'number') {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) return false;
    return leftNumber === rightNumber;
  }
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    return truthy(left) === truthy(right);
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  if (typeof left === 'object' || typeof right === 'object') {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return String(left) === String(right);
};

const compare = (
  left: ExpressionValue,
  right: ExpressionValue
): number | null => {
  if (left === null || left === undefined || right === null || right === undefined) return null;
  if (typeof left === 'number' || typeof right === 'number') {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) return null;
    return leftNumber === rightNumber ? 0 : leftNumber < rightNumber ? -1 : 1;
  }
  if (typeof left === 'boolean' || typeof right === 'boolean') {
    const leftBoolean = truthy(left);
    const rightBoolean = truthy(right);
    return leftBoolean === rightBoolean ? 0 : leftBoolean ? 1 : -1;
  }
  const leftString = String(left);
  const rightString = String(right);
  return leftString === rightString ? 0 : leftString < rightString ? -1 : 1;
};

const resolvePath = (segments: string[], context: Record<string, any>): ExpressionValue => {
  let current: any = context;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;

    // Block prototype access so an expression cannot reach Object.prototype.
    if (segment === '__proto__' || segment === 'constructor' || segment === 'prototype') {
      return undefined;
    }

    current = current[segment];
  }

  return current as ExpressionValue;
};

const evaluateNode = (node: Node, context: Record<string, any>): ExpressionValue => {
  switch (node.kind) {
    case 'literal':
      return node.value;

    case 'path':
      return resolvePath(node.segments, context);

    case 'array':
      return node.elements.map((element) => evaluateNode(element, context));

    case 'unary': {
      const operand = evaluateNode(node.operand, context);
      if (node.operator === '!') return !truthy(operand);
      if (node.operator === '-') return -Number(operand || 0);
      throw new ExpressionError(`Unsupported unary operator '${node.operator}'`);
    }

    case 'binary': {
      const { operator } = node;

      // Short circuit the logical operators.
      if (operator === '&&') {
        return truthy(evaluateNode(node.left, context))
          ? truthy(evaluateNode(node.right, context))
          : false;
      }
      if (operator === '||') {
        return truthy(evaluateNode(node.left, context))
          ? true
          : truthy(evaluateNode(node.right, context));
      }

      const left = evaluateNode(node.left, context);
      const right = evaluateNode(node.right, context);

      switch (operator) {
        case '==':
          return looseEqual(left, right);
        case '!=':
          return !looseEqual(left, right);
        case '>':
        case '>=':
        case '<':
        case '<=': {
          const result = compare(left, right);
          if (result === null) return false;
          if (operator === '>') return result > 0;
          if (operator === '>=') return result >= 0;
          if (operator === '<') return result < 0;
          return result <= 0;
        }
        case 'in': {
          if (Array.isArray(right)) return right.some((entry) => looseEqual(entry, left));
          if (typeof right === 'string') return String(right).includes(String(left));
          // Object key membership, so a condition can ask whether a field is
          // present at all: `'closedDate' in doc`.
          if (right && typeof right === 'object') {
            return Object.prototype.hasOwnProperty.call(right, String(left));
          }
          return false;
        }
        case 'not in': {
          if (Array.isArray(right)) return !right.some((entry) => looseEqual(entry, left));
          if (typeof right === 'string') return !String(right).includes(String(left));
          if (right && typeof right === 'object') {
            return !Object.prototype.hasOwnProperty.call(right, String(left));
          }
          return true;
        }
        case '+': {
          if (typeof left === 'string' || typeof right === 'string') {
            return `${left ?? ''}${right ?? ''}`;
          }
          return Number(left || 0) + Number(right || 0);
        }
        case '-':
          return Number(left || 0) - Number(right || 0);
        case '*':
          return Number(left || 0) * Number(right || 0);
        case '/': {
          const divisor = Number(right || 0);
          // A division by zero yields null rather than throwing. Throwing
          // aborted the whole workflow run instead of making the condition
          // evaluate to false.
          if (divisor === 0) return null;
          return Number(left || 0) / divisor;
        }
        case '%': {
          const divisor = Number(right || 0);
          if (divisor === 0) return null;
          return Number(left || 0) % divisor;
        }
        default:
          throw new ExpressionError(`Unsupported operator '${operator}'`);
      }
    }

    default:
      throw new ExpressionError('Unsupported expression node');
  }
};

const parseCache = new Map<string, Node>();

/**
 * Parses an expression and returns its AST. Parsed expressions are cached
 * because a workflow condition is evaluated on every matching event.
 */
export const parseExpression = (expression: string): Node => {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new ExpressionError(
      `The expression is too long (maximum ${MAX_EXPRESSION_LENGTH} characters)`
    );
  }

  // The cache is keyed by a hash so a multi-kilobyte expression is not kept
  // in memory as a map key.
  const key = createHash('sha256').update(expression).digest('base64');
  const cached = parseCache.get(key);
  if (cached) return cached;

  const node = new Parser(tokenize(expression)).parse();

  if (parseCache.size > 500) parseCache.clear();
  parseCache.set(key, node);
  return node;
};

/**
 * Evaluates an expression against a context.
 *
 * @throws {ExpressionError} when the expression is malformed or the operation
 * is not defined for the given values.
 */
export const evaluateExpression = (
  expression: string,
  context: Record<string, any>
): ExpressionValue => evaluateNode(parseExpression(expression), context);

/**
 * Evaluates an expression as a boolean. A malformed expression is a hard
 * failure: silently treating it as `false` would hide a broken workflow.
 */
export const evaluateCondition = (
  expression: string,
  context: Record<string, any>
): boolean => {
  if (!expression || !expression.trim()) return true;
  return truthy(evaluateExpression(expression, context));
};

/**
 * Reports whether an expression is syntactically valid, without evaluating
 * it. Used by the workflow editor to validate a condition before saving.
 */
export const validateExpression = (
  expression: string
): { valid: boolean; error?: string } => {
  try {
    parseExpression(expression);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid expression',
    };
  }
};

/**
 * Interpolates `{{ path }}` placeholders in a string with values from a
 * context. Used for email subjects and message bodies.
 */
export const interpolate = (
  template: string,
  context: Record<string, any>
): string =>
  template.replace(/\{\{\s*([A-Za-z0-9_.$]+)\s*\}\}/g, (match, path: string) => {
    const value = resolvePath(path.split('.'), context);
    if (value === undefined || value === null) return match;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });

export default {
  evaluateExpression,
  evaluateCondition,
  validateExpression,
  interpolate,
  ExpressionError,
};
