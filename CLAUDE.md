# SudokuPad – DarkReader Fix

TamperMonkey userscript that fixes DarkReader / dark-theme visual issues on SudokuPad (`sudokupad.app` and related domains) and adds quality-of-life features. Single file: `sudokupad-native-dark-mode.user.js`. Tested on Chrome + TamperMonkey + DarkReader.

## Project knowledge — read before substantive work
- [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md) — current state, architecture, features, terminology, testing setup, test-puzzle URLs.
- [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md) — what beats DarkReader and what doesn't, dead ends, removed features. **Check this before debugging a rendering issue** so we don't re-solve a solved problem.
- [`docs/Catalog/`](docs/Catalog/) — inventory of 1890 real puzzles + their render buckets, for predicting side effects of broad changes. **See "Cross-referencing the puzzle catalog" below before consulting it — query it, never read it into context.**
- [`docs/CATALOG_AUDIT.md`](docs/CATALOG_AUDIT.md) — open checklist of catalog buckets the script may not handle yet (Group A first; **fog last**). Resolve each to handled-or-acknowledged; record the decision inline as you go.
- [`docs/NATIVE_MODE_MIGRATION.md`](docs/NATIVE_MODE_MIGRATION.md) — **active work**: the migration off DarkReader onto SudokuPad's native dark mode (branch `native-mode`). Open functional TODOs + the DR-reference cleanup checklist. Read this if working on the `native-mode` branch.

**Finding code:** the script is one ~4,200-line IIFE with 120+ functions. Don't read the whole file — grep for the function name in the "Code map" (PROJECT_SUMMARY) and read only that region.

When you add, rename, or remove a function listed in the Code map — or add a new feature — update the Code map in the same change; keep it coarse (entry points per feature, not every helper).

**Record discoveries as you go (compaction-safe).** Conversation context is lost when it compacts; files are not. The moment you confirm a new fix, dead end, or non-obvious fact, fold it into `LESSONS_LEARNED.md` / `PROJECT_SUMMARY.md` — do not hold it only in the conversation. Record genuine discoveries, not routine progress. Every 5–10 sessions (or when it feels stale) rewrite `PROJECT_SUMMARY.md` fresh rather than appending. Git history is the changelog — don't keep narrative history in these docs. (`docs/archive/` holds the pre-2026-05-29 handoff file for human reference only; don't load it.)

## Standing instructions

### Cross-referencing the puzzle catalog (side-effect check)
`docs/Catalog/` inventories 1890 puzzles and the render buckets they contain, to predict whether a **broad change breaks other puzzles**. It is a tool to reach for *deliberately*, not by default — querying it sloppily or when it can't help wastes tokens (its whole point is to *save* the user from blind broad changes, so don't undermine that).

- **When to use it:** before a change that touches a **shared bucket** many puzzles have (`#arrows | path`, overlay rects, `#cell-colors`, kropki/`textbg`, cages) — i.e. not scoped to one puzzle. Query it to count affected puzzles, check the attribute-union for a variant that breaks your assumption, and pull 3–5 URLs to spot-check. **Don't** consult it for a single-puzzle tweak, a CSS/UI-only change, or anything that can't reach other puzzles.
- **How to use it without burning tokens — never read the files into context** (raw is 8 MB; union ~80k tokens). Always query via `python` and return only the small answer. **For the CSV use Python's `csv` module, never `awk -F,`/`grep`-by-column** — quoted commas in titles silently mis-align columns and give wrong counts. Exact query patterns + caveats: see **"Puzzle catalog"** in [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md).

### Version bumps
Bump `@version` in the `==UserScript==` header for every change — semver minor increments (e.g. 2.119.0 → 2.120.0). **Also bump the internal `SCRIPT_VERSION` constant (≈line 209) to match** — it drives `window.spdrVersion`, the only reliable "which build is live" signal in-browser. It silently drifted (stuck at 3.11.0 while the header advanced); keep them identical. A PostToolUse hook (`.claude/hooks/check_version_sync.py`) now blocks any edit that leaves them out of sync — so the drift can't recur silently.

### Distribution & dev environment
- These userscripts are hosted on public GitHub for **cross-machine update propagation** — that's a second reason the `@version` bump above is mandatory: a stale `@version` means no update is pushed to the user's other machines.
- Keep the `@updateURL` / `@downloadURL` headers pointing at the **raw GitHub URLs** so the managers can poll for updates.
- **Browser split:** edit in **ViolentMonkey on Brave**; test in **TamperMonkey on Chrome** (the Chrome/TM tab is the one driven in "Testing in Chrome" below).
- **LibreWolf** can't watch files on disk (no `FileSystemObserver`) — when using it, serve the script via the **localhost HTTP server** instead of a file path.
- Write functionality **fresh under the user's own name (VitaKaninen)** — don't derive from or copy existing third-party scripts.

### Testing in Chrome (standing permission)

**Diagnose freely; first "does it work now" check is the user's.** Connect to Chrome to diagnose whenever useful — don't ask. Flag upfront when the browser beats guessing (e.g. pixel-level rendering). Take your own screenshots; the cost is analysing them, not capturing, so user-pasted ones save nothing.

**Don't self-verify fixes in-browser.** Reload/inspect/screenshot round-trips are expensive. After committing, give a brief "done" and let the user run the first check — end the turn as **Clear to stop**, not Open. Pending testing isn't a loose end: don't hold the turn open for confirmation, and don't ask the user to confirm it works. Skip "what to expect" unless the result is genuinely non-obvious. Re-inspect only if the user reports it's still wrong or asks you to.

**Variant flips are self-serve; the DarkReader *extension* isn't.** Both scripts stay enabled in TamperMonkey, gated per-tab by `#variant=a|b` (see [PROJECT_SUMMARY](docs/PROJECT_SUMMARY.md) → Testing setup). Switch the live script yourself — don't ask: nav your tab to `#variant=a` (DarkReader Fix 2.x) or `#variant=b` (Native 3.x). ⚠️ Hash-only nav does NOT reload — the userscript keeps running the OLD variant. Force a reload (`location.reload()` or nav to the bare URL), *then* re-check `window.spdrVersion`/`spdrEdition`; never trust state read right after the hash nav. Plain visual comparison → ask (via popup) for a screenshot. Drive the flip yourself only when you need computed values (exact `rgb()`, border widths). DarkReader extension on/off is the one state you can't set — ask the user. (`spdrEdition`: `'native'` vs absent; `spdrVersion`: 2.x vs 3.x.)

**Stale TamperMonkey version → ask, don't give up.** If after reload `window.spdrVersion` is still older than the repo's `@version`, don't work around it or proceed against the old script. Use `AskUserQuestion` with one option "Try again", e.g. "TamperMonkey still serving stale vX.Y.Z (repo is vA.B.C). I'll wait while you reload the tracking tab." "Try again" means they expect it fixed → reload and re-check. Still stale → ask the same question again. Repeat until versions match; deviate only on a write-in.
