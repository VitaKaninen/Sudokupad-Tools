# Validate Constraints — the validator subsystem

*Split out of [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) on 2026-07-19 — it had grown to ~60% of that
file. Same role: current state + architecture. Hard-won do/don't knowledge stays in
[LESSONS_LEARNED.md](LESSONS_LEARNED.md); the in-code "ADDING A VALIDATOR" banner above
`constraintValidators()` is the authoritative extension checklist — update it and this file
together.*

*Verification tooling: `node tools/validator_harness.mjs` (pure-logic regression cases extracted
from the live userscript — run green before committing validator changes) and `python
tools/cue_recall.py` (catalog-wide cue recall + clause blindness — run on every cue change; keep
UNREADABLE at 0).*

## Feature overview — button, registry, runners

**Validate Constraints (v3.53; cages added v3.56; little killers v3.57; dropdown menu + run-all
v3.59; thermo v3.67; German whispers v3.69, layered detection v3.70; XV v3.72; sum arrows v3.73;
renban + region-sum lines v3.75; parity + zipper v3.78; entropic lines v3.85; Dutch whisper +
modular lines v3.93; double arrows v3.131; nabner v3.152; ten lines v3.153; same-difference lines
v3.159; palindromes v3.164):** a floating **"Validate Constraints"** button (`buildValidateButton`,
`#sp-validate-btn`, bottom-right cluster above the Auto-fill button at `bottom:120px right:12px`;
hidden via `settings.showValidateButton`/the "Show Validate Constraints button" checkbox). Removes —
never adds — centre candidates that no constraint can satisfy. **Modular by design:**
`constraintValidators()` is a list of independent validators, each with
`name`/`unitNoun`/`menuLabel`/`compute`/`countKey`/`noneKey`, plus `classify` (line validators — the
classification fn, run ONCE per menu build by `detectedValidators()` and stashed on the def as
`def.cls`; detection, the greyed ambiguity state and the hover eyeball all read that one result) or
`detect` (non-line validators — cheap presence probe). The per-validator `settings.validate*Enabled`
keys and the per-type `*Detected`/`*IsAmbiguous` wrapper fns were REMOVED in v3.104 — the "Show
Validate Constraints button" checkbox (`showValidateButton`) is the single feature toggle, and a run
(`compute`) still classifies FRESH at click time (`def.cls` is a per-menu-build preview cache, never
a correctness input). **To add a validator, follow the "ADDING A VALIDATOR" checklist in the code
(banner comment directly above `constraintValidators()`)** — it is NOT just "append an entry": line
validators set `classify`; non-line validators add a `validatorClueObjects()` case so the per-row
hover eyeball works. Any NEW cross-cutting validator feature must be applied to every existing
validator retroactively AND added to that checklist so the next validator inherits it automatically.
**Modular lines (v3.93)** = the entropic engine (`computeBandLineRemovals`) with residue-mod-3 bands
({1,4,7}/{2,5,8}/{3,6,9}); **Dutch whisper lines (v3.93)** = the whisper engine
(`computeWhisperLikeRemovals`) with threshold 4 instead of 5, cue-gated (no trusted colour, unlike
German green). Both are near-clones of their sibling — proof the shared engines pay off. **XV
validator (v3.72 — structurally a Kropki clone):** `collectXVDots` finds an `#overlay`/`#underlay`
`<text>` of exactly "X" or "V" centred on a cell border (native XV is a bare letter, no disc;
cosmetic XV is a labeled Kropki circle whose letter also lives in `#overlay`) — reads the letter's
`getBBox` centre and derives the 2 cells with the **exact** geometry `collectKropkiDots` uses.
`computeXVRemovals` reuses the Kropki arc-consistency-to-a-fixpoint machinery; only the partner rule
differs — a candidate *d* survives iff the neighbour can hold *e* with `d+e = 5` (V) / `10` (X). The
2 cells are orthogonally adjacent (always share a row/col) → a self-partner (`e==d`, i.e. d=5 on an
X) is impossible and excluded. Positive clues only (no negative "all Xs/Vs given" constraint).
**Dropdown menu (v3.59 — replaces the old union-in-one-pass `validateConstraints`):** clicking the
button opens a menu (`toggleValidateMenu`/`openValidateMenu`, `#sp-validate-menu`) listing **"Run
all (loop until stable)"** + one item per enabled validator (`menuLabel`). `positionValidateMenu`
aligns the menu's right edge to the button and opens **upward** when a downward menu would overflow
the bottom (the button sits near the bottom), else downward, clamping if neither fits; closes on
outside-`mousedown`/resize. **Single pick** → `runSingleValidator(def)` (compute+apply that one
validator once). **Run all** → `runAllValidators()` runs every enabled validator **in sequence**,
repeating the whole cycle until a full pass removes nothing — a **cross-constraint fixpoint** (e.g.
a cage removal that unlocks a further Kropki removal, which the old single combined pass missed,
forcing repeat clicks). Both share `applyOneValidator(def)` (compute → apply via
`_removeCandidatesInternal`, its own undo group; reads the live DOM so each call sees prior removals
— that's what lets run-all cross-feed) and the `actionInProgress` lock; nothing runs concurrently
any more. Toasts: per-run "Removed N across M dots/cages/little killers" (run-all adds the pass
count). **Emptied cell → ERROR (v3.77):** if a run leaves ANY cell with no candidates (counted by
diffing `markedCellKeys()` before/after — accurate across passes), the toast is a **red error**
(`noValidComboMsg` — "No valid combination found…") instead of the old yellow ⚠ warning: a validator
whose job is to *check* a constraint must report failure, not an all-clear, when the marks can't
satisfy it. This is uniform for every current + future validator (they remove only unsupported
candidates, so an emptied cell always = a contradiction).
`validateAbortToast`/`noValidComboMsg`/`pluralUnit` are shared helpers. **Post-run Undo button
(v3.77 — `#sp-validate-undo-btn`, mirrors the Auto-fill Undo):** after any run that removes
candidates, a small "Undo" button appears just LEFT of the Validate button (`validatorArmUndo`;
position via `validatorPositionUndoButton`). Shown only while the live board still equals the
post-run snapshot (a `MutationObserver` on the cell layers via
`validatorStartUndoObserver`/`validatorRefreshUndoButton`/`validatorUndoAvailable`) — so any edit
hides it and native-undoing back brings it back; clicking it (`validatorDoUndo`) re-clicks the
NATIVE undo `steps` times (steps = number of removal groups the run made — 1 per single run,
`undoSteps` counted per applied validator in run-all — each its own groupstart/groupend), rewinding
exactly that run and preserving the puzzle's own undo/redo. In `isInOurUI`. Tied to
`settings.showValidateButton`. Both validators share **`readValidatorBoardState()`**
(numeric-digit-set guard → `{uni, fullSet, values, centre}` snapshot; null = letters/empty →
unsupported). **Kropki validator:** `collectKropkiDots` finds **standard** dots (unlabeled
black/white circle on a cell border — reuses
`isKropkiCircle`/fill/`isOnCellBorder`/`getKropkiAdjacentText`, **skips labeled**
difference-N/ratio-N/XV) and computes the two cells from geometry (`getGridCellSize`, vertical
border→left|right, horizontal→top|bottom; bounds-checked vs `detectGridSize`).
`computeKropkiRemovals` reads values/givens + centre marks from the DOM and runs **arc-consistency
iterated to a fixpoint** — it sweeps every dot (both directions) deleting unsupported candidates
from the live working set so eliminations cascade, repeating until a full pass changes nothing:
candidate *d* in a cell is removed if, for some dot it sits on, the neighbour can't currently hold a
partner (black: `e==2d || d==2e`; white: `|d-e|==1`) over `settings.digitSet` (so 5/7/9 leave a 9×9
black dot, 0 is consecutive-only); a value/given cell contributes its one digit, an empty cell = the
full digit set (never modified). **Pairwise is not enough when one cell carries TWO dots (v3.90):**
three cells joined by two white dots *inside one box* (`15pllu191x`) pass pairwise as `3-2-3`, but
the outer cells share a box and can't both be 3. `candidateSupported` therefore also tests **Hall's
condition over each mutually-`mustDiffer` clique** of a cell's dot-neighbours (`|union of available
partners| >= |clique|`) — so the middle cell correctly loses 1 and 9, while an **L-shaped** triple
across two boxes keeps them (repeats are legal there). Hall is *necessary*, so this can under-remove
but never over-remove; ≤4 neighbours makes subset enumeration free. The predicate is
`makeMustDiffer()`, **shared with the whisper validator** and jigsaw-aware via the model region map.
**Fixpoint, not single-pass (v3.55 — restores the v3.53 behaviour v3.54 had replaced):** the user
wants it to keep iterating until stable. On test puzzle `264wvenhmu` a `124689/124689` white pair
settles to `89/89` — the **correct deep result** (once the wider web propagates, 1/2/4/6 have no
surviving partner); verified the fixpoint empties **0 cells** there and on the dense all-Kropki
`algxlb0a1z`, i.e. sound, just deep. **Caveat:** it trusts the current marks as complete, so run
mid-solve on a partly-pencilled grid it propagates those partial marks and can remove more than is
obviously invalid — cleanest on a fully-pencilled grid. Monotonic → always terminates (1000-pass
guard is belt-and-braces). Letters/empty digit set → unsupported (no-op + warning).
`_removeCandidatesInternal` applies the removal list via the same `app.act({type:'candidates'})`
paste path (grouped by digit, one undo group, net-diff verified, group-rollback on anomaly); **Cage
validator (v3.56 — standard killer cages):** `computeCageRemovals` (independent of Kropki).
`getKillerCages` reads `Framework.app.puzzle.currentPuzzle.cages` (synchronous safe getter) and
keeps cages with a numeric `sum`, distinct digits (`unique !== false`), ≥2 cells, all in grid — cell
strings `r1c3` (1-indexed row,col) → 0-indexed `col,row`; skips sum-less regions / repeat-allowed
cages. `cageCombinations(digits,size,target)` generates every distinct-digit combo of the right size
summing to the cage total (subset-sum recursion over `settings.digitSet`). A centre candidate *d* in
cage cell *C* is **kept** iff some combo containing *d* admits a full legal fill: fix *d*→*C*, then
require a **perfect bipartite matching** (`hasPerfectMatching`, Kuhn augmenting-path) of the combo's
remaining digits onto the cage's remaining cells, each respecting that cell's current candidate set
(value/given = its one digit; empty cell = full set, never modified). No supporting combo → remove.
This is the rigorous distinct-cell-assignment test, NOT just "the partner digits exist somewhere" —
so it never over-eliminates. **Iterated to a fixpoint** (a removal can kill a neighbour cell's only
supporting combo). **Safety:** a cage that yields ZERO combinations (impossible total, or a digit
set that doesn't match the puzzle) is **dropped**, never allowed to wipe out every candidate.
**Little-killer validator (v3.57 — diagonal sums, duplicates allowed):**
`computeLittleKillerRemovals` (independent of Kropki/cages; always-on — the per-validator enable
settings were removed v3.104). A little killer sums a diagonal; digits **may repeat** along it
**except** where ordinary Sudoku rules forbid it — two diagonal cells in the same **box** or the
same uniqueness **cage** must differ (cells on a diagonal never share a row/column, so those never
apply). **Detection is DOM-based + era-independent** (`getLittleKillers`): SudokuPad renders every
LK (native SCL or legacy-cosmetic, e.g. `vurjqaca3k` whose `currentPuzzle.littleKiller` is empty) as
a numeric label just **outside** the grid + a short ~45° diagonal arrow in `#arrows`. We read the
sum from the label and, from the arrow, its **tip** (snapped to the grid corner it points at,
`R=round(tipy/cs), C=round(tipx/cs)`) plus its direction signs; the first in-grid cell is the
corner's neighbour in the pointing direction (`r0 = sgny>0?R:R−1`, `c0 = sgnx>0?C:C−1`) and we walk
by `(sgny,sgnx)`. **(v3.58 fix:** the original v3.57 used a `c±r` constant off the label centre,
which had a half-cell **off-by-one on the anti-diagonal** (↙/↗) — it shifted those diagonals
up-right by one cell, e.g. turning the `30` clue into an impossible 3-cell sum-30 that wiped its
cells. The tip-corner+direction walk is correct for all four diagonal directions.) Guards
(outside-grid numeric label matched to an outside-grid ~45° arrow tail within ~1 cell) keep it
specific — sandwich/X-sum frame numbers and in-grid arrow constraints are ignored; a
differently-rendered future LK simply isn't detected (under-removal, safe) rather than mis-detected.
Validation: per diagonal, build a **conflict matrix** (which cell pairs must differ, from box
geometry `regularBoxDims` + uniqueness cages `getUniqueCageCellSets`), then for each cell enumerate
every assignment hitting the target sum with all conflicting pairs distinct (each cell from its
current candidate set) and union the digits used per cell — a candidate not in that union is
removed. Backtracking with exact-sum suffix-bound + conflict pruning; a node cap (300k) **bails
safely** (no removals from that diagonal) on a pathological search. **Iterated to a fixpoint** (a
removal can kill another diagonal's support; diagonals may cross-share cells). **Box caveat:** only
**regular** boxes are derived (`regularBoxDims`: largest h≤√N dividing N → 9=3×3, 6=2×3, 12=3×4…);
jigsaw/irregular regions aren't, so on such a rare puzzle the box constraint is **under**-applied,
never wrong. Verified on `vurjqaca3k` — the 4 clues (24↘/6↙/18↘/30↙) resolve to exactly the right
cells. **German-whisper validator (v3.69; layered detection + partial-selection v3.70):**
`computeWhisperRemovals` (independent; always-on — the per-validator enable settings were removed
v3.104). SudokuPad has **no native whisper key** — whispers are cosmetic lines (`cp.lines`, or
`#arrows <path>` for imports), the ≥5 rule only in the text. **Colour alone is NOT enough**
(catalog-verified: only ~40% of ≥5 puzzles write the phrase "German Whisper"; ~83% carry a ≥5 cue;
green is the norm but real whispers are drawn grey `#aaa` (`6z3zy41pm6`,`qhcougnkg6`) or themed
`#aa8d8d` (`atfgvx1pgc`), and grey ALSO = palindrome). So **`classifyWhisperLines` is LAYERED** →
`{mode:'confident'|'ambiguous'|'none', lines, allLines}`: (1) **green** lines are always whispers
(`isGermanWhisperColor` = `g>90 && g≥r+40 && g≥b+40`) — EXCEPT a green line the thermo detector
claims (v3.81: `thermoClaimedSets`/`lineOnThermo` — all its cells on one `getThermos()` tree = it IS
the thermo's shaft; green thermos are real, `qpd5keiva9` "Equipoise". Exclusion is layer-1-only: the
cue-gated layers demand whisper language, so a cue-bearing line stacked exactly on a thermo — e.g.
`kszsitwn8p` modular-on-thermo — stays in the pool) and EXCEPT when the rules name green for a RIVAL
rule (v3.82 `greenNamedForRival`: some clause names green, and NO green-naming clause carries
whisper language `WHISPERISH_RE` = whisper/differ(s|ence) word-bounded — plain "different" must not
count, `qpd5keiva9` again; rules that never mention green keep the trust — covers bulbless green
thermos the thermo-claim filter can't see); else if a **≥5 rules cue**
(`hasWhisperRuleCue`/`WHISPER_CUE_RE` — phrase OR "differ/difference…5/five", read via
`getPuzzleRulesBlob` = title+rules+metadata) is present: (2) if **all cosmetic lines are one single
colour** → that colour is the whisper; (3) else if the **rules name a colour** for it
(`whisperNamedColorWord`+`colorWordMatches`, e.g. "grey line…differ by 5") → lines of that colour;
(4) else **AMBIGUOUS** — the menu shows a ⚠ note (`whisperIsAmbiguous`) and only lines the player
SELECTS are validated (run regardless of colour). "Any line if cue" was deliberately rejected (would
mis-flag palindromes). `getCosmeticLines` = every `cp.lines` entry (DOM `#arrows` fallback, stroke
**ATTRIBUTE** = author's pre-shading colour); `detect: whisperDetected` = mode≠none. Validation is
**deliberately LOCAL** — per cell, look ONLY at its 1–2 immediate line neighbours: candidate *d*
survives iff every neighbour can hold a partner with `|d−e|≥5`, AND (when the two neighbours must
differ by ordinary Sudoku — same row/col/box/uniqueness-cage, via
`regularBoxDims`+`getUniqueCageCellSets`) the two partner sets' **union has ≥2 digits**. So 3 cells
in one box: centre loses 4/5/6 but keeps 7; 5 dies unless 0 is in the digit set. **SELECTION-AWARE
(unlike the other validators):** it reads selection/fog directly (ignores the shared whole-clue
`unitFilter`) so it validates a **PARTIALLY-selected** line — a cell at the selection edge still
READS the rest of the line, but `mayRemove` only alters cells inside the selection (and never a
fogged cell; fogged neighbours read as the full set so hidden marks never force a removal).
Ambiguous mode REQUIRES a selection → `{needSelection:true}` (tailored toast in
`runSingleValidator`). **Iterated to a fixpoint.** `validateConstraints` is the public entry
(`actionInProgress` lock, full `revertToSnapshot` on abort, combined toast incl. an emptied-cells ⚠
warning). Wired in `buildAllUI`; `getToastBottom` clears the new button. **Per-row hover eyeball
(v3.91; objects + ambiguity v3.92):** every validator menu row (incl. the thermo row with its Slow
checkbox) carries a `makeValidatorEye(def)` 👁 at its right edge (v3.143: inside `makeValidatorIcons`,
alongside the highlight-mode ↻) — hovering highlights the actual
clue **OBJECTS** this validator would act on (the dots, lines, cages, thermos, arrows — NOT the
cells that hold them) via `spdrHi.showObjects(objs)` (same overlay the settings eyeballs use).
**Two gestures (v3.147, reworked v3.148):** **hover = ISOLATE** — draw only this validator's
objects (any pinned ones step aside for as long as the pointer is on the icon) and, after 350 ms,
**blink** them (`spdrHi.blink(on)`, the pulse cycle on `infinite`) until mouse-out, which restores
the pinned set; **click = PIN**, and pins **ACCUMULATE** — several eyes can be lit at once, and
clicking a lit one drops just that one. `spdrHi` is one shared overlay, but `showObjects` takes a
LIST, so `redrawPinnedEyes()` draws the union of every pinned def's descriptors in a single call
(`validatorEyePins` = `[{name, def}]` in click order; `validatorEyePinned(name)` is the lit test).
A click deliberately does NOT redraw: the pointer is still on the icon, so the isolate view stays
and the new pin set takes over on mouse-out. Pins are dropped wholesale by `validatorEyeUnpin()`
from `closeValidateMenu` and `validatorHiliteCheckPuzzle`, so a pinned overlay can never outlive
its off switch. Clicking repaints the eyes in place via `refreshValidatorEyeIcons` (each icon carries
`data-spdr-eye` + a `_spdrEyeSync`) rather than rebuilding the menu, which would re-measure its
width and drop hover state. It draws **only what a plain click WOULD validate** —
the confidently-identified clues; an **ambiguous** line type (the puzzle leaves which-is-which to
the solver, `SELF_DEDUCTION_RE`) draws nothing and pops a `spdrTip` explaining the lines can't be
auto-identified. `validatorClueObjects(def)` (switch on `def.name`) **reuses each validator's own
detection fn** — `collectKropkiDots`/`collectXVDots` (`{type:'dot',a,b}`), `getKillerCages`
(`{cage,keys}`), `getLittleKillers` (`{diag,keys}`), `getThermos` (`{thermo,edges,root}`),
`getSumArrows` (`{arrow,circle,shaft}`), and the line validators' `classify*Lines()` via
`validatorClassify(def)` — **confident lines only** (ambiguous → none, since a plain click removes
nothing) — so the preview can't drift from what runs. `showObjects` renders each: dot = marker on
the shared border, line/diag = polyline through cell centres, thermo = a segment per tree edge +
bulb marker, arrow = bulb marker + polyline, cage = merged cell-set perimeter. `eyeDef` opts into
pointer-events, and `addItem` dims only the **label** (not the row), so the eye stays fully lit and
usable on a greyed (ambiguous) row.

## Menu behaviour (v3.66 rework: toggle popup, detection-gated items, selection-only, fog gate)

**Menu rework (v3.66):** the button **TOGGLES** the popup (`#sp-validate-menu`) — it stays open
across runs and selection changes; only the button (or a window resize) closes it (the old
outside-click close + close-on-item-click are gone). The button + menu are in `isInOurUI`, so clicks
on them never reach SudokuPad and never clear the player's cell selection (mousedown/up blocked;
`click` still fires — same mechanism as the settings panel). **Items are detection-gated:** each
validator def gained `detect()` (cheap presence probe:
`collectKropkiDots`/`getKillerCages`/`getLittleKillers`/`getThermos` non-empty), re-run on every
menu open via `detectedValidators()` so late model loads / SPA puzzle switches are picked up; only
constraints actually present in the puzzle are listed (none → an italic note). The old "Run all"
menu item is a **"Run all above functions" button** at the bottom (`addButton`→`onRunAllClick`;
**v3.75 replaced the earlier `validateRunAllMode` "Run all until stable" checkbox** — clicking a
validator item now always runs just that one via `runSingleValidator`, and the button explicitly
triggers `runAllValidators` = the cross-constraint fixpoint over the *detected* set). The button is
only shown when ≥1 validator is detected. Second checkbox **"Validate selection only"**
(`validateSelectionOnly`, in `SESSION_ONLY_KEYS` → resets to off each page load):
`selectionUnitFilter()` resolves the selection at click time into a nullable
`unitFilter(cellKeys[])→bool` — a unit passes iff **EVERY one of its cells is selected**. Each
`compute(unitFilter)` drops non-covered units up front (Kropki dot by its 2 cells, cage by `keys`,
little killer by its whole diagonal) — **the contract every future validator must follow: filter its
unit list before validating; a partially-selected clue is skipped outright, never half-checked.**
Selection-only + empty selection → warning toast, no run. Combined with run-all, only the
fully-covered units cross-feed to the fixpoint. `noneFoundMsg` words the "nothing to check" toast
for puzzle vs selection scope. **Fog gate (v3.68 — applies to ALL validators, always on):**
`onValidatorItemClick` ANDs `combineFogFilter` into the (nullable) selection filter, so a unit runs
only when it's selected (if that mode is on) AND **none of its cells are under fog**.
`getFogTester()` returns a `isFogged("col,row")` predicate (or null when the puzzle has no active
fog) by hit-testing cell centres against the rendered `#fog-path` path with
`SVGGeometryElement.isPointInFill` — the fog path is the fogged region as one fill whose fill-rule
**holes are exactly the revealed cells**, so the hit-test reports live reveal state correctly (a
naive per-subpath rect scan over-counts because it ignores the holes). Gating is unit-level ("the
entire clue must be revealed"), matching the selection-filter contract.

**The 👁 EYEBALL is disabled under fog (v3.133).** The unit-level gate makes *running* a validator
safe, but the hover preview isn't a run — `validatorClueObjects` draws EVERY clue of that type,
including ones still under fog, so it showed the player exactly what they hadn't uncovered. So
`makeValidatorEye`'s `mouseenter` bails on `puzzleHasFog()` and shows a tooltip saying why (and that
the validator itself still works). Nothing else about the menu changes: a fog puzzle still lists,
greys, runs and toasts normally.

**`puzzleHasFog()`** — a property of the PUZZLE, not of the current reveal state (unlike
`getFogTester`, which empties out once everything is uncovered): model
`currentPuzzle.fogofwar`/`.foglight` first (tested **non-empty** — they're cell lists, so a bare
truthiness test false-positives on `[]`), then the native payload, then the rendered `#fog-path`. It
also disables **Easy Shade** outright (`effRegionColorFill`/`effShadedRegionColor` AND it in at every
render site, and the button greys out with a tooltip) — region colouring painted region shapes
straight through the fog, and unlike a validator there is no per-clue narrowing that makes it safe.

## Highlight vs Remove (v3.133; reworked v3.143 + v3.146)

The menu's bottom row is a **segmented control** — caption "When a validator finds an invalid digit:"
over two mutually-exclusive buttons, `[ Highlight it | Remove it ]`, the chosen one filled
(`addModeSegments`, `settings.validateHighlightMode`, persisted). It is deliberately NOT an on/off
switch: v3.133 shipped one labelled "Remove invalid digits" in its off position, which reads as
"removing is turned OFF" and invites you to switch it on — getting you the opposite behaviour. Two
actions, neither of which is "nothing", is a segmented control, not a toggle.

- **Highlight** (**the default since v3.143**, and the left segment) — nothing on the board is
  modified. The unsupported candidates are painted **orange**. Since no edit is made, the post-run
  Undo never arms.
- **Remove** — a validator deletes the unsupported candidates via the paste path and arms the
  post-run Undo.

Both segments look identical when chosen (v3.146: plain `rgba(255,255,255,0.16)` fill). "Highlight
it" used to be filled orange, which read as a live indicator rather than as the selected half of a
switch. **Orange in this menu now means exactly one thing: ↻ auto-update is running.**

`validateHighlightModeDefaulted` is a one-shot migration flag (checked right after `loadSettings()`):
a profile saved before v3.143 stores the old `false`, which `Object.assign` would keep, so the mode
is forced on **once** and the flag remembers that it happened — a later deliberate switch back to
"Remove it" sticks.

### The highlight rework (v3.143 + v3.146)

1. **No run-all in highlight mode.** The bottom button is always **"Clear all highlights"** (greyed
   with an explanatory tooltip when there is nothing to switch off) — the master off-switch,
   `clearAllValidatorHighlights()`, which also switches off every ↻ (otherwise the next keystroke
   would paint the orange straight back). `runAllValidatorsHighlight` (the highlight-mode fixpoint
   over every detected validator, v3.133–v3.142) is **gone**. Remove mode keeps "Run all above
   functions" unchanged.
2. **A row click is a plain one-shot RUN, and rows carry NO persistent state styling** (v3.146).
   `toggleValidatorHighlight` is gone; `onValidatorItemClick` → `runValidatorHighlight`, which
   replaces that validator's previous flags. Rows have hover + a `mousedown` press flash only. The
   old lit-row-while-flagged look claimed something untrue — the player can clear those marks by
   hand at any time, and the row stayed lit anyway. Feedback for a run is the orange it paints and
   the toast; the highlight itself persists until "Clear all highlights".
3. **The per-row ↻ is an AUTO-UPDATE TOGGLE** (v3.146; it was a one-shot re-run in v3.143), always
   visible on every row in highlight mode. ON = that validator re-runs itself **on every board
   edit**, so e.g. removing a candidate on one side of a 2-cell cage immediately re-flags the
   partner digit. Switching it on also runs the validator once, straight away.
   - State: `validatorAuto` (in-memory, per session, per validator name) —
     `validatorAutoOn`/`validatorAutoSet`/`validatorAutoClearAll`, all gated by
     `validatorAutoAllowed()`.
   - Wiring: the cell-layer observer → `validatorHiliteOnBoardChange` = `validatorHiliteMarkStale`
     (everything becomes untrusted) **+** `scheduleAutoValidators()`, a 150 ms debounced
     `runAutoValidators`. It is **silent** — no toasts, since it fires on ordinary solving — and
     rebuilds the menu only when "is anything highlighted at all" flips.
   - **ITERATED TO A FIXPOINT (v3.149).** Each validator reads the fresh orange of the ones before
     it as invalid, so a single pass in list order only feeds FORWARD — the last validator's new
     flags never reached the first, which is why the auto-update looked like it "ran once". The
     pass now repeats until a whole round changes nothing (`MAX_AUTO_ROUNDS = 12` is a safety cap
     only; flags accumulate, so it settles in a few rounds). `validatorHiliteSet` /
     `validatorHiliteClear` return whether the stored set actually moved — that is the loop's
     signal.
   - **NEVER REASON FROM YOUR OWN CONCLUSION (v3.150)** — the rule that makes the loop above sound.
     A validator's flags were derived from those candidates being PRESENT, so a re-run that trusts
     its own orange sees the clue as already satisfied, returns zero removals, and **wipes the
     highlight it was refreshing**. (v3.149's loop did exactly that: round 1 flagged, round 2
     erased, and 12 rounds ended on an erase — so every board edit blanked the orange while the ↻
     stayed lit, and the accumulated result was unstable/under-reported.) The manual path was
     always safe (`runValidatorHighlight` drops its own flags before computing);
     `runAutoValidators` wraps each `compute` in `validatorHiliteSuppressOwn(def.name)` instead —
     `validatorHiliteRuledOut` then reads `liveKeys` MINUS that validator's own keys, so a key
     another fresh validator also flagged still counts, and no paint flickers.
   - **A manual run also kicks the auto pass** (v3.149): `runValidatorHighlight` calls
     `scheduleAutoValidators()` after flagging. Its new orange is a new "this digit is impossible"
     for every ↻-on validator, but it changes no cell text, so the observer would never see it.
   - The observer stays connected while any ↻ is on, not only while a flag is fresh.
   - **Disabled while "Validate selection only" is ticked** (an auto re-run would keep re-reading a
     selection the player has since moved): `validatorAutoAllowed()` returns false, the icons render
     greyed with a tooltip saying why, and ticking the checkbox calls `validatorAutoClearAll()`. Also
     cleared on a mode switch and on SPA navigation.
   - It is the only control in the menu with a persistent "on" look: orange glyph, `highlightRowBg()`
     pill, 1px orange ring.
4. **Icon alignment.** `makeValidatorIcons(def, refreshDisabled)` wraps 👁 (+ ↻) in one
   `marginLeft:auto` container, each icon in an identical fixed 18px box (`VALIDATOR_ICON_BOX`), and
   the rows' right padding dropped 9px → 4px — so both icons form straight columns flush with the
   menu's right edge on every row, including the Thermo row with its "Slow" checkbox (whose own
   `gap` used to shift them).
5. **The menu sizes itself to its content** (v3.146). `RIGHT_COL_W` (200 design px) is now the
   **minimum** open width of the right-hand column; `fitValidateMenuWidth(menu)` runs after every
   build, measures the menu at `width:max-content` with every wrapping row forced to `nowrap`
   (`offsetWidth` is transform-blind = design px), and asks `setRightColOpenWidth()` for that width,
   clamped to `RIGHT_COL_MAX_W` (360) and to `maxOnScreenColW()` — the on-screen room left of the
   window edge, where the scale is derived as `rect.width / rightColW()` rather than by parsing the
   `#controls` transform. Closing the menu resets the open width to the minimum. Only the
   **collapsed** width is ever reserved, so a wider menu still moves nothing else on the page.

Flags live in `validatorHilite.byName` as per-validator `{ set:Set("col,row,digit"), stale:bool }`,
flattened into **two** lookups: `validatorHilite.keys` = every flag (what is **painted**, via
`validatorHiliteHas`) and `validatorHilite.liveKeys` = the non-stale flags only (what other code may
**reason from**, via `validatorHiliteRuledOut`). Three properties carry the design:

1. **An orange mark is invalid everywhere** — that's the whole claim, so every reader of "invalid"
   honours it: `readValidatorBoardState` drops a flagged digit exactly as it drops a red `.conflict`
   one, `fsScanValid` (Auto-fill) does the same, and the **Clear / Clear All buttons sweep orange
   marks along with red ones** (`_removeInvalidPencilmarksInternal` collects them after the two
   `.conflict` scans, deduped against those; `countVisibleConflicts` counts them so the multi-pass
   loop's "anything left?" test sees them). So highlight-mode validators still cross-feed: turning
   one on, then another, gives the second the first's orange as invalid. The **reasoning** readers
   (`readValidatorBoardState`, `fsScanValid`) use `validatorHiliteRuledOut` (fresh only); the
   **visual/WYSIWYG** ones (painting, the Clear sweep, `countVisibleConflicts`) use
   `validatorHiliteHas` (everything the player can see is orange).
2. **Highlights are a snapshot — and they PERSIST (v3.143).** A flag is *not* revoked when the
   player edits; the `MutationObserver` on the cell layers instead marks every flag **stale**
   (`validatorHiliteMarkStale`), so the orange stays on screen until the player clears it, while
   stopping short of counting as proof: a stale flag would feed a wrong "this digit is impossible"
   into the next run — an unsound elimination, which the contract below forbids. Running the
   validator again makes its flags fresh — by hand, or continuously via the row's ↻ auto-update
   (v3.146). The observer stays connected while anything is fresh **or** any ↻ is on.
   `validatorHiliteCheckPuzzle` still drops flags outright on SPA navigation. Our own repaint only
   sets inline `style` (not observed), so it can't self-stale — which is also what keeps the ↻
   auto-run from re-triggering itself.
3. **Red stays red.** `fixCenterTspan` checks the flag store *after* the `.conflict` and `.given`
   branches, so only ordinary blue marks are recoloured. Rendering reads the store rather than the
   run, so the orange survives every board repaint for free — the pencilmark observer already
   re-runs that colour pass. Colour: `settings.validateHighlightColor` (`#ff9800`, no UI — a
   localStorage-only escape hatch).

An **emptied cell** (every candidate flagged) is reported the same way a remove-mode run reports it,
via `noValidComboHighlightMsg` — a red ⛔ toast, not a false all-clear.

### "Missing candidates" warning (v3.151)

An empty cell (no value/given, no valid centre mark — marks that are ALL red count as none) reads as
the **full digit set** everywhere (`readValidatorBoardState` → `st.fullSet`, "empty cell →
unconstrained, never modified"). That is the only sound direction — an unmarked cell means the
player hasn't pencilled it, not that nothing fits; the strict reading would make every clue touching
a blank cell a contradiction and turn a mid-solve grid entirely orange. But it makes such a clue far
weaker than a player expects: a 2-cell 10-cage with a blank partner loses only the 5 (no-repeat
combos are 19/28/37/46), and a black dot with a blank partner loses only 5/7/9 (no ×2 or ÷2 partner
exists in 1–9 at all).

So the result toast now **leads with an amber warning** naming how many clues were affected, then
the normal "Highlighted/Removed N … across M …" text. `countCluesMissingCandidates(def, unitFilter)`
counts them off the **pre-run** board (a removal, or new orange, can take a cell's last usable mark)
over clue cell-groups from `validatorClueCellGroups` → `validatorClueObjects` — the same detection
the compute reads, so it can't drift. Wired into `runValidatorHighlight`, `runSingleValidator` and
`runAllValidators` (one combined sentence naming each type). Deliberately **no denominator** — the
toast's own "across N cages" can legitimately differ (a structurally impossible clue is dropped from
it), and two disagreeing totals in one sentence read as a bug. Not applied to the `emptied > 0`
contradiction path (already a red error) or to the silent auto-update pass.

## The candidate-elimination contract (every current + future validator)

**CANDIDATE-ELIMINATION CONTRACT (every current + future validator follows this — renban,
region-sum, between, …):** a candidate survives only with **complete support** — at least one full
legal assignment of the WHOLE clue (each cell from its current state: value/given = that digit,
centre-marked = those marks, empty = full set & never modified) satisfying the rule with this digit
in this cell. Never pairwise/local checks when the rule is global: enumerate every complete
assignment (repeats allowed except where a shared row/col/box/uniqueness-cage forbids — per-clue
conflict matrix), union digits per cell, remove only marks outside the union. **Never over-remove,
but DO report contradictions (v3.77):** a *structurally* impossible clue (a cage total no combo can
make, a renban longer than the digit set) → DROP the clue (never wipe — the marks are innocent) **and
REPORT it (v3.157 — see below; it is our misread, not the puzzle's error)**; node-cap hit → bail, no
removals from that clue this pass; ambiguous detection →
skip the clue (under-detect, never mis-apply). BUT a clue that's impossible **because of the current
pencilmarks** (no candidate has complete support — e.g. region-sum segments with no common S) is a
real solver contradiction: the pass removes those unsupported candidates, emptying the cells, and
the run reports a **red "no valid combination" error** (never a green all-clear). Emptying is the
uniform contradiction signal; the post-run Undo button restores the marks. Iterate all clues to a
fixpoint. Only centre marks are removed; nothing is ever added. Variable targets (arrow circle,
region-sum S) are part of the enumeration, not fixed inputs.

### NEVER INVENT A SUDOKU UNIT — regions may not exist yet (v3.162)

Rows and columns are free: every puzzle has them, and two cells sharing one must differ. **Regions
are not.** Until v3.162 every conflict test answered "same region?" the same way — the model's
region map if present, **else assume the regular boxing** (`regularBoxDims`). That fallback is a
fabrication, and on a puzzle whose regions are the *solver's job* it invents constraints the puzzle
does not have.

`s7221r2i0r` "Abstract Art" (Marty Sears) is the reported case — an 8×8 whose rules open *"Divide
the grid into eight non-overlapping 2x4 regions, which can each be placed either horizontally or
vertically."* It declares no region cages and SudokuPad draws no box borders (`#cell-grids` holds
only `path.cell-grid`), so we conjured a fixed 2×4 boxing, placement and all. Consequences, both
measured:

| clue | with the invented boxing | with row/column conflicts alone |
|---|---|---|
| the 8-cell same-difference ring | **no feasible difference → "impossible clue" red error** | fills at `d = 1` |
| each 3-cell same-difference L | `d ∈ {1,2,3}` | `d ∈ {1..7}` |

The ring is the reported bug: the structural test is **mark-independent**, so the error fired on
every click — on a fully pencilled grid, on an empty one, and on a grid with every candidate
deleted. The L's are the quieter half: the extra conflicts narrowed real, legal differences out of
existence, i.e. **over-removal**, the one failure mode the elimination contract forbids.

**`makeRegionOf()` is now the single answer**, and it is allowed to say *there are none*:

1. **model region cages** — the puzzle states them (jigsaws included);
2. **drawn geometry** via `inferRegionsFromSVG()`, accepted only when it partitions the grid into
   exactly N regions of N cells (the sudoku box invariant). Covers boxes SudokuPad drew and boxes
   the author drew by hand, and it beats the regular guess outright: it gets jigsaws right;
3. **native box borders exist but didn't flood-fill cleanly** → keep the old regular boxing. Boxes
   demonstrably exist, so this is the same guess as before and cannot regress an ordinary puzzle;
4. **nothing declared, nothing drawn → `null`.** No pair of cells may be assumed to share a region.

`makeSameRegion()` wraps it as a predicate that is simply `false` when there are no regions, and
every conflict site now goes through one or the other — `makeMustDiffer` (Kropki, whisper, ten line,
same difference, between), little killer, zipper, sum/double arrow. `regularBoxDims` is called in
exactly one place: inside `makeRegionOf`, case 3.

**Region sum is the exception that has to decline.** Its `regionId` doesn't test distinctness, it
**segments the line** — so a fabricated boxing there cuts the line into segments the puzzle never
drew, which is a wrong answer rather than a weak one. No regions → the validator returns
"nothing to check". A puzzle that names region-sum lines but leaves its regions to the solver
genuinely is not checkable yet.

**The digit set has the same shape of trap on this puzzle** and is *not* changed here: the rules say
one of 1-9 is missing and which one is unknown, so the honest set is all nine (over-permissive →
under-remove → sound). `detectDigitSet` flags an 8×8 as an anomaly and *prompts* rather than
silently applying 1-8, which is the right division of labour — the human decides.

### AN IMPOSSIBLE CLUE IS OUR MISREAD, NOT THE PUZZLE'S ERROR (v3.157)

**Working assumption: every clue in every puzzle is VALID.** The catalog's puzzles are peer-reviewed
and have been hand-solved by many people; they do not ship broken constraints. So a clue that **no
arrangement of digits could ever satisfy** — a 10-cell renban or a 10-cell *strict* thermometer over
1-9, a cage total no combination makes, a little killer whose cells can't reach its total — does not
mean the puzzle is wrong. **It means WE claimed the wrong clue type for that drawing**: a cue matched
too broadly, a colour pinned the wrong line, a label was misread. That is a **detection bug**, and
the one thing it must never do is hide behind a green "all clear".

So the policy is **fail loudly, never work around it**: don't wipe the cells (the marks are
innocent), don't soften the rule to make the clue fit, don't silently skip it. **Drop it, count it,
and report it as a red error naming the clue type.** The count rides back on the compute result as
`invalid` (alongside `removals`), `applyOneValidator` carries it on *every* outcome — including the
"none found" path, so a run where **every** clue was impossible still reports it — and both toast
paths put `invalidClueMsg` ahead of any all-clear. Only the mark-contradiction error outranks it,
because that one correctly blames the marks.

**Structural means MARK-INDEPENDENT.** A clue the *current pencilmarks* can't satisfy is a different
thing entirely — a real solver contradiction — and still goes down the `noValidComboMsg` wipe path.

| validator | structural test | note |
|---|---|---|
| **Renban** | no consecutive run of length L exists (L > digit set) | already detected; now reported |
| **Nabner** | no non-consecutive set of length L (6+ over 1-9) | already detected; now reported |
| **Ten line** | `tenLinePartitionable` false (a 1-cell ten line) | already detected; now reported |
| **Cage** | zero `cageCombinations` for (size, total) | already detected; now reported |
| **Thermo** | `thermoLongestChain(tree) > ` digit-set size | **new**; SLOW thermos exempt — non-decreasing fills any length |
| **Little killer** | total outside `n×min … n×max` | **new**; cells may repeat, so this is the loose bound |
| **Arrow / double arrow** | target range `tc×min…tc×max` disjoint from line range | **new**; a 10-cell shaft can't sum under 10, one circle can't exceed 9 |
| **Region sum** | no S in every segment's `n-smallest … n-largest` range | **new**; segments are one region → distinct digits |
| **Same difference** | no difference `d` fills the line over the FULL digit set (`sameDiffLineSupport` with `st.fullSet` in every cell) | v3.159; the test is the validator's own engine run mark-free — e.g. a 3-cell closed loop of mutually-conflicting cells has no `d` at all |
| **Palindrome** | a fold pair (cell `i`, cell `L−1−i`) that `makeMustDiffer` forces to DIFFER | **new** v3.164; the pair must be EQUAL, so a shared row/column/region/uniqueness-cage makes the whole line unfillable. Mark-independent, and conservative because `makeMustDiffer` only asserts units the puzzle guarantees |

**Every one of these tests is provably conservative — a satisfiable clue can never be flagged.** If a
legal fill exists, its sum/length necessarily lies inside the loose bound the test checks (e.g. for
an arrow, target sum `S` satisfies `S ≤ tc×max` and `S ≥ ln×min`, so the ranges must overlap). Row,
column, box and cage conflicts only *narrow* the true ranges, so a merely tight clue is never
flagged. That is why the bounds are deliberately loose rather than exact.

**Deliberately NOT length-checked: between-line interiors.** A between line's interior digits are
only required to lie strictly between the bulbs — they **may repeat** — so there is no length at
which the interior becomes impossible. A "10-cell interior must be invalid" check would be wrong.

### A NODE CAP IS A SILENT NO-OP — audit it against the clue's real size (v3.155/v3.156)

"Node-cap hit → bail, no removals" is *safe* but not *harmless*: the ↻ lights, nothing is removed,
and nothing tells the player. A cap is only acceptable when the clue sizes that trip it are the ones
with nothing to deduce. **Four validators enumerate exhaustively; all four were measured at full 1-9
marks (worst case) and, for the two sum-based ones, over 4000 randomised trials with reduced
pencilmarks and real conflict matrices against a 60M-node reference:**

| validator | search | cap dies at | verdict |
|---|---|---|---|
| **Little killer** (`computeSupported`, ~7774) | fills hitting a fixed target sum | 7-cell diagonal | **safe** — exact-sum pruning is cheap exactly when the sum is *constraining*. Eliminations need target < n+8 or > 9n−8; the bail zone is mid-range targets, which eliminate nothing. Bail∩deduction = **∅** at full marks; **0 bails in 4000** reduced-mark trials. |
| **Arrow / double arrow** (`computeSupported`, ~11248) | signed total = 0 | tc≥3, or tc=2 with ≥8 line cells | **safe** — same reason (signed suffix bound). Bail∩deduction = **∅**; **0 bails in 4000** trials. |
| **Ten line** (`lineSupport`) | every complete fill, digits REPEAT | **11 open cells** | **was broken** → `tenLineTilingSupport` fallback (v3.155). |
| **Region sum** (`enumSegment`) | every distinct-cell ordering | **7-cell segment** | **was broken** → `regionSumSegmentSupport`, subsets + matching (v3.156). |
| **Same difference** (`sameDiffExactFills`, 200k) | every fill at one difference `d`; branches ≤2 per cell (`prev±d`) | not reached on any real line — only runs when the line has internal conflicts or is a loop, stops as soon as every arc-consistent value is witnessed | **safe by CONSTRUCTION** (v3.159) — a bail falls back to the arc-consistent domains, which are a sound over-approximation, so it keeps every elimination the chain relation alone proves. A cap whose bail still removes is a different animal from one that gives up on the clue. |

The pattern: a cap is fine when the **pruning strength tracks the constraint strength** (both
sum-target searches), and fatal when it doesn't (ten lines repeat digits, so fills are exponential
regardless of the target; region-sum segments enumerated orderings when only the *subset* mattered).
`betweenInteriorsFeasible`'s 20k budget is a third, safe shape: it seeks **one** solution, not all
of them, and answers FEASIBLE on overrun (under-remove). `sameDiffExactFills` is a fourth: **its
bail degrades to a weaker but sound answer instead of to nothing** — the arc-consistent domains it
falls back on are already a correct over-approximation of the support, so a cap hit costs only the
extra eliminations the conflict matrix would have added. When designing a new search, prefer that
shape; better still, look for the one that needs no cap at all (a chain CSP is solved exactly by arc
consistency, which is why same-difference searches only when conflicts or a loop break the chain).
Every other validator (kropki, cage, thermo,
whisper, Dutch, XV, between, renban, nabner, parity, zipper, entropic, modular, **palindrome**) is
pairwise, per-cell, bounded-combination (`cageCombinations` ≤ C(9,k)) or matching-based — polynomial,
no cap, nothing to audit. Palindrome is the cheapest of them all: **no search at all**, one set
intersection per fold pair.

## Layer 0 — native constraint payload (f-puzzles)

**Native constraint payload (layer 0, v3.90) — `getRawPuzzleJson` / `getNativeLineClues` /
`nativeLinesFor(type)` / `hasNativePayload`:** for **f-puzzles** puzzles (~30% of the catalog) the
puzzle DECLARES its constraints, but SudokuPad's importer flattens them into cosmetics before `cp`
sees them. The raw payload is still in the page: `PuzzleLoader.cache[<location.pathname slug>]` →
`PuzzleLoader.decompressPuzzleId()` (synchronous, no fetch) → JSON with
`whispers`/`regionsumline`/`entropicline`/`renbanline`/`thermometer` and exact `"R3C6"` chains.
Consulted FIRST by `classifyWhisperLines`, `classifyCueLines(cue, clause, nativeType)`
(renban/regionsum/entropic) and `getThermoDetection` — authoritative, so no cue/colour/AMBIGUOUS.
Everything is try/catch'd and returns null on scl/sxsm/ctc (they carry no types), where the
cue+colour stack still rules. **`cp.thermos` is VETOED when a payload exists** — SudokuPad reuses it
as a generic line store, so `vd0mn9xqjw`'s three green *whispers* appeared there as 10 phantom
"thermos"; see LESSONS_LEARNED for why that killed only the diagonal one.

## Layer 1.5 — LINE-TYPE LABELS: the puzzle states each line's type (v3.132)

Some setters **label every line with the constraint's abbreviation** and define the abbreviations in
the rules. `y697kc2umn` "Dovetail": *"Normal rules for modular lines (MOD), parity lines (PAR),
German whispers (GW), double arrows (DA), ten lines (TEN), region sum lines (RSL), and entropic
lines (ENT) apply"* — with a MOD / DA / RSL … sticker on each of its ten lines. That is an
authoritative declaration, better evidence than any colour heuristic, and it is precisely the case
colour cannot solve (seven line types, several sharing a colour). Before this layer the puzzle
detected ONE of its seven types — the whisper, and only because it happened to be green.

Reader: `lineLabelCells` (the stickers) + `labelDefPhrases`/`lineLabelTypes` (the legend) →
`labelledLinesFor(all, key)`, consulted by `classifyCueLines` (as layer 1.5, after the cue gate and
the self-deduction guard, before the colour layers) and by `classifyWhisperLines` (layer 0.5, ahead
of even the trusted green). Every cue validator passes its own `labelKey`.

- **The sticker** is a ONE-CELL killer cage with a transparent border whose `value` is the text —
  SudokuPad renders a cage's value as text in `#cages`. Read from `cp.cages`, the same array
  `getKillerCages` reads and already skips these from (their value isn't a number).
- **A token means a type only when the rules say so.** `LABEL_DEF_RE` pulls every `"<phrase> (TOK)"`
  out of the blob (the phrase class excludes `,` `.` `;` `(` `)`, so it can never run backwards into
  the previous list item), and the phrase is matched against the **same clause regexes the
  named-colour layer uses** (`LINE_LABEL_TYPES`). A phrase matching two types — or none — is
  dropped: "dutch whispers (DW)" hits both `WHISPERISH_RE` and `DUTCH_CLAUSE_RE`, so it claims
  nothing and the old ladder handles it.
- **A label claims the line CONTAINING its cell** — usually an endpoint, but Dovetail puts RSL, MOD,
  PAR and ENT on a *bend* — and a cell sitting on two lines claims neither. Never guess.

Harmless where it doesn't apply: a legend token that no sticker carries ("German whispers (green)")
finds no one-cell cage and the layer simply doesn't fire.

## A line's TYPE can be conditional, not just unstated (v3.165)

`SELF_DEDUCTION_RE` covers the case where the type is unknown from the start ("each line is exactly
one of A, B, C"). **`LINE_MORPH_RE` covers the other shape:** the rules *do* give each line a type by
colour, then add a clause that **overrides or supplements** it depending on something the solver has
to work out. Both are read through **`lineTypeSelfDetermined(blob)`**, which every classifier entry
point now calls — `classifyCueLines`, `classifyWhisperLines` and `doubleArrowStructureAllowed`.

The reported case is `7kov2n4lrz` **"Zippery When Wet"** (Marty Sears): a full eight-type colour
legend (renban/nabner/whisper/region-sum/parity/entropic/**palindrome**/same-difference), then —
*"Any line that is completely wet (only enters water cells) **loses the property of its presenting
colour**, and instead **becomes a zipper line** … If a line is partly dry and partly wet … it is
**also** a zipper line."* Which lines are wet is a yin-yang deduction, so "grey = palindrome" is a
**hypothesis** there, not a fact.

**How it surfaced, and why the diagnosis matters.** One of its two grey lines is r9c8-r9c9-r8c9,
whose fold pair (r9c8, r8c9) sits inside box 9 — impossible *as a palindrome*. The v3.157 structural
test is mark-independent, so it fired a red "impossible clue" error on a completely untouched grid.
The reasoning was right — an impossible clue means we claimed the wrong type — but the conclusion was
handed to the player as though the puzzle were broken. It isn't: **that line being unfillable as a
palindrome is exactly the deduction proving it is wet.** The fix belongs at detection, which is where
v3.157 always said it belonged.

Applies to **every** cue validator, not just palindrome — a wet pink line is not a renban either — so
the whole puzzle goes AMBIGUOUS and each line is validated only when the player selects it.

**Catalog-measured (2026-07-29): fires on exactly 3 of the 4,825 puzzles with rules text**, and all
three genuinely need the manual override — `7kov2n4lrz` above; `7wf14f41d2` ("any line that passes
through both red and blue cells is **also a renban**"); `FMGPBBt24p` ("**one line is also a
thermometer**", which line unstated). Zero collateral on the other 4,822, and no cue's recall moved.

## The Sudoku-X cross is not a clue line (v3.132)

SudokuPad draws the X diagonals as ordinary stroked `#arrows` paths with **no id, class or other
attribute of their own**, so every attribute test in `isLineCluePath` reads them as cosmetic clue
lines. On `blobz/lynx` that put a SECOND colour in the legend, which knocked the double arrows off
the single-colour layer and left them unpinnable — and the same false line was being handed to every
other cue validator. `isGridDiagonalPath` (in `scanLineLayer`, so it only affects the validator-side
`getCosmeticLines`, not object shading) rejects them on geometry: a clue line runs cell CENTRE to
cell centre, the X is a 2-point path from one CORNER of the whole grid to the opposite one.

## Thermo validator

**Thermo validator (v3.67; DOM fallback for cosmetic-drawn thermos v3.67.1):**
`computeThermoRemovals` (independent of the other three; always-on — the per-validator enable
settings were removed v3.104). Digits strictly increase from the round bulb to the tip; a **slow**
thermo relaxes this to non-decreasing EXCEPT where ordinary Sudoku rules would forbid the repeat
(same row/column/region/cage) — there it must still strictly increase. **Two detection sources,
model preferred, DOM fallback** (`getThermos` = `getThermoChainsFromModel()` else
`getThermoChainsFromDOM()`, then `buildThermoTrees(chains)` merges either source's chains the same
way): **Model** (`Framework.app.puzzle.currentPuzzle.thermos`) — SudokuPad's native constraint key;
a FLAT list of one entry per rendered polyline ARM, entries sharing the same `line` object
(identity, not stringified) are the same arm. **DOM fallback (v3.67.1 — a real puzzle needed it):**
imported/authored puzzles can encode a thermo as generic cosmetics instead — `cp.thermos` is then
EMPTY even though the puzzle visibly has one (found via `sudokupad.app/blobz/a-long-expected-party`,
whose thermo is `thermocosmetic` cell entries + a plain cosmetic line; decoding that undocumented
per-cell "a-b" encoding was skipped in favour of reading what's actually rendered).
`getThermoChainsFromDOM` finds a near-circular, near-full-cell `#underlay rect` (the bulb —
width/height `0.55–1.05×cellSize`, `rx≈width/2`, not black/white so Kropki dots are excluded)
sitting at an endpoint of a plain `#arrows path` (`fill:none`, **no `marker-end`** — that attribute
is how Arrow shafts carry their arrowhead marker, so it cleanly excludes Arrow lines even when
they'd otherwise render a same-shaped bulb+shaft). **Matching is by GEOMETRY + COLOUR FAMILY, never
by exact colour (v3.68, refined v3.145).** The bulb is routinely a darker shade than the shaft (e.g.
a `#999` bulb on a `#ccc` line — `9zsl8s2gjl` "Slinky", `syvmhn0tqy` "Foggy Thermo"), so the
original v3.67.1 `bulb-fill === shaft-stroke` test silently detected **zero** thermos on those (the
reported bug) and v3.68 dropped colour entirely. Pure geometry is too weak in the other direction:
**a cell-sized circle at a line end is not proof of a bulb** — every odd/even puzzle paints
cell-sized circles, and one landing on a whisper's endpoint made `gz8mfm0r3a` (m1n3, "Visible
Inclusions") read its ORANGE Dutch whisper as a thermo off a BLUE parity circle, on a grid whose
real thermos are grey circles on grey shafts. **`thermoBulbShaftCompatible(bulbFill, shaftColor)`**
(pure, harness-tested) restores the colour test at the right granularity: setters draw a thermo as
ONE object, so bulb and shaft share a HUE (±30°) — or are both achromatic (sat ≤ 0.18, or near-black
/ near-white), which is exactly what a `#999`/`#ccc` pair is. Grey-with-chromatic is not one object.
An unparseable colour returns true, i.e. falls back to the v3.68 geometry-only behaviour.
Applied at **both** bulb gates — `getThermoChainsFromDOM` (shaft stroke) and the model gate in
`getThermoChainsFromModel` (the dumped line's own `line.color`, via
`getThermoBulbCellFills`). **Catalog-verified** (81 scl/sxsm thermo puzzles resolvable to raw
payloads, out of the 614 `thermo`-tagged; fpuz declares thermos natively and never reaches this
path): 401 bulb↔endpoint pairs kept, 12 rejected across 7 puzzles, and every rejection is a genuine
false positive — odd-circles on green whispers (`19gptz1pi2` "Green-Tree", 9 `#0003` odd circles;
`9os1agpdp7` "German Beetles"), whisper ends on grey thermo bulbs (`mss23tnw9u` "Tetrafolium", ×4),
an arrow line ending on a thermo bulb cell (`5ct3dss6pm`). No puzzle lost all its bulbs, and
`x07h2149k1` (a blue AND a red circle stacked on the same bulb cell) is unaffected because the
matching bulb still answers the `some()`. **A colour mismatch means "not detectable as a thermo",
never "detected as something else"** — the line falls through to whatever validator its own rules
cue, which is how the whisper on `gz8mfm0r3a` gets validated instead. A shaft must
touch a bulb at **exactly one** end (`startsAtBulb !== endsAtBulb`) — a real thermo has a single
bulb, and requiring the XOR keeps it narrow: a cosmetic line circled at BOTH ends (a between-line,
some palindromes) is not mistaken for a thermometer. Between-lines are further excluded because
their endpoint circles are hollow (white/none fill). Verified false-positive-free on
renban/arrow/between control puzzles (0 detected) while Slinky→9 and Foggy Thermo→13. **Cosmetic
paths compress a straight/diagonal run of cells into ONE `L` segment** (collinear points stripped,
unlike the model's `line.wayPoints` which lists every cell) — each segment is re-expanded into one
point per grid cell (`steps = round(max(|dx|,|dy|)/cs)`, interpolated) before the pixel→cell
conversion, or interior cells go missing. Verified on `blobz/a-long-expected-party`: one bulb
genuinely branches into **7 tips** — real-world confirmation of the branching design; the DOM
reader's reconstructed cell count (27) matches the puzzle's `thermocosmetic` entry count exactly.
Requiring an explicit bulb (filled circular underlay) at exactly one path endpoint is deliberately
narrow: a puzzle whose cosmetic thermo renders differently simply isn't detected (safe
under-detection, never mis-detected as another line type) — same policy as the little-killer
detector. A **branching** thermometer (one bulb, several tips), from either source, is SEVERAL
chains sharing a common cell prefix from the same bulb — `buildThermoTrees` trie-inserts every chain
starting at the same bulb cell into one tree so the shared stem collapses to one edge set, returning
`[{keys, edges:[[parent,child]…], root, leaves}]` per bulb. `computeThermoRemovals` iterates forward
(parent's min bounds the child: remove child digits `≤ min` non-slow-edge / `< min`
slow-repeat-edge) and backward (child's max bounds the parent: remove parent digits `≥ max` / `>
max`) to a fixpoint — edge order doesn't need to be topological, the fixpoint converges regardless
(same pattern as cage/LK). **Slow-repeat eligibility per edge** (`thermoRepeatAllowed`): not same
column, not same row, not in a shared region/cage (`getThermoRegionCageSets` reads `cp.cages`
type:`region` (box/jigsaw, enumerated in full) + other uniqueness cages — row/col pseudo-cages are
EXCLUDED and checked directly by coordinate instead, because the model encodes them as a dash
**range** `"r1c1-r1c9"` that a plain `r#c#` regex scan would misread as just its two endpoints).
**Auto-detect "Slow" (`autoDetectThermoSlow`, best-effort):** (1) geometry — an arm longer than the
digit-set size can't be strictly increasing, so it MUST be slow; (2) else the puzzle's title+rules
text against `SLOW_THERMO_PHRASES` — plain `"slow thermo"` alone misses ~16% of real slow-thermo
puzzles (verified against the puzzle catalog's 32 `slow_thermo`-tagged entries via the catalog's
`review_catalog.jsonl` rules text (see "Puzzle catalog" in
[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for its location): 5 use "increase or
stay the same" / "must not decrease" without ever saying "slow thermo"), so several phrasings are
matched; 0 misses against all 32 with the expanded list. `cp.rules` is a **plain string on some
puzzles, an array on others** — handle both (an earlier version's `Array.isArray` check silently
produced `''` for the string form, missing e.g. blobz's "SLOW thermometer" rules text entirely).
**UI:** the menu's Thermo row (`addThermoItem`) is the one item with an inline **"Slow"** checkbox
beside it (hover tooltip explains it), auto-checked via
`effectiveThermoSlow()`/`ensureThermoSlowState` — an **in-memory-only, per-puzzle** override (never
saved; keyed by `location.pathname+search` like `scheduleAutoShade`'s auto-enable) so the auto-guess
is recomputed fresh on every puzzle and a manual override never leaks to the next one. Clicking the
checkbox toggles Slow only (`stopPropagation`); clicking the rest of the row runs the validator like
a normal item. **Cue-gated cosmetic layer + bulbless thermos (v3.82, corrected v3.83):** a third
detection source for thermos with NO bulb circle at all — rules-text pinned ("PURPLE LINES are
thermos", `2hk0wen7pj` "Hijinks") exactly like the other line validators (`cueThermoLines`:
`/thermo/` cue → single-colour → named-colour via `linesForClauseColor`), then ORIENTED by
`markerCellsByColor` (a filled `#overlay`/`#underlay` shape ≈cell-sized at EXACTLY one line endpoint
= the start/position-1 marker; Hijinks' hexagons are clusters of rects). **Two DOM/model facts this
puzzle forced (v3.83), both departures from every earlier line puzzle:** (1) `cp.lines` DOESN'T
EXIST — Hijinks' coloured lines render only as stroked `fill:none` `<path>`s inside **`#overlay`**
(not `#arrows`, not the model), so `getCosmeticLines` now scans BOTH `#arrows` and `#overlay` (via
`scanLineLayer`, deduped by colour+cells) — this broadens EVERY cosmetic-line validator to
`#overlay`-rendered lines. (2) the markers can't be read from the model: SudokuPad stored
`cp.cosmetic` (a flat `cellcosmetic` list) TRANSPOSED (row/col-swapped) vs what it renders, so
`markerCellsByColor` reads the DOM (shares the lines' coordinate space) and keys markers by fill
COLOUR — the position-1 hexagon is drawn in its line's colour, so a line matches its OWN marker and
ignores white hexagon backgrounds / other lines' markers. Verified in-browser: all 3 purple thermos
+ the turquoise/brown lines orient to exactly one endpoint. `getThermoDetection()` returns `{trees,
bulbless}` (`getThermos()` = just the trees): cue-pinned lines already covered by model/DOM chains
are deduped out (so `kszsitwn8p`'s modular-on-thermo teal lines never double-detect), and a pinned
line with NO marker (or one at both ends) is **bulbless** — the bulb could be anywhere, NOTHING is
checkable, it is never validated; instead `computeThermoRemovals` attaches a `note` ("N thermo lines
have no bulb marker … not checked") that `applyOneValidator` carries on every outcome and both
runners append to their toast (`runSingleValidator`'s none-found toast turns 'warning' when a note
explains why; `runAllValidators` dedupes notes across passes). Mixed puzzles validate the orientable
thermos and still show the note. `detect()` counts bulbless too, so a bulbless-only puzzle still
lists the menu item — clicking it explains why nothing was checked. **Liar/wrogn policy (standing
decision 2026-07-06):** validators NEVER special-case liar/wrogn mechanics — all clues are treated
as TRUE for validation; whether/when to trust a validator on such a puzzle is 100% the solver's call
(a failed validation is itself the signal the clue may be a lie). **Colour-word machinery (v3.82):**
palette gained `cyan` (hue 180, +12 handicap so teal-leaning blues like `#2ecbff` (195°) stay BLUE —
setters write "blue"; turquoise/teal/aqua canonicalise to cyan); colour words match WORD-BOUNDED
(`colorWordRe` — "coloured" must not read as "red"); brown's lightness penalty softened 400→200
(light tan `#dfc39c` = "light brown" in rules); and `linesForClauseColor` gained a **LEGEND RETRY**
— when the absolute pass matches no line AND the blob names ≥2 distinct colours (`blobColorWords`),
re-classify against only the legend's words (rivals keep it honest → tan lands on brown for Hijinks'
hitline clue; the ≥2 guard preserves the v3.80 single-colour sweep-in protection). Node sanity
harness for the classifier lives in the session scratchpad pattern (extracts the real functions from
the userscript via `eval` — 15 cases incl. Hijinks/Equipoise/3xdi7kf6ab colours).

## Sum-arrow + double-arrow validator

**Sum-arrow validator (v3.73; multi-head branching v3.74; double arrows v3.131):**
`computeArrowRemovals` (independent;
always-on — the per-validator enable settings were removed v3.104). Shaft digits (tip = just the
last shaft cell) sum to the circle digit; repeats allowed along the shaft except where ordinary
Sudoku forbids (same row/col/box/uniqueness-cage — unlike the little killer, arrow cells CAN share
rows/cols, so those checks join the conflict matrix; circle-vs-shaft pairs included). Same LK
backtracking enumeration (`computeSupported`, suffix-bound + conflict pruning, 300k node cap → bail
safely) extended so the TARGET is variable — and, since v3.131, so that the target side can be MORE
THAN ONE CELL: each unit is `{keys, tc}` where the first `tc` keys are the target side and the rest
the line side, and the equation is carried as ONE SIGNED TOTAL (targets +d, line cells −d, legal
fill ⇔ total 0). One DFS therefore serves both clue types; union supported digits per cell (targets
included, so an unsupportable circle digit is removed too). Iterated to a fixpoint. **Two detection sources
(`getSumArrows`), model preferred:** `getArrowsFromModel` reads `cp.arrowSums` — one entry per
rendered ARM ({bulb:{center,width…}, arrow:{wayPoints}}); a multi-arm arrow = several independent
units sharing the circle cell (each arm sums separately, the correct rule). **NB `arrowSums`
coordinates are `[row+0.5, col+0.5]` (RC order) — the OPPOSITE of `cp.thermos`' `line.wayPoints`**
(verified against the rendered shaft on `3x3zm2co6o`); the reader swaps to CR and reuses
`expandLineChain` for compressed straight runs. Two-cell pill bulbs (`width>1.2` = a two-digit
total) are skipped — safe under-detection. `getArrowsFromDOM` (cosmetic-only puzzles, `cp.arrowSums`
empty — i.e. an all-cosmetic puzzle): shaft = a **`marker-end`** `#arrows` path (the exact
attribute the thermo DOM detector excludes, so the two stay disjoint) whose start is IN-grid
(rejects little-killer shafts, which start outside) at the EDGE (~1 radius) of a near-full-cell
circular rect in `#overlay` **or** `#underlay` (any fill — cosmetic bulbs are hollow white / tinted;
cell-CENTRED test rejects corner-centred quadruple circles). Both readers verified to return the
identical unit on their respective test puzzles (circle r1c7, shaft 2 cells). **Multi-head branching
(v3.74):** both readers now return RAW ARMS (`{bulb, cells}`) and `getSumArrows` routes them through
**`resolveArrowArms`** (the branching-thermo analogue). A multi-headed arrow renders its extra heads
as `marker-end` paths starting at a CELL CENTRE mid-stem of another arm (not at the bulb edge —
verified on `08yynh57ts` "Super Nova": 14 arms, 8 of them branches, one circle); each branch's true
path = the parent chain's prefix up to the branch cell + the branch's own cells, resolved
iteratively (nested branches attach on later passes), so every head is one full circle→head unit —
the standard rule (each complete path sums to the circle; shared stem cells recur across the arrow's
units, automatically consistent). A branch cell matching MORE THAN ONE distinct parent prefix
(crossing arrows) is dropped, never guessed (a wrong stem could over-remove); model branches only
attach to arms of the same bulb; a bulb-less arm that never attaches (decorative arrow) is dropped —
under-detection, safe.

**Double arrows (v3.131) — same row, same engine, different DETECTION.** A double arrow is a line
with a circle at EACH end whose in-between digits sum to the sum of the two circles (`5,6,7` between
them ⇒ the circles hold 9 and 9); repeats follow the same "unless Sudoku forbids it" rule. It is
`tc = 2` in the engine above, so it needed no validator of its own — it shares the `sum arrow`
registry row (menu label **"Sum & double arrows"**) and the eyeball (drawn with the `between` shape:
polyline ringed at both ends). Detection is NOT the arrow readers: the picture is a between line's
(plain cosmetic line + two cell-centred circles, no `marker-end` shaft), so `getDoubleArrows` runs
`classifyDoubleArrowLines` → `betweenSegments` (the same circle-to-circle walk) and keeps only
segments with a circle at BOTH ends and ≥1 cell between them.

Cue-gated like renban/between (no native f-puzzles key; colour can never discriminate it from a
between line). Catalog-measured 2026-07-23 over the 27 `double_arrow` puzzles + a false-positive
sweep of all 6,260: **26 fire, 0 false positives** (the 6 "FP"s `cue_recall.py` reports are all
genuine double arrows the catalog left untagged; the 1 miss is `ur11o44tv3`, a "bulbous arrows"
variant). Three phrasing families, all real: **named** ("double arrow"), **line-first** ("digits
along lines must have the same sum as the digits in the bulbs at each end", `v1litbf6k9`),
**circle-first** ("the sum of the digits in two orange circles is equal to the sum of the digits
along the line joining them", `cjjw4ss931`). Two narrownesses carry the precision:
- the circle noun must be **PLURAL** (`circles`/`bulbs`) — that one letter is what keeps a plain
  arrow's "…must equal the number in **the circle**" (`h3i7jv9pqj`) out of the descriptive branches;
- `DOUBLEARROW_ANTI_RE` (`concatenat`, `product`) drops the near-misses that also join two circles
  with a summing line but are a DIFFERENT clue — "equal to a concatenation of the digits in the
  circles" (5 puzzles, `mqx8o45al4`) and "equal to the product of both digits" (`Hp97h2FtB4`). The
  ANTI is skipped when the rules literally say "double arrow", because `0m0zb2b86m` is titled
  "Double Arrows, **Product** Squares" — there `product` names another clue in the same puzzle.

`DOUBLEARROW_CLAUSE_RE` (named-colour layer) deliberately does NOT trigger on a bare "circles":
`clauseColorWord` takes the FIRST matching clause, and on `zetamath/angel` the BETWEEN clause comes
first ("cells along **gray** lines between two filled circles…") — a bare trigger would hand the
double arrows the between lines' grey. It needs the name, or a sum/total beside the circles.

**STRUCTURE BEATS COLOUR when the ladder can't pin them (v3.132).** A renban or a whisper is a bare
stroke whose only distinguishing feature is colour; a double arrow is a line **circled at both
ends**, which almost nothing else is. So when the cue fires but the colour ladder returns
`ambiguous`, `getDoubleArrows` falls back to the SHAPE — every circle-to-circle segment is a double
arrow — gated by `doubleArrowStructureAllowed()`: no between cue, no lockout phrasing, no
self-deduction (those are the clue types that draw the same picture). This is what reads
`4ideo8pjl2`, whose rules state *"each double arrow has its own color"* — six lines, six colours,
exactly the case the single-colour and named-colour layers exist to refuse.

**Bulb shapes we deliberately DON'T read** (each checked against a real puzzle, each a one-off;
`getCellCenteredCircles` requires a near-cell-sized, near-circular rounded rect on a cell centre and
loosening it would let non-circles act as bulbs for the arrow, thermo and between readers alike):
hexagons (`ws3dy3a8gi`), squares (`8elcqgk9jm` and its 45°-rotated twin `sn2nojv4os` — a baseball
diamond), and pills drawn as very wide strokes (`ur11o44tv3` "bulbous arrows"). Under-detection, by
choice — don't re-investigate these.

**BETWEEN-LINE COLLISION (the reason this touched `classifyBetweenLines`).** A double arrow draws
the same picture as a between line AND its rules text trips the between cue head-on ("the sum of the
digits on a line BETWEEN two CIRCLES…", `0m0zb2b86m`, `quadsparade/doubleexclusion`), so on a
DA-only puzzle the single-colour layer would have handed every DA line to the between validator —
the wrong rule, applied confidently. So when the DA cue also fires, between subtracts the lines DA
confidently claims (→ `none` if that leaves nothing), and refuses (→ `ambiguous`) if DA itself
can't be pinned. Only 2 of the 99 `between_line` puzzles trip the DA cue and BOTH genuinely have
both clue types, so the guard costs nothing: `zetamath/angel` (grey between + red double arrows)
keeps its grey lines through it.

## Renban + region-sum-line validators

**Renban + Region-sum-line validators (v3.75 — both cue-gated cosmetic lines):**
`computeRenbanRemovals` / `computeRegionSumRemovals` (always-on — the per-validator enable settings
were removed v3.104). Both are cosmetic lines with NO native model key, sharing the
`#arrows`/`cp.lines` render with whispers/palindromes/betweens/nabners — and **colour alone can't
discriminate** (renban's usual purple is ALSO nabner's; region-sum's usual blue is ALSO between's).
So unlike whisper (whose green shade is self-sufficient) both **require a RULES CUE**, then pin
lines with whisper's layers 2–4 via the shared **`classifyCueLines(cueRe, clauseRe)`**: cue
absent→none; cue+single line colour→that colour; cue+rules-named colour→those lines (via
`linesForClauseColor`, below); else→**ambiguous** (menu ⚠ note + player selects the line).
**Named-colour matching (rebuilt v3.80 — nearest-reference HSL classification, replaced per-word RGB
thresholds):** `linesForClauseColor(all, blob, clauseRe)` = `clauseColorWord` reads the colour word
from the first clause matching `clauseRe`, then keeps lines whose `lineColorWord` (each line
classified ABSOLUTELY to its single nearest palette word via `nearestColorWord`/`colorWordScore`
over `COLOR_WORD_ALL`) equals it. `colorWordScore` works in HSL: hue picks the chromatic family
(`COLOR_WORD_HUE`), with sat/lightness terms for grey/black/white/brown/peach; `cyan` carries a +12
hue handicap so teal-leaning blues (`#2ecbff`) still resolve to blue. **The `COLOR_WORD_ALL`
vocabulary is load-bearing (v3.87):** a word missing from it makes `clauseColorWord` find no colour
→ ambiguous *before any line is examined*. Added `peach` as its OWN canonical word (it co-occurs
with orange/yellow in real legends, so it can't alias either; it's distinguished from orange by
LIGHTNESS via a `peach` score case + a "light warm colour is peach" penalty mirroring the existing
dark→brown one) plus the free aliases `lavender`/`indigo`→purple, `gold`/`golden`→yellow,
`silver`→grey. Catalog-verified old-vs-new across all 5 cue validators: 19 fixed, 0 broken. See
LESSONS_LEARNED "A colour word missing from the palette is a SILENT ambiguous" for the
alias-vs-own-word test and why lavender must NOT be keyed on lightness (setters draw it as vivid
purple at low alpha). This fixed the `3xdi7kf6ab` legend where the old thresholds mis-pinned
parity→brown and rejected the lavender zipper line (see LESSONS_LEARNED "Named-colour matching").
**`CLAUSE_RE`s stay concept-specific** so `clauseColorWord` reads the right clause — but
**concept-specific ≠ name-only**: a clause regex must cover every phrasing its CUE covers *minus*
the rival-colliding terms, or the cue fires on a legend the clause can't read and the validator is
**guaranteed ambiguous** (v3.89 — `RENBAN_CLAUSE_RE` had been `/renban/` since v3.79 and broke 86 of
197 multi-colour renban puzzles; now `/renban|set of consecutive|consecutive…any
order|consecutive…no repeat/`, which keeps the description and still dodges Nabner's *"no two digits
can be consecutive"*). `PARITY_CLAUSE_RE=/parit|alternat/`. Measured by `tools/cue_recall.py`'s
clause-blindness table — keep UNREADABLE at 0. Cues: `RENBAN_CUE_RE` ("renban" / "consecutive…any
order", 94.4% catalog recall), `REGIONSUM_CUE_RE` — **rewritten v3.88, 75.8%→94.5%** recall (326
tagged puzzles, scored by `tools/cue_recall.py`): the old cue lost 61 real puzzles to four
vocabulary narrownesses — `each` but not **`every`** (`2ifg92eka9`), `sum` but not
**`total`/`number`/`value`**, `box` but not **`region`/`zone`/`segment`**, and
`each\s+(?:box|region)` couldn't span the size in **"each 3x3 box"** (`bl168ah6g9`) — plus "equal
sums lines" and non-box "zone/region borders divide" (`a6zbf6jui2`).
**`resolveCueValidatorLines(cls, unitFilter)`** shared by both: confident→pinned lines filtered by
the whole-clue selection+fog `unitFilter`; ambiguous→require a selection, validate every touched
line but MASK removals to selected cells (whisper's manual-override policy). **Renban compute** =
the cage validator with combos = every consecutive run of the line's length (`runsFor`, distinct
digits) instead of sum combos; reuses `hasPerfectMatching` for the complete-support test.
**Region-sum compute** = split each line into maximal same-region **segments** (region id via
`getModelRegionMap`, else `regularBoxDims` box; note the model map is keyed `"row,col"`, the
OPPOSITE of the validators' `"col,row"` — converted in `regionId`), keep lines with ≥2 segments; the
target sum **S is variable**; segments are independent given S, so `enumSegment` enumerates each
segment recording achievable sums + per-(cell,digit) sums; overall-feasible S = ∩ of every segment's
sums; a candidate survives iff some overall-feasible S places it.

**A SEGMENT IS ONE REGION, SO ITS CELLS ARE DISTINCT — enumerate SUBSETS, not orderings (v3.156).**
Until then `enumSegment` walked every distinct-cell **ordering** under a 200k node cap. Measured at
full 1-9 marks it finishes at 6 cells (79k nodes) and blows the cap at **7** (a 9-cell segment is
986k orderings). And a bail is not local — `segRes.some(bailed) → return` gives up on the **whole
line**, so one long segment silently killed every deduction the *short* segments would have made. On
a `[4,7]` line the 4-cell segment is pinned to S ∈ {28,29,30} and its cells lose 1,2,3; all of that
was lost. Now the pure top-level **`regionSumSegmentSupport(sets, digitList)`** (harness-tested):
there are only C(9,n) ≤ 126 digit **subsets**, so take each, test a **perfect matching** onto the
cells (`hasPerfectMatching`, the machinery renban uses), and the sum is just the subset total. Exact,
polynomial, and it **cannot bail** — verified identical to the old ordering walk on 3000 random
segments; the 9-cell segment resolves in under a millisecond. **Cross-segment same-row/col conflicts are deliberately NOT enforced** (would couple
segments) — under-constrains only, never over-removes (same safe caveat as the LK jigsaw boxes).
Both iterate to a fixpoint and honour fog per-cell. **Contradiction handling (v3.77):** renban drops
a *structurally* impossible line (0 runs — line longer than the digit set); region-sum, when a
line's segments share **NO common sum S** given the current marks (`overall.size === 0`), no longer
silently drops the line — no candidate is supported, so the pass WIPES its marked cells (emptying
them), which the run toast surfaces as the red "no valid combination" ERROR. (The old silent-drop
gave a false all-clear on an invalid line — the v3.77 fix; see the Validate Constraints toast note
above.) Registered in `constraintValidators()`; `detect: renbanDetected`/`regionSumDetected`.
**Closed loops (v3.144).** `expandLineChain` only collapses CONSECUTIVE duplicate cells, so a line
drawn as a loop arrives with its start cell REPEATED at the end — the dedupe is each validator's
job (parity and entropic already did it; renban and region-sum did not). For region-sum the repeat
is worse than a stray cell: segmentation is CYCLIC on a loop, and walking the chain linearly cuts
the wrap-around run at whatever point the setter began drawing. On `gz8mfm0r3a` (m1n3, "Visible
Inclusions" — a 16-cell diagonal blue loop) that left the repeated r2c4 as a **1-cell segment**,
read as "this cell alone = S", capping S at 9 against a real range of 6–24 and stripping correct
candidates from every 3-cell segment. Segmentation now lives in the pure top-level
**`regionSumSegments(keys, regionOf)`** (harness-tested): drop the duplicate endpoint, then join the
final run onto the first when they share a region (a loop drawn starting mid-segment). A loop inside
one region collapses to a single segment → no constraint, line dropped, as before. Renban got the
plain endpoint drop in the same change — kept, it inflated the run length by one and asked the same
cell for two different digits (over-removal). **Zipper still does NOT dedupe a loop endpoint**: it
would pair `keys[0]` with itself (forcing S = 2d), but the correct fold for a closed zipper is
undefined, so it needs a decision rather than a copy of this fix.

## Nabner-line validator

**Nabner (antirenban) validator (v3.152 — cue-gated cosmetic line, same
`classifyCueLines`/`resolveCueValidatorLines` machinery as renban):** `computeNabnerRemovals`. A
nabner line's digits are all **DISTINCT** and **no two of them are consecutive**, over EVERY pair on
the line, not just neighbours — every catalogued phrasing spells that out ("regardless of their
position on the line"). Compute = **the renban validator with one substitution**: combos =
`nabnerSetsFor(L)`, every size-L subset of the digit set with no two members differing by 1
(generated in increasing order, so "non-consecutive" is exactly "each pick ≥ prev + 2" — the digit
set need not be contiguous), instead of renban's consecutive runs; digits are distinct either way, so
the same `hasPerfectMatching` complete-support test applies. Iterated to a fixpoint; a line too long
to be filled (6 cells over 1-9, where the maximum is `{1,3,5,7,9}`) yields zero sets and is **dropped
as structurally impossible**, never wiped. Closed loops drop the duplicated endpoint (the v3.144
renban lesson) — the rule is over all pairs, so a nabner loop has no direction and no wrap edge.
No f-puzzles key exists, so there is no layer 0.

**The cue is the most collision-prone in the file**, because nabner and renban rules use the *same
words in opposite polarity* — and a wrong claim is the dangerous direction (cue + a single line
colour makes layer 2 CLAIM the line, validating a renban line under the opposite rule). Three
narrownesses, each catalog-measured while building it:

- the described branches bind to a **drawn-object noun** (the parity lesson) AND to nabner's
  **negative** wording — "no two digits … consecutive", "non-consecutive non-repeating", "must not
  contain any repeated **or** consecutive digits". Renban's "digits … do not repeat **and** form a
  consecutive set" is the same vocabulary in the other polarity, so `or|nor` is **word-bounded**: an
  unbounded `or` matches inside "f-**or**-m" and swept in 7 renban puzzles mid-build.
- **"adjacent" is excluded** from the "no two digits … line … consecutive" window — an adjacency rule
  along a loop/path ("any two cells that are adjacent along the loop must contain non-consecutive
  digits", `l00604nlbr`) is a different constraint.
- **`NABNER_ANTI_RE` (`anti-kropki`)** drops `1j53hl97cx`/`dc0dbdewab` ("no two digits anywhere on the
  same red line are consecutive, or in a 1:2 ratio"): the non-consecutive half reads as nabner, but
  that rule does **not** forbid a repeat (3 and 3 are neither consecutive nor in a 1:2 ratio), so
  nabner's distinctness would over-remove.

`NABNER_CLAUSE_RE` (named-colour layer) is nabner's own vocabulary only — every trigger carries the
negation, bare "consecutive" is out — because the two clues sit side by side in one legend
(`3xdi7kf6ab`: "yellow line: nabner line (no two digits can be consecutive or identical)" / "pink
line: renban line (a set of consecutive digits in any order)") and `clauseColorWord` takes the FIRST
matching clause. Registered in `LINE_LABEL_TYPES` under `nabner`, so it inherits the line-type-label
layer. **Catalog-measured:** 39/39 `nabner`-tagged puzzles fire (100% recall), clause-blindness
UNREADABLE 0 of 18 multi-colour puzzles, and all remaining hits outside the tag are genuine nabner
puzzles the catalog left untagged (`2q3ha7ca76` "Antirenban", `rlkbec6hy3`, `k4g3ubb8qe`,
`pnyv6sn7qm`, …). Test puzzles: `3xdi7kf6ab` (yellow nabner + pink renban), `ghtic0mwad` "Nabner
Lines" (single-colour, described only), `lvumk1logw` "Li'l Nabner", `philip-newman/20250727-circle-gets-the-square`
(antirenban).

## Ten-line validator

**Ten lines (v3.153 — cue-gated cosmetic line, same `classifyCueLines` /
`resolveCueValidatorLines` machinery as renban/nabner):** `computeTenLineRemovals`. A ten line splits
into one or more **contiguous, non-overlapping groups** of cells, each summing to exactly **10**,
with every cell in a group. Digits may **repeat** — along the line and inside one group — except
where ordinary Sudoku forbids it, so this is the **little-killer / arrow shape**, not renban's: a
backtracking enumeration over the whole line under a per-clue `makeMustDiffer` conflict matrix,
unioning the digits each cell can take. A candidate survives only if some complete legal fill (a
valid partition *plus* a digit for every cell) places it there. Iterated to a fixpoint;
contradiction → emptied cells → the red toast, as usual.

**THAT EXACT ENUMERATION ONLY REACHES ~11 OPEN CELLS, AND EVERY REAL TEN LINE IS LONGER (v3.155).**
Because ten-line digits *repeat*, the number of complete fills is exponential, not combinatorial like
renban's: measured against the 300k node cap on real geometry with full 1-9 marks, the search
finishes at 11 cells (132k nodes) and blows the cap at 12. `JHPNrLgRQH` "Baby Dragon" — the very loop
this validator was built for — is a **43-cell ring**, so it never finished even the *first* rotation,
bailed, and the validator was a **silent no-op**: ↻ lit, zero removals, no warning. Raising the cap
cannot fix an exponential space.

The fix is `tenLineTilingSupport(n, sets, diff, loop, hasZero)`, a **polynomial fallback** used when
the exact search bails (and remembered on the line via `ld.exactHopeless`, so the cap is burnt at
most once per run). It exploits the shape of the constraint: a group is a **contiguous run summing
to 10**, so over 1-9 it is at most **10 cells long** and its legal fills can be enumerated outright.
So enumerate every feasible **arc** once — *exactly*, including the full `mustDiffer` matrix **inside**
the arc — then ask "can this arc appear in a complete tiling?" with a forward/backward reachability
DP over group boundaries; a loop runs the DP once per boundary frame and unions, exactly as the
rotation loop does. Only conflicts **between different groups** are dropped, which makes it a
**relaxation** of the true support: it can under-remove, never over-remove, so the
candidate-elimination contract holds. Verified against a brute-force complete-fill enumerator on 396
random paths and loops — **0 unsound, 78% identical to exact, 22% a strict superset**. The 43-cell
Baby Dragon ring resolves in **4 ms**.

**A common player misreading, worth knowing when a result looks too weak:** on a ten line a cell
between a **3** and an **8** is *not* forced to 2. That answer assumes every group is a pair. With
room either side the cell is `{1,2,3,4,5,6}` — `{…,3,7}{8,…}` and `{…,3}{1,8,1}` are legal too. Only
if the line is *exactly* those three cells does something dramatic happen, and then it is wiped, not
narrowed: `{3,x,8}` exceeds 10 and neither `{3}` nor `{8}` can stand alone.

Pruning is the exact-sum suffix bound the little killer uses, adapted to the partition: the running
group sum may never exceed 10, and the remaining cells must be able to total `(10 − segSum) + 10k`
for some `k ≥ 0` (with no group open, at least one whole 10). A group **closes** the moment its sum
hits 10 — with a `0` in the digit set the search also branches on keeping it open, and the terminal
state accepts a group left open at exactly 10 (trailing zeros).

**Structural feasibility is a length question, and it is pure** — `tenLineSegSizes(digitList,
maxLen)` (which group LENGTHS can sum to 10, multiset DP) + `tenLinePartitionable(L, digitList)`
(can L cells be tiled by those lengths). Over 1-9 the group sizes are 2..10, so every length tiles
**except 1** — a 1-cell ten line is impossible and is **DROPPED**, never wiped. Both are top-level
and harness-tested.

**A CLOSED LOOP'S PARTITION IS CYCLIC.** The duplicated endpoint is dropped (the v3.144 renban
lesson) and then the groups **wrap**: walking the ring linearly would force a boundary at whatever
cell the setter happened to start drawing, which is *stricter* than the rule and over-removes. So a
loop is enumerated once per **rotation** and the per-cell support unioned — every cyclic partition
has some boundary, and rotating the start to each cell reaches all of them. `JHPNrLgRQH` "Baby
Dragon" is exactly this (a grey ring divided into groups of 10).

**The cue** covers three phrasing families: **named** ("ten line" / "10-line" / "tenline", also on a
ring or snake), **described** ("consists of one or more contiguous groups of cells, each of which
sums to 10", "broken into … strings … which sum to 10", "divided into segments … that sum to exactly
10"), and **whole-line** ("digits along a thin blue line always add up to 10" — `kccvhsp1ff`,
`yjy08cqz6p`, `p6660shn47`). The whole-line case is the ONE-group case, and the partition rule is
*weaker* than it (it also permits two groups = a total of 20), so validating those lines here can
only under-remove. Four narrownesses, each catalog-measured:

- the described branches bind to a **drawn-object noun** (the parity lesson) — `el9sus7p0o`'s "her
  cells can be divided into … groups … each of which sum to 10" is a cell-SET rule with no line;
- the windows stop at `;` `:` **and at a " - " bullet**, because rules are routinely one blob of
  dash-separated one-liners and an unbounded window walks from one clue's "grey line" into another's
  "cells separated by an X add to 10" (`19litary1w`, `buum97646q`);
- the 10 must not head a **list or a range** — `(?!\s*(?:or|,)\s*\d)` drops "segments which sum to
  either 1, 5, 10, 15 or 20" (`23fMD676d3`) and "adjacent digits along a snake sum to 10 or 11"
  (`r2zxe5nquo`);
- **`TEN_LINE_ANTI_RE`** drops the rules that say "10" and mean something else: **"sum to 10 or
  more"** (`6BDF4d9G7r`, *titled* "10-Line" — the name alone would have claimed it), **"a multiple of
  10"** (a line TOTAL, not a partition: `9,2,9` sums to 20 with no contiguous split into 10s, so this
  compute would over-remove), and **"the digit 1 has a value of 10"** (`LPMhrPLMDQ` "Ace is High" — a
  genuine ten line whose digit VALUES are redefined, which the compute cannot model).

`TEN_LINE_CLAUSE_RE` (named-colour layer) is the name or a "sums to 10" of its own — bare "sum" is
out (the region-sum lesson) and so is any grouping word alone, since both collide with every other
summing clue in a legend. Registered in `LINE_LABEL_TYPES` under `tenline`, so it inherits the
line-type-label layer and finally reads Dovetail's **TEN** sticker (`y697kc2umn`, the puzzle that
motivated that layer, listed "ten lines (TEN)" with no validator to claim it).
**Catalog-measured:** 28 of the 29 `ten_line`-tagged puzzles fire (96.6% — the miss is "Ace is High",
dropped on purpose), clause-blindness UNREADABLE 0 of 13 multi-colour, and every remaining hit
outside the tag is a genuine untagged ten line, a whole-line "sum to 10", or `2yiw0yc01y`, whose
ten-loop is the player's own drawing (nothing drawn to claim). Test puzzles: `ja8iov3ag3` "Tenacious
Whispers" (grey ten lines + green whispers), `zy1s9y2qi8`, `6iqsdeorzo` "Tension" (teal), `y697kc2umn`
"Dovetail" (the TEN label), `JHPNrLgRQH` "Baby Dragon" (the ring).

## Parity + zipper-line validators

**Parity + Zipper-line validators (v3.78 — both cue-gated cosmetic lines, same
`classifyCueLines`/`resolveCueValidatorLines` machinery as renban/region-sum):**
`computeParityRemovals` / `computeZipperRemovals` (always-on — the per-validator enable settings
were removed v3.104). Cues: `PARITY_CUE_RE` — **rewritten v3.88** (usual colour red); the old cue
asked *"does this puzzle mention parity?"* rather than *"is a LINE about parity?"*, so bare "same
parity"/"odd/even" fired on **100** puzzles with no parity line (parity dots `7fvnto2d90`, parity
circles `0d1yk3fs2d`, odd/even globals `82dowa2bt5`). That is the dangerous direction — cue + a
single-coloured cosmetic line makes layer 2 **claim** it, so `82dowa2bt5`'s green german whisper
would have validated as parity. Binding every branch to a drawn-object noun
(`lines?|snakes?|paths?|loops?|rings?|snowflakes?` — **not** the bare word "line": real parity clues
ride a snowflake `pt8z9l0wii` and a snake `zmckmtohx1`) removed **68 mis-claims** (9 german_whisper,
7 region_sum, 6 renban, 4 thermo, 2 zipper, 2 entropic) at zero recall cost (95.1%). `ZIPPER_CUE_RE`
("zipper", "equal distance from the cent(re)"; usual colour blue/purple; 96.9%). **Parity compute:**
adjacent cells alternate odd/even ⇒ the whole line is a 2-colouring with exactly TWO phases (phase p
requires parity `(i+p)%2` at index i, 0=even/1=odd = `d%2`). A phase is feasible iff every cell can
supply its required parity; candidate d in cell i survives iff some feasible phase wants d's parity
there. Closed-loop endpoint dropped (path model; wrap edge not enforced — under-constrains a loop,
never over-removes). **Zipper compute:** fold the line at its centre — equidistant pairs `(i,
L−1−i)` all sum to one variable total S; odd length ⇒ lone centre cell IS S. Pairs are independent
given S, so per pair enumerate achievable sums + per-(cell,digit) the sums it reaches;
overall-feasible S = ∩ across pairs (∩ the centre's candidates on an odd line); a paired candidate
survives iff some overall-feasible S is reachable with it (partner = S−d, distinct where they share
a row/col/region — `mustDiffer`, guaranteed units only → safe), the centre survives iff d ∈ overall.
Both iterate to a fixpoint, honour fog per-cell, follow the emptied-cell→red-contradiction contract
(no common phase/S given the marks wipes the marked cells rather than a false all-clear). Registered
in `constraintValidators()`; `detect: parityDetected`/`zipperDetected`; ambiguous-detection ⚠ menu
notes wired like renban/region-sum.

**Zipper layer 0 (v3.123):** f-puzzles DOES declare zipper lines natively — key `zipperline`, same
`{lines:[[ "R3C6", … ]]}` shape as the other constraint keys (confirmed on `2nnlhao8xm`,
`4qt4n1bnz3`, `philip-newman/20240427-zippee-ki-yay`), so `zipperline: 'zipper'` is in
`FPUZ_LINE_CONSTRAINTS` and `classifyZipperLines` passes `'zipper'` as `nativeType`. It is **rare**
— 3 of the catalog's 64 zipper-tagged puzzles carry the key; the rest of the f-puzzles ones are
flattened to plain `line` entries with no `fromConstraint` label to read — so the cue+colour ladder
stays load-bearing and this is purely additive precision.

**⚠️ ONE ZIPPER CAN BE DRAWN AS SEVERAL STROKES — join before folding (v3.124).** `k9mm1xgca5`
stores its R6C3→R9C3 zipper as TWO line entries meeting end-to-end at R8C2. Folding each stroke
separately pairs the wrong cells, so `computeZipperRemovals` now folds **`zipperChains(lines)`**
(→ `mergeZipperChains`), not the raw classified chains. Two chains join when an endpoint of one IS
an endpoint of the other **and that cell ends no other chain** — three ends meeting is an open
junction and we refuse to guess (the `walkBetweenSegment` rule); closed loops never join, and a
merge that would revisit a cell is rejected. This is the mirror image of the between-line lesson:
there one stroke was several clues, here several strokes are one clue.

**One fold function, three consumers (v3.124).** `zipperFoldCenter(keys)` returns the fold point in
CELL units — the middle cell on an odd chain, the midpoint of the two middle cells on an even one
(a cell EDGE when the line runs straight through, a grid CORNER where it turns). The validator's
pairing, the eyeball disc and the injected cosmetic dot all read it, so the three can't drift.
The eyeball case `{type:'zipper',keys}` draws the polyline plus a filled disc (`disc()` in
`showObjects`) sized `zipperCenterDotScale × SEG_W`, matching the drawn dot's
`zipperCenterDotScale × line width`. The rendering counterpart is `drawZipperCenterDots` — see
PROJECT_SUMMARY.

**Ground truth for the fold geometry:** `k9mm1xgca5` marks every fold centre with its own cosmetic
circle. All 7 computed folds match all 7 circles — including a 4-cell circle on a grid CORNER and
2-cell circles on cell EDGES — and the merge is what makes the 7th match. Pinned in
`validator_harness.mjs`.

## Same-difference-line validator (v3.159)

Every pair of **adjacent** digits along the line differs by the same amount **d**, and d is a
per-line **unknown the solver has to deduce** ("this difference must be determined for each turquoise
line"). So d is part of the enumeration, never an input — the same shape as region-sum's S and the
arrow circle's total. `computeSameDiffRemovals`, cue-gated via `classifySameDiffLines` →
`classifyCueLines(SAMEDIFF_CUE_RE, SAMEDIFF_CLAUSE_RE, null, 'samediff')` (no f-puzzles native key
exists for this type). Turquoise is the convention but grey and yellow occur too, so colour is never
trusted alone.

**For a fixed d the line is a CHAIN CSP — and arc consistency decides a chain EXACTLY.** After the
domains stop shrinking, every surviving value provably extends to a full fill: polynomial, no
search, no cap, nothing to audit. Only two things break the chain shape:

- **Conflicts** — two of the line's cells sharing a row/column/region/uniqueness cage must differ
  (`makeMustDiffer`, a per-line matrix). The everyday case is a straight 3-run `r1c1-r1c2-r1c3`: the
  fill `a, a+d, a` satisfies the chain but repeats a digit in the row, so the run cannot fold back.
  That single rule is what takes 1 and 9 off the middle cell of any straight 3-run.
- **A closed loop** — the wrap edge turns the chain into a cycle. (The duplicated endpoint is
  dropped and the wrap edge IS enforced here, unlike parity: for this rule it is load-bearing, and
  `sameDiffExactFills` checks it as the last step of a fill.)

Those two go to `sameDiffExactFills`: cell 0 picks from its domain, every later cell is forced to
`prev±d`, so the tree branches ≤2 ways, and it stops as soon as every arc-consistent value has been
witnessed. It is capped at 200k nodes and **a cap hit falls back to the arc-consistent domains** —
see the node-cap audit table for why that makes this cap a different animal from the two v3.155/6
had to remove.

`d = 0` (every cell equal) is admitted by the maths and killed by the first conflict, which every
real drawn line has — orthogonally adjacent cells share a row or column. It is not special-cased
away, so a hypothetical conflict-free line still gets the right answer.

**Structural test:** the validator's own engine run over `st.fullSet` in every cell. No d fits the
line mark-free → the clue as we read it is impossible → dropped, counted, reported (a 3-cell closed
loop of mutually-conflicting cells is the clean example: three distinct digits cannot be pairwise
equidistant). A bail answers "possible", never "impossible".

**Cue, catalog-measured 2026-07-29** (tag `same_difference`, 36 tagged): recall **88.9%** (32/36 with
v3.163's second cue; 86.1% before it),
**3 FPs, all genuine same-difference puzzles the catalog left untagged** (`k4g3ubb8qe`,
philip-newman's two "sequence lines" dailies) — i.e. 0 real over-fires. Clause blindness: 17
multi-colour puzzles, **0 UNREADABLE**, 16 pin a colour, 1 NO-COLOUR (`lc3vr050ng`, whose line types
are the solver's own deduction → correctly ambiguous). Phrasing families covered: the named form,
the described form either way round, "arithmetic sequence/progression", "evenly spaced sequence",
"increase/differ by the same amount", and "constant difference" with no adjacency word at all
(`uwygvvt8nd`). Both spellings of "neighbouring" occur — `hva096ojxs` writes "neigbouring" — which
is why the described forms key off "same difference" itself rather than the adjacency word.

All four remaining misses are **correctly** not ours: the "same difference" is between two diagonals
of a 2×2 dot (`F28G66PTLg`), the halves of a ± sign (`v5fyfcm6yj`), an orange dot pair
(`H3MfbFJ83R`) or a "difference bomb" (`uojuxaw1qw`) — there is no line to claim.
`SAMEDIFF_ANTI_RE` drops `r3xtlrd6qv` "Regional Differences", where "each sum of adjacent segments …
has the same difference" is a rule about **segment sums**, not adjacent digits.

#### The rule that DEFINES a per-line constant instead of naming one (v3.163)

`jeu4qiw80c` "Disco floor": *"Each line has a unique non-negative number associated with it. This
number indicates the difference between adjacent digits along that line."* A textbook
same-difference line carrying **none of this rule's vocabulary**, so `SAMEDIFF_CUE_RE` cannot see it
— and its lines are drawn green, so the **whisper** validator's trusted-green layer claimed them and
removed on ≥5. Not a miss: a wrong claim.

v3.159 refused to key off `difference between (adjacent|neighbouring) digits` because `23xbq0xofa`'s
*"the difference between neighbouring digits is at least 2"* wears the same words. `hasPerLineConstDiffCue`
demands three things instead, and the comparator is the discriminator:

1. the difference is between **adjacent / neighbouring / consecutive digits** (`SAMEDIFF_ADJDIFF_RE`);
2. **that clause** carries no comparator — at least / at most / minimum / more than / … — because a
   *bounded* difference is the whisper family's rule, never ours (`SAMEDIFF_BOUNDED_RE`). Scoped to
   the clause, so an unrelated "at least" elsewhere in the rules can't veto;
3. the rules tie a **number/value to each line** (`SAMEDIFF_PERLINE_RE`) or say **"this number … difference"**
   (`SAMEDIFF_THATNUM_RE`) — the per-line unknown, which is what separates a per-line constant from a
   global one.

Catalog-measured over all 6,260 puzzles: only **2** carry the phrase at all — this fires on
`jeu4qiw80c` and condition 2 blocks `23xbq0xofa`. Wired in as a duck-typed `{ test: hasSameDiffCue }`
matcher (the `classifyEntropicLines` trick), so both cues share one code path.

**The whisper side is fixed per LINE, not per puzzle** (`dropSameDiffClaimed`, called on the green set
in `classifyWhisperLines`): a line the same-difference classifier claims **confidently** is not a
whisper, because confident there means cue + pinned colour — strictly more evidence than "it is
green". A puzzle-wide veto would have been the overcorrection: `dfqhpy0fvc` "Sprinkles Ice Cream"
states *both* rules — *"Adjacent digits on a green line must be at least 5 apart. Adjacent digits on
a grey line must have a constant difference."* Its same-difference cue fires, its green lines really
are whispers, and `WHISPER_CUE_RE` misses "at least 5 apart" (no differ/difference) — trusted-green
is the **only** thing detecting them. Samediff's clause-colour layer claims the grey lines there, so
green survives. Like `greenNamedForRival`, this can only narrow the green set, never widen it.

### Two clues can share BOTH endpoints — and the overlay drew them as one (v3.160)

`s7221r2i0r` "Abstract Art" (Marty Sears) draws two same-difference lines in the top-left corner:
**r1c3 → r1c2 → r2c2** and **r2c2 → r2c3 → r1c3**. Separate clues, each with its own difference —
but between them they trace the four sides of one 2×2 square, and the eyeball drew them
centre-to-centre as **a single closed ring**. That reads as one clue, and worse, as a *loop*, which
is a different rule again.

- **Detection was never wrong.** Verified end-to-end: this puzzle's runtime `cp.lines` is **empty**
  (SudokuPad 0.611 drops them for this scl puzzle), so `getCosmeticLines` falls to the DOM path;
  `scanLineLayer` pushes one entry per `<path>` and `expandLineChain` returns two open 3-cell
  chains. `classifyCueLines` → `resolveCueValidatorLines` → `computeSameDiffRemovals` carry them as
  two `lineData` entries, each enumerating its own `d`. Nothing merges chains anywhere in the cue
  stack. Pinned in the harness with the real path geometry.
- **The setter had already solved the picture problem** — both lines are drawn with ~0.4-cell
  **stubs** instead of running to the endpoint centres, so a human sees two L's. Each stub still
  crosses the cell border (0.6 of a cell from the previous centre), so the rounding in
  `expandLineChain` picks up the right end cell.
- **Fix: `polylineInset`** pulls each open clue polyline's two ends back `0.20 × cellPx`, the same
  convention. The shared corners then show a visible break. **A closed loop is never inset** — it
  has no ends, and a gap would invent one. Interior cells are untouched, and the trim is capped at
  40% of a segment so a 2-cell clue still reads as a line. Applies to the plain `line`/`diag`
  descriptors; `between`/`arrow`/`zipper` already mark their endpoints with a ring or a head.
- **The general lesson:** an overlay that draws N clues as N polylines on one layer is only
  unambiguous while the clues stay apart. Whenever clues of the same type can share cells, the
  preview needs a per-clue visual boundary, not just per-clue geometry.

**A clause collision can silently disable the LINE-TYPE LABEL layer for two validators at once.**
`WHISPERISH_RE` is `whisper|\bdiffer(s|ence)?\b`, so a legend phrase "same difference (SD)" reads as
whisper language too — and the layer's "a phrase matching two types claims nothing" rule would then
kill the sticker for **both**. `LINE_LABEL_TYPES` entries may now carry a `not` regex, and the
whisper entry excludes `SAMEDIFF_CLAUSE_RE`. Scoped to the label legend deliberately: widening
`WHISPERISH_RE` is what keeps the trusted-green layer safe elsewhere. Check this collision whenever
a new cue validator is added.

## Palindrome-line validator (v3.164)

**`classifyPalindromeLines` / `computePalindromeRemovals`.** The digits read the same in both
directions, i.e. the two cells **equidistant from the line's centre hold the same digit**. Fold the
line at its centre and every fold pair `(i, L−1−i)` is a plain **equality**; an odd line's lone
middle cell pairs with itself and is unconstrained. That makes this the cheapest validator in the
file — the pairs are independent of each other *and* of the digit set, so a candidate `d` survives
iff its mirror cell can still hold `d` (one **set intersection** per pair; no enumeration, no search,
no node cap). Still iterated to a fixpoint, because two palindromes may cross and one's removal can
feed the other. It reads the board and honours selection/fog through the same `cellSet`/`mayRemove`
pair every line validator uses.

**A closed loop has no centre to fold at**, so a drawn loop (first cell repeated as the last) is
**dropped, not guessed at** — choosing an axis would be inventing the clue. It is deliberately NOT
counted as `invalid`: an unreadable drawing is our gap, not an impossible constraint. (This is the
v3.144 loop lesson answered in the third way: whisper and same-difference enforce a wrap edge, parity
does not, and palindrome cannot be defined on a loop at all.) **Catalog-checked (2026-07-29): no
palindrome loop exists** — across the 109 palindrome-tagged puzzles that declare their chains (607
strokes, read from the model's `palindrome` key and from live fpuz/scl payloads), zero strokes close
on themselves and zero sets of strokes join into a closed ring. The drop is a guard against a shape
setters do not draw, which is what you would expect: the rule has no meaning without endpoints.

### Strokes that meet at an endpoint are dropped (v3.165)

The same scan found the real hazard. **Nine of those 109 puzzles draw palindrome strokes that meet at
an endpoint**, and the two readings cannot be told apart:

- `DBFdgmG6mq` spirals **one** line through four straight strokes (r1c1→r1c4→r4c4→r4c1→r2c1). Read
  separately each straight stroke folds onto a pair in its own row or column, so all four come back
  "structurally impossible" — joining is the only reading that works.
- `MM3mMQGJn2` "Relax, You're Two Tents" radiates **three separate** palindromes out of r5c1 in a
  star. Each is individually valid, and joining any two would invent a clue.

No geometric test separates those (the v3.160 lesson: two clues may share both endpoints), so
`computePalindromeRemovals` declines both readings and drops any stroke whose endpoint is shared
(`endHits`). **Why palindrome and not the others:** every other line validator can safely treat a
stroke as a clue, because its rule is *local* — adjacent pairs, a running sum, a set — so splitting a
chain only weakens the check. A palindrome's constraint is the **fold**, which depends on the whole
chain's length, so folding two halves separately doesn't under-constrain, it asserts a **different
and wrong** set of equalities. That is over-removal, so the safe direction is to decline. Not counted
as `invalid` for the same reason the loop isn't.

**Detection.** f-puzzles **declares palindromes natively** — key `palindrome`, the usual
`{lines:[["R5C4", …]]}` shape (payloads fetched and decoded 2026-07-29: `2a8ncwsjcb`, `5zzqrmjaep`)
— so it is registered in `FPUZ_LINE_CONSTRAINTS` and layer 0 pins them outright. scl/sxsm fall
through to the ordinary cue + label + colour ladder.

**Cue, catalog-measured** (2026-07-29, tag `palindrome`; 132 of the 285 tagged puzzles carry rules
text and are scoreable): `PALINDROME_CUE_RE` = `/palindrom|reads?\s+the\s+same\b/` recalls
**132/132 = 100%**, UNREADABLE **0**. Bare `/palindrom/` alone would be 124/132 (93.9%) — eight
setters describe the rule without ever naming it ("digits along grey lines must read the same
backwards and forwards": `6rs44b4pv2`, `f0d6t0yix3`, `o4gckt3h44`, `oup3w41nfb`, `km2pzzh71j`,
`qcij3qgadg`, `QP8dphbD78`, `LFMR2HQNJP`), so the "reads the same" branch is load-bearing, not
decoration. `PALINDROME_CLAUSE_RE` is identical to the cue (the general rule: a clause must cover
every phrasing its cue covers), and it collides with no existing `LINE_LABEL_TYPES` entry in either
direction, so the label layer works with `labelKey` `'palindrome'`.

**`PALINDROME_ANTI_RE` drops two rules that borrow the words for a different constraint** — both
would be **over-removals**, the one direction the elimination contract forbids:

- *"read the same when you **roll out** the line along its row/column"* (`3G8rJj4JGR`, `bu0cacffbu`,
  `ja5jn5uwkz`) — the line is not symmetric about its own centre at all; the comparison is with a
  different line entirely.
- *"digits **equidistant** from the centre of a line must be **consecutive**"*
  (`bill-murphy/20250705-consecutive-palindromes`) — the fold pairs differ by one, so applying
  equality would delete exactly the digits the puzzle wants.

The anti runs **before layer 0**: a puzzle that states this outright must not be claimed even if it
also carries a native `palindrome` key. Under-detect, never mis-apply.

Of the 5 remaining hits outside the tag, 4 are genuine palindromes the catalog left untagged
(`4pd5gy143h`, `6nqzhupznu`, `ayk7228tr8`, `j22idv1qhe`) and **one is an accepted known FP**:
`2lins9ixrk` calls a *box* a "quasi-thermo-palindrome". No cue that reads the word can dodge that,
and the colour layers still have to pin an actual line before anything is checked.

**Deliberately not matched: the zipper family's "equidistant from the centre" phrasing.** Every
palindrome puzzle that words it that way also says "palindrome", and `ZIPPER_CUE_RE` already owns
those words for a rival rule (its fold pairs *sum*, they do not match).

## Entropic-line validator

**Entropic-line validator (v3.85; digit-set gate + Squishdoku v3.86 — cue-gated cosmetic line, same
`classifyCueLines`/`resolveCueValidatorLines` machinery as parity/zipper):**
`computeEntropicRemovals` (always-on — the per-validator enable settings were removed v3.104). Every
run of 3 consecutive cells holds one LOW/MID/HIGH digit — equal thirds of the digit set. **THE GATE
IS THE DIGIT SET, NEVER THE GRID SIZE** (v3.86 fixed a v3.85 grid gate that was simply wrong):
"low/medium/high" is a claim about digit ORDER, so all that matters is that `settings.digitSet`
splits into 3 equal bands. `entropicBands()` sorts the set and cuts it in thirds → 9x9 1-9
`{1,2,3}/{4,5,6}/{7,8,9}`; 6x6 1-6 `{1,2}/{3,4}/{5,6}`; **7x7 Squishdoku 1-9** works (`pdnc0ckv87` —
the v3.85 grid gate wrongly refused it); a 9x9 with a custom 1-7 is REFUSED (7%3≠0 — no low/mid/high
split exists). Placed value outside the digit set (e.g. a `0` revealed from fog while the set is the
assumed 1-9) → `digitsReadable` drops that line rather than read it as "supplies no band" and wipe
it. **Compute — the 6-phase identity:** "every window of 3 is all-3-bands" is EXACTLY equivalent to
"band(i) depends only on i mod 3, and the 3 residues take distinct bands" (windows i and i+1 share 2
cells ⇒ band(i)=band(i+3) ⇒ period 3). So the line is one of just **6 phases** = the permutations of
bands over residues — the parity validator's 2-phase argument one dimension up. Phase feasible iff
every cell can supply its band; candidate d at index i survives iff some feasible phase wants d's
band there. Complete ⇒ never over-removes. Verified against a brute-force complete-support
enumerator: **4000/4000 randomised paths+loops, both grid sizes, exact match**. **LOOPS
(`keys[0]===keys[last]`) — two rules that only work together:** (1) drop the duplicated endpoint so
`keys.length` is the true cycle length L; (2) a loop's windows WRAP, so it needs **3 | L** (else
stepping by 3 reaches every cell, gcd(3,L)=1, forcing one band — contradicts distinctness). **An
entropic loop cannot exist at a length that isn't a multiple of 3 → it simply ISN'T an entropic
line** (whatever colour-pinning thought) → drop it, validate nothing, never wipe. Skip rule 1 and a
loop presents as a path of L+1 whose start cell sits at indices 0 and L — residues clash exactly
when L%3≠0, killing all 6 phases and **wiping the line as a false contradiction** (verified
L=4,5,7,8). For survivors (3|L), index L ≡ 0 (mod 3) so `perm[i%3]` enforces the wrap windows with
**no separate loop code path**. Real drawn loops: the 6-cell entropic loops on `bdiaxwjnxc`. Lines
<3 cells carry no window → dropped. **Detection (`hasEntropicCue` = `ENTROPIC_CUE_RE` ‖
(`ENTROPIC_SET_RE` && `ENTROPIC_LINEISH_RE`), then `ENTROPIC_ANTI_RE`; 75.0%→**88.9%** recall at
v3.88):** the named cue = "entropic line(s)" or entropy/entropic within a clause of "line". **v3.88
added the DESCRIBED cue** — many setters never write the constraint's name at all (`3ns1yd8hps`:
*"one high digit (789), one medium digit (456), and one low digit (123)"*), which no word-based cue
can ever reach; `ENTROPIC_SET_RE` matches the 123/456/789 partition itself in the notations the
catalog uses (`(123)`, `{1,2,3}`, `[1 2 3]`, `1/2/3`, low/middle/high). ⚠️ It is **gated on
`ENTROPIC_LINEISH_RE`** because a bare `123` matches the low band — `5l6mlo349f` draws its BOX
NUMBERS as `123\n456\n789` and has no line clue at all. (`classifyCueLines` only calls
`cueRe.test(blob)`, so `hasEntropicCue` is passed duck-typed as `{ test: fn }` — no forked code
path.) The **ANTI guard is the interesting half** — these all say "entrop…line" but are NOT this
rule: `biased entrop` = unequal bands {1,2}/{3,4,5}/{6,7,8,9} (`ho51fykiy7`); `tentrop` = runs of
FOUR over X-pairs (`3gkoee7rau`, `c3qu3xglut`); `anti-entrop` = neighbour rule, not a line
(`74j61weh89`); `exactly/either one|two of` = the line's TYPE is itself the deduction
(`1cwnilmrp0`). `ENTROPIC_CLAUSE_RE=/entrop/` (not "low"/"high"/"set", which collide in a legend —
the renban-"consecutive" lesson). All 8 traps verified blocked. ⚠️ **Two puzzles that look like
entropic-line tests but aren't:** `90n1ck63vq`'s entropic line is the player-shaded "Golden Bear
Path" (its drawn lines are a yellow region-sum loop, a **brown 4-cell parity loop** and **blue
modular** lines — do NOT read the 4-cell loop as entropic); `cbbvbid2vt`'s entropic loop is likewise
**solver-drawn**. Both have no drawn entropic line → correctly undetected/ambiguous.

## Ambiguity policy — greyed rows, selection-only override

**Ambiguous validators are GREYED OUT, not hidden (v3.86 — uniform policy for every validator).**
AMBIGUOUS = the rules cue fired but WHICH lines carry the clue couldn't be pinned (colour collides
with a rival type, or the type is the player's own deduction — `1cwnilmrp0`: "each line is EXACTLY
TWO of modular, entropic, or parity"). We never guess. The menu lists the validator **greyed out
(opacity .4, not clickable) with a hover tooltip explaining why** — a hidden row tells the player
nothing. Ticking **"Validate selection only"** hands the choice to the player (they select the
line), which **re-enables every ambiguous item** and **disables "Run all above functions"** (run-all
is a whole-puzzle fixpoint and is mutually exclusive with selection-only: an ambiguous validator
re-enabled that way would apply every rival line type to the same selected line). The checkbox calls
`rebuildValidateMenu` so the greying updates live. Driven off the classification stashed per menu
build (**`def.cls`**, set by `detectedValidators()` — v3.104; before that per-def `ambiguous()`
wrappers, which had replaced the per-name `if`-chain of ⚠ notes); a new cue-gated validator gets the
behaviour by setting `classify`, with no menu edit. `addItem`/`addButton` take `{disabled, title}`.

## Digit-set detection + fog as a spoiler boundary

**Digit set: count from the largest no-repeat region, and fog is a spoiler boundary (v3.86).**
**`detectDigitCount`** — the digit count = the size of the **LARGEST no-repeat region** (max cells
over `cp.regions` + `unique:true` `cp.cages`; `cageCellCount` handles both the `[[c,r],…]` and
`"r1c1,…"` shapes), falling back to `detectGridSize()`. Rationale: a no-repeat region can never hold
more digits than exist, and a sudoku's boxes hold exactly the full set — so the biggest one IS the
digit count. **This is what makes SQUISHDOKU work with no special case**: `pdnc0ckv87` is a 7x7 grid
whose nine 3x3 boxes OVERLAP → 9-cell boxes → digits 1-9, so it is NOT anomalous and is applied
silently with **no prompt** (its 7-cell rows/cols don't win). 9x9→9, 6x6→6 from the same rule.
`detectDigitSet`'s anomaly is now keyed on **digitCount ≠ 9**, not `gridN ≠ 9`. **Fog:** a given
hidden under fog is STILL IN THE DOM, so a naive scan sees a `0` the player isn't meant to know
about — and prompting "digit ‘0’ found in puzzle" would **leak it**. So `addDigit` records per-digit
*visibility* (`getFogTester` on the mark's cell; a tspan has no x/y → use `parentNode`), and a
**fogged-only `0` is ignored completely** — not named as a reason AND not pre-filled into the guess
(which would leak just as loudly). The set is then assumed standard 1..digitCount. A *visible* `0`
prompts and is named, as before. Net: 9x9 + fogged 0 → no prompt, 1-9; 7x7 Squishdoku + fogged 0 →
no prompt, 1-9; 7x7 non-Squishdoku → still prompts (on size), zero not mentioned.

## Between-line validator

**Between-line validator (v3.119 — algorithm agreed 2026-06-21, built 2026-07-22; joins Run-all;
circles + segmentation v3.120).**
A between line: every non-endpoint cell must hold a digit *strictly between* the two endpoint
("bulb") values. Endpoints = the **segment's** first and last cell — where the circles sit.

**THE DRAWN POLYLINE IS NOT THE CLUE (v3.120 → rebuilt v3.121; `betweenSegments` / `lineStepGraph` /
`walkBetweenSegment`).** Two separate facts, learned in that order:

1. Setters thread several circles onto one stroke. `2ad4183iyn` ("41 Circles") stores 12 polylines
   (one 35 cells long) that are really **57** independent 3-cell between lines; its row-1 stroke alone
   is 4 clues. Validating a stroke whole treats real endpoints as interior cells.
2. **v3.120 split each stroke at its circles, and that was still wrong** — the strokes' *turns* are an
   artifact of how the setter dragged the mouse, not of which cells are joined. **R8C5** of that
   puzzle is a 4-way crossing whose two strokes each *turn* there (one arrives from R9C5 and leaves
   west, the other arrives from R8C6 and leaves north); what is *rendered* is a plus, and the clues a
   solver reads are the straight vertical R7C5–R8C5–R9C5 and horizontal R8C4–R8C5–R8C6. The v3.120
   split produced the two L-turns and **missed the vertical entirely**.

**Settled by evidence, not taste** — that puzzle publishes its solution, so each reading was scored
against it: **straight-through satisfies all 57 segments; following stroke order violates 14 of them.**
(The same check caught that the scl `lines` array is stored **transposed** relative to what is
rendered — the v3.83 trap again. The DOM is the truth, and `getCosmeticLines` already prefers it here
because `cp.lines` is empty. *Any* future analysis of a scl payload must transpose or read the DOM.)

So segments come from a **walk over the drawn-step graph**, not from the strokes. At each interior
cell, entered from `prev`: (1) a drawn neighbour opposite `prev` exists → continue **straight** (this
is what resolves crossings); (2) else exactly one other neighbour → take it (an unambiguous **bend**,
so ordinary L-shaped lines still work); (3) else → **refuse the whole walk** — a junction the picture
genuinely leaves open is never guessed at. Walks start from every circle and run outward on each
incident stub; either direction yields the same clue (de-duped).

**Every classified chain feeds the graph; the fallback is decided globally, never per chain
(v3.122).** Gating it per chain was a real defect: a short connector stroke carrying <2 circles was
held *out* of the graph, which lowered a neighbouring cell's degree and turned a plain crossing into a
**fake T-junction**, so rule (3) refused a genuine line. `2ad4183iyn` **R5C8** — the drawn step
R4C8–R5C8 lives on a 2-cell stroke with one circle on it, and excluding that stroke cost the vertical
R4C8–R5C8–R6C8. A stroke is part of the picture whether or not it carries circles of its own. With the
global gate the puzzle yields **58 segments, 0 refused walks, all 116 drawn steps covered, 0 solution
violations**; per-chain gating gave 57 with one step orphaned. Fallbacks now: no circles found
*anywhere* → every chain emitted unchanged; otherwise walk, then emit unchanged any chain the walks
never touched.

Circles come from `getCellCenteredCircles` — the **shared circle reader** (v3.120) for cell-centred,
near-cell-sized, near-circular `#overlay`/`#underlay` rects (SudokuPad draws every round marker as a
rounded `<rect>`, rx ≈ w/2, never an `<svg:circle>`); `getArrowsFromDOM` and the eyeball read the same
fn so they can't drift. Centre-on-cell-centre excludes Kropki/XV dots (cell border) and quadruples
(grid corner); rx ≈ w/2 excludes lockout **diamonds** (rotated rects). **Fallback:** a chain carrying
<2 circles is emitted unchanged (the pre-v3.120 behaviour, so a puzzle whose markers we can't read is
never made worse) and kept out of the graph so it can't disturb the walks of chains that do have
circles. `unitFilter` ("validate selection only") is applied to the **segments**, so selecting one
circle-to-circle run of a long line checks exactly that run.

**Algorithm — both directions (v3.120).** *Interiors* (`betweenDigitAllowed`, a pure harness-tested
helper): read bulb A's candidate set (`minA`,`maxA`) and bulb B's (`minB`,`maxB`); a line digit is
possible iff it lies in the open interval spanned by `(minA,maxB)` **OR** by `(maxA,minB)` (union of
the two cross-scenarios — which bulb is the low end is unknown); remove from each interior cell every
centre candidate outside **both**. This one test (a) excludes a solved bulb's own digit (never
strictly between itself), (b) permits mid-range bulb candidates on the line, (c) handles the "trapped
value" case a naive global min/max interval gets wrong — bulb {5} & {2..8} → keeps 3,4,6,7 (excludes
1,2,5,8,9).
*Bulbs* (`betweenBulbDigitAllowed` + `betweenInteriorsFeasible`, **new in v3.120** — v3.119 left
circles alone as "the player's job", which left provable eliminations on the board). A circle digit
`d` survives only if **some** value `b` of the opposite circle leaves the interiors an assignment they
can all satisfy at once inside `(min(d,b), max(d,b))`. **The simultaneity is load-bearing and a
per-cell interval test cannot see it** — reported case: interiors `{5,7}` and `{5,7}` in one row,
circles `{1,3,6,8,9}` and `{1,3,6,8}`. Each interior alone can take 5 inside `(1,6)`, so a per-cell
check says 6 is fine; but they *must differ*, so the interval seats only one of them and **6 is
impossible in either circle** (6 is neither below 5 nor above 7). Feasibility is therefore a
fewest-options-first **backtracking search** over the interior cells under `makeMustDiffer`, exact and
cheap (≤7 cells over ≤9 digits); on a node-budget overrun it answers *feasible* — under-remove, never
mis-apply. `computeBetweenLineRemovals` is consequently **iterated to a fixpoint** (v3.119 was
single-pass): a narrowed bulb tightens the interior interval, a narrowed interior kills a bulb
candidate, and segments sharing a circle propagate through it. Fog + ambiguous-selection masking are
honoured on bulbs exactly as on interiors.
The **menu eyeball** previews the segments with a ring on both endpoint circles
(`{type:'between',keys}` in `spdrHi.showObjects`), not a bare polyline through them. The ring
**matches the drawn circle** — `ringCell` looks the cell up in `getCellCenteredCircles` and uses its
real centre and radius (+2px so the highlight clears the drawn stroke rather than hiding inside it),
falling back to a fixed `cellPx*0.34` only where no plain circle is found. v3.120 always drew the
fixed ring, which visibly sat *near* the clue rather than on it. Sum arrows use the same `ringCell`
for their bulb **and** now draw an **arrowhead chevron** at the shaft tip (`arrowHead`), so the
preview reads as an arrow and shows its direction. Thermo bulbs deliberately keep the plain marker —
matching geometry is applied where it pays, not everywhere.

**Detection (`classifyBetweenLines`) — the old "between vs lockout" open question is now
resolved by the native payload:** f-puzzles stores a between line as a first-class `betweenline`
constraint (mapped `betweenline → 'between'` in `FPUZ_LINE_CONSTRAINTS`), **distinct** from lockout's
`lockoutline`, so `nativeLinesFor('between')` is confident and unambiguous. A readable payload with no
between key vetoes to `none` (keys are exhaustive). For scl/ctc/js-object puzzles (no payload —
53 of the 99 catalogued `between_line` puzzles), it falls to a rules **cue** (`BETWEEN_CUE_RE` —
"between … circles/bulbs/endpoints/attached", catalog-measured phrasings) gated exactly like renban,
with a **lockout guard** (`BETWEEN_LOCKOUT_RE` — "lie outside", "must not be between", "lockout")
that forces `ambiguous` when lockout phrasing co-occurs, so the opposite rule is never mis-applied.
A second guard (v3.131) does the same job for **double arrows**, which draw the identical picture and
trip the between cue — see "Double arrows" in the sum-arrow section for how the claimed lines are
subtracted. **Test puzzles:** native `ltvk2kk8b0`, `kh1drhrx40` (+killer cages), `hg0yh5uke9` (between + cosmetic
renban); non-native scl `2ad4183iyn` (**the segmentation case** — 11 chains → 57 segments),
`xm3e3npmmk`, `swtm07rplk`.

### Lockout lines vs the Dutch whisper (v3.120)

No lockout validator yet, but lockout lines had to be taught to the **Dutch whisper** classifier: a
lockout rule states the gap between its two **diamonds**, not between neighbours along the line —
`f9a2chdekr` ("Lockout Lines"): *"two connected diamonds must contain numbers with a difference of at
least 4, and all digits on the line … must lie strictly outside the range"* — and that phrasing trips
`DUTCH_CUE_RE` head-on. With one line colour, the cue layer then **confidently** claimed every lockout
line and applied the ≥4 neighbour rule, a different constraint entirely. Two guards in
`classifyDutchWhisperLines`, cheapest first:

1. `DUTCH_LOCKOUT_RE` (`lockout` / `lie (strictly) outside` / `outside the range|values|interval`) in
   the rules → **`none` outright**, not `ambiguous`: the ≥4 belongs to the diamonds, so there is no
   Dutch whisper here to hand-select.
2. `dropNativeLockoutLines` — the f-puzzles payload *declares* the chains (`lockout` **and**
   `lockoutline`, both now mapped to type `'lockout'` in `FPUZ_LINE_CONSTRAINTS`); drop exactly those,
   either drawn direction, and collapse to `none` if nothing survives. Covers a lockout puzzle whose
   prose never says "lockout"/"outside". Verified on `f9a2chdekr`: `cp.lines` is empty, the DOM chains
   match the declared `lockout` chains cell-for-cell.

**Catalog-measured (2026-07-22):** of 118 puzzles matching `DUTCH_CUE_RE`, only **2** also match the
lockout phrasing and **both are pure lockout puzzles** (`f9a2chdekr`, `u0cs9m2qmx`) — no real Dutch
whisper is lost. Note `u0cs9m2qmx`'s rules confirm the segmentation model independently: *"A diamond
terminates a line segment."* — the same circle-splits-the-line rule the between validator now applies,
so a future lockout validator should reuse `betweenSegments`' graph walk against a **diamond** reader.
