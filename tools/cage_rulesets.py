#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# cage_rulesets.py — can we identify a puzzle's cage RULESET puzzle-wide?
#
# VALIDATOR_POLICY.md §8 open question 1, verbatim:
#   "for each solution-bearing puzzle with cages, intersect the set of rulesets
#    consistent with EVERY cage, and report how often that intersection is
#    exactly one and matches the solution."
#
# tools/cage_variants.py answered the weaker question (one cage, in isolation,
# no solution) and got "classification is impossible". This asks the stronger
# one. Two experiments:
#
#   --puzzlewide  ground truth. Which rulesets explain EVERY cage of a puzzle,
#                 per its own published solution? How often is that exactly one?
#                 Also: how often does arithmetic ALONE (no solution consulted)
#                 narrow the puzzle to one ruleset, and is it the right one?
#
#   --survey      scope. What cage variants are actually out there? Buckets the
#                 catalog by what the solution says, and dumps rules snippets
#                 for the puzzles NO reading explains — so new variants get
#                 discovered from data, not guessed.
#
# Reads the 68 MB catalog corpus with the json module and prints only the small
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

# ── the candidate RULESETS ───────────────────────────────────────────────────
# A ruleset is a RULE the puzzle might be using, not an observation about one
# cage. That distinction matters: `sum_any` (sum, repeats permitted) is a proper
# superset of `sum_distinct`, so an ordinary killer puzzle satisfies both. The
# nesting is handled explicitly in `narrow()` rather than papered over.
RULESETS = [
    'sum_distinct',   # standard killer: distinct digits summing to the corner
    'sum_any',        # sum, repeats permitted (superset of sum_distinct)
    'product',        # digits multiply to the corner
    'difference',     # 2-cell: |a-b|
    'quotient',       # 2-cell: max/min, integer
    'digit_list',     # corner IS the multiset of digits ("4456")
    'partial_list',   # corner digits each appear at least once in the cage
    'minimum',        # corner is the smallest digit in the cage
    'maximum',        # corner is the largest digit in the cage
    'count_of_digit', # not a value rule; placeholder measured separately
]
# Rulesets we would ever put a menu row behind. `count_of_digit` and the two
# extremum ones are measured to size the tail, not because they are planned.
IMPLIES = {'sum_distinct': 'sum_any'}


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
    for k in ('sum', 'value'):
        v = cage.get(k)
        if v is None:
            continue
        s = str(v).strip()
        if s:
            return s
    return None


def numval(text):
    try:
        v = float(text)
    except (ValueError, TypeError):
        return None
    if v != v or abs(v) == float('inf'):
        return None
    return v


# ── holds: does this ruleset explain the SOLVED digits of one cage? ──────────
def holds(rule, digits, text, n):
    val = numval(text)
    k = len(digits)
    if rule == 'sum_distinct':
        return val is not None and len(set(digits)) == k and sum(digits) == val
    if rule == 'sum_any':
        return val is not None and sum(digits) == val
    if rule == 'product':
        return val is not None and prod(digits) == val
    if rule == 'difference':
        return val is not None and k == 2 and abs(digits[0] - digits[1]) == abs(val)
    if rule == 'quotient':
        return (val is not None and k == 2 and min(digits) > 0
                and max(digits) == min(digits) * val)
    if rule == 'digit_list':
        if not text or not re.fullmatch(r'[1-9]+', text) or len(text) != k:
            return False
        return sorted(text) == sorted(str(d) for d in digits)
    if rule == 'partial_list':
        if not text or not re.fullmatch(r'[1-9]+', text) or len(text) >= k:
            return False
        need, have = Counter(text), Counter(str(d) for d in digits)
        return all(have[c] >= q for c, q in need.items())
    if rule == 'minimum':
        return val is not None and min(digits) == val
    if rule == 'maximum':
        return val is not None and max(digits) == val
    return False


# ── feasible: could ANY fill satisfy this ruleset? (no solution consulted) ────
_fc = {}


def feasible(rule, k, text, n):
    key = (rule, k, text, n)
    if key not in _fc:
        _fc[key] = _feasible(rule, k, text, n)
    return _fc[key]


