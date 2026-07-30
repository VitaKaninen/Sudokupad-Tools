#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// counting_circle_recall.mjs — score the SHIPPED counting-circle cue against the
// puzzle catalog.
//
//     node tools/counting_circle_recall.mjs [--all] [--guarded]
//
// Why this exists instead of a row in tools/cue_recall.py: that tool's model is
// "one cue regex, optionally minus one anti regex", and the counting-circle cue
// is not that shape. Its precision comes from an ANCHORED self-reference test —
// the counted noun must be the trigger's immediate object — which is what keeps
// the three "counts the CELLS a circle SEES" puzzles out (`sotpbtg8o1`,
// `m73tnQmbbd`, `vgbfcjxvav`). Flattening it into a single regex would score
// something that is not what ships, which is worse than not scoring it there.
//
// So this extracts the real functions from the userscript, exactly as
// validator_harness.mjs does, and runs them over the catalog's rules text. It
// cannot drift from the shipped cue.
//
// The catalog's `counting_circle` tag is keyword-derived and NOISY (it fires on
// the word "counting"), so recall against it is NOT the headline number — read
// the guard breakdown and the untagged-fire list, and triage each row into
// "real over-fire / genuine puzzle the catalog left untagged / catalog noise".
// FPs matter more than misses: an over-firing cue makes the validator claim
// another rule's circles, which is an over-removal.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';
import { createReadStream } from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'Sudokupad-Tools.user.js'), 'utf8');
const lines = src.split(/\r?\n/);
const CAT = 'C:\\Users\\VitaKaninen\\Desktop\\Projects\\GitHub\\Sudokupad Catalog\\classify';

// Same extraction contract as validator_harness.mjs: two-space indent, functions
// close on a two-space "}", vars are single-line.
function extractDecl(name) {
  const fnRe = new RegExp(`^  function ${name}\\(`);
  const varRe = new RegExp(`^  var ${name} =`);
  for (let i = 0; i < lines.length; i++) {
    if (varRe.test(lines[i])) {
      if (!lines[i].trimEnd().endsWith(';')) throw new Error(`var ${name} is not single-line`);
      return { pos: i, text: lines[i] };
    }
    if (fnRe.test(lines[i])) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] === '  }') return { pos: i, text: lines.slice(i, j + 1).join('\n') };
        if (/^  (function|var) /.test(lines[j])) throw new Error(`function ${name}: no closing brace`);
      }
    }
  }
  throw new Error(`not found: ${name}`);
}

const NAMES = [
  'COUNTCIRCLE_NOUN_SRC', 'COUNTCIRCLE_STEMS', 'COUNTCIRCLE_CONTAINER_RE',
  'COUNTCIRCLE_ADJFIRST_RE', 'COUNTCIRCLE_TRIGGER_RE', 'COUNTCIRCLE_NEG_RE',
  'COUNTCIRCLE_COLOR_RE', 'COUNTCIRCLE_DEFERRED_RE', 'COUNTCIRCLE_ANTI_RE',
  'COUNTCIRCLE_SEMI_RE', 'countingCircleSelfRef', 'countingCircleClause',
];
const decls = NAMES.map((n) => ({ name: n, ...extractDecl(n) })).sort((a, b) => a.pos - b.pos);
const F = new Function(`'use strict';\n${decls.map((d) => d.text).join('\n')}\nreturn { ${NAMES.join(', ')} };`)();

async function readJsonl(file) {
  const out = [];
  const rl = readline.createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip a malformed row */ }
  }
  return out;
}

const showAll = process.argv.includes('--all');
const showGuarded = process.argv.includes('--guarded') || showAll;

const log = await readJsonl(path.join(CAT, 'output', 'catalog_log.jsonl'));
const review = await readJsonl(path.join(CAT, 'data', 'review_catalog.jsonl'));
const tagged = new Set(log.filter((d) => (d.tags || []).includes('counting_circle')).map((d) => d.id));

