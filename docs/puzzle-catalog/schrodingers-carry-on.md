# Catalog — james-sinclair/schrodingers-carry-on (Schrödinger's Carry-on)

- URL: https://sudokupad.app/james-sinclair/schrodingers-carry-on?setting-nogrid=1
- Author: James Sinclair  |  convertedPuzzle id: `sxsm_JamesSinclair_b6575415ce26da5ab3cd0`
- Extracted: 2026-06-04  |  Userscript: live but **not injecting** (spdr = 0)  |  DarkReader: **ON**  |  Tool/model: Claude Opus via Claude-in-Chrome MCP  |  SudokuPad v0.611.0
- Total elements under `#svgrenderer`: **100**
- Notable: **FOG puzzle** (36 foglights, 1 foglink), 6×6, loaded with `setting-nogrid=1` (the `cell-grid` path is still present), digits render as stroked `#cell-values | path` (not `<text>`).

> **Status: EXTRACTION ONLY.** Annotation, round-trip reconciliation, and roll-up deferred to the strong-model pass.

## New / not-yet-in-Known-Buckets (preliminary UNKNOWN flags)
- `#fog-defs | *` and `#fog-fogcover | rect` — fog stack
- `#cell-values | path` — given/value digits drawn as stroked outlines, not text
- `g[defs] | *` filter plumbing (always present, not fog)

## Constraint types (Step 3 — from `window.convertedPuzzle`)
```
{
  "id": "sxsm_JamesSinclair_b6575415ce26da5ab3cd0",
  "givens": "array[0]",
  "cages": "array[0]",
  "metadata": "object{source,title,author,rules,msgcorrect,antiking,norowcol,solution}",
  "title": "Schrödinger's Carry-on",
  "author": "James Sinclair",
  "rules": "Fill each row, column, and box with the …",
  "solution": ".321561654.254.213213.6465432.3.1645????",
  "foglight": "array[36]",
  "foglink": "array[1]",
  "thermos": "array[0]",
  "arrowSums": "array[0]",
  "kropkis": "array[0]",
  "littleKiller": "array[0]",
  "inequality": "array[0]",
  "sandwichCages": "array[0]",
  "palindrome": "array[0]",
  "sudokuX": "array[0]",
  "windoku": "array[0]",
  "cosmetic": "array[0]",
  "global": "array[0]"
}
```

## Decision attributes (Step 2b — per bucket)
```
cs=64 gridN=7 theme=setting-uitheme-purple
#cages | path  ×3  z:0-2  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=rgba(0, 0, 0, 1) gray:true w:1.5px  |  shape:path  |  pos:center
#cell-colors | path  ×1  z:0-0  |  fill[attr]=#800000ff gray:false  |  shape:path  |  pos:border  |  cells:6
#cell-grids | path  ×8  z:1-8  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=#000000,#924545ff gray:true,false w:1,5,3  |  shape:path  |  pos:corner,border  |  cells:36,6
#cell-grids | path.cell-grid  ×1  z:0-0  |  fillSrc:css/none  |  shape:path  |  pos:corner
#cell-values | path  ×2  z:0-1  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=#924545ff gray:false w:9.6,22.4  |  shape:path  |  pos:outside,border  |  cells:8,64
#fog-defs | g  ×5  z:0-3  |  fillSrc:css/none  |  shape:g  |  pos:border,corner  |  cells:6,1  |  opacity:0,1
#fog-defs | mask  ×2  z:0-1  |  fillSrc:css/none  |  shape:mask
#fog-defs | path  ×1  z:0-0  |  fillSrc:css/none  |  shape:path  |  pos:border  |  cells:6
#fog-defs | rect.fog-mask-black  ×1  z:1-1  |  fillSrc:css/none  |  shape:rect  |  pos:arbitrary  |  cells:80
#fog-defs | rect.fog-mask-white  ×2  z:0-0  |  fillSrc:css/none  |  shape:rect  |  pos:arbitrary  |  cells:80
#fog-defs | use  ×5  z:0-4  |  fillSrc:css/none  |  stroke[attr]=rgb(230,230,230),rgb(219,219,219),rgb(187,187,187),rgb(134,134,134) gray:true w:25.6px,19.2px,12.8px,6.4px  |  shape:use  |  pos:border  |  cells:6
#fog-defs | use.fog-mask-black  ×1  z:1-1  |  fillSrc:css/none  |  shape:use  |  pos:border  |  cells:6
#fog-fogcover | rect  ×1  z:0-0  |  fillSrc:css/none  |  shape:rect  |  pos:border  |  cells:42
#overlay | path  ×37  z:0-36  |  fill[attr]=#464646ff,#e1c16eff,#f9000055,#fff3,none gray:true,false,none  |  HAS-none/transparent  |  stroke[attr]=#aaaf gray:true w:3.2,1.28  |  shape:path  |  pos:outside,center,corner,border  |  cells:2,1,8,6,3
#overlay | rect.textbg  ×2  z:37-39  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  shape:rect  |  pos:border  |  opacity:1
#overlay | text  ×2  z:38-40  |  fill[inline]=var(--color-black) gray:true  |  stroke[inline]=var(--color-white) gray:true w:1.28  |  shape:text  |  pos:border  |  cells:6  |  text:"Oh, I'm sorr,(to check yo"
g[defs] | defs  ×1  z:0-0  |  fillSrc:css/none  |  shape:defs  |  pos:corner
g[defs] | feblend  ×2  z:2-2  |  fillSrc:css/none  |  shape:feblend
g[defs] | fecolormatrix  ×2  z:1-1  |  fillSrc:css/none  |  shape:fecolormatrix
g[defs] | femorphology  ×2  z:0-0  |  fillSrc:css/none  |  shape:femorphology
g[defs] | filter.viewboxsize  ×2  z:0-1  |  fillSrc:css/none  |  shape:filter

cages by style: {}
```

## Appendix — raw Step 2 enumeration (verbatim, do not edit)
```
#cages | path  ×3  fill=none  stroke=rgba(0, 0, 0, 1)
#cell-colors | path  ×1  fill=#800000ff  stroke=none
#cell-grids | path  ×8  fill=none  stroke=#000000
#cell-grids | path.cell-grid  ×1
#cell-values | path  ×2  fill=none  stroke=#924545ff
#fog-defs | g  ×5
#fog-defs | mask  ×2
#fog-defs | path  ×1
#fog-defs | rect.fog-mask-black  ×1
#fog-defs | rect.fog-mask-white  ×2
#fog-defs | use  ×5  stroke=rgb(230,230,230)
#fog-defs | use.fog-mask-black  ×1
#fog-fogcover | rect  ×1
#overlay | path  ×37  fill=#464646ff  stroke=none
#overlay | rect.textbg  ×2  fill=none  stroke=none  rx=0
#overlay | text  ×2  text="Oh, I'm sorry! T"
g[defs] | defs  ×1
g[defs] | feblend  ×2
g[defs] | fecolormatrix  ×2
g[defs] | femorphology  ×2
g[defs] | filter.viewboxsize  ×2
```
