# Lessons Learned — SudokuPad DarkReader Fix

*Flat list of what's confirmed to work, what's confirmed NOT to work, and why. The point of this file: never re-fight a solved battle. When a session confirms a new fix or a dead end, add a line. Record the conclusion, not the journey.*

## Beating DarkReader (the core problem)

DarkReader overrides SVG fills two ways:
1. **Generated CSS** — counter-rules in `<style class="darkreader darkreader--override">`, often the *same* specificity as ours but *later* in the document, so they win on cascade order.
2. **Inline attribute override** — adds `data-darkreader-inline-fill` plus an `!important` stylesheet rule driven by `--darkreader-inline-fill`.

- ✅ **The master key — inline style with `!important`:** `el.style.setProperty('fill', value, 'important')`. DarkReader does **not** fight `!important` inline styles. Used for given digits, Kropki dots, underlay fills, pencilmarks, cell colours.
- ✅ **CSS variables — restore via `html[data-darkreader-scheme="dark"]`** (specificity 0,1,1), which beats DarkReader's `:root` block (0,1,0) for `--cell-color-*`.
- ❌ **CSS `!important` alone does NOT work:** DarkReader generates an equal-specificity counter-rule that appears *after* ours and wins. Always use inline-style `!important` for fills, never a stylesheet rule.
- ❌ **Don't strip `data-darkreader-inline-fill` from all rects:** it breaks the textbg-rect fix. No blanket removal.

## SVG rendering

- ✅ **`shape-rendering="crispEdges"` on our group** (fixed v2.82): the SVG is scaled ~1.333× (810px screen ÷ 608px viewBox), so strip boundaries land on fractional screen pixels; the browser anti-aliases the edge into the dark cell behind it → a thin dark fringe. crispEdges snaps boundaries to whole pixels and the fringe disappears.
- ✅ **`stroke: none !important` on the 9 cage-box paths** (fixed v2.81) whenever any feature is active: those `#cell-grids path:not(.cell-grid)` paths have opaque-black stroke at z=8 and otherwise paint dark lines through coloured cells at 3×3 box boundaries. Restore the stroke when all features are off.
- ✅ **Cell-grid z-order fix** (v2.85): clone `path.cell-grid` as the *first* child of our group (so strips cover the clone) **and clear the original's `d` attribute** so it stops rendering at z=8. Restore the original from `dataset.spdrOrigD` on the next call.
- ❌ **Never use `display:none` (or any style change) on `path.cell-grid`:** the `#cell-grids` MutationObserver watches `attributeFilter: ['style']`. A style change fires it → infinite loop. Changing `d` does **not** trigger it — that's exactly why we clear `d` instead.
- ❌ **Dead end — `fixCellGrid`** (the v2.71–v2.80 clipping function): tried to clip cell-grid segments at region boundaries. Removed v2.83. The "white lines in black cells" it chased were actually the cage-box strokes (fixed v2.81) + sub-pixel anti-aliasing (fixed v2.82). v2.67 had neither `fixCellGrid` nor the white-lines problem — confirmed baseline.

## Region / shaded-region geometry

