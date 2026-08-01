#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# cage_cues.py — score the rules-text cues that ELECT a non-sum cage ruleset.
#
# The ADDING A VALIDATOR banner, rule 2b: "a cue regex is the one part of a
# validator that can OVER-remove, and eyeballing phrasings does not find the
# collisions." `cage_rulesets.py --puzzlewide` established that arithmetic alone
# elects a non-sum ruleset correctly only 8 times in 10, so the cue is what
# carries an election on a puzzle with no published solution — it has to be
# right.
#
# Ground truth = the puzzle's own solution (the ruleset that explains EVERY
# cage). Scores each cue for recall and, more importantly, for FALSE ALARMS on
# ordinary sum puzzles, where electing a product row would be the visible error.
#
#     python tools/cage_cues.py            # scores
#     python tools/cage_cues.py --fp        # + every false alarm, with the
#                                           #   matched phrase, for triage
#
# The regexes here are the SOURCE of the JS ones (CAGE_PRODUCT_RE etc.). Keep
# them in step: the harness pins the JS copies, this file measures them.
# ─────────────────────────────────────────────────────────────────────────────
import argparse
import json
import re
import sys
from collections import Counter

sys.path.insert(0, __file__.rsplit('\\', 1)[0] if '\\' in __file__ else '.')
import cage_rulesets as CR

# ── the cues, as they will appear in the userscript ──────────────────────────
# Each fires only when the phrase sits within CAGE_CUE_WINDOW characters of a
# word naming a cage — the same windowing rulesHandTypeToSolver uses, and for
# the same reason: "product" appears in puzzles about box multipliers, digit
# products along lines, and prose that has nothing to do with the cages.
# SENTENCE-SCOPED, not windowed. A character window fails on exactly the
# phrasing rules text likes: "Digits may repeat along a diagonal. Digits in
# cages must sum to…" puts `repeat` 20 characters from `cage` while saying
# nothing about cages at all. The sentence is the unit that carries the subject,
# so a cue must find its cage word IN ITS OWN SENTENCE — and must not find a
# COMPETING clue noun there, which is what kills the diagonal case.
CAGE_WORD = re.compile(r'\bcages?\b|\bkiller\b|\bvaults?\b', re.I)
RIVAL_NOUN = re.compile(r'\bdiagonals?\b|\blines?\b|\barrows?\b|\brows?\b|\bcolumns?\b'
                        r'|\bregions?\b|\bboxe?s?\b|\bthermo|\bcircles?\b|\bsquares?\b', re.I)
SENT_SPLIT = re.compile(r'[.;!?\n•]+')

CUES = {
    # ta7eqdt02w "Multiplication Cages": "The digits in each cage must multiply
    # to the value of the clue in the top left corner." A sentence naming a SUM
    # as well is not a product election — it is either a sum cage described with
    # incidental product prose (e7ssrztfgn "Some Balancing Product": "the sum of
    # the unshaded cells is equal to the product of the shaded cells") or the
    # sum-or-product choice, which TYPE_CHOICE_RE already greys.
    # The phrase must bind the product TO THE CORNER VALUE. A bare "product"
    # also appears in "the cage's product value is that cell's digit", which is
    # a sum cage with product prose (e7ssrztfgn) — the one remaining false alarm
    # until this narrowed to the two forms that actually state the cage rule.
    'product': re.compile(r'\bmultiply(?:ing)?\s+to\b|\bmultiplied\s+to(?:gether)?\b'
                          r'|\bproducts?\s+of\s+(?:the\s+|all\s+(?:the\s+)?)?digits?\b', re.I),
    # Hgnj2QNJPj "Oopsy": "digits in a cage MAY repeat". 6glm0i3lka "Catch These
    # Fists": "must repeat in the cage" — a STRONGER rule we read as the weaker
    # repeats-allowed sum, which is safe (under-constrained never over-removes).
    'sum_any': re.compile(r'(?:may|can|could|must|might)\s+(?:be\s+)?repeat(?:ed)?\b'
                          r'|\brepeated\s+digits?\b'
                          r'|\brepeats?\s+(?:are\s+)?(?:allowed|permitted)\b'
                          r'|(?:need\s+not|not\s+necessarily)\s+be\s+(?:distinct|different)', re.I),
    # All four catalogue digit-list puzzles say the same thing: bm1hqfxng6 /
    # j11logmmgj "Digits in the top left of cages must appear in cages",
    # ryq9vcx3xe "…must appear in the cage", vswzxo85e4 "…must appear in the
    # enclosed cells". That is literally a PARTIAL-list rule; it collapses to an
    # exact digit list exactly when the corner carries one digit per cell, which
    # is the only case the validator reads.
    #
    # DELIBERATELY NOT MATCHED: "in any order". It is renban language
    # ("digits on a pink line form a consecutive set in any order") and scored
    # 19 false alarms on ordinary sum puzzles against 0 true positives.
    'digit_list': re.compile(r'digits?\s+in\s+the\s+top[- ]?left[^.]{0,40}must\s+appear'
                             r'|digits?\s+(?:shown|given|listed)[^.]{0,30}must\s+appear', re.I),
}
# A product sentence that also names a sum is not electing a product ruleset.
SUMWORD = re.compile(r'\bsums?\b|\btotals?\b|\badds?\s+(?:up\s+)?to\b', re.I)


