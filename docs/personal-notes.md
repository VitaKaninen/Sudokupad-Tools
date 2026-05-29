# SudokuPad Fix — Personal Dev Notes

*Moved out of LESSONS_LEARNED.md so it is not loaded into every session. Personal reference, not session-critical script knowledge.*

## Features removed — don't re-add without a new reason

- **Rounded selection-border corners** (prototyped v2.114, dropped): `stroke-linejoin: round` rounds only the *convex* side of the stroke — which is the unselected side for outer subpaths but the body side for holes — so one setting can't round "inside" and "outside" independently. Would need per-subpath `<path>` elements or a custom fill-rendered border. Full code + notes in `snippets/rounding-experiment.md`.
- **Rules-dialog auto-dismiss** (added v2.91, removed v2.106): SudokuPad's dialog API kept changing; not worth maintaining.
- **Elapsed-time version display** ("vX.Y.Z · 5m ago", dropped v2.103): the manual `SCRIPT_UPDATE_TIME` constant was easy to forget and often ended up in the future showing `0:00`. Replaced by `window.spdrVersion`.

## Environment gotchas

- **LibreWolf / Firefox modifier keys:** `privacy.fingerprintingProtection` suppresses standalone modifier keydown events (the target is **`WidgetEvents`**, *not* `KeyboardEvents` despite the name), which breaks SudokuPad's hold-Shift/Ctrl/Alt mode toggle. This is a SudokuPad-vs-Firefox issue, not ours. Fix: a per-site entry in `privacy.fingerprintingProtection.granularOverrides` — `{"firstPartyDomain":"sudokupad.app","overrides":"-WidgetEvents","isBaseline":false}` (add more for the other domains). Requires a LibreWolf restart; a tab reload is not enough.
- **BLOCKED_EVENTS passthrough** (v2.107): our capture-phase listener `stopImmediatePropagation()`s pointer/touch/key events whose target is inside our UI panel, but it must let `Escape / Shift / Control / Alt / Meta` through (the `ALLOWED_KEYS` short-circuit) — otherwise SudokuPad's mode toggles break while focus is parked on our buttons.
