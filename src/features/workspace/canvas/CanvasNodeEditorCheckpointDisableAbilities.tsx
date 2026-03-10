import { updateCheckpointConfig } from '@/domain/model/mutators';
import type { AbilityFlags, MomentumMapModel } from '@/domain/model/types';
import { ToggleSwitch } from '@/features/workspace/canvas/CanvasFieldControls';

interface CanvasNodeEditorCheckpointDisableAbilitiesProps {
  config: NonNullable<MomentumMapModel['levels'][number]['checkpointConfigs'][number]>;
  levelIndex: number;
  checkpointIndex: number;
  map: MomentumMapModel;
  onMapChange: (map: MomentumMapModel) => void;
}

function updateDisableAbilities(
  map: MomentumMapModel,
  levelIndex: number,
  checkpointIndex: number,
  nextFlags: AbilityFlags,
  onMapChange: (map: MomentumMapModel) => void
) {
  onMapChange(
    updateCheckpointConfig(map, levelIndex, checkpointIndex, {
      disableAbilities: nextFlags.seismicSlam || nextFlags.powerblock || nextFlags.rocketPunch ? nextFlags : null
    })
  );
}

export function CanvasNodeEditorCheckpointDisableAbilities({
  config,
  levelIndex,
  checkpointIndex,
  map,
  onMapChange
}: CanvasNodeEditorCheckpointDisableAbilitiesProps) {
  return (
    <div className="flag-grid">
      <ToggleSwitch
        checked={config.disableAbilities?.seismicSlam ?? false}
        label="Disable Seismic Slam"
        onChange={(value) =>
          updateDisableAbilities(
            map,
            levelIndex,
            checkpointIndex,
            {
              seismicSlam: value,
              powerblock: config.disableAbilities?.powerblock ?? false,
              rocketPunch: config.disableAbilities?.rocketPunch ?? false
            },
            onMapChange
          )
        }
      />
      <ToggleSwitch
        checked={config.disableAbilities?.powerblock ?? false}
        label="Disable Powerblock"
        onChange={(value) =>
          updateDisableAbilities(
            map,
            levelIndex,
            checkpointIndex,
            {
              seismicSlam: config.disableAbilities?.seismicSlam ?? false,
              powerblock: value,
              rocketPunch: config.disableAbilities?.rocketPunch ?? false
            },
            onMapChange
          )
        }
      />
      <ToggleSwitch
        checked={config.disableAbilities?.rocketPunch ?? false}
        label="Disable Rocket Punch"
        onChange={(value) =>
          updateDisableAbilities(
            map,
            levelIndex,
            checkpointIndex,
            {
              seismicSlam: config.disableAbilities?.seismicSlam ?? false,
              powerblock: config.disableAbilities?.powerblock ?? false,
              rocketPunch: value
            },
            onMapChange
          )
        }
      />
    </div>
  );
}
