# Contributing

## Local Workflow

```bash
npm install
npm run dev
npm test
npm run build
```

## Before You Change Logic

- Read `AGENTS.md`
- Read `docs/index.md`
- Read `docs/conversion-rules.md` before touching converter logic
- Read `docs/rendering-rules.md` before touching Workshop output generation
- Read `docs/domain-model.md` before changing types or editor-state helpers
- Read `docs/ui-workspace.md` before changing workspace or inspector interactions

## Source Layout Rules

- `src/app` is orchestration only
- `src/domain` owns canonical model and import/render semantics
- `src/features/workspace` owns editor-only behavior
- `src/shared` owns cross-cutting utilities without workflow semantics
- `src/lib` and `src/components` may still contain migration facades; do not add new primary logic there unless you are finishing a move

## Update Docs When Semantics Change

Update documentation if you change:

- Hax -> PM mapping rules
- warning behavior
- output rendering shape
- core model invariants
- workspace interaction rules
- intentional limitations

## Root Reference Files

The root `.txt` / `.md` reference files are part of the domain truth. Do not treat them as disposable examples.

## Commit Hygiene

- Keep commits focused
- Do not mix large semantic changes with unrelated UI cleanup
- Run `npm test` and `npm run build` before finishing
- Prefer moving logic behind compatibility facades before deleting legacy paths