- ✅ **`path.cage-extraregion` only ever means a *checked* region (digit-uniqueness enforced), never cosmetic shading.** Verified via `window.convertedPuzzle.cages`: those paths come from cages with `style:"extraregion", unique:true, sum:45` (a real 1-9 no-repeat constraint). The cage `style` tally on a normal puzzle is `region` (the 9 boxes), `rowcol` (rows+cols), and `extraregion`. Purely decorative grey shading lives in a **separate `cosmetic` array** and renders through a different path — it does NOT get the `cage-extraregion` class. So scoping Easy Shade to `path.cage-extraregion` is safe: it never colours non-constraint decoration. (`window.convertedPuzzle` is the handy decoded-puzzle global; the `/api/puzzle/<id>` response is `fpuz…` = LZString-compressed f-puzzles, not directly readable.)
- ✅ **Cell membership of a `#cages` shading path → `SVGGeometryElement.isPointInFill` at each cell centre** (`pt.x = c*cs + cs/2`). `#svgrenderer`/`#cages`/the path carry no element transform, so cell-grid user units map straight into `isPointInFill`'s local coordinate space. This is how `assignExtraRegionColors` finds which cells each grey "extra region" covers (v2.123).
- ⚠️ **Don't derive cell size from `cage-box` path coords.** SudokuPad draws each box outline with a *midpoint* vertex at the box centre — e.g. a 3×3 box of 64px cells emits `M0 0 L96 0 L192 0 …` (96 = box centre, not a cell boundary). GCD-of-coords on that gives 96 and makes a 9×9 look like 6×6. Use `getGridCellSize()` (GCD of the `path.cell-grid` coords, with `dataset.spdrOrigD` fallback since our z-order fix clears `d`) + `detectGridSize()` instead. `.cell` element count also confirms grid size (81 = 9×9).
- ✅ **Greedy 4-colouring, highest-degree-first** gives a valid adjacency-aware colouring for the grey-region touch graph (planar). Same approach as `computeRegion4Colors`; a 5th-colour fallback (reuse least-clashing) guards the rare non-planar case.
- ⚠️ **`drawRegionSplitBorders` is called by observers decoupled from `applySettings`** (the `#cell-grids` observer fires when we clear the cell-grid `d`; the position observer; etc.). So anything it draws must not depend on state set earlier *in applySettings only* — e.g. the shaded-region clones recompute `assignExtraRegionColors(svg)` inside the `needShaded` block, because an observer-triggered draw would otherwise read stale/cleared `dataset.spdrExtraColorIdx` and produce **0 clones** (regions invisible). Symptom we hit: idx correctly set, originals hidden, but the shaded `<g>` empty.
- ✅ **Region full-cell fill = exact cell rects, no outward growth** (v2.124). Growing each boundary side by SW to tuck under the strips caused the fill to poke past the puzzle's outer border (no covering strip there) and to overlap neighbours into a lighter double-painted seam at interior boundaries. Plain `c*cs, r*cs, cs, cs` rects fixed both; strips still draw on top at the boundaries with no visible gap.

## Cascade / load-order

