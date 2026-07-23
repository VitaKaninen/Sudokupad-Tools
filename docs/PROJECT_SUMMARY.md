# Sudoku Tools (SudokuPad userscript) — Project Summary

*Script `@name` is "Sudoku Tools" as of v3.66 (was "SudokuPad – Native Dark Mode"); the file stays
`Sudokupad-Tools.user.js`.*

*Current state, architecture, and conventions. Rewritten fresh periodically — last rewrite
2026-05-29; restructured 2026-07-19 (the validator subsystem moved to [VALIDATORS.md](VALIDATORS.md)
and long lines wrapped so grep-then-read works again). For the running history see `git log`; for
hard-won do/don't knowledge see [LESSONS_LEARNED.md](LESSONS_LEARNED.md).*

## What this is
A single-file TamperMonkey userscript that dark-themes SudokuPad: it locks DarkReader out of the
page, runs a self-owned frozen copy of SudokuPad's native dark mode (`FROZEN_DARK_CSS` under
`.spdr-dark`), fixes the gaps that leaves, and adds several quality-of-life features on top. (The
2.x DarkReader-fighting edition was retired 2026-07-03 — history-only, before the `native-mode`
merge into `main`.)

- **File:** `Sudokupad-Tools.user.js` — one ~12,000-line IIFE
- **Version:** bump in **two** places every release — the `@version` header (TamperMonkey uses this)
  **and** the `SCRIPT_VERSION` const near the top of the IIFE (drives `window.spdrVersion` + the
  on-screen version label). They must match; if `window.spdrVersion` lags `@version`,
  `SCRIPT_VERSION` was missed.
- **Repo:** https://github.com/VitaKaninen/Sudokupad-Tools.git (branch `main`)
- **Matched URLs:** `sudokupad.app/*`, `beta.sudokupad.app/*`, `app.crackingthecryptic.com/*`,
  `crackingthecryptic.com/*`
- **Tested on:** Chrome + TamperMonkey, LibreWolf + ViolentMonkey, and Brave + ViolentMonkey
  (DarkReader extension state irrelevant — the script locks it out of SudokuPad).

## What it fixes / does

**Dark-theme gap fixes (originally built against DarkReader; now fix the same classes of issue on
the frozen native theme):**
1. White label boxes (cage sums, little-killer clues) staying white in dark mode
2. Black colour-picker swatches (DarkReader overrides `--cell-color-*`)
3. White text halo on SVG text
4. Invisible given digits
5. Underlay (circles/pills) fill/stroke distortion
6. Cage-box path strokes (opaque black at z=8)
7. Kropki dot colour inversion
8. Region border strips (multi-colour / centre / fill)
9. Line constraints (thermo shafts, palindromes, renban, whispers, arrow lines) staying light in
   dark mode — all stroked `#arrows` paths are shaded by Object shading (v2.140; was
   thermo-shaft-only before)

