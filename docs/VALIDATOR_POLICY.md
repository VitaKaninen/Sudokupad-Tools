# Validator policy — the intended design

**Status: this document is the intent. Where the shipped code disagrees, the code is wrong.**
Written 2026-07-31 by reading back every statement made about validator behaviour across the
sessions of 2026-06-22 → 2026-07-31, because v3.182–v3.186 implemented something close to the
opposite of what was asked. `VALIDATORS.md` remains the reference for *how each validator works*;
this file governs *when a validator may speak, stay silent, or disappear*.

---

## 0. The north star

> **A validator's job is to check the clue and say what it found. It may decline to check.
> It may never pretend to have checked.**

Everything below follows from that one sentence.

---

## 1. The four standing principles

These have been stated consistently for six weeks. They are not new.

**P1 — Every clue is assumed true.** (2026-07-06, 2026-07-28)
> "We are making the assumption that ALL clues In the puzzles are valid. If a clue is invalid as
> presented, then it is a wrogn clue. We want it to fail in those cases, not find a way to make the
> clue work or find a way around it."

No validator weakens, reinterprets, or excuses a clue because the puzzle might be lying.

**P2 — Diagnosing a lie is the solver's job, never ours.** (2026-07-06, 2026-07-29)
> "I don't want to try to diagnose whether or not a clue is invalid. That is the solver's job. A
> validator might eventually tell them that, but discovering which clue is invalid is not for us
> to do."

**P3 — A false all-clear is the worst possible outcome.** (2026-07-06, restated 2026-07-31)
> "it just says there was nothing to remove, and gives a green message indicating that everything
> is fine. This means that it is failing at its job, since it is supposed to validate the line, but
> it is giving the all clear, when the candidates on the line are not valid."

The player cannot distinguish *"I checked it and it's fine"* from *"I checked nothing"*, and they
act on the first reading. Silence that reads as approval is worse than any information leak.

**P4 — Never over-remove.** A validator that declines to run costs a convenience; one that removes
a correct digit costs the solve. This is the only principle that can outrank P1, and it does so by
declining to check (§3), never by checking under a rule the puzzle didn't state.

---

## 2. The mistake to never repeat: two clocks, two standards

The v3.182–v3.186 inversion came from applying one standard to both of these. They are different.

| | **Menu time** (puzzle loads, player has done nothing) | **Run time** (player clicked Validate) |
|---|---|---|
| what it is | a passive list of rows | an answer to a direct question |
| governing concern | **anti-spoiler.** A row's presence or absence is information the player never asked for | **honesty.** The player asked; they get the truth |
| may we stay silent? | yes — that is the whole design | **no.** Silence here is a lie (P3) |
| may we look at the solution? | yes, to decide the row's state | **no.** Never (§5) |

Every anti-spoiler instruction ever given was about **menu time** — which rows exist, whether they
are greyed. None of it was ever about run time. v3.182 imported the anti-spoiler standard into run
time, which produced exactly the failure P3 forbids:

> "if the cage was actually a troll cage, and was never supposed to validate, we were not going to
> spoil it by disabling the validator up front, or by graying it out. What was supposed to happen,
> is they would fill in candidates, then hit the validate button, and the validator would do its job
> as intended, and tell them that there is no way it can work with those candidates. **This is when
> they would find out that they missed a rule or something hidden from them. The validator is still
> supposed to work as normal. This should be the policy for all validators.**" — 2026-07-31

---

## 3. Run time: three outcomes per clue, not two

**This is the central fix.** The code today has two outcomes — *removed something* / *nothing to
remove* — and folds "couldn't read it" into the second. That fold is the false all-clear.

Every clue a validator touches lands in exactly one of three buckets:

| outcome | meaning | reported as |
|---|---|---|
| **CHECKED — CLEAN** | read under a rule we trust; every candidate has support | counts toward the green total |
| **CHECKED — VIOLATED** | read under a rule we trust; candidates lack support | eliminations / highlights, **loud** |
| **UNCHECKED** | we could not read it under any rule we trust | **counted separately and named**, never green |

An UNCHECKED clue is not a failure and not a pass. It is an abstention, and the toast must say so:

> *"Cages — 12 of 14 checked, nothing to remove. 2 cages were not checked (their corner number is
> not a sum of different digits)."*

Never `checked 14, all clear`. Never a bare `nothing to remove` when the true count is 12.

