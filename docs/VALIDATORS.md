# Validate Constraints — the validator subsystem

> ⚠️ **POLICY IS NOT SET HERE.** [`VALIDATOR_POLICY.md`](VALIDATOR_POLICY.md) governs when a
> validator may speak, stay silent, or disappear, and it **overrides this file wherever they
> disagree**. Specifically superseded (2026-07-31): the v3.182 solution mute, the v3.183 silent
> zero-combination cage, the v3.184 whole-puzzle cage gate, and the reading of v3.186's `ok` trust
> as "row present but neutered". Those sections are kept below as the record of what was built and
> measured — not as the design.

*Split out of [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) on 2026-07-19 — it had grown to ~60% of that
file. Same role: current state + architecture. Hard-won do/don't knowledge stays in
[LESSONS_LEARNED.md](LESSONS_LEARNED.md); the in-code "ADDING A VALIDATOR" banner above
`constraintValidators()` is the authoritative extension checklist — update it and this file
together.*

*Verification tooling: `node tools/validator_harness.mjs` (pure-logic regression cases extracted
from the live userscript — run green before committing validator changes) and `python
tools/cue_recall.py` (catalog-wide cue recall + clause blindness — run on every cue change; keep
UNREADABLE at 0). **`node tools/counting_circle_recall.mjs --guarded`** scores the counting-circle
cue, which `cue_recall.py` structurally cannot (see the note in its `VALIDATORS` table).*

## Feature overview — button, registry, runners

**Validate Constraints (v3.53; cages added v3.56; little killers v3.57; dropdown menu + run-all
v3.59; thermo v3.67; German whispers v3.69, layered detection v3.70; XV v3.72; sum arrows v3.73;
renban + region-sum lines v3.75; parity + zipper v3.78; entropic lines v3.85; Dutch whisper +
modular lines v3.93; double arrows v3.131; nabner v3.152; ten lines v3.153; same-difference lines
v3.159; palindromes v3.164; lockout lines v3.167; XV widened to any Roman numeral
v3.171; difference dots v3.172; counting circles v3.177):** a floating **"Validate Constraints"** button (`buildValidateButton`,
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
validator (v3.72 — structurally a Kropki clone; ANY Roman numeral since v3.171):** `collectXVDots`
finds an `#overlay`/`#underlay` `<text>` holding a **canonical Roman numeral** centred on a cell
border (native XV is a bare letter, no disc; cosmetic XV is a labeled Kropki circle whose letter also
lives in `#overlay`) — reads the letter's `getBBox` centre and derives the 2 cells with the **exact**
geometry `collectKropkiDots` uses. `computeXVRemovals` reuses the Kropki
arc-consistency-to-a-fixpoint machinery; only the partner rule differs — a candidate *d* survives iff
the neighbour can hold *e* with `d+e = the numeral's own value`. The 2 cells are orthogonally
adjacent (always share a row/col) → a self-partner (`e==d`, i.e. d=5 on an X) is impossible and
excluded. Positive clues only (no negative "all clues given" constraint).

**The numeral's value IS the target, and no rules cue gates it (v3.171).** `romanValue` /
`romanString` / `ROMAN_UNITS` parse I/V/X only, and accept **canonical form only** — the value is
re-rendered and compared, so "IIII", "VV", "IIX", "XVX", "VXX", "XXXX" all score 0. That matters
because `XVX` and `VXX` are real catalog strings (`philip-newman/20240726-xvx`, `NmMBndq3mM`) — as
*titles*. L/C/D/M are deliberately excluded: every total they denote is unreachable by a digit pair,
and those letters do appear as ordinary cosmetic labels. **A single character is still only accepted
as `X` or `V`** — a lone "I" is far likelier a decorative tick than a sum-1 clue (and 1 is
unreachable anyway), while 2+ character numerals are unambiguous enough to take on sight.

The no-cue decision is catalog-measured: **every** puzzle that DRAWS a multi-character I/V/X numeral
states exactly the numeral=total mapping — "an XIII sum to 13" (`ed0mko9d0b`), "an XI sum to 11"
(`ogcall10hl`, `jfqxrndls1`), "an XII sum to 12" (`t12fc7v8bl`, `jyzu1d9w9q`), "a VIII must sum to 8"
(`mlw8npbcnr`), "an XV must sum to 15" (`rjl0oqocet`). Every *other* catalog hit on a 2+ character
numeral is **title text only** — episode numbers ("Czech Outsider III", "Corner|Edge Sudoku III",
"What Number Am I Thinking Of? (XVI)") or a title listing the clue set ("XVVX") — and a title is
never drawn on a cell border, so this DOM-geometry reader cannot see one. The drawing IS the
declaration.

## Difference dots (v3.172) — the validator where the DRAWING carries no signal

`collectDifferenceDots` / `classifyDifferenceDots` / `computeDifferenceDotRemovals`. A white circle on
a cell border carrying a **digit**: the two cells differ by that digit. Geometrically a labeled Kropki
dot; logically a white Kropki dot with the gap read off the label instead of fixed at 1 — so it reuses
`isKropkiCircle` (which already rejects the double-arrow pill), `isOnCellBorder` (which already rejects
a 4-cell corner marker) and `getKropkiAdjacentText`, then runs the same arc-consistency fixpoint.
`hasPartner` is simply `other.has(d − target) || other.has(d + target)`.

**A CUE IS MANDATORY, and this is the validator that proves why.** Four different rules draw a
*pixel-identical* picture — a white 0.5-cell disc on a border with a digit in it:

| puzzle | rule | verdict |
|---|---|---|
| `0jyxu79n6q` "Same Difference" (clover) | `|a−b|` | **ours** |
| `b4qLdjD8LP` "Difference Sudoku 06" | `|a−b|` | **ours** |
| `r9rLrppHpT` "Throuples" | `|a−b|`, plus V/X sum clues in the same grid | **ours** |
| `nd0191ecm9` / `f37rd0c6uu` / `twqc1a8ybe` / `55tm8zuuwb` | `|a−b|` = a constant, and each dot is labeled with it | **ours** |
| `24zhxatww7` "Sum or Greater" (clover) | `a+b` **or** `max(a,b)` | must NOT fire |
| `ck9j1oe9s0` "Rounding Error" (clover) | tens digit of `a×b` | must NOT fire |
| `m425nwqjyg` "The Greater" | `max(a,b)` | must NOT fire |

Every reading was **confirmed against the puzzle's own solution** (which rides along in the metadata —
see PROJECT_SUMMARY "Decoding ONE puzzle's payload offline"): scoring `|a−b|` over every dot gives
28/28, 7/7, 8/8 and 16/16 on the difference puzzles, and **0/24, 1/22, 0/16** on the three rivals.
Measured in the live DOM, the collector finds 18 dots on `b4qLdjD8LP` **and all 24 on `24zhxatww7`** —
so the geometry genuinely cannot tell them apart, and a geometry-only detector would over-remove on
two clover puzzles. That is the one failure mode the elimination contract forbids.

**Detection ladder** (`differenceDotClause` is clause-scoped — split on `. \n ;` — so a whisper
sentence elsewhere in the rules can never lend its "difference of 5" to a dot sentence):

1. a clause must state a **difference** (`DIFFDOT_DIFF_RE`) …
2. … for a **marker** (`DIFFDOT_MARKER_RE`: dot/circle/circled/clue/number/value) …
3. … sitting **between two adjacent cells** (`DIFFDOT_ADJACENT_RE`). This one requirement cut the
   catalog-wide fires from **32 to 15**, dropping differences that live somewhere else entirely:
   between cage sums (`MfhQqpqPHt`), along a sequence (`gir24mff1k`), inside one cell (`n2h6m5b7aa`),
   on an arrow (`7p6p7L2L8D`), between 2×2 squares (`F28G66PTLg`).
4. and NOT `DIFFDOT_LINEISH_RE` (whisper/thermo/arrow/cage, and every ≥ form — "at least", "or more",
   "minimum"). **`lines?`, not `line`** — the plural matters: `\bline\b` does not match "turquoise
   lines", which let the per-line difference rules of `s7221r2i0r` and `7D4Bdb3NJg` through until the
   catalog scan caught it.
