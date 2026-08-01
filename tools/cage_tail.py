#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# cage_tail.py — WHAT IS LEFT after the four shipped cage rulesets?
#
# v3.194 ships sum (distinct + repeats-allowed), product and digit list. This
# sizes everything those four cannot read, so the question "what else is worth
# building?" gets an answer with counts instead of anecdotes.
#
# Two passes over every cage the shipped rulesets fail on:
#   1. CANDIDATE READINGS — try a wider menu of mechanical rules (difference,
#      quotient, min, max, partial list, average, off-by-one, rounded, modular,
#      multi-digit concatenation, digit counts). Anything that lands here is a
#      ruleset we COULD build; anything that doesn't is a genuine one-off.
#   2. RULES SIGNATURES — bucket the survivors by what their rules text says, so
#      the one-off pile is described rather than just counted.
#
#     python tools/cage_tail.py            # the table
#     python tools/cage_tail.py --examples  # + puzzle ids per bucket
# ─────────────────────────────────────────────────────────────────────────────
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from math import prod

sys.path.insert(0, __file__.rsplit('\\', 1)[0] if '\\' in __file__ else '.')
import cage_rulesets as CR

SHIPPED = ['sum_distinct', 'sum_any', 'product', 'digit_list']


# ── the wider menu of mechanical readings ────────────────────────────────────
def extra_readings(digits, text, n, cells):
    """Every candidate reading (beyond the four shipped) that explains this cage."""
    out = []
    k = len(digits)
    val = CR.numval(text)
    lo, hi = min(digits), max(digits)
    total, pr = sum(digits), prod(digits)

    if val is not None:
        if k == 2 and abs(digits[0] - digits[1]) == abs(val):
            out.append('difference')
        if k == 2 and lo > 0 and hi == lo * val:
            out.append('quotient')
        if lo == val:
            out.append('minimum')
        if hi == val:
            out.append('maximum')
        if k and total == val * k:
            out.append('average')
        # "Knapp daneben" / "Close Enough" — the total is off by a fixed step
        if abs(total - val) == 1:
            out.append('sum_off_by_one')
        for m in (5, 10):
            if val % m == 0 and abs(total - val) * 2 <= m:
                out.append('sum_rounded_%d' % m)
                break
        for m in (9, 10):
            if total % m == val % m and total != val:
                out.append('sum_mod_%d' % m)
                break
        # the cage read as ONE multi-digit number, row-major (3-Digit Killer,
        # Welcome 2025). Only meaningful when the cells form a line.
        if k <= 6:
            rowmajor = [d for _, d in sorted(zip(cells, digits))]
            if int(''.join(str(d) for d in rowmajor)) == val:
                out.append('concat_number')
        # a lone corner digit counting something
        if 0 <= val <= k:
            if sum(1 for d in digits if d % 2 == 1) == val:
                out.append('count_odd')
            if sum(1 for d in digits if d % 2 == 0) == val:
                out.append('count_even')

    if text and re.fullmatch(r'[1-9]+', text):
        need, have = Counter(text), Counter(str(d) for d in digits)
        if len(text) < k and all(have[c] >= q for c, q in need.items()):
            out.append('partial_list')
        # "exactly two of the three digits shown" — Liar Zone
        if len(text) > k and sum(1 for c in text if have[c]) >= k:
            out.append('subset_of_corner')
    return out


