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

# tag -> clause const, for the clause-blindness check below. Whisper's layer 3 uses
# WHISPERISH_RE; thermo's cue layer is only a fallback after the model/DOM readers.
CLAUSES = {
    'renban': 'RENBAN_CLAUSE_RE',
    'region_sum': 'REGIONSUM_CLAUSE_RE',
    'parity_line': 'PARITY_CLAUSE_RE',
    'zipper': 'ZIPPER_CLAUSE_RE',
    'entropic_line': 'ENTROPIC_CLAUSE_RE',
    'thermo': 'THERMO_CLAUSE_RE',
}

# enough of the script's COLOR_WORD_ALL to answer "does this clause name a colour?"
COLOR_WORDS = ['red', 'orange', 'yellow', 'green', 'blue', 'cyan', 'purple', 'magenta',
               'pink', 'brown', 'grey', 'gray', 'black', 'white', 'teal', 'turquoise',
               'aqua', 'lavender', 'indigo', 'gold', 'golden', 'silver', 'peach', 'tan',
               'beige', 'olive', 'maroon', 'violet']
COLOR_RE = dict((w, re.compile(r'\b' + w + r'\b')) for w in COLOR_WORDS)


def js_regexes():
    """Pull the regex definitions out of the userscript and compile them as Python.

    Handles the two idioms the script uses:
        var NAME_RE = /body/;
        var NAME_RE = new RegExp('literal' + OTHER_RE.source);
    """
    src = open(SCRIPT, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r'var\s+(\w+_RE)\s*=\s*/(.*?)/([gimsuy]*)\s*;', src):
        name, body, flags = m.group(1), m.group(2), m.group(3)
        # JS->Python: the cue bodies use only \s \w \b [] () | {} ? * + . -- all portable.
        # Only difference that bites: an escaped forward slash.
        body = body.replace(r'\/', '/')
        try:
            out[name] = re.compile(body, re.I if 'i' in flags else 0)
        except re.error as e:
            print('  !! could not compile %s: %s' % (name, e))

    # composed form, e.g. ENTROPIC_CLAUSE_RE = new RegExp('\\bentrop|' + ENTROPIC_SET_RE.source)
    for m in re.finditer(r"var\s+(\w+_RE)\s*=\s*new RegExp\(\s*'((?:[^'\\]|\\.)*)'\s*\+\s*(\w+_RE)\.source\s*\)", src):
        name, lit, ref = m.group(1), m.group(2), m.group(3)
        if ref not in out:
            print('  !! %s composes %s, which is not defined yet' % (name, ref))
            continue
        body = lit.replace('\\\\', '\\') + out[ref].pattern
        try:
            out[name] = re.compile(body)
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

        miss, fp, hit, firedset = [], [], 0, []
        for pid, d in info.items():
            tagged = tag in tags.get(pid, ())
            fired = fires(rx, anti, d['blob'])
            if not fired and alt is not None and req is not None:
                if not (anti is not None and anti.search(d['blob'])):
                    fired = bool(alt.search(d['blob']) and req.search(d['blob']))
            if fired and tagged:
                firedset.append(pid)
            if tagged and fired:
                hit += 1
            elif tagged and not fired:
                miss.append(pid)
            elif fired and not tagged:
                fp.append(pid)
        rows.append({
            'label': label, 'tag': tag, 'cue': cue_name,
            'tagged': hit + len(miss), 'hit': hit, 'miss': miss, 'fp': fp,
            'fired': firedset,
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


def diagnose_clause(blob, clause_rx):
    """Port of the script's clauseColorWord, split into WHY it failed.

    UNREADABLE = no clause matches clause_rx at all -> the validator CANNOT pin the
                 line on a multi-colour puzzle. A real bug, every time.
    NO-COLOUR  = a clause matches but names no colour -> usually fine; a
                 single-colour puzzle is caught earlier by layer 2.
    OK         = a colour was pinned.
    """
    matched = False
    for cl in re.split(r'[.\n;]', blob):
        if not clause_rx.search(cl):
            continue
        matched = True
        for w in COLOR_WORDS:
            if COLOR_RE[w].search(cl):
                return 'OK'
    return 'NO-COLOUR' if matched else 'UNREADABLE'


def multicolour(blob):
    """Do the rules name >=2 colours? Proxy for "layer 2 cannot save this puzzle"."""
    return sum(1 for w in ('red', 'orange', 'yellow', 'green', 'blue', 'cyan', 'purple',
                           'magenta', 'pink', 'brown', 'grey', 'gray', 'peach')
               if COLOR_RE[w].search(blob)) >= 2


def clause_report(rows, info, rxs):
    """A cue that fires on a phrasing its CLAUSE cannot read is a guaranteed
    'cannot detect where the line is' on any multi-colour puzzle. This is a
    separate defect from cue recall and was the v3.89 renban bug."""
    print('\n\nCLAUSE-BLINDNESS  (cue fired, rules name >=2 colours, so layer 2 cannot help)')
    print('UNREADABLE = no clause matches the clause regex -> guaranteed AMBIGUOUS.\n')
    print('%-16s %9s %11s %10s %6s' % ('validator', 'multicol', 'UNREADABLE', 'NO-COLOUR', 'OK'))
    print('-' * 58)
    for r in rows:
        cname = CLAUSES.get(r['tag'])
        rx = rxs.get(cname) if cname else None
        if rx is None:
            continue
        ids = [p for p in r['fired'] if multicolour(info[p]['blob'])]
        c = {'OK': 0, 'NO-COLOUR': 0, 'UNREADABLE': 0}
        for p in ids:
            c[diagnose_clause(info[p]['blob'], rx)] += 1
        flag = '  <-- BUG' if c['UNREADABLE'] else ''
        print('%-16s %9d %11d %10d %6d%s'
              % (r['label'], len(ids), c['UNREADABLE'], c['NO-COLOUR'], c['OK'], flag))


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
    clause_report(rows, info, rxs)
    if a.report:
        write_report(rows, info, a.report, a.n)


if __name__ == '__main__':
    main()
