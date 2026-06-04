# Catalog — pja7uaxak9 (RAT RUN 39: Together Apart)

- URL: https://sudokupad.app/pja7uaxak9
- Author: Marty Sears  |  convertedPuzzle id: `sxsm_MartySears_cb5ee32dfb1c8498dabfca6b`
- Extracted: 2026-06-04  |  Userscript: live but **not injecting** (spdr elements = 0)  |  DarkReader: **ON**  |  Tool/model: Claude Opus via Claude-in-Chrome MCP  |  SudokuPad v0.611.0
- Total elements under `#svgrenderer`: **624**
- Notable: **FOG puzzle** (6 foglights, 128 foglinks), 11×11 render extent, 395 cosmetics, 46 cages.

> **Status: EXTRACTION ONLY.** Raw captures below are verbatim. Annotation (Step 4
> naming), the round-trip count reconciliation (Step 6), and roll-up into
> `ELEMENT_CATALOG.md` are the deferred strong-model pass.

## New / not-yet-in-Known-Buckets (preliminary UNKNOWN flags)
- `#fog-defs | g`, `mask`, `path`, `rect.fog-mask-black`, `rect.fog-mask-white`, `use`, `use.fog-mask-black` — fog masking stack
- `#fog-fogcover | rect` — the fog cover layer
- `g[defs] | feblend`, `fecolormatrix`, `femorphology`, `filter.viewboxsize`, `defs` — general SVG filter plumbing (present on all puzzles, **not** fog-specific)

## Constraint types (Step 3 — from `window.convertedPuzzle`)
```
{
  "id": "sxsm_MartySears_cb5ee32dfb1c8498dabfca6b",
  "givens": "array[0]",
  "cages": "array[46]",
  "metadata": "object{source,title,author,rules,msgcorrect,antiking,solution}",
  "title": "RAT RUN 39: Together Apart",
  "author": "Marty Sears",
  "rules": "Normal sudoku rules apply. \n\nAIM OF EXPE…",
  "solution": "............381972465..769584213..452361…",
  "foglight": "array[6]",
  "foglink": "array[128]",
  "thermos": "array[0]",
  "arrowSums": "array[0]",
  "kropkis": "array[0]",
  "littleKiller": "array[0]",
  "inequality": "array[0]",
  "sandwichCages": "array[0]",
  "palindrome": "array[0]",
  "sudokuX": "array[0]",
  "windoku": "array[0]",
  "cosmetic": "array[395]",
  "global": "array[0]"
}
```

