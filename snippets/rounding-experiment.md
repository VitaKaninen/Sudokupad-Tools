# Selection Border Rounding — Experimental Code

Removed from the main script after v2.113.0 work. Saved here for possible
revisit. The code is functional but the UX semantic the user wanted
("Round outside corners" rounds 1/2/3/4 + 5/6/7/8; "Round inside corners"
rounds A/B/C/D + E/F/G/H per the corner-labels image) can't be cleanly
expressed with SVG strokes alone. See the "What was learned" section
below for why, and pick the right path forward before re-enabling.

## What was learned

### Where SVG `stroke-linejoin: round` actually rounds

`stroke-linejoin: round` rounds the **convex side** of the stroke at each
corner — the side where the band of stroke "wants" to expand to maintain
constant width through the turn. This is determined by local geometry,
not by traversal direction. Reversing a subpath's direction does **not**
change which physical side is rounded.

For our selection borders:

| Subpath kind | Convex stroke side (where linejoin rounds) | Per user's terminology |
|--------------|--------------------------------------------|------------------------|
| Outer (CW polygon, body inside) | Away from polygon body = unselected area | "Outside" (1, 2, 3, 4) — what user wanted |
| Hole (CCW polygon, hole inside) | Away from hole interior = into polygon body | "Inside" (E, F, G, H) — NOT what user wanted under "Outside" toggle |

So `stroke-linejoin: round` mixes the user's two categories: it rounds
{outer-subpath outside corners} AND {hole-subpath inside corners} in one
shot. There is no CSS-only way to round just one or the other.

### Path-arc rounding behavior

If we modify the path geometry to replace a sharp vertex with a tangent
arc of radius P, the stroke (width W centered on path) renders the
corner as follows:

- The side of the stroke on the **same side** as the arc center: radius
  P − W/2 (the "tight" side).
- The other side: radius P + W/2 (the "wide" side).

If P = W/2: tight side has radius 0 → the stroke pinches to a point
(cusp). Not visibly rounded.

If P = W: tight side has radius W/2, wide side has radius 3W/2. Both
visibly rounded, but with very different look (one tight, one wide).

For the donut case, the only valid arc-center direction at each subpath
vertex is constrained by where the tangent points have to land on the
adjacent edges:
- Outer subpath: arc center must be inside the polygon body. So the
  body-side of the stroke gets the tight curve and the unselected side
  gets the wide curve.
- Hole subpath: arc center must be inside the hole. So the hole-side
  gets the tight curve and the body-side gets the wide curve.

### Why the user's preferred semantic is hard

Per the corner-labels image:
- **Inside corners** (in selected cells) = A, B, C, D + E, F, G, H
- **Outside corners** (in unselected cells) = 1, 2, 3, 4 + 5, 6, 7, 8

To get clean independent control over these two sets with SVG strokes,
you'd need to either:

1. **Split into separate `<path>` elements per subpath** so each can
   have its own `stroke-linejoin` setting, AND apply path-arc rounding
   selectively per subpath. Even then, path arcs round both sides of
   the stroke — the side-effect rounding can't be avoided.

2. **Render the border as a custom-filled path** (compute the outer
   and inner boundary geometries separately with independent rounding
   radii, then fill the annular region). Full control, no SudokuPad
   stroke needed. Significant refactor — replaces `path.cage-selectioncage`
   styling with our own SVG element.

3. **Accept the imperfect separation** and document it: one toggle
   for `linejoin: round` (rounds {1234, EFGH}), one toggle for "round
   all path vertices" (also rounds {ABCD, 5678} with side-effect on the
   other side, with different radii).

The user opted to drop the feature rather than pick from those options.
If revisited, option 2 (custom fill rendering) is the cleanest answer
and would also make per-side radius adjustable independently.

## Code

### Defaults

```javascript
selectionRoundOuter:          true,      // round convex corners via CSS stroke-linejoin: round
selectionRoundInner:          false,     // round concave corners via path arc commands (radius = width/2)
```

### CSS injection (in `rebuildStyleTag`)

Replace the existing `path.cage-selectioncage` block with:

```javascript
if (s.selectionColorEnabled) {
  var sc = hexToRgba(s.selectionColor, s.selectionOpacity);
  var sw = parseFloat(s.selectionWidth);
  if (!isFinite(sw) || sw < 0) sw = 8;
  // stroke-linejoin: round rounds the OUTER (convex) corners.
  // 'miter' gives sharp corners. Inner (concave) corner rounding is
  // handled by modifying the path geometry (see offsetRectilinearPath).
  var linejoin = s.selectionRoundOuter ? 'round' : 'miter';
  css += `
  #cell-highlights path.cage-selectioncage {
    stroke: ${sc} !important;
    stroke-width: ${sw}px !important;
    stroke-linejoin: ${linejoin} !important;
  }`;
}
```

### `vertsToRoundedSubpath` helper (insert near `vertsToSubpath`)

