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

## Group A — present in the wild, `drManaged:true`, script does nothing, never verified

These render through DarkReader (so likely *look* okay) but we've never confirmed it, and some
risk clashing with our own shading. Resolve each to ✅ or ☑️.

### 🔲 A1 · `#arrows | rect` — line endpoint shapes — **110 puzzles** — *highest inconsistency risk*
- **What:** circle/pill shapes in the `#arrows` layer = between/lockout-line **endpoints**.
  Attrs: `shape:[circle,pill]`, `fillGray:true`, `stroke:#a1a1a1` (gray), `pos:[center,border]`, `drManaged`.
- **Suspected issue:** `fixAllLines` shades the line **stroke** but not these endpoint caps →
  the dots may read brighter/dimmer than the line they sit on. Most likely *visible* mismatch.
- **Spot-check:** https://sudokupad.app/itj6zle5a9 · https://sudokupad.app/ap9n4guirs · https://sudokupad.app/eloi4htjqx · https://sudokupad.app/dtibs2aoke
- **Decision:** _pending_

### 🔲 A2 · `#underlay | rect.board-position` — **198 puzzles** — *most prevalent unhandled*
- **What:** gray rects, `fillSrc:attr`, `fillGray:true`, `opacity:1`, `pos:[center,corner,border]`, `drManaged`. Penpa-heavy sample.
- **Suspected issue:** unknown role (board background / position marker?). High count, so confirm
  it's benign before any broad underlay change assumes it isn't there.
- **Spot-check:** https://sudokupad.app/5dv5v9gzux · https://sudokupad.app/e9nauc8wp1 · https://sudokupad.app/c95ydz3o0h · https://sudokupad.app/kauv2re35o
- **Decision:** _pending_

### 🔲 A3 · `#overlay | rect.feature-xv` — XV label backgrounds — **51 puzzles**
- **What:** gray rects behind XV clues, `pos:border`, `drManaged`. The X/V **text** is `#overlay text`
  (handled by overlay-marker-text); the `.textbg` class is handled; but `feature-xv` rects fall through.
- **Suspected issue:** background rect of XV clues possibly recolouring oddly vs the Kropki/label path.
- **Spot-check:** https://sudokupad.app/op15q0d27q · https://sudokupad.app/3slwsxgfm2 · https://sudokupad.app/iwnmrjr0wo · https://sudokupad.app/q9c1wria4s
- **Decision:** _pending_

### 🔲 A4 · `#overlay | path` (non-sudokux) — penpa cosmetic paths — **37 puzzles**
- **What:** cosmetic paths. Mixed colour: `fillGray:[none,true]`, strokes incl. **colored**
  (`#FF0000`, `#187BCD`, `#579F57`, `#e6261fff`) and gray (`#000000`, `#444444`, `#999999`), `drManaged`.
- **Suspected issue:** we shade `#arrows` paths and `#overlay` *rects*, not `#overlay` *paths*.
  Colored ones are most at risk of DR distortion. (`path.sudokux` is a separate, already-known ☑️ — renders fine, left to DR.)
- **Spot-check:** https://sudokupad.app/5dv5v9gzux · https://sudokupad.app/dyu5vewl1g · https://sudokupad.app/5nerx2ezhs · https://sudokupad.app/clover/nov-28-2023-loopdokux
- **Decision:** _pending_

### 🔲 A5 · `#cages | path.cage-fpColumnIndexer` / `cage-fpBoxIndexer` — **11 / 2 puzzles** — *niche*
- **What:** f-puzzles row/column **indexer** outlines, `stroke:#C77C7C` (colored, not gray), `drManaged`.
- **Suspected issue:** our cage-box fix targets the boundary paths; these special-class paths fall through. Low prevalence.
- **Spot-check:** https://sudokupad.app/no7la2bceh · https://sudokupad.app/28zri3aiup · https://sudokupad.app/philip-newman/20240813-column-indexer
- **Decision:** _pending_

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
