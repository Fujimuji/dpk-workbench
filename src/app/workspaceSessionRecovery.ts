import {
  parseWorkspaceSessionSnapshot,
  serializeWorkspaceSessionSnapshot,
  type WorkspaceSessionSnapshot
} from '@/app/workspaceSessionSnapshot';

export const WORKSPACE_SESSION_RECOVERY_STORAGE_KEY = 'parkour-data-converter.workspace-recovery';

interface StorageLike {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

function getRecoveryStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readWorkspaceSessionRecoverySnapshot(storage?: StorageLike): WorkspaceSessionSnapshot | null {
  const recoveryStorage = getRecoveryStorage(storage);
  if (!recoveryStorage) {
    return null;
  }

  const rawValue = recoveryStorage.getItem(WORKSPACE_SESSION_RECOVERY_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  return parseWorkspaceSessionSnapshot(rawValue);
}

export function writeWorkspaceSessionRecoverySnapshot(
  snapshot: WorkspaceSessionSnapshot,
  storage?: StorageLike
): boolean {
  const recoveryStorage = getRecoveryStorage(storage);
  if (!recoveryStorage) {
    return false;
  }

  try {
    recoveryStorage.setItem(
      WORKSPACE_SESSION_RECOVERY_STORAGE_KEY,
      serializeWorkspaceSessionSnapshot(snapshot)
    );
    return true;
  } catch {
    return false;
  }
}

export function clearWorkspaceSessionRecoverySnapshot(storage?: StorageLike): boolean {
  const recoveryStorage = getRecoveryStorage(storage);
  if (!recoveryStorage) {
    return false;
  }

  try {
    recoveryStorage.removeItem(WORKSPACE_SESSION_RECOVERY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