def cue_fires(name, blob):
    """Sentence-scoped test; returns the matched sentence for triage, or None."""
    flat = ' '.join(blob.split())
    for sent in SENT_SPLIT.split(flat):
        if not CUES[name].search(sent):
            continue
        if not CAGE_WORD.search(sent):
            continue
        if RIVAL_NOUN.search(sent):
            continue
        if name == 'product' and SUMWORD.search(sent):
            continue
        return sent.strip()
    return None


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--fp', action='store_true', help='dump every false alarm')
    a = ap.parse_args()

    corpus = json.load(open(CR.CORPUS, encoding='utf-8'))
    stat = {k: Counter() for k in CUES}
    fps = {k: [] for k in CUES}
    misses = {k: [] for k in CUES}
    npuz = 0

    for e in corpus:
        got = CR.puzzle_records(e)
        if not got:
            continue
        n, recs = got
        npuz += 1
        pid, title = e.get('id'), (e.get('title') or '')[:36]
        blob = CR.rules_blob(e)
        T = set(CR.RULESETS)
        for r in recs:
            T &= r['true']
        T = CR.narrow(T)
        for k in CUES:
            hit = cue_fires(k, blob)
            truth = k in T
            if hit and truth:
                stat[k]['tp'] += 1
            elif hit and not truth:
                stat[k]['fp'] += 1
                # a false alarm only MATTERS when the truth is the plain sum —
                # that is the puzzle where an extra greyed row is a real cost.
                if 'sum_distinct' in T:
                    stat[k]['fp_on_sum'] += 1
                    if len(fps[k]) < 25:
                        fps[k].append((pid, title, hit[:150]))
            elif truth and not hit:
                stat[k]['fn'] += 1
                if len(misses[k]) < 15:
                    misses[k].append((pid, title))
            if truth:
                stat[k]['truth'] += 1

    print('CAGE RULESET CUES — scored on %d solution-bearing cage puzzles' % npuz)
    print('scope = the cue\'s own sentence must name a cage and no rival clue noun\n')
    print('%-12s %6s %5s %5s %5s   %8s %8s' %
          ('cue', 'truth', 'tp', 'fp', 'fn', 'recall', 'FP-on-sum'))
    for k in CUES:
        s = stat[k]
        rec = 100 * s['tp'] / s['truth'] if s['truth'] else float('nan')
        print('%-12s %6d %5d %5d %5d   %7.1f%% %8d'
              % (k, s['truth'], s['tp'], s['fp'], s['fn'], rec, s['fp_on_sum']))

    print('\nFALSE ALARMS ON ORDINARY SUM PUZZLES (the ones that cost something)')
    for k in CUES:
        print('\n── %s: %d ──' % (k, stat[k]['fp_on_sum']))
        for pid, title, phrase in (fps[k] if a.fp else fps[k][:6]):
            print('   %-16s %-36s %s' % (pid, title, phrase))

    print('\nMISSES (the cue did not fire where the solution says it should)')
    for k in CUES:
        if misses[k]:
            print('  %-12s %s' % (k, ', '.join(p for p, _ in misses[k])))


if __name__ == '__main__':
    main()
