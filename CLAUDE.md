# SudokuPad – DarkReader Fix

TamperMonkey userscript that fixes DarkReader / dark-theme visual issues on SudokuPad (`sudokupad.app` and related domains) and adds quality-of-life features. Single file: `sudokupad-darkreader-fix.user.js`. Tested on Chrome + TamperMonkey + DarkReader.

## Project knowledge — read before substantive work
- [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md) — current state, architecture, features, terminology, testing setup, test-puzzle URLs.
- [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md) — what beats DarkReader and what doesn't, dead ends, removed features. **Check this before debugging a rendering issue** so we don't re-solve a solved problem.

**Finding code:** the script is one ~4,200-line IIFE with 120+ functions. Don't read the whole file — grep for the function name in the "Code map" (PROJECT_SUMMARY) and read only that region.

When you add, rename, or remove a function listed in the Code map — or add a new feature — update the Code map in the same change; keep it coarse (entry points per feature, not every helper).

**Record discoveries as you go (compaction-safe).** Conversation context is lost when it compacts; files are not. The moment you confirm a new fix, dead end, or non-obvious fact, append it to `docs/WIP.md` — do not hold it only in the conversation. Mark uncertain items `(tentative)`. **At session start, if `docs/WIP.md` has notes, fold the confirmed ones into `LESSONS_LEARNED.md` / `PROJECT_SUMMARY.md` and clear WIP**; finalize the same way at session end. Record genuine discoveries, not routine progress. Every 5–10 sessions (or when it feels stale) rewrite `PROJECT_SUMMARY.md` fresh rather than appending. Git history is the changelog — don't keep narrative history in these docs. (`docs/archive/` holds the pre-2026-05-29 handoff file for human reference only; don't load it.)

## Standing instructions

### Commit + push after every edit
After every version bump, immediately and without asking:
1. `git add sudokupad-darkreader-fix.user.js` (and any docs you changed)
2. `git commit -m "vX.Y.Z: <short description>"`
3. `git push`

### Version bumps
Bump `@version` in the `==UserScript==` header for every change — semver minor increments (e.g. 2.119.0 → 2.120.0).

### Testing in Chrome (standing permission)
Connect Claude in Chrome any time it would help — don't ask. **Always `location.reload()` before inspecting** (DOM reads, screenshots): the user refreshes all tabs after edits, so the MCP tab may be stale. Say upfront when the browser tool would give a better answer (e.g. pixel-level rendering issues) instead of guessing.
