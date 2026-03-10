import { ParseError } from '@/shared/errors/AppError';

function hasAll(input: string, fragments: string[]): boolean {
  return fragments.every((fragment) => input.includes(fragment));
}

export function detectSourceFormat(input: string): 'hax' | 'momentum' {
  const hasMomentumSignature = hasAll(input, [
    'Global.start',
    'Global.c_levelData',
    'Global.c_checkpointVectors'
  ]);
  const hasHaxSignature = hasAll(input, ['Global.CPposition', 'Global.Prime', 'Global.Effect']);

  if (hasMomentumSignature) {
    return 'momentum';
  }

  if (hasHaxSignature) {
    return 'hax';
  }

  throw new ParseError(
    'unsupported_source',
    'The input did not match supported Hax Framework or Project Momentum source patterns.'
  );
}
