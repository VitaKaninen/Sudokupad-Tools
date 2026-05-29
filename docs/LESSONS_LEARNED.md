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
