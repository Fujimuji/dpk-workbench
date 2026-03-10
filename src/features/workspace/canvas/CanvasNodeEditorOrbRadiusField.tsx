interface CanvasNodeEditorOrbRadiusFieldProps {
  onChange: (value: number) => void;
  value: number;
}

export function CanvasNodeEditorOrbRadiusField({
  onChange,
  value
}: CanvasNodeEditorOrbRadiusFieldProps) {
  return (
    <label className="field-stack">
      <span>Radius</span>
      <input
        className="workspace-input"
        min={0}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        type="number"
        value={value}
      />
    </label>
  );
}
