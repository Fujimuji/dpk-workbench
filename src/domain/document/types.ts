import type { MomentumMapModel } from '@/domain/model/types';
import type { HaxDocument } from '@/domain/import/hax/types';

export interface MomentumDocument {
  format: 'momentum';
  map: MomentumMapModel;
}

export type WorkspaceDocument = HaxDocument | MomentumDocument;

export function isHaxDocument(document: WorkspaceDocument | null): document is HaxDocument {
  return Boolean(document && document.format === 'hax');
}

export function isMomentumDocument(document: WorkspaceDocument | null): document is MomentumDocument {
  return Boolean(document && document.format === 'momentum');
}

export function getDocumentDisplayName(document: WorkspaceDocument | null): string {
  if (!document) {
    return 'Workshop';
  }

  return document.format === 'hax' ? 'Hax Framework' : 'Project Momentum';
}
