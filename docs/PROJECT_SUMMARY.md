# SudokuPad DarkReader Fix — Project Summary

*Current state, architecture, and conventions. Rewritten fresh periodically — last rewrite 2026-05-29. For the running history see `git log`; for hard-won do/don't knowledge see [LESSONS_LEARNED.md](LESSONS_LEARNED.md).*

## What this is
A single-file TamperMonkey userscript that fixes DarkReader / dark-theme visual issues on SudokuPad, and adds several quality-of-life features on top.

- **File:** `sudokupad-darkreader-fix.user.js` — one ~4,200-line IIFE
- **Version:** bump in **two** places every release — the `@version` header (TamperMonkey uses this) **and** the `SCRIPT_VERSION` const near the top of the IIFE (drives `window.spdrVersion` + the on-screen version label). They must match; if `window.spdrVersion` lags `@version`, `SCRIPT_VERSION` was missed.
- **Repo:** https://github.com/VitaKaninen/Sudokupad-darkreader-fix.git (branch `main`)
- **Matched URLs:** `sudokupad.app/*`, `beta.sudokupad.app/*`, `app.crackingthecryptic.com/*`, `crackingthecryptic.com/*`
- **Tested on:** Chrome + TamperMonkey, LibreWolf + ViolentMonkey, and Brave + ViolentMonkey (all with the DarkReader extension).

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
9. Line constraints (thermo shafts, palindromes, renban, whispers, arrow lines) staying light in dark mode — all stroked `#arrows` paths are shaded by Object shading (v2.140; was thermo-shaft-only before)

