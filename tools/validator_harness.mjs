#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// validator_harness.mjs — regression harness for the PURE logic inside
// Sudokupad-Tools.user.js (colour classification, cue regexes, cage maths,
// line-chain expansion, region colouring, digit bands).
//
// Like tools/cue_recall.py, it never copies code: the functions under test are
// EXTRACTED from the live userscript by name, so the harness can't drift from
// what ships. Run it after touching any of the extracted functions or regexes:
//
//     node tools/validator_harness.mjs
//
// Exit code 0 = all cases pass. Every expected value below is anchored to a
// fact recorded in docs/LESSONS_LEARNED.md / docs/VALIDATORS.md (the trap
// puzzles that originally forced each rule) — if a case fails, either the
// change broke a documented behaviour or the doc needs updating with it.
//
// Extraction relies on the file's formatting convention: top-level declarations
// are indented exactly two spaces and functions close with a two-space "}" on
// its own line; extracted `var`s must be single-line. A declaration that stops
// matching that shape fails the extraction loudly (better than testing stale
// code).
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.join(here, '..', 'Sudokupad-Tools.user.js');
const src = readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

// ── extraction ───────────────────────────────────────────────────────────────
function extractDecl(name) {
  const fnRe = new RegExp(`^  function ${name}\\(`);
  const varRe = new RegExp(`^  var ${name} =`);
  for (let i = 0; i < lines.length; i++) {
    if (varRe.test(lines[i])) {
      if (!lines[i].trimEnd().endsWith(';'))
        throw new Error(`var ${name} is not single-line any more — teach the harness to span it`);
      return { pos: i, text: lines[i] };
    }
    if (fnRe.test(lines[i])) {
      // Single-line function? (balanced braces on the declaration line)
      const opens = (lines[i].match(/{/g) || []).length;
      const closes = (lines[i].match(/}/g) || []).length;
      if (opens > 0 && opens === closes) return { pos: i, text: lines[i] };
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] === '  }') return { pos: i, text: lines.slice(i, j + 1).join('\n') };
        if (/^  (function|var) /.test(lines[j]))
          throw new Error(`function ${name}: ran into the next declaration before a two-space "}"`);
      }
    }
  }
  throw new Error(`declaration not found in userscript: ${name}`);
}

const NAMES = [
  // colour machinery
  'parseColor', 'rgbToHsl', 'hslToRgb',
  'COLOR_WORD_HUE', 'COLOR_WORD_ALL', 'canonColorWord', 'circularHueDeg',
  'colorWordScore', 'nearestColorWord', 'lineColorWord', 'colorWordRe',
  'clauseColorWord', 'blobColorWords', 'linesForClauseColor', 'normLineColor',
  'isGermanWhisperColor',
  // cue / clause regexes + composite cues
  'WHISPER_CUE_RE', 'WHISPERISH_RE', 'SELF_DEDUCTION_RE',
  'DUTCH_CUE_RE', 'DUTCH_CLAUSE_RE', 'DUTCH_LOCKOUT_RE',
  'RENBAN_CUE_RE', 'RENBAN_CLAUSE_RE',
  'NABNER_CUE_RE', 'NABNER_CLAUSE_RE', 'NABNER_ANTI_RE',
  'TEN_LINE_CUE_RE', 'TEN_LINE_CLAUSE_RE', 'TEN_LINE_ANTI_RE',
  'REGIONSUM_CUE_RE', 'REGIONSUM_CLAUSE_RE',
  'PARITY_CUE_RE', 'PARITY_CLAUSE_RE',
  'ZIPPER_CUE_RE', 'ZIPPER_CLAUSE_RE',
  'PALINDROME_CUE_RE', 'PALINDROME_ANTI_RE', 'PALINDROME_CLAUSE_RE',
  'SAMEDIFF_CUE_RE', 'SAMEDIFF_ANTI_RE', 'SAMEDIFF_CLAUSE_RE',
  'SAMEDIFF_ADJDIFF_RE', 'SAMEDIFF_BOUNDED_RE', 'SAMEDIFF_PERLINE_RE',
  'SAMEDIFF_THATNUM_RE', 'hasPerLineConstDiffCue',
  'BETWEEN_CUE_RE', 'BETWEEN_CLAUSE_RE', 'BETWEEN_LOCKOUT_RE',
  'LOCKOUT_CUE_RE', 'LOCKOUT_CLAUSE_RE', 'LOCKOUT_GAP_RE',
  'DOUBLEARROW_NAME_RE', 'DOUBLEARROW_CUE_RE', 'DOUBLEARROW_ANTI_RE',
  'DOUBLEARROW_CLAUSE_RE', 'doubleArrowCueFires',
  'ENTROPIC_CUE_RE', 'ENTROPIC_ANTI_RE', 'ENTROPIC_SET_RE',
  'ENTROPIC_LINEISH_RE', 'ENTROPIC_CLAUSE_RE', 'hasEntropicCue',
  'MODULAR_CUE_RE', 'MODULAR_SET_RE', 'MODULAR_CLAUSE_RE', 'hasModularCue',
  // line-type labels ("…double arrows (DA)…" + a sticker on the line)
  'LABEL_DEF_RE', 'labelDefPhrases',
  // between-line interval maths + bulb pruning + marker segmentation
  'interiorsFeasible', 'betweenDigitAllowed', 'betweenInteriorsFeasible', 'betweenBulbDigitAllowed',
  'lineStepGraph', 'reflectCellKey', 'walkBetweenSegment',
  // lockout-line support (the between line's mirror)
  'lockoutOutside', 'lockoutSegmentSupport',
  // zipper stroke-joining + fold centre
  'mergeLineStrokes', 'lineClueChains', 'zipperChains', 'zipperFoldCenter',
  // Roman numerals on a cell border (the XV validator's sum target)
  'ROMAN_UNITS', 'romanString', 'romanValue',
  // difference dots (a labelled white border circle: |a-b| = the label)
  'DIFFDOT_DIFF_RE', 'DIFFDOT_MARKER_RE', 'DIFFDOT_LINEISH_RE', 'DIFFDOT_ADJACENT_RE',
  'DIFFDOT_OUTSIDE_RE', 'DIFFDOT_KROPKI1_RE', 'DIFFDOT_DEFERRED_RE', 'DIFFDOT_RIVAL_RE',
  'differenceDotClause', 'hasDifferenceDotCue',
  // cage maths
  'cageCombinations', 'hasPerfectMatching', 'regularBoxDims',
  // geometry / chains
  'expandLineChain', 'fpuzCellKey', 'regionSumSegments', 'thermoBulbShaftCompatible',
  'thermoLongestChain',
  // ten-line structural feasibility
  'tenLineSegSizes', 'tenLinePartitionable', 'tenLineTilingSupport', 'regionSumSegmentSupport',
  // same-difference chain support
  'sameDiffLineSupport', 'sameDiffExactFills',
  // region colouring
  'countComponents', 'colourSpread', 'colourShadedRegions', 'colourGraph',
  // digit bands (read settings.digitSet — the factory injects a stub)
  'sanitizeDigitSet', 'entropicBands', 'modularBands',
];

const decls = NAMES.map((n) => ({ name: n, ...extractDecl(n) }))
  .sort((a, b) => a.pos - b.pos);   // source order keeps intra-dependency order

const factory = new Function(
  'settings',
  `'use strict';\n${decls.map((d) => d.text).join('\n')}\nreturn { ${NAMES.join(', ')} };`
);
const settings = { digitSet: '123456789' };
const F = factory(settings);

// ── tiny test runner ─────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; return; }
  fail++;
  console.error(`FAIL  ${label}\n      got      ${a}\n      expected ${e}`);
}
function checkTrue(label, v)  { check(label, !!v, true); }
function checkFalse(label, v) { check(label, !!v, false); }

// ── parseColor (4-digit #RGBA was the v3.80 legend bug's red herring) ────────
check('parseColor #f66f = #ff6666', F.parseColor('#f66f'), { r: 255, g: 102, b: 102, a: 1 });
check('parseColor #fcaf = #ffccaa', F.parseColor('#fcaf'), { r: 255, g: 204, b: 170, a: 1 });
check('parseColor #ffa600', F.parseColor('#ffa600'), { r: 255, g: 166, b: 0, a: 1 });
check('parseColor rgb()', F.parseColor('rgb(1,2,3)'), { r: 1, g: 2, b: 3, a: 1 });
check('parseColor none → null', F.parseColor('none'), null);

// ── nearest-colour-word classification (v3.80 HSL rework + v3.87 peach) ──────
const lw = (c) => F.lineColorWord({ color: c });
check('brown line stays brown (#965429, 3xdi7kf6ab)', lw('#965429'), 'brown');
check('salmon #f66f is red, not pink (3xdi7kf6ab)', lw('#f66f'), 'red');
check('lavender #bf9de0 is purple (3xdi7kf6ab)', lw('#bf9de0'), 'purple');
check('teal-leaning #2ecbff is blue (cyan handicap)', lw('#2ecbff'), 'blue');
check('#ffe5b4 is peach (bdiaxwjnxc entropic)', lw('#ffe5b4'), 'peach');
check('#ffccaa is peach', lw('#ffccaa'), 'peach');
check('#ffa600 is orange, not peach', lw('#ffa600'), 'orange');
check('light pink #ffc0cb stays pink, not peach', lw('#ffc0cb'), 'pink');
check('#67f067 is green', lw('#67f067'), 'green');
check('vivid lavender stored opaque #851fe6 is purple (sde0yq3oj3)', lw('#851fe6'), 'purple');
check('#aaaaaa is grey', F.canonColorWord(lw('#aaaaaa')), 'grey');
// aliases (v3.87): free canonicalisations
check('canon violet → purple', F.canonColorWord('violet'), 'purple');
check('canon lavender → purple', F.canonColorWord('lavender'), 'purple');
check('canon gold → yellow', F.canonColorWord('gold'), 'yellow');
check('canon silver → grey', F.canonColorWord('silver'), 'grey');
check('canon indigo → purple', F.canonColorWord('indigo'), 'purple');
check('canon turquoise → cyan', F.canonColorWord('turquoise'), 'cyan');

// ── named-colour clause pinning (v3.76/3.79 clause collisions) ───────────────
const legendLines = [
  { color: '#965429', keys: ['0,0', '1,0'] },   // brown
  { color: '#f66f',   keys: ['2,2', '3,2'] },   // red (salmon)
  { color: '#bf9de0', keys: ['4,4', '5,4'] },   // purple (lavender)
];
const legendBlob = 'brown lines are slow thermometers. '
  + 'red parity lines alternate between odd and even digits. '
  + 'purple zipper line: digits an equal distance from the center sum to the same total.';
check('parity clause pins the red line, not brown',
  F.linesForClauseColor(legendLines, legendBlob, F.PARITY_CLAUSE_RE).map((l) => l.color), ['#f66f']);
check('zipper clause pins the purple line',
  F.linesForClauseColor(legendLines, legendBlob, F.ZIPPER_CLAUSE_RE).map((l) => l.color), ['#bf9de0']);
// Renban vs Nabner (v3.79 collision + v3.89 description coverage)
const rnLines = [{ color: '#ffd700', keys: ['0,0'] }, { color: '#ff69b4', keys: ['1,1'] }];
const rnBlob = 'yellow nabner line: no two digits can be consecutive or identical. '
  + 'pink renban line: a set of consecutive digits with no repeats in any order.';
check('renban clause skips the nabner clause and pins pink',
  F.linesForClauseColor(rnLines, rnBlob, F.RENBAN_CLAUSE_RE).map((l) => l.color), ['#ff69b4']);
// …and the mirror image (v3.152): nabner must read ITS clause, not renban's.
check('nabner clause skips the renban clause and pins yellow (3xdi7kf6ab)',
  F.linesForClauseColor(rnLines, rnBlob, F.NABNER_CLAUSE_RE).map((l) => l.color), ['#ffd700']);

// ── cue regexes: the documented traps ────────────────────────────────────────
// German whisper (v3.89: words between "differ" and the 5; leading \b vs "r5.")
checkTrue('whisper cue: differ from their neighbors by at least 5',
  F.WHISPER_CUE_RE.test('digits along a green line differ from their neighbors by at least 5'));
checkFalse('whisper cue: differ by at least 4 is NOT german',
  F.WHISPER_CUE_RE.test('adjacent digits differ by at least 4'));
