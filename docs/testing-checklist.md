# Testing Checklist

## Required Validation

Run these after changes:

```bash
npm test
npm run build
```

## Manual Checks After UI Changes

- `Use Example` loads and converts immediately
- map still pans and zooms
- inspector still resizes
- selecting a map node still updates the inspector
- copy output still works
- status bar still reflects current state/messages

## Manual Checks After Converter Changes

- Hax example parses successfully
- imported Hax conversion warnings still read correctly
- unsupported Hax effects still produce warnings
- output still matches expected Workshop style

## Manual Checks After Model Changes

- finish checkpoints still do not expose gameplay config
- `checkpointConfigs.length` still matches `checkpoints.length - 1`
- nullable numeric fields can be reset to `null`
- bot ability ordering is still correct

## Manual Checks After Renderer Changes

- `Null` vs `Array(...)` behavior still matches current conventions
- touch / ability / lava nested arrays still render correctly
- liquid checkpoints still render `True` / `Null`, not `False`
- bot output still renders only one bot per slot
