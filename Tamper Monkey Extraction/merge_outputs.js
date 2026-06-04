#!/usr/bin/env node
// Merge the per-window extractor outputs (raw / union / index) from all windows
// into one finished file per type.
//
// Strategy: the Union JSON and the Index CSV are both DERIVED from the raw records
// (the Index's columns are auto-discovered per run, which is why separate windows
// produce different columns in different orders). So rather than reconcile four
// pre-aggregated Unions and four mismatched CSVs, we merge the raw records (the
// source of truth) and REBUILD union + index from the combined set using the
// extractor's own buildUnion / buildIndexCSV logic (ported verbatim below). That
// yields one consistent column set and correct, non-double-counted union totals.
//
// Usage:  node merge_outputs.js [outputDir]
//   outputDir defaults to ./Output

const fs = require('fs');
const path = require('path');

const OUT_DIR = process.argv[2] || path.join(__dirname, 'Output');

// ── ported verbatim from sudokupad_extractor.user.js ────────────────────────────
function buildUnion(records) {
  const U = new Map();
  const uniq = (arr) => [...new Set(arr)];
  for (const rec of records) {
    const pid = rec.id;
    for (const b of (rec.buckets || [])) {
      let u = U.get(b.k);
      if (!u) {
        u = { bucket: b.k, totalCount: 0, puzzleCount: 0, firstSeen: pid,
              fSrc:[], fVal:[], fGray:[], stroke:[], sSrc:[], sGray:[], sW:[],
              shape:[], pos:[], cells:[], opacity:[], none:false, rotated:false,
              drManaged:false, text:[], puzzles:[] };
        U.set(b.k, u);
      }
      u.totalCount += b.n;
      u.puzzleCount += 1;
      u.puzzles.push(pid);
      u.fSrc.push(...(b.fSrc||[]));   u.fVal.push(...(b.fVal||[])); u.fGray.push(...(b.fGray||[]));
      u.stroke.push(...(b.sVal||[])); u.sSrc.push(...(b.sSrc||[])); u.sGray.push(...(b.sGray||[])); u.sW.push(...(b.sW||[]));
      u.shape.push(...(b.shape||[])); u.pos.push(...(b.pos||[]));   u.cells.push(...(b.cells||[]));
      u.opacity.push(...(b.op||[]));  u.text.push(...(b.text||[]));
      if (b.none) u.none = true;
      if (b.rot)  u.rotated = true;
      if (b.dr)   u.drManaged = true;
    }
  }
  return [...U.values()]
    .sort((a, b) => a.bucket < b.bucket ? -1 : 1)
    .map(u => ({
      bucket: u.bucket, totalCount: u.totalCount, puzzleCount: u.puzzleCount, firstSeen: u.firstSeen,
      fillSrc: uniq(u.fSrc), fill: uniq(u.fVal), fillGray: uniq(u.fGray),
      none: u.none || undefined,
      stroke: uniq(u.stroke), strokeSrc: uniq(u.sSrc), strokeGray: uniq(u.sGray), strokeWidth: uniq(u.sW),
      shape: uniq(u.shape), pos: uniq(u.pos), cells: uniq(u.cells), opacity: uniq(u.opacity),
      rotated: u.rotated || undefined, drManaged: u.drManaged || undefined,
      text: uniq(u.text),
      puzzles: u.puzzles,
    }));
}

const FEATURE_COLS = {
  fog:           (c, k) => !!(c.foglight || c.foglink) || /#fog/.test(k),
  kropki:        (c, k) => !!c.kropkis || /feature-kropki/.test(k),
  xv:            (c, k) => !!(c.xv || c.exclusion) || /feature-xv/.test(k),
  killer_cage:   (c, k) => /cage-killer/.test(k),
  extra_region:  (c, k) => /cage-extraregion/.test(k),
  thermo:        (c, k) => !!c.thermos,
  arrow:         (c, k) => !!c.arrowSums || /#arrows \| (path|marker)/.test(k),
  palindrome:    (c, k) => !!c.palindrome,
  little_killer: (c, k) => !!c.littleKiller,
  sandwich:      (c, k) => !!c.sandwichCages,
  inequality:    (c, k) => !!c.inequality,
  sudoku_x:      (c, k) => !!c.sudokuX,
  windoku:       (c, k) => !!c.windoku,
  cosmetic:      (c, k) => !!(c.cosmetic || c.cosmetics) || /#overlay|#underlay/.test(k),
  cell_colors:   (c, k) => /#cell-colors/.test(k),
  givens:        (c, k) => !!c.givens || /cell-given/.test(k),
};

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const COVERED_KEYS = new Set(['foglight','foglink','kropkis','xv','exclusion','thermos',
  'arrowSums','palindrome','littleKiller','sandwichCages','inequality','sudokuX','windoku',
  'cosmetic','cosmetics','givens','cages']);