**Why the leak is acceptable here.** "2 cages were not checked" does point at those cages. That was
weighed and accepted:

> "This is already a common enough occurrence, that most players would not be tipped off by it,
> since this happens regularly for normal puzzles. Our detection functions are not perfect."
> — 2026-07-31

**Structural impossibility stays loud** (v3.157 stands): if a clue cannot be satisfied by *any*
board — before the player's marks are considered — that is our misread or a genuinely broken clue,
and we say so. What we may not do is *diagnose* it (P2): report "this cage does not work as a sum
of different digits", not "this puzzle is a troll".

**Highlight mode is what makes P1 affordable.** With `validateHighlightMode` on, a wrong elimination
is a visible orange mark the player can see and reverse, not a silent deletion. Letting a
misidentified clue fail loudly is cheap there and expensive in removal mode — worth remembering when
weighing any future "but it would over-remove" objection.

---

## 4. Menu time: three row states, and the evidence that may set them

| state | when | behaviour |
|---|---|---|
| **live** | **the default, and by a wide margin** — everything not positively identified below | normal row, normal run, full loudness |
| **grey** | (a) we cannot determine **which** drawn clue this applies to, or where it is; (b) the rules **declare** that clues lie *and* the probe refutes; (c) two or more readings **we support** could apply and the puzzle does not say which clue is which | listed, disabled, hover explains why; **rescued by "Validate selection only" — and that run is real, and may fail**; excluded from run-all and ↻ auto-update; eyeball stays live |
| **drop** | we **positively recognise** a variant we do not implement — from the rules text or from pure arithmetic, **never from the solution** | removed from the menu |

### The bar for grey and drop: positive identification

**We may only demote a row for a reason we can name.** This is the governing constraint, and it
falls out of a question that has no good answer otherwise: *how do we know we can't validate this?*

- **From the solution?** No. That route can't tell "this puzzle uses a variant" from "this puzzle is
  lying on purpose", so acting on it risks revealing a wrogn puzzle. §5 already forbids it.
- **From the rules?** Only for variants we already know exist. **We cannot search for what we don't
  know is out there.** A cue list can recognise the variants we've met; it is silent on the next one.

So the bar is: **can we point at the specific thing — a rules phrase we recognise, or an arithmetic
fact — that says our rule doesn't apply here? If not, the row is live and we default to the standard
reading** (for cages, the distinct-digit sum).

> "If we are not sure, then I had rather default to showing the validator as normal, assuming that it
> can locate the clue in the grid, and then we play dumb, since we really do not know what is there.
> This is pretty much how life works. You are given a tool that may or may not work, but you are told
> what it is supposed to do. You try it, and if it doesn't work, then you know that you are using the
> wrong tool, or that the tool does not fit the job. **That is not a failure, it is doing what it is
> supposed to do.**" — 2026-08-01

That last sentence is the whole design in one line. A validator that runs and fails on a clue it
wasn't built for is **working correctly**. It is not an error state to be engineered away.

**Consequence — `drop` shrinks to almost nothing.** It survives only for variants we positively
recognise, so the list starts near-empty and grows one entry at a time as we meet them. In
particular a systematic probe refutation **no longer drops a row on its own**; that branch of
`validatorTrust` goes (§7).

**Consequence — grey (c) covers mixed readings.** A puzzle holding both sum and product cages gets
**both** validators listed, **both greyed**, and the solver picks per cage with the checkbox — unless
the puzzle labels which cage is which, in which case each goes live on its own clues.

> "if we can tell that a puzzle contains both sum and product cages, then it would be nice to have
> both validators available to the solver, but both grayed out, unless it is already explicitly told
> which cage is which. If they are supposed to figure it out for themselves, then we would not
> indicate which is which, and they would need to trial and error it to find out." — 2026-08-01

Sources: grey semantics 2026-07-17; the (b) branch and `drop` 2026-07-31.

> "if there is a cage in the puzzle, then we would show the cage validator, and it would not be
> grayed out. The only time it would be grayed out, is if we can not actually detect where it is in
> the puzzle." — 2026-07-31

> "if it is clear from the rules that the validator is not meant for that rule … we can just disable
> the validator completely, and not gray it out. There is no reason for it to be available."
> — 2026-07-31 (`ay6r6mmu5w` "Close Enough", `5kx4d90kcm` "Sigma or Pi")

### Two different reasons to leave the row out, and only one of them is delicate

