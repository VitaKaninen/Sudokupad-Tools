# Puzzle Element Catalog — Extraction Instructions

Purpose: produce, for any SudokuPad puzzle, a complete inventory of the **render
elements** it contains, so that before changing the script we can see every kind
of thing a change might affect. The per-puzzle inventories roll up into one master
union list (`ELEMENT_CATALOG.md`) covering every element type seen across all puzzles.

## Core principle — completeness is mechanical, not visual

**Do not catalog by looking at the rendered puzzle and listing what you see.** That
is lossy (near-invisible cosmetics get missed) and unverifiable (you can't prove
nothing was skipped). Instead:

1. **Extract** with the deterministic script in Step 2. It walks the *entire*
   `#svgrenderer` DOM and reports *every* element bucket. Completeness is guaranteed
   by the iteration, not by your diligence.
2. **Annotate** each bucket with a human name from the Known Buckets table (Step 4).
3. **Flag** any bucket you cannot confidently name as `UNKNOWN — investigate`. Never
   guess a name. An honest `UNKNOWN` is the safety net that lets the catalog grow.

If you follow this, you cannot miss an element — you can only fail to *name* one, and
the `UNKNOWN` flag captures that. The naming is the only judgement call.

---

## Step 0 — Load the puzzle

Open the puzzle URL (e.g. `https://sudokupad.app/pbwqsppuho`) in a browser with the
page fully rendered. If driving via Claude-in-Chrome MCP, `location.reload()` first
and wait until `document.querySelector('#svgrenderer')` is non-null.

Record the puzzle id (the URL slug) and the title
(`Framework.getApp()?.puzzle?.title` or the on-page title).

## Step 1 — Confirm the page is a real puzzle

Run and confirm non-null / non-zero:

```js
!!document.querySelector('#svgrenderer') && document.querySelectorAll('#svgrenderer *').length
```

If this is 0 or null, the puzzle hasn't rendered — stop and reload. Do not catalog
a blank page.

## Step 2 — Deterministic DOM enumeration (the backbone)

Paste this into the console (or run via MCP `javascript_tool`). It returns a text
table: one row per distinct `(layer | tag.classlist)` bucket, with a count and a
sample fill/stroke/text so each bucket is identifiable.

```js
(() => {
  const svg = document.querySelector('#svgrenderer');
  if (!svg) return 'NO #svgrenderer — page not a rendered puzzle';
  const buckets = new Map();
  const walk = (el, layer) => {
    for (const child of el.children) {
      const tag = child.tagName.toLowerCase();
      const cls = (child.getAttribute('class') || '')
        .split(/\s+/).filter(Boolean).sort().join('.');
      const key = `${layer} | ${tag}${cls ? '.' + cls : ''}`;
      let b = buckets.get(key);
      if (!b) buckets.set(key, b = { count: 0, fill: null, stroke: null, text: null, rx: null });
      b.count++;
      if (b.fill   == null) b.fill   = child.getAttribute('fill');
      if (b.stroke == null) b.stroke = child.getAttribute('stroke');
      if (b.rx     == null) b.rx     = child.getAttribute('rx');
      if (tag === 'text' && b.text == null) b.text = (child.textContent || '').trim().slice(0, 16);
      if (child.children.length) walk(child, layer); // recurse, keep top-level layer label
    }
  };
  for (const top of svg.children) {
    const layer = top.id ? '#' + top.id
      : `${top.tagName.toLowerCase()}[${(top.getAttribute('class') || '').trim()}]`;
    walk(top, layer);
  }
  return [...buckets.entries()].sort().map(([k, v]) =>
    `${k}  ×${v.count}` +
    (v.fill   ? `  fill=${v.fill}`     : '') +
    (v.stroke ? `  stroke=${v.stroke}` : '') +
    (v.rx     ? `  rx=${v.rx}`         : '') +
    (v.text   ? `  text="${v.text}"`   : '')
  ).join('\n');
})()
```

**Capture the entire output verbatim.** This is the raw, complete inventory. Every
row is a real element kind present in the puzzle; nothing was filtered.

> Note: SudokuPad injects elements that are **not** part of the puzzle definition —
> selection rectangles, highlight overlays, and (if our userscript is loaded) the
> `[data-spdr-region-split]` group and any `data-spdr-*` clones. **Disable the
> userscript before extracting**, or explicitly mark and exclude any bucket whose
> layer/class begins with `spdr`. We catalog the *puzzle's* elements, not ours.

## Step 2b — Decision-relevant attribute dump (why a change behaves the way it does)

