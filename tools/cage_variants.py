#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# cage_variants.py — what does a killer-style cage's corner number actually MEAN?
#
# Why this exists (2026-07-31): v3.183 stopped calling zero-combination cages
# "impossible", because a cage corner is not always a distinct-digit sum — it can
# be a product, a difference, a repeats-allowed sum, a digit LIST ("4456"), or a
# partial list ("at least one 9 in here"). That change made the validator SILENT
# on those cages. The open question is whether we could instead IDENTIFY the
# reading and validate the cage properly.
#
# This harness answers the two things that decision turns on, using each puzzle's
# own published solution as ground truth:
#
#   1. DISTRIBUTION — of the cages our distinct-sum reading cannot explain, what
#      are they really? (measured, not guessed)
#   2. SEPARABILITY — before looking at any solution, how many readings are
#      ARITHMETICALLY possible for that cage? If exactly one survives, we can
#      identify it with no rules text at all. That is the cheap half of the
#      classifier the rejected v3.183 cue detector never tried.
#
#     python tools/cage_variants.py              # summary
#     python tools/cage_variants.py --detail     # + example ids per bucket
#     python tools/cage_variants.py --id <id>    # one puzzle, cage by cage
#
# Reads the catalog corpus (68 MB) with the json module and prints only the small
# answer — never load the corpus into a conversation.
# ─────────────────────────────────────────────────────────────────────────────
import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from itertools import combinations, combinations_with_replacement
from math import prod

CORPUS = r'C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad Catalog\classify\data\corpus.json'

# The readings a corner number can carry. Order matters only for reporting.
READINGS = ['distinct_sum', 'repeat_sum', 'product', 'difference',
            'digit_list', 'partial_list']


