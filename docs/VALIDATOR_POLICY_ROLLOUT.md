# Rollout plan — bringing the validators in line with VALIDATOR_POLICY.md

**This is a work order, not reference material. Delete it when the last phase lands.**
Written 2026-08-01. The design was settled in conversation over 31 July – 1 August;
[`VALIDATOR_POLICY.md`](VALIDATOR_POLICY.md) is the authority and this file only sequences the work.

---

## Before you touch anything

1. Read [`VALIDATOR_POLICY.md`](VALIDATOR_POLICY.md) end to end. It is short and every phase below
   is downstream of it.
2. Read the ⚠️ block at the top of the **ADDING A VALIDATOR** banner in
   `Sudokupad-Tools.user.js` (search `ADDING A VALIDATOR`) — the five rules in condensed form.
3. Skim [`VALIDATORS.md`](VALIDATORS.md) §§ "Solution-refuted clues", "Non-sum cage variants",
   "The gate that DOES work", "The solution probe" **as history**. They describe what was built and
   measured, not what we want. The banner at the top of that file says so.

**The one-sentence version:** a validator may decline to check, but it may never pretend to have
checked. v3.182–v3.186 made several validators go quiet and report success anyway; this undoes that
without losing the good parts (the probe, the cue work, the measurements).

---

## Five traps. Read these or you will undo the work.

**1. The harness encodes the OLD policy.** `tools/validator_harness.mjs` has cases written
specifically to prove the mute works — VALIDATORS.md says "Harness cases cover every one of those
paths." When you delete the mute **those cases will fail, and that is correct.** Rewrite the case to
assert the new behaviour. Do **not** restore code to make a red test green. This is the single most
likely way this rollout gets silently reverted.

**2. Keep the probe.** `buildSolutionProbeState`, `probeInfo`, `probeSystematic` all stay. The probe
was a good idea; only what we *did* with a refutation was wrong. It is still needed for certifying a
puzzle, for grey branch (b), and for the §6 cage work later.

**3. Don't bring back "⛔ no arrangement of digits can satisfy it" for cages.** v3.183 was right
that the message is alarming and factually false for a product cage; it was wrong to answer that
with silence. The replacement is UNCHECKED with an arithmetic reason, not the old loud path.

**4. One expected regression, do not "fix" it.** Removing the v3.184 whole-puzzle cage gate means a
variant-cage puzzle with no published solution will again over-remove on cages whose variant total
happens to be a legal sum. That is the accepted consequence of P1 ("let it fail"); §6 is the real
cure. Measure it, record it, leave it.

**5. The hard rule, unchanged.** No solution digit may reach a removal, a candidate set, or any
player-visible string. If a reason string can only be justified by looking at the answer, it is the
wrong reason string.

---

## Phase 1 — reporting first (do not reorder) — ✅ LANDED v3.188.0

**Why first:** phases 2–4 all produce clues that went unchecked. If the reporting can't say so, they
turn silent over-removals into green all-clears — strictly worse than today.

**What shipped.** `uncheckedMsg` / `checkedPhrase` next to `invalidClueMsg`; `unchecked` +
`uncheckedWhy` carried on every `applyOneValidator` exit path and consumed by all three runners
(`runSingleValidator`, `runValidatorHighlight`, `runAllValidators`, the last aggregating per clue
type). `okType(unchecked)` ambers a qualified run. The channel has **no producers yet** — that is
phases 2–5 — so behaviour is unchanged until they land. Contract documented in the ADDING A
VALIDATOR banner item 1 and `VALIDATORS.md` "The third outcome".

- Add a third per-clue outcome alongside removed/not-removed. Every `compute()` already returns a
  unit count (`cageCount`, `thermoCount`, `dotCount`, …); add an **unchecked count plus a reason**
  and return it on **every** exit path, including the `<none>` ones.
- Toast: green only when unchecked is 0; amber when it isn't; red unchanged (emptied cell,
  structurally impossible). `okType()` already does exactly this shape for the missing-candidates
  warning — extend that, don't invent a parallel mechanism.
- Wording per `VALIDATOR_POLICY.md` §8 open question 2: state arithmetic the player could verify
  themselves, never a diagnosis. *"2 cages were not checked — their corner number is not a sum of
  different digits"* ✅. *"2 cages are decoys"* ❌.
- `runAllValidators` must aggregate unchecked counts per clue type, or run-all becomes a new
  false-green channel.

**Ship it.** Bump, harness green, commit. Nothing below is safe until this exists.

## Phase 2 — delete the mute — ✅ LANDED v3.189.0

