# Catalog — onnwl66b8d (Sudokuro)

- URL: https://sudokupad.app/onnwl66b8d
- Author: Bill Murphy  |  convertedPuzzle id: `penpa507233ebd9d87a7a391b95be316b06f9`
- Extracted: 2026-06-04  |  Userscript: live but **not injecting** (spdr = 0)  |  DarkReader: **ON**  |  Tool/model: Claude Opus via Claude-in-Chrome MCP  |  SudokuPad v0.611.0
- Total elements under `#svgrenderer`: **110**
- Notable: Kakuro/Sudoku hybrid (penpa import), gray cell shading, sum clues as `#overlay text`, 21 cages (1 killer + 20 rowcol). `rules` is `array[1]` here (vs a string elsewhere).

> **Status: EXTRACTION ONLY.** Annotation / round-trip / roll-up deferred.

## New / not-yet-in-Known-Buckets (preliminary UNKNOWN flags)
- `#underlay | rect.board-position` — transparent (`#FFFFFF00`) board-positioning rect
- `g[defs] | *` filter plumbing (always present, not fog)

## Constraint types (Step 3 — from `window.convertedPuzzle`)
```
{
  "id": "penpa507233ebd9d87a7a391b95be316b06f9",
  "givens": "array[0]",
  "cages": "array[21]",
  "metadata": "object{solution,title,author,rules}",
  "title": "Sudokuro",
  "author": "Bill Murphy",
  "rules": "array[1]",
  "solution": "????????????246135???531??642??21?53?64?",
  "thermos": "array[0]",
  "arrowSums": "array[0]",
  "kropkis": "array[0]",
  "littleKiller": "array[0]",
  "inequality": "array[0]",
  "sandwichCages": "array[0]",
  "palindrome": "array[0]",
  "sudokuX": "array[0]",
  "windoku": "array[0]",
  "cosmetic": "array[15]",
  "global": "array[0]"
}
```

## Decision attributes (Step 2b — per bucket)
```
cs=64 gridN=10 theme=setting-uitheme-purple
#cell-grids | path  ×10  z:1-10  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=#000000 gray:true w:4.3  |  shape:path  |  pos:corner,border  |  cells:100,64,1,36,8,4  |  DR-managed
#cell-grids | path.cell-grid  ×1  z:0-0  |  fillSrc:css/none  |  shape:path  |  pos:corner  |  cells:100
#overlay | path  ×40  z:0-39  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=#000000 gray:true w:4.3  |  shape:path  |  pos:corner,center  |  cells:4,1,9  |  DR-managed
#overlay | rect.textbg  ×9  z:40-56  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  shape:circle  |  pos:arbitrary  |  opacity:1  |  DR-managed
#overlay | text  ×9  z:41-57  |  fillSrc:css/none  |  shape:text  |  pos:arbitrary  |  text:"6,5,9,15,8,7,10"
#underlay | rect  ×16  z:1-16  |  fill[attr]=#CFCFCF gray:true  |  shape:rect,fullcell  |  pos:border,center  |  cells:10,2,6,1  |  opacity:1  |  DR-managed
#underlay | rect.board-position  ×1  z:0-0  |  fill[attr]=#FFFFFF00 gray:true  |  shape:rect  |  pos:corner  |  cells:100  |  opacity:1  |  DR-managed
g[defs] | defs  ×1  z:0-0  |  fillSrc:css/none  |  shape:defs  |  pos:corner
g[defs] | feblend  ×2  z:2-2  |  fillSrc:css/none  |  shape:feblend
g[defs] | fecolormatrix  ×2  z:1-1  |  fillSrc:css/none  |  shape:fecolormatrix
g[defs] | femorphology  ×2  z:0-0  |  fillSrc:css/none  |  shape:femorphology
g[defs] | filter.viewboxsize  ×2  z:0-1  |  fillSrc:css/none  |  shape:filter

cages by style: {"killer":1,"rowcol":20}
```

## Appendix — raw Step 2 enumeration (verbatim, do not edit)
```
#cell-grids | path  ×10  fill=none  stroke=#000000
#cell-grids | path.cell-grid  ×1
#overlay | path  ×40  fill=none  stroke=#000000
#overlay | rect.textbg  ×9  fill=none  stroke=none
#overlay | text  ×9  text="6"
#underlay | rect  ×16  fill=#CFCFCF  stroke=none
#underlay | rect.board-position  ×1  fill=#FFFFFF00  stroke=none
g[defs] | defs  ×1
g[defs] | feblend  ×2
g[defs] | fecolormatrix  ×2
g[defs] | femorphology  ×2
g[defs] | filter.viewboxsize  ×2
```
