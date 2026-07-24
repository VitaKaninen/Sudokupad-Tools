# Handoff: Gecko (Firefox/LibreWolf) layout investigation

**Purpose.** A fresh session should read this, then take an independent look at everything we
touched — this session **and** the related prior sessions — and decide whether anything still
needs changing. The technical root-cause writeups live in `LESSONS_LEARNED.md` (three new sections,
v3.135 / v3.136 / v3.138 / v3.141); this file is the narrative + a review checklist.

Everything is in the single file `Sudokupad-Tools.user.js`. Grep for the function names below.

---

## 1. Where it started (the original report)

User was testing on **LibreWolf/Firefox** (edits in ViolentMonkey/Brave, primary testing normally
Chrome+TamperMonkey — this bug is Gecko-only, which is why it went unseen for a long time).

Two complaints on puzzle `https://sudokupad.app/1tlg0akpxa`, comparing Firefox vs Chrome at the
same window size:
1. **A large empty band above the board**, board shrunk (Firefox only).
2. **The arrow clues render completely differently** — blue emoji-style diamonds in Firefox vs
   thin grey glyphs in Chrome.

The user attributed (1) to our recent **region-border** rework (the v3.124–v3.134 device-pixel
border-snapping era, esp. **v3.129** which had added a probe rect to measure the device transform).

## 2. What we thought, what we tried, where we ended up

The investigation went through **four theories**. Only the last two were correct, and they turned
out to be **two independent bugs** plus **one red herring**.

### Red herring: the arrows
The arrow clues are `<text>` elements holding Unicode arrow glyphs. Firefox gives them **emoji
presentation** (blue diamond) where Chrome gives text presentation (grey) — a font-fallback
difference, **not caused by our script**. We never chased it further. *Still unresolved; flagged
below.*

### Theory 1 — the border-snapping probe rect (WRONG cause, but a real improvement)
v3.129 measured the user-unit→device-pixel transform by appending a **1000-unit** invisible
`<rect>` to `#svgrenderer` and reading its `getBoundingClientRect`, on **every border redraw**.
Hypothesis: that per-redraw reflow with a transiently huge SVG child caused the empty band on Gecko.
- **Change (v3.135):** `borderSnapCtx()` now derives the same transform from the board's **own**
  `getBoundingClientRect` vs its `viewBox` — no DOM append. Verified identical to ~1e-6 on Blink.
- **Outcome:** good change (removed a per-redraw reflow), but **did not fix** the reported bug. The
  empty band persisted.

### Theory 2 — the #controls width cap measured too early (partial, didn't fix)
The buttons were also in the wrong place (aux row spread full-width). Suspected the width-cap
machinery measured before layout settled and stuck (the load poll stops at first success;
`nativeControlsReady()` tests existence, not stability).
- **Change (v3.136):** added a `ResizeObserver` in `watchNativePadWidth`, a sanity clamp in
  `alignNativeAuxRow`, and delayed re-runs at load.
- **Outcome:** sound robustness, but **did not fix** the visible bug.

### Diagnostic turn — `window.spdrLayoutProbe()` (v3.137)
Stopped guessing. Added a probe dumping every input to the width cap. The user ran it in Firefox
and LibreWolf, broken vs good. **This is what cracked it.**

### Theory 3 — bistable #controls width loop (CORRECT — fixed the buttons)
The probe showed: Firefox `nativePadWidth 283`, `.controls-tool` offW **69** (one column), cap 426;
LibreWolf `352`, **138** (two columns), cap 495. We reserve our column with `padding-right: 143px`
on `.controls-buttons` and cap `#controls` at `pad + 10 + 133`, which makes the native content box
land at **exactly** the pad width — the wrap threshold for `.controls-tool`'s 2nd column. A hair
narrow → the column wraps → `nativePadWidth` measures the wrapped 283 → cap re-derives 426 → keeps
it wrapped. **A stable wrong fixed point** Gecko fell into and never left.
- **Change (v3.138):** measure `nativePadWidth` with our own `padding-right` lifted to 0
  (synchronous read+restore, no paint) so it reflects native content only; plus `CAP_SLACK = 4px`
  so the content box never lands exactly on the wrap threshold.
- **Outcome:** **fixed the buttons.** But the board still shrank ~90% of loads.

### Theory 4 — the board shrink is SudokuPad's own bug (CORRECT — we only triggered it)
Extended the probe with the board scale chain (v3.139) — but its `getBoundingClientRect` calls
**force a reflow that heals the misfit**, masking it. So added a **passive** recorder
`window.spdrBoardLog` (v3.140) that reads only inline `style`/attributes. It caught the sequence:
board correct at svg width **608** → **`our-resize-dispatch`** → board **1072** (shrunk). Traced
into SudokuPad's source: board size = `scaleToFit(boardBounds, bounds)`, which reads `#controls`'s
transform and a portrait/landscape switch; its **resize** path mis-computes on Gecko.

