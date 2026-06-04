#!/usr/bin/env python3
"""
GAS Link Resolver (with checkpoint/resume and streaming output)
================================================================
Reads a list of URLs from Long_list_of_links.txt, resolves any shortlinks
(tinyurl, bit.ly, etc.), and keeps only links from the target domains:
  - app.crackingthecryptic.com
  - beta.sudokupad.app
  - crackingthecryptic.com
  - sudokupad.app

Writes resolved links to resolved_links.txt as it goes.
Saves progress to resolve_progress.txt so it can resume if interrupted.

Requirements:
    python -m pip install requests

Usage:
    python3 resolve_links.py          # run or resume
    python3 resolve_links.py --reset  # start fresh, ignoring saved progress
"""

import sys
import time
import urllib.parse
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit(
        "ERROR: requests not found. Install it with:\n"
        "    python -m pip install requests\n"
    )

# ── Configuration ─────────────────────────────────────────────────────────────

INPUT_FILE    = "Long_list_of_links.txt"
OUTPUT_FILE   = "resolved_links.txt"
PROGRESS_FILE = "resolve_progress.txt"  # tracks which URLs have been processed

TARGET_DOMAINS = (
    "app.crackingthecryptic.com",
    "beta.sudokupad.app",
    "crackingthecryptic.com",
    "sudokupad.app",
)

SHORTLINK_DOMAINS = {
    "tinyurl.com", "bit.ly", "t.co", "goo.gl", "ow.ly",
    "is.gd", "buff.ly", "ift.tt", "rb.gy", "shorturl.at",
    "tiny.cc", "cutt.ly", "rebrand.ly",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_hostname(url: str) -> str:
    try:
        return urllib.parse.urlparse(url).netloc.lower().split(":")[0]
    except Exception:
        return ""

def is_target(url: str) -> bool:
    h = get_hostname(url)
    return any(h == d or h.endswith("." + d) for d in TARGET_DOMAINS)

def is_shortlink(url: str) -> bool:
    return get_hostname(url) in SHORTLINK_DOMAINS

def resolve(url: str, session: requests.Session) -> str:
    """Follow redirects and return the final URL, or empty string on failure."""
    try:
        r = session.head(url, allow_redirects=True, timeout=10)
        return r.url
    except Exception:
        try:
            r = session.get(url, allow_redirects=True, timeout=10, stream=True)
            r.close()
            return r.url
        except Exception:
            return ""

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    reset = "--reset" in sys.argv

    input_path    = Path(INPUT_FILE)
    output_path   = Path(OUTPUT_FILE)
    progress_path = Path(PROGRESS_FILE)

    if not input_path.exists():
        sys.exit(f"ERROR: {INPUT_FILE} not found. Make sure it's in the same folder as this script.")

    # Load all candidate URLs from input
    candidates = [
        line.strip()
        for line in input_path.read_text(encoding="utf-8").splitlines()
        if line.strip().startswith("http")
    ]
    print(f"Found {len(candidates)} URLs in {INPUT_FILE}")

    # Load progress (set of URLs already processed)
    if reset:
        print("--reset flag: starting fresh.")
        progress_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)

    already_done: set[str] = set()
    if progress_path.exists() and not reset:
        already_done = set(progress_path.read_text(encoding="utf-8").splitlines())
        print(f"Resuming: {len(already_done)} URLs already processed, skipping them.")

    # Load already-written output URLs so we can deduplicate on append
    already_written: set[str] = set()
    if output_path.exists() and not reset:
        already_written = set(output_path.read_text(encoding="utf-8").splitlines())

    # Filter to only unprocessed candidates
    remaining = [u for u in candidates if u not in already_done]
    print(f"Remaining: {len(remaining)} URLs to process\n")

    if not remaining:
        print("Nothing left to do!")
        return

    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (compatible; GAS-link-resolver/1.0)"

    kept = 0
    skipped = 0
    failed = 0
    total = len(candidates)
    done_count = len(already_done)

    # Open both files in append mode
    with output_path.open("a", encoding="utf-8") as out_f, \
         progress_path.open("a", encoding="utf-8") as prog_f:

        for url in remaining:
            done_count += 1
            resolved_url = None

            if is_target(url):
                resolved_url = url
                print(f"[{done_count:04d}/{total}] direct   {url}")

            elif is_shortlink(url):
                resolved = resolve(url, session)
                if resolved and is_target(resolved):
                    resolved_url = resolved
                    print(f"[{done_count:04d}/{total}] resolved {url}")
                    print(f"              → {resolved}")
                elif not resolved:
                    failed += 1
                    print(f"[{done_count:04d}/{total}] FAILED   {url}")
                else:
                    skipped += 1
                    print(f"[{done_count:04d}/{total}] skipped  {url} → {resolved}")
                time.sleep(0.05)

            else:
                skipped += 1
                print(f"[{done_count:04d}/{total}] skipped  {url}")

            # Write result immediately if it's a keeper and not a duplicate
            if resolved_url and resolved_url not in already_written:
                out_f.write(resolved_url + "\n")
                out_f.flush()
                already_written.add(resolved_url)
                kept += 1

            # Mark this input URL as processed regardless of outcome
            prog_f.write(url + "\n")
            prog_f.flush()

    print()
    print("=" * 55)
    print(f"Done!")
    print(f"  {done_count} URLs processed total")
    print(f"  {kept} written to {OUTPUT_FILE}")
    print(f"  {skipped} skipped (wrong domain)")
    print(f"  {failed} failed to resolve")
    if failed:
        print(f"\n  Tip: re-run the script to retry failed URLs.")
        print(f"  (Failed URLs are NOT saved to progress, so they'll be retried.)")

if __name__ == "__main__":
    main()
