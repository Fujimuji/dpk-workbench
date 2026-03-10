# Docs Index

This is the primary navigation entrypoint for maintainers and AI agents.

## Change By Task

| Task | Start Here | Primary Files |
| --- | --- | --- |
| Hax conversion semantics | `docs/conversion-rules.md` | `src/domain/import/hax/` |
| PM import parsing | `docs/domain-model.md` | `src/domain/import/pm/` |
| Workshop output rendering | `docs/rendering-rules.md` | `src/domain/render/` |
| Workspace interaction | `docs/ui-workspace.md` | `src/features/workspace/` |
| Graph layout and node identity | `docs/code-map.md` | `src/features/workspace/graph/` |
| Styling and shell layout | `docs/code-map.md` | `src/styles/` |
| Future direction and roadmap context | `docs/future-ideas.md` | `docs/` |

## Read In This Order

1. `docs/code-map.md`
2. `docs/change-playbooks.md`
3. `docs/future-ideas.md` for medium-term product and architecture context
4. Domain-specific docs (`conversion-rules`, `rendering-rules`, `domain-model`, `ui-workspace`)
5. Hax source-of-truth docs:
   - `Hax Framework - Effects.md`
   - `Hax Framework - Checkpoint Prime Number Switches.txt`
   - `Hax Framework - Missions.md`
   - `Hax Framework - Example Map Data.txt`

## Edit This When

- you need to decide where a change belongs
- you are handing the repo to another engineer or agent
- the source tree changes enough to invalidate current file ownership notes

## Files Owned

- `docs/index.md`
- `docs/code-map.md`
- `docs/change-playbooks.md`

## Tests That Must Stay Green

- `npm test`
- `npm run build`
