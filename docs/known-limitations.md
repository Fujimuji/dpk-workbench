# Known Limitations

- No reverse conversion from Project Momentum back to Hax
- No multi-bot support per checkpoint slot
- Final checkpoints do not support gameplay config
- Hax conversion warnings are import-time notes and are not auto-resolved after manual edits
- The structure map is an abstract freeform editor surface; node placement is editor-only and is never written into PM output
- Node placement is kept in memory only for now and does not persist across page reloads
- The app is desktop-first; smaller layouts are supported, but not the primary target