def _feasible(rule, k, text, n):
    digits = range(1, n + 1)
    val = numval(text)
    if rule == 'digit_list':
        return bool(text and re.fullmatch(r'[1-9]+', text)) and len(text) == k \
            and all(int(c) <= n for c in text)
    if rule == 'partial_list':
        return bool(text and re.fullmatch(r'[1-9]+', text)) and 0 < len(text) < k \
            and all(int(c) <= n for c in text)
    if val is None:
        return False
    if rule == 'difference':
        return k == 2 and 0 <= abs(val) <= n - 1
    if rule == 'quotient':
        return k == 2 and val >= 1 and val == int(val) and val <= n
    if rule in ('minimum', 'maximum'):
        return 1 <= val <= n and val == int(val)
    if rule == 'sum_distinct':
        if k > n:
            return False
        return any(sum(c) == val for c in combinations(digits, k))
    if rule == 'sum_any':
        return k <= val <= k * n and val == int(val)
    if rule == 'product':
        if val <= 0 or val != int(val):
            return False
        v = int(val)
        if v > n ** k:
            return False
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


def narrow(rules):
    """Drop rulesets implied by a stronger one also present (sum_any under
    sum_distinct). Leaves the most specific readings."""
    s = set(rules)
    for strong, weak in IMPLIES.items():
        if strong in s:
            s.discard(weak)
    return s


def rules_blob(entry):
    p = entry.get('puzzle') or {}
    md = p.get('metadata') or {}

    def r(o):
        v = o.get('rules')
        if isinstance(v, list):
            return ' '.join(str(x) for x in v)
        return v if isinstance(v, str) else ''
    return ((entry.get('title') or '') + ' ' + r(p) + ' ' + r(md))


def cages_of(entry):
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
        out.append((text, cs))
    return (n, G, out) if out else None


def puzzle_records(entry):
    """-> (n, [ {text,k,digits,true:set,feas:set} ]) for one puzzle, or None."""
    got = cages_of(entry)
    if not got:
        return None
    n, G, cages = got
    recs = []
    for text, cs in cages:
        digits = [G[x] for x in cs]
        recs.append({
            'text': text, 'k': len(cs), 'digits': digits,
            'true': {r for r in RULESETS if holds(r, digits, text, n)},
            'feas': {r for r in RULESETS if feasible(r, len(cs), text, n)},
        })
    return n, recs