This is where the design was misread once already, so it is spelled out. Grey and drop get reached
by two unrelated roads:

**Road A — the puzzle hides something (leak concern, high stakes).** Wrogn puzzles, liar clues,
cryptic omissions. Here the row's state is *itself* information, and getting it wrong spoils the
puzzle. The policy is therefore conservative in one direction only: **stay live, behave normally,
say nothing.** Grey is permitted here *only when the puzzle has already announced the mechanic
itself* (branches b and c) — the player has been told, so a greyed row tells them nothing new.

**Road B — the puzzle uses a rule we don't implement (capability, low stakes).** `ay6r6mmu5w`
"Close Enough" (sums rounded to the nearest 5), `5kx4d90kcm` "Sigma or Pi" (sum *or* product,
solver's choice). **These are not wrogn puzzles and there is nothing to leak** — the rules state the
variant outright.

> "I was not concerned about leaking information on the examples, since they were not cryptic clue
> or wrogn puzzles, they just had a different ruleset from the standard cages. … It really is not a
> big deal if it is present or not, since the user should have read the rules and realized that it
> would not work there anyway." — 2026-08-01

**Calibration, and it matters:** Road B decisions are cheap. Do not buy Road B precision with Road A
costs, and do not spend heavy engineering on it. Getting a Road B row wrong costs a menu entry the
player already knew was useless. That is the yardstick the v3.184 whole-puzzle cage gate fails (§7)
— it disabled cage validation on 14 honest puzzles, silently, to tidy up a Road B case.

**Worked example — `5kx4d90kcm` "Sigma or Pi" is grey, not drop.** We implement sum, which is one of
the two readings the rules offer. So the row is greyed, and the player rescues it with "Validate
selection only":

> "In the current state of the script, it only worked on sum cages, so if they had narrowed down
> some candidates in a cage, they could run it on the cage, and if it failed, then they would know
> that this was a product cage." — 2026-08-01

**That failure is the product, not a malfunction.** It is the same discovery mechanism as the troll
cage in §2, reached through the checkbox instead of the plain click — which is why a greyed row's
selection-run must be fully real and fully loud (§3). `ay6r6mmu5w` "Close Enough" drops instead,
because rounded sums are a rule we cannot check under *any* reading, so there is nothing to offer.

**Provenance, so this isn't reopened.** The two quotes above are not in conflict. The first
(2026-07-31 12:02, session "Script on/off switch and puzzle validators") answered a question scoped
to a specific residue — the 29 catalogued puzzles with no arithmetic tip-off and no published
solution — and is a **Road B** statement throughout. Its "those types of puzzles are the only ones
where I am concerned about leaking information" refers to **wrogn puzzles generally, not to those
two examples** (clarified 2026-08-01). The second (2026-07-31 19:54, "Cage validation issue") is
Road A. **Default live; grey and drop are narrow exceptions, and both need rules-text evidence.**

### What may be evidence for grey / drop

**Only the rules text.** A puzzle that hides its twist is *entitled* to hide it from us too:

> "a puzzle might have a thermo in the puzzle, and the rules might say that 'circles contain odd
> digits, and lines are German whispers, and those are the only rules'. … But this is cryptic, so
> for our validators, we would present the player with the thermo validator, and nothing else, so
> that we are not spoiling it for them. **I am fine with missing validators if it errs on the side
> of caution.**" — 2026-07-31

On that puzzle the Thermo row is **live and fully functional**. It runs, it fails, and that failure
is how the player learns. We do not neuter it; we do not remove it. What we *do* remove are the rows
for the rules the twist actually uses (odd circles, whispers) — because listing those would announce
the twist. Absence of a row we were never going to be sure about is normal; a row that lies is not.

### Fog

**Not a blanket lockout.** That was proposed on 2026-07-23 05:29, corrected by the same person 21
minutes later at 05:50, and reverted in v3.134.0 — a detail easily missed by reading only the first
message.

> "I did not intend to completely disable the validators, just make it so that hovering over the
> eyeball icon had no effect other than to explain the reason why it was disabled." — 2026-07-23

Three separate rules:

1. **The 👁 preview is disabled on any fogged puzzle**, with a tooltip saying why. It isn't a run —
   it draws *every* clue of the type, including ones still under fog, so it leaks directly.
2. **A whole-puzzle run skips any clue with a cell still fogged** (`combineFogFilter`). Validating a
   half-hidden clue tells the player where the rest of it is.
3. **A selection run may proceed even on fogged cells.** The player chose those cells; deducing over
   what they can see is exactly what solving the puzzle requires of them anyway.

> "if they want to validate something on their own, even if it is fogged, then that is absolutely
> something that they would need to be able to do anyway to solve the puzzle." — 2026-08-01

Rule 3 is a **change from current code** — `combineFogFilter` skips fogged clues in every mode.

**Fog is the one place UNCHECKED is not named (§3).** "5 of 12 cages checked" would reveal that
there are 12 cages, which is the fogged content itself. Under fog the count is reported silently.
This is the single exception to the never-a-false-green rule, and it is defensible only because the
player already knows the board is hiding things from them — the reading "I checked everything" isn't
available to them the way it is on a clear board.

---

## 5. What the published solution may and may not do

The solution is the most dangerous tool in the file. Three permitted uses, one hard prohibition.

**MAY — certify.** Run every validator against the answer at load. All clean ⇒ this is an ordinary
puzzle, our readings are right, proceed with full confidence.

> "For puzzles with a solution, check that each clue in the puzzles validates, and if so, then
> certify that this is not a wrogn puzzle." — 2026-07-31

**MAY — identify the ruleset.** Work backwards from the answer to determine *which* variant rule a
clue type is using, then validate under that rule (§6). This is the solution making a validator
**stronger**.

**MAY — set the menu state**, but only ever *in combination with a rules cue*, per §4. A refutation
with no cue means "the puzzle has a secret", and a secret is not ours to spoil — the row stays
live.

**MAY NOT — silence a check.** ❌ **A clue may never be muted, skipped, or counted-as-checked because
the solution contradicts it.** This is what `muteSolutionRefuted` does today and it must go: it
converts "the answer disagrees with our reading" into a green all-clear, violating P2 (it diagnoses)
and P3 (it lies). If the solution says our reading is wrong, the honest options are to **read it
correctly** (§6) or to **mark it UNCHECKED** (§3) — never to check it silently and pass.

The pre-existing hard rule stands and is unchanged: **no solution digit may ever reach a removal, a
candidate set, or any player-visible string.** Breaking that turns a validator into a solver.

---

## 6. Cages: stop muting, start reading

Cages are where this came to a head, and they are the worked example for every clue type.

A killer-style cage's corner number is a distinct-digit **sum** ~82% of the time. It is also, in the
wild: a **product**, a **difference**, a **sum with repeats allowed**, a **full digit list** ("4456"
in a 4-cell cage), a **partial list** (a lone "9" = at least one 9 in here), and a long open-ended
tail of one-offs.

The design goal is a **multi-ruleset cage validator** that reads the cage under whichever rule the
puzzle is actually using:

1. **Try every known ruleset against every cage in the puzzle.**
2. **Identify puzzle-wide, not per-cage.** A non-sum cage rule is a puzzle-wide rule — a
   Multiplication-Cages puzzle applies it to every cage it draws. If exactly one ruleset explains
   *all* the cages, that is the puzzle's ruleset.
3. **Use the solution as ground truth where one exists** to confirm the choice.
4. **Label the row with what we concluded** — `Cage (sum)`, `Cage (product)`, `Cage (repeats
   allowed)`. A puzzle that genuinely offers two readings shows both rows.
5. **Any cage no ruleset explains is UNCHECKED** (§3) — named, not counted as clean, not
   eliminated against.

> "One big help would be to look at the solution, and then work backward to determine what rule is
> being used, and then validate it on those grounds. … we can determine which is being used, by
> validating the cages with several rulesets to find out which one fits. If all the cages fit only
> one ruleset, then we have found the validator to use on that puzzle." — 2026-07-31

### Worked example — `67rr7DMJDh` "121" (Dorlir)

The puzzle that started this. Its rules are ordinary: *"The digits within a cage must sum to the
small clue in the top-left corner."* It has **one** real killer cage: **36 cells, total 121.**

The cage is completely honest — summing the puzzle's own solution over those 36 cells gives exactly
121. It is a **repeats-allowed sum cage**, which the rules never say out loud because at 36 cells
over 9 digits repeats are unavoidable. Nothing is lying; `cage.unique` is not set.

`cageCombinations` enumerates **distinct-digit** subsets only, so 36 cells over 9 digits yields zero
combinations. Today that means: v3.183 makes it silent, it lands in the count, and the toast says
all clear — the exact false green that opened this whole review. And v3.186 then *drops* the Cages
row entirely, on a 1-of-1 refutation.

**Both are wrong, and neither is a policy problem.** This is a §6 capability gap:

- It is **positively identifiable with no solution and no rules cue at all**: *cells > digits ⇒
  repeats are forced ⇒ a distinct-digit reading cannot apply.* Pure arithmetic, visible to the
  player, leaks nothing.
- **Right answer:** implement the repeats-allowed branch and validate it as `Cage (repeats
  allowed)`. Even the weak min/max bound is sound and beats silence.
- **Interim answer:** report it UNCHECKED with that arithmetic reason. Never drop the row, never
  count it as clean.

File this under capability, not under wrogn. It was miscategorised as a decoy once already.

### The measurement that said "impossible" answered a different question

`tools/cage_variants.py` concluded classification fails: only 38% of impossible-as-sum cages narrow
to a single alternative reading, and those are right 58% of the time. That figure is real but it
measures **one cage, in isolation, with no solution.** The design above uses **all the cages in the
puzzle at once, plus the solution** — a far stronger signal that has never been measured. The
existing number is not evidence against it.

**This is the concrete next experiment:** for each solution-bearing puzzle with cages, intersect the
set of rulesets consistent with *every* cage, and report how often that intersection is exactly one
and matches the solution. Until that runs, "classification is impossible" is an unsupported claim.

---

## 7. What this means for the current code

Every item below is a place where shipped behaviour contradicts this document.

| site | what it does | required change |
|---|---|---|
| `muteSolutionRefuted` (≈7872) + its 6 call sites (Kropki, XV, difference dot, cage, thermo, arrow) | silently drops solution-refuted clues, adds them back to the reported count | **delete the mute.** Refuted clues either get read correctly (§6) or are reported UNCHECKED (§3) |
| `cagesShown = cageMute.muted + countSumlessKillerCages()` (≈9188) | inflates the checked count with clues that were never checked — the false green | count and name them separately; never fold into the clean total |
| `computeCageRemovals` zero-combination path (v3.183, ≈9194) | silently drops the cage | UNCHECKED with an honest, non-diagnostic reason |
| v3.184 whole-puzzle cage gate | one impossible cage disables cage validation puzzle-wide, silently — 14 honest puzzles lose their cage validator at the measured 83% precision | remove. It pays a Road A price (silent loss on honest puzzles) to tidy a Road B case the player was already told about (§4). Replaced by per-cage UNCHECKED + §6 ruleset identification |
| `validatorTrust` (≈14963) | `ok` means *live but neutered*; `drop` fires on probe + `validatorTypeNamedInRules` | `ok` must mean **fully live**. **Delete the `drop` branch** — a probe refutation is not a positive identification (§4), so it may not remove a row. `grey` via `rulesDeclareUnreliable` stays |
| fog handling | `combineFogFilter` skips fogged clues in every mode; the 👁 is disabled | keep 1 and 2; **let a selection run proceed on fogged cells** (§4). Suppress the UNCHECKED count under fog |
| toast/summary text | says "nothing to remove" when clues went unchecked | three-bucket reporting per §3 |

`probeInfo` / `buildSolutionProbeState` / `probeSystematic` are **kept** — the probe is the
certification and ruleset-identification machinery of §5, and it was the right idea. What changes is
what we do with a refutation: no longer "go quiet", now "read it properly, or say we didn't read it".

---

## 8. Open questions

1. **The puzzle-wide cage-ruleset measurement** (§6). Run it before anything else — it sets how much
   of the problem §6 can actually absorb.
2. **UNCHECKED wording.** The reason string must be honest without diagnosing (P2). "This cage's
   corner is not a sum of different digits" is arithmetic the player could do themselves; "this
   cage is a decoy" is the answer. Draft each one against that line.
3. **The known-unsupported variant list** that `drop` now depends on (§4). It starts empty. Adding
   an entry means we met a variant, recognised it from the rules, and chose not to implement it —
   so each entry should record which puzzle taught us.

**Decided, not open:**

- **Removal mode acts exactly like highlight mode** (2026-08-01). P1 applies equally in both; a
  player in removal mode knows they are playing with fire and can switch to highlight mode for
  safety. Do not build a separate, more cautious removal path. The mode may be retired entirely
  later.