5. and NOT `DIFFDOT_OUTSIDE_RE` (frame clues), NOT `DIFFDOT_KROPKI1_RE` (**a difference of ONE is a
   plain white Kropki dot**, and setters spell it out that way constantly — "digits separated by a
   white dot are consecutive (have a difference of 1)" — so without this the validator moved into
   Kropki's lane on a huge number of ordinary puzzles), and NOT `DIFFDOT_DEFERRED_RE` (the gap is left
   to the solver, so there is no label to read — `H3MfbFJ83R` "Manatee Meadow": "cells separated by an
   orange dot differ by the same value, to be determined", a same-difference-DOT variant).
6. **A surviving clause that also offers a RIVAL meaning → AMBIGUOUS** (`DIFFDOT_RIVAL_RE`: either /
   or the greater / larger / smaller / sum / total / product). `e13uslyl3l` "Difference or Greater" is
   the case: "the value in the circle tells you EITHER the difference …, OR the greater" — measured on
   its own solution, difference fits 15/32 and max 17/32, i.e. **neither rule alone**, so the puzzle
   really does hand the choice to the solver. `philip-newman/20250606-66` ("sum, difference, ratio, or
   product given by the dot") is the second. Ambiguous mode **requires a selection** and validates only
   dots whose BOTH cells are selected — the same policy whispers use, and the whole-clue contract.

Catalog-wide after all of that: **15 confident, 2 ambiguous** out of 6,260. Eleven of the fifteen are
genuine labeled difference dots; the other four (`QBNff6rPdR` "Rainbow Kropki" — gap given by the dot's
COLOUR, `2zsjgd6sfq` "Middle Distance" — gap given by a digit elsewhere, `L8t8jQ7Ljn` — diamonds not
circles, `17rhp0owyb` "Difference Fences" — drawn as edge segments) are **safe because they draw no
digit-labeled round border marker**, so the collector returns nothing and the mode falls to `none`.
That is load-bearing: the label requirement is the second gate behind the cue, not a convenience.

**BLACK markers are excluded.** Where a puzzle uses both, black is a RATIO and white a difference —
`nrGRHthTj2` "Kropki Kounting": *"digits separated by a black circle have a ratio of 1:N … by a white
circle have a difference of N"*. Reading a labeled black dot as a difference is a wrong answer, not a
weak one. **Roman-numeral labels are excluded too** (the label must match `^[0-9]{1,2}$`), which is what
keeps `r9rLrppHpT`'s V/X sum clues with the XV validator and its 3/6 dots here — one puzzle, two clue
types, split by the label alone.

**Known gap (deliberate):** a puzzle stating "white dot = difference 3" while drawing **bare** dots
would be read by the Kropki validator as consecutive — an over-removal. No catalog puzzle does this
(all four constant-difference puzzles label every dot), so no guard was added rather than change
Kropki's behaviour speculatively. If one turns up, the fix is to make `collectKropkiDots` skip bare
white dots when a confident non-1 difference clause exists.

**THE BORDER TEST IS THE ONLY THING SEPARATING AN XV FROM A CORNER CLUE — never loosen it.**
`rfijdcynhv` "Cross Sums" (clover) draws a bare **X at the corner of four cells**, meaning the two
diagonal *pairs* have equal sums; nothing to do with 10. Its X's sit on a gridline in **both** axes,
so `gridDist(cy) ≈ 0` instead of ≈ half a cell and both `onVert`/`onHorz` reject them. Measured after
the v3.171 widening: 12 X texts read, **0 detected**, every one rejected by that test alone (and
`ed0mko9d0b` reads 19 = 12 XIII + 7 VIII, `rjl0oqocet` reads 24 = 14 X + 5 V + 5 XV, lowercase
included — the payload counts exactly).
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
**A visible cage total is NOT proof of a `sum` — and reading it would be unsafe.** SudokuPad draws
a cosmetic underlay/overlay `text` anchored at a cage's top-left corner identically to a native
cage total, so a `style:'killer'` cage can *look* like a killer cage while carrying no `sum` at
all. `yiaonocy5d` ("...What?", a deliberate-troll 6x6) is the counter-example that says leave it
alone: cage `r5c1-r5c4` has no `sum`, is labelled **16** by an underlay at `[4.25,0.25]`, and the
puzzle's own `solution` puts **14** there — the rules list never mentions cage sums, so the label
is a decoy. Inferring sums from cage-corner text would fire this validator on a false total and
eliminate correct candidates. Only `cage.sum` / `cage.value` counts. Such a cage is nonetheless
COUNTED by `countSumlessKillerCages` so the menu row still appears — see below.

## Solution-refuted clues — mute, never announce (v3.182) — ⚰️ DELETED v3.189

> **`muteSolutionRefuted` no longer exists.** Kept below as the record of what was built and
> measured. VALIDATOR_POLICY.md §5: the solution may certify a puzzle and identify a ruleset, but it
> **may never silence a check** — a muted clue came back inside a green "checked 29 cages, nothing to
> remove", which diagnoses (P2) and lies (P3). All six call sites are gone and no validator adds
> muted clues back into its count; the harness asserts both, so the shape cannot come back quietly.
>
> **What survives.** Point 1 below (detection means "is one DRAWN") is still right — sum-less cages
> keep the Cages row listed. What changed is that they are now reported **UNCHECKED** rather than
> counted as checked, and they *are* explained: the "no explanatory note" rule in point 1 was
> overruled, because a player told "nothing was checked" has learnt nothing about *why*, while being
> silently told "all clear" is the far worse failure. The 17.1% measurement stands and now argues for
> the §6 multi-ruleset cage reading rather than for going quiet. `solutionDigitsFor` is deliberately
> kept, unused, for that work.

**The menu was an oracle.** A validator was listed iff its clue was *checkable*, so on a puzzle
with decoy clues the dropdown told the player which drawings were real — earlier and more
reliably than the puzzle intended. `yiaonocy5d` ("...What?") is the case that forced this: five of
its seven drawings are decoys, and the menu both omitted the fake cage and arrow (revealing them)
*and* listed the fake thermo, quadruple and difference dot (miseducating about them, and
eliminating candidates the rules never licensed).

**Two independent fixes, neither of which classifies the puzzle.**

1. **Detection means "is one DRAWN", not "can we check it."** `countSumlessKillerCages` counts
   killer-style cages with no readable total so `detect()` still lists Cages; they are counted,
   never validated. Same shape as the bulbless thermo — and deliberately with **no explanatory
   note**, because "this cage has no total" leaks exactly what the row's presence restores.
2. **`muteSolutionRefuted(units, holds)`** drops units the puzzle's own `metadata.solution`
   contradicts. Wired into cage, thermo, arrow, Kropki, XV and difference-dot computes; each
   passes a `holds(unit, grid)` predicate. `getPuzzleSolution` trusts a solution ONLY if it is
   complete, plain-digit and a valid latin square (260 of the catalog's 3,972 are partial).

**Why "we misread it" vs "it's a decoy" doesn't need answering.** Both call for the same response —
stop using the clue, say nothing — so the ambiguity that makes this useless as a wrogn *detector*
is free when it is used as a *mute*. Refuted units stay in the reported COUNT and contribute no
removals, so the toast reads exactly like any other "nothing to remove" run.

**Fail open, always.** No solution / an unreadable cell / a `null` verdict / a throwing predicate
all KEEP the unit, so on the ~37% of puzzles without a solution behaviour is unchanged. Harness
cases cover every one of those paths.

**This is mostly a CORRECTNESS fix, not an anti-spoiler one.** Measured by `tools/solution_check.py`
over 3,688 solution-bearing puzzles: **17.1% of killer cages are refuted** (124 puzzles). A hand
read of 24 of them found **no misparses** — every one was a non-standard cage rule ("all clues work
modulo 9", "the total of all but one", "either sum or multiply", "digits in the top left must
APPEAR in the cage", "Scrambled Cages") or a declared liar mechanic. Crucially, many are NOT caught
by the v3.157 structural check: *Sigma or Pi* has a 4-cell cage marked 30 whose real rule is
PRODUCT, and 6+7+8+9=30 is a legal sum — so before v3.182 the validator eliminated against a rule
the puzzle never stated.

### Non-sum cage variants (v3.183) — a cage corner is not always a sum — ♻️ REWORKED v3.190

> **The facts below stand; the "and stay silent" response does not.** A zero-combination cage is now
> reported **UNCHECKED** (§3) — dropped from the maths as before, but named in the toast and absent
> from the green total. Silence was the false all-clear: the cage landed in `cageCount` and the run
> said all clear over a cage nothing had looked at.
>
> **`67rr7DMJDh` "121" was miscategorised as a decoy and is not one.** One 36-cell cage totalling
> 121, whose own published solution sums to exactly 121 over those cells — an honest repeats-allowed
> sum the rules never spell out, because at 36 cells over 9 digits repeats are unavoidable. It is a
> **capability** gap, filed under §6, not a wrogn puzzle. `computeCageRemovals` now splits it out
> ahead of the combination search: **more cells than digits ⇒ repeats forced ⇒ a distinct-digit
> reading cannot apply.** That is positively identifiable with no solution and no rules cue at all —
> pure pigeonhole the player can see — so it earns its own reason string. We say *"repeats are
> forced"*, never *"this is a repeats-allowed sum cage"*: the pigeonhole is arithmetic, the ruleset
> is a guess, and guessing it would validate under a rule the puzzle never stated.
>
> Reason strings come from `cageUncheckedWhy(notSum, repeats, noTotal)`, harness-pinned.

A killer-style cage's corner number can be a **product** (`26e1w4r81e` "The Devil is in the

A killer-style cage's corner number can be a **product** (`26e1w4r81e` "The Devil is in the
Details", 666 over 5–8 cells), a **difference** (`2mcr6exf3p` "Sub-Zero", corners of −1/−4/−7), a
sum with **repeats allowed** (`36fnN33h7L` "Leap Day", 29 over a 14-cell cage), a **digit list** (a
4-cell cage cornered "4456" = the digits it holds — and `Number('4456')` is a perfectly finite
"total"), or a **partial list** (a lone "9" meaning "at least one 9 is in here"). `cage.unique ===
false` does NOT identify these: the catalog sets it on just **51 cages in total**, so
repeats-allowed cages overwhelmingly look standard to us.

**What changed:** such a cage usually yields ZERO combinations, and used to be reported through
v3.157's `invalidClueMsg` — "⛔ no arrangement of digits can satisfy it". For cages that message is
alarming *and factually wrong* (a 666 product cage is perfectly satisfiable), it fires on **888
cages across 172 catalogued puzzles**, and it points the player straight at the cage on a puzzle
where the corner number is the joke. Zero-combination cages are now **counted with the other
unusable cages and silent**. v3.157's loud path is untouched for every other clue type — for those,
zero-combination really is the rare detection bug it was written for.

**Residual gap, knowingly left open:** a variant whose corner also happens to be a legal
distinct-digit sum (a 3-cell PRODUCT cage cornered 24, when 7+8+9 = 24) still validates as a killer
cage. Only the solution mute catches it, so on a puzzle with no published solution the wrong
eliminations remain. **A rules-cue detector was measured and rejected** — over the 651
solution-bearing puzzles with readable cages it caught 43 variants, missed 81, and raised 29 false
alarms (60% precision, 35% recall); greying out the validator on 29 honest killer puzzles costs
more than the gap it closes. Revisit only with a much sharper cue.

### Can we just IDENTIFY the cage rule? Measured, and no (v3.184)

The obvious next step is to stop guessing and *classify* the corner number — product, difference,
repeats-allowed sum, digit list, partial list — then validate under whichever reading is right.
`tools/cage_variants.py` measures whether that is possible, using each puzzle's own solution as
ground truth over the 682 solution-bearing puzzles with readable cages (6,413 cages with a numeric
corner; 352 more carry `<=10`, `x` or a label and are never validated anyway).

**What the corner really means** — 82.1% distinct sum, 10.4% *none of the six readings*, 3.2%
partial list, 1.7% digit list, 1.0% difference, 0.9% product, 0.8% repeats-allowed sum.

**Why classification fails.** Take the 602 cages that yield zero distinct-sum combinations — the
ones v3.183 goes silent on — and ask which *other* readings are arithmetically possible:

| alternatives still possible | cages | |
|---|---|---|
| 0 | 63 | 10.5% |
| **1** | **230** | **38.2%** |
| 2+ | 309 | 51.3% |

So only 38% narrow to a single candidate reading at all — **and when they do, the solution confirms
that reading just 58.3% of the time (134 of 230)**. Requiring a rules cue as well changes nothing:
it fires on 24 cages and is still 58.3% correct. A classifier built on this would validate under the
wrong rule roughly two times in five, i.e. over-remove — the one direction the contract forbids.
The 10.4% "no reading explains it" bucket says why the ceiling is so low: the variant space is open
-ended (`0zhq0og7uz` "Outbreak!!" and `1pdzuv445k` "Zombie Drome" make a cell's *value* differ from
its digit; `ay6r6mmu5w` "Close Enough" and `uqvv06s42j` "Knapp Daneban Killer" are off-by-one sums;
`clover/20250731-max-cage-sudoku` totals only the largest). No fixed list of readings closes it.

### The gate that DOES work: one unreadable cage indicts the whole puzzle (v3.184) — ⚰️ REMOVED v3.190

> **The measurement is real; the trade was wrong.** 71% recall at 83% precision means **14 honest
> puzzles silently lost their cage validator** — a Road A cost (a working tool disappears, and the
> player is never told) paid to tidy a **Road B** case (§4): puzzles whose rules *state outright*
> that their cages work differently, so the player already knew the row was useless. Road B decisions
> are cheap and must not be bought with Road A costs. Replaced by per-cage UNCHECKED above, with §6's
> ruleset identification as the real cure.
>
> **Accepted regression, do not "fix":** a variant-cage puzzle with no published solution will again
> over-remove on those cages whose variant total happens to be a legal distinct-digit sum. That is
> P1 — every clue is assumed true and a wrong reading is allowed to fail — and highlight mode is what
> makes it affordable: a wrong elimination is orange the player can see and reverse, not a silent
> deletion.

The same measurement found a bigger problem than the silent cages, and a fix for it.

**The risk today:** of the 5,811 cages that *look* like ordinary killer cages (a distinct-sum
combination exists, so the validator runs), **556 — 9.6% — are refuted by the puzzle's own
solution.** By puzzle: **99 of 598 (17%) contain at least one such cage, and in 43 of them EVERY
cage is refuted.** That last figure is the point — **a non-sum cage rule is a puzzle-wide rule.**
A Knapp-Daneben / Multiplication-Cages / Max-Cage puzzle applies its variant to every cage it
draws; the ones that still yield a legal distinct-sum combination are not honest killer cages, they
are the ones whose variant total happens to collide with a real sum. v3.183 mutes the impossible
ones and keeps eliminating on their neighbours.

**The gate:** if the puzzle has ≥1 arithmetically impossible cage, don't validate *any* cage.
Measured: **catches 70 of the 99 (71% recall) at 83% precision** — 14 honest puzzles lose their cage
validator. That is the right side of the trade, and the same policy as everywhere else in this file:
a validator that declines to run costs a convenience; one that removes the correct digit costs the
solve.

**Scoped to puzzles with no published solution**, because where a solution exists the v3.182
per-cage mute is strictly better — surgical, and measured on exactly this population. **46% of the
catalog's 1,258 cage puzzles publish no solution** (577), and they are the entire reason this
exists.

The census is over the whole puzzle, never the selection: "are these corner numbers sums?" is not a
question a hand-selection can change the answer to. The outcome is reported through the standard
`note` channel rather than silently — this one is safe to say out loud, because it restates
arithmetic the player can do themselves (a 14-cell cage marked 29 is visibly not a sum of different
digits) and names no cage. Contrast v3.157's "⛔ impossible", which pointed straight at the joke.

**Still open:** the 29 puzzles with no arithmetic tip-off at all (`0zhq0og7uz`, `ay6r6mmu5w`,
`5kx4d90kcm` "Sigma or Pi") and no solution. Nothing available to us distinguishes those from an
honest killer puzzle. *(Where a solution DOES exist, the v3.186 probe below now catches them.)*

## The solution probe, and what to do about a refuted validator (v3.186)

v3.182 asks "does the answer satisfy this CLUE?" and mutes the ones that fail. The menu needs the
question one level up: **is this validator's rule the rule the puzzle is actually using?**

### The probe — no new per-clue predicates

`buildSolutionProbeState` builds a synthetic board where every cell's only candidate is its
**solution digit**, then `probeInfo(def)` runs `def.compute(null)` **unchanged**. A correct reading
removes nothing — the answer supports itself. A reading the answer contradicts finds the solution
digit unsupported and removes it. So "our reading of thermos is wrong here" is decided *by the
thermo validator*, and a validator added tomorrow is probed correctly with no one remembering to
write its predicate — the same FOOLPROOF PRINCIPLE the eyeball preview follows.

Three one-line hooks: `readValidatorBoardState` returns the synthetic state, `getFogTester` goes
blind (a probe asks about the finished grid, where nothing is hidden), and `muteSolutionRefuted`
goes **inert** (muting the failing clues is precisely what would hide the answer).

**Pin the digits as CENTRE marks, not values.** A placed value is not a candidate, so nothing could
ever be removed from it and every validator would report a clean bill of health.

### Magnitude, not a boolean

`probeInfo` returns `{verdict, bad, total}` — how many of the validator's **clues** the answer
refutes, grouped by `validatorClueCellGroups` (the same reader the missing-candidates warning uses).
One bad cage among 29 (`bH8FJtL3F3` "Killer Sudoku") is a decoy that v3.182 already mutes correctly;
16 of 19 (`ay6r6mmu5w` "Close Enough") means the rule itself is not ours. `probeSystematic` splits
them at half — a blunt line, and nothing hinges on it: the real distribution is bimodal (43 of the
99 refuted-cage puzzles refute **every** cage).

### The three-way policy — `validatorTrust`

The cost being managed is not correctness, it is **information**: a row that changes state tells the
player something, and on a puzzle whose point is a hidden twist that is the spoiler.

| trust | when | what the menu does |
|---|---|---|
| **ok** | probe clean, no solution — **or** refuted but the rules never NAME this clue type, or the refutation isn't systematic | nothing changes; v3.182's per-clue mute quietly keeps it from eliminating |
| **grey** | refuted **and** the rules DECLARE that clues lie or that a clue's type is the solver's to pick (`rulesDeclareUnreliable`) | disabled, rescued by "Validate selection only"; excluded from run-all **and** from ↻ auto-update |
| **drop** | refuted systematically **and** the rules DO name this clue type (`validatorTypeNamedInRules`) | removed from the menu |

**The `ok` row is the interesting one.** A thermo is drawn; the rules say only *"circles are odd,
lines are German whispers, and those are the only rules"* — so the thermo is really a circle plus a
line. Saying anything would hand the player the twist, so the row behaves completely normally and
the per-clue mute silently ensures it eliminates nothing. **Deliberate under-informing.**

**`drop` is the ONE exception to v3.182's "an absent row is a spoiler".** It is not a spoiler when
the rules themselves already said it: `ay6r6mmu5w` "Close Enough" states outright that cage clues
are sums *rounded to the nearest multiple of 5*. A greyed row invites a click; here there is nothing
to offer.

Everything needs a trustworthy solution to reach at all (`probeInfo` is `unknown` without one), so
on the ~46% of puzzles that publish none, **nothing here fires and the menu is exactly what it was.**

### The cues

`WROGN_DECLARED_RE` (the genre's own "wrogn", liar/lies, "false clue", "exactly one of … is false")
and `TYPE_CHOICE_RE` ("sum or product", "either sum or multiply", and the general form
**"must deduce whether"** — `5kx4d90kcm` "Sigma or Pi"), OR'd with the existing `SELF_DEDUCTION_RE`
for the line-validator form.

**These cues never act alone** — they only interpret a refutation the solution has already
delivered — so a false positive on an honest puzzle costs *nothing*. Measured over the 3,688
solution-bearing puzzles with rules text: the cue fires on 1.9%, of which the 49 on puzzles where
nothing is refuted never reach the branch at all. That property is the design, and it is why a
standalone precision figure for this cue would be meaningless.

### Measured on cages (`python tools/cage_variants.py --policy`)

Cages are the one clue type reproducible outside the browser (identical `r1c2` parsing, no
geometry), so they stand in for the rest. Of 653 puzzles with readable cages and a solution:

| outcome | puzzles | |
|---|---|---|
| **grey** | 17 | "Liar Zone Sudoku", "Liar Killer", "Wrogn Fogn" ×2, "Escape the Foggy Liar", "Sigma or Pi", "TomTom Sudoku" — the genre, cleanly |
| **drop** | 104 | Zone Sudoku ×6, "Semikiller", "Knapp Daneben Killer", "Max Cage Sudoku", "Modular Cages", "Round Off Sudoku", "Count Different Sudoku", "The Devil is in the Details" (product), "Leap Day" (repeats). Nearly all at ratio **1.00** — every cage refuted |
| **keep** | 16 | the partials: `bH8FJtL3F3` "Killer Sudoku" at 1/29, `blobz/orchard` at 4/11 — decoys, correctly left to the per-clue mute |

The thin case is a puzzle with a single refuted cage and cages named in the rules (`67rr7DMJDh`
"121", 1/1): ratio 1.00 on a sample of one, so it drops. There is no evidence available to tell
that apart from a systematic variant, and the cost is one menu row.

**Relationship to v3.157 (fail loudly).** A *structurally* impossible clue is still reported via
`invalidClueMsg` — that is a detection bug we want to hear about. A *solution-refuted* clue is
silent. The distinction: structural impossibility is mark- and solution-independent and always
means we misread something; a refutation may equally mean the puzzle is lying on purpose, and
announcing that is the spoiler.

**HARD RULE: the solution may only ever DISABLE a check, never inform one.** No solution digit may
reach a removal, a candidate set, or any player-visible string. Breaking this turns a validator
into a solver.

**Superseded:** the standing "validators NEVER special-case liar/wrogn mechanics" decision
(2026-07-06, below) still holds for *reasoning* — no validator weakens a rule because a puzzle
might be lying. v3.182 does not reason about lies; it declines to act on a clue the finished grid
disproves. Cue-based wrogn detection was **considered and rejected**: only ~15 of 6,260 catalogued
puzzles self-identify (`wrogn` 3, `liar` 4, `wrong` 8 — one of which, *Big Fish*, is a false
positive: "what's wrong with you"), `lie`/`lying` is unusable (31 of 50 hits are positional, "digits
that *lie on* the line"), and a false positive spoils an honest puzzle — strictly worse than the
leak being fixed. `yiaonocy5d` self-identifies not at all, so cues would not have helped it.
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
mis-flag palindromes). `getCosmeticLines` = every stroked `fill:none` clue path in the
`LINE_DOM_LAYER_IDS` layers — `#arrows`, `#overlay`, `#underlay` (**DOM only**; the `cp.lines` branch
was dead and is gone since v3.170) — read from the stroke **ATTRIBUTE** (author's pre-shading
colour); `detect: whisperDetected` = mode≠none. Validation is
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

## Counting circles (v3.177) — the first WHOLE-PUZZLE clue

*A digit in a circle indicates exactly how many circles contain that digit.* Design work and the
full catalog measurement are in [`COUNTING_CIRCLES_DESIGN.md`](COUNTING_CIRCLES_DESIGN.md); this is
what shipped.

**The rule is one equation over the whole grid.** If every circle holding `d` requires `k_d = d`,
then for each digit either `k_d = d` or `k_d = 0` — so the digits used in circles form a subset `S`
of the digit set with **`Σ S = n`** (the circle count), each `d ∈ S` appearing exactly `d` times.
Verified against nine puzzles' published solutions (`i9wx9vdy41` 1+2+…+8 = 36, `dGL3DgJgJd`
7+6+5+4+3+1 = 26, `xgmmht4odf` 9+8+6+4+2 = 29, `y6ivkzi761` 5+4+3+2+1 = 15, `gjyydhf4pm` 16,
`swtm07rplk` 14, `blobz/hippo-birdie` 14, `blobz/offset-circles` 9, `miv6k9rwi0` 6).

It is strong enough to deduce with no pencilmarks at all: three circles admit only `{3}` and
`{1,2}`, so **4-9 die in every circle on sight**. And `0` can never sit in a circle (it would assert
"zero circles contain 0" while being one), which `countingCircleSums` enforces by filtering 0 out —
a free elimination on `blobz/hippo-birdie`, whose digit set is 0-8.

**ONE CLUE, ONE UNIT — the thing that makes this validator structurally different.** Every earlier
validator has many units, which is what makes selection-only and the per-clue fog gate meaningful.
Here the whole circle set is a single unit, so `computeCountingCircleRemovals` passes *every* circle
key to `unitFilter` in one call: a partial selection, or one fogged circle, skips the run entirely.
Counting a subset would pose a constraint the puzzle never did. Three consequences, all now written
into the ADDING A VALIDATOR checklist as step 3a:

- `validatorClueCellGroups` returns **one** group (the eyeball still gets one object per circle so
  it can ring each);
- the registry entry sets **`noSelectionRescue: true`** — an AMBIGUOUS row stays disabled even with
  "Validate selection only" ticked, because selecting cells cannot make an unreadable whole-grid
  rule readable;
- **`ambiguousTip`** replaces the default greyed-row tooltip, which says "which lines are the …s
  isn't stated" — untrue for a clue with no lines. The compute returns `wholeClue: <why>` and both
  toast paths render it via `wholeClueMsg`.

Both fields are opt-in; omitting them is exactly the pre-v3.177 behaviour.

### A BARE BULB IS NOT A CIRCLE, A STROKED ONE IS

`countingCircleClues` de-duplicates markers **by cell**, then drops a cell only when it is a
thermo/arrow bulb root **and nothing stroked is drawn on it**. That single rule settles the two
puzzles that look contradictory:

| puzzle | bulbs | counting circles | naive all-cell-centred | shipped |
|---|---|---|---|---|
| `y6ivkzi761` | 6 × `#underlay` 0.85cs `#CFCFCF` **stroke:none** | 15 × `#overlay` 0.93cs white, stroke `#000000` | **21 → invalid** (1:3, 2:5, 3:4, 4:4, 5:5) | **15 ✓** |
| `dGL3DgJgJd` | 4 × `#underlay` 0.85cs `#CFCFCF` **stroke:none** | 26 × `#underlay` 0.85cs `#CFCFCF`, stroke `#000000` | 26 (bulb cells carry BOTH rects) | **26 ✓** |

Drawing an extra ring on a bulb is how a setter says *"this bulb counts too"* — `dGL3DgJgJd`'s rules
say it out loud. `getCellCenteredCircles` gained a `stroked` field for this and **nothing else reads
it**; it must never become a general filter, because genuine unstroked clue circles exist
(`gfr7xipywo`'s grey odd-circles, which a stroke-gated reader returns zero of).

**The subtraction depends on `getThermos()` claiming cosmetic bulbs, and it does** —
`getThermoBulbCentres` scans `#underlay` for 0.55–1.05cs circular rects, rejecting white and black
fills, so `y6ivkzi761`'s six `#CFCFCF` bulbs are candidates while its white `#overlay` counting
circles are not even considered. On `dGL3DgJgJd` the counting circles ARE `#CFCFCF` `#underlay`
look-alikes, so they all become bulb candidates — harmless either way: if a shaft then has a bulb at
both ends the chain is rejected and nothing is subtracted (26 ✓), and if it isn't, the claimed root
carries a stroked circle and is kept (26 ✓).

**Arrow bulbs are never subtracted on the stroke test.** `zdmnz4qx5m` states *"Arrow circles count
as circles for this rule"* and draws its 9 arrow circles pixel-identically to its 15 plain ones
(`0.80 ROUND #FFFFFF s=#555`) — geometry cannot separate them and must not try. `df7B2RJ4gB` is the
puzzle whose arrow circles *don't* count, and there the rules' noun is `diamond`, which
noun-dispatches to `getCellCenteredDiamonds` and never looks at a circle.

### Detection — the cue is the SELF-REFERENCE, and it is anchored

`countingCircleClause` is clause-scoped and returns `{ clause, word, stem, scoped }`. `word` is the
puzzle's own singular noun (what the self-reference looks for — `blobz/hippo-birdie` counts
*balloons*, not circles); `stem` is the reader key. `COUNTCIRCLE_STEMS` is a written-out singular
map on purpose: **"diamond" ends in a `d`**, so the obvious `/(?:es|s|d)$/` strip yields "diamon"
and the noun can never match itself again.

Three parts, all required: a **container** (`digit … in a <adj> <noun>`, or the equally common
adjective-first `a circled digit`), a **count trigger**, and the counted thing being the *same
noun, containing that digit* — matched **anchored at the trigger's end** in two attested shapes
(`how many CIRCLES contain…`, `how many TIMES that digit appears IN CIRCLES`).

The anchoring is what does the work. It rejects the three rival rules for free, because what follows
their trigger is `cells`, not `circle`: `sotpbtg8o1` ("the number of **cells** that the circle
sees"), `m73tnQmbbd`, `vgbfcjxvav`. Two further catalog rivals count *markers* rather than
markers-holding-the-digit and are rejected the same way: `laj1tzweyh`, `q3b8weqj5f`. **`with\b`
needs its trailing boundary** — without it "gold rings **with**in its region" reads as a containment
phrase and `laj1tzweyh` fires (caught by the harness, not by eye).

**Nouns with no reader are deliberately absent** from `COUNTCIRCLE_NOUN_SRC`: mushroom
(`blobz/centipede`), tent (`nmhixakego`, which the player draws), card suit (`pbz4ij1joh`). A listed
validator that can never find its clue is worse than an absent row.

**Catalog-measured (`node tools/counting_circle_recall.mjs --guarded`, 4,824 puzzles with rules):
60 fires, 50 clean, 10 guarded, and ZERO false positives** — all 7 clean fires the catalog left
untagged are textbook counting circles. Nouns: circle 57, balloon 1, diamond 1, football 1. The
`counting_circle` tag itself is keyword-derived and noisy (it fires on the word "counting"), so
recall against it is not the headline number.

### The five guards

| guard | signal | puzzles |
|---|---|---|
| **SEMI** (blob-scoped) | `semi-/half-circle` | `j27rj7frco` — drawn as 56 whole circles + **40 half-cell white masking rects**; the true count is 16 full + 40 halves |
| **NEG** | `do(es) not / not contain / other than` | `4mtPGFb6dm` "Circular Unreasoning" — counts circles that DON'T hold it |
| **COLOUR** | `colou?r(s|ed|ing)` | 7 puzzles; `ah1c5p6zcr` has the player *choose* the colouring. A later extension could partition by drawn fill/stroke for the other six |
| **DEFERRED** | on the loop / (un)shaded / revealed / within its region | `2vyqqhy6ky`, `belm8cdujp`, `tc5dhvo13g` — which circles are in the set is the solver's job |
| **INCOMPLETE SET** | rule **unscoped** AND `getOffCellRoundMarkers` non-empty | `gfr7xipywo` — 9 readable cell-centred odd-circles plus **7 quad circles on grid corners**, both counting. Reading only the 9 scores {5:2, 7:3, 9:4} against its solution: a wrong answer, not a weak one |

The last guard checks **scoping first**, and that ordering is load-bearing: `blobz/offset-circles`
also has off-centre round markers (9 offset black circles, 4 big pink renban rings, 4 Kropki dots),
but its rule says "**blue** circles", which makes the rest none of our business — and it then scores
4+3+2 = 9 exactly. `getOffCellRoundMarkers` ignores anything under 0.4 cs so Kropki-sized dots never
trip it (which is also why `df7B2RJ4gB`'s 5 black dots are irrelevant there).

**Everything else is greyed for free** because the reader returns nothing: `NbqQ2HhP4P` and
`nmhixakego` (player draws the markers), `hqa07qdm2h` (all circles outside the grid), `n4FR3FtL4D`
(letters), `pbz4ij1joh` (card suits). `< 2` circles → `none`, so the row is simply not listed.

### Algorithm — and the v3.177 freeze that reshaped it

`countingCircleSums` enumerates every positive-digit subset summing to `n` (≤ ~30 over 1-9, no cap
needed). `countingCircleModel` precomputes, once per run, the conflict adjacency, per-cell domain
**bitmasks**, and `maxIndep`. `countingCircleFill` seats one subset and returns a **witness**;
`countingCircleSeatable` classifies every subset; `countingCircleSupport` reuses witnesses (one
seating supports every `(cell, digit)` pair it contains) and only searches for unwitnessed pairs.
Iterated to a fixpoint.

**v3.177 froze the tab on the first real puzzle**, and fixing it changed three things that are each
worth keeping in mind for any future search:

1. **THE SEARCH IS DIGIT-MAJOR, NOT CELL-MAJOR.** Assigning digits to cells one cell at a time gives
   MRV nothing to work with: on a pencilled grid every circle starts with the same `|S|` options, so
   the heuristic picks arbitrarily and the tree is explored almost blind. On `dGL3DgJgJd` the subset
   the published solution uses (`1+3+4+5+6+7 = 26`) was **not found in five million nodes**. The
   problem's real shape is *"choose which `d` cells take the digit `d`"* — an independent set per
   digit, **largest digit first**, so the tightest choice is made when the board is emptiest and a
   wrong one is refuted at once. Same puzzle, same budget: **55 nodes**.
2. **A CLIQUE-COVER BOUND (`maxIndep`) refuses whole subsets before any search.** No independent set
   is larger than the number of cliques covering the graph, so a digit `d > maxIndep` is instantly
   impossible. On real circle sets the cliques are essentially the occupied rows — `dGL3DgJgJd`'s 26
   circles span 8 rows, so every subset containing a 9 dies for free. It is also **mark-independent**,
   so it survives a starved run (the harness asserts exactly that).
3. **A SUBSET IS LIVE UNLESS *PROVED* INFEASIBLE — the soundness direction, which v3.177 had
   backwards.** `allowed` is the union of digits over live subsets and a candidate is removed when no
   live subset offers it, so dropping a subset we merely *failed to seat in time* removes digits the
   puzzle permits. Now a timeout leaves the subset live (and any digit reachable only through an
   unsettled subset is presumed supported), so **starvation can only cost eliminations, never invent
   them**. Per-search caps are per-subset and per-pair rather than one shared budget, so a single
   hard search can't starve every later one.

Costs are bounded by one 600 ms wall-clock deadline (`CC_BUDGET_MS`) covering the structural pass and
every fixpoint round together — the search is synchronous on the UI thread, so that, not a node
count, is the guarantee worth making. Measured after the rework: 14 circles < 1 ms, 15 circles ~1 ms,
26 circles 16 ms, 36 circles 3 ms.

**Structural test runs first, mark-free** (`st.fullSet` in every cell): if every subset is *proved*
infeasible, the clue is dropped and reported as `invalid` — our misread, not the puzzle's error. A
bail proves nothing and must never read as impossible. A set seatable in principle but not under the
current marks is a real contradiction and goes down the normal emptied-cells red-error path.

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
   - **AUTO-FILL CATCH-UP (v3.180)** — `validatorAutoCatchUp()` runs the pass *now*, skipping both
     the 150 ms debounce and the `actionInProgress` deferral (`runAutoValidators` = guards +
     `runAutoValidatorsNow`; the catch-up calls the latter). It exists because Auto-fill
     (`fillSingleCandidates`) holds the lock for its whole cascade **and** stales every flag with
     the first digit it places, while `fsScanValid` trusts only *fresh* flags — so mid-run the
     cascade went blind to the validators, stopped early, and the deferred pass then woke up and
     produced the very single it needed, forcing the player to press the button again and again.
     Auto-fill now catches up before its pre-run gate and, crucially, **before accepting "stuck"**:
     no singles ⇒ catch up ⇒ re-analyse ⇒ only then give up. No infinite loop, because continuing
     requires a new single and every single consumes an empty cell. Never place the catch-up in
     the *per-placement* path — a full fixpoint per digit is the thrash the debounce exists to
     prevent, and the stale-flag blindness only ever costs progress, never a wrong placement (a
     stale-ignored candidate makes a cell look like it has MORE options, so it just isn't a single).
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
**reason from**, via `validatorHiliteRuledOut`). Four properties carry the design:

0. **ORANGE IS NOT RED (v3.181) — the rule that decides how a new reader should treat it.** Red is
   SudokuPad's verdict about the board *as it stands*; orange is **our** verdict about a candidate
   set a caller may be about to rebuild. So the test is what the function is asked to do, not how
   invalid the mark is:
   - **Asked to REMOVE what is wrong → orange counts as invalid, same as red.** Clear, Clear All,
     `countVisibleConflicts`, and the reasoning readers below.
   - **Asked to RE-DERIVE a cell's candidates → drop our verdicts for those cells first and let the
     marks come back plain blue.** Only **Fill** does this today
     (`validatorHiliteClearCells(selected)` in `fillSelectedCellsWithCandidates`, run *between* the
     fill phase and the sweep). Without it Fill was self-defeating: it re-added a flagged digit and
     its own sweep — which honours orange, stale flags included — deleted it again, so a digit a
     validator had ever flagged could never be filled back in. What survives Fill's sweep is now
     only SudokuPad's red conflicts. `validatorHiliteSnapshotFlags` / `…RestoreFlags` put the orange
     back if the sweep aborts and the board is reverted, so "everything was reverted" stays true.
   - **A ↻ auto-update re-flags a freshly filled cell on its next pass.** That is intended and is
     the *only* thing allowed to re-orange a fill — see also the no-memory rule (2b).
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
2b. **…but a flag has NO MEMORY of a candidate that is gone (v3.179).** "Persist" means *until the
   mark itself goes*. `validatorHilitePruneRemoved` runs first in `validatorHiliteOnBoardChange` and
   **deletes** any flag whose `col,row,digit` no longer exists as a centre tspan — deleted by hand,
   swept by Clear, or removed by the validator itself. Re-entering that digit later is a **new**
   candidate and comes back plain; only ↻ auto-update re-judges it, which is the point of ↻ being a
   toggle. Two consequences worth knowing: **Fill was unusable without this** — it re-added the
   digit, the surviving flag re-painted it orange, and Fill's own invalid-sweep (which honours
   *stale* orange too, via `validatorHiliteHas`) deleted it again, so those cells could never fill;
   and **Ctrl+Z does not bring the orange back**, since the flag died with the mark. A cell holding a
   **value/given is exempt** — SudokuPad drops its centre tspans from the DOM while a digit sits
   there and restores them on clear, so pruning them would make typing a digit silently forget every
   flag in that cell. Because stale flags must now be watched too, `validatorHiliteWatch` keeps the
   observer connected while **any** flag exists (was: any *fresh* flag) or any ↻ is on.
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

### The third outcome — UNCHECKED (v3.188, the reporting half of the contract)

The paragraph above says "ambiguous detection → skip the clue". **Skipping is allowed; skipping
*quietly* is not.** Through v3.187 a skipped clue had nowhere to go but the checked total, so
"couldn't read it" surfaced to the player as "checked it, nothing to remove" — a false all-clear,
and the failure [`VALIDATOR_POLICY.md`](VALIDATOR_POLICY.md) §3 exists to prevent. Every clue a run
touches now lands in exactly one of three buckets:

| outcome | meaning | reported as |
|---|---|---|
| CHECKED — CLEAN | read under a rule we trust; every candidate supported | counts toward the green total |
| CHECKED — VIOLATED | read under a rule we trust; candidates removed / flagged | eliminations, loud |
| **UNCHECKED** | we could not read it under any rule we trust | **counted separately and named**, never green |

**Contract.** `compute()` returns `unchecked` (a count) and `uncheckedWhy` (the reason) on **every**
exit path, the `<none>` ones included; absent means 0. `<unit>Count` is the **checked** count and
never absorbs an unchecked clue. `uncheckedWhy` is one lowercase clause, no trailing stop — it
renders inside parentheses.

**Colour tracks how much of the run you can trust, not what it found.** CLEAN and VIOLATED are both
the tool succeeding and share the green; the player already sees which happened from the board.
Green = every clue checked. Amber = qualified (something unchecked, or the pre-existing
missing-candidates case). Red = a real error (an emptied cell, or `invalid` — structurally
impossible as read).

**Wording** (policy §8 q2): state arithmetic the player could verify themselves, never a diagnosis.
*"their corner number is not a sum of different digits"* ✅; *"they are decoys"* ❌ — that is the
answer, and diagnosing is the solver's job. The count does point at those clues; the leak was
weighed and accepted because it happens often enough on ordinary puzzles to tip nobody off.

Runners: `uncheckedMsg` / `checkedPhrase` build the strings (`"12 of 14 cages"` appears as soon as
anything goes unchecked, so a partial run cannot render as a whole-puzzle all-clear).
`runAllValidators` aggregates **per clue type** — otherwise one validator's abstention would
disappear into another's clean result, a brand-new false-green channel.

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
| **Difference dot** | the labeled difference is not `|a−b|` for any two **distinct** digit-set digits (over 1-9: 0, or anything ≥9) | **new** v3.172; same reasoning as XV — the two cells are orthogonally adjacent so they must differ, making a 0 gap impossible and 9+ off the scale. `24zhxatww7` actually draws two dots labeled 9, so this fires on real data if the cue is ever loosened |
| **XV / Roman numeral** | the numeral's total is not the sum of any two **distinct** digit-set digits (over 1-9: anything outside 3…17) | **new** v3.171; the clue's two cells are orthogonally adjacent, so they share a row or column and MUST differ — a total needing a repeat (2 = 1+1, 18 = 9+9) or lying off the scale is unsatisfiable however the grid is filled. Mark-independent, and conservative because any legal fill exhibits such a pair. This is also what makes the widened numeral set safe: "II" or "XVIII" is dropped + reported, never propagated |
| **Counting circle** | no positive-digit subset summing to `n` can be SEATED with every cell free (`countingCircleSupport` run mark-free) | **new** v3.177; two ways to fail — `n` past `Σ(digits)` (46 over 1-9, 37 over 0-8) makes the sum itself unreachable, and a reachable total can still be unseatable (`n = 45` needs nine mutually non-conflicting circles holding 9). Conservative: any legal grid exhibits such a seating, so this only fires when the circle set we read is wrong |
| **Palindrome** | a fold pair (cell `i`, cell `L−1−i`) that `makeMustDiffer` forces to DIFFER | **new** v3.164; the pair must be EQUAL, so a shared row/column/region/uniqueness-cage makes the whole line unfillable. Mark-independent, and conservative because `makeMustDiffer` only asserts units the puzzle guarantees |
| **Lockout** | no diamond pair survives `lockoutSegmentSupport` with the FULL digit set in every cell (`pairs === 0`) | **new** v3.167; the validator's own engine run mark-free, like same-difference. The widest outside region a gap-4 pair leaves over 1-9 is four digits (1/5 → {6,7,8,9}), so e.g. **five** mutually-conflicting interior cells can never be filled. Conservative by construction: any legal fill has a diamond pair, which the full-set run necessarily sees. NOT length-checked — digits may repeat, so a ten-cell interior with no internal conflicts is fine |

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
| **Counting circle** (`countingCircleFill`; per-subset 150k, per-pair 30k, **plus a 600 ms wall-clock deadline for the whole run**) | one seating of the WHOLE circle set per candidate subset, digit-major | **v3.177 shipped this row as "not reached on any catalog puzzle" — the claim was ASSERTED, not measured, and it was false.** A 26-circle grid with every candidate pencilled exhausted the whole budget in 6.4 s and froze the tab. Measured after the v3.178 rework: 26 circles = **16 ms**, 36 = 3 ms, and the subset the published solution uses seats in **55 nodes** (it was unreachable in 5,000,000) | **safe by DEGRADATION + a DEADLINE** (v3.178) — see the counting-circle section. A cap or deadline hit leaves the subset *live*, so the run falls back to the sum-equation answer and can only remove less. **A node cap is a proxy for time and is only a good one once you have measured what a node costs — prefer a deadline.** |
| **Between + Lockout** (`interiorsFeasible`, 20k) | ONE seating of the interiors, not all of them | not reached on any real line — interiors are ≤ ~15 cells over ≤ 9 digits and repeats are legal unless conflicting, so a solution is found greedily | **safe by SHAPE** (v3.120, shared v3.167) — it seeks a single witness and answers FEASIBLE on overrun, i.e. under-remove. Lockout's memo keys on `(lo, hi)` plus the one forced cell, and an infeasible base interval short-circuits before any forced search runs, so the exhaustive-failure case is bounded by the distinct-interval count (≤ ~15), not by pairs × cells × digits. |

The pattern: a cap is fine when the **pruning strength tracks the constraint strength** (both
sum-target searches), and fatal when it doesn't (ten lines repeat digits, so fills are exponential
regardless of the target; region-sum segments enumerated orderings when only the *subset* mattered).
`interiorsFeasible`'s 20k budget (between since v3.120, lockout since v3.167) is a third, safe shape:
it seeks **one** solution, not all of them, and answers FEASIBLE on overrun (under-remove).
`sameDiffExactFills` is a fourth: **its
bail degrades to a weaker but sound answer instead of to nothing** — the arc-consistent domains it
falls back on are already a correct over-approximation of the support, so a cap hit costs only the
extra eliminations the conflict matrix would have added. When designing a new search, prefer that
shape; better still, look for the one that needs no cap at all (a chain CSP is solved exactly by arc
consistency, which is why same-difference searches only when conflicts or a loop break the chain).
Every other validator (kropki, cage, thermo,
whisper, Dutch, XV, **difference dot**, renban, nabner, parity, zipper, entropic, modular, **palindrome**) is
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

## WE DO NOT DIAGNOSE A CLUE'S VALIDITY (v3.166 — the v3.165 guard, reverted)

**A validator reports what it finds. It does not reason backwards from that report to decide what
the puzzle "must really mean".** Working out which clue is wrong — or that a rule elsewhere overrides
this one — is the **solver's** job. A validator may well be what eventually tells them; doing the
deduction *for* them, and then acting on it, is out of scope.

Concretely: **a clue that is broken as drawn is allowed to fail, on an untouched grid or a full one.
That report is correct and wanted.** What is forbidden is the next step.

This is written from a mistake. v3.165 added a `LINE_MORPH_RE` guard that forced every cue validator
AMBIGUOUS whenever the rules could override a line's stated type, prompted by `7kov2n4lrz` **"Zippery
When Wet"** (Marty Sears): a full eight-type colour legend, then *"Any line that is completely wet
(only enters water cells) loses the property of its presenting colour, and instead becomes a zipper
line."* One of its two grey lines is r9c8-r9c9-r8c9, whose fold pair (r9c8, r8c9) sits inside box 9 —
impossible *as a palindrome* — so the v3.157 structural test fired on an empty grid.

Two things were wrong with the fix:

1. **The puzzle states a colour for every line type. There is no ambiguity.** All eight validators
   should be available and working; the guard switched them off across the whole board to soften one
   report.
2. **The report was doing its job.** That line being unfillable as a palindrome is exactly the
   deduction proving it is wet — a fact for the solver to reach, not a detection input for us.

So the guard is gone and `SELF_DEDUCTION_RE` stands alone. That one is a genuinely different case: the
rules **never say** which line is which, so there is no claim to make in the first place.

**A known asymmetry, deliberately left alone.** `classifyWhisperLines` checks `SELF_DEDUCTION_RE`
*after* its trusted-green layer, so a green line is claimed as a whisper before the guard is ever
consulted — which is why German whispers kept working on `7kov2n4lrz` while the other validators were
disabled. That inconsistency is what exposed the bad fix. It is pre-existing (v3.70), and under the
principle above it errs in the right direction — a validator that stays available — so it is recorded
here rather than "fixed" into matching the wrong behaviour.

## ONE CLUE IS OFTEN DRAWN AS SEVERAL STROKES (v3.124, all line validators v3.166)

**Assume this, don't discover it.** Setters break a bent line at its corners routinely — it is how
most editors behave when you release the mouse at a turn — so **the stored stroke list is not the
clue list**. Any validator that reads strokes as clues is validating fragments.

Found for zippers in v3.124 and **generalised to every line validator in v3.166**. The joiner
(`mergeLineStrokes`, exposed as `lineClueChains`) now runs in the two places every line validator
passes through — **`resolveCueValidatorLines`** and **`computeWhisperLikeRemovals`** — so a new
validator inherits it without asking. It is idempotent, so zipper's own `zipperChains` call is
harmless. **If you ever read `cls.lines` directly, call `lineClueChains()` yourself.**

Joining happens **before** the selection test and before `unitFilter`, because both judge a whole
clue: selecting "the line" must cover the whole line, not one stroke of it.

**Every rule is damaged by fragments, but differently** — check which kind yours is:

| rule shape | validators | what a fragment does |
|---|---|---|
| **local** (adjacent pairs) | whisper, Dutch, parity, entropic, modular, same difference | silently loses the comparison **at the join** — under-removes |
| **whole-line** (a set / a total) | renban, nabner, ten line, region sum | validates a set the puzzle never posed |
| **folded** (pairs about a centre) | zipper, palindrome | pairs up **entirely the wrong cells** — this one **over-removes**, which the contract forbids |

**The degree-2 rule is what makes joining safe.** Two clues may legitimately share an endpoint (the
v3.160 lesson), so "these strokes touch" cannot mean "join them". Strokes join only where **exactly
two** chain-ends meet; a 3-way junction is left alone, closed loops never join, and a merge that would
revisit a cell is rejected. A catalog scan of the 109 palindrome puzzles that declare their chains
(607 strokes, 2026-07-29) found 9 with strokes meeting at an endpoint, including one of each shape:

- `DBFdgmG6mq` — a spiral of four straight strokes, every junction degree 2, so they merge into the
  one line the picture shows.
- `MM3mMQGJn2` "Relax, You're Two Tents" — **three** chains radiating from r5c1 in a star. That cell
  ends three chains, so nothing merges and they stay three separate clues, which is what they are.

Both are **geometry illustrations, not live regressions**: neither puzzle ships rules text, so no cue
fires and we never claim their lines. The load-bearing proof is still `k9mm1xgca5` "The Zip that Zips
the Zips", where the setter marked every fold centre and only the **merged** reading lands on them.

## The Sudoku-X cross is not a clue line (v3.132)

SudokuPad draws the X diagonals as ordinary stroked `#arrows` paths with **no id, class or other
attribute of their own**, so every attribute test in `isLineCluePath` reads them as cosmetic clue
lines. On `blobz/lynx` that put a SECOND colour in the legend, which knocked the double arrows off
the single-colour layer and left them unpinnable — and the same false line was being handed to every
other cue validator. `isGridDiagonalPath` (in `scanLineLayer`, so it only affects the validator-side
`getCosmeticLines`, not object shading) rejects them on geometry: a clue line runs cell CENTRE to
cell centre, the X is a 2-point path from one CORNER of the whole grid to the opposite one.

## Thermo validator

> **⚠️ THE DOM OUTRANKS `cp.thermos` SINCE v3.169 — the precedence used to be the other way round,
> and `cp.thermos` wayPoints can be TRANSPOSED vs what is rendered (the v3.83 trap; this was its last
> live reader).** `FLqFBMpTJB` stores its top-left thermo as `(1.5,2.5)(2.5,2.5)(1.5,1.5)(2.5,1.5)`
> and *draws* it at `x=160,96 → 160,160 → 96,96 → 96,160` — an exact `[x,y]→[y,x]` swap — so a
> `(col,row)` read of the model lands on the transpose of the drawn cells. **A thermometer's entire
> constraint is the ORDER of its cells**, so a transposed read is not "slightly off": it validates a
> path the puzzle never draws. Reported symptom: 4 of its 5 thermos detected, each threaded through
> the right cells in the **wrong order** — `R2C3-R2C2-R3C3-R3C2` for a thermo drawn
> `R2C3-R3C3-R2C2-R3C2`. **This puzzle's thermo set is symmetric about the main diagonal**, which is
> why it hid so well: the transpose still lands on real cells carrying a real bulb, so the bulb gate
> passed 4 of 5 (the 5th, a 2-cell thermo at R5C3-R5C2, transposed onto two bulbless cells and was
> the one dropped). Same lesson as `vd0mn9xqjw`'s diagonal-only whisper loss — **if a symptom is
> "works except on the symmetric ones", suspect row/col swap first.**
> `getThermoChainsFromDOM` has no such failure mode (it parses the drawn `<path d>`, so its geometry
> *is* the render) and is narrow enough that it can't invent a thermo, which is what makes promoting
> it safe; verified in the live DOM to return all 5 chains in drawn order. The model stays as the
> fallback for a thermo rendered where the DOM reader can't see it, and reads its wayPoints as **RC**
> (v3.170 — see "Model coordinates are RC" in LESSONS_LEARNED; v3.169 still read CR and leaned on the
> scoring guard instead). On top of that it keeps a **weaker** belt-and-braces guard: the DOM-read
> bulbs are in render space, so score both readings by "has a colour-compatible bulb at exactly one
> end" and take the strictly-better one (a tie keeps the RC read).
>
> **Why nobody noticed for 100 versions:** read as CR, the model's chains failed the bulb gate on any
> **asymmetric** puzzle, returned nothing, and let the DOM fallback quietly do the job. The DOM reader
> has effectively been the thermo source all along; `FLqFBMpTJB` is the one shape that returned
> wrong-but-plausible chains and so blocked its own fallback. That is also why the v3.169 precedence
> swap is low-risk — it formalises what was already happening.

**Thermo validator (v3.67; DOM fallback for cosmetic-drawn thermos v3.67.1):**
`computeThermoRemovals` (independent of the other three; always-on — the per-validator enable
settings were removed v3.104). Digits strictly increase from the round bulb to the tip; a **slow**
thermo relaxes this to non-decreasing EXCEPT where ordinary Sudoku rules would forbid the repeat
(same row/column/region/cage) — there it must still strictly increase. **Two detection sources,
DOM preferred, model fallback** (`getThermos` = `getThermoChainsFromDOM()` else
`getThermoChainsFromModel()`, then `buildThermoTrees(chains)` merges either source's chains the same
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

**⚠️ THE FOLD PHRASING BELONGS TO NEITHER RULE — it needs a verb (v3.184).** "digits equidistant
from the centre" says only how a clue PAIRS cells up; it is equally the definition of a zipper and
of a **palindrome**. `ZIPPER_CUE_RE` took it unconditionally through v3.183, so `yiaonocy5d`
("...What?", a 6x6 whose rules read *"Grey lines are palindromes, i.e. digits equidistant from a
grey line's center are always the same"*) had the **zipper** validator running on its palindromes.
What separates the two rules is the verb — a zipper's fold pairs **sum** to a constant, a
palindrome's are **equal** — so the phrasing branch now only counts as a zipper cue in a sentence
that also says sum/total/add (`hasZipperCue` = `ZIPPER_CUE_RE` (the bare word) `||` per-sentence
`ZIPPER_FOLD_RE && ZIPPER_FOLD_SUM_RE`). Scoped **per sentence**, not per blob, so a puzzle carrying
both clue types can't let its zipper's "sum" license its palindrome's "equidistant".
`ZIPPER_CLAUSE_RE` is narrowed the same way for the named-colour layer.

Handed to `classifyCueLines` as an object with a `.test` method, which leaves **layer 0 intact**: an
f-puzzles payload declaring `zipperline` still wins without consulting the rules text at all.

**Catalog-measured (2026-07-31, 4,825 puzzles with rules text): exactly 4 verdicts change, and all
four are fixes.**

| puzzle | was | why the old cue was wrong |
|---|---|---|
| `yiaonocy5d` "...What?" | zipper | tagged palindrome; the reported false positive |
| `zqpxetdz7a` "Hungry Rabbit in the Fog" | zipper | tagged palindrome |
| `bg99zmbupy` "Across Roads" | zipper | *"cells an equal distance from the centre of a silver line have **equal values**"* — a palindrome |
| `bill-murphy/20250705-consecutive-palindromes` | zipper | *"digits equidistant from the centre must be **consecutive**"* — **neither** rule. `PALINDROME_ANTI_RE` already excluded it; zipper had no such guard, so it was over-removing. |

Nominal recall against the `zipper` tag reads 62 → 61 of 64, but the one "lost" puzzle is the
consecutive-palindromes one above — a mis-tag, and a bug fixed rather than a regression.

**⚠️ ONE ZIPPER CAN BE DRAWN AS SEVERAL STROKES — join before folding (v3.124).** `k9mm1xgca5`
stores its R6C3→R9C3 zipper as TWO line entries meeting end-to-end at R8C2. Folding each stroke
separately pairs the wrong cells, so `computeZipperRemovals` now folds **`zipperChains(lines)`**
(→ `mergeLineStrokes`, since v3.166 the shared reader for EVERY line validator), not the raw
classified chains. Two chains join when an endpoint of one IS
an endpoint of the other **and that cell ends no other chain** — three ends meeting is an open
junction and we refuse to guess (the `walkBetweenSegment` rule); closed loops never join, and a
merge that would revisit a cell is rejected. This is the mirror image of the between-line lesson:
there one stroke was several clues, here several strokes are one clue.

**One fold function, every consumer (v3.124; renamed `zipperFoldCenter` → `lineFoldCenter` in
v3.184, when palindrome joined).** `lineFoldCenter(keys)` returns the fold point in
CELL units — the middle cell on an odd chain, the midpoint of the two middle cells on an even one
(a cell EDGE when the line runs straight through, a grid CORNER where it turns). Both folded
validators' pairing, the eyeball disc and the injected cosmetic dot all read it, so they can't
drift. The eyeball case is now the shared `{type:'fold',keys}` (emitted for zipper AND palindrome):
polyline plus a filled disc (`disc()` in `showObjects`) sized `centerDotScale × SEG_W`, matching the
drawn dot's `centerDotScale × line width`. The rendering counterpart is `drawCenterDots` /
`drawFoldDots` — see PROJECT_SUMMARY.

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

**Strokes arrive already joined** (`resolveCueValidatorLines` → `lineClueChains`, v3.166 — see "One
clue, several strokes" below). That matters more for this rule than any other: the fold point depends
on the whole chain's length, so folding two strokes of one line separately doesn't merely weaken the
check, it asserts a **different and wrong** set of equalities.

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
with a **lockout guard** (`BETWEEN_LOCKOUT_RE` — "lie outside", "must not be between", "lockout"),
so the opposite rule is never mis-applied.
A second guard (v3.131) does the same job for **double arrows**, which draw the identical picture and
trip the between cue — see "Double arrows" in the sum-arrow section for how the claimed lines are
subtracted.

**The lockout guard SUBTRACTS since v3.168; blanking the row was wrong in both directions.**
Until v3.167 there was no lockout classifier, so the guard could only force `ambiguous`. Once one
existed, the two branches of the double-arrow collision apply verbatim (shared helper
`subtractClaimedLines`): subtract the lines `classifyLockoutLines` **confidently** claims, `none` if
nothing is left, and refuse only when lockout itself can't be pinned. Both failure modes were real
and reported together:
- **`FLqFBMpTJB` — over-firing.** No between line exists. Its lockout rule (*"the diamond endpoints
  of a purple line must have a difference of at least 4 and the remaining digits … cannot be
  **between** or equal to the digits on the **endpoints**"*) trips `BETWEEN_CUE_RE` with lockout's own
  words, so a between row was offered for a clue type the puzzle does not contain. Lockout claims the
  purple lines → between subtracts to `none`.
- **`k18i652bjj` "Within and without" — under-firing.** Has **both**, in two colours, each named in
  its own clause (*"thin **grey** line"* between, *"thick **blue** line"* locked-out). The clause layer
  pins them correctly; the blanket guard threw that answer away and greyed out nine real between
  lines. (Its grey stroke is one **closed loop** through nine circles — `markerSegments` splits it
  into the nine clues, exactly as it does for the blue lockout loop through nine diamonds.)

Only **1** catalogued puzzle trips both cues at once (`k18i652bjj`), so the change's blast radius is
that puzzle plus the untagged `FLqFBMpTJB`. **Test puzzles:** native `ltvk2kk8b0`, `kh1drhrx40` (+killer cages), `hg0yh5uke9` (between + cosmetic
renban); non-native scl `2ad4183iyn` (**the segmentation case** — 11 chains → 57 segments),
`xm3e3npmmk`, `swtm07rplk`.

## Lockout-line validator

**Lockout-line validator (v3.167).** A lockout line runs **diamond to diamond** and states two rules
at once:

1. the two diamond digits **differ by at least 4** (the gap — read, not hardcoded; see below);
2. every digit between them on the line lies **strictly outside the closed range the diamonds span** —
   below the smaller or above the larger. Digits **may repeat** along the line where ordinary Sudoku
   allows it.

It is the between line's mirror image drawn with the mirror-image marker, and the two are each
other's classic mis-detection — which is why `BETWEEN_LOCKOUT_RE` and `DUTCH_LOCKOUT_RE` have guarded
against it since v3.120, and why this validator lands as a near-clone of the between machinery rather
than as new subsystems.

**One rule, not two readings.** The catalogued phrasings split into "must not be between **or equal
to** the diamonds" (`u0cs9m2qmx`, `uyol9lzyp5`, `FLqFBMpTJB`), "higher than the larger / lower than
the smaller" (`u2361pezfa`) and "lie strictly outside the range" (`f9a2chdekr`, `rGF3gpgnmM`). Those
are the same predicate, so `lockoutOutside(a,b,d)` is one line and there is nothing to choose between.

### The diamond reader (`getCellCenteredDiamonds`)

The diamond twin of `getCellCenteredCircles`, shared by the segmentation walk, the compute and the
menu eyeball. SudokuPad draws a diamond **two** ways, both confirmed in the live DOM:

| rendering | source | seen on |
|---|---|---|
| near-square `<rect>` in `#overlay`/`#underlay` with `rotate(45)` in its `transform` | f-puzzles `rectangle {angle:±45}`, scl `o:{angle:45}` | `f9a2chdekr` (w=0.53cs), `u0cs9m2qmx` (0.57), `uyol9lzyp5` (0.61), `u2361pezfa` (0.50) |
| a **closed four-segment `<path>` inside one cell** in `#arrows` | scl `l:` — the setter drew the glyph as a tiny polyline | `FLqFBMpTJB` (`M224 12.8 L204.8 32 L224 51.2 L243.2 32 L224 12.8`) |

The second costs nothing elsewhere: a chain that expands to a single cell is already dropped by
`getCosmeticLines`, so those glyphs never reach any validator's line pool. The size gate is much
looser than the circle reader's (0.3–1.05 cs) because the observed widths span 0.50–0.61 cs, and
`rx ≈ 0` plus a 45° rotation is what separates a diamond from a circle and from a plain square.

**Deliberately NOT read: an unrotated SQUARE endpoint** (`rGF3gpgnmM`'s yellow boxes). A square is the
commonest cosmetic in the corpus and claiming it would over-fire on puzzles with nothing to do with
lockout. That puzzle instead falls through `markerSegments`' "no markers anywhere" path, where each
drawn chain's own ends are its endpoints — which is the right answer there anyway.

### Segmentation — `betweenSegments` generalised to `markerSegments`

`u0cs9m2qmx`'s rules state the model outright: *"A diamond terminates a line segment."* That is
exactly the circle-splits-the-line rule the between validator has applied since v3.120, so the walk is
now **marker-agnostic**: `markerSegments(lines, markerSet, minLen)` carries the whole v3.121 body
(straight-through at crossings, follow a lone bend, refuse a genuine junction, global fallback) and
the two callers are one line each — `betweenSegments` = circles at `minLen` 3, `lockoutSegments` =
diamonds at `minLen` **2**. The differing minimum is a real judgement, not a tidy-up: two adjacent
circles have no interior and nothing to constrain, but two adjacent **diamonds** still carry rule 1,
so a 2-cell lockout segment is a live clue. `unitFilter` ("validate selection only") applies to the
**segments**.

### Algorithm — `lockoutSegmentSupport`, complete support in one pass

Per the elimination contract, a digit survives only when some full legal fill of the whole clue uses
it. `lockoutSegmentSupport(aSet, bSet, innerSets, differs, gap)` enumerates every diamond pair
`(a,b)` with `|a−b| ≥ gap`, keeps the pair only when the interiors can sit outside `[min,max]`
**simultaneously**, and unions the surviving digits per cell. It returns a Set per cell plus
`pairs` = how many diamond pairs proved feasible.

**Simultaneity is load-bearing**, exactly as it is for between's bulbs, and a per-cell interval test
cannot see it: four interior cells that must all differ, each pencilled `{1,2,3,4}`, cannot be seated
under the pair 4/8 — that pair forbids 4–8, so the four cells need four distinct digits out of
`{1,2,3}`. Each cell *alone* can take 1, so a per-cell check would have accepted it. Three such cells
do fit, which is what makes the case a real deduction rather than a search artifact.

The feasibility search is **`interiorsFeasible(sets, differs, allow)`** — v3.120's
`betweenInteriorsFeasible` with its interval predicate lifted into a parameter. Between passes "inside
the open interval", lockout "outside the closed one"; `betweenInteriorsFeasible` is now a one-line
wrapper, so every existing between case still tests the shipped code. Feasibility depends only on
`(lo, hi)` plus the single cell being forced, so it is memoised on exactly that key — which is what
keeps the pairs × cells × digits loop cheap. Iterated to a **fixpoint** (both ends and the interior
constrain each other, and segments sharing a diamond propagate through it).

**The gap is read, not hardcoded** (`lockoutMinGap` / `LOCKOUT_GAP_RE`). Every catalogued puzzle says
4, which is also the constraint's textbook definition, so 4 is the default. It is parsed because a
puzzle stating a different number means it — and parsed **only from a sentence that also mentions
diamonds / endpoints / lockout**, because on a mixed puzzle a German whisper clause ("differ by at
least 5") would otherwise raise the lockout gap, which is an over-removal.

### Detection (`classifyLockoutLines`)

1. **`nativeLinesFor('lockout')`** — f-puzzles declares it first-class (`lockout` / `lockoutline`,
   both mapped to `'lockout'` in `FPUZ_LINE_CONSTRAINTS`), which is the clean discriminator from
   `betweenline`. Confident, no guessing.
2. **`hasNativeLineConstraints()` → `none`.** This veto is deliberately **narrower than between's**.
   The between classifier refuses on bare `hasNativePayload()` — "constraint keys are exhaustive, so
   no key means no clue" — but that premise only holds for a payload that declares *some* line
   constraint. `u2361pezfa` (clover, Dec 2021) is an f-puzzles lockout puzzle drawn entirely in
   cosmetics (`line` + `rectangle {angle:-45}`, no `lockout` key, because the constraint type did not
   exist yet), and the blunt veto would silently refuse a puzzle whose rules *and* diamonds both say
   lockout. Between is left alone: its cue is far broader, so the blunt veto is carrying more weight
   there.
3. **`classifyCueLines(LOCKOUT_CUE_RE, LOCKOUT_CLAUSE_RE, null, 'lockout')`** — the ordinary cue
   ladder, including the LINE-TYPE LABEL layer (`'lockout'` is registered in `LINE_LABEL_TYPES`).

**Cue, catalog-measured 2026-07-29** (`cue_recall` over all 4,825 puzzles with rules text): recall
**100%**, UNREADABLE **0**, and all 5 false positives triaged to genuine lockout puzzles the catalog
left untagged. Two branches, both load-bearing — 6 of the 7 real puzzles name the type, and
`rGF3gpgnmM` "Trickling Down" says neither "lockout" nor "diamond", so only the outside/endpoints
branch catches it.

Two narrowings, each forced by a measured over-fire — the direction the contract forbids:

- **No "diamond … differ by N" branch.** It is the obvious way to read rule 1 and it is wrong here: in
  this corpus a "diamond" is far more often a **Kropki-style border dot** than a line endpoint —
  `6t37oxiusy` / `L8t8jQ7Ljn` ("if there's a diamond between two horizontally adjacent cells, the
  difference is…"), `v5feh338qh` ("adjacent digits separated by a diamond differ by x"), `ln1b4nlbu8`
  ("a white diamond between two cages…"), `ctzp03sqig` (XY diamonds beside blue **region-sum** lines).
  On any of those the single-colour layer would have handed lockout somebody else's lines. Cutting the
  branch took false positives 14 → 5 and costs nothing real: the gap alone is not the lockout rule,
  and every catalogued puzzle also states the outside half.
- **The name branch must name the clue TYPE** (`lockout line(s)`, `locked-out lines`), not just the
  word. Bare `/lock-?out/` also fires on `s64txn1v6l` "RAT RUN 35: **Locked Out**" — a Marty Sears maze
  whose title is a pun and which draws no lockout line at all.

**Deliberately unmatched:** *"higher than the larger diamond value, or lower than the smaller"*
(`u2361pezfa`) — a correct restatement of rule 2 that shares no token with it. That puzzle is caught
by its title instead; a puzzle using only that phrasing **and** never naming the type would be missed.
Under-detect, never mis-apply — widening to bare "higher than … lower than" would fire on half the
inequality puzzles in the corpus.

`LOCKOUT_CLAUSE_RE` covers every phrasing the cue does, minus bare `endpoints?` — `BETWEEN_CLAUSE_RE`
already owns that word and `clauseColorWord` takes the **first** matching clause, so claiming a
between clause would hand lockout the between lines' colour and apply the opposite rule. An endpoint
therefore only counts alongside lockout language.

### Verified against published solutions

Both rule halves were scored cell-for-cell against the puzzles' own solutions, the same way the
between segmentation was settled in v3.121:

| puzzle | path | result |
|---|---|---|
| `f9a2chdekr` (fpuz, native `lockout`) | 5 declared chains | all 5 satisfy gap ≥ 4 and **0** interior violations |
| `u0cs9m2qmx` (scl, DOM lines + rotated-rect diamonds) | 8 diamonds → 4 segments off the walk | all 4 satisfy gap ≥ 4 and **0** interior violations |
| `FLqFBMpTJB` (scl, **polyline** diamonds) | 8 diamonds read from `#arrows` glyphs | exactly the endpoints of the 4 purple lines; the glyphs stay out of the line pool |

**Test puzzles:** native `f9a2chdekr`, `5t5cagkrax`; cosmetic-only fpuz `u2361pezfa` (the narrow-veto
case); scl `u0cs9m2qmx` (**the segmentation case**), `uyol9lzyp5`, `FLqFBMpTJB` (**the polyline-diamond
case**, multi-colour → named-colour layer), `rGF3gpgnmM` (**the no-diamond case** — square endpoints,
falls through to whole-chain segments), `k18i652bjj` (lockout **and** between in one puzzle).

The menu **eyeball** previews the segments as a polyline with a **diamond** on each endpoint
(`{type:'lockout',keys}` → `diamondCell`, matching the drawn marker's real centre and radius). A ring
there would have drawn the rival clue type.

### Lockout lines vs the Dutch whisper (v3.120)

Predating the validator, and still load-bearing: lockout lines had to be taught to the **Dutch
whisper** classifier: a
lockout rule states the gap between its two **diamonds**, not between neighbours along the line —
`f9a2chdekr` ("Lockout Lines"): *"two connected diamonds must contain numbers with a difference of at
least 4, and all digits on the line … must lie strictly outside the range"* — and that phrasing trips
`DUTCH_CUE_RE` head-on. With one line colour, the cue layer then **confidently** claimed every lockout
line and applied the ≥4 neighbour rule, a different constraint entirely. Two guards in
`classifyDutchWhisperLines`, cheapest first:

1. `DUTCH_LOCKOUT_RE` (`lockout` / `lie (strictly) outside` / `outside the range|values|interval`)
   **or `LOCKOUT_CUE_RE`** in the rules → **`none` outright**, not `ambiguous`: the ≥4 belongs to the
   diamonds, so there is no Dutch whisper here to hand-select.
   **The `LOCKOUT_CUE_RE` half was added in v3.168** — `DUTCH_LOCKOUT_RE` predates the lockout
   validator and only knew the phrasings of the two puzzles that prompted it, so a lockout puzzle
   that *names* the clue slipped past: `k18i652bjj` writes "Locked-**out** Lines:" (hyphen, past
   tense — no bare "lockout") and `FLqFBMpTJB` says only *"the diamond endpoints … must have a
   difference of at least 4"*. On the latter the clause layer then pinned that sentence's own colour
   word and **confidently** applied the ≥4 neighbour rule to lockout lines. `LOCKOUT_CUE_RE` is the
   catalog-measured answer to "does this puzzle have lockout lines" (100% recall, and it demands the
   words "lockout **line(s)**", so a titular pun can't trip it) — defer to it rather than grow a
   second, worse copy. Re-measured over the corpus 2026-07-29: it vetoes exactly those two puzzles
   beyond the old regex, and neither is tagged as any kind of whisper.
2. `dropNativeLockoutLines` — the f-puzzles payload *declares* the chains (`lockout` **and**
   `lockoutline`, both now mapped to type `'lockout'` in `FPUZ_LINE_CONSTRAINTS`); drop exactly those,
   either drawn direction, and collapse to `none` if nothing survives. Covers a lockout puzzle whose
   prose never says "lockout"/"outside". Verified on `f9a2chdekr`: `cp.lines` is empty, the DOM chains
   match the declared `lockout` chains cell-for-cell.

**Catalog-measured (2026-07-22):** of 118 puzzles matching `DUTCH_CUE_RE`, only **2** also match the
lockout phrasing and **both are pure lockout puzzles** (`f9a2chdekr`, `u0cs9m2qmx`) — no real Dutch
whisper is lost. Note `u0cs9m2qmx`'s rules confirm the segmentation model independently: *"A diamond
terminates a line segment."* — the same circle-splits-the-line rule the between validator applies, and
v3.167's lockout validator duly reuses that graph walk against a **diamond** reader (`markerSegments`).