# ── experiment 1: puzzle-wide identification ─────────────────────────────────
def puzzlewide(corpus, detail=False):
    tot = 0
    truth_size = Counter()
    truth_single = Counter()
    feas_size = Counter()
    agree = Counter()
    mixed_examples = []
    none_examples = []
    single_examples = defaultdict(list)

    for e in corpus:
        got = puzzle_records(e)
        if not got:
            continue
        n, recs = got
        tot += 1
        pid, title = e.get('id'), (e.get('title') or '')[:34]

        # rulesets that explain EVERY cage, per the solution
        T = set(RULESETS)
        for r in recs:
            T &= r['true']
        T = narrow(T)
        truth_size[len(T)] += 1
        if len(T) == 1:
            lone = next(iter(T))
            truth_single[lone] += 1
            if len(single_examples[lone]) < 6:
                single_examples[lone].append((pid, title, len(recs)))
        elif not T:
            if len(none_examples) < 30:
                none_examples.append((pid, title, len(recs), recs[:3]))

        # rulesets arithmetically possible for EVERY cage (no solution)
        F = set(RULESETS)
        for r in recs:
            F &= r['feas']
        F = narrow(F)
        feas_size[len(F)] += 1
        if len(F) == 1:
            lone = next(iter(F))
            agree['single_feasible'] += 1
            if T:
                agree['single_determinate'] += 1
                agree['single_correct' if lone in T else 'single_wrong'] += 1
                # the RISKY action: arithmetic alone says "not the standard
                # reading". How often is that flip right?
                if lone != 'sum_distinct':
                    agree['flip_fired'] += 1
                    agree['flip_correct' if lone in T else 'flip_wrong'] += 1
        if T and F:
            # does arithmetic at least CONTAIN the truth?
            agree['feas_contains_truth'] += 1 if T <= F else 0
            agree['determinate'] += 1

        if detail and len(T) > 1 and 'sum_distinct' not in T:
            if len(mixed_examples) < 20:
                mixed_examples.append((pid, title, sorted(T), len(recs)))

    print('PUZZLE-WIDE CAGE RULESET IDENTIFICATION')
    print('puzzles with a solution and >=1 killer cage carrying a corner: %d\n' % tot)

    print('A. GROUND TRUTH — rulesets that explain EVERY cage (solution consulted)')
    for k in sorted(truth_size):
        print('   %d ruleset(s) fit all cages: %5d  (%5.1f%%)'
              % (k, truth_size[k], 100 * truth_size[k] / tot))
    print('\n   when exactly one fits, which one:')
    for k, v in truth_single.most_common():
        print('     %-14s %5d  (%.1f%% of all puzzles)' % (k, v, 100 * v / tot))

    print('\nB. NO SOLUTION — rulesets arithmetically possible for EVERY cage')
    for k in sorted(feas_size):
        print('   %d ruleset(s) possible:      %5d  (%5.1f%%)'
              % (k, feas_size[k], 100 * feas_size[k] / tot))
    if agree['single_determinate']:
        print('\n   arithmetic narrows to ONE ruleset: %d puzzles'
              % agree['single_feasible'])
        print('   ...of which %d also have a determinate truth; the solution'
              % agree['single_determinate'])
        print('      confirms the arithmetic pick %d times (%.1f%%)'
              % (agree['single_correct'],
                 100 * agree['single_correct'] / agree['single_determinate']))
    if agree['flip_fired']:
        print('\n   THE RISKY ACTION — arithmetic alone says "NOT the standard sum":')
        print('      fires on %d puzzles, correct %d (%.1f%%)'
              % (agree['flip_fired'], agree['flip_correct'],
                 100 * agree['flip_correct'] / agree['flip_fired']))
    print('\n   arithmetic feasibility CONTAINS the true ruleset: %d of %d'
          ' determinate puzzles (%.1f%%)'
          % (agree['feas_contains_truth'], agree['determinate'],
             100 * agree['feas_contains_truth'] / max(1, agree['determinate'])))

    print('\nC. THE HARD PILE — puzzles NO single ruleset explains: %d (%.1f%%)'
          % (truth_size[0], 100 * truth_size[0] / tot))
    for pid, title, nc, sample in none_examples[:15]:
        print('   %-16s %-34s %2d cages' % (pid, title, nc))
        for r in sample:
            print('        corner %-6s %2d cells  %-26s true=%s'
                  % (r['text'], r['k'], str(r['digits'])[:26],
                     ','.join(sorted(r['true'])) or '(none)'))

    if detail:
        print('\nD. examples per single-ruleset verdict')
        for k, rows in single_examples.items():
            if k == 'sum_distinct':
                continue
            print('  ── %s ──' % k)
            for pid, title, nc in rows:
                print('     %-16s %-34s %2d cages' % (pid, title, nc))
        if mixed_examples:
            print('\nE. puzzles where several NON-standard rulesets all fit')
            for pid, title, T, nc in mixed_examples:
                print('   %-16s %-34s %2d cages  %s' % (pid, title, nc, ','.join(T)))


