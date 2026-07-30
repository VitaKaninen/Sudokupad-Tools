# Counting circles — design note (investigated 2026-07-30, **BUILT in v3.177**)

*A digit in a circle indicates how many circles contain that digit.* Investigated against 25
puzzles the user named plus a catalog-wide cue sweep. **Verdict: buildable, and the payoff is
unusually high — but only for `circle`-shaped markers, behind five guards.**

> **STATUS: shipped in v3.177**, as designed here. What actually ships — including the three
> structural consequences of it being a WHOLE-PUZZLE clue, and the two `with\b` / "diamond ends in a
> d" traps found while building — is documented in
> [`VALIDATORS.md` → "Counting circles"](VALIDATORS.md). **This file is the evidence and the
> reasoning; that one is the current state.** Read this when you need to know *why* a rule is the way
> it is, or before extending to the colour-partition family.
>
> Two things changed from the plan below. **Diamonds are in** (noun-dispatch made it nearly free).
> And the guards resolve to **AMBIGUOUS with an explanation**, not to `none` — a greyed row naming
> the variant beats a silently absent one, which is why `noSelectionRescue` had to be invented (the
> usual "tick selection-only to override" rescue is unsound for a whole-grid count).

## Why this validator is worth building — the constraint is far stronger than it looks

Let `n` = number of circles and `k_d` = how many circles hold digit `d`. The rule says every circle
holding `d` requires `k_d = d`, so for each digit **either `k_d = d` or `k_d = 0`**. Therefore:

> **The digits used in circles form a subset `S` of the digit set with `Σ S = n`, and each `d ∈ S`
> appears exactly `d` times.**

That is a whole-puzzle equation, not a local one, and it prunes hard. Verified against the
published solutions of every readable test puzzle:

| puzzle | n | digits × counts | Σ |
|---|---|---|---|
| `i9wx9vdy41` Onion | 36 | 1,2,3,4,5,6,7,8 each exactly | 36 ✓ |
| `dGL3DgJgJd` Circles and Thermos | 26 | 7×7, 6×6, 5×5, 4×4, 3×3, 1×1 | 26 ✓ |
| `xgmmht4odf` The Buddy System | 29 | 9×9, 8×8, 6×6, 4×4, 2×2 | 29 ✓ |
| `y6ivkzi761` Outside the Box | 15 | 5×5, 4×4, 3×3, 2×2, 1×1 | 15 ✓ |
| `gjyydhf4pm` YNWA (footballs) | 16 | 6×6, 4×4, 3×3, 2×2, 1×1 | 16 ✓ |
| `swtm07rplk` Just Between Us | 14 | 7×7, 4×4, 2×2, 1×1 | 14 ✓ |
| `blobz/hippo-birdie` (balloons, 0-8) | 14 | 7×7, 4×4, 3×3 | 14 ✓ |
| `blobz/offset-circles` | 9 | 4×4, 3×3, 2×2 | 9 ✓ |
| `miv6k9rwi0` Bubbles! | 6 | 6×6 | 6 ✓ |

Two consequences worth naming:

- **`0` can never sit in a circle.** A 0 there would assert "zero circles contain 0" while itself
  being one. Falls out of `S` holding positive digits only — a free, correct elimination on
  `blobz/hippo-birdie` (digit set 0-8).
- **`n > Σ(positive digits)` is structurally impossible** (45 over 1-9, 36 over 0-8) — the v3.157
  "impossible clue is OUR misread" report. Weak on its own (every 1..45 is reachable), but the
  mark-free full test is not: `n = 45` demands nine mutually non-conflicting circles holding 9,
  which a bad circle read will usually fail.

## The reader already exists, and its existing gates are already right

`getCellCenteredCircles` (the shared reader — between lines, arrow bulbs, the eyeball) needs **no
loosening**. Its three gates each earn their keep, measured in the live DOM:

| gate | what it correctly rejects |
|---|---|
| size 0.55–1.05 cs | `miv6k9rwi0`'s decorative 2.5 cs and 2.82 cs bubble rings (which ARE cell-centred) |
| cell-**centred** | `gfr7xipywo`'s 7 corner quad circles; `blobz/offset-circles`' 9 offset black circles, 4 big pink renban rings and 4 Kropki dots |
| `rx ≈ w/2` + near-square | `miv6k9rwi0`'s 6 rotated oblong "shine" highlights |

On `blobz/offset-circles` and `miv6k9rwi0` — the two puzzles with three circle types each — the
gates alone return **exactly** the counting set, scoring 9 = 4+3+2 and 6 = 6×6 against the
published solutions. No colour scoping was needed, though the rules do also name the colour
("blue circles", "small white circle") as an independent confirmation path.

**Noun-dispatch the reader.** `df7B2RJ4gB` "Diamond mining" counts **diamonds** and also has three
cell-centred arrow circles that must NOT count. Reading the rules' own noun and dispatching
(`circle`→`getCellCenteredCircles`, `diamond`→`getCellCenteredDiamonds`) gets this right for free;
a circle-only reader would count the arrow bulbs and be wrong.

