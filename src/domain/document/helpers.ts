import { convertHaxToMomentum } from '@/domain/import/hax/convertHaxToMomentum';
import type { HaxDocument } from '@/domain/import/hax/types';
import type { MomentumMapModel } from '@/domain/model/types';
import { renderHaxWorkshop } from '@/domain/render/renderHaxWorkshop';
import { renderMomentumWorkshop } from '@/domain/render/renderMomentumWorkshop';
import type { ConversionWarning } from '@/domain/warnings/types';
import type { WorkspaceDocument } from '@/domain/document/types';

export function projectDocumentToMomentumMap(document: WorkspaceDocument | null): MomentumMapModel | null {
  if (!document) {
    return null;
  }

  return document.format === 'momentum' ? document.map : convertHaxToMomentum(document).model;
}

export function getDocumentProjectionWarnings(document: WorkspaceDocument | null): ConversionWarning[] {
  if (!document || document.format === 'momentum') {
    return [];
  }

  return convertHaxToMomentum(document).warnings;
}

export function renderDocumentOutput(document: WorkspaceDocument | null): string {
  if (!document) {
    return '';
  }

  return document.format === 'momentum' ? renderMomentumWorkshop(document.map) : renderHaxWorkshop(document);
}

export function convertHaxDocumentToMomentumDocument(document: HaxDocument): {
  document: WorkspaceDocument;
  warnings: ConversionWarning[];
} {
  const result = convertHaxToMomentum(document);
  return {
    document: {
      format: 'momentum',
      map: result.model
    },
    warnings: result.warnings
  };
}