- ❌ **Don't try to keep our `<style>` last in `<head>`** (tried v2.124 `startStyleTagGuard`, reverted v2.125). DarkReader inserts a `darkreader--sync` `<style>` immediately **after every** `<style>` it manages — *including ours* — so "be last" is unwinnable: DR just re-syncs after us. A `<head>` observer that re-appends ours fights DR's observer and only causes thrash. The colour-swatch black-on-load is a genuine DR load-timing race (a reload clears it); the `--cell-color` specificity bump (`html[data-darkreader-scheme="dark"][data-darkreader-scheme]`, (0,2,1)) helps but isn't a guaranteed fix.
- ✅ **Colouring our injected UI consistently under DR — what finally worked (v2.127): a LITERAL colour + `!important` + strip `data-darkreader-inline-*` once.** Once you set an `!important` inline colour and remove DR's marker, DR does **not** come back to re-override it (verified: stable for 300 ms+, no observer needed for the steady state). Re-assert on the element's "appear" moment (card → `showCard`; button → its DR observer / `applyToggleStyle`) to cover the load-time pass. The theme purple is the literal `rgb(181,104,228)` (== DR's converted `--controls-button-bg`).
- ❌ **Dead ends for the same problem** (all caused the white↔purple flicker, removed):
  - **Snapshotting a computed colour** (`getComputedStyle(undo).color`) at build time — races DR's build-time conversion, captures grey or purple at random.
  - **Inline `var(--controls-button-bg)`** — DR rewrites var usage only inside *stylesheets*, not inline, so it resolves to the raw dark *background* purple `#6a1b9a`. Even `var(--darkreader-text--controls-button-bg, …)` was intermittent (that DR var isn't always defined when our inline style is first evaluated).
  - **A stylesheet rule** with `var(--controls-button-bg)` added late (not in DR's initial scan) — DR didn't rewrite it either; resolved dark.
- ⚠️ **DR converts CHILD text nodes independently of the parent.** Forcing `color` on the button is not enough — the child `<div>` label (and mode indicator) go grey on their own. Force the colour on every text element (loop over `[btn, lbl, modeLbl]`; the card loops over `cardTextEls`), and observe the button **subtree** for DR markers, not just the button.
- ✅ **Swatches** (the 4 palette squares) still use literal `!important` + strip + the same subtree observer — they must keep their exact palette colours, not be DR-converted.

## Border-strip drawing

- ✅ **Filled rects, one per contiguous run** of cells along an edge (not one rect per cell, not `<line>`s). Horizontal strips are trimmed by SW at ends where a perpendicular vertical strip exists; vertical strips own the corner pixels; concave inner corners (3 of 4 surrounding cells in-region) get an SW×SW patch.
- ❌ **Dead end — overlapping `<line>` + `<clipPath>`:** square line caps double-painted at every internal joint and at perpendicular corners → visible darkening at <100% opacity. Replaced by the filled-rect approach (also dropped all `<defs>` / `<clipPath>`).
- ❌ **Bug (fixed) — forgetting `parseFloat` on stripe width:** `settings.regionColorStripeWidth` is a string (`"3"`) from the `<input>`. Without `parseFloat`, `x + SW` string-concatenates → rects at x≈6415 off-board → SudokuPad shrinks the board to a 9×9 miniature. Always `parseFloat(...) || 3`.

## Kropki detection

The trap: SudokuPad uses the same `rect.textbg` class for Kropki circles **and** non-Kropki labelled circles (arrow constraints, operators).

- ✅ **Disambiguation rule:** a white circle is a real Kropki dot **only if the SVG also contains at least one black Kropki circle**. Black 2:1-ratio dots are unambiguous; if a puzzle has any, all its circles are Kropki-type. White-only → treat as non-Kropki and leave them to DarkReader. Implemented via `svgHasBlackKropkiCircle(svg)`, short-circuited on the white branch of `fixKropkiDot`.
- ✅ **Two-tier shape test:** `isKropkiCircle` (shape only → colour fix) vs `isKropkiRect` (circle *and* no text sibling → label injection). Labelled Kropki circles (Difference / Ratio) get their colour fixed but are not re-labelled.
- ❌ **Naively forcing all white circles white does NOT work:** it inverts arrow-constraint puzzles (white circles carrying arrow glyphs like ↖) into black-outlined shapes, overriding DarkReader's correct dark-mode rendering. (The bug behind the v2.119 fix; regression puzzle `jhrb0vsbnk`.)

## Action buttons

- ✅ **Use the `app.select(cells)` API** (v2.102 refactor): select the N cells that need a digit, then dispatch ONE click on that digit button — O(distinct digits) instead of O(cells × digits) per-cell drags. Removed ~820 lines of dead drag helpers. Guard with `actionInProgress`, snapshot the DOM before/after each click, and auto-rollback via the Undo button on a critical mismatch.

## Thermos (bulb + shaft)

- A thermometer is **two separate elements in two different groups**: the **bulb** is a rounded `rect` in `#underlay` (so Object shading already catches it as a *fill*), and the **shaft** is a stroked `<path>` in `#arrows` (Object shading did *not* touch it pre-v2.122). They share the **same source colour** (e.g. `#CFCFCF`). Result before the fix: shaded-dark bulbs + DR-lightened near-white shafts — a visible mismatch.
- ✅ **Match shaft to bulb** (v2.122): shade the shaft *stroke* with the **same** `underlayLightness`/`underlayOpacity` used for the bulb fill (`applyThermoShaft`). Scope by colour — only `#arrows` paths whose stroke equals a bulb fill colour (`getBulbFillColors`/`isThermoShaft`) — so real Arrow-sudoku arrows and other line constraints (also in `#arrows`) are left to DR.
- DR converts the shaft via `data-darkreader-inline-stroke` (not `-fill`); the SVG observer watches that attribute too. Our inline `stroke … !important` overrides DR's stylesheet `!important` rule; no mutation loop observed.

---
*Personal / non-session notes (removed-feature history, browser-environment workarounds) live in [personal-notes.md](personal-notes.md) — not loaded by default.*
