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
| **live** | **the default, and the overwhelming majority.** A clue of this shape is drawn and nothing in the *rules text* says our rule isn't the puzzle's rule | normal row, normal run, full loudness |
| **grey** | (a) we cannot determine **which** drawn clue this validator applies to, or where it is; (b) the rules **declare** that clues lie; or (c) the rules hand the clue's type to the solver **and we can check at least one of the offered readings** | listed, disabled, hover explains why; **rescued by "Validate selection only" — and that run is real, and may fail**; excluded from run-all and from ↻ auto-update; eyeball stays live |
| **drop** | the rules state a rule we **cannot check at all** — sums rounded to the nearest multiple of 5, a cell's value differing from its digit | removed from the menu |

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

### The one hard exception: fog

Fogged puzzles disable the affected functions outright (2026-07-23). Revealing hidden content
outranks everything in this document.

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
| `validatorTrust` (≈14963) | structure is **right** and stays | but `ok` must mean *fully live*, not *live-but-neutered*. Its dependence on the mute for the "quiet" behaviour goes away with the mute |
| toast/summary text | says "nothing to remove" when clues went unchecked | three-bucket reporting per §3 |

`probeInfo` / `buildSolutionProbeState` / `probeSystematic` are **kept** — the probe is the
certification and ruleset-identification machinery of §5, and it was the right idea. What changes is
what we do with a refutation: no longer "go quiet", now "read it properly, or say we didn't read it".

---

## 8. Open questions

1. **The puzzle-wide cage-ruleset measurement** (§6). Run it before anything else — it sets how much
   of the problem §6 can actually absorb.
2. **Removal mode vs highlight mode.** P1 says let a misidentified clue fail. In highlight mode that
   is cheap. In removal mode it silently deletes correct candidates. Should P1's "let it fail" be
   restricted to highlight mode, or should removal mode refuse to act on any clue that isn't
   CHECKED under a trusted ruleset? Not yet decided.
3. **UNCHECKED wording.** The reason string must be honest without diagnosing (P2). "This cage's
   corner is not a sum of different digits" is arithmetic the player could do themselves; "this
   cage is a decoy" is the answer. Draft each one against that line.
