// ==UserScript==
// @name         SudokuPad – DarkReader Fix
// @namespace    https://sudokupad.app/
// @version      2.141.0
// @description  Fixes DarkReader/dark-theme visual issues on sudokupad.app. Section defaults match the on-screen colours so enabling a section produces no visible change — the user sees their starting point and tweaks from there.
// @author       VitaKaninen
// @match        https://sudokupad.app/*
// @match        https://beta.sudokupad.app/*
// @match        https://app.crackingthecryptic.com/*
// @match        https://crackingthecryptic.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  // crackingthecryptic.com hosts many non-puzzle pages; only activate when a
  // puzzle is loaded (identified by the presence of an "id" query parameter).
  if (location.hostname === 'crackingthecryptic.com' && !location.search.includes('id=')) return;

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

  var SCRIPT_VERSION = '2.141.0';
  // Expose on window so we (or a test harness) can verify the loaded version
  // with one query — no DOM walk, no screenshot. Just: window.spdrVersion.
  window.spdrVersion = SCRIPT_VERSION;

  var SETTINGS_KEY = 'sp-darkreader-fix';

  var DEFAULTS = {
    regionBorderEnabled:           true,
    regionBorderColor:             '#000000',   // black — center border default
    regionBorderOpacity:           1.0,
    regionBorderWidth:             '3',
    regionBorderCenterEnabled:     true,    // center border: single-color CSS stroke on region outlines
    regionBorderMultiEnabled:      true,    // multi-color border: colored rect borders per region

    givenEnabled:                  false,
    givenColor:                    '#e8e6e3',
    givenOpacity:                  1.0,

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
    underlayStrokeLightness:       0.5,   // 0..1; stroke (shape outline): same axis as fill lightness
    underlayStrokeLightnessEnabled:true,

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

    selectionColorEnabled:        false,
    selectionColor:               '#3399ff',
    selectionOpacity:             0.7,
    selectionWidth:               '8',
    selectionBorderMode:          'inside',  // 'inside' | 'outside'
    selectionBorderOffset:        '0',       // displayed value; baseline shift is mode-specific (see computeSelectionShift)

    showToasts:                   true,   // show action result notifications (toasts)
    toastPersist:                 false,  // keep action toasts until dismissed (default: auto-fade after 2s)
    showEasyShadeButton:          true,   // show/hide the Easy Shade button in the controls bar
    suppressStartDialog:          true,   // auto-dismiss SudokuPad's "Start/Resume Puzzle" rules popup on load

    regionColorPalette0:          '#e05252',  // red
    regionColorPalette1:          '#5294e0',  // blue
    regionColorPalette2:          '#52a84e',  // green
    regionColorPalette3:          '#e8a030',  // orange
    regionColorStripeWidth:       4,          // px per side stripe
    regionColorOpacity:           1.0,        // opacity of border stripes
    regionColorFillEnabled:       false,      // fill entire cell backgrounds with region colors
    regionColorFillOpacity:       0.3,        // opacity of cell-fill backgrounds (independent of border opacity)

    shadedRegionColorEnabled:     false,      // recolor puzzle "extra region" grey shadings (#cages path.cage-extraregion) with the region palette
    shadedRegionColorOpacity:     0.5,        // opacity of the recolored shaded-region fills

    cellColorsOpacity:            0.5,        // 0..1; opacity of #cell-colors (puzzle-defined colored cells)
    cellColorsOpacityEnabled:     false,      // override #cell-colors opacity when true
  };

  function loadSettings() {
    try {
      var stored = localStorage.getItem(SETTINGS_KEY);
      var merged = stored ? Object.assign({}, DEFAULTS, JSON.parse(stored)) : Object.assign({}, DEFAULTS);
      // Strip any letters from a digit set saved by an older version of the
      // script that allowed alphanumerics. Falls back to default if empty.
      var cleanedDigits = (merged.digitSet || '').split('').filter(function (c) { return /^[0-9]$/.test(c); }).join('');
      merged.digitSet = cleanedDigits || DEFAULTS.digitSet;
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
    // to bypass DarkReader's CSS-rule colour shifting — same approach as the
    // center/corner pencilmarks.

    if (s.labelBgEnabled) {
      var bg = hexToRgba(s.labelBgColor, s.labelBgOpacity);
      css += `
      html[data-darkreader-scheme="dark"] #svgrenderer rect.cage-label,
      html[data-darkreader-scheme="dark"] #svgrenderer rect.textbg,
      html[data-darkreader-scheme="dark"] #svgrenderer rect[fill="#FFFFFF"]:not(#underlay *),
      html[data-darkreader-scheme="dark"] #svgrenderer rect[fill="#ffffff"]:not(#underlay *),
      html[data-darkreader-scheme="dark"] #svgrenderer rect[fill="white"]:not(#underlay *),
      html:not([data-darkreader-scheme="dark"]) body.setting-uitheme-purple #svgrenderer rect.textbg,
      html:not([data-darkreader-scheme="dark"]) body.setting-uitheme-purple #svgrenderer rect.cage-label,
      html:not([data-darkreader-scheme="dark"]) body.setting-uitheme-purple #svgrenderer rect[fill="#FFFFFF"]:not(#underlay *),
      html:not([data-darkreader-scheme="dark"]) body.setting-uitheme-purple #svgrenderer rect[fill="#ffffff"]:not(#underlay *),
      html:not([data-darkreader-scheme="dark"]) body.setting-uitheme-purple #svgrenderer rect[fill="white"]:not(#underlay *) {
        fill: ${bg} !important;
      }`;
    }

    // Note: center/corner pencilmark *colours* are applied via inline style on
    // each element (see fixCenterTspan / fixCornerText below). This bypasses
    // DarkReader's CSS-rule colour conversion that would otherwise lift our
    // values into a different shade. Hide-invalid stays as CSS because
    // display:none isn't affected by DR.
    if (s.centerEnabled && s.centerHideInvalid) {
      css += `
      #cell-candidates tspan.conflict { display: none !important; }`;
    }
    if (s.cornerEnabled && s.cornerHideInvalid) {
      css += `
      #cell-pencilmarks text.conflict { display: none !important; }`;
    }

    if (s.selectionColorEnabled) {
      // The visible "selection border" is the SudokuPad path.cage-selectioncage
      // — the stroke around the perimeter of the selected group. The per-cell
      // rect.cell-highlight fill behind it is dominated visually by this border,
      // so users see the border colour as "the selection colour."
      var sc = hexToRgba(s.selectionColor, s.selectionOpacity);
      var sw = parseFloat(s.selectionWidth);
      if (!isFinite(sw) || sw < 0) sw = 8;
      css += `
      #cell-highlights path.cage-selectioncage {
        stroke: ${sc} !important;
        stroke-width: ${sw}px !important;
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

    // Always-on: colour-swatch palette restoration (DR overrides --cell-color-N).
    // The selector repeats the attribute ([…][data-darkreader-scheme]) to raise
    // specificity to (0,2,1), above DarkReader's own (0,1,1) --cell-color rules.
    // (This is a load-timing race — DR can momentarily win while it processes; a
    // reload clears it. We don't try to keep our <style> last: DR inserts a
    // darkreader--sync sheet after EVERY <style> including ours, so that fight is
    // unwinnable and only causes thrash.)
    css += `
    html[data-darkreader-scheme="dark"][data-darkreader-scheme] {
      --cell-color-0: transparent !important;
      --cell-color-1: rgb(214, 214, 214) !important;
      --cell-color-2: rgb(124, 124, 124) !important;
      --cell-color-3: rgb(0, 0, 0) !important;
      --cell-color-4: rgb(179, 229, 106) !important;
      --cell-color-5: rgb(232, 124, 241) !important;
      --cell-color-6: rgb(228, 150, 50) !important;
      --cell-color-7: rgb(245, 58, 55) !important;
      --cell-color-8: rgb(252, 235, 63) !important;
      --cell-color-9: rgb(61, 153, 245) !important;
      --cell-color-a: transparent !important;
      --cell-color-b: rgb(204, 51, 17) !important;
      --cell-color-c: rgb(17, 119, 51) !important;
      --cell-color-d: rgb(0, 68, 196) !important;
      --cell-color-e: rgb(238, 153, 170) !important;
      --cell-color-f: rgb(255, 255, 25) !important;
      --cell-color-g: rgb(240, 70, 240) !important;
      --cell-color-h: rgb(160, 90, 30) !important;
      --cell-color-i: rgb(51, 187, 238) !important;
      --cell-color-j: rgb(145, 30, 180) !important;
      --cell-color-k: transparent !important;
      --cell-color-l: rgb(245, 58, 55) !important;
      --cell-color-m: rgb(76, 175, 80) !important;
      --cell-color-n: rgb(61, 153, 245) !important;
      --cell-color-o: rgb(249, 136, 134) !important;
      --cell-color-p: rgb(149, 208, 151) !important;
      --cell-color-q: rgb(158, 204, 250) !important;
      --cell-color-r: rgb(170, 12, 9) !important;
      --cell-color-s: rgb(47, 106, 49) !important;
      --cell-color-t: rgb(9, 89, 170) !important;
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
  function applySettings() {
    rebuildStyleTag();
    if (easyShadeSwatchRefresh) { try { easyShadeSwatchRefresh(); } catch (e) {} }
    var svg = document.getElementById('svgrenderer');
    if (svg) { fixAllLabelRects(svg); fixAllCageBoxes(svg); fixAllUnderlays(svg); assignExtraRegionColors(svg); fixAllCagePaths(svg); fixAllLines(svg); fixAllGivens(svg); fixAllKropkiDots(svg); rebuildKropkiLabels(svg); drawRegionSplitBorders(svg); }
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
    var amount = settings.selectionColorEnabled ? computeSelectionShift() : 0;

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

  // ── Inline colour application for pencilmarks (DR-immune) ─────────────────
  // DR converts colours inside <style> rules but leaves inline-style values
  // alone when set with !important. Applying fill directly to each element
  // means our chosen colour renders exactly as picked.

  function applyInlineFill(el, desired) {
    var current = el.style.getPropertyValue('fill');
    if (current !== desired) {
      el.style.setProperty('fill', desired, 'important');
    }
    // Always strip DR's attribute markers in case it re-added them
    el.removeAttribute('data-darkreader-inline-color');
    el.removeAttribute('data-darkreader-inline-fill');
    el.style.removeProperty('--darkreader-inline-color');
    el.style.removeProperty('--darkreader-inline-fill');
  }

  function fixCenterTspan(t) {
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

  // Cell shading. Per-puzzle coloured regions that DR otherwise converts
  // toward near-white. Covers:
  //   - #underlay rect:  per-cell shading rects
  //   - #cages path[fill]: cage-shape shadings (killer/region overlays, e.g.
  //     class="cage-fpColumnIndexer")
  // We parse each element's original `fill`, optionally flip its lightness
  // (HSL) by the `underlayInvert` strength to make light pastels darker AND
  // dark colours lighter for dark-mode visibility, then apply the opacity
  // multiplier. Hue and saturation are preserved — colour identity intact.

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
  // { rgb:[r,g,b], a:alpha } to apply, or null meaning "leave it to DarkReader"
  // (the relevant control(s) are disabled). Does NOT cover shape outlines — those
  // keep their own independent Border-brightness slider via applyShapeStroke.
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
      el.style.removeProperty('fill');
      el.style.removeProperty('fill-opacity');
      return;
    }
    el.style.setProperty('fill', 'rgb(' + sh.rgb[0] + ',' + sh.rgb[1] + ',' + sh.rgb[2] + ')', 'important');
    el.style.setProperty('fill-opacity', String(sh.a), 'important');
    el.removeAttribute('data-darkreader-inline-fill');
    el.style.removeProperty('--darkreader-inline-fill');
  }

  // Stroke (shape outline) — gated by the Object shading section's enable +
  // this slider's own sub-enable. Opacity locked at 1.0; only lightness is
  // configurable. (Previously this lived under Region borders and required
  // regionBorderEnabled + regionBorderCenterEnabled; moved here in v2.109.)
  function applyShapeStroke(el) {
    if (!settings.underlayEnabled || !settings.underlayStrokeLightnessEnabled) {
      el.style.removeProperty('stroke');
      el.style.removeProperty('stroke-opacity');
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
    var srgb = shadingTransform(sc, settings.underlayStrokeLightness);
    el.style.setProperty('stroke', 'rgb(' + srgb[0] + ',' + srgb[1] + ',' + srgb[2] + ')', 'important');
    el.style.setProperty('stroke-opacity', '1', 'important');
    el.style.removeProperty('--darkreader-inline-stroke');
  }

  function fixUnderlayRect(rect) {
    // Fill (Cell shading section)
    if (settings.underlayEnabled) {
      applyShadingFill(rect);
    } else {
      rect.style.removeProperty('fill');
      rect.style.removeProperty('fill-opacity');
    }
    // Stroke (Region borders section)
    applyShapeStroke(rect);
  }
  // Broad rule for shading shapes that live in #overlay (drawn above digits) the
  // same way as #underlay shapes — e.g. "lucky charm" puzzles whose coloured
  // circles/squares/diamonds are overlay rects. Skip the things we must NOT
  // recolour: label/Kropki backgrounds (rect.textbg), fill-less/transparent
  // rects, and the white inner-shape rects (#FFFFFF outlines) some puzzles draw
  // on top of an underlay tint. This is a general predicate, not puzzle-specific.
  function shouldShadeOverlayRect(r) {
    if (r.classList.contains('textbg')) return false;
    var c = parseColor(r.getAttribute('fill') || '');
    if (!c || c.a === 0) return false;
    if (c.r >= 240 && c.g >= 240 && c.b >= 240) return false; // white / near-white
    return true;
  }
  function fixAllUnderlays(svg) {
    svg.querySelectorAll('#underlay rect').forEach(fixUnderlayRect);
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
        r.style.removeProperty('fill');
        r.style.removeProperty('fill-opacity');
        r.style.removeProperty('stroke');
        r.style.removeProperty('stroke-opacity');
        delete r.dataset.spdrOverlayShaded;
      }
    });
  }

  var CAGE_FILL_SEL = '#cages path[fill]:not([fill="none"])';

  // Whether any region feature is active (so mainGroup exists / region borders
  // are drawn). Mirrors needFills/needMultiBorders/needCenterBorder + shaded.
  function regionFeatureActive() {
    return !!settings.regionColorFillEnabled
      || (settings.regionBorderEnabled && (settings.regionBorderMultiEnabled || settings.regionBorderCenterEnabled))
      || !!settings.shadedRegionColorEnabled;
  }
  // Shaded "extra regions" (e.g. "grey regions must contain 1-9") render on top
  // of region borders by default (they live in #cages, above mainGroup). Whenever
  // a region feature is active we instead draw a clone of each one INSIDE mainGroup
  // (drawRegionSplitBorders), below the border strips — coloured if shaded mode is
  // on, otherwise the same grey Object-shaded look. So here we hide the original
  // #cages path so it doesn't paint over the borders. Re-asserted on DR rewrites.
  function extraRegionsMovedBelowBorders() {
    return regionFeatureActive() && puzzleHasShadedRegions();
  }
  function applyExtraRegionFill(path) {
    path.style.setProperty('fill', 'transparent', 'important');
    path.style.removeProperty('fill-opacity');
    path.removeAttribute('data-darkreader-inline-fill');
    path.style.removeProperty('--darkreader-inline-fill');
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
      path.style.removeProperty('fill');
      path.style.removeProperty('fill-opacity');
    }
    applyShapeStroke(path);
  }
  function fixAllCagePaths(svg) {
    svg.querySelectorAll(CAGE_FILL_SEL).forEach(fixCagePath);
  }

  // Detect whether this puzzle has shaded "extra regions" we can recolor.
  function puzzleHasShadedRegions() {
    return !!document.querySelector('#cages path.cage-extraregion');
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
    // Build the touch-adjacency graph between regions.
    var cellReg = {};
    sets.forEach(function (s, i) { s.forEach(function (rc) { cellReg[rc[0] + ',' + rc[1]] = i; }); });
    var n = sets.length, adj = [];
    for (var i = 0; i < n; i++) adj.push(new Set());
    sets.forEach(function (s, i) {
      s.forEach(function (rc) {
        var r = rc[0], c = rc[1];
        [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function (nb) {
          var j = cellReg[nb[0] + ',' + nb[1]];
          if (j !== undefined && j !== i) { adj[i].add(j); adj[j].add(i); }
        });
      });
    });
    // Greedy colour, most-constrained (highest degree) first → 4 colours suffice
    // for the planar touch graph; if ever exceeded, reuse the least-clashing one.
    var order = []; for (var i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) { return adj[b].size - adj[a].size; });
    var colors = new Array(n).fill(-1);
    order.forEach(function (i) {
      var used = new Set();
      adj[i].forEach(function (j) { if (colors[j] >= 0) used.add(colors[j]); });
      var pick = -1;
      for (var k = 0; k < 4; k++) { if (!used.has(k)) { pick = k; break; } }
      if (pick < 0) {
        var cnt = [0,0,0,0];
        adj[i].forEach(function (j) { if (colors[j] >= 0) cnt[colors[j]]++; });
        pick = cnt.indexOf(Math.min.apply(null, cnt));
      }
      colors[i] = pick;
    });
    paths.forEach(function (p, i) { p.dataset.spdrExtraColorIdx = String(colors[i] < 0 ? 0 : colors[i]); });
  }

  // Line constraints. Every line-type clue — thermo shafts, palindromes, renban,
  // whispers, region-sum lines, arrow-sudoku arrow lines — renders as a stroked
  // <path> in #arrows (fill=none). DR leaves these near-white in dark mode while
  // any matching bulb/underlay shape is shaded dark — a mismatch. We shade the
  // line STROKE through the same object-shading transform used for fills
  // (computeObjectShade): gray lines (e.g. #CFCFCF thermos/palindromes) follow
  // the linked Gray slider, coloured lines the Brightness/Opacity sliders. Scope
  // is broad on purpose — ALL stroked #arrows paths, not just bulb-matched shafts
  // (was the v2.122 thermo-only rule; bulbless line puzzles like 9p6eahqmux fell
  // through to DR before v2.140). Stroke width is never touched.
  function applyLineStroke(el) {
    var c = parseColor(el.getAttribute('stroke') || '');
    if (!c || c.a === 0) return;
    if (!settings.underlayEnabled) {
      el.style.removeProperty('stroke');
      el.style.removeProperty('stroke-opacity');
      return;
    }
    var sh = computeObjectShade(c);
    if (!sh) {
      el.style.removeProperty('stroke');
      el.style.removeProperty('stroke-opacity');
      return;
    }
    el.style.setProperty('stroke', 'rgb(' + sh.rgb[0] + ',' + sh.rgb[1] + ',' + sh.rgb[2] + ')', 'important');
    el.style.setProperty('stroke-opacity', String(sh.a), 'important');
    el.style.removeProperty('--darkreader-inline-stroke');
  }
  function isLineStroke(el) {
    if (el.tagName !== 'path' || !el.closest('#arrows')) return false;
    var s = el.getAttribute('stroke');
    return !!(s && s !== 'none');
  }
  function fixAllLines(svg) {
    svg.querySelectorAll('#arrows path[stroke]').forEach(function (el) {
      if (isLineStroke(el)) applyLineStroke(el);
    });
  }

  // Given digits — apply colour via inline fill so DR doesn't re-convert it.
  // Overlay texts (constraint labels, rank markers, etc.) are NOT touched here;
  // they have no cell-given class and DarkReader handles their colour correctly.
  function fixGivenText(t) {
    if (settings.givenEnabled) {
      var color = hexToRgba(settings.givenColor, settings.givenOpacity);
      t.style.setProperty('fill', color, 'important');
      t.removeAttribute('data-darkreader-inline-color');
      t.removeAttribute('data-darkreader-inline-fill');
      t.style.removeProperty('--darkreader-inline-color');
      t.style.removeProperty('--darkreader-inline-fill');
    } else {
      t.style.removeProperty('fill');
    }
  }
  function fixAllGivens(svg) {
    svg.querySelectorAll('#cell-givens text, text.cell-given').forEach(fixGivenText);
  }

  // ── Kropki dot color fix ──────────────────────────────────────────────────────
  // DarkReader inverts Kropki dots: white-fill (consecutive) → black, black-fill
  // (2:1 ratio) → white. Restore correct colors via inline style so DR can't
  // re-convert them. Optionally overlay a ":" / "~" label on each bare dot.
  //
  // Two tiers:
  //   isKropkiCircle — shape test: any feature-kropki or circular textbg rect.
  //                    Used for color fixing (circle + adjacent text).
  //   isKropkiRect   — isKropkiCircle AND no non-empty text sibling.
  //                    Used for label injection only (bare dots get our labels).
  //
  // Labeled Kropki-type circles (Difference/Ratio Sudoku etc.) pass isKropkiCircle
  // but not isKropkiRect. Their circle fill and adjacent text color are DR-proofed,
  // but we don't inject our own labels on top of the existing text.
  // data-spdr-kropki-text marks such texts so the MutationObserver can re-fix them.

  // Returns the non-spdr text immediately following a Kropki circle rect, if it has
  // non-empty content (= the existing label for labeled Kropki-type circles).
  function getKropkiAdjacentText(rect) {
    var next = rect.nextElementSibling;
    while (next && next.getAttribute && next.getAttribute('data-spdr-kropki-label')) {
      next = next.nextElementSibling;
    }
    return (next && next.tagName === 'text' && next.textContent.trim() !== '') ? next : null;
  }

  // Any Kropki-shaped circle — used for color fixing.
  function isKropkiCircle(rect) {
    var hasFk = rect.classList.contains('feature-kropki');
    var hasTb = rect.classList.contains('textbg');
    if (!hasFk && !hasTb) return false;
    // textbg-only: must be circular (rx ≈ w/2)
    if (!hasFk) {
      var rx = parseFloat(rect.getAttribute('rx') || 0);
      var w  = parseFloat(rect.getAttribute('width') || 0);
      if (!(rx > 0 && Math.abs(rx - w / 2) < 1)) return false;
    }
    return true;
  }

  // Bare Kropki dot (no existing label text) — used for label injection.
  function isKropkiRect(rect) {
    return isKropkiCircle(rect) && !getKropkiAdjacentText(rect);
  }

  // True iff the SVG contains at least one black-filled Kropki-shaped circle.
  // Used to disambiguate real white Kropki dots from non-Kropki labeled white
  // circles (arrow constraints etc.). Black Kropki circles are unambiguous;
  // if a puzzle has any, all its circles are Kropki-type. If the puzzle has
  // only white circles, treat them as non-Kropki and leave DR alone.
  function svgHasBlackKropkiCircle(svg) {
    var rects = svg.querySelectorAll('rect.feature-kropki, rect.textbg');
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (!isKropkiCircle(r)) continue;
      var f = r.getAttribute('fill');
      if (f && f.toUpperCase() === '#000000') return true;
    }
    return false;
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

  function fixKropkiDot(rect) {
    var fill = rect.getAttribute('fill');
    var isWhite = fill && fill.toUpperCase() === '#FFFFFF';
    var isBlack = fill && fill.toUpperCase() === '#000000';
    if (!isWhite && !isBlack) return;
    // A white circle counts as Kropki if it sits on a cell border (any edge
    // clue — Kropki / operator dot) OR the puzzle has an unambiguous black dot.
    // Centre-of-cell white circles (arrow bulbs etc.) match neither, so they're
    // left to DarkReader.
    if (isWhite) {
      var svg = rect.ownerSVGElement;
      if (!isOnCellBorder(rect, getGridCellSize()) && svg && !svgHasBlackKropkiCircle(svg)) return;
    }
    var adjText = getKropkiAdjacentText(rect);
    if (settings.kropkiFixEnabled) {
      if (isWhite) {
        rect.style.setProperty('fill', '#ffffff', 'important');
        if (settings.kropkiWhiteOutlineEnabled !== false) {
          rect.style.setProperty('stroke', '#000000', 'important');
          rect.style.removeProperty('stroke-width');
        } else {
          rect.style.removeProperty('stroke');
          rect.style.removeProperty('stroke-width');
        }
      } else {
        rect.style.setProperty('fill', '#000000', 'important');
        if (settings.kropkiOutlineEnabled) {
          rect.style.setProperty('stroke', '#ffffff', 'important');
          rect.style.setProperty('stroke-width', '1.5', 'important');
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
      rect.removeAttribute('data-darkreader-inline-fill');
      rect.style.removeProperty('--darkreader-inline-fill');
      // For labeled Kropki circles, also DR-proof the existing text color.
      // White circle → black text; black circle → white text.
      if (adjText) {
        var textColor = isWhite ? '#000000' : '#ffffff';
        adjText.setAttribute('data-spdr-kropki-text', textColor);
        adjText.style.setProperty('fill', textColor, 'important');
        adjText.removeAttribute('data-darkreader-inline-color');
        adjText.style.removeProperty('--darkreader-inline-color');
      }
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
      if (adjText) {
        adjText.removeAttribute('data-spdr-kropki-text');
        adjText.style.removeProperty('fill');
      }
    }
  }
  function fixAllKropkiDots(svg) {
    svg.querySelectorAll('rect.feature-kropki, rect.textbg').forEach(function (rect) {
      if (isKropkiCircle(rect)) fixKropkiDot(rect);
    });
  }

  function fixKropkiLabel(t) {
    // Keep our injected Kropki labels at their intended colour regardless of
    // DarkReader. The fill is stored in the data-spdr-kropki-label attribute:
    //   '#ffffff'  → white text on a black (2:1 ratio) dot
    //   '#000000'  → black text on a white (consecutive) dot
    //   '1'        → legacy format (pre-v2.64.0) — treat as white
    var color = t.getAttribute('data-spdr-kropki-label') || '#ffffff';
    if (color === '1') color = '#ffffff';
    t.style.setProperty('fill', color, 'important');
    t.removeAttribute('data-darkreader-inline-color');
    t.removeAttribute('data-darkreader-inline-fill');
    t.style.removeProperty('--darkreader-inline-color');
    t.style.removeProperty('--darkreader-inline-fill');
  }
  function fixKropkiText(t) {
    // Re-apply the stored color for an existing label text inside a labeled
    // Kropki-type circle (data-spdr-kropki-text holds '#000000' or '#ffffff').
    // Called by the MutationObserver when DarkReader re-inverts this text.
    var color = t.getAttribute('data-spdr-kropki-text');
    if (!color) return;
    t.style.setProperty('fill', color, 'important');
    t.removeAttribute('data-darkreader-inline-color');
    t.removeAttribute('data-darkreader-inline-fill');
    t.style.removeProperty('--darkreader-inline-color');
    t.style.removeProperty('--darkreader-inline-fill');
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
    svg.querySelectorAll('rect.feature-kropki, rect.textbg').forEach(function (rect) {
      if (!isKropkiRect(rect)) return;
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
      t.setAttribute('dominant-baseline', 'central');
      t.setAttribute('font-size', '13');
      t.setAttribute('font-weight', 'normal');
      t.setAttribute('pointer-events', 'none');
      t.setAttribute('data-spdr-kropki-label', labelFill);  // store intended fill colour
      t.textContent = labelText;
      if (wantRotate && onHorizBorder) {
        t.setAttribute('transform', 'rotate(90,' + cx + ',' + cy + ')');
      }
      fixKropkiLabel(t);
      rect.parentNode.insertBefore(t, rect.nextSibling);
    });
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
  var LABEL_RECT_SEL = 'rect.cage-label, rect.textbg, rect[fill="#FFFFFF"]:not(#underlay *), rect[fill="#ffffff"]:not(#underlay *), rect[fill="white"]:not(#underlay *)';

  function fixLabelRect(rect) {
    if (settings.labelBgEnabled) {
      var bg = hexToRgba(settings.labelBgColor, settings.labelBgOpacity);
      rect.style.setProperty('fill', bg, 'important');
      rect.removeAttribute('data-darkreader-inline-fill');
      rect.style.removeProperty('--darkreader-inline-fill');
    } else {
      rect.style.removeProperty('fill');
      // Let DR re-process. It re-adds data-darkreader-inline-fill when it
      // observes the style mutation.
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
    fixAllKropkiDots(svg);
    rebuildKropkiLabels(svg);
    startCageBoxPatch(svg);
    startSelectionBorderObserver();
    new MutationObserver(function (mutations) {
      var needsFullScan = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes') {
          var el = m.target;
          if (m.attributeName === 'data-darkreader-inline-fill') {
            if (el.tagName === 'rect') {
              if (el.matches(LABEL_RECT_SEL)) fixLabelRect(el);
              if (el.closest('#underlay')) fixUnderlayRect(el);
              if (isKropkiCircle(el)) fixKropkiDot(el);
            } else if (el.tagName === 'path') {
              if (el.closest('#cages') && el.matches(CAGE_FILL_SEL)) fixCagePath(el);
            } else if (el.tagName === 'text') {
              if (el.getAttribute('data-spdr-kropki-text'))  { fixKropkiText(el); }
              else if (el.getAttribute('data-spdr-kropki-label')) { fixKropkiLabel(el); }
              else if (el.closest('#cell-givens') || el.classList.contains('cell-given')) { fixGivenText(el); }
            }
          } else if (m.attributeName === 'data-darkreader-inline-color') {
            if (el.tagName === 'text') {
              if (el.getAttribute('data-spdr-kropki-text'))  { fixKropkiText(el); }
              else if (el.getAttribute('data-spdr-kropki-label')) { fixKropkiLabel(el); }
              else if (el.closest('#cell-givens') || el.classList.contains('cell-given')) { fixGivenText(el); }
            }
          } else if (m.attributeName === 'data-darkreader-inline-stroke') {
            // Lines: DR re-converts the stroke after our scan.
            if (isLineStroke(el)) applyLineStroke(el);
          }
        } else if (m.type === 'childList' && m.addedNodes.length > 0) {
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
      if (needsFullScan) { fixAllLabelRects(svg); fixAllUnderlays(svg); assignExtraRegionColors(svg); fixAllCagePaths(svg); fixAllLines(svg); fixAllGivens(svg); fixAllKropkiDots(svg); rebuildKropkiLabels(svg); }
    }).observe(svg, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-darkreader-inline-fill', 'data-darkreader-inline-color', 'data-darkreader-inline-stroke'] });
  }

  function waitForDRAndSVG() {
    if (isDarkReader() && document.getElementById('svgrenderer')) { startLabelRectPatch(); return; }
    var obs = new MutationObserver(function () {
      if (isDarkReader() && document.getElementById('svgrenderer')) { obs.disconnect(); startLabelRectPatch(); }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-darkreader-scheme'] });
    obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
  waitForDRAndSVG();

  // ── Part 4b: region borders ───────────────────────────────────────────────
  // Standard puzzles use path.cage-box for region outlines. Some irregular-
  // region puzzles (e.g. Surplus Sudoku) use plain classless <path> elements
  // instead. Both live in #cell-grids. We target all paths there except
  // path.cell-grid (the thin cell-divider grid lines).
  //
  // When our stroke/width is NOT being applied, restore DR's expected inline
  // stroke variable so DR's converted colour shows correctly. This fixes the
  // "second disable makes the border disappear" issue.

  function isCageBoxPath(el) {
    return el.tagName === 'path' && !!el.closest('#cell-grids') && !el.classList.contains('cell-grid');
  }

  function fixCageBox(el) {
    var inDR = isDarkReader();
    var centerActive = settings.regionBorderEnabled && settings.regionBorderCenterEnabled;
    var multiActive  = settings.regionBorderEnabled && settings.regionBorderMultiEnabled;

    if (centerActive || multiActive) {
      // Center border is drawn as SVG clones in mainGroup (z=0), and multi-color
      // borders are drawn as rect strips in mainGroup — hide the original cage-box
      // stroke so it doesn't double-render above #underlay elements.
      el.style.setProperty('stroke', 'none', 'important');
      el.style.setProperty('stroke-width', '0', 'important');
      el.style.removeProperty('--darkreader-inline-stroke');
    } else {
      // Neither border type is active — restore to default.
      el.style.removeProperty('stroke');
      el.style.removeProperty('stroke-width');
      if (inDR) {
        // Restore DR's managed stroke variable so DR's converted colour renders.
        el.style.setProperty('--darkreader-inline-stroke', 'var(--darkreader-text-000000, #e8e6e3)');
      }
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

  function computeRegion4Colors(regions) {
    var n = regions.length;
    var adj = [];
    for (var i = 0; i < n; i++) adj.push(new Set());
    var cellRegion = {};
    regions.forEach(function (cells, ri) {
      cells.forEach(function (rc) { cellRegion[rc[0] + ',' + rc[1]] = ri; });
    });
    regions.forEach(function (cells, ri) {
      cells.forEach(function (rc) {
        var r = rc[0], c = rc[1];
        [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function (nb) {
          var rj = cellRegion[nb[0] + ',' + nb[1]];
          if (rj !== undefined && rj !== ri) adj[ri].add(rj);
        });
      });
    });
    // Greedy coloring — always ≤ 4 colors for planar graphs.
    var colors = new Array(n).fill(-1);
    for (var i = 0; i < n; i++) {
      var used = new Set();
      adj[i].forEach(function (j) { if (colors[j] >= 0) used.add(colors[j]); });
      for (var k = 0; k < 5; k++) { if (!used.has(k)) { colors[i] = k; break; } }
    }
    return colors;
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
    var needMultiBorders = settings.regionBorderEnabled && settings.regionBorderMultiEnabled;
    var needCenterBorder = settings.regionBorderEnabled && settings.regionBorderCenterEnabled;
    // Shaded extra-regions are drawn (as clones) inside mainGroup so they sit
    // BELOW the region borders — coloured when shaded mode is on, otherwise the
    // same grey. Done whenever any region feature is active (so there are borders
    // to sit under) and the puzzle actually has shaded regions.
    var needShadedClones = regionFeatureActive() && puzzleHasShadedRegions();
    var geo = (needFills || needMultiBorders || needCenterBorder || needShadedClones)
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

    if (!needFills && !needMultiBorders && !needCenterBorder && !needShadedClones) return;
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
    var regionColors = computeRegion4Colors(regions);
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
        if (m.type === 'attributes' && (m.attributeName === 'class' || m.attributeName === 'data-darkreader-inline-color' || m.attributeName === 'data-darkreader-inline-fill')) {
          needsUpdate = true; break;
        }
      }
      if (needsUpdate) { sortAllCandidateCells(cc); fixAllCenterTspans(cc); }
    }).observe(cc, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-darkreader-inline-color', 'data-darkreader-inline-fill'] });
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
            (m.attributeName === 'class' || m.attributeName === 'x' || m.attributeName === 'y' ||
             m.attributeName === 'data-darkreader-inline-color' || m.attributeName === 'data-darkreader-inline-fill')) {
          needsUpdate = true; break;
        }
      }
      if (needsUpdate) { reorderAllCornerCells(cp); fixAllCornerTexts(cp); }
    }).observe(cp, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'x', 'y', 'data-darkreader-inline-color', 'data-darkreader-inline-fill'] });
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
      t.closest('#sp-easy-shade-btn') || t.closest('#sp-easy-shade-card')
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
      // !important beats DarkReader's external [data-darkreader-inline-bgcolor] rule
      swatchInner.style.setProperty('background-color', hexToRgba(settings[colorKey], op), 'important');
      // Strip DR's own attributes so it doesn't try to override on its next pass
      swatchInner.removeAttribute('data-darkreader-inline-bgcolor');
      swatchInner.style.removeProperty('--darkreader-inline-bgcolor');
    }
    refreshSwatch();

    // Re-strip if DR keeps re-adding its variables
    new MutationObserver(refreshSwatch).observe(swatchInner, {
      attributes: true, attributeFilter: ['data-darkreader-inline-bgcolor', 'style'],
    });

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
  function makeRangeRow(opts) {
    // opts: { key, label, min, max, step, format, enabledKey,
    //         extraKeys, extraEnabledKeys }
    // extraKeys / extraEnabledKeys: additional setting keys driven to the SAME
    // value / checked state as key / enabledKey — used by the "combined" object-
    // shading sliders that lock brightness and opacity together.
    var row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' });

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
    Object.assign(lbl.style, { color: '#a6adc8', fontSize: '11px', flexShrink: '0', width: opts.enabledKey ? '100px' : '72px' });

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.min = opts.min; slider.max = opts.max; slider.step = opts.step;
    slider.value = settings[opts.key];
    Object.assign(slider.style, { flex: '1', cursor: 'pointer', accentColor: '#89b4fa', minWidth: '0' });

    var fmt = opts.format || function (v) { return Math.round(v * 100) + '%'; };
    var pct = document.createElement('span');
    pct.textContent = fmt(settings[opts.key]);
    Object.assign(pct.style, { color: '#a6adc8', fontSize: '11px', width: '40px', textAlign: 'right' });

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

    if (checkbox) row.appendChild(checkbox);
    row.appendChild(lbl); row.appendChild(slider); row.appendChild(pct);
    return row;
  }

  function makeOpacityRow(opacityKey, swatchRef) {
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

    row.appendChild(lbl); row.appendChild(slider); row.appendChild(pct);
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
  function makeColorRow(label, colorKey, opacityKey) {
    var wrap = document.createElement('div');
    Object.assign(wrap.style, { marginTop: '6px' });

    var topRow = document.createElement('div');
    Object.assign(topRow.style, { display: 'flex', alignItems: 'center', gap: '8px' });

    var lbl = document.createElement('span');
    lbl.textContent = label;
    Object.assign(lbl.style, { color: '#cdd6f4', fontSize: '12px', flex: '1' });

    var swatchRef = makeColorControl(colorKey, opacityKey);
    topRow.appendChild(lbl); topRow.appendChild(swatchRef);
    wrap.appendChild(topRow);
    if (opacityKey) wrap.appendChild(makeOpacityRow(opacityKey, swatchRef));
    return wrap;
  }

  // Top-level section. resetKeys = list of every setting key the reset button
  // should restore to DEFAULTS (including the section's enabled key).
  function buildSection(opts) {
    var section = document.createElement('div');
    Object.assign(section.style, { padding: '10px 14px', borderBottom: '1px solid #313244' });

    var head = document.createElement('div');
    Object.assign(head.style, { display: 'flex', alignItems: 'flex-start', gap: '10px' });

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!settings[opts.enabledKey];
    Object.assign(checkbox.style, {
      marginTop: '2px', flexShrink: '0', cursor: 'pointer',
      accentColor: '#89b4fa', width: '14px', height: '14px',
    });

    var textBlock = document.createElement('div');
    Object.assign(textBlock.style, { flex: '1', minWidth: '0', cursor: 'pointer' });
    var lbl = document.createElement('div');
    lbl.textContent = opts.label;
    Object.assign(lbl.style, { color: '#cdd6f4', fontWeight: '500', marginBottom: '2px' });
    textBlock.appendChild(lbl);
    if (opts.desc) {
      var desc = document.createElement('div');
      desc.textContent = opts.desc;
      Object.assign(desc.style, { color: '#6c7086', fontSize: '11px' });
      textBlock.appendChild(desc);
    }

    head.appendChild(checkbox); head.appendChild(textBlock);

    var headColor = null;
    if (opts.hasColor) {
      headColor = makeColorControl(opts.colorKey, opts.opacityKey);
      head.appendChild(headColor);
    }

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
    head.appendChild(sectionReset);

    section.appendChild(head);

    var subWrap = document.createElement('div');
    Object.assign(subWrap.style, { paddingLeft: '24px' });
    if (opts.hasColor && opts.opacityKey) subWrap.appendChild(makeOpacityRow(opts.opacityKey, headColor));
    if (opts.subBuilder) opts.subBuilder(subWrap);
    if (subWrap.childNodes.length > 0) section.appendChild(subWrap);

    function updateDim() {
      var enabled = checkbox.checked;
      var op = enabled ? '1' : '0.4';
      if (headColor) { headColor.style.opacity = op; headColor.style.pointerEvents = enabled ? 'auto' : 'none'; }
      subWrap.style.opacity = op;
      subWrap.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    updateDim();

    controlSyncers[opts.enabledKey] = function () { checkbox.checked = !!settings[opts.enabledKey]; updateDim(); };

    checkbox.addEventListener('change', function () {
      settings[opts.enabledKey] = checkbox.checked;
      saveSettings(settings); applySettings(); updateDim();
    });
    textBlock.addEventListener('click', function () {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event('change'));
    });
    sectionReset.addEventListener('click', function (e) {
      e.stopPropagation();
      // The section's own on/off toggle (enabledKey) is NOT reset here — only the
      // sub-settings are. The global "Reset all" button at the bottom resets everything.
      (opts.resetKeys || []).forEach(function (k) {
        if (k === opts.enabledKey) return;
        if (k in DEFAULTS) settings[k] = DEFAULTS[k];
      });
      saveSettings(settings); applySettings();
      // Re-sync any registered controls (checkbox, swatches, sliders, etc.)
      (opts.resetKeys || []).forEach(function (k) {
        if (k === opts.enabledKey) return;
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
  function getDigitButton(d) {
    return document.querySelector('[data-control="value"][data-value="' + String(d) + '"]');
  }
  // Ensure number mode is active (data-value="1"-"9"/"0" buttons visible).
  // Letter mode (data-value="A"-"I"/"O") is active when the toggleletter button
  // is selected; detect by checking whether the "1" button exists.
  async function ensureNumberMode() {
    if (document.querySelector('[data-value="1"]')) return true;
    var btn = document.querySelector('[data-control="toggleletter"]');
    if (!btn) return false;
    dispatchClickEl(btn);
    for (var i = 0; i < 6; i++) {
      await sleep(20);
      if (document.querySelector('[data-value="1"]')) return true;
    }
    return false;
  }
  function isLetterModeActive() {
    return !document.querySelector('[data-value="1"]');
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
    return '56px';
  }

  function showRemoveInvalidToast(message, kind) {
    // Errors always show (player must know something went wrong) regardless of showToasts.
    if (settings.showToasts === false && kind !== 'error') return;
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

    // Auto-fade after 2s (unless toastPersist is on, or this is an error — errors always persist).
    if (!settings.toastPersist && kind !== 'error') {
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

    var originalMode = getCurrentMode();
    var originalSelection = Array.from(app.puzzle.selectedCells || []);
    var wasLetterMode = isLetterModeActive();
    if (wasLetterMode) await ensureNumberMode();
    var totalTargets = targets.length;
    var failures = [];
    var removedCount = 0;

    try {

      // Group by (type, digit). Each group gets ONE api-select + ONE button click.
      var byModeDigit = { corner: new Map(), centre: new Map() };
      targets.forEach(function(t) {
        var map = byModeDigit[t.type];
        if (!map.has(t.digit)) map.set(t.digit, []);
        map.get(t.digit).push(t);
      });

      for (var mi = 0; mi < 2; mi++) {
        var mode = mi === 0 ? 'corner' : 'centre';
        var digitMap = byModeDigit[mode];
        if (digitMap.size === 0) continue;

        var modeOk = await ensureMode(mode);
        if (!modeOk) { failures.push('mode-switch-failed:' + mode); continue; }

        var iter = digitMap.entries();
        var step;
        while (!(step = iter.next()).done) {
          var digit = step.value[0];
          var targetsForDigit = step.value[1];

          var digitBtn = getDigitButton(digit);
          if (!digitBtn) { skippedExcluded += targetsForDigit.length; continue; }

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
          await sleep(10);

          // All selected cells have digit in this mode → clicking removes it from all.
          var before = snapshotPencilmarks();
          dispatchClickEl(digitBtn);
          await sleep(50);
          var after = snapshotPencilmarks();
          var diff = diffSnapshots(before, after);

          // Safety: additions or value/color changes are always wrong here → undo + abort.
          var criticalUnexpected = diff.added.corner.length + diff.added.centre.length +
                                   diff.added.values.length + diff.added.colors.length +
                                   diff.removed.values.length + diff.removed.colors.length;
          if (criticalUnexpected > 0) {
            console.error('[spDR-fix] REMOVE unexpected change for', mode, digit, diff);
            var undoBtn = getModeButton('undo');
            var rollbackOk = false;
            if (undoBtn) {
              dispatchClickEl(undoBtn);
              for (var att = 0; att < 8; att++) {
                await sleep(25);
                if (diffEmpty(diffSnapshots(before, snapshotPencilmarks()))) { rollbackOk = true; break; }
              }
            }
            return {
              totalTargets: totalTargets, removed: removedCount,
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

      return {
        totalTargets: totalTargets, removed: removedCount, skippedExcluded: skippedExcluded,
        aborted: false, elapsedMs: performance.now() - startTime, failures: failures,
      };

    } finally {
      // Restore original selection and mode on every exit path.
      app.deselect();
      if (originalSelection.length > 0) app.select(originalSelection);
      if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
      if (originalMode && originalMode !== getCurrentMode()) await ensureMode(originalMode);
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
    // Aborted
    var t = result.abortTarget;
    var targetDesc = t ? (t.type + ' ' + t.digit + ' from cell (' + t.cellX + ',' + t.cellY + ')') : '(unknown)';
    var common = '\nRemoved ' + result.removed + ' of ' + result.totalTargets + ' ' + contextLabel + ' in ' + elapsed + '. ';
    if (result.abortReason === 'mode-drift') {
      showRemoveInvalidToast('Aborted: tool mode drifted unexpectedly before removing ' + targetDesc + '.' + common + 'Nothing was damaged.', 'warning');
    } else if (result.abortReason === 'no-effect') {
      showRemoveInvalidToast('Aborted: click had no effect when removing ' + targetDesc + '.' + common + 'Nothing was damaged.', 'warning');
    } else if (result.abortReason === 'unexpected-diff') {
      if (result.rollbackOk) {
        showRemoveInvalidToast('Aborted: click produced an unexpected change for ' + targetDesc + '. Rolled it back.' + common + 'Nothing was damaged.', 'warning');
      } else {
        showRemoveInvalidToast('CRITICAL: an unexpected change occurred for ' + targetDesc + ' AND the rollback failed. Press Ctrl+Z manually until satisfied. (Removed ' + result.removed + ' in ' + elapsed + ' before failure.)', 'error');
      }
    } else if (result.abortReason === 'selection-stuck') {
      showRemoveInvalidToast('Aborted: could not isolate ' + targetDesc + ' as a single-cell selection (the multi-selection from the drag did not clear). ' + common + 'Nothing was damaged.', 'warning');
    } else {
      showRemoveInvalidToast('Aborted on ' + targetDesc + '.' + common, 'warning');
    }
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

    for (var pass = 0; pass < MAX_PASSES; pass++) {
      var r = await _removeInvalidPencilmarksInternal(opts);
      passCount++;
      totalRemoved += r.removed || 0;
      totalTargets += r.totalTargets || 0;
      totalSkippedExcluded += r.skippedExcluded || 0;
      totalElapsedMs += r.elapsedMs || 0;
      if (r.failures && r.failures.length) Array.prototype.push.apply(allFailures, r.failures);

      // Abort — propagate immediately with combined totals so the user sees
      // the partial removal counts.
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
    if (actionInProgress) { showRemoveInvalidToast('Another operation is still running.', 'warning'); return; }
    actionInProgress = true;
    _removeInvalidPencilmarksMultiPass({}).then(function (r) {
      showWorkerResult(r, 'invalid pencilmarks');
    }).finally(function () { actionInProgress = false; });
  }

  function clearMarksInSelected() {
    if (actionInProgress) { showRemoveInvalidToast('Another operation is still running.', 'warning'); return; }
    var selected = getSelectedCells();
    if (selected.size === 0) {
      showRemoveInvalidToast('No marks cleared (no cells selected).', 'success');
      return;
    }
    actionInProgress = true;
    _removeInvalidPencilmarksMultiPass({ cellFilter: selected }).then(function (r) {
      showWorkerResult(r, 'invalid marks in selected cells', 'No invalid marks in the selected cell' + (selected.size === 1 ? '' : 's') + '.');
    }).finally(function () { actionInProgress = false; });
  }

  // Fill missing centre candidates (from settings.digitSet) into each selected
  // cell. Uses Framework.getApp() → app.select() to select exactly the cells
  // missing each digit, then clicks the digit button once — N digits = N clicks,
  // not N×M per-cell iterations. Caller runs a final _removeInvalidPencilmarksInternal
  // sweep to strip any conflicts introduced.
  async function _fillSelectedInternal(cells) {
    var startTime = performance.now();

    // Get the SudokuPad app API and build a col,row → cell object lookup.
    var app = await Framework.getApp();
    var cellByKey = {};
    app.puzzle.cells.forEach(function(c) { cellByKey[c.col + ',' + c.row] = c; });

    var originalMode = getCurrentMode();
    var originalSelection = Array.from(app.puzzle.selectedCells || []);
    var wasLetterMode = isLetterModeActive();
    if (wasLetterMode) { var nmOk = await ensureNumberMode(); if (!nmOk) wasLetterMode = false; }
    var modeOk = await ensureMode('centre');
    if (!modeOk) {
      // Restore state before returning — this path is outside the try/finally block.
      app.deselect();
      if (originalSelection.length > 0) app.select(originalSelection);
      if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
      return { addedCount: 0, removedCount: 0, skippedCount: 0, wasLetterMode: wasLetterMode,
               aborted: true, abortReason: 'mode-switch-failed', elapsedMs: performance.now() - startTime };
    }
    try {
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
               wasLetterMode: wasLetterMode, aborted: false,
               elapsedMs: performance.now() - startTime };
    }

    var digitList = settings.digitSet.split('');

    // For each digit, select all fillable cells missing it and click once.
    var addedCount = 0;
    for (var di = 0; di < digitList.length; di++) {
      var d = digitList[di];
      var digitBtn = getDigitButton(d);
      if (!digitBtn) continue;

      var cmOk = await ensureMode('centre');
      if (!cmOk) {
        return { addedCount: addedCount, removedCount: 0, skippedCount: skippedCount,
                 wasLetterMode: wasLetterMode, aborted: true,
                 abortReason: 'mode-switch-failed',
                 elapsedMs: performance.now() - startTime };
      }

      // Find fillable cells that don't already have this digit as a centre mark.
      var preSnap = snapshotPencilmarks();
      var targetsForD = fillable.filter(function(c) {
        return !preSnap.centre.has(c.key + ',' + d);
      });
      if (targetsForD.length === 0) continue;

      // Select exactly these cells via the API and click the digit button once.
      app.deselect();
      app.select(targetsForD.map(function(c) { return c.cell; }));
      await sleep(10);

      var expectedAddKeys = new Set(targetsForD.map(function(t) { return t.key + ',' + d; }));
      var beforeBatch = snapshotPencilmarks();
      dispatchClickEl(digitBtn);
      await sleep(50);
      var afterBatch = snapshotPencilmarks();
      var diffBatch = diffSnapshots(beforeBatch, afterBatch);

      if (diffEmpty(diffBatch)) continue;  // All already had it — no-op.

      // Allow incidental non-digitSet centre removals (SudokuPad auto-clears letter marks).
      var unexpectedRemovedCentre = diffBatch.removed.centre.filter(function(entry) {
        return settings.digitSet.includes(entry.split(',')[2]);
      });
      var batchValid = (
        diffBatch.removed.corner.length === 0 &&
        diffBatch.removed.values.length === 0 &&
        diffBatch.removed.colors.length === 0 &&
        diffBatch.added.corner.length   === 0 &&
        diffBatch.added.values.length   === 0 &&
        diffBatch.added.colors.length   === 0 &&
        unexpectedRemovedCentre.length  === 0 &&
        diffBatch.added.centre.length   === targetsForD.length &&
        diffBatch.added.centre.every(function(k) { return expectedAddKeys.has(k); })
      );

      if (batchValid) {
        addedCount += targetsForD.length;
      } else {
        console.warn('[spDR-fix] FILL unexpected diff for digit', d, diffBatch);
        var undoBtn = getModeButton('undo');
        var rollbackOk = false;
        if (undoBtn) {
          dispatchClickEl(undoBtn);
          for (var attempt = 0; attempt < 8; attempt++) {
            await sleep(25);
            if (diffEmpty(diffSnapshots(beforeBatch, snapshotPencilmarks()))) { rollbackOk = true; break; }
          }
        }
        return { addedCount: addedCount, removedCount: 0, skippedCount: skippedCount,
                 wasLetterMode: wasLetterMode, aborted: true,
                 abortReason: 'unexpected-diff',
                 abortTarget: { type: 'centre', digit: String(d),
                                cellX: String(targetsForD[0].cell.col * 64 + 32),
                                cellY: String(targetsForD[0].cell.row * 64 + 32) },
                 rollbackOk: rollbackOk,
                 elapsedMs: performance.now() - startTime };
      }
    }

    return { addedCount: addedCount, removedCount: 0, skippedCount: skippedCount,
             wasLetterMode: wasLetterMode, aborted: false,
             elapsedMs: performance.now() - startTime };

    } finally {
      // Restore original selection and mode on every exit path.
      app.deselect();
      if (originalSelection.length > 0) app.select(originalSelection);
      if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
      if (originalMode && originalMode !== getCurrentMode()) await ensureMode(originalMode);
    }
  }

  function fillSelectedCellsWithCandidates() {
    if (actionInProgress) { showRemoveInvalidToast('Another operation is still running.', 'warning'); return; }
    var selected = getSelectedCells();
    if (selected.size === 0) {
      showRemoveInvalidToast('No cells selected.', 'success');
      return;
    }
    actionInProgress = true;
    var t0 = performance.now();
    var originalMode = getCurrentMode();
    (async function () {
      var fillResult = await _fillSelectedInternal(selected);
      var elapsedFill = formatDuration(fillResult.elapsedMs);
      if (fillResult.aborted) {
        var t = fillResult.abortTarget;
        var desc = t ? ('digit ' + t.digit + ' in cell (' + t.cellX + ',' + t.cellY + ')') : '(unknown)';
        var skippedNote = (fillResult.skippedCount > 0) ? ' (skipped ' + fillResult.skippedCount + ' cell' + (fillResult.skippedCount === 1 ? '' : 's') + ')' : '';
        var inlineNote = (fillResult.removedCount > 0) ? ', removed ' + fillResult.removedCount + ' inline' : '';
        var msg = 'Fill aborted while adding ' + desc + ' (' + fillResult.abortReason + ').\nAdded ' + fillResult.addedCount + ' candidates' + inlineNote + skippedNote + ' in ' + elapsedFill + ' before stopping.';
        var kind = (fillResult.abortReason === 'unexpected-diff' && fillResult.rollbackOk === false) ? 'error' : 'warning';
        if (kind === 'error') msg = 'CRITICAL: ' + msg;
        else msg += ' Nothing was damaged.';
        showRemoveInvalidToast(msg, kind);
        if (fillResult.wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
        if (originalMode) await ensureMode(originalMode);
        return;
      }
      // Now strip invalid pencilmarks in those same cells.
      var removeResult = await _removeInvalidPencilmarksMultiPass({ cellFilter: selected });
      var totalElapsed = formatDuration(performance.now() - t0);
      if (removeResult.aborted) {
        // Compose a combined message
        var t = removeResult.abortTarget;
        var desc = t ? (t.type + ' ' + t.digit + ' in cell (' + t.cellX + ',' + t.cellY + ')') : '(unknown)';
        var kind = (removeResult.abortReason === 'unexpected-diff' && removeResult.rollbackOk === false) ? 'error' : 'warning';
        var inlineR = fillResult.removedCount || 0;
        var msg = 'Filled ' + fillResult.addedCount + ' candidates' + (inlineR > 0 ? ', removed ' + inlineR + ' inline' : '') +
                  ', then aborted during final removal sweep at ' + desc +
                  ' (' + removeResult.abortReason + ').\nRemoved ' + removeResult.removed + ' of ' + removeResult.totalTargets +
                  ' sweep marks. Total time ' + totalElapsed + '.';
        if (kind === 'error') msg = 'CRITICAL: ' + msg;
        else msg += ' Nothing was damaged.';
        showRemoveInvalidToast(msg, kind);
        if (fillResult.wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
        if (originalMode) await ensureMode(originalMode);
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

  function buildActionButton(opts) {
    // opts: { id, wrapId, shortLabel, fullLabel, settingsKey, onClick }
    //
    // Architecture:
    //   wrap (div, fixed btnW×btnH in grid) — never resizes, so expanding never shifts page layout
    //     clipper (div, position:absolute, overflow:hidden) — transitions width rightward on hover
    //       label (div, EXPANDED_W wide) — single text element; textContent swaps at expand/collapse
    //
    // Single element means both states share identical position — no sliding or alignment mismatch.
    // Because clipper is position:absolute inside wrap, its growth is out-of-flow and
    // cannot push the banner, puzzle, or any other page element.
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
    // computed colour races DR's build-time conversion and can load grey, and
    // also lets DR ping-pong our label on hover. A literal + watchDR is stable.
    var textColor = 'rgb(181, 104, 228)';
    var borderCol = colorRefStyle ? colorRefStyle.borderColor : 'rgb(62, 68, 70)';
    var borderRad = refStyle ? refStyle.borderRadius : '8px';
    var EXPANDED_W = 245;    // ← expanded button width in pixels — change to taste
    var DELAY_MS   = 300;    // ← hover delay before expanding (ms)
    var EXPAND_S   = '0.4s'; // ← expansion animation duration
    var COLLAPSE_S = '0.15s'; // ← collapse animation duration

    function applyColors(el, props) {
      Object.keys(props).forEach(function (p) { el.style.setProperty(p, props[p], 'important'); });
    }
    function watchDR(el, props) {
      new MutationObserver(function (mutations) {
        var hit = false;
        mutations.forEach(function (m) {
          if (m.attributeName && m.attributeName.indexOf('darkreader') !== -1) {
            el.removeAttribute(m.attributeName); hit = true;
          }
        });
        if (hit) applyColors(el, props);
      }).observe(el, { attributes: true });
    }

    // Wrapper: fills the grid cell (100%×100%) so sizing matches neighboring buttons
    var wrap = document.createElement('div');
    wrap.id = opts.wrapId;
    Object.assign(wrap.style, {
      position:   'relative',
      overflow:   'visible',
      width:      '100%',
      height:     '100%',
      visibility: settings[opts.settingsKey] === false ? 'hidden' : 'visible',
    });

    // Clipper: absolutely-positioned within wrap; top:2px nudges it down to align with neighbors.
    // overflow:hidden clips the label; width transitions reveal/hide the full label text.
    var clipper = document.createElement('div');
    Object.assign(clipper.style, {
      position:     'absolute',
      left:         btnMarginL + 'px',  // matches margin-left of neighboring toolbar buttons
      top:          btnMarginT + 'px',  // matches margin-top of neighboring toolbar buttons
      width:        btnW + 'px',
      height:       btnH + 'px',
      overflow:     'hidden',
      borderRadius: borderRad,
      boxSizing:    'border-box',
      cursor:       'pointer',
    });
    // Record the collapsed width so mouseleave always collapses to the live
    // value — syncClipperOffsets updates this after CSS settles, preventing
    // the button from collapsing to a stale (pre-CSS-load) smaller size.
    clipper.dataset.collapsedW = btnW;
    applyColors(clipper, { 'background-color': bgColor, 'border': '1px solid ' + borderCol });
    watchDR(clipper,     { 'background-color': bgColor, 'border': '1px solid ' + borderCol });

    // Calculate padding-left so the short label appears centered in btnW.
    // Both collapsed and expanded text use the same paddingLeft, so they share the same x position.
    var _canvas = document.createElement('canvas');
    var _ctx = _canvas.getContext('2d');
    _ctx.font = '700 14px Roboto, Arial, sans-serif';  // ← keep in sync with the label fontSize/weight below
    var _maxLineW = Math.max.apply(null, opts.shortLabel.split('\n').map(function(l) { return _ctx.measureText(l).width; }));
    var labelPadLeft = Math.max(2, Math.round((btnW - _maxLineW) / 2));

    // Single label element. Two rendering modes:
    //   Collapsed: width=btnW, justifyContent+textAlign center → each short-label line centered
    //              independently (works for "Clear\nAll" — both lines center individually)
    //   Expanded:  width=EXPANDED_W, left-aligned at paddingLeft=labelPadLeft → same start x
    //              as the centered short text, so the swap is seamless
    var label = document.createElement('div');
    label.id = opts.id;
    Object.assign(label.style, {
      position:       'absolute',
      left: '0', top: '0',
      width:          btnW + 'px',     // starts at collapsed width
      height:         btnH + 'px',
      display:        'flex',
      alignItems:     'center',        // vertical center
      justifyContent: 'center',        // horizontal center of the text block within btnW
      textAlign:      'center',        // centers each line within the text block
      whiteSpace:     'pre',           // preserves \n in shortLabel
      boxSizing:      'border-box',
      fontSize:       '14px',          // ← font size — change to taste (keep canvas font above in sync)
      fontFamily:     'Roboto, Arial, sans-serif',
      fontWeight:     '700',           // ← weight — 700=bold, 800/900=heavier
      lineHeight:     '1.2',
      pointerEvents:  'none',
      zIndex:         '2',
    });
    applyColors(label, { 'color': textColor });
    watchDR(label,     { 'color': textColor });
    label.textContent = opts.shortLabel;

    clipper.appendChild(label);
    wrap.appendChild(clipper);

    // Interaction: clipper is the visible mouse target
    clipper.addEventListener('click', function (e) { e.stopPropagation(); opts.onClick(); });

    var expandTimer, collapseEndTimer;
    clipper.addEventListener('mouseenter', function () {
      clearTimeout(collapseEndTimer);
      expandTimer = setTimeout(function () {
        // Switch to expanded mode: left-aligned, starting at same x as the centered short text
        label.style.width          = EXPANDED_W + 'px';
        label.style.justifyContent = 'flex-start';
        label.style.textAlign      = 'left';
        label.style.paddingLeft    = labelPadLeft + 'px';
        label.style.paddingRight   = '12px';
        label.style.whiteSpace     = 'nowrap';
        label.textContent          = opts.fullLabel;
        clipper.style.transition   = 'width ' + EXPAND_S + ' ease';
        clipper.style.width        = EXPANDED_W + 'px';
      }, DELAY_MS);
    });
    clipper.addEventListener('mouseleave', function () {
      clearTimeout(expandTimer);
      clearTimeout(collapseEndTimer);
      // Read the live collapsed width (syncClipperOffsets keeps this current
      // after CSS settles); avoids collapsing to the stale build-time value.
      var cw = parseInt(clipper.dataset.collapsedW, 10) || btnW;
      clipper.style.transition = 'width ' + COLLAPSE_S + ' ease';
      clipper.style.width      = cw + 'px';
      var collapseMs = Math.round(parseFloat(COLLAPSE_S) * 1000);
      collapseEndTimer = setTimeout(function () {
        // Restore collapsed mode: centered short text
        label.style.width          = cw + 'px';
        label.style.justifyContent = 'center';
        label.style.textAlign      = 'center';
        label.style.paddingLeft    = '0';
        label.style.paddingRight   = '0';
        label.style.whiteSpace     = 'pre';
        label.textContent          = opts.shortLabel;
      }, collapseMs);
    });

    return wrap;
  }

  // Re-reads the reference button geometry and colour, then applies them to every
  // action-button clipper. Called right after DOM insertion (handles the common case
  // where SudokuPad CSS is already applied) and again at 100 ms / 500 ms to cover the
  // race where the CSS loads late.
  function syncClipperOffsets() {
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
    // Text colour is a fixed literal (set in buildActionButton) + held by watchDR —
    // we deliberately do NOT re-read/re-apply a live colour here, which used to
    // re-introduce the snapshot race.
    ['sp-fill-btn-wrap', 'sp-clear-btn-wrap', 'sp-clearall-btn-wrap'].forEach(function(id) {
      var wrap = document.getElementById(id);
      if (!wrap || !wrap.firstElementChild) return;
      var clipper = wrap.firstElementChild;
      if (ml) clipper.style.left = ml + 'px';
      if (mt) clipper.style.top  = mt + 'px';
      if (bw) { clipper.style.width = bw + 'px'; clipper.dataset.collapsedW = bw; }
      if (bh) clipper.style.height = bh + 'px';
      if (bg) clipper.style.setProperty('background-color', bg, 'important');
      // Keep label dimensions in sync so collapsed-state centering stays correct.
      var label = clipper.firstElementChild;
      if (label && bw) label.style.width = bw + 'px';
      if (label && bh) label.style.height = bh + 'px';
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
    syncClipperOffsets();                  // immediate: correct if CSS already applied
    setTimeout(syncClipperOffsets, 100);   // early retry: covers most race conditions
    setTimeout(syncClipperOffsets, 500);   // late safety net: always correct after 500 ms
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

  // Scan the live puzzle DOM for digits in use (givens, placed values,
  // pencilmarks). Returns { anomaly, bestGuess, reasons }.
  // anomaly is true if the puzzle is non-standard 9×9 or contains a '0'.
  // Letter marks are NOT an anomaly — the script doesn't operate on letters,
  // so a 9×9 with letter pencilmarks still uses the default 1-9 digit set.
  function detectDigitSet() {
    var found = {};
    function addDigit(c) { if (c && /^[0-9]$/.test(c)) found[c] = true; }
    document.querySelectorAll('#cell-givens text, #cell-values text').forEach(function (t) {
      var v = (t.textContent || '').trim();
      if (v.length === 1) addDigit(v);
    });
    document.querySelectorAll('#cell-pencilmarks text').forEach(function (t) {
      addDigit((t.getAttribute('data-val') || '').trim());
    });
    document.querySelectorAll('#cell-candidates tspan').forEach(function (t) {
      addDigit((t.getAttribute('data-val') || '').trim());
    });
    var gridN = detectGridSize();
    // Build best-guess preserving "1-9 then 0" order (natural sudoku order
    // where 0 is the "extra" 10th digit appended after 9, not pushed to the
    // front by numeric sort). sanitizeDigitSet preserves insertion order, so
    // we just concatenate the right way: 1..min(gridN,9) first, then '0' if
    // detected, then anything else from `found`.
    var guessStr = '';
    for (var i = 1; i <= Math.min(gridN, 9); i++) guessStr += String(i);
    if (found['0']) guessStr += '0';
    Object.keys(found).forEach(function (c) { guessStr += c; });
    var bestGuess = sanitizeDigitSet(guessStr);
    var reasons = [];
    if (gridN !== 9) reasons.push(gridN + '\xd7' + gridN + ' grid detected');
    if (found['0']) reasons.push("digit ‘0’ found in puzzle");
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
      enabledKey: 'regionBorderEnabled',
      label: 'Region borders',
      desc: 'Solid, center-only, or multi-color borders around the puzzle\'s regions (boxes / cages / shape groups).',
      hasColor: false,
      resetKeys: ['regionBorderEnabled',
                  'regionBorderCenterEnabled', 'regionBorderColor', 'regionBorderOpacity', 'regionBorderWidth',
                  'regionBorderMultiEnabled', 'regionColorPalette0', 'regionColorPalette1', 'regionColorPalette2', 'regionColorPalette3',
                  'regionColorStripeWidth', 'regionColorOpacity'],
      subBuilder: function (wrap) {
        // ── Checkbox: Center border ───────────────────────────────────────
        var cbCenterRow = document.createElement('label');
        Object.assign(cbCenterRow.style, { display:'flex', alignItems:'center', gap:'7px', marginTop:'8px', cursor:'pointer', color:'#cdd6f4', fontSize:'12px' });
        var cbCenter = document.createElement('input');
        cbCenter.type = 'checkbox'; cbCenter.checked = !!settings.regionBorderCenterEnabled;
        Object.assign(cbCenter.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
        cbCenterRow.appendChild(cbCenter);
        var cbCenterTxt = document.createElement('span'); cbCenterTxt.textContent = 'Center borders';
        cbCenterRow.appendChild(cbCenterTxt);
        wrap.appendChild(cbCenterRow);

        // Center border sub-options
        var singleSub = document.createElement('div');
        Object.assign(singleSub.style, { paddingLeft:'20px' });
        var singleColorRef = makeColorControl('regionBorderColor', 'regionBorderOpacity');
        var singleColorRow = document.createElement('div');
        Object.assign(singleColorRow.style, { display:'flex', alignItems:'center', gap:'8px', marginTop:'6px' });
        var singleColorLbl = document.createElement('span'); singleColorLbl.textContent = 'Color:';
        Object.assign(singleColorLbl.style, { color:'#cdd6f4', fontSize:'12px', flex:'1' });
        singleColorRow.appendChild(singleColorLbl); singleColorRow.appendChild(singleColorRef);
        singleSub.appendChild(singleColorRow);
        singleSub.appendChild(makeOpacityRow('regionBorderOpacity', singleColorRef));
        singleSub.appendChild(makeWidthRow('regionBorderWidth'));
        wrap.appendChild(singleSub);

        function applyCenterDim() {
          var on = !!settings.regionBorderCenterEnabled;
          singleSub.style.opacity       = on ? '1' : '0.4';
          singleSub.style.pointerEvents = on ? 'auto' : 'none';
          cbCenter.checked = on;
        }
        applyCenterDim();
        cbCenter.addEventListener('change', function() {
          settings.regionBorderCenterEnabled = cbCenter.checked;
          saveSettings(settings); applySettings(); applyCenterDim();
        });
        controlSyncers['regionBorderCenterEnabled'] = applyCenterDim;

        // ── Checkbox: Multi-color border ──────────────────────────────────
        var cbMultiRow = document.createElement('label');
        Object.assign(cbMultiRow.style, { display:'flex', alignItems:'center', gap:'7px', marginTop:'10px', cursor:'pointer', color:'#cdd6f4', fontSize:'12px' });
        var cbMulti = document.createElement('input');
        cbMulti.type = 'checkbox'; cbMulti.checked = !!settings.regionBorderMultiEnabled;
        Object.assign(cbMulti.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
        cbMultiRow.appendChild(cbMulti);
        var cbMultiTxt = document.createElement('span'); cbMultiTxt.textContent = 'Multi-color borders';
        cbMultiRow.appendChild(cbMultiTxt);
        wrap.appendChild(cbMultiRow);

        // Multi-color sub-options
        var multiSub = document.createElement('div');
        Object.assign(multiSub.style, { paddingLeft:'20px' });

        // 4 color swatches — horizontal row
        var swatchRow = document.createElement('div');
        Object.assign(swatchRow.style, { display:'flex', alignItems:'center', gap:'6px', marginTop:'6px' });
        var swatchLbl = document.createElement('span'); swatchLbl.textContent = 'Colors:';
        Object.assign(swatchLbl.style, { color:'#cdd6f4', fontSize:'12px', flexShrink:'0' });
        swatchRow.appendChild(swatchLbl);
        ['regionColorPalette0','regionColorPalette1','regionColorPalette2','regionColorPalette3'].forEach(function(k) {
          swatchRow.appendChild(makeColorControl(k, null));
        });
        multiSub.appendChild(swatchRow);
        multiSub.appendChild(makeWidthRow('regionColorStripeWidth'));
        multiSub.appendChild(makeOpacityRow('regionColorOpacity', null));
        wrap.appendChild(multiSub);

        function applyMultiDim() {
          var on = !!settings.regionBorderMultiEnabled;
          multiSub.style.opacity       = on ? '1' : '0.4';
          multiSub.style.pointerEvents = on ? 'auto' : 'none';
          cbMulti.checked = on;
        }
        applyMultiDim();
        cbMulti.addEventListener('change', function() {
          settings.regionBorderMultiEnabled = cbMulti.checked;
          saveSettings(settings); applySettings(); applyMultiDim();
        });
        controlSyncers['regionBorderMultiEnabled'] = applyMultiDim;
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'givenEnabled',
      label: 'Given digits',
      desc: 'Pre-filled clue digits (cell-given class). Overlay constraint labels are left to DarkReader.',
      hasColor: true,
      colorKey: 'givenColor',
      opacityKey: 'givenOpacity',
      resetKeys: ['givenColor','givenOpacity'],
    }));

    content.appendChild(buildSection({
      enabledKey: 'labelBgEnabled',
      label: 'Label background',
      desc: 'Background behind cage sums, little-killer clues, and similar text labels',
      hasColor: true,
      colorKey: 'labelBgColor',
      opacityKey: 'labelBgOpacity',
      resetKeys: ['labelBgColor','labelBgOpacity'],
    }));

    content.appendChild(buildSection({
      enabledKey: 'underlayEnabled',
      label: 'Object Shading',
      desc: 'Tint and outline puzzle objects — shape backgrounds, cage fills, lines (thermos, palindromes, etc.), and their borders. Colored and gray objects have separate controls because gray reads dim where color reads bright at the same value.',
      hasColor: false,
      resetKeys: [
        'underlaySeparateBrightnessOpacity',
        'underlayLightness','underlayLightnessEnabled',
        'underlayOpacity','underlayOpacityEnabled',
        'underlayGrayBrightness','underlayGrayBrightnessEnabled',
        'underlayGrayOpacity','underlayGrayOpacityEnabled',
        'underlayStrokeLightness','underlayStrokeLightnessEnabled',
      ],
      subBuilder: function (wrap) {
        // Combined sliders (shown when "separate" is OFF): each drives both its
        // brightness and opacity keys to the same value via extraKeys.
        var rowColorCombined = makeRangeRow({ key: 'underlayLightness', enabledKey: 'underlayLightnessEnabled', extraKeys: ['underlayOpacity'], extraEnabledKeys: ['underlayOpacityEnabled'], label: 'Color object brightness', min: 0, max: 1, step: 0.05 });
        var rowGrayCombined  = makeRangeRow({ key: 'underlayGrayBrightness', enabledKey: 'underlayGrayBrightnessEnabled', extraKeys: ['underlayGrayOpacity'], extraEnabledKeys: ['underlayGrayOpacityEnabled'], label: 'Gray object brightness', min: 0, max: 1, step: 0.05 });
        // Separate sliders (shown when "separate" is ON).
        var rowColorBright  = makeRangeRow({ key: 'underlayLightness',      enabledKey: 'underlayLightnessEnabled',      label: 'Color brightness', min: 0, max: 1, step: 0.05 });
        var rowColorOpacity = makeRangeRow({ key: 'underlayOpacity',        enabledKey: 'underlayOpacityEnabled',        label: 'Color opacity',    min: 0, max: 1, step: 0.05 });
        var rowGrayBright   = makeRangeRow({ key: 'underlayGrayBrightness', enabledKey: 'underlayGrayBrightnessEnabled', label: 'Gray brightness',  min: 0, max: 1, step: 0.05 });
        var rowGrayOpacity  = makeRangeRow({ key: 'underlayGrayOpacity',    enabledKey: 'underlayGrayOpacityEnabled',    label: 'Gray opacity',     min: 0, max: 1, step: 0.05 });
        var rowBorder       = makeRangeRow({ key: 'underlayStrokeLightness', enabledKey: 'underlayStrokeLightnessEnabled', label: 'Border brightness', min: 0, max: 1, step: 0.05 });

        var combinedRows = [rowColorCombined, rowGrayCombined];
        var separateRows = [rowColorBright, rowColorOpacity, rowGrayBright, rowGrayOpacity];
        var allRows = [rowColorCombined, rowColorBright, rowColorOpacity, rowGrayCombined, rowGrayBright, rowGrayOpacity, rowBorder];

        // Order: color first, then gray, then the always-single border row.
        [rowColorCombined, rowColorBright, rowColorOpacity, rowGrayCombined, rowGrayBright, rowGrayOpacity, rowBorder]
          .forEach(function (r) { wrap.appendChild(r); });

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
         'underlayStrokeLightness','underlayStrokeLightnessEnabled'
        ].forEach(function (k) { controlSyncers[k] = refreshAll; });

        updateMode();
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'cellColorsOpacityEnabled',
      label: 'Cell shading',
      desc: 'Adjust the opacity of puzzle-defined colored cells (so borders, pencilmarks, and other elements remain visible beneath them).',
      hasColor: false,
      resetKeys: ['cellColorsOpacity', 'cellColorsOpacityEnabled'],
      subBuilder: function (wrap) {
        wrap.appendChild(makeRangeRow({ key: 'cellColorsOpacity', label: 'Opacity', min: 0, max: 1, step: 0.05 }));
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'centerEnabled',
      label: 'Center pencilmarks',
      desc: 'Digits entered as center pencilmarks',
      hasColor: false,
      resetKeys: ['centerValidColor','centerValidOpacity',
                  'centerInvalidColor','centerInvalidOpacity',
                  'centerHideInvalid','centerMoveInvalidRight'],
      subBuilder: function (wrap) {
        wrap.appendChild(makeColorRow('Valid digits',   'centerValidColor',   'centerValidOpacity'));
        wrap.appendChild(makeColorRow('Invalid digits', 'centerInvalidColor', 'centerInvalidOpacity'));
        wrap.appendChild(makeSubCheckbox('centerHideInvalid',      'Hide invalid digits'));
        wrap.appendChild(makeSubCheckbox('centerMoveInvalidRight', 'Move invalid digits to the right'));
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'cornerEnabled',
      label: 'Corner pencilmarks',
      desc: 'Digits entered as corner pencilmarks',
      hasColor: false,
      resetKeys: ['cornerValidColor','cornerValidOpacity',
                  'cornerInvalidColor','cornerInvalidOpacity',
                  'cornerHideInvalid','cornerMoveInvalidEnd'],
      subBuilder: function (wrap) {
        wrap.appendChild(makeColorRow('Valid digits',   'cornerValidColor',   'cornerValidOpacity'));
        wrap.appendChild(makeColorRow('Invalid digits', 'cornerInvalidColor', 'cornerInvalidOpacity'));
        wrap.appendChild(makeSubCheckbox('cornerHideInvalid',    'Hide invalid digits'));
        wrap.appendChild(makeSubCheckbox('cornerMoveInvalidEnd', 'Move invalid digits to the end'));
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'kropkiFixEnabled',
      label: 'Kropki dots',
      desc: 'Fix DarkReader inverting white/black Kropki dot colors.',
      hasColor: false,
      resetKeys: ['kropkiFixEnabled',
                  'kropkiColonEnabled', 'kropkiBlackLabelText', 'kropkiBlackLabelRotate', 'kropkiOutlineEnabled',
                  'kropkiWhiteOutlineEnabled',
                  'kropkiConsecLabelEnabled', 'kropkiConsecLabelText', 'kropkiConsecLabelRotate'],
      subBuilder: function (wrap) {
        // ── 2:1 (black) dot label ─────────────────────────────────────────
        var blackRow = document.createElement('div');
        Object.assign(blackRow.style, { display:'flex', alignItems:'center', gap:'6px', marginTop:'6px' });
        var blCb = document.createElement('input');
        blCb.type = 'checkbox'; blCb.checked = !!settings.kropkiColonEnabled;
        Object.assign(blCb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
        var blLbl = document.createElement('span');
        blLbl.textContent = 'Label on 2:1 (black) dots:';
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
        wrap.appendChild(makeSubCheckbox('kropkiOutlineEnabled', 'White outline on 2:1 (black) dots'));

        // ── Consecutive (white) dot label ─────────────────────────────────
        var consecDiv = document.createElement('div');
        Object.assign(consecDiv.style, { marginTop:'8px', paddingTop:'6px', borderTop:'1px solid #313244' });
        var whiteRow = document.createElement('div');
        Object.assign(whiteRow.style, { display:'flex', alignItems:'center', gap:'6px' });
        var wlCb = document.createElement('input');
        wlCb.type = 'checkbox'; wlCb.checked = !!settings.kropkiConsecLabelEnabled;
        Object.assign(wlCb.style, { cursor:'pointer', accentColor:'#89b4fa', width:'13px', height:'13px', flexShrink:'0', margin:'0' });
        var wlLbl = document.createElement('span');
        wlLbl.textContent = 'Label on consecutive (white) dots:';
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
        consecDiv.appendChild(makeSubCheckbox('kropkiWhiteOutlineEnabled', 'Black outline on consecutive (white) dots'));
        wrap.appendChild(consecDiv);
      },
    }));

    content.appendChild(buildSection({
      enabledKey: 'selectionColorEnabled',
      label: 'Cell selection border',
      desc: 'Override the color, opacity, width, and growth direction of the selection-perimeter border.',
      hasColor: false,
      resetKeys: ['selectionColorEnabled', 'selectionColor', 'selectionOpacity', 'selectionWidth',
                  'selectionBorderMode', 'selectionBorderOffset'],
      subBuilder: function (wrap) {
        // Migrate any leftover 'center' value from a previous version of this
        // script to 'inside' (the new default), so the radio row has a
        // matching selected option to display.
        if (settings.selectionBorderMode !== 'inside' && settings.selectionBorderMode !== 'outside') {
          settings.selectionBorderMode = 'inside';
          saveSettings(settings);
        }
        wrap.appendChild(makeColorRow('Color', 'selectionColor', 'selectionOpacity'));
        wrap.appendChild(makeWidthRow('selectionWidth'));
        wrap.appendChild(makeRadioRow('Grow', 'selectionBorderMode', [
          { value: 'inside',  label: 'Inside'  },
          { value: 'outside', label: 'Outside' },
        ]));
        wrap.appendChild(makeOffsetRow('selectionBorderOffset'));
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
    var ACTION_RESET_KEYS = ['showActionButtons', 'showEasyShadeButton', 'suppressStartDialog', 'showToasts', 'toastPersist'];
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
    actionSection.appendChild(easyShadeVisCbRow);

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
      padding: '2px 10px', cursor: 'pointer', fontSize: '11px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      flexShrink: '0', marginLeft: '8px',
    });
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
      padding: '5px 10px', cursor: 'pointer', fontSize: '11px', width: '100%',
    });
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
      zIndex: '999999', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      padding: '0', lineHeight: '1',
    });
    // Save the digit set field and hide the panel.
    function closePanel() {
      if (panel.style.display === 'none') return;
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
    // always reflect the chosen colours. setProperty !important + stripping DR's
    // markers keeps DarkReader from darkening them; refreshSwatches re-asserts on
    // palette change (via applySettings) and on DR rewrites (via the observer).
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
        sq.removeAttribute('data-darkreader-inline-bgcolor');
        sq.style.removeProperty('--darkreader-inline-bgcolor');
      });
    }
    refreshSwatches();
    easyShadeSwatchRefresh = refreshSwatches; // let applySettings keep them current
    // (DR re-assertion for swatches is handled by the subtree observer on btn below.)
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

    var cardTextEls = [];  // text nodes whose colour we hold against DR (see refreshCardText)

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

    // Hold the card text at the accent purple against DarkReader. A literal
    // colour + !important + stripping DR's marker is stable (DR doesn't come back
    // — unlike the var/observer approaches that flickered). Re-asserted on show.
    function refreshCardText() {
      cardTextEls.forEach(function (el) {
        el.style.setProperty('color', accentCol, 'important');
        el.removeAttribute('data-darkreader-inline-color');
        el.style.removeProperty('--darkreader-inline-color');
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
      // Force the text colour on the button AND its child text divs — DarkReader
      // converts child text nodes independently, so the label would otherwise go
      // grey while btn's own colour stays purple. Literal + !important + strip = stable.
      [btn, lbl, modeLbl].forEach(function (el) {
        el.style.setProperty('color', accentCol, 'important');
        el.removeAttribute('data-darkreader-inline-color');
        el.style.removeProperty('--darkreader-inline-color');
      });
      // Keep sliders in sync with settings (e.g. after a reset).
      regionOp.sync(); shadedOp.sync();
    }

    // DarkReader may rewrite inline styles on the button OR its children (text
    // divs, swatches) — restore ours when it does. Subtree so child mutations fire.
    new MutationObserver(function (mutations) {
      var hit = false;
      mutations.forEach(function (m) {
        if (m.attributeName && m.attributeName.indexOf('darkreader') !== -1) {
          if (m.target.removeAttribute) m.target.removeAttribute(m.attributeName);
          hit = true;
        }
      });
      if (hit) { applyToggleStyle(); refreshSwatches(); }
    }).observe(btn, { attributes: true, subtree: true, attributeFilter: ['data-darkreader-inline-color', 'data-darkreader-inline-bgcolor'] });

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
      zIndex:        '999999',
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

  function buildAllUI() {
    suppressStartDialog();
    buildVersionLabel();
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
  }
  if (document.body) buildAllUI();
  else document.addEventListener('DOMContentLoaded', buildAllUI);

})();
