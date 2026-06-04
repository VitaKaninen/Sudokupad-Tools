# Puzzle Element Catalog — Capture Spec

Purpose: across ~2,000 SudokuPad puzzles, produce a complete inventory of the
**render elements** they contain and the **decision-relevant properties** of each, so
the DarkReader-fix userscript can be made robust against whatever it meets in the wild.

The deliverable of the whole exercise is the set of **buckets the script doesn't yet
handle** — see "Buckets & unknowns" below. We are mining for those, not avoiding them.

---

## How the work is split

| Phase | What | Tool | Cost |
|---|---|---|---|
| **1 — Extraction** | Walk each puzzle's DOM, record every element bucket + its decision attributes + the puzzle's constraint semantics. Purely mechanical. | **`sudokupad_extractor.user.js`** (bulk) or the MCP fallback below (single puzzle) | none (script) |
| **2 — Synthesis** | Merge the per-puzzle records into one master understanding: every bucket → how the script should treat it → flagged UNKNOWNs. Needs judgement. | AI, over the script's **Union** export | tokens |

The bulk extractor **is** the Phase-1 pipeline for the 2,000-URL run. The MCP procedure
at the bottom is a single-puzzle manual fallback — same capture, no automation.

## Core principle — completeness is mechanical, not visual

Don't catalog by eyeballing the rendered puzzle (lossy, unverifiable). The extractor
walks the *entire* `#svgrenderer` DOM and reports *every* element bucket. Completeness
is guaranteed by the iteration, not by diligence. Naming/handling decisions come later
(Phase 2) and never gate capture.

## Buckets & unknowns — read this if the concept is fuzzy

- A **bucket** is one distinct element kind: the key `layer | tag.class`
  (e.g. `#overlay | rect.feature-kropki`). The walk groups every element into buckets
  and counts them.
- **Known vs. unknown does not matter at extraction time, and you do NOT need a bucket
  list planned in advance.** An unnamed element is captured exactly as correctly as a
  named one — naming is a label applied in Phase 2, it doesn't affect capture.
- An **UNKNOWN bucket** = "an element kind the script may mishandle." That is the
  actionable output. The catalog exists to surface these across many puzzles.
- The only way "not knowing in advance" can bite: the capture measures a **fixed set**
  of attributes (below). If some element's behaviour depends on a property *not* in that
  set, we'd capture the bucket but miss the deciding attribute. The set is broad (drawn
  from every past lesson) — but that's the edge to watch.

---

## What we capture (and what we deliberately don't)

Captured **per puzzle**:

- **`id`, `cpId`, `url`, `urlResolved`, `title`, `author`** — from **`convertedPuzzle`**
  (authoritative on v0.611.0; `Framework.getApp()` is **empty** there, never read it for
  these). `id` is the resolved short slug, falling back to `convertedPuzzle.id` for
  unpublished puzzles; `cpId` is always `convertedPuzzle.id` (durable identity); `url` is
  the resolved short URL (empty if unresolved); `urlResolved` flags which. See the
  raw-import note under anomalies.
- **`gridSize`** — true play-grid side from `convertedPuzzle.solution` length
  (`√len`). Reliable, unlike `gridN` (which is inflated by outer clues / padding / nogrid).
- **`constraints`** — non-zero `convertedPuzzle` arrays only, e.g. `{cages:18, cosmetic:5,
  foglight:36}`. The dozen `array[0]` keys are dropped as noise. This is the **semantic
  layer**: the DOM can't tell a thermo from a palindrome from a region-sum line (all
  `#arrows | path`) — the constraint arrays can.
- **`cageStyles`** — tally of `cages[].style` (e.g. `{box:6, rowcol:12}`). Distinguishes a
  real 1-9 region (`cage-extraregion`) from killer cages / box outlines / decoration.
- **`meta`** — `{cs, gridN, theme}`.
- **`buckets`** — the structured decision dump: one entry per bucket with the fields below.

**Excluded from capture** (noise / not puzzle content):

- Our own clones (`spdr*`).
- SudokuPad selection/highlight UI (`#cell-highlights`) — UI, not puzzle content.
- The universal `g[defs]` filter block — render plumbing present on **every** puzzle (fog
  or not), the script never touches it.
