# Catalog Audit — buckets the script may not handle

Working checklist from the 2026-06-04 gap analysis: every render bucket in the 1890-puzzle
catalog ([`Catalog/`](Catalog/)) cross-referenced against what the script actually touches
(PROJECT_SUMMARY "What it fixes" + Code map). Each open item gets **resolved one way or the
other** — either we make the script handle it, or we confirm it's fine as-is and acknowledge
it needs nothing. When all non-fog items are resolved, do fog last.

**Status legend:** 🔲 to audit · ✅ now handled by us (note the fn/version) · ☑️ acknowledged fine, no action (note why)

**Order of work (decided with the user):**
1. **Group A — DR-managed but never checked** (below) — do these first.
2. Group B — anything A surfaces.
3. **Fog — LAST and separate.** Fog sits *on top of* everything else, so every other render
   path must be correct before we touch a fog puzzle. Do not start fog until Group A is fully
   resolved.

Spot-check rule: open the listed URLs in the working tab (reload to get the live script,
confirm `window.spdrVersion`), DarkReader ON. Compare against expected. Record the decision
inline here the moment it's made (compaction-safe).

---

## ⚠️ Methodology note (learned the hard way, 2026-06-04)
The Group-A audit asked "is *this element* DR-converted?" and **missed blaring whole-puzzle regressions
visible in the very screenshots it took** (loopdokux below). A spot-check must judge the **whole puzzle
against the no-script / native baseline**, not just the target bucket. Bucket-level DOM checks prove an
element is touched; they do **not** prove the puzzle looks right. Always eyeball the full render and compare
to native.

## 🐞 Confirmed bugs found during inspection (logged — fix later)

### 🔴 BUG-1 · Off-grid example area treated as play-grid → region borders drawn through it
- **Puzzle:** https://sudokupad.app/clover/nov-28-2023-loopdokux (true grid **6×6**; catalog row says
  `grid_w=10, grid_h=6, is_square=0`).
- **Symptom:** the author drew a separate 4×6 *example diagram* beside the real grid (explaining the loop
  rule). Native SudokuPad renders the grid + a detached example. **Our script** detects the rendered extent
  as a 10-wide board, treats the example cells as grid, and draws region borders / shading through them — the
  puzzle "looks completely different" from native.
- **Root cause:** grid detection uses **rendered extent** (the `gridN` inflation trap CATALOG_INSTRUCTIONS
  explicitly warns about) instead of the **solution-derived** size (`√(convertedPuzzle.solution.length)` = 6).
  Likely in `detectGridSize`/`getGridCellSize`/`inferRegionsFromSVG`.
- **Fix direction (deferred):** derive the true play-grid from solution length and clamp region-border /
  cell-border drawing to it, so off-grid example/outer areas are excluded. Affects the region-border subsystem
  broadly → cross-ref the catalog before shipping.
- **Status:** logged, not fixed (user: batch with region-border work).

### ❔ BUG-2 · "White region borders drawn on top of ours" — *unreproduced, need URL*
- Reported on a puzzle whose URL was pasted as `5dv5v9gzux` twice (the real second URL was lost). On
  `5dv5v9gzux` itself I **could not** reproduce: native `path.cell-grid` `d` is cleared, all 9 `cage-box`
  paths are `stroke:none`, grey internal lines are our own cell-border clone — native borders fully
  suppressed, ours render correctly. **Need the correct URL to diagnose.**

## 🔍 Triage queue — grid-extent anomaly candidates (BUG-1 class)
Cheap catalog pre-filter for the "rendered extent ≠ true grid" bug. **Inspect each: does our region-border /
shading drawing bleed beyond the true play grid?** (Compare to native.) Mark ✅ ok / 🔴 broken.

**High suspicion — non-square rendered extent (9):**
| extent | url | title | status |
|---|---|---|---|
| 13×9 | penpa8f031fc6… (Feb 23 2023 Battleship Sums) | | 🔲 |
| 9×12 | penpaef06e78c… (June 13 2023 Roll Sudoku) | | 🔲 |
| 7×19 | penpa43ea3ca3… (Oct 5 2023 Matryoshka) | | 🔲 |
| 10×6 | clover/nov-28-2023-loopdokux | Loopdoku | 🔴 BUG-1 |
| 11×13 | https://sudokupad.app/xhxr21vtvd | Corner/Edge Sudoku | 🔲 |
| 18×10 | https://sudokupad.app/philip-newman/20240714-the-very-little-caterpillar | Very Little Caterpillar | 🔲 |
| 16×14 | https://sudokupad.app/xncxzfqcx4 | Chattai | 🔲 |
| 13×6 | https://sudokupad.app/z18ro8pfkz | Dec 29 2024 Two More Sudokus | 🔲 |
| 19×9 | https://sudokupad.app/4m0o91tq4f | Paint It Black Sudoku | 🔲 |

