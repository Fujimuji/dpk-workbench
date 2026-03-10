import { useContext } from 'react';
import { WorkspaceSessionContext } from '@/app/WorkspaceSessionContext';

export function useSessionState() {
  const session = useContext(WorkspaceSessionContext);
  if (!session) {
    throw new Error('useSessionState must be used within WorkspaceSessionProvider.');
  }

  return session;
}
