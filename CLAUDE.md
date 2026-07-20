# Sudoku Tools (SudokuPad userscript)

TamperMonkey userscript (`@name` "Sudoku Tools", renamed from "SudokuPad – Native Dark Mode" in v3.66) for SudokuPad (`sudokupad.app` and related domains): quality-of-life features (constraint validators, auto-fill, pencilmark actions, region colouring/shading) on top of a dark-theme substrate — it locks DarkReader out of the page and runs a self-owned frozen copy of SudokuPad's native dark mode, then fixes the gaps that leaves. Single file: `Sudokupad-Tools.user.js`. Tested on Chrome + TamperMonkey. (The 2.x DarkReader-fighting predecessor was retired 2026-07; it lives only in git history before the `native-mode` merge.)

## Project knowledge — read before substantive work
- [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md) — current state, architecture, features, terminology, testing setup, test-puzzle URLs.
- [`docs/VALIDATORS.md`](docs/VALIDATORS.md) — the Validate-Constraints subsystem in full: architecture, per-validator notes, detection layers, ambiguity policy, the candidate-elimination contract. Read it before touching any validator.
- [`docs/LESSONS_LEARNED.md`](docs/LESSONS_LEARNED.md) — what beats DarkReader and what doesn't, dead ends, removed features. **Check this before debugging a rendering issue** so we don't re-solve a solved problem.
- **The puzzle catalog** lives in its own project: [`..\..\Sudokupad Catalog\`](../../Sudokupad%20Catalog/) (`C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad Catalog`). Its `classify/` folder is the tag catalog this repo queries — 6,260 real puzzles hand-classified by 100 semantic tags (fog, killer_cage, whisper, renban, …); use it to pull examples by tag/keyword and to predict side effects of broad changes. **See "Cross-referencing the puzzle catalog" below — query it, never read it into context.** (Moved 2026-07-04 from `Tamper Monkey Extraction/cowork-classify`, now deleted; the old `docs/Catalog/` bucket dump was archived at the same time.)
**Finding code:** the script is one ~12,000-line IIFE with ~370 top-level functions. Don't read the whole file — grep for the function name in the "Code map" (PROJECT_SUMMARY) and read only that region. Validator logic changes: run `node tools/validator_harness.mjs` green before committing.

When you add, rename, or remove a function listed in the Code map — or add a new feature — update the Code map in the same change; keep it coarse (entry points per feature, not every helper).

**Record discoveries as you go (compaction-safe).** Conversation context is lost when it compacts; files are not. The moment you confirm a new fix, dead end, or non-obvious fact, fold it into `LESSONS_LEARNED.md` / `PROJECT_SUMMARY.md` — do not hold it only in the conversation. Record genuine discoveries, not routine progress. Every 5–10 sessions (or when it feels stale) rewrite `PROJECT_SUMMARY.md` fresh rather than appending. Git history is the changelog — don't keep narrative history in these docs. (`docs/archive/` holds the pre-2026-05-29 handoff file and the closed `NATIVE_MODE_MIGRATION.md` checklist for human reference only; don't load them.)

## Standing instructions

### Cross-referencing the puzzle catalog (pull examples / side-effect check)
The catalog lives in the **Sudokupad Catalog project**: `C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad Catalog\classify\` (call it `$CAT` below): 6,260 real puzzles hand-classified by 100 semantic tags. Two uses — **(a) pull example puzzles for a given rule type** (by tag/keyword), and **(b) predict whether a broad change breaks other puzzles**. Reach for it *deliberately*, not by default; querying it sloppily wastes tokens.

- **Query surface (three files):** `$CAT\output\catalog_log.jsonl` = one JSON/puzzle (`id, status, tags[], dump_features[], confidence`) — the "which puzzles have tag X" index. `$CAT\data\review_catalog.jsonl` = `id → url, title, author, rules` (joins a tag hit to a clickable URL). `$CAT\DICTIONARY.md` = the 100-tag vocabulary + phrasings (what the tags mean / which to search).
- **Pull examples the easy way:** `python "C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad Catalog\classify\tools\examples.py" <tag> [<tag> …] [--n 5] [--any] [--count]` — filters the log by tag and prints example URLs+titles. `tools/lookup.py <id>` inspects one puzzle.
- **Never read the data files into context** (`corpus.json` is 68 MB; the log/review files are MB-scale). Always query via `python` and return only the small answer. **Use Python's `json`/`csv` modules, never `awk`/`grep`-by-column.** Exact patterns + caveats: **"Puzzle catalog"** in [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md).

### Fix a clue type in all its readers, not one
Detection/validators, colour-rendering, and object-shading highlight are **parallel** subsystems that each read the same clue independently. When you fix how a clue type is detected or drawn (a new source layer, shape, or colour rule), sweep the sibling readers too — don't fix one in isolation. For **lines**, the readers share `LINE_DOM_LAYER_IDS` + `isLineCluePath` (one edit covers all three); see "Clue-line read sites" in [`docs/PROJECT_SUMMARY.md`](docs/PROJECT_SUMMARY.md). For other clue types, grep the sibling readers and update them in the same change.

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

**The DarkReader *extension* isn't self-serve.** The script locks DarkReader out of SudokuPad, so the extension's on/off state shouldn't matter — but if a test genuinely needs it toggled (e.g. verifying the lock), ask the user; you can't set it. Plain visual comparison → ask (via popup) for a screenshot; inspect yourself only when you need computed values (exact `rgb()`, border widths). Live-build check: `window.spdrVersion` (and `window.spdrEdition === 'native'`).

**Stale TamperMonkey version → ask, don't give up.** If after reload `window.spdrVersion` is still older than the repo's `@version`, don't work around it or proceed against the old script. Use `AskUserQuestion` with one option "Try again", e.g. "TamperMonkey still serving stale vX.Y.Z (repo is vA.B.C). I'll wait while you reload the tracking tab." "Try again" means they expect it fixed → reload and re-check. Still stale → ask the same question again. Repeat until versions match; deviate only on a write-in.
