import type { Vec3 } from '@/domain/model/types';
import { ParseError } from '@/shared/errors/AppError';

export type WorkshopValue = number | boolean | null | Vec3 | WorkshopValue[];

class ValueParser {
  private readonly input: string;
  private index = 0;

  constructor(input: string) {
    this.input = input;
  }

  parse(): WorkshopValue {
    const value = this.parseValue();
    this.skipWhitespace();
    if (this.index !== this.input.length) {
      throw new ParseError('invalid_syntax', `Unexpected token near "${this.input.slice(this.index, this.index + 12)}".`);
    }
    return value;
  }

  private parseValue(): WorkshopValue {
    this.skipWhitespace();

    if (this.index >= this.input.length) {
      throw new ParseError('invalid_syntax', 'Unexpected end of expression.');
    }

    const char = this.input[this.index];

    if (char === '-' || isDigit(char)) {
      return this.parseNumber();
    }

    if (isIdentifierStart(char)) {
      const identifier = this.parseIdentifier();

      if (identifier === 'True') {
        return true;
      }

      if (identifier === 'False') {
        return false;
      }

      if (identifier === 'Null') {
        return null;
      }

      if (identifier === 'Array') {
        return this.parseArray();
      }

      if (identifier === 'Vector') {
        return this.parseVector();
      }

      if (identifier === 'Up') {
        return { x: 0, y: 1, z: 0 };
      }

      if (identifier === 'Down') {
        return { x: 0, y: -1, z: 0 };
      }

      if (identifier === 'Left') {
        return { x: -1, y: 0, z: 0 };
      }

      if (identifier === 'Right') {
        return { x: 1, y: 0, z: 0 };
      }

      throw new ParseError('invalid_syntax', `Unsupported identifier "${identifier}".`);
    }

    throw new ParseError('invalid_syntax', `Unexpected character "${char}".`);
  }

  private parseArray(): WorkshopValue[] {
    this.expect('(');
    const items: WorkshopValue[] = [];
    this.skipWhitespace();

    if (this.peek() === ')') {
      this.index += 1;
      return items;
    }

    while (true) {
      items.push(this.parseValue());
      this.skipWhitespace();

      const next = this.peek();
      if (next === ',') {
        this.index += 1;
        continue;
      }

      if (next === ')') {
        this.index += 1;
        break;
      }

      throw new ParseError('invalid_syntax', 'Expected "," or ")" in Array().');
    }

    return items;
  }

  private parseVector(): Vec3 {
    this.expect('(');
    const x = this.parseValue();
    this.expectComma();
    const y = this.parseValue();
    this.expectComma();
    const z = this.parseValue();
    this.skipWhitespace();
    this.expect(')');

    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
      throw new ParseError('invalid_syntax', 'Vector() must contain numeric components.');
    }

    return { x, y, z };
  }

  private parseNumber(): number {
    const start = this.index;

    if (this.input[this.index] === '-') {
      this.index += 1;
    }

    while (isDigit(this.peek())) {
      this.index += 1;
    }

    if (this.peek() === '.') {
      this.index += 1;
      while (isDigit(this.peek())) {
        this.index += 1;
      }
    }

    const raw = this.input.slice(start, this.index);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new ParseError('invalid_syntax', `Invalid number "${raw}".`);
    }

    return parsed;
  }

  private parseIdentifier(): string {
    const start = this.index;
    while (isIdentifierPart(this.peek())) {
      this.index += 1;
    }
    return this.input.slice(start, this.index);
  }

  private expect(char: string): void {
    this.skipWhitespace();
    if (this.peek() !== char) {
      throw new ParseError('invalid_syntax', `Expected "${char}".`);
    }
    this.index += 1;
  }

  private expectComma(): void {
    this.skipWhitespace();
    if (this.peek() !== ',') {
      throw new ParseError('invalid_syntax', 'Expected ",".');
    }
    this.index += 1;
  }

  private skipWhitespace(): void {
    while (this.index < this.input.length && /\s/.test(this.input[this.index])) {
      this.index += 1;
    }
  }

  private peek(): string {
    return this.input[this.index] ?? '';
  }
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

export function parseWorkshopValue(input: string): WorkshopValue {
  return new ValueParser(input).parse();
}

export function extractActionsBlock(input: string): string {
  const markerIndex = input.indexOf('actions');
  if (markerIndex === -1) {
    throw new ParseError('missing_actions', 'The Workshop input is missing an actions block.');
  }

  const openingBrace = input.indexOf('{', markerIndex);
  if (openingBrace === -1) {
    throw new ParseError('missing_actions', 'The actions block is malformed.');
  }

  let depth = 0;
  for (let index = openingBrace; index < input.length; index += 1) {
    const char = input[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return input.slice(openingBrace + 1, index);
      }
    }
  }

  throw new ParseError('missing_actions', 'The actions block is not closed.');
}

export function extractAssignment(actionsBlock: string, identifier: string): string {
  const startIndex = actionsBlock.indexOf(identifier);
  if (startIndex === -1) {
    throw new ParseError('missing_assignment', `Missing assignment for ${identifier}.`);
  }

  let index = startIndex + identifier.length;
  while (index < actionsBlock.length && /\s/.test(actionsBlock[index])) {
    index += 1;
  }

  if (actionsBlock[index] !== '=') {
    throw new ParseError('missing_assignment', `Malformed assignment for ${identifier}.`);
  }

  index += 1;
  while (index < actionsBlock.length && /\s/.test(actionsBlock[index])) {
    index += 1;
  }

  const expressionStart = index;
  let depth = 0;

  for (; index < actionsBlock.length; index += 1) {
    const char = actionsBlock[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth < 0) {
        throw new ParseError('invalid_syntax', `Unbalanced expression for ${identifier}.`);
      }
    } else if (char === ';' && depth === 0) {
      return actionsBlock.slice(expressionStart, index).trim();
    }
  }

  throw new ParseError('missing_assignment', `Could not find the end of ${identifier}.`);
}
