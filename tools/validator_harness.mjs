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
  'REGIONSUM_CUE_RE', 'REGIONSUM_CLAUSE_RE',
  'PARITY_CUE_RE', 'PARITY_CLAUSE_RE',
  'ZIPPER_CUE_RE', 'ZIPPER_CLAUSE_RE',
  'BETWEEN_CUE_RE', 'BETWEEN_CLAUSE_RE', 'BETWEEN_LOCKOUT_RE',
  'ENTROPIC_CUE_RE', 'ENTROPIC_ANTI_RE', 'ENTROPIC_SET_RE',
  'ENTROPIC_LINEISH_RE', 'ENTROPIC_CLAUSE_RE', 'hasEntropicCue',
  'MODULAR_CUE_RE', 'MODULAR_SET_RE', 'MODULAR_CLAUSE_RE', 'hasModularCue',
  // between-line interval maths + bulb pruning + circle segmentation
  'betweenDigitAllowed', 'betweenInteriorsFeasible', 'betweenBulbDigitAllowed',
  'lineStepGraph', 'reflectCellKey', 'walkBetweenSegment',
  // cage maths
  'cageCombinations', 'hasPerfectMatching', 'regularBoxDims',
  // geometry / chains
  'expandLineChain', 'fpuzCellKey',
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
// Region sum (v3.88 vocabulary: every/total/3x3 spanning)
checkTrue('region-sum cue: "every region it passes through" (2ifg92eka9)',
  F.REGIONSUM_CUE_RE.test('the digits in every region it passes through have the same sum'));
checkTrue('region-sum cue: "each 3x3 box" spans the size (bl168ah6g9)',
  F.REGIONSUM_CUE_RE.test('for each 3x3 box a line passes through, the digits on the line sum to the same total'));
// Zipper
checkTrue('zipper cue: equal distance from the center',
  F.ZIPPER_CUE_RE.test('digits an equal distance from the center of the line sum to the same total'));
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

// ── report ───────────────────────────────────────────────────────────────────
console.log(`${pass + fail} cases: ${pass} pass, ${fail} fail  (${path.basename(srcPath)})`);
process.exit(fail ? 1 : 0);
