import {
  Cable,
  Crosshair,
  DoorOpen,
  FlagTriangleRight,
  Flame,
  Ghost,
  Hand,
  ListChecks,
  Orbit,
  Route,
  Shapes,
  Skull,
  Sparkles,
  Timer,
  Zap
} from 'lucide-react';
import type { EditorNodeIconKey, EditorNodeKind } from '@/features/workspace/graph/types';

function renderCustomIcon(iconKey: EditorNodeIconKey) {
  switch (iconKey) {
    case 'haxTime':
      return <Timer aria-hidden="true" className="button-icon" />;
    case 'haxDeath':
      return <Skull aria-hidden="true" className="button-icon" />;
    case 'haxAbility':
      return <Zap aria-hidden="true" className="button-icon" />;
    case 'haxPermeation':
      return <Ghost aria-hidden="true" className="button-icon" />;
    case 'haxCheckpoint':
      return <FlagTriangleRight aria-hidden="true" className="button-icon" />;
    case 'haxPortal':
      return <DoorOpen aria-hidden="true" className="button-icon" />;
    case 'haxBlackhole':
      return <Orbit aria-hidden="true" className="button-icon" />;
    case 'haxZipline':
      return <Cable aria-hidden="true" className="button-icon" />;
    case 'haxShootableOrb':
      return <Crosshair aria-hidden="true" className="button-icon" />;
    case 'haxBounce':
      return <Sparkles aria-hidden="true" className="button-icon" />;
  }
}

export function NodeIcon({ kind, iconKey }: { kind: EditorNodeKind; iconKey?: EditorNodeIconKey }) {
  if (iconKey) {
    return renderCustomIcon(iconKey);
  }

  switch (kind) {
    case 'touchOrb':
    case 'touchStack':
      return <Hand aria-hidden="true" className="button-icon" />;
    case 'abilityOrb':
    case 'abilityStack':
      return <Zap aria-hidden="true" className="button-icon" />;
    case 'lavaOrb':
    case 'lavaStack':
      return <Flame aria-hidden="true" className="button-icon" />;
    case 'bot':
      return <Crosshair aria-hidden="true" className="button-icon" />;
    case 'impulse':
      return <Sparkles aria-hidden="true" className="button-icon" />;
    case 'portal':
      return <DoorOpen aria-hidden="true" className="button-icon" />;
    case 'momentumEntities':
      return <Shapes aria-hidden="true" className="button-icon" />;
    case 'haxEffects':
      return <Sparkles aria-hidden="true" className="button-icon" />;
    case 'haxMissions':
    case 'haxMission':
      return <ListChecks aria-hidden="true" className="button-icon" />;
    case 'haxEffect':
      return <Sparkles aria-hidden="true" className="button-icon" />;
    case 'haxEffectPair':
      return <Route aria-hidden="true" className="button-icon" />;
    case 'haxEffectStack':
      return <Route aria-hidden="true" className="button-icon" />;
    default:
      return null;
  }
}