// The classifier's guard order, mirrored (classifyCountingCircles applies SEMI to
// the whole blob and the rest to the matched clause).
function guardsFor(blob, clause) {
  const g = [];
  if (F.COUNTCIRCLE_SEMI_RE.test(blob)) g.push('SEMI');
  if (F.COUNTCIRCLE_NEG_RE.test(clause)) g.push('NEG');
  if (F.COUNTCIRCLE_COLOR_RE.test(clause)) g.push('COLOUR');
  if (F.COUNTCIRCLE_DEFERRED_RE.test(clause)) g.push('DEFERRED');
  return g;
}

const rows = [];
for (const d of review) {
  const blob = ((d.title || '') + ' ' + (d.rules || '')).toLowerCase();
  if (!d.rules) continue;
  const cue = F.countingCircleClause(blob);
  if (!cue) continue;
  rows.push({ id: d.id, title: d.title || '', word: cue.word, stem: cue.stem,
              scoped: cue.scoped, clause: cue.clause.replace(/\s+/g, ' ').trim(),
              guards: guardsFor(blob, cue.clause) });
}

const clean = rows.filter((r) => !r.guards.length);
const guarded = rows.filter((r) => r.guards.length);
const untagged = clean.filter((r) => !tagged.has(r.id));
const missed = [...tagged].filter((t) => !rows.some((r) => r.id === t));

console.log(`catalog puzzles with rules text : ${review.filter((d) => d.rules).length}`);
console.log(`cue fires                       : ${rows.length}`);
console.log(`  clean (validator offered)     : ${clean.length}`);
console.log(`  guarded (greyed + explained)  : ${guarded.length}`);
console.log(`tagged counting_circle          : ${tagged.size}  (keyword-derived, noisy)`);
console.log(`  of those, cue fires on        : ${rows.filter((r) => tagged.has(r.id)).length}`);

const byWord = {};
rows.forEach((r) => { byWord[r.word] = (byWord[r.word] || 0) + 1; });
console.log(`nouns                           : ${Object.entries(byWord).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${n}`).join(', ')}`);
const byGuard = {};
guarded.forEach((r) => { const k = r.guards.join('+'); byGuard[k] = (byGuard[k] || 0) + 1; });
console.log(`guards                          : ${Object.entries(byGuard).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(', ')}`);
console.log(`scoped / unscoped               : ${clean.filter((r) => r.scoped).length} / ${clean.filter((r) => !r.scoped).length}`);

if (showGuarded) {
  console.log('\n=== GUARDED (row greyed out, tooltip says which variant) ===');
  guarded.sort((a, b) => a.guards.join().localeCompare(b.guards.join()))
    .forEach((r) => console.log(`${r.id.padEnd(30)} ${r.guards.join('+').padEnd(9)} ${r.clause.slice(0, 96)}`));
}
console.log('\n=== CLEAN FIRES the catalog left UNTAGGED (triage these) ===');
untagged.forEach((r) => console.log(`${r.id.padEnd(30)} ${r.title.slice(0, 30).padEnd(32)} [${r.word}] ${r.clause.slice(0, 84)}`));
if (showAll) {
  console.log('\n=== ALL CLEAN FIRES ===');
  clean.sort((a, b) => a.id.toLowerCase().localeCompare(b.id.toLowerCase()))
    .forEach((r) => console.log(`${r.id.padEnd(30)} ${r.scoped ? 'scoped  ' : 'unscoped'} [${r.word}] ${r.clause.slice(0, 80)}`));
  console.log('\n=== TAGGED but no cue (mostly tag noise — verify before "fixing") ===');
  missed.forEach((t) => {
    const d = review.find((x) => x.id === t);
    console.log(`${t.padEnd(30)} ${(d && d.title || '').slice(0, 34).padEnd(36)} ${((d && d.rules) || '').replace(/\s+/g, ' ').slice(0, 90)}`);
  });
}