checkFalse('whisper cue: cell reference r5 must not match',
  F.WHISPER_CUE_RE.test('these digits differ from the digit in r5.'));
checkTrue('dutch cue: differ by at least 4',
  F.DUTCH_CUE_RE.test('adjacent digits differ by at least 4'));
checkFalse('dutch cue: differ by at least 5 is NOT dutch',
  F.DUTCH_CUE_RE.test('adjacent digits differ by at least 5'));
// Parity (v3.88: bound to a drawn-object noun; snake/snowflake count as nouns)
checkTrue('parity cue: red line alternates odd/even',
  F.PARITY_CUE_RE.test('cells along the red line alternate between odd and even digits'));
checkTrue('parity cue: snake counts as a drawn object (zmckmtohx1)',
  F.PARITY_CUE_RE.test('digits along the snake alternate parity'));
checkFalse('parity cue: parity DOTS have no line (7fvnto2d90)',
  F.PARITY_CUE_RE.test('cells separated by a white dot have the same parity'));
// Renban cue: description without the name (t1e8qgm0h1, the v3.89 bug)
checkTrue('renban cue: set of consecutive digits, name never written',
  F.RENBAN_CUE_RE.test('each line is a set of consecutive digits with no repeats (in any order)'));
// Nabner (v3.152). The named cue is easy; the described one has to stay on the
// right side of renban's near-identical vocabulary and of adjacency rules.
checkTrue('nabner cue: the name', F.NABNER_CUE_RE.test('nabner: no two digits on a yellow line may be consecutive or the same'));
checkTrue('nabner cue: antirenban is the same rule (philip-newman)',
  F.NABNER_CUE_RE.test('antirenban: digits along lines cannot repeat, and no two digits on a line can be consecutive'));
checkTrue('nabner cue: described, no name (56pq2tl5q6)',
  F.NABNER_CUE_RE.test('lines must not contain any repeated or consecutive digits'));
checkTrue('nabner cue: described, "may not appear" (ghtic0mwad)',
  F.NABNER_CUE_RE.test('along green lines, digits may not repeat and consecutive digits may not appear'));
checkTrue('nabner cue: non-consecutive non-repeating (753umuwjuz)',
  F.NABNER_CUE_RE.test('nab: non-consecutive non-repeating digits'));
checkFalse('nabner cue: renban is the OTHER polarity (8Rbb27h2pb)',
  F.NABNER_CUE_RE.test('digits along a purple line cannot repeat and form a consecutive set in any order'));
checkFalse('nabner cue: renban, "must not repeat and must form" (2l8u234v2c)',
  F.NABNER_CUE_RE.test('digits along a renban line must not repeat and must form a sequence of consecutive numbers in any order'));
checkFalse('nabner cue: an ADJACENCY rule along a loop is not nabner (l00604nlbr)',
  F.NABNER_CUE_RE.test('any two cells that are adjacent along the loop must contain non-consecutive digits'));
checkFalse('nabner cue: a non-consecutive CAGE/REGION rule has no line (h63cv2l7tp)',
  F.NABNER_CUE_RE.test('no two digits within the same cage or the same region may be consecutive'));
// Ten lines (v3.153). The named cue is easy; the described one has to stay inside
// its own clause (the rules are often one dash-separated blob) and off the rules
// that say "10" but mean a different constraint.
checkTrue('ten-line cue: the name', F.TEN_LINE_CUE_RE.test('grey ten lines: digits are split into groups that sum to 10'));
checkTrue('ten-line cue: "10-line" spelling (k39j633cdo)',
  F.TEN_LINE_CUE_RE.test('each gray 10-line consists of one or more contiguous groups of cells'));
checkTrue('ten-line cue: described, no name (gejf3uvo1y)',
  F.TEN_LINE_CUE_RE.test('each gray line consists of one or more contiguous groups of cells, each of which sums to 10'));
checkTrue('ten-line cue: described, "broken into … strings" (hTbTbQ2g7F)',
  F.TEN_LINE_CUE_RE.test('each line must be broken into one or more strings of contiguous digits which sum to 10'));
checkTrue('ten-line cue: whole-line sum, the one-group case (kccvhsp1ff)',
  F.TEN_LINE_CUE_RE.test('digits on a gray line must sum to 10'));
checkTrue('ten-line cue: a RING carries it too (JHPNrLgRQH)',
  F.TEN_LINE_CUE_RE.test('the grey ring must be divided into non-overlapping groups of cells along the ring that sum to 10'));
checkFalse('ten-line cue: a cell-SET rule has no line (el9sus7p0o)',
  F.TEN_LINE_CUE_RE.test('her cells can be divided into smaller distinct groups of orthogonally connected cells, each of which sum to 10'));
checkFalse('ten-line cue: the window must not cross a " - " bullet (19litary1w)',
  F.TEN_LINE_CUE_RE.test('the endpoints of a grey line sum to 5 - cells with a circle are odd - cells separated by an x add to 10'));
checkFalse('ten-line cue: 10 as the head of a LIST is not the target (23fMD676d3)',
  F.TEN_LINE_CUE_RE.test('box borders divide the snake into segments which sum to either 1, 5, 10, 15 or 20'));
checkFalse('ten-line cue: "sum to 10 or 11" is another rule (r2zxe5nquo)',
  F.TEN_LINE_CUE_RE.test('adjacent digits along a snake sum to 10 or 11'));
checkTrue('ten-line anti: "sum to 10 or more" despite the title "10-Line" (6BDF4d9G7r)',
  F.TEN_LINE_ANTI_RE.test('10-line normal sudoku rules apply. adjacent digits along a line must sum to 10 or more'));
checkTrue('ten-line anti: a line TOTAL that is a multiple of 10 is not a partition',
  F.TEN_LINE_ANTI_RE.test('digits along each line sum to a multiple of 10'));
checkTrue('ten-line anti: redefined digit values (LPMhrPLMDQ "Ace is High")',
  F.TEN_LINE_ANTI_RE.test('for the purposes of this puzzle, the digit 1 has a value of 10'));
checkTrue('nabner anti: anti-kropki lines forbid consecutives but ALLOW repeats (1j53hl97cx)',
  F.NABNER_ANTI_RE.test('anti-kropki lines (red): no two digits anywhere on the same red line are consecutive, or in a 1:2 ratio'));
// Region sum (v3.88 vocabulary: every/total/3x3 spanning)
checkTrue('region-sum cue: "every region it passes through" (2ifg92eka9)',
  F.REGIONSUM_CUE_RE.test('the digits in every region it passes through have the same sum'));
checkTrue('region-sum cue: "each 3x3 box" spans the size (bl168ah6g9)',
  F.REGIONSUM_CUE_RE.test('for each 3x3 box a line passes through, the digits on the line sum to the same total'));
// Zipper
checkTrue('zipper cue: equal distance from the center',
  F.ZIPPER_CUE_RE.test('digits an equal distance from the center of the line sum to the same total'));
// Palindrome (v3.164). Catalog-measured: 132/132 scoreable tagged puzzles fire.
// The named form is trivial; the load-bearing branch is the 8 setters who only
// DESCRIBE it, and the anti guards the two rules that borrow the same words.
checkTrue('palindrome cue: named outright (18arjzoqpi)',
  F.PALINDROME_CUE_RE.test('palindrome: the values along the gray line read the same forwards and backwards'));
checkTrue('palindrome cue: described, never named (f0d6t0yix3, oup3w41nfb)',
  F.PALINDROME_CUE_RE.test('normal sudoku rules apply. digits along grey lines must read the same in either direction'));
checkTrue('palindrome cue: "read the same back and forth" (km2pzzh71j)',
  F.PALINDROME_CUE_RE.test('digits along grey lines must read the same back and forth'));
checkTrue('palindrome cue: "reads the same from both directions" (LFMR2HQNJP)',
  F.PALINDROME_CUE_RE.test('the sequence of digits on a gray line reads the same from both directions'));
checkTrue('palindrome anti: "read the same when you ROLL OUT the line" is a different rule (3G8rJj4JGR, bu0cacffbu, ja5jn5uwkz)',
  F.PALINDROME_ANTI_RE.test('digits along grey lines will read the same when you roll out the grey line along the row or column'));
checkTrue('palindrome anti: fold pairs CONSECUTIVE, not equal (bill-murphy/20250705-consecutive-palindromes)',
  F.PALINDROME_ANTI_RE.test('digits equidistant from the centre of a line must be consecutive with each other'));
checkFalse('palindrome anti: a plain palindrome clue must survive it',
  F.PALINDROME_ANTI_RE.test('the digits along each gray line form a palindrome (read the same forwards and backwards)'));
checkFalse('palindrome cue: a zipper is not a palindrome (its fold pairs SUM, they do not match)',
  F.PALINDROME_CUE_RE.test('digits an equal distance from the center of the line sum to the same total'));
// Same difference (v3.159). Catalog-measured: 31/36 tagged puzzles fire, 0 real
// over-fires. The named form is easy; the described ones have to stay off the
// whisper family ("differ by at least 5") and off rules that say "same difference"
// about something that is not a line's adjacent digits.
checkTrue('same-diff cue: named lines (1j53hl97cx, dc0dbdewab)',
  F.SAMEDIFF_CUE_RE.test('same difference lines (turquoise): each pair of adjacent digits on a turquoise line have the same difference'));
checkTrue('same-diff cue: described, colour first (3mjyxrx5og, ln6peautd7)',
  F.SAMEDIFF_CUE_RE.test('adjacent digits along a turquoise line always have the same difference. this difference must be determined for each turquoise line'));
checkTrue('same-diff cue: the "neigbouring" typo is real and must still fire (hva096ojxs)',
  F.SAMEDIFF_CUE_RE.test('on a grey line, any two neigbouring digits have the same difference'));
checkTrue('same-diff cue: arithmetic sequence (12io305up4, philip-newman dailies)',
  F.SAMEDIFF_CUE_RE.test('each gray line contains an arithmetic sequence of digits, in either increasing or decreasing order'));
checkTrue('same-diff cue: "increase by the same amount" (f9h3FHGDBn)',
  F.SAMEDIFF_CUE_RE.test('digits along a grey line must increase by the same amount, in the same direction'));
checkTrue('same-diff cue: "evenly spaced sequence" (8wcx3ar7h0)',
  F.SAMEDIFF_CUE_RE.test('the digits along each line form an evenly spaced sequence (such as 1 3 5 7 or 2 5 8)'));
checkTrue('same-diff cue: "constant difference" with no adjacency word (uwygvvt8nd)',
  F.SAMEDIFF_CUE_RE.test('lines contain digits in order with a constant difference (e.g. 1-2-3, 4-6-8, 7-4-1)'));
// The near misses that must stay silent — each one would be an OVER-removal.
checkFalse('same-diff cue: a German whisper is not a same difference',
  F.SAMEDIFF_CUE_RE.test('adjacent digits on a green line have a difference of at least 5'));
checkFalse('same-diff cue: "difference between neighbouring digits is at least 2" (23xbq0xofa)',
  F.SAMEDIFF_CUE_RE.test('along every positive diagonal the difference between neighbouring digits is at least 2'));
checkFalse('same-diff cue: "different difference" is the OPPOSITE rule (0ham0u0jtt peach)',
  F.SAMEDIFF_CUE_RE.test('the difference between the values of adjacent cells on a peach line must be different for every pair of adjacent cells on that line'));
checkFalse('same-diff cue: a 2x2 dot pairs two DIAGONALS, not a line (F28G66PTLg)',
  F.SAMEDIFF_CUE_RE.test('a dot in the centre of a 2x2 square indicates that the two digits in its positive diagonal have the same difference as the two digits in its negative diagonal'));
checkTrue('same-diff anti: "sum of adjacent segments … same difference" is not ours (r3xtlrd6qv)',
  F.SAMEDIFF_ANTI_RE.test('box borders divide lines into segments. each sum of adjacent segments on one of these lines has the same difference'));
checkFalse('same-diff clause: must not read a whisper clause and steal its colour',
  F.SAMEDIFF_CLAUSE_RE.test('adjacent digits on a green line have a difference of at least 5'));
// v3.163 — the rule DEFINES a per-line constant instead of naming one. The phrase
// alone is not enough: the same words with a comparator are the whisper family's.
checkTrue('same-diff const cue: per-line unknown difference (jeu4qiw80c "Disco floor")',
  F.hasPerLineConstDiffCue('normal sudoku rules apply. each line has a unique non-negative number associated with it. this number indicates the difference between adjacent digits along that line.'));