**Added features:**
- **Region borders** — multi-colour split borders per region (filled rects), optional centre border, optional full-cell fill. The big `drawRegionSplitBorders` subsystem. **UI (v2.147):** the section is **collapse-when-disabled** (`buildSection({collapseWhenDisabled:true})` → off shows only header: checkbox + desc + ↺) and holds **3 collapsible subsections** built by a local `makeSubsection` helper (each: checkbox row + options that `display:none` until its checkbox is on), separated by inset divider lines: **Center borders** (color/opacity/width + a "Hide built-in grid line on region boundaries" sub-checkbox = `regionBorderSuppressBoundary`), **Multi-color borders** (4 swatches/width/opacity), **Cell borders** (`regionBorderCellEnabled`, recolor the thin built-in grid lines via `regionBorderCellColor`/`regionBorderCellOpacity`/`regionBorderCellWidth`). Cell-borders + suppress both keep `mainGroup` alive standalone (added to the geo/early-return gates in `drawRegionSplitBorders`); both act on the cloned `path.cell-grid` — suppress rebuilds the clone's `d` from per-cell edges omitting region-boundary edges **and the 4 outer walls** (uses `cellRegion`/`cs`/`rows`/`cols`), cell-borders sets an `!important` stroke + stroke-width on the clone + strips DR's marker. Cell-border defaults reproduce the native look so enabling matches disabled: colour `#dddad6` (DR's converted grid-line colour, read from the browser), width `1`, opacity `1`.
- **Shaded-region colouring** (v2.123+) — recolour a puzzle's grey "extra regions" (`#cages path.cage-extraregion`, e.g. "grey regions must contain 1-9") with the 4-colour palette, adjacency-aware so touching regions differ. Drawn as path clones inside `mainGroup`, **below the region borders**; the original `#cages` paths are made transparent. As of v2.125 the clones are drawn whenever **any** region feature is active (even with shaded mode off the grey shading is moved below the borders — coloured if shaded mode is on, otherwise reproducing the grey Object-shaded look). The Easy Shade button cycles 4 states on puzzles that have them: off → Both → Regions → Shaded → off; the card pops for every active mode (only "off" leaves it hidden) and shows only the slider(s) for the active mode (Both→both, Regions→region only, Shaded→shaded only); a Both/Regions/Shaded indicator appears on the button. The button's 4 swatches mirror the palette live. Normal puzzles keep the plain on/off toggle + single slider.
- **Cell selection border** customization (v2.110+) — colour, opacity, width, Inside/Outside growth mode, offset, hole/donut handling.
- **Action buttons** (Fill, Clear, Clear All) — auto-fill / clean centre pencilmarks via the `app.select()` API.
- **Cell shading** + **Object Shading** — opacity / brightness controls. **Gray vs colored split (v2.140):** gray objects (saturation ≈ 0) read dim where colored objects read bright at the same value, so each has its own brightness + opacity (4 keys: `underlayLightness`/`underlayOpacity`, `underlayGrayBrightness`/`underlayGrayOpacity`). **Combined vs separate (v2.141):** a section checkbox **"Control opacity and brightness separately"** (`underlaySeparateBrightnessOpacity`, default off) toggles the UI between one *combined* slider per side (**Color object brightness** / **Gray object brightness**, each drives both its axes to the same value via the `makeRangeRow` `extraKeys`/`extraEnabledKeys` option) and two *separate* sliders per side (**Color brightness**/**Color opacity**, **Gray brightness**/**Gray opacity**). Combined/separate is **UI-only** — `computeObjectShade(c)` always reads the 4 keys (gray detected by `isGrayColor`); in combined mode the pair is just kept equal. Colored brightness uses the `absolute` mapping (pure hue at HSL lightness = slider) via `shadingTransform`. Defaults: color 0.4, gray 0.6, Border brightness 0.5. (The v2.130 `relative`/`luminance` mode selector / `underlayBrightnessModel` were removed v2.134.) Lines (all stroked `#arrows` paths) and fills both route through `computeObjectShade`. It also shades coloured **`#overlay` shapes** (lucky-charm circles/squares/diamonds), not just `#underlay` — **always on** as of v2.140 (the `underlayOverlayEnabled` opt-in checkbox was removed), broad skip-rule (`shouldShadeOverlayRect`: skip `.textbg`, transparent, white/near-white). Shape **outlines** get the same combined/separate treatment via their own keys (**Border brightness**/**Border opacity**, `underlayStrokeLightness`/`underlayStrokeOpacity` @ 0.75; `applyShapeStroke`, brightness preserves the element's hue) — as of v2.143 opacity is configurable (was hardcoded 1.0). So all three groups (colored / gray / border) follow the one "separate" checkbox. The object-shading section overrides `controlSyncers` for its keys with one `refreshAll` (combined + separate rows share keys), so both resets re-sync correctly. The section ↺ does **not** reset `underlaySeparateBrightnessOpacity` (leaves the combined/separate checkbox as-is); only the bottom "Reset all" restores it. Region borders default **on** as of v2.141 (so the bottom "Reset all" enables it; the per-section ↺ never touches a section's enable toggle).
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

### Code map
One IIFE, 120+ functions — **don't read the whole file**. Grep the function name below and read only that region. Coarse on purpose (entry points per feature, not every helper); keep it that way so it stays low-maintenance.

- **Settings & lifecycle:** `loadSettings` / `saveSettings` (localStorage `sp-darkreader-fix`), `buildCSS` (generates the injected stylesheet), `rebuildStyleTag`, `applySettings` (re-applies everything), `waitForDRAndSVG` (startup gate), `buildAllUI` (orchestrates UI on load).
- **DarkReader fills** (per element type; the `!important` master key is `applyInlineFill`): `fixLabelRect`/`fixAllLabelRects` (white label boxes), `fixCageBox`/`fixAllCageBoxes` + `isCageBoxPath` (cage-box strokes), `fixUnderlayRect`/`fixAllUnderlays` (also shades `#overlay rect` via `shouldShadeOverlayRect`; overlay shading always on) + `applyShadingFill`/`applyShapeStroke`/`shadingTransform`/`computeObjectShade`/`isGrayColor` (object shading; `computeObjectShade` is the gray-vs-colored router for fills+lines — picks the gray or color brightness/opacity key pair via `isGrayColor`; `shadingTransform` maps a colored value to pure hue at the slider's absolute HSL lightness; `applyShapeStroke` is the separate outline/Border-brightness path, not routed through `computeObjectShade`), `fixGivenText`/`fixAllGivens` (given digits), `fixCagePath`/`fixAllCagePaths`. **Lines:** `fixAllLines` + `isLineStroke`/`applyLineStroke` — shade the stroke of **every** stroked `#arrows` path (thermo shafts, palindromes, renban, whispers, arrow lines) via `computeObjectShade`; broadened from the old bulb-color-matched thermo-shaft-only scope in v2.140. Stroke width untouched.
- **Kropki:** `fixKropkiDot`/`fixAllKropkiDots`; detection `isKropkiCircle`/`isKropkiRect`/`svgHasBlackKropkiCircle`/`isOnCellBorder`/`getKropkiAdjacentText` (rules in LESSONS_LEARNED); `rebuildKropkiLabels`.
- **Region borders:** `drawRegionSplitBorders` (main entry; inner `drawHorizRuns`/`drawVertRuns`/`addRect`), `inferRegionsFromSVG` (region geometry), `computeRegion4Colors` (<=4-colour).
- **Shaded regions:** `assignExtraRegionColors` (samples each `cage-extraregion` path's cells via `isPointInFill` at cell centres, builds touch-adjacency, greedy 4-colours, stores idx in `dataset.spdrExtraColorIdx`), `regionFeatureActive`/`extraRegionsMovedBelowBorders` (predicate read by `fixCagePath` — when true it makes the original `#cages` path **transparent** via `applyExtraRegionFill`, because the visual is drawn as a clone below the borders), `puzzleHasShadedRegions` (gates the button's 4-state cycle + 2nd slider). The clone itself is drawn by `drawRegionSplitBorders`: when `needShadedClones`, it calls `assignExtraRegionColors` again (observers trigger it decoupled from `applySettings`, so idx must be recomputed) and inserts clones as the FIRST children of `mainGroup` → below the border strips (palette colour if shaded mode on, else grey). Button cycle + palette-mirroring swatches (`easyShadeSwatchRefresh`, called from `applySettings`) live in `buildEasyRegionShadeButton`.
- **Selection border:** `applySelectionBorderOffset`/`applyAllSelectionBorderOffsets`/`computeSelectionShift`; geometry `offsetRectilinearPath`/`offsetPolygon`/`parsePathSubpaths`/`removeCollinear`; `startSelectionBorderObserver`.
- **Action buttons:** `fillSelectedCellsWithCandidates`/`removeInvalidPencilmarks`/`clearMarksInSelected` (the 3 actions), `buildActionButtons`/`buildActionButton`; helpers `getSelectedCells`/`getDigitButton`/`getCurrentMode`/`snapshotPencilmarks`/`diffSnapshots`/`countVisibleConflicts`.
- **Pencilmark sort / reflow:** `sortCandidateTspans`/`startCandidateSortPatch` (centre), `reorderCornerCell`/`startCornerReflowPatch` (corner), `fixCenterTspan`/`fixCornerText` (validity colours).
- **Settings UI:** `buildSettingsUI`, `buildSection`, row builders `makeColorControl`/`makeColorRow`/`makeRangeRow`/`makeOpacityRow`/`makeWidthRow`/`makeRadioRow`/`makeOffsetRow`/`makeSubCheckbox`, `isInOurUI` (BLOCKED_EVENTS target test).
- **Settings clarity (what does this control do?):** Per-**control** 👁 hover icons (`makeHiliteIcon(getTargets, title)`) sit next to individual controls (passed via `opts.hilite`/`hiliteTitle` on `buildSection`, `makeRangeRow`, `makeColorRow`, and the Region-borders `makeSubsection`). Hovering an icon flashes a bright outline (`spdrHi.show/hide`, one-shot `@keyframes spdrHiOn` that holds bright until mouse-out) around exactly that control's targets; `spdrHi.dimPanel` fades `#sp-fix-panel` to 0.25 while a target sits under it. Target getters live centrally in `HT` (e.g. `given`, `labelBg`, `kropki`, `selection`, `cellColors`, `centerValid`/`centerInvalid`, `cornerValid`/`cornerInvalid`, `objColored`/`objGray`/`objBorders` via `fillsByGray`, and `regCenter`/`regMulti`/`regCell`). Region-border targets read our injected clones via `data-spdr-kind` (`center`/`cell`/`multi`, set in `drawRegionSplitBorders`), falling back to live grid/boundary lines when not drawn. Separately, section **empty-state hints** (`HILITE[enabledKey]` = `sel`+`msg`, `spdrEmptyCheckers`/`refreshEmptyHints` on panel open) show an amber ⚠ line when a section's `sel` matches nothing. Tool-button ids: `#control-colour`/`#control-centre`/`#control-corner`.
- **Colour / geometry helpers:** `parseColor`/`rgbToHsl`/`hslToRgb`/`hexToRgba`, `getGridCellSize`/`detectGridSize`.

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

## snippets/
Experimental code preserved for possible reuse. Currently `rounding-experiment.md` — the dropped corner-rounding feature plus its SVG `stroke-linejoin` lessons.