# ── experiment 2: scope survey ───────────────────────────────────────────────
CUES = [
    ('product/multiply', re.compile(r'\bproduct\b|\bmultipl', re.I)),
    ('repeats allowed', re.compile(r'digits?\s+(?:may|can|could)\s+repeat'
                                   r'|repeated\s+digits?\s+(?:are\s+)?allowed'
                                   r'|not\s+necessarily\s+(?:distinct|different)', re.I)),
    ('difference', re.compile(r'\bdifference\b', re.I)),
    ('at least one', re.compile(r'at\s+least\s+one', re.I)),
    ('digits shown/listed', re.compile(r'digits?\s+(?:shown|listed|indicated|given)'
                                       r'|\bin\s+some\s+order\b', re.I)),
    ('average/mean', re.compile(r'\baverage\b|\bmean\b', re.I)),
    ('modulo/remainder', re.compile(r'\bmodulo\b|\bremainder\b|\bmod\b', re.I)),
    ('rounded/approx', re.compile(r'\brounded?\b|\bapproximat|\bnearest\b', re.I)),
    ('at most/at least sum', re.compile(r'\bat\s+most\b|\bno\s+more\s+than\b'
                                        r'|\bat\s+least\b', re.I)),
    ('sum OR product', re.compile(r'sum\s+or\s+product|product\s+or\s+sum', re.I)),
    ('GCD/LCM', re.compile(r'\bgcd\b|\blcm\b|common\s+(?:divisor|multiple)', re.I)),
    ('count/how many', re.compile(r'how\s+many|\bcount\s+of\b|number\s+of\s+\w+\s+digits', re.I)),
    ('scrambled', re.compile(r'\bscrambl', re.I)),
    ('some/subset of cells', re.compile(r'some\s+of\s+the\s+(?:cells|digits)', re.I)),
    ('standard killer sum', re.compile(r'cages?\s+(?:must\s+)?sum|sum\s+to\s+the\s+'
                                       r'(?:small\s+)?(?:clue|number|total)'
                                       r'|do\s+not\s+repeat\s+within\s+(?:a\s+)?cage', re.I)),
]


def survey(corpus, detail=False):
    npuz = 0
    cue_ct = Counter()
    cue_ex = defaultdict(list)
    per_cage_true = Counter()
    unexplained_puz = []

    for e in corpus:
        got = puzzle_records(e)
        if not got:
            continue
        n, recs = got
        npuz += 1
        pid, title = e.get('id'), (e.get('title') or '')[:40]
        blob = rules_blob(e)
        for name, rx in CUES:
            if rx.search(blob):
                cue_ct[name] += 1
                if len(cue_ex[name]) < 5:
                    cue_ex[name].append((pid, title))
        for r in recs:
            t = narrow(r['true'])
            per_cage_true['+'.join(sorted(t)) or 'UNEXPLAINED'] += 1
        bad = [r for r in recs if not r['true']]
        if bad and len(unexplained_puz) < 400:
            unexplained_puz.append((len(bad) / len(recs), pid, title, len(bad),
                                    len(recs), blob, bad[:2]))

    print('CAGE VARIANT SCOPE — %d solution-bearing puzzles with corner-bearing cages\n'
          % npuz)
    print('PER-CAGE: what the solution says the corner means')
    tot = sum(per_cage_true.values())
    for k, v in per_cage_true.most_common(20):
        print('  %-34s %6d  (%5.2f%%)' % (k, v, 100 * v / tot))

    print('\nRULES-TEXT CUES present (on these cage puzzles)')
    for name, _ in CUES:
        print('  %-24s %4d puzzles' % (name, cue_ct[name]))

    print('\nPUZZLES WITH UNEXPLAINED CAGES (worst first) — rules snippet')
    unexplained_puz.sort(reverse=True)
    for frac, pid, title, nb, nc, blob, sample in unexplained_puz[:40]:
        snippet = ' '.join(blob.split())[:190]
        print('\n  %-16s %-40s %2d/%-2d unexplained' % (pid, title, nb, nc))
        for r in sample:
            print('      corner %-6s %2d cells  digits=%s'
                  % (r['text'], r['k'], str(r['digits'])[:40]))
        print('      RULES: %s' % snippet)

    if detail:
        print('\nCUE EXAMPLES')
        for name, _ in CUES:
            if cue_ex[name]:
                print('  %-24s %s' % (name, ', '.join(p for p, _ in cue_ex[name])))


def main():
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--puzzlewide', action='store_true')
    ap.add_argument('--survey', action='store_true')
    ap.add_argument('--detail', action='store_true')
    a = ap.parse_args()
    corpus = json.load(open(CORPUS, encoding='utf-8'))
    if a.survey:
        survey(corpus, a.detail)
    else:
        puzzlewide(corpus, a.detail)


if __name__ == '__main__':
    main()