```javascript
// Like vertsToSubpath but replaces EVERY vertex with a tangent arc of the
// given radius. The resulting path curves smoothly at every corner — both
// edges of the stroke (the side facing selected cells AND the side facing
// unselected area) become smooth curves.
//
// Per the user's terminology: every corner has an "inside" aspect (where
// the stroke meets the selected cell body) and an "outside" aspect (where
// the stroke meets the unselected area). Path-arc rounding affects both
// simultaneously — you can't curve one side of a stroke without curving
// the other, since the stroke just traces the path centerline ±W/2.
//
// Per-vertex radius clamps to half the shorter adjacent edge length so
// back-off / forward-off points never run past neighbouring vertices.
function vertsToRoundedSubpath(verts, radius) {
  if (!(radius > 0)) return vertsToSubpath(verts);
  var n = verts.length;
  if (n < 3) return vertsToSubpath(verts);

  var segs = [];
  for (var i = 0; i < n; i++) {
    var v = verts[i];
    var vPrev = verts[(i + n - 1) % n];
    var vNext = verts[(i + 1) % n];
    var dPrev = { x: v.x - vPrev.x, y: v.y - vPrev.y };
    var dNext = { x: vNext.x - v.x, y: vNext.y - v.y };
    var cross = dPrev.x * dNext.y - dPrev.y * dNext.x;
    // Collinear (cross == 0) → not a corner, can't round
    if (cross === 0) { segs.push({ type: 'line', P: v }); continue; }

    var dPrevLen = Math.sqrt(dPrev.x * dPrev.x + dPrev.y * dPrev.y);
    var dNextLen = Math.sqrt(dNext.x * dNext.x + dNext.y * dNext.y);
    var r = Math.min(radius, dPrevLen / 2, dNextLen / 2);
    if (!(r > 0)) { segs.push({ type: 'line', P: v }); continue; }
    var backUnit = { x: -dPrev.x / dPrevLen, y: -dPrev.y / dPrevLen };
    var fwdUnit  = { x:  dNext.x / dNextLen, y:  dNext.y / dNextLen };
    var A = { x: v.x + backUnit.x * r, y: v.y + backUnit.y * r };
    var C = { x: v.x + fwdUnit.x  * r, y: v.y + fwdUnit.y  * r };

    // Sweep flag follows the local turn direction:
    //   cross > 0 → right turn (visually CW in SVG y-down) → sweep=1
    //   cross < 0 → left turn (visually CCW)              → sweep=0
    var sweep = cross > 0 ? 1 : 0;
    segs.push({ type: 'arc', A: A, C: C, r: r, sweep: sweep });
  }

  var parts = [];
  for (var i2 = 0; i2 < segs.length; i2++) {
    var s = segs[i2];
    var openCmd = parts.length === 0 ? 'M' : 'L';
    if (s.type === 'line') {
      parts.push(openCmd + fmtN(s.P.x) + ' ' + fmtN(s.P.y));
    } else {
      parts.push(openCmd + fmtN(s.A.x) + ' ' + fmtN(s.A.y));
      parts.push('A' + fmtN(s.r) + ' ' + fmtN(s.r) + ' 0 0 ' + s.sweep +
                 ' ' + fmtN(s.C.x) + ' ' + fmtN(s.C.y));
    }
  }
  parts.push('Z');
  return parts.join(' ');
}
```

### `offsetRectilinearPath` modifications

Change the signature to accept `innerRadius`:

```javascript
function offsetRectilinearPath(d, amount, innerRadius) {
  innerRadius = innerRadius || 0;
  function toSubpath(verts) {
    if (innerRadius > 0) return vertsToRoundedSubpath(verts, innerRadius);
    return vertsToSubpath(verts);
  }

  var subpaths = parsePathSubpaths(d);
  if (subpaths.length === 0) return d;
  if (subpaths.length === 1) {
    return toSubpath(offsetPolygon(subpaths[0], amount));
  }

  // ... [hole-detection block unchanged] ...

  return subpaths.map(function (verts, i) {
    var isHole = false;
    for (var j = 0; j < bboxes.length; j++) {
      if (i !== j && bboxContains(bboxes[j], bboxes[i])) { isHole = true; break; }
    }
    var eff = isHole ? -amount : amount;
    return toSubpath(offsetPolygon(verts, eff));
  }).join(' ');
}
```

### `applySelectionBorderOffset` modifications

```javascript
function applySelectionBorderOffset(path) {
  if (!path) return;
  var enabled = settings.selectionColorEnabled;
  var amount = enabled ? computeSelectionShift() : 0;
  // Inner radius matches half the stroke width — mirrors the visual
  // radius of stroke-linejoin: round on convex corners.
  var innerRadius = 0;
  if (enabled && settings.selectionRoundInner) {
    var w = parseFloat(settings.selectionWidth);
    if (!isFinite(w) || w <= 0) w = 8;
    innerRadius = w / 2;
  }
  var needsModification = amount !== 0 || innerRadius > 0;

  if (!needsModification) {
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
  var newD = offsetRectilinearPath(origD, amount, innerRadius);
  if (newD !== path.getAttribute('d')) {
    path.setAttribute('d', newD);
  }
  path.setAttribute('data-spdr-last-d', newD);
}
```

### Section UI additions (in the `buildSection({ enabledKey: 'selectionColorEnabled', ... })` block)

Add to `resetKeys`:

```javascript
resetKeys: ['selectionColorEnabled', 'selectionColor', 'selectionOpacity', 'selectionWidth',
            'selectionBorderMode', 'selectionBorderOffset',
            'selectionRoundOuter', 'selectionRoundInner'],
```

Add at the end of `subBuilder`:

```javascript
wrap.appendChild(makeSubCheckbox('selectionRoundOuter', 'Round outer corners'));
wrap.appendChild(makeSubCheckbox('selectionRoundInner', 'Round inner corners'));
```
