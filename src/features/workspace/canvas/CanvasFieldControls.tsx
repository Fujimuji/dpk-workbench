import type { DraftVec3, Vec3 } from '@/domain/model/types';

export function ToggleSwitch({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row toggle-row-compact">
      <span className="toggle-row-copy">{label}</span>
      <span className="toggle-switch">
        <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
        <span className="toggle-switch-track">
          <span className="toggle-switch-thumb" />
        </span>
      </span>
    </label>
  );
}

export function VectorField({
  label: _label,
  value,
  onChange
}: {
  label: string;
  value: Vec3;
  onChange: (value: Vec3) => void;
}) {
  const update = (axis: keyof Vec3, nextValue: number) => {
    if (Number.isNaN(nextValue)) {
      return;
    }

    onChange({ ...value, [axis]: nextValue });
  };

  return (
    <div className="canvas-node-tab-panel">
      <div className="vector-grid">
        <label className="field-stack">
          <span>X</span>
          <input
            className="workspace-input"
            inputMode="decimal"
            onChange={(event) => update('x', Number(event.target.value))}
            type="text"
            value={value.x}
          />
        </label>
        <label className="field-stack">
          <span>Y</span>
          <input
            className="workspace-input"
            inputMode="decimal"
            onChange={(event) => update('y', Number(event.target.value))}
            type="text"
            value={value.y}
          />
        </label>
        <label className="field-stack">
          <span>Z</span>
          <input
            className="workspace-input"
            inputMode="decimal"
            onChange={(event) => update('z', Number(event.target.value))}
            type="text"
            value={value.z}
          />
        </label>
      </div>
    </div>
  );
}

export function DraftPositionField({
  label: _label,
  value,
  onChange
}: {
  label: string;
  value: DraftVec3;
  onChange: (value: DraftVec3) => void;
}) {
  const update = (axis: keyof DraftVec3, nextValue: string) => {
    if (nextValue.trim() === '') {
      onChange({ ...value, [axis]: null });
      return;
    }

    const parsed = Number(nextValue);
    if (Number.isNaN(parsed)) {
      return;
    }

    onChange({ ...value, [axis]: parsed });
  };

  return (
    <div className="canvas-node-tab-panel">
      <div className="vector-grid">
        <label className="field-stack">
          <span>X</span>
          <input
            className="workspace-input"
            inputMode="decimal"
            onChange={(event) => update('x', event.target.value)}
            placeholder="Required"
            type="text"
            value={value.x ?? ''}
          />
        </label>
        <label className="field-stack">
          <span>Y</span>
          <input
            className="workspace-input"
            inputMode="decimal"
            onChange={(event) => update('y', event.target.value)}
            placeholder="Required"
            type="text"
            value={value.y ?? ''}
          />
        </label>
        <label className="field-stack">
          <span>Z</span>
          <input
            className="workspace-input"
            inputMode="decimal"
            onChange={(event) => update('z', event.target.value)}
            placeholder="Required"
            type="text"
            value={value.z ?? ''}
          />
        </label>
      </div>
    </div>
  );
}

export function NullableNumberField({
  label,
  min,
  value,
  onChange
}: {
  label: string;
  min?: number;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="canvas-node-field-row">
      <label className="field-stack canvas-node-field-main">
        <span>{label}</span>
        <input
          className="workspace-input"
          min={min}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue === '') {
              onChange(null);
              return;
            }
            const parsed = Number(nextValue);
            if (!Number.isNaN(parsed)) {
              onChange(min !== undefined ? Math.max(min, parsed) : parsed);
            }
          }}
          type="number"
          value={value ?? ''}
        />
      </label>
      <button className="button button-ghost button-mini field-reset-button" onClick={() => onChange(null)} type="button">
        Reset
      </button>
    </div>
  );
}