### THE ONE NEW GEOMETRY RULE: a bare bulb is not a circle, a stroked one is

This is the whole `y6ivkzi761` vs `dGL3DgJgJd` puzzle, and it is settled by measurement, not taste.

| puzzle | thermo bulbs | counting circles | all-cell-centred | needed |
|---|---|---|---|---|
| `y6ivkzi761` | 6 × `#underlay` 0.85cs `#CFCFCF` **stroke:none** | 15 × `#overlay` 0.93cs `#FFFFFF` stroke `#000000` | **21 → invalid** (1:3, 2:5, 3:4, 4:4, 5:5) | 15 ✓ |
| `dGL3DgJgJd` | 4 × `#underlay` 0.85cs `#CFCFCF` **stroke:none** | 26 × `#underlay` 0.85cs `#CFCFCF` stroke `#000000` | 26 ✓ (bulb cells carry BOTH rects) | 26 ✓ |

The rule that satisfies both:

> **Subtract a circle only when it IS a thermo/arrow bulb root, is UNSTROKED, and its cell carries
> no other circle marker.**

`y6ivkzi761`'s 6 bulbs are bare and on cells no counting circle occupies → subtracted → 15, which
scores 1:1 2:2 3:3 4:4 5:5 = 15 against its solution. `dGL3DgJgJd`'s 4 bulb cells each carry a
*second*, black-stroked circle drawn on top → kept → 26. And that matches the setters' intent
exactly: drawing an extra ring on a bulb is how you say *"this bulb counts too"*, which
`dGL3DgJgJd`'s rules spell out ("Some of the circles are also the bulb of a thermometer").

**Do NOT use "is it stroked" as a general inclusion filter.** `gfr7xipywo`'s genuine grey odd
circles are `stroke:none`, so a stroke-gated reader returns 0 there. Harmless in that instance
(under-detect → `none`), but a puzzle mixing stroked and unstroked counting circles would get a
wrong *subset*, which the elimination contract forbids. Use the stroke only to subtract bulbs.

**Arrow circles are the mirror case and need the rules, not geometry.** `zdmnz4qx5m` states
*"Arrow circles count as circles for this rule"* and its 24 circles (15 `#underlay` plain + 9
`#overlay` arrow bulbs) are a pixel-identical `0.80 ROUND #FFFFFF s=#555` — geometry cannot
separate them, and it should not: they all count. `df7B2RJ4gB`'s arrow circles don't count, but
there the *noun* is diamond. So: never subtract a stroked arrow bulb.

## Detection — the cue, measured on the catalog

The rule is always **self-referential**: an `X`-container counts `X`-containers *holding that
digit*. That self-reference is the entire cue, and it is what separates it from its rivals.

Structure (three parts, all required, clause-scoped):

1. **container**: `digit|number|value` … `in|on|inside` a `<NOUN>` — or the adjective-first form
   `a circled digit` (`dqNLp6qJHR`, `qg411d1jf2`, `9Lbt638t9N` all use it);
2. **count trigger**: `how many | the (total) number/count of | that many | how often`;
3. **the counted thing is the SAME noun, containing that digit** — five attested shapes:
   `how many <N>s contain(ing)/hold/have/with`, `how many times … in <N>s`,
   `that many times in <N>s`, `exactly N <N>s contain`, `how many <N>s that digit appears in`.
   Also needed: `means there are that many <N>s containing` (`df7B2RJ4gB`) and `the` as well as
   `that` digit (`y6ivkzi761`: "the number of circles that contain **the** digit").

**Measured over all 6,260 catalog puzzles: 60 fires, 50 of them clean, 10 caught by guards.** Noun
distribution: **circle 55**, then one each of mushroom / balloon / football / tent / ring — the
exotic-noun tail is 5 puzzles, so scoping to circle+diamond costs almost nothing.

**Part 3 is load-bearing.** Without it four rivals fire, and each counts something else entirely:

| puzzle | rule | why it must not fire |
|---|---|---|
| `sotpbtg8o1` Cookie Crime | "counts the number of **cells** that the circle **sees**" | counts cells, not circles |
| `m73tnQmbbd` Atoll | "is the number of **cells** of its own type that it **sees**" | counts cells |
| `vgbfcjxvav` Renban Caves | "the total number of unshaded **cells seen**" | counts cells |
| `laj1tzweyh` | "the number of gold **rings within its region**" | counts rings, not rings holding that digit |
| `q3b8weqj5f` Connect 4 | "the total number of **discs in the indicated directions**" | counts discs, not discs holding that digit |

