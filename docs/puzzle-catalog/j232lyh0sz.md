# Catalog — j232lyh0sz (Serial Killer Gattai)

- URL: https://sudokupad.app/j232lyh0sz
- Author: Bill Murphy  |  convertedPuzzle id: `penpaa68a3ae118faf139c860c57119c87519`
- Extracted: 2026-06-04  |  Userscript: live but **not injecting** (spdr = 0)  |  DarkReader: **ON**  |  Tool/model: Claude Opus via Claude-in-Chrome MCP  |  SudokuPad v0.611.0
- Total elements under `#svgrenderer`: **70**
- Notable: killer sudoku (7 killer + 20 rowcol cages), killer cages carry `.cage-killer.cage-label` classes, multi-colour `#underlay` region fills, 24 cosmetics.

> **Status: EXTRACTION ONLY.** Annotation / round-trip / roll-up deferred.

## New / not-yet-in-Known-Buckets (preliminary UNKNOWN flags)
- `#cages | path.cage-killer` — killer-cage dashed outline (more specific than generic `#cages path`)
- `#cages | rect.cage-killer.cage-label` — cage sum-label background rect
- `#cages | text.cage-killer.cage-label` — cage sum-label text
- `g[defs] | *` filter plumbing (always present, not fog)

## Constraint types (Step 3 — from `window.convertedPuzzle`)
```
{
  "id": "penpaa68a3ae118faf139c860c57119c87519",
  "givens": "array[0]",
  "cages": "array[27]",
  "metadata": "object{solution,title,author,rules}",
  "title": "Serial Killer Gattai",
  "author": "Bill Murphy",
  "rules": "array[1]",
  "solution": "????2143??????4312??41231234??23413421??",
  "thermos": "array[0]",
  "arrowSums": "array[0]",
  "kropkis": "array[0]",
  "littleKiller": "array[0]",
  "inequality": "array[0]",
  "sandwichCages": "array[0]",
  "palindrome": "array[0]",
  "sudokuX": "array[0]",
  "windoku": "array[0]",
  "cosmetic": "array[24]",
  "global": "array[0]"
}
```

## Decision attributes (Step 2b — per bucket)
```
cs=64 gridN=10 theme=setting-uitheme-purple
#cages | path.cage-killer  ×6  z:0-15  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=rgba(0, 0, 0, 1) gray:true w:1.5px  |  shape:path  |  pos:corner  |  cells:4  |  DR-managed
#cages | rect.cage-killer.cage-label  ×6  z:1-16  |  fill[inline]=rgba(255, 255, 255, 0.9) gray:true  |  shape:rect  |  pos:corner  |  DR-managed
#cages | text.cage-killer.cage-label  ×6  z:2-17  |  fillSrc:css/none  |  shape:text  |  pos:corner  |  text:"14,7,8,6"
#cell-grids | path.cell-grid  ×1  z:0-0  |  fillSrc:css/none  |  shape:path  |  pos:corner  |  cells:100
#overlay | path  ×17  z:0-16  |  fill[attr]=#FFFFFF,none gray:true,none  |  HAS-none/transparent  |  stroke[attr]=#000000 gray:true w:5.1  |  shape:path  |  pos:corner,border  |  cells:144,3,4,16,100  |  DR-managed
#underlay | rect  ×10  z:0-9  |  fill[attr]=#FFFFFF00,#FFB3FF,#B3FFB3,#EECAB1,#FFCC80,#C0E0FF gray:true,false  |  shape:rect,fullcell  |  pos:corner,border,center  |  cells:100,12,4,9,16,1  |  opacity:1  |  DR-managed
g[defs] | defs  ×1  z:0-0  |  fillSrc:css/none  |  shape:defs  |  pos:corner
g[defs] | feblend  ×2  z:2-2  |  fillSrc:css/none  |  shape:feblend
g[defs] | fecolormatrix  ×2  z:1-1  |  fillSrc:css/none  |  shape:fecolormatrix
g[defs] | femorphology  ×2  z:0-0  |  fillSrc:css/none  |  shape:femorphology
g[defs] | filter.viewboxsize  ×2  z:0-1  |  fillSrc:css/none  |  shape:filter

cages by style: {"killer":7,"rowcol":20}
```

## Appendix — raw Step 2 enumeration (verbatim, do not edit)
```
#cages | path.cage-killer  ×6  fill=none  stroke=rgba(0, 0, 0, 1)
#cages | rect.cage-killer.cage-label  ×6
#cages | text.cage-killer.cage-label  ×6  text="14"
#cell-grids | path.cell-grid  ×1
#overlay | path  ×17  fill=#FFFFFF  stroke=none
#underlay | rect  ×10  fill=#FFFFFF00  stroke=none
g[defs] | defs  ×1
g[defs] | feblend  ×2
g[defs] | fecolormatrix  ×2
g[defs] | femorphology  ×2
g[defs] | filter.viewboxsize  ×2
```
