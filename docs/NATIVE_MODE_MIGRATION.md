# Native Dark Mode migration — working checklist

The pivot (branch `native-mode`, started 2026-06-05): **stop fighting DarkReader; lock it out of SudokuPad and ride the site's own native dark mode**, fixing the small finite set of gaps native leaves. Background + the confirmed mechanism (DR-lock works, native palette + coverage map, the 3 gaps) is in [LESSONS_LEARNED.md](LESSONS_LEARNED.md) → "Native dark mode — the substrate swap". `main` stays the 2.x DarkReader-fighting edition (fallback + A/B). The two coexist in TamperMonkey as separate scripts (distinct `@name`, **shared** author namespace — that's the correct convention; uniqueness comes from the name, not the namespace).

## Done
- **v2.195** — lock DR (`<meta name="darkreader-lock">` at document-start) + enable native (`svencodes_settings.darkmode` + `body.setting-darkmode`) + boot gate `isDarkReader()` → `isDarkMode()`.
- **v2.196** — darken translucent-white (`#ffffff80`) line-endpoint circles (broaden `LABEL_RECT_SEL` white arm to a case-insensitive prefix).
- **v3.0.0 / v3.0.1** — fork identity for parallel TM testing (`@name` "SudokuPad – Native Dark Mode", `window.spdrEdition='native'`, `@updateURL`→`native-mode` branch); major bump marks the break; file renamed `sudokupad-darkreader-fix.user.js` → `sudokupad-native-dark-mode.user.js`.
- **v3.1.0** — baked in `window.spdrGapScan()` (always-on gap detector) + ran the first upfront audit (see Audit log below).

## Audit log
**Contrast audit (invisible-object class), 2026-06-05 — `window.spdrGapScan()`.** Heuristic: flag any board element (`#underlay`/`#overlay`/`#arrows`/`#cages`/`#cell-colors`/`#cell-grids`) that paints something (effective alpha > 0.06) but renders at contrast < 1.25 vs the page bg, AND that we didn't fix (no inline `!important` of ours — so object-shaded / label-bg'd elements are excluded). Validated: 0 false-positives on the known-good test puzzle (the 31 raw low-contrast hits were all our own intentionally-dim shaded cells, correctly excluded).
- **Result: 0 gaps across 9 feature-diverse puzzles** (`pbwqsppuho`, `3x3zm2co6o`, `prtzikfw63`, `0qe26aaixc`, `philip-newman/20260527-standard-and-practical`, `5tplfif6te`, `MtMdMRTTRH`, `s88w3mm9u7`, `dkp84tg1m5` — covering kropki/xv/arrow/thermo/palindrome/killer/extra-region/inequality/sudoku-x/cell-colors/cosmetic; all confirmed `nativeDark` + DR off). **Conclusion: object shading + label-bg already cover the invisible class broadly** — native's "gray/dark objects vanish" gap is handled by us for these element types.
- **Not covered by this audit:** wrong-but-VISIBLE shade mismatches (the endpoint-circle class — light-gray where DR rendered near-black; high contrast, so contrast-scanning is blind to it). The v2.196 label-bg broadening fixed the known instance. To hunt the rest systematically needs a **DR-vs-native diff**: capture computed fill/stroke of every element under DR (no lock, no native, our fixes off) vs native+v3, flag material differences. Heavier (needs a DR baseline capture per puzzle) — deferred unless shade mismatches keep surfacing.

## Functional migration (TODO)
Re-base onto native, then **delete the DR code each step orphans** (don't defer dead code):
- [ ] Re-base DR-sampled colour defaults (`#181A1B`, `#dddad6`, `#e8e6e3`, swatch palette) → native palette (`--dm-black:#1a1a1a`, `--dm-white:#eee`, …). Keep "enabling a section = no visible change".
- [ ] Re-key the label-bg injected CSS branch from `body.setting-uitheme-purple` → `body.setting-darkmode` (so it's theme-independent, not just purple).
- [ ] Generalize/remove the `inDR` branches in `fixCageBox` (white-eraser repaint; restore-DR-var on borders-off).
- [ ] **Amputate the restore-to-DR machinery** (`captureDrInline` / `restoreToDr` / `spdrDrFill` / `spdrDrStroke` and every `--darkreader-*` var dance). With DR gone there is nothing to restore to — on disable just clear our inline and let native CSS show.
- [ ] Colour-picker `--cell-color-*` swatches under native (the `[data-darkreader-scheme]` specificity-bump rule is DR-only — confirm native handles them or add our own).
- [ ] Bright control buttons — `#control-settings/-fullscreen/-rules` keep `background:#eee`; native themes only `#controls` text. Add one darkening rule.
- [ ] Gap-audit findings (DR-vs-native diff across catalog buckets) — fold results here.

## DR-reference cleanup — timing policy (the "don't forget" item)
**Hybrid, decided 2026-06-05:**
- **Dead DR *code*** (functions, branches, vars that the functional migration orphans) → **delete inline**, in the same step that kills its last caller. No lingering dead code.
- **Cosmetic DR *references*** (comments, var/function naming, header prose, docs framing, repo name) → **one focused sweep at the END**, on settled code — doing it piecemeal churns comments twice and muddies the functional diffs. Tracked so it isn't forgotten:
  - [ ] Script header `@name` / `@description` finalised when native becomes mainline.
  - [ ] `isDarkReader()` keep (it's a real check if DR ever slips through) but audit naming around it.
  - [ ] Comments mentioning "beat DR" / "restore DR" / `data-darkreader-*` that no longer apply.
  - [ ] `CLAUDE.md` title (`# SudokuPad – DarkReader Fix`) + intro line ("fixes DarkReader visual issues").
  - [ ] `PROJECT_SUMMARY.md` — rewrite fresh (it's periodically rewritten anyway) once the migration settles.
  - [ ] Repo rename `Sudokupad-darkreader-fix` → TBD (decide later; affects all raw URLs).
  - [ ] **Merge `native-mode` → `main`**: reconcile `@name` / `@namespace` / `@updateURL` / filename for the mainline.
