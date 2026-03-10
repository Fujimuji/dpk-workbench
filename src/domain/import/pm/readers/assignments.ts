import { ParseError } from '@/shared/errors/AppError';
import { parseWorkshopValue, type WorkshopValue } from '@/shared/workshop/workshopValues';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function readBalancedExpression(
  source: string,
  startIndex: number,
  label: string
): { expression: string; nextIndex: number } {
  let index = startIndex;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  const expressionStart = index;
  let depth = 0;

  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth < 0) {
        throw new ParseError('invalid_syntax', `Unbalanced expression for ${label}.`);
      }
    } else if (char === ';' && depth === 0) {
      return {
        expression: source.slice(expressionStart, index).trim(),
        nextIndex: index + 1
      };
    }
  }

  throw new ParseError('missing_assignment', `Could not find the end of ${label}.`);
}

export function readParsedIndexedValue(assignments: Map<number, string>, levelKey: number): WorkshopValue | null {
  const expression = assignments.get(levelKey);
  if (!expression) {
    return null;
  }

  return parseWorkshopValue(expression);
}

export function collectIndexedAssignments(actionsBlock: string, prefix: string): Map<number, string> {
  const assignments = new Map<number, string>();
  const pattern = new RegExp(`${escapeRegExp(prefix)}\\[(\\d+)\\]\\s*=`, 'g');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(actionsBlock))) {
    const levelKey = Number(match[1]);
    if (!Number.isInteger(levelKey) || assignments.has(levelKey)) {
      continue;
    }

    const { expression } = readBalancedExpression(actionsBlock, pattern.lastIndex, `${prefix}[${levelKey}]`);
    assignments.set(levelKey, expression);
  }

  return assignments;
}

export function unescapeWorkshopString(value: string): string {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}