checkFalse('same-diff const cue: bounded difference is a whisper, not ours (23xbq0xofa)',
  F.hasPerLineConstDiffCue('along every positive diagonal the difference between neighbouring digits is at least 2. every green line contains only odd digits.'));
checkFalse('same-diff const cue: no per-line number → not a per-line constant',
  F.hasPerLineConstDiffCue('the difference between adjacent digits along the marked path is three.'));
checkFalse('same-diff const cue: an unrelated "at least" elsewhere must not veto',
  !F.hasPerLineConstDiffCue('cages contain at least two odd digits. each line has its own number; this number is the difference between adjacent digits on the line.'));
// Between lines (v3.119: real catalog phrasings from the 53 non-native between_line puzzles)
checkTrue('between cue: numerically between the digits in the circles (xm3e3npmmk)',
  F.BETWEEN_CUE_RE.test('digits along a line must be numerically between the digits in circles at each end'));
checkTrue('between cue: lie strictly between the digits in the attached circles (swtm07rplk)',
  F.BETWEEN_CUE_RE.test('digits along a grey line must lie strictly between the digits in the attached circles'));
checkTrue('between cue: value must be between the values in those circles (2ad4183iyn)',
  F.BETWEEN_CUE_RE.test('the value of a digit on a line between two circles must be between the two values of the digits in those circles'));
checkFalse('between cue: sandwich "between the 1 and the 9" has no circle/bulb noun',
  F.BETWEEN_CUE_RE.test('the clue is the sum of the digits between the 1 and the 9 in that row'));
// Lockout guard: renders like a between line but forbids the interior from lying
// between the ends — must be caught so the between validator refuses to auto-claim.
checkTrue('lockout guard: "lie outside the range" set by the diamonds',
  F.BETWEEN_LOCKOUT_RE.test('digits on the line must lie outside the range set by the two diamond ends'));
checkTrue('lockout guard: "must not be between" the endpoints',
  F.BETWEEN_LOCKOUT_RE.test('the digits on the line must not be between the two endpoint values'));
checkFalse('lockout guard: a plain between clue is NOT lockout',
  F.BETWEEN_LOCKOUT_RE.test('digits along a line must be numerically between the digits in the circles'));

// ── Double arrows (v3.131) — catalog-measured: 26 of the 27 double_arrow puzzles
// fire, 0 false positives over all 6,260. One case per phrasing family + each
// near-miss the ANTI guard exists for.
checkTrue('double arrow cue: named outright (zetamath/angel)',
  F.doubleArrowCueFires('double arrows: the sum of the digits along a red line connecting two circles is equal to the sum of the digits in the circles'));
checkTrue('double arrow cue: line-first, "bulbs at each end" (v1litbf6k9)',
  F.doubleArrowCueFires('digits along lines must have the same sum as the digits in the bulbs at each end'));
checkTrue('double arrow cue: circle-first (cjjw4ss931)',
  F.doubleArrowCueFires('the sum of the digits in two orange circles is equal to the sum of the digits along the line joining them'));
checkTrue('double arrow cue: described, never named (7fapjms0yv)',
  F.doubleArrowCueFires('the sum of the digits along a line connecting two circles is equal to the sum of the digits in the circles'));
checkFalse('double arrow cue: a plain ARROW says "the circle", singular (h3i7jv9pqj)',
  F.doubleArrowCueFires('the sum of the numbers along the path of each arrow must equal the number in the circle'));
checkFalse('double arrow cue: CONCATENATION of the circle digits is a different clue (mqx8o45al4)',
  F.doubleArrowCueFires('the sum of the digits on a line strictly between two circles is equal to a concatenation of the digits in those circles'));
checkFalse('double arrow cue: PRODUCT of the circle digits is a different clue (Hp97h2FtB4)',
  F.doubleArrowCueFires('the sum of the digits on a line between two circles is equal to the product of both digits in the circles'));
checkTrue('double arrow cue: ANTI is skipped when the rules NAME it (0m0zb2b86m "Double Arrows, Product Squares")',
  F.doubleArrowCueFires('double arrows, product squares -the sum of digits along a line between two circles is equal to the sum of the digits in those two circles'));
checkFalse('double arrow cue: a between line is not a double arrow',
  F.doubleArrowCueFires('digits along a grey line must lie strictly between the digits in the attached circles'));
// The clause regex feeds the named-colour layer, where clauseColorWord takes the
// FIRST matching clause — on angel the BETWEEN clause comes first, so a bare
// "circles" trigger would hand the double arrows the between lines' grey.
checkFalse('double arrow clause: does NOT match a bare between clause (zetamath/angel)',
  F.DOUBLEARROW_CLAUSE_RE.test('between lines: cells along gray lines between two filled circles must have values between those in the circles'));
// ── line-type labels (v3.132, y697kc2umn "Dovetail") ────────────────────────
// The whole seven-type legend must come apart into one phrase per token, with no
// phrase running backwards past the previous list item.
const dove = F.labelDefPhrases(
  'normal sudoku rules.  normal rules for modular lines (mod), parity lines (par), german whispers (gw), double arrows (da), ten lines (ten), region sum lines (rsl), and entropic lines (ent) apply.');
check('label defs: Dovetail legend → one phrase per token', dove, {
  mod: 'normal rules for modular lines', par: 'parity lines', gw: 'german whispers',
  da: 'double arrows', ten: 'ten lines', rsl: 'region sum lines', ent: 'entropic lines',
});
// Each phrase must resolve to exactly ONE validator's clause regex — that is what
// lineLabelTypes() requires before a token may claim a line.
// Mirrors LINE_LABEL_TYPES (which is multi-line, so it cannot be extracted): the
// third slot is the entry's optional `not` guard.
const claimOf = (phrase) => [
  ['whisper', F.WHISPERISH_RE, F.SAMEDIFF_CLAUSE_RE], ['dutch', F.DUTCH_CLAUSE_RE],
  ['renban', F.RENBAN_CLAUSE_RE],
  ['nabner', F.NABNER_CLAUSE_RE], ['tenline', F.TEN_LINE_CLAUSE_RE],
  ['regionsum', F.REGIONSUM_CLAUSE_RE], ['parity', F.PARITY_CLAUSE_RE], ['zipper', F.ZIPPER_CLAUSE_RE],
  ['palindrome', F.PALINDROME_CLAUSE_RE],
  ['entropic', F.ENTROPIC_CLAUSE_RE], ['modular', F.MODULAR_CLAUSE_RE], ['between', F.BETWEEN_CLAUSE_RE],
  ['doublearrow', F.DOUBLEARROW_CLAUSE_RE], ['samediff', F.SAMEDIFF_CLAUSE_RE],
].filter(([, re, not]) => re.test(phrase) && !(not && not.test(phrase))).map(([k]) => k);
check('label types: Dovetail tokens each resolve to one validator',
  Object.fromEntries(Object.entries(dove).map(([tok, ph]) => [tok, claimOf(ph)])), {
    mod: ['modular'], par: ['parity'], gw: ['whisper'], da: ['doublearrow'],
    ten: ['tenline'], rsl: ['regionsum'], ent: ['entropic'],
  });
// v3.164 — a legend phrase matching TWO types claims nothing, so a new clause
// regex has to be checked against every existing one in both directions.
check('label types: "palindromes" claims palindrome and nothing else',
  claimOf('palindromes'), ['palindrome']);
check('label types: a palindrome legend still resolves uniquely when described',
  claimOf('grey lines read the same in either direction'), ['palindrome']);
check('label types: no rival legend phrase reads as a palindrome',
  ['german whispers', 'renban lines', 'zipper lines', 'region sum lines',
   'ten lines', 'parity lines', 'entropic lines', 'modular lines',
   'between lines', 'double arrows', 'same difference lines', 'nabner lines']
    .filter((p) => F.PALINDROME_CLAUSE_RE.test(p)), []);
// A parenthesised aside that is not a legend must not become a token.
check('label defs: "(if given)" is not a token',
  F.labelDefPhrases('digits in killer cages sum to the number in the top left corner (if given)'), {});
// v3.159: WHISPERISH_RE is `whisper|differ(s|ence)`, so "same difference (sd)" read
// as whisper language too — two claims, and the "exactly one type" rule then
// silenced the label layer for BOTH. The whisper entry carries a `not` guard now.
check('label types: "same difference (sd)" claims same difference only',
  claimOf('same difference lines'), ['samediff']);
check('label types: the whisper legend phrase is untouched by that guard',
  claimOf('german whispers'), ['whisper']);

checkTrue('double arrow clause: matches its own clause (zetamath/angel)',
  F.DOUBLEARROW_CLAUSE_RE.test('double arrows: the sum of the digits along a red line connecting two circles is equal to the sum of the digits in the circles'));

// ── between-line interval maths (the plan's worked "trapped value" example) ──
// bulb {5} & {2..8}: keeps 3,4,6,7; excludes 1,2,5,8,9 (a digit is never strictly
// between itself, and the two cross-intervals are (5..8) and (2..5)).
const betKeep = [1,2,3,4,5,6,7,8,9].filter((d) => F.betweenDigitAllowed(5, 5, 2, 8, d));
check('between: {5} & {2..8} keeps 3,4,6,7', betKeep, [3,4,6,7]);
// Both bulbs solved 3 & 6 → strictly between = 4,5.
check('between: {3} & {6} keeps 4,5',
  [1,2,3,4,5,6,7,8,9].filter((d) => F.betweenDigitAllowed(3, 3, 6, 6, d)), [4,5]);
// Extremes 1 & 9 → everything strictly between.
check('between: {1} & {9} keeps 2..8',
  [1,2,3,4,5,6,7,8,9].filter((d) => F.betweenDigitAllowed(1, 1, 9, 9, d)), [2,3,4,5,6,7,8]);
// Equal solved bulbs {5} & {5} → nothing can be strictly between (contradiction).
check('between: {5} & {5} keeps nothing',
  [1,2,3,4,5,6,7,8,9].filter((d) => F.betweenDigitAllowed(5, 5, 5, 5, d)), []);

// ── between-line BULB pruning (v3.120) ──────────────────────────────────────
// The reported board: a straight 4-cell between line in one row — circles at the
// ends, two interior cells both pencilled {5,7}. Interiors share a row, so they
// must differ; the circles hold {1,3,6,8,9} and {1,3,6,8}.
const rowDiffers = () => true;           // both interiors in one row → always distinct
const twoFives = [[5,7],[5,7]];
// 6 in a circle is impossible: 6 is neither below 5 nor above 7, so whichever end
// it takes, one interior has nowhere to go. THE BUG THIS FIXES — the old validator
// never touched circles, so 6 survived on the board.
checkFalse('between bulb: 6 impossible against interiors {5,7}+{5,7}',
  F.betweenBulbDigitAllowed(6, [1,3,6,8], twoFives, rowDiffers));
// The survivors are exactly the digits that can be the low (<5) or high (>7) end.
check('between bulb: {1,3,6,8,9} keeps 1,3,8,9',
  [1,3,6,8,9].filter((d) => F.betweenBulbDigitAllowed(d, [1,3,6,8], twoFives, rowDiffers)),
  [1,3,8,9]);
check('between bulb: {1,3,6,8} keeps 1,3,8',
  [1,3,6,8].filter((d) => F.betweenBulbDigitAllowed(d, [1,3,6,8,9], twoFives, rowDiffers)),
  [1,3,8]);
// DISTINCTNESS IS LOAD-BEARING: drop the must-differ relation and 6 comes back
// (interval (1,6) offers 5 to each interior separately). This case is the reason
// the feasibility test is a backtracking search and not a per-cell interval check.
checkTrue('between bulb: without distinctness 6 would survive (why the search exists)',
  F.betweenBulbDigitAllowed(6, [1,3,6,8], twoFives, () => false));
// One interior only → no distinctness to exploit; 6 IS possible (6 with an 8 end
// leaves 7 for the single interior).
checkTrue('between bulb: single interior {5,7} allows 6',
  F.betweenBulbDigitAllowed(6, [1,3,6,8], [[5,7]], rowDiffers));
