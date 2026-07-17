// ==UserScript==
// @name         Sudokupad Tools
// @namespace    https://github.com/VitaKaninen
// @version      3.88.0
// @description  Quality-of-life toolbox for SudokuPad: constraint validators (Kropki dots, killer cages, little killers), auto-fill/clear pencilmark actions, single-candidate auto-complete, region border colouring and shading, and appearance controls. Compatible with SudokuPad's dark mode and with DarkReader, and fixes several rendering bugs with both.
// @author       VitaKaninen
// @match        https://sudokupad.app/*
// @match        https://beta.sudokupad.app/*
// @match        https://app.crackingthecryptic.com/*
// @match        https://crackingthecryptic.com/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/VitaKaninen/Sudokupad-Tools/main/Sudokupad-Tools.user.js
// @downloadURL  https://raw.githubusercontent.com/VitaKaninen/Sudokupad-Tools/main/Sudokupad-Tools.user.js
// ==/UserScript==

(function () {
  'use strict';

  // crackingthecryptic.com hosts many non-puzzle pages; only activate when a
  // puzzle is loaded (identified by the presence of an "id" query parameter).
  if (location.hostname === 'crackingthecryptic.com' && !location.search.includes('id=')) return;

  // ═══════════════════════════════════════════════════════════════════════════
  // Dark substrate: lock DarkReader out, run our OWN frozen copy of SudokuPad's
  // native dark mode ("dark mode alpha" / DMA)
  //
  // We neither fight DarkReader nor *ride* SudokuPad's DMA — both are forced OFF
  // so we always start from one known state that can't drift underneath us:
  //   • DarkReader is evicted from SudokuPad via <meta name="darkreader-lock">
  //     (the extension bypasses this page only; it keeps working everywhere else).
  //   • SudokuPad's own `darkmode` setting is forced OFF, so the site never adds
  //     its `.setting-darkmode` class and the in-app toggle reads off.
  // DMA is author-built and SEMANTIC (it knows a Kropki dot / cage / given), so
  // instead of losing it we REPLICATE it: FROZEN_DARK_CSS below is a verbatim copy
  // of DMA's rule set (its `.setting-darkmode {…}` CSS-variable block + ~22 SVG
  // rules) re-keyed to our own `.spdr-dark` body class. That reproduces DMA pixel
  // -for-pixel yet immunises us against SudokuPad changing the alpha feature, and
  // gives us a fully-owned base for our own tweaks + gap fixes (gray/translucent
  // -dark objects that vanish, non-exact white labels, bright control buttons),
  // which the rest of this script layers on top. If SudokuPad's DMA ever changes
  // and we want to track it, re-enumerate its `.setting-darkmode` rules from the
  // console and refresh FROZEN_DARK_CSS. Captured from style.css + sudokupad
  // -colors.css @ v0.611.0.
  // ═══════════════════════════════════════════════════════════════════════════

  var FROZEN_DARK_CSS = `
  .spdr-dark {
    --dm-black: #181A1B;
    --dm-white: #e8e6e3;
    --dm-black-alpha: rgba(18,18,18,0.7);
    --dm-userblue: #5f95ec;
    --dm-rulesbg: #265016;
    --dm-button-color: #8522c3;
    --dm-button-border: #e8e6e3;
    --dm-button-bg: #242424;
    --dm-button-hover: #333;
    --dm-button-dark: #55167B;
    --dm-button-dark-hover: #9f3cdd;
    --color-white: var(--dm-black);
    --color-black: var(--dm-white);
    --body-bg: var(--dm-black);
    --button-color: #8522c3;
    --button-bg: var(--dm-button-bg);
    --controls-button-text: var(--dm-white);
    --controls-button-bg: var(--dm-button-dark);
    --controls-button-hover-bg: var(--dm-button-dark-hover);
    --puzzle-given: var(--dm-white);
    --puzzle-givenCornermark: var(--dm-white);
    --puzzle-givenCandidate: var(--dm-white);
    --puzzle-value: #5f95ec;
    --puzzle-candidate: #5f95ec;
    --puzzle-pencilmark: #5f95ec;
    --puzzle-outlines: rgba(26,26,26,0.7);
    --outlinefilter: url("#outlinefilter_dark");
  }
  .spdr-dark .cell-grid { stroke: var(--dm-white); }
  .spdr-dark .cage-box { stroke: var(--dm-white); }
  .spdr-dark .textbg_ffffff { fill: var(--dm-black); }
  .spdr-dark [stroke="#000"], .spdr-dark [stroke="#000000"] { stroke: var(--dm-white); }
  .spdr-dark [fill="#000"], .spdr-dark [fill="#000000"] { fill: var(--dm-white); }
  .spdr-dark [stroke="rgba(255,255,255,0.7)"] { stroke: var(--dm-black-alpha); }
  .spdr-dark [fill="rgba(255,255,255,0.7)"] { fill: var(--dm-black-alpha); }
  .spdr-dark [stroke="#fff"], .spdr-dark [stroke="#ffffff"], .spdr-dark [stroke="#FFF"], .spdr-dark [stroke="#FFFFFF"] { stroke: var(--dm-black); }
  .spdr-dark [fill="#fff"], .spdr-dark [fill="#ffffff"], .spdr-dark [fill="#FFF"], .spdr-dark [fill="#FFFFFF"] { fill: var(--dm-black); }
  .spdr-dark [bordercolor="#fff"], .spdr-dark [bordercolor="#ffffff"], .spdr-dark [bordercolor="#FFF"], .spdr-dark [bordercolor="#FFFFFF"] { stroke: var(--dm-black); }
  .spdr-dark [stroke="#000000"] { stroke: var(--dm-white); }
  .spdr-dark [stroke="rgba(0, 0, 0, 1)"] { stroke: var(--dm-white); }
  /* Inside an SVG <mask>, fill/stroke encode luminance (white=show, black=hide),
     NOT a visible colour, so the #000<->#fff swaps above invert any such mask —
     e.g. the Restart button's "!"-in-circular-arrow icon, whose mask rect (#fff)
     and "!" path (#000) get flipped, hiding the arrow and showing only the "!".
     Restore the authored mask values (higher specificity than the bare swaps). */
  .spdr-dark mask [fill="#fff" i], .spdr-dark mask [fill="#ffffff" i] { fill: #fff; }
  .spdr-dark mask [fill="#000" i], .spdr-dark mask [fill="#000000" i] { fill: #000; }
  .spdr-dark mask [stroke="#fff" i], .spdr-dark mask [stroke="#ffffff" i] { stroke: #fff; }
  .spdr-dark mask [stroke="#000" i], .spdr-dark mask [stroke="#000000" i] { stroke: #000; }
  .spdr-dark .cell-given, .spdr-dark .cell-pencilmark.givenCornermark, .spdr-dark .cell-candidate .given { color: var(--dm-white); fill: var(--dm-white); }
  .spdr-dark rect.textbg[fill="#FFF"], .spdr-dark rect.textbg[fill="#FFFFFF"], .spdr-dark rect.textbg[fill="#fff"], .spdr-dark rect.textbg[fill="#ffffff"], .spdr-dark rect.feature-xv[fill="#FFF"], .spdr-dark rect.feature-xv[fill="#FFFFFF"], .spdr-dark rect.feature-xv[fill="#fff"], .spdr-dark rect.feature-xv[fill="#ffffff"] { fill: var(--dm-black); }
  .spdr-dark rect.feature-kropki[fill="#000" i], .spdr-dark rect.feature-kropki[fill="#000000" i] { stroke: var(--dm-white); fill: var(--dm-black); }
  .spdr-dark text.feature-kropki[fill="#000" i], .spdr-dark text.feature-kropki[fill="#000000" i] { fill: var(--dm-black); }
  .spdr-dark rect.feature-kropki[fill="#fff" i], .spdr-dark rect.feature-kropki[fill="#ffffff" i] { stroke: var(--dm-black); fill: var(--dm-white); }
  .spdr-dark text.feature-kropki[fill="#fff" i], .spdr-dark text.feature-kropki[fill="#ffffff" i] { fill: var(--dm-white); }
  .spdr-dark .dialog { color: var(--dm-white); background-color: var(--dm-black); }
  .spdr-dark #controls { color: var(--dm-white); }
  .spdr-dark .puzzle-rules { background-color: var(--dm-rulesbg); }
  .spdr-dark .dialog .setting-item label { color: var(--dm-button-color); }`;

  (function lockDRUseNative() {
    // 1. DarkReader lock — DR bypasses any page whose <head> carries this meta.
    function addLock() {
      if (document.querySelector('meta[name="darkreader-lock"]')) return true;
      var head = document.head || document.documentElement;
      if (!head) return false;
      var m = document.createElement('meta');
      m.name = 'darkreader-lock';
      head.appendChild(m);
      return true;
    }
    if (!addLock()) {
      // <head> may not exist yet at document-start — add it the moment it does.
      var ho = new MutationObserver(function () { if (addLock()) ho.disconnect(); });
      ho.observe(document.documentElement, { childList: true, subtree: true });
    }

    // 2. Force SudokuPad's own dark mode OFF. We run at document-start, before
    //    SudokuPad's bundle reads the setting, so it never adds .setting-darkmode
    //    on its own and the in-app toggle reflects "off" — one consistent base.
    try {
      var SS = 'svencodes_settings';
      var s = JSON.parse(localStorage.getItem(SS) || '{}');
      if (s.darkmode !== false) { s.darkmode = false; localStorage.setItem(SS, JSON.stringify(s)); }
    } catch (e) {}

    // 3. Inject our frozen copy of DMA (keyed on our own .spdr-dark class).
    function addFrozenCSS() {
      if (document.getElementById('spdr-frozen-dark')) return true;
      var head = document.head || document.documentElement;
      if (!head) return false;
      var st = document.createElement('style');
      st.id = 'spdr-frozen-dark';
      st.textContent = FROZEN_DARK_CSS;
      head.appendChild(st);
      return true;
    }
    if (!addFrozenCSS()) {
      var so = new MutationObserver(function () { if (addFrozenCSS()) so.disconnect(); });
      so.observe(document.documentElement, { childList: true, subtree: true });
    }

    // 4. Add our own dark class to <body> (and strip SudokuPad's, defensively, in
    //    case its bundle managed to set it before our setting write landed).
    function applyDarkClass() {
      if (!document.body) return false;
      document.body.classList.add('spdr-dark');
      document.body.classList.remove('setting-darkmode');
      return true;
    }
    if (!applyDarkClass()) document.addEventListener('DOMContentLoaded', applyDarkClass);
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // Settings
  //
  // Defaults match the actual on-screen colours after DarkReader's conversion,
  // so enabling a section produces no visible change at first. The user sees
  // their starting point in the controls and tweaks from there.
  //
  // Default values were sampled from a live SudokuPad page with DarkReader on.
  // If your environment differs, just pick the colours you want once and they
  // persist via localStorage.
  // ═══════════════════════════════════════════════════════════════════════════

  var SCRIPT_VERSION = '3.88.0';
  // Expose on window so we (or a test harness) can verify the loaded version
  // with one query — no DOM walk, no screenshot. Just: window.spdrVersion.
  window.spdrVersion = SCRIPT_VERSION;
  // Distinguishes this native-mode edition from the 2.x DarkReader-fighting one
  // when both are installed in TamperMonkey for A/B testing (enable one at a time).
  window.spdrEdition = 'native';

  var SETTINGS_KEY = 'sp-darkreader-fix';

  var DEFAULTS = {
    // (regionBorderEnabled master removed — the 3 subsections gate independently.)
    regionBorderColor:             '#000000',   // black — center border default
    regionBorderOpacity:           1.0,
    regionBorderWidth:             '3',
    regionBorderCenterEnabled:     true,    // center border: single-color CSS stroke on region outlines
    regionBorderMultiEnabled:      true,    // multi-color border: colored rect borders per region
    regionBorderSuppressBoundary:  false,   // (top-level toggle) drop the built-in cell grid line along region boundaries
    regionHideAuthorBorders:       false,   // (top-level, SESSION-ONLY) hide author-drawn region/grid border lines in #overlay (clash with our borders on overlapping-grid puzzles). Never persisted — forced off on every page load.
    regionBorderCellEnabled:       false,   // cell borders: recolor the thin built-in cell grid lines
    regionBorderCellColor:         '#dddad6',// cell grid line colour — matches DR's converted native grid-line colour so enabling looks identical to disabled by default
    regionBorderCellOpacity:       1.0,     // cell grid line opacity
    regionBorderCellWidth:         '1',     // cell grid line width (user units) — matches SudokuPad's native grid line

    // "Given / Placed digits" section (large in-cell digits, vs the small
    // pencilmarks). No section master — the two sub-toggles gate independently.
    givenEnabled:                  false,   // recolor author given clues (#cell-givens text)
    givenColor:                    '#e8e6e3',
    givenOpacity:                  1.0,
    userDigitEnabled:              false,   // recolor digits the solver places (#cell-values text)
    userDigitColor:                '#5b9bd5',
    userDigitOpacity:              1.0,

    labelBgEnabled:                true,
    labelBgColor:                  '#181A1B',   // DarkReader neutral background; white label text stays readable
    labelBgOpacity:                1.0,

    underlayEnabled:               true,
    // Object shading splits gray vs colored because gray reads dim where colored
    // reads bright at the same value. Each side has brightness + opacity; when
    // underlaySeparateBrightnessOpacity is OFF (default) the UI shows a single
    // combined slider per side that drives both axes to the same value (so the
    // two keys stay equal), and ON shows the two axes as separate sliders.
    underlaySeparateBrightnessOpacity: false,
    // COLORED objects (saturation > 0).
    underlayLightness:             0.4,   // 0..1; fill: 0 = black, 0.5 = pure hue at max saturation, 1 = white
    underlayLightnessEnabled:      true,
    underlayOpacity:               0.4,   // 0..1; fill: absolute alpha — 0 = transparent, 1 = fully opaque
    underlayOpacityEnabled:        true,
    // GRAY objects (saturation ≈ 0, e.g. #CFCFCF thermo/palindrome lines).
    underlayGrayBrightness:        0.6,   // 0..1; gray fill/line brightness
    underlayGrayBrightnessEnabled: true,
    underlayGrayOpacity:           0.6,   // 0..1; gray fill/line opacity
    underlayGrayOpacityEnabled:    true,
    underlayStrokeLightness:       0.75,  // 0..1; stroke (shape outline) brightness
    underlayStrokeLightnessEnabled:true,
    underlayStrokeOpacity:         0.75,  // 0..1; stroke (shape outline) opacity
    underlayStrokeOpacityEnabled:  true,

    centerEnabled:                 false,
    centerValidColor:              '#338fe8',   // SudokuPad's pencilmark blue
    centerValidOpacity:            1.0,
    centerInvalidColor:            '#cd6666',   // SudokuPad's conflict red (DR-converted)
    centerInvalidOpacity:          1.0,
    centerHideInvalid:             false,
    centerMoveInvalidRight:        false,

    cornerEnabled:                 false,
    cornerValidColor:              '#338fe8',
    cornerValidOpacity:            1.0,
    cornerInvalidColor:            '#cd6666',
    cornerInvalidOpacity:          1.0,
    cornerHideInvalid:             false,
    cornerMoveInvalidEnd:          false,

    showActionButtons:             true,

    digitSet:                      '123456789',
    digitSetConfirmed:             false,
    lastConfirmedUrl:              '',   // location.href at last digit-set confirmation

    kropkiFixEnabled:             true,
    kropkiColonEnabled:           true,
    kropkiBlackLabelText:         ':',    // label text for 2:1 (black) dots
    kropkiBlackLabelRotate:       false,  // rotate that label 90° when dot is on a horizontal border
    kropkiOutlineEnabled:         true,
    kropkiWhiteOutlineEnabled:    true,   // black outline on consecutive (white) Kropki dots
    kropkiConsecLabelEnabled:     true,   // show label on consecutive (white) dots
    kropkiConsecLabelText:        '~',    // label text for consecutive (white) dots
    kropkiConsecLabelRotate:      false,  // rotate that label 90° when dot is on a horizontal border
    kropkiLabelSize:              16,     // font-size (user units) for both Kropki dot labels — larger default than the old hardcoded 13
    kropkiLabelWeight:            '600',  // font-weight for both Kropki dot labels — semi-bold (between the old 'normal'/400 and 'bold'/700)

    selectionBorderEnabled:       true,    // "Border" subsection: restyle the selection cage stroke (colour/opacity/width) + grow/offset
    selectionColor:               '#3399ff',
    selectionOpacity:             0.7,
    selectionWidth:               '8',
    selectionBorderMode:          'inside',  // 'inside' | 'outside'
    selectionBorderOffset:        '0',       // displayed value; baseline shift is mode-specific (see computeSelectionShift)
    selectionBgEnabled:           true,    // "Background" subsection: set the selection cage fill (colour + opacity). Default opacity 0 = transparent (clears the native grey block); raise opacity toward white — passing the native grey (white @ ~0.4) on the way to opaque white
    selectionBgColor:             '#ffffff', // white = SudokuPad's native selection-fill colour, so raising opacity reproduces the native grey (@0.4) then continues to solid white
    selectionBgOpacity:           0,

    showToasts:                   true,   // show action result notifications (toasts)
    toastPersist:                 false,  // keep action toasts until dismissed (default: auto-fade after 2s)
    showEasyShadeButton:          true,   // show/hide the Easy Shade button in the controls bar
    showFillSingleButton:         true,   // show/hide the floating Auto-fill (single candidate) button
    showValidateButton:           true,   // show/hide the floating "Validate Constraints" button (Kropki validation, more constraints later)
    validateKropkiEnabled:        true,   // "Validate Constraints": run the Kropki-dot validator (future per-validator toggle)
    validateCagesEnabled:         true,   // "Validate Constraints": run the killer-cage validator (future per-validator toggle)
    validateLittleKillerEnabled:  true,   // "Validate Constraints": run the little-killer diagonal-sum validator (future per-validator toggle)
    validateThermoEnabled:        true,   // "Validate Constraints": run the thermometer validator (future per-validator toggle)
    validateWhisperEnabled:       true,   // "Validate Constraints": run the German-whisper (green line, ≥5) validator (future per-validator toggle)
    validateXVEnabled:            true,   // "Validate Constraints": run the XV validator (V = sum 5, X = sum 10 across a labeled edge)
    validateArrowEnabled:         true,   // "Validate Constraints": run the sum-arrow validator (shaft digits sum to the circle digit)
    validateRenbanEnabled:        true,   // "Validate Constraints": run the renban validator (line = a set of consecutive distinct digits, any order)
    validateRegionSumEnabled:     true,   // "Validate Constraints": run the region-sum-line validator (box/region borders split the line into equal-sum segments)
    validateParityEnabled:        true,   // "Validate Constraints": run the parity-line validator (adjacent digits alternate odd/even along the line)
    validateZipperEnabled:        true,   // "Validate Constraints": run the zipper-line validator (equidistant-from-centre pairs share one sum; odd line's centre IS that sum)
    validateEntropicEnabled:      true,   // "Validate Constraints": run the entropic-line validator (every 3 consecutive cells = one low/mid/high digit; 9x9 + 6x6 only)
    validateSelectionOnly:        false,  // "Validate Constraints" menu checkbox: only validate clues whose EVERY cell is inside the current selection (session-only)
    fsSelectDelayMs:              500,    // Auto-fill: pause (ms) after selecting a cell, before placing its digit
    fsFillDelayMs:                0,      // Auto-fill: pause (ms) after placing a digit, before selecting the next cell
    fsUndoDelayMs:                200,    // Auto-fill: pause (ms) between native-undo clicks when the message's Undo is used
    suppressStartDialog:          true,   // auto-dismiss SudokuPad's "Start/Resume Puzzle" rules popup on load

    regionColorPalette0:          '#e05252',  // red
    regionColorPalette1:          '#5294e0',  // blue
    regionColorPalette2:          '#52a84e',  // green
    regionColorPalette3:          '#e8a030',  // orange
    regionColorStripeWidth:       4,          // px per side stripe
    regionColorOpacity:           1.0,        // opacity of border stripes
    regionColorFillEnabled:       false,      // fill entire cell backgrounds with region colors
    regionColorFillOpacity:       0.3,        // opacity of cell-fill backgrounds (independent of border opacity)

    shadedRegionColorEnabled:     false,      // colour puzzle "extra regions" with the region palette — grey #cages path.cage-extraregion shadings, grey #underlay cells, AND model-only regions with no shading (Windoku windows); auto-enabled per puzzle when extra regions are detected
    shadedRegionColorOpacity:     0.5,        // opacity of the recolored shaded-region fills

    cellColorsOpacity:            0.6,        // 0..1; opacity of #cell-colors. Matches SudokuPad's native --cell-color-opacity (0.6), so enabling at default = no visible change
    cellColorsOpacityEnabled:     false,      // override #cell-colors opacity when true
  };

  // Settings that must NOT survive a page load (deliberately aggressive, per-puzzle
  // escape hatches). loadSettings forces each back to its default after merging.
  var SESSION_ONLY_KEYS = ['regionHideAuthorBorders', 'validateSelectionOnly'];

  function loadSettings() {
    try {
      var stored = localStorage.getItem(SETTINGS_KEY);
      var merged = stored ? Object.assign({}, DEFAULTS, JSON.parse(stored)) : Object.assign({}, DEFAULTS);
      // Strip any letters from a digit set saved by an older version of the
      // script that allowed alphanumerics. Falls back to default if empty.
      var cleanedDigits = (merged.digitSet || '').split('').filter(function (c) { return /^[0-9]$/.test(c); }).join('');
      merged.digitSet = cleanedDigits || DEFAULTS.digitSet;
      // Session-only keys: never restored from storage — forced to default on every
      // page load so they apply per-puzzle/per-session and turn back off when the
      // user leaves the page (they must re-enable manually on the next puzzle).
      SESSION_ONLY_KEYS.forEach(function (k) { merged[k] = DEFAULTS[k]; });
      return merged;
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
  }
  var settings = loadSettings();

  function hexToRgba(hex, opacity) {
    if (typeof hex !== 'string' || hex.charAt(0) !== '#' || hex.length !== 7) return hex;
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var a = (opacity == null) ? 1 : opacity;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }
  function isDarkReader() {
    return document.documentElement.getAttribute('data-darkreader-scheme') === 'dark';
  }
  // The page's dark substrate is now our own frozen DMA copy under the .spdr-dark
  // body class (we lock DR out and force SudokuPad's own dark mode off at the top).
  // isDarkMode() is true under either, so the script still works if DR somehow
  // remains (e.g. lock failed on an old DR build).
  function isNativeDark() {
    return !!(document.body && document.body.classList.contains('spdr-dark'));
  }
  function isDarkMode() {
    return isNativeDark() || isDarkReader();
  }

  // ── Diagnostics: window.spdrGapScan() ──────────────────────────────────────
  // Proactively surface native-dark-mode GAPS without visual inspection. A "gap"
  // here is a board element that PAINTS something but renders at near-zero
  // contrast against the page background (invisible on dark) AND that we did NOT
  // fix (no !important inline of ours — object-shaded / label-bg'd elements carry
  // our !important and are excluded). Run on any puzzle: spdrGapScan() → {gaps,
  // flags}, also console.table'd. Catches the "gray/dark object you can't see"
  // class. NB it does NOT catch wrong-but-VISIBLE shade mismatches (e.g. a circle
  // that's light-gray where it should be near-black) — those have high contrast;
  // use the DR-vs-native diff procedure in docs/archive/NATIVE_MODE_MIGRATION.md for them.
  function spdrGapScan(opts) {
    opts = opts || {};
    var TH = opts.threshold || 1.25;
    var svg = document.getElementById('svgrenderer');
    if (!svg) return { error: 'no #svgrenderer' };
    function lum(r, g, b) {
      function f(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    }
    function rgb(s) {
      var m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null;
      var p = m[1].split(',').map(parseFloat);
      return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] };
    }
    var bg = rgb(getComputedStyle(document.body).backgroundColor) || { r: 26, g: 26, b: 26, a: 1 };
    var bgL = lum(bg.r, bg.g, bg.b);
    function over(c, xa) { // composite c (alpha c.a*xa) over the page bg, return contrast
      var a = c.a * xa;
      var r = c.r * a + bg.r * (1 - a), g = c.g * a + bg.g * (1 - a), b = c.b * a + bg.b * (1 - a);
      var l = lum(r, g, b), k = (Math.max(l, bgL) + 0.05) / (Math.min(l, bgL) + 0.05);
      return { a: a, c: k, eff: 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')' };
    }
    function paint(el) { // effective paint = the more-visible of fill / stroke
      var cs = getComputedStyle(el), op = parseFloat(cs.opacity); if (!isFinite(op)) op = 1;
      var best = null, w = null, c, o, r;
      c = rgb(cs.fill); o = parseFloat(cs.fillOpacity); if (!isFinite(o)) o = 1;
      if (c && cs.fill !== 'none') { r = over(c, o * op); if (r.a > 0.06) { best = r; w = 'fill'; } }
      c = rgb(cs.stroke); o = parseFloat(cs.strokeOpacity); if (!isFinite(o)) o = 1;
      var sw = parseFloat(cs.strokeWidth) || 0;
      if (c && cs.stroke !== 'none' && sw > 0) { r = over(c, o * op); if (r.a > 0.06 && (!best || r.c > best.c)) { best = r; w = 'stroke'; } }
      return best ? { best: best, which: w } : null;
    }
    function ours(el) { // did WE fix it? our fixes are inline !important
      return el.style.getPropertyPriority('fill') === 'important' || el.style.getPropertyPriority('stroke') === 'important';
    }
    var sel = '#underlay rect,#underlay path,#overlay rect,#overlay path,#arrows path,#cages path,#cell-colors > *,#cell-grids path';
    var els = [].slice.call(svg.querySelectorAll(sel));
    var csz = (typeof getGridCellSize === 'function' && getGridCellSize(svg)) || 64;
    var seen = {}, flags = [];
    els.forEach(function (el) {
      // Skip elements that cannot actually render: a rect with a non-positive
      // width or height paints nothing, so its (invisible) stroke is not a real
      // "gap" — e.g. SudokuPad's degenerate text-halo rects (class "textbg",
      // w/h = -2) behind tiny value glyphs. This is a geometry guard, not a
      // class exclusion: a real-sized textbg still gets scanned.
      if (el.tagName === 'rect') {
        var rw = parseFloat(el.getAttribute('width')), rh = parseFloat(el.getAttribute('height'));
        if (!(rw > 0) || !(rh > 0)) return;
      }
      var p = paint(el); if (!p || p.best.c >= TH || ours(el)) return;
      var center = null;
      try { var b = el.getBBox(); center = 'R' + (Math.floor((b.y + b.height / 2) / csz) + 1) + 'C' + (Math.floor((b.x + b.width / 2) / csz) + 1); } catch (e) {}
      var key = center + '|' + (el.getAttribute('fill') || '') + '|' + (el.getAttribute('stroke') || '') + '|' + p.which;
      if (seen[key]) return; seen[key] = 1;
      flags.push({ rc: center, layer: el.parentElement && el.parentElement.id, cls: el.getAttribute('class'),
        fill: el.getAttribute('fill'), stroke: el.getAttribute('stroke'), via: p.which, eff: p.best.eff, contrast: +p.best.c.toFixed(2) });
    });
    var out = { url: location.pathname, edition: window.spdrEdition, nativeDark: isNativeDark(), scanned: els.length, gaps: flags.length, flags: flags };
    if (!opts.quiet) { try { console.log('[spdrGapScan]', out.gaps, 'gap(s) /', out.scanned, 'scanned —', out.url); if (flags.length) console.table(flags); } catch (e) {} }
    return out;
  }
  window.spdrGapScan = spdrGapScan;

  // Parse hex (3/4/6/8 digit) or rgb()/rgba() into {r,g,b,a}. Returns null on failure.
  function parseColor(str) {
    if (!str) return null;
    str = String(str).trim();
    if (str.charAt(0) === '#') {
      var h = str.slice(1);
      if (h.length === 3) {
        return { r: parseInt(h[0]+h[0],16), g: parseInt(h[1]+h[1],16), b: parseInt(h[2]+h[2],16), a: 1 };
      } else if (h.length === 4) {
        return { r: parseInt(h[0]+h[0],16), g: parseInt(h[1]+h[1],16), b: parseInt(h[2]+h[2],16), a: parseInt(h[3]+h[3],16)/255 };
      } else if (h.length === 6) {
        return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16), a: 1 };
      } else if (h.length === 8) {
        return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16), a: parseInt(h.slice(6,8),16)/255 };
      }
    }
    var m = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] != null ? +m[4] : 1 };
    return null;
  }
  // RGB (0..255) ↔ HSL (0..1) helpers — used to flip lightness while keeping hue.
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, h = 0, s = 0;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else                h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CSS
  // ═══════════════════════════════════════════════════════════════════════════

  function buildCSS(s) {
    var css = '';

    // Center border is drawn as SVG path clones inside mainGroup (z=0),
    // below #underlay (z=3), so circles/pills appear above it. No CSS rule needed.

    // Given digits & overlay text are applied via inline fill (see fixAllGivens)
    // so the native theme's CSS rules can't shift their colour — same approach as
    // the center/corner pencilmarks.

    // Label-bg pre-paint. The authoritative fix is the inline !important fill in
    // fixLabelRect (which also skips saturated / kropki / preserves alpha); this
    // CSS just darkens the boxes the instant they appear, before the JS scan runs.
    // Keyed on .spdr-dark so it's theme-independent (was purple-theme-only).
    if (s.labelBgEnabled) {
      var bg = hexToRgba(s.labelBgColor, s.labelBgOpacity);
      css += `
      body.spdr-dark #svgrenderer rect.cage-label,
      body.spdr-dark #svgrenderer rect.textbg:not([fill="none"]),
      body.spdr-dark #svgrenderer rect[fill="#FFFFFF"]:not(#underlay *),
      body.spdr-dark #svgrenderer rect[fill="#ffffff"]:not(#underlay *),
      body.spdr-dark #svgrenderer rect[fill="white"]:not(#underlay *) {
        fill: ${bg} !important;
      }`;
    }

    // Note: center/corner pencilmark *colours* are applied via inline style on
    // each element (see fixCenterTspan / fixCornerText below) so the native theme's
    // CSS rules can't re-tint them. Hide-invalid stays as CSS because display:none
    // needs no per-element override.
    if (s.centerEnabled && s.centerHideInvalid) {
      css += `
      #cell-candidates tspan.conflict { display: none !important; }`;
    }
    if (s.cornerEnabled && s.cornerHideInvalid) {
      css += `
      #cell-pencilmarks text.conflict { display: none !important; }`;
    }

    // The visible "selection" is the SudokuPad path.cage-selectioncage — a stroke
    // around the perimeter of the selected group over a translucent fill. Two
    // independent subsections restyle it (each stands alone, no section master):
    // Border (stroke colour/opacity/width) and Background (cage fill colour/opacity;
    // default opacity 0 = transparent, which clears SudokuPad's hardcoded grey
    // rgba(255,255,255,0.4) fill).
    {
      var selRule = '';
      if (s.selectionBorderEnabled) {
        var sc = hexToRgba(s.selectionColor, s.selectionOpacity);
        var sw = parseFloat(s.selectionWidth);
        if (!isFinite(sw) || sw < 0) sw = 8;
        selRule += `
        stroke: ${sc} !important;
        stroke-width: ${sw}px !important;`;
      }
      if (s.selectionBgEnabled) {
        selRule += `
        fill: ${hexToRgba(s.selectionBgColor, s.selectionBgOpacity)} !important;`;
      }
      if (selRule) css += `
      #cell-highlights path.cage-selectioncage {${selRule}
      }`;
    }

    // Cell shading — gates the opacity of #cell-colors (puzzle-defined coloured
    // cells). Was previously applied imperatively via element.style.setProperty,
    // but that required #cell-colors to already exist at the moment of call,
    // which it doesn't on initial page load (SudokuPad builds the SVG later).
    // CSS rule with !important applies the moment #cell-colors appears.
    if (s.cellColorsOpacityEnabled) {
      css += `
      #cell-colors { opacity: ${s.cellColorsOpacity} !important; }`;
    }

    // (Removed v3.11.0: a DR-only --cell-color-* palette override keyed on
    // html[data-darkreader-scheme="dark"]. It never matched under native mode, so
    // the colour-picker swatches + #cell-colors already take their palette from
    // SudokuPad's own base CSS. If they ever read wrong under native, add a
    // .spdr-dark override here — see NATIVE_MODE_MIGRATION.md.)

    // Native dark mode leaves SudokuPad's app/tool/aux control buttons on their
    // light #eee background (it themes only #controls TEXT), so they glare against
    // the dark page. Darken them to a subtle elevated surface with light-purple
    // icons. Scoped :not(.selected):not(.selectedperm) so the active-tool / toggled
    // highlight (purple bg + white icon) is preserved, and to the app/tool/aux
    // families only — the digit-entry buttons use their own --controls-button-*
    // purple and already read fine, so they're untouched. NOTE: this only reaches
    // <button> elements; the Fill / Clear / Clear All <div>s in .controls-tool
    // carry an inline !important light bg that no stylesheet can beat, so they're
    // darkened imperatively in darkenInlineToolButtons() instead.
    css += `
    body.spdr-dark #controls .controls-app button:not(.selected):not(.selectedperm),
    body.spdr-dark #controls .controls-tool button:not(.selected):not(.selectedperm),
    body.spdr-dark #controls .controls-aux button:not(.selected):not(.selectedperm) {
      background: #222426 !important;
      color: #b568e4 !important;
    }
    body.spdr-dark #controls .controls-app button:not(.selected):not(.selectedperm):hover,
    body.spdr-dark #controls .controls-tool button:not(.selected):not(.selectedperm):hover,
    body.spdr-dark #controls .controls-aux button:not(.selected):not(.selectedperm):hover {
      background: #3a3a42 !important;
    }`;

    // Purple buttons: the digit-entry pad and any selected/toggled highlight are
    // painted by SudokuPad's purple theme via --main-color (#6a1b9a). DR darkens
    // that to #55167B; match it so the digit pad + active-tool highlight read like
    // the DR build. (Our --dm-button-dark edit can't reach these — the
    // .setting-uitheme-purple rule overrides --controls-button-bg to var(--main-color)
    // at a cascade level our .spdr-dark var loses to, so override the bg directly.)
    // Borders: SudokuPad gives every control button a bright 1px #ccc border (bare
    // `button{}` rule); DR darkens it to #3e4446. Darken all control buttons to match.
    css += `
    body.spdr-dark #controls .controls-main button.digit,
    body.spdr-dark #controls button.selected,
    body.spdr-dark #controls button.selectedperm {
      background: #55167B !important;
    }
    body.spdr-dark #controls button {
      border-color: #3e4446 !important;
    }`;

    return css;
  }

  var styleTag = null;
  function rebuildStyleTag() {
    var newTag = document.createElement('style');
    newTag.id = 'sp-darkreader-fix';
    newTag.textContent = buildCSS(settings);
    if (styleTag && styleTag.parentNode) styleTag.parentNode.replaceChild(newTag, styleTag);
    else (document.head || document.documentElement).appendChild(newTag);
    styleTag = newTag;
  }
  rebuildStyleTag();

  var easyShadeSwatchRefresh = null; // set by buildEasyRegionShadeButton; keeps its swatches in sync with the palette

  // Fill / Clear / Clear All sit in .controls-tool next to the real <button>s,
  // but SudokuPad renders them as absolutely-positioned <div>s whose light #eee
  // background is set INLINE with !important. The v3.3.0 stylesheet rule that
  // darkens the app/tool/aux buttons can't reach them: it only matches <button>,
  // and even a !important stylesheet rule loses to an inline !important one. So
  // we override these imperatively. Only background + colour are touched (the
  // 1px #ccc border is already what the real buttons keep), and the native bg is
  // saved so turning native dark mode back off restores them.
  function darkenInlineToolButtons() {
    var els = document.querySelectorAll('#controls .controls-tool [data-collapsed-w]');
    if (!els.length) return false;
    var dark = document.body.classList.contains('spdr-dark');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (dark) {
        if (!el.hasAttribute('data-spdr-orig-bg')) {
          el.setAttribute('data-spdr-orig-bg', el.style.getPropertyValue('background-color'));
        }
        el.style.setProperty('background-color', '#222426', 'important');
        el.style.setProperty('color', '#b568e4', 'important');
      } else if (el.hasAttribute('data-spdr-orig-bg')) {
        var ob = el.getAttribute('data-spdr-orig-bg');
        if (ob) el.style.setProperty('background-color', ob, 'important');
        else el.style.removeProperty('background-color');
        el.style.removeProperty('color');
        el.removeAttribute('data-spdr-orig-bg');
      }
    }
    return true;
  }

  // True when a path's `d` is made only of horizontal/vertical segments (and no
  // curves) — i.e. a rectilinear outline like a grid frame or box/region boundary,
  // as opposed to a diagonal/curved cosmetic line. Used to scope the
  // "Hide author-drawn region borders" toggle to grid-structure lines only, so it
  // leaves diagonal constraint lines etc. alone.
  function pathIsRectilinear(d) {
    if (!d || /[CcSsQqTtAa]/.test(d)) return false;   // any curve command disqualifies
    var toks = d.match(/[MLHVZmlhvz]|-?\d*\.?\d+/g) || [];
    var i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '';
    while (i < toks.length) {
      var t = toks[i];
      if (/^[MLHVZmlhvz]$/.test(t)) { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') { cx = sx; cy = sy; } continue; }
      if (cmd === 'M' || cmd === 'm') {
        var mx = parseFloat(toks[i++]), my = parseFloat(toks[i++]);
        if (cmd === 'm') { mx += cx; my += cy; }
        cx = mx; cy = my; sx = mx; sy = my; cmd = (cmd === 'M') ? 'L' : 'l';   // extra pairs are implicit L
      } else if (cmd === 'L' || cmd === 'l') {
        var lx = parseFloat(toks[i++]), ly = parseFloat(toks[i++]);
        if (cmd === 'l') { lx += cx; ly += cy; }
        if (Math.abs(lx - cx) > 0.01 && Math.abs(ly - cy) > 0.01) return false;  // diagonal segment
        cx = lx; cy = ly;
      } else if (cmd === 'H' || cmd === 'h') { var hx = parseFloat(toks[i++]); cx = (cmd === 'h') ? cx + hx : hx; }
      else if (cmd === 'V' || cmd === 'v') { var vy = parseFloat(toks[i++]); cy = (cmd === 'v') ? cy + vy : vy; }
      else { i++; }
    }
    return true;
  }

  // "Hide author-drawn region borders" (session-only toggle). Some puzzles —
  // overlapping/gattai grids, framed grids — draw their own grid frame + box/region
  // boundary lines as classless, fill:none, stroked paths in #overlay. Because
  // #overlay renders ABOVE our injected region-border group, those lines sit on top
  // of our coloured borders (and our black->white swap brightens the black ones).
  // When the toggle is on we hide each such rectilinear author border line so our
  // borders show cleanly; diagonal/curved cosmetic lines and classed/filled shapes
  // are left untouched. Restores them when off.
  function applyHideAuthorBorders(svg) {
    var ov = svg && svg.querySelector('#overlay');
    if (!ov) return;
    if (settings.regionHideAuthorBorders) {
      ov.querySelectorAll('path, line').forEach(function (el) {
        if (el.getAttribute('class')) return;                       // only classless cosmetic structure
        var f = el.getAttribute('fill'), s = el.getAttribute('stroke');
        if (!(f === 'none' || f === null) || !s || s === 'none') return;  // outline-only (no fill)
        var rect;
        if (el.tagName.toLowerCase() === 'line') {
          rect = Math.abs((+el.getAttribute('x1')) - (+el.getAttribute('x2'))) < 0.01 ||
                 Math.abs((+el.getAttribute('y1')) - (+el.getAttribute('y2'))) < 0.01;
        } else { rect = pathIsRectilinear(el.getAttribute('d') || ''); }
        if (!rect) return;
        el.setAttribute('data-spdr-auth-border-hidden', '');
        el.style.setProperty('display', 'none', 'important');
      });
    } else {
      ov.querySelectorAll('[data-spdr-auth-border-hidden]').forEach(function (el) {
        el.style.removeProperty('display');
        el.removeAttribute('data-spdr-auth-border-hidden');
      });
    }
  }

  function applySettings() {
    rebuildStyleTag();
    darkenInlineToolButtons();
    if (easyShadeSwatchRefresh) { try { easyShadeSwatchRefresh(); } catch (e) {} }
    var svg = document.getElementById('svgrenderer');
    if (svg) { fixAllLabelRects(svg); fixAllCageBoxes(svg); fixAllUnderlays(svg); assignExtraRegionColors(svg); fixAllCagePaths(svg); fixAllLines(svg); fixAllGivens(svg); fixAllUserDigits(svg); fixAllOverlayMarkerText(svg); fixAllKropkiDots(svg); fixAllKropkiClueShapes(svg); rebuildKropkiLabels(svg); applyHideAuthorBorders(svg); drawRegionSplitBorders(svg); }
    var cc = document.getElementById('cell-candidates');
    if (cc) { sortAllCandidateCells(cc); fixAllCenterTspans(cc); }
    var cp = document.getElementById('cell-pencilmarks');
    if (cp) { reorderAllCornerCells(cp); fixAllCornerTexts(cp); }
    applyAllSelectionBorderOffsets();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Selection-border path offsetting (inside/outside growth modes)
  //
  // SVG has no built-in stroke-alignment property. To make the selection border
  // grow only inward or only outward, we modify the path's `d` attribute to
  // shift each edge perpendicular to itself, then let the centered stroke
  // render normally on the shifted path.
  //
  // The path created by SudokuPad (path.cage-selectioncage) is always
  // rectilinear (axis-aligned line segments only), which lets us use a simple
  // per-edge offset algorithm: each vertex shifts by the sum of its adjacent
  // edges' outward normals × the offset amount. Works for any rectilinear
  // closed polygon including L-shapes, U-shapes, and selections with holes.
  // ══════════════════════════════════════════════════════════════════════════

  function fmtN(n) { return Math.round(n * 100) / 100; }

  // Parse a path d attribute (only M, L, Z commands supported — that's all
  // SudokuPad's selectioncage uses) into a list of subpaths, each an array of
  // {x, y} vertices. Lowercase (relative) commands are converted to absolute.
  function parsePathSubpaths(d) {
    var subpaths = [];
    var current = null;
    var lastX = 0, lastY = 0;
    var tokens = d.match(/[MmLlZz]|-?\d*\.?\d+/g) || [];
    var i = 0;
    while (i < tokens.length) {
      var t = tokens[i++];
      if (t === 'M' || t === 'm') {
        if (current && current.length > 0) subpaths.push(current);
        current = [];
        var x = parseFloat(tokens[i++]);
        var y = parseFloat(tokens[i++]);
        if (t === 'm') { x += lastX; y += lastY; }
        current.push({ x: x, y: y });
        lastX = x; lastY = y;
        // Subsequent coord pairs after M are implicitly L
        while (i < tokens.length && /^-?\d/.test(tokens[i])) {
          var nx = parseFloat(tokens[i++]);
          var ny = parseFloat(tokens[i++]);
          if (t === 'm') { nx += lastX; ny += lastY; }
          current.push({ x: nx, y: ny });
          lastX = nx; lastY = ny;
        }
      } else if (t === 'L' || t === 'l') {
        while (i < tokens.length && /^-?\d/.test(tokens[i])) {
          var nx = parseFloat(tokens[i++]);
          var ny = parseFloat(tokens[i++]);
          if (t === 'l') { nx += lastX; ny += lastY; }
          if (current) current.push({ x: nx, y: ny });
          lastX = nx; lastY = ny;
        }
      } else if (t === 'Z' || t === 'z') {
        if (current && current.length > 0) subpaths.push(current);
        current = null;
      }
    }
    if (current && current.length > 0) subpaths.push(current);
    return subpaths;
  }

  function vertsToSubpath(verts) {
    if (verts.length === 0) return '';
    var parts = ['M' + fmtN(verts[0].x) + ' ' + fmtN(verts[0].y)];
    for (var i = 1; i < verts.length; i++) {
      parts.push('L' + fmtN(verts[i].x) + ' ' + fmtN(verts[i].y));
    }
    parts.push('Z');
    return parts.join(' ');
  }

  // Remove vertices that sit on a straight line between their neighbors. These
  // are valid path vertices but they aren't corners — the polygon would be
  // identical without them. SudokuPad's selection paths often include such
  // collinear vertices (e.g., a long bottom edge broken into two segments at
  // a cell boundary). For our offset algorithm, leaving them in causes a
  // double-shift at that vertex (both adjacent edges have the same outward
  // normal, so their sum is 2× the proper offset), producing a kink/spike.
  function removeCollinear(verts) {
    var n = verts.length;
    if (n < 3) return verts.slice();
    var result = [];
    for (var i = 0; i < n; i++) {
      var prev = verts[(i + n - 1) % n];
      var curr = verts[i];
      var next = verts[(i + 1) % n];
      var dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
      var dx2 = next.x - curr.x, dy2 = next.y - curr.y;
      // Cross product == 0 → vectors are parallel. For our axis-aligned paths,
      // this means same direction (since opposite-direction would mean a
      // degenerate edge of zero length on one side).
      if (dx1 * dy2 - dy1 * dx2 === 0) continue;
      result.push(curr);
    }
    return result;
  }

  // Offset a closed rectilinear polygon by `amount` units (positive = outward,
  // negative = inward). The polygon's orientation is auto-detected via signed
  // area; correct outward normals are computed accordingly.
  function offsetPolygon(verts, amount) {
    verts = removeCollinear(verts);
    var n = verts.length;
    if (n < 3 || amount === 0) return verts.slice();

    // Trapezoidal signed sum: sum_i (x_{i+1} - x_i)(y_{i+1} + y_i).
    // This equals -2 * standard shoelace. In SVG (y-down), the standard
    // shoelace is positive for visually-clockwise polygons, so this trap sum
    // is NEGATIVE for visually-clockwise polygons in SVG.
    var signedArea = 0;
    for (var i = 0; i < n; i++) {
      var p1 = verts[i], p2 = verts[(i + 1) % n];
      signedArea += (p2.x - p1.x) * (p2.y + p1.y);
    }
    var isClockwise = signedArea < 0;

    // For each edge i (vertex i to vertex i+1), the outward normal.
    // CW polygon in SVG: outward = (dy, -dx) sign-normalized.
    // CCW polygon: opposite sign.
    var edges = [];
    for (var i = 0; i < n; i++) {
      var p1 = verts[i], p2 = verts[(i + 1) % n];
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var dirX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
      var dirY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);
      var outX, outY;
      if (isClockwise) { outX = dirY;  outY = -dirX; }
      else             { outX = -dirY; outY = dirX;  }
      edges.push({ outX: outX, outY: outY });
    }

    // Each new vertex = original + (sum of adjacent outward normals) × amount.
    // For rectilinear polygons, the two adjacent normals are perpendicular,
    // so one contributes to x and the other to y; their sum is the corner shift.
    var newVerts = [];
    for (var i = 0; i < n; i++) {
      var prevEdge = edges[(i + n - 1) % n];
      var currEdge = edges[i];
      var sx = (prevEdge.outX + currEdge.outX) * amount;
      var sy = (prevEdge.outY + currEdge.outY) * amount;
      newVerts.push({ x: verts[i].x + sx, y: verts[i].y + sy });
    }
    return newVerts;
  }

  function offsetRectilinearPath(d, amount) {
    var subpaths = parsePathSubpaths(d);
    if (subpaths.length === 0) return d;
    if (subpaths.length === 1) {
      return vertsToSubpath(offsetPolygon(subpaths[0], amount));
    }

    // Multiple subpaths: detect inner subpaths (holes) so we can offset them
    // in the OPPOSITE direction. For a donut-shaped selection, SudokuPad's
    // outer + inner boundaries would otherwise both shift the same way,
    // putting the inner border on the wrong side of the gridline (in the
    // body for Outside mode, in the hole for Inside mode).
    //
    // Detection: a subpath is a hole if its bbox is strictly contained by
    // some other subpath's bbox. (Works for axis-aligned rectilinear shapes;
    // doesn't try to handle nested holes-within-holes.)
    var bboxes = subpaths.map(function (verts) {
      var xs = [], ys = [];
      for (var i = 0; i < verts.length; i++) { xs.push(verts[i].x); ys.push(verts[i].y); }
      return {
        minX: Math.min.apply(null, xs), maxX: Math.max.apply(null, xs),
        minY: Math.min.apply(null, ys), maxY: Math.max.apply(null, ys),
      };
    });
    function bboxContains(outer, inner) {
      return outer.minX < inner.minX && outer.maxX > inner.maxX &&
             outer.minY < inner.minY && outer.maxY > inner.maxY;
    }

    return subpaths.map(function (verts, i) {
      var isHole = false;
      for (var j = 0; j < bboxes.length; j++) {
        if (i !== j && bboxContains(bboxes[j], bboxes[i])) { isHole = true; break; }
      }
      var eff = isHole ? -amount : amount;
      return vertsToSubpath(offsetPolygon(verts, eff));
    }).join(' ');
  }

  // Compute the path-centerline shift amount based on mode + width + offset.
  //
  // Both modes have a baseline shift baked in so the user-visible "0" is
  // the visually pleasing default rather than the raw mathematical zero.
  //
  //   Inside mode (+5 baseline, direction unchanged):
  //     amount = -(1 + (displayed - 5) + W/2) = -displayed + 4 - W/2
  //     At displayed 0, W=8: amount = 0  (stroke centered on gridline)
  //     Outer edge of stroke pinned at (-displayed + 4) regardless of W.
  //     Positive displayed = stroke moves further INWARD (legacy direction).
  //
  //   Outside mode (+3 baseline, direction unchanged):
  //     amount = +(1 + (displayed + 3) + W/2) = displayed + 4 + W/2
  //     At displayed 0, W=8: amount = 8  (inner stroke edge 4px outside grid)
  //     Inner edge of stroke pinned at (displayed + 4) regardless of W.
  //     Positive displayed = stroke moves further OUTWARD.
  function computeSelectionShift() {
    var mode = settings.selectionBorderMode;
    if (mode !== 'inside' && mode !== 'outside') return 0;
    var width = parseFloat(settings.selectionWidth);
    if (!isFinite(width)) width = 8;
    var displayed = parseFloat(settings.selectionBorderOffset);
    if (!isFinite(displayed)) displayed = 0;

    if (mode === 'inside') {
      return -displayed + 4 - width / 2;
    } else {  // outside
      return displayed + 4 + width / 2;
    }
  }

  // Apply (or restore) the selection-border offset on a single path element.
  //
  // Two data attributes track state across SudokuPad re-issues + our settings:
  //   data-spdr-orig-d — SudokuPad's pristine d for this selection. Preserved
  //                      across mode/width/offset changes so we always re-derive
  //                      the new offset from the true original, never from an
  //                      already-offset version (which would cumulate).
  //   data-spdr-last-d — the d we most recently set. The MutationObserver
  //                      compares this to the current d to distinguish our own
  //                      writes (skip) from SudokuPad's re-issues (re-derive).
  function applySelectionBorderOffset(path) {
    if (!path) return;
    var amount = settings.selectionBorderEnabled ? computeSelectionShift() : 0;

    if (amount === 0) {
      // Restore original if we previously modified it
      var orig = path.getAttribute('data-spdr-orig-d');
      if (orig) {
        path.setAttribute('d', orig);
        path.removeAttribute('data-spdr-orig-d');
        path.removeAttribute('data-spdr-last-d');
      }
      return;
    }

    // Use stored origD if present (preserved across settings changes),
    // otherwise capture the current d as the new original.
    var origD = path.getAttribute('data-spdr-orig-d');
    if (!origD) {
      origD = path.getAttribute('d');
      path.setAttribute('data-spdr-orig-d', origD);
    }
    var newD = offsetRectilinearPath(origD, amount);
    if (newD !== path.getAttribute('d')) {
      path.setAttribute('d', newD);
    }
    path.setAttribute('data-spdr-last-d', newD);
  }

  function applyAllSelectionBorderOffsets() {
    document.querySelectorAll('#cell-highlights path.cage-selectioncage')
      .forEach(applySelectionBorderOffset);
  }

  // Watches #cell-highlights for new cage-selectioncage paths and for
  // attribute changes (d) on existing ones. Re-applies the offset when needed.
  var selectionBorderObserver = null;
  function startSelectionBorderObserver() {
    if (selectionBorderObserver) return;
    var host = document.getElementById('cell-highlights');
    if (!host) {
      // Element doesn't exist yet; try again shortly. SudokuPad creates it
      // when the puzzle SVG is built.
      setTimeout(startSelectionBorderObserver, 200);
      return;
    }
    applyAllSelectionBorderOffsets();
    selectionBorderObserver = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType === 1 && node.matches && node.matches('path.cage-selectioncage')) {
              applySelectionBorderOffset(node);
            }
          }
        } else if (m.type === 'attributes' && m.target.matches && m.target.matches('path.cage-selectioncage')) {
          var p = m.target;
          // If the current d matches what we last set, this mutation was
          // triggered by our own setAttribute — skip to avoid loops and
          // preserve the cached original.
          if (p.getAttribute('data-spdr-last-d') === p.getAttribute('d')) continue;
          // Otherwise SudokuPad changed the path (different selection shape).
          // Discard the cached original and re-derive from the new d.
          p.removeAttribute('data-spdr-orig-d');
          applySelectionBorderOffset(p);
        }
      }
    });
    selectionBorderObserver.observe(host, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['d'],
    });
  }

  // ── Inline colour application for pencilmarks ─────────────────────────────
  // Apply fill directly to each element with !important so our chosen colour
  // beats the frozen native dark-theme stylesheet (FROZEN_DARK_CSS) and the
  // element's own raw colour attribute, rendering exactly as picked.

  function applyInlineFill(el, desired) {
    var current = el.style.getPropertyValue('fill');
    if (current !== desired) {
      el.style.setProperty('fill', desired, 'important');
    }
  }

  function fixCenterTspan(t) {
    // Given candidates (author-provided pencilmarks, tspan.given) are part of the
    // puzzle like given digits, so they're always white to distinguish them from
    // the solver's own centre marks — independent of the centre-mark colour
    // controls below. Forced via inline !important rather than the CSS variable
    // --puzzle-givenCandidate, because that variable route did NOT apply in
    // LibreWolf (worked in Chrome/Brave/Firefox); an inline !important fill wins in
    // every engine. Conflicts fall through to SudokuPad's own pencilmark-error red,
    // so a given candidate still turns red when a placed digit clashes with it.
    if (t.classList.contains('given')) {
      if (t.classList.contains('conflict')) t.style.removeProperty('fill');
      else applyInlineFill(t, '#e8e6e3');   // --dm-white
      return;
    }
    if (!settings.centerEnabled) { t.style.removeProperty('fill'); return; }
    var isC = t.classList.contains('conflict');
    var color = isC ? settings.centerInvalidColor   : settings.centerValidColor;
    var op    = isC ? settings.centerInvalidOpacity : settings.centerValidOpacity;
    applyInlineFill(t, hexToRgba(color, op));
  }
  function fixAllCenterTspans(cc) {
    // Color both the parent text.cell-candidate (so any non-tspan children
    // inherit) and each tspan (which sets its own fill).
    cc.querySelectorAll('text.cell-candidate, #cell-candidates tspan').forEach(fixCenterTspan);
  }

  // Cell shading. Per-puzzle coloured regions (bright author pastels read poorly
  // on the dark substrate). Covers:
  //   - #underlay rect:  per-cell shading rects
  //   - #cages path[fill]: cage-shape shadings (killer/region overlays, e.g.
  //     class="cage-fpColumnIndexer")
  // Each element's original `fill` is routed through computeObjectShade (gray vs
  // coloured sliders): hue is preserved, lightness is remapped to the slider's
  // absolute HSL value (saturation forced to pure hue), then opacity is applied.

  // Shared lightness transform. Returns [r,g,b] from an original colour, mapped
  // by the Brightness slider L (0..1): pure hue (saturation forced to 1) at
  // absolute HSL lightness L. 0=black, 0.5=pure hue, 1=white. Discards the source
  // colour's saturation & lightness, so a fixed slider looks different per hue
  // (green vs blue perceived brightness).
  function shadingTransform(c, L) {
    if (L < 0) L = 0; else if (L > 1) L = 1;
    var hsl = rgbToHsl(c.r, c.g, c.b);
    var h = hsl[0], s = hsl[1];
    if (s === 0) {
      var v = Math.round(L * 255);
      return [v, v, v];
    }
    return hslToRgb(h, 1, L);
  }

  // A colour is "gray" when it has (near) zero saturation — black/white/grey.
  function isGrayColor(c) {
    return rgbToHsl(c.r, c.g, c.b)[1] < 0.08;
  }
  // Central object-shading transform for FILLS and LINES. Routes gray colours
  // through the Gray brightness/opacity sliders and coloured ones through the
  // Color brightness/opacity sliders (each pair is locked together by a single
  // combined slider when "Control opacity and brightness separately" is off). Returns
  // { rgb:[r,g,b], a:alpha } to apply, or null when the relevant control(s) are
  // disabled (caller clears our override so the native dark theme repaints it).
  // Does NOT cover shape outlines — those keep their own independent
  // Border-brightness slider via applyShapeStroke.
  function computeObjectShade(c) {
    var bKey, bEn, oKey, oEn;
    if (isGrayColor(c)) {
      bKey = 'underlayGrayBrightness'; bEn = 'underlayGrayBrightnessEnabled';
      oKey = 'underlayGrayOpacity';    oEn = 'underlayGrayOpacityEnabled';
    } else {
      bKey = 'underlayLightness'; bEn = 'underlayLightnessEnabled';
      oKey = 'underlayOpacity';   oEn = 'underlayOpacityEnabled';
    }
    var doFL = settings[bEn];
    var doFO = settings[oEn];
    if (!doFL && !doFO) return null;
    var rgb = doFL ? shadingTransform(c, settings[bKey]) : [c.r, c.g, c.b];
    var a   = doFO ? settings[oKey] : c.a;
    if (a < 0) a = 0; else if (a > 1) a = 1;
    return { rgb: rgb, a: a };
  }

  // ── Clearing our inline override (Object-shading off for an element) ───────
  // When a shading control is disabled we simply drop our inline fill/stroke and
  // let the frozen native dark theme (FROZEN_DARK_CSS) repaint the element. There
  // is nothing to "restore to" — DarkReader is locked out, so the native CSS plus
  // the element's own attributes are the only layers beneath ours.
  function clearInline(el, prop) {  // prop: 'fill' | 'stroke'
    el.style.removeProperty(prop);
    el.style.removeProperty(prop + '-opacity');
  }

  // Fill only — called when Cell shading section is enabled.
  function applyShadingFill(el) {
    var c = parseColor(el.getAttribute('fill') || '');
    if (!c || c.a === 0) {
      // No fill or layout-helper rect (fill="#FFFFFF00") — leave it transparent.
      el.style.removeProperty('fill');
      el.style.removeProperty('fill-opacity');
      return;
    }
    var sh = computeObjectShade(c);
    if (!sh) {
      // Both controls for this colour group are off — drop our override and let
      // the native dark theme repaint it.
      clearInline(el, 'fill');
      return;
    }
    el.style.setProperty('fill', 'rgb(' + sh.rgb[0] + ',' + sh.rgb[1] + ',' + sh.rgb[2] + ')', 'important');
    el.style.setProperty('fill-opacity', String(sh.a), 'important');
  }

  // Stroke (shape outline) — gated by the Object Shading section's enable + its
  // own Border brightness / Border opacity sub-enables (combined into one slider
  // when "Control opacity and brightness separately" is off). Brightness keeps
  // the element's hue via shadingTransform; opacity is now configurable too
  // (was hardcoded 1.0 before v2.143).
  function applyShapeStroke(el) {
    var doSL = settings.underlayStrokeLightnessEnabled;
    var doSO = settings.underlayStrokeOpacityEnabled;
    if (!settings.underlayEnabled || (!doSL && !doSO)) {
      clearInline(el, 'stroke');
      return;
    }
    var strokeAttr = el.getAttribute('stroke');
    if (!strokeAttr || strokeAttr === 'none') return;
    var sc = parseColor(strokeAttr);
    if (!sc || sc.a === 0) {
      el.style.removeProperty('stroke');
      el.style.removeProperty('stroke-opacity');
      return;
    }
    var srgb = doSL ? shadingTransform(sc, settings.underlayStrokeLightness) : [sc.r, sc.g, sc.b];
    var sa   = doSO ? settings.underlayStrokeOpacity : sc.a;
    if (sa < 0) sa = 0; else if (sa > 1) sa = 1;
    el.style.setProperty('stroke', 'rgb(' + srgb[0] + ',' + srgb[1] + ',' + srgb[2] + ')', 'important');
    el.style.setProperty('stroke-opacity', String(sa), 'important');
  }

  // Shaded-mode recolour for an #underlay rect that falls inside a DOM-detected
  // grey shaded region (see getDomShadedRegionMap). Returns the palette rgba to
  // paint, or null when shaded mode is off, the puzzle has no such regions, or this
  // rect isn't in one. The rect's CENTRE picks the cell, so full cells and the inset
  // border strips both resolve to their region's colour.
  function extraRegionRectColor(rect) {
    if (!settings.shadedRegionColorEnabled) return null;
    var map = getDomShadedRegionMap();
    if (!map) return null;
    var cs = getGridCellSize();
    if (!cs) return null;
    var x = parseFloat(rect.getAttribute('x')), y = parseFloat(rect.getAttribute('y'));
    var w = parseFloat(rect.getAttribute('width')), h = parseFloat(rect.getAttribute('height'));
    if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h)) return null;
    var idx = map[Math.floor((y + h / 2) / cs) + ',' + Math.floor((x + w / 2) / cs)];
    if (idx === undefined) return null;
    var pal = [settings.regionColorPalette0 || '#e05252', settings.regionColorPalette1 || '#5294e0',
               settings.regionColorPalette2 || '#52a84e', settings.regionColorPalette3 || '#e8a030'];
    var op = (settings.shadedRegionColorOpacity != null) ? settings.shadedRegionColorOpacity : 0.5;
    return hexToRgba(pal[idx % 4], op);
  }

  // Crisp (no anti-alias) edges for shaded-cell rects so the many tiled pieces a
  // region is built from (full cells + bridging strips) meet seamlessly on the dark
  // canvas — the AA fuzz at each edge otherwise reads as faint seams that the
  // original's white background hid. ONLY for axis-aligned, square-cornered rects:
  // crispEdges would jag rotated (diamond) or rounded (lucky-charm) shapes, so those
  // keep anti-aliasing. Removed (→ default AA) when we stop shading the rect.
  function applyCrispEdges(el) {
    var axisAligned = el.tagName === 'rect'
      && !el.getAttribute('transform')
      && !(el.transform && el.transform.baseVal && el.transform.baseVal.length)
      && !el.getAttribute('rx') && !el.getAttribute('ry');
    if (axisAligned) el.style.setProperty('shape-rendering', 'crispEdges', 'important');
    else el.style.removeProperty('shape-rendering');
  }
  function fixUnderlayRect(rect) {
    // Shaded extra-region recolour takes priority: a grey underlay cell that is
    // part of a DOM-detected shaded region becomes its palette colour (overrides
    // the normal grey Object-shading). Falls through to grey when shaded mode off.
    var erc = extraRegionRectColor(rect);
    if (erc) {
      rect.style.setProperty('fill', erc, 'important');
      rect.style.removeProperty('fill-opacity');   // alpha is baked into the rgba
      applyCrispEdges(rect);
      applyShapeStroke(rect);
      return;
    }
    // Fill (Cell shading section)
    if (settings.underlayEnabled) {
      applyShadingFill(rect);
      applyCrispEdges(rect);
    } else {
      clearInline(rect, 'fill');
      rect.style.removeProperty('shape-rendering');
    }
    // Stroke (Region borders section)
    applyShapeStroke(rect);
  }
  // Broad rule for shading shapes that live in #overlay (drawn above digits) the
  // same way as #underlay shapes — e.g. "lucky charm" puzzles whose coloured
  // circles/squares/diamonds are overlay rects. Skip what we must NOT recolour:
  // fill-less/transparent rects, white/near-white rects (label boxes + white inner
  // shapes), and GRAYSCALE textbg (black Kropki dots, grey labels). We DO shade
  // COLOURED textbg though — those are author-decorated cosmetic shapes (e.g. a
  // light-blue circle behind a digit) that the label-bg fix would otherwise flatten
  // to the dark label colour. General predicate, not puzzle-specific.
  function shouldShadeOverlayRect(r) {
    var c = parseColor(r.getAttribute('fill') || '');
    if (!c || c.a === 0) return false;                          // transparent / no fill
    if (isKropkiDotRect(r)) return false;                       // owned by the Kropki fix (any class, black or white)
    if (isKropkiClueShape(r)) return false;                     // owned by the Kropki clue-shape fix (off-border dots / diamonds)
    if (c.r >= 240 && c.g >= 240 && c.b >= 240) return false;   // white / near-white
    if (r.classList.contains('textbg') && isGrayColor(c)) return false; // grey label bg
    return true;
  }
  function fixAllUnderlays(svg) {
    // Skip Kropki dots that live in #underlay — the Kropki fix owns them (else a
    // black border dot reads as a "gray object"); mirrors the #overlay skip above.
    svg.querySelectorAll('#underlay rect').forEach(function (r) { if (!isKropkiDotRect(r)) fixUnderlayRect(r); });
    // Overlay shapes (opt-in): shade the coloured ones, clear ours from any we
    // previously touched but no longer should (e.g. toggle off, or it changed).
    // Overlay shapes are always shaded alongside underlay shapes when Object
    // shading is on (the former opt-in checkbox was removed in v2.140).
    var shadeOverlay = settings.underlayEnabled;
    svg.querySelectorAll('#overlay rect').forEach(function (r) {
      if (shadeOverlay && shouldShadeOverlayRect(r)) {
        fixUnderlayRect(r);
        r.dataset.spdrOverlayShaded = '1';
      } else if (r.dataset.spdrOverlayShaded) {
        clearInline(r, 'fill');
        clearInline(r, 'stroke');
        delete r.dataset.spdrOverlayShaded;
      }
    });
  }

  var CAGE_FILL_SEL = '#cages path[fill]:not([fill="none"])';

  // Whether any region feature is active (so mainGroup exists / region borders
  // are drawn). Mirrors needFills/needMultiBorders/needCenterBorder + shaded.
  function regionFeatureActive() {
    return !!settings.regionColorFillEnabled
      || settings.regionBorderMultiEnabled || settings.regionBorderCenterEnabled
      || !!settings.shadedRegionColorEnabled;
  }
  // Shaded "extra regions" (e.g. "grey regions must contain 1-9") render on top
  // of region borders by default (they live in #cages, above mainGroup). Whenever
  // a region feature is active we instead draw a clone of each one INSIDE mainGroup
  // (drawRegionSplitBorders), below the border strips — coloured if shaded mode is
  // on, otherwise the same grey Object-shaded look. So here we hide the original
  // #cages path so it doesn't paint over the borders. Re-asserted on board re-render.
  function extraRegionsMovedBelowBorders() {
    return regionFeatureActive() && puzzleHasShadedRegions();
  }
  function applyExtraRegionFill(path) {
    path.style.setProperty('fill', 'transparent', 'important');
    path.style.removeProperty('fill-opacity');
  }
  function fixCagePath(path) {
    if (path.classList.contains('cage-extraregion') && extraRegionsMovedBelowBorders()) {
      applyExtraRegionFill(path);
      applyShapeStroke(path);
      return;
    }
    if (settings.underlayEnabled) {
      applyShadingFill(path);
    } else {
      clearInline(path, 'fill');
    }
    applyShapeStroke(path);
  }
  function fixAllCagePaths(svg) {
    svg.querySelectorAll(CAGE_FILL_SEL).forEach(fixCagePath);
  }

  // Detect whether this puzzle has shaded "extra regions" we can recolor — either
  // the clonable DOM paths, or grey shaded-cell regions drawn as #underlay rects
  // (hidden-killer / extraregion cages rendered as grey cells; see getDomShadedRegionMap).
  function puzzleHasShadedRegions() {
    if (document.querySelector('#cages path.cage-extraregion')) return true;
    if (getDomShadedRegionMap()) return true;   // grey #underlay rects (DOM-only, cached)
    // Model-defined regions with no DOM shading at all (Windoku-style). Synchronous,
    // guarded model read; returns null before the app exists, real data after.
    return !!getModelShadedRegionMap();
  }

  // Assign each cage-extraregion path a palette index (0-3) such that any two
  // grey regions that touch orthogonally get different colours. Membership is
  // sampled via SVGGeometryElement.isPointInFill at each cell centre (the grid
  // has no element transform, so cell-grid user units map directly). The index
  // is stored on the element for fixCagePath to read; cleared when the mode is
  // off so normal Object-shading resumes.
  function assignExtraRegionColors(svg) {
    var paths = [].slice.call(svg.querySelectorAll('#cages path.cage-extraregion'));
    if (!settings.shadedRegionColorEnabled || paths.length === 0) {
      paths.forEach(function (p) { delete p.dataset.spdrExtraColorIdx; });
      return;
    }
    var cs = getGridCellSize();
    var N  = detectGridSize();
    if (!cs || cs < 4 || !N || N < 2 || !svg.createSVGPoint) {
      paths.forEach(function (p) { delete p.dataset.spdrExtraColorIdx; });
      return;
    }
    // Sample the cells each grey region covers.
    var pt = svg.createSVGPoint();
    var sets = paths.map(function (p) {
      var cells = [];
      for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
        pt.x = c * cs + cs / 2; pt.y = r * cs + cs / 2;
        try { if (p.isPointInFill(pt)) cells.push([r, c]); } catch (e) {}
      }
      return cells;
    });
    // Colour to MAXIMISE distinct palette colours (shaded-region policy): ≤4 regions
    // each get their own colour (so two non-touching grey regions differ, not both
    // red — e.g. 5tplfif6te's two staircases), >4 spread across all four with no two
    // touching alike. Same helper as the underlay shaded-region path.
    var colors = colourShadedRegions(sets);
    paths.forEach(function (p, i) { p.dataset.spdrExtraColorIdx = String(colors[i] < 0 ? 0 : colors[i]); });
  }

  // Line constraints. Every line-type clue — thermo shafts, palindromes, renban,
  // whispers, region-sum lines, arrow-sudoku arrow lines — renders as a stroked
  // <path> in #arrows (fill=none). We shade the line STROKE through the same
  // object-shading transform used for fills (computeObjectShade): gray lines (e.g.
  // #CFCFCF thermos/palindromes) follow the linked Gray slider, coloured lines the
  // Brightness/Opacity sliders. Scope is broad on purpose — ALL stroked #arrows
  // paths, not just bulb-matched shafts (was the v2.122 thermo-only rule; bulbless
  // line puzzles like 9p6eahqmux were missed before v2.140). Stroke width is never
  // touched.
  //
  // TWO shapes the path's-own-stroke rule used to miss, both now covered (v3.51):
  //  • GROUP-stroked arrows — some authors stroke the whole arrow <g> and leave the
  //    shaft path + arrowhead <marker> to inherit it (Bill Murphy "Pathfinder"
  //    nr59t9p34q, ~160 catalog puzzles). lineStrokeSrc resolves the inherited colour
  //    and we set the inline override on the visible paths (incl. the marker's content
  //    path, which recolours the rendered arrowhead — verified), never the <g>, so
  //    apply + highlight stay on the same element set.
  //  • FILLED arrow shapes — block arrows (clover "Cupid"), diamonds (clover
  //    "Borderlands" lte0wsz2f0), filled directional arrows (Bill Murphy "Dead or
  //    Alive" 1q8ntzcmyn) are an #arrows <path fill="#CFCFCF">. The fill is the bulk
  //    of the shape, so shading only the stroke left the gray body bright; shade the
  //    fill through the same gray/colour router.
  // ATTRIBUTES only (never our inline style) → re-applying is idempotent.
  function lineStrokeSrc(el) {
    for (var n = el; n && n.id !== 'arrows'; n = n.parentElement) {
      if (n.getAttribute) { var s = n.getAttribute('stroke'); if (s) return s; }
    }
    return null;
  }
  function applyLineStroke(el) {
    if (!settings.underlayEnabled) { clearInline(el, 'stroke'); return; }
    var c = parseColor(lineStrokeSrc(el) || '');
    if (!c || c.a === 0) { clearInline(el, 'stroke'); return; }
    var sh = computeObjectShade(c);
    if (!sh) { clearInline(el, 'stroke'); return; }
    el.style.setProperty('stroke', 'rgb(' + sh.rgb[0] + ',' + sh.rgb[1] + ',' + sh.rgb[2] + ')', 'important');
    el.style.setProperty('stroke-opacity', String(sh.a), 'important');
  }
  function applyLineFill(el) {
    if (!settings.underlayEnabled) { clearInline(el, 'fill'); return; }
    var c = parseColor(el.getAttribute('fill') || '');
    if (!c || c.a === 0) { clearInline(el, 'fill'); return; }
    var sh = computeObjectShade(c);
    if (!sh) { clearInline(el, 'fill'); return; }
    el.style.setProperty('fill', 'rgb(' + sh.rgb[0] + ',' + sh.rgb[1] + ',' + sh.rgb[2] + ')', 'important');
    el.style.setProperty('fill-opacity', String(sh.a), 'important');
  }

  // ── Clue-line DOM source: ONE layer list + ONE predicate, shared everywhere ──
  // SudokuPad renders cosmetic *line* clues (whispers/renban/thermo shafts/…) into
  // more than one SVG layer: the usual `lines[]` go to #arrows, but some puzzles
  // (2hk0wen7pj "Hijinks") have no cp.lines and draw their lines as stroked,
  // fill:none <path>s in #overlay instead (v3.83). THREE subsystems read clue
  // lines from the DOM and MUST agree on which layers/paths count, or a fix in one
  // drifts from the others (the exact gap v3.84 closed):
  //   1. validators/detection — scanLineLayer → getCosmeticLines
  //   2. rendering/colour-shading — fixAllLines
  //   3. object-shading highlight — objLineStrokeSources
  // All three key off the two names below. Add a new line layer HERE (one edit) and
  // every subsystem picks it up. (#arrows additionally carries FILLED block-arrow
  // shapes shaded via isLineFill; other layers are plain fill:none stroke lines, so
  // the fill pass stays #arrows-only — see fixAllLines.)
  var LINE_DOM_LAYER_IDS = ['arrows', 'overlay'];
  // Is DOM <path> p a plain cosmetic line clue? (stroked, fill:none — so block
  // arrows/marker shapes are excluded — not an arrow shaft, ≥2 waypoints.) The
  // cheap structural gate shared by the validator scan and the non-#arrows render/
  // highlight branches; scanLineLayer adds the grid-geometry refinement on top.
  function isLineCluePath(p) {
    if (!p || p.tagName !== 'path') return false;
    if (p.getAttribute('marker-end')) return false;             // arrow shaft, not a line clue
    var fill = p.getAttribute('fill');
    if (fill && fill !== 'none') return false;                  // filled shape (block arrow / marker)
    var stroke = lineStrokeSrc(p);
    if (!stroke || stroke === 'none') return false;
    var nums = (p.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g);
    return !!(nums && nums.length >= 4);                        // ≥2 waypoints
  }
  function isLineStroke(el) {
    if (el.tagName !== 'path' || !el.closest('#arrows')) return false;
    var s = lineStrokeSrc(el);
    if (!s || s === 'none') return false;
    var c = parseColor(s);
    return !!(c && c.a !== 0);
  }
  function isLineFill(el) {
    if (el.tagName !== 'path' || !el.closest('#arrows')) return false;
    var f = el.getAttribute('fill');
    if (!f || f === 'none') return false;
    var c = parseColor(f);
    if (!c || c.a === 0) return false;
    // White / near-white fills are a SEMANTIC distinct from grey and must NOT be
    // shaded to the same grey as #CFCFCF fills — e.g. Bill Murphy's "Dead or Alive"
    // arrows (gbvrbw6nh8, 1q8ntzcmyn): WHITE arrows vs GREY arrows must stay tellable
    // apart. Leaving white to the native dark theme ([fill=#FFFFFF]→dm-black) renders
    // it as a hollow/dark arrow, distinct from the solid grey ones. Mirrors
    // shouldShadeOverlayRect's near-white skip (the grey #CFCFCF=207 fills still shade).
    if (c.r >= 240 && c.g >= 240 && c.b >= 240) return false;
    return true;
  }
  function fixAllLines(svg) {
    LINE_DOM_LAYER_IDS.forEach(function (id) {
      var layer = svg.querySelector('#' + id);
      if (!layer) return;
      layer.querySelectorAll('path').forEach(function (el) {
        if (id === 'arrows') {
          // #arrows: strokes (incl. group-inherited) AND filled block-arrow shapes.
          if (isLineStroke(el)) applyLineStroke(el);
          if (isLineFill(el))   applyLineFill(el);
        } else if (isLineCluePath(el)) {
          // Other layers (#overlay Hijinks lines): plain fill:none stroke lines.
          applyLineStroke(el);
        }
      });
    });
  }

  // Given digits — apply colour via inline !important fill so the native dark
  // theme can't re-tint it. Overlay texts (constraint labels, rank markers, etc.)
  // are NOT touched here; they have no cell-given class. Grayscale overlay markers
  // are handled separately by fixOverlayMarkerText (gray object-shading sliders);
  // coloured overlay text is left to the native theme.
  function fixGivenText(t) {
    if (settings.givenEnabled) {
      var color = hexToRgba(settings.givenColor, settings.givenOpacity);
      t.style.setProperty('fill', color, 'important');
    } else {
      t.style.removeProperty('fill');
    }
  }
  function fixAllGivens(svg) {
    svg.querySelectorAll('#cell-givens text, text.cell-given').forEach(fixGivenText);
  }
  // User-entered (placed) digits — the values the solver types into cells
  // (#cell-values text). Same inline-!important-fill approach as givens.
  function fixUserText(t) {
    if (settings.userDigitEnabled) {
      var color = hexToRgba(settings.userDigitColor, settings.userDigitOpacity);
      t.style.setProperty('fill', color, 'important');
    } else {
      t.style.removeProperty('fill');
    }
  }
  function fixAllUserDigits(svg) {
    svg.querySelectorAll('#cell-values text, text.cell-value').forEach(fixUserText);
  }
  // Overlay marker text — author-drawn grayscale <text> in #overlay (e.g. the
  // "#N" rank markers in clover's Rank Sudoku, or the X/O letters in Counting
  // Neighbours). The author sets a dim gray inline fill (#AAA / #CCC) that the
  // native theme leaves nearly unchanged, so it isn't covered by any of our digit
  // controls. We route the GRAY ones through the same Gray object-shading sliders
  // as gray shapes (computeObjectShade's gray branch), so they track that single
  // brightness/opacity control. We deliberately do NOT recolour these to a fixed
  // colour the way fixGivenText does — that's the v2.118.0 bug (forcing them to
  // near-white givenColor made them far brighter than the author intended); the
  // shading transform scales the author's gray instead, preserving the dim look.
  // Skips: Kropki labels (author '#000'/'#fff' text or our injected labels — owned
  // by the Kropki fix) and any COLOURED overlay text (left to the native theme).
  function fixOverlayMarkerText(t) {
    if (t.dataset.spdrKropkiText !== undefined) return;   // existing author Kropki label
    if (t.dataset.spdrKropkiLabel !== undefined) return;  // our injected Kropki label
    // Capture the author's original fill once, before we ever override it.
    if (t.dataset.spdrOrigFill === undefined) {
      t.dataset.spdrOrigFill = t.style.getPropertyValue('fill') || t.getAttribute('fill') || '';
    }
    var orig = t.dataset.spdrOrigFill;
    var c = parseColor(orig);
    if (!c || c.a === 0 || !isGrayColor(c)) return;        // only author-gray markers
    var sh = settings.underlayEnabled ? computeObjectShade(c) : null;
    if (sh) {
      t.style.setProperty('fill', 'rgb(' + sh.rgb[0] + ',' + sh.rgb[1] + ',' + sh.rgb[2] + ')', 'important');
      t.style.setProperty('fill-opacity', String(sh.a), 'important');
    } else {
      // Section off / both gray sliders off → restore the author's original fill
      // (non-important, exactly as it shipped) so the native theme shows it as authored.
      if (orig) t.style.setProperty('fill', orig);
      else t.style.removeProperty('fill');
      t.style.removeProperty('fill-opacity');
    }
  }
  function fixAllOverlayMarkerText(svg) {
    svg.querySelectorAll('#overlay text').forEach(fixOverlayMarkerText);
  }

  // ── Kropki dot color fix ──────────────────────────────────────────────────────
  // Force Kropki dots to their correct colours via inline !important style so the
  // native dark theme can't re-tint them: white-fill (consecutive) stays white,
  // black-fill (2:1 ratio) stays black, each with an optional contrasting outline.
  // Optionally overlay a ":" / "~" label on each bare dot.
  //
  // Robust detection rule (3 independent signals, ALL required):
  //   1. SHAPE  — a true circle: feature-kropki class (authoritative), OR a square
  //               rounded rect (w ≈ h AND rx ≈ w/2) whose class is textbg or absent.
  //               The w ≈ h test rejects PILLS (double-arrow bulbs): a vertical pill's
  //               rx equals w/2 of its short side, so rx ≈ w/2 alone would pass it.
  //   2. FILL   — pure black (#000000) or pure white (#FFFFFF). Coloured circles are
  //               left to Object shading; this also bounds which class-less circles
  //               we claim. (Checked in fixKropkiDot / isKropkiDotRect, not isKropkiCircle.)
  //   3. POSITION (isOnCellBorder) — centre on a cell border (gridline in one axis,
  //               mid-cell in the other). Excludes quadruples (grid corner), arrow
  //               bulbs / cosmetic circles (cell centre), line endpoints (path ends).
  //   isKropkiCircle — signal 1 only (shape). isKropkiDotRect = 1 ∧ 2 ∧ 3 (the exact
  //               set the colour fix owns; object shading + label-bg skip it).
  //   isKropkiRect   — isKropkiCircle AND no non-empty text sibling → label injection
  //                    (still gated on isOnCellBorder in rebuildKropkiLabels).
  // Scans include class-less #overlay/#underlay circles (some authors draw edge dots
  // as bare <rect> circles), filtered down by the fill + position gates.
  //
  // Labeled Kropki-type circles (Difference/Ratio Sudoku etc.) pass isKropkiCircle
  // but not isKropkiRect. Their circle fill and adjacent text colour are pinned via
  // inline !important, but we don't inject our own labels on top of the existing text.
  // data-spdr-kropki-text marks such texts so the MutationObserver can re-fix them.

  // Returns the non-spdr value text whose anchor sits ON a circle's centre, by
  // scanning the overlay/underlay text in the same SVG. SudokuPad often renders
  // an edge clue's value in a SEPARATE batch (Ratio fractions, XV/Roman sums) so
  // it is NOT a DOM sibling of the dot — the only stable link is position. The
  // anchor of a centred value lands on the dot centre (text-anchor:middle), a few
  // px down for the baseline. Tolerance stays well under one cell, so a
  // neighbouring clue (≥ 1 cell away) can never be matched. Scoped to
  // overlay/underlay so grid digits / pencilmarks are never picked up.
  function getCenteredKropkiText(rect) {
    var svg = rect.ownerSVGElement; if (!svg) return null;
    var w = parseFloat(rect.getAttribute('width') || 0);
    var h = parseFloat(rect.getAttribute('height') || 0);
    var cx = parseFloat(rect.getAttribute('x') || 0) + w / 2;
    var cy = parseFloat(rect.getAttribute('y') || 0) + h / 2;
    var texts = svg.querySelectorAll('#overlay text, #underlay text');
    for (var i = 0; i < texts.length; i++) {
      var t = texts[i];
      if (t.getAttribute('data-spdr-kropki-label') != null) continue;  // our own label
      if (t.textContent.trim() === '') continue;
      var tx = parseFloat(t.getAttribute('x')), ty = parseFloat(t.getAttribute('y'));
      if (!isFinite(tx) || !isFinite(ty)) continue;
      if (Math.abs(tx - cx) <= 10 && Math.abs(ty - cy) <= 16) return t;
    }
    return null;
  }

  // Returns the non-spdr value text belonging to a Kropki circle rect (its
  // existing label, for labeled Kropki-type circles), or null if the dot is bare.
  function getKropkiAdjacentText(rect) {
    var next = rect.nextElementSibling;
    // Walk past elements that can sit BETWEEN a labeled dot and its value text:
    //   - our own injected labels (data-spdr-kropki-label)
    //   - the author's text-background halo (rect.textbg), which Difference/Ratio
    //     puzzles place between the circle and its "2"/"3" value (circle → textbg
    //     → text). Missing it made us treat the labeled dot as BARE and inject a
    //     spurious rotated '~' on top of the real value (clover "Same Difference").
    while (next) {
      if (next.getAttribute && next.getAttribute('data-spdr-kropki-label') != null) { next = next.nextElementSibling; continue; }
      if (next.tagName === 'rect' && next.classList && next.classList.contains('textbg')) { next = next.nextElementSibling; continue; }
      break;
    }
    if (next && next.tagName === 'text' && next.textContent.trim() !== '') return next;
    // Fallback: the value text isn't a sibling at all — SudokuPad batched it
    // elsewhere in the group (Ratio fractions, XV/Roman sums). Match by position.
    // Without this we mistake the labeled dot for bare → inject a spurious '~'
    // AND never pin the value's colour → off-white numerals vanish on the white
    // disc. (clover "XIIIVIII" ed0mko9d0b, "Back to the Ratio" 3y38nrs34s, etc.)
    return getCenteredKropkiText(rect);
  }

  // Any Kropki-shaped circle — used for color fixing. SHAPE test only; the
  // position gate (isOnCellBorder) and the fill gate live in the callers.
  function isKropkiCircle(rect) {
    // Native Kropki use the feature-kropki class — authoritative, always a circle.
    if (rect.classList.contains('feature-kropki')) return true;
    // Otherwise require a TRUE circle: square bounding box (w ≈ h) AND fully
    // rounded (rx ≈ w/2). The w ≈ h test is essential — rx ≈ w/2 ALONE also matches
    // a PILL's short side (e.g. a vertical 2-cell double-arrow bulb has w=48,h=112,
    // rx=24 = w/2), which is NOT a Kropki dot. (See LESSONS "Kropki detection".)
    var w  = parseFloat(rect.getAttribute('width')  || 0);
    var h  = parseFloat(rect.getAttribute('height') || 0);
    var rx = parseFloat(rect.getAttribute('rx')     || 0);
    if (!(w > 0 && Math.abs(w - h) < 1 && rx > 0 && Math.abs(rx - w / 2) < 1)) return false;
    // Accept the textbg class (cosmetic Kropki) OR a class-less circle (some authors
    // draw edge dots as bare <rect> circles with no class — e.g. clover's "Diamond
    // Ring" nipb00tmn1). Reject other NAMED classes so we don't grab unrelated
    // decorated circles. Position (isOnCellBorder) + mono fill are the real guards.
    var cls = rect.getAttribute('class');
    return !cls || cls.trim() === '' || rect.classList.contains('textbg');
  }

  // Bare Kropki dot (no existing label text) — used for label injection.
  function isKropkiRect(rect) {
    return isKropkiCircle(rect) && !getKropkiAdjacentText(rect);
  }

  // True iff the circle's centre sits on a cell border — a gridline in exactly
  // one axis and mid-cell in the other. That's the defining position of an edge
  // clue (Kropki / X-V / operator dot). Arrow bulbs and other in-cell circles
  // sit at a cell centre and fail this test. Lets us treat any black/white
  // border dot as Kropki-type for colour/outline purposes, whatever its true
  // constraint meaning. Origin is assumed grid-aligned at 0 (mod cs), matching
  // the onHorizBorder test in rebuildKropkiLabels.
  function isOnCellBorder(rect, cs) {
    if (!cs || cs <= 0) return false;
    var x = parseFloat(rect.getAttribute('x') || 0);
    var y = parseFloat(rect.getAttribute('y') || 0);
    var w = parseFloat(rect.getAttribute('width') || 0);
    var h = parseFloat(rect.getAttribute('height') || 0);
    var cx = x + w / 2, cy = y + h / 2;
    function gridDist(v) { var m = ((v % cs) + cs) % cs; return Math.min(m, cs - m); }
    var tol  = cs * 0.15;
    var half = cs / 2;
    var dx = gridDist(cx), dy = gridDist(cy);
    var onVert  = dx < tol && Math.abs(dy - half) < tol;  // on a vertical cell border
    var onHoriz = dy < tol && Math.abs(dx - half) < tol;  // on a horizontal cell border
    return onVert || onHoriz;
  }

  // The exact set the Kropki colour-fix OWNS: a black/white Kropki-shaped circle on
  // a cell border. Object shading and the label-bg fix must SKIP these so the Kropki
  // section is their sole controller — otherwise a black Kropki dot reads as a "gray
  // object" (highlight + shading) and a white dot gets flattened to the label-bg
  // colour. Unconditional (ignores kropkiFixEnabled): a Kropki dot is never an
  // object-shading / label-bg target; when the Kropki fix is off it falls to the native theme.
  // Takes ONLY the rect — cs is computed internally so this is safe to pass straight
  // to Array.filter (which would otherwise feed the array index in as a 2nd arg and
  // wreck isOnCellBorder by using a 1px cell size).
  function isKropkiDotRect(rect) {
    if (!isKropkiCircle(rect)) return false;
    var f = (rect.getAttribute('fill') || '').toUpperCase();
    if (f !== '#FFFFFF' && f !== '#000000') return false;
    return isOnCellBorder(rect, getGridCellSize());
  }

  // Apply (ring on) or clear (ring off) a Kropki-family dot's outline as the disc
  // rect's OWN stroke — so the ring always paints UNDER the dot's value/label text
  // (the rect precedes the text in DOM order; SVG paints in document order). When
  // off we set stroke:none !important, NOT a bare removeProperty: the static
  // `.spdr-dark rect.feature-kropki[fill=...]` CSS rule derives a contrasting stroke
  // from the attribute fill, so merely clearing our inline value would let that
  // CSS ring re-appear. Shared by the labeled-dot branch and fixKropkiClueShape.
  function applyKropkiDotRing(rect, on, color) {
    if (on) {
      rect.style.setProperty('stroke', color, 'important');
      rect.style.setProperty('stroke-width', '1.5', 'important');
    } else {
      rect.style.setProperty('stroke', 'none', 'important');
      rect.style.removeProperty('stroke-width');
    }
  }

  function fixKropkiDot(rect) {
    var fill = rect.getAttribute('fill');
    var isWhite = fill && fill.toUpperCase() === '#FFFFFF';
    var isBlack = fill && fill.toUpperCase() === '#000000';
    if (!isWhite && !isBlack) return;
    // Real edge clues (Kropki / X-V / operator dots) sit ON a cell border — a
    // gridline in one axis, mid-cell in the other. Circles elsewhere are NOT
    // Kropki and are left to the native theme: a quadruple sits on a grid CORNER
    // (gridline in both axes), arrow bulbs / cosmetic circles at a cell CENTRE,
    // line endpoints wherever a path ends. Black dots are gated the same way (a
    // solid-black circle off a border is cosmetic, not Kropki).
    if (!isOnCellBorder(rect, getGridCellSize())) return;
    var adjText = getKropkiAdjacentText(rect);
    // ── LABELED value clues (Ratio fraction, Difference number, XV/Roman sum,
    // operator symbol) ── carry a printed value but are still Kropki-FAMILY dots:
    // a black disc = ratio, a white disc = difference (e.g. "Fourshadowing"
    // 42klo6lbj4 — black "4" ratio dots and white "4" difference dots). So KEEP the
    // disc's semantic colour and only pin the value text to contrast (white on a
    // black disc, black on a white disc). Native dark only rendered these "broken"
    // because it left the value off-white on a white disc; once WE own the text
    // colour, a white disc is perfectly readable — no need to flatten everything to
    // black (which also let the static feature-kropki[fill] CSS rule paint a stray
    // white ring on the real black dots). The outline RING follows the same
    // per-colour toggles as bare dots and is the disc's own stroke, so it paints
    // UNDER the value text. The colour+text fix stays decoupled from the master
    // kropkiFixEnabled (an unconditional correctness fix); only the ring is gated.
    if (adjText) {
      var labelRingOn, labelRingColor, labelTextColor;
      if (isBlack) { labelRingOn = !!settings.kropkiOutlineEnabled;             labelRingColor = '#ffffff'; labelTextColor = '#ffffff'; rect.style.setProperty('fill', '#000000', 'important'); }
      else         { labelRingOn = settings.kropkiWhiteOutlineEnabled !== false; labelRingColor = '#000000'; labelTextColor = '#000000'; rect.style.setProperty('fill', '#ffffff', 'important'); }
      applyKropkiDotRing(rect, labelRingOn, labelRingColor);
      if (rect.dataset.spdrKropkiFo === undefined) rect.dataset.spdrKropkiFo = rect.style.getPropertyValue('fill-opacity');
      rect.style.setProperty('fill-opacity', '1', 'important');
      adjText.setAttribute('data-spdr-kropki-text', labelTextColor);
      adjText.style.setProperty('fill', labelTextColor, 'important');
      return;
    }
    // ── BARE dots ── genuine Kropki: keep the SEMANTIC fill (white = consecutive,
    // black = 2:1) and honour the Kropki outline controls. Flipping these would
    // corrupt the clue, so only the labeled clues above invert.
    if (settings.kropkiFixEnabled) {
      if (isBlack) {
        rect.style.setProperty('fill', '#000000', 'important');
        if (settings.kropkiOutlineEnabled) {
          rect.style.setProperty('stroke', '#ffffff', 'important');
          rect.style.setProperty('stroke-width', '1.5', 'important');
        } else {
          rect.style.removeProperty('stroke');
          rect.style.removeProperty('stroke-width');
        }
      } else {
        rect.style.setProperty('fill', '#ffffff', 'important');
        if (settings.kropkiWhiteOutlineEnabled !== false) {
          rect.style.setProperty('stroke', '#000000', 'important');
          rect.style.removeProperty('stroke-width');
        } else {
          rect.style.removeProperty('stroke');
          rect.style.removeProperty('stroke-width');
        }
      }
      // Some puzzles draw dots with an inline fill-opacity < 1 (e.g. author-
      // styled translucent black dots that render as grey). Force full opacity
      // so fixed dots are solid; stash the original to restore on disable.
      if (rect.dataset.spdrKropkiFo === undefined) rect.dataset.spdrKropkiFo = rect.style.getPropertyValue('fill-opacity');
      rect.style.setProperty('fill-opacity', '1', 'important');
    } else {
      rect.style.removeProperty('fill');
      rect.style.removeProperty('stroke');
      rect.style.removeProperty('stroke-width');
      // Restore the puzzle's original fill-opacity (if we overrode it).
      if (rect.dataset.spdrKropkiFo !== undefined) {
        if (rect.dataset.spdrKropkiFo) rect.style.setProperty('fill-opacity', rect.dataset.spdrKropkiFo);
        else rect.style.removeProperty('fill-opacity');
        delete rect.dataset.spdrKropkiFo;
      }
    }
  }
  function fixAllKropkiDots(svg) {
    // Include class-less #overlay/#underlay circles (some authors draw edge dots as
    // bare <rect> circles) alongside the classed dots; isKropkiCircle + the fill /
    // position gates inside fixKropkiDot filter out everything that isn't a dot.
    svg.querySelectorAll('rect.feature-kropki, rect.textbg, #overlay rect, #underlay rect').forEach(function (rect) {
      if (isKropkiCircle(rect)) fixKropkiDot(rect);
    });
  }

  // ── Off-border Kropki-TYPE clue shapes (v3.34.0) ────────────────────────────
  // Pure black/white circles & diamonds that the position gate keeps OUT of
  // fixKropkiDot: quad / clock-face dots (circles at a cell CORNER or CENTRE) and
  // Kropki-cage ratio markers (DIAMONDS = rotate-45 squares). Left to the generic
  // fixes they invert — object-shading paints the black ones grey (#999), label-bg
  // paints the white ones dark — so we claim them here and render them in the
  // Kropki convention instead. object-shading (shouldShadeOverlayRect, objFillSources)
  // and label-bg (fixLabelRect, HT.labelBg) all SKIP isKropkiClueShape, so this is
  // their sole controller (the same foolproof pattern as isKropkiDotRect).
  function isKropkiDiamond(rect) {
    if (rect.tagName !== 'rect') return false;
    if (!/rotate\(\s*45\b/.test(rect.getAttribute('transform') || '')) return false;
    var w = parseFloat(rect.getAttribute('width') || 0), h = parseFloat(rect.getAttribute('height') || 0);
    return w > 0 && Math.abs(w - h) < 1;
  }
  function isKropkiClueShape(rect) {
    if (!rect || rect.tagName !== 'rect') return false;
    var f = (rect.getAttribute('fill') || '').toUpperCase();
    if (f !== '#FFFFFF' && f !== '#000000') return false;          // pure black / white only
    var cs = getGridCellSize() || 64;
    var w = parseFloat(rect.getAttribute('width') || 0);
    // Small only (≤ half a cell): includes kropki-sized clue dots/diamonds (~15–28px
    // on a 64px cell) but EXCLUDES bigger circles — notably digit QUADRUPLES (~38px
    // white corner-circles holding 1–4 digits), which must keep their native look.
    if (!(w > 0 && w <= cs * 0.5)) return false;
    var diamond = isKropkiDiamond(rect);
    var circle  = isKropkiCircle(rect);
    if (!diamond && !circle) return false;
    // A circle ON a border is a real edge dot — fixKropkiDot owns those; only claim
    // OFF-border circles (corners / centres) here. Diamonds are claimed anywhere.
    if (circle && !diamond && isOnCellBorder(rect, cs)) return false;
    // A shape backing a MULTI-character value (e.g. clover "Quadrille" 63u3k65z7e:
    // a small white circle behind a 3–4 digit clue that OVERFLOWS it) is a text
    // background, not a dot/dial. Forcing the disc a solid colour + recolouring the
    // whole string makes the overflow vanish, so leave it to label-bg (darkens the
    // disc) + the native off-white text. Single-char glyphs (a clock dial's ↻/↺, a
    // lone digit) fit the disc and ARE claimed.
    var g = getCenteredKropkiText(rect);
    if (g && g.textContent.trim().length > 1) return false;
    return true;
  }
  // Render one clue shape PRESERVING the author's black/white, with an outline for
  // dark-mode visibility and — if the shape carries a centred glyph (e.g. a clock
  // dial's ↻/↺ arrow) — that glyph recoloured to contrast with its own fill:
  //   • white → white fill + dark outline + DARK glyph
  //   • black → black fill + white outline (so the disc shows on dark) + WHITE glyph
  // The outline RING follows the same per-colour toggles as the on-border dots
  // (kropkiOutlineEnabled / kropkiWhiteOutlineEnabled), drawn via applyKropkiDotRing
  // as the disc's own stroke so it paints under any glyph. This keeps a white dot
  // white and a black dot black, exactly as the puzzle draws them in light mode —
  // we never flip the colour, only add the minimum needed to stay visible on dark.
  function fixKropkiClueShape(rect) {
    var f = (rect.getAttribute('fill') || '').toUpperCase();
    var isBlack = f === '#000000';
    var glyph = getCenteredKropkiText(rect);
    if (isBlack) {
      rect.style.setProperty('fill', '#000000', 'important');
      applyKropkiDotRing(rect, !!settings.kropkiOutlineEnabled, '#ffffff');
      if (glyph) { glyph.setAttribute('data-spdr-kropki-text', '#ffffff'); glyph.style.setProperty('fill', '#ffffff', 'important'); }
    } else {
      rect.style.setProperty('fill', '#ffffff', 'important');
      applyKropkiDotRing(rect, settings.kropkiWhiteOutlineEnabled !== false, '#000000');
      if (glyph) { glyph.setAttribute('data-spdr-kropki-text', '#000000'); glyph.style.setProperty('fill', '#000000', 'important'); }
    }
    rect.style.setProperty('fill-opacity', '1', 'important');
  }
  function fixAllKropkiClueShapes(svg) {
    svg.querySelectorAll('#overlay rect, #underlay rect, rect.textbg').forEach(function (rect) {
      if (isKropkiClueShape(rect)) fixKropkiClueShape(rect);
    });
  }

  function fixKropkiLabel(t) {
    // Keep our injected Kropki labels at their intended colour. The fill is stored
    // in the data-spdr-kropki-label attribute:
    //   '#ffffff'  → white text on a black (2:1 ratio) dot
    //   '#000000'  → black text on a white (consecutive) dot
    //   '1'        → legacy format (pre-v2.64.0) — treat as white
    var color = t.getAttribute('data-spdr-kropki-label') || '#ffffff';
    if (color === '1') color = '#ffffff';
    t.style.setProperty('fill', color, 'important');
  }

  // Returns the grid cell size (px) by parsing path.cell-grid, or 0 if not available.
  // Note: our drawRegionSplitBorders clears the d attribute of path.cell-grid and
  // saves the original in dataset.spdrOrigD. We fall back to that when d is empty.
  function getGridCellSize() {
    var cgPath = document.querySelector('#cell-grids path.cell-grid');
    if (!cgPath) return 0;
    function gcd(a, b) { a = Math.round(a); b = Math.round(b); return b === 0 ? a : gcd(b, a % b); }
    var d = cgPath.getAttribute('d') || '';
    if (!d) d = cgPath.dataset.spdrOrigD || '';
    var nums = d.match(/\d+(?:\.\d+)?/g);
    if (!nums) return 0;
    return nums.map(Number).filter(function (n) { return n > 0.5; }).reduce(gcd, 0) || 0;
  }

  function rebuildKropkiLabels(svg) {
    svg.querySelectorAll('text[data-spdr-kropki-label]').forEach(function (t) { t.remove(); });
    if (!settings.kropkiFixEnabled) return;
    var cs = getGridCellSize();
    svg.querySelectorAll('rect.feature-kropki, rect.textbg, #overlay rect, #underlay rect').forEach(function (rect) {
      if (!isKropkiRect(rect)) return;
      if (!isOnCellBorder(rect, cs)) return;  // only label real edge dots — never quadruples/bulbs/endpoints
      var fill = rect.getAttribute('fill');
      if (!fill) return;
      var fillUC = fill.toUpperCase();
      var isBlack = fillUC === '#000000';
      var isWhite = fillUC === '#FFFFFF';
      var labelText = null, labelFill = null, wantRotate = false;
      if (isBlack && settings.kropkiColonEnabled) {
        labelText  = settings.kropkiBlackLabelText || ':';
        labelFill  = '#ffffff';
        wantRotate = !!settings.kropkiBlackLabelRotate;
      } else if (isWhite && settings.kropkiConsecLabelEnabled) {
        labelText  = settings.kropkiConsecLabelText || '~';
        labelFill  = '#000000';
        wantRotate = !!settings.kropkiConsecLabelRotate;
      }
      if (!labelText) return;
      var x = parseFloat(rect.getAttribute('x') || 0);
      var y = parseFloat(rect.getAttribute('y') || 0);
      var w = parseFloat(rect.getAttribute('width') || 0);
      var h = parseFloat(rect.getAttribute('height') || 0);
      var cx = x + w / 2, cy = y + h / 2;
      // Detect a horizontal border: dot center y is within 25% of cs from a row edge.
      var onHorizBorder = false;
      if (cs > 0) {
        var yMod = ((cy % cs) + cs) % cs;
        onHorizBorder = yMod < cs * 0.25 || yMod > cs * 0.75;
      }
      var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', cx);
      t.setAttribute('y', cy);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('dominant-baseline', 'alphabetic');  // enforced inline in centerKropkiLabel; see there
      var lblSize = parseFloat(settings.kropkiLabelSize); if (!isFinite(lblSize) || lblSize <= 0) lblSize = 16;
      t.setAttribute('font-size', lblSize);
      t.setAttribute('font-weight', settings.kropkiLabelWeight || '600');
      t.setAttribute('pointer-events', 'none');
      t.setAttribute('data-spdr-kropki-label', labelFill);  // store intended fill colour
      t.textContent = labelText;
      if (wantRotate && onHorizBorder) {
        t.setAttribute('transform', 'rotate(90,' + cx + ',' + cy + ')');
      }
      fixKropkiLabel(t);
      rect.parentNode.insertBefore(t, rect.nextSibling);
      centerKropkiLabel(t, cx, cy);
    });
  }

  // Center a Kropki label's *ink* on the circle center (cx, cy), identically across
  // browser ENGINES and across dots. Two things make that hard, each with its own fix:
  //
  // 1) BASELINE (engine consistency). text-anchor:middle + a baseline center the glyph's
  //    LINE BOX, not its ink. `dominant-baseline:middle/central` also need a font-metric
  //    (x-height / em-center) computation that Blink and Gecko do differently -- invisible
  //    vertically when upright, but rotate(90,cx,cy) turns it into a horizontal shift of
  //    the rotated glyph in Gecko (the v2.181 bug). Fix: anchor to the ALPHABETIC baseline
  //    (forced inline-!important, beating SudokuPad's `middle` CSS rule), which every
  //    engine places identically with no metric math. A glyph's ink height above it is a
  //    pure font-outline property, so one fraction per glyph centers it everywhere.
  //
  // 2) HINTING (per-dot + engine consistency). At the small label size (~16px) the font is
  //    HINTED -- outlines grid-fitted toward whole device pixels -- which bends the ink
  //    ~0.5px sideways and ~0.7px down off its true geometry, by an amount that depends on
  //    each dot's sub-pixel position (so every dot drifts differently) AND on the engine's
  //    hinter (so Blink != Gecko). The vector circle behind it is NOT hinted, so the glyph
  //    slides off-center. Fix: `text-rendering:geometricPrecision` (forced inline) makes
  //    the live SVG pipeline render the true unhinted outline -- the same on every dot and
  //    every engine. (NB: this is honored when the inline SVG is painted in the document;
  //    an <img>-decoded SVG ignores it, so don't "verify" the effect that way.)
  //
  // The fixes combine: with geometricPrecision the render IS the geometry, so the nudges
  // are calibrated AS the geometry -- each glyph's ink-center height above the alphabetic
  // baseline, measured via canvas at LARGE size (where hinting vanishes), as a fraction of
  // font-size. dx is ~0 for these (the hinted left-shift is an artifact geometricPrecision
  // removes). Placing the anchor at cy+dy*fs drops the baseline below center so the ink
  // lands on center. Applied in the UNROTATED frame, so rotate(90,cx,cy) keeps centered ink
  // centered. Synchronous, no cache. Tweak a value if a glyph looks off-center.
  var KROPKI_INK_NUDGE_DEFAULT = { dx: 0, dy: 0.35 };  // generic: unknown-glyph ink ~0.35 em up
  var KROPKI_INK_NUDGE = {
    ':': { dx: 0, dy: 0.275 },  // colon ink-center 0.275*fontSize above the alphabetic baseline
    '~': { dx: 0, dy: 0.324 }   // tilde ink-center 0.324*fontSize above the alphabetic baseline
  };
  function centerKropkiLabel(t, cx, cy) {
    // Engine-stable rendering, so the calibrated nudge below holds in every browser:
    //  - pin the alphabetic baseline (inline !important beats SudokuPad's `dominant-
    //    baseline:middle` CSS, which a presentation attribute can't);
    //  - force geometricPrecision so the glyph renders its true unhinted outline (no
    //    per-dot / per-engine pixel snapping).
    t.style.setProperty('dominant-baseline', 'alphabetic', 'important');
    t.style.setProperty('text-rendering', 'geometricPrecision', 'important');
    var fs = parseFloat(t.getAttribute('font-size')) || 16;
    var n = KROPKI_INK_NUDGE[(t.textContent || '').trim()] || KROPKI_INK_NUDGE_DEFAULT;
    t.setAttribute('x', cx + n.dx * fs);
    t.setAttribute('y', cy + n.dy * fs);
  }

  function fixCornerText(el) {
    if (!settings.cornerEnabled) { el.style.removeProperty('fill'); return; }
    var isC = el.classList.contains('conflict');
    var color = isC ? settings.cornerInvalidColor   : settings.cornerValidColor;
    var op    = isC ? settings.cornerInvalidOpacity : settings.cornerValidOpacity;
    applyInlineFill(el, hexToRgba(color, op));
  }
  function fixAllCornerTexts(cp) {
    cp.querySelectorAll('text').forEach(fixCornerText);
  }

  // ── Part 4: cage label background rects ───────────────────────────────────
  // Note: white-fill rects are only treated as labels when they're NOT inside
  // #underlay. Underlay rects are shape backgrounds, not text labels.
  // The white arm is a case-insensitive PREFIX (`^="#ffffff"`) so it also catches
  // TRANSLUCENT white (`#ffffff80`, `#ffffffXX`), not just opaque `#FFFFFF`. Those
  // are between/lockout-line endpoint circles; DarkReader used to darken them, so
  // under native dark mode nothing did and they rendered light-gray (R8C5/R9C7 on
  // the test puzzle). fixLabelRect's internal guards still skip transparent (a===0),
  // saturated, and Kropki dots — colored fills like #FF0000/#FFA575 don't share the
  // #ffffff prefix, so only white-at-any-alpha is newly included.
  var LABEL_RECT_SEL = 'rect.cage-label, rect.textbg, rect[fill^="#ffffff" i]:not(#underlay *), rect[fill="white" i]:not(#underlay *)';

  function fixLabelRect(rect) {
    // A label background is white/near-white (cage sums, little-killer clues, XV /
    // operator boxes). A SATURATED fill means an author-coloured cosmetic shape
    // (e.g. a light-blue circle/box behind a digit) — leave its colour to Object
    // shading (shouldShadeOverlayRect now shades coloured textbg); never flatten it
    // to the label-bg colour here. (We deliberately do NOT try to keep bare white
    // cosmetic shapes white — see LESSONS "Don't force-keep author white".)
    // fill="none" (or a transparent fill) is a deliberately INVISIBLE box — authors
    // use a textbg rect purely to position a label (e.g. a little-killer "12" sitting
    // over an arrow outside the grid). There is no background to darken; painting it
    // our label-bg colour turns an invisible anchor into an opaque box that covers the
    // arrow beneath it — so skip them entirely. (Distinct from the white/grey label
    // boxes below, which DO need darkening.)
    var fillAttr = (rect.getAttribute('fill') || '').trim().toLowerCase();
    var fc = parseColor(fillAttr);
    if (fillAttr === 'none' || (fc && fc.a === 0)) return;
    if (fc && fc.a !== 0 && !isGrayColor(fc)) return;
    // A Kropki dot (incl. a class-less white border circle that happens to match the
    // white-fill arm of LABEL_RECT_SEL) is owned by the Kropki fix — never paint it
    // the label-bg colour, or it goes dark-on-dark. (Issue: clover's "Diamond Ring".)
    if (isKropkiDotRect(rect)) return;
    if (isKropkiClueShape(rect)) return;   // off-border dot / diamond — owned by the Kropki clue-shape fix
    if (settings.labelBgEnabled) {
      // Preserve the rect's OWN authored alpha so deliberately-translucent shapes
      // stay see-through. Opaque label boxes (#FFFFFF, alpha 1) are unaffected;
      // translucent endpoint discs like the between/lockout-line bulbs (#ffffff80,
      // alpha 0.5) keep that 0.5 so the line reads through them — matching how
      // DarkReader darkens a fill while preserving its alpha. We multiply rather
      // than replace so labelBgOpacity still scales these proportionally.
      var srcA = (fc && fc.a != null) ? fc.a : 1;
      var bg = hexToRgba(settings.labelBgColor, settings.labelBgOpacity * srcA);
      rect.style.setProperty('fill', bg, 'important');
    } else {
      // Drop our inline fill so the native dark theme repaints the label box.
      rect.style.removeProperty('fill');
    }
  }
  function fixAllLabelRects(svg) { svg.querySelectorAll(LABEL_RECT_SEL).forEach(fixLabelRect); }

  function startLabelRectPatch() {
    var svg = document.getElementById('svgrenderer');
    if (!svg) return;
    fixAllLabelRects(svg);
    fixAllUnderlays(svg);
    fixAllCagePaths(svg);
    fixAllLines(svg);
    fixAllGivens(svg);
    fixAllUserDigits(svg);
    fixAllOverlayMarkerText(svg);
    fixAllKropkiDots(svg);
    fixAllKropkiClueShapes(svg);
    rebuildKropkiLabels(svg);
    startCageBoxPatch(svg);
    startSelectionBorderObserver();
    scheduleAutoShade();   // auto-enable Shaded mode if this puzzle has extra regions
    // Re-apply our fixes when SudokuPad re-renders the board (puzzle load, fog
    // reveal, etc. — all add fresh SVG nodes). We only need to watch childList:
    // with DarkReader locked out, nothing mutates our inline colours in place.
    new MutationObserver(function (mutations) {
      var needsFullScan = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          // Ignore childList mutations caused by our own label insertions to avoid
          // an infinite loop (rebuildKropkiLabels inserts nodes → observer fires →
          // rebuildKropkiLabels again → ...).
          for (var j = 0; j < m.addedNodes.length; j++) {
            var node = m.addedNodes[j];
            if (node.nodeType !== 1 || !node.getAttribute('data-spdr-kropki-label')) {
              needsFullScan = true; break;
            }
          }
        }
      }
      if (needsFullScan) { fixAllLabelRects(svg); fixAllUnderlays(svg); assignExtraRegionColors(svg); fixAllCagePaths(svg); fixAllLines(svg); fixAllGivens(svg); fixAllUserDigits(svg); fixAllOverlayMarkerText(svg); fixAllKropkiDots(svg); fixAllKropkiClueShapes(svg); rebuildKropkiLabels(svg); scheduleAutoShade(); }
    }).observe(svg, { childList: true, subtree: true });
  }

  function waitForDRAndSVG() {
    if (isDarkMode() && document.getElementById('svgrenderer')) { startLabelRectPatch(); return; }
    var obs = new MutationObserver(function () {
      if (isDarkMode() && document.getElementById('svgrenderer')) { obs.disconnect(); startLabelRectPatch(); }
    });
    // Watch DR's scheme attr (legacy) AND the body class (our dark substrate lands
    // there once our top block applies the .spdr-dark class).
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-darkreader-scheme'] });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // ── Part 4b: region borders ───────────────────────────────────────────────
  // Standard puzzles use path.cage-box for region outlines. Some irregular-
  // region puzzles (e.g. Surplus Sudoku) use plain classless <path> elements
  // instead. Both live in #cell-grids. We target all paths there except
  // path.cell-grid (the thin cell-divider grid lines).
  //
  // When our stroke/width is NOT being applied we drop any inline stroke so the
  // native cage-box outline (FROZEN_DARK_CSS) shows.

  function isCageBoxPath(el) {
    return el.tagName === 'path' && !!el.closest('#cell-grids') && !el.classList.contains('cell-grid');
  }

  function fixCageBox(el) {
    var centerActive = settings.regionBorderCenterEnabled;
    var multiActive  = settings.regionBorderMultiEnabled;

    // White-stroked cell-grid paths are author "grid-line erasers": a 3px white
    // stroke laid over a grid line to HIDE it (invisible white-on-white in light
    // mode — used for irregular outer shapes / merged cells, e.g. Gattai puzzles).
    // They are NOT the dark 3x3 box outlines this function was written for, so the
    // normal logic is wrong both ways (suppressing reveals the line the author hid).
    // Drop any inline stroke so FROZEN_DARK_CSS repaints them the dark background
    // ([stroke="#FFFFFF"]→var(--dm-black)), keeping them erasing the grid line.
    var sc = parseColor(el.getAttribute('stroke'));
    if (sc && sc.a !== 0 && sc.r >= 240 && sc.g >= 240 && sc.b >= 240) {
      el.style.removeProperty('stroke');
      el.style.removeProperty('stroke-width');          // keep the author's native width
      return;
    }

    if (centerActive || multiActive) {
      // Center border is drawn as SVG clones in mainGroup (z=0), and multi-color
      // borders are drawn as rect strips in mainGroup — hide the original cage-box
      // stroke so it doesn't double-render above #underlay elements.
      el.style.setProperty('stroke', 'none', 'important');
      el.style.setProperty('stroke-width', '0', 'important');
    } else {
      // Neither border type is active — drop our inline stroke so the native
      // cage-box outline (FROZEN_DARK_CSS) shows.
      el.style.removeProperty('stroke');
      el.style.removeProperty('stroke-width');
    }
  }
  function fixAllCageBoxes(svg) { svg.querySelectorAll('#cell-grids path:not(.cell-grid)').forEach(fixCageBox); }
  function startCageBoxPatch(svg) {
    var cellGrids = document.getElementById('cell-grids');
    if (!cellGrids) return;
    fixAllCageBoxes(svg);
    drawRegionSplitBorders(svg);
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes' && m.attributeName === 'style') {
          if (isCageBoxPath(m.target)) fixCageBox(m.target);
        } else if (m.type === 'childList' && m.addedNodes.length > 0) {
          // Ignore mutations caused by our own injected stripe group to avoid loops.
          var isOwnNode = true;
          for (var j = 0; j < m.addedNodes.length; j++) {
            var nd = m.addedNodes[j];
            if (nd.nodeType !== 1 || !nd.getAttribute('data-spdr-region-split')) {
              isOwnNode = false; break;
            }
          }
          if (!isOwnNode) { fixAllCageBoxes(svg); drawRegionSplitBorders(svg); }
        }
      }
    }).observe(cellGrids, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  }

  // ── Region 4-color split borders ─────────────────────────────────────────
  // Derives regions purely from the SVG border paths in #cell-grids (no
  // dependency on Framework internals). Parses the path d-attributes into
  // individual cell-edge segments, then BFS flood-fills the grid treating
  // those edges as walls to find each connected region.
  //
  // Then applies greedy 4-coloring of the region adjacency graph and draws
  // non-overlapping filled rect borders on each side of every region boundary —
  // one in each neighboring region's color — with no gaps and no overlaps.

  // ── Logical-region (disjoint-subset) support ──────────────────────────────
  // Some puzzles define a sudoku region whose cells are NOT contiguous (e.g.
  // clover's "Scattered", https://sudokupad.app/2xjf6aw4m2 — one region is 9
  // single cells spread across the grid). They are ONE region for digit logic,
  // so all the pieces should share ONE colour. Geometry alone can't know this
  // (the pieces don't touch), so we read the puzzle model: SudokuPad exposes the
  // resolved regions as `app.puzzle.currentPuzzle.cages` entries with
  // `type === 'region'` and a comma-separated RC-notation `cells` string
  // (1-indexed, e.g. "r2c2,r5c8,..."). We cache a { 'r,c': logicalId } map keyed
  // by the URL path, refresh it asynchronously (getApp() is async; the render
  // path is sync), and repaint once when it lands. When unavailable (normal
  // sudoku has no explicit region cages, or model not ready) → null, and region
  // colouring falls back to pure geometry exactly as before.
  var _modelRegionCache   = { key: null, map: null };
  var _modelRegionPending = false;

  function buildModelRegionMap(app) {
    try {
      var cp = app && app.puzzle && app.puzzle.currentPuzzle;
      if (!cp || !Array.isArray(cp.cages)) return null;
      var regs = cp.cages.filter(function (c) {
        return c && c.type === 'region' && typeof c.cells === 'string' && c.cells;
      });
      if (regs.length < 2) return null;   // no explicit regions → use geometry
      var map = {};
      regs.forEach(function (cage, idx) {
        cage.cells.split(',').forEach(function (rc) {
          var m = /r(\d+)c(\d+)/i.exec(rc.trim());
          if (m) map[(parseInt(m[1], 10) - 1) + ',' + (parseInt(m[2], 10) - 1)] = idx;
        });
      });
      return map;
    } catch (e) { return null; }
  }

  // Synchronous accessor for the current puzzle's logical-region map. Returns the
  // cached map (possibly null = "known to have none") when fresh, else kicks off
  // an async refresh and returns null for now; the refresh repaints when done.
  function modelRegionCacheKey() { return location.pathname + location.search; }
  function getModelRegionMap() {
    var key = modelRegionCacheKey();
    if (_modelRegionCache.key === key) return _modelRegionCache.map;
    if (!_modelRegionPending && typeof Framework !== 'undefined' && Framework.getApp) {
      _modelRegionPending = true;
      Promise.resolve(Framework.getApp()).then(function (app) {
        _modelRegionCache   = { key: modelRegionCacheKey(), map: buildModelRegionMap(app) };
        _modelRegionPending = false;
        var svg = document.getElementById('svgrenderer');
        if (svg) drawRegionSplitBorders(svg);   // repaint with the now-known map
      }).catch(function () { _modelRegionPending = false; });
    }
    return null;
  }

  // ── Shaded "extra regions" drawn as grey #underlay cells (recolour) ───────────
  // Shaded mode normally clones #cages path.cage-extraregion. But an extra region
  // can ALSO be authored as a hidden, sum-less, unique cage (the Extra-Region tool
  // or the hidden-killer trick), which SudokuPad renders as plain grey #underlay
  // rects with NO cage-extraregion path to clone (e.g. "We Live Here"
  // https://sudokupad.app/zax289niwv — 4 hidden unique cages drawn as grey cells).
  //
  // Two sources, on purpose (this is the v3.15→v3.16→v3.17 lesson):
  //   • DETECTION ("does this puzzle have such regions?") is PURELY DOM — the grey
  //     underlay rects themselves. puzzleHasShadedRegions() runs early/often during
  //     SudokuPad's init, so it must stay Framework-free.
  //   • GROUPING (which cell → which region, so two regions that TOUCH get DIFFERENT
  //     colours) reads the puzzle MODEL, but SYNCHRONOUSLY via the pure getter
  //     Framework.app (`get(){ return __app; }` — zero side effects), NEVER via
  //     Framework.getApp()/promises. v3.15's init break was the async
  //     `.then(applySettings)` re-entering the pipeline mid-load, NOT the model read
  //     itself; a guarded sync read returns null before the app exists (→ flood-fill
  //     fallback) and the real regions after. v3.16 over-corrected to DOM-only,
  //     which can't separate two distinct regions that touch (flood-fill merges
  //     them into one colour) — the bug this restores the fix for.
  //
  // The grey rect detection (below): an #underlay rect whose ORIGINAL attribute fill
  // is grayscale (our object-shading overwrites the inline style, not the attribute),
  // non-white, ~a whole cell, defines a shaded cell. Recolour then hits every grey
  // rect (full cells AND inset border strips) whose centre lands in a mapped cell.
  // Cached by URL + underlay-rect count so the per-rect hot path is O(1).
  //
  // What QUALIFIES a region for recolour (v3.21 — was "any hidden unique cage that
  // overlaps a grey cell", which wrongly grabbed e.g. a hidden-unique MAIN DIAGONAL
  // and recoloured stray objects sitting in its cells — pbwqsppuho). A region is
  // recoloured ONLY when it is a deliberately-shaded full no-repeat region:
  //   1. SIZE — exactly `settings.digitSet.length` cells (the count of digits used
  //      in the puzzle, user-confirmed/scanned). Drops sub-size cages (3-cell
  //      killers, partial regions) — a cage is not a colourable region. NOT a
  //      contiguity check: a deliberately-shaded NON-contiguous full region (e.g. a
  //      staircase "these 9 cells hold 1-9", clover-style) is valid and IS coloured.
  //   2. FULLY + CONSISTENTLY SHADED — EVERY cell carries a shading rect of one
  //      consistent colour. A region only partly shaded (the diagonal: 2/9 stray
  //      grey cells) is not a deliberate shaded region → skipped. (This — not
  //      contiguity — is what excludes the diagonal: it's barely shaded.)
  //   3. GREY only — if that consistent colour is a REAL colour (red/blue/…), leave
  //      the author's shading untouched: the author may use colour to distinguish
  //      regions, and recolouring would erase that meaning. Grey regions (hard to
  //      see in dark mode) are the ones we recolour to the palette.
  // Model regions still drive GROUPING (so two qualifying regions that touch get
  // different colours); the grey flood-fill fallback (model not ready yet) applies
  // the same size rule per connected component.
  var _domShadedCache  = { key: null, count: -1, map: null, final: false };
  var _domShadedNudged = null;   // URL we've already scheduled a model-upgrade retry for

  // Hidden / sum-less unique cages = invisible "must contain 1-9" regions. Read
  // SYNCHRONOUSLY from the already-parsed model (Framework.app is a side-effect-free
  // getter). Returns an array of [r,c] cell lists (0-indexed), or null before the app
  // is ready / on hosts without Framework.app / when the puzzle has none.
  function readModelExtraRegions() {
    try {
      var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
        ? Framework.app.puzzle.currentPuzzle : null;
      if (!cp || !Array.isArray(cp.cages)) return null;
      // An "extra region" = any cage with conflict-checking (unique:true) that is NOT
      // one of the native sudoku constraints (the 9 boxes are type 'region', rows/cols
      // are type 'rowcol') and that spans exactly one full no-repeat region — i.e. its
      // cell count equals the number of digits in play ("Digit Set for this puzzle").
      // This deliberately simple size test catches extra regions no matter HOW they
      // are authored or drawn: style:'extraregion', hidden sum-less cages drawn as grey
      // cells (We Live Here, zax289niwv), AND sum-less unique cages drawn only as dashed
      // killer outlines with no shading at all (a Windoku's four windows, 5krkgmjq7q).
      var want = (settings.digitSet && settings.digitSet.length)
        ? settings.digitSet.length : detectGridSize();
      if (!want || want < 2) return null;
      var regions = [];
      cp.cages.forEach(function (c) {
        if (!c || c.unique !== true || c.type === 'region' || c.type === 'rowcol') return;
        var cells = [];
        String(c.cells || '').split(',').forEach(function (rc) {
          var m = /r(\d+)c(\d+)/i.exec(rc.trim());
          if (m) cells.push([parseInt(m[1], 10) - 1, parseInt(m[2], 10) - 1]);
        });
        if (cells.length === want) regions.push(cells);
      });
      return regions.length ? regions : null;
    } catch (e) { return null; }
  }

  function computeDomShadedRegionMap(svg, rects) {
   try {
    var cs = getGridCellSize();
    var N  = detectGridSize();
    if (!cs || cs < 4 || !N || N < 2) return null;

    // Per-cell author shading colour, read from the ATTRIBUTE fill (our object-
    // shading only sets the inline STYLE, so the attribute keeps the original).
    // Only ~full-cell rects define a cell's shade; inset border strips are ignored.
    // shade['r,c'] = { r,g,b, gray }.
    var shade = {}, any = false;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      var c = parseColor(r.getAttribute('fill') || '');
      if (!c || c.a === 0) continue;
      if (c.r >= 240 && c.g >= 240 && c.b >= 240) continue;   // skip white/near-white
      var w = parseFloat(r.getAttribute('width')), h = parseFloat(r.getAttribute('height'));
      var x = parseFloat(r.getAttribute('x')),     y = parseFloat(r.getAttribute('y'));
      if (!isFinite(w) || !isFinite(h) || !isFinite(x) || !isFinite(y)) continue;
      if (w < cs * 0.75 || h < cs * 0.75) continue;           // only ~full-cell rects define a cell's shade
      var cc = Math.floor((x + w / 2) / cs), rr = Math.floor((y + h / 2) / cs);
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
      var k = rr + ',' + cc;
      if (!shade[k]) { shade[k] = { r: c.r, g: c.g, b: c.b, gray: isGrayColor(c) }; any = true; }
    }
    if (!any) return null;

    // Target region size = number of digits used in the puzzle (rule 1).
    var want = (settings.digitSet && settings.digitSet.length) ? settings.digitSet.length : N;

    // Rules 2+3: every cell shaded with one consistent GREY colour (≤24/channel
    // spread). Returns false if any cell is unshaded, or the shade is a real colour.
    function isFullyGreyShaded(cells) {
      var base = null;
      for (var j = 0; j < cells.length; j++) {
        var sc = shade[cells[j][0] + ',' + cells[j][1]];
        if (!sc || !sc.gray) return false;
        if (!base) base = sc;
        else if (Math.abs(sc.r - base.r) > 24 || Math.abs(sc.g - base.g) > 24 || Math.abs(sc.b - base.b) > 24) return false;
      }
      return true;
    }

    // Prefer model regions so two distinct logical regions that TOUCH get different
    // colours (flood-fill can't tell them apart). Each model region must pass all
    // four rules. Fall back to a grey flood-fill (same size rule per component) when
    // the model isn't readable yet (getDomShadedRegionMap schedules an upgrade retry).
    var regions = [], fromModel = false;
    var modelRegions = readModelExtraRegions();
    if (modelRegions) {
      fromModel = true;
      modelRegions.forEach(function (cells) {
        if (cells.length === want && isFullyGreyShaded(cells)) regions.push(cells);
      });
    } else {
      var grey = {}, seen = {};
      Object.keys(shade).forEach(function (k) { if (shade[k].gray) grey[k] = true; });
      Object.keys(grey).forEach(function (k) {
        if (seen[k]) return;
        var start = k.split(',').map(Number);
        var cells = [], queue = [start]; seen[k] = true;
        while (queue.length) {
          var cur = queue.shift(); cells.push(cur);
          [[cur[0]-1,cur[1]],[cur[0]+1,cur[1]],[cur[0],cur[1]-1],[cur[0],cur[1]+1]].forEach(function (nb) {
            var nk = nb[0] + ',' + nb[1];
            if (grey[nk] && !seen[nk]) { seen[nk] = true; queue.push(nb); }
          });
        }
        if (cells.length === want) regions.push(cells);
      });
    }

    if (!regions.length) return { map: null, fromModel: fromModel };   // nothing qualifies (still cacheable once model is readable)

    var colors = colourShadedRegions(regions);   // max distinct colours (shaded-region policy)
    var map = {};
    regions.forEach(function (cells, i) {
      var idx = (colors[i] != null) ? colors[i] : 0;
      cells.forEach(function (rc) { map[rc[0] + ',' + rc[1]] = idx; });
    });
    return { map: map, fromModel: fromModel };
   } catch (e) { return null; }   // never let region detection abort the paint path
  }

  // Cached accessor (cell → palette idx, or null). DOM detection is Framework-free;
  // model grouping is a guarded SYNCHRONOUS read (no getApp/promises). Safe from the
  // hot paint path and from puzzleHasShadedRegions.
  function getDomShadedRegionMap() {
    var svg = document.getElementById('svgrenderer');
    if (!svg) return null;
    var rects = svg.querySelectorAll('#underlay rect');
    var key = modelRegionCacheKey(), count = rects.length;
    if (_domShadedCache.key === key && _domShadedCache.count === count && _domShadedCache.final)
      return _domShadedCache.map;
    var res = computeDomShadedRegionMap(svg, rects);   // null | { map, fromModel }
    var modelReadable = (typeof Framework !== 'undefined' && Framework.app
      && Framework.app.puzzle && !!Framework.app.puzzle.currentPuzzle);
    // Final (cacheable) once we know the answer won't improve: no shaded regions,
    // a model-grouped result, or the model is readable but didn't match (flood-fill
    // is then the best we'll do). Only a flood-fill taken because the model wasn't
    // ready yet stays non-final → recomputed, plus a one-shot re-apply to upgrade.
    var final = (res === null) || res.fromModel === true || modelReadable;
    _domShadedCache = { key: key, count: count, map: res ? res.map : null, final: final };
    if (!final && _domShadedNudged !== key) {
      _domShadedNudged = key;
      setTimeout(function () {
        _domShadedCache = { key: null, count: -1, map: null, final: false };
        var s = document.getElementById('svgrenderer');
        if (s) fixAllUnderlays(s);
      }, 250);
    }
    return _domShadedCache.map;
  }

  // Model-defined extra regions that have NO visual shading to recolour — neither a
  // grey #underlay rect nor a cage-extraregion path (e.g. a Windoku whose windows are
  // sum-less unique cages drawn only as dashed killer outlines, 5krkgmjq7q). Pure
  // model read (readModelExtraRegions, via the safe synchronous Framework.app getter),
  // 4-coloured so two regions that touch differ. Returns cell → palette idx, or null.
  // Cached per puzzle once the model is readable (null before that → a later paint,
  // e.g. getModelRegionMap's async repaint, retries). This drives drawRegionSplitBorders'
  // model-shading pass; the grey-rect path (getDomShadedRegionMap) is unaffected.
  var _modelShadedCache = { key: null, map: null };
  function getModelShadedRegionMap() {
    var key = modelRegionCacheKey();
    if (_modelShadedCache.key === key) return _modelShadedCache.map;
    var regions = readModelExtraRegions();
    var map = null;
    if (regions && regions.length) {
      var colors = colourShadedRegions(regions);
      map = {};
      regions.forEach(function (cells, i) {
        var idx = (colors[i] != null && colors[i] >= 0) ? colors[i] : 0;
        cells.forEach(function (rc) { map[rc[0] + ',' + rc[1]] = idx; });
      });
    }
    var modelReadable = (typeof Framework !== 'undefined' && Framework.app
      && Framework.app.puzzle && !!Framework.app.puzzle.currentPuzzle);
    if (modelReadable) _modelShadedCache = { key: key, map: map };
    return map;
  }

  // ── Auto-enable Shaded mode on puzzles that have extra regions ───────────────
  // When a puzzle has extra regions, turn ON the Easy Shade button's first option
  // (Shaded) automatically so the regions are coloured without a manual click. The
  // change is in MEMORY only — never persisted: storage keeps the user's own saved
  // preference, and the effective state is recomputed fresh per puzzle as
  // "has extra regions ? on : saved preference", so a puzzle WITHOUT extra regions
  // falls back to that saved value and the auto-on never leaks onto ordinary puzzles.
  // Decided once per puzzle (keyed by URL); afterwards the user can toggle it off and
  // it stays off (the per-key guard stops any re-fire on the same puzzle).
  var _autoShadePollKey = null;
  function applyAutoShade() {
    var modelReadable = (typeof Framework !== 'undefined' && Framework.app
      && Framework.app.puzzle && !!Framework.app.puzzle.currentPuzzle);
    if (!modelReadable) return false;             // wait until detection is trustworthy
    var savedShaded = !!loadSettings().shadedRegionColorEnabled;
    var want = puzzleHasShadedRegions() ? true : savedShaded;
    if (settings.shadedRegionColorEnabled !== want) {
      settings.shadedRegionColorEnabled = want;   // in-memory only — do NOT saveSettings
      applySettings();
      if (controlSyncers['shadedRegionColorEnabled']) controlSyncers['shadedRegionColorEnabled']();
    }
    return true;
  }
  function scheduleAutoShade() {
    var key = modelRegionCacheKey();
    if (_autoShadePollKey === key) return;        // already decided / polling this puzzle
    _autoShadePollKey = key;
    var tries = 0;
    (function poll() {
      if (modelRegionCacheKey() !== key) return;  // navigated away — its own schedule takes over
      if (applyAutoShade()) return;               // model ready, decision made
      if (++tries < 40) setTimeout(poll, 150);    // else wait up to ~6s for the model to load
    })();
  }

  // Map each geometric region (connected cell group) to a logical group id. With
  // a model map, geometric pieces sharing the same logical region id collapse to
  // one group (so disjoint pieces colour alike); without it, identity (each piece
  // its own group, = original behaviour).
  function buildRegionGroups(regions, modelMap) {
    var n = regions.length;
    var groupOf = new Array(n);
    if (!modelMap) { for (var i = 0; i < n; i++) groupOf[i] = i; return { groupOf: groupOf, numGroups: n }; }
    var keyToIdx = {}, G = 0;
    for (var i = 0; i < n; i++) {
      // Dominant model id among this geometric region's cells.
      var counts = {}, best = null, bestCount = -1;
      for (var j = 0; j < regions[i].length; j++) {
        var rc = regions[i][j], mid = modelMap[rc[0] + ',' + rc[1]];
        if (mid === undefined) continue;
        counts[mid] = (counts[mid] || 0) + 1;
        if (counts[mid] > bestCount) { bestCount = counts[mid]; best = mid; }
      }
      var key = (best !== null) ? ('m' + best) : ('g' + i);   // no model info → own group
      if (keyToIdx[key] === undefined) keyToIdx[key] = G++;
      groupOf[i] = keyToIdx[key];
    }
    return { groupOf: groupOf, numGroups: G };
  }

  // 4-colour the regions. Colours are assigned per logical GROUP (so disjoint
  // pieces of one region match) and returned per geometric region. groupOf maps
  // geometric-region index → group index; omit for identity (each region alone).
  function computeRegion4Colors(regions, groupOf, numGroups) {
    var n = regions.length;
    if (!groupOf) { groupOf = []; for (var gi = 0; gi < n; gi++) groupOf.push(gi); numGroups = n; }

    // Adjacency between GROUPS (two groups touch if any of their cells are
    // orthogonally adjacent across the group boundary).
    var cellGroup = {};
    regions.forEach(function (cells, ri) {
      var g = groupOf[ri];
      cells.forEach(function (rc) { cellGroup[rc[0] + ',' + rc[1]] = g; });
    });
    var adj = [];
    for (var i = 0; i < numGroups; i++) adj.push(new Set());
    regions.forEach(function (cells, ri) {
      var g = groupOf[ri];
      cells.forEach(function (rc) {
        var r = rc[0], c = rc[1];
        [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function (nb) {
          var g2 = cellGroup[nb[0] + ',' + nb[1]];
          if (g2 !== undefined && g2 !== g) adj[g].add(g2);
        });
      });
    });

    // Which groups are DISJOINT (a logical region whose cells form >1 orthogonally
    // connected component — the scattered/disjoint-subset case). We want these
    // pinned to the LAST palette colour (index 3) so the common regions keep the
    // earlier colours: red (0) most common, then blue (1), then green (2), with the
    // scattered region taking orange (3). Counting components from the cells (not
    // the geo split) is the robust test for "appears as separate areas".
    var groupCells = [];
    for (var i = 0; i < numGroups; i++) groupCells.push([]);
    regions.forEach(function (cells, ri) {
      var g = groupOf[ri];
      cells.forEach(function (rc) { groupCells[g].push(rc); });
    });
    var pinned = new Array(numGroups).fill(-1), anyDisjoint = false;
    for (var g = 0; g < numGroups; g++) {
      if (countComponents(groupCells[g]) > 1) { pinned[g] = 3; anyDisjoint = true; }
    }

    // For ordinary (connected) regions the graph is planar and the four-colour
    // theorem guarantees a proper 4-colouring. Forcing a DISCONNECTED region to a
    // single group — and further pinning it to colour 3 — can in theory exceed 4,
    // so we degrade in priority order:
    //   1. grouped + disjoint pinned to colour 3 (the desired look),
    //   2. grouped, unpinned (disjoint still one colour, just maybe not orange),
    //   3. ungrouped geometry colouring (always 4-colourable; clash-free).
    // Plain greedy alone never suffices anyway: it can spill to a 5th colour
    // (index 4) → past the 4-entry palette → undefined fill → black borders.
    var groupColors = anyDisjoint ? colourGraph(numGroups, adj, pinned) : null;
    if (!groupColors) groupColors = colourGraph(numGroups, adj, null);
    if (!groupColors && groupOf.some(function (g, i) { return g !== i; })) {
      return computeRegion4Colors(regions);   // grouped impossible → geometry only
    }
    if (!groupColors) {
      // Identity grouping that still failed (shouldn't happen for planar input):
      // clamp so nothing renders black.
      groupColors = new Array(numGroups).fill(0);
    }
    return regions.map(function (_, ri) { return groupColors[groupOf[ri]]; });
  }

  // Number of orthogonally connected components in a list of [r,c] cells.
  function countComponents(cells) {
    if (cells.length <= 1) return cells.length;
    var inSet = {};
    cells.forEach(function (rc) { inSet[rc[0] + ',' + rc[1]] = true; });
    var seen = {}, comps = 0;
    cells.forEach(function (rc) {
      var key0 = rc[0] + ',' + rc[1];
      if (seen[key0]) return;
      comps++;
      var stack = [rc];
      while (stack.length) {
        var cur = stack.pop(), k = cur[0] + ',' + cur[1];
        if (seen[k]) continue;
        seen[k] = true;
        var r = cur[0], c = cur[1];
        [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function (nb) {
          var nk = nb[0] + ',' + nb[1];
          if (inSet[nk] && !seen[nk]) stack.push(nb);
        });
      }
    });
    return comps;
  }

  // Greedy proper colouring that SPREADS across all four palette colours, used ONLY
  // for SHADED regions (Easy Shade "Shaded" mode — `computeDomShadedRegionMap` and
  // `assignExtraRegionColors`). NOT for region borders / region fill: those keep the
  // minimise-then-pin-disjoint-orange policy in `computeRegion4Colors` above. Policy:
  // ≤4 regions each get their OWN colour; >4 spread across all four, repeating only
  // across non-touching regions. Process highest-degree first; each takes the allowed
  // colour (not used by an already-coloured neighbour) that is currently least-used
  // overall (ties → lowest index). Returns a proper colour array, or null if some
  // node has all four colours blocked (≥5 mutually adjacent — non-planar; caller
  // falls back to colourGraph backtracking).
  function colourSpread(n, adj) {
    var order = []; for (var i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return adj[b].size - adj[a].size; });
    var colors = new Array(n).fill(-1), usage = [0, 0, 0, 0];
    for (var oi = 0; oi < order.length; oi++) {
      var v = order[oi], blocked = {};
      adj[v].forEach(function (j) { if (colors[j] >= 0) blocked[colors[j]] = true; });
      var pick = -1, pickUse = Infinity;
      for (var k = 0; k < 4; k++) { if (blocked[k]) continue; if (usage[k] < pickUse) { pickUse = usage[k]; pick = k; } }
      if (pick < 0) return null;
      colors[v] = pick; usage[pick]++;
    }
    return colors;
  }

  // Colour a list of SHADED regions (each an array of [r,c] cells) maximising
  // distinct palette colours, proper across touching regions. Builds region
  // touch-adjacency, then colourSpread (→ colourGraph backtracking fallback →
  // all-0 clamp). Returns a colour idx per region. Shared by both shaded-region
  // paths (computeDomShadedRegionMap, assignExtraRegionColors); region borders /
  // fill deliberately do NOT use this (they keep computeRegion4Colors).
  function colourShadedRegions(regions) {
    var n = regions.length;
    var cellReg = {};
    regions.forEach(function (cells, i) { cells.forEach(function (rc) { cellReg[rc[0] + ',' + rc[1]] = i; }); });
    var adj = []; for (var i = 0; i < n; i++) adj.push(new Set());
    regions.forEach(function (cells, i) {
      cells.forEach(function (rc) {
        var r = rc[0], c = rc[1];
        [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function (nb) {
          var j = cellReg[nb[0] + ',' + nb[1]];
          if (j !== undefined && j !== i) { adj[i].add(j); adj[j].add(i); }
        });
      });
    });
    return colourSpread(n, adj) || colourGraph(n, adj, null) || new Array(n).fill(0);
  }

  // Proper ≤4-colouring of a graph given adjacency sets. `pinned[i]` (optional)
  // forces node i to a fixed colour (0–3); pass -1 / omit for free nodes. Greedy
  // fast path, then descending-degree backtracking over the free nodes. Returns a
  // colour array (0–3) or null if no proper 4-colouring honouring the pins exists.
  function colourGraph(n, adj, pinned) {
    // Reject mutually-clashing pins up front (backtracking can't move them).
    if (pinned) {
      for (var i = 0; i < n; i++) {
        if (pinned[i] < 0) continue;
        var bad = false;
        adj[i].forEach(function (j) { if (pinned[j] === pinned[i]) bad = true; });
        if (bad) return null;
      }
    }

    var colors = new Array(n).fill(-1), ok = true;
    if (pinned) for (var i = 0; i < n; i++) if (pinned[i] >= 0) colors[i] = pinned[i];
    // Greedy over the free nodes (prefers low colours → red most common).
    for (var i = 0; i < n; i++) {
      if (colors[i] >= 0) continue;
      var used = new Set();
      adj[i].forEach(function (j) { if (colors[j] >= 0) used.add(colors[j]); });
      for (var k = 0; k < 4; k++) { if (!used.has(k)) { colors[i] = k; break; } }
      if (colors[i] < 0) { ok = false; break; }
    }
    if (ok) return colors;

    // Backtracking over free nodes only; pins stay fixed.
    var order = [];
    for (var i = 0; i < n; i++) if (!pinned || pinned[i] < 0) order.push(i);
    order.sort(function (a, b) { return adj[b].size - adj[a].size; });
    var bt = new Array(n).fill(-1);
    if (pinned) for (var i = 0; i < n; i++) if (pinned[i] >= 0) bt[i] = pinned[i];
    function assign(pos) {
      if (pos === order.length) return true;
      var v = order[pos];
      for (var col = 0; col < 4; col++) {
        var clash = false;
        adj[v].forEach(function (j) { if (bt[j] === col) clash = true; });
        if (clash) continue;
        bt[v] = col;
        if (assign(pos + 1)) return true;
        bt[v] = -1;
      }
      return false;
    }
    return assign(0) ? bt : null;
  }

  // Returns { regions, cellSize, rows, cols } derived from the live SVG, or null.
  function inferRegionsFromSVG() {
    var cellGrids = document.getElementById('cell-grids');
    var svgEl    = document.getElementById('svgrenderer');
    if (!cellGrids || !svgEl) return null;

    var vb = (svgEl.getAttribute('viewBox') || '').trim().split(/\s+/);
    var totalW = parseFloat(vb[2]) || 0;
    var totalH = parseFloat(vb[3]) || 0;
    if (!totalW || !totalH) return null;

    // Determine cellSize: GCD of all coordinates in the .cell-grid path.
    var cgPath = cellGrids.querySelector('path.cell-grid');
    function intGcd(a, b) { a = Math.round(a); b = Math.round(b); return b === 0 ? a : intGcd(b, a % b); }
    var cs = 0;
    if (cgPath) {
      var cgNums = (cgPath.getAttribute('d') || '').match(/\d+(?:\.\d+)?/g);
      if (cgNums) {
        cs = cgNums.map(Number).filter(function (n) { return n > 0.5; })
                   .reduce(intGcd, 0);
      }
    }
    // Fallback: try common cell sizes.
    if (cs < 4) { [50, 64, 56, 60, 48, 52].forEach(function (s) { if (!cs && totalW % s < 0.5) cs = s; }); }
    if (cs < 4) return null;

    // Derive rows/cols from the actual max cell-grid path coordinates, NOT from
    // the viewBox (which includes margins that would inflate the count).
    var maxCX = 0, maxCY = 0;
    if (cgPath) {
      var _d = cgPath.getAttribute('d') || '';
      var _toks = _d.match(/[MmLlHhVvZz]|-?\d+(?:\.\d+)?/g) || [];
      var _cx = 0, _cy = 0, _cmd = 'M', _isX = true;
      for (var _ti = 0; _ti < _toks.length; _ti++) {
        var _tk = _toks[_ti];
        if (/[A-Za-z]/.test(_tk)) { _cmd = _tk; _isX = true; }
        else {
          var _tv = parseFloat(_tk);
          if (_cmd === 'M' || _cmd === 'L') {
            if (_isX) { _cx = _tv; if (_cx > maxCX) maxCX = _cx; }
            else       { _cy = _tv; if (_cy > maxCY) maxCY = _cy; }
            _isX = !_isX;
          } else if (_cmd === 'H') { _cx = _tv; if (_cx > maxCX) maxCX = _cx; }
          else if (_cmd === 'V') { _cy = _tv; if (_cy > maxCY) maxCY = _cy; }
        }
      }
    }
    var rows = maxCY > 0 ? Math.round(maxCY / cs) : Math.round(totalH / cs);
    var cols = maxCX > 0 ? Math.round(maxCX / cs) : Math.round(totalW / cs);

    // Parse region border paths → build set of blocked cell-adjacency pairs.
    // Key format: "r1,c1,r2,c2" with the smaller-index cell listed first.
    var blocked = new Set();

    function addHorizEdge(y, xA, xB) {
      var r = Math.round(y / cs);
      if (r <= 0 || r >= rows) return;                       // outer boundary — skip
      var cA = Math.round(Math.min(xA, xB) / cs);
      var cB = Math.round(Math.max(xA, xB) / cs);
      for (var c = cA; c < cB; c++) blocked.add((r-1)+','+c+','+r+','+c);
    }
    function addVertEdge(x, yA, yB) {
      var c = Math.round(x / cs);
      if (c <= 0 || c >= cols) return;                       // outer boundary — skip
      var rA = Math.round(Math.min(yA, yB) / cs);
      var rB = Math.round(Math.max(yA, yB) / cs);
      for (var r = rA; r < rB; r++) blocked.add(r+','+(c-1)+','+r+','+c);
    }

    function parsePath(d) {
      var tokens = d.match(/[MmLlHhVvZz]|-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/gi) || [];
      var px = 0, py = 0, sx = 0, sy = 0, i = 0;
      while (i < tokens.length) {
        var t = tokens[i++];
        if      (t === 'M') { px = +tokens[i++]; py = +tokens[i++]; sx = px; sy = py; }
        else if (t === 'm') { px += +tokens[i++]; py += +tokens[i++]; sx = px; sy = py; }
        else if (t === 'L') { var nx=+tokens[i++], ny=+tokens[i++]; if(px===nx)addVertEdge(px,py,ny); else if(py===ny)addHorizEdge(py,px,nx); px=nx; py=ny; }
        else if (t === 'l') { var dx=+tokens[i++], dy=+tokens[i++]; var ex=px+dx, ey=py+dy; if(px===ex)addVertEdge(px,py,ey); else if(py===ey)addHorizEdge(py,px,ex); px=ex; py=ey; }
        else if (t === 'H') { var hx=+tokens[i++]; addHorizEdge(py,px,hx); px=hx; }
        else if (t === 'h') { var hd=+tokens[i++]; addHorizEdge(py,px,px+hd); px+=hd; }
        else if (t === 'V') { var vy=+tokens[i++]; addVertEdge(px,py,vy); py=vy; }
        else if (t === 'v') { var vd=+tokens[i++]; addVertEdge(px,py,py+vd); py+=vd; }
        else if (t==='Z'||t==='z') { if(px===sx)addVertEdge(px,py,sy); else if(py===sy)addHorizEdge(py,px,sx); px=sx; py=sy; }
      }
    }

    cellGrids.querySelectorAll('path:not(.cell-grid)').forEach(function (p) {
      parsePath(p.getAttribute('d') || '');
    });

    // BFS flood-fill to identify connected cell groups (= regions).
    var regionOf = [];
    for (var r = 0; r < rows; r++) regionOf.push(new Array(cols).fill(-1));

    var regions = [];
    for (var sr = 0; sr < rows; sr++) {
      for (var sc = 0; sc < cols; sc++) {
        if (regionOf[sr][sc] !== -1) continue;
        var ri = regions.length;
        var cells = [];
        var queue = [[sr, sc]];
        regionOf[sr][sc] = ri;
        while (queue.length) {
          var cur = queue.shift();
          var cr = cur[0], cc = cur[1];
          cells.push([cr, cc]);
          [[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]].forEach(function (nb) {
            var nr = nb[0], nc = nb[1];
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || regionOf[nr][nc] !== -1) return;
            // Edge key: smaller-index cell first.
            var key = (nr < cr || (nr === cr && nc < cc))
              ? nr+','+nc+','+cr+','+cc
              : cr+','+cc+','+nr+','+nc;
            if (blocked.has(key)) return;
            regionOf[nr][nc] = ri;
            queue.push([nr, nc]);
          });
        }
        regions.push(cells);
      }
    }

    return { regions: regions, cellSize: cs, rows: rows, cols: cols };
  }

  function drawRegionSplitBorders(svg) {
    if (!svg) svg = document.getElementById('svgrenderer');
    if (!svg) return;

    svg.querySelectorAll('[data-spdr-region-split]').forEach(function (el) { el.remove(); });

    // Restore cell-grid d if we cleared it in a previous call.
    (function () {
      var cge = document.getElementById('cell-grids');
      var cgp = cge ? cge.querySelector('path.cell-grid') : null;
      if (cgp && cgp.dataset.spdrOrigD !== undefined) {
        cgp.setAttribute('d', cgp.dataset.spdrOrigD);
        delete cgp.dataset.spdrOrigD;
      }
    })();

    var needFills        = settings.regionColorFillEnabled;
    var needMultiBorders = settings.regionBorderMultiEnabled;
    var needCenterBorder = settings.regionBorderCenterEnabled;
    // Shaded extra-regions are drawn (as clones) inside mainGroup so they sit
    // BELOW the region borders — coloured when shaded mode is on, otherwise the
    // same grey. Done whenever any region feature is active (so there are borders
    // to sit under) and the puzzle actually has shaded regions.
    var needShadedClones = regionFeatureActive() && puzzleHasShadedRegions();
    // Cell borders (recolor the thin grid lines) and Suppress-boundary both act on
    // the cell-grid clone, so they keep mainGroup alive on their own (standalone).
    // Suppress also needs region geometry to know which grid edges are boundaries.
    var needCellColor = settings.regionBorderCellEnabled;
    var needSuppress  = settings.regionBorderSuppressBoundary;
    var geo = (needFills || needMultiBorders || needCenterBorder || needShadedClones || needCellColor || needSuppress)
      ? inferRegionsFromSVG() : null;

    // Build cell→region map (used by inR() when drawing border strips).
    var cellRegion = {};
    if (geo && geo.regions.length >= 2) {
      geo.regions.forEach(function (cells, ri) {
        cells.forEach(function (rc) { cellRegion[rc[0] + ',' + rc[1]] = ri; });
      });
    }

    // Hide cage-box strokes when any border/fill feature is active.
    // Cage-box paths (#cell-grids path:not(.cell-grid)) sit at z=8 with fully
    // opaque black strokes and paint dark lines over puzzle-defined coloured cells
    // (z=4) at every 3×3 box boundary.  Suppress them while our features are on;
    // restore when all features are off.
    var cellGridsEl = document.getElementById('cell-grids');
    if (cellGridsEl) {
      cellGridsEl.querySelectorAll('path:not(.cell-grid)').forEach(function (p) {
        if (needFills || needMultiBorders || needCenterBorder) {
          p.style.setProperty('stroke', 'none', 'important');
        } else {
          p.style.removeProperty('stroke');
        }
      });
    }

    if (!needFills && !needMultiBorders && !needCenterBorder && !needShadedClones && !needCellColor && !needSuppress) return;
    if (!geo || geo.regions.length < 2) return;

    var regions = geo.regions;
    var cs      = geo.cellSize;
    var rows    = geo.rows;
    var cols    = geo.cols;

    // Two palettes: borders use regionColorOpacity, fills use regionColorFillOpacity.
    var op     = (settings.regionColorOpacity     != null) ? settings.regionColorOpacity     : 1;
    var fillOp = (settings.regionColorFillOpacity != null) ? settings.regionColorFillOpacity : 1;
    var palette = [
      hexToRgba(settings.regionColorPalette0 || '#e05252', op),
      hexToRgba(settings.regionColorPalette1 || '#5294e0', op),
      hexToRgba(settings.regionColorPalette2 || '#52a84e', op),
      hexToRgba(settings.regionColorPalette3 || '#e8a030', op),
    ];
    var fillPalette = [
      hexToRgba(settings.regionColorPalette0 || '#e05252', fillOp),
      hexToRgba(settings.regionColorPalette1 || '#5294e0', fillOp),
      hexToRgba(settings.regionColorPalette2 || '#52a84e', fillOp),
      hexToRgba(settings.regionColorPalette3 || '#e8a030', fillOp),
    ];
    // Group geometric regions by logical region id (merges disjoint pieces of one
    // sudoku region so they share a colour); falls back to per-piece when the
    // model isn't available.
    var modelRegionMap = getModelRegionMap();
    var regionGroups   = buildRegionGroups(regions, modelRegionMap);
    var regionColors   = computeRegion4Colors(regions, regionGroups.groupOf, regionGroups.numGroups);
    var SW = parseFloat(settings.regionColorStripeWidth) || 3;
    // cellRegion already built above.

    var NS = 'http://www.w3.org/2000/svg';

    var mainGroup = document.createElementNS(NS, 'g');
    mainGroup.setAttribute('data-spdr-region-split', '1');
    mainGroup.setAttribute('pointer-events', 'none');
    // Snap rect edges to whole screen pixels so anti-aliasing doesn't create a
    // dark fringe where the strip boundary falls at a fractional pixel position
    // (the SVG is typically scaled ~1.33× so almost no coordinate lands on an
    // integer screen pixel without this).
    mainGroup.setAttribute('shape-rendering', 'crispEdges');

    // Each region gets a plain <g> (no clipPath needed — all rects are placed
    // entirely within that region's own cells).
    var rGroups = {};  // ri -> { g: SVGGElement, color: string }
    regions.forEach(function (cells, ri) {
      var ci = regionColors[ri];
      if (ci < 0) return;
      var g = document.createElementNS(NS, 'g');
      mainGroup.appendChild(g);
      rGroups[ri] = { g: g, color: palette[ci] };
    });

    function addRect(ri, x, y, w, h, color) {
      if (!rGroups[ri] || w <= 0 || h <= 0) return;
      var rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', x);  rect.setAttribute('y', y);
      rect.setAttribute('width', w); rect.setAttribute('height', h);
      rect.setAttribute('data-spdr-kind', 'multi');  // highlight target (Multi-color borders)
      rect.style.setProperty('fill', color || rGroups[ri].color, 'important');
      rGroups[ri].g.appendChild(rect);
    }

    function inR(ri, r, c) { return cellRegion[r + ',' + c] === ri; }

    // Multi-color border rects drawn first (lower z-order within mainGroup).
    // Full-cell fills drawn after (higher z-order) so they sit visually above the border strips
    // while still being below #cell-grids (center border) and all puzzle elements.
    if (needMultiBorders) {
    //   • Horizontal (top/bottom) runs are trimmed by SW at each true run end
    //     where a perpendicular vertical boundary exists, so corners are covered
    //     exactly once (by the vertical rect).
    //   • Vertical (left/right) runs own the corner pixels — no trimming.
    //   • Each boundary is drawn as one rect per contiguous run of cells (not
    //     one per cell), eliminating sub-pixel gaps at interior cell junctions.
    // This guarantees zero double-painting at convex outer corners.
    //
    // At concave inner corners (three of four surrounding cells belong to R,
    // one does not) the horizontal and vertical rects leave a SW×SW gap in the
    // diagonally-opposite cell.  An explicit corner fill rect closes it.
    regions.forEach(function (cells, ri) {
      if (!rGroups[ri]) return;

      // Collect boundary edges, then merge contiguous runs into single rects.
      // Drawing one rect per run (instead of one per cell) eliminates sub-pixel
      // gaps that browsers leave between adjacent same-edge SVG rects.
      var topEdges = {}, bottomEdges = {}, leftEdges = {}, rightEdges = {};
      cells.forEach(function (rc) {
        var r = rc[0], c = rc[1];
        var hasTop    = !inR(ri, r - 1, c);
        var hasBottom = !inR(ri, r + 1, c);
        var hasLeft   = !inR(ri, r, c - 1);
        var hasRight  = !inR(ri, r, c + 1);
        if (hasTop)    { if (!topEdges[r])    topEdges[r]    = []; topEdges[r].push({c:c, hasLeft:hasLeft, hasRight:hasRight}); }
        if (hasBottom) { if (!bottomEdges[r]) bottomEdges[r] = []; bottomEdges[r].push({c:c, hasLeft:hasLeft, hasRight:hasRight}); }
        if (hasLeft)   { if (!leftEdges[c])   leftEdges[c]   = []; leftEdges[c].push(r); }
        if (hasRight)  { if (!rightEdges[c])  rightEdges[c]  = []; rightEdges[c].push(r); }
      });

      // Merge and draw horizontal (top/bottom) edge runs.
      // Corner trimming (tL/tR = SW) applies only at the true start/end of each run.
      function drawHorizRuns(edgeMap, yOff) {
        Object.keys(edgeMap).forEach(function (rowStr) {
          var r = +rowStr;
          var arr = edgeMap[rowStr].sort(function (a, b) { return a.c - b.c; });
          var i = 0;
          while (i < arr.length) {
            var start = arr[i], j = i;
            while (j + 1 < arr.length && arr[j + 1].c === arr[j].c + 1) j++;
            var end = arr[j];
            var tL = start.hasLeft  ? SW : 0;
            var tR = end.hasRight   ? SW : 0;
            addRect(ri, start.c * cs + tL, r * cs + yOff, (end.c - start.c + 1) * cs - tL - tR, SW);
            i = j + 1;
          }
        });
      }

      // Merge and draw vertical (left/right) edge runs.
      // Left/right rects own the corner pixels — no trimming needed.
      function drawVertRuns(edgeMap, xOff) {
        Object.keys(edgeMap).forEach(function (colStr) {
          var c = +colStr;
          var arr = edgeMap[colStr].sort(function (a, b) { return a - b; });
          var i = 0;
          while (i < arr.length) {
            var startR = arr[i], j = i;
            while (j + 1 < arr.length && arr[j + 1] === arr[j] + 1) j++;
            var endR = arr[j];
            addRect(ri, c * cs + xOff, startR * cs, SW, (endR - startR + 1) * cs);
            i = j + 1;
          }
        });
      }

      drawHorizRuns(topEdges,    0);
      drawHorizRuns(bottomEdges, cs - SW);
      drawVertRuns(leftEdges,    0);
      drawVertRuns(rightEdges,   cs - SW);

      // Concave corner fills.
      // Scan every grid-corner that touches at least one cell of this region.
      // At each corner where exactly 3 of the 4 surrounding cells belong to R,
      // the two boundary rects leave a SW×SW gap in the diagonally-opposite
      // (3rd) cell.  Fill it with a tiny rect.
      //
      // Labelling of the 4 cells around grid-corner (gr, gc):
      //   A = cell(gr-1, gc-1)  top-left
      //   B = cell(gr-1, gc  )  top-right
      //   C = cell(gr,   gc-1)  bottom-left
      //   D = cell(gr,   gc  )  bottom-right
      //
      // Gap positions (each in the cell diagonally opposite the missing cell):
      //   !A (B,C,D in R): gap in D's top-left     → cx,    cy
      //   !B (A,C,D in R): gap in C's top-right    → cx-SW, cy
      //   !C (A,B,D in R): gap in B's bottom-left  → cx,    cy-SW
      //   !D (A,B,C in R): gap in A's bottom-right → cx-SW, cy-SW
      var cornersSeen = {};
      cells.forEach(function (rc) {
        var r = rc[0], c = rc[1];
        [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1]].forEach(function (cr) {
          var key = cr[0] + ',' + cr[1];
          if (cornersSeen[key]) return;
          cornersSeen[key] = true;
          var gr = cr[0], gc = cr[1];
          var cx = gc * cs, cy = gr * cs;
          var A = inR(ri, gr - 1, gc - 1);
          var B = inR(ri, gr - 1, gc);
          var C = inR(ri, gr,     gc - 1);
          var D = inR(ri, gr,     gc);
          var n = (A ? 1 : 0) + (B ? 1 : 0) + (C ? 1 : 0) + (D ? 1 : 0);
          if (n !== 3) return;
          if (!A) addRect(ri, cx,      cy,      SW, SW);
          if (!B) addRect(ri, cx - SW, cy,      SW, SW);
          if (!C) addRect(ri, cx,      cy - SW, SW, SW);
          if (!D) addRect(ri, cx - SW, cy - SW, SW, SW);
        });
      });
    });
    } // end if (needMultiBorders)

    // Full-cell background fills (drawn after border rects = higher z-order within mainGroup).
    // Uses fillPalette (regionColorFillOpacity) independently of border opacity.
    if (settings.regionColorFillEnabled) {
      regions.forEach(function (cells, ri) {
        if (!rGroups[ri]) return;
        var ci = regionColors[ri];
        var fillColor = ci >= 0 ? fillPalette[ci] : null;
        if (!fillColor) return;
        cells.forEach(function (rc) {
          var r = rc[0], c = rc[1];
          // Fill exactly the cell — no outward growth. (Earlier versions grew each
          // boundary side by SW to tuck under the border strips, but with no
          // neighbour at the puzzle's outer edge that overhang pokes past the
          // border, and at interior boundaries the two regions' fills overlapped
          // into a lighter double-painted seam. Exact cell rects avoid both; the
          // strips still draw on top at the boundaries.)
          addRect(ri, c * cs, r * cs, cs, cs, fillColor);
        });
      });
    }

    // Center border: clone cage-box paths from #cell-grids into mainGroup (z=0).
    // Drawing here instead of via CSS on #cell-grids (z=8) ensures center border
    // strokes appear BELOW #underlay (z=3), so circles, pills, and other feature
    // elements render above the center border rather than behind it.
    if (needCenterBorder) {
      var cellGridsEl = document.getElementById('cell-grids');
      if (cellGridsEl) {
        var centerStroke = hexToRgba(settings.regionBorderColor, settings.regionBorderOpacity);
        var centerWidth  = parseFloat(settings.regionBorderWidth) || 3;
        cellGridsEl.querySelectorAll('path:not(.cell-grid)').forEach(function (p) {
          var clone = document.createElementNS(NS, 'path');
          clone.setAttribute('d', p.getAttribute('d'));
          clone.setAttribute('fill', 'none');
          clone.setAttribute('pointer-events', 'none');
          clone.setAttribute('data-spdr-kind', 'center');  // highlight target
          clone.style.setProperty('stroke', centerStroke, 'important');
          clone.style.setProperty('stroke-width', centerWidth + 'px', 'important');
          mainGroup.appendChild(clone);
        });
      }
    }

    // Clone path.cell-grid as the very first child of mainGroup so cell lines
    // render below our strips within the group.  Clear the z=8 original so it
    // no longer paints above our strips.  Clearing d (not display:none) avoids
    // triggering the style-attribute mutation observer on #cell-grids.
    (function () {
      var cge = document.getElementById('cell-grids');
      var cgp = cge ? cge.querySelector('path.cell-grid') : null;
      if (!cgp) return;
      cgp.dataset.spdrOrigD = cgp.getAttribute('d') || '';
      var cgClone = cgp.cloneNode(false);
      cgClone.removeAttribute('data-spdr-orig-d');
      cgClone.setAttribute('data-spdr-kind', 'cell');  // highlight target (Cell borders / grid lines)
      // mainGroup carries shape-rendering:crispEdges (needed so the border-strip
      // rects don't anti-alias into a dark fringe). But the thin cell-grid lines
      // (1px in user units, ~1.33px after the SVG's ~1.33× scale) must NOT be
      // pixel-snapped: crispEdges rounds each line to 1px or 2px depending on its
      // sub-pixel position, so some dividers render brighter/wider than others,
      // and the rounding differs per browser. The original path.cell-grid used
      // shape-rendering:auto; override the inherited crispEdges back to smooth so
      // the clone matches it.
      cgClone.setAttribute('shape-rendering', 'geometricPrecision');

      // Suppress grid line on region boundaries (Center-borders sub-option): rebuild
      // the clone's path from individual cell edges, omitting any interior edge that
      // separates two DIFFERENT regions. Perimeter edges and within-region cell
      // dividers are kept. Lets a low-opacity region border fade to nothing at the
      // boundary instead of leaving the built-in grid line showing through.
      if (needSuppress) {
        var parts = [];
        for (var rr = 0; rr <= rows; rr++) {
          for (var cc = 0; cc < cols; cc++) {
            // Drop an edge that is the outer wall (rr 0 / rows) or an interior
            // region boundary; keep within-region cell dividers.
            var hBound = (rr === 0 || rr === rows) ||
                         (cellRegion[(rr - 1) + ',' + cc] !== cellRegion[rr + ',' + cc]);
            if (!hBound) parts.push('M' + (cc * cs) + ' ' + (rr * cs) + 'L' + ((cc + 1) * cs) + ' ' + (rr * cs));
          }
        }
        for (var ccx = 0; ccx <= cols; ccx++) {
          for (var rrx = 0; rrx < rows; rrx++) {
            var vBound = (ccx === 0 || ccx === cols) ||
                         (cellRegion[rrx + ',' + (ccx - 1)] !== cellRegion[rrx + ',' + ccx]);
            if (!vBound) parts.push('M' + (ccx * cs) + ' ' + (rrx * cs) + 'L' + (ccx * cs) + ' ' + ((rrx + 1) * cs));
          }
        }
        cgClone.setAttribute('d', parts.join(''));
      }

      // Cell borders: recolor the thin grid lines to the chosen colour/opacity
      // via an !important inline stroke (the clone is recreated fresh each draw).
      if (needCellColor) {
        cgClone.style.setProperty('stroke', hexToRgba(settings.regionBorderCellColor, settings.regionBorderCellOpacity), 'important');
        var cellW = parseFloat(settings.regionBorderCellWidth);
        if (!isNaN(cellW)) cgClone.style.setProperty('stroke-width', cellW + 'px', 'important');
      }

      mainGroup.insertBefore(cgClone, mainGroup.firstChild);
      cgp.setAttribute('d', '');
    })();

    // Shaded extra-regions: recoloured clones of each #cages path.cage-extraregion,
    // inserted as the FIRST children of mainGroup so they render BELOW the region
    // border strips (and the cell-grid clone). The originals are hidden by
    // fixCagePath. Colour index comes from assignExtraRegionColors.
    if (needShadedClones) {
      // Recompute colour indices here so they are fresh regardless of which path
      // triggered this draw (observers call drawRegionSplitBorders independently
      // of applySettings, so we can't rely on a prior assignExtraRegionColors).
      assignExtraRegionColors(svg);
      var usePalette = !!settings.shadedRegionColorEnabled;
      var shadedGroup = document.createElementNS(NS, 'g');
      shadedGroup.setAttribute('data-spdr-shaded', '1');
      var shOp  = (settings.shadedRegionColorOpacity != null) ? settings.shadedRegionColorOpacity : 0.5;
      var shPal = [
        hexToRgba(settings.regionColorPalette0 || '#e05252', shOp),
        hexToRgba(settings.regionColorPalette1 || '#5294e0', shOp),
        hexToRgba(settings.regionColorPalette2 || '#52a84e', shOp),
        hexToRgba(settings.regionColorPalette3 || '#e8a030', shOp),
      ];
      document.querySelectorAll('#cages path.cage-extraregion').forEach(function (p) {
        var clone = document.createElementNS(NS, 'path');
        clone.setAttribute('d', p.getAttribute('d') || '');
        clone.setAttribute('pointer-events', 'none');
        clone.style.setProperty('stroke', 'none', 'important');
        if (usePalette && p.dataset.spdrExtraColorIdx != null) {
          var idx = parseInt(p.dataset.spdrExtraColorIdx, 10) || 0;
          clone.style.setProperty('fill', shPal[idx % 4], 'important');
        } else {
          // Grey (shaded mode off, or no colour assigned): reproduce the original's
          // Object-shaded look so it just moves below the borders unchanged.
          var gc = parseColor(p.getAttribute('fill') || '');
          if (gc && gc.a !== 0) {
            var sh = settings.underlayEnabled ? computeObjectShade(gc) : null;
            var rgb = sh ? sh.rgb : [gc.r, gc.g, gc.b];
            var fa  = sh ? sh.a   : gc.a;
            clone.style.setProperty('fill', 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + fa + ')', 'important');
          }
        }
        shadedGroup.appendChild(clone);
      });
      mainGroup.insertBefore(shadedGroup, mainGroup.firstChild);
    }

    // Shaded extra-regions defined ONLY in the model — no cage-extraregion path to
    // clone and no grey #underlay rect to recolour (e.g. a Windoku whose four windows
    // are sum-less unique cages drawn as dashed killer outlines, 5krkgmjq7q). Draw a
    // full-cell rect for each region cell, inserted below the borders. Skipped when the
    // puzzle renders its extra regions as cage-extraregion paths (cloned above), and
    // per-cell when that cell already carries a full-cell #underlay rect (recoloured in
    // place by fixUnderlayRect) so grey-shaded regions are never double-painted.
    if (settings.shadedRegionColorEnabled
        && !document.querySelector('#cages path.cage-extraregion')) {
      var modelShaded = getModelShadedRegionMap();
      if (modelShaded) {
        var shOpM = (settings.shadedRegionColorOpacity != null) ? settings.shadedRegionColorOpacity : 0.5;
        var shPalM = [
          hexToRgba(settings.regionColorPalette0 || '#e05252', shOpM),
          hexToRgba(settings.regionColorPalette1 || '#5294e0', shOpM),
          hexToRgba(settings.regionColorPalette2 || '#52a84e', shOpM),
          hexToRgba(settings.regionColorPalette3 || '#e8a030', shOpM),
        ];
        var covered = {};
        svg.querySelectorAll('#underlay rect').forEach(function (r) {
          var col = parseColor(r.getAttribute('fill') || '');
          if (!col || col.a === 0) return;
          var rw = parseFloat(r.getAttribute('width')),  rh = parseFloat(r.getAttribute('height'));
          var rx = parseFloat(r.getAttribute('x')),      ry = parseFloat(r.getAttribute('y'));
          if (!isFinite(rw) || !isFinite(rh) || !isFinite(rx) || !isFinite(ry)) return;
          if (rw < cs * 0.75 || rh < cs * 0.75) return;
          covered[Math.floor((ry + rh / 2) / cs) + ',' + Math.floor((rx + rw / 2) / cs)] = true;
        });
        var modelShadeGroup = document.createElementNS(NS, 'g');
        modelShadeGroup.setAttribute('pointer-events', 'none');
        Object.keys(modelShaded).forEach(function (k) {
          if (covered[k]) return;
          var rc = k.split(',');
          var rr = parseInt(rc[0], 10), ccx = parseInt(rc[1], 10);
          var rect = document.createElementNS(NS, 'rect');
          rect.setAttribute('x', ccx * cs); rect.setAttribute('y', rr * cs);
          rect.setAttribute('width', cs);   rect.setAttribute('height', cs);
          rect.style.setProperty('fill', shPalM[(modelShaded[k] || 0) % 4], 'important');
          rect.setAttribute('shape-rendering', 'crispEdges');
          modelShadeGroup.appendChild(rect);
        });
        if (modelShadeGroup.firstChild) mainGroup.insertBefore(modelShadeGroup, mainGroup.firstChild);
      }
    }

    // Insert mainGroup immediately after #cell-colors so our borders render above
    // puzzle-defined colored cell fills but below arrows, cages, overlay (Kropki
    // dots, constraint labels), and digits.
    // Z-order: background → underlay → cell-colors → [mainGroup] → arrows →
    //          cages → cell-grids → overlay → digits.
    var svgEl = document.getElementById('svgrenderer');
    if (svgEl) {
      (function insertMainGroup() {
        var anchor = document.getElementById('cell-colors');
        if (anchor && anchor.parentElement === svgEl) {
          svgEl.insertBefore(mainGroup, anchor.nextSibling);
        } else {
          svgEl.insertBefore(mainGroup, svgEl.firstChild); // fallback
        }
      })();

      // If SudokuPad re-renders and displaces our group, restore its position
      // immediately after #cell-colors.
      if (!svgEl.dataset.spdrPositionObs) {
        svgEl.dataset.spdrPositionObs = '1';
        new MutationObserver(function (mutations) {
          for (var mi = 0; mi < mutations.length; mi++) {
            var m = mutations[mi];
            if (m.type !== 'childList' || !m.addedNodes.length) continue;
            for (var ni = 0; ni < m.addedNodes.length; ni++) {
              var node = m.addedNodes[ni];
              if (node.nodeType !== 1) continue;
              if (node.getAttribute && node.getAttribute('data-spdr-region-split')) continue;
              // A foreign element was added. Check if our group is still correctly
              // positioned immediately after #cell-colors.
              var grp = svgEl.querySelector('[data-spdr-region-split]');
              if (!grp) break;
              var cc = document.getElementById('cell-colors');
              var expectedPrev = (cc && cc.parentElement === svgEl) ? cc : null;
              if (grp.previousElementSibling !== expectedPrev) {
                if (expectedPrev) {
                  svgEl.insertBefore(grp, expectedPrev.nextSibling);
                } else {
                  svgEl.insertBefore(grp, svgEl.firstChild);
                }
              }
              break;
            }
          }
        }).observe(svgEl, { childList: true });
      }
    }
  }

  // ── Part 5: center candidate tspan ordering ───────────────────────────────
  function getDigitValue(el) { return parseInt(el.getAttribute('data-val') || '0', 10); }

  function isCandidateSorted(textEl) {
    var tspans = textEl.children;
    if (tspans.length < 2) return true;
    if (settings.centerMoveInvalidRight) {
      var seenConflict = false; var lastVal = -Infinity;
      for (var i = 0; i < tspans.length; i++) {
        var t = tspans[i]; var isC = t.classList.contains('conflict'); var v = getDigitValue(t);
        if (!isC && seenConflict) return false;
        if (isC && !seenConflict) { seenConflict = true; lastVal = -Infinity; }
        if (v < lastVal) return false;
        lastVal = v;
      }
    } else {
      var prev = -Infinity;
      for (var j = 0; j < tspans.length; j++) {
        var vv = getDigitValue(tspans[j]); if (vv < prev) return false; prev = vv;
      }
    }
    return true;
  }
  function sortCandidateTspans(textEl) {
    if (isCandidateSorted(textEl)) return;
    var tspans = Array.from(textEl.children);
    tspans.sort(function (a, b) { return getDigitValue(a) - getDigitValue(b); });
    if (settings.centerMoveInvalidRight) {
      var v = tspans.filter(function (t) { return !t.classList.contains('conflict'); });
      var x = tspans.filter(function (t) { return  t.classList.contains('conflict'); });
      v.concat(x).forEach(function (t) { textEl.appendChild(t); });
    } else {
      tspans.forEach(function (t) { textEl.appendChild(t); });
    }
  }
  function sortAllCandidateCells(cc) {
    if (!settings.centerEnabled) return;
    cc.querySelectorAll('text.cell-candidate').forEach(sortCandidateTspans);
  }
  function startCandidateSortPatch() {
    var cc = document.getElementById('cell-candidates'); if (!cc) return;
    sortAllCandidateCells(cc);
    fixAllCenterTspans(cc);
    new MutationObserver(function (mutations) {
      var needsUpdate = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList') { needsUpdate = true; break; }
        if (m.type === 'attributes' && m.attributeName === 'class') {
          needsUpdate = true; break;
        }
      }
      if (needsUpdate) { sortAllCandidateCells(cc); fixAllCenterTspans(cc); }
    }).observe(cc, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  function waitForCellCandidates() {
    if (document.getElementById('cell-candidates')) { startCandidateSortPatch(); return; }
    var obs = new MutationObserver(function () {
      if (document.getElementById('cell-candidates')) { obs.disconnect(); startCandidateSortPatch(); }
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
  waitForCellCandidates();

  // ── Part 5b: corner pencilmark reflow ─────────────────────────────────────
  // pm-N → cell-slot mapping (confirmed via DOM inspection):
  //   pm-0 (-15,-15) top-left          pm-1 (15,-15) top-right
  //   pm-2 (-15, 15) bottom-left       pm-3 (15, 15) bottom-right
  //   pm-4 ( 0,-15) top-center         pm-5 ( 0, 15) bottom-center
  //   pm-6 (-15, 0) middle-left        pm-7 (15,  0) middle-right
  //   pm-8 ( -5, 0) centre
  // Natural fill order pm-0..pm-7 = positions 1,3,7,9,2,8,4,6 on a numpad
  // layout (1=top-left). When cornerMoveInvalidEnd or cornerHideInvalid is on,
  // valid digits (sorted by data-val) occupy pm-0,1,2,...; invalid digits
  // (sorted by data-val) occupy the remaining higher pm-N slots.

  function groupCornerCells(cp) {
    var cells = new Map();
    Array.from(cp.querySelectorAll('text')).forEach(function (t) {
      var key = t.getAttribute('x') + ',' + t.getAttribute('y');
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(t);
    });
    return cells;
  }
  function cornerExpectedOrder(texts) {
    var sorted = texts.slice().sort(function (a, b) { return getDigitValue(a) - getDigitValue(b); });
    if (settings.cornerEnabled && (settings.cornerMoveInvalidEnd || settings.cornerHideInvalid)) {
      var valid   = sorted.filter(function (t) { return !t.classList.contains('conflict'); });
      var invalid = sorted.filter(function (t) { return  t.classList.contains('conflict'); });
      return valid.concat(invalid);
    }
    return sorted;
  }
  function isCornerCellOrdered(texts) {
    var expected = cornerExpectedOrder(texts);
    for (var i = 0; i < expected.length; i++) {
      var m = (expected[i].getAttribute('class') || '').match(/pm-(\d+)/);
      if (!m || parseInt(m[1], 10) !== i) return false;
    }
    return true;
  }
  function reorderCornerCell(texts) {
    if (texts.length === 0) return;
    if (isCornerCellOrdered(texts)) return;
    cornerExpectedOrder(texts).forEach(function (t, i) {
      var classes = (t.getAttribute('class') || '').split(/\s+/)
        .filter(function (c) { return c && !/^pm-\d+$/.test(c); });
      classes.push('pm-' + i);
      t.setAttribute('class', classes.join(' '));
    });
  }
  function reorderAllCornerCells(cp) {
    groupCornerCells(cp).forEach(function (texts) { reorderCornerCell(texts); });
  }
  function startCornerReflowPatch() {
    var cp = document.getElementById('cell-pencilmarks'); if (!cp) return;
    reorderAllCornerCells(cp);
    fixAllCornerTexts(cp);
    new MutationObserver(function (mutations) {
      var needsUpdate = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList') { needsUpdate = true; break; }
        if (m.type === 'attributes' &&
            (m.attributeName === 'class' || m.attributeName === 'x' || m.attributeName === 'y')) {
          needsUpdate = true; break;
        }
      }
      if (needsUpdate) { reorderAllCornerCells(cp); fixAllCornerTexts(cp); }
    }).observe(cp, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'x', 'y'] });
  }
  function waitForCellPencilmarks() {
    if (document.getElementById('cell-pencilmarks')) { startCornerReflowPatch(); return; }
    var obs = new MutationObserver(function () {
      if (document.getElementById('cell-pencilmarks')) { obs.disconnect(); startCornerReflowPatch(); }
    });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
  waitForCellPencilmarks();

  // ═══════════════════════════════════════════════════════════════════════════
  // Part 6: Settings UI
  // ═══════════════════════════════════════════════════════════════════════════

  var controlSyncers = {};

  // Block SudokuPad's global handlers from intercepting events inside our UI:
  //   - mousemove preventDefault would break native slider drag
  //   - keydown for Backspace/Delete would prevent text-input editing
  //
  // Always-allowed keys (pass through to SudokuPad even when our UI has focus):
  //   - Escape       — needed so SudokuPad's panel-close handler still fires
  //   - Shift/Ctrl/Alt/Meta — modifier keys; SudokuPad uses them to toggle
  //                           corner/centre/colour modes while held. Blocking
  //                           them while focus is parked on our buttons (which
  //                           happens after any click on Fill/Clear/Settings)
  //                           breaks mode-switching entirely.
  var BLOCKED_EVENTS = [
    'mousedown','mousemove','mouseup',
    'pointerdown','pointermove','pointerup',
    'touchstart','touchmove','touchend',
    'dragstart','selectstart',
    'keydown','keyup','keypress',
  ];
  var ALLOWED_KEYS = { Escape: 1, Shift: 1, Control: 1, Alt: 1, Meta: 1 };
  function isInOurUI(t) {
    return t && t.closest && (
      t.closest('#sp-fix-panel') || t.closest('#sp-fix-btn') ||
      t.closest('#sp-fill-btn-wrap') || t.closest('#sp-clear-btn-wrap') || t.closest('#sp-clearall-btn-wrap') ||
      t.closest('#sp-digit-prompt') ||
      t.closest('#sp-easy-shade-btn') || t.closest('#sp-easy-shade-card') ||
      t.closest('#sp-validate-btn') || t.closest('#sp-validate-menu') ||
      t.closest('#sp-validate-undo-btn')
    );
  }
  BLOCKED_EVENTS.forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (!isInOurUI(e.target)) return;
      if (type.indexOf('key') === 0 && ALLOWED_KEYS[e.key]) return;
      e.stopImmediatePropagation();
    }, true);
  });

  // Color control: swatch button → triggers hidden native input. Picking a
  // colour sets the matching *Modified flag to true.
  function makeColorControl(colorKey, opacityKey) {
    var container = document.createElement('div');
    Object.assign(container.style, { display: 'inline-flex', alignItems: 'center', flexShrink: '0' });

    var swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.title = 'Click to choose colour';
    Object.assign(swatch.style, {
      width: '38px', height: '28px',
      border: '1px solid #45475a', borderRadius: '5px',
      cursor: 'pointer', padding: '2px', position: 'relative',
      background:
        'linear-gradient(45deg, #555 25%, transparent 25%),' +
        'linear-gradient(-45deg, #555 25%, transparent 25%),' +
        'linear-gradient(45deg, transparent 75%, #555 75%),' +
        'linear-gradient(-45deg, transparent 75%, #555 75%)',
      backgroundSize: '8px 8px',
      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
      backgroundColor: '#1e1e2e',
    });

    var swatchInner = document.createElement('span');
    Object.assign(swatchInner.style, { display: 'block', width: '100%', height: '100%', borderRadius: '3px' });
    swatch.appendChild(swatchInner);

    var colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = settings[colorKey];
    Object.assign(colorInput.style, {
      position: 'absolute', opacity: '0', width: '1px', height: '1px',
      pointerEvents: 'none', left: '0', top: '0',
    });
    swatch.appendChild(colorInput);

    function refreshSwatch() {
      var op = opacityKey ? settings[opacityKey] : 1;
      swatchInner.style.setProperty('background-color', hexToRgba(settings[colorKey], op), 'important');
    }
    refreshSwatch();

    swatch.addEventListener('click', function (e) { e.stopPropagation(); colorInput.click(); });
    colorInput.addEventListener('input', function () {
      settings[colorKey] = colorInput.value;
      saveSettings(settings); applySettings(); refreshSwatch();
    });

    controlSyncers[colorKey] = function () { colorInput.value = settings[colorKey]; refreshSwatch(); };
    container.appendChild(swatch);
    container.__refreshSwatch = refreshSwatch;
    return container;
  }

  // Generic labelled range slider with optional enable-checkbox.
  // Wrap a range <input> in a relative flex container and draw reference tick
  // marks along its track. `ticks` = array of { value, title?, accent? }; each is
  // positioned at value's fraction of [min,max] (inset by ~half the thumb so
  // mid-range marks line up with the thumb centre). accent marks are taller + blue
  // (a notable reference, e.g. "this opacity matches the native look"); plain ones
  // are short + grey (e.g. the setting's default). Returns the wrapper (slider
  // reference is unchanged, so existing syncers keep working). pointer-events:none
  // so marks never block dragging.
  function wrapSliderWithTicks(slider, min, max, ticks) {
    var wrap = document.createElement('div');
    Object.assign(wrap.style, {
      position: 'relative', flex: slider.style.flex || '1', minWidth: '0',
      display: 'flex', alignItems: 'center', margin: slider.style.margin || '',
    });
    slider.style.margin = '0';
    slider.style.flex = '1';
    slider.style.width = '100%';
    wrap.appendChild(slider);
    var span = (parseFloat(max) - parseFloat(min)) || 1;
    (ticks || []).forEach(function (t) {
      var frac = (parseFloat(t.value) - parseFloat(min)) / span;
      if (!isFinite(frac)) return;
      if (frac < 0) frac = 0; else if (frac > 1) frac = 1;
      var THUMB = 7; // px ≈ half the native range thumb — keeps mid-range marks aligned
      var mark = document.createElement('div');
      if (t.title) mark.title = t.title;
      Object.assign(mark.style, {
        position: 'absolute', top: '50%',
        left: 'calc(' + THUMB + 'px + ' + frac + ' * (100% - ' + (2 * THUMB) + 'px))',
        width: '2px', height: t.accent ? '14px' : '9px',
        transform: 'translate(-50%, -50%)',
        background: t.accent ? '#89b4fa' : '#6c7086',
        borderRadius: '1px', pointerEvents: 'none', zIndex: '2',
      });
      wrap.appendChild(mark);
    });
    return wrap;
  }

  // Build the tick list for a slider: a subtle mark at the setting's DEFAULT value
  // (so every slider shows where "home" is), plus any explicit reference ticks.
  function sliderTicks(key, extra) {
    var ticks = [];
    if (key != null && DEFAULTS[key] != null) ticks.push({ value: DEFAULTS[key], title: 'Default' });
    return ticks.concat(extra || []);
  }

  function makeRangeRow(opts) {
    // opts: { key, label, min, max, step, format, enabledKey,
    //         extraKeys, extraEnabledKeys }
    // extraKeys / extraEnabledKeys: additional setting keys driven to the SAME
    // value / checked state as key / enabledKey — used by the "combined" object-
    // shading sliders that lock brightness and opacity together.
    // Two-line layout so every slider is identical width regardless of label
    // length or whether a checkbox is present: a header line (checkbox + label +
    // value) above a full-width slider. This keeps all range rows uniform across
    // sections and across the object-shading combined/separate modes.
    var row = document.createElement('div');
    Object.assign(row.style, { marginTop: '6px' });

    var header = document.createElement('div');
    Object.assign(header.style, { display: 'flex', alignItems: 'center', gap: '6px' });

    // Optional checkbox: when present, dims/disables the slider when unchecked.
    var checkbox = null;
    if (opts.enabledKey) {
      checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!settings[opts.enabledKey];
      checkbox.title = 'Enable this adjustment';
      Object.assign(checkbox.style, {
        cursor: 'pointer', accentColor: '#89b4fa',
        width: '13px', height: '13px', flexShrink: '0', margin: '0',
      });
    }

    var lbl = document.createElement('span');
    lbl.textContent = opts.label + ':';
    // flex 0 1 auto so the label sizes to its text → the icon hugs it; the value
    // (pct) is pushed to the right edge via margin-left:auto below.
    Object.assign(lbl.style, { color: '#a6adc8', fontSize: '11px', flex: '0 1 auto', minWidth: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = opts.min; slider.max = opts.max; slider.step = opts.step;
    slider.value = settings[opts.key];
    Object.assign(slider.style, { width: '100%', cursor: 'pointer', accentColor: '#89b4fa', margin: '3px 0 0', boxSizing: 'border-box' });

    var fmt = opts.format || function (v) { return Math.round(v * 100) + '%'; };
    var pct = document.createElement('span');
    pct.textContent = fmt(settings[opts.key]);
    Object.assign(pct.style, { color: '#a6adc8', fontSize: '11px', width: '40px', flexShrink: '0', textAlign: 'right', marginLeft: 'auto' });

    function refreshDim() {
      var enabled = !checkbox || checkbox.checked;
      var op = enabled ? '1' : '0.4';
      slider.style.opacity = op;
      pct.style.opacity = op;
      lbl.style.opacity = op;
      slider.disabled = !enabled;
    }
    refreshDim();

    slider.addEventListener('input', function () {
      var v = parseFloat(slider.value);
      settings[opts.key] = v;
      (opts.extraKeys || []).forEach(function (k) { settings[k] = v; });
      pct.textContent = fmt(v);
      saveSettings(settings); applySettings();
    });
    if (checkbox) {
      checkbox.addEventListener('change', function () {
        settings[opts.enabledKey] = checkbox.checked;
        (opts.extraEnabledKeys || []).forEach(function (k) { settings[k] = checkbox.checked; });
        saveSettings(settings); applySettings(); refreshDim();
      });
      controlSyncers[opts.enabledKey] = function () {
        checkbox.checked = !!settings[opts.enabledKey]; refreshDim();
      };
    }
    controlSyncers[opts.key] = function () {
      slider.value = settings[opts.key];
      pct.textContent = fmt(settings[opts.key]);
    };
    // Refresh this row's slider + checkbox from current settings. Used by the
    // object-shading section, which aggregates several rows that may share a key.
    row.spdrRefresh = function () {
      slider.value = settings[opts.key];
      pct.textContent = fmt(settings[opts.key]);
      if (checkbox) checkbox.checked = !!settings[opts.enabledKey];
      refreshDim();
    };

    if (checkbox) header.appendChild(checkbox);
    header.appendChild(lbl);
    if (opts.hilite) header.appendChild(makeHiliteIcon(opts.hilite, opts.hiliteTitle));
    header.appendChild(pct);
    row.appendChild(header);
    row.appendChild(wrapSliderWithTicks(slider, opts.min, opts.max, sliderTicks(opts.key, opts.ticks)));
    return row;
  }

  function makeOpacityRow(opacityKey, swatchRef, ticks) {
    var row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' });

    var lbl = document.createElement('span');
    lbl.textContent = 'Opacity:';
    Object.assign(lbl.style, { color: '#a6adc8', fontSize: '11px', flexShrink: '0', width: '72px' });

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0'; slider.max = '1'; slider.step = '0.05';
    slider.value = settings[opacityKey];
    Object.assign(slider.style, { flex: '1', cursor: 'pointer', accentColor: '#89b4fa', minWidth: '0' });

    var pct = document.createElement('span');
    pct.textContent = Math.round(settings[opacityKey] * 100) + '%';
    Object.assign(pct.style, { color: '#a6adc8', fontSize: '11px', width: '40px', textAlign: 'right' });

    slider.addEventListener('input', function () {
      var v = parseFloat(slider.value);
      settings[opacityKey] = v;
      pct.textContent = Math.round(v * 100) + '%';
      saveSettings(settings); applySettings();
      if (swatchRef && swatchRef.__refreshSwatch) swatchRef.__refreshSwatch();
    });
    controlSyncers[opacityKey] = function () {
      slider.value = settings[opacityKey];
      pct.textContent = Math.round(settings[opacityKey] * 100) + '%';
      if (swatchRef && swatchRef.__refreshSwatch) swatchRef.__refreshSwatch();
    };

    row.appendChild(lbl);
    row.appendChild(wrapSliderWithTicks(slider, 0, 1, sliderTicks(opacityKey, ticks)));
    row.appendChild(pct);
    return row;
  }

  function makeWidthRow(widthKey) {
    var row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' });

    var lbl = document.createElement('span');
    lbl.textContent = 'Width:';
    Object.assign(lbl.style, { color: '#a6adc8', fontSize: '11px', flexShrink: '0' });

    var input = document.createElement('input');
    input.type = 'text';
    input.value = settings[widthKey];
    input.size = 6;
    Object.assign(input.style, {
      width: '60px', padding: '2px 6px',
      border: '1px solid #45475a', borderRadius: '4px',
      background: '#313244', color: '#cdd6f4', fontSize: '12px',
    });

    var unit = document.createElement('span');
    unit.textContent = 'px';
    Object.assign(unit.style, { color: '#a6adc8', fontSize: '11px' });

    input.addEventListener('input', function () {
      // Accept only numeric values (or empty)
      var v = input.value.trim();
      if (v === '' || /^\d+(\.\d+)?$/.test(v)) {
        settings[widthKey] = v;
        saveSettings(settings); applySettings();
      }
    });
    controlSyncers[widthKey] = function () { input.value = settings[widthKey]; };

    row.appendChild(lbl); row.appendChild(input); row.appendChild(unit);
    return row;
  }

  // Radio button row: label + N labelled radio inputs sharing a name.
  // options: [{value: 'center', label: 'Center'}, ...]
  function makeRadioRow(labelText, settingKey, options) {
    var row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', flexWrap: 'wrap' });

    var lbl = document.createElement('span');
    lbl.textContent = labelText + ':';
    Object.assign(lbl.style, { color: '#a6adc8', fontSize: '11px', flexShrink: '0' });
    row.appendChild(lbl);

    var radios = [];
    options.forEach(function (opt) {
      var l = document.createElement('label');
      Object.assign(l.style, { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#cdd6f4', fontSize: '11px' });
      var r = document.createElement('input');
      r.type = 'radio';
      r.name = 'spdr-radio-' + settingKey;
      r.value = opt.value;
      r.checked = settings[settingKey] === opt.value;
      Object.assign(r.style, { cursor: 'pointer', accentColor: '#89b4fa', margin: '0' });
      r.addEventListener('change', function () {
        if (r.checked) {
          settings[settingKey] = opt.value;
          saveSettings(settings); applySettings();
        }
      });
      var t = document.createElement('span');
      t.textContent = opt.label;
      l.appendChild(r); l.appendChild(t);
      row.appendChild(l);
      radios.push(r);
    });

    controlSyncers[settingKey] = function () {
      radios.forEach(function (r) { r.checked = r.value === settings[settingKey]; });
    };
    return row;
  }

  // Offset row: numeric input that allows negative + decimal values.
  function makeOffsetRow(offsetKey) {
    var row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' });

    var lbl = document.createElement('span');
    lbl.textContent = 'Offset:';
    Object.assign(lbl.style, { color: '#a6adc8', fontSize: '11px', flexShrink: '0' });

    var input = document.createElement('input');
    input.type = 'text';
    input.value = settings[offsetKey];
    input.size = 6;
    Object.assign(input.style, {
      width: '60px', padding: '2px 6px',
      border: '1px solid #45475a', borderRadius: '4px',
      background: '#313244', color: '#cdd6f4', fontSize: '12px',
    });

    var unit = document.createElement('span');
    unit.textContent = 'px';
    Object.assign(unit.style, { color: '#a6adc8', fontSize: '11px' });

    input.addEventListener('input', function () {
      var v = input.value.trim();
      // Allow empty, negative, decimal, lone "-" (mid-typing)
      if (v === '' || v === '-' || /^-?\d+(\.\d+)?$/.test(v) || /^-?\.\d+$/.test(v)) {
        settings[offsetKey] = v;
        saveSettings(settings); applySettings();
      }
    });
    controlSyncers[offsetKey] = function () { input.value = settings[offsetKey]; };

    row.appendChild(lbl); row.appendChild(input); row.appendChild(unit);
    return row;
  }

  function makeSubCheckbox(settingKey, label) {
    var wrap = document.createElement('label');
    Object.assign(wrap.style, {
      display: 'flex', alignItems: 'center', gap: '8px',
      marginTop: '6px', cursor: 'pointer', color: '#cdd6f4', fontSize: '12px',
    });
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!settings[settingKey];
    Object.assign(cb.style, {
      cursor: 'pointer', accentColor: '#89b4fa',
      width: '13px', height: '13px', flexShrink: '0', margin: '0',
    });
    cb.addEventListener('change', function () {
      settings[settingKey] = cb.checked;
      saveSettings(settings); applySettings();
    });
    controlSyncers[settingKey] = function () { cb.checked = !!settings[settingKey]; };
    var txt = document.createElement('span');
    txt.textContent = label;
    wrap.appendChild(cb); wrap.appendChild(txt);
    return wrap;
  }

  // Sub-row: label + swatch on top row, opacity slider beneath. No per-row reset.
  function makeColorRow(label, colorKey, opacityKey, hilite, hiliteTitle, ticks) {
    var wrap = document.createElement('div');
    Object.assign(wrap.style, { marginTop: '6px' });

    var topRow = document.createElement('div');
    Object.assign(topRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });

    var lbl = document.createElement('span');
    lbl.textContent = label;
    // 0 1 auto so the icon hugs the label text; swatch pushed right (margin-left:auto).
    Object.assign(lbl.style, { color: '#cdd6f4', fontSize: '12px', flex: '0 1 auto' });

    var swatchRef = makeColorControl(colorKey, opacityKey);
    swatchRef.style.marginLeft = 'auto';
    topRow.appendChild(lbl);
    if (hilite) topRow.appendChild(makeHiliteIcon(hilite, hiliteTitle));
    topRow.appendChild(swatchRef);
    wrap.appendChild(topRow);
    if (opacityKey) wrap.appendChild(makeOpacityRow(opacityKey, swatchRef, ticks));
    return wrap;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Settings clarity: per-control 👁 hover icons (makeHiliteIcon + HT getters
  // below). Hovering one outlines exactly what that control affects on the live
  // puzzle; if the element type isn't present, a small "nothing here" tooltip
  // appears beside the pointer (EMPTY_HINT). Element types that can simulate an
  // example on hover (digits, pencilmarks, region borders, selection) show that
  // instead of a tooltip.
  // ═══════════════════════════════════════════════════════════════════════════

  // The highlight overlay. Rather than draw a bounding box per target (which is
  // wrong for line/path elements — a single grid path's bbox is the whole grid,
  // so it looks like just the outer border), we TRACE the real geometry: clone
  // each svg target into an overlay <svg> that mirrors the board's viewBox +
  // on-screen rect, transformed by the element's own CTM so it lands exactly over
  // the original. Text targets get a box around their glyph bounds; non-svg
  // targets (e.g. a tool button) get a fixed outline div. The overlay flashes once
  // on appearance and HOLDS bright until the icon is left. Sits above everything,
  // incl. the settings panel, which is dimmed when a target lies under it.
  var spdrHi = (function () {
    var NS = 'http://www.w3.org/2000/svg', STROKE = '#ffd24a';
    var layer = null, osvg = null, oexsvg = null, divPool = [], dimmedPanel = null;
    function ensure() {
      if (layer) return;
      var st = document.createElement('style');
      // spdrHiFade: hover flash-in then HOLD (fill-mode forwards, no loop).
      // spdrHiPulse: the CLICK action — a gentle gradual brighten→dim cycle (twice)
      // that ends back at full opacity, so it overlays the steady hover-hold without
      // fighting it (no on/off toggling of the real effect).
      st.textContent = '@keyframes spdrHiFade{0%{opacity:.12}45%{opacity:1}100%{opacity:1}}'
        + '@keyframes spdrHiPulse{0%{opacity:1}50%{opacity:.1}100%{opacity:1}}';
      document.head.appendChild(st);
      layer = document.createElement('div');
      layer.id = 'spdr-highlight-layer';
      Object.assign(layer.style, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', pointerEvents: 'none', zIndex: '2147483646' });
      osvg = document.createElementNS(NS, 'svg');
      Object.assign(osvg.style, { position: 'fixed', pointerEvents: 'none', overflow: 'visible', display: 'none', filter: 'drop-shadow(0 0 1.5px ' + STROKE + ')' });
      layer.appendChild(osvg);
      // Separate overlay for "example" content (simulated digits) — NO drop-shadow
      // filter, so example digits render crisp instead of hazy. addText draws here.
      oexsvg = document.createElementNS(NS, 'svg');
      Object.assign(oexsvg.style, { position: 'fixed', pointerEvents: 'none', overflow: 'visible', display: 'none' });
      layer.appendChild(oexsvg);
      document.body.appendChild(layer);
    }
    function div(i) {
      if (divPool[i]) return divPool[i];
      var d = document.createElement('div');
      Object.assign(d.style, { position: 'fixed', borderRadius: '5px', boxSizing: 'border-box', pointerEvents: 'none', display: 'none', border: '2px solid ' + STROKE, boxShadow: '0 0 6px 1px rgba(255,210,74,.55)' });
      layer.appendChild(d); divPool[i] = d; return d;
    }
    function clearSvg() {
      while (osvg.firstChild) osvg.removeChild(osvg.firstChild);
      if (oexsvg) while (oexsvg.firstChild) oexsvg.removeChild(oexsvg.firstChild);
    }
    // Restart the one-shot flash-then-hold animation on an element.
    function flash(el) { el.style.animation = 'none'; void el.getBoundingClientRect(); el.style.animation = 'spdrHiFade 430ms ease-out 1 forwards'; }
    // Style a cloned svg node as a highlight. paint 'fill' glows the filled area;
    // 'stroke' (the default for every target) traces the outline/line. Constant
    // on-screen width via non-scaling-stroke.
    function styleNode(node, m, paint) {
      node.removeAttribute('id'); node.removeAttribute('class');
      if (node.querySelectorAll) Array.prototype.forEach.call(node.querySelectorAll('*'), function (d) { d.removeAttribute('id'); d.removeAttribute('class'); });
      node.setAttribute('transform', 'matrix(' + m.a + ',' + m.b + ',' + m.c + ',' + m.d + ',' + m.e + ',' + m.f + ')');
      node.setAttribute('vector-effect', 'non-scaling-stroke');
      if (paint === 'fill') {
        // Glow the filled area itself — for thin shapes (e.g. multi-color border
        // strips) this reads as a clean solid bar, not a doubled outline.
        node.setAttribute('fill', STROKE); node.setAttribute('fill-opacity', '0.8');
        node.setAttribute('stroke', 'none');
        node.style.cssText = 'fill:' + STROKE + ' !important;fill-opacity:.8 !important;stroke:none !important;';
      } else {
        node.setAttribute('fill', 'none');
        node.setAttribute('stroke', STROKE); node.setAttribute('stroke-width', '2.5'); node.setAttribute('stroke-opacity', '1');
        node.style.cssText = 'fill:none !important;stroke:' + STROKE + ' !important;stroke-opacity:1 !important;';
      }
    }
    // Position the overlay svg over the full window with a 1:1 (CSS-px) viewBox, so
    // getScreenCTM matrices and raw screen coordinates both map straight through.
    function positionOverlay() {
      var W = window.innerWidth, H = window.innerHeight;
      [osvg, oexsvg].forEach(function (s) {
        if (!s) return;
        Object.assign(s.style, { left: '0', top: '0', width: W + 'px', height: H + 'px', display: 'block' });
        s.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
        s.setAttribute('preserveAspectRatio', 'none');
      });
    }
    function show(els, paint, dedupe) {
      ensure();
      els = (els || []).filter(Boolean);
      if (els.length > 500) els = els.slice(0, 500); // cap: avoid pathological perf
      clearSvg();
      positionOverlay();
      var di = 0, screenRects = [], svgUsed = false, cs = getGridCellSize();
      // De-dupe mode (object shading): each shaded cell is a small INSET rect, so
      // outlining every one draws parallel lines between neighbours. Instead we build
      // the SET of grid cells that contain a shaded rect, then draw a perimeter edge
      // only where the neighbouring cell is NOT in the set → one clean outline around
      // the whole shaded region, with no interior lines. (A cell-set, not edge-count,
      // so it's robust when a cell holds several shaded elements — underlay + overlay.)
      // Rotated rects (e.g. diamond markers) and non-rects fall through to tracing.
      var boardEl = document.getElementById('svgrenderer');
      var boardCTM = (dedupe && cs && boardEl && boardEl.getScreenCTM) ? boardEl.getScreenCTM() : null;
      var cellSet = {};
      els.forEach(function (el) {
        var r = el.getBoundingClientRect && el.getBoundingClientRect();
        if (r && (r.width || r.height)) screenRects.push(r);
        var isSvg = typeof el.getScreenCTM === 'function';
        var tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (isSvg) {
          var m; try { m = el.getScreenCTM(); } catch (e) { m = null; }
          if (!m) return;
          var rotated = Math.abs(m.b) > 0.01 || Math.abs(m.c) > 0.01;
          // 'persquare' dedupe draws one clean box around each occupied grid CELL.
          // It accepts <path> (Cell shading's split-color halves) and <text>/<tspan>
          // (digits + pencilmarks) in addition to <rect>, mapping each to its cell via
          // getBBox — so digits/marks highlight as a cell outline, not a glyph-tight box,
          // and multiple marks in one cell collapse to a single square. Others = rect-only.
          if (boardCTM && !rotated && (tag === 'rect' || (dedupe === 'persquare' && (tag === 'path' || tag === 'text' || tag === 'tspan')))) {
            var bx, by, bw, bh;
            if (dedupe === 'persquare') {
              var bb; try { bb = el.getBBox(); } catch (e) { bb = null; }
              if (!bb || (!bb.width && !bb.height)) return;
              bx = bb.x; by = bb.y; bw = bb.width; bh = bb.height;
            } else {
              bx = parseFloat(el.getAttribute('x')) || 0; by = parseFloat(el.getAttribute('y')) || 0;
              bw = parseFloat(el.getAttribute('width')) || 0; bh = parseFloat(el.getAttribute('height')) || 0;
            }
            // Record which grid cell this shaded element occupies (deduped by cell).
            cellSet[Math.floor((bx + bw / 2) / cs) + ',' + Math.floor((by + bh / 2) / cs)] = 1;
            svgUsed = true;
            return;
          }
          // Default: trace the OUTLINE (a glowing line around the object / along the
          // line). PAINT[key]='fill' opts into a filled glow; 'bbox' outlines the
          // element's bounding box instead of its exact path — used for colored cells
          // so we draw a clean square, not the diagonal split between two cell colours.
          var node, mode = paint || 'stroke';
          if (tag === 'text' || tag === 'tspan' || mode === 'bbox') {
            var bb; try { bb = el.getBBox(); } catch (e) { bb = null; }
            if (!bb || (!bb.width && !bb.height)) return;
            var pad = (tag === 'text' || tag === 'tspan') ? Math.max(1, bb.height * 0.08) : 0;
            node = document.createElementNS(NS, 'rect');
            node.setAttribute('x', bb.x - pad); node.setAttribute('y', bb.y - pad);
            node.setAttribute('width', bb.width + 2 * pad); node.setAttribute('height', bb.height + 2 * pad);
            node.setAttribute('rx', '2');
            mode = 'stroke';   // outline the box, don't fill it
          } else {
            node = el.cloneNode(true);
          }
          styleNode(node, m, mode);
          osvg.appendChild(node); svgUsed = true;
        } else if (r) {
          // Non-svg target (e.g. a SudokuPad tool button) → fixed outline div.
          var b = div(di++); b.style.display = 'block';
          b.style.left = (r.left - 3) + 'px'; b.style.top = (r.top - 3) + 'px';
          b.style.width = (r.width + 6) + 'px'; b.style.height = (r.height + 6) + 'px';
          flash(b);
        }
      });
      // Trace the perimeter of the occupied-cell set: draw an edge only where the
      // adjacent cell is empty. Contiguous cells merge into one clean outline.
      if (boardCTM) {
        function PT(ux, uy) { return { x: boardCTM.a * ux + boardCTM.c * uy + boardCTM.e, y: boardCTM.b * ux + boardCTM.d * uy + boardCTM.f }; }
        function seg(p1, p2) {
          var ln = document.createElementNS(NS, 'line');
          ln.setAttribute('x1', p1.x); ln.setAttribute('y1', p1.y); ln.setAttribute('x2', p2.x); ln.setAttribute('y2', p2.y);
          ln.setAttribute('stroke', STROKE); ln.setAttribute('stroke-width', '2.5'); ln.setAttribute('stroke-opacity', '1');
          ln.style.cssText = 'stroke:' + STROKE + ' !important;stroke-opacity:1 !important;';
          osvg.appendChild(ln);
        }
        // 'persquare' (Cell shading) draws a full square around every occupied cell —
        // one clean box per colored cell (single- or multi-color look identically).
        // Merge mode (object shading) draws an edge only where the neighbour is empty,
        // collapsing a contiguous shaded block into one union outline.
        var drawAll = (dedupe === 'persquare');
        Object.keys(cellSet).forEach(function (k) {
          var p = k.split(','), cx = +p[0], cy = +p[1];
          var x0 = cx * cs, y0 = cy * cs, x1 = x0 + cs, y1 = y0 + cs;
          if (drawAll || !cellSet[cx + ',' + (cy - 1)]) seg(PT(x0, y0), PT(x1, y0)); // top
          if (drawAll || !cellSet[cx + ',' + (cy + 1)]) seg(PT(x0, y1), PT(x1, y1)); // bottom
          if (drawAll || !cellSet[(cx - 1) + ',' + cy]) seg(PT(x0, y0), PT(x0, y1)); // left
          if (drawAll || !cellSet[(cx + 1) + ',' + cy]) seg(PT(x1, y0), PT(x1, y1)); // right
        });
      }
      for (; di < divPool.length; di++) divPool[di].style.display = 'none';
      if (svgUsed) flash(osvg); else osvg.style.display = 'none';
      dimPanel(screenRects);
    }
    // Append an illustrative digit to the overlay at SCREEN coords (used by the
    // pencilmark "example" hover). Purely visual — never touches the puzzle model.
    function addText(sx, sy, text, color, sizePx, weight) {
      ensure();
      if (oexsvg.style.display === 'none') positionOverlay();
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', sx); t.setAttribute('y', sy);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('font-size', sizePx);
      t.setAttribute('font-family', 'Tahoma, Roboto, Arial, sans-serif');  // matches SudokuPad's digit font
      t.setAttribute('font-weight', weight || '400');
      t.setAttribute('fill', color);
      t.style.cssText = 'fill:' + color + ' !important;';
      t.textContent = text;
      oexsvg.appendChild(t);   // crisp (non-filtered) example layer — no haze
      flash(oexsvg);
    }
    // Draw a glowing highlight box around a whole grid cell (row, col) on osvg — used
    // by the example hovers so simulated digits get a CELL outline (matching the real
    // per-cell highlight), not a glyph-tight box.
    function addCellBox(row, col) {
      ensure();
      var board = document.getElementById('svgrenderer'); if (!board || !board.getScreenCTM) return;
      var cs = getGridCellSize(); if (!cs) return;
      var m; try { m = board.getScreenCTM(); } catch (e) { m = null; } if (!m) return;
      if (osvg.style.display === 'none') positionOverlay();
      function P(ux, uy) { return (m.a * ux + m.c * uy + m.e) + ',' + (m.b * ux + m.d * uy + m.f); }
      var x0 = col * cs, y0 = row * cs, x1 = x0 + cs, y1 = y0 + cs;
      var poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)].join(' '));
      poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', STROKE);
      poly.setAttribute('stroke-width', '2.5'); poly.setAttribute('stroke-opacity', '1');
      poly.style.cssText = 'fill:none !important;stroke:' + STROKE + ' !important;stroke-opacity:1 !important;';
      osvg.appendChild(poly);
      flash(osvg);
    }
    // Draw a straight highlight segment between two USER-space points, mapped to
    // screen via `m` (the board root's getScreenCTM). Used to trace a clean,
    // de-duplicated region boundary (one line per edge — no doubled strips).
    function addLine(x1, y1, x2, y2, m) {
      ensure();
      if (osvg.style.display === 'none') positionOverlay();
      var ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', m.a * x1 + m.c * y1 + m.e); ln.setAttribute('y1', m.b * x1 + m.d * y1 + m.f);
      ln.setAttribute('x2', m.a * x2 + m.c * y2 + m.e); ln.setAttribute('y2', m.b * x2 + m.d * y2 + m.f);
      ln.setAttribute('stroke', STROKE); ln.setAttribute('stroke-width', '2.5'); ln.setAttribute('stroke-opacity', '1');
      ln.style.cssText = 'stroke:' + STROKE + ' !important;stroke-opacity:1 !important;';
      osvg.appendChild(ln);
      flash(osvg);
    }
    // The click action: a gentle gradual brighten→dim pulse of the CURRENT
    // highlight (overlay svg + any outline divs), ending back at full opacity so it
    // doesn't disturb the steady hover-hold. Purely visual — no effect toggling.
    function pulse() {
      [osvg, oexsvg].forEach(function (s) {
        if (s && s.style.display !== 'none' && s.firstChild) { s.style.animation = 'none'; void s.getBoundingClientRect(); s.style.animation = 'spdrHiPulse 520ms ease-in-out 2'; }
      });
      for (var i = 0; i < divPool.length; i++) {
        var d = divPool[i];
        if (d.style.display !== 'none') { d.style.animation = 'none'; void d.getBoundingClientRect(); d.style.animation = 'spdrHiPulse 520ms ease-in-out 2'; }
      }
    }
    // Occlusion handling: if any target overlaps the settings panel, fade the panel
    // (while the highlight shows) so the user can see what's highlighted beneath it.
    function dimPanel(rects) {
      var panel = document.getElementById('sp-fix-panel');
      if (!panel) return;
      var pr = panel.getBoundingClientRect();
      var overlap = rects.some(function (r) {
        return r.left < pr.right && r.right > pr.left && r.top < pr.bottom && r.bottom > pr.top;
      });
      if (overlap) {
        if (!dimmedPanel) { dimmedPanel = panel; panel.style.transition = 'opacity .12s'; }
        panel.style.opacity = '0.25';
      } else if (dimmedPanel) {
        dimmedPanel.style.opacity = ''; dimmedPanel = null;
      }
    }
    function hide() {
      if (osvg) { clearSvg(); osvg.style.display = 'none'; }
      if (oexsvg) oexsvg.style.display = 'none';
      for (var i = 0; i < divPool.length; i++) divPool[i].style.display = 'none';
      if (dimmedPanel) { dimmedPanel.style.opacity = ''; dimmedPanel = null; }
    }
    return { show: show, hide: hide, addText: addText, addLine: addLine, addCellBox: addCellBox, pulse: pulse };
  })();

  // Tiny tooltip beside the mouse pointer — used on eyeball hover to say "nothing to
  // highlight here" when the section's element type isn't present in this puzzle.
  // (Replaces the old persistent in-panel ⚠ warning lines.)
  var spdrTip = (function () {
    var el = null;
    function ensure() {
      if (el) return;
      el = document.createElement('div');
      Object.assign(el.style, {
        position: 'fixed', zIndex: '2147483647', pointerEvents: 'none', display: 'none',
        background: '#1e1e2e', color: '#f9a85a', border: '1px solid #45475a',
        borderRadius: '6px', padding: '4px 8px', fontSize: '11px',
        fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '210px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.55)', whiteSpace: 'normal', lineHeight: '1.3',
      });
      document.body.appendChild(el);
    }
    function move(x, y) {
      if (!el || el.style.display === 'none') return;
      var w = el.offsetWidth || 160, h = el.offsetHeight || 24;
      var left = x - w - 14; if (left < 6) left = x + 16;      // prefer left of pointer (panel is on the right)
      var top = y - h - 6;   if (top < 6) top = y + 16;
      el.style.left = left + 'px'; el.style.top = top + 'px';
    }
    function show(x, y, text) { ensure(); el.textContent = text; el.style.display = 'block'; move(x, y); }
    function hide() { if (el) el.style.display = 'none'; }
    return { show: show, move: move, hide: hide };
  })();

  // Example helpers (safe — overlay-only, or transient UI selection):
  // Map a grid cell (row,col) centre to screen px via the board root's CTM.
  function cellCenterScreen(r, c) {
    var board = document.getElementById('svgrenderer'); if (!board || !board.getScreenCTM) return null;
    var cs = getGridCellSize(); if (!cs) return null;
    var m = board.getScreenCTM(); if (!m) return null;
    var ux = c * cs + cs / 2, uy = r * cs + cs / 2;
    return { x: m.a * ux + m.c * uy + m.e, y: m.b * ux + m.d * uy + m.f, cs: cs, scale: Math.sqrt(m.a * m.a + m.b * m.b) };
  }
  // First `n` cells with no given/entered value, so example marks land in empty cells.
  function emptyExampleCells(n) {
    var cs = getGridCellSize(), N = detectGridSize(); if (!cs || !N) return [];
    var occ = {};
    document.querySelectorAll('#cell-givens text, #cell-values text').forEach(function (t) {
      try { var b = t.getBBox(); occ[Math.floor((b.y + b.height / 2) / cs) + ',' + Math.floor((b.x + b.width / 2) / cs)] = 1; } catch (e) {}
    });
    var out = [];
    for (var r = 0; r < N && out.length < n; r++) for (var c = 0; c < N && out.length < n; c++) if (!occ[r + ',' + c]) out.push([r, c]);
    return out;
  }
  function numOr(v, d) { var n = parseFloat(v); return isFinite(n) ? n : d; }

  // Draw example pencilmarks (overlay-only) across 3 empty cells, matching the
  // section's chosen colours + opacity so the user can tune them on a blank puzzle:
  //   cell 1 = valid digits (1 2 3),  cell 2 = invalid digits (4 5 6),
  //   cell 3 = a mix of both. `kind` is 'center' or 'corner'. Skipped when real
  // marks of that kind already exist (the highlight outlines those instead).
  function drawPencilExample(kind) {
    var realSel = kind === 'corner' ? '#cell-pencilmarks text' : '#cell-candidates tspan';
    if (document.querySelector(realSel)) return null;
    var vC = hexToRgba(settings[kind + 'ValidColor']   || '#338fe8', numOr(settings[kind + 'ValidOpacity'],   1));
    var iC = hexToRgba(settings[kind + 'InvalidColor'] || '#cd6666', numOr(settings[kind + 'InvalidOpacity'], 1));
    var plans = [
      [['1', vC], ['2', vC], ['3', vC]],                              // valid
      [['4', iC], ['5', iC], ['6', iC]],                              // invalid
      [['1', vC], ['2', vC], ['3', vC], ['4', iC], ['5', iC], ['6', iC]], // mixed
    ];
    emptyExampleCells(3).forEach(function (rc, idx) {
      var plan = plans[idx]; if (!plan) return;
      var p = cellCenterScreen(rc[0], rc[1]); if (!p) return;
      var cellPx = p.cs * p.scale;
      spdrHi.addCellBox(rc[0], rc[1]);   // cell outline around the example
      if (kind === 'corner') {
        // Corner marks measure ~0.275 × cell in SudokuPad.
        var size = cellPx * 0.275, o = cellPx * 0.30;
        // SudokuPad fills corner marks in this typing order: TL, TR, BL, BR, then
        // TC, BC. So 6 digits typed 1-6 read (TL→BR) as 1,5,2,3,6,4 — match that.
        var pos = [[-o, -o], [o, -o], [-o, o], [o, o], [0, -o], [0, o]];
        plan.forEach(function (d, i) { var q = pos[i] || [0, 0]; spdrHi.addText(p.x + q[0], p.y + q[1], d[0], d[1], size); });
      } else {
        // Center marks measure ~0.30 × cell; shrink a touch when many so they fit.
        var n = plan.length, sz = cellPx * (n > 4 ? 0.22 : 0.30), step = sz * 0.72;
        var startX = p.x - (n - 1) / 2 * step;
        plan.forEach(function (d, i) { spdrHi.addText(startX + i * step, p.y, d[0], d[1], sz); });
      }
    });
    return null;
  }
  // Draw example full-sized digits (given / placed) across 3 empty cells, matching
  // the chosen colour + opacity. Skipped when real digits of that kind exist.
  function drawDigitExample(colorKey, opacityKey, realSel) {
    if (realSel && document.querySelector(realSel)) return null;
    var rgba = hexToRgba(settings[colorKey] || '#e8e6e3', numOr(settings[opacityKey], 1));
    emptyExampleCells(3).forEach(function (rc, idx) {
      var p = cellCenterScreen(rc[0], rc[1]); if (!p) return;
      var cellPx = p.cs * p.scale;
      spdrHi.addCellBox(rc[0], rc[1]);          // cell outline around the example
      spdrHi.addText(p.x, p.y, String(idx * 3 + 1), rgba, cellPx * 0.75);  // ~0.75 × cell = SudokuPad's 48px digit
    });
    return null;
  }
  // Trace a clean, de-duplicated region/box boundary (one line per edge — not the
  // doubled outlines of every box). Used as the "where the border would be" hover
  // for Center / Multi-color borders when those subsections aren't currently drawn.
  function drawRegionBoundaryExample() {
    var board = document.getElementById('svgrenderer'); if (!board || !board.getScreenCTM) return null;
    var m = board.getScreenCTM(); if (!m) return null;
    var boxes = document.querySelectorAll('#cell-grids path:not(.cell-grid)');
    if (!boxes.length) return null;
    var seen = {};
    function edge(x1, y1, x2, y2) {
      var k = Math.round(x1) + ',' + Math.round(y1) + ',' + Math.round(x2) + ',' + Math.round(y2);
      if (seen[k]) return; seen[k] = 1; spdrHi.addLine(x1, y1, x2, y2, m);
    }
    boxes.forEach(function (p) {
      var b; try { b = p.getBBox(); } catch (e) { return; }
      edge(b.x, b.y, b.x + b.width, b.y);
      edge(b.x, b.y + b.height, b.x + b.width, b.y + b.height);
      edge(b.x, b.y, b.x, b.y + b.height);
      edge(b.x + b.width, b.y, b.x + b.width, b.y + b.height);
    });
    return null;
  }
  // Select a small block of example cells (so the selection border has something to
  // outline). Left selected on purpose when the user moves away.
  function selectExampleCells() {
    if (typeof Framework === 'undefined' || !Framework.getApp) return;
    Promise.resolve(Framework.getApp()).then(function (app) {
      try {
        if (!app || !app.puzzle || !app.puzzle.cells) return;
        var pick = app.puzzle.cells.filter(function (c) { return c.row < 2 && c.col < 2; });
        if (pick.length && app.select) app.select(pick);
      } catch (e) {}
    }).catch(function () {});
  }

  // Small hover-icon (👁) placed right after a control's label. Identified by a KEY
  // into the central maps below (HT = what to highlight, PAINT = fill/stroke glow,
  // ONSHOW = optional hover "example"). Hovering outlines the targets on the live
  // puzzle and HOLDS them bright until mouse-out; clicking pulses that highlight
  // (gradual brighten→dim, twice) without disturbing the steady hold or the puzzle.
  function makeHiliteIcon(key, title) {
    var ic = document.createElement('span');
    ic.textContent = '👁';
    ic.title = title || 'Hover to show what this affects; click to pulse it';
    // pointerEvents:auto so the icon stays hoverable/clickable even when its section
    // is disabled (the section dims its sub-content with pointer-events:none; a child
    // can opt back in). Lets the user preview a section's effect before enabling it.
    Object.assign(ic.style, { fontSize: '20px', lineHeight: '1', cursor: 'pointer', opacity: '0.55', flexShrink: '0', userSelect: 'none', filter: 'grayscale(1)', verticalAlign: 'middle', pointerEvents: 'auto' });
    var cleanup = null;
    function reshow() { var g = HT[key]; if (g) { try { spdrHi.show(g() || [], PAINT[key] || null, DEDUPE[key]); } catch (e) {} } }
    ic.addEventListener('mouseenter', function (e) {
      ic.style.opacity = '1'; ic.style.filter = 'none';
      reshow();
      if (ONSHOW[key]) { try { cleanup = ONSHOW[key](reshow) || null; } catch (e2) {} }
      // "Nothing here to highlight" tooltip beside the pointer (only for element
      // types that have no simulated example — see EMPTY_HINT).
      var eh = EMPTY_HINT[key];
      if (eh) { try { if (eh.test()) spdrTip.show(e.clientX, e.clientY, eh.msg); } catch (e2) {} }
    });
    ic.addEventListener('mousemove', function (e) { spdrTip.move(e.clientX, e.clientY); });
    ic.addEventListener('mouseleave', function () {
      ic.style.opacity = '0.55'; ic.style.filter = 'grayscale(1)';
      spdrHi.hide();
      spdrTip.hide();
      if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    });
    // Click pulses the already-shown highlight (the steady hover-hold stays put);
    // never toggles the section it sits in or the puzzle's settings.
    ic.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); spdrHi.pulse(); });
    return ic;
  }

  // ── Highlight target getters ───────────────────────────────────────────────
  // FOOLPROOF PRINCIPLE: a control's highlight must enumerate the SAME elements,
  // using the SAME predicates, that the control's apply code touches — never a
  // hand-written parallel selector that can drift. So the object-shading getters
  // below reuse the very functions the renderer uses (`shouldShadeOverlayRect`,
  // `isGrayColor`, `isLineStroke`, `CAGE_FILL_SEL`) and mirror fixAllUnderlays /
  // fixAllCagePaths / fixAllLines exactly. When you change what a control affects,
  // change it in one predicate and both apply + highlight follow.
  function hqa(sel) { try { return Array.prototype.slice.call(document.querySelectorAll(sel)); } catch (e) { return []; } }
  function firstOf(sel) { var e = document.querySelector(sel); return e ? [e] : []; }

  // The exact set of fill elements Object-shading governs — mirrors fixAllUnderlays
  // (#underlay rect + qualifying #overlay rect) and fixAllCagePaths (CAGE_FILL_SEL).
  function objFillSources() {
    var out = [];
    hqa('#underlay rect').forEach(function (e) { if (!isKropkiDotRect(e) && !isKropkiClueShape(e)) out.push(e); });
    hqa('#overlay rect').forEach(function (e) { if (shouldShadeOverlayRect(e)) out.push(e); });
    hqa(CAGE_FILL_SEL).forEach(function (e) { out.push(e); });
    return out;
  }
  // The exact sets of line strokes / line fills Object-shading governs — mirror
  // fixAllLines (incl. group-inherited strokes via isLineStroke/lineStrokeSrc and
  // filled arrow shapes via isLineFill). A path that is both stroked AND filled (the
  // #CFCFCF block arrows / diamonds) appears in both; harmless — the objColored/objGray
  // highlight de-dupes to cell outlines.
  function objLineStrokeSources() {
    var out = hqa('#arrows path').filter(isLineStroke);
    LINE_DOM_LAYER_IDS.forEach(function (id) {
      if (id === 'arrows') return;                 // handled above (block-arrow strokes too)
      out = out.concat(hqa('#' + id + ' path').filter(isLineCluePath));
    });
    return out;
  }
  // Block-arrow FILL shapes live only in #arrows; other line layers are fill:none.
  function objLineFillSources()   { return hqa('#arrows path').filter(isLineFill); }
  // The grayscale #overlay marker texts Object-shading governs — mirrors
  // fixOverlayMarkerText's gates (skip Kropki labels; original colour must be gray).
  // Always gray (coloured overlay text is left to DR), so they only ever feed the
  // gray side of objShade. Reads the captured orig fill so it's stable even after
  // shading has overwritten the live fill.
  function overlayMarkerColor(t) {
    var raw = (t.dataset.spdrOrigFill !== undefined && t.dataset.spdrOrigFill !== '')
      ? t.dataset.spdrOrigFill
      : (t.style.getPropertyValue('fill') || t.getAttribute('fill') || '');
    return parseColor(raw);
  }
  function objTextSources() {
    return hqa('#overlay text').filter(function (t) {
      if (t.dataset.spdrKropkiText !== undefined) return false;   // author Kropki label
      if (t.dataset.spdrKropkiLabel !== undefined) return false;  // our injected Kropki label
      var c = overlayMarkerColor(t);
      return !!(c && c.a !== 0 && isGrayColor(c));
    });
  }
  function fillColorIsGray(el) { var c = parseColor(el.getAttribute('fill') || ''); return c && c.a !== 0 ? isGrayColor(c) : null; }
  function hasPaintedStroke(el) { var s = el.getAttribute('stroke'); if (!s || s === 'none') return false; var c = parseColor(s); return !!(c && c.a !== 0); }
  // Colored vs gray routing matches computeObjectShade: fills by fill colour, lines
  // by stroke colour. Borders = shape OUTLINES only (applyShapeStroke targets), NOT
  // lines — lines route through the colored/gray sliders, not the Border slider.
  function lineStrokeColorIsGray(el) { var c = parseColor(lineStrokeSrc(el) || ''); return c && c.a !== 0 ? isGrayColor(c) : null; }
  function objShade(wantGray) {
    var out = [];
    objFillSources().forEach(function (e) { var g = fillColorIsGray(e); if (g === wantGray) out.push(e); });
    objLineStrokeSources().forEach(function (e) { var g = lineStrokeColorIsGray(e); if (g === wantGray) out.push(e); });
    objLineFillSources().forEach(function (e) { var g = fillColorIsGray(e); if (g === wantGray) out.push(e); });
    if (wantGray) objTextSources().forEach(function (e) { out.push(e); });  // gray overlay marker text
    return out;
  }

  var HT = {
    // Given digits highlight ONLY the real givens (no tool-button fallback) — when
    // none exist, ONSHOW.given simulates one in the chosen colour/opacity instead.
    given:         function () { return hqa('#cell-givens text, text.cell-given'); },
    // Placed digits highlight the real placed values AND always the digit-entry tool
    // button (#control-normal), even when values exist; ONSHOW simulates if none.
    userDigit:     function () { return hqa('#cell-values text, text.cell-value').concat(firstOf('#control-normal')); },
    // Mirrors fixLabelRect: LABEL_RECT_SEL minus COLOURED (saturated) fills (author
    // cosmetic shapes Object shading owns), minus fill="none"/transparent boxes
    // (invisible label anchors we leave alone), and minus Kropki dots (now owned
    // solely by the Kropki fix — fixLabelRect skips them too, so no overlap).
    labelBg:       function () { return hqa(LABEL_RECT_SEL).filter(function (r) { var fa = (r.getAttribute('fill') || '').trim().toLowerCase(); var c = parseColor(fa); if (fa === 'none' || (c && c.a === 0)) return false; if (isKropkiDotRect(r) || isKropkiClueShape(r)) return false; return !(c && c.a !== 0 && !isGrayColor(c)); }); },
    // Mirrors fixAllKropkiDots exactly via isKropkiDotRect (circular + black/white +
    // on a cell border): native feature-kropki, cosmetic textbg, AND class-less
    // #overlay/#underlay circles. Quadruples (grid corner) / bulbs / centre circles
    // / line endpoints fail the position or shape gate and are excluded.
    kropki:        function () { return hqa('rect.feature-kropki, rect.textbg, #overlay rect, #underlay rect').filter(isKropkiDotRect); },
    selection:     function () { return hqa('#cell-highlights path.cage-selectioncage'); },
    cellColors:    function () { var e = hqa('#cell-colors > *'); return e.length ? e : firstOf('#control-colour'); },
    // One eyeball per pencilmark kind (combined valid+invalid). When none exist,
    // ONSHOW draws a valid/invalid/mixed example in the chosen colours/opacity.
    centerMarks:   function () { return hqa('#cell-candidates tspan'); },
    cornerMarks:   function () { return hqa('#cell-pencilmarks text'); },
    objColored:    function () { return objShade(false); },
    objGray:       function () { return objShade(true); },
    objBorders:    function () { return objFillSources().filter(hasPaintedStroke); },
    // Combined — every object the section shades (colored + gray fills/lines). Used by
    // the Object Shading section-label eyeball that only shows while the section is
    // collapsed (the per-slider eyeballs are hidden then).
    objAll:        function () { return objShade(false).concat(objShade(true)); },
    // Region borders subsections — trace our injected clones when drawn (exact
    // geometry). When NOT drawn, regCenter/regMulti return [] and their ONSHOW traces
    // a clean de-duplicated region boundary instead (drawRegionBoundaryExample) so we
    // don't double-stroke every box outline. regCell still falls back to the live grid.
    regCenter:     function () { return hqa('[data-spdr-region-split] path[data-spdr-kind="center"]'); },
    regMulti:      function () { return hqa('[data-spdr-region-split] [data-spdr-kind="multi"]'); },
    regCell:       function () { var e = hqa('[data-spdr-region-split] path[data-spdr-kind="cell"]'); return e.length ? e : hqa('#cell-grids path.cell-grid'); },
    // Action-section checkboxes → the on-screen elements they show/hide.
    actionBtns:    function () { return hqa('#sp-fill-btn-wrap, #sp-clear-btn-wrap, #sp-clearall-btn-wrap'); },
    easyShade:     function () { return firstOf('#sp-easy-shade-btn'); },
  };

  // Paint override per key. Default for every target is 'stroke' (a glowing line
  // tracing the object/line outline). 'fill' opts a key into a filled glow — used
  // for the multi-color border STRIPS, which are thin rects: filling each reads as
  // one clean border bar, whereas outlining them draws doubled parallel lines.
  var PAINT = { regMulti: 'fill' };

  // Keys whose targets should be de-duplicated by grid cell. Value '1' = union
  // outline (object-shading fills/borders are blocks of adjacent cells; outlining
  // each doubled shared edges, so we draw the merged perimeter). Value 'persquare'
  // = one full box per occupied cell (Cell shading — a multi-color cell is split
  // into triangular path halves, both mapping to the same cell, so it highlights as
  // a single clean square just like a single-color cell, with no interior split line).
  var DEDUPE = {
    objColored: 1, objGray: 1, objBorders: 1, objAll: 1,
    cellColors: 'persquare',
    // Digits + pencilmarks highlight as a CELL box (not a glyph-tight outline);
    // multiple marks in one cell collapse to one square.
    given: 'persquare', userDigit: 'persquare', centerMarks: 'persquare', cornerMarks: 'persquare',
  };

  // Optional hover "example": runs when the icon is entered, may add a transient
  // demo so a blank puzzle still shows what the control affects. Receives a
  // `reshow` callback (re-run the highlight after async state lands) and may return
  // a cleanup fn (run on mouse-out). All overlay-only or transient UI — never edits
  // the puzzle model. Selection is the deliberate exception: it leaves cells picked.
  var ONSHOW = {
    // Full-sized digits: simulate in the chosen colour/opacity when none exist.
    given:         function () { return drawDigitExample('givenColor',     'givenOpacity',     '#cell-givens text, text.cell-given'); },
    userDigit:     function () { return drawDigitExample('userDigitColor', 'userDigitOpacity', '#cell-values text, text.cell-value'); },
    centerMarks:   function () { return drawPencilExample('center'); },
    cornerMarks:   function () { return drawPencilExample('corner'); },
    // When the center/multi border subsections aren't drawn, trace a clean region
    // boundary (one line per edge) so the icon shows where the border would go.
    regCenter:     function () { if (!document.querySelector('[data-spdr-region-split] path[data-spdr-kind="center"]')) return drawRegionBoundaryExample(); return null; },
    regMulti:      function () { if (!document.querySelector('[data-spdr-region-split] [data-spdr-kind="multi"]')) return drawRegionBoundaryExample(); return null; },
    selection:     function (reshow) {
      if (document.querySelector('#cell-highlights path.cage-selectioncage')) return null; // already a selection
      selectExampleCells();
      setTimeout(reshow, 150);   // re-trace once the selection border renders
      return null;               // leave the cells selected on mouse-out (as requested)
    },
  };

  // "Nothing to highlight" tooltip content, keyed by eyeball key. Only element types
  // that have NO simulated example need one (given/placed/center/corner/region/
  // selection all draw an example instead, so they're omitted). `test()` returns
  // true when the puzzle currently has none of that element. Shown beside the pointer
  // on hover (see makeHiliteIcon) — replaces the old in-panel ⚠ warning lines.
  var EMPTY_HINT = {
    labelBg:    { test: function () { return HT.labelBg().length === 0; },                          msg: 'There are no text labels in this puzzle.' },
    cellColors: { test: function () { return hqa('#cell-colors > *').length === 0; },               msg: 'There are no shaded cells in this puzzle.' },
    kropki:     { test: function () { return HT.kropki().length === 0; },                            msg: 'There are no Kropki dots in this puzzle.' },
    objColored: { test: function () { return objShade(false).length === 0; },                       msg: 'There are no colored objects in this puzzle.' },
    objGray:    { test: function () { return objShade(true).length === 0; },                        msg: 'There are no gray objects in this puzzle.' },
    objBorders: { test: function () { return objFillSources().filter(hasPaintedStroke).length === 0; }, msg: 'There are no object outlines in this puzzle.' },
    objAll:     { test: function () { return objShade(false).length === 0 && objShade(true).length === 0; }, msg: 'There are no shaded objects in this puzzle.' },
  };

  // A collapsible subsection inside a section: a checkbox row whose options are
  // hidden until its checkbox is on (used by the master-less sections — Region
  // borders, Given/placed digits, Pencilmarks). Returns the box element with a
  // `_spdrUpd()` method so the section can refresh it. (`masterEnabledKey` is an
  // optional generic hook that greys the row out when a parent master is off; no
  // current caller uses it.)
  //   opts: enabledKey, masterEnabledKey?, labelText, desc?, buildOptions(optDiv), hilite?, hiliteTitle?
  function makeCollapsibleSubsection(opts) {
    var box = document.createElement('div');
    var row = document.createElement('label');
    Object.assign(row.style, { display:'flex', alignItems:'center', gap:'7px', marginTop:'10px', cursor:'pointer', color:'#cdd6f4', fontSize:'12px' });
    var cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = !!settings[opts.enabledKey];
    Object.assign(cb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
    var txt = document.createElement('span'); txt.textContent = opts.labelText;
    row.appendChild(cb); row.appendChild(txt);
    if (opts.hilite) row.appendChild(makeHiliteIcon(opts.hilite, opts.hiliteTitle));
    box.appendChild(row);

    // Optional muted description line under the label (always visible, so the user
    // sees what the subsection does even while its options are collapsed).
    if (opts.desc) {
      var dsc = document.createElement('div');
      dsc.textContent = opts.desc;
      Object.assign(dsc.style, { color:'#6c7086', fontSize:'11px', marginTop:'2px', paddingLeft:'20px' });
      box.appendChild(dsc);
    }

    var opt = document.createElement('div');
    Object.assign(opt.style, { paddingLeft:'20px' });
    opts.buildOptions(opt);
    box.appendChild(opt);

    function masterOn() { return !opts.masterEnabledKey || !!settings[opts.masterEnabledKey]; }
    function upd() {
      var on = !!settings[opts.enabledKey], mOn = masterOn();
      cb.checked = on;
      opt.style.display = (on && mOn) ? '' : 'none';
      cb.disabled = !mOn;
      row.style.opacity = mOn ? '' : '0.5';
      row.style.cursor = mOn ? 'pointer' : 'default';
    }
    upd();
    cb.addEventListener('change', function () {
      if (!masterOn()) { cb.checked = !!settings[opts.enabledKey]; return; }
      settings[opts.enabledKey] = cb.checked;
      saveSettings(settings); applySettings(); upd();
    });
    controlSyncers[opts.enabledKey] = upd;
    box._spdrUpd = upd;
    return box;
  }

  // Button click/hover feedback, browser-refresh style. `spdr-fxbtn` gives every
  // panel button a hover brighten + an :active "depress" (translateY + dim, a 3D
  // press). `spdrFxButton(btn)` registers it and, on click, runs a brief dim→bright
  // "work" pulse (so even an instant action reads as "did something").
  //
  // The pulse is done with an inline filter + the class's transition (not a CSS
  // @keyframes animation) for two reasons:
  //   • Smoothness — a keyframe pulse hard-codes its own brightness(1) start, so on
  //     a hovered button (brightness 1.35) it snaps down before easing, which reads
  //     as a flash. Transitioning the inline filter eases from whatever the current
  //     brightness is (hover or rest) down to dim and back, both directions smooth.
  //   • No replay on reopen — an inline `animation` lingers on the element and a CSS
  //     animation restarts whenever the panel goes display:none→block, so every
  //     reset button re-pulsed each time the menu reopened. The inline filter is
  //     cleared after the pulse, leaving nothing to replay.
  // Uses filter/transform only (never the inline-set background), so it works on
  // every panel button regardless of its resting colours.
  var spdrFxInjected = false;
  function spdrEnsureFx() {
    if (spdrFxInjected) return;
    spdrFxInjected = true;
    var st = document.createElement('style');
    st.textContent =
      '.spdr-fxbtn{transition:filter .18s ease, transform .07s ease;}'
      + '.spdr-fxbtn:hover{filter:brightness(1.35);}'
      + '.spdr-fxbtn:active{transform:translateY(1px) scale(.96);filter:brightness(.8);}';
    document.head.appendChild(st);
  }
  function spdrFxButton(btn) {
    spdrEnsureFx();
    btn.classList.add('spdr-fxbtn');
    btn.addEventListener('click', function () {
      // Smooth dim, then clear so it eases back to hover/rest brightness.
      btn.style.filter = 'brightness(.5)';
      clearTimeout(btn._spdrFxTimer);
      btn._spdrFxTimer = setTimeout(function () { btn.style.filter = ''; }, 200);
    });
  }

  // Top-level section. resetKeys = list of every setting key the reset button
  // should restore to DEFAULTS (including the section's enabled key).
  function buildSection(opts) {
    var section = document.createElement('div');
    Object.assign(section.style, { padding: '10px 14px', borderBottom: '1px solid #313244' });

    var head = document.createElement('div');
    Object.assign(head.style, { display: 'flex', alignItems: 'flex-start', gap: '10px' });

    // noMasterCheckbox: a header with no on/off checkbox — the section is always
    // "active" and its subsections each manage their own collapse (used by Region
    // borders, Given/Placed digits, Pencilmarks).
    var hasMaster = !opts.noMasterCheckbox;

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = hasMaster ? !!settings[opts.enabledKey] : true;
    Object.assign(checkbox.style, {
      marginTop: '2px', flexShrink: '0', cursor: 'pointer',
      accentColor: '#89b4fa', width: '14px', height: '14px',
    });

    var textBlock = document.createElement('div');
    Object.assign(textBlock.style, { flex: '1', minWidth: '0', cursor: hasMaster ? 'pointer' : 'default' });
    var lbl = document.createElement('div');
    lbl.textContent = opts.label;
    Object.assign(lbl.style, { color: '#cdd6f4', fontWeight: '500', marginBottom: '2px' });
    // Highlight icon sits right after the section title (consistent placement).
    var hiliteIcon = null;
    if (opts.hilite) {
      Object.assign(lbl.style, { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' });
      hiliteIcon = makeHiliteIcon(opts.hilite, opts.hiliteTitle);
      lbl.appendChild(hiliteIcon);
    }
    textBlock.appendChild(lbl);
    if (opts.desc) {
      var desc = document.createElement('div');
      desc.textContent = opts.desc;
      Object.assign(desc.style, { color: '#6c7086', fontSize: '11px' });
      textBlock.appendChild(desc);
    }

    // (Empty-state is now a hover tooltip beside the pointer on the eyeball icon —
    // see makeHiliteIcon / EMPTY_HINT — not a persistent in-panel warning.)

    if (hasMaster) head.appendChild(checkbox);
    head.appendChild(textBlock);

    var headColor = null;
    if (opts.hasColor) {
      headColor = makeColorControl(opts.colorKey, opts.opacityKey);
      head.appendChild(headColor);
    }

    // (The section-level highlight icon is placed right after the title above.)

    // Single section-level reset button (right side of header)
    var sectionReset = document.createElement('button');
    sectionReset.type = 'button';
    sectionReset.textContent = '↺';
    sectionReset.title = 'Reset this section to defaults';
    Object.assign(sectionReset.style, {
      background: '#313244', color: '#a6adc8',
      border: '1px solid #45475a', borderRadius: '5px',
      width: '26px', height: '26px', cursor: 'pointer',
      fontSize: '14px', padding: '0', lineHeight: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: '0', marginLeft: '6px', marginTop: '1px',
    });
    spdrFxButton(sectionReset);   // hover/active feedback + work pulse on click
    head.appendChild(sectionReset);

    section.appendChild(head);

    var subWrap = document.createElement('div');
    Object.assign(subWrap.style, { paddingLeft: '24px' });
    if (opts.hasColor && opts.opacityKey) subWrap.appendChild(makeOpacityRow(opts.opacityKey, headColor));
    if (opts.subBuilder) opts.subBuilder(subWrap);
    if (subWrap.childNodes.length > 0) section.appendChild(subWrap);

    function updateDim() {
      // Master-less section: always active; subsections manage their own collapse.
      if (!hasMaster) {
        if (subWrap._spdrOnMasterToggle) subWrap._spdrOnMasterToggle(true);
        return;
      }
      // Every master section COLLAPSES its sub-content when unchecked — only the
      // header (checkbox + label + desc + reset) stays.
      var enabled = checkbox.checked;
      subWrap.style.display = enabled ? '' : 'none';
      if (headColor) headColor.style.display = enabled ? '' : 'none';
      // "Show only when collapsed" section-label eyeball (Object Shading): visible
      // while off — when the per-control eyeballs are hidden — and hidden when on
      // (then they're redundant). Use VISIBILITY (not display) so the icon keeps its
      // box either way and the label's height/text position doesn't shift on toggle.
      if (hiliteIcon && opts.hiliteWhenCollapsed) {
        hiliteIcon.style.visibility = enabled ? 'hidden' : 'visible';
        hiliteIcon.style.pointerEvents = enabled ? 'none' : 'auto';
      }
    }
    updateDim();

    if (hasMaster) {
      controlSyncers[opts.enabledKey] = function () { checkbox.checked = !!settings[opts.enabledKey]; updateDim(); };
      checkbox.addEventListener('change', function () {
        settings[opts.enabledKey] = checkbox.checked;
        saveSettings(settings); applySettings(); updateDim();
      });
      textBlock.addEventListener('click', function () {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
    }

    // Reset preserves the section's on/off checkboxes — its master (enabledKey) AND
    // any subsection toggles (opts.enableKeys) — and restores every OTHER option to
    // its default. The bottom "Reset all" button is what restores the toggles too.
    var preserveSet = {};
    (opts.enableKeys || (hasMaster ? [opts.enabledKey] : [])).forEach(function (k) { if (k) preserveSet[k] = 1; });
    sectionReset.addEventListener('click', function (e) {
      e.stopPropagation();
      (opts.resetKeys || []).forEach(function (k) {
        if (preserveSet[k]) return;
        if (k in DEFAULTS) settings[k] = DEFAULTS[k];
      });
      saveSettings(settings); applySettings();
      // Re-sync any registered controls (checkbox, swatches, sliders, etc.)
      (opts.resetKeys || []).forEach(function (k) {
        if (preserveSet[k]) return;
        if (controlSyncers[k]) { try { controlSyncers[k](); } catch (e) {} }
      });
      updateDim();
    });

    return section;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // "Remove invalid pencilmarks" action
  //
  // Simulates user input to actually delete each conflict pencilmark from
  // SudokuPad's state (not just hide them via CSS). For each invalid mark:
  //   1. Click the cell to select it.
  //   2. Click the corresponding mode button (corner / centre).
  //   3. Click the digit button — SudokuPad toggles the existing pencilmark off.
  // Each removal is an undo entry in SudokuPad's history; the player can Ctrl+Z
  // each one back if they want. We restore the player's original tool mode and
  // selected cell when done.
  //
  // 10ms delays between steps are necessary — SudokuPad processes user input
  // asynchronously and a tighter sequence drops events.
  // ═══════════════════════════════════════════════════════════════════════════

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function dispatchClickEl(el) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    var cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    var init = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 };
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (t) {
      el.dispatchEvent(new MouseEvent(t, init));
    });
  }
  function getModeButton(mode) {
    // mode: 'normal' | 'corner' | 'centre' | 'colour' | 'pen'
    return document.querySelector('[data-control="' + mode + '"]');
  }
  function getCurrentMode() {
    // SudokuPad marks the active control with class "selected".
    var modes = ['normal', 'corner', 'centre', 'colour', 'pen'];
    for (var i = 0; i < modes.length; i++) {
      var btn = getModeButton(modes[i]);
      if (btn && btn.classList.contains('selected')) return modes[i];
    }
    return null;
  }
  async function ensureMode(mode) {
    var btn = getModeButton(mode);
    if (!btn) return false;
    if (btn.classList.contains('selected')) return true;
    dispatchClickEl(btn);
    // Verify the switch took effect (poll briefly)
    for (var i = 0; i < 6; i++) {
      await sleep(20);
      if (btn.classList.contains('selected')) return true;
    }
    return false;
  }

  // Number marks always use data-val="1"-"9" / "0".
  // Letter marks use data-val="a"-"z" (letter mode). No translation needed;
  // they are separate marks and must stay distinct in snapshots and existence checks.

  // Snapshot every player-modifiable element in the puzzle. We track:
  //   - corner / centre pencilmarks (the things we intend to remove)
  //   - values     (main digits — must not change)
  //   - colors     (cell colour markers — must not change)
  // Each set holds "cellX,cellY,key" strings. Mark values are normalised so that
  // old ("1"-"9") and new ("a"-"i") SudokuPad formats produce identical keys.
  function snapshotPencilmarks() {
    var snap = { corner: new Set(), centre: new Set(), values: new Set(), colors: new Set() };
    // Use cell-grid coordinates (col,row,digit) rather than raw SVG x,y as the
    // snapshot key. SudokuPad sometimes shifts a centre-marks text element by a
    // fraction of an SVG unit when digits are added/removed (visual recentring),
    // which made the raw-coord key change for marks that weren't actually
    // modified — every survivor showed up as both "removed" (old pos) and
    // "added" (new pos), wrecking the diff check. Cell keys are stable.
    document.querySelectorAll('#cell-pencilmarks text').forEach(function (t) {
      var ck = cellKeyFromMarkXY(t.getAttribute('x'), t.getAttribute('y'));
      snap.corner.add(ck + ',' + t.getAttribute('data-val'));
    });
    document.querySelectorAll('#cell-candidates text.cell-candidate').forEach(function (text) {
      var ck = cellKeyFromMarkXY(text.getAttribute('x'), text.getAttribute('y'));
      text.querySelectorAll('tspan').forEach(function (sp) {
        snap.centre.add(ck + ',' + sp.getAttribute('data-val'));
      });
    });
    document.querySelectorAll('#cell-values text').forEach(function (t) {
      var ck = cellKeyFromMarkXY(t.getAttribute('x'), t.getAttribute('y'));
      snap.values.add(ck + ',' + (t.textContent || '').trim());
    });
    document.querySelectorAll('#cell-colors rect, #cell-colors path, #cell-colors polygon').forEach(function (el) {
      snap.colors.add(el.tagName + ':' + (el.getAttribute('x') || '') + ',' + (el.getAttribute('y') || '') + ',' + (el.getAttribute('fill') || '') + ',' + (el.getAttribute('d') || ''));
    });
    return snap;
  }
  function diffSnapshots(before, after) {
    var d = { added: { corner: [], centre: [], values: [], colors: [] }, removed: { corner: [], centre: [], values: [], colors: [] } };
    ['corner', 'centre', 'values', 'colors'].forEach(function (k) {
      before[k].forEach(function (x) { if (!after[k].has(x)) d.removed[k].push(x); });
      after[k].forEach(function (x) { if (!before[k].has(x)) d.added[k].push(x); });
    });
    return d;
  }

  // Returns true when a diff object has no changes on any side.
  // Shared by _removeInvalidPencilmarksInternal and _fillSelectedInternal.
  function diffEmpty(d) {
    return d.added.corner.length === 0 && d.added.centre.length === 0 &&
           d.added.values.length === 0 && d.added.colors.length === 0 &&
           d.removed.corner.length === 0 && d.removed.centre.length === 0 &&
           d.removed.values.length === 0 && d.removed.colors.length === 0;
  }

  // Toast feedback used by every action button. `kind` is 'success', 'warning',
  // or 'error' — controls colour only. By default toasts auto-fade after 2s
  // (paused while the mouse is over them). When toastPersist is true the toast
  // stays until the user clicks the × dismiss button.
  function getToastBottom() {
    var panel = document.getElementById('sp-fix-panel');
    if (panel && panel.style.display !== 'none') {
      return (56 + panel.offsetHeight + 8) + 'px';
    }
    // Otherwise clear the topmost visible floating button in the bottom-right
    // cluster (gear → Auto-fill → Validate) so toasts don't cover it. The Validate
    // button sits highest when shown; fall back to the Auto-fill button, then the gear.
    var vBtn = document.getElementById('sp-validate-btn');
    if (vBtn && vBtn.offsetHeight > 0 && vBtn.style.display !== 'none') {
      var vb = parseFloat(getComputedStyle(vBtn).bottom) || 120;
      return (vb + vBtn.offsetHeight + 8) + 'px';
    }
    var fsBtn = document.getElementById('sp-fill-single-btn');
    if (fsBtn && fsBtn.offsetHeight > 0) return (56 + fsBtn.offsetHeight + 8) + 'px';
    return '56px';
  }

  // When true, the Settings "Debug: show popup" cycler is previewing a toast:
  // force it to show (ignore the showToasts gate), never auto-fade, and float it
  // above our own settings panel. See fsDebugShowNext.
  var fsPreviewActive = false;

  function showRemoveInvalidToast(message, kind) {
    // Errors always show (player must know something went wrong) regardless of showToasts.
    if (!fsPreviewActive && settings.showToasts === false && kind !== 'error') return;
    var existing = document.getElementById('sp-remove-invalid-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'sp-remove-invalid-toast';
    var colours = {
      success: { bg: '#2d4a36', border: '#3d8b54', text: '#cdebd1' },
      warning: { bg: '#4a3f2d', border: '#a3853d', text: '#ebe1cd' },
      error:   { bg: '#4a2d2d', border: '#a33d3d', text: '#ebcdcd' },
    };
    var c = colours[kind] || colours.success;
    Object.assign(toast.style, {
      position:       'fixed',
      bottom:         getToastBottom(),
      right:          '12px',
      width:          '340px',
      padding:        '8px 32px 8px 12px',
      background:     c.bg,
      color:          c.text,
      border:         '1px solid ' + c.border,
      borderRadius:   '6px',
      fontFamily:     'system-ui, -apple-system, sans-serif',
      fontSize:       '12px',
      lineHeight:     '1.4',
      zIndex:         '999999',
      boxShadow:      '0 4px 16px rgba(0,0,0,0.5)',
      whiteSpace:     'pre-line',
      boxSizing:      'border-box',
    });

    // Message body (a span so the × button sits beside it)
    var msgSpan = document.createElement('span');
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    // Dismiss button
    var dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = '×';
    dismiss.title = 'Dismiss';
    Object.assign(dismiss.style, {
      position:       'absolute',
      top:            '4px',
      right:          '6px',
      width:          '20px',
      height:         '20px',
      background:     'transparent',
      color:          c.text,
      border:         'none',
      cursor:         'pointer',
      fontSize:       '18px',
      lineHeight:     '1',
      padding:        '0',
      opacity:        '0.7',
    });
    dismiss.addEventListener('mouseenter', function () { dismiss.style.opacity = '1'; });
    dismiss.addEventListener('mouseleave', function () { dismiss.style.opacity = '0.7'; });
    dismiss.addEventListener('click', function (e) { e.stopPropagation(); toast.remove(); });
    toast.appendChild(dismiss);

    document.body.appendChild(toast);
    if (fsPreviewActive) toast.style.zIndex = '1000000';   // preview: float above our settings panel (z 999999)

    // Auto-fade after 2s (unless toastPersist is on, or this is an error — errors always persist).
    if (!fsPreviewActive && !settings.toastPersist && kind !== 'error') {
      var fadeTimer = null;
      function scheduleFade() {
        clearTimeout(fadeTimer);
        fadeTimer = setTimeout(function () {
          toast.style.transition = 'opacity 0.4s ease';
          toast.style.opacity = '0';
          setTimeout(function () { if (toast.parentNode) toast.remove(); }, 420);
        }, 2000);
      }
      scheduleFade();
      toast.addEventListener('mouseenter', function () {
        clearTimeout(fadeTimer);
        toast.style.transition = '';
        toast.style.opacity = '1';
      });
      toast.addEventListener('mouseleave', function () { scheduleFade(); });
    }
  }

  // Format a duration in ms as "1.23s" or "950ms" for readable toast/log output.
  function formatDuration(ms) {
    if (ms >= 1000) return (ms / 1000).toFixed(2) + 's';
    return Math.round(ms) + 'ms';
  }

  // Normalise a pencilmark text's x/y attributes to integer (col, row). The
  // text's x is exactly col*64+32; y is row*64+32 with a small baseline offset.
  // Use round() to recover the integer cell index regardless.
  function cellKeyFromMarkXY(x, y) {
    var col = Math.round((parseFloat(x) - 32) / 64);
    var row = Math.round((parseFloat(y) - 32) / 64);
    return col + ',' + row;
  }
  // Cell-highlight rect uses top-left coords (col*64, row*64). Convert similarly.
  function cellKeyFromHighlight(rect) {
    var col = Math.round(parseFloat(rect.getAttribute('x')) / 64);
    var row = Math.round(parseFloat(rect.getAttribute('y')) / 64);
    return col + ',' + row;
  }
  function getSelectedCells() {
    var cells = new Set();
    document.querySelectorAll('#cell-highlights rect.cell-highlight').forEach(function (r) {
      cells.add(cellKeyFromHighlight(r));
    });
    return cells;
  }

  // Returns true if the cell at (col, row) has a given digit or a placed
  // value — i.e. shouldn't be touched by the fill operation. Corner
  // pencilmarks alone are NOT a reason to skip (we add centre marks only;
  // corner state is preserved by the per-click snapshot verification).
  function cellHasValueOrGiven(col, row) {
    var key = col + ',' + row;
    var els = document.querySelectorAll('#cell-values text, #cell-givens text, #cell-values text.cell-given, text.cell-given');
    for (var i = 0; i < els.length; i++) {
      var t = els[i];
      var x = t.getAttribute('x'), y = t.getAttribute('y');
      if (x == null || y == null) continue;
      if (cellKeyFromMarkXY(x, y) === key) {
        if ((t.textContent || '').trim().length > 0) return true;
      }
    }
    return false;
  }

  // Derive the grid size N from path.cell-grid coordinates (GCD = cellSize,
  // max coordinate = N*cellSize). Falls back to the viewBox formula for puzzles
  // that load before #cell-grids is populated. Returns an integer clamped 4–16.
  // Reads cell-grid path, not the viewBox, so puzzles with outer-ring hint cells
  // (whose viewBox is wider than the playable area) are handled correctly.
  function detectGridSize() {
    var cgPath = document.querySelector('#cell-grids path.cell-grid');
    if (cgPath) {
      // Our script clears the d attribute (cell-grid z-order fix) and saves the
      // original in dataset.spdrOrigD. Use that if d is empty.
      var dVal = cgPath.getAttribute('d') || cgPath.dataset.spdrOrigD || '';
      var nums = dVal.match(/\d+(?:\.\d+)?/g);
      if (nums) {
        nums = nums.map(Number).filter(function (n) { return n > 0.5; });
        if (nums.length) {
          function igcd(a, b) { a = Math.round(a); b = Math.round(b); return b === 0 ? a : igcd(b, a % b); }
          var cs = nums.reduce(igcd, 0);
          var mx = Math.max.apply(null, nums);
          if (cs >= 4 && mx > 0) {
            var N = Math.round(mx / cs);
            if (N >= 4) return Math.min(N, 16);
          }
        }
      }
    }
    // Fallback: viewBox-based estimate (works for standard puzzles without outer-ring offsets).
    var svg = document.getElementById('svgrenderer');
    if (!svg) return 9;
    var vb = svg.getAttribute('viewBox');
    if (!vb) return 9;
    var parts = vb.trim().split(/[\s,]+/).map(Number);
    var totalWidth = parts[2];
    if (!totalWidth || isNaN(totalWidth) || totalWidth <= 0) return 9;
    return Math.max(4, Math.min(Math.round((totalWidth - 32) / 64), 16));
  }

  // Lock to prevent concurrent action runs (clicking multiple action buttons
  // mid-execution). The fill operation internally invokes the remove logic;
  // shared lock makes that safe via _removeInvalidPencilmarksInternal which
  // does NOT touch the lock — only public entry points do.
  var actionInProgress = false;

  // Worker for invalid-pencilmark removal. Pure: returns a result object,
  // never shows toasts (callers handle messaging). Doesn't touch the action
  // lock so other workers (like fill) can compose it.
  //   opts.cellFilter   — optional Set<"col,row"> to restrict to certain cells
  // Returns: { totalTargets, removed, aborted, abortReason, abortTarget,
  //            rollbackOk, elapsedMs, failures }
  //
  // Uses Framework.getApp() → app.select() to select exactly the conflict cells
  // for each (mode, digit) group, then clicks the digit button once to remove
  // them all — no drag events, no per-cell fallback needed.
  async function _removeInvalidPencilmarksInternal(opts) {
    opts = opts || {};
    var cellFilter = opts.cellFilter;
    var startTime = performance.now();

    // Collect conflict targets from DOM. SudokuPad marks them with class="conflict".
    var targets = [];
    var skippedExcluded = 0;
    document.querySelectorAll('#cell-pencilmarks text.conflict').forEach(function(t) {
      var x = t.getAttribute('x'), y = t.getAttribute('y');
      var ck = cellKeyFromMarkXY(x, y);
      if (cellFilter && !cellFilter.has(ck)) return;
      var d = t.getAttribute('data-val');
      if (!settings.digitSet.includes(d)) { skippedExcluded++; return; }
      targets.push({ type: 'corner', cellKey: ck, digit: d });
    });
    document.querySelectorAll('#cell-candidates tspan.conflict').forEach(function(t) {
      var p = t.parentNode;
      var x = p.getAttribute('x'), y = p.getAttribute('y');
      var ck = cellKeyFromMarkXY(x, y);
      if (cellFilter && !cellFilter.has(ck)) return;
      var d = t.getAttribute('data-val');
      if (!settings.digitSet.includes(d)) { skippedExcluded++; return; }
      targets.push({ type: 'centre', cellKey: ck, digit: d });
    });

    if (targets.length === 0) {
      return { totalTargets: 0, removed: 0, aborted: false,
               elapsedMs: performance.now() - startTime, failures: [], skippedExcluded: skippedExcluded };
    }

    // Get the SudokuPad app API and build a col,row → cell object lookup.
    var app = await Framework.getApp();
    var cellByKey = {};
    app.puzzle.cells.forEach(function(c) { cellByKey[c.col + ',' + c.row] = c; });
    var originalSelection = Array.from(app.puzzle.selectedCells || []);
    var preOpSnap = snapshotPencilmarks();   // baseline for atomic rollback

    var totalTargets = targets.length;
    var failures = [];
    var removedCount = 0;

    // Group by (type, digit). Each group = ONE api-select + ONE app.act toggle.
    // app.act({type:'candidates'|'pencilmarks', arg:digit}) toggles the mark on
    // the selected cells directly — no tool-mode switch and no digit-button
    // click, so nothing flickers.
    var byModeDigit = { corner: new Map(), centre: new Map() };
    targets.forEach(function(t) {
      var map = byModeDigit[t.type];
      if (!map.has(t.digit)) map.set(t.digit, []);
      map.get(t.digit).push(t);
    });

    var actionFor = { corner: 'pencilmarks', centre: 'candidates' };

    // Open the undo-group ONLY now — *after* collecting targets above. SudokuPad
    // strips the .conflict CSS classes while an edit-group is open (restoring
    // them on groupend), so collecting conflicts with a group already open would
    // always find zero. Removals all live in this one group → a single undo.
    app.act({ type: 'groupstart' });
    try {
    for (var mi = 0; mi < 2; mi++) {
      var mode = mi === 0 ? 'corner' : 'centre';
      var digitMap = byModeDigit[mode];
      if (digitMap.size === 0) continue;

      var iter = digitMap.entries();
      var step;
      while (!(step = iter.next()).done) {
        var digit = step.value[0];
        var targetsForDigit = step.value[1];

        // Re-filter to targets still present in DOM.
        var preSnap = snapshotPencilmarks();
        var stillPresent = targetsForDigit.filter(function(t) {
          return preSnap[mode].has(t.cellKey + ',' + t.digit);
        });
        if (stillPresent.length === 0) continue;

        // Build cell objects for these targets.
        var cellObjs = stillPresent.map(function(t) { return cellByKey[t.cellKey]; }).filter(Boolean);
        if (cellObjs.length === 0) continue;

        // Select exactly these cells via the API (no drag, no extras).
        app.deselect();
        app.select(cellObjs);

        // All selected cells have digit in this mode → one toggle removes it from all.
        var before = snapshotPencilmarks();
        app.act({ type: actionFor[mode], arg: digit });
        await sleep(20);
        var after = snapshotPencilmarks();
        var diff = diffSnapshots(before, after);

        // Safety: additions or value/color changes are always wrong here →
        // close the group and roll the whole sweep back atomically (one undo).
        var criticalUnexpected = diff.added.corner.length + diff.added.centre.length +
                                 diff.added.values.length + diff.added.colors.length +
                                 diff.removed.values.length + diff.removed.colors.length;
        if (criticalUnexpected > 0) {
          console.error('[spDR-fix] REMOVE unexpected change for', mode, digit, diff);
          app.act({ type: 'groupend' });
          var undoBtn = getModeButton('undo');
          var rollbackOk = false;
          if (undoBtn) {
            dispatchClickEl(undoBtn);
            for (var att = 0; att < 8; att++) {
              await sleep(25);
              if (diffEmpty(diffSnapshots(preOpSnap, snapshotPencilmarks()))) { rollbackOk = true; break; }
            }
          }
          return {
            totalTargets: totalTargets, removed: 0,
            skippedExcluded: skippedExcluded, aborted: true,
            abortReason: 'unexpected-diff',
            abortTarget: { type: mode, digit: digit,
                           cellX: String(cellObjs[0].col * 64 + 32),
                           cellY: String(cellObjs[0].row * 64 + 32) },
            rollbackOk: rollbackOk,
            elapsedMs: performance.now() - startTime, failures: failures,
          };
        }

        // Count correct removals.
        var expectedKeys = new Set(stillPresent.map(function(t) { return t.cellKey + ',' + t.digit; }));
        var correctRemoved = diff.removed[mode].filter(function(k) { return expectedKeys.has(k); }).length;
        removedCount += correctRemoved;
        if (correctRemoved < stillPresent.length) {
          failures.push('partial-removal:' + mode + ':' + digit +
                        ':expected=' + stillPresent.length + ':got=' + correctRemoved);
        }
      }
    }

    app.act({ type: 'groupend' });
    return {
      totalTargets: totalTargets, removed: removedCount, skippedExcluded: skippedExcluded,
      aborted: false, elapsedMs: performance.now() - startTime, failures: failures,
    };
    } finally {
      // Restore the caller's selection on every exit path.
      app.deselect();
      if (originalSelection.length > 0) app.select(originalSelection);
    }
  }


  // ── Compose a toast from a worker result ────────────────────────────────
  // contextLabel: noun phrase like "invalid pencilmarks" used in the message
  // emptyMessage: shown when result.totalTargets === 0 (lets caller customise)
  function showWorkerResult(result, contextLabel, emptyMessage) {
    var elapsed = formatDuration(result.elapsedMs);
    var n = result.skippedExcluded || 0;
    var skipNote = n > 0 ? ' Skipped ' + n + ' mark' + (n === 1 ? '' : 's') + ' not in digit set.' : '';
    if (result.totalTargets === 0) {
      var emptyMsg = emptyMessage || ('No ' + contextLabel + ' to remove.');
      showRemoveInvalidToast(emptyMsg + skipNote, 'success');
      return;
    }
    if (!result.aborted) {
      var n = result.removed;
      var suffix = (n === 1 ? '' : 's');
      var msg = 'Removed ' + n + ' ' + contextLabel.replace(/s$/, '') + suffix + ' in ' + elapsed + '.' + skipNote;
      if (result.failures && result.failures.length > 0) {
        msg += ' ' + result.failures.length + ' non-fatal issues — see console.';
        showRemoveInvalidToast(msg, 'warning');
      } else {
        showRemoveInvalidToast(msg, 'success');
      }
      return;
    }
    // Aborted. The public entry point has already reverted the whole operation
    // back to the pre-button state (revertToSnapshot) and recorded the outcome in
    // result.fullyReverted — so the message is the SAME regardless of the internal
    // abort reason: either everything was restored, or (should never happen) it
    // couldn't be and the player must finish the undo by hand. No partial counts:
    // on a full revert there are, by definition, no surviving changes to report.
    var t = result.abortTarget;
    var where = t ? (t.type + ' ' + t.digit + ' in cell ' + fsCellLabel(cellKeyFromMarkXY(t.cellX, t.cellY))) : 'the puzzle';
    if (result.fullyReverted) {
      showRemoveInvalidToast('Stopped — an unexpected change occurred at ' + where + '. All changes were reverted: the puzzle is back to exactly how it was before you pressed the button.', 'warning');
    } else {
      showRemoveInvalidToast('CRITICAL — an unexpected change occurred at ' + where + ' and it could NOT be fully reverted. Press Ctrl+Z until the puzzle looks right.', 'error');
    }
  }

  // Revert every change made since `preSnap` by clicking the native undo button
  // — one edit-group per click — until the puzzle's marks match preSnap again,
  // restoring the EXACT pre-button state. The Fill/Clear entry points call this on
  // ANY abort so a failed run never leaves a partial fill/removal behind (a single
  // worker pass already rolls back its own group; this also catches multi-pass and
  // fill-then-sweep, where earlier groups would otherwise remain). It re-checks
  // diffEmpty BEFORE each click, so it stops the instant the state matches and can
  // never over-undo into the user's own prior moves; `maxUndos` caps it so an
  // unreachable state (shouldn't happen) fails loudly instead of looping forever.
  // Returns true iff the pre-button state was fully restored.
  async function revertToSnapshot(preSnap, maxUndos) {
    var undoBtn = getModeButton('undo');
    for (var i = 0; i <= maxUndos; i++) {
      if (diffEmpty(diffSnapshots(preSnap, snapshotPencilmarks()))) return true;
      if (i === maxUndos) break;
      if (undoBtn) dispatchClickEl(undoBtn);
      else { var app = await Framework.getApp(); app.act({ type: 'undo' }); }
      await sleep(25);
    }
    return diffEmpty(diffSnapshots(preSnap, snapshotPencilmarks()));
  }

  // Public entry points ─ each takes the action lock, runs work, releases.

  // Count how many conflict marks currently exist (centre + corner). Used to
  // decide whether another sweep pass is needed — when the digit set is wider
  // than the cell can render, removing one candidate frees room and a
  // previously-hidden candidate (possibly itself a conflict) becomes visible.
  // Those newly-revealed conflicts only appear in the DOM after the first
  // pass clears the visible ones, so we sweep again until everything is gone.
  function countVisibleConflicts(cellFilter) {
    var count = 0;
    document.querySelectorAll('#cell-pencilmarks text.conflict').forEach(function (t) {
      if (cellFilter) {
        var ck = cellKeyFromMarkXY(t.getAttribute('x'), t.getAttribute('y'));
        if (!cellFilter.has(ck)) return;
      }
      count++;
    });
    document.querySelectorAll('#cell-candidates tspan.conflict').forEach(function (t) {
      if (cellFilter) {
        var p = t.parentNode;
        var ck = cellKeyFromMarkXY(p.getAttribute('x'), p.getAttribute('y'));
        if (!cellFilter.has(ck)) return;
      }
      count++;
    });
    return count;
  }

  // Run _removeInvalidPencilmarksInternal repeatedly, up to MAX_PASSES, until
  // there are no more visible conflicts (or a pass removes nothing). Returns a
  // composed result object that sums across passes.
  async function _removeInvalidPencilmarksMultiPass(opts) {
    var MAX_PASSES = 6;
    var totalRemoved = 0;
    var totalTargets = 0;
    var totalSkippedExcluded = 0;
    var totalElapsedMs = 0;
    var allFailures = [];
    var passCount = 0;

    // Each pass = one _removeInvalidPencilmarksInternal call, which owns its own
    // undo-group (opened only after it collects conflicts, because groupstart
    // hides the .conflict classes). The common case is a single pass = one undo.
    // Extra passes (digit set wider than the cell renders) add one undo each.
    for (var pass = 0; pass < MAX_PASSES; pass++) {
      var r = await _removeInvalidPencilmarksInternal(opts);
      passCount++;
      totalRemoved += r.removed || 0;
      totalTargets += r.totalTargets || 0;
      totalSkippedExcluded += r.skippedExcluded || 0;
      totalElapsedMs += r.elapsedMs || 0;
      if (r.failures && r.failures.length) Array.prototype.push.apply(allFailures, r.failures);

      // Abort — propagate immediately with combined totals so the user sees the
      // partial counts (the internal pass already rolled its own group back).
      if (r.aborted) {
        return {
          totalTargets: totalTargets, removed: totalRemoved,
          skippedExcluded: totalSkippedExcluded,
          aborted: true, abortReason: r.abortReason, abortTarget: r.abortTarget,
          rollbackOk: r.rollbackOk,
          elapsedMs: totalElapsedMs, failures: allFailures,
          passCount: passCount,
        };
      }

      // Stop if no more conflicts visible — done.
      var remainingConflicts = countVisibleConflicts(opts && opts.cellFilter);
      if (remainingConflicts === 0) break;

      // Stop if this pass removed nothing — further passes won't help.
      if ((r.removed || 0) === 0) break;
    }

    return {
      totalTargets: totalTargets, removed: totalRemoved,
      skippedExcluded: totalSkippedExcluded,
      aborted: false,
      elapsedMs: totalElapsedMs, failures: allFailures,
      passCount: passCount,
    };
  }

  function removeInvalidPencilmarks() {
    if (actionInProgress) return;   // locked out (no popup): these finish in a fraction of a second — the lock just blocks a rapid double-click
    actionInProgress = true;
    var preSnap = snapshotPencilmarks();   // pre-button baseline for a full revert on abort
    _removeInvalidPencilmarksMultiPass({}).then(async function (r) {
      if (r.aborted) r.fullyReverted = await revertToSnapshot(preSnap, 12);
      showWorkerResult(r, 'invalid pencilmarks');
    }).finally(function () { actionInProgress = false; });
  }

  function clearMarksInSelected() {
    if (actionInProgress) return;   // locked out (no popup): these finish in a fraction of a second — the lock just blocks a rapid double-click
    var selected = getSelectedCells();
    if (selected.size === 0) {
      showRemoveInvalidToast('No marks cleared (no cells selected).', 'success');
      return;
    }
    actionInProgress = true;
    var preSnap = snapshotPencilmarks();   // pre-button baseline for a full revert on abort
    _removeInvalidPencilmarksMultiPass({ cellFilter: selected }).then(async function (r) {
      if (r.aborted) r.fullyReverted = await revertToSnapshot(preSnap, 12);
      showWorkerResult(r, 'invalid marks in selected cells', 'No invalid marks in the selected cell' + (selected.size === 1 ? '' : 's') + '.');
    }).finally(function () { actionInProgress = false; });
  }

  // Fill missing centre candidates (from settings.digitSet) into each selected
  // cell. Mechanism: SudokuPad's own paste path — app.act({type:'candidates',
  // arg:d}) toggles a centre mark on the api-selected cells with NO tool-mode
  // switch and no digit-button click, so there's no UI flicker. The whole fill
  // is wrapped in one groupstart/groupend pair (like FeatureCellPaste) so it
  // collapses to a single undo step. Additive: for each digit only the cells
  // *missing* it are selected, so existing marks are preserved; given/value
  // cells are skipped. Caller runs a removal sweep afterwards.
  async function _fillSelectedInternal(cells) {
    var startTime = performance.now();

    var app = await Framework.getApp();
    var cellByKey = {};
    app.puzzle.cells.forEach(function(c) { cellByKey[c.col + ',' + c.row] = c; });
    var originalSelection = Array.from(app.puzzle.selectedCells || []);

    // Pre-filter: skip cells with given/value (immutable), keep the rest.
    var fillable = [];
    var skippedCount = 0;
    Array.from(cells).forEach(function(key) {
      var parts = key.split(',').map(Number);
      if (cellHasValueOrGiven(parts[0], parts[1])) {
        skippedCount++;
      } else {
        var cell = cellByKey[key];
        if (cell) fillable.push({ key: key, cell: cell });
      }
    });
    if (fillable.length === 0) {
      return { addedCount: 0, removedCount: 0, skippedCount: skippedCount,
               wasLetterMode: false, aborted: false, elapsedMs: performance.now() - startTime };
    }

    // Build the plan from a single pre-snapshot: for each digit in the set, the
    // fillable cells that don't already show it as a centre mark.
    var preSnap = snapshotPencilmarks();
    var digitList = settings.digitSet.split('');
    var plan = [];
    for (var di = 0; di < digitList.length; di++) {
      var d = digitList[di];
      var targets = fillable.filter(function(c) { return !preSnap.centre.has(c.key + ',' + d); });
      if (targets.length) plan.push({ digit: d, cells: targets.map(function(c) { return c.cell; }) });
    }
    if (plan.length === 0) {
      app.deselect();
      if (originalSelection.length > 0) app.select(originalSelection);
      return { addedCount: 0, removedCount: 0, skippedCount: skippedCount,
               wasLetterMode: false, aborted: false, elapsedMs: performance.now() - startTime };
    }

    try {
      // One undo-group for the whole fill.
      app.act({ type: 'groupstart' });
      for (var i = 0; i < plan.length; i++) {
        app.deselect();
        app.select(plan[i].cells);
        // Every cell here lacks the digit, so one toggle adds it to each.
        app.act({ type: 'candidates', arg: plan[i].digit });
      }
      app.act({ type: 'groupend' });
      await sleep(20);   // let the render settle before verifying

      // Verify: the only legitimate changes are added centre marks (digitSet).
      // SudokuPad clears letter centre marks when a numeric one is added, so we
      // tolerate removals of non-digitSet centre marks. Anything else (lost
      // values/colours/corners, stray additions) → roll the whole group back
      // with a single undo and abort.
      var diff = diffSnapshots(preSnap, snapshotPencilmarks());
      var badCentreRemovals = diff.removed.centre.filter(function(k) {
        return settings.digitSet.includes(k.split(',')[2]);
      }).length;
      var unexpected = diff.removed.corner.length + badCentreRemovals +
                       diff.removed.values.length + diff.removed.colors.length +
                       diff.added.corner.length + diff.added.values.length + diff.added.colors.length;
      if (unexpected > 0) {
        console.warn('[spDR-fix] FILL unexpected diff', diff);
        var undoBtn = getModeButton('undo');
        var rollbackOk = false;
        if (undoBtn) {
          dispatchClickEl(undoBtn);
          for (var att = 0; att < 8; att++) {
            await sleep(25);
            if (diffEmpty(diffSnapshots(preSnap, snapshotPencilmarks()))) { rollbackOk = true; break; }
          }
        }
        return { addedCount: 0, removedCount: 0, skippedCount: skippedCount,
                 wasLetterMode: false, aborted: true, abortReason: 'unexpected-diff',
                 rollbackOk: rollbackOk, elapsedMs: performance.now() - startTime };
      }

      return { addedCount: diff.added.centre.length, removedCount: 0, skippedCount: skippedCount,
               wasLetterMode: false, aborted: false, elapsedMs: performance.now() - startTime };
    } finally {
      // Restore original selection on every exit path.
      app.deselect();
      if (originalSelection.length > 0) app.select(originalSelection);
    }
  }

  function fillSelectedCellsWithCandidates() {
    if (actionInProgress) return;   // locked out (no popup): these finish in a fraction of a second — the lock just blocks a rapid double-click
    var selected = getSelectedCells();
    if (selected.size === 0) {
      showRemoveInvalidToast('No cells selected.', 'success');
      return;
    }
    actionInProgress = true;
    var t0 = performance.now();
    var originalMode = getCurrentMode();
    var preSnap = snapshotPencilmarks();   // pre-button baseline. Fill + sweep are
                                           // separate undo groups, so on ANY abort
                                           // we revert the WHOLE thing back to here.
    (async function () {
      var fillResult = await _fillSelectedInternal(selected);
      if (fillResult.aborted) {
        // Fill itself failed → revert the fill group back to the pre-button state.
        var reverted = await revertToSnapshot(preSnap, 12);
        if (fillResult.wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
        if (originalMode) await ensureMode(originalMode);
        if (reverted) showRemoveInvalidToast('Stopped while filling candidates — an unexpected change occurred. All changes were reverted: the puzzle is back to exactly how it was before you pressed the button.', 'warning');
        else showRemoveInvalidToast('CRITICAL — an unexpected change occurred while filling candidates and it could NOT be fully reverted. Press Ctrl+Z until the puzzle looks right.', 'error');
        return;
      }
      // Now strip invalid pencilmarks in those same cells.
      var removeResult = await _removeInvalidPencilmarksMultiPass({ cellFilter: selected });
      var totalElapsed = formatDuration(performance.now() - t0);
      if (removeResult.aborted) {
        // Sweep failed AFTER a successful fill (which is its own committed undo
        // group) → revert EVERYTHING (sweep + fill) back to the pre-button state.
        var reverted = await revertToSnapshot(preSnap, 12);
        var t = removeResult.abortTarget;
        var where = t ? (t.type + ' ' + t.digit + ' in cell ' + fsCellLabel(cellKeyFromMarkXY(t.cellX, t.cellY))) : 'the puzzle';
        if (fillResult.wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
        if (originalMode) await ensureMode(originalMode);
        if (reverted) showRemoveInvalidToast('Filled the candidates, then hit an unexpected change during the cleanup sweep at ' + where + '. All changes were reverted, including the fill: the puzzle is back to exactly how it was before you pressed the button.', 'warning');
        else showRemoveInvalidToast('CRITICAL — an unexpected change occurred during the cleanup sweep at ' + where + ' and it could NOT be fully reverted. Press Ctrl+Z until the puzzle looks right.', 'error');
      } else {
        var n = fillResult.addedCount;
        var inlineR = fillResult.removedCount || 0;
        var sweepR  = removeResult.removed;
        var r = inlineR + sweepR;   // total marks removed (inline + final sweep)
        var s = fillResult.skippedCount || 0;
        var filledCells = selected.size - s;
        var msg = 'Filled ' + n + ' candidate' + (n === 1 ? '' : 's') +
                  ' in ' + filledCells + ' cell' + (filledCells === 1 ? '' : 's');
        if (s > 0) {
          msg += ' (skipped ' + s + ' cell' + (s === 1 ? '' : 's') + ')';
        }
        msg += ', removed ' + r + ' invalid mark' + (r === 1 ? '' : 's') + ' (' + totalElapsed + ').';
        if (removeResult.skippedExcluded > 0) {
          var sk = removeResult.skippedExcluded;
          msg += ' Skipped ' + sk + ' mark' + (sk === 1 ? '' : 's') + ' not in digit set.';
        }
        var kind = (removeResult.failures && removeResult.failures.length > 0) ? 'warning' : 'success';
        showRemoveInvalidToast(msg, kind);
        if (fillResult.wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
        if (originalMode) await ensureMode(originalMode);
      }
    })().finally(function () { actionInProgress = false; });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Validate Constraints — remove candidates that no constraint can satisfy.
  //  For now this validates KROPKI dots only (black = 2:1 ratio, white =
  //  consecutive); XV / quadruples / cages are planned but not implemented.
  //  It only ever REMOVES centre candidates — never adds — so a player's prior
  //  eliminations are preserved.
  // ══════════════════════════════════════════════════════════════════════════

  // Collect every STANDARD Kropki dot (unlabeled black/white circle on a cell
  // border) and the two cells it joins. Labeled dots (difference-N, ratio-N,
  // XV/Roman) are skipped — those aren't plain 2:1/consecutive constraints.
  // Returns [{ type:'black'|'white', a:'col,row', b:'col,row' }]. Reuses the
  // same detection predicates as the Kropki renderer (isKropkiCircle / fill /
  // isOnCellBorder / getKropkiAdjacentText), so it claims exactly the dots the
  // script already treats as Kropki.
  function collectKropkiDots() {
    var svg = document.getElementById('svgrenderer');
    var cs = getGridCellSize();
    if (!svg || !cs) return [];
    var N = detectGridSize();
    var dots = [];
    var seen = {};
    function inGrid(col, row) { return col >= 0 && col < N && row >= 0 && row < N; }
    svg.querySelectorAll('rect.feature-kropki, rect.textbg, #overlay rect, #underlay rect').forEach(function (rect) {
      if (!isKropkiCircle(rect)) return;
      var f = (rect.getAttribute('fill') || '').toUpperCase();
      if (f !== '#FFFFFF' && f !== '#000000') return;
      if (!isOnCellBorder(rect, cs)) return;
      if (getKropkiAdjacentText(rect)) return;   // labeled dot → not a plain Kropki constraint
      var x = parseFloat(rect.getAttribute('x') || 0), y = parseFloat(rect.getAttribute('y') || 0);
      var w = parseFloat(rect.getAttribute('width') || 0), h = parseFloat(rect.getAttribute('height') || 0);
      var cx = x + w / 2, cy = y + h / 2;
      function gridDist(v) { var m = ((v % cs) + cs) % cs; return Math.min(m, cs - m); }
      var tol = cs * 0.15, half = cs / 2;
      var onVert = gridDist(cx) < tol && Math.abs(gridDist(cy) - half) < tol;
      var a, b;
      if (onVert) {                              // vertical border → left | right cells
        var bc = Math.round(cx / cs), r = Math.floor(cy / cs);
        a = (bc - 1) + ',' + r; b = bc + ',' + r;
      } else {                                   // horizontal border → top | bottom cells
        var br = Math.round(cy / cs), c = Math.floor(cx / cs);
        a = c + ',' + (br - 1); b = c + ',' + br;
      }
      var ap = a.split(',').map(Number), bp = b.split(',').map(Number);
      if (!inGrid(ap[0], ap[1]) || !inGrid(bp[0], bp[1])) return;
      var key = a + '|' + b + '|' + f;
      if (seen[key]) return;
      seen[key] = 1;
      dots.push({ type: f === '#000000' ? 'black' : 'white', a: a, b: b });
    });
    return dots;
  }

  // Compute which centre candidates violate the Kropki dots, by constraint
  // propagation (arc consistency) iterated to a FIXPOINT. A candidate d in a
  // markable cell is removed when some dot the cell sits on has no partner for d in
  // the neighbour's CURRENT set — black: e==2d or d==2e; white: |d-e|==1 — over the
  // puzzle's digit set. Because each removal shrinks a set that other dots read, we
  // sweep every dot repeatedly until a full pass changes nothing, so an elimination
  // propagates all the way down a Kropki chain (e.g. on "Kropki Pairs" 264wvenhmu a
  // 1-2-4-6-8-9 / 1-2-4-6-8-9 white pair settles to 8-9 / 8-9 — the correct deep
  // result: once the wider web is propagated, 1/2/4/6 have no surviving partner.
  // Verified the fixpoint empties 0 cells there and on the dense all-Kropki
  // algxlb0a1z, i.e. it never contradicts — it's sound, just deep).
  // A value/given cell contributes its single digit; an empty cell (no value, no
  // marks) counts as the full digit set, so it never forces a removal and is never
  // itself modified. NOTE the fixpoint trusts the current marks as COMPLETE: run
  // mid-solve on a partially-pencilled grid it propagates those partial marks and
  // can remove more than is "obviously" invalid — cleanest on a fully-pencilled
  // grid. Monotonic (sets only shrink) so it always terminates; the pass guard is
  // belt-and-braces. Pure w.r.t. the board: reads the DOM and mutates only
  // in-memory sets, returning the removal list without touching the board.
  // Shared board read for the constraint validators (Kropki, cages, …). Returns
  // null when the digit set isn't numeric (ratio/sum/consecutive are undefined for
  // letter grids). Otherwise a snapshot of the CURRENT board:
  //   uni     — { digit:1 } membership map of the puzzle's digit set
  //   fullSet — Set<num> of that digit set (an empty/unmarked cell stands in as this)
  //   values  — cellKey → placed/given digit (a value owns its cell)
  //   centre  — cellKey → Set<num> of the player's VALID centre pencilmarks
  //             (numeric, in set, and NOT conflict-flagged — see below)
  // Read-only w.r.t. the board: every validator works on copies of these sets and
  // returns a removal list without touching the DOM. Cell keys are "col,row"
  // 0-indexed (cellKeyFromMarkXY), matching app.puzzle.cells' c.col+','+c.row.
  //
  // CONFLICT (red) candidates are EXCLUDED. SudokuPad tags any pencilmark that
  // clashes with a seen digit (same row/col/box/cage) as tspan.conflict (rendered
  // red) — the same signal the rest of this script treats as "invalid" (auto-fill,
  // Clear-invalid). Such a candidate cannot appear in any solution, so it must not
  // count as a partner when a validator asks "does digit d have a legal combination
  // here?" — otherwise an impossible red digit props up combinations that are
  // actually dead, and the validator under-removes. It also means we never evaluate
  // or strip the red digits themselves (the player manages those); we only ever
  // remove VALID candidates that have no support. (Requires SudokuPad's pencilmark
  // conflict-checking to be on — with it off, nothing is red and every mark counts,
  // matching the pre-fix behaviour.) A cell whose marks are ALL red collapses to an
  // empty set and is dropped → treated as an unconstrained/blank cell, the safe
  // permissive direction (never forces a removal), same as an unmarked cell.
  function readValidatorBoardState() {
    var digitChars = (settings.digitSet || '').split('');
    if (digitChars.length === 0 || !digitChars.every(function (c) { return /^[0-9]$/.test(c); })) return null;
    var uni = {};
    digitChars.forEach(function (c) { uni[Number(c)] = 1; });
    var values = {};
    document.querySelectorAll('#cell-values text, #cell-givens text, text.cell-given').forEach(function (t) {
      var x = t.getAttribute('x'), y = t.getAttribute('y');
      if (x == null || y == null) return;
      var v = (t.textContent || '').trim();
      if (/^[0-9]$/.test(v)) values[cellKeyFromMarkXY(x, y)] = Number(v);
    });
    var centre = {};
    document.querySelectorAll('#cell-candidates text.cell-candidate').forEach(function (text) {
      var ck = cellKeyFromMarkXY(text.getAttribute('x'), text.getAttribute('y'));
      if (values[ck] != null) return;   // a placed value owns the cell; ignore stray marks
      var s = centre[ck] || (centre[ck] = new Set());
      text.querySelectorAll('tspan').forEach(function (sp) {
        if (sp.classList.contains('conflict')) return;   // red/invalid candidate: not a usable partner
        var dv = sp.getAttribute('data-val');
        if (/^[0-9]$/.test(dv) && uni[Number(dv)]) s.add(Number(dv));
      });
      if (s.size === 0) delete centre[ck];
    });
    return { uni: uni, fullSet: new Set(Object.keys(uni).map(Number)), values: values, centre: centre };
  }

  function computeKropkiRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };   // letters / empty → ratio & consecutive are undefined
    var uni = st.uni;
    function blackPartners(d) {
      var r = [];
      if (uni[2 * d] && 2 * d !== d) r.push(2 * d);
      if (d % 2 === 0 && uni[d / 2] && d / 2 !== d) r.push(d / 2);
      return r;
    }
    function whitePartners(d) {
      var r = [];
      if (uni[d - 1]) r.push(d - 1);
      if (uni[d + 1]) r.push(d + 1);
      return r;
    }
    function partners(type, d) { return type === 'black' ? blackPartners(d) : whitePartners(d); }

    var dots = collectKropkiDots();
    if (unitFilter) dots = dots.filter(function (dot) { return unitFilter([dot.a, dot.b]); });
    if (dots.length === 0) return { noDots: true };

    var values = st.values, centre = st.centre, fullSet = st.fullSet;
    // A neighbour cell's candidate set: its value/given (one digit), its centre
    // marks, or — for an empty cell — the full digit set (so an unfilled neighbour
    // never forces a removal). Read-only: never mutated during the pass.
    function neighbourSet(key) {
      if (values[key] != null) return new Set([values[key]]);
      if (centre[key]) return centre[key];
      return fullSet;
    }
    function hasPartner(type, d, otherSet) {
      var ps = partners(type, d);
      for (var i = 0; i < ps.length; i++) if (otherSet.has(ps[i])) return true;
      return false;
    }

    // Sweep every dot (both directions), deleting unsupported candidates from the
    // live working set so removals cascade; repeat until a pass changes nothing.
    var markedKeys = Object.keys(centre);   // cells that started with centre marks
    var removals = [], seen = {};
    function consider(self, other, type) {
      if (values[self] != null || !centre[self]) return;   // only modifiable candidate cells
      var os = neighbourSet(other);                         // live set for marked neighbours → cascade
      Array.from(centre[self]).forEach(function (d) {       // snapshot: we mutate the set inside the loop
        if (!hasPartner(type, d, os)) {
          centre[self].delete(d);
          var k = self + '/' + d;
          if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: self, digit: String(d) }); }
        }
      });
    }
    var changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      var before = removals.length;
      dots.forEach(function (dot) {
        consider(dot.a, dot.b, dot.type);
        consider(dot.b, dot.a, dot.type);
      });
      changed = removals.length > before;
    }

    // Cells whose candidate set the fixpoint wiped out entirely → contradiction worth flagging.
    var emptied = 0;
    markedKeys.forEach(function (k) { if (centre[k] && centre[k].size === 0) emptied++; });

    return { removals: removals, dotCount: dots.length, emptiedCells: emptied };
  }

  // ── XV validator ──────────────────────────────────────────────────────────
  // XV clues sit on a cell border like a Kropki dot, but the constraint is a SUM:
  // a "V" means the two cells sum to 5, an "X" means they sum to 10. Structurally
  // identical to the Kropki validator (arc consistency to a fixpoint) — only the
  // partner rule differs. Independent of Kropki (own collector, own compute) so the
  // two toggle separately. NOTE: this validates only the POSITIVE clues that are
  // drawn; it makes no use of a "negative constraint" (all Xs/Vs given) — an absent
  // X/V is never treated as forbidding a 5/10 sum.

  // Find XV clues in the DOM (works for native SCL/fpuz renders AND cosmetic ones):
  // both draw the clue as an #overlay/#underlay <text> of exactly "X" or "V"
  // centred on a cell border (native XV is a BARE letter, no disc; cosmetic XV is a
  // labeled Kropki-style circle whose letter text also lives in #overlay). We read
  // the letter's geometric centre (getBBox — robust to text-anchor/baseline) and
  // derive the two bordered cells with the exact geometry collectKropkiDots uses.
  // Returns [{ type:'X'|'V', a:'col,row', b:'col,row' }] (0-indexed cell keys).
  function collectXVDots() {
    var svg = document.getElementById('svgrenderer');
    var cs = getGridCellSize();
    if (!svg || !cs) return [];
    var N = detectGridSize();
    var out = [];
    var seen = {};
    function inGrid(col, row) { return col >= 0 && col < N && row >= 0 && row < N; }
    svg.querySelectorAll('#overlay text, #underlay text').forEach(function (t) {
      if (t.getAttribute('data-spdr-kropki-label') != null) return;   // our own injected label
      var s = (t.textContent || '').trim().toUpperCase();
      if (s !== 'X' && s !== 'V') return;
      var bb; try { bb = t.getBBox(); } catch (e) { return; }
      if (!bb || bb.width === 0 || bb.height === 0) return;            // not rendered (e.g. under fog)
      var cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      function gridDist(v) { var m = ((v % cs) + cs) % cs; return Math.min(m, cs - m); }
      var tol = cs * 0.15, half = cs / 2;
      var onVert = gridDist(cx) < tol && Math.abs(gridDist(cy) - half) < tol;
      var onHorz = gridDist(cy) < tol && Math.abs(gridDist(cx) - half) < tol;
      if (!onVert && !onHorz) return;                                  // not centred on an interior cell border
      var a, b;
      if (onVert) {                              // vertical border → left | right cells
        var bc = Math.round(cx / cs), r = Math.floor(cy / cs);
        a = (bc - 1) + ',' + r; b = bc + ',' + r;
      } else {                                   // horizontal border → top | bottom cells
        var br = Math.round(cy / cs), c = Math.floor(cx / cs);
        a = c + ',' + (br - 1); b = c + ',' + br;
      }
      var ap = a.split(',').map(Number), bp = b.split(',').map(Number);
      if (!inGrid(ap[0], ap[1]) || !inGrid(bp[0], bp[1])) return;
      var key = a + '|' + b + '|' + s;
      if (seen[key]) return;
      seen[key] = 1;
      out.push({ type: s, a: a, b: b });
    });
    return out;
  }

  // Same arc-consistency-to-a-fixpoint machinery as computeKropkiRemovals, but the
  // partner test is a SUM: candidate d in a cell on an XV clue survives only if the
  // neighbour can currently hold e with d+e = 5 (V) or 10 (X). The two cells of any
  // XV clue are orthogonally adjacent, so they always share a row or column → they
  // can never be equal; a self-partner (d == target−d, i.e. d=2.5 for V, d=5 for X)
  // is therefore impossible and excluded (mirrors black Kropki dropping 2d==d).
  function computeXVRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };   // letters / empty digit set → sums undefined
    var uni = st.uni;
    function partners(type, d) {
      var target = type === 'X' ? 10 : 5;
      var e = target - d;
      if (e === d) return [];                // same-digit partner impossible (cells share a row/col)
      return uni[e] ? [e] : [];
    }

    var dots = collectXVDots();
    if (unitFilter) dots = dots.filter(function (dot) { return unitFilter([dot.a, dot.b]); });
    if (dots.length === 0) return { noXV: true };

    var values = st.values, centre = st.centre, fullSet = st.fullSet;
    function neighbourSet(key) {
      if (values[key] != null) return new Set([values[key]]);
      if (centre[key]) return centre[key];
      return fullSet;
    }
    function hasPartner(type, d, otherSet) {
      var ps = partners(type, d);
      for (var i = 0; i < ps.length; i++) if (otherSet.has(ps[i])) return true;
      return false;
    }

    var markedKeys = Object.keys(centre);
    var removals = [], seen = {};
    function consider(self, other, type) {
      if (values[self] != null || !centre[self]) return;
      var os = neighbourSet(other);
      Array.from(centre[self]).forEach(function (d) {
        if (!hasPartner(type, d, os)) {
          centre[self].delete(d);
          var k = self + '/' + d;
          if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: self, digit: String(d) }); }
        }
      });
    }
    var changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      var before = removals.length;
      dots.forEach(function (dot) {
        consider(dot.a, dot.b, dot.type);
        consider(dot.b, dot.a, dot.type);
      });
      changed = removals.length > before;
    }

    var emptied = 0;
    markedKeys.forEach(function (k) { if (centre[k] && centre[k].size === 0) emptied++; });

    return { removals: removals, xvCount: dots.length, emptiedCells: emptied };
  }

  // ── Cage validator ────────────────────────────────────────────────────────
  // Standard killer cages (a small total in a corner, no repeated digit). For
  // each cage we generate every distinct-digit combination matching its size and
  // sum, then remove any centre candidate that NO combination can place — where
  // "can place" means there's a full distinct-cell assignment of one such
  // combination to the cage's cells (respecting every cell's current candidates)
  // with this candidate in this cell. Independent of the Kropki validator (own
  // board read, own removal list) so the two can be toggled separately later.

  // Read the puzzle's killer cages from the parsed model (synchronous, side-effect
  // -free Framework.app getter — same access pattern as readModelExtraRegions).
  // Returns [{ keys:[<col,row>…], sum:<num> }] for cages we can validate: a numeric
  // total, distinct digits (unique !== false), at least two cells, all cells in
  // grid. Cages without a sum (plain regions, sandwich clues) or that allow repeats
  // are skipped. Cell strings "r1c3" are 1-indexed (row,col) → 0-indexed "col,row".
  function getKillerCages() {
    var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
      ? Framework.app.puzzle.currentPuzzle : null;
    if (!cp || !Array.isArray(cp.cages)) return [];
    var N = detectGridSize();
    var out = [];
    cp.cages.forEach(function (cage) {
      if (!cage || cage.unique === false) return;
      // cp.cages also carries SudokuPad's auto-generated standard-region pseudo-cages
      // (each row/column/box modeled as its own unique-sum-45 "cage") alongside
      // user-authored killer cages. Only style:'killer' is a real killer cage;
      // row/col are style:undefined,type:'rowcol' and boxes are style:'box' — both
      // must be excluded or this validator silently does full row/col/box elimination
      // (naked/hidden singles) instead of killer-cage-only checks. Found via puzzle
      // https://sudokupad.app/d1ibvjjncd, whose cp.cages held 14 real cages + 9 box +
      // 18 row/col pseudo-cages, all of which were being validated as killer cages.
      if (cage.style !== 'killer') return;
      var sum = typeof cage.sum === 'number' ? cage.sum : Number(cage.value);
      if (!isFinite(sum)) return;
      var cellStr = cage.cells || '';
      var keys = [], ok = true, m, re = /r(\d+)c(\d+)/gi;
      while ((m = re.exec(cellStr)) !== null) {
        var col = Number(m[2]) - 1, row = Number(m[1]) - 1;
        if (col < 0 || row < 0 || col >= N || row >= N) { ok = false; break; }
        keys.push(col + ',' + row);
      }
      if (ok && keys.length >= 2) out.push({ keys: keys, sum: sum });
    });
    return out;
  }

  // All distinct-digit combinations of `size` digits drawn from `digits` (sorted
  // ascending) that sum to `target`. Each combination is returned as an array of
  // numbers. Plain subset-sum recursion; digit counts are tiny (≤ grid size).
  function cageCombinations(digits, size, target) {
    var res = [];
    (function rec(start, chosen, remaining, need) {
      if (need === 0) { if (remaining === 0) res.push(chosen.slice()); return; }
      for (var i = start; i < digits.length; i++) {
        var d = digits[i];
        if (d > remaining) break;                       // sorted → no larger digit fits
        chosen.push(d);
        rec(i + 1, chosen, remaining - d, need - 1);
        chosen.pop();
      }
    })(0, [], target, size);
    return res;
  }

  // Can the digits be placed one-per-cell (a perfect matching), where digit i may
  // occupy cell j iff allowed(i, j)? Kuhn's augmenting-path bipartite matching;
  // returns true only when every digit finds a distinct cell. With equal counts
  // that means every cell is filled — i.e. a complete legal fill of the cage.
  function hasPerfectMatching(numDigits, numCells, allowed) {
    var matchCell = new Array(numCells).fill(-1);   // cell → digit index, or -1
    function augment(di, visited) {
      for (var cj = 0; cj < numCells; cj++) {
        if (allowed(di, cj) && !visited[cj]) {
          visited[cj] = true;
          if (matchCell[cj] === -1 || augment(matchCell[cj], visited)) {
            matchCell[cj] = di;
            return true;
          }
        }
      }
      return false;
    }
    for (var di = 0; di < numDigits; di++) {
      if (!augment(di, new Array(numCells).fill(false))) return false;
    }
    return true;
  }

  // Compute centre-candidate removals forced by the killer cages, iterated to a
  // fixpoint (a removal in one cell can invalidate a neighbour's only supporting
  // combination, so we re-sweep until a full pass changes nothing). Pure w.r.t. the
  // board — works on copies of the candidate sets and returns the removal list.
  function computeCageRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var cages = getKillerCages();
    if (unitFilter) cages = cages.filter(function (cage) { return unitFilter(cage.keys); });
    if (cages.length === 0) return { noCages: true };

    var digitList = Object.keys(st.uni).map(Number).sort(function (a, b) { return a - b; });

    // Per-cage combination list. A cage with ZERO valid combinations (an impossible
    // total, or a digit set that doesn't match the puzzle's) is dropped rather than
    // allowed to wipe out every candidate — the validator must never over-remove.
    var active = [];
    cages.forEach(function (cage) {
      var combos = cageCombinations(digitList, cage.keys.length, cage.sum)
        .map(function (c) { return { arr: c, set: new Set(c) }; });
      if (combos.length > 0) active.push({ keys: cage.keys, combos: combos });
    });
    if (active.length === 0) return { noCages: true };

    // Working copies of the player's centre marks (the only cells we may modify).
    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (st.values[key] != null) return new Set([st.values[key]]);
      if (work[key]) return work[key];
      return st.fullSet;                                // empty cell → unconstrained, never modified
    }

    // Does some combination of `cage` admit a full fill with digit d in cell C?
    // Fix d→C, then require a perfect matching of the combo's remaining digits onto
    // the cage's remaining cells (each respecting that cell's current candidates).
    function cageSupports(cage, cIdx, d) {
      var keys = cage.keys;
      for (var ci = 0; ci < cage.combos.length; ci++) {
        var combo = cage.combos[ci];
        if (!combo.set.has(d)) continue;
        // remaining digits (the combo minus one occurrence of d) and cells (minus C)
        var digits = [], used = false;
        for (var i = 0; i < combo.arr.length; i++) {
          if (!used && combo.arr[i] === d) { used = true; continue; }
          digits.push(combo.arr[i]);
        }
        var cells = [];
        for (var j = 0; j < keys.length; j++) if (j !== cIdx) cells.push(cellSet(keys[j]));
        // each remaining cell must still be able to hold a combo digit; matching
        // confirms a *distinct*-cell assignment exists.
        if (hasPerfectMatching(digits.length, cells.length, function (a, b) {
          return cells[b].has(digits[a]);
        })) return true;
      }
      return false;
    }

    var removals = [], seen = {};
    var changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      active.forEach(function (cage) {
        cage.keys.forEach(function (C, cIdx) {
          if (st.values[C] != null || !work[C]) return;   // only cells with player marks
          Array.from(work[C]).forEach(function (d) {       // snapshot: set mutates in loop
            if (!cageSupports(cage, cIdx, d)) {
              work[C].delete(d);
              var k = C + '/' + d;
              if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(d) }); }
              changed = true;
            }
          });
        });
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0) emptied++; });

    return { removals: removals, cageCount: active.length, emptiedCells: emptied };
  }

  // ── Little-killer validator ───────────────────────────────────────────────
  // A little killer constrains the SUM along a diagonal. Unlike a cage, digits
  // may REPEAT along the diagonal — except where ordinary Sudoku rules forbid
  // it: two diagonal cells in the same BOX, or the same uniqueness CAGE, must
  // differ. (Two cells on a diagonal never share a row or column, so those never
  // apply.) A candidate d in a diagonal cell is removed only when NO assignment
  // of digits to the whole diagonal — each within its current candidates,
  // summing to the target, with every box-/cage-sharing pair distinct — places d
  // in that cell. Independent of the other validators (own board read + removal
  // list), iterated to a fixpoint like the cage validator.

  // Regular box dimensions for an N×N grid: { h: rows, w: cols }. h = the largest
  // divisor of N that is ≤ √N (so 9→3×3, 6→2×3, 8→2×4, 12→3×4, 16→4×4). Used for
  // the box-conflict test; jigsaw/irregular regions aren't derived here, so on
  // such a (rare) puzzle the box constraint is simply under-applied, never wrong.
  function regularBoxDims(N) {
    var h = 1;
    for (var k = 1; k * k <= N; k++) if (N % k === 0) h = k;
    return { h: h, w: N / h };
  }

  // Cell-key sets for every cage that forbids repeats (unique !== false), incl.
  // sum-less "region" cages — any such cage makes two diagonal cells in it differ.
  // Separate from getKillerCages (which needs a numeric sum); here only uniqueness
  // matters. Returns [Set<"col,row">]. Cells "r1c3" 1-indexed → "col,row" 0-indexed.
  function getUniqueCageCellSets() {
    var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
      ? Framework.app.puzzle.currentPuzzle : null;
    if (!cp || !Array.isArray(cp.cages)) return [];
    var N = detectGridSize();
    var out = [];
    cp.cages.forEach(function (cage) {
      if (!cage || cage.unique === false) return;
      var keys = [], m, re = /r(\d+)c(\d+)/gi, s = cage.cells || '';
      while ((m = re.exec(s)) !== null) {
        var col = Number(m[2]) - 1, row = Number(m[1]) - 1;
        if (col >= 0 && row >= 0 && col < N && row < N) keys.push(col + ',' + row);
      }
      if (keys.length >= 2) out.push(new Set(keys));
    });
    return out;
  }

  // Read the puzzle's little killers as [{ keys:[<col,row>…], sum }]. Detection is
  // DOM-based and era-independent: SudokuPad renders every little killer (native
  // SCL or legacy-cosmetic, e.g. vurjqaca3k) the same way — a numeric label
  // anchored just OUTSIDE the grid plus a short diagonal arrow in #arrows. We read
  // the sum from the label and, from the arrow, its TIP (which points at a real
  // grid corner) plus its direction signs; the first in-grid cell is the corner's
  // neighbour in the pointing direction, then we walk the diagonal by (±1,±1).
  // (Using the tip-corner + direction — rather than a c±r constant off the label
  // centre — avoids the half-cell off-by-one that the anti-diagonal otherwise
  // hits.) Guards keep it specific
  // (only an outside-grid numeric label matched to an outside-grid ~45° arrow
  // counts), so sandwich/X-sum frame numbers and in-grid arrow constraints are
  // ignored; if a future puzzle renders LKs differently it simply isn't detected
  // (under-removal, safe) rather than mis-detected. Extensible: add another source
  // returning the same { keys, sum } shape and union it in.
  function getLittleKillers() {
    var cs = getGridCellSize();
    var svg = document.getElementById('svgrenderer');
    if (!cs || !svg) return [];
    var N = detectGridSize();
    var gridPx = N * cs;
    function outside(px, py) {
      return px < -cs * 0.1 || py < -cs * 0.1 || px > gridPx + cs * 0.1 || py > gridPx + cs * 0.1;
    }

    // 1) Diagonal arrow shafts (~45°) whose START is outside the grid. The first
    //    "M x y L x y" coordinate pair is the shaft tail (out near the label); the
    //    sign of dx·dy picks the diagonal family. The arrowhead marker paths in
    //    each <g>'s <defs> start near the origin (inside) → filtered out here.
    var shafts = [];
    var arrowsLayer = document.getElementById('arrows');
    if (arrowsLayer) {
      arrowsLayer.querySelectorAll('path').forEach(function (p) {
        var d = p.getAttribute('d') || '';
        var nums = d.match(/-?\d+(?:\.\d+)?/g);
        if (!nums || nums.length < 4) return;
        var x1 = +nums[0], y1 = +nums[1], x2 = +nums[2], y2 = +nums[3];
        var dx = x2 - x1, dy = y2 - y1;
        if (Math.abs(dx) < cs * 0.05 || Math.abs(dy) < cs * 0.05) return;   // must be diagonal
        if (Math.abs(Math.abs(dx) - Math.abs(dy)) > cs * 0.3) return;        // ~45° only
        if (!outside(x1, y1)) return;                                        // tail outside grid
        shafts.push({ x: x1, y: y1, tipx: x2, tipy: y2,
          sgnx: Math.sign(dx), sgny: Math.sign(dy), used: false });
      });
    }
    if (shafts.length === 0) return [];

    // 2) Numeric labels positioned outside the grid, each matched to the nearest
    //    unused shaft tail (within ~1 cell). Label x/y ≈ the anchor cell centre in
    //    px, so ar = y/cs, ac = x/cs (continuous, half-integer-ish).
    var out = [], seen = {};
    svg.querySelectorAll('text').forEach(function (t) {
      var txt = (t.textContent || '').trim();
      if (!/^\d+$/.test(txt)) return;
      var x = parseFloat(t.getAttribute('x')), y = parseFloat(t.getAttribute('y'));
      if (!isFinite(x) || !isFinite(y) || !outside(x, y)) return;
      var best = null, bestD = cs * 1.0;
      shafts.forEach(function (s) {
        if (s.used) return;
        var dist = Math.hypot(s.x - x, s.y - y);
        if (dist < bestD) { bestD = dist; best = s; }
      });
      if (!best) return;
      best.used = true;
      // Arrow tip → the grid corner it points at; first cell = the corner's
      // neighbour in the pointing direction; then walk the diagonal by (sgn,sgn).
      var R = Math.round(best.tipy / cs), C = Math.round(best.tipx / cs);
      var keys = [];
      for (var r = best.sgny > 0 ? R : R - 1, c = best.sgnx > 0 ? C : C - 1;
           r >= 0 && r < N && c >= 0 && c < N; r += best.sgny, c += best.sgnx) {
        keys.push(c + ',' + r);
      }
      if (keys.length < 1) return;
      var sig = keys.join(' ') + '=' + txt;
      if (seen[sig]) return;
      seen[sig] = 1;
      out.push({ keys: keys, sum: Number(txt) });
    });
    return out;
  }

  // Compute centre-candidate removals forced by the little killers, iterated to a
  // fixpoint (a removal can invalidate another diagonal's support; diagonals may
  // also cross-share cells). Pure w.r.t. the board — works on copies of the
  // candidate sets and returns the removal list.
  function computeLittleKillerRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var lks = getLittleKillers();
    if (unitFilter) lks = lks.filter(function (lk) { return unitFilter(lk.keys); });
    if (lks.length === 0) return { noLittleKillers: true };

    var N = detectGridSize();
    var bd = regularBoxDims(N);
    var cageSets = getUniqueCageCellSets();
    function boxId(key) { var p = key.split(','); return Math.floor(p[1] / bd.h) + ',' + Math.floor(p[0] / bd.w); }
    function shareCage(a, b) { for (var i = 0; i < cageSets.length; i++) if (cageSets[i].has(a) && cageSets[i].has(b)) return true; return false; }
    function conflict(a, b) { return boxId(a) === boxId(b) || shareCage(a, b); }

    // Per-diagonal conflict matrix (which cell pairs must differ).
    var diags = lks.map(function (lk) {
      var keys = lk.keys;
      var conf = keys.map(function (_, i) { return keys.map(function (__, j) { return i !== j && conflict(keys[i], keys[j]); }); });
      return { keys: keys, sum: lk.sum, conf: conf };
    });

    // Working copies of the player's centre marks (the only cells we may modify).
    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (st.values[key] != null) return new Set([st.values[key]]);
      if (work[key]) return work[key];
      return st.fullSet;                                // empty cell → unconstrained, never modified
    }

    // Which (cell-index, digit) pairs the diagonal can still place: enumerate every
    // assignment hitting the target sum with all box/cage-sharing pairs distinct,
    // each cell drawing from its CURRENT candidate set, and union the digits used
    // per cell. Backtracking with exact-sum suffix-bound + conflict pruning. A node
    // cap guards a pathological search; if hit we bail (no removals from this
    // diagonal this pass — never over-remove).
    function computeSupported(diag) {
      var keys = diag.keys, n = keys.length, conf = diag.conf, target = diag.sum;
      var sets = keys.map(function (k) { return Array.from(cellSet(k)).sort(function (a, b) { return a - b; }); });
      if (sets.some(function (s) { return s.length === 0; })) return { supported: null, bailed: false, empty: true };
      var sufMin = new Array(n + 1).fill(0), sufMax = new Array(n + 1).fill(0);
      for (var i = n - 1; i >= 0; i--) {
        sufMin[i] = sufMin[i + 1] + sets[i][0];
        sufMax[i] = sufMax[i + 1] + sets[i][sets[i].length - 1];
      }
      var supported = keys.map(function () { return new Set(); });
      var assign = new Array(n), nodes = 0, CAP = 300000, bailed = false;
      (function dfs(idx, sum) {
        if (bailed) return;
        if (nodes++ > CAP) { bailed = true; return; }
        if (idx === n) { if (sum === target) for (var k = 0; k < n; k++) supported[k].add(assign[k]); return; }
        if (sum + sufMin[idx] > target || sum + sufMax[idx] < target) return;
        var opts = sets[idx];
        for (var oi = 0; oi < opts.length; oi++) {
          var d = opts[oi];
          if (sum + d + sufMin[idx + 1] > target) break;          // sorted asc → larger d only worse
          var ok = true;
          for (var j = 0; j < idx; j++) if (conf[idx][j] && assign[j] === d) { ok = false; break; }
          if (!ok) continue;
          assign[idx] = d;
          dfs(idx + 1, sum + d);
          if (bailed) return;
        }
      })(0, 0);
      return { supported: supported, bailed: bailed, empty: false };
    }

    var removals = [], seen = {}, changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      diags.forEach(function (diag) {
        var res = computeSupported(diag);
        if (res.bailed || res.empty || !res.supported) return;    // give up safely on this diagonal
        diag.keys.forEach(function (C, i) {
          if (st.values[C] != null || !work[C]) return;           // only cells with player marks
          Array.from(work[C]).forEach(function (d) {              // snapshot: set mutates in loop
            if (!res.supported[i].has(d)) {
              work[C].delete(d);
              var k = C + '/' + d;
              if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(d) }); }
              changed = true;
            }
          });
        });
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0) emptied++; });

    return { removals: removals, lkCount: diags.length, emptiedCells: emptied };
  }

  // ── German Whisper validator ──────────────────────────────────────────────
  // A German Whisper: every pair of cells ADJACENT ALONG THE LINE must differ by
  // at least 5. SudokuPad has no native "whisper" model key — authors draw them as
  // cosmetic lines (cp.lines, or an #arrows <path> for imported puzzles), the ≥5
  // rule living only in the puzzle text. Detection is LAYERED (green → single line
  // colour + rules cue → rules-named colour → manual-select fallback); the full
  // policy + the catalog evidence behind it live above `classifyWhisperLines`.
  //
  // Validation is DELIBERATELY LOCAL — one cell at a time, looking ONLY at its
  // immediate neighbour(s) on the line (never longer-range line logic). A
  // candidate d in cell C survives iff EVERY neighbour can hold a partner ≥5 away
  // from d (partners of d = { e in the digit set : |d−e| ≥ 5 }); and when C has
  // TWO neighbours that ordinary Sudoku forces to differ (same row / column / box
  // / uniqueness-cage), those two partners must be DISTINCT (feasible iff the two
  // partner sets' union has ≥ 2 digits). So on three cells inside one box the
  // centre loses 4/5/6 (each needs the SAME lone partner on both sides) but keeps
  // 7 (partners {1,2} → distinct). 5 dies everywhere unless 0 is in the digit set
  // (the only digit ≥5 from 5). Iterated to a fixpoint: a removal can shrink a
  // neighbour's partner set and unlock a further removal.

  // Green-dominant → treat as a German-whisper line. Parses hex (incl. alpha) or
  // rgb() via the shared parseColor. Excludes orange/yellow (red≈green), grey
  // (all channels close), blue (blue dominant), purple (red dominant).
  function isGermanWhisperColor(color) {
    var c = parseColor(color);
    if (!c || c.a === 0) return false;
    return c.g > 90 && c.g >= c.r + 40 && c.g >= c.b + 40;
  }

  // Expand a line's wayPoints (each [col+0.5, row+0.5]) into one cell key per grid
  // cell it passes through: an author may draw a straight/diagonal run as two
  // distant wayPoints, but the ≥5 rule is between ADJACENT cells, so every interior
  // cell must be materialised. Consecutive duplicates are collapsed.
  function expandLineChain(wayPoints) {
    function toCell(p) { return [Math.round(p[0] - 0.5), Math.round(p[1] - 0.5)]; }
    var cells = [toCell(wayPoints[0])];
    for (var i = 1; i < wayPoints.length; i++) {
      var prev = toCell(wayPoints[i - 1]), cur = toCell(wayPoints[i]);
      var dc = cur[0] - prev[0], dr = cur[1] - prev[1];
      var steps = Math.max(Math.abs(dc), Math.abs(dr));
      for (var s = 1; s <= steps; s++) cells.push([Math.round(prev[0] + dc * s / steps), Math.round(prev[1] + dr * s / steps)]);
    }
    var keys = [];
    cells.forEach(function (cr) { var k = cr[0] + ',' + cr[1]; if (keys[keys.length - 1] !== k) keys.push(k); });
    return keys;
  }

  // ── Whisper-line DETECTION (layered; green is never enough on its own) ──────
  // Colour alone can't find every German whisper — verified against the catalog:
  // ~57% of ≥5 puzzles never write the phrase "German Whisper", and while GREEN is
  // the overwhelming convention, real ones are drawn grey (#aaa — `6z3zy41pm6`,
  // `qhcougnkg6`) or themed (#aa8d8d — `atfgvx1pgc`). Grey ALSO means palindrome,
  // so a non-green line is only trusted when the rules confirm a whisper. Layers:
  //   1. GREEN lines are always whispers (any green shade).
  //   2. else, if the rules carry a ≥5 whisper cue AND every cosmetic line is ONE
  //      single colour → that colour is the whisper (`atfgvx1pgc`, grey loops).
  //   3. else, if the cue is present AND the rules NAME a colour for it ("grey
  //      line … differ by 5") → lines of that colour are the whisper.
  //   4. else, if the cue is present but the line can't be pinned → AMBIGUOUS: the
  //      menu tells the player, and only lines they SELECT are validated (run for
  //      the selected line regardless of colour). Option "any line" is deliberately
  //      NOT offered — it would mis-flag palindromes/region-sum lines.

  function getPuzzleRulesBlob() {
    var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
      ? Framework.app.puzzle.currentPuzzle : null;
    if (!cp) return '';
    var md = cp.metadata || {};
    function rulesOf(o) { return Array.isArray(o.rules) ? o.rules.join(' ') : (typeof o.rules === 'string' ? o.rules : ''); }
    return ((cp.title || md.title || '') + ' ' + rulesOf(cp) + ' ' + rulesOf(md)).toLowerCase();
  }
  // A "German whisper" ≥5 cue: the phrase itself, or a "differ/difference … 5/five"
  // phrasing. Kept in sync with the catalog analysis that showed 83% of whisper
  // puzzles carry exactly this signal (vs 40% for the bare phrase).
  var WHISPER_CUE_RE = /(german\s+whisper)|(differ(?:ence)?\s*(?:by|of)?\s*(?:at least|a minimum of|minimum of|of at least)?\s*(?:5|five))|(minimum difference of (?:5|five))/;
  function hasWhisperRuleCue() { return WHISPER_CUE_RE.test(getPuzzleRulesBlob()); }

  // ── Named-colour matching (nearest-reference, robust to legend puzzles) ─────
  // A multi-colour "legend" puzzle ("Red line: parity. Purple line: zipper. Brown
  // line: slow thermo…") needs each cosmetic line assigned to the ONE colour word
  // it best matches. Independent per-word thresholds FAIL here: a "red" test also
  // fires on a red-dominant brown line (#965429), and a light-red line (#f66f =
  // #ff6666) sits between the red and pink buckets. Instead we score each line
  // against every colour word NAMED IN THIS PUZZLE and take the nearest — a rival
  // word (brown) in the same legend pulls its own line away from red, and a colour
  // not in the legend (cyan) never competes, so #2ecbff lands on "blue".
  //
  // Scoring is in HSL: HUE picks the chromatic family — robust exactly where RGB
  // distance is fragile (purple 275° vs magenta 320°; salmon-red 0° vs pink 320°).
  // Saturation/lightness terms handle the achromatic words (grey/black/white) and
  // brown (a dark, muted, warm hue). Canonicalises violet→purple, magenta→pink,
  // gray→grey. `rgbToHsl` returns [h,s,l] with h in [0,1); we work in degrees.
  //
  // A WORD MISSING HERE IS A SILENT AMBIGUOUS. `clauseColorWord` can only see words
  // in this list, so a clue named in a word we don't know resolves to NO colour and
  // the validator gives up before it ever looks at a line (v3.87: "peach" was absent,
  // which alone cost 11 of the catalog's 20 readable entropic puzzles — peach is
  // close to a CONVENTION for entropic lines, 14 of the 30 puzzles that say it).
  // New words were picked from the catalog by how often they sit next to "line", and
  // each one is either an ALIAS or its OWN word by one test: does it ever co-occur
  // with its target in the same rules? An alias that co-occurs would let one clause
  // claim both lines — a mis-apply, which is worse than the ambiguous it replaces.
  //   peach   → OWN WORD. Co-occurs with orange in 6 puzzles and yellow in 2, so it
  //             cannot alias either; #ffccaa/#ffe5b4 vs orange #ffa600 differ only in
  //             LIGHTNESS, hence the peach case + light-warm penalty below.
  //   lavender→ purple. NEVER co-occurs with purple/violet, and lavender lines already
  //             score purple, so the alias is a pure gain. It must NOT be its own
  //             lightness-keyed word: setters often draw lavender as a vivid purple at
  //             low ALPHA (`sde0yq3oj3` = #851fe663), and we score the opaque value —
  //             a "light purple" test would miss exactly those.
  //   gold/golden → yellow. Gold lines already score yellow; the 2 puzzles naming gold
  //             AND yellow are false alarms (one shades CELLS gold, the other's gold
  //             is a Nabner line no clause confuses with its yellow).
  //   indigo  → purple, silver → grey. Small but free: no co-occurrence, and their
  //             lines already score to the target.
  // DELIBERATELY OMITTED: lime/mint (co-occur with green 4× and 3×) and navy — an
  // alias there would mis-apply. beige is omitted too: its 3 puzzles disagree on the
  // colour (#ffccaa in one, #e1d7b3 in another), so there's nothing to key on.
  // ORDER MATTERS: clauseColorWord returns the first match IN THIS ARRAY, not the
  // first in the clause, so new words go at the END — an existing word keeps priority
  // when a clause names two.
  var COLOR_WORD_HUE = { red: 0, orange: 30, yellow: 55, green: 120, cyan: 180, blue: 210, purple: 275, pink: 320 };
  var COLOR_WORD_ALL = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'violet', 'pink', 'magenta', 'brown', 'grey', 'gray', 'black', 'white', 'cyan', 'turquoise', 'teal', 'aqua', 'peach', 'lavender', 'gold', 'golden', 'indigo', 'silver'];
  function canonColorWord(w) {
    if (w === 'violet' || w === 'lavender' || w === 'indigo') return 'purple';
    if (w === 'magenta') return 'pink';
    if (w === 'gray' || w === 'silver') return 'grey';
    if (w === 'gold' || w === 'golden') return 'yellow';
    if (w === 'turquoise' || w === 'teal' || w === 'aqua') return 'cyan';
    return w;
  }
  function circularHueDeg(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }
  // Lower = better fit of RGB colour `c` (a {r,g,b}) to canonical colour word `word`.
  function colorWordScore(c, word) {
    if (!c) return Infinity;
    var hsl = rgbToHsl(c.r, c.g, c.b), h = hsl[0] * 360, s = hsl[1], l = hsl[2];
    switch (word) {
      case 'black': return l * 360 + s * 60;
      case 'white': return (1 - l) * 360 + s * 120;
      case 'grey':                                                  // low saturation, mid lightness
        return s * 300 + Math.max(0, 0.12 - l) * 600 + Math.max(0, l - 0.90) * 600;
      case 'brown':                                                 // muted warm hue; light tans still
        // read as "light brown" in rules text (2hk0wen7pj), so the lightness
        // penalty is gentle — 400 made tan lose to PURPLE in a legend retry.
        return circularHueDeg(h, 28) + Math.max(0, l - 0.42) * 200 + Math.max(0, 0.12 - s) * 300;
      case 'peach':                                                 // a LIGHT, saturated warm hue
        // Peach and orange share a hue (#ffccaa 24°, #ffe5b4 35°, #ffa600 39°), so
        // lightness is the whole discriminator: peach lands at l≈0.83-0.88 where
        // orange sits at 0.50. The hue term is weighted 1.5 so a light RED/PINK
        // (#ffc0cb, 350°) can't drift here on lightness alone; the saturation floor
        // keeps white (s=0) out. Deliberately NOT gentle like brown's: it must leave
        // the "light brown" tan #dfc39c (l=0.74) on orange, or the v3.82 legend
        // retry for 2hk0wen7pj regresses.
        return circularHueDeg(h, 28) * 1.5 + Math.max(0, 0.78 - l) * 500 + Math.max(0, 0.35 - s) * 400;
      default: {
        var hue = COLOR_WORD_HUE[word];
        if (hue == null) return Infinity;
        var d = circularHueDeg(h, hue);
        // Setters rarely write "cyan" — teal-leaning blues ("#2ecbff", hue 195°)
        // are called BLUE in rules; the handicap keeps them there while true
        // turquoise (~180°) still lands on cyan.
        if (word === 'cyan') d += 12;
        d += Math.max(0, 0.25 - s) * 600;                           // washed-out → grey, not a vivid hue
        d += Math.max(0, 0.10 - l) * 400 + Math.max(0, l - 0.95) * 400;
        if ((word === 'red' || word === 'orange' || word === 'yellow') && l < 0.42 && s > 0.2 && s < 0.85)
          d += (0.42 - l) * 300;                                    // a dark warm colour is brown, not red
        if ((word === 'red' || word === 'orange' || word === 'yellow') && l > 0.78 && s > 0.35)
          d += (l - 0.78) * 300;                                    // …and a LIGHT warm colour is peach
        return d;
      }
    }
  }
  // The canonical colour word (from `words`) that RGB colour `c` is nearest to.
  function nearestColorWord(c, words) {
    if (!c) return null;
    var best = null, bd = Infinity;
    for (var i = 0; i < words.length; i++) {
      var cw = canonColorWord(words[i]), sc = colorWordScore(c, cw);
      if (sc < bd) { bd = sc; best = cw; }
    }
    return best;
  }
  // Classify a line's colour to its single nearest canonical palette word (ABSOLUTE
  // — the whole palette competes, so #2ecbff → blue, #965429 → brown, #ff6666 → red).
  // "cyan" carries a hue handicap (see colorWordScore), so teal-leaning BLUES resolve
  // to blue (the word setters actually use for them). Absolute (not legend-restricted)
  // so a line whose colour ISN'T the clue's colour never gets swept in when the
  // legend happens to name only one colour.
  function lineColorWord(l) { return nearestColorWord(parseColor(l.color), COLOR_WORD_ALL); }
  // The canonical colour word named in the first rules clause matching clauseRe.
  // Whole-word match ONLY: "coloured" must not read as "red", "constant" as "tan".
  function colorWordRe(w) { return new RegExp('\\b' + w + '\\b'); }
  function clauseColorWord(blob, clauseRe) {
    var clauses = blob.split(/[.\n;]/);
    for (var i = 0; i < clauses.length; i++) {
      if (!clauseRe.test(clauses[i])) continue;
      for (var j = 0; j < COLOR_WORD_ALL.length; j++)
        if (colorWordRe(COLOR_WORD_ALL[j]).test(clauses[i])) return canonColorWord(COLOR_WORD_ALL[j]);
    }
    return null;
  }
  // Every canonical colour word named ANYWHERE in the rules blob (the puzzle's
  // colour legend). Used by the legend-retry below.
  function blobColorWords(blob) {
    var seen = {}, out = [];
    COLOR_WORD_ALL.forEach(function (w) {
      if (!colorWordRe(w).test(blob)) return;
      var c = canonColorWord(w);
      if (!seen[c]) { seen[c] = 1; out.push(c); }
    });
    return out;
  }
  // Lines whose classified colour equals the colour this clause names. Because each
  // line is classified ABSOLUTELY against the full palette, a brown line can't be
  // mistaken for the red clue (brown is a nearer palette word than red), and a
  // non-matching-colour line is never swept in. Returns matched [{color,keys}] or
  // null (clause names no colour / no line lands on it → caller falls to AMBIGUOUS).
  //
  // LEGEND RETRY (v3.82): the absolute test can miss a colour the setter names
  // loosely — "light brown" lines drawn #dfc39c classify absolutely as ORANGE
  // (2hk0wen7pj "Hijinks"), so the brown clue matched nothing. When the absolute
  // pass finds no line AND the rules name ≥2 distinct colours (a true multi-line
  // legend), re-classify each line against ONLY the legend's words — the rival
  // legend words keep the match honest (purple/turquoise pull their own lines
  // away), so tan lands on brown. The ≥2 guard keeps the v3.80 protection: with a
  // single named colour there are no rivals, and a legend-restricted match would
  // sweep EVERY line onto that word (the exact bug v3.80 fixed).
  function linesForClauseColor(all, blob, clauseRe) {
    var word = clauseColorWord(blob, clauseRe);
    if (!word) return null;
    var matched = all.filter(function (l) { return lineColorWord(l) === word; });
    if (matched.length > 0) return matched;
    var legend = blobColorWords(blob);
    if (legend.length >= 2) {
      matched = all.filter(function (l) { return nearestColorWord(parseColor(l.color), legend) === word; });
      if (matched.length > 0) return matched;
    }
    return null;
  }

  // Every cosmetic line as { color, keys } — from the MODEL (cp.lines), falling
  // back to stroked <path>s in the DOM for cosmetic-only puzzles. Reads the STROKE
  // ATTRIBUTE (author's original colour; our object-shading only rewrites inline
  // style). Thermos (cp.thermos) and arrows (marker-end) are excluded.
  //
  // DOM source = the shared LINE_DOM_LAYER_IDS layers (#arrows + #overlay), gated by
  // the shared isLineCluePath predicate — see that block for why lines live in more
  // than one layer and which subsystems must stay in sync. De-duped by colour+cells
  // so a line present in both layers isn't counted twice.
  function scanLineLayer(layer, cs, inGrid, out, seen) {
    if (!layer) return;
    layer.querySelectorAll('path').forEach(function (p) {
      if (!isLineCluePath(p)) return;                              // shared clue-line gate (see isLineCluePath)
      var stroke = lineStrokeSrc(p);
      var nums = (p.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g);
      var wp = [];
      for (var i = 0; i + 1 < nums.length; i += 2) wp.push([+nums[i] / cs, +nums[i + 1] / cs]);
      var keys = expandLineChain(wp);
      if (keys.length < 2 || !keys.every(inGrid)) return;
      var sig = normLineColor(stroke) + '|' + keys.join(' ');
      if (seen[sig]) return;
      seen[sig] = 1;
      out.push({ color: stroke, keys: keys });
    });
  }
  function getCosmeticLines() {
    var N = detectGridSize();
    function inGrid(k) { var p = k.split(','); return +p[0] >= 0 && +p[0] < N && +p[1] >= 0 && +p[1] < N; }
    var out = [];
    var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
      ? Framework.app.puzzle.currentPuzzle : null;
    if (cp && Array.isArray(cp.lines)) {
      cp.lines.forEach(function (l) {
        if (!l || !Array.isArray(l.wayPoints) || l.wayPoints.length < 2) return;
        var keys = expandLineChain(l.wayPoints);
        if (keys.length >= 2 && keys.every(inGrid)) out.push({ color: l.color || '', keys: keys });
      });
      if (out.length > 0) return out;
    }
    var cs = getGridCellSize();
    if (!cs) return out;
    var seen = {};
    LINE_DOM_LAYER_IDS.forEach(function (id) {
      scanLineLayer(document.getElementById(id), cs, inGrid, out, seen);
    });
    return out;
  }

  // Normalise a colour string for "same colour" grouping (drop alpha, upper-case).
  function normLineColor(c) {
    var p = parseColor(c);
    if (!p) return String(c || '').toUpperCase();
    return p.r + ',' + p.g + ',' + p.b;
  }

  // A line whose cells all lie on ONE detected thermometer is that thermo's
  // SHAFT, not an independent clue — green thermos exist (qpd5keiva9
  // "Equipoise": thermos drawn as green cp.lines + bulb underlays, rules all
  // about thermometers, no whisper anywhere), so the colour-trust layer must
  // not claim it. Scoped to whisper layer 1 ONLY: the cue-gated layers already
  // demand whisper language in the rules, and a cue-bearing line drawn exactly
  // on top of a thermo (stacked clues, e.g. kszsitwn8p's modular-lines-on-
  // thermos) must stay in the cosmetic pool for its own validator.
  function thermoClaimedSets() {
    try {
      return getThermos().map(function (t) {
        var s = {};
        t.keys.forEach(function (k) { s[k] = 1; });
        return s;
      });
    } catch (e) { return []; }
  }
  function lineOnThermo(keys, sets) {
    return sets.some(function (s) {
      return keys.every(function (k) { return s[k]; });
    });
  }

  // RIVAL-CUE negative evidence for the green-trust layer (v3.82): if the rules
  // NAME green for some OTHER line rule and never say anything whisper-shaped in
  // a green clause ("green lines are thermometers" — bulbless green thermos have
  // no bulb for the thermo-claim filter to find), green is not a whisper here.
  // Rules that never mention green at all keep the trust (the usual convention:
  // green whisper lines with no colour named). \bdiffer(s|ence)?\b — plain
  // "different" must NOT count as whisper language ("green thermometers … may
  // sum to different totals", qpd5keiva9).
  var WHISPERISH_RE = /whisper|\bdiffer(s|ence)?\b/;
  function greenNamedForRival() {
    var clauses = getPuzzleRulesBlob().split(/[.\n;]/);
    var named = false, whispered = false;
    clauses.forEach(function (cl) {
      if (!/\bgreen\b/.test(cl)) return;
      named = true;
      if (WHISPERISH_RE.test(cl)) whispered = true;
    });
    return named && !whispered;
  }

  // Classify the puzzle's cosmetic lines into whisper lines + a confidence mode.
  // Returns { mode:'confident'|'ambiguous'|'none', lines:[[keys]…], allLines:[{color,keys}] }.
  function classifyWhisperLines() {
    var all = getCosmeticLines();
    if (all.length === 0) return { mode: 'none', lines: [], allLines: all };
    var green = all.filter(function (l) { return isGermanWhisperColor(l.color); });
    if (green.length > 0 && greenNamedForRival()) green = [];
    if (green.length > 0) {
      var tsets = thermoClaimedSets();
      green = green.filter(function (l) { return !lineOnThermo(l.keys, tsets); });
    }
    if (green.length > 0) return { mode: 'confident', lines: green.map(function (l) { return l.keys; }), allLines: all };

    var cue = hasWhisperRuleCue();
    if (!cue) return { mode: 'none', lines: [], allLines: all };

    // Layer 2 — cue + single line colour → that colour is the whisper.
    var colors = {};
    all.forEach(function (l) { colors[normLineColor(l.color)] = 1; });
    if (Object.keys(colors).length === 1) return { mode: 'confident', lines: all.map(function (l) { return l.keys; }), allLines: all };

    // Layer 3 — cue + a colour the rules name for the whisper (nearest-legend match).
    var wmatched = linesForClauseColor(all, getPuzzleRulesBlob(), WHISPERISH_RE);
    if (wmatched) return { mode: 'confident', lines: wmatched.map(function (l) { return l.keys; }), allLines: all };

    // Layer 4 — a whisper is present but its line can't be pinned → manual select.
    return { mode: 'ambiguous', lines: [], allLines: all };
  }
  function whisperDetected() { return classifyWhisperLines().mode !== 'none'; }
  function whisperIsAmbiguous() { return classifyWhisperLines().mode === 'ambiguous'; }

  // ── Cue-gated cosmetic-line detection (shared by renban + region-sum) ───────
  // Renban and region-sum lines have NO native model key and share the cosmetic
  // #arrows/cp.lines rendering with whispers, palindromes, betweens, nabners… and
  // colour ALONE is not a reliable discriminator (renban's usual purple is ALSO
  // nabner's; region-sum's usual blue is ALSO between's). So — unlike whisper,
  // whose green shade is trusted on its own — these two require a RULES CUE, then
  // pin the lines exactly like whisper's layers 2–4:
  //   1. cue absent → NONE (never guess a line type from colour when it collides).
  //   2. cue + every cosmetic line one single colour → that colour is the clue.
  //   3. cue + the rules NAME a colour for it ("purple lines are renban") → those.
  //   4. cue but can't pin → AMBIGUOUS (menu asks the player to select the line).
  // Under-detect, never mis-apply — the standing validator contract.
  function classifyCueLines(cueRe, clauseRe) {
    var all = getCosmeticLines();
    if (all.length === 0) return { mode: 'none', lines: [], allLines: all };
    var blob = getPuzzleRulesBlob();
    if (!cueRe.test(blob)) return { mode: 'none', lines: [], allLines: all };
    var colors = {};
    all.forEach(function (l) { colors[normLineColor(l.color)] = 1; });
    if (Object.keys(colors).length === 1) return { mode: 'confident', lines: all.map(function (l) { return l.keys; }), allLines: all };
    var matched = linesForClauseColor(all, blob, clauseRe);
    if (matched) return { mode: 'confident', lines: matched.map(function (l) { return l.keys; }), allLines: all };
    return { mode: 'ambiguous', lines: [], allLines: all };
  }

  // Renban: a rules cue = the word "renban", or "consecutive … any order" / "set of
  // consecutive" phrasing (verified against the catalog: ~94% of renban puzzles
  // carry exactly this). Clause trigger for the named-colour layer: renban/consecutive.
  var RENBAN_CUE_RE = /renban|consecutive\s+(?:digits?|numbers?)?[^.]*any order|set of consecutive|consecutive\s+(?:digits?|numbers?)\s+in any order/;
  // Named-colour clause trigger = "renban" ONLY (not bare "consecutive"): a Nabner
  // clause ("no two digits can be consecutive or identical") also carries
  // "consecutive", and in a multi-colour legend it sits before the renban clause →
  // the old /consecutive/ grabbed Nabner's colour (yellow on 3xdi7kf6ab). Same class
  // of collision as REGIONSUM_CLAUSE_RE's bare "sum" (fixed v3.76). A renban-by-
  // description-only legend (no "renban" word) falls to ambiguous → manual select.
  var RENBAN_CLAUSE_RE = /renban/;
  function classifyRenbanLines() { return classifyCueLines(RENBAN_CUE_RE, RENBAN_CLAUSE_RE); }
  function renbanDetected() { return classifyRenbanLines().mode !== 'none'; }
  function renbanIsAmbiguous() { return classifyRenbanLines().mode === 'ambiguous'; }

  // Region-sum lines: box/region borders split the line into segments of EQUAL sum.
  // Cue = "region sum", "box borders divide/split", or "same/equal sum in each
  // box/region". Clause trigger for the named-colour layer: region/box/segment or
  // "same/equal sum" — NOT bare "sum". Bare "sum" collides with every other summing
  // clue (zipper "center sum", killer/arrow/sandwich sums), so in a multi-colour
  // puzzle it can grab the wrong colour: e.g. 3xdi7kf6ab's Zipper clause ("…an
  // equal distance from the center sum…") named purple, so the validator locked
  // onto the purple zipper line and reported "no region-sum lines" (fixed v3.76).
  // v3.88 — catalog-measured rewrite: 75.8% → 94.5% recall over 326 tagged puzzles.
  // The old cue lost 61 real puzzles to four narrownesses, each seen in the wild:
  //   "each 3x3 box"   — `each\s+(?:box|region)` can't span the size ("values on the
  //                      blue line have the same sum in each 3x3 box", `bl168ah6g9`)
  //   "every" region   — only "each" was accepted (`2ifg92eka9`, the reported puzzle)
  //   "same TOTAL"     — only "sum" was accepted ("sum to the same total in each 3x3
  //                      box that the line visits", `foesxbaf60`); also number/value
  //   non-box borders  — only "box borders divide" ("zone borders … divide blue lines
  //                      into segments", `a6zbf6jui2`; "square region borders",
  //                      `7FngrT9ftq`), plus "equal sums lines" as a named variant
  var REGIONSUM_CUE_RE = /region[- ]?sum|equal[- ]?sums?\s+(?:lines?|snakes?|paths?|loops?|rings?|snowflakes?)|(?:box|region|zone|grid)\s+borders?\s+(?:divide|split|cut|separate)|(?:same|equal)\s+(?:sum|total|number|value)[^.]{0,40}(?:each|every)\s+(?:\d+x\d+\s+)?(?:box|region|zone|segment)|(?:each|every)\s+(?:\d+x\d+\s+)?(?:box|region|zone)[^.]{0,60}(?:same|equal)\s+(?:sum|total|number|value)|(?:each|every)\s+segments?[^.]{0,60}(?:same|equal)\s+(?:sum|total|number|value)|segments?[^.]{0,40}(?:each|every)\s+of\s+which[^.]{0,30}(?:same|equal)\s+(?:sum|total)|(?:sum|total)[^.]{0,60}same\s+(?:in|within)\s+(?:each|every)\s+(?:\d+x\d+\s+)?(?:box|region|zone)|(?:in|within)\s+(?:each|every)\s+(?:\d+x\d+\s+)?(?:box|region|zone)[^.]{0,60}(?:same|equal)\s+(?:sum|total|number|value)/;
  var REGIONSUM_CLAUSE_RE = /region|box|segment|(?:same|equal)\s+sum/;
  function classifyRegionSumLines() { return classifyCueLines(REGIONSUM_CUE_RE, REGIONSUM_CLAUSE_RE); }
  function regionSumDetected() { return classifyRegionSumLines().mode !== 'none'; }
  function regionSumIsAmbiguous() { return classifyRegionSumLines().mode === 'ambiguous'; }

  // Parity lines: adjacent digits alternate odd/even along the line. Catalog rules
  // phrase it as "parity line(s)", "alternate between odd and even", "adjacent
  // digits may not have the same parity", "cells alternate in parity" (35/35 real
  // puzzles agree on this rule). Cue = the word "parity" near "line"/"alternate",
  // or "alternate … odd/even" / "same parity" phrasing. Usual colour is red, but
  // colour alone can't discriminate a cosmetic line, so cue-gated like renban.
  // Clause trigger for the named-colour layer: parity / alternate / odd / even.
  // v3.88 — the old cue asked "does this puzzle mention parity?", not "is a LINE
  // about parity?", so it fired on 100 puzzles with no parity line at all: parity
  // DOTS/diamonds ("digits separated by a red diamond must differ in parity (even/
  // odd)", `7fvnto2d90`), parity CIRCLES (`0d1yk3fs2d`), and odd/even as a plain
  // global ("digits in gray circles must be odd", `82dowa2bt5`). That is the
  // dangerous direction: cue + a single-coloured cosmetic line = layer 2 CLAIMS
  // that line, so `82dowa2bt5`'s green GERMAN WHISPER would have been validated as
  // parity. 68 such mis-claims removed (9 german_whisper, 7 region_sum, 6 renban,
  // 4 thermo, 2 zipper, 2 entropic) with recall held at 95.1%.
  // Requiring a drawn-object noun (not the bare word "line") is what keeps the
  // recall: real parity clues live on snakes and snowflakes too — "digits along the
  // snowflake alternate between odd and even" (`pt8z9l0wii`), "digits along the
  // snake alternate" (`zmckmtohx1`). Same LINEISH set as REGIONSUM_CUE_RE above.
  var PARITY_CUE_RE = /parity\s+(?:lines?|snakes?|paths?|loops?|rings?|snowflakes?)|(?:lines?|snakes?|paths?|loops?|rings?|snowflakes?)[^.]{0,60}parit|parit[^.]{0,60}(?:lines?|snakes?|paths?|loops?|rings?|snowflakes?)|(?:lines?|snakes?|paths?|loops?|rings?|snowflakes?)[^.]{0,60}alternat\w*\s+(?:between\s+)?(?:odd|even)|alternat\w*\s+(?:between\s+)?(?:odd|even)[^.]{0,60}(?:lines?|snakes?|paths?|loops?|rings?|snowflakes?)|(?:lines?|snakes?|paths?|loops?|rings?|snowflakes?)[^.]{0,50}(?:odd|even)\s*\/\s*(?:odd|even)|(?:odd|even)\s*\/\s*(?:odd|even)[^.]{0,50}(?:lines?|snakes?|paths?|loops?|rings?|snowflakes?)/;
  // Named-colour clause trigger = the DISTINCTIVE words only (not bare "odd"/"even",
  // which collide with odd/even-cell clues in a multi-colour legend — same lesson
  // as renban's "consecutive" / region-sum's "sum").
  var PARITY_CLAUSE_RE = /parit|alternat/;
  function classifyParityLines() { return classifyCueLines(PARITY_CUE_RE, PARITY_CLAUSE_RE); }
  function parityDetected() { return classifyParityLines().mode !== 'none'; }
  function parityIsAmbiguous() { return classifyParityLines().mode === 'ambiguous'; }

  // Zipper lines: fold the line at its centre — every pair of cells equidistant
  // from the centre sums to one constant total S; for an odd-length line the lone
  // centre cell IS S. Cue = "zipper", or "equal distance from the cent(re)" /
  // "equidistant … cent(re)" phrasing. Cue-gated like renban (no native key, and
  // its colour — often blue/purple — collides with other cosmetic lines). Clause
  // trigger for the named-colour layer: zipper / equidistant / equal distance.
  var ZIPPER_CUE_RE = /zipper|equal\s+distance\s+from\s+the\s+cent|equidistant[^.]*cent/;
  var ZIPPER_CLAUSE_RE = /zipper|equidistant|equal\s+distance/;
  function classifyZipperLines() { return classifyCueLines(ZIPPER_CUE_RE, ZIPPER_CLAUSE_RE); }
  function zipperDetected() { return classifyZipperLines().mode !== 'none'; }
  function zipperIsAmbiguous() { return classifyZipperLines().mode === 'ambiguous'; }

  // Entropic lines: every run of THREE consecutive cells on the line holds one LOW,
  // one MID and one HIGH digit — equal thirds of the digit set.
  //
  // THE GATE IS THE DIGIT SET, NEVER THE GRID SIZE. "Low/medium/high" is a claim
  // about the digit ORDER, so all that matters is that the digits in play split
  // into three equal bands. Bands = the sorted digit set cut into thirds:
  //   9x9, 1-9              → {1,2,3}/{4,5,6}/{7,8,9}    ✓
  //   6x6, 1-6              → {1,2}/{3,4}/{5,6}          ✓
  //   7x7 SQUISHDOKU, 1-9   → {1,2,3}/{4,5,6}/{7,8,9}    ✓  — `pdnc0ckv87`: a 7x7
  //       grid whose nine 3x3 boxes OVERLAP, so it holds 1-9. Gating on grid size
  //       wrongly refused it; the digit count comes from `detectDigitCount`.
  //   9x9 but digits set to 1-7 → 7 % 3 ≠ 0 → REFUSED (no low/mid/high split
  //       exists, and guessing one would invent a rule the puzzle never stated).
  // Returns { of: {digit→band}, size } or null when the set can't split into 3.
  function entropicBands() {
    var ds = sanitizeDigitSet(settings.digitSet || '').split('').map(Number);
    if (ds.length < 3 || ds.length % 3 !== 0) return null;
    ds.sort(function (a, b) { return a - b; });
    var third = ds.length / 3, of = {};
    ds.forEach(function (d, i) { of[d] = Math.floor(i / third); });
    return { of: of, size: ds.length };
  }
  // Cue-gated like renban: entropic lines have no native model key and their usual
  // peach/orange collides with every other cosmetic line. Cue = "entropic line(s)"
  // or entropy/entropic within a clause of the word "line" (catalog: 62 puzzles).
  // The ANTI guard blocks the near-miss rules that also say "entrop…line" but are
  // NOT this constraint — each one verified against a real catalog puzzle:
  //   biased entrop… → unequal bands {1,2}/{3,4,5}/{6,7,8,9}   (`ho51fykiy7`)
  //   tentrop…       → runs of FOUR over X-pairs {19}{28}{37}{46} (`3gkoee7rau`,
  //                    `c3qu3xglut`) — note "\bentrop" alone already misses
  //                    "tentropic", this is belt-and-braces
  //   anti-entrop…   → orthogonal-neighbour rule, not a line       (`74j61weh89`)
  //   "exactly two of"/"either one of" → the line's TYPE is itself the deduction
  //                    ("each line is EXACTLY TWO of modular, entropic, or parity",
  //                    `1cwnilmrp0`) — validating it as entropic would over-remove.
  // Under-detect, never mis-apply — a puzzle mixing a guarded rule WITH plain
  // entropic lines is dropped too, which is the safe direction.
  var ENTROPIC_CUE_RE = /\bentropic\s+lines?|\bentropy\s+lines?|(?:\bentropic\b|\bentropy\b)[^.]{0,60}line|line[^.]{0,60}(?:\bentropic\b|\bentropy\b)/;
  var ENTROPIC_ANTI_RE = /biased\s+entrop|tentrop|anti[- ]?entrop|(?:exactly|either)\s+(?:one|two)\s+of/;
  // v3.88 — the cue above only fires when the rules NAME the constraint, but a large
  // minority of setters just DESCRIBE the 123/456/789 partition and never write
  // "entropic" at all — `3ns1yd8hps` (the reported puzzle) says only "one high digit
  // (789), one medium digit (456), and one low digit (123)". No word-based cue can
  // ever reach those. ENTROPIC_SET_RE matches the partition itself, in the notations
  // the catalog actually uses: (123) / {1,2,3} / [1 2 3] / 1/2/3, and the
  // low/middle/high wording. Recall 75.0% → 88.9%.
  // ⚠️ It MUST be paired with ENTROPIC_LINEISH_RE: a bare "123" matches band(1,2,3),
  // so the triple alone hits any rules text with a 1-9 block in it — `5l6mlo349f`
  // draws its BOX NUMBERS as "123\n456\n789" and has no line clue whatsoever.
  // Requiring a drawn-object noun in the blob is what keeps that from over-removing.
  // Each band tolerates the notations seen in the catalog: 123, (123), {1,2,3},
  // [1 2 3], 1/2/3. Kept as one literal (not composed from parts) so that
  // tools/cue_recall.py can parse it straight out of this file and score it.
  var ENTROPIC_SET_RE = /(?:low|high)[^.]{0,40}(?:\{|\(|\[)?\s*4\s*[,\/ ]?\s*5\s*[,\/ ]?\s*6\s*(?:\}|\)|\])?[^.]{0,40}(?:high|low)|(?:\{|\(|\[)?\s*1\s*[,\/ ]?\s*2\s*[,\/ ]?\s*3\s*(?:\}|\)|\])?[^.]{0,60}(?:\{|\(|\[)?\s*4\s*[,\/ ]?\s*5\s*[,\/ ]?\s*6\s*(?:\}|\)|\])?[^.]{0,60}(?:\{|\(|\[)?\s*7\s*[,\/ ]?\s*8\s*[,\/ ]?\s*9\s*(?:\}|\)|\])?|(?:\{|\(|\[)?\s*7\s*[,\/ ]?\s*8\s*[,\/ ]?\s*9\s*(?:\}|\)|\])?[^.]{0,60}(?:\{|\(|\[)?\s*4\s*[,\/ ]?\s*5\s*[,\/ ]?\s*6\s*(?:\}|\)|\])?[^.]{0,60}(?:\{|\(|\[)?\s*1\s*[,\/ ]?\s*2\s*[,\/ ]?\s*3\s*(?:\}|\)|\])?/;
  var ENTROPIC_LINEISH_RE = /lines?|snakes?|paths?|loops?|rings?|snowflakes?/;
  function hasEntropicCue(blob) {
    if (ENTROPIC_CUE_RE.test(blob)) return true;
    return ENTROPIC_SET_RE.test(blob) && ENTROPIC_LINEISH_RE.test(blob);
  }
  // Named-colour clause trigger = the distinctive word only (not "low"/"high"/"set",
  // which collide with other clues in a multi-colour legend — the renban
  // "consecutive" / region-sum "sum" lesson).
  var ENTROPIC_CLAUSE_RE = /\bentrop/;
  function classifyEntropicLines() {
    if (!entropicBands()) return { mode: 'none', lines: [], allLines: [] };
    if (ENTROPIC_ANTI_RE.test(getPuzzleRulesBlob())) return { mode: 'none', lines: [], allLines: [] };
    // classifyCueLines only ever calls cueRe.test(blob), so a duck-typed matcher
    // lets the named cue and the described-partition cue share one code path.
    return classifyCueLines({ test: hasEntropicCue }, ENTROPIC_CLAUSE_RE);
  }
  function entropicDetected() { return classifyEntropicLines().mode !== 'none'; }
  function entropicIsAmbiguous() { return classifyEntropicLines().mode === 'ambiguous'; }

  // Resolve which line chains a cue-gated validator should check + whether removals
  // are MASKED to the selection. CONFIDENT mode → the classifier's pinned lines,
  // filtered by the shared whole-clue unitFilter (selection-only + fog). AMBIGUOUS
  // mode → require a selection and validate every line the selection touches, only
  // altering selected cells (the player's manual override — same policy as whisper).
  // Returns { lines:[[keys]…], masked, selection } or { needSelection:true }.
  function resolveCueValidatorLines(cls, unitFilter) {
    if (cls.mode === 'ambiguous') {
      var sel = getSelectedCells();
      if (!sel || sel.size === 0) return { needSelection: true };
      var ls = cls.allLines.filter(function (l) { return l.keys.some(function (k) { return sel.has(k); }); })
                           .map(function (l) { return l.keys; });
      if (ls.length === 0) return { needSelection: true };
      return { lines: ls, masked: true, selection: sel };
    }
    var lines = cls.lines;
    if (unitFilter) lines = lines.filter(function (keys) { return unitFilter(keys); });
    return { lines: lines, masked: false, selection: null };
  }

  // Compute centre-candidate removals forced by the German whispers, one cell at a
  // time (local neighbour check above), iterated to a fixpoint. Pure w.r.t. the
  // board. SELECTION-AWARE, unlike the other validators: it reads the selection /
  // fog directly (ignoring the shared whole-clue unitFilter) so it can validate a
  // PARTIALLY-selected line — a cell at the selection edge still SEES the rest of
  // the line, but only cells inside the selection are altered. In AMBIGUOUS mode a
  // selection is REQUIRED, and every selected line is validated regardless of
  // colour (the player's manual override).
  function computeWhisperRemovals() {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var cls = classifyWhisperLines();
    if (cls.mode === 'none') return { noWhispers: true };

    var selection = getSelectedCells();                 // Set<"col,row"> (may be empty)
    var isFogged = getFogTester();                      // fn|null (never remove from a fogged cell)
    var selectionOnly = settings.validateSelectionOnly === true;
    var ambiguous = cls.mode === 'ambiguous';

    var lines, masked;
    if (ambiguous) {
      if (!selection || selection.size === 0) return { noWhispers: true, needSelection: true };
      lines = cls.allLines.filter(function (l) { return l.keys.some(function (k) { return selection.has(k); }); })
                          .map(function (l) { return l.keys; });
      if (lines.length === 0) return { noWhispers: true, needSelection: true };
      masked = true;                                    // only alter selected cells
    } else {
      lines = cls.lines;
      masked = selectionOnly;
      if (masked && (!selection || selection.size === 0)) return { noWhispers: true };
    }

    var N = detectGridSize();
    var bd = regularBoxDims(N);
    var cageSets = getUniqueCageCellSets();
    function boxId(k) { var p = k.split(','); return Math.floor(p[1] / bd.h) + ',' + Math.floor(p[0] / bd.w); }
    function shareCage(a, b) { for (var i = 0; i < cageSets.length; i++) if (cageSets[i].has(a) && cageSets[i].has(b)) return true; return false; }
    // Two of a cell's neighbours must take DISTINCT partners when ordinary Sudoku
    // forbids them being equal: same row, column, box, or uniqueness cage.
    function mustDiffer(a, b) {
      var ap = a.split(','), bp = b.split(',');
      return ap[0] === bp[0] || ap[1] === bp[1] || boxId(a) === boxId(b) || shareCage(a, b);
    }
    // May we DELETE candidates from cell C? Never from a fogged cell; when masked
    // (selection-only or ambiguous), only from cells inside the selection.
    function mayRemove(C) {
      if (isFogged && isFogged(C)) return false;
      if (masked && !selection.has(C)) return false;
      return true;
    }

    var values = st.values, fullSet = st.fullSet;
    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    // A neighbour's readable candidate set: a fogged cell reads as the full set (we
    // never let hidden marks force a removal); otherwise value / working marks /
    // full set. Non-removable neighbours are still READ from their (unshrunk) marks.
    function cellSet(key) {
      if (isFogged && isFogged(key)) return fullSet;
      if (values[key] != null) return new Set([values[key]]);
      if (work[key]) return work[key];
      return fullSet;                                  // empty cell → unconstrained, never modified
    }
    // Digits the neighbour could still hold that are ≥5 away from d (a legal partner).
    function partners(neighbourKey, d) {
      var r = [];
      cellSet(neighbourKey).forEach(function (e) { if (Math.abs(e - d) >= 5) r.push(e); });
      return r;
    }
    function candidateValid(C, d, left, right) {
      var nbrs = [];
      if (left != null) nbrs.push(left);
      if (right != null) nbrs.push(right);
      var psets = nbrs.map(function (nb) { return partners(nb, d); });
      if (psets.some(function (p) { return p.length === 0; })) return false;   // a neighbour has no legal partner
      if (nbrs.length === 2 && mustDiffer(nbrs[0], nbrs[1])) {
        var union = new Set(psets[0].concat(psets[1]));
        if (union.size < 2) return false;             // both neighbours forced to the same lone digit
      }
      return true;
    }

    var removals = [], seen = {};
    var changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      lines.forEach(function (chain) {
        // Closed loop (first cell === last): the shared endpoint is one cell with
        // TWO neighbours, not two one-neighbour ends. Drop the duplicate and wrap
        // neighbours around, else its pair-check (both neighbours forced to the
        // same lone partner — e.g. 4→9, 6→1 when they share a unit) never fires.
        var closed = chain.length > 2 && chain[0] === chain[chain.length - 1];
        var n = closed ? chain.length - 1 : chain.length;
        for (var i = 0; i < n; i++) {
          var C = chain[i];
          if (values[C] != null || !work[C] || !mayRemove(C)) continue;   // only alterable marked cells
          var left = i > 0 ? chain[i - 1] : (closed ? chain[n - 1] : null);
          var right = i < n - 1 ? chain[i + 1] : (closed ? chain[0] : null);
          Array.from(work[C]).forEach(function (d) {           // snapshot: set mutates in loop
            if (!candidateValid(C, d, left, right)) {
              work[C].delete(d);
              var k = C + '/' + d;
              if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(d) }); }
              changed = true;
            }
          });
        }
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0 && mayRemove(k)) emptied++; });

    return { removals: removals, whisperCount: lines.length, emptiedCells: emptied };
  }

  // ── Renban validator ──────────────────────────────────────────────────────
  // A renban line: its cells hold a SET OF CONSECUTIVE DISTINCT digits in any
  // order (e.g. a 4-cell line is some run {d, d+1, d+2, d+3}). This is the cage
  // validator with "combinations" = every consecutive run of the line's length
  // instead of sum-target combos, and the run digits are always distinct → the
  // same perfect-matching support test. CANDIDATE-ELIMINATION CONTRACT: a
  // candidate survives only if some run containing it admits a full distinct-cell
  // fill (each remaining cell from its current candidates). Iterated to a
  // fixpoint; a line with zero possible runs is DROPPED, never wiped.
  function computeRenbanRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var cls = classifyRenbanLines();
    if (cls.mode === 'none') return { noRenban: true };
    var res = resolveCueValidatorLines(cls, unitFilter);
    if (res.needSelection) return { noRenban: true, needSelection: true };
    if (res.lines.length === 0) return { noRenban: true };
    var lines = res.lines, masked = res.masked, selection = res.selection;
    var isFogged = getFogTester();

    var digitList = Object.keys(st.uni).map(Number).sort(function (a, b) { return a - b; });
    var uni = st.uni;
    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (isFogged && isFogged(key)) return st.fullSet;           // fogged neighbour reads as unconstrained
      if (st.values[key] != null) return new Set([st.values[key]]);
      if (work[key]) return work[key];
      return st.fullSet;                                          // empty cell → unconstrained, never modified
    }
    function mayRemove(C) {
      if (isFogged && isFogged(C)) return false;
      if (masked && !selection.has(C)) return false;
      return true;
    }
    // Every consecutive run of `L` distinct digits contained in the digit set.
    function runsFor(L) {
      var runs = [];
      digitList.forEach(function (lo) {
        var arr = [], ok = true;
        for (var i = 0; i < L; i++) { var d = lo + i; if (!uni[d]) { ok = false; break; } arr.push(d); }
        if (ok) runs.push({ arr: arr, set: new Set(arr) });
      });
      return runs;
    }
    var lineData = lines.map(function (keys) { return { keys: keys, runs: runsFor(keys.length) }; })
                        .filter(function (ld) { return ld.runs.length > 0; });   // impossible line → dropped

    // Does some run admit a full fill with digit d in cell C? Fix d→C, then require
    // a perfect matching of the run's remaining digits onto the remaining cells.
    function supports(ld, cIdx, d) {
      var keys = ld.keys;
      for (var ri = 0; ri < ld.runs.length; ri++) {
        var run = ld.runs[ri];
        if (!run.set.has(d)) continue;
        var digits = [], used = false;
        for (var i = 0; i < run.arr.length; i++) {
          if (!used && run.arr[i] === d) { used = true; continue; }
          digits.push(run.arr[i]);
        }
        var cells = [];
        for (var j = 0; j < keys.length; j++) if (j !== cIdx) cells.push(cellSet(keys[j]));
        if (hasPerfectMatching(digits.length, cells.length, function (a, b) { return cells[b].has(digits[a]); })) return true;
      }
      return false;
    }

    var removals = [], seen = {}, changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      lineData.forEach(function (ld) {
        ld.keys.forEach(function (C, cIdx) {
          if (st.values[C] != null || !work[C] || !mayRemove(C)) return;
          Array.from(work[C]).forEach(function (d) {              // snapshot: set mutates in loop
            if (!supports(ld, cIdx, d)) {
              work[C].delete(d);
              var k = C + '/' + d;
              if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(d) }); }
              changed = true;
            }
          });
        });
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0 && mayRemove(k)) emptied++; });
    return { removals: removals, renbanCount: lineData.length, emptiedCells: emptied };
  }

  // ── Region-sum-line validator ─────────────────────────────────────────────
  // A region-sum line: the box/region borders it crosses split it into SEGMENTS,
  // and every segment sums to the SAME (unknown) value S. Cells within a segment
  // share one region → all distinct; across segments (different regions) digits
  // may repeat. The target S is variable (like the arrow circle). Approach:
  // segments are independent GIVEN S, so per segment enumerate every distinct-cell
  // assignment (backtracking, box-distinct), recording which sums it can hit and,
  // per (cell,digit), the sums that place that digit there. A sum S is feasible
  // overall iff EVERY segment can reach it; a candidate d in cell C survives iff
  // some overall-feasible S has an assignment of C's segment with d in C summing to
  // S. Cross-segment same-row/col conflicts are deliberately NOT enforced (they'd
  // couple the segments) — that only UNDER-constrains, never over-removes (same
  // safe-caveat policy as the little killer's jigsaw boxes). Only lines with ≥2
  // segments carry a constraint; a contradictory line (no common S) has NO
  // supported candidate anywhere, so the pass WIPES its marked cells (leaving them
  // empty) rather than silently dropping the line — the empty cells are then
  // surfaced to the player as an error by the run toast (the "no valid combination"
  // path). Silent-drop gave a false all-clear on an invalid line (fixed v3.77).
  function computeRegionSumRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var cls = classifyRegionSumLines();
    if (cls.mode === 'none') return { noRegionSum: true };
    var res = resolveCueValidatorLines(cls, unitFilter);
    if (res.needSelection) return { noRegionSum: true, needSelection: true };
    if (res.lines.length === 0) return { noRegionSum: true };
    var lines = res.lines, masked = res.masked, selection = res.selection;
    var isFogged = getFogTester();

    var N = detectGridSize();
    var bd = regularBoxDims(N);
    var regionMap = getModelRegionMap();   // { "row,col" (0-indexed, row-major) : logicalId } | null
    function regionId(key) {
      var p = key.split(','), col = +p[0], row = +p[1];
      if (regionMap) { var id = regionMap[row + ',' + col]; if (id != null) return 'm' + id; }
      return Math.floor(row / bd.h) + ':' + Math.floor(col / bd.w);   // regular box fallback
    }
    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (isFogged && isFogged(key)) return st.fullSet;
      if (st.values[key] != null) return new Set([st.values[key]]);
      if (work[key]) return work[key];
      return st.fullSet;
    }
    function mayRemove(C) {
      if (isFogged && isFogged(C)) return false;
      if (masked && !selection.has(C)) return false;
      return true;
    }
    // Split a line into maximal same-region runs; keep only lines with ≥2 segments.
    var lineData = [];
    lines.forEach(function (keys) {
      var segs = [], cur = [keys[0]], curId = regionId(keys[0]);
      for (var i = 1; i < keys.length; i++) {
        var id = regionId(keys[i]);
        if (id === curId) cur.push(keys[i]);
        else { segs.push(cur); cur = [keys[i]]; curId = id; }
      }
      segs.push(cur);
      if (segs.length >= 2) lineData.push({ keys: keys, segs: segs });
    });
    if (lineData.length === 0) return { noRegionSum: true };

    // Enumerate one segment (all cells distinct — same region). Returns the set of
    // achievable sums + per-cell { digit → Set<sum> } support, or a bail/empty flag.
    function enumSegment(segKeys) {
      var sets = segKeys.map(function (k) { return Array.from(cellSet(k)).sort(function (a, b) { return a - b; }); });
      var n = sets.length;
      var feasible = new Set(), cd = sets.map(function () { return new Map(); });
      if (sets.some(function (s) { return s.length === 0; })) return { feasible: feasible, cd: cd, bailed: false, empty: true };
      var assign = new Array(n), used = new Set(), nodes = 0, CAP = 200000, bailed = false;
      function dfs(idx, sum) {
        if (bailed) return;
        if (nodes++ > CAP) { bailed = true; return; }
        if (idx === n) {
          feasible.add(sum);
          for (var k = 0; k < n; k++) { var m = cd[k], dd = assign[k]; if (!m.has(dd)) m.set(dd, new Set()); m.get(dd).add(sum); }
          return;
        }
        var opts = sets[idx];
        for (var oi = 0; oi < opts.length; oi++) {
          var d = opts[oi];
          if (used.has(d)) continue;                             // same region → distinct
          used.add(d); assign[idx] = d;
          dfs(idx + 1, sum + d);
          used.delete(d);
          if (bailed) return;
        }
      }
      dfs(0, 0);
      return { feasible: feasible, cd: cd, bailed: bailed, empty: false };
    }

    var removals = [], seen = {}, changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      lineData.forEach(function (ld) {
        var segRes = ld.segs.map(enumSegment);
        if (segRes.some(function (r) { return r.bailed || r.empty; })) return;   // give up on this line safely
        var overall = null;                                      // ∩ of every segment's achievable sums
        segRes.forEach(function (r) {
          if (overall === null) { overall = new Set(r.feasible); return; }
          var nx = new Set();
          overall.forEach(function (s) { if (r.feasible.has(s)) nx.add(s); });
          overall = nx;
        });
        if (!overall) return;                                    // defensive: ≥2 segments ⇒ overall is a Set
        // overall.size === 0 → contradictory line (segments share NO common sum
        // given the current candidates). Do NOT early-return: no candidate is
        // supported, so the loop below removes them all, emptying the marked cells.
        // That empties→error signal is how every validator reports an unsatisfiable
        // clue — silently dropping the line here gave a false all-clear.
        ld.segs.forEach(function (segKeys, si) {
          var cd = segRes[si].cd;
          segKeys.forEach(function (C, ci) {
            if (st.values[C] != null || !work[C] || !mayRemove(C)) return;
            Array.from(work[C]).forEach(function (d) {           // snapshot: set mutates in loop
              var sums = cd[ci].get(d), ok = false;
              if (sums) sums.forEach(function (s) { if (overall.has(s)) ok = true; });
              if (!ok) {
                work[C].delete(d);
                var k = C + '/' + d;
                if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(d) }); }
                changed = true;
              }
            });
          });
        });
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0 && mayRemove(k)) emptied++; });
    return { removals: removals, regionSumCount: lineData.length, emptiedCells: emptied };
  }

  // ── Parity-line validator ─────────────────────────────────────────────────
  // A parity line: adjacent cells alternate odd/even, so the whole line is a
  // 2-colouring with exactly TWO possible phases — either the even indices are
  // odd and the odd indices even, or the reverse. Phase p (0|1) requires parity
  // ((i + p) % 2) at index i (0 = even, 1 = odd, matching digit % 2). A phase is
  // FEASIBLE iff every cell can supply its required parity from its current
  // candidates; a candidate d in cell i survives iff some feasible phase wants
  // d's parity there. CANDIDATE-ELIMINATION CONTRACT: no over-removal (a fogged /
  // empty cell reads as the full set → supplies both parities → never constrains).
  // A closed loop's duplicated endpoint is dropped (path model — the wrap edge is
  // intentionally not enforced; under-constrains a loop, never over-removes).
  // Both phases infeasible → every candidate unsupported → cells emptied → the run
  // toast reports the red "no valid combination" contradiction (uniform signal).
  function computeParityRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var cls = classifyParityLines();
    if (cls.mode === 'none') return { noParity: true };
    var res = resolveCueValidatorLines(cls, unitFilter);
    if (res.needSelection) return { noParity: true, needSelection: true };
    if (res.lines.length === 0) return { noParity: true };
    var lines = res.lines, masked = res.masked, selection = res.selection;
    var isFogged = getFogTester();

    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (isFogged && isFogged(key)) return st.fullSet;
      if (st.values[key] != null) return new Set([st.values[key]]);
      if (work[key]) return work[key];
      return st.fullSet;
    }
    function mayRemove(C) {
      if (isFogged && isFogged(C)) return false;
      if (masked && !selection.has(C)) return false;
      return true;
    }
    // Can this cell (from its readable candidates) supply a digit of parity `par`?
    function hasParity(key, par) {
      var found = false;
      cellSet(key).forEach(function (d) { if ((d % 2) === par) found = true; });
      return found;
    }
    var lineData = lines.map(function (keys) {
      if (keys.length > 2 && keys[0] === keys[keys.length - 1]) return keys.slice(0, -1);
      return keys;
    });

    var removals = [], seen = {}, changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      lineData.forEach(function (keys) {
        var feasible = [false, false];
        for (var p = 0; p < 2; p++) {
          var ok = true;
          for (var i = 0; i < keys.length; i++) {
            if (!hasParity(keys[i], (i + p) % 2)) { ok = false; break; }
          }
          feasible[p] = ok;
        }
        keys.forEach(function (C, i) {
          if (st.values[C] != null || !work[C] || !mayRemove(C)) return;
          Array.from(work[C]).forEach(function (d) {               // snapshot: set mutates in loop
            var par = d % 2;
            var ok = (feasible[0] && par === (i % 2)) || (feasible[1] && par === ((i + 1) % 2));
            if (!ok) {
              work[C].delete(d);
              var k = C + '/' + d;
              if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(d) }); }
              changed = true;
            }
          });
        });
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0 && mayRemove(k)) emptied++; });
    return { removals: removals, parityCount: lineData.length, emptiedCells: emptied };
  }

  // ── Zipper-line validator ─────────────────────────────────────────────────
  // A zipper line: fold it at the geometric centre. Each pair of cells the same
  // distance from the centre sums to one shared total S; an odd-length line's lone
  // centre cell IS S. S is VARIABLE (like the arrow circle / region-sum target),
  // so — because the pairs are independent given S — enumerate per pair the set of
  // achievable sums and, per (cell,digit), which sums it can reach; overall
  // feasible S = the intersection across every pair (∩ the centre's candidates on
  // an odd line). A paired candidate d survives iff some overall-feasible S is
  // reachable with d in its cell (partner holding S−d, distinct where they share a
  // unit); the centre candidate d survives iff d ∈ overall. Distinctness is
  // enforced ONLY for guaranteed sudoku units (same row/col/region) — never
  // over-removes (skipping a genuine constraint only under-constrains). Iterated
  // to a fixpoint; no common S given the marks → all candidates emptied → the run
  // reports the red contradiction (uniform signal, same as region-sum).
  function computeZipperRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var cls = classifyZipperLines();
    if (cls.mode === 'none') return { noZipper: true };
    var res = resolveCueValidatorLines(cls, unitFilter);
    if (res.needSelection) return { noZipper: true, needSelection: true };
    if (res.lines.length === 0) return { noZipper: true };
    var lines = res.lines, masked = res.masked, selection = res.selection;
    var isFogged = getFogTester();

    var N = detectGridSize();
    var bd = regularBoxDims(N);
    var regionMap = getModelRegionMap();   // { "row,col" : logicalId } | null
    function regionId(key) {
      var p = key.split(','), col = +p[0], row = +p[1];
      if (regionMap) { var id = regionMap[row + ',' + col]; if (id != null) return 'm' + id; }
      return Math.floor(row / bd.h) + ':' + Math.floor(col / bd.w);
    }
    // Two paired cells must differ only where an ordinary sudoku unit forbids a
    // repeat — same row, column, or box/region (all guaranteed true → safe).
    function mustDiffer(a, b) {
      var ap = a.split(','), bp = b.split(',');
      return ap[0] === bp[0] || ap[1] === bp[1] || regionId(a) === regionId(b);
    }
    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (isFogged && isFogged(key)) return st.fullSet;
      if (st.values[key] != null) return new Set([st.values[key]]);
      if (work[key]) return work[key];
      return st.fullSet;
    }
    function mayRemove(C) {
      if (isFogged && isFogged(C)) return false;
      if (masked && !selection.has(C)) return false;
      return true;
    }
    // Fold structure is fixed by geometry: pairs + optional lone centre (odd line).
    var lineData = lines.map(function (keys) {
      var pairs = [], L = keys.length;
      for (var i = 0; i < Math.floor(L / 2); i++) pairs.push([keys[i], keys[L - 1 - i]]);
      var centre = (L % 2 === 1) ? keys[(L - 1) / 2] : null;
      return { keys: keys, pairs: pairs, centre: centre };
    }).filter(function (ld) { return ld.pairs.length > 0; });     // a 1-cell "line" carries nothing

    var removals = [], seen = {}, changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      lineData.forEach(function (ld) {
        // Per pair: achievable sums + per-(side-digit) the sums it participates in.
        var pairSums = ld.pairs.map(function (pr) {
          var A = Array.from(cellSet(pr[0])), B = Array.from(cellSet(pr[1]));
          var diff = mustDiffer(pr[0], pr[1]);
          var feas = new Set(), aMap = new Map(), bMap = new Map();
          A.forEach(function (da) {
            B.forEach(function (db) {
              if (diff && da === db) return;
              var s = da + db;
              feas.add(s);
              if (!aMap.has(da)) aMap.set(da, new Set()); aMap.get(da).add(s);
              if (!bMap.has(db)) bMap.set(db, new Set()); bMap.get(db).add(s);
            });
          });
          return { feas: feas, aMap: aMap, bMap: bMap };
        });
        var overall = null;                                        // ∩ of every pair's achievable sums
        pairSums.forEach(function (ps) {
          if (overall === null) { overall = new Set(ps.feas); return; }
          var nx = new Set(); overall.forEach(function (s) { if (ps.feas.has(s)) nx.add(s); }); overall = nx;
        });
        if (ld.centre != null) {                                   // odd line: centre value must equal S
          var cc = cellSet(ld.centre), nx = new Set();
          overall.forEach(function (s) { if (cc.has(s)) nx.add(s); }); overall = nx;
        }
        // overall.size === 0 → no common S given the marks → every candidate below
        // is unsupported → the loop empties the cells (the contradiction signal).
        ld.pairs.forEach(function (pr, pi) {
          var ps = pairSums[pi];
          [[pr[0], ps.aMap], [pr[1], ps.bMap]].forEach(function (side) {
            var C = side[0], map = side[1];
            if (st.values[C] != null || !work[C] || !mayRemove(C)) return;
            Array.from(work[C]).forEach(function (d) {             // snapshot: set mutates in loop
              var sums = map.get(d), ok = false;
              if (sums) sums.forEach(function (s) { if (overall.has(s)) ok = true; });
              if (!ok) {
                work[C].delete(d);
                var k = C + '/' + d;
                if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(d) }); }
                changed = true;
              }
            });
          });
        });
        if (ld.centre != null) {
          var Cc = ld.centre;
          if (st.values[Cc] == null && work[Cc] && mayRemove(Cc)) {
            Array.from(work[Cc]).forEach(function (d) {
              if (!overall.has(d)) {
                work[Cc].delete(d);
                var k = Cc + '/' + d;
                if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: Cc, digit: String(d) }); }
                changed = true;
              }
            });
          }
        }
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0 && mayRemove(k)) emptied++; });
    return { removals: removals, zipperCount: lineData.length, emptiedCells: emptied };
  }

  // ── Entropic-line validator ───────────────────────────────────────────────
  // An entropic line: every run of 3 consecutive cells holds one low, one mid and
  // one high digit (thirds of the digit set — see entropicBands).
  //
  // THE KEY IDENTITY: "every window of 3 is all-3-bands" is EXACTLY equivalent to
  // "band(i) depends only on i mod 3, and the three residues take distinct bands".
  // Proof: windows i and i+1 are each all-distinct and share cells i+1,i+2, so
  // band(i) = band(i+3); induction gives period 3, and the first window's
  // distinctness makes the three residues distinct. So the whole line is one of
  // just SIX phases — the 6 permutations of the bands over residues 0,1,2 (the
  // parity validator's 2-phase argument, one dimension up). A phase is FEASIBLE iff
  // every cell can supply its required band; candidate d at index i survives iff
  // some feasible phase wants d's band there. Complete → never over-removes.
  //
  // LOOPS (`keys[0] === keys[last]`, a line drawn back to its start — real: the
  // 6-cell entropic loops on `bdiaxwjnxc`). Two rules, which only work TOGETHER:
  //   1. DROP the duplicated endpoint, so `keys.length` is the true cycle length L
  //      (rule 2 tests it) and the start cell is not phase-tested at two indices.
  //   2. A loop's windows WRAP, so the period-3 structure must close around the
  //      cycle: possible only if 3 | L. Otherwise stepping by 3 around the cycle
  //      reaches every cell (gcd(3,L) === 1), forcing all cells into ONE band and
  //      contradicting window distinctness. An entropic loop simply CANNOT exist at
  //      a length that isn't a multiple of 3 — so such a loop is not an entropic
  //      line at all (whatever our colour-pinning thought) → drop it and validate
  //      nothing. Never wipe the player's marks over it.
  // Why together: skip rule 1 and a loop presents as a path of L+1 whose start cell
  // sits at indices 0 and L. Those residues clash exactly when L % 3 !== 0, killing
  // all 6 phases and WIPING the whole line as a false contradiction (verified for
  // L=4,5,7,8). Rule 2 drops precisely those loops, and for the survivors (3 | L)
  // index L ≡ index 0 (mod 3), so the duplicate is harmless — but only rule 1 makes
  // rule 2 measure L instead of L+1.
  // When 3 | L, index-mod-3 is consistent with wrap-around (L ≡ 0 mod 3), so the
  // SAME `perm[i % 3]` test enforces the wrap windows automatically — a loop needs
  // no separate code path beyond the two rules above.
  //
  // Lines shorter than 3 cells carry no window at all → dropped (no constraint).
  // A cell visited twice at different residues intersects the two demands, which is
  // sound. Fogged/empty cells read as the full set → supply every band → never
  // constrain. Both-guards: all 6 phases infeasible given the marks is a REAL
  // solver contradiction → candidates emptied → the run reports the red "no valid
  // combination" error (the uniform signal).
  function computeEntropicRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var bands = entropicBands();
    if (!bands) return { noEntropic: true };   // digit set doesn't split into 3
    var cls = classifyEntropicLines();
    if (cls.mode === 'none') return { noEntropic: true };
    var res = resolveCueValidatorLines(cls, unitFilter);
    if (res.needSelection) return { noEntropic: true, needSelection: true };
    if (res.lines.length === 0) return { noEntropic: true };
    var lines = res.lines, masked = res.masked, selection = res.selection;
    var isFogged = getFogTester();

    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (isFogged && isFogged(key)) return st.fullSet;
      if (st.values[key] != null) return new Set([st.values[key]]);
      if (work[key]) return work[key];
      return st.fullSet;
    }
    function mayRemove(C) {
      if (isFogged && isFogged(C)) return false;
      if (masked && !selection.has(C)) return false;
      return true;
    }
    // Can this cell (from its readable candidates) supply a digit of band `band`?
    function hasBand(key, band) {
      var found = false;
      cellSet(key).forEach(function (dv) { if (bands.of[dv] === band) found = true; });
      return found;
    }
    // A PLACED value outside the digit set has no band, so we can't reason about
    // its line at all — drop the line rather than read it as "supplies no band"
    // (which would fail every phase and wipe the line). Real case: a `0` revealed
    // from under fog while the digit set is still the assumed 1-9 (see
    // detectDigitSet — a fogged 0 is deliberately not prompted for).
    function digitsReadable(key) {
      var v = st.values[key];
      return v == null || bands.of[v] !== undefined;
    }
    var PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    var lineData = lines.map(function (keys) {
      var loop = keys.length > 3 && keys[0] === keys[keys.length - 1];
      return { keys: loop ? keys.slice(0, -1) : keys, loop: loop };
    }).filter(function (ld) {
      if (ld.keys.length < 3) return false;                       // no window of 3 → no constraint
      if (ld.loop && ld.keys.length % 3 !== 0) return false;      // can't BE an entropic loop → not one
      if (!ld.keys.every(digitsReadable)) return false;           // off-set value → can't reason
      return true;
    });

    var removals = [], seen = {}, changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      lineData.forEach(function (ld) {
        var keys = ld.keys;
        var feasible = PERMS.map(function (perm) {
          for (var i = 0; i < keys.length; i++) if (!hasBand(keys[i], perm[i % 3])) return false;
          return true;
        });
        keys.forEach(function (C, i) {
          if (st.values[C] != null || !work[C] || !mayRemove(C)) return;
          Array.from(work[C]).forEach(function (dv) {             // snapshot: set mutates in loop
            var band = bands.of[dv], ok = false;
            for (var p = 0; p < PERMS.length; p++) if (feasible[p] && PERMS[p][i % 3] === band) { ok = true; break; }
            if (!ok) {
              work[C].delete(dv);
              var k = C + '/' + dv;
              if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(dv) }); }
              changed = true;
            }
          });
        });
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0 && mayRemove(k)) emptied++; });
    return { removals: removals, entropicCount: lineData.length, emptiedCells: emptied };
  }

  // ── Thermo validator ──────────────────────────────────────────────────────
  // A thermometer: digits strictly increase from the round bulb to the tip. A
  // SLOW thermometer relaxes this to non-decreasing (repeats allowed), EXCEPT
  // where ordinary Sudoku rules would forbid the repeat anyway (same row,
  // column, region, or cage) — there it must still strictly increase. Bulbs
  // may branch into several tips (one bulb + stem, multiple arms).

  // Read the puzzle's thermometers from the MODEL (cp.thermos) — SudokuPad's
  // native constraint key, unlike DOM line-scanning which can't tell a thermo
  // shaft from a palindrome/whisper/region-sum line (all render as plain
  // #arrows paths). cp.thermos is a FLAT list of entries, one per rendered
  // polyline ARM; entries sharing the same `line` object are the same arm
  // (grouped by object identity, not a stringified compare). A branching
  // thermometer (one bulb, several tips) is instead SEVERAL distinct `line`
  // groups whose waypoint chains share a common cell PREFIX starting at the
  // same bulb — SudokuPad re-draws the whole arm from the bulb for each tip, so
  // the shared stem is simply repeated in every arm's chain. Cluster every
  // chain starting at the same bulb cell and trie-insert it into one tree, so
  // the shared stem collapses to one set of edges and each branch point fans
  // out correctly. Returns [{ keys:[<col,row>… every cell], edges:[[parentKey,
  // childKey]…], root:<col,row>, leaves:[<col,row>…] }] — one entry per bulb.
  // Chains (arrays of "col,row" cell keys, bulb first) sharing a bulb cell are
  // arms of ONE physical thermometer — trie-insert every chain starting at the
  // same bulb into a single tree, so a shared stem collapses to one edge set
  // and each branch point fans out correctly. Shared by both the model and
  // DOM readers below. Returns [{ keys:[<col,row>… every cell], edges:
  // [[parentKey,childKey]…], root:<col,row>, leaves:[<col,row>…] }].
  function buildThermoTrees(chains) {
    var byBulb = {};
    chains.forEach(function (c) { (byBulb[c[0]] = byBulb[c[0]] || []).push(c); });
    var out = [];
    Object.keys(byBulb).forEach(function (bulbKey) {
      var childrenOf = {}, allKeys = {};
      byBulb[bulbKey].forEach(function (chain) {
        allKeys[chain[0]] = 1;
        for (var i = 1; i < chain.length; i++) {
          allKeys[chain[i]] = 1;
          var set = childrenOf[chain[i - 1]] || (childrenOf[chain[i - 1]] = {});
          set[chain[i]] = 1;
        }
      });
      var edges = [];
      Object.keys(childrenOf).forEach(function (p) {
        Object.keys(childrenOf[p]).forEach(function (c) { edges.push([p, c]); });
      });
      var leaves = Object.keys(allKeys).filter(function (k) { return !childrenOf[k]; });
      out.push({ keys: Object.keys(allKeys), edges: edges, root: bulbKey, leaves: leaves });
    });
    return out;
  }

  // Read thermo ARM CHAINS from the model (cp.thermos — SudokuPad's native
  // constraint key). See buildThermoTrees for how arms sharing a bulb merge.
  function getThermoChainsFromModel() {
    var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
      ? Framework.app.puzzle.currentPuzzle : null;
    if (!cp || !Array.isArray(cp.thermos) || cp.thermos.length === 0) return [];
    var N = detectGridSize();
    function inGrid(col, row) { return col >= 0 && col < N && row >= 0 && row < N; }

    var groups = new Map();   // line object identity -> wayPoints
    cp.thermos.forEach(function (t) {
      if (!t || !t.line || !Array.isArray(t.line.wayPoints)) return;
      if (!groups.has(t.line)) groups.set(t.line, t.line.wayPoints);
    });
    var chains = [];
    groups.forEach(function (wp) {
      var chain = [];
      for (var i = 0; i < wp.length; i++) {
        var col = Math.round(wp[i][0] - 0.5), row = Math.round(wp[i][1] - 0.5);
        if (!inGrid(col, row)) { chain = null; break; }
        chain.push(col + ',' + row);
      }
      if (chain && chain.length >= 2) chains.push(chain);
    });
    return chains;
  }

  // Fallback for THERMOS DRAWN AS GENERIC COSMETICS instead of a native
  // cp.thermos entry (imported/authored puzzles — cp.thermos is then EMPTY
  // even though the puzzle visibly has thermos, e.g.
  // sudokupad.app/blobz/a-long-expected-party, whose thermo is a
  // "thermocosmetic" cell array + a plain cosmetic line). Rather than decode
  // that undocumented per-cell encoding, read what's actually RENDERED: a
  // near-circular, near-full-cell `#underlay rect` (the bulb) whose fill
  // colour matches the START or END point of a plain `#arrows path`
  // (fill:none, NO `marker-end` — that attribute is how Arrow shafts carry
  // their arrowhead marker, so it cleanly excludes Arrow lines, which can
  // render a same-shaped colour-matched bulb+shaft otherwise). Requiring an
  // explicit colour-matched bulb at a path endpoint is deliberately narrow: a
  // puzzle whose cosmetic thermo renders differently simply isn't detected
  // (safe under-detection, never mis-detected as some other line type) — same
  // policy as the little-killer detector.
  function getThermoChainsFromDOM() {
    var svg = document.getElementById('svgrenderer');
    var cs = getGridCellSize();
    if (!svg || !cs) return [];
    var N = detectGridSize();
    function inGrid(col, row) { return col >= 0 && col < N && row >= 0 && row < N; }
    function norm(hex) { return (hex || '').toUpperCase().replace(/[^0-9A-F]/g, ''); }

    var bulbs = [];
    document.querySelectorAll('#underlay rect').forEach(function (r) {
      var w = parseFloat(r.getAttribute('width') || 0), h = parseFloat(r.getAttribute('height') || 0);
      var rx = parseFloat(r.getAttribute('rx') || 0);
      if (w < cs * 0.55 || w > cs * 1.05 || Math.abs(w - h) > cs * 0.1) return;   // near-full-cell only
      if (Math.abs(rx - w / 2) > w * 0.15) return;                                // must be circular
      var fill = norm(r.getAttribute('fill'));
      if (!fill || fill === 'FFFFFF' || fill === '000000') return;                // not a Kropki-style dot
      var x = parseFloat(r.getAttribute('x') || 0), y = parseFloat(r.getAttribute('y') || 0);
      bulbs.push({ cx: x + w / 2, cy: y + h / 2, fill: fill });
    });
    if (bulbs.length === 0) return [];

    var arrowsLayer = document.getElementById('arrows');
    if (!arrowsLayer) return [];
    var tol = cs * 0.25;
    var chains = [];
    arrowsLayer.querySelectorAll('path').forEach(function (p) {
      if (p.getAttribute('marker-end')) return;                    // Arrow shaft, not a thermo
      var fill = p.getAttribute('fill');
      if (fill && fill !== 'none') return;
      var stroke = norm(p.getAttribute('stroke'));
      if (!stroke) return;
      var nums = (p.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g);
      if (!nums || nums.length < 4) return;
      var raw = [];
      for (var i = 0; i + 1 < nums.length; i += 2) raw.push([+nums[i], +nums[i + 1]]);
      // Cosmetic paths compress a straight (incl. diagonal) run of cells into ONE
      // "L" segment spanning all of them (collinear points stripped) — unlike the
      // model's line.wayPoints, which lists every cell. Re-expand each segment
      // into one point per grid cell so no interior cell is skipped.
      var pts = [raw[0]];
      for (var j = 1; j < raw.length; j++) {
        var x1 = raw[j - 1][0], y1 = raw[j - 1][1], x2 = raw[j][0], y2 = raw[j][1];
        var steps = Math.round(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / cs);
        for (var s = 1; s <= steps; s++) pts.push([x1 + (x2 - x1) * s / steps, y1 + (y2 - y1) * s / steps]);
      }

      // A thermo shaft touches its bulb at exactly ONE end. Match by GEOMETRY
      // (an endpoint coincides with a bulb centre), NOT by colour: the bulb is
      // routinely a darker shade than the shaft (e.g. a #999 bulb on a #ccc
      // line — sudokupad.app/9zsl8s2gjl, sudokupad.app/syvmhn0tqy), so the old
      // bulb-fill === shaft-stroke test silently missed ordinary thermos.
      // Requiring EXACTLY one bulb-end keeps it narrow: a cosmetic line circled
      // at BOTH ends (e.g. a between-line or a palindrome) is not mistaken for a
      // thermometer.
      function matches(pt) {
        return bulbs.some(function (b) { return Math.hypot(b.cx - pt[0], b.cy - pt[1]) < tol; });
      }
      var startsAtBulb = matches(pts[0]), endsAtBulb = matches(pts[pts.length - 1]);
      if (startsAtBulb === endsAtBulb) return;                      // need exactly one bulb end
      if (endsAtBulb) pts.reverse();                                // bulb end goes first

      var chain = [], ok = true;
      pts.forEach(function (pt) {
        var col = Math.round(pt[0] / cs - 0.5), row = Math.round(pt[1] / cs - 0.5);
        if (!inGrid(col, row)) { ok = false; return; }
        chain.push(col + ',' + row);
      });
      if (ok && chain.length >= 2) chains.push(chain);
    });
    return chains;
  }

  // ── Cue-gated COSMETIC thermo layer (v3.82) ─────────────────────────────────
  // Some puzzles draw thermos with NO bulb circle at all — the rules say which
  // lines are thermos ("PURPLE LINES are thermos", 2hk0wen7pj "Hijinks") and a
  // non-circular START MARKER (Hijinks: a hexagon built from rotated rect
  // overlays) shows where the low end is. Model + DOM detection both come up
  // empty there. This layer pins the thermo lines from the rules text exactly
  // like the other cosmetic-line validators (thermo cue → single colour → named
  // colour; no cue → nothing), then ORIENTS each line by finding a cell-centred
  // overlay/underlay shape at EXACTLY one endpoint. A pinned line with no such
  // marker (or one at both ends) is a BULBLESS thermo: the bulb could be
  // anywhere along it, so NOTHING is checkable — it is never validated, only
  // counted so the validator can tell the player why it was skipped.
  // Per the standing policy, clues are always treated as TRUE for validation —
  // liar/wrogn mechanics are the solver's problem, never detection's.
  var THERMO_CUE_RE = /thermo/;
  var THERMO_CLAUSE_RE = /thermo/;
  function cueThermoLines() {
    var blob = getPuzzleRulesBlob();
    if (!THERMO_CUE_RE.test(blob)) return [];
    var all = getCosmeticLines();
    if (all.length === 0) return [];
    var colors = {};
    all.forEach(function (l) { colors[normLineColor(l.color)] = 1; });
    if (Object.keys(colors).length === 1) return all;
    return linesForClauseColor(all, blob, THERMO_CLAUSE_RE) || [];
  }
  // Marker cells grouped by NORMALISED COLOUR — filled cosmetic shapes read from
  // the DOM (#overlay/#underlay), keyed by fill colour. Used to find a thermo
  // line's start/position-1 marker.
  //
  // DOM, NOT the model (v3.83): SudokuPad's cosmetic model arrays can be stored
  // TRANSPOSED relative to what it renders (2hk0wen7pj "Hijinks": cp.cosmetic
  // centres are row/col-swapped vs the #overlay geometry), so a model read
  // matches the wrong cells. The DOM is the single source of truth and shares the
  // lines' coordinate space. COLOUR-KEYED because the position-1 hexagon is drawn
  // in its LINE's colour — so a line finds its OWN marker and ignores white
  // hexagon backgrounds and other lines' markers. A marker = a filled (fill≠none)
  // rect/path/polygon roughly cell-sized (0.15–1.1 cell, excludes the lines
  // themselves (fill:none) and big region fills) whose bbox centre lands on a
  // cell centre; a hexagon is a CLUSTER of rects at one cell → collapses to that
  // key. Returns { normColor: { 'c,r': 1 } }.
  function markerCellsByColor() {
    var cs = getGridCellSize(), N = detectGridSize();
    var map = {};
    if (!cs) return map;
    function scan(layer) {
      if (!layer) return;
      layer.querySelectorAll('rect,path,polygon').forEach(function (e) {
        var fill = e.getAttribute('fill');
        if (!fill || fill === 'none') return;
        var bb; try { bb = e.getBBox(); } catch (x) { return; }
        var w = bb.width / cs, h = bb.height / cs;
        if (Math.max(w, h) < 0.15 || Math.min(w, h) > 1.1) return;
        var col = Math.round((bb.x + bb.width / 2) / cs - 0.5);
        var row = Math.round((bb.y + bb.height / 2) / cs - 0.5);
        if (col < 0 || col >= N || row < 0 || row >= N) return;
        var key = normLineColor(fill);
        (map[key] = map[key] || {})[col + ',' + row] = 1;
      });
    }
    scan(document.getElementById('overlay'));
    scan(document.getElementById('underlay'));
    return map;
  }

  // Thermometers, model source preferred (accurate + branch-aware for native
  // puzzles), DOM fallback for cosmetic-only ones (see getThermoChainsFromDOM),
  // plus the cue-gated cosmetic layer above. Returns { trees, bulbless } —
  // bulbless = cue-pinned thermo lines that could not be oriented (skipped,
  // reported to the player by the validator's toast).
  function getThermoDetection() {
    var chains = getThermoChainsFromModel();
    if (chains.length === 0) chains = getThermoChainsFromDOM();
    var covered = {};
    chains.forEach(function (ch) { ch.forEach(function (k) { covered[k] = 1; }); });
    var bulbless = 0;
    try {
      var cand = cueThermoLines();
      var markerMap = cand.length ? markerCellsByColor() : null;
      cand.forEach(function (l) {
        if (l.keys.every(function (k) { return covered[k]; })) return;   // already detected by model/DOM
        var set = (markerMap && markerMap[normLineColor(l.color)]) || {};
        var atStart = set[l.keys[0]] ? 1 : 0;
        var atEnd = set[l.keys[l.keys.length - 1]] ? 1 : 0;
        if (atStart + atEnd !== 1) { bulbless++; return; }               // no marker / both ends → unorientable
        chains.push(atStart ? l.keys.slice() : l.keys.slice().reverse());
      });
    } catch (e) { /* cue layer must never break the model/DOM sources */ }
    return { trees: chains.length ? buildThermoTrees(chains) : [], bulbless: bulbless };
  }
  function getThermos() { return getThermoDetection().trees; }

  // Cell-pair sets that forbid a repeat under ordinary Sudoku rules: box/jigsaw
  // regions (cp.cages type:'region', enumerated in full) plus other
  // uniqueness cages. Row/column pseudo-cages are EXCLUDED here (and row/col
  // are compared directly by coordinate instead) — the model encodes them as a
  // dash RANGE ("r1c1-r1c9"), which a plain r#c# scan would misread as just the
  // two endpoints, silently under-covering the row/column.
  function getThermoRegionCageSets() {
    var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
      ? Framework.app.puzzle.currentPuzzle : null;
    if (!cp || !Array.isArray(cp.cages)) return [];
    var N = detectGridSize();
    var out = [];
    cp.cages.forEach(function (cage) {
      if (!cage || cage.unique === false || cage.type === 'rowcol') return;
      var keys = [], m, re = /r(\d+)c(\d+)/gi, s = cage.cells || '';
      while ((m = re.exec(s)) !== null) {
        var col = Number(m[2]) - 1, row = Number(m[1]) - 1;
        if (col >= 0 && row >= 0 && col < N && row < N) keys.push(col + ',' + row);
      }
      if (keys.length >= 2) out.push(new Set(keys));
    });
    return out;
  }
  // Slow-thermo repeat is legal on edge (a,b) only when the two cells are in
  // neither the same column, the same row, nor a region/cage together.
  function thermoRepeatAllowed(a, b, regionCageSets) {
    var ap = a.split(','), bp = b.split(',');
    if (ap[0] === bp[0] || ap[1] === bp[1]) return false;
    for (var i = 0; i < regionCageSets.length; i++) {
      if (regionCageSets[i].has(a) && regionCageSets[i].has(b)) return false;
    }
    return true;
  }

  // Auto-detect whether the puzzle's thermometers are SLOW (best-effort; the
  // player can always override via the menu's "Slow" checkbox). Two signals,
  // tried in order:
  //  1. GEOMETRY — an arm longer than the digit set can only be strictly
  //     increasing up to that many distinct digits; an arm exceeding it is
  //     only solvable if repeats are allowed, so it MUST be slow.
  //  2. RULES TEXT — the puzzle's title + rules mention slow-thermo phrasing.
  //     Plain "slow thermo" alone misses common phrasings (verified against
  //     the puzzle catalog's slow_thermo-tagged puzzles — 5 of 32 use
  //     "increase or stay the same" / "must not decrease" without ever saying
  //     "slow thermo"), so several phrasings are matched.
  var SLOW_THERMO_PHRASES = [
    'slow thermo', 'increase or stay the same', 'increase or remain the same',
    'must not decrease', 'never decrease', 'non-decreasing', 'nondecreasing',
  ];
  function autoDetectThermoSlow(thermos) {
    try {
      var st = readValidatorBoardState();
      var n = st ? st.fullSet.size : 9;
      var tooLong = thermos.some(function (t) {
        var childrenOf = {};
        t.edges.forEach(function (e) { (childrenOf[e[0]] = childrenOf[e[0]] || []).push(e[1]); });
        var maxDepth = 1;
        (function walk(node, depth) {
          maxDepth = Math.max(maxDepth, depth);
          (childrenOf[node] || []).forEach(function (c) { walk(c, depth + 1); });
        })(t.root, 1);
        return maxDepth > n;
      });
      if (tooLong) return true;
    } catch (e) {}
    try {
      var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
        ? Framework.app.puzzle.currentPuzzle : null;
      var rulesText = cp && Array.isArray(cp.rules) ? cp.rules.join(' ')
        : (cp && typeof cp.rules === 'string') ? cp.rules : '';
      var blob = (((cp && cp.title) || '') + ' ' + rulesText).toLowerCase();
      return SLOW_THERMO_PHRASES.some(function (p) { return blob.indexOf(p) !== -1; });
    } catch (e) {}
    return false;
  }

  // In-memory (never persisted) "Slow" state, keyed per-puzzle like
  // scheduleAutoShade's auto-enable: re-detected fresh on every puzzle
  // (auto value recomputed, manual override cleared), so navigating to a
  // different puzzle in the SPA never carries a stale answer forward.
  var _thermoSlowState = { key: null, override: null, auto: false };
  function thermoSlowPuzzleKey() { return location.pathname + location.search; }
  function ensureThermoSlowState() {
    var key = thermoSlowPuzzleKey();
    if (_thermoSlowState.key !== key) {
      _thermoSlowState = { key: key, override: null, auto: autoDetectThermoSlow(getThermos()) };
    }
    return _thermoSlowState;
  }
  function effectiveThermoSlow() {
    var s = ensureThermoSlowState();
    return s.override !== null ? s.override : s.auto;
  }
  function setThermoSlowOverride(val) { ensureThermoSlowState().override = val; }

  // Compute centre-candidate removals forced by the thermometers, iterated to a
  // fixpoint (forward min-propagation bulb→tip, backward max-propagation
  // tip→bulb; both need to re-run as the other narrows a shared cell). Pure
  // w.r.t. the board — works on copies of the candidate sets and returns the
  // removal list. Edge order doesn't need to be topological: the fixpoint loop
  // converges regardless (monotonic shrinking sets), same pattern as the cage
  // and little-killer validators.
  function computeThermoRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var det = getThermoDetection();
    var thermos = det.trees;
    // Bulbless thermo lines (cue-pinned, unorientable) are NEVER validated —
    // surfaced to the player so a skipped line isn't a silent mystery.
    var note = det.bulbless > 0
      ? ('Note: ' + det.bulbless + ' thermo line' + (det.bulbless === 1 ? ' has' : 's have') +
         ' no bulb marker — the bulb position is unknown, so ' + (det.bulbless === 1 ? 'it was' : 'they were') + ' not checked.')
      : null;
    if (unitFilter) thermos = thermos.filter(function (t) { return unitFilter(t.keys); });
    if (thermos.length === 0) return { noThermos: true, note: note };

    var slow = effectiveThermoSlow();
    var regionCageSets = slow ? getThermoRegionCageSets() : [];

    var values = st.values, fullSet = st.fullSet;
    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (values[key] != null) return new Set([values[key]]);
      if (work[key]) return work[key];
      return fullSet;                                  // empty cell → unconstrained, never modified
    }
    function minOf(set) { return Math.min.apply(null, Array.from(set)); }
    function maxOf(set) { return Math.max.apply(null, Array.from(set)); }

    var removals = [], seen = {};
    function removeIf(key, pred) {
      if (values[key] != null || !work[key]) return false;
      var changed = false;
      Array.from(work[key]).forEach(function (d) {         // snapshot: set mutates in loop
        if (pred(d)) {
          work[key].delete(d);
          var k = key + '/' + d;
          if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: key, digit: String(d) }); }
          changed = true;
        }
      });
      return changed;
    }

    var edges = [];
    thermos.forEach(function (t) { t.edges.forEach(function (e) { edges.push(e); }); });

    var changedAny = true, guard = 0;
    while (changedAny && guard++ < 1000) {
      changedAny = false;
      edges.forEach(function (e) {                          // forward pass: parent's min bounds the child
        var p = e[0], c = e[1];
        var pSet = cellSet(p), cSet = cellSet(c);
        if (pSet.size === 0 || cSet.size === 0) return;
        var allowRepeat = slow && thermoRepeatAllowed(p, c, regionCageSets);
        var pMin = minOf(pSet);
        if (removeIf(c, function (d) { return allowRepeat ? d < pMin : d <= pMin; })) changedAny = true;
      });
      for (var i = edges.length - 1; i >= 0; i--) {          // backward pass: child's max bounds the parent
        var e2 = edges[i], p2 = e2[0], c2 = e2[1];
        var pSet2 = cellSet(p2), cSet2 = cellSet(c2);
        if (pSet2.size === 0 || cSet2.size === 0) continue;
        var allowRepeat2 = slow && thermoRepeatAllowed(p2, c2, regionCageSets);
        var cMax = maxOf(cSet2);
        if (removeIf(p2, function (d) { return allowRepeat2 ? d > cMax : d >= cMax; })) changedAny = true;
      }
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0) emptied++; });

    return { removals: removals, thermoCount: thermos.length, emptiedCells: emptied, note: note };
  }

  // ── Sum-arrow validator ───────────────────────────────────────────────────
  // An arrow: the digits along the shaft (tip included — it's just the last
  // shaft cell) sum to the digit in the circle. Digits MAY repeat along the
  // shaft — except where ordinary Sudoku rules forbid it (two arrow cells, or
  // an arrow cell and the circle, in the same row / column / box / uniqueness
  // cage must differ). Same enumeration machinery as the little-killer
  // validator, extended so the target sum is itself a candidate variable (the
  // circle cell): a circle candidate v is kept iff SOME complete legal
  // assignment of the shaft sums to v; a shaft candidate d is kept iff SOME
  // such assignment (for any surviving v) places d in that cell. Multi-arm
  // arrows are several independent units sharing the circle cell (each arm
  // sums to the circle on its own). Two-cell pill bulbs (a two-digit total)
  // are unsupported and skipped — safe under-detection.

  // Resolve raw arrow ARMS into per-head units, branching-thermo style. Each
  // arm is { bulb:<col,row>|null, cells:[<col,row>…] } (cells = the rendered
  // polyline, first cell = where the polyline starts). An arm STARTING AT ITS
  // BULB is a complete bulb→head path. A MULTI-HEADED arrow renders its extra
  // heads as arms starting at a CELL CENTRE mid-stem of another arm (verified
  // on 08yynh57ts "Super Nova") — each such branch's true path is the parent's
  // stem prefix up to the branch cell + the branch's own cells, so every head
  // becomes one full circle→head unit (the standard multi-head rule: each
  // complete path sums to the circle; the shared stem cells appear in every
  // unit, which is automatically consistent). Nested branches resolve on later
  // passes. A branch whose branch cell yields MORE THAN ONE distinct parent
  // prefix (crossing arrows) is DROPPED, never guessed — under-detection is
  // safe, a wrong stem could over-remove. Model arms carry their bulb, so a
  // model branch only attaches to arms of the SAME arrow; DOM branch arms have
  // no bulb and attach to any resolved chain containing their start cell.
  function resolveArrowArms(arms) {
    var resolved = [], pending = [];
    arms.forEach(function (a) {
      if (!a || a.cells.length === 0) return;
      if (a.bulb != null && a.cells[0] === a.bulb) {
        if (a.cells.length >= 2) resolved.push({ bulb: a.bulb, chain: a.cells.slice() });
      } else {
        pending.push(a);
      }
    });
    var progress = true, guard = 0;
    while (progress && pending.length && guard++ < 50) {
      progress = false;
      for (var i = pending.length - 1; i >= 0; i--) {
        var a = pending[i], bc = a.cells[0];
        var prefixes = [];
        resolved.forEach(function (r) {
          if (a.bulb != null && r.bulb !== a.bulb) return;      // model branch: same arrow only
          var idx = r.chain.indexOf(bc);
          if (idx > 0) prefixes.push(r.chain.slice(0, idx + 1).join('|'));
        });
        if (prefixes.length === 0) continue;                    // parent may resolve on a later pass
        var uniq = Array.from(new Set(prefixes));
        pending.splice(i, 1);
        if (uniq.length > 1) continue;                          // ambiguous parent → drop this head
        var chain = uniq[0].split('|').concat(a.cells.slice(1));
        if (chain.length >= 2) resolved.push({ bulb: chain[0], chain: chain });
        progress = true;
      }
    }
    return resolved.map(function (r) { return { circle: r.chain[0], shaft: r.chain.slice(1) }; });
  }

  // Native model source: cp.arrowSums, one entry per rendered ARM —
  // { bulb: { center, width, height, … }, arrow: { wayPoints } }. NB the
  // coordinates are [row+0.5, col+0.5] (RC order) — the OPPOSITE of
  // cp.thermos' line.wayPoints — verified against the rendered shaft on
  // test puzzle 3x3zm2co6o (bulb center [0.5,6.5] renders at r1c7).
  // Returns raw arms for resolveArrowArms.
  function getArrowsFromModel() {
    var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
      ? Framework.app.puzzle.currentPuzzle : null;
    if (!cp || !Array.isArray(cp.arrowSums) || cp.arrowSums.length === 0) return [];
    var N = detectGridSize();
    function inGrid(k) { var p = k.split(','); return +p[0] >= 0 && +p[0] < N && +p[1] >= 0 && +p[1] < N; }
    var out = [];
    cp.arrowSums.forEach(function (e) {
      if (!e || !e.bulb || !e.arrow || !Array.isArray(e.arrow.wayPoints)) return;
      var b = e.bulb;
      if (!Array.isArray(b.center) || b.center.length < 2) return;
      if ((typeof b.width === 'number' && b.width > 1.2) ||
          (typeof b.height === 'number' && b.height > 1.2)) return;   // pill bulb → skip
      var circleKey = Math.round(b.center[1] - 0.5) + ',' + Math.round(b.center[0] - 0.5);
      // Swap RC → CR so expandLineChain (which expects [col+0.5,row+0.5]) can
      // re-expand compressed straight runs into one cell per grid square. The
      // first wayPoint sits at the bulb's EDGE and the last short of the tip
      // centre; round(p−0.5) still lands both in the right cell.
      var wp = e.arrow.wayPoints;
      if (wp.length < 2) return;
      var keys = expandLineChain(wp.map(function (p) { return [p[1], p[0]]; }));
      if (keys.length < 1) return;
      if (!inGrid(circleKey) || !keys.every(inGrid)) return;
      // An arm starting inside its bulb cell is a complete bulb→head path; one
      // starting elsewhere is a BRANCH head for resolveArrowArms to attach.
      out.push({ bulb: circleKey, cells: keys });
    });
    return out;
  }

  // Fallback for ARROWS DRAWN AS GENERIC COSMETICS (cp.arrowSums empty even
  // though the puzzle visibly has one — e.g. test puzzle pbwqsppuho). Read
  // what's rendered: the shaft is a `marker-end` #arrows path (the exact
  // attribute the thermo detector EXCLUDES, so the two stay disjoint) whose
  // START point is inside the grid at the edge of a near-full-cell circular
  // rect in #overlay or #underlay (the circle — any fill: cosmetic bulbs are
  // hollow white, tinted, anything). Requiring the in-grid bulb-edge start is
  // what rejects little-killer shafts (they start OUTSIDE the grid) and plain
  // decorative arrows; the cell-centred bulb test rejects quadruple circles
  // (corner-centred). A differently-rendered arrow simply isn't detected —
  // safe under-detection, same policy as the thermo/little-killer detectors.
  function getArrowsFromDOM() {
    var svg = document.getElementById('svgrenderer');
    var cs = getGridCellSize();
    if (!svg || !cs) return [];
    var N = detectGridSize();
    function inGrid(col, row) { return col >= 0 && col < N && row >= 0 && row < N; }

    var bulbs = [];
    document.querySelectorAll('#overlay rect, #underlay rect').forEach(function (r) {
      var w = parseFloat(r.getAttribute('width') || 0), h = parseFloat(r.getAttribute('height') || 0);
      var rx = parseFloat(r.getAttribute('rx') || 0);
      if (w < cs * 0.55 || w > cs * 1.05 || Math.abs(w - h) > cs * 0.1) return;   // near-full-cell only
      if (Math.abs(rx - w / 2) > w * 0.15) return;                                // must be circular
      var cx = parseFloat(r.getAttribute('x') || 0) + w / 2;
      var cy = parseFloat(r.getAttribute('y') || 0) + h / 2;
      var col = Math.round(cx / cs - 0.5), row = Math.round(cy / cs - 0.5);
      if (!inGrid(col, row)) return;
      if (Math.abs(cx - (col + 0.5) * cs) > cs * 0.2 ||
          Math.abs(cy - (row + 0.5) * cs) > cs * 0.2) return;   // centred on a cell (not a quadruple)
      bulbs.push({ cx: cx, cy: cy, r: w / 2, key: col + ',' + row });
    });
    if (bulbs.length === 0) return [];

    var arrowsLayer = document.getElementById('arrows');
    if (!arrowsLayer) return [];
    var out = [];
    arrowsLayer.querySelectorAll('path').forEach(function (p) {
      if (!p.getAttribute('marker-end')) return;                   // shafts carry the arrowhead marker
      var nums = (p.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?/g);
      if (!nums || nums.length < 4) return;
      var raw = [];
      for (var i = 0; i + 1 < nums.length; i += 2) raw.push([+nums[i], +nums[i + 1]]);
      if (raw[0][0] < 0 || raw[0][1] < 0 || raw[0][0] > N * cs || raw[0][1] > N * cs) return;   // start in grid
      var bulb = null;
      bulbs.forEach(function (b) {
        // an arm attached to the circle starts at the bulb's EDGE, ~one radius
        // from its centre; a BRANCH head starts at a stem cell's CENTRE instead
        // and is kept bulb-less for resolveArrowArms to attach.
        if (Math.hypot(b.cx - raw[0][0], b.cy - raw[0][1]) < b.r + cs * 0.2) bulb = b;
      });
      // Re-expand compressed straight runs into one point per grid cell (same
      // as the thermo DOM reader — collinear points are stripped from the d).
      var pts = [raw[0]];
      for (var j = 1; j < raw.length; j++) {
        var x1 = raw[j - 1][0], y1 = raw[j - 1][1], x2 = raw[j][0], y2 = raw[j][1];
        var steps = Math.round(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / cs);
        for (var s = 1; s <= steps; s++) pts.push([x1 + (x2 - x1) * s / steps, y1 + (y2 - y1) * s / steps]);
      }
      var keys = [], ok = true;
      pts.forEach(function (pt) {
        var col = Math.round(pt[0] / cs - 0.5), row = Math.round(pt[1] / cs - 0.5);
        if (!inGrid(col, row)) { ok = false; return; }
        var k = col + ',' + row;
        if (keys[keys.length - 1] !== k) keys.push(k);
      });
      if (!ok || keys.length < 1) return;
      out.push({ bulb: bulb ? bulb.key : null, cells: keys });
    });
    return out;
  }

  // Sum arrows as per-head units, model source preferred, DOM fallback for
  // cosmetic-only ones; either source's raw arms go through resolveArrowArms
  // (multi-head branch merging).
  function getSumArrows() {
    var units = resolveArrowArms(getArrowsFromModel());
    if (units.length === 0) units = resolveArrowArms(getArrowsFromDOM());
    return units;
  }

  // Compute centre-candidate removals forced by the sum arrows, iterated to a
  // fixpoint (a removal on one arrow can invalidate another's support — arrows
  // may share cells, and a circle is often another arrow's shaft cell). Pure
  // w.r.t. the board — works on copies of the candidate sets and returns the
  // removal list.
  function computeArrowRemovals(unitFilter) {
    var st = readValidatorBoardState();
    if (!st) return { unsupported: true };
    var arrows = getSumArrows();
    if (unitFilter) arrows = arrows.filter(function (a) { return unitFilter([a.circle].concat(a.shaft)); });
    if (arrows.length === 0) return { noArrows: true };

    var N = detectGridSize();
    var bd = regularBoxDims(N);
    var cageSets = getUniqueCageCellSets();
    function boxId(key) { var p = key.split(','); return Math.floor(p[1] / bd.h) + ',' + Math.floor(p[0] / bd.w); }
    function shareCage(a, b) { for (var i = 0; i < cageSets.length; i++) if (cageSets[i].has(a) && cageSets[i].has(b)) return true; return false; }
    function conflict(a, b) {
      var ap = a.split(','), bp = b.split(',');
      if (ap[0] === bp[0] || ap[1] === bp[1]) return true;          // same column / same row
      return boxId(a) === boxId(b) || shareCage(a, b);
    }

    // Per-arrow cell list (circle at index 0) + conflict matrix (which cell
    // pairs must differ). Unlike the little killer, arrow cells CAN share a
    // row or column, so those checks join box/cage here.
    var units = arrows.map(function (a) {
      var keys = [a.circle].concat(a.shaft);
      var conf = keys.map(function (_, i) { return keys.map(function (__, j) { return i !== j && keys[i] !== keys[j] && conflict(keys[i], keys[j]); }); });
      return { keys: keys, conf: conf };
    });

    // Working copies of the player's centre marks (the only cells we may modify).
    var work = {};
    Object.keys(st.centre).forEach(function (k) { work[k] = new Set(st.centre[k]); });
    function cellSet(key) {
      if (st.values[key] != null) return new Set([st.values[key]]);
      if (work[key]) return work[key];
      return st.fullSet;                                // empty cell → unconstrained, never modified
    }

    // Which (cell-index, digit) pairs the arrow can still place: for each circle
    // candidate v, enumerate every shaft assignment summing to v with all
    // conflicting pairs distinct (each cell drawing from its CURRENT candidate
    // set) and union the digits used per cell — the circle included, so v itself
    // is supported only when a complete legal fill exists. Backtracking with
    // exact-sum suffix-bound + conflict pruning; the node cap is shared across
    // all of the arrow's circle candidates, and if hit we bail (no removals
    // from this arrow this pass — never over-remove).
    function computeSupported(unit) {
      var keys = unit.keys, n = keys.length, conf = unit.conf;
      var sets = keys.map(function (k) { return Array.from(cellSet(k)).sort(function (a, b) { return a - b; }); });
      if (sets.some(function (s) { return s.length === 0; })) return { supported: null, bailed: false, empty: true };
      var sufMin = new Array(n + 1).fill(0), sufMax = new Array(n + 1).fill(0);
      for (var i = n - 1; i >= 1; i--) {
        sufMin[i] = sufMin[i + 1] + sets[i][0];
        sufMax[i] = sufMax[i + 1] + sets[i][sets[i].length - 1];
      }
      var supported = keys.map(function () { return new Set(); });
      var assign = new Array(n), nodes = 0, CAP = 300000, bailed = false;
      function dfs(idx, sum, target) {
        if (bailed) return;
        if (nodes++ > CAP) { bailed = true; return; }
        if (idx === n) { if (sum === target) for (var k = 0; k < n; k++) supported[k].add(assign[k]); return; }
        if (sum + sufMin[idx] > target || sum + sufMax[idx] < target) return;
        var opts = sets[idx];
        for (var oi = 0; oi < opts.length; oi++) {
          var d = opts[oi];
          if (sum + d + sufMin[idx + 1] > target) break;          // sorted asc → larger d only worse
          var ok = true;
          for (var j = 0; j < idx; j++) if (conf[idx][j] && assign[j] === d) { ok = false; break; }
          if (!ok) continue;
          assign[idx] = d;
          dfs(idx + 1, sum + d, target);
          if (bailed) return;
        }
      }
      for (var vi = 0; vi < sets[0].length && !bailed; vi++) {
        assign[0] = sets[0][vi];
        dfs(1, 0, sets[0][vi]);
      }
      return { supported: supported, bailed: bailed, empty: false };
    }

    var removals = [], seen = {}, changed = true, guard = 0;
    while (changed && guard++ < 1000) {
      changed = false;
      units.forEach(function (unit) {
        var res = computeSupported(unit);
        if (res.bailed || res.empty || !res.supported) return;    // give up safely on this arrow
        unit.keys.forEach(function (C, i) {
          if (st.values[C] != null || !work[C]) return;           // only cells with player marks
          Array.from(work[C]).forEach(function (d) {              // snapshot: set mutates in loop
            if (!res.supported[i].has(d)) {
              work[C].delete(d);
              var k = C + '/' + d;
              if (!seen[k]) { seen[k] = 1; removals.push({ cellKey: C, digit: String(d) }); }
              changed = true;
            }
          });
        });
      });
    }

    var emptied = 0;
    Object.keys(st.centre).forEach(function (k) { if (work[k] && work[k].size === 0) emptied++; });

    return { removals: removals, arrowCount: units.length, emptiedCells: emptied };
  }

  // Worker: remove a specific list of centre candidates via SudokuPad's own
  // candidates op (one undo group). Mirrors _removeInvalidPencilmarksInternal but
  // takes an explicit [{cellKey,digit}] list instead of scanning .conflict marks.
  // Groups by digit so each digit is one api-select + one toggle (every selected
  // cell already HAS the digit, so the toggle only removes). Verifies the net diff
  // and rolls its group back on any unexpected change. Returns
  // { removed, aborted, rollbackOk, elapsedMs }.
  async function _removeCandidatesInternal(removals) {
    var start = performance.now();
    var app = await Framework.getApp();
    var cellByKey = {};
    app.puzzle.cells.forEach(function (c) { cellByKey[c.col + ',' + c.row] = c; });
    var originalSelection = Array.from(app.puzzle.selectedCells || []);
    var preSnap = snapshotPencilmarks();

    var byDigit = new Map();
    removals.forEach(function (r) {
      if (!byDigit.has(r.digit)) byDigit.set(r.digit, []);
      byDigit.get(r.digit).push(r.cellKey);
    });

    try {
      app.act({ type: 'groupstart' });
      var iter = byDigit.entries(), step;
      while (!(step = iter.next()).done) {
        var digit = step.value[0];
        var cells = step.value[1].map(function (k) { return cellByKey[k]; }).filter(Boolean);
        if (cells.length === 0) continue;
        app.deselect();
        app.select(cells);
        app.act({ type: 'candidates', arg: digit });
        await sleep(20);
      }
      app.act({ type: 'groupend' });
      await sleep(20);

      // Verify: the only legitimate change is removing exactly the listed centre marks.
      var diff = diffSnapshots(preSnap, snapshotPencilmarks());
      var expected = new Set(removals.map(function (r) { return r.cellKey + ',' + r.digit; }));
      var badRemoved = diff.removed.centre.filter(function (k) { return !expected.has(k); }).length;
      var unexpected = diff.added.centre.length + diff.added.corner.length +
                       diff.added.values.length + diff.added.colors.length +
                       diff.removed.corner.length + diff.removed.values.length +
                       diff.removed.colors.length + badRemoved;
      if (unexpected > 0) {
        console.error('[spDR-fix] VALIDATE unexpected diff', diff);
        var undoBtn = getModeButton('undo');
        var rollbackOk = false;
        if (undoBtn) {
          dispatchClickEl(undoBtn);
          for (var att = 0; att < 8; att++) {
            await sleep(25);
            if (diffEmpty(diffSnapshots(preSnap, snapshotPencilmarks()))) { rollbackOk = true; break; }
          }
        }
        return { removed: 0, aborted: true, rollbackOk: rollbackOk, elapsedMs: performance.now() - start };
      }
      return { removed: diff.removed.centre.length, aborted: false, elapsedMs: performance.now() - start };
    } finally {
      app.deselect();
      if (originalSelection.length > 0) app.select(originalSelection);
    }
  }

  // The validators wired into the button. Each is independent (own board read, own
  // removal list) so a future Settings panel can toggle them individually — to add
  // one, append an entry here. Contract per entry:
  //   enabled()          — reads its settings flag (default on)
  //   detect()           — CHEAP "does this puzzle contain any of these clues?"
  //                        (menu only lists detected validators; re-run per menu open
  //                        so late model loads / SPA navigation stay correct)
  //   compute(unitFilter)— returns { removals, emptiedCells, <unitCount>, unsupported?,
  //                        <none>? }. unitFilter (nullable) is fn(cellKeys[])→bool;
  //                        the compute must DROP any clue/unit whose full cell list
  //                        fails it BEFORE validating ("Validate selection only":
  //                        a partially-selected clue is skipped, never half-checked).
  function constraintValidators() {
    return [
      { name: 'Kropki', unitNoun: 'dot',  menuLabel: 'Kropki dots', enabled: function () { return settings.validateKropkiEnabled !== false; },
        detect: function () { return collectKropkiDots().length > 0; },
        compute: computeKropkiRemovals, countKey: 'dotCount',  noneKey: 'noDots'  },
      { name: 'cage',   unitNoun: 'cage', menuLabel: 'Cages', enabled: function () { return settings.validateCagesEnabled  !== false; },
        detect: function () { return getKillerCages().length > 0; },
        compute: computeCageRemovals,   countKey: 'cageCount', noneKey: 'noCages' },
      { name: 'little killer', unitNoun: 'little killer', menuLabel: 'Little killers', enabled: function () { return settings.validateLittleKillerEnabled !== false; },
        detect: function () { return getLittleKillers().length > 0; },
        compute: computeLittleKillerRemovals, countKey: 'lkCount', noneKey: 'noLittleKillers' },
      { name: 'thermo', unitNoun: 'thermometer', menuLabel: 'Thermometers', enabled: function () { return settings.validateThermoEnabled !== false; },
        // bulbless-only puzzles still list the item: clicking it explains WHY
        // nothing can be checked (the bulbless note) instead of hiding the row.
        detect: function () { var d = getThermoDetection(); return d.trees.length > 0 || d.bulbless > 0; },
        compute: computeThermoRemovals, countKey: 'thermoCount', noneKey: 'noThermos' },
      { name: 'German whisper', unitNoun: 'German whisper line', menuLabel: 'German whisper lines', enabled: function () { return settings.validateWhisperEnabled !== false; },
        detect: whisperDetected, ambiguous: whisperIsAmbiguous, compute: computeWhisperRemovals, countKey: 'whisperCount', noneKey: 'noWhispers' },
      { name: 'XV', unitNoun: 'XV clue', menuLabel: 'XV clues', enabled: function () { return settings.validateXVEnabled !== false; },
        detect: function () { return collectXVDots().length > 0; },
        compute: computeXVRemovals, countKey: 'xvCount', noneKey: 'noXV' },
      { name: 'sum arrow', unitNoun: 'arrow', menuLabel: 'Sum arrows', enabled: function () { return settings.validateArrowEnabled !== false; },
        detect: function () { return getSumArrows().length > 0; },
        compute: computeArrowRemovals, countKey: 'arrowCount', noneKey: 'noArrows' },
      { name: 'renban', unitNoun: 'renban line', menuLabel: 'Renban lines', enabled: function () { return settings.validateRenbanEnabled !== false; },
        detect: renbanDetected, ambiguous: renbanIsAmbiguous, compute: computeRenbanRemovals, countKey: 'renbanCount', noneKey: 'noRenban' },
      { name: 'region sum', unitNoun: 'region-sum line', menuLabel: 'Region sum lines', enabled: function () { return settings.validateRegionSumEnabled !== false; },
        detect: regionSumDetected, ambiguous: regionSumIsAmbiguous, compute: computeRegionSumRemovals, countKey: 'regionSumCount', noneKey: 'noRegionSum' },
      { name: 'parity', unitNoun: 'parity line', menuLabel: 'Parity lines', enabled: function () { return settings.validateParityEnabled !== false; },
        detect: parityDetected, ambiguous: parityIsAmbiguous, compute: computeParityRemovals, countKey: 'parityCount', noneKey: 'noParity' },
      { name: 'zipper', unitNoun: 'zipper line', menuLabel: 'Zipper lines', enabled: function () { return settings.validateZipperEnabled !== false; },
        detect: zipperDetected, ambiguous: zipperIsAmbiguous, compute: computeZipperRemovals, countKey: 'zipperCount', noneKey: 'noZipper' },
      { name: 'entropic', unitNoun: 'entropic line', menuLabel: 'Entropic lines', enabled: function () { return settings.validateEntropicEnabled !== false; },
        detect: entropicDetected, ambiguous: entropicIsAmbiguous, compute: computeEntropicRemovals, countKey: 'entropicCount', noneKey: 'noEntropic' },
    ];
  }
  function detectedValidators() {
    return constraintValidators().filter(function (v) {
      if (!v.enabled()) return false;
      try { return v.detect(); } catch (e) { return false; }
    });
  }

  // ── "Validate Constraints" button: menu + runners ─────────────────────────
  // The button TOGGLES a popup menu (toggleValidateMenu) that stays open across
  // runs — only the button (or a window resize) closes it. The menu lists one
  // item per validator DETECTED in the current puzzle (detect(), re-checked each
  // open), plus two mode checkboxes at the bottom:
  //   • "Run all until stable" — clicking ANY validator item runs every detected
  //     validator in sequence, repeating the whole cycle until a full pass removes
  //     nothing — a cross-constraint fixpoint (e.g. a cage removal that unlocks a
  //     further Kropki removal). Off → the click runs just that one validator.
  //   • "Validate selection only" (session-only) — validators only consider clues
  //     whose ENTIRE cell list is inside the current selection; a partially-
  //     selected clue is skipped outright (never half-checked).
  // Nothing runs concurrently: each validator is its own compute → apply (its own
  // undo group), guarded by the shared actionInProgress lock.

  function pluralUnit(unitNoun, n) { return unitNoun + (n === 1 ? '' : 's'); }

  // Resolve the "Validate selection only" mode into a unit filter at click time.
  // Returns { ok:true, filter:null } when the mode is off, { ok:true, filter:fn }
  // when on with a selection (fn(cellKeys[]) → true iff EVERY cell of the unit is
  // selected), or { ok:false } (after toasting) when on with nothing selected.
  function selectionUnitFilter() {
    if (settings.validateSelectionOnly !== true) return { ok: true, filter: null };
    var sel = getSelectedCells();
    if (sel.size === 0) {
      showRemoveInvalidToast('"Validate selection only" is on, but no cells are selected. Select the cells that fully cover the clues to check, then try again.', 'warning');
      return { ok: false };
    }
    return { ok: true, filter: function (keys) {
      return keys.every(function (k) { return sel.has(k); });
    } };
  }
  function noneFoundMsg(nouns, filtered) {
    if (!filtered) return 'No ' + nouns + ' found in this puzzle.';
    var conds = [];
    if (settings.validateSelectionOnly === true) conds.push('selected');
    if (getFogTester()) conds.push('revealed (not under fog)');
    var need = conds.length ? conds.join(' and ') : 'eligible';
    return 'No ' + nouns + ' to validate — a clue is only checked when all of its cells are ' + need + '.';
  }

  // FOG GATE (applies to every validator). Returns a predicate
  // isFogged("col,row") → true iff that cell is CURRENTLY under fog (not yet
  // revealed), or null when the puzzle has no active fog. Validators must never
  // act on a clue any of whose cells is fogged — doing so would remove
  // candidates for a clue the solver can't see yet and spoil the fog.
  //
  // Source of truth is the RENDERED fog, hit-tested with SVGGeometryElement
  // .isPointInFill against #fog-path's path. That path is the fogged region as a
  // single fill whose fill-rule holes are exactly the revealed cells, so the
  // hit-test reports live reveal state correctly (a naive per-subpath rect scan
  // does NOT — the holes make it over-count). Coordinates are the svgrenderer
  // user space (same as the DOM thermo/bulb scan), cell = getGridCellSize().
  function getFogTester() {
    var g = document.getElementById('fog-path');
    var path = g ? g.querySelector('path') : null;
    if (!path || !(path.getAttribute('d') || '').trim()) return null;
    if (typeof path.isPointInFill !== 'function') return null;
    var svg = path.ownerSVGElement || document.getElementById('svgrenderer');
    var cs = getGridCellSize();
    if (!svg || !cs) return null;
    var cache = {};
    return function (key) {
      if (key in cache) return cache[key];
      var parts = key.split(','), col = +parts[0], row = +parts[1];
      var pt = svg.createSVGPoint(); pt.x = (col + 0.5) * cs; pt.y = (row + 0.5) * cs;
      var fogged;
      try { fogged = path.isPointInFill(pt); } catch (e) { fogged = false; }
      cache[key] = fogged;
      return fogged;
    };
  }

  // AND the always-on fog gate into a (possibly null) selection filter: a unit is
  // eligible only when it's inside the selection (if that mode is on) AND none of
  // its cells are under fog. Returns selFilter unchanged when the puzzle has no
  // active fog.
  function combineFogFilter(selFilter) {
    var isFogged = getFogTester();
    if (!isFogged) return selFilter;
    var fogFilter = function (keys) { return keys.every(function (k) { return !isFogged(k); }); };
    if (!selFilter) return fogFilter;
    return function (keys) { return selFilter(keys) && fogFilter(keys); };
  }

  // Cell keys ("col,row") currently holding centre marks (value cells excluded).
  // Diffed before/after a run to count how many marked cells were EMPTIED —
  // accurate across a multi-pass run-all (summing per-pass counts double-counts).
  function markedCellKeys() {
    var st = readValidatorBoardState();
    return st ? new Set(Object.keys(st.centre)) : new Set();
  }
  function countEmptiedSince(beforeSet) {
    var st = readValidatorBoardState();
    if (!st) return 0;
    var n = 0;
    beforeSet.forEach(function (k) { if (st.values[k] == null && !st.centre[k]) n++; });
    return n;
  }
  // Error text shown when a validator run leaves any cell with NO candidates: the
  // clue has no valid combination given the current marks. This REPLACES the old
  // green/■yellow "all clear" — a validator whose job is to check a constraint must
  // report failure, not success, when the marks can't satisfy it. Shared by every
  // validator (single + run-all) so the signal is uniform for current AND future
  // ones: a validator removes only unsupported candidates, so an emptied cell always
  // means "no combination supports this cell" = a contradiction the player must see.
  function noValidComboMsg(checked, removed, emptied) {
    return '⛔ No valid combination found — checked ' + checked + ' and removed ' +
           removed + ' candidate' + (removed === 1 ? '' : 's') + ', but ' + emptied +
           ' cell' + (emptied === 1 ? '' : 's') + ' now ha' + (emptied === 1 ? 's' : 've') +
           ' NO candidates left. The constraint can\'t be satisfied by the current ' +
           'pencilmarks — there\'s a mistake (or the marks are incomplete). Use the Undo ' +
           'button (or Ctrl+Z) to restore them.';
  }
  function validateAbortToast(reverted) {
    if (reverted) showRemoveInvalidToast('Stopped — an unexpected change occurred while validating. All changes were reverted: the puzzle is back to exactly how it was before you pressed the button.', 'warning');
    else showRemoveInvalidToast('CRITICAL — an unexpected change occurred while validating and it could NOT be fully reverted. Press Ctrl+Z until the puzzle looks right.', 'error');
  }

  // ── Validator post-run Undo button ─────────────────────────────────────────
  // Mirrors the Auto-fill Undo: after a validator run REMOVES candidates, a small
  // "Undo" button appears just LEFT of the Validate Constraints button. It is
  // offered only while the live board still equals the snapshot taken right after
  // the run — so any edit hides it, and native-undoing back to that state brings it
  // back (a MutationObserver on the cell layers drives this). Clicking it re-clicks
  // the NATIVE undo `steps` times (steps = number of removal groups the run made —
  // one per validator-apply, each its own groupstart/groupend). While the button is
  // visible those groups sit on top of the undo stack, so this rewinds exactly this
  // run and nothing else, leaving the puzzle's own undo/redo history intact.
  var validatorUndo = { steps: 0, preSnapshot: null, postSnapshot: null, undoing: false, observer: null };

  function validatorUndoAvailable() {
    if (!validatorUndo.postSnapshot || !validatorUndo.steps) return false;
    return diffEmpty(diffSnapshots(validatorUndo.postSnapshot, snapshotPencilmarks()));
  }
  function validatorPositionUndoButton() {
    var vb = document.getElementById('sp-validate-btn');
    var ub = document.getElementById('sp-validate-undo-btn');
    if (!vb || !ub) return;
    ub.style.bottom = vb.style.bottom || '120px';
    ub.style.right  = (12 + vb.offsetWidth + 8) + 'px';   // just left of the Validate button
  }
  function validatorRefreshUndoButton() {
    var ub = document.getElementById('sp-validate-undo-btn');
    if (!ub) return;
    var show = !validatorUndo.undoing && settings.showValidateButton !== false && validatorUndoAvailable();
    ub.style.display = show ? 'flex' : 'none';
    if (show) validatorPositionUndoButton();
  }
  function validatorStartUndoObserver() {
    if (validatorUndo.observer) return;
    var targets = ['#cell-values', '#cell-candidates', '#cell-pencilmarks']
      .map(function (s) { return document.querySelector(s); }).filter(Boolean);
    if (!targets.length) return;
    validatorUndo.observer = new MutationObserver(function () {
      if (validatorUndo.undoing) return;   // ignore our own undo-driven mutations
      validatorRefreshUndoButton();        // "Undo" iff the board still matches the post-run snapshot
    });
    targets.forEach(function (t) { validatorUndo.observer.observe(t, { childList: true, subtree: true, characterData: true }); });
  }
  function validatorStopUndoObserver() {
    if (validatorUndo.observer) { validatorUndo.observer.disconnect(); validatorUndo.observer = null; }
  }
  // Arm the post-run Undo: remember how many native-undo steps rewind the run, the
  // pre-run snapshot (stop sentinel) and the post-run snapshot (visibility gate).
  function validatorArmUndo(steps, preSnap) {
    validatorUndo.steps = steps;
    validatorUndo.preSnapshot = preSnap;
    validatorUndo.postSnapshot = snapshotPencilmarks();
    validatorStartUndoObserver();
    validatorRefreshUndoButton();
  }
  function validatorDisarmUndo() {
    validatorUndo.steps = 0;
    validatorUndo.preSnapshot = null;
    validatorUndo.postSnapshot = null;
    validatorStopUndoObserver();
    validatorRefreshUndoButton();
  }
  async function validatorDoUndo() {
    if (actionInProgress || validatorUndo.undoing || !validatorUndoAvailable()) return;
    actionInProgress = true;
    validatorUndo.undoing = true;
    validatorRefreshUndoButton();   // hide while we rewind
    try {
      var undoBtn = getModeButton('undo');
      var pre = validatorUndo.preSnapshot;
      for (var i = 0; i < validatorUndo.steps; i++) {
        if (undoBtn) dispatchClickEl(undoBtn);
        else { var app = await Framework.getApp(); app.act({ type: 'undo' }); }
        await sleep(fsUndoDelay());
        if (pre && diffEmpty(diffSnapshots(pre, snapshotPencilmarks()))) break;   // reached pre-run state
      }
    } finally {
      validatorUndo.undoing = false;
      actionInProgress = false;
      validatorDisarmUndo();
    }
  }

  // Apply ONE validator against the CURRENT board (compute → apply its removals
  // via the shared paste-path worker). Reads the live DOM, so each call sees prior
  // removals (this is what lets run-all cross-feed). No lock toggle, no toast —
  // callers own those. unitFilter (nullable) is forwarded to compute. Resolves to
  // { unsupported } | { present:false } |
  // { present:true, removed, count, aborted?, reverted? }.
  async function applyOneValidator(def, unitFilter) {
    var comp = def.compute(unitFilter);
    if (comp.unsupported) return { unsupported: true };
    // comp.note = an informational sentence for the result toast (e.g. the
    // thermo validator's "N bulbless lines were not checked") — carried on
    // every outcome so a skipped clue is never silent.
    var note = comp.note || null;
    if (comp[def.noneKey]) return { present: false, removed: 0, needSelection: !!comp.needSelection, note: note };
    var count = comp[def.countKey] || 0;
    var removals = comp.removals || [];
    if (removals.length === 0) return { present: true, removed: 0, count: count, note: note };
    var preSnap = snapshotPencilmarks();
    var r = await _removeCandidatesInternal(removals);
    if (r.aborted) {
      var reverted = await revertToSnapshot(preSnap, 12);
      return { present: true, removed: 0, count: count, aborted: true, reverted: reverted, note: note };
    }
    return { present: true, removed: r.removed, count: count, note: note };
  }

  // Run a single validator (a menu pick): lock, compute+apply once, toast.
  function runSingleValidator(def, unitFilter) {
    if (actionInProgress) return;
    actionInProgress = true;
    var before = markedCellKeys();
    var preSnap = snapshotPencilmarks();
    var t0 = performance.now();
    applyOneValidator(def, unitFilter).then(function (res) {
      function withNote(msg) { return res.note ? msg + ' ' + res.note : msg; }
      if (res.unsupported) { showRemoveInvalidToast('Constraint validation needs a numeric digit set (0–9). Set it in Settings → Action buttons and try again.', 'warning'); return; }
      if (!res.present) {
        if (res.needSelection) { showRemoveInvalidToast('The ' + def.unitNoun + '(s) couldn\'t be identified automatically. Select the cells of the line(s) you want to check, then click "' + (def.menuLabel || def.name) + '" again — only your selected cells will be changed (the rest of the line is still read for context).', 'warning'); return; }
        // A note explains WHY nothing was checkable (e.g. bulbless thermos) —
        // that deserves the player's attention, so it warns instead of green.
        showRemoveInvalidToast(withNote(noneFoundMsg(pluralUnit(def.unitNoun, 0), !!unitFilter)), res.note ? 'warning' : 'success'); return;
      }
      if (res.aborted) { validateAbortToast(res.reverted); return; }
      // A removal made changes → offer a post-run Undo (one native-undo group).
      if (res.removed > 0) validatorArmUndo(1, preSnap);
      var checked = res.count + ' ' + pluralUnit(def.unitNoun, res.count);
      if (res.removed === 0) { showRemoveInvalidToast(withNote('Checked ' + checked + ' — no invalid candidates to remove.'), 'success'); return; }
      var emptied = countEmptiedSince(before);
      if (emptied > 0) { showRemoveInvalidToast(noValidComboMsg(checked, res.removed, emptied), 'error'); return; }
      var msg = 'Removed ' + res.removed + ' invalid candidate' + (res.removed === 1 ? '' : 's') +
                ' across ' + checked + ' in ' + formatDuration(performance.now() - t0) + '.';
      showRemoveInvalidToast(withNote(msg), 'success');
    }).finally(function () { actionInProgress = false; });
  }

  // Run every DETECTED validator in sequence, repeating the whole cycle until a
  // full pass removes nothing (cross-constraint fixpoint). One combined toast.
  // unitFilter (nullable) is applied on every pass, so e.g. a fully-selected cage
  // and a fully-selected Kropki dot re-feed each other while a half-selected clue
  // stays out of the loop entirely.
  function runAllValidators(unitFilter) {
    if (actionInProgress) return;
    var defs = detectedValidators();
    if (defs.length === 0) { showRemoveInvalidToast('No supported constraints were detected in this puzzle.', 'warning'); return; }
    actionInProgress = true;
    var before = markedCellKeys();
    var preSnap = snapshotPencilmarks();
    var t0 = performance.now();
    (async function () {
      var totalRemoved = 0, undoSteps = 0, passes = 0, present = {}, unsupported = false, aborted = false, reverted = true;
      var notes = {};   // informational notes (e.g. bulbless thermos), deduped across passes
      var changed = true, guard = 0;
      while (changed && guard++ < 50) {
        changed = false;
        for (var i = 0; i < defs.length; i++) {
          var res = await applyOneValidator(defs[i], unitFilter);
          if (res.note) notes[res.note] = 1;
          if (res.unsupported) { unsupported = true; break; }
          if (res.aborted) { aborted = true; reverted = res.reverted; break; }
          if (res.present) present[defs[i].name] = { count: res.count, unitNoun: defs[i].unitNoun };
          if (res.removed > 0) { totalRemoved += res.removed; undoSteps++; changed = true; }   // each apply = 1 undo group
        }
        passes++;
        if (unsupported || aborted) break;
      }
      return { totalRemoved: totalRemoved, undoSteps: undoSteps, passes: passes, present: present, unsupported: unsupported, aborted: aborted, reverted: reverted, notes: Object.keys(notes) };
    })().then(function (s) {
      function withNotes(msg) { return s.notes.length ? msg + ' ' + s.notes.join(' ') : msg; }
      if (s.unsupported) { showRemoveInvalidToast('Constraint validation needs a numeric digit set (0–9). Set it in Settings → Action buttons and try again.', 'warning'); return; }
      if (s.aborted) { validateAbortToast(s.reverted); return; }
      if (s.totalRemoved > 0) validatorArmUndo(s.undoSteps, preSnap);
      var names = Object.keys(s.present);
      if (names.length === 0) {
        var nouns = defs.map(function (v) { return pluralUnit(v.unitNoun, 0); }).join(' or ');
        showRemoveInvalidToast(withNotes(noneFoundMsg(nouns, !!unitFilter)), s.notes.length ? 'warning' : 'success');
        return;
      }
      var checked = names.map(function (nm) { var p = s.present[nm]; return p.count + ' ' + pluralUnit(p.unitNoun, p.count); }).join(' and ');
      if (s.totalRemoved === 0) { showRemoveInvalidToast(withNotes('Checked ' + checked + ' — no invalid candidates to remove.'), 'success'); return; }
      var emptied = countEmptiedSince(before);
      if (emptied > 0) { showRemoveInvalidToast(noValidComboMsg(checked, s.totalRemoved, emptied), 'error'); return; }
      var msg = 'Removed ' + s.totalRemoved + ' invalid candidate' + (s.totalRemoved === 1 ? '' : 's') +
                ' across ' + checked + ' in ' + formatDuration(performance.now() - t0) +
                ' (' + s.passes + ' pass' + (s.passes === 1 ? '' : 'es') + ').';
      showRemoveInvalidToast(withNotes(msg), 'success');
    }).finally(function () { actionInProgress = false; });
  }

  // ── Validate popup menu ───────────────────────────────────────────────────
  // The menu is a TOGGLE: it stays open across validator runs and selection
  // changes (so "Validate selection only" workflows don't fight it); only the
  // button (or a window resize) closes it. Clicks inside it never reach SudokuPad
  // (isInOurUI blocks mousedown/up), so opening it or picking an item never
  // clears the player's cell selection.
  function closeValidateMenu() {
    var m = document.getElementById('sp-validate-menu');
    if (m) m.remove();
    window.removeEventListener('resize', closeValidateMenu);
  }
  function toggleValidateMenu() {
    if (document.getElementById('sp-validate-menu')) closeValidateMenu();
    else openValidateMenu();
  }
  // Re-render in place so a toggle inside the menu (selection-only) updates what it
  // greys out immediately, instead of only on the next open.
  function rebuildValidateMenu() {
    if (!document.getElementById('sp-validate-menu')) return;
    closeValidateMenu();
    openValidateMenu();
  }
  // A validator item was clicked: resolve the selection filter (may toast + bail),
  // AND in the always-on fog gate (skips any clue with a cell still under fog),
  // then run just that validator. (The "Run all above functions" button runs every
  // detected validator to a cross-constraint fixpoint — see onRunAllClick.) The
  // menu stays open either way.
  function onValidatorItemClick(def) {
    if (actionInProgress) return;
    var sf = selectionUnitFilter();
    if (!sf.ok) return;
    var filter = combineFogFilter(sf.filter);   // fog gate is always on (no-op when no fog)
    runSingleValidator(def, filter);
  }
  // The "Run all above functions" button: same selection + fog resolution as a
  // single item, then the cross-constraint fixpoint over every detected validator.
  function onRunAllClick() {
    if (actionInProgress) return;
    var sf = selectionUnitFilter();
    if (!sf.ok) return;
    var filter = combineFogFilter(sf.filter);
    runAllValidators(filter);
  }
  function openValidateMenu() {
    var btn = document.getElementById('sp-validate-btn');
    if (!btn) return;
    var bs = getComputedStyle(btn);
    var bg = bs.backgroundColor || 'rgb(34, 36, 38)';
    var border = bs.borderColor || 'rgb(62, 68, 70)';
    var text = bs.color || 'rgb(181, 104, 228)';

    var menu = document.createElement('div');
    menu.id = 'sp-validate-menu';
    Object.assign(menu.style, {
      position: 'fixed', zIndex: '901',
      minWidth: Math.max(btn.offsetWidth, 180) + 'px',
      borderRadius: '8px', padding: '4px', boxSizing: 'border-box',
      fontFamily: 'Roboto, Arial, sans-serif',
      boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
    });
    menu.style.setProperty('background-color', bg, 'important');
    menu.style.setProperty('border', '1px solid ' + border, 'important');

    // opts.disabled → greyed out, not clickable, and opts.title explains WHY on
    // hover (the tooltip is the whole point of showing a disabled item instead of
    // hiding it: a missing row tells the player nothing).
    function addItem(label, onClick, opts) {
      opts = opts || {};
      var disabled = opts.disabled === true;
      var it = document.createElement('div');
      it.textContent = label;
      if (opts.title) it.title = opts.title;
      Object.assign(it.style, {
        padding: '8px 12px', borderRadius: '6px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '13px', fontWeight: '600',
        whiteSpace: 'nowrap', userSelect: 'none',
        opacity: disabled ? '0.4' : '1',
      });
      it.style.setProperty('color', text, 'important');
      it.addEventListener('click', function (e) { e.stopPropagation(); if (!disabled) onClick(); });
      if (!disabled) {
        it.addEventListener('mouseenter', function () { it.style.setProperty('background-color', 'rgba(255,255,255,0.10)', 'important'); });
        it.addEventListener('mouseleave', function () { it.style.setProperty('background-color', 'transparent', 'important'); });
      }
      menu.appendChild(it);
    }
    function addNote(msg) {
      var note = document.createElement('div');
      note.textContent = msg;
      Object.assign(note.style, {
        padding: '8px 12px', fontSize: '12px', fontStyle: 'italic',
        whiteSpace: 'normal', maxWidth: '260px', lineHeight: '1.35',
        userSelect: 'none', opacity: '0.65',
      });
      note.style.setProperty('color', text, 'important');
      menu.appendChild(note);
    }
    function addCheckbox(label, key, tip, onChange) {
      var row = document.createElement('label');
      row.title = tip;
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 12px', borderRadius: '6px', cursor: 'pointer',
        fontSize: '13px', fontWeight: '600',
        whiteSpace: 'nowrap', userSelect: 'none',
      });
      row.style.setProperty('color', text, 'important');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = settings[key] === true;
      cb.style.cursor = 'pointer';
      cb.addEventListener('change', function () {
        settings[key] = cb.checked;
        saveSettings(settings);
        if (onChange) onChange();
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(label));
      row.addEventListener('mouseenter', function () { row.style.setProperty('background-color', 'rgba(255,255,255,0.10)', 'important'); });
      row.addEventListener('mouseleave', function () { row.style.setProperty('background-color', 'transparent', 'important'); });
      menu.appendChild(row);
    }
    function addSep() {
      var sep = document.createElement('div');
      Object.assign(sep.style, { height: '1px', margin: '4px 6px' });
      sep.style.setProperty('background-color', border, 'important');
      menu.appendChild(sep);
    }
    // A prominent, filled action button (vs the plain validator items) — used for
    // "Run all above functions".
    function addButton(label, onClick, tip, opts) {
      opts = opts || {};
      var disabled = opts.disabled === true;
      var b = document.createElement('div');
      b.textContent = label;
      b.title = tip || '';
      Object.assign(b.style, {
        padding: '9px 12px', margin: '2px 0', borderRadius: '6px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: '13px', fontWeight: '700', textAlign: 'center',
        whiteSpace: 'nowrap', userSelect: 'none',
        opacity: disabled ? '0.4' : '1',
      });
      b.style.setProperty('color', text, 'important');
      b.style.setProperty('border', '1px solid ' + border, 'important');
      b.style.setProperty('background-color', 'rgba(255,255,255,0.06)', 'important');
      b.addEventListener('click', function (e) { e.stopPropagation(); if (!disabled) onClick(); });
      if (!disabled) {
        b.addEventListener('mouseenter', function () { b.style.setProperty('background-color', 'rgba(255,255,255,0.16)', 'important'); });
        b.addEventListener('mouseleave', function () { b.style.setProperty('background-color', 'rgba(255,255,255,0.06)', 'important'); });
      }
      menu.appendChild(b);
    }
    // The Thermo item, PLUS an inline "Slow" checkbox — auto-checked per
    // puzzle (autoDetectThermoSlow via effectiveThermoSlow), overridable by
    // the player for this puzzle/session (setThermoSlowOverride, never saved).
    // Clicking the checkbox toggles Slow only; clicking the rest of the row
    // runs the validator, same as a plain item.
    function addThermoItem(def) {
      var row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
        fontSize: '13px', fontWeight: '600',
        whiteSpace: 'nowrap', userSelect: 'none',
      });
      row.style.setProperty('color', text, 'important');
      var lbl = document.createElement('span');
      lbl.textContent = def.menuLabel || def.name;
      row.appendChild(lbl);

      var slowLbl = document.createElement('label');
      slowLbl.title = 'Check this if the thermometers in this puzzle are SLOW (digits along the line may repeat — increase or stay the same — instead of strictly increasing). Auto-detected where possible; override here if that guess is wrong.';
      Object.assign(slowLbl.style, { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' });
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = effectiveThermoSlow();
      cb.style.cursor = 'pointer';
      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () { setThermoSlowOverride(cb.checked); });
      slowLbl.appendChild(cb);
      slowLbl.appendChild(document.createTextNode('Slow'));
      row.appendChild(slowLbl);

      row.addEventListener('mouseenter', function () { row.style.setProperty('background-color', 'rgba(255,255,255,0.10)', 'important'); });
      row.addEventListener('mouseleave', function () { row.style.setProperty('background-color', 'transparent', 'important'); });
      row.addEventListener('click', function (e) { e.stopPropagation(); onValidatorItemClick(def); });
      menu.appendChild(row);
    }

    // One item per validator DETECTED in this puzzle (re-checked on every open,
    // so late model loads / SPA puzzle switches are picked up).
    // AMBIGUOUS = the rules cue fired, but WHICH lines carry the clue couldn't be
    // pinned — the colour collides with a rival line type, or the type is the
    // PLAYER's own deduction (`1cwnilmrp0`: "each line is EXACTLY TWO of modular,
    // entropic, or parity"). We never guess. Rather than hide the validator (a
    // missing row explains nothing), it's listed GREYED OUT with a tooltip saying
    // why. Ticking "Validate selection only" hands the choice to the player — they
    // select the line, so the ambiguity is resolved by them — which re-enables every
    // such item. This is the uniform policy for ALL validators, driven off each
    // def's `ambiguous()` (no per-name special-casing).
    var selOnly = settings.validateSelectionOnly === true;
    var detected = detectedValidators();
    if (detected.length === 0) {
      addNote('No supported constraints detected in this puzzle.');
    } else {
      detected.forEach(function (def) {
        if (def.name === 'thermo') { addThermoItem(def); return; }
        var amb = false;
        try { amb = def.ambiguous ? def.ambiguous() : false; } catch (e) { amb = false; }
        var noun = def.unitNoun || def.name;
        var tip = '';
        if (amb && !selOnly)
          tip = 'Disabled — couldn\'t work out which lines are the ' + noun + 's in this puzzle '
              + '(their type isn\'t stated unambiguously). Tick "Validate selection only" below, '
              + 'then select the line\'s cells to run it by hand.';
        else if (amb)
          tip = 'Select the ' + noun + '\'s cells, then click. Only selected cells change.';
        addItem(def.menuLabel || def.name, function () { onValidatorItemClick(def); },
                { disabled: amb && !selOnly, title: tip });
      });
    }
    addSep();
    // Run-all is a WHOLE-PUZZLE fixpoint, so it's mutually exclusive with
    // selection-only: that mode narrows every validator to the player's selection
    // (and re-enables the ambiguous ones, which would then apply every rival line
    // type to the same selected line). With it ticked, run validators one at a time.
    if (detected.length > 0)
      addButton('Run all above functions', onRunAllClick,
        selOnly
          ? 'Disabled while "Validate selection only" is ticked — run the validators one at a time from the list above.'
          : 'Run every validator listed above in a loop until no more candidates can be removed (removals from one constraint feed the others).',
        { disabled: selOnly });
    addCheckbox('Validate selection only', 'validateSelectionOnly',
      'Only validate clues whose every cell is inside the current selection — a partially-selected clue is skipped. Also re-enables any greyed-out validator whose line type couldn\'t be identified, and disables "Run all above functions". Exception: German whisper lines DO run on a partial selection (only the selected cells change; the rest of the line is still read). Resets on page reload.',
      rebuildValidateMenu);

    document.body.appendChild(menu);
    positionValidateMenu(menu, btn);
    window.addEventListener('resize', closeValidateMenu);
  }
  // Align the menu's right edge to the button; open UPWARD when a downward menu
  // would run off the bottom (the button sits near the bottom), else downward.
  // Clamp into view if neither direction fully fits.
  function positionValidateMenu(menu, btn) {
    var br = btn.getBoundingClientRect();
    var mh = menu.offsetHeight, gap = 6, vh = window.innerHeight;
    menu.style.right = (window.innerWidth - br.right) + 'px';
    menu.style.left = 'auto';
    var fitsDown = br.bottom + gap + mh <= vh;
    var fitsUp = br.top - gap - mh >= 0;
    if (!fitsDown && fitsUp) {
      menu.style.bottom = (vh - br.top + gap) + 'px'; menu.style.top = 'auto';
    } else if (fitsDown) {
      menu.style.top = (br.bottom + gap) + 'px'; menu.style.bottom = 'auto';
    } else {
      menu.style.top = Math.max(8, vh - mh - 8) + 'px'; menu.style.bottom = 'auto';
    }
  }

  function buildActionButton(opts) {
    // opts: { id, wrapId, shortLabel, fullLabel, settingsKey, onClick }
    //
    // A static toolbar button matching the native controls-tool buttons. It shows
    // the short label; the full description is the native hover tooltip (title attr).
    //
    //   wrap (div, 100%×100% grid cell) — in-flow grid item, sizes like its neighbours
    //     btn (div, position:absolute, inset by the native margins, btnW×btnH)
    //
    // btn is absolutely positioned so it sits exactly where a native button would
    // (margin inset) without depending on the grid cell's exact computed size.
    var refBtn    = document.querySelector('[data-control="normal"]');
    var refStyle  = refBtn ? getComputedStyle(refBtn) : null;
    var btnW      = (refBtn && refBtn.offsetWidth  > 0) ? refBtn.offsetWidth  : 56;
    var btnH      = (refBtn && refBtn.offsetHeight > 0) ? refBtn.offsetHeight : 56;
    var btnMarginL = refStyle ? (parseFloat(refStyle.marginLeft)  || 0) : 2.4;
    var btnMarginT = refStyle ? (parseFloat(refStyle.marginTop)   || 0) : 2.4;
    // Use a non-selected button for colour properties. [data-control="normal"] is always
    // the selected/highlighted mode on page load, so its backgroundColor is the bright
    // highlight colour rather than the base button colour. pen/corner/centre are never
    // selected at page load and give the correct base colour.
    var colorRefBtn = document.querySelector('[data-control="pen"]') ||
                      document.querySelector('[data-control="corner"]') ||
                      document.querySelector('[data-control="centre"]') ||
                      refBtn;
    var colorRefStyle = colorRefBtn ? getComputedStyle(colorRefBtn) : refStyle;
    var bgColor   = (colorRefStyle && colorRefStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
                      ? colorRefStyle.backgroundColor : 'rgb(34, 36, 38)';
    // Literal theme purple (not a snapshot of colorRefStyle.color): a captured
    // computed colour can load grey if read before the theme settles. A literal
    // + !important is stable.
    var textColor = 'rgb(181, 104, 228)';
    var borderCol = colorRefStyle ? colorRefStyle.borderColor : 'rgb(62, 68, 70)';
    var borderRad = refStyle ? refStyle.borderRadius : '8px';

    // Wrapper: fills the grid cell (100%×100%) so sizing matches neighboring buttons
    var wrap = document.createElement('div');
    wrap.id = opts.wrapId;
    Object.assign(wrap.style, {
      position:   'relative',
      width:      '100%',
      height:     '100%',
      visibility: settings[opts.settingsKey] === false ? 'hidden' : 'visible',
    });

    // The button: absolutely positioned within wrap, inset by the native margins
    // and sized to a native button. Short label centered (white-space:pre renders
    // the "Clear\nAll" newline; flex+textAlign centers each line independently).
    var btn = document.createElement('div');
    btn.id = opts.id;
    Object.assign(btn.style, {
      position:       'absolute',
      left:           btnMarginL + 'px',  // matches margin-left of neighboring toolbar buttons
      top:            btnMarginT + 'px',  // matches margin-top of neighboring toolbar buttons
      width:          btnW + 'px',
      height:         btnH + 'px',
      display:        'flex',
      alignItems:     'center',           // vertical center
      justifyContent: 'center',           // horizontal center
      textAlign:      'center',           // centers each line within the text block
      whiteSpace:     'pre',              // preserves \n in shortLabel
      borderRadius:   borderRad,
      boxSizing:      'border-box',
      fontSize:       '14px',             // ← font size — change to taste
      fontFamily:     'Roboto, Arial, sans-serif',
      fontWeight:     '700',              // ← weight — 700=bold, 800/900=heavier
      lineHeight:     '1.2',
      cursor:         'pointer',
    });
    btn.style.setProperty('background-color', bgColor, 'important');
    btn.style.setProperty('border', '1px solid ' + borderCol, 'important');
    btn.style.setProperty('color', textColor, 'important');
    btn.textContent = opts.shortLabel;
    btn.title = opts.fullLabel;   // native hover tooltip (replaces the old expand-on-hover)

    btn.addEventListener('click', function (e) { e.stopPropagation(); opts.onClick(); });
    spdrFxButton(btn);   // hover-brighten + active-depress + click flash (matches the floating Fill-single button + native buttons)

    wrap.appendChild(btn);
    return wrap;
  }

  // Re-reads the reference button geometry and colour, then applies them to every
  // action button. Called right after DOM insertion (handles the common case where
  // SudokuPad CSS is already applied) and again at 100 ms / 500 ms to cover the race
  // where the CSS loads late.
  function syncActionButtonGeometry() {
    var ref = document.querySelector('[data-control="normal"]');
    if (!ref) return;
    var cs = getComputedStyle(ref);
    var ml = parseFloat(cs.marginLeft) || 0;
    var mt = parseFloat(cs.marginTop)  || 0;
    var bw = ref.offsetWidth  > 0 ? ref.offsetWidth  : 0;
    var bh = ref.offsetHeight > 0 ? ref.offsetHeight : 0;
    // Colour from a non-selected button (pen/corner/centre are never selected at page load).
    var colorRef = document.querySelector('[data-control="pen"]') ||
                   document.querySelector('[data-control="corner"]') ||
                   document.querySelector('[data-control="centre"]') || ref;
    var colorCs = getComputedStyle(colorRef);
    var bg = colorCs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? colorCs.backgroundColor : null;
    // Text colour is a fixed literal (set in buildActionButton) — we deliberately
    // do NOT re-read/re-apply a live colour here, which used to re-introduce the
    // snapshot race.
    ['sp-fill-btn-wrap', 'sp-clear-btn-wrap', 'sp-clearall-btn-wrap'].forEach(function(id) {
      var wrap = document.getElementById(id);
      if (!wrap || !wrap.firstElementChild) return;
      var btn = wrap.firstElementChild;
      if (ml) btn.style.left = ml + 'px';
      if (mt) btn.style.top  = mt + 'px';
      if (bw) btn.style.width = bw + 'px';
      if (bh) btn.style.height = bh + 'px';
      if (bg) btn.style.setProperty('background-color', bg, 'important');
    });
  }

  function buildActionButtons() {
    // The controls-tool grid is 2 columns × 4 rows (grid-auto-flow: column).
    // col 1: normal, corner, centre, colour. col 2: pen, then 3 empty slots.
    // Appending 3 items after pen fills those empty slots automatically.
    // Use pen as the anchor when available; fall back to any other known button
    // so that sites where pen is disabled (e.g. crackingthecryptic.com default
    // settings) still get the action buttons.
    var anchorBtn = document.querySelector('[data-control="pen"]') ||
                    document.querySelector('[data-control="normal"]') ||
                    document.querySelector('[data-control="corner"]');
    if (!anchorBtn) return false;
    if (document.getElementById('sp-fill-btn-wrap')) return true;
    // Wait until SudokuPad's CSS has applied: button must have a non-zero size and
    // a non-transparent background color. If either is missing, CSS hasn't settled yet.
    var colorRef = document.querySelector('[data-control="pen"]') ||
                   document.querySelector('[data-control="corner"]') ||
                   document.querySelector('[data-control="centre"]') || anchorBtn;
    if (!anchorBtn.offsetWidth || getComputedStyle(colorRef).backgroundColor === 'rgba(0, 0, 0, 0)') return false;
    var toolContainer = anchorBtn.parentElement;

    var fillWrap = buildActionButton({
      id: 'sp-fill-btn', wrapId: 'sp-fill-btn-wrap',
      shortLabel: 'Fill', fullLabel: 'Fill selected cells with candidates',
      settingsKey: 'showActionButtons', onClick: fillSelectedCellsWithCandidates,
    });
    var clearWrap = buildActionButton({
      id: 'sp-clear-btn', wrapId: 'sp-clear-btn-wrap',
      shortLabel: 'Clear', fullLabel: 'Clear invalid marks in selection',
      settingsKey: 'showActionButtons', onClick: clearMarksInSelected,
    });
    var clearAllWrap = buildActionButton({
      id: 'sp-clearall-btn', wrapId: 'sp-clearall-btn-wrap',
      shortLabel: 'Clear\nAll',  // two lines; white-space:pre renders the \n
      fullLabel: 'Clear all invalid marks in the puzzle',
      settingsKey: 'showActionButtons', onClick: removeInvalidPencilmarks,
    });

    toolContainer.appendChild(fillWrap);
    toolContainer.appendChild(clearWrap);
    toolContainer.appendChild(clearAllWrap);
    syncActionButtonGeometry();                  // immediate: correct if CSS already applied
    setTimeout(syncActionButtonGeometry, 100);   // early retry: covers most race conditions
    setTimeout(syncActionButtonGeometry, 500);   // late safety net: always correct after 500 ms
    if (buttonsAnyEnabled() && needsDigitSetCheck()) runDigitSetCheck();
    return true;
  }

  // ── Digit set helpers ──────────────────────────────────────────────────────

  function buttonsAnyEnabled() {
    return settings.showActionButtons !== false;
  }

  // Whether we should (re-)run the digit-set check for the current page. The
  // check fires if the user hasn't confirmed yet OR if they've navigated to a
  // new URL since their last confirmation. Returning to a previously-confirmed
  // URL after visiting a different one DOES trigger a re-prompt (we only
  // remember the most recent confirmed URL, not the full history).
  function needsDigitSetCheck() {
    return !settings.digitSetConfirmed
        || settings.lastConfirmedUrl !== location.href;
  }

  // Deduplicate a digit-set string, PRESERVING the user's input order.
  // Strips anything that isn't 0-9 (letters, punctuation, whitespace) — the
  // script does not fill or remove letter marks, so they shouldn't appear in
  // the digit set. Dedupes silently: "1123" → "123", "1234567890" stays as is.
  function sanitizeDigitSet(str) {
    var seen = {};
    var result = '';
    (str || '').split('').forEach(function (c) {
      if (/^[0-9]$/.test(c) && !seen[c]) { seen[c] = true; result += c; }
    });
    return result;
  }

  // How many digits are in play = the size of the LARGEST no-repeat region. A
  // no-repeat region can never hold more digits than the puzzle HAS, and a sudoku's
  // boxes hold exactly the full set — so the biggest one IS the digit count.
  // This is what makes SQUISHDOKU work with no special case: `pdnc0ckv87` is a 7x7
  // grid whose nine 3x3 boxes OVERLAP, so its boxes are 9 cells and its digits are
  // 1-9 even though the grid is only 7 wide. Its rows/cols (7 cells) are smaller
  // and don't win. A 9x9 → 9, a 6x6 → 6, all from the same rule.
  // Falls back to the grid size when the model isn't loaded / has no regions.
  function cageCellCount(c) {
    var cells = c && c.cells;
    if (Array.isArray(cells)) return cells.length;
    var m = String(cells || '').match(/r\d+c\d+/gi);
    return m ? m.length : 0;
  }
  function detectDigitCount() {
    var N = detectGridSize();
    var best = 0;
    try {
      var cp = (typeof Framework !== 'undefined' && Framework.app && Framework.app.puzzle)
        ? Framework.app.puzzle.currentPuzzle : null;
      if (cp) {
        if (Array.isArray(cp.regions)) cp.regions.forEach(function (r) {
          if (Array.isArray(r) && r.length > best) best = r.length;
        });
        // Squishdoku's boxes are authored as hidden unique:true cages, not regions.
        if (Array.isArray(cp.cages)) cp.cages.forEach(function (c) {
          if (!c || c.unique !== true) return;
          var n = cageCellCount(c);
          if (n > best) best = n;
        });
      }
    } catch (e) { /* model not ready → fall back to the grid */ }
    if (best < 2 || best > 16) return N;
    return best;
  }

  // Scan the live puzzle DOM for digits in use (givens, placed values,
  // pencilmarks). Returns { anomaly, bestGuess, reasons }.
  // anomaly is true if the puzzle doesn't use 9 digits, or shows a VISIBLE '0'.
  // Letter marks are NOT an anomaly — the script doesn't operate on letters,
  // so a 9×9 with letter pencilmarks still uses the default 1-9 digit set.
  //
  // FOG IS A SPOILER BOUNDARY. A given hidden under fog is still in the DOM, so a
  // naive scan sees a '0' the PLAYER isn't meant to know about yet — and prompting
  // "digit ‘0’ found in puzzle" would leak it. So a digit is only allowed to drive
  // the prompt when it was seen in a cell that isn't fogged. A fogged-only '0' is
  // ignored completely: not named as a reason, and not pre-filled into the guess
  // (which would leak it just as loudly). The digit set is then assumed to be the
  // standard 1..digitCount, which is right for the 9x9 and 7x7-Squishdoku cases.
  function detectDigitSet() {
    var isFogged = getFogTester();          // null when the puzzle has no active fog
    var found = {};                          // digit → { visible:bool }
    function addDigit(c, xyEl) {
      if (!c || !/^[0-9]$/.test(c)) return;
      if (!found[c]) found[c] = { visible: false };
      if (found[c].visible) return;          // already proven visible somewhere
      var fogged = false;
      if (isFogged && xyEl) {
        try { fogged = isFogged(cellKeyFromMarkXY(xyEl.getAttribute('x'), xyEl.getAttribute('y'))); }
        catch (e) { fogged = false; }
      }
      if (!fogged) found[c].visible = true;
    }
    document.querySelectorAll('#cell-givens text, #cell-values text').forEach(function (t) {
      var v = (t.textContent || '').trim();
      if (v.length === 1) addDigit(v, t);
    });
    document.querySelectorAll('#cell-pencilmarks text').forEach(function (t) {
      addDigit((t.getAttribute('data-val') || '').trim(), t);
    });
    // A tspan carries no x/y — its parent <text> holds the cell position.
    document.querySelectorAll('#cell-candidates tspan').forEach(function (t) {
      addDigit((t.getAttribute('data-val') || '').trim(), t.parentNode);
    });
    var digitCount = detectDigitCount();
    var gridN = detectGridSize();
    var zeroVisible = !!(found['0'] && found['0'].visible);
    // Build best-guess preserving "1-9 then 0" order (natural sudoku order
    // where 0 is the "extra" 10th digit appended after 9, not pushed to the
    // front by numeric sort). sanitizeDigitSet preserves insertion order, so
    // we just concatenate the right way: 1..min(digitCount,9) first, then '0' if
    // VISIBLY present, then anything else from `found`.
    var guessStr = '';
    for (var i = 1; i <= Math.min(digitCount, 9); i++) guessStr += String(i);
    if (zeroVisible) guessStr += '0';
    Object.keys(found).forEach(function (c) {
      if (c === '0' && !zeroVisible) return;               // fogged-only 0: never leak it
      guessStr += c;
    });
    var bestGuess = sanitizeDigitSet(guessStr);
    var reasons = [];
    // Keyed on the DIGIT COUNT, not the grid: a 7x7 Squishdoku uses 9 digits and is
    // NOT anomalous, so it's applied silently with no prompt.
    if (digitCount !== 9) reasons.push(gridN + '\xd7' + gridN + ' grid detected');
    if (zeroVisible) reasons.push("digit ‘0’ found in puzzle");
    var anomaly = reasons.length > 0;
    return { anomaly: anomaly, bestGuess: bestGuess, reasons: reasons };
  }

  // Show a small prompt card above the settings button asking the user to
  // confirm the digit set. Only called when an anomaly is detected and the
  // user hasn't confirmed a digit set yet this session.
  function showDigitSetPrompt(info) {
    var existing = document.getElementById('sp-digit-prompt');
    if (existing) existing.remove();

    var card = document.createElement('div');
    card.id = 'sp-digit-prompt';
    Object.assign(card.style, {
      position: 'fixed', bottom: '56px', right: '12px', width: '300px',
      background: '#1e1e2e', color: '#cdd6f4',
      border: '1px solid #fab387', borderRadius: '8px',
      padding: '12px 14px', zIndex: '999999',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px', lineHeight: '1.4',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    });

    var title = document.createElement('div');
    title.textContent = 'Non-standard digit set detected';
    Object.assign(title.style, {
      fontSize: '12px', fontWeight: 'bold', color: '#fab387', marginBottom: '6px',
    });

    var desc = document.createElement('div');
    desc.textContent = info.reasons.join('. ') + '. Adjust the digits for this puzzle:';
    Object.assign(desc.style, { fontSize: '12px', color: '#a6adc8', marginBottom: '8px' });

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;align-items:center;';

    var input = document.createElement('input');
    input.type = 'text'; input.maxLength = 30;
    input.value = info.bestGuess;
    Object.assign(input.style, {
      flex: '1', background: '#313244', color: '#cdd6f4',
      border: '1px solid #45475a', borderRadius: '4px',
      padding: '4px 8px', fontSize: '13px', fontFamily: 'monospace',
    });
    input.addEventListener('blur', function () {
      var cleaned = sanitizeDigitSet(input.value);
      if (cleaned) input.value = cleaned;
    });

    var btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = 'Confirm';
    Object.assign(btn.style, {
      background: '#fab387', color: '#1e1e2e', border: 'none', borderRadius: '4px',
      padding: '5px 10px', fontSize: '12px', fontWeight: 'bold',
      cursor: 'pointer', whiteSpace: 'nowrap',
    });

    function confirm() {
      var cleaned = sanitizeDigitSet(input.value) || '123456789';
      settings.digitSet = cleaned;
      settings.digitSetConfirmed = true;
      settings.lastConfirmedUrl = location.href;
      saveSettings(settings);
      var dsInput = document.getElementById('sp-digit-set-input');
      if (dsInput) dsInput.value = cleaned;
      card.remove();
    }
    btn.addEventListener('click', confirm);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') confirm();
      if (e.key === 'Escape') { e.stopPropagation(); confirm(); }
    });

    row.appendChild(input); row.appendChild(btn);
    card.appendChild(title); card.appendChild(desc); card.appendChild(row);
    document.body.appendChild(card);
    input.focus(); input.select();
  }

  // Scan the grid; silently apply if standard, prompt if anomalous.
  // Only called when buttons are enabled and the current URL hasn't been
  // confirmed yet (digitSetConfirmed false OR lastConfirmedUrl differs).
  function runDigitSetCheck() {
    var info = detectDigitSet();
    if (!info.anomaly) {
      settings.digitSet = info.bestGuess;
      settings.digitSetConfirmed = true;
      settings.lastConfirmedUrl = location.href;
      saveSettings(settings);
      var dsInput = document.getElementById('sp-digit-set-input');
      if (dsInput) dsInput.value = info.bestGuess;
    } else {
      showDigitSetPrompt(info);
    }
  }

  function buildSettingsUI() {
    var panel = document.createElement('div');
    panel.id = 'sp-fix-panel';
    // Panel = flex column with non-scrolling header on top and a scrollable
    // content div below. Scrollbar lives on the content div so it only spans
    // the content area, never overlapping the title.
    Object.assign(panel.style, {
      display: 'none', position: 'fixed', bottom: '56px', right: '12px',
      width: '340px', maxHeight: '80vh',
      flexDirection: 'column',
      background: '#1e1e2e', color: '#cdd6f4',
      border: '1px solid #45475a', borderRadius: '10px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px', lineHeight: '1.4',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      zIndex: '999999',
      overflow: 'hidden',   // clip rounded corners
    });

    var header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 14px', background: '#313244',
      borderBottom: '1px solid #45475a',
      flexShrink: '0',
    });
    var title = document.createElement('span');
    title.textContent = 'DarkReader Fix';
    Object.assign(title.style, { fontWeight: '600', fontSize: '16px' });
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button'; closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
      background: '#1e1e2e', color: '#a6adc8',
      border: '1px solid #45475a', borderRadius: '5px',
      width: '26px', height: '26px', cursor: 'pointer',
      fontSize: '16px', padding: '0', lineHeight: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: '0',
    });
    closeBtn.addEventListener('click', function () { panel.style.display = 'none'; });
    header.appendChild(title); header.appendChild(closeBtn);
    panel.appendChild(header);

    // Scrollable content container — every section below goes in here so the
    // scrollbar starts under the header instead of running the panel's full height.
    var content = document.createElement('div');
    Object.assign(content.style, {
      overflowY: 'auto',
      flex: '1 1 auto',
      minHeight: '0',   // required for flex children to actually scroll
    });
    panel.appendChild(content);

    content.appendChild(buildSection({
      label: 'Region borders',
      desc: 'Borders around the puzzle\'s regions (boxes, cages, shape groups) and its cell gridlines.',
      hasColor: false,
      noMasterCheckbox: true,   // no section toggle — each subsection checkbox stands alone
      enableKeys: ['regionBorderCenterEnabled', 'regionBorderMultiEnabled', 'regionBorderCellEnabled'],
      resetKeys: ['regionBorderCenterEnabled', 'regionBorderColor', 'regionBorderOpacity', 'regionBorderWidth', 'regionBorderSuppressBoundary', 'regionHideAuthorBorders',
                  'regionBorderMultiEnabled', 'regionColorPalette0', 'regionColorPalette1', 'regionColorPalette2', 'regionColorPalette3',
                  'regionColorStripeWidth', 'regionColorOpacity',
                  'regionBorderCellEnabled', 'regionBorderCellColor', 'regionBorderCellOpacity', 'regionBorderCellWidth'],
      subBuilder: function (wrap) {
        // Inset divider between the three subsections (doesn't reach the panel edges,
        // so it reads as one big section split into three).
        function divider() {
          var d = document.createElement('div');
          Object.assign(d.style, { borderTop: '1px solid #45475a', margin: '12px 12px 0 12px' });
          return d;
        }
        // Each subsection collapses its own options independently (no section master).
        var subBoxes = [];
        function makeSubsection(enabledKey, labelText, buildOptions, hilite, hiliteTitle) {
          var box = makeCollapsibleSubsection({
            enabledKey: enabledKey,
            labelText: labelText, buildOptions: buildOptions, hilite: hilite, hiliteTitle: hiliteTitle,
          });
          subBoxes.push(box);
          return box;
        }
        wrap._spdrOnMasterToggle = function () { subBoxes.forEach(function (b) { b._spdrUpd(); }); };
        function colorRow(label, colorKey, opacityKey) {
          var ref = makeColorControl(colorKey, opacityKey);
          var r = document.createElement('div');
          Object.assign(r.style, { display:'flex', alignItems:'center', gap:'8px', marginTop:'6px' });
          var l = document.createElement('span'); l.textContent = label;
          Object.assign(l.style, { color:'#cdd6f4', fontSize:'12px', flex:'1' });
          r.appendChild(l); r.appendChild(ref);
          return { row: r, ref: ref };
        }

        // ── Top-level toggles (always visible, outside every collapsible subsection) ──
        wrap.appendChild(makeSubCheckbox('regionBorderSuppressBoundary', 'Hide built-in grid line on region boundaries'));
        wrap.appendChild(makeSubCheckbox('regionHideAuthorBorders', 'Hide author-drawn region borders'));

        // ── Subsection 1: Center borders ──────────────────────────────────
        wrap.appendChild(divider());
        wrap.appendChild(makeSubsection('regionBorderCenterEnabled', 'Centre borders', function (opt) {
          var c = colorRow('Color:', 'regionBorderColor', 'regionBorderOpacity');
          opt.appendChild(c.row);
          opt.appendChild(makeOpacityRow('regionBorderOpacity', c.ref));
          opt.appendChild(makeWidthRow('regionBorderWidth'));
        }, 'regCenter', 'Highlight the centre region borders (or where they\'d be drawn)'));

        // ── Subsection 2: Multi-color borders ─────────────────────────────
        wrap.appendChild(divider());
        wrap.appendChild(makeSubsection('regionBorderMultiEnabled', 'Multi-color borders', function (opt) {
          var swatchRow = document.createElement('div');
          Object.assign(swatchRow.style, { display:'flex', alignItems:'center', gap:'6px', marginTop:'6px' });
          var swatchLbl = document.createElement('span'); swatchLbl.textContent = 'Colors:';
          Object.assign(swatchLbl.style, { color:'#cdd6f4', fontSize:'12px', flexShrink:'0' });
          swatchRow.appendChild(swatchLbl);
          ['regionColorPalette0','regionColorPalette1','regionColorPalette2','regionColorPalette3'].forEach(function (k) {
            swatchRow.appendChild(makeColorControl(k, null));
          });
          opt.appendChild(swatchRow);
          opt.appendChild(makeWidthRow('regionColorStripeWidth'));
          opt.appendChild(makeOpacityRow('regionColorOpacity', null));
        }, 'regMulti', 'Highlight the multi-color region borders (or where they\'d be drawn)'));

        // ── Subsection 3: Cell gridlines (recolor the thin built-in grid lines) ──
        wrap.appendChild(divider());
        wrap.appendChild(makeSubsection('regionBorderCellEnabled', 'Cell gridlines', function (opt) {
          var c = colorRow('Color:', 'regionBorderCellColor', 'regionBorderCellOpacity');
          opt.appendChild(c.row);
          opt.appendChild(makeOpacityRow('regionBorderCellOpacity', c.ref));
          opt.appendChild(makeWidthRow('regionBorderCellWidth'));
        }, 'regCell', 'Highlight the thin built-in grid lines'));
      },
    }));

    content.appendChild(buildSection({
      label: 'Given / placed digits',
      desc: 'The puzzle\'s given clue digits and the full-sized digits you place.',
      hasColor: false,
      noMasterCheckbox: true,
      enableKeys: ['givenEnabled', 'userDigitEnabled'],
      resetKeys: ['givenEnabled', 'givenColor', 'givenOpacity',
                  'userDigitEnabled', 'userDigitColor', 'userDigitOpacity'],
      subBuilder: function (wrap) {
        var subBoxes = [];
        function sub(enabledKey, labelText, buildOptions, hilite, hiliteTitle) {
          var box = makeCollapsibleSubsection({
            enabledKey: enabledKey,
            labelText: labelText, buildOptions: buildOptions, hilite: hilite, hiliteTitle: hiliteTitle,
          });
          subBoxes.push(box);
          return box;
        }
        wrap._spdrOnMasterToggle = function () { subBoxes.forEach(function (b) { b._spdrUpd(); }); };
        function divider() {
          var d = document.createElement('div');
          Object.assign(d.style, { borderTop: '1px solid #45475a', margin: '12px 12px 0 12px' });
          return d;
        }

        // ── Subsection 1: Given digits (author clues) ─────────────────────
        wrap.appendChild(sub('givenEnabled', 'Given digits',
          function (opt) { opt.appendChild(makeColorRow('Color', 'givenColor', 'givenOpacity')); },
          'given', 'Highlight the given clue digits'));

        // ── Subsection 2: Placed digits (the solver's values) ─────────────
        wrap.appendChild(divider());
        wrap.appendChild(sub('userDigitEnabled', 'Placed digits',
          function (opt) { opt.appendChild(makeColorRow('Color', 'userDigitColor', 'userDigitOpacity')); },
          'userDigit', 'Highlight the digits you have placed'));
      },
    }));

    content.appendChild(buildSection({
      label: 'Pencilmarks',
      desc: 'The small candidate digits you pencil into cells — centre marks and corner marks.',
      hasColor: false,
      noMasterCheckbox: true,
      enableKeys: ['centerEnabled', 'cornerEnabled'],
      resetKeys: ['centerEnabled', 'centerValidColor', 'centerValidOpacity', 'centerInvalidColor', 'centerInvalidOpacity', 'centerHideInvalid', 'centerMoveInvalidRight',
                  'cornerEnabled', 'cornerValidColor', 'cornerValidOpacity', 'cornerInvalidColor', 'cornerInvalidOpacity', 'cornerHideInvalid', 'cornerMoveInvalidEnd'],
      subBuilder: function (wrap) {
        var subBoxes = [];
        function sub(enabledKey, labelText, buildOptions, hilite, hiliteTitle) {
          var box = makeCollapsibleSubsection({
            enabledKey: enabledKey,
            labelText: labelText, buildOptions: buildOptions, hilite: hilite, hiliteTitle: hiliteTitle,
          });
          subBoxes.push(box);
          return box;
        }
        wrap._spdrOnMasterToggle = function () { subBoxes.forEach(function (b) { b._spdrUpd(); }); };
        function divider() {
          var d = document.createElement('div');
          Object.assign(d.style, { borderTop: '1px solid #45475a', margin: '12px 12px 0 12px' });
          return d;
        }

        // ── Center marks ──────────────────────────────────────────────────
        wrap.appendChild(sub('centerEnabled', 'Centre marks', function (opt) {
          opt.appendChild(makeColorRow('Valid digits',   'centerValidColor',   'centerValidOpacity'));
          opt.appendChild(makeColorRow('Invalid digits', 'centerInvalidColor', 'centerInvalidOpacity'));
          opt.appendChild(makeSubCheckbox('centerHideInvalid',      'Hide invalid digits'));
          opt.appendChild(makeSubCheckbox('centerMoveInvalidRight', 'Move invalid digits to the right'));
        }, 'centerMarks', 'Highlight the centre pencilmarks'));

        // ── Corner marks ──────────────────────────────────────────────────
        wrap.appendChild(divider());
        wrap.appendChild(sub('cornerEnabled', 'Corner marks', function (opt) {
          opt.appendChild(makeColorRow('Valid digits',   'cornerValidColor',   'cornerValidOpacity'));
          opt.appendChild(makeColorRow('Invalid digits', 'cornerInvalidColor', 'cornerInvalidOpacity'));
          opt.appendChild(makeSubCheckbox('cornerHideInvalid',    'Hide invalid digits'));
          opt.appendChild(makeSubCheckbox('cornerMoveInvalidEnd', 'Move invalid digits to the end'));
        }, 'cornerMarks', 'Highlight the corner pencilmarks'));
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'underlayEnabled',
      label: 'Object shading',
      desc: 'Shape backgrounds, cage fills, lines (thermos, palindromes, etc.), and their outlines.',
      // Section-label eyeball shows only while the section is collapsed (its per-slider
      // eyeballs are hidden then) — highlights every shaded object at once.
      hilite: 'objAll', hiliteTitle: 'Highlight all shaded objects', hiliteWhenCollapsed: true,
      hasColor: false,
      // NOTE: underlaySeparateBrightnessOpacity is intentionally NOT in resetKeys —
      // the section ↺ leaves the combined/separate checkbox in whatever state it's
      // in. Only the bottom "Reset all" restores it (to the default, off).
      resetKeys: [
        'underlayLightness','underlayLightnessEnabled',
        'underlayOpacity','underlayOpacityEnabled',
        'underlayGrayBrightness','underlayGrayBrightnessEnabled',
        'underlayGrayOpacity','underlayGrayOpacityEnabled',
        'underlayStrokeLightness','underlayStrokeLightnessEnabled',
        'underlayStrokeOpacity','underlayStrokeOpacityEnabled',
      ],
      subBuilder: function (wrap) {
        // Combined sliders (shown when "separate" is OFF): each drives both its
        // brightness and opacity keys to the same value via extraKeys.
        var hC = { hilite: 'objColored', hiliteTitle: 'Highlight colored shaded objects' };
        var hG = { hilite: 'objGray',    hiliteTitle: 'Highlight gray/black/white shaded objects' };
        var hB = { hilite: 'objBorders', hiliteTitle: 'Highlight object/line borders (strokes)' };
        var rowColorCombined  = makeRangeRow({ key: 'underlayLightness',      enabledKey: 'underlayLightnessEnabled',      extraKeys: ['underlayOpacity'],          extraEnabledKeys: ['underlayOpacityEnabled'],          label: 'Colored object brightness', min: 0, max: 1, step: 0.05, hilite: hC.hilite, hiliteTitle: hC.hiliteTitle });
        var rowGrayCombined   = makeRangeRow({ key: 'underlayGrayBrightness', enabledKey: 'underlayGrayBrightnessEnabled', extraKeys: ['underlayGrayOpacity'],      extraEnabledKeys: ['underlayGrayOpacityEnabled'],      label: 'Gray object brightness',    min: 0, max: 1, step: 0.05, hilite: hG.hilite, hiliteTitle: hG.hiliteTitle });
        var rowBorderCombined = makeRangeRow({ key: 'underlayStrokeLightness', enabledKey: 'underlayStrokeLightnessEnabled', extraKeys: ['underlayStrokeOpacity'], extraEnabledKeys: ['underlayStrokeOpacityEnabled'], label: 'Border brightness',         min: 0, max: 1, step: 0.05, hilite: hB.hilite, hiliteTitle: hB.hiliteTitle });
        // Separate sliders (shown when "separate" is ON).
        var rowColorBright   = makeRangeRow({ key: 'underlayLightness',       enabledKey: 'underlayLightnessEnabled',       label: 'Colored object brightness', min: 0, max: 1, step: 0.05, hilite: hC.hilite, hiliteTitle: hC.hiliteTitle });
        var rowColorOpacity  = makeRangeRow({ key: 'underlayOpacity',         enabledKey: 'underlayOpacityEnabled',         label: 'Colored object opacity',    min: 0, max: 1, step: 0.05, hilite: hC.hilite, hiliteTitle: hC.hiliteTitle });
        var rowGrayBright    = makeRangeRow({ key: 'underlayGrayBrightness',  enabledKey: 'underlayGrayBrightnessEnabled',  label: 'Gray object brightness',    min: 0, max: 1, step: 0.05, hilite: hG.hilite, hiliteTitle: hG.hiliteTitle });
        var rowGrayOpacity   = makeRangeRow({ key: 'underlayGrayOpacity',     enabledKey: 'underlayGrayOpacityEnabled',     label: 'Gray object opacity',       min: 0, max: 1, step: 0.05, hilite: hG.hilite, hiliteTitle: hG.hiliteTitle });
        var rowBorderBright  = makeRangeRow({ key: 'underlayStrokeLightness', enabledKey: 'underlayStrokeLightnessEnabled', label: 'Border brightness',         min: 0, max: 1, step: 0.05, hilite: hB.hilite, hiliteTitle: hB.hiliteTitle });
        var rowBorderOpacity = makeRangeRow({ key: 'underlayStrokeOpacity',   enabledKey: 'underlayStrokeOpacityEnabled',   label: 'Border opacity',            min: 0, max: 1, step: 0.05, hilite: hB.hilite, hiliteTitle: hB.hiliteTitle });

        var combinedRows = [rowColorCombined, rowGrayCombined, rowBorderCombined];
        var separateRows = [rowColorBright, rowColorOpacity, rowGrayBright, rowGrayOpacity, rowBorderBright, rowBorderOpacity];
        var allRows = [rowColorCombined, rowColorBright, rowColorOpacity, rowGrayCombined, rowGrayBright, rowGrayOpacity, rowBorderCombined, rowBorderBright, rowBorderOpacity];

        // DOM order groups each object type (combined row + its two separate rows);
        // only one mode's rows are visible at a time, so within a mode this yields
        // colored → gray → border.
        allRows.forEach(function (r) { wrap.appendChild(r); });

        // "Control opacity and brightness separately" — toggles which rows show.
        var sepLabel = document.createElement('label');
        Object.assign(sepLabel.style, { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', cursor: 'pointer', color: '#cdd6f4', fontSize: '12px' });
        var sepCb = document.createElement('input');
        sepCb.type = 'checkbox';
        sepCb.checked = !!settings.underlaySeparateBrightnessOpacity;
        Object.assign(sepCb.style, { cursor: 'pointer', accentColor: '#89b4fa', width: '13px', height: '13px', flexShrink: '0', margin: '0' });
        var sepTxt = document.createElement('span');
        sepTxt.textContent = 'Control opacity and brightness separately';
        sepLabel.appendChild(sepCb); sepLabel.appendChild(sepTxt);
        wrap.appendChild(sepLabel);

        function updateMode() {
          var sep = !!settings.underlaySeparateBrightnessOpacity;
          combinedRows.forEach(function (r) { r.style.display = sep ? 'none' : ''; });
          separateRows.forEach(function (r) { r.style.display = sep ? '' : 'none'; });
        }
        sepCb.addEventListener('change', function () {
          settings.underlaySeparateBrightnessOpacity = sepCb.checked;
          // Entering combined mode: lock each pair's opacity to its brightness so
          // the single slider's value matches what's applied. (Leaving combined →
          // separate keeps them equal as a sensible starting point.)
          if (!sepCb.checked) {
            settings.underlayOpacity = settings.underlayLightness;
            settings.underlayOpacityEnabled = settings.underlayLightnessEnabled;
            settings.underlayGrayOpacity = settings.underlayGrayBrightness;
            settings.underlayGrayOpacityEnabled = settings.underlayGrayBrightnessEnabled;
            settings.underlayStrokeOpacity = settings.underlayStrokeLightness;
            settings.underlayStrokeOpacityEnabled = settings.underlayStrokeLightnessEnabled;
          }
          saveSettings(settings); applySettings();
          allRows.forEach(function (r) { r.spdrRefresh(); });
          updateMode();
        });

        // Aggregate syncer: any reset of an object-shading key refreshes every row
        // (combined + separate share keys) and re-applies the visible-row mode.
        function refreshAll() {
          sepCb.checked = !!settings.underlaySeparateBrightnessOpacity;
          allRows.forEach(function (r) { r.spdrRefresh(); });
          updateMode();
        }
        ['underlaySeparateBrightnessOpacity',
         'underlayLightness','underlayLightnessEnabled',
         'underlayOpacity','underlayOpacityEnabled',
         'underlayGrayBrightness','underlayGrayBrightnessEnabled',
         'underlayGrayOpacity','underlayGrayOpacityEnabled',
         'underlayStrokeLightness','underlayStrokeLightnessEnabled',
         'underlayStrokeOpacity','underlayStrokeOpacityEnabled'
        ].forEach(function (k) { controlSyncers[k] = refreshAll; });

        updateMode();
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'kropkiFixEnabled',
      label: 'Kropki dots',
      desc: 'The white/black Kropki dots between cells.',
      hilite: 'kropki', hiliteTitle: 'Highlight the Kropki dots',
      hasColor: false,
      resetKeys: ['kropkiFixEnabled',
                  'kropkiColonEnabled', 'kropkiBlackLabelText', 'kropkiBlackLabelRotate', 'kropkiOutlineEnabled',
                  'kropkiWhiteOutlineEnabled',
                  'kropkiConsecLabelEnabled', 'kropkiConsecLabelText', 'kropkiConsecLabelRotate',
                  'kropkiLabelSize', 'kropkiLabelWeight'],
      subBuilder: function (wrap) {
        // ── 2:1 (black) dot label ─────────────────────────────────────────
        var blackRow = document.createElement('div');
        Object.assign(blackRow.style, { display:'flex', alignItems:'center', gap:'6px', marginTop:'6px' });
        var blCb = document.createElement('input');
        blCb.type = 'checkbox'; blCb.checked = !!settings.kropkiColonEnabled;
        Object.assign(blCb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
        var blLbl = document.createElement('span');
        blLbl.textContent = 'Label on black dots:';
        Object.assign(blLbl.style, { color:'#cdd6f4', fontSize:'12px', flex:'1' });
        var blInput = document.createElement('input');
        blInput.type = 'text'; blInput.value = settings.kropkiBlackLabelText != null ? settings.kropkiBlackLabelText : ':';
        Object.assign(blInput.style, {
          width:'54px', background:'#313244', color:'#cdd6f4',
          border:'1px solid #45475a', borderRadius:'4px',
          padding:'2px 6px', fontSize:'12px', fontFamily:'monospace', textAlign:'center', flexShrink:'0',
        });
        blCb.addEventListener('change',  function() { settings.kropkiColonEnabled    = blCb.checked;  saveSettings(settings); applySettings(); });
        blInput.addEventListener('input', function() { settings.kropkiBlackLabelText  = blInput.value; saveSettings(settings); applySettings(); });
        controlSyncers['kropkiColonEnabled']   = function() { blCb.checked  = !!settings.kropkiColonEnabled; };
        controlSyncers['kropkiBlackLabelText'] = function() { blInput.value = settings.kropkiBlackLabelText != null ? settings.kropkiBlackLabelText : ':'; };
        blackRow.appendChild(blCb); blackRow.appendChild(blLbl); blackRow.appendChild(blInput);
        wrap.appendChild(blackRow);
        wrap.appendChild(makeSubCheckbox('kropkiBlackLabelRotate', 'Rotate label on horizontal borders'));
        wrap.appendChild(makeSubCheckbox('kropkiOutlineEnabled', 'White outline on black dots'));

        // ── Consecutive (white) dot label ─────────────────────────────────
        var consecDiv = document.createElement('div');
        Object.assign(consecDiv.style, { marginTop:'8px', paddingTop:'6px', borderTop:'1px solid #313244' });
        var whiteRow = document.createElement('div');
        Object.assign(whiteRow.style, { display:'flex', alignItems:'center', gap:'6px' });
        var wlCb = document.createElement('input');
        wlCb.type = 'checkbox'; wlCb.checked = !!settings.kropkiConsecLabelEnabled;
        Object.assign(wlCb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
        var wlLbl = document.createElement('span');
        wlLbl.textContent = 'Label on white dots:';
        Object.assign(wlLbl.style, { color:'#cdd6f4', fontSize:'12px', flex:'1' });
        var wlInput = document.createElement('input');
        wlInput.type = 'text'; wlInput.value = settings.kropkiConsecLabelText != null ? settings.kropkiConsecLabelText : '~';
        Object.assign(wlInput.style, {
          width:'54px', background:'#313244', color:'#cdd6f4',
          border:'1px solid #45475a', borderRadius:'4px',
          padding:'2px 6px', fontSize:'12px', fontFamily:'monospace', textAlign:'center', flexShrink:'0',
        });
        wlCb.addEventListener('change',  function() { settings.kropkiConsecLabelEnabled = wlCb.checked;  saveSettings(settings); applySettings(); });
        wlInput.addEventListener('input', function() { settings.kropkiConsecLabelText    = wlInput.value; saveSettings(settings); applySettings(); });
        controlSyncers['kropkiConsecLabelEnabled'] = function() { wlCb.checked  = !!settings.kropkiConsecLabelEnabled; };
        controlSyncers['kropkiConsecLabelText']    = function() { wlInput.value = settings.kropkiConsecLabelText != null ? settings.kropkiConsecLabelText : '~'; };
        whiteRow.appendChild(wlCb); whiteRow.appendChild(wlLbl); whiteRow.appendChild(wlInput);
        consecDiv.appendChild(whiteRow);
        consecDiv.appendChild(makeSubCheckbox('kropkiConsecLabelRotate', 'Rotate label on horizontal borders'));
        consecDiv.appendChild(makeSubCheckbox('kropkiWhiteOutlineEnabled', 'Black outline on white dots'));
        wrap.appendChild(consecDiv);

        // ── Label size (applies to BOTH dot labels) ───────────────────────
        // Greyed out unless at least one of the two label checkboxes above is on.
        var sizeDiv = document.createElement('div');
        Object.assign(sizeDiv.style, { borderTop: '1px solid #45475a', margin: '12px 12px 0 12px' });
        wrap.appendChild(sizeDiv);
        var sizeRow = document.createElement('div');
        Object.assign(sizeRow.style, { display:'flex', alignItems:'center', gap:'8px', marginTop:'10px' });
        var sizeLbl = document.createElement('span');
        sizeLbl.textContent = 'Label size:';
        Object.assign(sizeLbl.style, { color:'#cdd6f4', fontSize:'12px', flexShrink:'0' });
        var sizeInput = document.createElement('input');
        sizeInput.type = 'text'; sizeInput.value = settings.kropkiLabelSize;
        Object.assign(sizeInput.style, {
          width:'60px', padding:'2px 6px', border:'1px solid #45475a', borderRadius:'4px',
          background:'#313244', color:'#cdd6f4', fontSize:'12px',
        });
        var sizeUnit = document.createElement('span');
        sizeUnit.textContent = 'px';
        Object.assign(sizeUnit.style, { color:'#a6adc8', fontSize:'11px' });
        sizeInput.addEventListener('input', function () {
          var v = sizeInput.value.trim();
          if (v === '' || /^\d+(\.\d+)?$/.test(v)) { settings.kropkiLabelSize = v; saveSettings(settings); applySettings(); }
        });
        sizeRow.appendChild(sizeLbl); sizeRow.appendChild(sizeInput); sizeRow.appendChild(sizeUnit);
        wrap.appendChild(sizeRow);
        function updateSizeDim() {
          var anyLabel = !!settings.kropkiColonEnabled || !!settings.kropkiConsecLabelEnabled;
          sizeRow.style.opacity = anyLabel ? '' : '0.4';
          sizeRow.style.pointerEvents = anyLabel ? 'auto' : 'none';
          sizeInput.disabled = !anyLabel;
        }
        updateSizeDim();
        controlSyncers['kropkiLabelSize'] = function () { sizeInput.value = settings.kropkiLabelSize; updateSizeDim(); };
        // Re-evaluate the greyed state whenever either label checkbox flips (incl. reset).
        var _blSync = controlSyncers['kropkiColonEnabled'];
        controlSyncers['kropkiColonEnabled'] = function () { if (_blSync) _blSync(); updateSizeDim(); };
        var _wlSync = controlSyncers['kropkiConsecLabelEnabled'];
        controlSyncers['kropkiConsecLabelEnabled'] = function () { if (_wlSync) _wlSync(); updateSizeDim(); };
        blCb.addEventListener('change', updateSizeDim);
        wlCb.addEventListener('change', updateSizeDim);
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'labelBgEnabled',
      label: 'Label background',
      desc: 'The background box behind text labels (cage sums, little-killer clues, etc.).',
      hilite: 'labelBg', hiliteTitle: 'Highlight the label background boxes',
      hasColor: true,
      colorKey: 'labelBgColor',
      opacityKey: 'labelBgOpacity',
      resetKeys: ['labelBgColor','labelBgOpacity'],
    }));

    content.appendChild(buildSection({
      enabledKey: 'cellColorsOpacityEnabled',
      label: 'Cell shading',
      desc: 'Cells with a background color (e.g. ones you shade with the Color tool).',
      hilite: 'cellColors', hiliteTitle: 'Highlight the colored cells',
      hasColor: false,
      resetKeys: ['cellColorsOpacity', 'cellColorsOpacityEnabled'],
      subBuilder: function (wrap) {
        wrap.appendChild(makeRangeRow({ key: 'cellColorsOpacity', label: 'Opacity', min: 0, max: 1, step: 0.05 }));
      },
    }));

    content.appendChild(buildSection({
      label: 'Cell selection',
      desc: 'The outline drawn around the cells you currently have selected.',
      hilite: 'selection', hiliteTitle: 'Highlight the selection border (select cells first)',
      hasColor: false,
      noMasterCheckbox: true,   // no section toggle — each subsection checkbox stands alone (like Given / placed digits)
      enableKeys: ['selectionBorderEnabled', 'selectionBgEnabled'],
      resetKeys: ['selectionBorderEnabled', 'selectionColor', 'selectionOpacity', 'selectionWidth', 'selectionBorderMode', 'selectionBorderOffset',
                  'selectionBgEnabled', 'selectionBgColor', 'selectionBgOpacity'],
      subBuilder: function (wrap) {
        // Migrate any leftover 'center' value from a previous version of this
        // script to 'inside' (the new default), so the radio row has a
        // matching selected option to display.
        if (settings.selectionBorderMode !== 'inside' && settings.selectionBorderMode !== 'outside') {
          settings.selectionBorderMode = 'inside';
          saveSettings(settings);
        }
        function divider() {
          var d = document.createElement('div');
          Object.assign(d.style, { borderTop: '1px solid #45475a', margin: '12px 12px 0 12px' });
          return d;
        }
        // ── Subsection: Border (the selection outline) ────────────────────
        wrap.appendChild(makeCollapsibleSubsection({
          enabledKey: 'selectionBorderEnabled',
          labelText: 'Border',
          buildOptions: function (opt) {
            opt.appendChild(makeColorRow('Color', 'selectionColor', 'selectionOpacity'));
            opt.appendChild(makeWidthRow('selectionWidth'));
            opt.appendChild(makeRadioRow('Grow', 'selectionBorderMode', [
              { value: 'inside',  label: 'Inside'  },
              { value: 'outside', label: 'Outside' },
            ]));
            opt.appendChild(makeOffsetRow('selectionBorderOffset'));
          },
        }));
        // ── Subsection: Background (the fill behind the selection) ─────────
        wrap.appendChild(divider());
        wrap.appendChild(makeCollapsibleSubsection({
          enabledKey: 'selectionBgEnabled',
          labelText: 'Background',
          buildOptions: function (opt) {
            // Accent tick at 0.4 = where white@opacity reproduces SudokuPad's native
            // grey selection fill (the look when this subsection is off).
            opt.appendChild(makeColorRow('Color', 'selectionBgColor', 'selectionBgOpacity', null, null,
              [{ value: 0.4, title: 'Matches the native gray fill (Background off)', accent: true }]));
          },
        }));
      },
    }));

    // Action buttons section
    var actionSection = document.createElement('div');
    Object.assign(actionSection.style, { padding: '10px 14px', borderBottom: '1px solid #313244' });

    // Section header row: title + reset button
    var actionHeaderRow = document.createElement('div');
    Object.assign(actionHeaderRow.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' });
    var actionTitle = document.createElement('div');
    actionTitle.textContent = 'Action buttons';
    Object.assign(actionTitle.style, { color: '#cdd6f4', fontWeight: '500' });
    var actionResetBtn = document.createElement('button');
    actionResetBtn.type = 'button';
    actionResetBtn.textContent = '↺';
    actionResetBtn.title = 'Reset this section to defaults';
    Object.assign(actionResetBtn.style, {
      background: '#313244', color: '#a6adc8',
      border: '1px solid #45475a', borderRadius: '5px',
      width: '26px', height: '26px', cursor: 'pointer',
      fontSize: '14px', padding: '0', lineHeight: '1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: '0',
    });
    spdrFxButton(actionResetBtn);
    var ACTION_RESET_KEYS = ['showActionButtons', 'showEasyShadeButton', 'showFillSingleButton', 'showValidateButton', 'fsSelectDelayMs', 'fsFillDelayMs', 'fsUndoDelayMs', 'suppressStartDialog', 'showToasts', 'toastPersist'];
    actionResetBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      ACTION_RESET_KEYS.forEach(function (k) { if (k in DEFAULTS) settings[k] = DEFAULTS[k]; });
      saveSettings(settings); applySettings();
      ACTION_RESET_KEYS.forEach(function (k) { if (controlSyncers[k]) { try { controlSyncers[k](); } catch (ex) {} } });
    });
    actionHeaderRow.appendChild(actionTitle);
    actionHeaderRow.appendChild(actionResetBtn);
    actionSection.appendChild(actionHeaderRow);

    var actionCbRow = document.createElement('label');
    actionCbRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;font-size:12px;';
    var actionCb = document.createElement('input');
    actionCb.type = 'checkbox';
    actionCb.checked = settings.showActionButtons !== false;
    Object.assign(actionCb.style, { cursor: 'pointer', accentColor: '#89b4fa', width: '13px', height: '13px', flexShrink: '0', margin: '0' });
    actionCb.addEventListener('change', function () {
      settings.showActionButtons = actionCb.checked;
      saveSettings(settings);
      ['sp-fill-btn-wrap', 'sp-clear-btn-wrap', 'sp-clearall-btn-wrap'].forEach(function (id) {
        var wrap = document.getElementById(id);
        if (wrap) wrap.style.visibility = actionCb.checked ? 'visible' : 'hidden';
      });
      if (actionCb.checked && needsDigitSetCheck()) runDigitSetCheck();
    });
    actionCbRow.appendChild(actionCb);
    actionCbRow.appendChild(document.createTextNode('Show action buttons (Fill, Clear, Clear All)'));
    actionCbRow.appendChild(makeHiliteIcon('actionBtns', 'Highlight the Fill / Clear / Clear All buttons'));
    actionSection.appendChild(actionCbRow);

    // Easy Shade visibility — lives directly below "Show action buttons"
    var easyShadeVisCbRow = document.createElement('label');
    easyShadeVisCbRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;font-size:12px;';
    var easyShadeVisCb = document.createElement('input');
    easyShadeVisCb.id = 'sp-easy-shade-vis-cb';
    easyShadeVisCb.type = 'checkbox';
    easyShadeVisCb.checked = settings.showEasyShadeButton !== false;
    Object.assign(easyShadeVisCb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
    easyShadeVisCb.addEventListener('change', function () {
      settings.showEasyShadeButton = easyShadeVisCb.checked;
      saveSettings(settings);
      if (controlSyncers['showEasyShadeButton']) controlSyncers['showEasyShadeButton']();
    });
    easyShadeVisCbRow.appendChild(easyShadeVisCb);
    easyShadeVisCbRow.appendChild(document.createTextNode('Show Easy Shade button'));
    easyShadeVisCbRow.appendChild(makeHiliteIcon('easyShade', 'Highlight the Easy Shade button'));
    actionSection.appendChild(easyShadeVisCbRow);

    // Auto-fill (single candidate) button visibility
    var fsVisCbRow = document.createElement('label');
    fsVisCbRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;font-size:12px;';
    var fsVisCb = document.createElement('input');
    fsVisCb.id = 'sp-fs-vis-cb';
    fsVisCb.type = 'checkbox';
    fsVisCb.checked = settings.showFillSingleButton !== false;
    Object.assign(fsVisCb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
    fsVisCb.addEventListener('change', function () {
      settings.showFillSingleButton = fsVisCb.checked;
      saveSettings(settings);
      if (controlSyncers['showFillSingleButton']) controlSyncers['showFillSingleButton']();
    });
    fsVisCbRow.appendChild(fsVisCb);
    fsVisCbRow.appendChild(document.createTextNode('Show Auto-fill (single candidate) button'));
    actionSection.appendChild(fsVisCbRow);
    // Keep the checkbox in sync when the button's own controlSyncer is invoked
    // (e.g. by the section reset). Chain onto the visibility syncer set in buildFillSingleButton.
    (function () {
      var btnSync = controlSyncers['showFillSingleButton'];
      controlSyncers['showFillSingleButton'] = function () {
        if (btnSync) btnSync();
        fsVisCb.checked = settings.showFillSingleButton !== false;
      };
    })();

    // "Validate Constraints" button visibility (Kropki validation; more constraints later)
    var validateVisCbRow = document.createElement('label');
    validateVisCbRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;font-size:12px;';
    var validateVisCb = document.createElement('input');
    validateVisCb.id = 'sp-validate-vis-cb';
    validateVisCb.type = 'checkbox';
    validateVisCb.checked = settings.showValidateButton !== false;
    Object.assign(validateVisCb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
    validateVisCb.addEventListener('change', function () {
      settings.showValidateButton = validateVisCb.checked;
      saveSettings(settings);
      if (controlSyncers['showValidateButton']) controlSyncers['showValidateButton']();
    });
    validateVisCbRow.appendChild(validateVisCb);
    validateVisCbRow.appendChild(document.createTextNode('Show Validate Constraints button'));
    actionSection.appendChild(validateVisCbRow);
    // Keep the checkbox in sync when the button's controlSyncer is invoked (e.g. section reset).
    (function () {
      var btnSync = controlSyncers['showValidateButton'];
      controlSyncers['showValidateButton'] = function () {
        if (btnSync) btnSync();
        validateVisCb.checked = settings.showValidateButton !== false;
      };
    })();

    // Auto-fill delays — live-editable (no reload), indented under the checkbox.
    var fsDelayWrap = document.createElement('div');
    Object.assign(fsDelayWrap.style, { paddingLeft: '20px', marginBottom: '4px' });
    function makeFsDelayRow(labelText, key) {
      var row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:3px;font-size:11px;color:#a6adc8;cursor:text;';
      var inp = document.createElement('input');
      inp.type = 'number'; inp.min = '0'; inp.step = '50';
      inp.value = (settings[key] != null ? settings[key] : DEFAULTS[key]);
      Object.assign(inp.style, { width:'62px', background:'#181825', color:'#cdd6f4', border:'1px solid #45475a', borderRadius:'4px', padding:'2px 6px', fontSize:'11px', flexShrink:'0' });
      inp.addEventListener('input', function () {
        var v = parseInt(inp.value, 10);
        if (isNaN(v) || v < 0) v = 0;
        settings[key] = v;
        saveSettings(settings);
      });
      controlSyncers[key] = function () { inp.value = (settings[key] != null ? settings[key] : DEFAULTS[key]); };
      row.appendChild(inp);
      row.appendChild(document.createTextNode(labelText));
      fsDelayWrap.appendChild(row);
    }
    makeFsDelayRow('Select delay (ms) — before filling the chosen cell', 'fsSelectDelayMs');
    makeFsDelayRow('Fill delay (ms) — after filling, before the next cell', 'fsFillDelayMs');
    makeFsDelayRow('Undo delay (ms) — between undo steps', 'fsUndoDelayMs');
    actionSection.appendChild(fsDelayWrap);

    // Debug: preview every Auto-fill popup without building a puzzle into each state.
    var fsDebugBtn = document.createElement('button');
    fsDebugBtn.type = 'button';
    fsDebugBtn.textContent = 'Debug: show popup 1/' + fsDebugList.length;
    Object.assign(fsDebugBtn.style, { marginLeft:'20px', marginBottom:'6px', background:'#313244', color:'#a6adc8', border:'1px solid #45475a', borderRadius:'4px', padding:'3px 11px', cursor:'pointer', fontSize:'11px', fontFamily:'system-ui, -apple-system, sans-serif' });
    spdrFxButton(fsDebugBtn);
    fsDebugBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var nextN = fsDebugShowNext();
      fsDebugBtn.textContent = 'Debug: show popup ' + nextN + '/' + fsDebugList.length;
    });
    actionSection.appendChild(fsDebugBtn);

    // Suppress the "Start/Resume Puzzle" rules popup on load (applies next load).
    var suppressDlgCbRow = document.createElement('label');
    suppressDlgCbRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;font-size:12px;';
    var suppressDlgCb = document.createElement('input');
    suppressDlgCb.id = 'sp-suppress-start-dialog-cb';
    suppressDlgCb.type = 'checkbox';
    suppressDlgCb.checked = settings.suppressStartDialog !== false;
    Object.assign(suppressDlgCb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
    suppressDlgCb.addEventListener('change', function () {
      settings.suppressStartDialog = suppressDlgCb.checked;
      saveSettings(settings);
    });
    suppressDlgCbRow.appendChild(suppressDlgCb);
    suppressDlgCbRow.appendChild(document.createTextNode('Skip start/rules popup on load'));
    actionSection.appendChild(suppressDlgCbRow);
    controlSyncers['suppressStartDialog'] = function () { suppressDlgCb.checked = settings.suppressStartDialog !== false; };

    // Show toasts checkbox
    var showToastsCbRow = document.createElement('label');
    showToastsCbRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;font-size:12px;';
    var showToastsCb = document.createElement('input');
    showToastsCb.type = 'checkbox';
    showToastsCb.checked = settings.showToasts !== false;
    Object.assign(showToastsCb.style, { cursor: 'pointer', accentColor: '#89b4fa', width: '13px', height: '13px', flexShrink: '0', margin: '0' });
    showToastsCbRow.appendChild(showToastsCb);
    showToastsCbRow.appendChild(document.createTextNode('Show action result notifications'));
    actionSection.appendChild(showToastsCbRow);

    // Toast persist checkbox (dims when showToasts is off)
    var toastCbRow = document.createElement('label');
    toastCbRow.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;padding-left:20px;';
    var toastCb = document.createElement('input');
    toastCb.type = 'checkbox';
    toastCb.checked = !!settings.toastPersist;
    Object.assign(toastCb.style, { cursor: 'pointer', accentColor: '#89b4fa', width: '13px', height: '13px', flexShrink: '0', margin: '0' });
    toastCb.addEventListener('change', function () {
      settings.toastPersist = toastCb.checked;
      saveSettings(settings);
    });
    toastCbRow.appendChild(toastCb);
    toastCbRow.appendChild(document.createTextNode('Keep until dismissed (default: auto-fade after 2s)'));
    actionSection.appendChild(toastCbRow);

    function updateToastsDim() {
      var en = settings.showToasts !== false;
      toastCbRow.style.opacity      = en ? '1' : '0.4';
      toastCbRow.style.pointerEvents = en ? 'auto' : 'none';
    }
    updateToastsDim();
    showToastsCb.addEventListener('change', function () {
      settings.showToasts = showToastsCb.checked;
      saveSettings(settings);
      updateToastsDim();
    });
    controlSyncers['showToasts'] = function () {
      showToastsCb.checked = settings.showToasts !== false;
      updateToastsDim();
    };
    controlSyncers['toastPersist'] = function () { toastCb.checked = !!settings.toastPersist; };

    // ── Digit set sub-section ─────────────────────────────────────────────────
    var digitSetRow = document.createElement('div');
    Object.assign(digitSetRow.style, {
      marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #313244',
      marginLeft: '-14px', marginRight: '-14px',
      paddingLeft: '14px', paddingRight: '14px',
    });

    var digitSetHeaderRow = document.createElement('div');
    Object.assign(digitSetHeaderRow.style, { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' });
    var digitSetLabel = document.createElement('div');
    Object.assign(digitSetLabel.style, { flex: '1' });
    var digitSetLabelTitle = document.createElement('div');
    digitSetLabelTitle.textContent = 'Digit set for this puzzle';
    Object.assign(digitSetLabelTitle.style, { color: '#cdd6f4', fontWeight: '500' });
    var digitSetLabelDesc = document.createElement('div');
    digitSetLabelDesc.textContent = 'These are the digits used by the Fill and Clear action buttons, if enabled. They should match the digits used in the finished puzzle — e.g. 123456789 for a standard 9×9, 123456 for a 6×6, etc. Edit this manually if the puzzle uses zero, non-standard digits, or if the scanner did not detect them properly.';
    Object.assign(digitSetLabelDesc.style, { fontSize: '11px', color: '#6c7086', marginTop: '3px', lineHeight: '1.4' });
    digitSetLabel.appendChild(digitSetLabelTitle);
    digitSetLabel.appendChild(digitSetLabelDesc);
    var rescanBtn = document.createElement('button');
    rescanBtn.type = 'button';
    rescanBtn.textContent = 'Re-scan';
    Object.assign(rescanBtn.style, {
      background: '#313244', color: '#a6adc8',
      border: '1px solid #45475a', borderRadius: '4px',
      padding: '3px 11px', cursor: 'pointer', fontSize: '13px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      flexShrink: '0', marginLeft: '8px',
    });
    spdrFxButton(rescanBtn);
    rescanBtn.addEventListener('click', function () {
      settings.digitSetConfirmed = false;
      settings.lastConfirmedUrl = '';
      saveSettings(settings);
      runDigitSetCheck();
    });
    digitSetHeaderRow.appendChild(digitSetLabel);
    digitSetHeaderRow.appendChild(rescanBtn);

    var digitSetInput = document.createElement('input');
    digitSetInput.id = 'sp-digit-set-input';
    digitSetInput.type = 'text';
    digitSetInput.value = settings.digitSet;
    digitSetInput.maxLength = 30;
    Object.assign(digitSetInput.style, {
      width: '100%', boxSizing: 'border-box',
      background: '#1e1e2e', color: '#cdd6f4',
      border: '1px solid #45475a', borderRadius: '4px',
      padding: '4px 8px', fontSize: '13px', fontFamily: 'monospace',
    });
    digitSetInput.addEventListener('blur', function () {
      digitSetInput.value = sanitizeDigitSet(digitSetInput.value) || settings.digitSet;
    });
    digitSetRow.appendChild(digitSetHeaderRow);
    digitSetRow.appendChild(digitSetInput);
    actionSection.appendChild(digitSetRow);

    content.appendChild(actionSection);

    var footer = document.createElement('div');
    Object.assign(footer.style, { padding: '10px 14px', borderTop: '1px solid #45475a' });
    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.textContent = 'Reset all settings to default';
    Object.assign(resetBtn.style, {
      background: '#313244', color: '#a6adc8',
      border: '1px solid #45475a', borderRadius: '6px',
      padding: '6px 10px', cursor: 'pointer', fontSize: '13px', width: '100%',
    });
    spdrFxButton(resetBtn);
    resetBtn.addEventListener('click', function () {
      settings = Object.assign({}, DEFAULTS);
      saveSettings(settings); applySettings();
      Object.keys(controlSyncers).forEach(function (k) { try { controlSyncers[k](); } catch (e) {} });
      var dsInput = document.getElementById('sp-digit-set-input');
      if (dsInput) dsInput.value = settings.digitSet;
    });
    footer.appendChild(resetBtn);
    content.appendChild(footer);

    var triggerBtn = document.createElement('button');
    triggerBtn.type = 'button';
    triggerBtn.id = 'sp-fix-btn';
    triggerBtn.title = 'DarkReader Fix settings';
    triggerBtn.textContent = '⚙';
    Object.assign(triggerBtn.style, {
      position: 'fixed', bottom: '12px', right: '12px',
      width: '36px', height: '36px',
      background: '#313244', color: '#cdd6f4',
      border: '1px solid #45475a', borderRadius: '8px',
      cursor: 'pointer', fontSize: '18px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: '900', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',   // below the native dialog scrim (z 1000) so it dims with the page
      padding: '0', lineHeight: '1',
    });
    spdrFxButton(triggerBtn);   // hover-brighten + active-depress + click flash
    // Save the digit set field and hide the panel.
    function closePanel() {
      if (panel.style.display === 'none') return;
      spdrHi.hide();
      if (buttonsAnyEnabled()) {
        var dsInput = document.getElementById('sp-digit-set-input');
        if (dsInput) {
          var cleaned = sanitizeDigitSet(dsInput.value) || settings.digitSet;
          settings.digitSet = cleaned;
          dsInput.value = cleaned;
          settings.digitSetConfirmed = true;
          settings.lastConfirmedUrl = location.href;
          saveSettings(settings);
        }
      }
      panel.style.display = 'none';
      var toast = document.getElementById('sp-remove-invalid-toast');
      if (toast) toast.style.bottom = getToastBottom();
    }

    triggerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        var toast = document.getElementById('sp-remove-invalid-toast');
        if (toast) toast.style.bottom = getToastBottom();
      } else {
        closePanel();
      }
    });

    document.addEventListener('click', function (e) {
      // Don't close when the click is inside our own popover children either
      // (notably the digit-set prompt opened from the Re-scan button — its
      // Confirm/Cancel are siblings of the panel, not inside it).
      if (panel.style.display !== 'none' &&
          !panel.contains(e.target) && e.target !== triggerBtn &&
          !(e.target.closest && e.target.closest('#sp-digit-prompt'))) {
        closePanel();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    document.body.appendChild(panel);
    document.body.appendChild(triggerBtn);
  }

  function buildEasyRegionShadeButton() {
    var auxRow = document.querySelector('.controls-aux');
    // Wait until the native undo button exists so our button appends to the RIGHT of them.
    if (!auxRow || !auxRow.querySelector('[data-control="undo"]')) return false;
    if (document.getElementById('sp-easy-shade-btn')) return true;

    // Match the style of existing controls-aux buttons.
    var refBtn    = document.querySelector('[data-control="undo"]');
    var refStyle  = refBtn ? getComputedStyle(refBtn) : null;
    var btnW      = (refBtn && refBtn.offsetWidth  > 0) ? refBtn.offsetWidth  : 64;
    var btnH      = (refBtn && refBtn.offsetHeight > 0) ? refBtn.offsetHeight : 64;
    var bgBase    = (refStyle && refStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
                      ? refStyle.backgroundColor : 'rgb(34, 36, 38)';
    // Fixed theme purple (== the native buttons' DR-converted accent #b568e4).
    // Using a literal — not a snapshot of a computed colour, and not a CSS var —
    // is what finally stopped the white↔purple flicker: snapshots race DR's
    // build-time conversion, and DR doesn't rewrite inline var() usage (it would
    // resolve to the dark background purple). A literal !important + a one-time DR
    // marker strip is stable: DR does not re-override it.
    var accentCol = 'rgb(181, 104, 228)';
    var borderCol = refStyle ? refStyle.borderColor : 'rgb(62, 68, 70)';
    var borderRad = refStyle ? refStyle.borderRadius : '8px';
    var marginVal = refStyle ? refStyle.margin       : '2.4px';

    // ── Toggle button ─────────────────────────────────────────────────────────
    var btn = document.createElement('button');
    btn.id   = 'sp-easy-shade-btn';
    btn.type = 'button';
    Object.assign(btn.style, {
      width:          btnW + 'px',
      height:         btnH + 'px',
      margin:         marginVal,
      padding:        '0',
      borderRadius:   borderRad,
      cursor:         'pointer',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      flexShrink:     '0',
      boxSizing:      'border-box',
      flexDirection:  'column',
      gap:            '3px',
    });

    var lbl = document.createElement('div');
    Object.assign(lbl.style, {
      fontSize:      '12px',
      fontWeight:    '700',
      lineHeight:    '1.3',
      textAlign:     'center',
      pointerEvents: 'none',
      whiteSpace:    'pre',
    });
    lbl.textContent = 'Easy\nShade';

    // Four swatches mirroring the current Multi-color border palette
    // (regionColorPalette0-3). They are plain coloured <div>s, not icons, so they
    // always reflect the chosen colours. setProperty !important keeps them at the
    // chosen colour; refreshSwatches re-asserts on palette change (via applySettings).
    var swatches = document.createElement('div');
    Object.assign(swatches.style, { display: 'flex', gap: '2px', pointerEvents: 'none' });
    var swatchEls = [];
    for (var _si = 0; _si < 4; _si++) {
      var sq = document.createElement('div');
      Object.assign(sq.style, { width: '8px', height: '8px', borderRadius: '1px' });
      swatches.appendChild(sq);
      swatchEls.push(sq);
    }
    function refreshSwatches() {
      var pal = [settings.regionColorPalette0, settings.regionColorPalette1,
                 settings.regionColorPalette2, settings.regionColorPalette3];
      swatchEls.forEach(function (sq, i) {
        sq.style.setProperty('background-color', pal[i] || '#888', 'important');
      });
    }
    refreshSwatches();
    easyShadeSwatchRefresh = refreshSwatches; // let applySettings keep them current
    btn.appendChild(lbl);
    btn.appendChild(swatches);

    // Mode indicator. Only shown on puzzles that have shaded regions, where the
    // button cycles Both / Regions / Shaded. On normal puzzles the border glow
    // alone conveys on/off, so this stays hidden.
    var modeLbl = document.createElement('div');
    Object.assign(modeLbl.style, {
      fontSize: '9px', fontWeight: '700', lineHeight: '1', letterSpacing: '0.3px',
      textAlign: 'center', pointerEvents: 'none', display: 'none',
    });
    btn.appendChild(modeLbl);

    // ── Opacity slider card ───────────────────────────────────────────────────
    // Floats above the button. Shows when fill is active; dismissed by clicking
    // outside or by toggling the button off.
    var card = document.createElement('div');
    card.id = 'sp-easy-shade-card';
    Object.assign(card.style, {
      position:    'fixed',
      display:     'none',
      background:  '#1e1e2e',
      color:       accentCol,   // match the buttons' accent (purple), via the live theme var
      border:      '1px solid ' + borderCol,
      borderRadius: borderRad,
      padding:     '10px 12px',
      zIndex:      '999998',
      minWidth:    '220px',
      boxShadow:   '0 4px 16px rgba(0,0,0,0.5)',
      fontFamily:  'system-ui, -apple-system, sans-serif',
    });

    var cardTextEls = [];  // text nodes we hold at the accent purple (see refreshCardText)

    var noteDiv = document.createElement('div');
    noteDiv.textContent = 'Colors can be changed in Settings under "Multi-color borders"';
    Object.assign(noteDiv.style, {
      fontSize:     '11px',
      color:        accentCol,
      lineHeight:   '1.4',
      marginBottom: '8px',
    });
    card.appendChild(noteDiv);
    cardTextEls.push(noteDiv);

    // Generic opacity row bound to one setting key. Returns the row plus a sync()
    // that refreshes the slider/percentage from current settings.
    function makeOpacityRow(labelText, key, defVal) {
      var row = document.createElement('div');
      Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' });
      var lblEl = document.createElement('span');
      lblEl.textContent = labelText;
      Object.assign(lblEl.style, { fontSize: '11px', color: accentCol, flexShrink: '0', width: '92px' });
      var sld = document.createElement('input');
      sld.type = 'range'; sld.min = '0'; sld.max = '1'; sld.step = '0.01';
      var v0 = (settings[key] != null) ? settings[key] : defVal;
      sld.value = v0;
      Object.assign(sld.style, { flex: '1', cursor: 'pointer', accentColor: accentCol, minWidth: '0' });
      var pctEl = document.createElement('span');
      pctEl.textContent = Math.round(v0 * 100) + '%';
      Object.assign(pctEl.style, { fontSize: '11px', color: accentCol, flexShrink: '0', width: '35px', textAlign: 'right' });
      sld.addEventListener('input', function () {
        var v = parseFloat(sld.value);
        settings[key] = v;
        pctEl.textContent = Math.round(v * 100) + '%';
        saveSettings(settings); applySettings();
      });
      row.appendChild(lblEl); row.appendChild(sld); row.appendChild(pctEl);
      cardTextEls.push(lblEl, pctEl);
      return { row: row, sync: function () {
        var v = (settings[key] != null) ? settings[key] : defVal;
        sld.value = v; pctEl.textContent = Math.round(v * 100) + '%';
      } };
    }

    // Region-fill opacity (always relevant). Shaded-region opacity is shown only
    // when the puzzle has shaded regions (toggled in showCard()).
    var regionOp = makeOpacityRow('Region opacity:', 'regionColorFillOpacity', 0.3);
    var shadedOp = makeOpacityRow('Shaded opacity:', 'shadedRegionColorOpacity', 0.5);
    card.appendChild(regionOp.row);
    card.appendChild(shadedOp.row);
    document.body.appendChild(card);

    // Hold the card text at the accent purple. A literal colour + !important keeps
    // it stable. Re-asserted on show.
    function refreshCardText() {
      cardTextEls.forEach(function (el) {
        el.style.setProperty('color', accentCol, 'important');
      });
    }
    refreshCardText();

    // ── Card positioning ──────────────────────────────────────────────────────
    function positionCard() {
      var r = btn.getBoundingClientRect();
      card.style.bottom = (window.innerHeight - r.top + 8) + 'px';
      card.style.right  = (window.innerWidth  - r.right)  + 'px';
      card.style.top    = 'auto';
      card.style.left   = 'auto';
    }

    function showCard() {
      // Show only the slider(s) for the active mode: Both → both, Regions →
      // region only, Shaded → shaded only.
      regionOp.row.style.display = settings.regionColorFillEnabled ? 'flex' : 'none';
      shadedOp.row.style.display = (settings.shadedRegionColorEnabled && puzzleHasShadedRegions()) ? 'flex' : 'none';
      regionOp.sync(); shadedOp.sync();
      refreshCardText();
      positionCard(); card.style.display = 'block';
    }
    function hideCard() { card.style.display = 'none'; }

    // Click outside the card and button dismisses the card (fill stays on).
    document.addEventListener('click', function (e) {
      if (card.style.display === 'none') return;
      if (card.contains(e.target) || btn.contains(e.target)) return;
      hideCard();
    }, true);

    // ── Toggle style ──────────────────────────────────────────────────────────
    function applyToggleStyle() {
      var reg    = !!settings.regionColorFillEnabled;
      var shd    = !!settings.shadedRegionColorEnabled;
      var active = reg || shd;
      btn.style.setProperty('background-color', bgBase, 'important');
      if (active) {
        btn.style.setProperty('border',     '2px solid ' + accentCol, 'important');
        btn.style.setProperty('box-shadow', '0 0 6px ' + accentCol,   'important');
      } else {
        btn.style.setProperty('border',     '1px solid ' + borderCol, 'important');
        btn.style.setProperty('box-shadow', 'none',                    'important');
        hideCard();
      }
      // Mode indicator — only meaningful on puzzles with shaded regions.
      if (active && puzzleHasShadedRegions()) {
        modeLbl.textContent = (reg && shd) ? 'Both' : (reg ? 'Regions' : 'Shaded');
        modeLbl.style.display = 'block';
      } else {
        modeLbl.style.display = 'none';
      }
      // Force the text colour on the button AND its child text divs (each is a
      // separate element, so set them all).
      [btn, lbl, modeLbl].forEach(function (el) {
        el.style.setProperty('color', accentCol, 'important');
      });
      // Keep sliders in sync with settings (e.g. after a reset).
      regionOp.sync(); shadedOp.sync();
    }

    btn.addEventListener('click', function () {
      var reg = !!settings.regionColorFillEnabled;
      var shd = !!settings.shadedRegionColorEnabled;
      if (puzzleHasShadedRegions()) {
        // 4-state cycle: off → Shaded → Regions → Both → off.
        if      (!reg && !shd) { reg = false; shd = true;  }
        else if (!reg &&  shd) { reg = true;  shd = false; }
        else if ( reg && !shd) { reg = true;  shd = true;  }
        else                   { reg = false; shd = false; }
      } else {
        // No shaded regions — simple on/off of region colours.
        reg = !reg; shd = false;
      }
      settings.regionColorFillEnabled   = reg;
      settings.shadedRegionColorEnabled = shd;
      saveSettings(settings); applySettings();
      applyToggleStyle();
      // Show the card for every active mode (Both / Regions / Shaded); only the
      // off state leaves it hidden (applyToggleStyle already called hideCard()).
      if (reg || shd) setTimeout(showCard, 0);
    });

    // Sync when the settings panel's reset button fires.
    controlSyncers['regionColorFillEnabled']    = applyToggleStyle;
    controlSyncers['shadedRegionColorEnabled']  = applyToggleStyle;
    controlSyncers['regionColorFillOpacity']    = regionOp.sync;
    controlSyncers['shadedRegionColorOpacity']  = shadedOp.sync;

    auxRow.appendChild(btn);
    spdrFxButton(btn);   // hover-brighten + active-depress + click flash

    // Visibility — controlled independently by the settings checkbox.
    function applyButtonVisibility() {
      btn.style.display = settings.showEasyShadeButton !== false ? 'flex' : 'none';
      // Keep the settings checkbox in sync if it has already been rendered.
      var visCb = document.getElementById('sp-easy-shade-vis-cb');
      if (visCb) visCb.checked = settings.showEasyShadeButton !== false;
    }
    applyButtonVisibility();
    controlSyncers['showEasyShadeButton'] = applyButtonVisibility;

    applyToggleStyle();
    // (No auto-open on load — the card opens only when the button is pressed.)

    return true;
  }

  function buildVersionLabel() {
    if (document.getElementById('sp-version-label')) return;
    var label = document.createElement('div');
    label.id = 'sp-version-label';
    Object.assign(label.style, {
      position:      'fixed',
      // Sits to the left of the 36px ⚙ button (right:12px) with an 8px gap.
      // bottom:24px vertically centres the label in the button's 36px height.
      bottom:        '24px',
      right:         '56px',   // 12px margin + 36px button + 8px gap
      color:         '#6c7086',
      fontSize:      '10px',
      fontFamily:    'system-ui, -apple-system, sans-serif',
      lineHeight:    '1.2',
      textAlign:     'right',
      pointerEvents: 'none',
      zIndex:        '900',   // below the native dialog scrim (z 1000) so it dims with the page
      whiteSpace:    'nowrap',
    });
    label.textContent = 'v' + SCRIPT_VERSION;
    document.body.appendChild(label);
  }

  // Auto-dismiss SudokuPad's start gate — the "Start Puzzle" / "Resume Puzzle"
  // modal that displays the puzzle rules on load. The rules stay visible in the
  // side panel; only the blocking modal is skipped. Controlled by the
  // suppressStartDialog setting (applies on the next page load).
  //
  // History (v2.91–v2.106, then removed): simulated mouse/pointer/touch clicks
  // on the button never worked. SudokuPad's button handler passes the button's
  // *label* string to Framework.dialogOpts.onButton, which calls .match() on it
  // — a synthetic DOM click supplies no such argument, so onButton throws.
  // And closeDialog() alone closes the modal but leaves the puzzle PAUSED
  // (timer frozen at 0:00, board covered), because the real button *resumes*
  // the timer.
  //
  // What works (verified live): replicate the real click by calling the dialog's
  // own handler with the button's label — onButton(label) starts/resumes the
  // puzzle — then closeDialog() to clear the overlay. Result is identical to a
  // genuine "Start Puzzle" click: overlay gone, puzzle unpaused and interactive.
  //
  // Poll because the modal appears during SudokuPad's async init, which can land
  // before or after buildAllUI runs. Only ever acts on a dialog whose button
  // reads "Start/Resume Puzzle", so other dialogs (solved, settings, errors)
  // are never touched.
  function suppressStartDialog() {
    if (settings.suppressStartDialog === false) return;
    var attempts = 0;
    var timer = setInterval(function () {
      attempts++;
      if (attempts > 200) { clearInterval(timer); return; }   // give up after ~10s
      if (typeof Framework === 'undefined' || !document.body.classList.contains('overlay-visible')) return;
      var btns = document.querySelectorAll('.dialog-overlay button, .dialog-options button');
      var startBtn = null;
      for (var i = 0; i < btns.length; i++) {
        if (/(start|resume)\s*puzzle/i.test(btns[i].textContent || '')) { startBtn = btns[i]; break; }
      }
      if (!startBtn) return;   // some other dialog is up — leave it alone
      var label = startBtn.textContent.trim();
      try {
        var opts = Framework.dialogOpts;
        if (opts && typeof opts.onButton === 'function') opts.onButton(label);   // = the real "Start Puzzle" action (resumes timer)
      } catch (e) { /* fall through to closeDialog */ }
      try {
        if (document.body.classList.contains('overlay-visible') && typeof Framework.closeDialog === 'function') Framework.closeDialog();
      } catch (e) {}
      clearInterval(timer);
    }, 50);
  }

  // ── Fill single candidate (endgame autocomplete) ───────────────────────────
  // Premise: SudokuPad tags a centre candidate that clashes with a placed peer
  // value with class="conflict" (verified: the re-tag is synchronous with
  // app.act value placement). So a "valid candidate" is just a non-.conflict
  // tspan in #cell-candidates — we never validate, never eliminate, and ignore
  // corner marks entirely. Placing a value naturally re-tags peers, dropping
  // cells to one valid candidate and propagating the chain.
  //
  // Cadence: select the single-candidate cell → (select delay) → place its digit
  // → (fill delay) → rescan → repeat. The undo delay paces the message's Undo
  // (re-clicks the native undo button N times). All three live in settings and are
  // live-editable in Settings → Action buttons (no reload); read at runtime.
  function fsSelectDelay() { return settings.fsSelectDelayMs != null ? settings.fsSelectDelayMs : DEFAULTS.fsSelectDelayMs; }
  function fsFillDelay()   { return settings.fsFillDelayMs   != null ? settings.fsFillDelayMs   : DEFAULTS.fsFillDelayMs; }
  function fsUndoDelay()   { return settings.fsUndoDelayMs   != null ? settings.fsUndoDelayMs   : DEFAULTS.fsUndoDelayMs; }

  // "col,row" key → human "(R<row+1>,C<col+1>)" — 1-indexed, row-first (R1C1 =
  // top-left). The only place we surface a specific cell to the player.
  function fsCellLabel(key) {
    var p = String(key).split(',');
    var col = parseInt(p[0], 10), row = parseInt(p[1], 10);
    return '(R' + (row + 1) + ',C' + (col + 1) + ')';
  }

  // Single source of run/message state.
  var fsState = {
    running: false,        // the loop is executing
    aborted: false,        // a 2nd button press requested a stop
    result: null,          // sticky post-run message: { kind, message }
    resultPinned: false,   // result toast stays until the user clicks elsewhere
    firstFill: null,       // {col,row} of the first cell we filled — anchors the Undo
    filledCount: 0,
    undoing: false,        // suppress the cell observer while WE drive undos
    postFillSnapshot: null, // snapshotPencilmarks() captured right after a run (≥1 fill);
                            // the floating button shows "Undo" only while the live puzzle
                            // still matches it (see fsUndoAvailable / fsRefreshUndoButton)
    buttonMode: 'idle',    // current floating-button mode: 'idle' | 'stop' | 'undo'
  };
  var fsObserver = null;   // watches the cell layers: revokes a pending result on edit AND
                           // shows/hides the post-run Undo button as the player leaves/returns

  function fsScanValid() {
    var map = {};
    document.querySelectorAll('#cell-candidates text.cell-candidate').forEach(function (t) {
      var ck = cellKeyFromMarkXY(t.getAttribute('x'), t.getAttribute('y'));
      var digits = [];
      t.querySelectorAll('tspan').forEach(function (sp) {
        if (!sp.classList.contains('conflict')) { var d = sp.getAttribute('data-val'); if (d) digits.push(d); }
      });
      map[ck] = digits;
    });
    return map;
  }
  // Classify every empty cell by its valid-candidate count (no marks at all → zero).
  function fsAnalyse(app) {
    var map = fsScanValid();
    var empties = [], zero = [], singles = [];
    app.puzzle.cells.forEach(function (c) {
      if (cellHasValueOrGiven(c.col, c.row)) return;
      var ck = c.col + ',' + c.row;
      var digits = map[ck] || [];
      empties.push(ck);
      if (digits.length === 0) zero.push(ck);
      else if (digits.length === 1) singles.push({ cell: c, ck: ck, digit: digits[0] });
    });
    return { empties: empties, zero: zero, singles: singles };
  }

  // Low-level toast for this feature (distinct id from the action-button toast).
  // Purely informational — the Undo affordance now lives on the floating button
  // (see fsArmUndo). NEVER auto-fades; visibility is driven by hover + pin state.
  function fsHideToast() { var t = document.getElementById('sp-fs-toast'); if (t) t.remove(); }
  function fsRenderToast(colorKind, message) {
    fsHideToast();
    var colours = {
      success: { bg: '#2d4a36', border: '#3d8b54', text: '#cdebd1' },
      warning: { bg: '#4a3f2d', border: '#a3853d', text: '#ebe1cd' },
      error:   { bg: '#4a2d2d', border: '#a33d3d', text: '#ebcdcd' },
    };
    var c = colours[colorKind] || colours.success;
    var toast = document.createElement('div');
    toast.id = 'sp-fs-toast';
    Object.assign(toast.style, {
      position: 'fixed', bottom: getToastBottom(), right: '12px', width: '320px',
      padding: '10px 12px', background: c.bg, color: c.text, border: '1px solid ' + c.border,
      borderRadius: '6px', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: '12px',
      lineHeight: '1.4', zIndex: '900', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      whiteSpace: 'pre-line', boxSizing: 'border-box',
    });
    var msg = document.createElement('div');
    msg.textContent = message;
    toast.appendChild(msg);
    document.body.appendChild(toast);
  }

  // Hover explainer (shown when idle, no pending result). Green when the function
  // would run, yellow with the blocking reason when it would not.
  function fsRenderExplainer(a) {
    var base = 'Auto-fills every empty cell that has exactly one valid (non-conflict) centre candidate, one at a time.';
    if (a.empties.length === 0) { fsRenderToast('success', base + '\n\nThe puzzle is already complete.'); return; }
    if (a.zero.length > 0) { fsRenderToast('warning', base + '\n\nNot ready: every cell in the grid needs at least one valid centre candidate before it can be used.'); return; }
    if (a.singles.length === 0) { fsRenderToast('warning', base + '\n\nNot ready: no cell has exactly one valid candidate yet.'); return; }
    fsRenderToast('success', base + '\n\nReady — click to run.');
  }
  // Persistent "running" popup — shown for the WHOLE auto-fill run, independent of
  // the mouse (the runner renders it at start; the mouseleave handler + fsShowOnHover
  // both leave it alone while fsState.running). Replaced by the result toast at the end.
  function fsRenderRunning() {
    fsRenderToast('success', 'Auto-fill is running…\n\nClick here (or the Stop button) to abort.');
    var t = document.getElementById('sp-fs-toast');
    if (t) {
      t.style.cursor = 'pointer';
      t.title = 'Click to stop the auto-fill';
      // Clicking anywhere on the toast aborts, same as pressing Stop. Guarded by
      // fsState.running so a debug-preview of this popup (no live run) is inert.
      t.addEventListener('click', function () { if (fsState.running) fsState.aborted = true; });
    }
  }
  // Post-run message text per terminal kind — shared by the runner and the debug
  // cycler so they never drift. The broken case names the offending cell.
  function fsResultMessage(kind, n, cellKey) {
    var pl = n === 1 ? '' : 's';
    if (kind === 'complete') return 'Done — auto-filled ' + n + ' cell' + pl + '. Puzzle complete.';
    if (kind === 'stuck')    return 'Stopped — no cell has a single valid candidate. Filled ' + n + ' cell' + pl + '; more information needed.';
    if (kind === 'broken')   return 'Stopped — cell ' + fsCellLabel(cellKey) + ' has no valid candidates left, likely a mistake or incomplete pencilmarks. Filled ' + n + ' cell' + pl + ' before stopping.';
    return 'You stopped the auto-fill after ' + n + ' cell' + pl + '.';   // stopped
  }

  // Debug preview: cycle through EVERY popup the script can show — both the
  // Auto-fill (Fill-single) explainer/result states AND the action-button toasts
  // (Fill / Clear / Clear All / Remove invalid) — without engineering a puzzle
  // into each condition. Each entry renders one popup exactly as it appears in
  // real use. The worker-result toasts are produced by calling the real
  // showWorkerResult() with a synthetic result object, so their text never drifts
  // from production. (Undo in a previewed result is inert — there is no real run
  // to rewind. fsPreviewActive forces every toast to show + persist above the panel.)
  //
  // A representative aborted action-toast target (centre 4 from cell (R4,C3)):
  // cellKeyFromMarkXY('160','224') → col 2, row 3 → fsCellLabel "(R4,C3)".
  var fsDebugList = [
    // ── Auto-fill (Fill-single) popups ───────────────────────────────────────
    function () { fsRenderExplainer({ empties: ['x'], zero: [], singles: ['x'] }); },        // explainer: ready (green)
    function () { fsRenderExplainer({ empties: [], zero: [], singles: [] }); },              // explainer: already complete (green)
    function () { fsRenderExplainer({ empties: ['x'], zero: ['x'], singles: [] }); },        // explainer: not ready — a zero-candidate cell (yellow)
    function () { fsRenderExplainer({ empties: ['x', 'y'], zero: [], singles: [] }); },      // explainer: not ready — no single (yellow)
    function () { fsRenderRunning(); },                                                      // running: persistent "click Stop" popup (yellow)
    function () { fsRenderToast('success', fsResultMessage('complete', 12)); },          // result: complete (green)
    function () { fsRenderToast('warning', fsResultMessage('stuck', 5)); },              // result: stuck (yellow)
    function () { fsRenderToast('error',   fsResultMessage('broken', 7, '5,3')); },      // result: broken (red)
    function () { fsRenderToast('warning', fsResultMessage('stopped', 3)); },            // result: user-stopped (yellow)

    // ── Action-button popups: direct toasts ──────────────────────────────────
    // (No "busy" popup: the 3 fill/clear buttons finish in a fraction of a second
    //  and are simply locked out on a rapid double-click — silently, no toast.)
    function () { showRemoveInvalidToast('No cells selected.', 'success'); },                         // Fill with nothing selected (green)
    function () { showRemoveInvalidToast('No marks cleared (no cells selected).', 'success'); },      // Clear marks with nothing selected (green)

    // ── Action-button popups: worker results (real showWorkerResult text) ─────
    function () { showWorkerResult({ totalTargets: 0, skippedExcluded: 0, elapsedMs: 0, failures: [] }, 'invalid pencilmarks'); },                                  // nothing to remove (green)
    function () { showWorkerResult({ totalTargets: 8, removed: 8, skippedExcluded: 0, aborted: false, elapsedMs: 1230, failures: [] }, 'invalid pencilmarks'); },   // removed N (green)
    function () { showWorkerResult({ totalTargets: 8, removed: 8, skippedExcluded: 2, aborted: false, elapsedMs: 1230, failures: [] }, 'invalid pencilmarks'); },   // removed N + skipped-not-in-set (green)
    function () { showWorkerResult({ totalTargets: 8, removed: 8, skippedExcluded: 0, aborted: false, elapsedMs: 1230, failures: [{}, {}] }, 'invalid pencilmarks'); }, // removed N + non-fatal issues (yellow)
    function () { showWorkerResult({ totalTargets: 10, aborted: true, fullyReverted: true,  abortTarget: { type: 'centre', digit: '4', cellX: '160', cellY: '224' }, elapsedMs: 1230 }, 'invalid pencilmarks'); },   // aborted, fully reverted (yellow)
    function () { showWorkerResult({ totalTargets: 10, aborted: true, fullyReverted: false, abortTarget: { type: 'centre', digit: '4', cellX: '160', cellY: '224' }, elapsedMs: 1230 }, 'invalid pencilmarks'); },   // aborted, revert FAILED (red)

    // ── Action-button popups: Fill button ─────────────────────────────────────
    function () { showRemoveInvalidToast('Filled 12 candidates in 4 cells, removed 3 invalid marks (1.45s).', 'success'); },                                                                                                                              // fill complete (green)
    function () { showRemoveInvalidToast('Stopped while filling candidates — an unexpected change occurred. All changes were reverted: the puzzle is back to exactly how it was before you pressed the button.', 'warning'); },                            // fill aborted, reverted (yellow)
    function () { showRemoveInvalidToast('CRITICAL — an unexpected change occurred while filling candidates and it could NOT be fully reverted. Press Ctrl+Z until the puzzle looks right.', 'error'); },                                                  // fill aborted, revert FAILED (red)
    function () { showRemoveInvalidToast('Filled the candidates, then hit an unexpected change during the cleanup sweep at centre 4 in cell (R4,C3). All changes were reverted, including the fill: the puzzle is back to exactly how it was before you pressed the button.', 'warning'); },  // fill ok, sweep aborted, reverted (yellow)
    function () { showRemoveInvalidToast('CRITICAL — an unexpected change occurred during the cleanup sweep at centre 4 in cell (R4,C3) and it could NOT be fully reverted. Press Ctrl+Z until the puzzle looks right.', 'error'); },                      // fill ok, sweep aborted, revert FAILED (red)
  ];
  var fsDebugIdx = 0;
  function fsDebugShowNext() {
    fsClearResult();                       // clear any real sticky state + the fs-toast so the preview shows cleanly
    var prevAction = document.getElementById('sp-remove-invalid-toast');
    if (prevAction) prevAction.remove();   // clear a prior action-toast preview (so fs↔action cycling doesn't stack)
    fsPreviewActive = true;
    try { fsDebugList[fsDebugIdx](); }     // action toasts self-bump z-index + skip auto-fade while fsPreviewActive
    finally { fsPreviewActive = false; }
    var t = document.getElementById('sp-fs-toast');
    if (t) t.style.zIndex = '1000000';     // above our own settings panel (the debug button lives in it)
    fsDebugIdx = (fsDebugIdx + 1) % fsDebugList.length;
    return fsDebugIdx + 1;                 // 1-based index of the NEXT popup (for the button label)
  }

  // Render the current sticky result toast (no running-guard — used both for the
  // auto-popup the moment a stop condition fires AND for re-show on hover).
  function fsRenderResult() {
    var r = fsState.result;
    if (!r) return;
    var col = r.kind === 'complete' ? 'success' : (r.kind === 'broken' ? 'error' : 'warning');
    fsRenderToast(col, r.message);
  }
  async function fsShowOnHover() {
    if (fsState.running) return;                              // button reads "Stop"; no popup mid-run
    if (fsState.buttonMode === 'undo') { fsRenderUndoExplainer(); return; }  // button reads "Undo"; explain the undo, not a run
    if (fsState.result) { fsState.resultPinned = true; fsRenderResult(); return; } // re-show a sticky result AND re-pin it (stays until the next click-elsewhere)
    var app = await Framework.getApp();
    fsRenderExplainer(fsAnalyse(app));
  }
  // Hover popup while the button is the post-run "Undo": prefer the outcome message
  // (it has the count + context); otherwise (the button RETURNED via native-undo, so
  // the one-shot message is long gone) a short generic explanation.
  function fsRenderUndoExplainer() {
    if (fsState.result) { fsState.resultPinned = true; fsRenderResult(); return; }
    var n = fsState.filledCount;
    fsRenderToast('success', 'Click to undo the auto-fill — it removes the ' + n + ' digit' + (n === 1 ? '' : 's') +
      ' it placed.\n\nStays available while the puzzle still matches the auto-filled state.');
  }

  // ── Cell observer + post-run lifecycle ─────────────────────────────────────
  // One MutationObserver on the cell layers does double duty: (1) revoke a pending
  // one-shot result toast the moment the player edits, and (2) drive the persistent
  // "Undo" button — shown only while the live puzzle still matches the snapshot we
  // took right after the run, so it disappears on any edit and RETURNS if the player
  // native-undoes back to that state. Active whenever a result OR an armed undo exists.
  function fsStartCellObserver() {
    if (fsObserver) return;
    var targets = ['#cell-values', '#cell-candidates', '#cell-pencilmarks']
      .map(function (s) { return document.querySelector(s); }).filter(Boolean);
    if (!targets.length) return;
    fsObserver = new MutationObserver(function () {
      if (fsState.undoing) return;          // ignore our own undo-driven mutations
      if (fsState.result) fsClearResult();  // one-shot outcome toast: gone on first edit
      fsRefreshUndoButton();                // button: "Undo" iff state still matches the snapshot
    });
    targets.forEach(function (t) { fsObserver.observe(t, { childList: true, subtree: true, characterData: true }); });
  }
  function fsStopCellObserver() { if (fsObserver) { fsObserver.disconnect(); fsObserver = null; } }
  function fsSyncObserver() {
    if (fsState.result || fsState.postFillSnapshot) fsStartCellObserver();
    else fsStopCellObserver();
  }
  function fsSetResult(kind, message) {
    fsState.result = { kind: kind, message: message };
    fsState.resultPinned = true;
    fsSyncObserver();
    // Respect the "Show action result notifications" setting (settings.showToasts) for
    // the auto-pop. Exception: a 'broken' result (a cell has NO valid candidates left)
    // is an error the player must see, so it always pops — same policy as the
    // action-button toasts. When suppressed, the result is still stored (and re-appears
    // on hover); we just drop the lingering "running" popup so it doesn't stay up.
    if (settings.showToasts !== false || kind === 'broken') {
      fsRenderResult();   // auto-show now (running may still be true here, so don't route via fsShowOnHover)
    } else {
      fsHideToast();      // toasts off: remove the "Auto-fill is running…" popup
    }
  }
  function fsClearResult() {
    fsState.result = null;
    fsState.resultPinned = false;
    fsSyncObserver();     // keep observing if an Undo is still armed
    fsHideToast();
  }

  // The post-run Undo lives on the floating button. It is offered exactly while the
  // live puzzle still equals fsState.postFillSnapshot — captured right after the run.
  function fsUndoAvailable() {
    if (!fsState.postFillSnapshot || !fsState.firstFill || !fsState.filledCount) return false;
    return diffEmpty(diffSnapshots(fsState.postFillSnapshot, snapshotPencilmarks()));
  }
  function fsRefreshUndoButton() {
    if (fsState.running) return;   // 'Stop' owns the button mid-run
    fsSetButtonLabel(fsUndoAvailable() ? 'undo' : 'idle');
  }
  // Arm the post-run Undo: snapshot the auto-filled state, start watching, show "Undo".
  function fsArmUndo() {
    fsState.postFillSnapshot = snapshotPencilmarks();
    fsSyncObserver();
    fsRefreshUndoButton();
  }
  // Retire it: forget the snapshot, stop watching (unless a result lingers), normal label.
  function fsDisarmUndo() {
    fsState.postFillSnapshot = null;
    fsSyncObserver();
    fsRefreshUndoButton();
  }

  // Rewind exactly our run: re-click the native undo button until the FIRST cell
  // we filled is empty again (LIFO ⇒ that undoes all our placements, candidates
  // restored), capped at filledCount so a stuck state can't loop forever. Only
  // reachable while the button reads "Undo" (i.e. state == snapshot), so our fills
  // are the top of the undo stack and this undoes them and nothing else.
  async function fsDoUndo() {
    if (fsState.undoing || !fsState.postFillSnapshot) return;
    var first = fsState.firstFill, max = fsState.filledCount;
    if (!first || !max) { fsDisarmUndo(); return; }
    fsState.undoing = true;
    fsClearResult();   // drop any lingering outcome toast
    var undoBtn = getModeButton('undo');
    var i = 0;
    while (i < max && cellHasValueOrGiven(first.col, first.row)) {
      if (undoBtn) dispatchClickEl(undoBtn);
      else { var app = await Framework.getApp(); app.act({ type: 'undo' }); }
      i++;
      await sleep(fsUndoDelay());
    }
    fsState.undoing = false;
    fsDisarmUndo();    // auto-fill rewound → retire the Undo affordance
  }

  function fsSetButtonLabel(mode) {
    fsState.buttonMode = mode;
    var btn = document.getElementById('sp-fill-single-btn');
    if (!btn) return;
    if (mode === 'stop') {
      btn.style.whiteSpace = 'nowrap';
      btn.style.fontSize   = '15px';
      btn.textContent      = 'Stop';
      btn.title            = 'Stop the auto-fill';
    } else if (mode === 'undo') {
      btn.style.whiteSpace = 'nowrap';
      btn.style.fontSize   = '15px';
      btn.textContent      = 'Undo';
      btn.title            = 'Undo the auto-fill (removes the digits it placed). Stays here until you change the puzzle.';
    } else {
      btn.style.whiteSpace = 'pre-line';   // honour the explicit line breaks
      btn.style.fontSize   = '9px';        // small enough that 4 lines fit the square
      btn.textContent      = 'Auto-fill\nany single\ncandidate\ncells';
      btn.title            = 'Auto-fill cells that currently have a single valid (non-conflict) candidate';
    }
  }

  async function fillSingleCandidates() {
    if (fsState.running) { fsState.aborted = true; return; }   // 2nd press = Stop
    if (actionInProgress) { return; }                          // another action owns the lock

    var app = await Framework.getApp();
    var cellByKey = {};
    app.puzzle.cells.forEach(function (c) { cellByKey[c.col + ',' + c.row] = c; });

    // Pre-run gate. When unmet, just (re-)show the explainer — it already states
    // the reason; do not start. (No separate toast → no double-stacking.)
    var a0 = fsAnalyse(app);
    if (a0.empties.length === 0 || a0.zero.length > 0 || a0.singles.length === 0) {
      fsClearResult();
      fsRenderExplainer(a0);
      return;
    }

    fsClearResult();                 // drop any prior sticky result
    fsDisarmUndo();                  // supersede any prior armed Undo (this run replaces it)
    fsState.running = true;
    fsState.aborted = false;
    fsState.filledCount = 0;
    fsState.firstFill = null;
    actionInProgress = true;
    fsSetButtonLabel('stop');
    fsRenderRunning();   // persistent "click Stop to abort" popup for the whole run (finish() replaces it with the result)

    // Build the sticky result for the terminal condition we hit.
    function finish(kind, zeroKey) {
      var n = fsState.filledCount;
      if (kind === 'broken') {
        app.deselect();
        if (cellByKey[zeroKey]) app.select([cellByKey[zeroKey]]);   // park the selection on the offending cell
      }
      fsSetResult(kind, fsResultMessage(kind, n, zeroKey));
    }

    try {
      while (true) {
        if (fsState.aborted) { finish('stopped'); break; }
        var a = fsAnalyse(app);
        if (a.empties.length === 0) { finish('complete'); break; }
        if (a.zero.length > 0)      { finish('broken', a.zero[0]); break; }
        if (a.singles.length === 0) { finish('stuck'); break; }
        var next = a.singles[0];
        app.deselect();
        app.select([next.cell]);                // pre-select so the user sees it before it fills
        await sleep(fsSelectDelay());
        if (fsState.aborted) { finish('stopped'); break; }
        app.act({ type: 'value', arg: next.digit });
        if (fsState.filledCount === 0) fsState.firstFill = { col: next.cell.col, row: next.cell.row };
        fsState.filledCount++;
        await sleep(fsFillDelay());
      }
    } finally {
      fsState.running = false;
      actionInProgress = false;
      // Anything placed → the button becomes "Undo" (stays while the state holds, returns
      // if the player native-undoes back to it). Nothing placed → normal label.
      if (fsState.filledCount > 0) fsArmUndo();
      else fsDisarmUndo();
    }
  }

  // Standalone floating square button styled like the Fill/Clear/Clear All action
  // buttons (same colours/border/radius/flash), parked just above the ⚙ settings
  // gear. zIndex 900 (below the native dialog scrim at 1000) so it dims with the
  // rest of the page when the native settings dialog is open. Toggles to "Stop"
  // while running; hover shows a state-aware explainer / sticky result.
  function buildFillSingleButton() {
    if (document.getElementById('sp-fill-single-btn')) return;
    // Visual tokens copied from buildActionButton so it matches the trio.
    var colorRefBtn = document.querySelector('[data-control="pen"]') ||
                      document.querySelector('[data-control="corner"]') ||
                      document.querySelector('[data-control="centre"]') ||
                      document.querySelector('[data-control="normal"]');
    var colorRefStyle = colorRefBtn ? getComputedStyle(colorRefBtn) : null;
    var bgColor   = (colorRefStyle && colorRefStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
                      ? colorRefStyle.backgroundColor : 'rgb(34, 36, 38)';
    var textColor = 'rgb(181, 104, 228)';                                  // literal theme purple (stable; see buildActionButton)
    var borderCol = colorRefStyle ? colorRefStyle.borderColor : 'rgb(62, 68, 70)';
    var sizePx    = (colorRefBtn && colorRefBtn.offsetWidth > 0) ? colorRefBtn.offsetWidth : 56;  // square, matches a control button

    var btn = document.createElement('button');
    btn.id    = 'sp-fill-single-btn';
    btn.type  = 'button';
    btn.title = 'Auto-fill cells that currently have a single valid (non-conflict) candidate';
    Object.assign(btn.style, {
      position:   'fixed',
      bottom:     '56px',          // 12px gear margin + 36px gear height + 8px gap → sits above the gear
      right:      '12px',          // right-aligned over the gear
      width:      sizePx + 'px',   // square, like the trio
      height:     sizePx + 'px',
      padding:    '2px',
      borderRadius: '8px',
      cursor:     'pointer',
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: '700',
      lineHeight: '1.12',
      textAlign:  'center',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex:     '900',           // below the native dialog scrim (z 1000) so it dims with the page
      boxShadow:  '0 2px 8px rgba(0,0,0,0.4)',
      boxSizing:  'border-box',
    });
    btn.style.setProperty('background-color', bgColor, 'important');
    btn.style.setProperty('color', textColor, 'important');
    btn.style.setProperty('border', '1px solid ' + borderCol, 'important');
    spdrFxButton(btn);          // hover-brighten + active-depress + click flash
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      // While running, a click is a Stop request (fillSingleCandidates sets aborted).
      // Post-run, the button is "Undo" → rewind the auto-fill. Otherwise → run.
      if (!fsState.running && fsState.buttonMode === 'undo') fsDoUndo();
      else fillSingleCandidates();
    });
    btn.addEventListener('mouseenter', function () { fsShowOnHover(); });
    btn.addEventListener('mouseleave', function () { if (!fsState.resultPinned && !fsState.running) fsHideToast(); });   // keep the running popup up regardless of mouse position
    document.body.appendChild(btn);
    fsSetButtonLabel('idle');   // sets the 4-line label + font/white-space — AFTER append (it looks the button up by id)

    // Visibility — toggled by the Settings checkbox (controlSyncer keeps it in sync).
    function fsApplyVisibility() { btn.style.display = settings.showFillSingleButton !== false ? 'flex' : 'none'; }
    fsApplyVisibility();
    controlSyncers['showFillSingleButton'] = fsApplyVisibility;

    // A click anywhere outside the button + its toast unpins a sticky result
    // (it stays available on re-hover until the puzzle is edited).
    document.addEventListener('click', function (e) {
      if (!fsState.resultPinned) return;
      var toast = document.getElementById('sp-fs-toast');
      if (btn.contains(e.target)) return;
      if (toast && toast.contains(e.target)) return;
      fsState.resultPinned = false;
      fsHideToast();
    });

    // Re-measure once the control buttons' CSS has settled (offsetWidth can read
    // 0 / a pre-CSS value at first paint), so the square ends up the right size.
    function resize() {
      var ref = document.querySelector('[data-control="pen"]') ||
                document.querySelector('[data-control="corner"]') ||
                document.querySelector('[data-control="centre"]') ||
                document.querySelector('[data-control="normal"]');
      if (ref && ref.offsetWidth > 0) {
        btn.style.width  = ref.offsetWidth + 'px';
        btn.style.height = ref.offsetWidth + 'px';
      }
    }
    setTimeout(resize, 100);
    setTimeout(resize, 500);
  }

  // Floating "Validate Constraints" button — sits above the Auto-fill button in the
  // bottom-right cluster (gear → Auto-fill → Validate). Wider than the square trio so
  // its label fits; the full description is the native hover tooltip. Clicking it
  // TOGGLES the validator popup menu (toggleValidateMenu), which stays open until
  // the button is clicked again.
  function buildValidateButton() {
    if (document.getElementById('sp-validate-btn')) return;
    var colorRefBtn = document.querySelector('[data-control="pen"]') ||
                      document.querySelector('[data-control="corner"]') ||
                      document.querySelector('[data-control="centre"]') ||
                      document.querySelector('[data-control="normal"]');
    var colorRefStyle = colorRefBtn ? getComputedStyle(colorRefBtn) : null;
    var bgColor   = (colorRefStyle && colorRefStyle.backgroundColor !== 'rgba(0, 0, 0, 0)')
                      ? colorRefStyle.backgroundColor : 'rgb(34, 36, 38)';
    var textColor = 'rgb(181, 104, 228)';                                  // literal theme purple (stable; see buildActionButton)
    var borderCol = colorRefStyle ? colorRefStyle.borderColor : 'rgb(62, 68, 70)';

    var btn = document.createElement('button');
    btn.id    = 'sp-validate-btn';
    btn.type  = 'button';
    btn.title = 'Validate constraints — toggles a menu of the validators this puzzle supports (Kropki dots, cages, little killers, …), with "Run all until stable" and "Validate selection only" modes';
    btn.textContent = 'Validate Constraints';
    Object.assign(btn.style, {
      position:   'fixed',
      bottom:     '120px',         // above the Auto-fill button (bottom:56px, 56px tall) with an 8px gap
      right:      '12px',          // right edge aligns with the gear / Auto-fill column
      height:     '36px',
      padding:    '0 12px',
      borderRadius: '8px',
      cursor:     'pointer',
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: '700',
      fontSize:   '13px',
      lineHeight: '1.2',
      whiteSpace: 'nowrap',
      display:    'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex:     '900',           // below the native dialog scrim (z 1000) so it dims with the page
      boxShadow:  '0 2px 8px rgba(0,0,0,0.4)',
      boxSizing:  'border-box',
    });
    btn.style.setProperty('background-color', bgColor, 'important');
    btn.style.setProperty('color', textColor, 'important');
    btn.style.setProperty('border', '1px solid ' + borderCol, 'important');
    spdrFxButton(btn);          // hover-brighten + active-depress + click flash
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggleValidateMenu(); });
    document.body.appendChild(btn);

    // Post-run Undo button — sits just LEFT of the Validate button, hidden until a
    // validator run removes candidates (see validatorArmUndo / validatorRefreshUndoButton).
    var ubtn = document.createElement('button');
    ubtn.id    = 'sp-validate-undo-btn';
    ubtn.type  = 'button';
    ubtn.title = 'Undo the last validator run — restores the candidates it removed. Stays here until you change the puzzle; if you Ctrl+Z back to this point it returns.';
    ubtn.textContent = 'Undo';
    Object.assign(ubtn.style, {
      position: 'fixed', bottom: '120px', right: '200px',   // right is recomputed when shown
      height: '36px', padding: '0 12px', borderRadius: '8px', cursor: 'pointer',
      fontFamily: 'Roboto, Arial, sans-serif', fontWeight: '700', fontSize: '13px',
      lineHeight: '1.2', whiteSpace: 'nowrap', display: 'none',
      alignItems: 'center', justifyContent: 'center', zIndex: '900',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)', boxSizing: 'border-box',
    });
    ubtn.style.setProperty('background-color', bgColor, 'important');
    ubtn.style.setProperty('color', textColor, 'important');
    ubtn.style.setProperty('border', '1px solid ' + borderCol, 'important');
    spdrFxButton(ubtn);
    ubtn.addEventListener('click', function (e) { e.stopPropagation(); validatorDoUndo(); });
    document.body.appendChild(ubtn);

    function applyVisibility() {
      btn.style.display = settings.showValidateButton !== false ? 'flex' : 'none';
      validatorRefreshUndoButton();   // the Undo button follows the same setting + its arm state
    }
    applyVisibility();
    controlSyncers['showValidateButton'] = applyVisibility;
  }

  function buildAllUI() {
    suppressStartDialog();
    buildVersionLabel();
    buildFillSingleButton();
    buildValidateButton();
    buildSettingsUI();
    // Selection-border offset observer is feature-independent of DarkReader
    // (works the same in light themes), so start it here rather than gating
    // on isDarkReader() like the SVG-fix observers do.
    startSelectionBorderObserver();
    if (!buildActionButtons()) {
      var attempts = 0;
      var timer = setInterval(function () {
        attempts++;
        if (buildActionButtons() || attempts > 100) clearInterval(timer);
      }, 100);
    }
    if (!buildEasyRegionShadeButton()) {
      var attempts2 = 0;
      var timer2 = setInterval(function () {
        attempts2++;
        if (buildEasyRegionShadeButton() || attempts2 > 100) clearInterval(timer2);
      }, 100);
    }
    if (!darkenInlineToolButtons()) {
      var attempts3 = 0;
      var timer3 = setInterval(function () {
        attempts3++;
        if (darkenInlineToolButtons() || attempts3 > 100) clearInterval(timer3);
      }, 100);
    }
  }
  if (document.body) buildAllUI();
  else document.addEventListener('DOMContentLoaded', buildAllUI);

  // Kick off the dark-fix SVG pipeline LAST. waitForDRAndSVG() can run
  // startLabelRectPatch() synchronously (when the board is already present on a
  // fast load), and that chain touches module state declared throughout this IIFE
  // (e.g. _domShadedCache ~L1960, _modelRegionCache). Invoking it mid-file (its
  // former spot ~L1798) raced var-initialization: a fast puzzle load (e.g.
  // fetchPuzzle ~19ms on a cached puzzle) aborted the whole IIFE with "Cannot read
  // properties of undefined (reading 'key')" in getDomShadedRegionMap — black
  // board, no buttons, no panel. Running it here, after every declaration, removes
  // the race. (Only surfaced with Shaded mode enabled; extraRegionRectColor
  // early-returns otherwise.)
  waitForDRAndSVG();

})();
