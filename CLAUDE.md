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

### Commit + push after every edit
After every version bump, immediately and without asking:
1. `git add sudokupad-native-dark-mode.user.js` (and any docs you changed)
2. `git commit -m "vX.Y.Z: <short description>"`
3. `git push`

### Version bumps
Bump `@version` in the `==UserScript==` header for every change — semver minor increments (e.g. 2.119.0 → 2.120.0).

### Testing in Chrome (standing permission)

**Diagnosing up front is yours; the first "does it work now" test is the user's.** Connect Claude in Chrome any time it helps you *diagnose* a problem — don't ask. Say upfront when the browser would answer better than guessing (e.g. pixel-level rendering). If you need a screenshot to understand an issue, take it yourself: the cost is in *analysing* the image, not capturing it, so having the user paste one in saves nothing.

But **do not verify your own fix in-browser.** Self-testing a change burns a lot of reload/inspect/screenshot round-trips, and that's expensive. Once you've made and committed a change, let the user run the initial check and report back. **Don't narrate "what to expect" by default** — commit and give a brief "done". Only describe the expected visible result when the effect is genuinely non-obvious or easy to misread; for straightforward changes, skip it. Only go back to the browser yourself if the user reports it's still wrong and you need to inspect (or they ask you to). At that point more screenshots/tests are fine.

**Your working tab is yours alone — the user will not touch it.** The user deliberately does *not* refresh or change the tab you're driving, so you never lose track of its state; take full control of it and they'll keep their own changes to a minimum. (This is the opposite of the user's *own* testing tabs, which they reload freely.) Reload your tab yourself whenever you need the latest script live — TamperMonkey serves the file on its own poll, so a just-saved edit may not be running yet; confirm via `window.spdrVersion`. Never ask the user "did you reload?": when the user reports an issue, they have **already** reloaded and confirmed the correct script version is running before telling you.