// A bulb digit with no partner at all — 5 against an opposite bulb of {6} can only
// span (5,6), which holds no digit.
checkFalse('between bulb: 5 vs {6} spans an empty interval',
  F.betweenBulbDigitAllowed(5, [6], [[1,2,3,4,5,6,7,8,9]], rowDiffers));
// Feasibility directly: (1,6) can seat one {5,7} cell but never two distinct ones.
checkTrue('interiors feasible: one {5,7} inside (1,6)',
  F.betweenInteriorsFeasible([[5,7]], rowDiffers, 1, 6));
checkFalse('interiors feasible: two distinct {5,7} inside (1,6)',
  F.betweenInteriorsFeasible(twoFives, rowDiffers, 1, 6));
checkTrue('interiors feasible: two distinct {5,7} inside (3,8)',
  F.betweenInteriorsFeasible(twoFives, rowDiffers, 3, 8));

// ── walking segments off the drawn-step graph (v3.121) ──────────────────────
// The clue is NOT the stored polyline: a between line continues STRAIGHT through a
// crossing. Scored against `2ad4183iyn`'s published solution, straight-through
// satisfies all 57 segments while following the stroke order violates 14.
const walk = (chains, circles, start, next) =>
  F.walkBetweenSegment(F.lineStepGraph(chains), circles, start, next);
const segOf = (s) => (s === null ? null : s.join(' '));

check('reflect: straight continuation east', F.reflectCellKey('4,7', '3,7'), '5,7');
check('reflect: straight continuation north', F.reflectCellKey('4,7', '4,8'), '4,6');

// `2ad4183iyn` R8C5 = "4,7", a 4-way crossing whose two stored strokes each TURN
// there (R9C5→west, R8C6→north). Walking it must yield the STRAIGHT vertical and
// horizontal lines — the vertical is the segment the v3.120 split missed.
const crossChains = [
  ['4,8', '4,7', '3,7'],            // stroke 1: comes up from R9C5, turns west
  ['5,7', '4,7', '4,6'],            // stroke 2: comes from R8C6, turns north
];
const crossCircles = { '4,8': 1, '4,6': 1, '3,7': 1, '5,7': 1 };
check('walk: crossing gives the straight VERTICAL (the missed R8C5 segment)',
  segOf(walk(crossChains, crossCircles, '4,8', '4,7')), '4,8 4,7 4,6');
check('walk: crossing gives the straight HORIZONTAL',
  segOf(walk(crossChains, crossCircles, '3,7', '4,7')), '3,7 4,7 5,7');

// One row-long chain threading five circles → each circle-to-circle run is a clue.
const row0 = [0,1,2,3,4,5,6,7,8].map((c) => `${c},0`);
const circ41 = {}; [0,2,4,6,8].forEach((c) => { circ41[`${c},0`] = 1; });
check('walk: threaded chain splits at each circle',
  segOf(walk([row0], circ41, '2,0', '3,0')), '2,0 3,0 4,0');
check('walk: walking the other way gives the same clue reversed',
  segOf(walk([row0], circ41, '4,0', '3,0')), '4,0 3,0 2,0');
// An ordinary between line with circles only at its ends is returned whole.
check('walk: circles at the ends only → the whole chain is one clue',
  segOf(walk([row0], { '0,0': 1, '8,0': 1 }, '0,0', '1,0')), row0.join(' '));
// A genuine BEND (degree 2, no straight continuation) is followed, not refused.
check('walk: an L-shaped line follows its lone bend',
  segOf(walk([['0,0', '1,0', '1,1']], { '0,0': 1, '1,1': 1 }, '0,0', '1,0')), '0,0 1,0 1,1');
// Two circles side by side have no interior → nothing to constrain.
check('walk: adjacent circles yield no segment',
  segOf(walk([['0,0', '1,0']], { '0,0': 1, '1,0': 1 }, '0,0', '1,0')), null);
// A junction with no straight continuation and >2 stubs is genuinely open — refuse
// rather than guess which pair the setter meant (under-detect, never mis-apply).
check('walk: ambiguous 3-way junction is refused, not guessed',
  segOf(walk([['0,1', '1,1', '1,0'], ['1,1', '1,2']],
    { '0,1': 1, '1,0': 1, '1,2': 1 }, '0,1', '1,1')), null);
// …but that must be a REAL T, not one manufactured by hiding a stroke from the graph.
// `2ad4183iyn` R5C8: the 4th stub lives on a 2-cell connector stroke carrying only ONE
// circle. Feed every chain to the graph and the cell is a plain crossing again, so the
// vertical resolves; hold the connector out and it degrades to a refused T-junction.
const bigStrokes = [
  ['0,1', '1,1', '2,1'],            // a stroke running horizontally through the junction
  ['1,0', '1,1'],                   // another stroke arriving from the north, ending there
];
const connector = ['1,1', '1,2'];   // the short connector south — only ONE circle on it
const connCircles = { '1,0': 1, '1,2': 1, '0,1': 1, '2,1': 1 };
check('walk: a 1-circle connector stroke still counts toward the graph',
  segOf(walk(bigStrokes.concat([connector]), connCircles, '1,0', '1,1')), '1,0 1,1 1,2');
check('walk: dropping that stroke fakes a T-junction and loses the line (v3.121 bug)',
  segOf(walk(bigStrokes, connCircles, '1,0', '1,1')), null);

// ── Dutch-whisper / lockout collision (v3.120, f9a2chdekr + u0cs9m2qmx) ─────
// A lockout line states the gap between its DIAMONDS, which trips the Dutch cue.
checkTrue('dutch cue fires on lockout diamond phrasing (the false positive)',
  F.DUTCH_CUE_RE.test('two connected diamonds must contain numbers with a difference of at least 4'));
checkTrue('dutch lockout guard: "lie strictly outside the range" (f9a2chdekr)',
  F.DUTCH_LOCKOUT_RE.test('all digits on the line connecting them must lie strictly outside the range defined by those two numbers'));
checkTrue('dutch lockout guard: the word lockout (u0cs9m2qmx)',
  F.DUTCH_LOCKOUT_RE.test('lockout lines: digits on blue lines can not be between or equal to the digits in the diamonds'));
// …and a genuine Dutch whisper must NOT be demoted by it.
checkFalse('dutch lockout guard: a real Dutch whisper is untouched',
  F.DUTCH_LOCKOUT_RE.test('dutch whisper line: digits along an orange line differ by at least 4'));

// ── LOCKOUT LINES (v3.167) ──────────────────────────────────────────────────
// The cue, against the rules blob of each catalogued lockout puzzle (blobs are
// title+rules, lowercased — six of the seven carry "lockout" in the title).
const lockoutBlobs = {
  u2361pezfa: 'dec 27, 2021: lockout lines the grid also contains some cells that are marked with diamonds. if two diamonds are joined by a line, then the digits in the diamonds differ by at least 4',
  '5t5cagkrax': 'aug 12, 2022: lockout lines if two diamonds are directly connected by a line, then the numbers in the diamonds must differ by at least 4, and the numbers on the line must not be between the numbers in the diamonds',
  f9a2chdekr: 'mar 17, 2022: lockout lines two connected diamonds must contain numbers with a difference of at least 4, and all digits on the line connecting them must lie strictly outside the range defined by those two numbers',
  FLqFBMpTJB: 'four lockout lines digits on the diamond endpoints of a purple line must have a difference of at least 4 and the remaining digits on the line cannot be between or equal to the digits on the endpoints',
  u0cs9m2qmx: 'lockout lines turn 4 lockout lines: digits on blue lines can not be between or equal to the digits in the diamonds at the ends of the line',
  uyol9lzyp5: 'march 25, 2024: lockout lines there are some lines in the grid with diamonds at each end. for each line, the digits in the two diamonds must have a difference of 4 or more',
};
Object.keys(lockoutBlobs).forEach((id) =>
  checkTrue(`lockout cue: fires on ${id}`, F.LOCKOUT_CUE_RE.test(lockoutBlobs[id])));
// The one puzzle that never says "lockout" OR "diamond" — it is caught only by the
// outside/endpoints branch, which is why that branch exists.
const trickling = "trickling down digits on a line must fall 'outside' the range of their yellow endpoints. each endpoint value must differ by at least 4 from other directly connected endpoints";
checkTrue('lockout cue: rGF3gpgnmM has neither "lockout" nor "diamond"',
  !/lock-?out|diamond/.test(trickling));
checkTrue('lockout cue: …and the outside/endpoints branch still catches it',
  F.LOCKOUT_CUE_RE.test(trickling));
// The near-misses the cue must NOT claim: a plain BETWEEN line states the opposite
// rule with the same nouns, and "block out" must not read as "lock out".
checkFalse('lockout cue: a plain between line is not a lockout line',
  F.LOCKOUT_CUE_RE.test('digits along a line must lie strictly between the digits in the attached circles'));
checkFalse('lockout cue: "block out" does not read as lockout',
  F.LOCKOUT_CUE_RE.test('the shaded cells block out part of the grid'));
// The name branch must name the CLUE TYPE. `s64txn1v6l` "RAT RUN 35: Locked Out" is a
// maze puzzle with a punning title and no lockout line anywhere — a bare /lock-?out/
// claimed its cosmetics.
checkFalse('lockout cue: a punning title is not a clue type (s64txn1v6l)',
  F.LOCKOUT_CUE_RE.test('rat run 35: locked out normal sudoku rules apply. finkz and phinx must both reach different cupcakes'));
// …while a puzzle that spells the type out with a hyphen still fires (k18i652bjj).
checkTrue('lockout cue: "locked-out lines:" (k18i652bjj)',
  F.LOCKOUT_CUE_RE.test('locked-out lines: digits on a thick blue line must not be between the digits in the diamonds'));
// The CLAUSE must read every colour-naming clause its cue fires on (the standing
// clause/cue rule — a cue its clause can't read is a guaranteed AMBIGUOUS).
checkTrue('lockout clause: "…diamond endpoints of a purple line…" (FLqFBMpTJB)',
  F.LOCKOUT_CLAUSE_RE.test('digits on the diamond endpoints of a purple line must have a difference of at least 4'));
checkTrue('lockout clause: "…blue lines … digits in the diamonds…" (u0cs9m2qmx)',
  F.LOCKOUT_CLAUSE_RE.test('digits on blue lines can not be between or equal to the digits in the diamonds at the ends of the line'));
checkTrue("lockout clause: \"…'outside' the range of their yellow endpoints\" (rGF3gpgnmM)",
  F.LOCKOUT_CLAUSE_RE.test("digits on a line must fall 'outside' the range of their yellow endpoints"));
// Bare "endpoints" is deliberately absent: BETWEEN_CLAUSE_RE owns that word, and the
// first matching clause wins — claiming a between clause would apply the OPPOSITE rule.
checkFalse('lockout clause: a bare between clause is left to the between validator',
  F.LOCKOUT_CLAUSE_RE.test('cells along gray lines between two filled circles'));

// The gap: every catalogued puzzle states 4, in one of two phrasings.
check('lockout gap: "differ by at least 4"',
  +(F.LOCKOUT_GAP_RE.exec('the numbers in the diamonds must differ by at least 4') || [])[1], 4);
check('lockout gap: "a difference of 4 or more"',
  +(F.LOCKOUT_GAP_RE.exec('the digits in the two diamonds must have a difference of 4 or more') || [])[2], 4);

// ── lockout support maths ───────────────────────────────────────────────────
// The rule's own worked example (f9a2chdekr): "on a line whose diamonds contain 2
// and 7, the only permissible numbers are 1, 8 and 9."
check('lockout: diamonds 2 & 7 permit only 1,8,9',
  [1,2,3,4,5,6,7,8,9].filter((d) => F.lockoutOutside(2, 7, d)), [1,8,9]);
// u2361pezfa's example: diamonds 1 & 6 → 7,8,9 only.
check('lockout: diamonds 1 & 6 permit only 7,8,9',
  [1,2,3,4,5,6,7,8,9].filter((d) => F.lockoutOutside(1, 6, d)), [7,8,9]);

const all9 = [1,2,3,4,5,6,7,8,9];
const noConflict = () => false;
const allDiffer = () => true;
const supp = (a, b, inner, differs, gap) =>
  F.lockoutSegmentSupport(a, b, inner, differs, gap === undefined ? 4 : gap);
const asArr = (s) => Array.from(s).sort((x, y) => x - y);