**Added features:**
- **Region borders** — multi-colour split borders per region (filled rects), optional centre border,
  optional full-cell fill. The big `drawRegionSplitBorders` subsystem. **UI (v2.147):** the section
  is **collapse-when-disabled** (`buildSection({collapseWhenDisabled:true})` → off shows only
  header: checkbox + desc + ↺) and holds **2 always-visible top-level checkboxes** then **3
  collapsible subsections** built by a local `makeSubsection` helper (each: checkbox row + options
  that `display:none` until its checkbox is on), separated by inset divider lines. Top-level
  (outside every subsection, always shown): **"Hide built-in grid line on region boundaries"** =
  `regionBorderSuppressBoundary` (moved out of Center borders v3.25 — it was always read standalone)
  and **"Hide author-drawn region borders"** = `regionHideAuthorBorders` (v3.25 — see below).
  Subsections: **Center borders** (color/opacity/width), **Multi-color borders** (4
  swatches/width/opacity), **Cell borders** (`regionBorderCellEnabled`, recolor the thin built-in
  grid lines via `regionBorderCellColor`/`regionBorderCellOpacity`/`regionBorderCellWidth`).
  - **Hide author-drawn region borders (v3.25, SESSION-ONLY toggle).** Overlapping/gattai/framed
    puzzles draw their own grid frame + box/region boundary lines as **classless, `fill:none`,
    stroked `#overlay` paths** (any colour — black ones get whitened by our swap, others stay
    coloured); `#overlay` renders ABOVE our injected region group, so they sit on top of our
    coloured borders. `applyHideAuthorBorders` (called in `applySettings`, before
    `drawRegionSplitBorders`) `display:none`s each such **rectilinear** author line when the toggle
    is on (geometry-gated by `pathIsRectilinear` so diagonal/curved cosmetic lines + classed/filled
    shapes are left alone; marks hidden els with `data-spdr-auth-border-hidden` to restore on off).
    This is **deliberately aggressive + per-puzzle**, so the key is **never persisted** — listed in
    `SESSION_ONLY_KEYS`, which `loadSettings` forces back to its default on every page load (off on
    the next puzzle until manually re-enabled). Cell-borders + suppress both keep `mainGroup` alive
    standalone (added to the geo/early-return gates in `drawRegionSplitBorders`); both act on the
    cloned `path.cell-grid` — suppress rebuilds the clone's `d` from per-cell edges omitting
    region-boundary edges **and the 4 outer walls** (uses `cellRegion`/`cs`/`rows`/`cols`),
    cell-borders sets an `!important` stroke + stroke-width on the clone + strips DR's marker.
    Cell-border defaults reproduce the native look so enabling matches disabled: colour `#dddad6`
    (DR's converted grid-line colour, read from the browser), width `1`, opacity `1`.
- **Shaded-region colouring** (v2.123+) — recolour a puzzle's grey "extra regions" (`#cages
  path.cage-extraregion`, e.g. "grey regions must contain 1-9") with the 4-colour palette,
  adjacency-aware so touching regions differ. Drawn as path clones inside `mainGroup`, **below the
  region borders**; the original `#cages` paths are made transparent. As of v2.125 the clones are
  drawn whenever **any** region feature is active (even with shaded mode off the grey shading is
  moved below the borders — coloured if shaded mode is on, otherwise reproducing the grey
  Object-shaded look). The Easy Shade button cycles 4 states on puzzles that have them: off → Both →
  Regions → Shaded → off; the card pops for every active mode (only "off" leaves it hidden) and
  shows only the slider(s) for the active mode (Both→both, Regions→region only, Shaded→shaded only);
  a Both/Regions/Shaded indicator appears on the button. The button's 4 swatches mirror the palette
  live. Normal puzzles keep the plain on/off toggle + single slider.
- **Cell selection** customization (v2.110+, restructured v3.27, master removed v3.42) —
  **master-less** section (label "Cell selection", `noMasterCheckbox`, like Given / placed digits;
  the old `selectionColorEnabled` master + its buildCSS gate are gone) with **two always-visible
  collapsible subsections**, both restyling `#cell-highlights path.cage-selectioncage` via buildCSS
  (gated on each subsection's own toggle): **Border** (`selectionBorderEnabled`, default on) = cage
  stroke colour/opacity/width (`selectionColor`/`selectionOpacity`/`selectionWidth`, default
  `#3399ff@0.7`/8 — the brighter look users expect; native's raw stroke is duller) + Inside/Outside
  grow mode + offset (`selectionBorderMode`/`selectionBorderOffset`, applied to the path `d` by
  `applySelectionBorderOffset`, gated on border only); **Background** (`selectionBgEnabled`, default
  on) = cage fill colour+opacity (`selectionBgColor`/`selectionBgOpacity`, **default opacity 0 =
  transparent**, which clears SudokuPad's hardcoded grey `rgba(255,255,255,0.4)` fill; raise opacity
  to tint selected cells). Unchecking both subsections reverts to the pure native selection.
  (v3.26's `selectionHideBackground` checkbox was replaced by the Background subsection's
  colour/opacity.)
- **Action buttons** (Fill, Clear, Clear All) — auto-fill / clean centre pencilmarks via the
  `app.select()` API.
- **Fill single candidate** (v3.38) — floating square button above the ⚙ gear that auto-completes
  the endgame: repeatedly places the digit in any empty cell down to one **valid** (non-`.conflict`)
  centre candidate, watching the chain propagate; stops on completion, contradiction (a cell at zero
  valid candidates), or when no forced single remains.
- **Cell shading** + **Object Shading** — opacity / brightness controls. **Gray vs colored split
  (v2.140):** gray objects (saturation ≈ 0) read dim where colored objects read bright at the same
  value, so each has its own brightness + opacity (4 keys: `underlayLightness`/`underlayOpacity`,
  `underlayGrayBrightness`/`underlayGrayOpacity`). **Combined vs separate (v2.141):** a section
  checkbox **"Control opacity and brightness separately"** (`underlaySeparateBrightnessOpacity`,
  default off) toggles the UI between one *combined* slider per side (**Color object brightness** /
  **Gray object brightness**, each drives both its axes to the same value via the `makeRangeRow`
  `extraKeys`/`extraEnabledKeys` option) and two *separate* sliders per side (**Color
  brightness**/**Color opacity**, **Gray brightness**/**Gray opacity**). Combined/separate is
  **UI-only** — `computeObjectShade(c)` always reads the 4 keys (gray detected by `isGrayColor`); in
  combined mode the pair is just kept equal. Colored brightness uses the `absolute` mapping (pure
  hue at HSL lightness = slider) via `shadingTransform`. Defaults: color 0.4, gray 0.6, Border
  brightness 0.5. (The v2.130 `relative`/`luminance` mode selector / `underlayBrightnessModel` were
  removed v2.134.) Lines (all stroked `#arrows` paths) and fills both route through
  `computeObjectShade`. It also shades coloured **`#overlay` shapes** (lucky-charm
  circles/squares/diamonds), not just `#underlay` — **always on** as of v2.140 (the
  `underlayOverlayEnabled` opt-in checkbox was removed), broad skip-rule (`shouldShadeOverlayRect`:
  skip `.textbg`, transparent, white/near-white). Shape **outlines** get the same combined/separate
  treatment via their own keys (**Border brightness**/**Border opacity**,
  `underlayStrokeLightness`/`underlayStrokeOpacity` @ 0.75; `applyShapeStroke`, brightness preserves
  the element's hue) — as of v2.143 opacity is configurable (was hardcoded 1.0). So all three groups
  (colored / gray / border) follow the one "separate" checkbox. The object-shading section overrides
  `controlSyncers` for its keys with one `refreshAll` (combined + separate rows share keys), so both
  resets re-sync correctly. The section ↺ does **not** reset `underlaySeparateBrightnessOpacity`
  (leaves the combined/separate checkbox as-is); only the bottom "Reset all" restores it. Region
  borders default **on** as of v2.141 (so the bottom "Reset all" enables it; the per-section ↺ never
  touches a section's enable toggle).
- **Settings panel** — flex-column, non-scrolling header, content in its own scroll area.
- **`window.spdrVersion`** — exposed at init for one-query version verification.

## How the script is organized
One IIFE. Major regions, in order:
1. Settings DEFAULTS + persistence
2. CSS injection (`rebuildStyleTag` / `buildCSS`)
3. SVG/region helpers + `drawRegionSplitBorders`
4. Rectilinear-polygon helpers (`parsePathSubpaths`, `removeCollinear`, `offsetPolygon`,
   `offsetRectilinearPath`) + selection-border state + its MutationObserver
5. Action buttons (`Framework.getApp()` → `app.select()`)
6. UI helpers (`buildSection`, `makeColorRow`, `makeWidthRow`, `makeRadioRow`, `makeOffsetRow`,
   `makeSubCheckbox`, …)
7. `buildSettingsUI`
8. `buildActionButtons`, `buildEasyRegionShadeButton`, `buildVersionLabel`, `buildFillSingleButton`
9. Right-hand column layout: `ensureRightColumn`, `ensureRightColButtonRow`, `ensureGearHolder`,
   `nativePadWidth` / `nativeControlsReady` / `applyControlsWidthCap` / `watchNativePadWidth`,
   `rightColW` / `collapsedRightColW` / `rightColOverhang` / `setRightColWidth`,
   `applyStaticColWidths` / `alignNativeAuxRow` / `centerControlsFooter`,
   `injectRightColCss` / `updateRightColCss` / `injectRulesWidthCss`
10. `buildAllUI` — orchestrates the above on DOMContentLoaded

### SVG z-order (DOM order in `#svgrenderer`; earlier = rendered behind)
1. **Our injected group** `[data-spdr-region-split]` at `svgEl.firstChild`: cell-grid clone first,
   then per-region border-strip rects, then centre-border clones.
2. Puzzle features (thermos, arrows, wheel arcs, inequalities)
3. `#underlay` — circles / pills
4. `#cell-colors` — puzzle-defined fills (opacity reduced by Cell shading)
5. `#cages` — outlines, killer labels
6. `#cell-grids` — `path.cell-grid` (its `d` cleared while our features are active) + 9 cage-box
   outline paths (`stroke` set to none while active)
7. Highlights, selection rects, digits

**Invariant:** our group at `firstChild` → puzzle features render on top of our strips; the
cell-grid clone inside the group → strips cover that clone. A position observer re-inserts the group
at `firstChild` if SudokuPad prepends nodes.

### Code map
One IIFE, ~370 top-level functions — **don't read the whole file**. Grep the function name below and
read only that region. Coarse on purpose (entry points per feature, not every helper); keep it that
way so it stays low-maintenance.

- **Dark substrate (boot):** `lockDRUseNative` (IIFE at document-start) — injects `<meta
  darkreader-lock>` (evicts DR), forces `svencodes_settings.darkmode=false` (SudokuPad's own DMA
  stays off), injects `FROZEN_DARK_CSS` (our verbatim, frozen copy of DMA's rule set re-keyed to
  `.spdr-dark`), and adds `.spdr-dark` to `<body>`. So the page's dark theme is *ours*, not
  SudokuPad's live DMA — change `FROZEN_DARK_CSS` to retheme. `isNativeDark()` checks `.spdr-dark`;
  `isDarkMode()` = that OR `isDarkReader()` (DR fallback). Our own buildCSS rules +
  `darkenInlineToolButtons` are all keyed on `body.spdr-dark`.
- **Native constraint payload (layer 0, v3.90) — `getRawPuzzleJson` / `getNativeLineClues` /
  `nativeLinesFor(type)` / `hasNativePayload`:** f-puzzles puzzles (~30% of the catalog) declare
  their constraints in the raw payload (`PuzzleLoader.cache` → `decompressPuzzleId`, synchronous, no
  fetch); every classifier consults it FIRST, and `cp.thermos` is VETOED whenever a payload exists.
  Full detail: [VALIDATORS.md](VALIDATORS.md) "Layer 0".
- **Settings & lifecycle:** `loadSettings` / `saveSettings` (localStorage `sp-darkreader-fix`),
  `buildCSS` (generates the injected stylesheet), `rebuildStyleTag`, `applySettings` (re-applies
  everything), `waitForDRAndSVG` (startup gate), `buildAllUI` (orchestrates UI on load),
  `darkenInlineToolButtons` (the v3.3.0 button-darkening is a stylesheet rule on `<button>`s;
  Fill/Clear/Clear All are `<div>`s in `.controls-tool` with an inline `!important` light bg no
  stylesheet can beat, so this overrides their bg+colour imperatively — saving the native bg to
  restore on dark-mode-off; called from `applySettings` + a retry loop in `buildAllUI`). **Board
  re-fix observer (v3.104):** the `#svgrenderer` childList observer (inside `startLabelRectPatch`)
  CLASSIFIES each added node — our own injected nodes and the layers with dedicated patch observers
  (`#cell-candidates`/`#cell-pencilmarks`/`#cell-highlights`) are skipped, `#cell-values` triggers
  only the placed-digit pass — and coalesces the remaining work into one `requestAnimationFrame`
  flush (rAF fires before paint, so fixes still land before the user sees the frame; previously
  every added node — every selection change, every mark — ran the full 12-pass sweep synchronously).
- **DarkReader fills** (per element type; the `!important` master key is `applyInlineFill`):
  `fixLabelRect`/`fixAllLabelRects` (white label boxes; **skips saturated/coloured** cosmetic textbg
  → those go to Object shading), `fixCageBox`/`fixAllCageBoxes` + `isCageBoxPath` (cage-box
  strokes), `fixUnderlayRect`/`fixAllUnderlays` (also shades `#overlay rect` via
  `shouldShadeOverlayRect`; overlay shading always on) +
  `applyShadingFill`/`applyShapeStroke`/`shadingTransform`/`computeObjectShade`/`isGrayColor`
  (object shading; `computeObjectShade` is the gray-vs-colored router for fills+lines — picks the
  gray or color brightness/opacity key pair via `isGrayColor`; `shadingTransform` maps a colored
  value to pure hue at the slider's absolute HSL lightness; `applyShapeStroke` is the separate
  outline/Border-brightness path, not routed through `computeObjectShade`),
  `fixGivenText`/`fixAllGivens` (given digits) + `fixUserText`/`fixAllUserDigits` (placed digits,
  `#cell-values text`) — gated only on their own sub-toggle (`givenEnabled`/`userDigitEnabled`);
  they make up the master-less **"Given / Placed digits"** section, `fixCagePath`/`fixAllCagePaths`.
  `fixOverlayMarkerText`/`fixAllOverlayMarkerText` (author-drawn **grayscale** `#overlay text` —
  e.g. clover Rank-Sudoku `#N` markers, Counting-Neighbours X/O letters; routes them through
  `computeObjectShade`'s **gray** branch so they track the Gray object-shading sliders; captures the
  author's orig fill in `dataset.spdrOrigFill` to restore when off; skips Kropki labels + coloured
  overlay text. NB this is *not* the v2.118 given-color approach — that white-forced them; this
  scales the gray). **Lines:** `fixAllLines` + `isLineStroke`/`applyLineStroke` — shade the stroke
  of **every** stroked `#arrows` path (thermo shafts, palindromes, renban, whispers, arrow lines)
  via `computeObjectShade`; broadened from the old bulb-color-matched thermo-shaft-only scope in
  v2.140. Stroke width untouched. **Same-type colour disambiguation (v3.94) —
  `disambiguateShadedColors`/`collectDisambigGroups`/`disambiguateGroup`/`spreadCluster`:** runs
  after every shading batch (applySettings + both observer paths). Object shading maps colours to
  pure hue at a fixed lightness, so two objects the author drew DISTINCT that share a hue collapse
  to one colour (`bdiaxwjnxc` peach entropic #ffe5b4 + orange Dutch #ffa600, both hue ~37°, differ
  only in lightness → identical). This pass does nothing unless two objects OF THE SAME TYPE (two
  lines, or two fills — never a line vs a fill) render within `DISAMBIG_DETECT` (RGB 34) of each
  other WHILE their originals differed; it then separates the colliding cluster along the axis the
  ORIGINALS varied on (hue weighted ×9, then lightness/saturation). The separation is **BOUNDED and
  vivid-anchored (v3.96)** — it must survive the dark canvas AND the line's ~0.4 opacity, which
  washes a too-light/too-desaturated colour out to grey. So: **hue** collisions rotate members apart
  around the shared hue (hue never greys); **saturation** collisions keep the most-saturated
  original vivid and step the rest down, floored at 0.45; **lightness** collisions keep the DARKEST
  (most vivid) original at its lightness (so it renders bright — orange → native `#ffa600`) and lift
  paler originals only modestly, **capped at L 0.66** (so peach → light amber, not the cream that
  read grey). Two earlier misfires bracket this: v3.94 centred on the collapsed dark value (orange
  went dull, peach went vivid-orange); v3.95 over-lifted to L 0.90 (peach read grey at line
  opacity). Preserves the author's ordering; skips grey originals + our palette regions; idempotent
  (recomputed from originals each pass). Gated by `settings.disambiguateColors` (default on;
  deliberately NO UI checkbox — a localStorage-only escape hatch) + object shading being on.
- **Kropki:** `fixKropkiDot`/`fixAllKropkiDots`; detection `isKropkiCircle` (shape: feature-kropki
  OR a `w≈h` & `rx≈w/2` rounded rect whose class is textbg/absent — the `w≈h` part rejects
  double-arrow pills) / `isKropkiRect` (shape + no text sibling) / `isOnCellBorder` /
  `getKropkiAdjacentText`, and **`isKropkiDotRect` = shape ∧ black/white fill ∧ on-border** (the
  single "the Kropki fix owns this" predicate; object shading + label-bg both skip it so dots aren't
  double-claimed). Scans include class-less `#overlay`/`#underlay` circles. Rules + the 3 puzzles
  that hardened them in LESSONS_LEARNED; `rebuildKropkiLabels` (+ `centerKropkiLabel`, which centers
  each label's ink via a FIXED per-glyph nudge table `KROPKI_INK_NUDGE` measured off the
  **alphabetic baseline** — forces `dominant-baseline:alphabetic` **and**
  `text-rendering:geometricPrecision` inline-`!important` + `{dx,dy}` as fractions of font-size:
  `:`→`dy 0.275`, `~`→`dy 0.324` (ink-center height above the baseline, measured at LARGE size =
  unhinted geometry), unknown glyphs `dy 0.35`, all `dx 0`. Synchronous + rebuild-safe. The
  alphabetic baseline is the **cross-browser fix** (v2.182): the earlier `middle` baseline (v2.181)
  renders differently in Gecko vs Blink, which `rotate(90,cx,cy)` turned into a left-shift of
  *rotated* glyphs in Firefox/LibreWolf only; alphabetic needs no font-metric math so every engine
  agrees. **geometricPrecision is the v2.183 fix for the remaining per-dot + per-engine wobble:** at
  ~16px the glyph is HINTED (grid-fit to whole pixels) by an amount that varies with each dot's
  sub-pixel position and per engine, so it slid off the (unhinted vector) circle inconsistently;
  geometricPrecision makes the live SVG render the true unhinted outline (no other CSS disables
  hinting). NB it's honored by the live inline-SVG paint but NOT by an `<img>`-decoded SVG, so don't
  verify it via an img raster. Replaced the v2.175 async ink-raster
  (`measureKropkiInk`/`applyKropkiInkCenter`/`spdrKropkiInkCache`), which raced rebuilds and flung
  the colon out of its circle in v2.180 — see LESSONS_LEARNED "Centering an injected glyph on a
  Kropki dot". The `rotate(90,cx,cy)` pivot for horizontal-border dots keeps the unrotated nudge
  centered in both orientations.); injected labels use the shared
  `kropkiLabelSize`/`kropkiLabelWeight` settings — UI: a "Label size" row at the bottom of the
  Kropki section, greyed unless at least one label checkbox is on; defaults 16px / weight 600,
  larger than the old hardcoded 13/normal).
- **Region borders:** `drawRegionSplitBorders` (main entry; inner
  `drawHorizRuns`/`drawVertRuns`/`addRect`), `inferRegionsFromSVG` (region geometry — pure SVG, no
  model dep), `computeRegion4Colors` (≤4-colour, assigned per logical GROUP so disjoint pieces
  match) + `colourGraph` (greedy→backtracking proper ≤4-colouring helper, takes optional `pinned[]`
  fixed-colour array), `countComponents` (flags a group disjoint = its cells form >1 orthogonal
  component; disjoint groups are pinned to palette colour 3/orange so red>blue>green stay the common
  colours). **Region borders + region fill keep this minimise-then-pin policy** — the "maximise
  distinct colours" change (v3.22) was scoped to SHADED regions only (see below), since borders/fill
  are a separate feature with their own established look. **Disjoint/scattered regions:**
  `getModelRegionMap` (cached `{ 'r,c': logicalId }` from `app.puzzle.currentPuzzle.cages` where
  `type==='region'`, `cells` = 1-indexed RC string; async refresh keyed by `location.pathname`,
  repaints when ready; null for normal sudoku → geometry only), `buildModelRegionMap`,
  `buildRegionGroups` (collapses geometric pieces sharing a logical id into one colour group). Both
  the multi-colour borders and Easy Shade fills read the one `regionColors[]` array, so they always
  match.
- **Shaded regions:** `assignExtraRegionColors` (samples each `cage-extraregion` path's cells via
  `isPointInFill` at cell centres, colours via `colourShadedRegions`, stores idx in
  `dataset.spdrExtraColorIdx`), `regionFeatureActive`/`extraRegionsMovedBelowBorders` (predicate
  read by `fixCagePath` — when true it makes the original `#cages` path **transparent** via
  `applyExtraRegionFill`, because the visual is drawn as a clone below the borders),
  `puzzleHasShadedRegions` (gates the button's 4-state cycle + 2nd slider). The clone itself is
  drawn by `drawRegionSplitBorders`: when `needShadedClones`, it calls `assignExtraRegionColors`
  again (observers trigger it decoupled from `applySettings`, so idx must be recomputed) and inserts
  clones as the FIRST children of `mainGroup` → below the border strips (palette colour if shaded
  mode on, else grey). Button cycle + palette-mirroring swatches (`easyShadeSwatchRefresh`, called
  from `applySettings`) live in `buildEasyRegionShadeButton`. **Underlay-rendered shaded regions
  (v3.16 detection, v3.17 model colouring):** an extra region can instead be authored as a hidden,
  sum-less, `unique` killer cage (or `style:'extraregion'` cage) that SudokuPad draws as plain grey
  `#underlay rect`s with **no `cage-extraregion` path to clone** (e.g. `zax289niwv` "We Live Here" —
  a repeat inside the grey area is a real conflict, so they're true regions). **Detection is
  DOM-only** (keeps the early/hot `puzzleHasShadedRegions` path Framework-free):
  `getDomShadedRegionMap`/`computeDomShadedRegionMap` scan `#underlay rect`s whose **original
  attribute fill** is grayscale + non-white + ≈full-cell. **Grouping reads the model SYNCHRONOUSLY**
  (`readModelExtraRegions` → `Framework.app.puzzle.currentPuzzle.cages`, guarded + try/catch;
  **qualification rule (v3.49):** `unique && type∉{region,rowcol} && cellCount ===
  settings.digitSet.length` — i.e. ANY conflict-checked cage that spans one full no-repeat region,
  however authored/drawn. A 9-cell unique cage in a 9-digit puzzle *necessarily* holds 1–9, so this
  is sound; it replaced the old `style==='extraregion' || (hidden && sum==null && value==null)`
  filter, which missed Windoku windows authored as sum-less `style:'killer'` cages — `5krkgmjq7q`),
  so two distinct regions that *touch* get **different** colours via `colourShadedRegions` (v3.22+ —
  `colourSpread`→`colourGraph` fallback; **maximises distinct palette colours**: N regions → N
  colours up to 4, >4 spread proper so no two touching alike. Shared by both shaded-region paths;
  region borders/fill deliberately do NOT use it). **Qualification rules (v3.21, contiguity dropped
  v3.22 — narrowed from "any model region overlapping a grey cell", which wrongly grabbed a
  hidden-unique MAIN DIAGONAL and recoloured stray objects in its cells):** a region
  is recoloured ONLY when it is a *deliberately-shaded full no-repeat region* — (1) **size** exactly
  `settings.digitSet.length` (drops sub-size cages — a cage ≠ a region); (2) **fully + consistently
  shaded** (EVERY cell carries a shade rect of one colour, ≤24/channel spread — a partly-shaded
  region is not deliberate); (3) **grey only** — a region shaded a REAL colour is left alone (the
  author may use colour to distinguish regions; recolouring would erase that). **No contiguity
  requirement** (v3.22): a deliberately-shaded NON-contiguous full region is valid and IS coloured
  (e.g. a clover-style staircase "these 9 cells hold 1-9"); the diagonal is excluded by rule 2 alone
  (barely shaded), so contiguity was redundant + the only rule that could wrongly reject a real
  non-contiguous region. `computeDomShadedRegionMap` reads each cell's shade from the **attribute**
  fill (gray + real), then tests every model region against the three rules; the flood-fill fallback
  applies the size rule per connected grey component. So a feature-sampler puzzle (red region = real colour →
  left alone; diagonal = only 2/9 shaded → skipped) recolours **nothing**, while `zax289niwv` (4
  full-size grey hidden-unique cages) is unchanged. **Seam fix (v3.22):** `applyCrispEdges` sets
  `shape-rendering:crispEdges` on shaded **axis-aligned square-cornered** rects (skips rotated
  diamonds / rounded shapes — those keep AA), so the many tiled pieces a region is built from (full
  cells + bridging strips) meet seamlessly on the dark canvas instead of showing faint AA seams.
  Flood-fill of the grey cells is only the fallback before `currentPuzzle` is set — the cache is
  non-`final` then, and a one-shot `setTimeout`→`fixAllUnderlays` upgrades to the model grouping
  once it lands. Returns a cached `{ 'r,c': paletteIdx }` map (keyed by URL + underlay-rect count;
  wrapped in try/catch so it can never abort the paint path). `puzzleHasShadedRegions` returns true
  when that map is non-null; `fixUnderlayRect` recolours each grey rect via `extraRegionRectColor`
  (rect **centre** → cell → palette idx, so full cells *and* inset border strips recolour) at
  `shadedRegionColorOpacity`, overriding the grey Object-shading (off → grey). Why a guarded
  **synchronous** model read is safe where v3.15's async `getApp().then(applySettings)` was not (and
  why detection stays DOM-only): see LESSONS → the v3.15–3.17 shaded-underlay-regions section.
  **Model-only regions (v3.49 — Windoku):** an extra region can have NEITHER a `cage-extraregion`
  path NOR a grey `#underlay` rect — only the model cage + (sometimes) a dashed `cage-killer`
  outline (`5krkgmjq7q` Windoku: 4 sum-less unique cages drawn as dashed killer boxes, 0 underlay
  rects). `getModelShadedRegionMap` (cache `_modelShadedCache`, keyed by URL, final once
  `currentPuzzle` is set) reads `readModelExtraRegions`, 4-colours via `colourShadedRegions`,
  returns `{ 'r,c': idx }`; `puzzleHasShadedRegions` now returns true when it is non-null too.
  `drawRegionSplitBorders` gained a **model-shade pass** (after the clone pass): when
  `shadedRegionColorEnabled` and there is no `cage-extraregion` path, it DRAWS a full-cell
  `crispEdges` rect per region cell into `mainGroup` (below the borders), skipping any cell that
  already carries a full-cell `#underlay` rect (those are recoloured in place by `fixUnderlayRect`,
  so grey regions never double-paint). **Auto-enable (v3.49):** `scheduleAutoShade`/`applyAutoShade`
  turn the Easy Shade button's first option (Shaded) ON automatically on any puzzle where
  `puzzleHasShadedRegions()` is true. The flip is **in-memory only (never saved)** —
  `applyAutoShade` recomputes the effective state per puzzle as `has-extra-regions ? on :
  loadSettings().shadedRegionColorEnabled`, so it falls back to the user's saved preference on
  ordinary puzzles and never leaks. Decided once per puzzle (keyed by URL via `_autoShadePollKey`,
  polled up to ~6s for the model to load); afterwards the user can toggle it off and it stays off.
  Called from `startLabelRectPatch` (init) + the board re-render observer (SPA navigation).
- **Selection border:**
  `applySelectionBorderOffset`/`applyAllSelectionBorderOffsets`/`computeSelectionShift`; geometry
  `offsetRectilinearPath`/`offsetPolygon`/`parsePathSubpaths`/`removeCollinear`;
  `startSelectionBorderObserver`.
- **Action buttons:**
  `fillSelectedCellsWithCandidates`/`removeInvalidPencilmarks`/`clearMarksInSelected` (the 3 in-grid
  actions), `buildActionButtons`/`buildActionButton`; helpers
  `getSelectedCells`/`getCurrentMode`/`snapshotPencilmarks`/`diffSnapshots`/`countVisibleConflicts`/`revertToSnapshot`.
  **The 3 buttons are STATIC (v3.46)** — each is a plain `wrap > btn` (wrap = 100%×100% grid cell;
  btn = absolutely positioned, inset by the native button margins, sized to a native button) showing
  the short label, with the full description as the native `title` hover tooltip. The old
  hover-expand machinery (clipper/overflow-hidden/EXPANDED_W/mouseenter-mouseleave width transition
  + the per-line padding math) is gone. `syncActionButtonGeometry` (was `syncClipperOffsets`)
  re-reads the reference button's margin/size/bg at insert + 100ms + 500ms to beat the CSS-load
  race. They get `spdrFxButton` (hover-brighten + active-depress + click flash), matching the native
  buttons + the Fill-single button. **Fill single candidate (v3.38, fleshed out v3.39):**
  `fillSingleCandidates` (runner) + `buildFillSingleButton` (a **standalone floating square**
  button, NOT in the controls-tool grid — `bottom:56px right:12px`, just above the ⚙ gear; matches
  the trio's colours/border/radius/flash; **4-line label** `Auto-fill / single / candidate / cells`
  at 9px, toggles to **"Stop"** while running). Endgame autocomplete: a "valid candidate" = a
  **non-`.conflict`** tspan in `#cell-candidates` (corner marks + invalid/red marks ignored; we
  never validate or eliminate — SudokuPad's synchronous conflict re-tag on
  `app.act({type:'value',arg})` IS the propagation). Gate: every empty cell ≥1 valid candidate AND
  ≥1 empty cell has exactly one. Loop: select the single-candidate cell → select-delay → place its
  digit → fill-delay → rescan; an undo-delay paces the Undo. **All three delays live in settings**
  (`fsSelectDelayMs`/`fsFillDelayMs`/`fsUndoDelayMs`, read live via
  `fsSelectDelay`/`fsFillDelay`/`fsUndoDelay`) and are editable in Settings → Action buttons (number
  inputs, no reload), alongside a **"Show Auto-fill button"** checkbox
  (`settings.showFillSingleButton` → `controlSyncers`) and a **Debug** button that cycles **every
  popup the script can show** via `fsDebugList`/`fsDebugShowNext` — both the Fill-single
  explainer/result states AND the action-button toasts (Fill / Clear / Clear All / Remove invalid).
  Action-toast previews call the real `showWorkerResult` with synthetic result objects (so the text
  never drifts); a module flag `fsPreviewActive` makes `showRemoveInvalidToast` force-show (ignore
  `showToasts`), skip the auto-fade, and float above the panel. Previewed Undo is inert. A specific
  cell is surfaced to the player only via **`fsCellLabel`** ("col,row" → `(R{row+1},C{col+1})`,
  1-indexed row-first) — also now used by the Fill/Clear abort messages. **Action-lock behaviour
  (v3.44):** the 3 fill/clear buttons finish in a fraction of a second, so on a rapid re-click while
  `actionInProgress` they are simply **locked out silently** (`if (actionInProgress) return;` — no
  popup; there's nothing for the user to do). Only the **auto-fill** has a Stop affordance: while it
  runs, `fillSingleCandidates` shows a **persistent running popup** (`fsRenderRunning` → yellow
  "Auto-fill is running… Click here (or the Stop button) to abort") that stays up the entire run
  **regardless of mouse position** and is itself **clickable to abort** (v3.45 — clicking anywhere
  on the toast sets `fsState.aborted`, same as Stop; guarded by `fsState.running` so a debug preview
  is inert) — the `mouseleave` handler and `fsShowOnHover` both leave the toast alone while
  `fsState.running`, and `finish()`→`fsSetResult` swaps it for the result toast at the end.
  (Replaces v3.43's `actionBusyMessage`, which only appeared on a cross-button click and is gone.)
  Result text is built by the shared `fsResultMessage` (runner + debug stay in sync). Stops on full
  grid, any empty cell at **zero** valid candidates (parks selection there), no single-candidate
  cell, or a 2nd button press (abort via `fsState.aborted`). **`fsState`** holds run +
  sticky-message state; helpers: `fsScanValid`/`fsAnalyse` (classify empties → zero/single),
  `fsRenderToast`/`fsHideToast`/`fsRenderExplainer`/`fsRenderRunning`/`fsShowOnHover` (hover popup:
  green when ready, yellow + blocking-reason when not; `fsRenderRunning` is the persistent yellow
  "click Stop" popup shown for the whole run — its own `#sp-fs-toast`, distinct from the action
  toast), `fsSetResult`/`fsClearResult` + a **cell `MutationObserver`**
  (`fsStartCellObserver`/`fsStopCellObserver`, lifecycle gated by `fsSyncObserver` — runs whenever a
  result toast OR an armed Undo exists) that does double duty: drops the sticky result the instant
  the user edits values/candidates, AND drives the post-run Undo button (next item). **`fsSetResult`
  respects `showToasts` (v3.47):** the result auto-pops only when "Show action result notifications"
  is on, EXCEPT a `broken` result (a cell has no valid candidates left — an error) which always pops
  (same policy as the action-button toasts). When suppressed it still stores the result (re-appears
  on hover) and hides the lingering "running" popup. The hover explainer and the during-run
  "Auto-fill is running…" popup are NOT gated (a hover helper and an abort affordance, not result
  notifications). `fsDoUndo` (re-clicks the native undo button until the **first** filled cell is
  empty again, capped at `filledCount`; guarded by `fsState.undoing` so its own mutations don't
  self-revoke), `fsSetButtonLabel` (3 modes: `idle` 4-line label / `stop` / `undo`; also tracks
  `fsState.buttonMode`). **Post-run Undo on the floating button (v3.48):** instead of reverting to
  the idle label, after a run that placed ≥1 cell the button becomes **"Undo"** and rewinds the
  auto-fill on click. It is shown **exactly while the live puzzle still equals
  `fsState.postFillSnapshot`** (a `snapshotPencilmarks()` taken right after the run) — so it
  disappears on ANY edit and **RETURNS** if the player native-undoes back to that exact state (even
  after subsequent changes, since reaching it requires undoing them first → our fills are back on
  top of the undo stack). `fsArmUndo`/`fsDisarmUndo` set/clear the snapshot; `fsUndoAvailable` =
  `diffEmpty(diffSnapshots(snapshot, live))`; `fsRefreshUndoButton` (called from the observer) flips
  the label; `fsRenderUndoExplainer` is the hover popup in Undo mode. The button is now the **sole**
  Undo affordance — the result toast's own Undo button was removed (toast is informational only), so
  `fsRenderToast` lost its `opts.undo` block and `canUndo` is gone from `fsSetResult`/the result
  object. Post-run messages persist until a click-elsewhere; re-hovering the button re-shows AND
  **re-pins** them (so they again persist until the next click-elsewhere, not just until hover-away
  — `fsShowOnHover` sets `resultPinned`). The Undo lives on the button (above), not the toast. The
  button, ⚙ gear (`sp-fix-btn`) and version label are **z-index 900** (below SudokuPad's
  `.dialog-overlay` scrim at z 1000) so they dim with the page when the native settings dialog
  opens; `getToastBottom` clears the button. The ⚙ gear + Easy Shade button also gained
  `spdrFxButton`. **Fill/remove mechanism (v3.18):** the workers (`_fillSelectedInternal`,
  `_removeInvalidPencilmarksInternal`/`…MultiPass`) drive marks via SudokuPad's **paste path** —
  `app.act({type:'candidates'|'pencilmarks', arg:digit})` toggles a centre/corner mark on the
  api-selected cells with **no tool-mode switch and no digit-button click** (so no UI flicker),
  wrapped in one `app.act({type:'groupstart'})`/`groupend` per worker so each op is a single undo
  (fill + sweep = 2 undos). Toggle semantics: act on cells *missing* a digit to add it (fill,
  additive), or *having* it to remove (sweep). `ToolToAction`: centre→`candidates`,
  corner→`pencilmarks`, normal→`value`. Copy/paste is in-memory (`FeatureCellPaste.copiedProps`),
  **not the system clipboard** — Notepad can't see it. **Full revert on any abort (v3.43):** the
  only abort an internal worker actually raises is `unexpected-diff`
  (mode-drift/no-effect/selection-stuck were dead drag-era reasons, removed from the toasts). On
  abort the *public* entry points (`fillSelectedCellsWithCandidates`, `removeInvalidPencilmarks`,
  `clearMarksInSelected`) now call **`revertToSnapshot(preSnap, max)`** — snapshot taken before the
  button press; clicks the native undo (one edit-group per click) until the puzzle's marks match the
  snapshot again, re-checking `diffEmpty` *before* each click so it stops the instant it matches
  (never over-undoes into the user's own moves) and caps so an unreachable state fails loudly. This
  guarantees restoration even in the cases the per-group rollback missed: a **multi-pass** remove
  aborting on pass 2+ (earlier passes' removals) and **fill-then-sweep** (fill is a separate
  committed group). `showWorkerResult`'s abort branch + the fill abort messages are now uniform on
  `result.fullyReverted`: success → "All changes were reverted: the puzzle is back to exactly how it
  was before you pressed the button"; failure → a single CRITICAL "could NOT be fully reverted —
  press Ctrl+Z" (the old per-reason "Nothing was damaged" / partial-count text is gone).
- **Validate Constraints — the validator subsystem (v3.53+; full documentation in
  [VALIDATORS.md](VALIDATORS.md)):** floating button + popup menu of per-constraint validators
  (Kropki, cages, little killers, thermos, German/Dutch whispers, XV, sum + double arrows,
  between lines, renban, region-sum, parity, zipper, entropic, modular) that remove — never add — centre candidates with no
  complete support. Entry points: `buildValidateButton` / `openValidateMenu` /
  `constraintValidators()` (the registry; the in-code "ADDING A VALIDATOR" banner above it is the
  authoritative checklist) / `detectedValidators` (classifies line validators once per menu build →
  `def.cls`) / `runSingleValidator` / `runAllValidators` / per-type `compute*Removals` /
  `makeValidatorEye`. Single toggle: `showValidateButton` (the per-validator enable keys were
  removed v3.104). **Shared circle/bulb reader (v3.120): `getCellCenteredCircles`** — every
  cell-centred round marker in `#overlay`/`#underlay` (SudokuPad draws them as rounded `<rect>`s,
  rx ≈ w/2, never `<svg:circle>`); read by the sum-arrow bulb detector, the between-line endpoint
  circles *and* the eyeball's geometry-matched rings, so add new circle consumers here rather than
  re-deriving the geometry. Between lines derive their clues by **walking the drawn-step graph**
  between circles (`betweenSegments` / `lineStepGraph` / `walkBetweenSegment`, v3.121) instead of
  trusting stroke order — a stroke threading N circles is N−1 clues, and a line continues *straight*
  through a crossing even where the stored polyline turns there. Its button, menu and toasts live in the right-hand column — see "The right-hand
  column" below. Architecture, per-validator notes, detection layers, ambiguity policy,
  digit-set/fog rules and the candidate-elimination contract all live in
  [VALIDATORS.md](VALIDATORS.md).
- **Zipper fold centres (v3.123, corrected v3.124):** **`zipperChains`** (→ `mergeZipperChains`) and
  **`zipperFoldCenter`** are the single shared reader — *one clue can be drawn as several strokes*,
  so the classified chains are joined end-to-end before anything folds them, and the fold point is
  computed in one place. All three consumers go through them: `computeZipperRemovals` (the
  validator's pairing), `drawZipperCenterDots` (the injected cosmetic dot) and
  `validatorClueObjects`' `zipper` case (the eyeball disc) — so a fold point can never mean three
  different things in three places. `drawZipperCenterDots` (+ helpers `zipperLineDomPaths`,
  `smallCosmeticMarkerPoints`) is a *rendering* feature: where a confidently classified zipper has
  no cosmetic object within 0.3 cells of its fold centre, it injects a `[data-spdr-zipper-dot]`
  `<circle>` in the line's own **rendered** colour, diameter = `zipperCenterDotScale` × the line's
  stroke width. It runs at the tail of the render pipeline (`applySettings`, `startLabelRectPatch`,
  the observer's `flushFixes` WORK_FULL branch) so it reads the stroke **after** `fixAllLines` has
  shaded it; its own nodes are classified `'none'` in `classifyAddedNode` so they can't re-trigger a
  sweep. The eyeball disc uses the same multiplier against the highlight's own line width (`SEG_W`),
  so drawn and highlighted marks match. Settings: `zipperCenterDotEnabled`, `zipperCenterDotScale`.
  Regression-tested in `validator_harness.mjs` against `k9mm1xgca5`, which marks all seven of its
  own fold centres.
- **Region-border device-pixel snapping (v3.124, settled v3.129):** `borderSnapCtx` /
  `makeAxisSnap` / `snapCenteredBand` + `rectilinearSegments`, used inside
  `drawRegionSplitBorders` (`addRect` and the centre-border block). **Unconditional — no
  setting**; falls back to unsnapped drawing only when there's no board or the transform is
  rotated/skewed. Three rules, and they are the whole design:
  1. One rounding decision per band type for the whole board (`round(nominal × scale)`, provably
     the majority-vote outcome) — never per segment.
  2. Quantize edge INPUTS, never widths; a width is always the difference of two snapped edges,
     so abutting geometry shares exact device pixels and corners close with no gap.
  3. The centre band and the colour strips share one quantizer per axis and know each other's
     extent (`makeAxisSnap`'s `bandLines`), so strips sit flush against the centre band instead
     of being painted over by it.

  `borderSnapCtx` **measures** the user-unit → device-pixel transform with a probe rect rather
  than deriving it from `getScreenCTM()`, which is wrong on Gecko — that was the root cause of
  the width inconsistency that survived v3.124–v3.128. Covers colour strips, centre border and
  outer frame alike. See LESSONS_LEARNED for the cross-engine measurements.
- **Border diagnostics:** `window.spdrBorderProbe({center:[…],color:[…]})` sweeps width settings
  without touching the UI and reports, per combination, the raw device-pixel width histogram for
  each band type plus `fracMax` (worst edge's distance from a whole device pixel) and both the
  calibrated and `getScreenCTM` scales. `fracMax ≈ 0` with one width per band = correct;
  `scale ≠ ctmScale` identifies an engine where the CTM can't be trusted. Restores settings
  afterwards, persists nothing.
- **Pencilmark sort / reflow:** `sortCandidateTspans`/`startCandidateSortPatch` (centre),
  `reorderCornerCell`/`startCornerReflowPatch` (corner), `fixCenterTspan`/`fixCornerText` (validity
  colours).
- **Settings UI:** `buildSettingsUI` (panel scaffolding, the action-buttons/digit-set area, Reset
  all, open/close) + one extracted builder per panel section (v3.105):
  `buildRegionBordersSection` / `buildDigitsSection` / `buildPencilmarksSection` /
  `buildObjectShadingSection` / `buildKropkiSection` / `buildZipperSection` / `buildLabelBgSection` /
  `buildCellShadingSection` / `buildCellSelectionSection` — each returns `buildSection({…})`; grep
  the builder name to land on that section's config. Sections are either **master** (a top-level
  on/off checkbox = `enabledKey`; **collapses** its sub-content when unchecked — only the header
  stays) or **master-less** (`noMasterCheckbox:true` — header + reset only; subsection checkboxes
  stand alone). Master-less: **Region borders**, **Given / placed digits**, **Pencilmarks**. Section
  labels are sentence-case. **Reset (↺)** restores every key in `resetKeys` to default **except**
  the section's enable toggles — `opts.enableKeys` lists them (defaults to `[enabledKey]`); for
  master-less sections it's the subsection toggles; only the bottom **Reset all** restores the
  toggles too. Panel buttons (section ↺, action ↺, digit-set **Re-scan**, bottom **Reset all**) get
  browser-refresh-style feedback via `spdrFxButton(btn)` — the `spdr-fxbtn` class adds a hover
  brighten + an `:active` depress (translateY + dim = 3D press), and a click runs a dim→bright
  "work" pulse. The pulse is an inline `filter:brightness(.5)` cleared after 200ms (eased via the
  class transition), **not** a CSS `@keyframes` animation — keyframes flashed (hard-coded start
  brightness fought the hover state) and replayed on every panel display:none→block (so reset
  buttons re-pulsed each reopen). Filter/transform only, so it never fights the inline background
  colour. A section can show a **section-label eyeball only while collapsed** via `hilite` +
  `hiliteWhenCollapsed:true` (Object shading uses this with the combined `objAll` getter, since its
  per-slider eyeballs are hidden when collapsed). `makeCollapsibleSubsection` (reusable subsection:
  checkbox row + optional `desc` + collapsible options; exposes `_spdrUpd()`; the subBuilder
  registers `subWrap._spdrOnMasterToggle`). Row builders
  `makeColorControl`/`makeColorRow`/`makeRangeRow`/`makeOpacityRow`/`makeWidthRow`/`makeRadioRow`/`makeOffsetRow`/`makeSubCheckbox`,
  `isInOurUI` (BLOCKED_EVENTS target test). **Slider reference ticks (v3.28):**
  `makeRangeRow`/`makeOpacityRow` route their range input through
  `wrapSliderWithTicks(slider,min,max,ticks)` — a `position:relative` flex wrapper that draws thin
  marks along the track (`pointer-events:none`; ~7px half-thumb inset so mid-range marks align with
  the thumb). `sliderTicks(key, extra)` builds the list: a subtle grey **Default** mark at
  `DEFAULTS[key]` on *every* slider, plus optional explicit `{value,title,accent}` ticks (accent =
  taller/blue, a notable reference). `makeColorRow` forwards a 6th `ticks` arg to `makeOpacityRow`
  (e.g. the Cell-selection Background opacity has an accent tick at 0.4 = white@opacity matching the
  native grey fill).
- **Settings clarity (what does this control do?):** Per-**control** 👁 hover icons
  (`makeHiliteIcon(key, title)`) sit right after each control's label (passed via
  `opts.hilite`/`hiliteTitle` on `buildSection`, `makeRangeRow`, `makeColorRow`,
  `makeCollapsibleSubsection`, and the action-section checkbox rows). Icon is 20px,
  `pointer-events:auto` so it stays usable even when its section is disabled (preview before
  enabling). `key` indexes three central maps: **HT** (what to highlight), **PAINT** (render-mode
  override per key), **ONSHOW** (optional hover "example"); plus **DEDUPE** (keys whose rect targets
  merge into a region outline). Hover → `spdrHi.show(HT[key](), PAINT[key], DEDUPE[key])` and holds
  bright until mouse-out; **click → `spdrHi.pulse()`** (a gradual brighten→dim ×2 of the
  *highlight*, ends back at steady — NOT an effect toggle; coexists with the hover-hold).
  `spdrHi.dimPanel` fades `#sp-fix-panel` to 0.25 while a target sits under it.
  - **Renderer traces real geometry** (not bboxes): clones each svg target into a full-window
    overlay `<svg>` (`#spdr-highlight-layer` > **osvg** has a `drop-shadow` glow filter; viewBox `0
    0 W H` = screen px, preserveAspectRatio none) positioned by `el.getScreenCTM()` (NOT getCTM —
    see LESSONS). `styleNode` paint modes: **'stroke'** (default — trace outline/line), **'fill'**
    (glow the filled area; `PAINT.regMulti='fill'` so thin multi-color border strips read as solid
    bars not doubled outlines), **'bbox'** (outline the element's bounding box). Text → bbox rect.
    Non-svg targets (tool/action buttons) → fixed outline div pool. `spdrHi.addLine` draws glowing
    segments on **osvg**; `spdrHi.addText` draws simulated digits on a **separate non-filtered
    overlay `oexsvg`** so example digits render crisp (no glow haze) in SudokuPad's Tahoma digit
    font; `spdrHi.addCellBox(row,col)` draws a glowing outline around a whole grid cell (used so
    example digits get a cell outline like the real per-cell highlight); `spdrHi.showObjects(objs)`
    draws a set of clue **objects** (not cells) in one clear+draw+flash pass — polylines through
    cell centres for lines/thermos/arrows, a border marker per dot, a merged perimeter per cage —
    used by the validator-menu eyeballs.
  - **DEDUPE** — snap each target to its grid cell (`getGridCellSize`) and draw cell-level outlines
    instead of per-element. Two modes by value: **`1`** (`objColored`/`objGray`/`objBorders`) shaded
    cells are small INSET rects; outlining each drew parallel lines between neighbours, so it draws
    a perimeter edge only where the neighbour cell is empty → one clean union outline per contiguous
    region (rect-only via x/y/w/h attrs; robust to multiple shaded elements per cell — cell-set, not
    edge-count). **`'persquare'`** (`cellColors` + `given`/`userDigit`/`centerMarks`/`cornerMarks`)
    accepts `<path>`/`<text>`/`<tspan>` too (via `getBBox`) and draws a full box around *every*
    occupied cell — so a multi-color cell (split `path.cell-color` halves) and digits/pencilmarks
    all highlight as one clean **cell** square (not a glyph-tight box), with multiple marks in a
    cell collapsing to one square (replaced the old `PAINT.cellColors='bbox'`). Rotated rects
    (diamonds) + non-rects (lines, cages, tool buttons) trace individually.
  - **HT getters** mirror the apply predicates (FOOLPROOF PRINCIPLE):
    `objFillSources`/`objLineSources`/`objTextSources` = the exact sets
    `fixAllUnderlays`/`fixAllCagePaths`/`fixAllLines`/`fixAllOverlayMarkerText` touch; routing
    matches `computeObjectShade` (lines under colored/gray by stroke colour; Border = shape outlines
    only). `objTextSources` (grayscale `#overlay` marker text) feeds **only** the gray side of
    `objShade`, so the Gray slider's eyeball highlights those `#N`/X-O markers too — each renders as
    a small glyph box (text falls through dedupe=`1`'s merge branch to per-glyph bbox tracing).
    `labelBg`=`LABEL_RECT_SEL`, `kropki`=`rect.feature-kropki, rect.textbg` filtered by
    `isKropkiCircle` (both mirror their apply fns; they overlap on Kropki dots — accurate, since
    label-bg recolours those textbg too). `regCenter`/`regMulti`/`regCell` prefer injected clones
    (`data-spdr-kind`, set in `drawRegionSplitBorders`) else ONSHOW traces a clean region boundary.
    `given`=real givens only; `userDigit`=real placed values **plus** `#control-normal` (always, so
    the digit-entry button is shown too); `cellColors`→`#cell-colors > *` else the `#control-colour`
    button. Pencilmarks use **one getter per kind** (`centerMarks`=`#cell-candidates tspan`,
    `cornerMarks`=`#cell-pencilmarks text`) — combined valid+invalid.
    `regCenter`/`regMulti`/`regCell` prefer injected clones (`data-spdr-kind`) else ONSHOW traces a
    clean boundary. `actionBtns`/`easyShade` → on-screen buttons.
  - **ONSHOW examples** (overlay-only / transient, never edit the puzzle model, matched to the
    section's chosen colour+opacity): `given`/`userDigit` → `drawDigitExample` (full-size demo
    digits when none exist); `centerMarks`/`cornerMarks` → `drawPencilExample(kind)` — 3 empty
    cells: **valid** (1 2 3), **invalid** (4 5 6), **mixed** of both (center = centred cluster,
    corner = corner positions). Each example also gets a `addCellBox` outline. **Example digit sizes
    match the real puzzle** (measured: digit 0.75×cell ≈ 48px, center mark 0.30×, corner mark
    0.275×, all weight 400, Tahoma) — set in `drawDigitExample`/`drawPencilExample`.
    `regCenter`/`regMulti` → `drawRegionBoundaryExample` when no clones drawn; `selection` →
    `selectExampleCells` (real `app.select`, left selected on purpose).
  - **Empty-state = hover tooltip** (`spdrTip`, a small div beside the pointer), NOT an in-panel
    warning (the old `HILITE`/`spdrEmptyCheckers`/`refreshEmptyHints` system was removed).
    `EMPTY_HINT[key]` = `{test, msg}` for the keys with no example to simulate —
    `labelBg`/`cellColors`/`kropki`/`objColored`/`objGray`/`objBorders`; on hover, if `test()` finds
    none of that element, the tooltip shows `msg`. Sections that simulate an example (digits,
    pencilmarks, region borders, selection) show the example instead. **Eyeball placement:**
    per-control by default, but single-target sections (Cell shading etc.) put the icon on the
    **section label** via `buildSection`'s `hilite`. Tool-button ids
    `#control-normal`/`#control-colour`/`#control-centre`/`#control-corner`. **Board svg =
    `#svgrenderer` (it IS the `<svg>`).**
- **Colour / geometry helpers:** `parseColor`/`rgbToHsl`/`hslToRgb`/`hexToRgba`,
  `getGridCellSize`/`detectGridSize`.
- **Diagnostics:** `spdrGapScan()` (exposed as `window.spdrGapScan`) — native-dark-mode gap
  detector; flags board elements that paint but render near-invisible vs the page bg and aren't
  fixed by us (`!important` filter). See the Audit log in
  [`archive/NATIVE_MODE_MIGRATION.md`](archive/NATIVE_MODE_MIGRATION.md) (closed).

### The right-hand column (v3.107) — how our UI scales, and why there is no layout maths

**The governing fact:** `#controls` carries a live `transform: scale(...)` maintained by SudokuPad's
ResizeHandler. Anything parented inside that subtree scales smoothly with the window **for free**,
hard-coded px and all. So the rule for all of our on-puzzle UI is *parentage, not arithmetic*.

- `ensureRightColumn()` → `#sp-right-col`, `rightColW()` design px wide, **absolutely positioned
  inside `.controls-buttons`** (`top/bottom: 0`; `right` is `0` collapsed and a NEGATIVE
  `rightColOverhang()` when the menu opens, so the column grows rightward with its left edge
  pinned). Space is reserved by `padding-right: collapsedRightColW() + RIGHT_COL_GAP` on
  `.controls-buttons` — a **constant** (collapsed) strip, written by `injectRightColCss()` /
  `updateRightColCss()`; it does NOT grow when the menu opens.
  ⚠️ **Parent must be `.controls-buttons`, not `.controls-main`** — `.controls-buttons` is the
  column-direction stack holding `.controls-app`, `.controls-main` *and* `.controls-aux` (Easy
  Shade), so spanning its full height is what puts our button row level with the Easy Shade row.
  A column inside `.controls-main` stops one row short, and `.controls-main` is `align-items: start`
  so it will not even stretch without `align-self`.
- Column contents, top to bottom: `#sp-toast-stack` → `#sp-validate-menu` (when open) →
  `#sp-validate-undo-btn` (when armed) → `#sp-right-col-buttons`. `justify-content: flex-end` hugs
  them to the bottom so they grow upward. The column is `pointer-events: none`; each child opts back
  in, so empty space never blocks the puzzle.
- `ensureRightColButtonRow()` → `#sp-right-col-buttons`, holding Validate and Auto-fill.
  `styleRightColButton(btn, fontPx)` sizes them to `nativeButtonSize()` — the native control
  button's `offsetWidth` (64). ⚠️ Size them to that, **not** `flex: 1 1 0`: dividing the column's
  width between the buttons made them 58px against the natives' 64px. The row is
  `justify-content: flex-end`, so its right edge is the column's right edge == the validate menu's.
  ⚠️ Our buttons **inherit `margin: 2.4px`** from SudokuPad's control-button styling; they set
  `margin: 0` and the row owns spacing via `COL_BTN_GAP = 4.8` (== the natives' own 2.4+2.4
  neighbour gap). Leave the margin in and any flex `gap` stacks on top of it *and* insets the last
  button from the menu edge.
- The settings gear + version label live in `#sp-gear-holder` (`ensureGearHolder()`), a flex pair
  absolutely positioned **inside the button row** at `right: 0; top: calc(100% + GEAR_TOP_GAP)` —
  label left, gear right. Out of flow, so growing the gear can never push the row off the Easy Shade
  baseline, and it may hang below the column (`#controls` and `.controls-buttons` are both
  `overflow: visible`). `GEAR_SIZE` / `GEAR_TOP_GAP` / `COL_BTN_GAP` are tunables at the top of the
  right-column section.
- `applyControlsWidthCap()` caps `#controls` at `nativePadWidth() + RIGHT_COL_GAP +
  collapsedRightColW()` — **menu-independent** (uses the collapsed width, so a toggle never
  re-caps and nothing downstream reflows).
  ⚠️ **This is load-bearing** — without it `#controls` (position:absolute, so shrink-to-fit) grows
  with the viewport on any puzzle with a rules block, opening slack between the pad and our column.
  `nativePadWidth()` measures the widest extent the native rows' **children** reach; a row's own
  `offsetWidth` is useless (all three stretch to `#controls`). See LESSONS_LEARNED for the load-order
  rules around it (`nativeControlsReady`, the idempotent write, `injectRulesWidthCss`) — they are
  what stops the controls loading tiny and resizing repeatedly. `watchNativePadWidth()` re-caps on a
  childList MutationObserver over the three rows.
- **The menu grows rightward into the empty band — it does NOT widen `#controls` (v3.118).**
  `rightColW()` returns `collapsedRightColW()` (= `2 × nativeButtonSize() + COL_BTN_GAP`, just the
  Auto-fill/Validate row) while the validate menu is closed, and `RIGHT_COL_W = 200` while it is
  open; `setRightColWidth(open)` flips it (called by `openValidateMenu` / `closeValidateMenu`) and
  sets the column width **and** its negative `right` offset (`rightColOverhang() = RIGHT_COL_W −
  collapsedRightColW`), so the column expands rightward past `#controls`' edge into the empty band
  while its LEFT edge stays put. The `.controls-buttons` padding and the `#controls` cap both use
  `collapsedRightColW()` and never change on a toggle → the board, keypad, banner, rules, footer and
  Killer Calculator all stay put, and no `App.resize` re-fit fires. Relies on `#controls` /
  `.controls-buttons` / `#sp-right-col` / `.game` all being `overflow: visible` (they are) so the
  overflowing menu is not clipped. ⚠️ `rebuildValidateMenu()` removes the menu node directly instead
  of calling `closeValidateMenu()` — going through close would collapse and instantly re-expand the
  column on every in-menu toggle. (See LESSONS_LEARNED "The validate menu no longer widens
  `#controls`" for the why and the narrow-window caveat.)
- **The column's LEFT edge is invariant** (`nativePadWidth() + RIGHT_COL_GAP`), so left-anchored
  contents are already still. `#sp-right-col-buttons` and `#sp-validate-undo-btn` still take a
  **fixed `collapsedRightColW()` width** instead of `100%` (`applyStaticColWidths()` keeps them in
  step) so they do not stretch to `RIGHT_COL_W` when the menu opens the column wide — that pins
  Auto-fill, Validate, and (via `#sp-gear-holder`'s `right: 0` on the fixed row) the gear and version
  label. Only `#sp-validate-menu` and `#sp-toast-stack` span the (open) column at `100%`.
- `alignNativeAuxRow()` fixes SudokuPad's bottom row. `.controls-aux` is a flat flex row on a 69px
  pitch, but the pad above it is two blocks (`.controls-input` + `.controls-tool`) with an 8px gap
  between them, so from the 4th button on the bottom row is 8px left of the grid. It shifts the 4th
  aux button (`[data-control="select"]`) right until its left edge matches `.controls-tool`'s first
  button; Easy Shade follows it into the Clear All column. Measured, not constant, and idempotent
  (a second run sees delta 0 and writes nothing) — ⚠️ it runs **before** `nativePadWidth()` in
  `applyControlsWidthCap`, since it changes what that measures.
- `centerControlsFooter()` pins the "Created by Sven Neumann…" credit line. SudokuPad's
  `.controls-footer` is full-width under `#controls`, so it centres on the reserved width (which
  includes our strip) rather than on the keypad; the rule gives it `width = 2 × the Check button's
  centre` + `text-align: center`, i.e. centred on the native keypad. A stylesheet rule
  (`#sp-footer-centre-css`), not an inline style — SudokuPad rebuilds that element on a puzzle
  change and nothing observes it.
- **The validate menu has no `max-height`** (v3.113): a long validator list overflows *upward* out of
  the controls area and over the rules text rather than gaining a scrollbar — deliberate, the player
  can close the menu to read the rules again. `#sp-validate-menu` and `#sp-toast-stack` both carry
  `flex-shrink: 0`, which is what makes the column overflow instead of squeezing them to fit.
- **There is no gutter/positioning code.** v3.107 deleted `updateValidateGutter`,
  `releaseValidateGutter`, `controlsButtonsRight`, `rightZoneLeft`, `positionValidateMenu`,
  `positionToastStack` and `onValidateResize` outright, along with every
  `window.dispatchEvent(new Event('resize'))` they relied on — the column is placed by parentage
  alone. (Historically, widening `.controls-buttons` let SudokuPad rescale the controls and hand
  space to the board — measured transform 0.959→0.788 — but v3.118 stopped widening on menu open;
  the board is height-bound with slack anyway, so nothing is lost.)
- The banner/rules width pin (`.puzzle-header` + `.puzzle-rules`) is a FIXED, menu-independent
  `max-width` from the collapsed reservation (`updateContentWidthCss`, `#sp-rules-width-css`): it
  lifts SudokuPad's `max-width: 480px` rules cap **and** matches the banner's `margin: 0 32px` (−64;
  lifting the cap alone leaves the rules 64px wider than the banner) to one shared width. Its job now
  is purely to bound `#controls`' shrink-to-fit max-content (no full-window load flash); since
  `#controls` no longer widens on a toggle, the banner/rules would stay put even without it.
  ⚠️ It is a separate function from `injectRightColCss` on purpose: lifting that cap unbounds
  `#controls`, so it must never be injected before `applyControlsWidthCap` has succeeded.
- ⚠️ **Never use `offsetWidth` to detect the page scale — it is transform-blind** (a native control
  button reads 64 at every window size while its `getBoundingClientRect().width` varies). This
  silently made the whole v3.106 attempt a no-op. Use `getBoundingClientRect()` if you must measure.
- The settings *panel* (`#sp-fix-panel`) stays `position: fixed`, but `positionPanel()` re-anchors it
  to the gear on every open (and on resize while open): `bottom = innerHeight - gearRect.top +
  PANEL_GEAR_GAP`, `right = innerWidth - gearRect.right`, with `maxHeight` capped to the space left
  above it. ⚠️ Measure with `getBoundingClientRect()` — the gear sits inside the transformed
  `#controls`, so its viewport position moves with the page scale and board height; the old fixed
  `bottom: 56px` corner left the panel mid-window and covering the gear on a tall page. Build order: the three column builders are `poll`ed in `buildAllUI` because they need
  `.controls-main` to exist; the gear has a body fallback plus a poll that re-homes it.

### Clue-line read sites (keep in sync)
Cosmetic **line** clues (whisper/renban/region-sum/palindrome/thermo shafts) are read from the DOM
in **three** subsystems that must agree on which SVG layers and which paths count — a fix in one
silently drifts from the others (the v3.83→v3.84 gap: detection learned `#overlay` lines but
rendering/highlight didn't). Single source of truth = `LINE_DOM_LAYER_IDS` (the layer list) +
`isLineCluePath` (the per-path gate), both defined next to `applyLineFill`. The three consumers:
1. **Detection/validators** — `scanLineLayer` → `getCosmeticLines` (whisper/renban/region-sum/thermo
   all funnel here).
2. **Rendering/colour-shading** — `fixAllLines`.
3. **Object-shading highlight** — `objLineStrokeSources`.

Add a new line layer (or change what counts as a line path) → edit
`LINE_DOM_LAYER_IDS`/`isLineCluePath` **once** and all three follow. `#arrows` additionally carries
filled block-arrow shapes (`isLineFill`); other layers are plain `fill:none` stroke lines, so the
fill pass stays `#arrows`-only.

## Terminology
- **Region / cage-box** — a bordered area; its boundaries are `#cell-grids path:not(.cell-grid)`.
- **Strip / border strip** — a coloured `<rect>` we draw along a region edge.
- **SW** — stripe width.
- **textbg rect** — `rect.textbg`; SudokuPad uses it for *both* Kropki circles and other labelled
  circles (arrows, operators) — the source of the Kropki false-positive problem.
- **Kropki circle vs Kropki rect** — circle = shape test (gets a colour fix); rect = circle *and* no
  text sibling (gets label injection).
- **mainGroup** — our injected `[data-spdr-region-split]` `<g>`.
- **DR** — DarkReader.

## Testing setup

### Test puzzles
⚠️ **Every puzzle listed here has a rules block.** That is a hard requirement, not a detail: a
rules-less puzzle hides a whole class of layout (the rules block is what bounds `#controls`'
shrink-to-fit width — see `applyControlsWidthCap`) and makes UI work look correct when it is not.
**Never test UI/layout on a puzzle with no rules text.**

- **https://sudokupad.app/pdnc0ckv87** — "Junk Drawer" by Sotehr. **7×7 Squishdoku** (overlapping
  3×3 boxes), long rules (~880 chars), cages + lines + overlays. Feature-dense *and* a non-9×9 grid,
  so the board/controls proportions differ from the usual case.
- **https://sudokupad.app/bdiaxwjnxc** — "Rupees" by Sotehr. 9×9, long rules (~850 chars), whisper +
  modulo lines, cages, overlays **and** underlays. The densest ruleset of the three.
- **https://sudokupad.app/n7a6oi1gyy** — "Banksy Wor-King at Queen's Mews" by olima. 9×9, **short**
  rules (~190 chars), anti-king + whisper + thermo. The user flags this one as **laying out
  differently** from the other two — check every UI/layout change against both it and a long-rules
  puzzle, since they do not always give the same result.
- **f-puzzles render-path puzzle — https://sudokupad.app/3x3zm2co6o** (9×9) — built in **f-puzzles**,
  converted via the marktekfan penpa-import tool. Kept for its **native** f-puzzles constraints
  (4 Kropki, 1 Arrow, X-diagonal/`sudokuX`, 33 cages) **plus** cosmetics — an all-cosmetic puzzle
  exercises different render paths. Editable f-puzzles `?load=` source +
  play/short links preserved in [`test-puzzle2.fpuzzles-url.txt`](test-puzzle2.fpuzzles-url.txt).
  Notable render paths it covers:
  - **Native Kropki render as `rect.feature-kropki`** (not cosmetic `textbg`), on cell borders →
    `isKropkiCircle` matches them directly and the v2.164 `isOnCellBorder` gate handles them
    correctly (validated — the quadruple here even exposes its digits as adjacent text, but the
    position gate is what protects it).
  - **X-diagonal (`sudokuX`)** renders as a coloured stroked path in **`#overlay`** (`#34BBE6`),
    *not* `#arrows` — so `fixAllLines` does **not** shade it (renders fine, left to DR; see
    LESSONS_LEARNED Lines).
  - Native **Arrow** (bulb + shaft, shaft shaded as an `#arrows` line), a custom **green-bordered
    killer cage**, and cosmetic squares/circles/lines/letters.
- **Workflow:** edit the file on disk → TamperMonkey auto-updates → the user refreshes their own
  test tab → visual confirm.
- **Claude in Chrome (MCP):** standing permission to connect (see CLAUDE.md). **Always
  `location.reload()` before inspecting** — the user refreshes all tabs after edits, so the MCP tab
  may be stale.
- **Version check:** `window.spdrVersion === 'X.Y.Z'`.
- **JS inspection:** `Framework.getApp()` → `app.puzzle.cells`, `app.puzzle.selectedCells`,
  `app.select(cells)`, `app.deselect()`; read CSS via `getComputedStyle(el).prop`.
- **Regression harness:** `node tools/validator_harness.mjs` — extracts the pure validator logic
  (colour words, cue regexes, cage maths, chain expansion, region colouring, digit bands) straight
  from the live userscript and replays the documented trap cases. Run it green before committing
  validator changes; `tools/cue_recall.py` (see "Puzzle catalog") is its catalog-recall complement.

## Puzzle catalog (pull examples by rule type / predict broad-change side effects)
The catalog is **`C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad Catalog\classify\`** (part
of the standalone Sudokupad Catalog project; moved 2026-07-04 from this repo's `Tamper Monkey
Extraction/cowork-classify`, which is deleted) — **6,260 real puzzles hand-classified by 100
semantic tags** (fog, killer_cage, whisper, renban, zipper, little_killer, …), read from each
puzzle's rules text and validated against its decoded data dump. It supersedes the old mechanical
bucket dump and, unlike it, **names the variants** (sandwich, renban, whisper, between_line, …)
rather than collapsing them all into `#arrows | path`. Two uses: **(a)** pull example puzzles for a
given rule type when building/testing a validator or feature, and **(b)** count how many puzzles a
broad change can reach.

### Query surface — three files (never read into context)
`corpus.json` is 68 MB and the log/review files are MB-scale; **always query via `python`,
`json`/`csv` modules only (never `awk`/`grep`-by-column** — quoted commas in titles mis-align
columns), return only the small answer.

- **`output/catalog_log.jsonl`** — the catalog. One JSON per puzzle: `id, status, tags[],
  dump_features[], confidence`. **"Which puzzles have tag X."** (`status`: `ok` carries real tags;
  `blank`/`rat_run`/`bespoke` don't; ~1 open `doubt`.)
- **`data/review_catalog.jsonl`** — `id → url, title, author, gridSize, rules` (full description) +
  `structured`. Joins a tag hit to a **clickable URL** and lets you read the actual rules text.
- **`DICTIONARY.md`** — the 100-tag vocabulary: each tag id, the rules-text phrasings that signal
  it, its structured-dump signal, plus a soft-indicators cue table. Read this to pick the right tag
  / understand what a tag means. (`README.md` + `INSTRUCTIONS.md` document the classification
  workflow itself — not needed just to query.)

### Scoring our cues against the catalog (`tools/cue_recall.py`) — run on every cue change
`python tools/cue_recall.py [--report out.md] [--tag <tag>] [--n 25]` — parses the regex definitions
**out of `Sudokupad-Tools.user.js`** (both `/literal/` and `new RegExp('…' + OTHER.source)` forms,
so it can never drift from the live cues) and scores them against the catalog's tags. Two tables:
1. **Cue recall** — recall, misses by source, and **false positives** (cue fired, no tag). Baselines
   (v3.89): german whisper 99.0%, zipper 96.9%, parity 95.1%, region sum 94.5%, renban 94.4%, thermo
   94.4%, entropic 88.9%.
2. **Clause-blindness** — of the puzzles where the cue fires *and* the rules name ≥2 colours (so
   layer 2 can't help), can `*_CLAUSE_RE` actually read the clue's colour? **`UNREADABLE` (no clause
   matches at all) is always a bug** — it means a guaranteed "cannot detect where the line is".
   `NO-COLOUR` (clause matches, names no colour) is usually benign. **All validators are at
   UNREADABLE=0 as of v3.89; keep them there.** This table is what caught the renban bug that made
   ~86 real puzzles ambiguous — see LESSONS_LEARNED.

`--report` writes the full miss/FP worklist as markdown; the current one is
[`docs/cue-recall-report.md`](cue-recall-report.md).
- ⚠️ **The tags are dictionary-derived and unverified** — this is a triage worklist, not a bug list.
  Sort each row into *real cue gap / correctly-not-ours / catalog noise*. **FPs matter more than
  misses**: an over-firing cue makes a validator CLAIM another type's line (over-removal), while a
  miss only under-detects.
- ⚠️ Score the **leaf** tag, never an umbrella (`german_whisper`, not `whisper`), and only the 4,825
  puzzles that have rules text. Both traps are written up in [LESSONS_LEARNED](LESSONS_LEARNED.md).
- Composite cues (entropic = named `||` (described-set `&&` line-ish)) need a matching entry in the
  tool's `VALIDATORS` table — keep the two in sync.

### Pulling examples
- **Easiest — the helper:** `python "C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad
  Catalog\classify\tools\examples.py" <tag> [<tag> …] [--n 5] [--any] [--count]` prints matching
  example URLs+titles (default: ALL given tags; `--any` = any; `--count` = just the count). E.g.
  `examples.py fog killer_cage --n 3`.
- **Inspect one puzzle:** `python "C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad
  Catalog\classify\tools\lookup.py" <id>` — description + structured digest (`--raw` adds the full
  model).
- **Hand-rolled join** (custom filtering):
  ```python
  import json
  d=r'C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad Catalog\classify' + '\\'
  log=[json.loads(l) for l in open(d+'output/catalog_log.jsonl',encoding='utf-8') if l.strip()]
  ids=[r['id'] for r in log if r['status']=='ok' and 'whisper' in r['tags']]
  meta={r['id']:r for r in (json.loads(l) for l in open(d+'data/review_catalog.jsonl',encoding='utf-8') if l.strip())}
  print(len(ids), [(meta[i]['url'], meta[i]['title']) for i in ids[:5]])
  ```

### When to consult it (and when not)
Consult **before a broad/cross-cutting change** (touches a rule type many puzzles share) or **when
you need real example puzzles** of a rule type. Query it to count affected puzzles and pull 3–5 URLs
to spot-check in-browser. **Skip it** for a one-puzzle tweak or a pure-CSS/UI change — querying then
is the token waste the catalog is meant to prevent.

Caveats: near-complete but not 100% (1 open `doubt`); `custom_ruleset`/`unclassified`/`bespoke` are
deliberate catch-alls for non-standard rules; a text-only tag (blank "structured signal" in
DICTIONARY) won't appear in the data dump, so the description is its only evidence.

### Old catalog — superseded, retained for reference
The prior mechanical inventory (`docs/Catalog/spdr_MERGED_index.csv` + `spdr_MERGED_union.json` +
`spdr_MERGED_index.xlsx`, 1,890 puzzles by render *bucket*), plus
[`CATALOG_INSTRUCTIONS.md`](CATALOG_INSTRUCTIONS.md) and [`CATALOG_AUDIT.md`](CATALOG_AUDIT.md), is
**superseded by the tagged catalog above** — it couldn't name variants (sandwich/renban/whisper read
0). Kept for now for reference; **don't query it for new work.**

## snippets/
Experimental code preserved for possible reuse. Currently `rounding-experiment.md` — the dropped
corner-rounding feature plus its SVG `stroke-linejoin` lessons.
