#!/usr/bin/env python3
"""SessionStart hook for the SudokuPad project.
Surfaces docs/WIP.md at session start when it holds un-finalized notes, so the
WIP review does not depend on the model remembering to look. Silent when WIP is
empty (just the template / the "_(empty)_" marker)."""
import os
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
p = os.path.join(root, 'docs', 'WIP.md')
try:
    t = open(p, encoding='utf-8').read()
except OSError:
    raise SystemExit(0)
lines = t.splitlines()
sep = lines.index('---') if '---' in lines else -1
after = lines[sep + 1:] if sep >= 0 else lines
if ' '.join(after).replace('_(empty)_', '').strip():
    print('[WIP] docs/WIP.md has un-finalized notes from a previous session.')
    print('Review them, fold confirmed items into LESSONS_LEARNED.md / PROJECT_SUMMARY.md,')
    print('then reset WIP to its empty template. Contents below:')
    print('=' * 60)
    print(t)
