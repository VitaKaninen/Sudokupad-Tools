"""Score each *_CUE_RE in Sudokupad-Tools.user.js against the puzzle catalog's tags.

The regexes are PARSED OUT OF THE SCRIPT, not copied here, so this can't drift.

The catalog's tags are dictionary-derived and unverified, so they are a FILTER for
finding candidates to eyeball -- not ground truth. Treat every row below as
"go look at this", not "this is a bug". Triage each into:
    real cue gap  /  correctly-not-ours  /  catalog tag noise

Usage:
    python tools/cue_recall.py                 # summary table
    python tools/cue_recall.py --report out.md # + full miss/FP lists to markdown
    python tools/cue_recall.py --tag entropic_line --n 20
"""

import argparse
import collections
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(HERE, '..', 'Sudokupad-Tools.user.js')
CAT = r'C:\Users\VitaKaninen\Desktop\Projects\GitHub\Sudokupad Catalog\classify'
LOG = os.path.join(CAT, 'output', 'catalog_log.jsonl')
REVIEW = os.path.join(CAT, 'data', 'review_catalog.jsonl')
CORPUS = os.path.join(CAT, 'data', 'corpus.json')

# validator -> (label, cue const, anti const or None, catalog tag, extra or None)
# `extra` mirrors a script-side composite cue: (alt_const, require_const) fires when
# BOTH match, OR'd with the main cue -- entropic's hasEntropicCue() is
# ENTROPIC_CUE_RE || (ENTROPIC_SET_RE && ENTROPIC_LINEISH_RE). Keep in sync.
#
# NOTE: score german_whisper, NOT the umbrella `whisper` tag -- `whisper` is a
# parent that also covers dutch (differ by 4), which our >=5 cue must NOT match.
# dutch_whisper (94 puzzles) has no validator yet -- tracked as a gap, not scored.
VALIDATORS = [
    ('german whisper', 'WHISPER_CUE_RE', None, 'german_whisper', None),
    ('renban', 'RENBAN_CUE_RE', None, 'renban', None),
    ('region sum', 'REGIONSUM_CUE_RE', None, 'region_sum', None),
    ('parity', 'PARITY_CUE_RE', None, 'parity_line', None),
    ('zipper', 'ZIPPER_CUE_RE', None, 'zipper', None),
    ('entropic', 'ENTROPIC_CUE_RE', 'ENTROPIC_ANTI_RE', 'entropic_line',
     ('ENTROPIC_SET_RE', 'ENTROPIC_LINEISH_RE')),
    ('thermo', 'THERMO_CUE_RE', None, 'thermo', None),
]


def js_regexes():
    """Pull `var NAME_RE = /body/;` out of the userscript and compile as Python."""
    src = open(SCRIPT, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'var\s+(\w+_RE)\s*=\s*/(.*?)/([gimsuy]*)\s*;', src):
        name, body, flags = m.group(1), m.group(2), m.group(3)
        # JS->Python: the cue bodies use only \s \w \b [] () | {} ? * + . -- all portable.
        # Only difference that bites: an escaped forward slash.
        body = body.replace(r'\/', '/')
        f = re.I if 'i' in flags else 0
        try:
            out[name] = re.compile(body, f)
        except re.error as e:
            print('  !! could not compile %s: %s' % (name, e))
    return out


def load_catalog():
    tags = {}
    for line in open(LOG, encoding='utf-8'):
        d = json.loads(line)
        if d.get('id'):
            tags[d['id']] = set(d.get('tags') or [])

    srcof = {}
    for x in json.load(open(CORPUS, encoding='utf-8')):
        cid = str(x.get('cpId') or '')
        srcof[x['id']] = ('fpuz' if cid.startswith('fpuzzle')
                          else 'sxsm' if cid.startswith('sxsm') else 'other')

    info = {}
    for line in open(REVIEW, encoding='utf-8'):
        x = json.loads(line)
        rules = x.get('rules') or ''
        if isinstance(rules, list):
            rules = ' '.join(rules)
        if not rules.strip():
            continue  # no rules text -> unscoreable either way
        info[x['id']] = {
            'src': srcof.get(x['id'], 'other'),
            'title': x.get('title') or '',
            'rules': rules,
            'blob': ((x.get('title') or '') + ' ' + rules).lower(),
            'url': x.get('url') or ('https://sudokupad.app/' + x['id']),
        }
    return tags, info


def fires(rx, anti, blob):
    if anti is not None and anti.search(blob):
        return False
    return bool(rx.search(blob))