A naive "noun appears after the trigger" test passes `sotpbtg8o1` ("number of cells that **the
circle** sees"), so the noun must be the trigger's *immediate* object. A `sees|seen|vision|obstruct`
anti-pattern is the belt-and-braces second gate.

## The five guards — each one a real catalog puzzle

| guard | signal | puzzles | why |
|---|---|---|---|
| **NEG** | `do(es) not / not contain / other than` | `4mtPGFb6dm` "Circular Unreasoning" — *"how many circles **DO NOT** contain that digit"* | inverted rule; same picture, opposite answer |
| **COLOUR-PARTITION** | `of that colo(u)r / same colo(u)r` | **7**: `ah1c5p6zcr`, `73oh4m8m8m`, `cd0mh5vccv`, `cg5wlayzuj`, `bwevls7kjx`, `hrinu3frw3`, `hg401risug` | each colour counts independently. `ah1c5p6zcr` "Ten Ring Circus" has the player *choose* the colouring → unvalidatable. The other 6 may have drawn colours (a possible later extension: partition by fill/stroke and validate each set) — refuse for now |
| **DEFERRED SET** | `on the loop / shaded / revealed / within its region` | `2vyqqhy6ky` (circles *on the loop* — membership is the solver's deduction), `belm8cdujp` + `tc5dhvo13g` (*revealed* circles only) | the counting set itself is unknown |
| **SEMICIRCLE** | `semi-?circle / half-?circle` | `j27rj7frco` "Half Circles" | measured: 56 full circles + **40 half-cell white masking rects** overlaid to make semicircles. The reader sees 56 circles; the true count is 16 full + 40 halves = 36 effective. Excluded, as the user expected |
| **INCOMPLETE SET** | rule is **unscoped** (no colour/size adjective) AND round in-grid markers exist that the reader can't attribute (off-centre / corner quads) | `gfr7xipywo` "Mods, Quads & Odds" | measured: 9 cell-centred odd circles + **7 corner quad circles**, and the rules count both. Reading only the 9 scores {5:2, 7:3, 9:4} — **invalid**, i.e. a wrong answer, the one failure mode the contract forbids. Must refuse, not under-count |

The last guard is the subtle one and it must check *scoping first*: `blobz/offset-circles` also has
off-centre round markers, but its rule says "**blue** circles", so the others are irrelevant and it
validates correctly. Unscoped + unattributable markers → refuse; scoped → filter and proceed.

## Fog: counting circles is ONE GLOBAL unit

Every other validator's fog gate is per-clue ("the whole clue must be revealed"). Here the whole
puzzle's circles are a single clue, so **any fogged circle cell kills the run** — sound, and it is
what correctly sidelines `zdmnz4qx5m`, `erin-toler/counting-constraints`, `belm8cdujp` and
`hqa07qdm2h` until the fog clears. Same for the ↻ auto-update. `erin-toler` also shows the reader
working mid-fog: 5 white/black-stroked counting circles vs 1 grey `stroke:none` odd circle, exactly
as its rules describe ("black-outlined counting circle" vs "gray circle").

## Greyed out for free — no cue or guard work needed

These need nothing because the **reader returns nothing**, so the mode is `none`:

- `NbqQ2HhP4P`, `nmhixakego` (tents), `ah1c5p6zcr`'s sibling cases — the player draws the markers.
- `hqa07qdm2h` — "All circles are outside the grid".
- `n4FR3FtL4D` (letters), `pbz4ij1joh` (card suits) — no circle-shaped markers, and the cue's noun
  list excludes `suit` anyway.
- `blobz/centipede` (mushrooms) — noun-dispatch has no mushroom reader.

## Algorithm sketch

`n` circle cells, `dom[i]` = each cell's current state (value/given → that digit; centre marks →
those marks; **empty → full set, never modified**), `conflict[i][j]` from `makeMustDiffer`
(v3.162: `makeRegionOf` may legitimately say *no regions*).

1. **Feasible digit sets**: every `S ⊆ positive digitSet` with `Σ S = n`, filtered by "at least `d`
   circle cells can hold `d`, and `d` of them are pairwise non-conflicting".
2. **Tier 1 (cheap, sound, strong)**: a candidate outside `⋃ feasible S` is removed. This alone
   carries most of the value and needs no search.
3. **Tier 2 (the full contract)**: candidate `d` in cell `X` survives iff some feasible `S` admits a
   complete assignment — every `e ∈ S` used exactly `e` times, `X = d`, all cells from their own
   domains, no conflicting pair sharing a digit. Search **witness-reuse** style
   (`sameDiffExactFills`'s shape): one found assignment witnesses many `(cell, digit)` pairs, so
   only unwitnessed pairs need a targeted search.
4. **Node cap must degrade to tier 1, not to nothing** — the v3.155/v3.156 lesson. Tier 1 is a
   sound over-approximation, so a bail keeps every elimination the subset-sum alone proves.
5. Iterate to a fixpoint (a narrowed cell can kill a subset `S`).

Note the classic solve path falls out of tier 2 automatically: if `d` is in every feasible `S` and
exactly `d` circles can hold `d`, all of them must → every other candidate in those cells goes.

## Recommendation

Build it for `circle` (+ `diamond` via the existing diamond reader), with the five guards. That
covers ~50 catalog puzzles and 11 of the user's 13 positive cases; the two dropped are
`blobz/centipede` (mushrooms) and `j27rj7frco` (semicircles), both deliberate. The colour-partition
family (7 puzzles) is a clean later extension if their colours turn out to be drawn rather than
deduced.
