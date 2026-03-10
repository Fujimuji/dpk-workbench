import { createContext, type ReactNode } from 'react';
import type { WorkspaceSessionApi } from '@/app/useWorkspaceSession';

export const WorkspaceSessionContext = createContext<WorkspaceSessionApi | null>(null);

interface WorkspaceSessionProviderProps {
  children: ReactNode;
  session: WorkspaceSessionApi;
}

export function WorkspaceSessionProvider({ children, session }: WorkspaceSessionProviderProps) {
  return <WorkspaceSessionContext.Provider value={session}>{children}</WorkspaceSessionContext.Provider>;
}