**Lower suspicion — oversized but square (21):** mostly genuine large / multi-grid (Gattai/samurai, "Two
Sudokus", "Overlapping Sudoku", "Extra Space", 16×16, 26×26 Cascade). Skim for region-border bleed; many are
legitimately big. URLs: `cmspmym4yo` (13×13), `dyu5vewl1g` (12×12), `5nerx2ezhs` (14×14), `26g7sle8s5`/`qoi2our96l`/`xsex6ihbvy` (16×16 Extra Space I/II/III), `7qfl3jx810` (11×11), `1qk6k8htjd` (26×26 Cascade), `g6t4b6vg0f` (14×14), `onnwl66b8d` (10×10 Sudokuro), `6xal6tvk41` (12×12 Overlapping), plus 6 penpa Gattai 10×10s + a few more (see index query).

---

## Group A — present in the wild, never verified — ✅ COMPLETE (2026-06-04)

**Outcome: all 5 resolved, zero code changes needed.** 3 turned out already handled by our script
(A3 feature-xv, A5 fp-indexers via label-rect/object-shading), 2 are benign and correctly left to
DarkReader (A1 line endpoints, A2 invisible board rect, A4 cosmetic paths). The "inconsistency risk"
hypotheses didn't materialise. Next: Group B is empty — proceed to **fog** (last, separate).

_Originally: render through DarkReader (so likely look okay) but never confirmed, some risk clashing
with our own shading. Each resolved to ✅ (handled by us) or ☑️ (fine, leave to DR)._

### ☑️ A1 · `#arrows | rect` — line endpoint shapes — **110 puzzles** — *acknowledged fine, no action*
- **What:** circle/pill shapes in the `#arrows` layer = arrow bulbs / between-lockout-line **endpoints**.
  Attrs: `shape:[circle,pill]`, `fillGray:true`, `stroke:#a1a1a1` (gray), `pos:[center,border]`, `drManaged`.
- **Verified** (v2.194.0, DR on) on `itj6zle5a9` + `ap9n4guirs`: endpoint = white fill `#ffffff` → DR
  `rgb(24,26,27)` (dark, matches board) + gray stroke `#a1a1a1` → DR `rgb(173,165,155)`. The connecting
  arrow/line strokes compute to the **same** `rgb(173,165,155)`, and **our `fixAllLines` does not override
  these gray `#arrows` paths** (`lineHasOurInline:false`) — so endpoint *and* line are both pure DarkReader
  and render identically. Visually confirmed consistent. The union collapses all 110 to the single stroke
  `#a1a1a1` → no colored-endpoint variant exists anywhere.
- **Decision:** ☑️ **Fine, leave to DR.** No mismatch at any settings *because* we don't shade these gray
  lines either, so endpoints and lines stay locked together.
  - ⚠️ **Latent dependency:** this only holds while we leave gray `#arrows` paths to DR. If we ever broaden
    line-shading to claim gray `#arrows` strokes (e.g. for A4 or a future change), we must claim these
    `#arrows rect` endpoints in the same pass or they'll diverge from their lines.

### ☑️ A2 · `#underlay | rect.board-position` — **198 puzzles** — *acknowledged fine, no action*
- **What:** a single full-board **background / hit-area** rect (`x=-64 y=-64 w=704 h=704` on a 9×9 =
  grid + one-cell margin). Fill `#FFFFFF00` = white with **alpha `00` (fully transparent)**, stroke none.
- **Verified** (v2.194.0, DR on) on `5dv5v9gzux`: DR converts it to `rgba(24,26,27,0)` — alpha stays 0, so
  it **paints nothing**. Our script doesn't touch it (`ourInline:false`). Union confirms **all 198** share the
  one fill `#FFFFFF00` — no opaque variant anywhere.
- **Decision:** ☑️ **Fine, invisible by design.** Renders nothing regardless of DR; no action.
  - 📌 **Catalog caveat discovered:** the catalog's `fillGray:true` / `opacity:1` are misleading here — they
    read the RGB and the SVG `opacity` attr but **ignore the 8-digit hex fill-alpha** (`…00`). A bucket can look
    "gray, opaque" in the union yet be fully transparent. Check the actual fill hex when a bucket's visibility matters.

### ✅ A3 · `#overlay | rect.feature-xv` — XV label backgrounds — **51 puzzles** — *already handled by us*
- **What:** small (14×14) **white** (`#FFFFFF`) mask boxes behind X/V clues, stroke none, `pos:border`.
- **Verified** (v2.194.0, DR on) on `op15q0d27q`: the rect carries inline `fill: rgb(24,26,27) !important`
  with **no `--darkreader-inline-fill` var** → that raw `!important` fill is **our `applyInlineFill`** (the
  white-label-box fix, `fixAllLabelRects`), not DR. So we already darken the white box to board-bg; the X/V
  text stays light (`rgb(221,218,214)`). Screenshot confirms legible letters, no white boxes showing.
- **Decision:** ✅ **Handled by us.** The "feature-xv falls through" hypothesis was wrong — our white-label-box
  fix already claims them and renders correctly. No work needed.

### ☑️ A4 · `#overlay | path` (non-sudokux) — penpa cosmetic paths — **37 puzzles** — *acknowledged fine, no action*
- **What:** cosmetic stroked paths (loops, pointing arrows, etc.). Strokes incl. **colored**
  (`#FF0000`, `#187BCD`, `#579F57`, `#e6261fff`) and dark (`#000000`, `#444444`, `#999999`), `drManaged`.
- **Verified** (v2.194.0, DR on), both extremes: green loop `#579F57` → DR `rgb(111,176,111)` (loopdokux,
  bright/visible) and **black** `#000000` → DR `rgb(232,230,227)` near-white (5dv5v9gzux pointing arrows,
  clearly visible). All `dr:true, ours:false`. Screenshots confirm both render cleanly.
- **Decision:** ☑️ **Fine, leave to DR.** DR correctly brightens dark strokes and adjusts colored ones; nothing
  is invisible or distorted. We don't (and needn't) shade `#overlay` paths. *(Raw dump was deleted, so the
  worst case was found by sampling the colored + diagonal-arrow puzzles directly rather than querying raw.)*