Step 2 proves *which kinds* of element exist. It does **not** capture the properties
that decide what a script change *does* to them — and it has a real blind spot: it
samples the `fill` **attribute** only, so an element coloured via an inline
`style.fill` (e.g. the `#N` rank markers / X-O letters) shows **no fill** in Step 2,
hiding the very gray-ness that determines whether object-shading touches it.

This probe re-walks the same DOM and, **per bucket**, records the attributes that the
lessons have repeatedly shown to be decisive (see the legend below). Paste it in;
capture the output alongside Step 2's.

```js
(() => {
  const svg = document.querySelector('#svgrenderer');
  if (!svg) return 'NO #svgrenderer';
  function parseColor(s){
    if(!s) return null; s=String(s).trim();
    if(s==='none'||s==='transparent') return {r:0,g:0,b:0,a:0,none:true};
    let m;
    if(m=s.match(/^#([0-9a-f]{3,8})$/i)){let h=m[1];
      if(h.length===3||h.length===4)h=h.replace(/./g,c=>c+c);
      const n=parseInt(h.slice(0,6),16);
      const a=h.length===8?parseInt(h.slice(6,8),16)/255:1;
      return {r:(n>>16)&255,g:(n>>8)&255,b:n&255,a};}
    if(m=s.match(/^rgba?\(([^)]+)\)/i)){const p=m[1].split(',').map(parseFloat);
      return {r:p[0],g:p[1],b:p[2],a:p[3]==null?1:p[3]};}
    const el=document.createElement('span');el.style.color=s;document.documentElement.appendChild(el);
    const c=getComputedStyle(el).color;el.remove();
    const mm=c.match(/rgba?\(([^)]+)\)/); if(!mm) return null;
    const p=mm[1].split(',').map(parseFloat);
    return {r:p[0],g:p[1],b:p[2],a:p[3]==null?1:p[3]};}
  function isGray(c){ if(!c||c.none) return null;
    const r=c.r/255,g=c.g/255,b=c.b/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;
    let s=0; if(mx!==mn){const d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn);} return s<0.08; }
  function gcd(a,b){a=Math.round(a);b=Math.round(b);return b===0?a:gcd(b,a%b);}
  let cs=0; const cg=svg.querySelector('#cell-grids path.cell-grid');
  if(cg){const d=cg.getAttribute('d')||cg.dataset.spdrOrigD||'';
    const ns=(d.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(n=>n>0.5); cs=ns.reduce(gcd,0)||0;}
  const gridN=Math.round(Math.sqrt(svg.querySelectorAll('.cell').length))||0, board=cs*gridN;
  function own(el,p){ return el.style.getPropertyValue(p)||el.getAttribute(p)||''; } // what OUR code reads
  function src(el,p){
    if(el.style.getPropertyValue(p)) return el.style.getPropertyPriority(p)==='important'?'inline!':'inline';
    if(el.getAttribute(p)!=null) return 'attr';
    let q=el.parentElement;
    while(q&&q!==svg){ if(q.style.getPropertyValue(p)||q.getAttribute(p)!=null) return 'inherited'; q=q.parentElement; }
    return 'css/none'; }
  function shape(el){ if(el.tagName.toLowerCase()!=='rect') return el.tagName.toLowerCase();
    const w=+el.getAttribute('width')||0,h=+el.getAttribute('height')||0,rx=+el.getAttribute('rx')||0;
    if(!cs) return 'rect';
    if(Math.abs(w-h)<2&&Math.abs(rx-w/2)<2) return 'circle';
    if(rx>0&&Math.abs(rx-Math.min(w,h)/2)<3) return 'pill';
    if(Math.abs(w-cs)<cs*0.2&&Math.abs(h-cs)<cs*0.2&&rx<cs*0.3) return 'fullcell';
    return 'rect'; }
  function rot(el){ try{const m=el.getCTM&&el.getCTM(); return m?(Math.abs(m.b)>0.01||Math.abs(m.c)>0.01):false;}catch(e){return false;} }
  function pos(el){ if(!cs) return ''; let bb; try{bb=el.getBBox();}catch(e){return '';}
    const cx=bb.x+bb.width/2,cy=bb.y+bb.height/2;
    if(cx<-1||cy<-1||cx>board+1||cy>board+1) return 'outside';
    const t=cs*0.2, mod=v=>((v%cs)+cs)%cs;
    const xg=Math.min(mod(cx),cs-mod(cx))<t, yg=Math.min(mod(cy),cs-mod(cy))<t;
    const xm=Math.abs(mod(cx)-cs/2)<t, ym=Math.abs(mod(cy)-cs/2)<t;
    if(xg&&yg) return 'corner'; if((xg&&ym)||(xm&&yg)) return 'border';
    if(xm&&ym) return 'center'; return 'arbitrary'; }
  function span(el){ if(!cs)return 0; let bb; try{bb=el.getBBox();}catch(e){return 0;}
    const a=Math.floor((bb.x+1)/cs),b=Math.floor((bb.x+bb.width-1)/cs),
          c=Math.floor((bb.y+1)/cs),d=Math.floor((bb.y+bb.height-1)/cs);
    return Math.max(1,b-a+1)*Math.max(1,d-c+1); }
  const B=new Map(), addS=(s,v)=>{ if(v!=null&&v!=='') s.add(v); };
  function walk(el,layer){
    for(const ch of el.children){
      const tag=ch.tagName.toLowerCase();
      const cls=(ch.getAttribute('class')||'').split(/\s+/).filter(Boolean).sort().join('.');
      const isOurs=(ch.id&&ch.id.startsWith('spdr'))||/spdr/.test(cls);
      if(!isOurs){
        const key=`${layer} | ${tag}${cls?'.'+cls:''}`;
        let b=B.get(key); if(!b){b={n:0,fv:new Set(),fs:new Set(),fg:new Set(),sv:new Set(),ss:new Set(),sg:new Set(),sw:new Set(),sh:new Set(),po:new Set(),rot:false,cells:new Set(),op:new Set(),none:false,dr:false,zlo:1e9,zhi:-1,tx:new Set()};B.set(key,b);}
        b.n++; const zi=Array.prototype.indexOf.call(el.children,ch); b.zlo=Math.min(b.zlo,zi);b.zhi=Math.max(b.zhi,zi);
        const fo=own(ch,'fill'),fc=parseColor(fo);
        addS(b.fs,src(ch,'fill')); if(fo){addS(b.fv,fo);b.fg.add(fc&&fc.none?'none':isGray(fc));} if(fc&&fc.none)b.none=true;
        const so=own(ch,'stroke'),sc=parseColor(so);
        if(so&&so!=='none'){addS(b.sv,so);addS(b.ss,src(ch,'stroke'));b.sg.add(isGray(sc));addS(b.sw,ch.getAttribute('stroke-width')||ch.style.strokeWidth);}
        addS(b.sh,shape(ch)); addS(b.po,pos(ch)); if(rot(ch))b.rot=true; addS(b.cells,span(ch));
        addS(b.op,ch.getAttribute('opacity')||ch.getAttribute('fill-opacity')||ch.style.opacity||ch.style.fillOpacity);
        if(ch.getAttribute('data-darkreader-inline-fill')!=null||ch.getAttribute('data-darkreader-inline-stroke')!=null||ch.style.getPropertyValue('--darkreader-inline-fill'))b.dr=true;
        if(tag==='text'){const t=(ch.textContent||'').trim().slice(0,12); if(t)addS(b.tx,t);}
      }
      if(ch.children.length) walk(ch,layer);
    }
  }
  for(const top of svg.children){ const layer=top.id?'#'+top.id:`${top.tagName.toLowerCase()}[${(top.getAttribute('class')||'').trim()}]`;
    if(/spdr/.test(layer)) continue; walk(top,layer); }
  const J=s=>[...s].join(','), theme=(document.body.className.match(/setting-uitheme-\w+/)||['default'])[0];
  const rows=[...B.entries()].sort().map(([k,v])=>{
    const p=[`${k}  ×${v.n}  z:${v.zlo}-${v.zhi}`];
    if(v.fv.size) p.push(`fill[${J(v.fs)}]=${J(v.fv)} gray:${J(v.fg)}`); else p.push(`fillSrc:${J(v.fs)}`);
    if(v.none) p.push('HAS-none/transparent');
    if(v.sv.size) p.push(`stroke[${J(v.ss)}]=${J(v.sv)} gray:${J(v.sg)} w:${J(v.sw)}`);
    if(v.sh.size) p.push(`shape:${J(v.sh)}`);
    if([...v.po].some(Boolean)) p.push(`pos:${J(v.po)}`);
    if(v.rot) p.push('ROTATED');
    if([...v.cells].some(x=>x>1)) p.push(`cells:${J(v.cells)}`);
    if([...v.op].some(x=>x!=null&&x!=='')) p.push(`opacity:${J(v.op)}`);
    if(v.dr) p.push('DR-managed');
    if(v.tx.size) p.push(`text:"${J(v.tx)}"`);
    return p.join('  |  ');
  }).join('\n');
  return `cs=${cs} gridN=${gridN} theme=${theme}\n`+rows;
})()
```