**Decisive test:** with the userscript **disabled**, resizing the Firefox window shrinks the board
the same way. So the board-shrink is **SudokuPad's own Gecko bug**. Our `syncAppResizeSoon()`
dispatches a synthetic `resize` (to refresh the footer scale after width changes), which on Gecko
fired that misfit **at load**, with no user action — that is the "~90% of loads" symptom.
- **Change (v3.141):** `if (IS_GECKO) return;` in `syncAppResizeSoon` — don't dispatch the synthetic
  resize on Gecko. The board keeps its correct **initial** fit. Blink keeps the nudge (its resize
  path is correct).
- **Outcome:** removes the load-time trigger. A real user resize on Firefox **still** shrinks the
  board (pre-existing SudokuPad bug, reproduces script-off).

---

## 3. Everything changed this session (v3.135 → v3.141)

| ver | change | fixed something? |
|---|---|---|
| 3.135.0 | `borderSnapCtx()` measures transform from the board's own BCR/viewBox, no probe rect | no (good cleanup) |
| 3.136.0 | `watchNativePadWidth` ResizeObserver; `alignNativeAuxRow` delta clamp; delayed cap re-runs | no (robustness) |
| 3.137.0 | added `window.spdrLayoutProbe()` diagnostic | — |
| 3.138.0 | measure `nativePadWidth` with our `padding-right` lifted; `CAP_SLACK=4` | **yes — buttons** |
| 3.139.0 | extended probe with board scale chain + rules/banner | — |
| 3.140.0 | added `window.spdrBoardLog` passive recorder | — |
| 3.141.0 | `IS_GECKO` gate on `syncAppResizeSoon`'s synthetic resize dispatch | **yes — load shrink** |

**Functions touched (grep these):** `borderSnapCtx`, `applyControlsWidthCap`, `nativePadWidth`,
`alignNativeAuxRow`, `watchNativePadWidth`, `syncAppResizeSoon`, `buildAllUI`, plus the new
`spdrLayoutProbe` / `spdrBoardLog` / `installBoardRecorder` / `IS_GECKO` / `CAP_SLACK`.

## 4. Prior-session code this all sits on (review these too)

The layout machinery is **not new** this session — it was built earlier and is where the real
behaviour lives. A fresh review should look at these commit ranges / regions:

- **`#controls`-embedding + width-cap + the resize nudge (v3.107–v3.118).** All our on-puzzle UI
  lives *inside* `#controls` (which SudokuPad scales with a CSS transform). Region: the "right-hand
  column" section (~`ensureRightColumn`, `applyControlsWidthCap`, `nativePadWidth`, `collapsedRightColW`,
  `updateRightColCss`, `updateContentWidthCss`, `centerControlsFooter`). **`syncAppResizeSoon` was
  added in v3.116** — it is the synthetic-resize nudge at the centre of the board-shrink trigger.
- **Device-pixel border snapping (v3.124–v3.134).** Region: `borderSnapCtx`, `makeAxisSnap`,
  `snapCenteredBand`, `drawRegionSplitBorders`, `spdrBorderProbe`. This is the "region borders"
  work the user originally suspected; v3.129's probe rect was removed in v3.135.

## 5. Confirmed status & open items for a fresh look

**Fixed / confirmed:**
- Buttons in the right place on Gecko (v3.138).
- Board loads correct on Gecko (no load-time shrink) — v3.141 removed our trigger.

**Open / candidates for a fresh take:**
1. **Real user resize on Firefox still shrinks the board.** This is SudokuPad's own Gecko bug
   (reproduces script-off). Options to weigh: (a) leave it (not ours); (b) a **board-fit corrector**
   — observe `#board`/`#svgrenderer` and re-assert a correct scale after SudokuPad mis-fits (fighting
   the host; scope carefully); (c) report upstream to SudokuPad. Not attempted.
2. **The arrow-glyph rendering** (blue emoji diamonds in Firefox). Never resolved. Likely emoji
   presentation / font fallback on the `<text>` glyphs — check whether our substrate sets a
   `font-family` on overlay text that triggers Firefox's emoji fallback, or whether a
   `variation-selector`/`text`-presentation fix helps. May be entirely SudokuPad/OS, not ours.
3. **Gecko footer-scale refresh was traded away** by the v3.141 gate. If the footer/credit line
   sits slightly low on Firefox after a width change, position it directly instead of via a resize
   nudge (we already have `centerControlsFooter`).
4. **"Colours all white ~half the time in LibreWolf with the console open."** A *different* race —
   our dark-mode substrate losing to a slower load. Not investigated this session.
5. **Diagnostics still in the build:** `window.spdrLayoutProbe`, `window.spdrBoardLog`
   (+`installBoardRecorder`), `window.spdrBorderProbe`. Cheap; strip once everything is settled.
   Note: `spdrBoardLog`'s scale parse only matches `matrix(...)`; the live transform is
   `translate(...) scale(...)`, so `scale` logs as `null` — fix the regex if the recorder is kept.

## 6. How to reproduce / drive it

- Bug is **Gecko-only** (Firefox/LibreWolf). Chrome/Blink is always correct, so the MCP browser
  tools (Chrome only) can inspect structure but **cannot reproduce** the bug.
- The full `spdrLayoutProbe()` **forces a reflow that heals the board misfit** — use the **passive**
  `spdrBoardLog` for anything board-scale related, and read it *before* running the full probe.
- Decisive triage test for any "is this ours?" cross-engine layout bug: **disable the userscript and
  retry in the same engine.**