def snippet(blob, tag, width=120):
    """Show the part of the rules most likely to matter, for eyeballing."""
    key = tag.split('_')[0][:6]
    i = blob.find(key)
    if i < 0:
        i = blob.find('line')
    if i < 0:
        return blob[:width]
    return ('...' if i > 20 else '') + blob[max(0, i - 20):i + width]


def evaluate(tags, info, rxs):
    rows = []
    for label, cue_name, anti_name, tag, extra in VALIDATORS:
        rx = rxs.get(cue_name)
        if rx is None:
            print('  !! %s not found in script' % cue_name)
            continue
        anti = rxs.get(anti_name) if anti_name else None
        alt = req = None
        if extra:
            alt, req = rxs.get(extra[0]), rxs.get(extra[1])
            if alt is None or req is None:
                print('  !! %s composite cue not found in script' % label)

        miss, fp, hit = [], [], 0
        for pid, d in info.items():
            tagged = tag in tags.get(pid, ())
            fired = fires(rx, anti, d['blob'])
            if not fired and alt is not None and req is not None:
                if not (anti is not None and anti.search(d['blob'])):
                    fired = bool(alt.search(d['blob']) and req.search(d['blob']))
            if tagged and fired:
                hit += 1
            elif tagged and not fired:
                miss.append(pid)
            elif fired and not tagged:
                fp.append(pid)
        rows.append({
            'label': label, 'tag': tag, 'cue': cue_name,
            'tagged': hit + len(miss), 'hit': hit, 'miss': miss, 'fp': fp,
        })
    return rows


def print_summary(rows, info):
    print('%-16s%8s%6s%6s%9s%7s   | misses by source'
          % ('validator', 'tagged', 'hit', 'MISS', 'recall', 'FP'))
    print('-' * 84)
    for r in rows:
        n, h = r['tagged'], r['hit']
        rec = ('%.1f%%' % (100.0 * h / n)) if n else '-'
        by = collections.Counter(info[p]['src'] for p in r['miss'])
        print('%-16s%8d%6d%6d%9s%7d   | %s'
              % (r['label'], n, h, len(r['miss']), rec, len(r['fp']),
                 ', '.join('%s=%d' % kv for kv in by.most_common())))
    print('\nFP = cue fired but tag absent. Catalog tags are unverified, so an FP is '
          '\n     "look at this" -- it is either over-firing (dangerous: over-removal) '
          '\n     or the catalog simply missed the tag.')


def write_report(rows, info, path, n):
    L = ['# Cue recall vs catalog tags', '',
         'Catalog tags are dictionary-derived and **unverified** -- this is a triage',
         'worklist, not a bug list. Sort each row into *real cue gap* /',
         '*correctly-not-ours* / *catalog tag noise*.', '']
    for r in rows:
        L.append('## %s  (`%s` vs tag `%s`)' % (r['label'], r['cue'], r['tag']))
        rec = 100.0 * r['hit'] / r['tagged'] if r['tagged'] else 0
        L.append('recall %.1f%%  -  %d tagged, %d hit, %d missed, %d false-positive'
                 % (rec, r['tagged'], r['hit'], len(r['miss']), len(r['fp'])))
        for name, ids in (('MISSED (tagged, cue silent)', r['miss']),
                          ('FALSE POSITIVE (cue fired, no tag)', r['fp'])):
            L += ['', '### %s' % name, '']
            if not ids:
                L.append('_none_')
                continue
            for pid in sorted(ids, key=lambda p: info[p]['src'])[:n]:
                d = info[pid]
                L.append('- [%s](%s) `%s` **%s** - %s'
                         % (pid, d['url'], d['src'], d['title'].strip() or '(untitled)',
                            snippet(d['blob'], r['tag']).replace('\n', ' ')))
            if len(ids) > n:
                L.append('- _... %d more (use `--n`)_' % (len(ids) - n))
        L.append('')
    open(path, 'w', encoding='utf-8').write('\n'.join(L))
    print('\nreport -> %s' % path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--report', help='write full miss/FP lists to this markdown file')
    ap.add_argument('--tag', help='only this catalog tag')
    ap.add_argument('--n', type=int, default=25, help='max examples per list')
    a = ap.parse_args()

    rxs = js_regexes()
    tags, info = load_catalog()
    print('%d puzzles with rules text\n' % len(info))
    rows = evaluate(tags, info, rxs)
    if a.tag:
        rows = [r for r in rows if r['tag'] == a.tag]
    print_summary(rows, info)
    if a.report:
        write_report(rows, info, a.report, a.n)


if __name__ == '__main__':
    main()
