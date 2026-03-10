import { parseHaxWorkshop } from '@/domain/import/hax/parseHaxWorkshop';
import { parseMomentumWorkshop } from '@/domain/import/pm/parseMomentumWorkshop';
import { detectSourceFormat } from '@/app/detectSourceFormat';
import type { WorkspaceDocument } from '@/domain/document/types';
import type { ConversionWarning } from '@/domain/warnings/types';

export interface ImportedSourceText {
  document: WorkspaceDocument;
  warnings: ConversionWarning[];
}

export function importSourceText(input: string): ImportedSourceText {
  const sourceFormat = detectSourceFormat(input);

  if (sourceFormat === 'hax') {
    return {
      document: parseHaxWorkshop(input),
      warnings: []
    };
  }

  return {
    document: {
      format: 'momentum',
      map: parseMomentumWorkshop(input)
    },
    warnings: []
  };
}