## Decision attributes (Step 2b — per bucket)
```
cs=64 gridN=11 theme=setting-uitheme-purple
#arrows | path  ×4  z:0-3  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=#FFFFFF gray:true w:9.6  |  shape:path  |  pos:outside  |  DR-managed
#cell-grids | path.cage-box  ×9  z:1-9  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=rgba(0, 0, 0, 1) gray:true w:3px  |  shape:path  |  pos:center  |  cells:9  |  DR-managed
#cell-grids | path.cell-grid  ×1  z:0-0  |  fillSrc:css/none  |  shape:path  |  pos:center  |  cells:121
#fog-defs | g  ×5  z:0-3  |  fillSrc:css/none  |  shape:g  |  pos:center,corner  |  cells:121,1  |  opacity:0,1
#fog-defs | mask  ×2  z:0-1  |  fillSrc:css/none  |  shape:mask
#fog-defs | path  ×1  z:0-0  |  fillSrc:css/none  |  shape:path  |  pos:center  |  cells:121
#fog-defs | rect.fog-mask-black  ×1  z:1-1  |  fillSrc:css/none  |  shape:rect  |  pos:center  |  cells:169
#fog-defs | rect.fog-mask-white  ×2  z:0-0  |  fillSrc:css/none  |  shape:rect  |  pos:center  |  cells:169
#fog-defs | use  ×5  z:0-4  |  fillSrc:css/none  |  stroke[attr]=rgb(230,230,230),rgb(219,219,219),rgb(187,187,187),rgb(134,134,134) gray:true w:25.6px,19.2px,12.8px,6.4px  |  shape:use  |  pos:center  |  cells:121  |  DR-managed
#fog-defs | use.fog-mask-black  ×1  z:1-1  |  fillSrc:css/none  |  shape:use  |  pos:center  |  cells:121
#fog-fogcover | rect  ×1  z:0-0  |  fillSrc:css/none  |  shape:rect  |  pos:center  |  cells:121
#overlay | path  ×93  z:0-92  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  stroke[attr]=#FFFFFF,#e4e4e4ff,#ebebebff,#61e7fdff,#f5a3d3ff,#abababff,#f39069ff,#f47753ff,#0c5af6ff gray:true,false w:3.84,1.28,5.76,4.48,10.24,17.92,19.2,12.16,6.4  |  shape:path  |  pos:center,border,corner,arbitrary  |  cells:9,2,1,12,6,18,21,30,8,20,42,56,63,49,36,15,16,4,40,3,50,121,81  |  DR-managed
#overlay | rect  ×408  z:93-546  |  fill[attr]=#FFFFFF,#fcd3fbff,#a7e5faff,#93e77fff,#000000,#fff92dff,#9ae3faff,#fabcf7ff,#fbe6fb8d,#e6f9fb8d,#79def9ff,#fdc3fcff,#f47753ff,#00000030,#ffffff2e gray:true,false  |  stroke[attr]=#0dc6f3ff,#ea8ae6ff,#fabcf7ff,#79def9ff,#FFFFFF,#f39069ff,#ffcc28ff,#000000 gray:false,true w:5.76,7.04,1.92,3.2,3.84  |  shape:circle,pill,rect  |  pos:center,border,arbitrary,corner  |  ROTATED  |  cells:1,2,4  |  opacity:1  |  DR-managed
#overlay | rect.textbg  ×23  z:132-544  |  fill[attr]=none gray:none  |  HAS-none/transparent  |  shape:rect  |  pos:arbitrary,center,border  |  ROTATED  |  cells:2,3,1  |  opacity:1  |  DR-managed
#overlay | text  ×23  z:133-545  |  fill[inline]=var(--color-black),rgb(152, 255, 8),rgb(16, 0, 129) gray:true,false  |  stroke[inline]=var(--color-white),rgb(16, 0, 129) gray:true,false w:1.28,0.64  |  shape:text  |  pos:arbitrary,center,border  |  ROTATED  |  cells:2,1  |  DR-managed  |  text:"🧁,1,2,3,4,5,6,7,SET,DESTINATION:,CONTROL,NODES:,F,P,⭐,🐀"
#underlay | rect  ×19  z:0-18  |  fill[attr]=#FFFFFF,#e0c1fdff,none gray:true,false,none  |  HAS-none/transparent  |  stroke[attr]=#eeef,#db9ffbff gray:true,false w:5.76,4.48  |  shape:circle,fullcell  |  pos:center  |  opacity:1  |  DR-managed
g[defs] | defs  ×1  z:0-0  |  fillSrc:css/none  |  shape:defs  |  pos:corner
g[defs] | feblend  ×2  z:2-2  |  fillSrc:css/none  |  shape:feblend
g[defs] | fecolormatrix  ×2  z:1-1  |  fillSrc:css/none  |  shape:fecolormatrix
g[defs] | femorphology  ×2  z:0-0  |  fillSrc:css/none  |  shape:femorphology
g[defs] | filter.viewboxsize  ×2  z:0-1  |  fillSrc:css/none  |  shape:filter

cages by style: {"rowcol":37,"box":9}
```

## Appendix — raw Step 2 enumeration (verbatim, do not edit)
```
#arrows | path  ×4  fill=none  stroke=#FFFFFF
#cell-grids | path.cage-box  ×9  fill=none  stroke=rgba(0, 0, 0, 1)
#cell-grids | path.cell-grid  ×1
#fog-defs | g  ×5
#fog-defs | mask  ×2
#fog-defs | path  ×1
#fog-defs | rect.fog-mask-black  ×1
#fog-defs | rect.fog-mask-white  ×2
#fog-defs | use  ×5  stroke=rgb(230,230,230)
#fog-defs | use.fog-mask-black  ×1
#fog-fogcover | rect  ×1
#overlay | path  ×93  fill=none  stroke=#FFFFFF
#overlay | rect  ×408  fill=#FFFFFF  stroke=#0dc6f3ff  rx=17.28
#overlay | rect.textbg  ×23  fill=none  stroke=none  rx=0
#overlay | text  ×23  text="🧁"
#underlay | rect  ×19  fill=#FFFFFF  stroke=#eeef  rx=21.76
g[defs] | defs  ×1
g[defs] | feblend  ×2
g[defs] | fecolormatrix  ×2
g[defs] | femorphology  ×2
g[defs] | filter.viewboxsize  ×2
```