// A solved pair 2/7 with one free interior: the interior keeps exactly the outside
// digits, and the diamonds keep themselves.
let s = supp([2], [7], [all9], noConflict);
check('lockout support: interior of a solved 2–7 line keeps 1,8,9', asArr(s.inner[0]), [1,8,9]);
check('lockout support: that pair is feasible', s.pairs, 1);
// THE GAP IS A REAL ELIMINATION IN ITS OWN RIGHT — a 2-cell segment has no interior,
// but a diamond of 3 against an opposite diamond of {1..9} still loses 1,2,3,4,5,6.
s = supp(all9, [3], [], noConflict);
check('lockout support: gap 4 against a solved 3 leaves 7,8,9 (and nothing below)',
  asArr(s.a), [7,8,9]);
// A stated gap larger than 4 narrows it further; a smaller one widens it.
check('lockout support: gap 6 against a solved 3 leaves only 9',
  asArr(supp(all9, [3], [], noConflict, 6).a), [9]);
check('lockout support: gap 2 against a solved 3 leaves 1,5..9',
  asArr(supp(all9, [3], [], noConflict, 2).a), [1,5,6,7,8,9]);

// SIMULTANEITY IS LOAD-BEARING, exactly as it is for between's bulbs. Four interior
// cells that must all differ, each pencilled {1,2,3,4}: the pair 4/8 forbids 4..8, so
// the four cells need four distinct digits from {1,2,3,9} ∩ {1,2,3,4} = {1,2,3} —
// impossible. A per-cell test would have accepted it (each cell alone can take 1).
const four1234 = [[1,2,3,4],[1,2,3,4],[1,2,3,4],[1,2,3,4]];
check('lockout support: 4/8 cannot seat four distinct cells of {1,2,3,4}',
  supp([4], [8], four1234, allDiffer).pairs, 0);
checkTrue('lockout support: …but it can when they may repeat (why differs() matters)',
  supp([4], [8], four1234, noConflict).pairs === 1);
// Three such cells DO fit under 4/8 (1,2,3 distinct), which is what makes the case
// above a real deduction rather than an artifact of the search.
check('lockout support: three distinct {1,2,3,4} cells fit under 4/8',
  supp([4], [8], four1234.slice(0, 3), allDiffer).pairs, 1);

// STRUCTURAL IMPOSSIBILITY (v3.157) is this same engine run mark-free. The widest
// outside region a gap-4 pair leaves over 1-9 is four digits (1/5 → {6,7,8,9}), so a
// lockout line with FIVE mutually-conflicting interior cells can never be filled —
// and the validator must report that, not wipe the cells.
const fullInner = (n) => Array.from({ length: n }, () => all9);
check('lockout structural: 4 mutually-differing interior cells are fillable',
  supp(all9, all9, fullInner(4), allDiffer).pairs > 0, true);
check('lockout structural: 5 are not (the impossible-clue report)',
  supp(all9, all9, fullInner(5), allDiffer).pairs, 0);
// Repeats are legal along a lockout line, so length alone never makes one impossible.
check('lockout structural: ten interior cells are fine when they may repeat',
  supp(all9, all9, fullInner(10), noConflict).pairs > 0, true);

// Segmentation: a diamond terminates a line segment (u0cs9m2qmx says so), and unlike
// between, a 2-cell diamond-to-diamond run IS a clue — hence minLen 2.
check('lockout walk: adjacent diamonds still yield a segment (between refuses this)',
  segOf(F.walkBetweenSegment(F.lineStepGraph([['0,0', '1,0']]), { '0,0': 1, '1,0': 1 }, '0,0', '1,0', 2)),
  '0,0 1,0');
// Entropic (v3.85 ANTI traps + v3.88 described-set gated on a line-ish noun)
checkTrue('entropic cue: named', F.hasEntropicCue('entropic lines: every run of three cells contains a low, a medium and a high digit'));
// The ANTI guard is applied in classifyEntropicLines, ONE LAYER ABOVE the cue —
// so the trap blobs must (a) fire the raw cue (proving ANTI is load-bearing, not
// dead) and (b) match ENTROPIC_ANTI_RE (proving classify would refuse them).
const biasedBlob = 'biased entropy lines use the bands 12/345/6789';
const antiBlob = 'anti-entropy: orthogonally adjacent digits share a band on these lines';
checkTrue('entropic trap blob fires the raw cue (ho51fykiy7)', F.hasEntropicCue(biasedBlob));
checkTrue('entropic ANTI blocks biased entropy (ho51fykiy7)', F.ENTROPIC_ANTI_RE.test(biasedBlob));
checkTrue('entropic ANTI blocks anti-entropy (74j61weh89)', F.ENTROPIC_ANTI_RE.test(antiBlob));
checkFalse('entropic cue: tentropic misses the \\b anchor on its own (3gkoee7rau)',
  F.hasEntropicCue('tentropic lines contain runs of four'));
checkTrue('entropic ANTI also covers tentropic (belt-and-braces)',
  F.ENTROPIC_ANTI_RE.test('tentropic lines contain runs of four'));
checkTrue('entropic described-set cue (3ns1yd8hps)',
  F.hasEntropicCue('every three digits along a line include one high digit (789), one medium digit (456), and one low digit (123)'));
checkFalse('entropic described-set WITHOUT a drawn-object noun (5l6mlo349f box numbers)',
  F.hasEntropicCue('the boxes are numbered 123 456 789'));
// Modular
checkTrue('modular cue: named', F.hasModularCue('modular lines: every three consecutive cells contain digits from each of {1,4,7}, {2,5,8} and {3,6,9}'));
checkTrue('modular described-set cue', F.hasModularCue('every window of three cells on a line has one of 1/4/7, one of 2/5/8, one of 3/6/9'));
checkFalse('modular set without a noun', F.hasModularCue('the digits 1 4 7 then 2 5 8 then 3 6 9 appear in the corners'));
// Self-deduction guard (v3.92: tight — spares H66NhnG9mm)
checkTrue('self-deduction: line is exactly two of <types> (1cwnilmrp0)',
  F.SELF_DEDUCTION_RE.test('each line is exactly two of modular, entropic, or parity'));
checkTrue('self-deduction: literal "ambiguous lines"',
  F.SELF_DEDUCTION_RE.test('the puzzle contains several ambiguous lines.'));
checkFalse('self-deduction: "either one of these rules … cage" must stay confident (H66NhnG9mm)',
  F.SELF_DEDUCTION_RE.test('either one of these rules is true for any cage'));
// Whisper colour gate
checkTrue('german whisper green #67f067', F.isGermanWhisperColor('#67f067'));
checkFalse('grey #aaa is not "green"', F.isGermanWhisperColor('#aaa'));
checkFalse('themed #aa8d8d is not "green"', F.isGermanWhisperColor('#aa8d8d'));

