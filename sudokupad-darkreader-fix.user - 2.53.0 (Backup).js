// ==UserScript==
// @name         SudokuPad – DarkReader Fix
// @namespace    https://sudokupad.app/
// @version      2.53.0
// @description  Fixes DarkReader/dark-theme visual issues on sudokupad.app. Section defaults match the on-screen colours so enabling a section produces no visible change — the user sees their starting point and tweaks from there.
// @match        https://sudokupad.app/*
// @match        https://beta.sudokupad.app/*
// @match        https://app.crackingthecryptic.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

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

  var SETTINGS_KEY = 'sp-darkreader-fix';

  var DEFAULTS = {
    regionBorderEnabled:           false,
    regionBorderColor:             '#9600ff',   // rgb(150, 0, 255) — vivid purple
    regionBorderOpacity:           1.0,
    regionBorderWidth:             '5',

    givenEnabled:                  false,
    givenColor:                    '#e8e6e3',
    givenOpacity:                  1.0,

    labelBgEnabled:                false,
    labelBgColor:                  '#000000',   // black so default white label text is readable
    labelBgOpacity:                1.0,

    underlayEnabled:               false,
    underlayLightness:             0.3,   // 0..1; fill: 0 = black, 0.5 = pure hue at max saturation, 1 = white
    underlayLightnessEnabled:      true,
    underlayOpacity:               0.3,   // 0..1; fill: absolute alpha — 0 = transparent, 1 = fully opaque
    underlayOpacityEnabled:        true,
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

    showFillBtn:                   true,
    showClearBtn:                  true,
    showClearAllBtn:               true,
  };

  function loadSettings() {
    try {
      var stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? Object.assign({}, DEFAULTS, JSON.parse(stored)) : Object.assign({}, DEFAULTS);
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

    if (s.regionBorderEnabled) {
      var rb = hexToRgba(s.regionBorderColor, s.regionBorderOpacity);
      css += `
      html:not([data-darkreader-scheme="dark"]) body.setting-uitheme-purple #cell-grids .cage-box {
        stroke: ${rb} !important;
      }`;
      if (s.regionBorderWidth) {
        css += `
        html:not([data-darkreader-scheme="dark"]) body.setting-uitheme-purple #cell-grids .cage-box {
          stroke-width: ${s.regionBorderWidth}px !important;
        }`;
      }
    }

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

    // Always-on: colour-swatch palette restoration (DR overrides --cell-color-N).
    css += `
    html[data-darkreader-scheme="dark"] {
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

  function applySettings() {
    rebuildStyleTag();
    var svg = document.getElementById('svgrenderer');
    if (svg) { fixAllLabelRects(svg); fixAllCageBoxes(svg); fixAllUnderlays(svg); fixAllCagePaths(svg); fixAllGivens(svg); }
    var cc = document.getElementById('cell-candidates');
    if (cc) { sortAllCandidateCells(cc); fixAllCenterTspans(cc); }
    var cp = document.getElementById('cell-pencilmarks');
    if (cp) { reorderAllCornerCells(cp); fixAllCornerTexts(cp); }
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
  // Shared lightness transform. Returns [r,g,b] from an original colour
  // mapped through the "black → pure hue → white" axis at the given L.
  function shadingTransform(c, L) {
    if (L < 0) L = 0; else if (L > 1) L = 1;
    var hsl = rgbToHsl(c.r, c.g, c.b);
    if (hsl[1] === 0) {
      var v = Math.round(L * 255);
      return [v, v, v];
    }
    return hslToRgb(hsl[0], 1, L);
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
    var doFL = settings.underlayLightnessEnabled;
    var doFO = settings.underlayOpacityEnabled;
    if (!doFL && !doFO) {
      el.style.removeProperty('fill');
      el.style.removeProperty('fill-opacity');
      return;
    }
    var rgb = doFL ? shadingTransform(c, settings.underlayLightness) : [c.r, c.g, c.b];
    var fa = doFO ? settings.underlayOpacity : c.a;
    if (fa < 0) fa = 0; else if (fa > 1) fa = 1;
    el.style.setProperty('fill', 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')', 'important');
    el.style.setProperty('fill-opacity', String(fa), 'important');
    el.removeAttribute('data-darkreader-inline-fill');
    el.style.removeProperty('--darkreader-inline-fill');
  }

  // Stroke (shape outline) — gated by Region borders section + slider enable.
  // Opacity locked at 1.0; only lightness is configurable.
  function applyShapeStroke(el) {
    if (!settings.regionBorderEnabled || !settings.underlayStrokeLightnessEnabled) {
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
  function fixAllUnderlays(svg) {
    svg.querySelectorAll('#underlay rect').forEach(fixUnderlayRect);
  }

  var CAGE_FILL_SEL = '#cages path[fill]:not([fill="none"])';
  function fixCagePath(path) {
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

  // Given digits & overlay text — apply colour via inline fill so DR doesn't
  // re-convert it (same approach as center/corner pencilmarks).
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
    svg.querySelectorAll('#cell-givens text, text.cell-given, #overlay text').forEach(fixGivenText);
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
    fixAllGivens(svg);
    startCageBoxPatch(svg);
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
            } else if (el.tagName === 'path') {
              if (el.closest('#cages') && el.matches(CAGE_FILL_SEL)) fixCagePath(el);
            } else if (el.tagName === 'text') {
              if (el.closest('#cell-givens') || el.closest('#overlay') || el.classList.contains('cell-given')) fixGivenText(el);
            }
          } else if (m.attributeName === 'data-darkreader-inline-color') {
            if (el.tagName === 'text') {
              if (el.closest('#cell-givens') || el.closest('#overlay') || el.classList.contains('cell-given')) fixGivenText(el);
            }
          }
        } else if (m.type === 'childList' && m.addedNodes.length > 0) needsFullScan = true;
      }
      if (needsFullScan) { fixAllLabelRects(svg); fixAllUnderlays(svg); fixAllCagePaths(svg); fixAllGivens(svg); }
    }).observe(svg, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-darkreader-inline-fill', 'data-darkreader-inline-color'] });
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

  // ── Part 4b: region borders (cage-box) ────────────────────────────────────
  // When our stroke/width is NOT being applied, restore DR's expected inline
  // stroke variable so DR's converted colour shows correctly. This fixes the
  // "second disable makes the border disappear" issue.

  function fixCageBox(el) {
    var inDR = isDarkReader();

    if (settings.regionBorderEnabled) {
      el.style.removeProperty('--darkreader-inline-stroke');
      el.style.setProperty('stroke', hexToRgba(settings.regionBorderColor, settings.regionBorderOpacity), 'important');
      if (settings.regionBorderWidth) {
        el.style.setProperty('stroke-width', settings.regionBorderWidth + 'px', 'important');
      } else {
        el.style.removeProperty('stroke-width');
      }
    } else {
      el.style.removeProperty('stroke');
      el.style.removeProperty('stroke-width');
      if (inDR) {
        // Restore DR's managed stroke variable so DR's converted colour renders.
        el.style.setProperty('--darkreader-inline-stroke', 'var(--darkreader-text-000000, #e8e6e3)');
      }
    }
  }
  function fixAllCageBoxes(svg) { svg.querySelectorAll('#cell-grids .cage-box').forEach(fixCageBox); }
  function startCageBoxPatch(svg) {
    var cellGrids = document.getElementById('cell-grids');
    if (!cellGrids) return;
    fixAllCageBoxes(svg);
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes' && m.attributeName === 'style') {
          if (m.target.classList && m.target.classList.contains('cage-box')) fixCageBox(m.target);
        } else if (m.type === 'childList' && m.addedNodes.length > 0) fixAllCageBoxes(svg);
      }
    }).observe(cellGrids, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
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
  // Esc is allowed through so the panel-close handler still works.
  var BLOCKED_EVENTS = [
    'mousedown','mousemove','mouseup',
    'pointerdown','pointermove','pointerup',
    'touchstart','touchmove','touchend',
    'dragstart','selectstart',
    'keydown','keyup','keypress',
  ];
  function isInOurUI(t) {
    return t && t.closest && (
      t.closest('#sp-fix-panel') || t.closest('#sp-fix-btn') ||
      t.closest('#sp-fill-btn-wrap') || t.closest('#sp-clear-btn-wrap') || t.closest('#sp-clearall-btn-wrap')
    );
  }
  BLOCKED_EVENTS.forEach(function (type) {
    document.addEventListener(type, function (e) {
      if (!isInOurUI(e.target)) return;
      if (type.indexOf('key') === 0 && e.key === 'Escape') return;  // let Esc through
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
    // opts: { key, label, min, max, step, format, enabledKey }
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
      pct.textContent = fmt(v);
      saveSettings(settings); applySettings();
    });
    if (checkbox) {
      checkbox.addEventListener('change', function () {
        settings[opts.enabledKey] = checkbox.checked;
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
      (opts.resetKeys || []).forEach(function (k) {
        if (k in DEFAULTS) settings[k] = DEFAULTS[k];
      });
      saveSettings(settings); applySettings();
      // Re-sync any registered controls (checkbox, swatches, sliders, etc.)
      (opts.resetKeys || []).forEach(function (k) {
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

  function dispatchClickAt(x, y) {
    // SudokuPad's cell-selection handler requires PointerEvent (not MouseEvent)
    // and listens on DIV.grid. Dispatching MouseEvent to elementFromPoint can
    // fail when the topmost element is the SVG root and the handler checks
    // event instanceof PointerEvent. Dispatch to DIV.grid with correct
    // clientX/Y so the handler can compute which cell was clicked.
    var grid = document.querySelector('.grid');
    var el = grid || document.elementFromPoint(x, y);
    if (!el) return;
    var pInit = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0, isPrimary: true };
    var mInit = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', pInit));
    el.dispatchEvent(new MouseEvent('mousedown',    mInit));
    el.dispatchEvent(new PointerEvent('pointerup',  pInit));
    el.dispatchEvent(new MouseEvent('mouseup',      mInit));
    el.dispatchEvent(new MouseEvent('click',        mInit));
  }
  function dispatchClickEl(el) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    var cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    var init = { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy, button: 0 };
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (t) {
      el.dispatchEvent(new MouseEvent(t, init));
    });
  }
  function svgToClient(svg, sx, sy) {
    var rect = svg.getBoundingClientRect();
    var vb = (svg.getAttribute('viewBox') || '-16 -16 608 608').split(/\s+/).map(Number);
    var scaleX = rect.width  / vb[2];
    var scaleY = rect.height / vb[3];
    return { x: rect.x + (sx - vb[0]) * scaleX, y: rect.y + (sy - vb[1]) * scaleY };
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
    document.querySelectorAll('#cell-pencilmarks text').forEach(function (t) {
      snap.corner.add(t.getAttribute('x') + ',' + t.getAttribute('y') + ',' + t.getAttribute('data-val'));
    });
    document.querySelectorAll('#cell-candidates text.cell-candidate').forEach(function (text) {
      var x = text.getAttribute('x'), y = text.getAttribute('y');
      text.querySelectorAll('tspan').forEach(function (sp) {
        snap.centre.add(x + ',' + y + ',' + sp.getAttribute('data-val'));
      });
    });
    document.querySelectorAll('#cell-values text').forEach(function (t) {
      snap.values.add(t.getAttribute('x') + ',' + t.getAttribute('y') + ',' + (t.textContent || '').trim());
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
  // or 'error' — controls colour only. All toasts stay visible until the
  // user clicks the × button (or anywhere on the toast).
  function getToastBottom() {
    var panel = document.getElementById('sp-fix-panel');
    if (panel && panel.style.display !== 'none') {
      return (56 + panel.offsetHeight + 8) + 'px';
    }
    return '56px';
  }

  function showRemoveInvalidToast(message, kind) {
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

  // Infer the grid size N from the SVG viewBox. For an N×N grid the coordinate
  // space is approximately N*64 wide with ~16px padding on each side, giving
  // viewBox width ≈ N*64 + 32. Returns an integer clamped to 4–16.
  function detectGridSize() {
    var svg = document.getElementById('svgrenderer');
    if (!svg) return 9;
    var vb = svg.getAttribute('viewBox');
    if (!vb) return 9;
    var parts = vb.trim().split(/[\s,]+/).map(Number);
    var totalWidth = parts[2];
    if (!totalWidth || isNaN(totalWidth) || totalWidth <= 0) return 9;
    var N = Math.round((totalWidth - 32) / 64);
    return Math.max(4, Math.min(N, 16));
  }

  // Lock to prevent concurrent action runs (clicking multiple action buttons
  // mid-execution). The fill operation internally invokes the remove logic;
  // shared lock makes that safe via _removeInvalidPencilmarksInternal which
  // does NOT touch the lock — only public entry points do.
  var actionInProgress = false;

  // Remove every invalid (conflict-marked) pencilmark by simulating user input.
  // Handles digits 1-9. Zero and letter conflict marks are skipped and reported
  // in the toast so the user can handle them manually.
  // CORRECTNESS is the priority over speed: we verify mode, verify cell selection,
  // and verify each digit click produced exactly the expected diff. If anything
  // unexpected happens (mode drifts, wrong cell got modified, extra removal), we
  // abort immediately so we don't damage the player's valid pencilmarks.
  // Worker for invalid-pencilmark removal. Pure: returns a result object,
  // never shows toasts (callers handle messaging). Doesn't touch the action
  // lock so other workers (like fill) can compose it.
  //   opts.cellFilter   — optional Set<"col,row"> to restrict to certain cells
  // Returns: { totalTargets, removed, aborted, abortReason, abortTarget,
  //            rollbackOk, elapsedMs, failures }
  async function _removeInvalidPencilmarksInternal(opts) {
    var svg = document.getElementById('svgrenderer');
    if (!svg) return { totalTargets: 0, removed: 0, aborted: false, elapsedMs: 0, failures: [] };
    opts = opts || {};
    var cellFilter = opts.cellFilter;

    var targets = [];
    var skippedZeros = 0;
    var skippedLetters = 0;
    document.querySelectorAll('#cell-pencilmarks text.conflict').forEach(function (t) {
      var x = t.getAttribute('x'), y = t.getAttribute('y');
      var ck = cellKeyFromMarkXY(x, y);
      if (cellFilter && !cellFilter.has(ck)) return;
      var d = t.getAttribute('data-val');
      if (d === '0') { skippedZeros++; return; }
      if (!/^[1-9]$/.test(d)) { skippedLetters++; return; }
      targets.push({ type: 'corner', cellX: x, cellY: y, digit: d });
    });
    document.querySelectorAll('#cell-candidates tspan.conflict').forEach(function (t) {
      var p = t.parentNode;
      var x = p.getAttribute('x'), y = p.getAttribute('y');
      var ck = cellKeyFromMarkXY(x, y);
      if (cellFilter && !cellFilter.has(ck)) return;
      var d = t.getAttribute('data-val');
      if (d === '0') { skippedZeros++; return; }
      if (!/^[1-9]$/.test(d)) { skippedLetters++; return; }
      targets.push({ type: 'centre', cellX: x, cellY: y, digit: d });
    });

    var startTime = performance.now();
    if (targets.length === 0) {
      return { totalTargets: 0, removed: 0, aborted: false, elapsedMs: performance.now() - startTime, failures: [], skippedZeros: skippedZeros, skippedLetters: skippedLetters };
    }

    var originalMode = getCurrentMode();
    var wasLetterMode = isLetterModeActive();
    if (wasLetterMode) await ensureNumberMode();
    var totalTargets = targets.length;

    return await (async function () {
      var failures = [];
      var removedCount = 0;
      // Group targets by mode so we minimise mode switches and stay deterministic.
      var byMode = { corner: [], centre: [] };
      targets.forEach(function (t) { byMode[t.type].push(t); });

      for (var mi = 0; mi < 2; mi++) {
        var mode = mi === 0 ? 'corner' : 'centre';
        var modeTargets = byMode[mode];
        if (modeTargets.length === 0) continue;

        var modeOk = await ensureMode(mode);
        if (!modeOk) { failures.push('mode-switch-failed:' + mode); continue; }

        // Group this mode's targets by cell so we can do all of a cell's
        // removals while it stays selected.
        var byCell = new Map();
        modeTargets.forEach(function (t) {
          var key = t.cellX + ',' + t.cellY;
          if (!byCell.has(key)) byCell.set(key, []);
          byCell.get(key).push(t);
        });

        var iter = byCell.entries();
        var step;
        while (!(step = iter.next()).done) {
          var cellTargets = step.value[1];
          var cx = parseFloat(cellTargets[0].cellX);
          var cy = parseFloat(cellTargets[0].cellY);
          var pt = svgToClient(svg, cx, cy);
          // Switch to normal mode before clicking the cell so the click replaces
          // (not adds to) the current selection. SudokuPad v0.611+ adds to
          // selection when clicking in centre/corner mode — same fix as fill uses.
          await ensureMode('normal');
          // Only click the cell if it isn't already the sole selection.
          // SudokuPad toggles single-cell selection on repeat click — clicking
          // an already-selected cell deselects it, leaving nothing selected so
          // the subsequent digit click has no effect.
          var cellKey = Math.round((cx - 32) / 64) + ',' + Math.round((cy - 32) / 64);
          var curSel  = getSelectedCells();
          if (!(curSel.size === 1 && curSel.has(cellKey))) {
            dispatchClickAt(pt.x, pt.y);
            await sleep(10);
          }
          var modeRestored = await ensureMode(mode);
          if (!modeRestored) { failures.push('mode-switch-failed-on-cell:' + mode); continue; }

          for (var ti = 0; ti < cellTargets.length; ti++) {
            var target = cellTargets[ti];
            // Defensive: re-verify mode is still what we want (user could have
            // pressed something, or SudokuPad could have auto-switched).
            if (getCurrentMode() !== mode) {
              failures.push('mode-drifted-before-click:' + JSON.stringify(target) + ':' + getCurrentMode());
              if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
              if (originalMode && originalMode !== mode) await ensureMode(originalMode);
              console.warn('[Remove invalid] aborted:', failures);
              return {
                totalTargets: totalTargets, removed: removedCount, skippedZeros: skippedZeros, skippedLetters: skippedLetters, aborted: true,
                abortReason: 'mode-drift', abortTarget: target, rollbackOk: null,
                elapsedMs: performance.now() - startTime, failures: failures,
              };
            }
            var expectedKey = target.cellX + ',' + target.cellY + ',' + target.digit;
            var before = snapshotPencilmarks();
            // If already removed by an earlier step (shouldn't happen since
            // targets are unique, but be safe), skip.
            if (!before[mode].has(expectedKey)) continue;

            dispatchClickEl(getDigitButton(target.digit));
            await sleep(10);

            var after = snapshotPencilmarks();
            var diff = diffSnapshots(before, after);
            // Expected: exactly one removal in target.type, nothing else
            // anywhere. Values and colours must be untouched — if they changed,
            // we were in the wrong mode and just damaged the player's puzzle.
            var expectedSide = mode;
            var otherSide = mode === 'corner' ? 'centre' : 'corner';
            var ok = (
              diff.added.corner.length === 0 && diff.added.centre.length === 0 &&
              diff.added.values.length === 0 && diff.added.colors.length === 0 &&
              diff.removed[otherSide].length === 0 &&
              diff.removed.values.length === 0 && diff.removed.colors.length === 0 &&
              diff.removed[expectedSide].length === 1 &&
              diff.removed[expectedSide][0] === expectedKey
            );
            if (!ok) {
              // Diff isn't what we expected. Three sub-cases to handle:
              //   1. Click had NO effect (diff empty): nothing to undo —
              //      undoing would revert an earlier good removal. Just abort.
              //   2. Click had SOME effect but wrong: undo it to restore the
              //      state that existed before THIS click. Earlier verified
              //      removals stay (they were correct).
              //   3. Undo doesn't fully restore: critical — flag and abort.
              failures.push('unexpected-diff:target=' + JSON.stringify(target) + ':diff=' + JSON.stringify(diff));
              var rollbackOkResult = null;
              if (diffEmpty(diff)) {
                console.warn('[Remove invalid] Click had no effect on this target.', failures);
                if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
                if (originalMode && originalMode !== mode) await ensureMode(originalMode);
                return {
                  totalTargets: totalTargets, removed: removedCount, skippedZeros: skippedZeros, skippedLetters: skippedLetters, aborted: true,
                  abortReason: 'no-effect', abortTarget: target, rollbackOk: null,
                  elapsedMs: performance.now() - startTime, failures: failures,
                };
              }
              var undoBtn = getModeButton('undo');
              if (undoBtn) {
                dispatchClickEl(undoBtn);
                for (var attempt = 0; attempt < 8; attempt++) {
                  await sleep(25);
                  var afterUndo = snapshotPencilmarks();
                  if (diffEmpty(diffSnapshots(before, afterUndo))) { rollbackOkResult = true; break; }
                }
                if (rollbackOkResult === null) rollbackOkResult = false;
              } else {
                rollbackOkResult = false;
              }
              if (rollbackOkResult) {
                console.warn('[Remove invalid] Aborted; offending click rolled back.', failures);
              } else {
                console.error('[Remove invalid] CRITICAL: aborted AND rollback failed.', failures, diff);
              }
              if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
              if (originalMode && originalMode !== mode) await ensureMode(originalMode);
              return {
                totalTargets: totalTargets, removed: removedCount, skippedZeros: skippedZeros, skippedLetters: skippedLetters, aborted: true,
                abortReason: 'unexpected-diff', abortTarget: target,
                rollbackOk: rollbackOkResult,
                elapsedMs: performance.now() - startTime, failures: failures,
              };
            }
            // Verified — this removal succeeded.
            removedCount++;
          }
        }
      }

      // Restore original mode and input mode.
      if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
      if (originalMode && originalMode !== 'corner' && originalMode !== 'centre') {
        await ensureMode(originalMode);
      }
      return {
        totalTargets: totalTargets, removed: removedCount, skippedZeros: skippedZeros, skippedLetters: skippedLetters, aborted: false,
        elapsedMs: performance.now() - startTime, failures: failures,
      };
    })();
  }

  // ── Compose a toast from a worker result ────────────────────────────────
  // contextLabel: noun phrase like "invalid pencilmarks" used in the message
  // emptyMessage: shown when result.totalTargets === 0 (lets caller customise)
  function showWorkerResult(result, contextLabel, emptyMessage) {
    var elapsed = formatDuration(result.elapsedMs);
    var skipParts = [];
    if (result.skippedZeros > 0) {
      skipParts.push(result.skippedZeros + ' zero mark' + (result.skippedZeros === 1 ? '' : 's'));
    }
    if (result.skippedLetters > 0) {
      skipParts.push(result.skippedLetters + ' letter mark' + (result.skippedLetters === 1 ? '' : 's'));
    }
    var skipNote = skipParts.length > 0 ? ' Skipped ' + skipParts.join(' and ') + ' (handle manually).' : '';
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
    } else {
      showRemoveInvalidToast('Aborted on ' + targetDesc + '.' + common, 'warning');
    }
  }

  // Public entry points ─ each takes the action lock, runs work, releases.

  function removeInvalidPencilmarks() {
    if (actionInProgress) { showRemoveInvalidToast('Another operation is still running.', 'warning'); return; }
    actionInProgress = true;
    _removeInvalidPencilmarksInternal({}).then(function (r) {
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
    _removeInvalidPencilmarksInternal({ cellFilter: selected }).then(function (r) {
      showWorkerResult(r, 'invalid marks in selected cells', 'No invalid marks in the selected cell' + (selected.size === 1 ? '' : 's') + '.');
    }).finally(function () { actionInProgress = false; });
  }

  // Fill missing centre candidates (1-9) into each selected cell, then strip
  // any newly-introduced conflicts. Adds only digits not already present, so
  // we never accidentally toggle an existing valid centre mark off.
  async function _fillSelectedInternal(cells) {
    var svg = document.getElementById('svgrenderer');
    if (!svg) return { addedCount: 0, aborted: false, elapsedMs: 0, abortTarget: null };
    var startTime = performance.now();
    var originalMode = getCurrentMode();
    var wasLetterMode = isLetterModeActive();
    // Fill only works in number mode — switch if needed, restore afterwards.
    if (wasLetterMode) { var nmOk = await ensureNumberMode(); if (!nmOk) wasLetterMode = false; }
    var modeOk = await ensureMode('centre');
    if (!modeOk) {
      if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
      return { addedCount: 0, skippedCount: 0, aborted: true, abortReason: 'mode-switch-failed', elapsedMs: performance.now() - startTime };
    }
    var gridN = detectGridSize();
    var addedCount = 0;
    var skippedCount = 0;        // cells skipped because they have a given/placed digit
    // Escape once before the loop to clear any pre-existing selection so the first
    // cell click selects (rather than toggles off an already-selected cell).
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    document.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    var cellsArr = Array.from(cells);
    for (var ci = 0; ci < cellsArr.length; ci++) {
      var parts = cellsArr[ci].split(',').map(Number);
      var col = parts[0], row = parts[1];
      // Skip cells with a given/placed digit (can't be edited).
      if (cellHasValueOrGiven(col, row)) { skippedCount++; continue; }
      var cellSvgX = col * 64 + 32;
      var cellSvgY = row * 64 + 32;
      var pt = svgToClient(svg, cellSvgX, cellSvgY);
      // Switch to normal mode so the click replaces (not adds to) the current
      // selection — SudokuPad centre mode adds to selection in v0.611+.
      await ensureMode('normal');
      // Skip the click if this cell is already the sole selection — clicking it
      // again would toggle it off (SudokuPad deselects on repeat single-cell click).
      var cellKey = col + ',' + row;
      var curSel  = getSelectedCells();
      if (!(curSel.size === 1 && curSel.has(cellKey))) {
        dispatchClickAt(pt.x, pt.y);
        await sleep(10);
      }
      var modeBack = await ensureMode('centre');
      if (!modeBack) {
        if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
        if (originalMode) await ensureMode(originalMode);
        return {
          addedCount: addedCount, skippedCount: skippedCount, aborted: true,
          abortReason: 'mode-switch-failed', abortTarget: null,
          elapsedMs: performance.now() - startTime,
        };
      }
      // Existing centre digits in this cell
      var existing = new Set();
      document.querySelectorAll('#cell-candidates text.cell-candidate').forEach(function (text) {
        if (cellKeyFromMarkXY(text.getAttribute('x'), text.getAttribute('y')) !== (col + ',' + row)) return;
        text.querySelectorAll('tspan').forEach(function (sp) { existing.add(sp.getAttribute('data-val')); });
      });
      for (var d = 1; d <= gridN; d++) {
        if (existing.has(String(d))) continue;
        if (getCurrentMode() !== 'centre') {
          if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
          if (originalMode) await ensureMode(originalMode);
          return {
            addedCount: addedCount, skippedCount: skippedCount, aborted: true, abortReason: 'mode-drift',
            abortTarget: { type: 'centre', digit: String(d), cellX: String(cellSvgX), cellY: String(cellSvgY) },
            elapsedMs: performance.now() - startTime,
          };
        }
        var before = snapshotPencilmarks();
        dispatchClickEl(getDigitButton(d));
        await sleep(10);
        var after = snapshotPencilmarks();
        var diff = diffSnapshots(before, after);
        // If the click had no effect (button not present or digit not valid here),
        // just skip this digit and move on — nothing was damaged.
        if (diffEmpty(diff)) continue;
        // Expected: exactly one centre addition (this cell, this digit), nothing else.
        var ok = (
          diff.removed.corner.length === 0 && diff.removed.centre.length === 0 &&
          diff.removed.values.length === 0 && diff.removed.colors.length === 0 &&
          diff.added.corner.length === 0 && diff.added.values.length === 0 && diff.added.colors.length === 0 &&
          diff.added.centre.length === 1
        );
        if (ok) {
          var addedParts = diff.added.centre[0].split(',');
          var addedCellKey = cellKeyFromMarkXY(addedParts[0], addedParts[1]);
          var addedDigit = addedParts[2];
          if (addedCellKey !== (col + ',' + row) || addedDigit !== String(d)) ok = false;
        }
        if (!ok) {
          // Unexpected non-empty diff — roll back and abort.
          var rollbackOk = null;
          var undoBtn = getModeButton('undo');
          if (undoBtn) {
            dispatchClickEl(undoBtn);
            rollbackOk = false;
            for (var attempt = 0; attempt < 8; attempt++) {
              await sleep(25);
              if (diffEmpty(diffSnapshots(before, snapshotPencilmarks()))) { rollbackOk = true; break; }
            }
          }
          if (wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
          if (originalMode) await ensureMode(originalMode);
          return {
            addedCount: addedCount, skippedCount: skippedCount, aborted: true,
            abortReason: 'unexpected-diff',
            abortTarget: { type: 'centre', digit: String(d), cellX: String(cellSvgX), cellY: String(cellSvgY) },
            rollbackOk: rollbackOk,
            elapsedMs: performance.now() - startTime,
          };
        }
        addedCount++;
      }
    }
    // Don't restore letter mode or input mode here — caller (fillSelectedCellsWithCandidates)
    // will run remove invalid next and restore everything at the very end.
    return { addedCount: addedCount, skippedCount: skippedCount, wasLetterMode: wasLetterMode, aborted: false, elapsedMs: performance.now() - startTime };
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
        var skippedNote = (fillResult.skippedCount > 0) ? ' (skipped ' + fillResult.skippedCount + ' with given/placed digits)' : '';
        var msg = 'Fill aborted while adding ' + desc + ' (' + fillResult.abortReason + ').\nAdded ' + fillResult.addedCount + ' candidates' + skippedNote + ' in ' + elapsedFill + ' before stopping.';
        var kind = (fillResult.abortReason === 'unexpected-diff' && fillResult.rollbackOk === false) ? 'error' : 'warning';
        if (kind === 'error') msg = 'CRITICAL: ' + msg;
        else msg += ' Nothing was damaged.';
        showRemoveInvalidToast(msg, kind);
        if (fillResult.wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
        if (originalMode) await ensureMode(originalMode);
        return;
      }
      // Now strip invalid pencilmarks in those same cells.
      var removeResult = await _removeInvalidPencilmarksInternal({ cellFilter: selected });
      var totalElapsed = formatDuration(performance.now() - t0);
      if (removeResult.aborted) {
        // Compose a combined message
        var t = removeResult.abortTarget;
        var desc = t ? (t.type + ' ' + t.digit + ' in cell (' + t.cellX + ',' + t.cellY + ')') : '(unknown)';
        var kind = (removeResult.abortReason === 'unexpected-diff' && removeResult.rollbackOk === false) ? 'error' : 'warning';
        var msg = 'Filled ' + fillResult.addedCount + ' candidates, then aborted during invalid-removal at ' + desc +
                  ' (' + removeResult.abortReason + ').\nRemoved ' + removeResult.removed + ' of ' + removeResult.totalTargets +
                  ' invalid marks. Total time ' + totalElapsed + '.';
        if (kind === 'error') msg = 'CRITICAL: ' + msg;
        else msg += ' Nothing was damaged.';
        showRemoveInvalidToast(msg, kind);
        if (fillResult.wasLetterMode) dispatchClickEl(document.querySelector('[data-control="toggleletter"]'));
        if (originalMode) await ensureMode(originalMode);
      } else {
        var n = fillResult.addedCount;
        var r = removeResult.removed;
        var s = fillResult.skippedCount || 0;
        var filledCells = selected.size - s;
        var msg = 'Filled ' + n + ' candidate' + (n === 1 ? '' : 's') +
                  ' in ' + filledCells + ' cell' + (filledCells === 1 ? '' : 's');
        if (s > 0) {
          msg += ' (skipped ' + s + ' with given/placed digits)';
        }
        msg += ', then removed ' + r + ' invalid mark' + (r === 1 ? '' : 's') + ' (' + totalElapsed + ').';
        var removeSkipParts = [];
        if (removeResult.skippedZeros > 0) {
          removeSkipParts.push(removeResult.skippedZeros + ' zero mark' + (removeResult.skippedZeros === 1 ? '' : 's'));
        }
        if (removeResult.skippedLetters > 0) {
          removeSkipParts.push(removeResult.skippedLetters + ' letter mark' + (removeResult.skippedLetters === 1 ? '' : 's'));
        }
        if (removeSkipParts.length > 0) {
          msg += ' Skipped ' + removeSkipParts.join(' and ') + ' (handle manually).';
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
    var textColor = colorRefStyle ? colorRefStyle.color       : 'rgb(181, 104, 228)';
    var borderCol = colorRefStyle ? colorRefStyle.borderColor : 'rgb(62, 68, 70)';
    var borderRad = refStyle ? refStyle.borderRadius : '8px';
    var EXPANDED_W = 260;    // ← expanded button width in pixels — change to taste
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
    applyColors(clipper, { 'background-color': bgColor, 'border': '1px solid ' + borderCol });
    watchDR(clipper,     { 'background-color': bgColor, 'border': '1px solid ' + borderCol });

    // Calculate padding-left so the short label appears centered in btnW.
    // Both collapsed and expanded text use the same paddingLeft, so they share the same x position.
    var _canvas = document.createElement('canvas');
    var _ctx = _canvas.getContext('2d');
    _ctx.font = '800 15px Roboto, Arial, sans-serif';
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
      fontSize:       '15px',          // ← font size — change to taste
      fontFamily:     'Roboto, Arial, sans-serif',
      fontWeight:     '800',           // ← weight — 700=bold, 800/900=heavier
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
      clipper.style.transition = 'width ' + COLLAPSE_S + ' ease';
      clipper.style.width      = btnW + 'px';
      var collapseMs = Math.round(parseFloat(COLLAPSE_S) * 1000);
      collapseEndTimer = setTimeout(function () {
        // Restore collapsed mode: centered short text
        label.style.width          = btnW + 'px';
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
    ['sp-fill-btn-wrap', 'sp-clear-btn-wrap', 'sp-clearall-btn-wrap'].forEach(function(id) {
      var wrap = document.getElementById(id);
      if (!wrap || !wrap.firstElementChild) return;
      var clipper = wrap.firstElementChild;
      if (ml) clipper.style.left = ml + 'px';
      if (mt) clipper.style.top  = mt + 'px';
      if (bw) clipper.style.width  = bw + 'px';
      if (bh) clipper.style.height = bh + 'px';
      if (bg) clipper.style.setProperty('background-color', bg, 'important');
      // Keep label width in sync so collapsed-state centering stays correct.
      var label = clipper.firstElementChild;
      if (label && bw) label.style.width = bw + 'px';
    });
  }

  function buildActionButtons() {
    // The controls-tool grid is 2 columns × 4 rows (grid-auto-flow: column).
    // col 1: normal, corner, centre, colour. col 2: pen, then 3 empty slots.
    // Appending 3 items after pen fills those empty slots automatically.
    var penBtn = document.querySelector('[data-control="pen"]');
    if (!penBtn) return false;
    if (document.getElementById('sp-fill-btn-wrap')) return true;
    var toolContainer = penBtn.parentElement;

    var fillWrap = buildActionButton({
      id: 'sp-fill-btn', wrapId: 'sp-fill-btn-wrap',
      shortLabel: 'Fill', fullLabel: 'Fill selected cells with candidates',
      settingsKey: 'showFillBtn', onClick: fillSelectedCellsWithCandidates,
    });
    var clearWrap = buildActionButton({
      id: 'sp-clear-btn', wrapId: 'sp-clear-btn-wrap',
      shortLabel: 'Clear', fullLabel: 'Clear invalid marks in selection',
      settingsKey: 'showClearBtn', onClick: clearMarksInSelected,
    });
    var clearAllWrap = buildActionButton({
      id: 'sp-clearall-btn', wrapId: 'sp-clearall-btn-wrap',
      shortLabel: 'Clear\nAll',  // two lines; white-space:pre renders the \n
      fullLabel: 'Clear all invalid marks in the puzzle',
      settingsKey: 'showClearAllBtn', onClick: removeInvalidPencilmarks,
    });

    toolContainer.appendChild(fillWrap);
    toolContainer.appendChild(clearWrap);
    toolContainer.appendChild(clearAllWrap);
    syncClipperOffsets();                  // immediate: correct if CSS already applied
    setTimeout(syncClipperOffsets, 100);   // early retry: covers most race conditions
    setTimeout(syncClipperOffsets, 500);   // late safety net: always correct after 500 ms
    return true;
  }

  function buildSettingsUI() {
    var panel = document.createElement('div');
    panel.id = 'sp-fix-panel';
    Object.assign(panel.style, {
      display: 'none', position: 'fixed', bottom: '56px', right: '12px',
      width: '340px', maxHeight: '80vh', overflowY: 'auto',
      background: '#1e1e2e', color: '#cdd6f4',
      border: '1px solid #45475a', borderRadius: '10px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '13px', lineHeight: '1.4',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      zIndex: '999999',
    });

    var header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '11px 14px', background: '#313244',
      borderBottom: '1px solid #45475a',
      position: 'sticky', top: '0', zIndex: '1',
    });
    var title = document.createElement('span');
    title.textContent = 'DarkReader Fix';
    Object.assign(title.style, { fontWeight: '600', fontSize: '14px' });
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button'; closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
      background: 'none', border: 'none', color: '#a6adc8',
      cursor: 'pointer', fontSize: '20px', lineHeight: '1', padding: '0',
    });
    closeBtn.addEventListener('click', function () { panel.style.display = 'none'; });
    header.appendChild(title); header.appendChild(closeBtn);
    panel.appendChild(header);

    panel.appendChild(buildSection({
      enabledKey: 'regionBorderEnabled',
      label: 'Region borders',
      desc: 'Region borders and shape outlines.',
      hasColor: true,
      colorKey: 'regionBorderColor',
      opacityKey: 'regionBorderOpacity',
      resetKeys: ['regionBorderColor','regionBorderOpacity','regionBorderWidth',
                  'underlayStrokeLightness','underlayStrokeLightnessEnabled'],
      subBuilder: function (wrap) {
        wrap.appendChild(makeWidthRow('regionBorderWidth'));
        wrap.appendChild(makeRangeRow({ key: 'underlayStrokeLightness', enabledKey: 'underlayStrokeLightnessEnabled', label: 'Shape brightness', min: 0, max: 1, step: 0.05 }));
      },
    }));

    panel.appendChild(buildSection({
      enabledKey: 'givenEnabled',
      label: 'Given digit & overlay text',
      desc: 'Pre-filled clue digits and overlay labels',
      hasColor: true,
      colorKey: 'givenColor',
      opacityKey: 'givenOpacity',
      resetKeys: ['givenColor','givenOpacity'],
    }));

    panel.appendChild(buildSection({
      enabledKey: 'labelBgEnabled',
      label: 'Label background',
      desc: 'Background behind cage sums, little-killer clues, and similar text labels',
      hasColor: true,
      colorKey: 'labelBgColor',
      opacityKey: 'labelBgOpacity',
      resetKeys: ['labelBgColor','labelBgOpacity'],
    }));

    panel.appendChild(buildSection({
      enabledKey: 'underlayEnabled',
      label: 'Cell shading / underlay',
      desc: 'Coloured cells, shape backgrounds, and cage fills.',
      hasColor: false,
      resetKeys: [
        'underlayLightness','underlayLightnessEnabled',
        'underlayOpacity','underlayOpacityEnabled',
      ],
      subBuilder: function (wrap) {
        wrap.appendChild(makeRangeRow({ key: 'underlayLightness', enabledKey: 'underlayLightnessEnabled', label: 'Brightness', min: 0, max: 1, step: 0.05 }));
        wrap.appendChild(makeRangeRow({ key: 'underlayOpacity',   enabledKey: 'underlayOpacityEnabled',   label: 'Opacity',   min: 0, max: 1, step: 0.05 }));
      },
    }));

    panel.appendChild(buildSection({
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

    panel.appendChild(buildSection({
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

    // Action buttons section
    var actionSection = document.createElement('div');
    Object.assign(actionSection.style, {
      padding: '10px 14px', borderTop: '1px solid #45475a',
    });
    var actionTitle = document.createElement('div');
    actionTitle.textContent = 'Action buttons';
    Object.assign(actionTitle.style, {
      fontSize: '11px', color: '#a6adc8', marginBottom: '6px', fontWeight: 'bold',
      textTransform: 'uppercase', letterSpacing: '0.05em',
    });
    actionSection.appendChild(actionTitle);

    function makeActionCheckbox(key, label, wrapId) {
      var row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px;cursor:pointer;font-size:12px;';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = settings[key] !== false;
      cb.addEventListener('change', function () {
        settings[key] = cb.checked;
        saveSettings(settings);
        var wrap = document.getElementById(wrapId);
        if (wrap) wrap.style.visibility = cb.checked ? 'visible' : 'hidden';
      });
      row.appendChild(cb);
      row.appendChild(document.createTextNode(label));
      actionSection.appendChild(row);
    }
    makeActionCheckbox('showFillBtn',    'Show "Fill" button',      'sp-fill-btn-wrap');
    makeActionCheckbox('showClearBtn',   'Show "Clear" button',     'sp-clear-btn-wrap');
    makeActionCheckbox('showClearAllBtn','Show "Clear all" button', 'sp-clearall-btn-wrap');
    panel.appendChild(actionSection);

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
    });
    footer.appendChild(resetBtn);
    panel.appendChild(footer);

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
    triggerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      var toast = document.getElementById('sp-remove-invalid-toast');
      if (toast) toast.style.bottom = getToastBottom();
    });

    document.addEventListener('click', function (e) {
      if (panel.style.display !== 'none' &&
          !panel.contains(e.target) && e.target !== triggerBtn) {
        panel.style.display = 'none';
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') panel.style.display = 'none';
    });

    document.body.appendChild(panel);
    document.body.appendChild(triggerBtn);
  }

  function buildAllUI() {
    buildSettingsUI();
    if (!buildActionButtons()) {
      var attempts = 0;
      var timer = setInterval(function () {
        attempts++;
        if (buildActionButtons() || attempts > 100) clearInterval(timer);
      }, 100);
    }
  }
  if (document.body) buildAllUI();
  else document.addEventListener('DOMContentLoaded', buildAllUI);

})();
