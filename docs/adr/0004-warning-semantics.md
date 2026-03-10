# ADR 0004: Warnings Are Import Notes

## Context

Warnings describe what happened during Hax -> PM conversion, but users may edit the PM model afterward.

## Decision

Treat warnings as import notes:

- generated during import
- stored alongside the map session
- not auto-resolved by later edits

## Consequences

- Warning text should describe completed import actions
- The app does not attempt live semantic reconciliation of old warnings
- Agents should not "fix" this by auto-hiding notes after edits without an explicit product change

## Revisit If

- The app adds a real live validation system distinct from import notes