- The old raw "Step 2" enumeration — it was a strict subset of the decision dump (it only
  added a raw `rx`/`fill` sample the dump already encodes as `shape`/`fill`). Redundant;
  dropped.

### DarkReader: extract with DR **ON**

DR's darkening does not corrupt the capture: the probe reads the **source** `fill`/`stroke`
(DR stores its override behind a CSS variable / parent filter the probe doesn't read), so
`gray:true/false` reflects the authored colour regardless of DR state. What DR *does* add is
the **`drManaged`** flag — the one signal that says which elements DR is already converting,
which is exactly what the fix script needs to know. DR-off would lose that and gain nothing.

### Per-bucket fields → the decision each gates

| Field | What it decides | Lesson it came from |
|---|---|---|
| `fillSrc` (inline!/inline/attr/inherited/css) | **inherited/css ⇒ our code can't see it ⇒ element untouched.** The single field that can prove a puzzle unaffected | overlay-marker gap; cascade |
| `fillGray` true/false/none (saturation `<0.08`) | gray vs colored slider routing; white & black are gray | Gray-vs-colored shading (v2.140) |
| `none`, `opacity` | invisible anchors / translucent endpoints take different paths; translucent layers double-paint brighter | v2.176; z8ndhpjd05 brightening |
| `strokeGray` (stroke colour) | white stroke = grid-line **eraser**, dark = real outline | v2.192 |
| `shape` circle/pill/fullcell | circle-vs-pill is the Kropki false-positive guard | v2.184 |
| `pos` border/corner/center/outside/arbitrary | Kropki ownership **is** position; outside-grid = little-killer/sandwich | v2.164 / v2.184 |
| `rotated`, `cells` | dedupe/tracing path; spanning-shape indicator | highlight dedupe; personal-notes |
| `z` (lo-hi, document order) | SVG has no z-index — paint order is sibling order; the lift/border cycle | personal-notes |
| `drManaged` | whether/how DarkReader already converts it | cascade |
| `cageStyles` | `cage-extraregion` = constraint region, not decoration | region/shaded-region |
| `meta.theme` | some CSS rules key off `setting-uitheme-purple` | label-bg CSS |

---

## The three outputs (generated by the extractor at download time)

The script stores the per-puzzle records and builds these on demand — the dedup/aggregation
happens in the script, so Phase-2's AI job shrinks to interpretation, not merging.

1. **⬇ Union (JSON)** — buckets deduped across all puzzles. Per bucket: `totalCount`,
   `puzzleCount`, `firstSeen`, the *union* of every decision-attribute value seen, and the
   `puzzles` list exhibiting it. **This is the file Phase-2 AI reads.**
2. **⬇ Index (CSV)** — one row per puzzle: `id, title, author, grid_w, grid_h, is_square`,
   a boolean column per curated feature (`fog, kropki, xv, killer_cage, extra_region, thermo,
   arrow, palindrome, little_killer, sandwich, inequality, sudoku_x, windoku, cosmetic,
   cell_colors, givens`), then **one auto-discovered boolean column for every other
   constraint key** seen across the dataset (new types like `renban`/`whisper` get their own
   filterable column automatically — no catch-all blob), and `url`. The searchable "which
   puzzles contain what" lookup — open in Excel, filter `fog=1`. Purely mechanical; no AI.
   - **Grid size** is reported as separate `grid_w`/`grid_h` (so non-square boards show), from
     the rendered cell-grid extent, falling back to the solution-derived square side; when
     neither is determinable the three columns read literal **`undefined`** (searchable).
     Caveat: the rendered extent inflates for outer-clue / nogrid puzzles (same as `gridN`).
3. **⬇ Raw (JSON)** — the stored per-puzzle records. Safety net: re-examine one puzzle's full
   dump without re-running.

Plus **⬇ Failed** (URLs that wouldn't render after retries).

## Running the bulk extractor

1. Install `sudokupad_extractor.user.js` in TamperMonkey. **DarkReader ON.** Disable the
   DarkReader-fix userscript (or rely on the `spdr*` exclusion).
2. Open `https://sudokupad.app/` — the panel appears top-right.
3. Set a **Session** name (per-tab namespace; lets you run several tabs in parallel).
4. **Load File** (one URL per line), **Start**. It navigates each URL, waits for render,
   captures, and advances. Auto-saves Raw every 50 puzzles. Resumable after pause/reload.
5. When complete, download **Union**, **Index**, and **Raw**.

---

## Known anomalies & caveats (validation run, SudokuPad v0.611.0)

A future model running extraction/synthesis should read these before trusting any field.

- **`gridN` is render-extent ÷ cell size, NOT the play-grid dimension.** A 6×6 reported
  `gridN=7`; a 9×9 with outer clues `gridN=15`. Outer clues, padding, and `setting-nogrid`
  inflate it. Use **`gridSize`** (from `solution` length) for the real grid; `cs` (cell
  size, a constant 64 across the validation set) is reliable; `gridN` is not.
- **`Framework.getApp()` is empty on v0.611.0.** Title/author/constraints come from
  `convertedPuzzle` (already wired in).
- **`convertedPuzzle` is a PAGE-window global — the userscript must read it via
  `unsafeWindow`, not `window`.** Because the extractor uses `@grant`, it runs in
  TamperMonkey's sandbox where `window` is a wrapper that doesn't expose page globals;
  plain `window.convertedPuzzle` is `undefined` and silently empties
  constraints/cageStyles/author/gridSize while the DOM walk (shared `document`) still
  works. Fixed in v2.0.1 via `@grant unsafeWindow` + a `pageWindow()` helper. The MCP
  fallback runs in page context, so `window.convertedPuzzle` is fine there.
- **`convertedPuzzle` schema varies by author/import.** `rules` is sometimes a string,
  sometimes `array[1]`; fog puzzles add `foglight`/`foglink`, non-fog omit them entirely.
  Capture tolerates this — never assume a fixed key set.
- **Given digits render in different layers/forms per puzzle.** Seen as
  `#cell-givens | text.cell-given`, and as stroked `#cell-values | path` (digit *outlines*,
  not `<text>`). "Givens" is not one stable bucket — the Index `givens` flag checks both the
  constraint array and the `cell-given` class.
- **The `g[defs]` filter block is general render plumbing, NOT fog.** It's excluded from
  capture. Only `#fog-defs` / `#fog-fogcover` are fog-specific. Easy to misattribute.
- **Selection UI leaks in if a cell is selected on load** (`#cell-highlights`). Excluded from
  capture. (In the MCP fallback, deselect — click empty space — before extracting.)
- **Extraction waits for `convertedPuzzle`, not just the SVG (v2.2.0).** Some puzzles render
  a bare grid skeleton (~24 elements) *before* the puzzle model is wired up; extracting then
  gives garbage with empty constraints. The ready-check requires `convertedPuzzle`, so a
  puzzle that never initializes it (observed on `c7jl019y8w` — stuck at 24 elements, no model
  even after 10s) times out and is logged as **failed** rather than silently mis-captured.
  If legitimate puzzles start timing out, raise `RENDER_TIMEOUT_MS` (normal puzzles wire up
  the model in 1–3s).
- **The Start button navigates to the first queued URL before extracting (v2.2.0).** Earlier
  it extracted whatever page was already loaded, mis-capturing the leftover puzzle from a
  prior run and consuming the first queue slot unvisited (symptom: one puzzle duplicated,
  the first missing, zero failures).
- **Raw-import URLs & the short-slug question (v2.3.0 → v2.4.0).** Loading a long
  f-puzzles/SCF/CTC/penpa URL lands on the encoded blob; for an **already-published** puzzle
  SudokuPad rewrites the URL to its short slug and reloads. Extracting during that window
  would record the ~900-char blob as the id, so extraction waits up to `RESOLVE_GRACE_MS`
  (5s) for the slug. **But many long URLs never resolve — they're unpublished puzzles with
  no short URL.** So after the grace window we extract anyway (never fail for this reason)
  and record a clean id from a fallback chain:
  - `id` = the resolved short slug if it appeared, else **`convertedPuzzle.id`** (a stable
    embedded id like `sxsm_Author_<hash>`), never the giant blob;
  - `cpId` = `convertedPuzzle.id` always (the durable identity for dedup);
  - `url` = the resolved short URL or empty; `urlResolved` = 1/0 (surfaced in the CSV so
    unpublished puzzles are searchable); `originalUrl` = the long URL we navigated to.
  - **Do NOT call the "Create Short URL" action to force a slug.** Investigation showed the
    UI's `captureSudokuPadLink` just navigates to the long URL; the real id-maker is
    `PuzzleLoader.createPuzzleId` (a local md5 hash, no network), but a computed id only
    *resolves* if the puzzle is also uploaded — i.e. shortening an unpublished puzzle means
    **publishing thousands of puzzles to CTC's server**. Not appropriate, and unnecessary
    since `convertedPuzzle.id` already gives a clean stable identifier offline.

---

## Known buckets (naming reference for Phase-2 synthesis)

Not needed for extraction. This is the head-start lookup for naming Union buckets in Phase 2;
extend it as new ones are confirmed. Match key is `layer + tag + class`.

| Layer | tag.class | Meaning | Script touches it via |
|---|---|---|---|
| `#cell-colors` | `rect` / `path.cell-color` | puzzle-defined cell fills (incl. split-cell halves) | Cell shading |
| `#underlay` | `circle`, `rect`, `rect.textbg` | circles / pills (thermo bulbs, dots, cosmetic shapes) | Object shading, Kropki, label-bg |
| `#overlay` | `rect`, `circle`, `path` | cosmetic shapes, lucky-charm marks, X-diagonal path | Object shading (`shouldShadeOverlayRect`) |
| `#overlay` | `text` | cosmetic text; grayscale `#N`/X-O markers; Kropki labels | overlay-marker-text shading; Kropki labels |
| `#arrows` | `path` (stroked) | thermo shafts, arrow lines, palindrome, renban, whisper, region-sum | `fixAllLines` / Object shading |
| `#arrows` | `path` (filled, arrowhead) | arrowheads | (left to DR) |
| `#cages` | `path` | killer-cage outlines / box cages | cage-box fix, `fixCagePath` |
| `#cages` | `path.cage-extraregion` | grey "extra regions" (e.g. must contain 1–9) | Shaded-region colouring |
| `#cages` | `text` | killer-cage sum labels | label-rect / text fixes |
| `#cell-grids` | `path.cell-grid` | the thin built-in grid lines (one path) | region borders / cell borders |
| `#cell-grids` | `path` (no `.cell-grid`) | the 9 cage-box / region boundary outlines | region borders |
| `#cell-values` | `text` | placed/given digits | given & placed-digit fixes |
| `#cell-candidates` | `text` / `tspan` | centre pencilmarks | pencilmark sort/colour |
| `#cell-pencilmarks` | `text` | corner pencilmarks | pencilmark reflow/colour |
| `rect.feature-kropki` | (any layer) | native Kropki dots | Kropki fix |
| `rect.textbg` | (any layer) | label backgrounds — Kropki circles AND other labelled circles | Kropki / label-bg |

---

## Single-puzzle MCP fallback (manual, when the bulk extractor isn't usable)

For a one-off via Claude-in-Chrome: `location.reload()`, wait until `#svgrenderer` is
non-null, then paste the **same** `collectBuckets()` walk and the `convertedPuzzle`
constraint/cage/title reads that the userscript uses (copy them out of
`sudokupad_extractor.user.js`). Two MCP-specific gotchas:

- The `javascript_tool` truncates returned output at **~1100 chars** silently. Stash the
  result on `window` (`window.__out = …; 'LEN='+window.__out.length`) and pull it back in
  ≤1000-char slices (`window.__out.slice(0,1000)`, `slice(1000,2000)`, …).
- Cache the function across puzzles via `sessionStorage` (all puzzles share the
  `sudokupad.app` origin): `sessionStorage.setItem('__catfn', fn.toString())`, then
  `eval('('+sessionStorage.getItem('__catfn')+')')()` on each later puzzle.

This produces the same per-puzzle record by hand; feed it into the same Union/Index synthesis.