def build_grid(sol, n):
    if isinstance(sol, list):
        sol = ''.join(str(x) for x in sol)
    if not isinstance(sol, str):
        return None
    sol = sol.strip()
    if len(sol) != n * n or not re.fullmatch(r'[1-9]+', sol):
        return None
    return {(i // n, i % n): int(ch) for i, ch in enumerate(sol)}


def cells_from_string(s, n):
    out = []
    for m in re.finditer(r'r(\d+)c(\d+)', s or '', re.I):
        r, c = int(m.group(1)) - 1, int(m.group(2)) - 1
        if not (0 <= r < n and 0 <= c < n):
            return None
        out.append((r, c))
    return out or None


def corner_text(cage):
    """The cage's visible corner value as a raw STRING, or None.

    Deliberately keeps the string: '4456' is a digit list, and reading it only as
    the number 4456 is exactly the misread this whole exercise is about.
    """
    for k in ('sum', 'value'):
        v = cage.get(k)
        if v is None:
            continue
        s = str(v).strip()
        if s:
            return s
    return None


# ── the readings, as predicates on the SOLVED digits ─────────────────────────
def holds(reading, digits, text, n):
    """Does this reading explain `digits` (the cage's solved digits) given `text`?"""
    try:
        val = float(text)
    except ValueError:
        val = None
    if reading == 'distinct_sum':
        return val is not None and len(set(digits)) == len(digits) and sum(digits) == val
    if reading == 'repeat_sum':
        return val is not None and len(set(digits)) != len(digits) and sum(digits) == val
    if reading == 'product':
        return val is not None and prod(digits) == val
    if reading == 'difference':
        return val is not None and (max(digits) - min(digits)) == abs(val)
    if reading == 'digit_list':
        if not re.fullmatch(r'[1-9]+', text) or len(text) != len(digits):
            return False
        return sorted(text) == sorted(str(d) for d in digits)
    if reading == 'partial_list':
        if not re.fullmatch(r'[1-9]+', text):
            return False
        need, have = Counter(text), Counter(str(d) for d in digits)
        return len(text) < len(digits) and all(have[k] >= v for k, v in need.items())
    return False


# ── the readings, as ARITHMETIC FEASIBILITY (no solution consulted) ──────────
# "Could any assignment of digits to this cage satisfy this reading at all?"
# This is what a shipping classifier would have to work from.
_feas_cache = {}


def feasible(reading, k, text, n):
    key = (reading, k, text, n)
    if key in _feas_cache:
        return _feas_cache[key]
    _feas_cache[key] = r = _feasible(reading, k, text, n)
    return r


def _feasible(reading, k, text, n):
    digits = range(1, n + 1)
    try:
        val = float(text)
    except ValueError:
        val = None
    if reading == 'digit_list':
        return bool(re.fullmatch(r'[1-9]+', text)) and len(text) == k and \
            all(int(c) <= n for c in text)
    if reading == 'partial_list':
        return bool(re.fullmatch(r'[1-9]+', text)) and 0 < len(text) < k and \
            all(int(c) <= n for c in text) and \
            max(Counter(text).values()) <= k
    if val is None:
        return False
    if reading == 'difference':
        return 0 <= abs(val) <= n - 1
    if reading == 'distinct_sum':
        if k > n:
            return False
        return any(sum(c) == val for c in combinations(digits, k))
    if reading == 'repeat_sum':
        # A sum reachable only WITH a repeat. Cheap bound + a bounded search.
        if not (k * 1 <= val <= k * n):
            return False
        if k > 14:                       # bounds above are tight enough by then
            return True
        return any(sum(c) == val and len(set(c)) != len(c)
                   for c in combinations_with_replacement(digits, k))
    if reading == 'product':
        if val <= 0 or val != int(val):
            return False
        v = int(val)
        if v > n ** k:
            return False
        # factorable into exactly k digits from 1..n?
        seen = {1}
        for _ in range(k):
            nxt = set()
            for s in seen:
                for d in digits:
                    p = s * d
                    if v % p == 0 and p <= v:
                        nxt.add(p)
            seen = nxt
            if not seen:
                return False
        return v in seen
    return False


# ── the rules-text cue for each reading ──────────────────────────────────────
# Generous on purpose: the question is whether a cue ADDS anything on top of
# arithmetic feasibility, so a weak cue that over-fires is the honest test — a
# narrower one can only score worse on recall.
CUE = {
    'product':      re.compile(r'\bproduct|multipl'),
    'repeat_sum':   re.compile(r'repeat|may\s+repeat|can\s+repeat|not\s+necessarily\s+distinct'),
    'difference':   re.compile(r'\bdifference'),
    'digit_list':   re.compile(r'\b(?:contains?|holds?|lists?|shows?)\b[^.]{0,40}\bdigits?\b'
                               r'|\bdigits?\b[^.]{0,40}\b(?:shown|listed|indicated|given)\b'),
    'partial_list': re.compile(r'at\s+least\s+one|appears?\s+at\s+least|contains?\s+(?:a|an|the)\s+\d'),
    'distinct_sum': re.compile(r''),
}


def rules_blob(entry):
    p = entry.get('puzzle') or {}
    md = p.get('metadata') or {}

    def r(o):
        v = o.get('rules')
        if isinstance(v, list):
            return ' '.join(str(x) for x in v)
        return v if isinstance(v, str) else ''
    return ((entry.get('title') or '') + ' ' + r(p) + ' ' + r(md)).lower()


def cages_of(entry):
    """-> (n, grid, [(cage_dict, cells)]) or None."""
    p = entry.get('puzzle')
    if not isinstance(p, dict):
        return None
    n = entry.get('gridSize') or 9
    if not isinstance(n, int) or not (3 <= n <= 9):
        return None
    G = build_grid(p.get('solution') or (p.get('metadata') or {}).get('solution'), n)
    if G is None:
        return None
    out = []
    for cage in p.get('cages') or []:
        if not isinstance(cage, dict) or cage.get('style') != 'killer':
            continue
        text = corner_text(cage)
        if text is None:
            continue
        cs = cells_from_string(cage.get('cells'), n)
        if not cs or len(cs) < 2:
            continue
        out.append((cage, text, cs))
    return (n, G, out) if out else None


# What the SHIPPING validator will even look at: a corner that parses as a finite
# number. "<=10", "x", "AB" and friends are rejected upstream (countSumlessKiller
# -Cages counts them, nothing validates them), so including them here would
# inflate every "we can't explain it" figure with cages we never touch.
def numeric_corner(text):
    try:
        v = float(text)
    except ValueError:
        return False
    return v == v and abs(v) != float('inf')


def classify(entry):
    """-> list of per-cage records for one puzzle."""
    got = cages_of(entry)
    if not got:
        return []
    n, G, cages = got
    recs = []
    for cage, text, cs in cages:
        if not numeric_corner(text):
            recs.append({'text': text, 'k': len(cs), 'digits': [G[x] for x in cs],
                         'true': [], 'feasible': [], 'nonnumeric': True})
            continue
        digits = [G[x] for x in cs]
        true = [r for r in READINGS if holds(r, digits, text, n)]
        feas = [r for r in READINGS if feasible(r, len(cs), text, n)]
        recs.append({
            'text': text, 'k': len(cs), 'digits': digits,
            'true': true, 'feasible': feas,
        })
    return recs


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--detail', action='store_true')
    ap.add_argument('--id')
    ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()

    corpus = json.load(open(CORPUS, encoding='utf-8'))

    if a.id:
        for e in corpus:
            if e.get('id') == a.id or e.get('cpId') == a.id:
                print(e.get('id'), '-', (e.get('title') or '')[:60])
                for r in classify(e) or []:
                    print('  corner %-6s %2d cells  digits=%-24s true=%-28s feasible=%s'
                          % (r['text'], r['k'], r['digits'],
                             ','.join(r['true']) or '(none)',
                             ','.join(r['feasible']) or '(none)'))
                return
        print('not found:', a.id)
        return

    tot = 0
    true_ct = Counter()
    puzzles_with = defaultdict(set)
    examples = defaultdict(list)
    # separability, restricted to the cages our distinct-sum reading cannot make:
    sep = Counter()
    sep_correct = Counter()
    risk = Counter()
    nonnum = 0
    scored_puz = 0
    for e in corpus:
        recs = classify(e)
        if not recs:
            continue
        scored_puz += 1
        pid = e.get('id')
        title = (e.get('title') or '')[:34]
        blob = rules_blob(e)
        for r in recs:
            if r.get('nonnumeric'):
                nonnum += 1
                continue
            tot += 1
            label = r['true'][0] if r['true'] else 'unexplained'
            if len(r['true']) > 1:
                label = r['true'][0]           # first match wins for the headline
            true_ct[label] += 1
            puzzles_with[label].add(pid)
            if len(examples[label]) < 8:
                examples[label].append(
                    (pid, title, r['text'], r['k'], r['digits']))
            # RISK TODAY: the cage looks like an ordinary killer cage (distinct_sum
            # is arithmetically fine) but the solution says it is something else.
            # Every one of these is validated under the wrong rule right now.
            if 'distinct_sum' in r['feasible']:
                risk['looks_ordinary'] += 1
                if 'distinct_sum' not in r['true']:
                    risk['actually_not'] += 1
                    if r['true']:
                        risk['actually_' + r['true'][0]] += 1
                    if len(examples['RISK']) < 10:
                        examples['RISK'].append(
                            (pid, title, r['text'], r['k'], r['digits']))
                continue
            # SEPARABILITY: only the cages v3.183 goes silent on.
            alts = [x for x in r['feasible'] if x != 'distinct_sum']
            sep[len(alts)] += 1
            if len(alts) == 1:
                sep_correct['once' if alts[0] in r['true'] else 'once_wrong'] += 1
                # …and the same decision with a rules cue required as well.
                if CUE[alts[0]].pattern and CUE[alts[0]].search(blob):
                    sep_correct['cued' if alts[0] in r['true'] else 'cued_wrong'] += 1
        if a.limit and scored_puz >= a.limit:
            break

    print('puzzles with a solution AND >=1 readable cage: %d' % scored_puz)
    print('cages with a NUMERIC corner (the only ones anything validates): %d' % tot)
    print('cages skipped, corner is not a number ("<=10", "x", a label): %d\n' % nonnum)
    print('WHAT THE CORNER NUMBER REALLY MEANS  (per the puzzle\'s own solution)')
    print('%-14s %8s %7s   %8s' % ('reading', 'cages', 'share', 'puzzles'))
    for k in sorted(true_ct, key=lambda x: -true_ct[x]):
        print('%-14s %8d %6.2f%%   %8d'
              % (k, true_ct[k], 100 * true_ct[k] / tot, len(puzzles_with[k])))

    nsep = sum(sep.values())
    print('\nSEPARABILITY — cages where distinct_sum is ARITHMETICALLY IMPOSSIBLE')
    print('(the ones v3.183 counts but never validates): %d' % nsep)
    print('  how many other readings remain arithmetically possible?')
    for k in sorted(sep):
        print('    %d alternative(s): %6d  (%.1f%%)' % (k, sep[k], 100 * sep[k] / max(1, nsep)))
    once = sep_correct['once'] + sep_correct['once_wrong']
    if once:
        print('  of the %d with EXACTLY ONE alternative, the solution confirms it'
              ' %d times (%.1f%%)'
              % (once, sep_correct['once'], 100 * sep_correct['once'] / once))
    cued = sep_correct['cued'] + sep_correct['cued_wrong']
    if cued:
        print('  requiring a RULES CUE for that reading too: fires %d times,'
              ' correct %d (%.1f%%)'
              % (cued, sep_correct['cued'], 100 * sep_correct['cued'] / cued))

    print('\nRISK TODAY — cages that LOOK like ordinary killer cages')
    print('(distinct_sum arithmetically fine, so the validator runs on them): %d'
          % risk['looks_ordinary'])
    print('  solution says they are NOT a distinct sum: %d  (%.2f%%)'
          % (risk['actually_not'],
             100 * risk['actually_not'] / max(1, risk['looks_ordinary'])))
    for k in sorted(risk):
        if k.startswith('actually_') and k != 'actually_not':
            print('      of which %-14s %d' % (k[9:], risk[k]))

    if a.detail:
        print('\n── cages the validator RUNS ON but the solution refutes ──')
        for pid, title, text, kk, digits in examples['RISK']:
            print('  %-14s %-34s corner %-6s %2d cells  %s'
                  % (pid, title, text, kk, digits))
        for k in sorted(true_ct, key=lambda x: -true_ct[x]):
            print('\n── %s ──' % k)
            for pid, title, text, kk, digits in examples[k]:
                print('  %-14s %-34s corner %-6s %2d cells  %s'
                      % (pid, title, text, kk, digits))


if __name__ == '__main__':
    main()
