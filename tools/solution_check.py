#!/usr/bin/env python3
# ─────────────────────────────────────────────────────────────────────────────
# solution_check.py — score our clue READINGS against each puzzle's own
# published solution, across the whole catalog.
#
# Why this exists (2026-07-31): the Validate-Constraints menu leaks information
# on "wrogn" puzzles — a clue that is drawn but not validated tells the player
# it is fake before they work it out (docs/VALIDATORS.md, "Solution-refuted
# clues"). The proposed fix is to check every detected clue against the
# puzzle's embedded solution and SILENTLY drop the ones it refutes.
#
# That is only safe if a refutation almost always means "this clue is a decoy"
# rather than "we misread this clue". Those two are indistinguishable from the
# inside (v3.157 policy), so the decision rests on a measured rate: how often
# does a solution refute a clue on an ORDINARY puzzle? This harness measures it.
#
#     python tools/solution_check.py            # summary
#     python tools/solution_check.py --detail   # + per-type violating ids
#     python tools/solution_check.py --id <id>  # one puzzle, verbose
#
# It reads the catalog corpus (68 MB) with the json module and prints only the
# small answer — never load the corpus into a conversation.
#
# The clue geometry here mirrors what the userscript's MODEL-path detectors
# read (cp.cages / cp.thermos / cp.kropkis / cp.palindrome), so a violation
# found here is a violation the shipping detectors would also produce. DOM-only
# detectors (little killers, cosmetic lines) are out of scope by construction.
# ─────────────────────────────────────────────────────────────────────────────
import json, os, re, sys, argparse
from collections import Counter, defaultdict

CORPUS = r'C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad Catalog\classify\data\corpus.json'