const NON_FEATURE_KEYS = new Set(['rules','cellData','cells','regions','solution','grid',
  'lines','underlays','overlays']);

function gridDims(rec) {
  const m = rec.meta || {};
  let w = m.gridW, h = m.gridH;
  if (!(w > 0 && h > 0)) { const s = rec.gridSize; if (s > 0) { w = s; h = s; } }
  if (w > 0 && h > 0) return { w, h, sq: (w === h ? 1 : 0) };
  return { w: 'undefined', h: 'undefined', sq: 'undefined' };
}

function buildIndexCSV(records) {
  const featNames = Object.keys(FEATURE_COLS);
  const extra = new Set();
  for (const rec of records)
    for (const k of Object.keys(rec.constraints || {}))
      if (!COVERED_KEYS.has(k) && !NON_FEATURE_KEYS.has(k)) extra.add(k);
  const extraCols = [...extra].sort();

  const head = ['id', 'cp_id', 'title', 'author', 'grid_w', 'grid_h', 'is_square',
    ...featNames, ...extraCols, 'url_resolved', 'url'];
  const rows = [head.map(csvCell).join(',')];
  for (const rec of records) {
    const c = rec.constraints || {};
    const bucketKeys = (rec.buckets || []).map(b => b.k).join(' || ');
    const flags = featNames.map(fn => FEATURE_COLS[fn](c, bucketKeys) ? 1 : 0);
    const extraFlags = extraCols.map(k => (c[k] > 0 ? 1 : 0));
    const d = gridDims(rec);
    const row = [rec.id, rec.cpId || '', rec.title, rec.author, d.w, d.h, d.sq,
      ...flags, ...extraFlags, (rec.urlResolved ? 1 : 0), rec.url];
    rows.push(row.map(csvCell).join(','));
  }
  return rows.join('\n');
}
// ── end ported section ──────────────────────────────────────────────────────────

// Collect the newest raw_*.json per window (spdr_<window>_raw_<ts>.json)
const files = fs.readdirSync(OUT_DIR).filter(f => /_raw_\d+\.json$/.test(f) && !/MERGED/.test(f));
const byWindow = new Map();
for (const f of files) {
  const win = f.replace(/^spdr_/, '').replace(/_raw_\d+\.json$/, '');
  const ts = Number(f.match(/_raw_(\d+)\.json$/)[1]);
  if (!byWindow.has(win) || ts > byWindow.get(win).ts) byWindow.set(win, { f, ts });
}
if (byWindow.size === 0) { console.error('No raw_*.json files found in', OUT_DIR); process.exit(1); }

// Merge raw records + dedup by cpId (fallback id). Keep first occurrence.
const merged = [];
const seen = new Map();          // key -> window it first came from
let dupCount = 0;
const dupExamples = [];
for (const [win, { f }] of [...byWindow].sort()) {
  const recs = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'));
  let added = 0, dup = 0;
  for (const rec of recs) {
    const key = rec.cpId || rec.id;
    if (seen.has(key)) {
      dup++; dupCount++;
      if (dupExamples.length < 8) dupExamples.push(`${key}  (in ${seen.get(key)} & ${win})`);
      continue;
    }
    seen.set(key, win);
    merged.push(rec);
    added++;
  }
  console.log(`  ${win.padEnd(10)} ${String(recs.length).padStart(4)} records  (+${added} new, ${dup} dup)  [${f}]`);
}

const union = buildUnion(merged);
const indexCsv = buildIndexCSV(merged);

const rawPath   = path.join(OUT_DIR, 'spdr_MERGED_raw.json');
const unionPath = path.join(OUT_DIR, 'spdr_MERGED_union.json');
const indexPath = path.join(OUT_DIR, 'spdr_MERGED_index.csv');
fs.writeFileSync(rawPath,   JSON.stringify(merged, null, 2), 'utf8');
fs.writeFileSync(unionPath, JSON.stringify(union,  null, 2), 'utf8');
fs.writeFileSync(indexPath, indexCsv, 'utf8');

console.log('');
console.log(`Merged ${byWindow.size} windows -> ${merged.length} unique records  (${dupCount} duplicates removed)`);
if (dupExamples.length) console.log('  dup examples:\n    ' + dupExamples.join('\n    '));
console.log(`Union buckets:        ${union.length}`);
console.log(`Index CSV columns:    ${indexCsv.split('\n')[0].split(',').length}  rows: ${indexCsv.split('\n').length - 1}`);
console.log('');
console.log('Wrote:');
console.log('  ' + rawPath);
console.log('  ' + unionPath);
console.log('  ' + indexPath);
