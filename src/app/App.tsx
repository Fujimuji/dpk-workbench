import { MotionConfig } from 'motion/react';
import { WORKSPACE_EXAMPLE_INPUTS } from '@/app/examples';
import { WorkspaceSessionProvider } from '@/app/WorkspaceSessionContext';
import { useThemePreference } from '@/app/useThemePreference';
import { useWorkspaceSession } from '@/app/useWorkspaceSession';
import { WorkspaceShell } from '@/features/workspace/shell/WorkspaceShell';

export default function App() {
  const session = useWorkspaceSession(WORKSPACE_EXAMPLE_INPUTS);
  const theme = useThemePreference();

  return (
    <MotionConfig reducedMotion="user">
      <WorkspaceSessionProvider session={session}>
        <WorkspaceShell theme={theme} />
      </WorkspaceSessionProvider>
    </MotionConfig>
  );
}