# ── rules signatures for whatever survives ───────────────────────────────────
SIGNATURES = [
    ('value≠digit (doubler/multiplier)',
     re.compile(r'\bdoubler|\bvalue\s+of\s+(?:a\s+|the\s+)?cell|multiplier|twice\s+that\s+of', re.I)),
    ('letters stand for unknown sums',
     re.compile(r'letters?\s+(?:represents?|stands?\s+for)|same\s+letter\s+have\s+the\s+same', re.I)),
    ('corner is an EXPRESSION',
     re.compile(r'expression\s+in\s+the\s+top', re.I)),
    ('multi-digit numbers inside the cage',
     re.compile(r'\d-digit\s+number|multi-?digit|two-digit\s+number|comprised\s+of\s+1-', re.I)),
    ('rounded / approximate sums',
     re.compile(r'\brounded?\b|\bnearest\b|approximat', re.I)),
    ('modular arithmetic',
     re.compile(r'\bmodulo\b|work\s+modulo|\bremainder\b', re.I)),
    ('inequality corners (<23, >9, <=10)',
     re.compile(r'inequality|must\s+not\s+sum|\bat\s+most\b|\bno\s+more\s+than\b', re.I)),
    ('"exactly N of these digits" (liar zone)',
     re.compile(r'exactly\s+(?:one|two|three|\d)\s+of\s+the', re.I)),
    ('clones / same-shape cages',
     re.compile(r'\bclones?\b|same\s+shape', re.I)),
    ('dates',
     re.compile(r'\bday,\s*month|date\s+of\s+the', re.I)),
    ('sum PLUS something outside the cage',
     re.compile(r'plus\s+the\s+sum\s+of|aren\'t\s+in\s+any\s+cage|outside\s+the\s+cage', re.I)),
    ('a snake / path picks the cells',
     re.compile(r'\bsnake\b|draw\s+a\s+.{0,20}path', re.I)),
    ('divisor / fraction cages',
     re.compile(r'divisor|fraction', re.I)),
    ('the cage total is itself deduced',
     re.compile(r'to\s+be\s+(?:deduced|determined)|determined\s+by\s+the\s+solver', re.I)),
    ('rules DECLARE the clues lie',
     re.compile(r'\bliar\b|\bwrogn\b|all\s+clues\s+are\s+wrong|is\s+false', re.I)),
]


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--examples', action='store_true')
    a = ap.parse_args()

    corpus = json.load(open(CR.CORPUS, encoding='utf-8'))

    tot_cages = tot_puz = 0
    shipped_cages = 0
    nonnumeric = 0
    extra_ct = Counter()
    extra_puz = defaultdict(set)
    extra_ex = defaultdict(list)
    sole_extra = Counter()          # the reading is the ONLY one that fits
    survivors = 0
    survivor_puz = set()
    sig_ct = Counter()
    sig_puz = defaultdict(set)
    sig_ex = defaultdict(list)
    unsigned = []

    for e in corpus:
        got = CR.puzzle_records(e)
        if not got:
            continue
        n, recs = got
        tot_puz += 1
        pid, title = e.get('id'), (e.get('title') or '')[:36]
        blob = CR.rules_blob(e)
        cages = CR.cages_of(e)[2]
        for rec, (text, cells) in zip(recs, cages):
            tot_cages += 1
            if rec['true'] & set(SHIPPED):
                shipped_cages += 1
                continue
            if CR.numval(text) is None and not re.fullmatch(r'[1-9]+', text or ''):
                nonnumeric += 1
                continue
            ex = extra_readings(rec['digits'], text, n, cells)
            if ex:
                for r in ex:
                    extra_ct[r] += 1
                    extra_puz[r].add(pid)
                    if len(extra_ex[r]) < 5:
                        extra_ex[r].append((pid, title, text, len(cells)))
                if len(ex) == 1:
                    sole_extra[ex[0]] += 1
                continue
            survivors += 1
            survivor_puz.add(pid)
            hit = False
            for name, rx in SIGNATURES:
                if rx.search(blob):
                    sig_ct[name] += 1
                    sig_puz[name].add(pid)
                    if len(sig_ex[name]) < 5:
                        sig_ex[name].append((pid, title))
                    hit = True
                    break
            if not hit and len(unsigned) < 40:
                unsigned.append((pid, title, text, len(cells),
                                 ' '.join(blob.split())[:130]))

    print('WHAT THE FOUR SHIPPED CAGE RULESETS LEAVE BEHIND')
    print('%d solution-bearing cage puzzles, %d cages with a corner\n' % (tot_puz, tot_cages))
    print('  read by a SHIPPED ruleset (sum / repeats / product / digit list): '
          '%5d  (%5.1f%%)' % (shipped_cages, 100 * shipped_cages / tot_cages))
    print('  corner is not a number or digit string ("<=10", "x", "Alice"):    '
          '%5d  (%5.1f%%)' % (nonnumeric, 100 * nonnumeric / tot_cages))
    left = tot_cages - shipped_cages - nonnumeric
    print('  left for this report:                                            '
          '%5d  (%5.1f%%)\n' % (left, 100 * left / tot_cages))

    print('CANDIDATE RULESETS — a reading we COULD build that explains the cage')
    print('%-22s %7s %8s %10s' % ('reading', 'cages', 'puzzles', 'sole fit'))
    for k, v in extra_ct.most_common():
        print('%-22s %7d %8d %10d' % (k, v, len(extra_puz[k]), sole_extra[k]))
    print('\n  (a cage can match several — "sole fit" is how often it is the ONLY')
    print('   candidate reading, i.e. how often building it would be decisive)')

    # ── THE ONLY NUMBER THAT MATTERS: does the reading explain the WHOLE puzzle?
    # A per-cage hit is mostly coincidence — 87 cages "work modulo 9" because a
    # sum congruent to the corner happens all the time. A ruleset is worth
    # building only where it explains EVERY cage of a puzzle the shipped four
    # cannot, which is the same lesson --puzzlewide taught for the first four.
    pw = Counter()
    pw_ex = defaultdict(list)
    pw_rescued = set()
    ALL = SHIPPED + ['difference', 'quotient', 'minimum', 'maximum', 'average',
                     'sum_off_by_one', 'sum_rounded_5', 'sum_rounded_10',
                     'sum_mod_9', 'sum_mod_10', 'concat_number', 'count_odd',
                     'count_even', 'partial_list', 'subset_of_corner']
    for e in corpus:
        got = CR.puzzle_records(e)
        if not got:
            continue
        n, recs = got
        cages = CR.cages_of(e)[2]
        # already fully handled by a shipped ruleset? then it is not in the tail.
        T = set(SHIPPED)
        for rec in recs:
            T &= rec['true']
        if T:
            continue
        fits = set(ALL)
        for rec, (text, cells) in zip(recs, cages):
            here = set(rec['true']) | set(extra_readings(rec['digits'], text, n, cells))
            fits &= here
        fits.discard('sum_any' if 'sum_distinct' in fits else '')
        if not fits:
            continue
        pid, title = e.get('id'), (e.get('title') or '')[:36]
        pw_rescued.add(pid)
        for f in fits:
            pw[f] += 1
            if len(pw_ex[f]) < 6:
                pw_ex[f].append((pid, title, len(recs)))

    print('\nPUZZLE-WIDE — the reading explains EVERY cage of a puzzle the four')
    print('shipped rulesets cannot. %d such puzzles found.' % len(pw_rescued))
    print('%-22s %9s' % ('reading', 'puzzles'))
    for k, v in pw.most_common():
        print('%-22s %9d' % (k, v))
    if a.examples:
        for k, _ in pw.most_common():
            print('  ── %s ──' % k)
            for pid, title, nc in pw_ex[k]:
                print('     %-16s %-36s %2d cages' % (pid, title, nc))

    print('\nGENUINE ONE-OFFS — no reading above explains them: %d cages, %d puzzles'
          % (survivors, len(survivor_puz)))
    print('%-42s %7s %8s' % ('rules signature', 'cages', 'puzzles'))
    for name, _ in SIGNATURES:
        if sig_ct[name]:
            print('%-42s %7d %8d' % (name, sig_ct[name], len(sig_puz[name])))
    named = sum(sig_ct.values())
    print('%-42s %7d' % ('(no signature matched)', survivors - named))

    if a.examples:
        print('\nEXAMPLES per candidate reading')
        for k, _ in extra_ct.most_common():
            print('  ── %s ──' % k)
            for pid, title, text, kk in extra_ex[k]:
                print('     %-16s %-36s corner %-6s %2d cells' % (pid, title, text, kk))
        print('\nEXAMPLES per one-off signature')
        for name, _ in SIGNATURES:
            if sig_ex[name]:
                print('  %-42s %s' % (name, ', '.join(p for p, _ in sig_ex[name])))
        print('\nUNSIGNED one-offs (the true residue)')
        for pid, title, text, kk, snip in unsigned[:20]:
            print('  %-16s %-30s corner %-6s %2d cells' % (pid, title, text, kk))
            print('      %s' % snip)


if __name__ == '__main__':
    main()