**What shipped.** `muteSolutionRefuted` and all six call sites deleted; every `count + mute.muted`
add-back removed. Sum-less cages moved off the checked total onto Phase 1's `unchecked` channel
("we could not read a total for them" — a reason that names *our* limit, not the puzzle's trick).
`cagesShown` now holds only the zero-combination cages, still folded into the count — Phase 3's job.
The probe, `probeInfo`, `probeSystematic` and `buildSolutionProbeState` all stay (trap 2), and
`solutionDigitsFor` is kept unused for §6. Harness: the 11 mute cases were **replaced**, not
repaired (trap 1) — they now assert the deletion holds, so reintroducing the mute or any add-back
turns the harness red. 451 pass.

**Expected regression, do not "fix" (trap 4 territory).** Decoy clues now fail loudly instead of
passing silently — that is the point (`yiaonocy5d`, `bH8FJtL3F3`). On variant-cage puzzles with a
published solution the per-cage mute is gone, so those cages get checked as sums and fail; §6 is the
real cure.

- Delete `muteSolutionRefuted` (≈7872) and all six call sites: Kropki (≈7913), XV (≈8143),
  difference dot (≈8409), cage (≈9172), thermo (≈13766), arrow (≈14099).
- Each site currently adds `mute.muted` back into its reported count — remove that, don't relocate
  it. The clues are simply checked now.
- Fix the count inflation at ≈9188: `cagesShown = cageMute.muted + countSumlessKillerCages()`.
  Sum-less cages are **unchecked**, reported via Phase 1, never added to the checked total.
- Harness: expect failures here. See trap 1.

## Phase 3 — cages stop going quiet

- `computeCageRemovals` zero-combination path (≈9194): report UNCHECKED with the arithmetic reason
  instead of dropping silently.
- Add the one positively-identifiable case now, because it needs no solution and no cue: **more
  cells than digits ⇒ repeats are forced ⇒ a distinct-digit reading cannot apply.** That is
  `67rr7DMJDh` "121" (36 cells, total 121, an honest repeats-allowed cage). Either implement the
  repeats-allowed branch or mark it unchecked — but never call it clean.
- Remove the v3.184 whole-puzzle gate and its `note` channel. See trap 4.

## Phase 4 — menu states

- `validatorTrust` (≈14963): **delete the `drop` branch.** A probe refutation is not a positive
  identification, so it may not remove a row. Keep `grey` via `rulesDeclareUnreliable`. `ok` now
  means *fully live* — which it does automatically once Phase 2 lands.
- `drop` survives only for a **known-unsupported variant list**, which starts empty. Don't invent
  entries; add one only when a real puzzle teaches you the variant, and record which puzzle.
- Add grey branch (c): two or more readings we support could apply and the puzzle doesn't say which
  clue is which ⇒ list **both** validators, **both greyed**, solver picks per clue with the checkbox.
- Fog: **grey every validator row on a fogged puzzle**, forcing selection-only. Leave
  `combineFogFilter` exactly as it is (it already requires every cell of a clue revealed, in every
  mode, and that is correct). No fog-specific reporting rule is needed — selection runs carry no
  denominator.

## Phase 5 — sweep every validator

Phases 2–4 fix the shared machinery. Now walk `constraintValidators()` one entry at a time and check
each against the five rules in the banner. What to look for per validator:

- Does every exit path report an unchecked count, or does some path still return a bare "none found"?
- Does it ever silently drop a clue it couldn't read?
- Does its structural-impossibility bound match the rule (loose enough that a satisfiable clue can
  never be flagged)?
- Does anything it shows the player depend on the solution?

**This is the phase the user is starting a fresh session for.** It is a gather → process-each →
cleanup pipeline over ~20 validators, so keep it resumable per `~/.claude/RESUME.md`: write
`resume-state.json` at the project root with the validator list and which ones are done, updated at
phase boundaries rather than per validator.

## Phase 6 — the cage ruleset work (separate project, not part of this rollout)

`VALIDATOR_POLICY.md` §6. Start with the measurement, which has never been run: for each
solution-bearing puzzle with cages, intersect the set of rulesets consistent with **every** cage in
that puzzle, and report how often that intersection is exactly one and matches the solution. The
existing 58.3% figure in `tools/cage_variants.py` answers a *per-cage, no-solution* question and is
not evidence against this. Only after that number exists should anyone build the multi-ruleset
validator and the `Cage (sum)` / `Cage (product)` row labels.

---

## Verification, every phase

```bash
node tools/validator_harness.mjs && node --check Sudokupad-Tools.user.js
```

Run `python tools/cue_recall.py` as well on any cue change (keep UNREADABLE at 0). Bump `@version`
**and** `SCRIPT_VERSION` together — a PostToolUse hook blocks the edit if they drift. Commit and push
each phase separately; they are independently shippable and independently revertible.

## Appendix — test set

Every id below was confirmed against the catalog on 2026-08-01. When this file is deleted, move any
that stay useful into `PROJECT_SUMMARY.md`'s test-puzzle list.

### A. The false green (Phases 1–3)

| puzzle | what it is | today → wanted |
|---|---|---|
| [`67rr7DMJDh`](https://sudokupad.app/67rr7DMJDh) "121" | ONE cage: 36 cells, total 121, honest repeats-allowed sum | green all-clear **and** row dropped → checked as repeats, or UNCHECKED with the cells>digits reason |
| [`26e1w4r81e`](https://sudokupad.app/26e1w4r81e) "The Devil is in the Details" | 4 product cages cornered 666 | silent, counted → UNCHECKED, named |
| [`36fnN33h7L`](https://sudokupad.app/36fnN33h7L) "Leap Day" | 29 over a 14-cell cage | silent, counted → UNCHECKED, named |

### B. The mute (Phase 2) — decoys must fail loudly

| puzzle | what it is | today → wanted |
|---|---|---|
| [`yiaonocy5d`](https://sudokupad.app/yiaonocy5d) "...What?" | 6×6 troll; 5 of 7 drawings are decoys (cage, thermo, arrow, quad, difference dot) | muted/neutered, green → every row live and fully functional; the fake thermo/quad/dot **fail** when run |
| [`bH8FJtL3F3`](https://sudokupad.app/bH8FJtL3F3) "Killer Sudoku" | 1 decoy cage among 29 honest ones | decoy muted, "29 checked" → 29 checked for real, the decoy fails |

### C. `drop` removed (Phase 4) — rows come back

| puzzle | what it is | today → wanted |
|---|---|---|
| [`ay6r6mmu5w`](https://sudokupad.app/ay6r6mmu5w) "Close Enough" | 20 cages, sums rounded to nearest 5 | row dropped → **live** (no cue recognises rounding), runs and fails |
| [`rd2kn6vy6d`](https://sudokupad.app/rd2kn6vy6d) "Regional Heatwave" | region-sum segments *strictly increase* along the line | — → **live**, runs, fails. The tool not fitting the job |

### D. Grey (c) — two readings we support

| puzzle | what it is | wanted |
|---|---|---|
| [`5kx4d90kcm`](https://sudokupad.app/5kx4d90kcm) "Sigma or Pi" | *"solvers must deduce whether each cage is a sum cage or a product cage"* | **grey**, not drop. Selection rescues; a sum-run failing teaches the player it's a product cage |

### E. Grey (a) — can't locate or disambiguate

| puzzle | why |
|---|---|
| [`NbqQ2HhP4P`](https://sudokupad.app/NbqQ2HhP4P) "Miracle-Once Again" | counting-circle rules, no circles drawn — player places them |
| [`nmhixakego`](https://sudokupad.app/nmhixakego) "Campfire Whispers" | the "circles" are tents the player draws |
| [`k18i652bjj`](https://sudokupad.app/k18i652bjj) "Within and without" | between lines present but not locatable; lockout lines on the same puzzle ARE found |
| [`1cwnilmrp0`](https://sudokupad.app/1cwnilmrp0) "Two Out of Three Ain't Bad" | line type is the solver's choice — the original grey case (v3.90) |

### F. Partial detection — live, with an unchecked subset

| puzzle | why |
|---|---|
| [`xgmmht4odf`](https://sudokupad.app/xgmmht4odf) "The Buddy System" | circles shared between between-lines and palindromes; some count, some don't. Must stay **live**, check what it can, and name the rest |

### G. Fog (Phase 4) — every row greyed

| puzzle | why |
|---|---|
| [`26w1k7rwci`](https://sudokupad.app/26w1k7rwci) "The Fourth Killer" | fog + killer cages |
| [`FMGPBBt24p`](https://sudokupad.app/FMGPBBt24p) "Lines in the Fog" | fog + region-sum lines |

Check all three fog rules: 👁 disabled, every row greyed, selection run works and reports no
denominator (select 2 cages → "2 cages", never "2 of 20").

### H. Control — nothing may change

| puzzle | why |
|---|---|
| [`0qbt11p1jt`](https://sudokupad.app/0qbt11p1jt) "Mar. 17, 2025: Killer Sudoku" (clover!) | 20 plain cages, solution published, probes clean |
| [`179dze6yfh`](https://sudokupad.app/179dze6yfh) "July 13, 2025: Killer Sudoku" (clover!) | 16 plain cages, solution published, probes clean |

**Run these first and last.** They are the 82% case, and if either changes behaviour at any phase,
something in the shared machinery broke.

## Stop and ask

- A phase would require showing the player something derived from the solution.
- The harness disagrees with the policy in a way that isn't trap 1 — i.e. the policy itself looks
  wrong for some clue type.
- You find a clue type where "let it fail" would over-remove with no way to mark it unchecked.