Also dump the **constraint-style tally** (the authoritative "what it means" the DOM
can't give you — e.g. `cage-extraregion` = a real 1-9 region, not decoration):

```js
(() => { const p = window.convertedPuzzle; if(!p||!p.cages) return 'no convertedPuzzle.cages';
  const t={}; p.cages.forEach(c=>{const s=(c.style||c.type||'none'); t[s]=(t[s]||0)+1;});
  return 'cages by style: '+JSON.stringify(t)+(p.cosmetics?` | cosmetics:${Object.keys(p.cosmetics).length} groups`:''); })()
```

### Field → decision it gates (why each is in the dump)

| Field in the dump | What it decides | Lesson it came from |
|---|---|---|
| `fill[src]=…` (src = inline!/inline/attr/inherited/css) | **inherited/css ⇒ our code can't see it ⇒ element untouched.** The single field that can prove a puzzle unaffected | overlay-marker gap; cascade section |
| `gray:true/false/none` (saturation `<0.08`) | gray vs colored slider routing; white & black are gray | Gray-vs-colored shading (v2.140) |
| `HAS-none/transparent`, `opacity:` | invisible anchors / translucent endpoints take different paths; translucent layers double-paint brighter | v2.176; z8ndhpjd05 brightening |
| `stroke[...] gray:` (stroke colour) | white stroke = grid-line **eraser**, dark = real outline | v2.192 |
| `shape:circle/pill/fullcell` | circle-vs-pill is the Kropki false-positive guard | v2.184 |
| `pos:border/corner/center/outside/arbitrary` | Kropki ownership **is** position; outside-grid = little-killer/sandwich | v2.164 / v2.184 |
| `ROTATED`, `cells:` | dedupe/tracing path; spanning-shape indicator | highlight dedupe; personal-notes |
| `z:lo-hi` (document order) | SVG has no z-index — paint order is sibling order; the lift/border cycle | personal-notes |
| `DR-managed` | whether/how DarkReader already converts it | cascade section |
| cage-style tally | `cage-extraregion` = constraint region, not decoration | region/shaded-region section |
| `theme=` | some CSS rules key off `setting-uitheme-purple` | label-bg CSS |

## Step 3 — Semantic constraint layer (secondary, for naming help)

The DOM tells you *what renders*; the puzzle definition tells you *what it means*
(a stroked `#arrows` path could be a thermo shaft, palindrome, renban, whisper, or
arrow line). Dump the constraint types to help annotate — **discover** the keys,
don't assume them (the schema varies by how the puzzle was authored):

```js
(() => {
  const p = Framework.getApp()?.puzzle;
  if (!p) return 'no app.puzzle';
  const out = {};
  for (const k of Object.keys(p)) {
    const v = p[k];
    out[k] = Array.isArray(v) ? `array[${v.length}]` : (v && typeof v === 'object' ? 'object' : typeof v);
  }
  return JSON.stringify(out, null, 2);
})()
```

Use this only as a cross-reference for naming buckets in Step 4. The DOM output from
Step 2 remains the authoritative inventory — it is what the userscript actually
manipulates.

## Step 4 — Annotate each bucket

For every row from Step 2, assign a name from the **Known Buckets** table below. The
match key is `layer + tag + class`. If a row matches no known entry, write the row
verbatim followed by `— UNKNOWN, investigate` and move on. Do **not** invent a name.

### Known Buckets (extend this table as new ones are confirmed)

| Layer | tag.class | Meaning | Script touches it via |
|---|---|---|---|
| `#cell-colors` | `rect` / `path.cell-color` | puzzle-defined cell fills (incl. split-cell halves) | Cell shading |
| `#underlay` | `circle`, `rect`, `rect.textbg` | circles / pills (thermo bulbs, dots, cosmetic shapes) | Object shading, Kropki, label-bg |
| `#overlay` | `rect`, `circle`, `path` | cosmetic shapes, lucky-charm marks, X-diagonal path | Object shading (`shouldShadeOverlayRect`) |
| `#overlay` | `text` | cosmetic text; grayscale `#N`/X-O markers; Kropki labels | overlay-marker-text shading; Kropki labels |
| `#arrows` | `path` (stroked) | thermo shafts, arrow lines, palindrome, renban, whisper, region-sum | `fixAllLines` / Object shading |
| `#arrows` | `path` (filled, arrowhead) | arrowheads | (left to DR) |
| `#cages` | `path` | killer-cage outlines / box cages | cage-box fix, `fixCagePath` |
| `#cages` | `path.cage-extraregion` | grey "extra regions" (e.g. must contain 1–9) | Shaded-region colouring |
| `#cages` | `text` | killer-cage sum labels | label-rect / text fixes |
| `#cell-grids` | `path.cell-grid` | the thin built-in grid lines (one path) | region borders / cell borders |
| `#cell-grids` | `path` (no `.cell-grid`) | the 9 cage-box / region boundary outlines | region borders |
| `#cell-values` | `text` | placed/given digits | given & placed-digit fixes |
| `#cell-candidates` | `text` / `tspan` | centre pencilmarks | pencilmark sort/colour |
| `#cell-pencilmarks` | `text` | corner pencilmarks | pencilmark reflow/colour |
| `rect.feature-kropki` | (any layer) | native Kropki dots | Kropki fix |
| `rect.textbg` | (any layer) | label backgrounds — Kropki circles AND other labelled circles | Kropki / label-bg |
| highlights / selection | `rect`, `path` | SudokuPad UI, not puzzle content | — (exclude) |

> This table mirrors the SVG z-order and Code map in `PROJECT_SUMMARY.md`. When a new
> confirmed bucket is added here, add the matching note there too if the script will
> handle it.

## Step 5 — Write the per-puzzle file

Write `docs/puzzle-catalog/<id>.md` using the template below. Paste the **raw Step 2
output** in the appendix unmodified (proof of completeness), and the annotated list
in the body.

```markdown
# Catalog — <id> (<title>)

- URL: https://sudokupad.app/<id>
- Extracted: <date>  |  Userscript disabled: yes/no  |  Tool/model: <which>
- Total elements under #svgrenderer: <N>

## Elements present (annotated)
| Bucket (layer · tag.class) | Count | Name | UNKNOWN? |
|---|---|---|---|
| ... | ... | ... | ... |

## UNKNOWN buckets (need investigation)
- <verbatim row>   ← describe what you tried

## Constraint types (from app.puzzle)
<paste Step 3 output>

## Decision attributes (from Step 2b — per bucket)
<paste Step 2b output + the cage-style tally>

## Appendix — raw enumeration (verbatim, do not edit)
```
<paste Step 2 output exactly>
```
```

## Step 6 — Roll up into the master union

After each puzzle, merge its buckets into `docs/ELEMENT_CATALOG.md` — a single union
table of every bucket ever seen, with a "first seen in" puzzle id and a list of
puzzles exhibiting it. A bucket already present just gets the new puzzle id appended.
New buckets get a new row (and an `UNKNOWN` flag until named). This master list is the
"surface a change might affect" reference.

---

## Quality bar / self-check (do this before finishing)

1. **Round-trip count.** Sum of all bucket counts in your annotated table must equal
   the total element count (minus any `spdr`/highlight/selection rows you explicitly
   excluded). If it doesn't, you dropped a bucket — go back.
2. **No invented names.** Every named bucket maps to a Known Buckets row. Anything
   else is `UNKNOWN`, not a guess.
3. **Raw appendix present and unedited.** It is the audit trail proving completeness.
4. **Userscript exclusion stated.** Either it was disabled, or `spdr*` buckets were
   excluded and that's noted.

---

## Using this to test which model is cheapest

The work splits into two skills with very different difficulty:

- **Extraction (Steps 1–2, 5-appendix):** purely mechanical — run a snippet, paste
  output. Any model should do this perfectly; failures here mean a tooling/prompt
  problem, not a capability gap.
- **Annotation (Step 4) + self-check (round-trip count, honest UNKNOWNs):** the part
  that needs judgement. This is where models will differ.

**Test protocol:** run the same 3–5 puzzles through each candidate model. Because the
raw appendix is deterministic, grade on:
- Did the annotated bucket counts round-trip to the total? (mechanical — pass/fail)
- Did it correctly name the buckets a stronger reference model named? (annotation
  accuracy)
- Did it flag genuinely-novel buckets as UNKNOWN instead of mislabelling them?
  (a cheap model that *guesses* names is worse than one that honestly flags UNKNOWN)

A model is "good enough" if extraction is perfect, round-trip always closes, and its
UNKNOWN flags are honest — even if its naming is slightly less polished, because the
master union's names can be corrected once and reused. Pick the cheapest model that
clears that bar.
```
