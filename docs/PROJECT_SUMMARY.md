# SudokuPad DarkReader Fix — Project Summary

*Current state, architecture, and conventions. Rewritten fresh periodically — last rewrite 2026-05-29 (v2.119.0). For the running history see `git log`; for hard-won do/don't knowledge see [LESSONS_LEARNED.md](LESSONS_LEARNED.md).*

## What this is
A single-file TamperMonkey userscript that fixes DarkReader / dark-theme visual issues on SudokuPad, and adds several quality-of-life features on top.

- **File:** `sudokupad-darkreader-fix.user.js` — one ~4,200-line IIFE
- **Version:** 2.119.0
- **Repo:** https://github.com/VitaKaninen/Sudokupad-darkreader-fix.git (branch `main`)
- **Matched URLs:** `sudokupad.app/*`, `beta.sudokupad.app/*`, `app.crackingthecryptic.com/*`, `crackingthecryptic.com/*`
- **Tested on:** Chrome + TamperMonkey + DarkReader (primary); LibreWolf occasionally.

## What it fixes / does

**DarkReader visual fixes (the original purpose):**
1. White label boxes (cage sums, little-killer clues) staying white in dark mode
2. Black colour-picker swatches (DarkReader overrides `--cell-color-*`)
3. White text halo on SVG text
4. Invisible given digits
5. Underlay (circles/pills) fill/stroke distortion
6. Cage-box path strokes (opaque black at z=8)
7. Kropki dot colour inversion
8. Region border strips (multi-colour / centre / fill)

**Added features:**
- **Region borders** — multi-colour split borders per region (filled rects), optional centre border, optional full-cell fill. The big `drawRegionSplitBorders` subsystem.
- **Cell selection border** customization (v2.110+) — colour, opacity, width, Inside/Outside growth mode, offset, hole/donut handling.
- **Action buttons** (Fill, Clear, Clear All) — auto-fill / clean centre pencilmarks via the `app.select()` API.
- **Cell shading** + **Object shading / underlay** — opacity / brightness controls.
- **Settings panel** — flex-column, non-scrolling header, content in its own scroll area.
- **`window.spdrVersion`** — exposed at init for one-query version verification.

## How the script is organized
One IIFE. Major regions, in order:
1. Settings DEFAULTS + persistence
2. CSS injection (`rebuildStyleTag` / `buildCSS`)
3. SVG/region helpers + `drawRegionSplitBorders`
4. Rectilinear-polygon helpers (`parsePathSubpaths`, `removeCollinear`, `offsetPolygon`, `offsetRectilinearPath`) + selection-border state + its MutationObserver
5. Action buttons (`Framework.getApp()` → `app.select()`)
6. UI helpers (`buildSection`, `makeColorRow`, `makeWidthRow`, `makeRadioRow`, `makeOffsetRow`, `makeSubCheckbox`, …)
7. `buildSettingsUI`
8. `buildActionButtons`, `buildEasyRegionShadeButton`, `buildVersionLabel`
9. `buildAllUI` — orchestrates the above on DOMContentLoaded

### SVG z-order (DOM order in `#svgrenderer`; earlier = rendered behind)
1. **Our injected group** `[data-spdr-region-split]` at `svgEl.firstChild`: cell-grid clone first, then per-region border-strip rects, then centre-border clones.
2. Puzzle features (thermos, arrows, wheel arcs, inequalities)
3. `#underlay` — circles / pills
4. `#cell-colors` — puzzle-defined fills (opacity reduced by Cell shading)
5. `#cages` — outlines, killer labels
6. `#cell-grids` — `path.cell-grid` (its `d` cleared while our features are active) + 9 cage-box outline paths (`stroke` set to none while active)
7. Highlights, selection rects, digits

**Invariant:** our group at `firstChild` → puzzle features render on top of our strips; the cell-grid clone inside the group → strips cover that clone. A position observer re-inserts the group at `firstChild` if SudokuPad prepends nodes.

### Key functions
- `drawRegionSplitBorders(svg)` — main entry. Clears the old group, restores cell-grid `d`, computes feature needs, calls `inferRegionsFromSVG()`, builds the cell→region map, suppresses cage-box strokes, draws edge runs + concave corner fills, optional fills / centre borders, clones the cell-grid as `group.firstChild` and clears the original `d`, inserts the group at `firstChild`, sets up the position observer.
- `inferRegionsFromSVG()` — derives `{regions, cellSize, rows, cols}` from the live SVG (cage-box paths as walls, BFS flood-fill, GCD of coords for cellSize). No Framework internals needed.
- `computeRegion4Colors(regions)` — greedy ≤4-colour graph colouring of the adjacency graph.
- `fixKropkiDot` / `isKropkiCircle` / `isKropkiRect` / `svgHasBlackKropkiCircle` — Kropki detection + colour fixing (disambiguation rules in LESSONS_LEARNED.md).
- `applySelectionBorderOffset` / `offsetRectilinearPath` — selection-border path rewriting.

## Terminology
- **Region / cage-box** — a bordered area; its boundaries are `#cell-grids path:not(.cell-grid)`.
- **Strip / border strip** — a coloured `<rect>` we draw along a region edge.
- **SW** — stripe width.
- **textbg rect** — `rect.textbg`; SudokuPad uses it for *both* Kropki circles and other labelled circles (arrows, operators) — the source of the Kropki false-positive problem.
- **Kropki circle vs Kropki rect** — circle = shape test (gets a colour fix); rect = circle *and* no text sibling (gets label injection).
- **mainGroup** — our injected `[data-spdr-region-split]` `<g>`.
- **DR** — DarkReader.

## Testing setup
- **Workflow:** edit the file on disk → TamperMonkey auto-updates → the user refreshes their own test tab → visual confirm.
- **Claude in Chrome (MCP):** standing permission to connect (see CLAUDE.md). **Always `location.reload()` before inspecting** — the user refreshes all tabs after edits, so the MCP tab may be stale.
- **Version check:** `window.spdrVersion === 'X.Y.Z'`.
- **JS inspection:** `Framework.getApp()` → `app.puzzle.cells`, `app.puzzle.selectedCells`, `app.select(cells)`, `app.deselect()`; read CSS via `getComputedStyle(el).prop`.

### Confirmed test puzzles
| URL | What it exercises |
|---|---|
| sudokupad.app/4r2BpLTLNG | Wheel Sudoku — multi-colour borders, concave frame regions, wheel arcs, red/blue puzzle fills |
| sudokupad.app/c7jl019y8w | Irregular — selection border + hole/donut shapes |
| sudokupad.app/zpfwvozsu2 | Killer — cage-label rects |
| sudokupad.app/8za1783934 | Little killer — textbg rects |
| sudokupad.app/u3wks9egf5 | 6×6 — general MCP test tab |
| sudokupad.app/jhrb0vsbnk | Arrow constraints — white-only circles (Kropki false-positive test) |
| sudokupad.app/msdrieflp3 | Labelled Difference/Ratio — black + white labelled Kropki |

### User's typical active settings
Region borders ON · Centre borders ON (black, 1px, 100%) · Multi-colour borders ON (20px) · Cell shading + underlay ON (brightness 30%, opacity 30%) · `regionColorFillEnabled` **FALSE** (colours come from the puzzle definition, not full-cell fills) · Cell selection border ON (Inside mode, offset 0).

## snippets/
Experimental code preserved for possible reuse. Currently `rounding-experiment.md` — the dropped corner-rounding feature plus its SVG `stroke-linejoin` lessons.
