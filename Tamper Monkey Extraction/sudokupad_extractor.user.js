// ==UserScript==
// @name         SudokuPad Bulk Extractor
// @namespace    https://sudokupad.app/
// @version      2.4.0
// @description  Iterates a list of SudokuPad URLs, captures the decision-relevant DOM inventory (Step 2b) + convertedPuzzle semantics per puzzle, and exports a deduped bucket Union (JSON), a per-puzzle feature Index (CSV), and the raw records.
// @author       GAS Catalog Project
// @match        https://sudokupad.app/*
// @match        https://beta.sudokupad.app/*
// @match        https://app.crackingthecryptic.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────
  const POLL_INTERVAL_MS   = 500;
  const RENDER_TIMEOUT_MS  = 12000;
  const RESOLVE_GRACE_MS   = 5000; // wait this long for an import URL to redirect to its short slug before extracting anyway (unpublished puzzles never resolve)
  const MAX_RETRIES        = 3;
  const RETRY_DELAY_MS     = 2000;
  const BETWEEN_PUZZLES_MS = 1500;
  const AUTOSAVE_EVERY     = 50;  // auto-download results JSON every N puzzles

  // GM_setValue has per-value size limits, so we chunk the queue into pages
  const CHUNK_SIZE = 200; // URLs per chunk

  // ── Namespace ─────────────────────────────────────────────────────────────
  // Each tab stores its session name in sessionStorage (tab-local) so it
  // survives page-to-page navigation within the same tab but doesn't bleed
  // into other tabs. GM_setValue is shared across all tabs, so every key is
  // prefixed with the namespace to keep tabs isolated.

  const NS_SESSION_KEY = 'spdr_ns';

  function getNamespace() {
    return sessionStorage.getItem(NS_SESSION_KEY) || 'default';
  }

  function setNamespace(ns) {
    sessionStorage.setItem(NS_SESSION_KEY, ns.trim() || 'default');
  }

  function pk(k) {
    return `spdr_${getNamespace()}_${k}`;
  }

  // ── Storage keys ──────────────────────────────────────────────────────────
  const K = {
    chunks:  'chunks',
    pos:     'pos',
    rchunks: 'rchunks',
    fchunks: 'fchunks',
    running: 'running',
    retries: 'retries',
    total:   'total',
  };

  const get = (k, d=null) => GM_getValue(pk(k), d);
  const set = (k, v)      => GM_setValue(pk(k), v);
  const del = k           => GM_deleteValue(pk(k));

  // ── Chunked queue helpers ─────────────────────────────────────────────────
  // Queue chunks are stored under namespaced keys e.g. spdr_tab1_q_0

  function queueLength() {
    const n = get(K.chunks, 0);
    if (n === 0) return 0;
    let total = (n - 1) * CHUNK_SIZE;
    total += (GM_getValue(pk(`q_${n-1}`), [])).length;
    return total;
  }

  function queuePeek() {
    const chunk = GM_getValue(pk('q_0'), []);
    return chunk.length ? chunk[0] : null;
  }

  function queueShift() {
    const n = get(K.chunks, 0);
    if (n === 0) return null;
    const chunk = GM_getValue(pk('q_0'), []);
    const url = chunk.shift();
    if (chunk.length === 0) {
      GM_deleteValue(pk('q_0'));
      for (let i = 1; i < n; i++) {
        GM_setValue(pk(`q_${i-1}`), GM_getValue(pk(`q_${i}`), []));
        GM_deleteValue(pk(`q_${i}`));
      }
      set(K.chunks, n - 1);
    } else {
      GM_setValue(pk('q_0'), chunk);
    }
    return url;
  }

  function queueAppend(urls) {
    let n = get(K.chunks, 0);
    let lastChunk = n > 0 ? GM_getValue(pk(`q_${n-1}`), []) : [];
    for (const url of urls) {
      if (lastChunk.length >= CHUNK_SIZE) {
        GM_setValue(pk(`q_${n-1}`), lastChunk);
        n++;
        lastChunk = [];
      }
      lastChunk.push(url);
    }
    if (lastChunk.length > 0) {
      GM_setValue(pk(`q_${n > 0 ? n-1 : 0}`), lastChunk);
      if (n === 0) n = 1;
    }
    set(K.chunks, n);
  }

  function clearQueue() {
    const n = get(K.chunks, 0);
    for (let i = 0; i < n; i++) GM_deleteValue(pk(`q_${i}`));
    set(K.chunks, 0);
  }

  // ── Chunked results/failed helpers ────────────────────────────────────────
  // Results: spdr_{ns}_r_0, spdr_{ns}_r_1, ...
  // Failed:  spdr_{ns}_f_0, spdr_{ns}_f_1, ...

  function appendRecord(suffix, countKey, record) {
    let n = get(countKey, 0);
    let chunk = n > 0 ? GM_getValue(pk(`${suffix}_${n-1}`), []) : [];
    if (chunk.length >= CHUNK_SIZE) {
      GM_setValue(pk(`${suffix}_${n-1}`), chunk);
      n++;
      chunk = [];
    }
    chunk.push(record);
    GM_setValue(pk(`${suffix}_${n > 0 ? n-1 : 0}`), chunk);
    if (n === 0) n = 1;
    set(countKey, n);
  }

  function readAllRecords(suffix, countKey) {
    const n = get(countKey, 0);
    const all = [];
    for (let i = 0; i < n; i++) {
      all.push(...(GM_getValue(pk(`${suffix}_${i}`), [])));
    }
    return all;
  }

  function clearRecords(suffix, countKey) {
    const n = get(countKey, 0);
    for (let i = 0; i < n; i++) GM_deleteValue(pk(`${suffix}_${i}`));
    set(countKey, 0);
  }

  function appendResult(record) { appendRecord('r', K.rchunks, record); }
  function appendFailed(record) { appendRecord('f', K.fchunks, record); }
  function allResults()         { return readAllRecords('r', K.rchunks); }
  function allFailed()          { return readAllRecords('f', K.fchunks); }
  function resultCount()        { return readAllRecords('r', K.rchunks).length; }
  function failedCount()        { return readAllRecords('f', K.fchunks).length; }

  // ── Extraction ──────────────────────────────────────────────────────────────
  // collectBuckets() walks the entire #svgrenderer DOM and returns ONE structured
  // bucket per distinct (layer | tag.class). Each bucket carries the decision-
  // relevant attributes (the "Step 2b" set) as deduped value-arrays, so the export
  // step can aggregate buckets across puzzles into the Union without re-parsing text.
  //
  // EXCLUDED from capture (noise / not puzzle content, per CATALOG_INSTRUCTIONS):
  //   - our own clones: id^="spdr" or class contains "spdr"
  //   - SudokuPad selection/highlight UI: #cell-highlights layer
  //   - universal render plumbing: the top-level g[defs] filter block (always
  //     present on every puzzle, NOT fog, the script never touches it)
  function collectBuckets() {
    const svg = document.querySelector('#svgrenderer');
    if (!svg) return null;
    function parseColor(s){
      if(!s) return null; s=String(s).trim();
      if(s==='none'||s==='transparent') return {r:0,g:0,b:0,a:0,none:true};
      let m;
      if(m=s.match(/^#([0-9a-f]{3,8})$/i)){let h=m[1];
        if(h.length===3||h.length===4)h=h.replace(/./g,c=>c+c);
        const n=parseInt(h.slice(0,6),16),a=h.length===8?parseInt(h.slice(6,8),16)/255:1;
        return {r:(n>>16)&255,g:(n>>8)&255,b:n&255,a};}
      if(m=s.match(/^rgba?\(([^)]+)\)/i)){const p=m[1].split(',').map(parseFloat);
        return {r:p[0],g:p[1],b:p[2],a:p[3]==null?1:p[3]};}
      return null;}
    function isGray(c){if(!c||c.none)return null;
      const r=c.r/255,g=c.g/255,b=c.b/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;
      let s=0;if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);}return s<0.08;}
    function gcd(a,b){a=Math.round(a);b=Math.round(b);return b===0?a:gcd(b,a%b);}
    let cs=0,board=0;
    const cg=svg.querySelector('#cell-grids path.cell-grid');
    if(cg){const d=cg.getAttribute('d')||'';
      const ns=(d.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(n=>n>0.5);
      cs=ns.reduce(gcd,0)||0;board=ns.length?Math.max(...ns):0;}
    const gridN=cs?Math.round(board/cs):0;
    // Grid dimensions from the cell-grid's rendered extent — gives width AND height
    // separately (handles non-square boards). null when undeterminable (no cell-grid
    // / cs=0), which the CSV surfaces as "undefined". NOTE: this is the rendered grid
    // footprint; outer-clue / nogrid puzzles inflate it (same caveat as gridN).
    let gridW=null,gridH=null;
    if(cg&&cs){try{const bb=cg.getBBox();gridW=Math.round(bb.width/cs);gridH=Math.round(bb.height/cs);}catch(e){}}
    function own(el,p){return el.style.getPropertyValue(p)||el.getAttribute(p)||'';}
    function src(el,p){
      if(el.style.getPropertyValue(p))return el.style.getPropertyPriority(p)==='important'?'inline!':'inline';
      if(el.getAttribute(p)!=null)return 'attr';
      let q=el.parentElement;
      while(q&&q!==svg){if(q.style.getPropertyValue(p)||q.getAttribute(p)!=null)return 'inherited';q=q.parentElement;}
      return 'css/none';}
    function shape(el){if(el.tagName.toLowerCase()!=='rect')return el.tagName.toLowerCase();
      const w=+el.getAttribute('width')||0,h=+el.getAttribute('height')||0,rx=+el.getAttribute('rx')||0;
      if(!cs)return 'rect';
      if(Math.abs(w-h)<2&&Math.abs(rx-w/2)<2)return 'circle';
      if(rx>0&&Math.abs(rx-Math.min(w,h)/2)<3)return 'pill';
      if(Math.abs(w-cs)<cs*0.2&&Math.abs(h-cs)<cs*0.2&&rx<cs*0.3)return 'fullcell';
      return 'rect';}
    function rot(el){try{const m=el.getCTM&&el.getCTM();return m?(Math.abs(m.b)>0.01||Math.abs(m.c)>0.01):false;}catch(e){return false;}}
    function pos(el){if(!cs)return '';
      let bb;try{bb=el.getBBox();}catch(e){return '';}
      const cx=bb.x+bb.width/2,cy=bb.y+bb.height/2;
      if(cx<-1||cy<-1||cx>board+1||cy>board+1)return 'outside';
      const t=cs*0.2,mod=v=>((v%cs)+cs)%cs;
      const xg=Math.min(mod(cx),cs-mod(cx))<t,yg=Math.min(mod(cy),cs-mod(cy))<t;
      const xm=Math.abs(mod(cx)-cs/2)<t,ym=Math.abs(mod(cy)-cs/2)<t;
      if(xg&&yg)return 'corner';if((xg&&ym)||(xm&&yg))return 'border';
      if(xm&&ym)return 'center';return 'arbitrary';}
    function span(el){if(!cs)return 0;
      let bb;try{bb=el.getBBox();}catch(e){return 0;}
      const a=Math.floor((bb.x+1)/cs),b2=Math.floor((bb.x+bb.width-1)/cs),
            c=Math.floor((bb.y+1)/cs),d=Math.floor((bb.y+bb.height-1)/cs);
      return Math.max(1,b2-a+1)*Math.max(1,d-c+1);}
    const B=new Map(),addS=(s,v)=>{if(v!=null&&v!=='')s.add(v);};
    function walk(el,layer){
      for(const ch of el.children){
        const tag=ch.tagName.toLowerCase();
        const cls=(ch.getAttribute('class')||'').split(/\s+/).filter(Boolean).sort().join('.');
        const isOurs=(ch.id&&ch.id.startsWith('spdr'))||/spdr/.test(cls);
        if(!isOurs){
          const key=`${layer} | ${tag}${cls?'.'+cls:''}`;
          let b=B.get(key);
          if(!b){b={n:0,fv:new Set(),fs:new Set(),fg:new Set(),sv:new Set(),ss:new Set(),sg:new Set(),sw:new Set(),sh:new Set(),po:new Set(),rot:false,cells:new Set(),op:new Set(),none:false,dr:false,zlo:1e9,zhi:-1,tx:new Set()};B.set(key,b);}
          b.n++;
          const zi=Array.prototype.indexOf.call(el.children,ch);b.zlo=Math.min(b.zlo,zi);b.zhi=Math.max(b.zhi,zi);
          const fo=own(ch,'fill'),fc=parseColor(fo);
          addS(b.fs,src(ch,'fill'));if(fo){addS(b.fv,fo);b.fg.add(fc&&fc.none?'none':isGray(fc));}if(fc&&fc.none)b.none=true;
          const so=own(ch,'stroke'),sc=parseColor(so);
          if(so&&so!=='none'){addS(b.sv,so);addS(b.ss,src(ch,'stroke'));b.sg.add(isGray(sc));addS(b.sw,ch.getAttribute('stroke-width')||ch.style.strokeWidth);}
          addS(b.sh,shape(ch));addS(b.po,pos(ch));if(rot(ch))b.rot=true;addS(b.cells,span(ch));
          addS(b.op,ch.getAttribute('opacity')||ch.getAttribute('fill-opacity')||ch.style.opacity||ch.style.fillOpacity);
          if(ch.getAttribute('data-darkreader-inline-fill')!=null||ch.getAttribute('data-darkreader-inline-stroke')!=null||ch.style.getPropertyValue('--darkreader-inline-fill'))b.dr=true;
          if(tag==='text'){const t=(ch.textContent||'').trim().slice(0,12);if(t)addS(b.tx,t);}
        }
        if(ch.children.length)walk(ch,layer);
      }
    }
    for(const top of svg.children){
      const layer=top.id?'#'+top.id:`${top.tagName.toLowerCase()}[${(top.getAttribute('class')||'').trim()}]`;
      // skip our clones, SudokuPad selection UI, and universal filter plumbing
      if(/spdr/.test(layer)||layer==='#cell-highlights'||/^g\[defs\]/.test(layer))continue;
      walk(top,layer);
    }
    const A=s=>[...s];
    const buckets=[...B.entries()].sort((a,b2)=>a[0]<b2[0]?-1:1).map(([k,v])=>({
      k, n:v.n, z:[v.zlo,v.zhi],
      fSrc:A(v.fs), fVal:A(v.fv), fGray:A(v.fg).map(String),
      none:v.none||undefined,
      sVal:A(v.sv), sSrc:A(v.ss), sGray:A(v.sg).map(String), sW:A(v.sw),
      shape:A(v.sh), pos:A(v.po).filter(Boolean),
      rot:v.rot||undefined,
      cells:A(v.cells).filter(x=>x>1),
      op:A(v.op), dr:v.dr||undefined,
      text:A(v.tx),
    }));
    const theme=(document.body.className.match(/setting-uitheme-\w+/)||['default'])[0];
    return { meta:{ cs, gridN, gridW, gridH, theme }, buckets };
  }

  // ── Puzzle semantics (from window.convertedPuzzle — authoritative on v0.611.0;
  //    Framework.getApp() is EMPTY on current builds, so never read title/puzzle
  //    from it) ──────────────────────────────────────────────────────────────────
  // The puzzle model lives on the PAGE window as `convertedPuzzle`. Because this
  // script uses @grant (sandboxed), `window` is TamperMonkey's wrapper and does NOT
  // expose page globals — they're only on `unsafeWindow`. Reading plain `window`
  // here returns undefined and silently empties title/author/constraints/gridSize.
  function pageWindow() {
    return (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;
  }

  function getConverted() {
    try {
      const w = pageWindow();
      return w.convertedPuzzle || (w.Framework && w.Framework.getApp && w.Framework.getApp().puzzle) || null;
    } catch (e) { return null; }
  }

  // Non-zero constraint arrays only — drops the dozen "array[0]" keys that are pure
  // noise. Returns { thermos:3, kropkis:20, foglight:36, ... }.
  function getConstraints(p) {
    const out = {};
    if (!p) return out;
    for (const k of Object.keys(p)) {
      const v = p[k];
      if (Array.isArray(v) && v.length > 0) out[k] = v.length;
    }
    return out;
  }

  // Tally of cage styles — distinguishes a real 1-9 region (cage-extraregion) from
  // killer cages / box outlines / decoration.
  function getCageStyles(p) {
    const t = {};
    if (p && Array.isArray(p.cages)) {
      for (const c of p.cages) { const s = (c && (c.style || c.type)) || 'none'; t[s] = (t[s] || 0) + 1; }
    }
    return t;
  }

  // True play-grid side length from the solution string (reliable, unlike gridN
  // which is inflated by outer clues / padding / nogrid). Falls back to '' if absent.
  function getGridSize(p) {
    const sol = p && typeof p.solution === 'string' ? p.solution : '';
    if (!sol) return '';
    const side = Math.round(Math.sqrt(sol.length));
    return side * side === sol.length ? side : '';
  }

  // A raw-import URL (f-puzzles / SCF / CTC / penpa blob) that SudokuPad rewrites to
  // a short slug and reloads. We must NOT extract while still on one of these, or we
  // record the giant encoded string as the id/url instead of the resolved short slug.
  // Detection is by length (these are huge) with a prefix net; short slugs and
  // author/name paths never trigger.
  function isImportUrl() {
    let p = location.pathname.replace(/^\//, '');
    try { p = decodeURIComponent(p); } catch (e) {}
    const seg = p.split('/')[0];                                   // first path segment
    if (seg.length > 60) return true;                              // long encoded blob
    if (seg.length > 40 && /^(fpuz|scf|scl|scln|ctc|penpa)/i.test(seg)) return true;
    if (/[?&](puzzleid|fpuzzles|fpuz|scf|scl)=/i.test(location.search)) return true;
    return false;
  }

  // ── Puzzle ready check ─────────────────────────────────────────────────────
  // Model-ready: rendered SVG + the puzzle model (convertedPuzzle). Some puzzles show
  // a partial SVG skeleton before the model is wired up; extracting then yields
  // empty-constraint garbage, so we wait for convertedPuzzle. URL-resolution is a
  // SEPARATE, soft condition handled in the poll (grace period) — see attemptExtraction.
  function puzzleIsReady() {
    const svg = document.querySelector('#svgrenderer');
    return !!(svg && document.querySelectorAll('#svgrenderer *').length > 0 && getConverted());
  }

  // The id we record. Prefer the resolved short slug from the URL; but if we're still
  // on a raw-import blob (an unpublished puzzle that has no short URL), fall back to
  // convertedPuzzle.id — a clean, stable, embedded id — instead of a 900-char string.
  function getPuzzleId() {
    const fromUrl = location.pathname.replace(/^\//, '').split('?')[0] || location.href;
    if (isImportUrl() || fromUrl.length > 60) {
      const cp = getConverted();
      if (cp && cp.id) return cp.id;
    }
    return fromUrl;
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function loadNextUrl() {
    if (!get(K.running)) return;
    const next = queuePeek();
    if (!next) {
      set(K.running, false);
      updateUI();
      log('✅ All URLs processed!');
      return;
    }
    set(K.retries, 0);
    log(`→ Loading: ${next}`);
    // If we're already sitting on the target URL, setting location.href to the same
    // string may not trigger a navigation — force a reload so the page renders fresh.
    if (next === location.href) location.reload();
    else location.href = next;
  }

  function markCurrentFailed(reason) {
    const url = queueShift();
    appendFailed({ url, reason, timestamp: new Date().toISOString() });
    set(K.pos, (get(K.pos, 0)) + 1);
    updateUI();
    log(`✗ Failed (${reason}): ${url}`);
    setTimeout(loadNextUrl, RETRY_DELAY_MS);
  }

  function markCurrentSuccess(data) {
    const originalUrl = queueShift();
    appendResult({ originalUrl, ...data, timestamp: new Date().toISOString() });
    const pos = (get(K.pos, 0)) + 1;
    set(K.pos, pos);
    updateUI();
    log(`✓ Done: ${data.id}`);
    // Auto-save every AUTOSAVE_EVERY puzzles
    if (pos % AUTOSAVE_EVERY === 0) {
      log(`💾 Auto-saving at ${pos} puzzles...`);
      downloadJSON(allResults(), `spdr_${getNamespace()}_results_autosave_${pos}.json`);
    }
    setTimeout(loadNextUrl, BETWEEN_PUZZLES_MS);
  }

  // ── Extraction flow ────────────────────────────────────────────────────────
  function attemptExtraction() {
    if (!get(K.running)) return;
    if (queueLength() === 0) {
      set(K.running, false);
      updateUI();
      log('✅ Queue empty — all done!');
      return;
    }

    let elapsed = 0;
    const poll = setInterval(() => {
      if (!get(K.running)) { clearInterval(poll); return; }

      // Extract once the model is ready AND the URL has resolved to its short slug.
      // If it's still an import blob after RESOLVE_GRACE_MS, the puzzle is almost
      // certainly unpublished (no short URL exists) — extract anyway rather than
      // fail; getPuzzleId() then falls back to convertedPuzzle.id for a clean id.
      const modelReady = puzzleIsReady();
      const urlResolved = !isImportUrl();
      if (modelReady && (urlResolved || elapsed >= RESOLVE_GRACE_MS)) {
        clearInterval(poll);
        if (!urlResolved) log('↪ URL did not resolve to a slug — using convertedPuzzle.id');
        setTimeout(() => {
          try {
            const cap = collectBuckets();
            if (!cap) throw new Error('collectBuckets returned null after ready check passed');
            const cp = getConverted();
            const resolved = !isImportUrl();
            markCurrentSuccess({
              id:          getPuzzleId(),                       // short slug, or cp.id if unresolved
              cpId:        (cp && cp.id) || '',                 // stable embedded id (always)
              url:         resolved ? location.href : '',       // only the resolved short URL
              urlResolved: resolved,
              title:       (cp && cp.title)  || document.title || '',
              author:      (cp && cp.author) || (cp && cp.metadata && cp.metadata.author) || '',
              gridSize:    getGridSize(cp),
              meta:        cap.meta,             // { cs, gridN, gridW, gridH, theme }
              constraints: getConstraints(cp),   // non-zero arrays only
              cageStyles:  getCageStyles(cp),
              buckets:     cap.buckets,          // structured decision dump
            });
          } catch (e) {
            handleRenderFailure(`extraction error: ${e.message}`);
          }
        }, 800);
        return;
      }

      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= RENDER_TIMEOUT_MS) {
        clearInterval(poll);
        handleRenderFailure('render timeout');
      }
    }, POLL_INTERVAL_MS);
  }

  function handleRenderFailure(reason) {
    let retries = get(K.retries, 0) + 1;
    set(K.retries, retries);
    if (retries < MAX_RETRIES) {
      log(`⚠ ${reason} — retry ${retries}/${MAX_RETRIES}`);
      setTimeout(() => location.reload(), RETRY_DELAY_MS);
    } else {
      markCurrentFailed(`${reason} after ${MAX_RETRIES} attempts`);
    }
  }

  // ── File loading ───────────────────────────────────────────────────────────
  function loadFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.csv';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        const lines = e.target.result.split('\n');
        // Dedupe the incoming file against itself — a 2,000-line list may repeat URLs.
        const urls = [...new Set(lines.map(l => l.trim()).filter(l => l.startsWith('http')))];

        // Build the "already handled" set for resume-dedup. Results store BOTH the
        // queued URL (originalUrl) and the post-redirect URL (url); the list contains
        // the original (often a long fpuzzles URL that redirects to a short slug), so
        // match on originalUrl or we'd re-run everything already done.
        const done = new Set();
        allResults().forEach(r => { if (r.originalUrl) done.add(r.originalUrl); if (r.url) done.add(r.url); });
        allFailed().forEach(r => { if (r.url) done.add(r.url); });
        // Also grab current queue contents for dedup
        const qLen = get(K.chunks, 0);
        for (let i = 0; i < qLen; i++) {
          (GM_getValue(pk(`q_${i}`), [])).forEach(u => done.add(u));
        }

        const newUrls = urls.filter(u => !done.has(u));
        queueAppend(newUrls);
        set(K.total, (get(K.total, 0)) + newUrls.length);
        log(`📂 Loaded "${file.name}": ${urls.length} URLs, ${newUrls.length} new, ${urls.length - newUrls.length} already seen/done.`);
        updateUI();
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // ── Download ───────────────────────────────────────────────────────────────
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: filename
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadText(text, filename, mime) {
    const blob = new Blob([text], { type: mime || 'text/plain' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: filename
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ── Union (deduped buckets across all puzzles) — the pre-merged feed for the
  //    Phase-2 AI. One entry per distinct bucket key, with the union of every
  //    decision-attribute value seen and the list of puzzles exhibiting it. ───────
  function buildUnion(records) {
    const U = new Map();
    const uniq = (arr) => [...new Set(arr)];
    for (const rec of records) {
      const pid = rec.id;
      for (const b of (rec.buckets || [])) {
        let u = U.get(b.k);
        if (!u) {
          u = { bucket: b.k, totalCount: 0, puzzleCount: 0, firstSeen: pid,
                fSrc:[], fVal:[], fGray:[], stroke:[], sSrc:[], sGray:[], sW:[],
                shape:[], pos:[], cells:[], opacity:[], none:false, rotated:false,
                drManaged:false, text:[], puzzles:[] };
          U.set(b.k, u);
        }
        u.totalCount += b.n;
        u.puzzleCount += 1;
        u.puzzles.push(pid);
        u.fSrc.push(...(b.fSrc||[]));   u.fVal.push(...(b.fVal||[])); u.fGray.push(...(b.fGray||[]));
        u.stroke.push(...(b.sVal||[])); u.sSrc.push(...(b.sSrc||[])); u.sGray.push(...(b.sGray||[])); u.sW.push(...(b.sW||[]));
        u.shape.push(...(b.shape||[])); u.pos.push(...(b.pos||[]));   u.cells.push(...(b.cells||[]));
        u.opacity.push(...(b.op||[]));  u.text.push(...(b.text||[]));
        if (b.none) u.none = true;
        if (b.rot)  u.rotated = true;
        if (b.dr)   u.drManaged = true;
      }
    }
    return [...U.values()]
      .sort((a, b) => a.bucket < b.bucket ? -1 : 1)
      .map(u => ({
        bucket: u.bucket, totalCount: u.totalCount, puzzleCount: u.puzzleCount, firstSeen: u.firstSeen,
        fillSrc: uniq(u.fSrc), fill: uniq(u.fVal), fillGray: uniq(u.fGray),
        none: u.none || undefined,
        stroke: uniq(u.stroke), strokeSrc: uniq(u.sSrc), strokeGray: uniq(u.sGray), strokeWidth: uniq(u.sW),
        shape: uniq(u.shape), pos: uniq(u.pos), cells: uniq(u.cells), opacity: uniq(u.opacity),
        rotated: u.rotated || undefined, drManaged: u.drManaged || undefined,
        text: uniq(u.text),
        puzzles: u.puzzles,
      }));
  }

  // ── Feature Index (CSV, one row per puzzle, boolean feature flags) — the
  //    mechanical "which puzzles contain what" lookup. Derived from convertedPuzzle
  //    constraints + DOM bucket signatures; no AI needed. ──────────────────────────
  //
  // FEATURE_COLS maps a column name to a predicate over (constraints, bucketKeys).
  // constraints = { thermos:3, ... } (non-zero); bucketKeys = joined bucket keys.
  const FEATURE_COLS = {
    fog:           (c, k) => !!(c.foglight || c.foglink) || /#fog/.test(k),
    kropki:        (c, k) => !!c.kropkis || /feature-kropki/.test(k),
    xv:            (c, k) => !!(c.xv || c.exclusion) || /feature-xv/.test(k),
    killer_cage:   (c, k) => /cage-killer/.test(k),
    extra_region:  (c, k) => /cage-extraregion/.test(k),
    thermo:        (c, k) => !!c.thermos,
    arrow:         (c, k) => !!c.arrowSums || /#arrows \| (path|marker)/.test(k),
    palindrome:    (c, k) => !!c.palindrome,
    little_killer: (c, k) => !!c.littleKiller,
    sandwich:      (c, k) => !!c.sandwichCages,
    inequality:    (c, k) => !!c.inequality,
    sudoku_x:      (c, k) => !!c.sudokuX,
    windoku:       (c, k) => !!c.windoku,
    cosmetic:      (c, k) => !!(c.cosmetic || c.cosmetics) || /#overlay|#underlay/.test(k),
    cell_colors:   (c, k) => /#cell-colors/.test(k),
    givens:        (c, k) => !!c.givens || /cell-given/.test(k),
  };

  function csvCell(v) {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // Constraint keys already represented by a curated FEATURE_COLS column — don't
  // emit a duplicate auto-column for these.
  const COVERED_KEYS = new Set(['foglight','foglink','kropkis','xv','exclusion','thermos',
    'arrowSums','palindrome','littleKiller','sandwichCages','inequality','sudokuX','windoku',
    'cosmetic','cosmetics','givens','cages']);
  // Array-valued convertedPuzzle keys that are NOT puzzle features (text / structure),
  // so they never become columns.
  const NON_FEATURE_KEYS = new Set(['rules','cellData','cells','regions','solution','grid',
    'lines','underlays','overlays']);

  // Grid dimensions for the Index: prefer the rendered cell-grid extent (gives W & H
  // separately, so non-square boards are caught), fall back to the solution-derived
  // square side, and emit literal "undefined" when neither is determinable so it's
  // searchable.
  function gridDims(rec) {
    const m = rec.meta || {};
    let w = m.gridW, h = m.gridH;
    if (!(w > 0 && h > 0)) { const s = rec.gridSize; if (s > 0) { w = s; h = s; } }
    if (w > 0 && h > 0) return { w, h, sq: (w === h ? 1 : 0) };
    return { w: 'undefined', h: 'undefined', sq: 'undefined' };
  }

  function buildIndexCSV(records) {
    const featNames = Object.keys(FEATURE_COLS);
    // Auto-discover every other constraint key seen across ALL records → one column
    // each. New constraint types (renban, whisper, …) get their own filterable column
    // automatically, instead of being dumped in a single blob.
    const extra = new Set();
    for (const rec of records)
      for (const k of Object.keys(rec.constraints || {}))
        if (!COVERED_KEYS.has(k) && !NON_FEATURE_KEYS.has(k)) extra.add(k);
    const extraCols = [...extra].sort();

    const head = ['id', 'cp_id', 'title', 'author', 'grid_w', 'grid_h', 'is_square',
      ...featNames, ...extraCols, 'url_resolved', 'url'];
    const rows = [head.map(csvCell).join(',')];
    for (const rec of records) {
      const c = rec.constraints || {};
      const bucketKeys = (rec.buckets || []).map(b => b.k).join(' || ');
      const flags = featNames.map(fn => FEATURE_COLS[fn](c, bucketKeys) ? 1 : 0);
      const extraFlags = extraCols.map(k => (c[k] > 0 ? 1 : 0));
      const d = gridDims(rec);
      const row = [rec.id, rec.cpId || '', rec.title, rec.author, d.w, d.h, d.sq,
        ...flags, ...extraFlags, (rec.urlResolved ? 1 : 0), rec.url];
      rows.push(row.map(csvCell).join(','));
    }
    return rows.join('\n');
  }

  // ── Logging ────────────────────────────────────────────────────────────────
  function log(msg) {
    const el = document.getElementById('spdr-log');
    if (!el) return;
    const line = document.createElement('div');
    line.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  const btn = (bg) =>
    `background:${bg};color:#fff;border:none;border-radius:4px;` +
    `padding:5px 8px;cursor:pointer;font-size:11px;flex:1;`;

  function updateUI() {
    const total   = get(K.total, 0);
    const pos     = get(K.pos,   0);
    const running = get(K.running, false);
    const qLen    = queueLength();
    const rCount  = resultCount();
    const fCount  = failedCount();

    const s = id => document.getElementById(id);
    if (s('spdr-pos'))     s('spdr-pos').textContent     = pos;
    if (s('spdr-total'))   s('spdr-total').textContent   = total;
    if (s('spdr-rcount'))  s('spdr-rcount').textContent  = rCount;
    if (s('spdr-fcount'))  s('spdr-fcount').textContent  = fCount;
    if (s('spdr-start'))   s('spdr-start').disabled      = running || qLen === 0;
    if (s('spdr-pause'))   s('spdr-pause').disabled      = !running;
    if (s('spdr-status'))  s('spdr-status').textContent  =
      running ? '▶ Running' : (qLen === 0 && total > 0 ? '✅ Complete' : '⏸ Paused');
  }

  function buildUI() {
    const panel = document.createElement('div');
    panel.id = 'spdr-panel';
    panel.style.cssText =
      'position:fixed;top:10px;right:10px;z-index:999999;' +
      'background:#1a1a2e;color:#e0e0e0;border:1px solid #444;' +
      'border-radius:8px;padding:12px;width:300px;' +
      'font-family:monospace;font-size:12px;box-shadow:0 4px 20px rgba(0,0,0,.5);';

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:13px;cursor:move;" id="spdr-drag">🧩 SudokuPad Extractor</strong>
        <span id="spdr-status" style="color:#aaa;font-size:11px;">⏸ Paused</span>
      </div>
      <div style="margin-bottom:6px;display:flex;align-items:center;gap:6px;">
        <label style="white-space:nowrap;font-size:11px;">Session:</label>
        <input id="spdr-ns" type="text" placeholder="e.g. tab1"
          style="flex:1;background:#111;color:#ccc;border:1px solid #555;border-radius:4px;
                 padding:3px 6px;font-size:11px;font-family:monospace;"
          value="${getNamespace()}">
        <button id="spdr-ns-set" style="${btn('#444')}">Set</button>
      </div>
      <div style="margin-bottom:8px;line-height:1.6;">
        <div>Progress: <b id="spdr-pos">0</b> / <b id="spdr-total">0</b></div>
        <div>✓ Saved: <b id="spdr-rcount">0</b> &nbsp; ✗ Failed: <b id="spdr-fcount">0</b></div>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px;">
        <button id="spdr-file"  style="${btn('#2a5298')}">📂 Load File</button>
        <button id="spdr-start" style="${btn('#1a7a1a')}" disabled>▶ Start</button>
        <button id="spdr-pause" style="${btn('#7a5a1a')}" disabled>⏸ Pause</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:4px;">
        <button id="spdr-dl-u" style="${btn('#2a6060')}">⬇ Union</button>
        <button id="spdr-dl-i" style="${btn('#2a6060')}">⬇ Index</button>
        <button id="spdr-dl-r" style="${btn('#445')}">⬇ Raw</button>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:4px;">
        <button id="spdr-dl-f" style="${btn('#604040')}">⬇ Failed</button>
        <button id="spdr-reset" style="${btn('#7a1a1a')}">🗑 Reset</button>
      </div>
      <div style="display:flex;gap:4px;">
        <button id="spdr-log-toggle" style="${btn('#333')}">Log ▾</button>
      </div>
      <div id="spdr-log"
        style="margin-top:6px;height:110px;overflow-y:auto;background:#111;
               border:1px solid #333;border-radius:4px;padding:4px;
               font-size:10px;display:none;"></div>
    `;

    document.body.appendChild(panel);

    // Drag
    let dragging = false, ox = 0, oy = 0;
    document.getElementById('spdr-drag').addEventListener('mousedown', e => {
      dragging = true; ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop;
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      panel.style.left = (e.clientX - ox) + 'px';
      panel.style.top  = (e.clientY - oy) + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => dragging = false);

    // Namespace
    document.getElementById('spdr-ns-set').addEventListener('click', () => {
      const ns = document.getElementById('spdr-ns').value.trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
      document.getElementById('spdr-ns').value = ns;
      if (get(K.running)) {
        alert('Cannot change session while running. Pause first.');
        return;
      }
      setNamespace(ns);
      updateUI();
      log(`🏷 Session set to "${ns}"`);
    });

    document.getElementById('spdr-file').addEventListener('click', loadFile);

    document.getElementById('spdr-start').addEventListener('click', () => {
      set(K.running, true);
      updateUI();
      // Navigate to the first queued URL FIRST — do not extract whatever page we
      // happen to be sitting on (that mis-captures the current page and consumes the
      // first queue slot without visiting it). The post-navigation boot() resumes
      // extraction on the correct puzzle.
      loadNextUrl();
    });

    document.getElementById('spdr-pause').addEventListener('click', () => {
      set(K.running, false);
      updateUI();
      log('⏸ Paused. Navigate back to sudokupad.app and click Start to resume.');
    });

    document.getElementById('spdr-reset').addEventListener('click', () => {
      if (!confirm('Reset ALL progress for this session? This cannot be undone.')) return;
      clearQueue();
      clearRecords('r', K.rchunks);
      clearRecords('f', K.fchunks);
      [K.pos, K.running, K.retries, K.total].forEach(del);
      updateUI();
      log('🔄 Reset complete.');
    });

    document.getElementById('spdr-dl-u').addEventListener('click', () => {
      const recs = allResults();
      const union = buildUnion(recs);
      downloadJSON(union, `spdr_${getNamespace()}_union_${Date.now()}.json`);
      log(`⬇ Union: ${union.length} distinct buckets from ${recs.length} puzzles.`);
    });

    document.getElementById('spdr-dl-i').addEventListener('click', () => {
      const recs = allResults();
      downloadText(buildIndexCSV(recs), `spdr_${getNamespace()}_index_${Date.now()}.csv`, 'text/csv');
      log(`⬇ Index: ${recs.length} puzzles → CSV.`);
    });

    document.getElementById('spdr-dl-r').addEventListener('click', () => {
      downloadJSON(allResults(), `spdr_${getNamespace()}_raw_${Date.now()}.json`);
    });

    document.getElementById('spdr-dl-f').addEventListener('click', () => {
      downloadJSON(allFailed(), `spdr_${getNamespace()}_failed_${Date.now()}.json`);
    });

    document.getElementById('spdr-log-toggle').addEventListener('click', () => {
      const logEl = document.getElementById('spdr-log');
      const btn   = document.getElementById('spdr-log-toggle');
      const shown = logEl.style.display !== 'none';
      logEl.style.display = shown ? 'none' : 'block';
      btn.textContent = shown ? 'Log ▾' : 'Log ▴';
    });

    updateUI();
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  function boot() {
    buildUI();
    if (get(K.running)) {
      log('▶ Resuming...');
      updateUI();
      setTimeout(attemptExtraction, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