// ── cage maths ───────────────────────────────────────────────────────────────
const D19 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
check('cage combos 2/17', F.cageCombinations(D19, 2, 17), [[8, 9]]);
check('cage combos 3/24', F.cageCombinations(D19, 3, 24), [[7, 8, 9]]);
check('cage combos 2/3', F.cageCombinations(D19, 2, 3), [[1, 2]]);
check('cage combos 3/7', F.cageCombinations(D19, 3, 7), [[1, 2, 4]]);
check('cage combos impossible total', F.cageCombinations(D19, 2, 1), []);
check('cage combos 2/10 count', F.cageCombinations(D19, 2, 10).length, 4); // 19 28 37 46
// ── ten-line structural feasibility (v3.153) ────────────────────────────────
// Over 1-9 a group of 10 needs 2..10 cells (a lone cell can never be 10), so every
// length except 1 tiles; over 1-6 the shortest group is still 2 (4+6).
check('ten line: group sizes over 1-9', F.tenLineSegSizes(D19, 9), [2, 3, 4, 5, 6, 7, 8, 9]);
check('ten line: group sizes over 1-6', F.tenLineSegSizes([1, 2, 3, 4, 5, 6], 6), [2, 3, 4, 5, 6]);
checkFalse('ten line: a 1-cell line is structurally impossible', F.tenLinePartitionable(1, D19));
checkTrue('ten line: 2 cells tile (1+9)', F.tenLinePartitionable(2, D19));
checkTrue('ten line: 3 cells tile as ONE group (a 2+1 split cannot)', F.tenLinePartitionable(3, D19));
checkTrue('ten line: 5 cells tile (2+3)', F.tenLinePartitionable(5, D19));
checkTrue('ten line: 12 cells tile (4 groups of 3)', F.tenLinePartitionable(12, D19));
checkFalse('ten line: 1 cell over 1-6 is impossible too', F.tenLinePartitionable(1, [1, 2, 3, 4, 5, 6]));
// ── ten-line group-tiling fallback (v3.155) ─────────────────────────────────
// The exact fill enumeration dies past ~11 open cells (digits repeat, so the fill
// count is exponential) and a 43-cell ring like `JHPNrLgRQH` "Baby Dragon" bailed
// without removing anything. The fallback enumerates GROUPS (contiguous, sum 10, so
// ≤10 cells over 1-9) and DPs over boundaries; it drops only conflicts BETWEEN
// groups, so it is a relaxation — it may under-remove, never over-remove.
{
  const D9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const noDiff = (n) => Array.from({ length: n }, () => new Array(n).fill(false));
  const sup = (sets, loop, diff) =>
    F.tenLineTilingSupport(sets.length, sets, diff || noDiff(sets.length), loop, false)
      .map(s => [...s].sort((a, b) => a - b).join(''));
  // A 2-cell line must be one group: complementary pairs only.
  check('ten fallback: 2 cells pair to 10', sup([D9, D9], false), ['123456789', '123456789']);
  check('ten fallback: 2 cells, first is 3 → second is 7', sup([[3], D9], false), ['3', '7']);
  // 3 _ 8 with room either side: NOT forced to the 2 that "every group is a pair"
  // intuition predicts — {..,3,7}{8,..} and {..,3}{1,8,1} are both legal too.
  check('ten fallback: 3 _ 8 leaves far more than the 2',
        sup([D9, [3], D9, [8], D9, D9], false)[2], '123456');
  // Exactly 3 cells as 3 _ 8 has no tiling at all: {3,x,8} > 10 and neither {3} nor
  // {8} can stand alone, so the line is wiped rather than narrowed.
  check('ten fallback: 3 _ 8 alone cannot tile', sup([[3], D9, [8]], false), ['', '', '']);
  // A cell that cannot start or finish any group is dropped entirely.
  check('ten fallback: 9 then 9 cannot tile 2 cells', sup([[9], [9]], false), ['', '']);
  // Loops are cyclic: a 4-ring of 5s tiles as two {5,5} groups at either phase.
  check('ten fallback: 4-cell loop of 5s', sup([[5], [5], [5], [5]], true), ['5', '5', '5', '5']);
  // Same 4 cells walked linearly is the same answer here, but the phase matters when
  // the ring is odd-length: a 3-ring of 5s has no cyclic tiling at all.
  check('ten fallback: 3-cell loop of 5s has no tiling', sup([[5], [5], [5]], true), ['', '', '']);
  // Conflicts INSIDE a group are enforced exactly.
  {
    const d = noDiff(2); d[0][1] = d[1][0] = true;
    check('ten fallback: mustDiffer inside a group blocks 5+5', sup([[5], [5]], false, d), ['', '']);
  }
}
// ── region-sum segment support (v3.156) ─────────────────────────────────────
// A segment is one region, so its cells are DISTINCT: the achievable sums are a
// question about digit SUBSETS, not orderings. The old ordering walk blew its
// 200k node cap at 7 cells and a bail gave up on the WHOLE line, losing what the
// short segments would have proved.
{
  const D9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const S = (...ds) => new Set(ds);
  const sums = r => [...r.feasible].sort((a, b) => a - b);
  const full = n => Array.from({ length: n }, () => new Set(D9));
  check('region seg: 4 free cells reach 10..30', sums(F.regionSumSegmentSupport(full(4), D9)),
        [10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]);
  check('region seg: 7 free cells reach 28..42', sums(F.regionSumSegmentSupport(full(7), D9)),
        [28,29,30,31,32,33,34,35,36,37,38,39,40,41,42]);
  // The 9-cell segment that used to blow the cap outright: one subset, one sum.
  check('region seg: 9 free cells are the whole digit set', sums(F.regionSumSegmentSupport(full(9), D9)), [45]);
  // Distinctness is enforced by the matching, not by ordering: two cells that can
  // only be {5} cannot both take it, so no sum is reachable at all.
  check('region seg: two cells locked to the same digit', sums(F.regionSumSegmentSupport([S(5), S(5)], D9)), []);
  check('region seg: {5} and {5,7} → only 12', sums(F.regionSumSegmentSupport([S(5), S(5, 7)], D9)), [12]);
  // Per-(cell,digit) support carries the sums that place it there.
  {
    const r = F.regionSumSegmentSupport([S(1, 2), S(3, 4)], D9);
    check('region seg: sums of {1,2}+{3,4}', sums(r), [4, 5, 6]);
    check('region seg: digit 1 in cell 0 gives 4 or 5', [...r.cd[0].get(1)].sort(), [4, 5]);
    check('region seg: digit 4 in cell 1 gives 5 or 6', [...r.cd[1].get(4)].sort(), [5, 6]);
  }
  checkTrue('region seg: an empty cell flags empty, not a bail',
            F.regionSumSegmentSupport([S(1), new Set()], D9).empty);
}
// ── same-difference chain support (v3.159) ──────────────────────────────────
// The difference is a per-line UNKNOWN, so every d is enumerated. For a fixed d
// the line is a chain CSP and arc consistency is exact; conflicts (same row /
// column / region / cage) and a loop's wrap edge need the capped exact search.
{
  const D9 = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const S = (...ds) => new Set(ds);
  const full = n => Array.from({ length: n }, () => new Set(D9));
  const noDiff = (n) => Array.from({ length: n }, () => new Array(n).fill(false));
  const allDiff = (n) => Array.from({ length: n },
    (_, i) => Array.from({ length: n }, (__, j) => i !== j));
  const sup = (sets, diff, loop) =>
    F.sameDiffLineSupport(sets.length, sets, diff || noDiff(sets.length), !!loop, D9)
      .support.map(s => [...s].sort((a, b) => a - b).join(''));
  const diffs = (sets, diff, loop) =>
    [...F.sameDiffLineSupport(sets.length, sets, diff || noDiff(sets.length), !!loop, D9).diffs]
      .sort((a, b) => a - b);

  // Free 3-cell line, no conflicts: d = 0 alone supports every digit everywhere.
  check('same diff: 3 free cells constrain nothing', sup(full(3)),
        ['123456789', '123456789', '123456789']);
  check('same diff: every difference is still open there', diffs(full(3)),
        [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  // THE EVERYDAY DEDUCTION: three cells of one row, so all three must differ. The
  // fill has to be a genuine arithmetic run (a turn would repeat the digit two
  // back), which locks the middle out of 1 and 9 — the ends stay open.
  check('same diff: a straight 3-run in one row loses 1 and 9 in the middle',
        sup(full(3), allDiff(3)), ['123456789', '2345678', '123456789']);
  // Same three cells with NO conflict (a diagonal hop across three regions): the
  // fill may fold back, so the middle keeps 1 and 9. This contrast is the whole
  // reason the conflict matrix is built per line.
  check('same diff: without conflicts the same 3 cells keep everything',
        sup(full(3), noDiff(3)), ['123456789', '123456789', '123456789']);
  // Four in a row: only d = 1 and d = 2 fit four distinct terms in 1-9.
  check('same diff: a straight 4-run in one row', sup(full(4), allDiff(4)),
        ['123456789', '2345678', '2345678', '123456789']);
  check('same diff: only differences 1 and 2 survive four in a row',
        diffs(full(4), allDiff(4)), [1, 2]);
  // A solved cell propagates both ways along the chain.
  check('same diff: 3 _ then a free cell, ends fixed at 3 and 7',
        sup([S(3), new Set(D9), S(7)], allDiff(3))[1], '5');
  // d = 0 is legal maths and is killed by the first conflict, not special-cased.
  check('same diff: two free conflicting cells cannot be equal',
        diffs(full(2), allDiff(2)), [1, 2, 3, 4, 5, 6, 7, 8]);
  check('same diff: two free cells with no conflict may be equal',
        diffs(full(2), noDiff(2)), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  // A 3-cell closed loop of mutually-conflicting cells is IMPOSSIBLE for every d
  // (three distinct digits cannot be pairwise equidistant) — no marks involved, so
  // this is the structural test that reports "we mis-read the clue".
  check('same diff: a 3-cell conflicting loop is structurally impossible',
        diffs(full(3), allDiff(3), true), []);
  // A 4-cell loop is fine: 1,2,3,2 walks back round at d = 1.
  checkTrue('same diff: a 4-cell loop is satisfiable',
            diffs(full(4), noDiff(4), true).length > 0);
  // Contradictory marks (not a structural fault): no d fits, every candidate goes,
  // the cells empty, and the run reports the red "no valid combination".
  check('same diff: {1} then {1} conflicting has no support at all',
        sup([S(1), S(1)], allDiff(2)), ['', '']);

  // ── AN INVENTED REGION IS A WRONG ANSWER, NOT A WEAK ONE (v3.162) ──────────
  // `s7221r2i0r` "Abstract Art": an 8x8 whose eight 2x4 regions are the SOLVER'S to
  // place. We used to assume the regular 2x4 boxing anyway, which made its 8-cell
  // same-difference ring structurally impossible — a red "impossible clue" error on
  // every click, even on an empty grid (the structural test never reads the marks).
  // Ring, in drawn order, 0-indexed [col,row]; duplicate endpoint already dropped.
  {
    const ring = [[1,5],[1,6],[2,6],[3,6],[3,5],[3,4],[2,4],[1,4]];
    const D8 = [1,2,3,4,5,6,7,8];
    const bd = F.regularBoxDims(8);                 // { h:2, w:4 }
    const box = ([c,r]) => `${Math.floor(r/bd.h)}:${Math.floor(c/bd.w)}`;
    const matrix = (useBoxes) => ring.map((a,i) => ring.map((b,j) =>
      i !== j && (a[0] === b[0] || a[1] === b[1] || (useBoxes && box(a) === box(b)))));
    const diffsOf = (useBoxes) => [...F.sameDiffLineSupport(
      ring.length, ring.map(() => new Set(D8)), matrix(useBoxes), true, D8).diffs];
    check('same diff: the invented 2x4 boxing makes the ring impossible (the bug)',
          diffsOf(true), []);
    check('same diff: with row/column conflicts alone the ring fills at d=1',
          diffsOf(false), [1]);
  }
}
// ── DIFFERENCE DOTS (v3.172) ────────────────────────────────────────────────
// The cue is the ENTIRE safety boundary here, because the drawing carries no
// signal at all: a white 0.5-cell disc on a border with a digit in it is the
// picture used by |a-b|, by a+b, by max(a,b) and by "tens digit of a*b" alike.
// Measured in the live DOM: the collector finds 18 dots on `b4qLdjD8LP` (a real
// difference puzzle) and all 24 on `24zhxatww7` (Sum or Greater) — the cue is the
// only thing that stops the second being validated as the first.
// Each expectation is the puzzle's own rules text, lowercased as the blob is.
{
  const fires = (blob) => F.differenceDotClause(blob) !== null;
  const ambiguous = (blob) => { const c = F.differenceDotClause(blob); return c !== null && F.DIFFDOT_RIVAL_RE.test(c); };
  const confident = (blob) => fires(blob) && !ambiguous(blob);

  // ── CONFIDENT: the six reported examples + two more the catalog scan found ──
  checkTrue('diffdot: 0jyxu79n6q "clues indicate the difference between the two adjacent cells"',
    confident('normal sudoku rules apply. clues indicate the difference between the two adjacent cells. for instance, r1c7 and r2c7 have a difference of exactly 2.'));
  checkTrue('diffdot: nd0191ecm9 "separated by a white dot have a difference of 3"',
    confident('normal sudoku rules apply. difference: digits separated by a white dot have a difference of 3. renban: digits along a line form a set of non-repeating consecutive digits in any order. x-sums: clues outside the grid indicate the sum of the first x numbers where x is the first digit seen.'));
  checkTrue('diffdot: twqc1a8ybe "joined by a white dot have a difference of exactly 5"',
    confident('fill each row, column and box with the same 8 distinct digits from 1 to 9. kropki dots: digits in cells joined by a white dot have a difference of exactly 5. digits in cells joined by a black dot have a 1:2 ratio. not all possible dots are given.'));
  checkTrue('diffdot: r9rLrppHpT "numbers in circles show the difference between the adjoining pair"',
    confident('normal sudoku rules apply. numbers in circles show the difference between the adjoining pair of digits. digits separated by a v sum to 5. digits separated by an x sum to 10.'));
  checkTrue('diffdot: b4qLdjD8LP "the circled number between two cells represents the difference"',
    confident('normal sudoku rules apply. the circled number between two cells represents the difference between the two cells.'));
  checkTrue('diffdot: f37rd0c6uu "separated by a white dot must have a difference of 3"',
    confident('normal sudoku rules apply. digits separated by a white dot must have a difference of 3. not all dots are given.'));
  checkTrue('diffdot: 55tm8zuuwb "separated by white circles must have a difference of 5"',
    confident('normal sudoku rules apply. digits in cells separated by white circles must have a difference of 5. all circles are given.'));
  checkTrue('diffdot: nrGRHthTj2 "a difference of n, where n is the digit assigned to the circle"',
    confident('digits separated by a black circle have a ratio of 1:n, where n is the digit assigned to the circle. digits separated by a white circle have a difference of n, where n is the digit assigned to the circle.'));

  // ── MUST NOT FIRE: the three reported counter-examples. None says "difference",
  // which is why the picture being identical costs us nothing.
  checkFalse('diffdot: 24zhxatww7 Sum or Greater must not fire',
    fires('normal sudoku rules apply. a clue appearing between two cells, tells you either the sum of the digits in those two cells, or the greater of the two digits in those cells.'));
  checkFalse('diffdot: ck9j1oe9s0 Rounding Error (tens digit of the product) must not fire',
    fires('normal sudoku rules apply. clues give the tens digit of the product (multiplication) of the two surrounding digits. for instance, two adjacent cells containing 8 and 9 could have a clue of 7, since 8*9=72.'));
  checkFalse('diffdot: m425nwqjyg The Greater must not fire',
    fires('normal sudoku rules apply. digits inbetween two cells give the larger of the two digits in those cells.'));

  // ── AMBIGUOUS: a rival meaning is offered, so the SOLVER chooses. Measured on
  // e13uslyl3l's own solution: difference fits 15/32 dots, max fits 17/32 — neither
  // rule alone, so auto-validating either would be wrong.
  checkTrue('diffdot: e13uslyl3l "either the difference ... or the greater" is AMBIGUOUS',
    ambiguous('normal sudoku rules apply. also, some pairs of cells are separated by a white circle. the value in the circle tells you either the difference of the digits in the two cells, or the greater of the two values in those cells.'));
  checkTrue('diffdot: philip-newman 6/6 "sum, difference, ratio, or product" is AMBIGUOUS',
    ambiguous('math pairs: digits in cells separated by a white dot must have the sum (+), difference (-), ratio (/), or product (x) given by the dot.'));

  // ── MUST NOT FIRE: a difference of ONE is a plain white Kropki dot, and setters
  // spell it out that way constantly. Without DIFFDOT_KROPKI1_RE this claimed
  // ordinary Kropki puzzles.
  checkFalse('diffdot: "consecutive (have a difference of 1)" is plain Kropki',
    fires('normal sudoku rules apply. german whispers: along each green line, adjacent digits must have a difference of 5 or more. consecutive pairs: digits separated by a white dot are consecutive (have a difference of 1). not all possible dots are necessarily given.'));
  checkFalse('diffdot: "separated by a white dot differ by 1" is plain Kropki',
    fires('digits separated by a white dot differ by 1. digits separated by a black dot are in a 1:2 ratio.'));

  // ── MUST NOT FIRE: whisper / line families. The >=5 forms are whisper language
  // wherever they appear, and `lines?` (not `line`) is what catches the plural —
  // s7221r2i0r and 7D4Bdb3NJg slipped through on "turquoise lines" until fixed.
  checkFalse('diffdot: german whisper line',
    fires('adjacent digits along a green line must have a difference of 5 or more.'));
  checkFalse('diffdot: dutch whisper line',
    fires('adjacent digits along an orange line must differ by at least 4.'));
  checkFalse('diffdot: 6o5zvf29rt line difference + consecutive dot',
    fires('digits along a green line have a minimum difference of 5 cells separated by a white dot have consecutive digits'));
  checkFalse('diffdot: xpkfq77yk0 "differ by exactly 5" on a LINE',
    fires('adjacent digits on a dark green line differ by exactly 5. digits separated by a white dot are consecutive.'));
  checkFalse('diffdot: s7221r2i0r per-LINE difference (plural "lines")',
    fires('this difference value can be different for different turquoise lines'));
  checkFalse('diffdot: ndo5ff4agt same-difference LINE',
    fires('adjacent digits along a grey line have the same difference. (separate lines may have different differences)'));

  // ── MUST NOT FIRE: the gap is deferred to the solver, so there is no label to
  // read — a same-difference-DOT variant, a different clue type (H3MfbFJ83R).
  checkFalse('diffdot: H3MfbFJ83R "differ by the same value, to be determined"',
    fires('cells separated by an orange dot differ by the same value, to be determined. not all such dots are given.'));

  // ── MUST NOT FIRE: a difference that lives somewhere other than a cell border.
  // These are the fires the adjacency requirement removed (32 -> 15 catalog-wide).
  checkFalse('diffdot: MfhQqpqPHt difference between CAGE sums',
    fires('if two cages are adjacent, their sums must be adjacent too (in other words, if two cages share an edge, the sum of the numbers must differ by one)'));
  checkFalse('diffdot: gir24mff1k constant difference along a SEQUENCE',
    fires('that is, a sequence of numbers with a constant difference between each of the terms, like 1-2-3-4 or 3-5-7-9'));
  checkFalse('diffdot: n2h6m5b7aa circle INSIDE a cell',
    fires('if a circle appears in a cell, then the digit in that cell is equal to the difference between the largest digit and the smallest digit'));
  checkFalse('diffdot: 7p6p7L2L8D difference on an ARROW',
    fires('digits on an arrow have the difference of the digit in the attached circle'));
  checkFalse('diffdot: outside-the-grid clue',
    fires('clues outside the grid give the difference between the two digits nearest the clue'));

  // The reachable differences over 1-9 with two DISTINCT digits are exactly 1..8 —
  // the validator's structural test. A dot labelled 9 (24zhxatww7 draws two) or 0
  // could never be satisfied, so it is dropped and reported, never propagated.
  {
    const reach = (d) => { for (let i = 1; i <= 9; i++) for (let j = 1; j <= 9; j++) if (i !== j && Math.abs(i - j) === d) return true; return false; };
    check('diffdot: difference 0 unreachable (cells are adjacent, must differ)', reach(0), false);
    check('diffdot: difference 1 reachable', reach(1), true);
    check('diffdot: difference 8 reachable (1 and 9)', reach(8), true);
    check('diffdot: difference 9 unreachable over 1-9', reach(9), false);
  }
}

// ── Roman numerals on a cell border (v3.171) ────────────────────────────────
// The XV validator reads the border numeral's own VALUE as the sum target, so the
// parser is the whole safety boundary: it must accept every numeral real puzzles
// draw and reject the look-alikes a decorative letter run produces.
{
  // The numerals the catalog's XV-family puzzles actually draw, with the target
  // each puzzle's rules state for it.
  check('roman V = 5 (rjl0oqocet "by a V ... sum to 5")', F.romanValue('V'), 5);
  check('roman X = 10 (rjl0oqocet "by an X ... sum to 10")', F.romanValue('X'), 10);
  check('roman VI = 6 (ogcall10hl/jfqxrndls1 "an XI sum to 11 ... a VI sum to 6")', F.romanValue('VI'), 6);
  check('roman VII = 7 (t12fc7v8bl/jyzu1d9w9q "a VII sum to 7")', F.romanValue('VII'), 7);
  check('roman VIII = 8 (ed0mko9d0b/mlw8npbcnr "a VIII sum to 8")', F.romanValue('VIII'), 8);
  check('roman XI = 11 (ogcall10hl "an XI sum to 11")', F.romanValue('XI'), 11);
  check('roman XII = 12 (t12fc7v8bl "an XII sum to 12")', F.romanValue('XII'), 12);
  check('roman XIII = 13 (ed0mko9d0b "an XIII sum to 13")', F.romanValue('XIII'), 13);
  check('roman XV = 15 (rjl0oqocet "by an XV must sum to 15")', F.romanValue('XV'), 15);
  check('roman IX = 9 (subtractive form)', F.romanValue('IX'), 9);
  check('roman IV = 4 (subtractive form)', F.romanValue('IV'), 4);

  // NON-CANONICAL look-alikes must all score 0 — this is what stops a run of
  // decorative tick marks being read as a sum. "XVX" and "VXX" appear as TITLE
  // text in the catalog (`philip-newman/20240726-xvx`, `NmMBndq3mM`), which is
  // exactly the shape that must never parse.
  check('roman IIII rejected (non-canonical)', F.romanValue('IIII'), 0);
  check('roman VV rejected', F.romanValue('VV'), 0);
  check('roman IIX rejected', F.romanValue('IIX'), 0);
  check('roman XVX rejected (a title, philip-newman/20240726-xvx)', F.romanValue('XVX'), 0);
  check('roman VXX rejected (a title, NmMBndq3mM)', F.romanValue('VXX'), 0);
  check('roman XXV is canonical 25', F.romanValue('XXV'), 25);
  check('roman XXXX rejected', F.romanValue('XXXX'), 0);
  check('roman empty rejected', F.romanValue(''), 0);
  // Letters outside {I,V,X} never parse: L/C/D/M denote totals no digit pair can
  // reach, and they appear as ordinary cosmetic labels ("C:"/"E:" outside clues).
  check('roman L rejected (not in the I/V/X set)', F.romanValue('L'), 0);
  check('roman C rejected', F.romanValue('C'), 0);
  check('roman XL rejected', F.romanValue('XL'), 0);
  check('non-roman O rejected (Counting-Neighbours X/O markers)', F.romanValue('O'), 0);

  // round-trip: romanString is the canonicality oracle, so pin its range ends
  check('romanString 1', F.romanString(1), 'I');
  check('romanString 39 (max over I/V/X)', F.romanString(39), 'XXXIX');
  check('romanString 40 out of range', F.romanString(40), '');
  check('romanString 0 out of range', F.romanString(0), '');
  // Every value 1..39 must survive the value → string → value round trip, or the
  // parser would reject a numeral a setter could legitimately draw.
  {
    let bad = [];
    for (let n = 1; n <= 39; n++) if (F.romanValue(F.romanString(n)) !== n) bad.push(n);
    check('romanValue round-trips every 1..39', bad, []);
  }
  // The two-cell sum reachability the validator uses for its structural test: over
  // 1-9 with DISTINCT digits (the cells are orthogonally adjacent) only 3..17 are
  // reachable, so I/II and XVIII+ are impossible as drawn.
  {
    const reachable = (t) => {
      for (let i = 1; i <= 9; i++) for (let j = i + 1; j <= 9; j++) if (i + j === t) return true;
      return false;
    };
    check('sum target 1 (I) unreachable over 1-9', reachable(1), false);
    check('sum target 2 (II) unreachable — needs 1+1', reachable(2), false);
    check('sum target 3 (III) reachable 1+2', reachable(3), true);
    check('sum target 10 (X) reachable', reachable(10), true);
    check('sum target 17 (XVII) reachable 8+9', reachable(17), true);
    check('sum target 18 (XVIII) unreachable — needs 9+9', reachable(18), false);
  }
}

// ── thermo arm length (v3.157) ──────────────────────────────────────────────
// A STRICT thermometer rises by >=1 every cell, so an arm longer than the digit
// set can never be filled — that clue is impossible as read and gets dropped +
// reported, not propagated (which would empty cells and blame the player's marks).
// A branching thermo's arms are independent, so the LONGEST arm is the test.
{
  const chain = (...ks) => ({ root: ks[0], edges: ks.slice(1).map((k, i) => [ks[i], k]) });
  check('thermo chain: 3-cell line', F.thermoLongestChain(chain('0,0', '0,1', '0,2')), 3);
  check('thermo chain: bulb only', F.thermoLongestChain(chain('0,0')), 1);
  check('thermo chain: empty tree', F.thermoLongestChain(null), 0);
  // Y-shaped thermo: a short arm and a long one off a shared stem — take the long one.
  check('thermo chain: branching takes the longest arm', F.thermoLongestChain({
    root: 'a', edges: [['a','b'], ['b','c'], ['c','d'], ['b','e']],
  }), 4);
  // The 10-cell strict thermo that must be flagged over a 1-9 digit set.
  check('thermo chain: 10 cells exceeds 1-9', F.thermoLongestChain(
    chain(...Array.from({ length: 10 }, (_, i) => '0,' + i))), 10);
}
checkTrue('matching: 2x2 all allowed', F.hasPerfectMatching(2, 2, () => true));
checkFalse('matching: both digits forced into cell 0', F.hasPerfectMatching(2, 2, (d, c) => c === 0));
checkTrue('matching: 3x3 permutation', F.hasPerfectMatching(3, 3, (d, c) => d === c));
check('regularBoxDims 9', F.regularBoxDims(9), { h: 3, w: 3 });
check('regularBoxDims 6', F.regularBoxDims(6), { h: 2, w: 3 });
check('regularBoxDims 12', F.regularBoxDims(12), { h: 3, w: 4 });
check('regularBoxDims 7 (prime)', F.regularBoxDims(7), { h: 1, w: 7 });

// ── line-chain expansion (collinear-compressed cosmetic paths, v3.67.1) ──────
check('chain: straight 4-cell run from one L segment',
  F.expandLineChain([[0.5, 0.5], [3.5, 0.5]]), ['0,0', '1,0', '2,0', '3,0']);
check('chain: diagonal run', F.expandLineChain([[0.5, 0.5], [2.5, 2.5]]), ['0,0', '1,1', '2,2']);
check('chain: adjacent duplicates collapse',
  F.expandLineChain([[0.5, 0.5], [0.5, 0.5], [1.5, 0.5]]), ['0,0', '1,0']);
check('chain: closed loop keeps the repeated endpoint (dedupe is the VALIDATOR\'s job, v3.85)',
  F.expandLineChain([[0.5, 0.5], [1.5, 0.5], [1.5, 1.5], [0.5, 1.5], [0.5, 0.5]]),
  ['0,0', '1,0', '1,1', '0,1', '0,0']);
// ── SHORTENED ENDS: two clues can share both endpoints (v3.160, s7221r2i0r) ──
// "Abstract Art" draws its two top-left same-difference lines with ~0.4-cell stubs
// instead of running to the endpoint centres, so the eye can see they are two
// clues where they overlap. Each stub still crosses the cell border, so rounding
// picks up the right end cell — the two L's must stay TWO 3-cell chains, never one
// 4-cell ring (a ring would be a different rule AND one shared difference).
// Waypoints below are the rendered path data ÷ the 64px cell size.
{
  const A = F.expandLineChain([[2.1, 0.5], [1.5, 0.5], [1.5, 1.1]]);
  const B = F.expandLineChain([[1.9, 1.5], [2.5, 1.5], [2.5, 0.9]]);
  check('chain: stub-ended L keeps its far end cell (r1c3→r1c2→r2c2)', A, ['2,0', '1,0', '1,1']);
  check('chain: the crossing partner is its own chain (r2c2→r2c3→r1c3)', B, ['1,1', '2,1', '2,0']);
  checkFalse('chain: sharing BOTH endpoints does not make them one closed ring',
    A[0] === A[A.length - 1] || B[0] === B[B.length - 1]);
  checkTrue('chain: the two clues share exactly their two endpoints',
    A[0] === B[B.length - 1] && A[A.length - 1] === B[0]);
}
// ── region-sum segmentation (loop-aware, v3.144) ─────────────────────────────
// Regular 3x3 boxes over a 9x9, keyed "col,row" like the validators.
const box9 = k => { const [c, r] = k.split(',').map(Number); return `${Math.floor(r / 3)}:${Math.floor(c / 3)}`; };
check('region-sum: straight line splits on the box border',
  F.regionSumSegments(['0,0', '1,0', '2,0', '3,0', '4,0'], box9),
  [['0,0', '1,0', '2,0'], ['3,0', '4,0']]);
// `gz8mfm0r3a` (m1n3, "Visible Inclusions") — the blue loop. Its repeated start
// cell r2c4 ("3,1") used to become a 1-cell segment forcing S ≤ 9.
check('region-sum: closed loop drops the repeated endpoint, no 1-cell wrap segment',
  F.regionSumSegments(['3,1', '4,1', '5,2', '6,3', '7,4', '6,5', '5,6', '4,7', '3,7', '2,7',
                       '1,6', '1,5', '1,4', '1,3', '1,2', '2,1', '3,1'], box9),
  [['3,1', '4,1', '5,2'], ['6,3', '7,4', '6,5'], ['5,6', '4,7', '3,7'], ['2,7', '1,6'],
   ['1,5', '1,4', '1,3'], ['1,2', '2,1']]);
// Same loop, drawn starting one cell later (mid-segment): the wrap run must be
// JOINED, not left split across the two ends.
check('region-sum: loop starting mid-segment joins the wrap run',
  F.regionSumSegments(['4,1', '5,2', '6,3', '7,4', '6,5', '5,6', '4,7', '3,7', '2,7',
                       '1,6', '1,5', '1,4', '1,3', '1,2', '2,1', '3,1', '4,1'], box9),
  [['3,1', '4,1', '5,2'], ['6,3', '7,4', '6,5'], ['5,6', '4,7', '3,7'], ['2,7', '1,6'],
   ['1,5', '1,4', '1,3'], ['1,2', '2,1']]);
check('region-sum: loop inside ONE box collapses to a single segment (no constraint)',
  F.regionSumSegments(['0,0', '1,0', '1,1', '0,1', '0,0'], box9).length, 1);
// ── thermo bulb/shaft colour family (v3.145) ─────────────────────────────────
// Real thermos whose bulb is a DARKER SHADE of the shaft must still detect —
// that's why the exact-fill test was dropped for geometry in v3.82.
check('bulb: #999 bulb on #ccc shaft (9zsl8s2gjl, syvmhn0tqy)',
  F.thermoBulbShaftCompatible('#999999', '#cccccc'), true);
check('bulb: grey bulb on this puzzle\'s grey shaft (#cccf)',
  F.thermoBulbShaftCompatible('#cccf', '#cccf'), true);
check('bulb: dark red bulb on a light red shaft (same hue, different shade)',
  F.thermoBulbShaftCompatible('#cc0000', '#ff9999'), true);
// `gz8mfm0r3a` (m1n3, "Visible Inclusions") — a BLUE odd/even circle on the end
// of an ORANGE Dutch whisper is not a bulb.
check('bulb: blue parity circle on an orange whisper is NOT a bulb (gz8mfm0r3a)',
  F.thermoBulbShaftCompatible('#09d7f47d', '#ffa600ff'), false);
check('bulb: grey circle on a coloured shaft is not one object',
  F.thermoBulbShaftCompatible('#999999', '#ffa600'), false);
check('bulb: coloured circle on a grey shaft is not one object',
  F.thermoBulbShaftCompatible('#09d7f4', '#cccccc'), false);
check('bulb: unparseable colour falls back to geometry-only (pre-v3.145 behaviour)',
  F.thermoBulbShaftCompatible('url(#grad)', '#ccc'), true);
check('fpuzCellKey R3C6 → col,row', F.fpuzCellKey('R3C6'), '5,2');
check('fpuzCellKey r10c1', F.fpuzCellKey('r10c1'), '0,9');
check('fpuzCellKey garbage → null', F.fpuzCellKey('X9Y9'), null);

// ── region colouring (v3.12 backtracking; v3.22 spread) ──────────────────────
function mkAdj(n, edges) {
  const adj = Array.from({ length: n }, () => new Set());
  edges.forEach(([a, b]) => { adj[a].add(b); adj[b].add(a); });
  return adj;
}
function isProper(colors, adj) {
  if (!colors) return false;
  return colors.every((c, i) => c >= 0 && c <= 3 && [...adj[i]].every((j) => colors[j] !== c));
}
const k4 = mkAdj(4, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]);
checkTrue('colourGraph: K4 gets a proper 4-colouring', isProper(F.colourGraph(4, k4, null), k4));
const k5 = mkAdj(5, [[0,1],[0,2],[0,3],[0,4],[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]);
check('colourGraph: K5 is impossible', F.colourGraph(5, k5, null), null);
const path3 = mkAdj(3, [[0, 1], [1, 2]]);
check('colourGraph: adjacent equal pins rejected', F.colourGraph(3, path3, [2, 2, -1]), null);
const pinned = F.colourGraph(3, path3, [3, -1, -1]);
checkTrue('colourGraph: valid pin honoured + proper', pinned && pinned[0] === 3 && isProper(pinned, path3));
check('countComponents: two blobs', F.countComponents([[0, 0], [0, 1], [5, 5]]), 2);
check('countComponents: diagonal is NOT orthogonal adjacency', F.countComponents([[0, 0], [1, 1]]), 2);
// Shaded-region policy: N ≤ 4 regions each get their own colour (v3.22 spread)
const spread = F.colourShadedRegions([
  [[0, 0]], [[0, 5]], [[5, 0]],           // three regions, none touching
]);
check('colourShadedRegions: 3 separate regions → 3 distinct colours', new Set(spread).size, 3);
const touching = F.colourShadedRegions([[[0, 0], [0, 1]], [[1, 0], [1, 1]]]);
checkTrue('colourShadedRegions: touching regions differ', touching[0] !== touching[1]);

// ── digit bands (v3.86: gate on the digit SET, never the grid) ───────────────
settings.digitSet = '123456789';
const eb9 = F.entropicBands();
checkTrue('entropic bands 1-9: 1→low 4→mid 9→high',
  eb9 && eb9.of[1] === 0 && eb9.of[4] === 1 && eb9.of[9] === 2 && eb9.size === 9);
settings.digitSet = '123456';
const eb6 = F.entropicBands();
checkTrue('entropic bands 1-6: 2→low 3→mid 6→high',
  eb6 && eb6.of[2] === 0 && eb6.of[3] === 1 && eb6.of[6] === 2);
settings.digitSet = '1234567';
check('entropic bands: 7 digits refuse to split', F.entropicBands(), null);
settings.digitSet = '123456789';
const mb9 = F.modularBands();
checkTrue('modular bands 1-9: residue classes {1,4,7}/{2,5,8}/{3,6,9}',
  mb9 && mb9.of[1] === 1 && mb9.of[4] === 1 && mb9.of[7] === 1
      && mb9.of[2] === 2 && mb9.of[5] === 2 && mb9.of[8] === 2
      && mb9.of[3] === 0 && mb9.of[6] === 0 && mb9.of[9] === 0);
settings.digitSet = '1245';
check('modular bands: unequal residues refuse', F.modularBands(), null);
settings.digitSet = '123456789';

// ── zipper stroke-joining + fold centre (v3.124) ─────────────────────────────
// GROUND TRUTH: `k9mm1xgca5` "The Zip that Zips the Zips" marks every zipper's
// fold centre with its own cosmetic circle, so the puzzle states the answers. It
// stores 8 line entries for 7 zippers — the R6C3→R9C3 one is drawn as TWO strokes
// meeting at R8C2 — and folding the strokes separately misses the marked centre
// (R5C2) entirely. All seven computed folds must hit all seven drawn circles.
const zRc = (s) => { const m = /R(\d+)C(\d+)/.exec(s); return `${+m[2] - 1},${+m[1] - 1}`; };
const K9_STROKES = [
  ['R8C3','R7C3','R6C4','R6C5','R5C5','R4C5','R4C6','R5C6','R6C6','R6C7','R6C8','R6C9'],
  ['R1C2','R1C1','R2C1','R2C2','R3C2','R3C1','R4C1','R5C1','R4C2'],
  ['R2C3','R1C3','R1C4','R2C4','R3C4'],
  ['R2C6','R3C5','R3C6','R2C7','R1C6','R1C5'],
  ['R2C8','R3C7','R4C7','R5C8','R5C7'],
  ['R7C5','R7C6','R8C6','R8C7','R7C7','R7C8','R7C9','R8C9','R9C9','R9C8','R9C7','R9C6','R9C5','R8C5'],
  ['R6C3','R5C4','R4C4','R4C3','R5C2','R6C1','R7C1','R8C2'],
  ['R9C3','R8C2'],
].map((c) => c.map(zRc));
// The seven drawn circles, as cell-unit centres (a multi-cell circle sits at the
// centroid — R2C6+R2C7+R3C6+R3C7 is a grid CORNER, R4C5+R4C6 a cell EDGE).
const K9_CIRCLES = [[1.5,2.5],[3.5,0.5],[6,2],[6.5,3.5],[5,3.5],[1.5,4.5],[8.5,7]];
const k9 = F.zipperChains(K9_STROKES);
check('zipper: 8 strokes join into 7 zippers (k9mm1xgca5)', k9.length, 7);
const k9folds = k9.map((c) => { const f = F.zipperFoldCenter(c); return [f.cx, f.cy]; });
const keyOf = (p) => p[0] + '/' + p[1];
check('zipper: every fold lands on the setter’s own centre circle',
  k9folds.map(keyOf).sort(), K9_CIRCLES.map(keyOf).sort());
// The merged chain specifically: 8 + 2 strokes → one 9-cell zipper folding on R5C2.
const k9merged = k9.find((c) => c.length === 9 && c[0] === zRc('R6C3'));
checkTrue('zipper: the two-stroke line merges to 9 cells ending R9C3',
  !!k9merged && k9merged[k9merged.length - 1] === zRc('R9C3'));
check('zipper: merged fold = R5C2 (the marked centre)',
  k9merged ? F.zipperFoldCenter(k9merged) : null, { cx: 1.5, cy: 4.5 });
// Guard rails: a junction is never guessed at, and a closed loop never joins.
const yJunction = [['0,0','1,0','2,0'], ['2,0','2,1','2,2'], ['2,0','3,0','4,0']];
check('zipper: three chain-ends at one cell = refuse to join',
  F.zipperChains(yJunction).length, 3);
const loop = [['0,0','1,0','1,1','0,1','0,0'], ['3,3','4,3']];
check('zipper: a closed loop is left alone', F.zipperChains(loop).length, 2);
// ── The joiner is now EVERY line validator's reader (v3.166) ────────────────
// Same function, exercised as lineClueChains: the two shapes the degree-2 rule
// has to tell apart, taken from real drawings in the catalog.
// `DBFdgmG6mq` — a spiral drawn as four straight strokes, every junction degree 2.
const spiral = [
  ['0,0','1,0','2,0','3,0'], ['3,0','3,1','3,2','3,3'],
  ['3,3','2,3','1,3','0,3'], ['0,3','0,2','0,1'],
];
check('strokes: a 4-stroke spiral joins into one 12-cell chain',
  F.lineClueChains(spiral).map((c) => c.length), [12]);
// `MM3mMQGJn2` — three chains radiating from one cell (degree 3): never joined.
const star = [
  ['0,4','1,3','2,2','3,1'], ['0,4','1,5','2,6','3,7'], ['0,4','1,4','2,4'],
];
check('strokes: a 3-way star stays three separate clues',
  F.lineClueChains(star).map((c) => c.length).sort(), [3, 4, 4]);
checkTrue('strokes: joining is idempotent (resolve + zipperChains both run it)',
  JSON.stringify(F.lineClueChains(F.lineClueChains(spiral))) === JSON.stringify(F.lineClueChains(spiral)));
check('strokes: untouched chains pass straight through',
  F.lineClueChains([['0,0','1,0'], ['5,5','5,6']]).length, 2);
check('zipper: an odd chain folds on its middle cell',
  F.zipperFoldCenter(['0,0','1,0','2,0']), { cx: 1.5, cy: 0.5 });
check('zipper: an even STRAIGHT chain folds on the shared edge',
  F.zipperFoldCenter(['0,0','1,0','2,0','3,0']), { cx: 2, cy: 0.5 });
check('zipper: an even DIAGONAL step folds on the grid corner',
  F.zipperFoldCenter(['0,0','1,1']), { cx: 1, cy: 1 });

// ── report ───────────────────────────────────────────────────────────────────
console.log(`${pass + fail} cases: ${pass} pass, ${fail} fail  (${path.basename(srcPath)})`);
process.exit(fail ? 1 : 0);
