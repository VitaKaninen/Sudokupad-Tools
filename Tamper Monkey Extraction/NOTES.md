# SudokuPad Extractor — gotchas

Bulk crawler (`sudokupad_extractor.user.js`): navigation-based, one puzzle per page load,
state in TamperMonkey `GM_*` storage namespaced per session. Two non-obvious failure modes
bit us during the 4-list validation run (2026-06-04); both are recorded here so we don't
re-diagnose them.

## 1. Chrome silently blocks every autosave after the first

The crawler auto-downloads `..._results_autosave_<pos>.json` every 50 puzzles. The download
is **renderer-initiated with no user gesture** (the page navigates itself between puzzles via
`location.href`, and `downloadJSON` just does `a.click()`). Chrome's "multiple automatic
downloads" protection allows the **first** such download and **silently blocks all the rest** —
the crawl keeps running and the data keeps accumulating in GM storage, but no further files hit
disk. Tell-tale sign: a red ① badge on the toolbar download icon.

- **Data is never lost** — it's all in GM storage (the panel's Saved count). The manual
  **Raw / Union / Index** buttons fire on a real click (user gesture), so they always download.
- **Fix:** allow automatic downloads for the site — `chrome://settings/content/automaticDownloads`,
  add `https://sudokupad.app` and `https://[*.]sudokupad.app` to **Allowed**. Then every autosave lands.
- This is environmental, not a script bug. Don't "fix" it in code by chasing the download API.

## 2. queueAppend off-by-one orphaned the first chunk (fixed in v2.5.0)

The queue is chunked into `q_0, q_1, …` of `CHUNK_SIZE` (200) URLs. The old `queueAppend`
counted chunks in `n` but wrote the filling chunk to `q_${n-1}`; on the first chunk-fill `n`
was still `0`, so the first 200 URLs went to **`q_-1`**, which is never read back. Net effect:
**the first 200 URLs of every list longer than 200 were never crawled.**

Smoking gun: two "Complete" sessions stopped at exactly `total − 200` (275/475 and 265/465).
Only triggers on lists > CHUNK_SIZE, which is why small test lists never exposed it.

Fixed by indexing the queue by chunk *position* (`idx`) instead of *count*. If you ever see a
run finish exactly `CHUNK_SIZE` short, suspect chunk-index math again.