### ✅ A5 · `#cages | path.cage-fpColumnIndexer` / `cage-fpBoxIndexer` — **11 / 2 puzzles** — *already handled by us*
- **What:** f-puzzles row/column **indexer** regions — translucent colored cages, stroke `#C77C7C` /
  fill `#C77C7C33` (pinkish-red, ~0.2 alpha).
- **Verified** (v2.194.0, DR on) on `no7la2bceh`: `ours:true, dr:false` — our colored **object-shading** claims
  it (stroke → `rgb(255,102,102)`, fill → muted dark-red). Screenshot: columns 1/5/9 render as subtle dark-red
  shaded columns with red outlines, digits readable — consistent with how we shade other colored cages.
- **Decision:** ✅ **Handled by us.** Object-shading already covers these colored cage paths; renders correctly. No work needed.

---

## Fog — LAST, separate (do not start until Group A is fully ✅/☑️)

### 🔲 F1 · `#fog-defs | *` + `#fog-fogcover | rect` — **6 puzzles** (`fog=6`)
- **What:** the fog cover + mask. `fillSrc:css/none`, **no `drManaged` flag** — the *only* bucket
  neither we nor DarkReader manage. It's the gameplay mechanic (cover/reveal), not decoration.
- **All 6 fog puzzles:**
  - https://sudokupad.app/clover/dec-7-2023-foggy-xv-pairs — Dec. 7, 2023: Foggy XV Pairs
  - https://sudokupad.app/syvmhn0tqy — February 8, 2024: Foggy Thermo
  - https://sudokupad.app/ss3czxav1o — Fog Killer
  - https://sudokupad.app/h629yx4ibg — Fog of Kropki
  - https://sudokupad.app/philip-newman/20241219-fog-on-the-dominoes — 2024-12-19: Fog on the Dominoes
  - https://sudokupad.app/f4mwzrz3tq — XV Fog
- **Decision:** _pending — deferred until all of Group A is resolved_

---

## Already handled / acknowledged (reference — not open items)
Givens, placed digits, cage boxes + killer labels, `#arrows | path` lines, `#underlay`/`#overlay`
rect object-shading, Kropki (`feature-kropki` + `textbg`), label backgrounds, grayscale `#overlay text`
markers, `cage-extraregion` shaded regions, region/cell-grid borders, `#cell-colors`, pencilmarks
(centre + corner). ☑️ `#overlay | path.sudokux` (X-diagonal) — left to DR, renders fine.
Zero-count constraint columns (`little_killer`, `sandwich`, `windoku`) and `global` (no render) — nothing to do.