# ── grid helpers ─────────────────────────────────────────────────────────────
def build_grid(sol, n):
    """solution string -> {(row0,col0): digit}, or None if it isn't usable."""
    if isinstance(sol, list):
        sol = ''.join(str(x) for x in sol)
    if not isinstance(sol, str):
        return None
    sol = sol.strip()
    if len(sol) != n * n or not re.fullmatch(r'[1-9]+', sol):
        return None
    return {(i // n, i % n): int(ch) for i, ch in enumerate(sol)}


def cells_from_string(s, n):
    """'r1c2,r3c4' (1-indexed) -> [(0,1),(2,3)]; None if any cell is off-grid."""
    out = []
    for m in re.finditer(r'r(\d+)c(\d+)', s or '', re.I):
        r, c = int(m.group(1)) - 1, int(m.group(2)) - 1
        if not (0 <= r < n and 0 <= c < n):
            return None
        out.append((r, c))
    return out or None


def walk_waypoints(wps, n):
    """Polyline of [row,col] cell-centre points -> the ordered cell list.

    Cell centres sit at x.5; a segment steps one cell at a time (orthogonal or
    diagonal). Anything that doesn't land on cell centres is rejected rather
    than guessed at — a bad read must not masquerade as a violated clue.
    """
    if not wps or len(wps) < 2:
        return None
    pts = []
    for p in wps:
        if not isinstance(p, (list, tuple)) or len(p) != 2:
            return None
        r, c = p
        if abs(r - int(r) - 0.5) > 1e-6 or abs(c - int(c) - 0.5) > 1e-6:
            return None            # not a cell centre (cosmetic wiggle, corner anchor)
        pts.append((int(r), int(c)))
    out = []
    for (r0, c0), (r1, c1) in zip(pts, pts[1:]):
        dr, dc = r1 - r0, c1 - c0
        steps = max(abs(dr), abs(dc))
        if steps == 0:
            continue
        if dr % steps or dc % steps:
            return None            # not a clean orthogonal/diagonal run
        sr, sc = dr // steps, dc // steps
        if abs(sr) > 1 or abs(sc) > 1:
            return None
        for s in range(steps):
            out.append((r0 + sr * s, c0 + sc * s))
    out.append(pts[-1])
    for (r, c) in out:
        if not (0 <= r < n and 0 <= c < n):
            return None
    return out if len(out) >= 2 else None


def edge_cells(center, n):
    """A dot centre on a shared edge -> the two cells it separates."""
    if not isinstance(center, (list, tuple)) or len(center) != 2:
        return None
    r, c = center
    r_int, c_int = abs(r - round(r)) < 1e-6, abs(c - round(c)) < 1e-6
    r_half = abs(r - int(r) - 0.5) < 1e-6
    c_half = abs(c - int(c) - 0.5) < 1e-6
    if r_int and c_half:                       # horizontal edge, cells above/below
        a, b = (int(round(r)) - 1, int(c)), (int(round(r)), int(c))
    elif c_int and r_half:                     # vertical edge, cells left/right
        a, b = (int(r), int(round(c)) - 1), (int(r), int(round(c)))
    else:
        return None                            # corner (quadruple) or cell centre
    for (rr, cc) in (a, b):
        if not (0 <= rr < n and 0 <= cc < n):
            return None
    return [a, b]


def is_dark(color):
    if not isinstance(color, str):
        return False
    m = re.fullmatch(r'#([0-9a-f]{6})([0-9a-f]{2})?', color.strip(), re.I)
    if not m:
        return color.strip().lower() in ('black',)
    v = int(m.group(1), 16)
    r, g, b = (v >> 16) & 255, (v >> 8) & 255, v & 255
    return (r + g + b) / 3 < 110


# ── per-clue checks ──────────────────────────────────────────────────────────
# Each returns (verdict, label): verdict True = solution satisfies the clue as
# read, False = refuted, None = not readable (never counted either way).
def check_cages(p, G, n):
    for cage in p.get('cages') or []:
        if not isinstance(cage, dict):
            continue
        if cage.get('style') != 'killer':
            continue                            # box/rowcol pseudo-cages
        if cage.get('unique') is False:
            continue
        s = cage.get('sum')
        if not isinstance(s, (int, float)):
            try:
                s = float(cage.get('value'))
            except (TypeError, ValueError):
                continue                        # sum-less cage: nothing to refute
        cs = cells_from_string(cage.get('cells'), n)
        if not cs or len(cs) < 2:
            continue
        got = sum(G[x] for x in cs)
        yield (got == s, 'cage sum %g (got %d, %d cells)' % (s, got, len(cs)))


def check_palindromes(p, G, n):
    for e in p.get('palindrome') or []:
        line = (e or {}).get('line') or {}
        cs = walk_waypoints(line.get('wayPoints'), n)
        if not cs:
            continue
        d = [G[x] for x in cs]
        yield (d == d[::-1], 'palindrome %s' % (d,))


def check_thermos(p, G, n):
    for e in p.get('thermos') or []:
        pts = (e or {}).get('points')
        if not isinstance(pts, list) or len(pts) < 2:
            continue
        cs = []
        for q in pts:
            if not isinstance(q, (list, tuple)) or len(q) != 2:
                cs = None
                break
            r, c = int(q[0]), int(q[1])
            if not (0 <= r < n and 0 <= c < n):
                cs = None
                break
            cs.append((r, c))
        if not cs or len(cs) < 2:
            continue
        d = [G[x] for x in cs]
        yield (all(a < b for a, b in zip(d, d[1:])), 'thermo %s' % (d,))


def check_kropki(p, G, n):
    for e in p.get('kropkis') or []:
        if not isinstance(e, dict):
            continue
        if str(e.get('text') or '').strip():
            continue                            # labelled dot: a different clue
        cs = edge_cells(e.get('center'), n)
        if not cs:
            continue
        a, b = G[cs[0]], G[cs[1]]
        dark = is_dark(e.get('backgroundColor'))
        if dark:
            ok = (max(a, b) == 2 * min(a, b))
            yield (ok, 'black kropki %d:%d' % (a, b))
        else:
            ok = (abs(a - b) == 1)
            yield (ok, 'white kropki %d:%d' % (a, b))


CHECKS = {
    'cage': check_cages,
    'palindrome': check_palindromes,
    'thermo': check_thermos,
    'kropki': check_kropki,
}


# ── driver ───────────────────────────────────────────────────────────────────
def score(entry):
    """-> (dict type -> [(ok,label)…], n) or None if the puzzle isn't usable."""
    p = entry.get('puzzle')
    if not isinstance(p, dict):
        return None
    n = entry.get('gridSize') or 9
    if not isinstance(n, int) or not (3 <= n <= 9):
        return None
    sol = p.get('solution') or (p.get('metadata') or {}).get('solution')
    G = build_grid(sol, n)
    if G is None:
        return None
    out = {}
    for name, fn in CHECKS.items():
        try:
            res = list(fn(p, G, n))
        except Exception:
            res = []
        if res:
            out[name] = res
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--detail', action='store_true')
    ap.add_argument('--id')
    ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    for s in (sys.stdout, sys.stderr):
        try:
            s.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass

    corpus = json.load(open(CORPUS, encoding='utf-8'))

    if a.id:
        for e in corpus:
            if e.get('id') == a.id or e.get('cpId') == a.id:
                r = score(e)
                print(e.get('id'), '-', (e.get('title') or '')[:50])
                if r is None:
                    print('  no usable solution')
                    return
                for t, res in sorted(r.items()):
                    for ok, lab in res:
                        print('  %-10s %-9s %s' % (t, 'HOLDS' if ok else 'VIOLATED', lab))
                return
        print('not found:', a.id)
        return

    clue_tot, clue_bad = Counter(), Counter()
    puz_tot, puz_bad = Counter(), Counter()
    bad_ids = defaultdict(list)
    scored = 0
    for e in corpus:
        r = score(e)
        if r is None:
            continue
        scored += 1
        for t, res in r.items():
            puz_tot[t] += 1
            nbad = sum(1 for ok, _ in res if not ok)
            clue_tot[t] += len(res)
            clue_bad[t] += nbad
            if nbad:
                puz_bad[t] += 1
                if len(bad_ids[t]) < 400:
                    bad_ids[t].append((e.get('id'), (e.get('title') or '')[:34],
                                       nbad, len(res),
                                       [l for ok, l in res if not ok][:2]))
        if a.limit and scored >= a.limit:
            break

    print('puzzles with a usable solution: %d / %d\n' % (scored, len(corpus)))
    print('%-11s %8s %8s %7s   %8s %8s %7s' %
          ('type', 'clues', 'refuted', 'rate', 'puzzles', 'affected', 'rate'))
    for t in sorted(clue_tot, key=lambda k: -clue_tot[k]):
        print('%-11s %8d %8d %6.2f%%   %8d %8d %6.2f%%' % (
            t, clue_tot[t], clue_bad[t], 100 * clue_bad[t] / max(1, clue_tot[t]),
            puz_tot[t], puz_bad[t], 100 * puz_bad[t] / max(1, puz_tot[t])))
    tc, tb = sum(clue_tot.values()), sum(clue_bad.values())
    print('%-11s %8d %8d %6.2f%%' % ('ALL', tc, tb, 100 * tb / max(1, tc)))

    if a.detail:
        for t in sorted(bad_ids):
            print('\n── %s: %d puzzles with >=1 refuted clue ──' % (t, puz_bad[t]))
            for pid, title, nbad, ntot, labs in bad_ids[t][:25]:
                print('  %-14s %-34s %2d/%-3d %s' % (pid, title, nbad, ntot, labs))


if __name__ == '__main__':
    main()
