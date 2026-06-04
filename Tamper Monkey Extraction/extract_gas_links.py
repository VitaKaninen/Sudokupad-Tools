#!/usr/bin/env python3
"""
GAS Leak PDF Link Extractor
============================
Downloads all GAS Leak PDFs from sudokutheory.com/gas/ and extracts
puzzle links from the following domains:
  - app.crackingthecryptic.com
  - beta.sudokupad.app
  - crackingthecryptic.com
  - sudokupad.app

Also resolves URL shorteners (tinyurl.com, bit.ly, etc.) to find
links that redirect to the target domains.

Requirements:
    pip install pymupdf requests

Output:
    gas_links.csv   — all found links with source PDF noted
    gas_links.txt   — plain list of unique links, one per line
"""

import re
import csv
import sys
import time
import urllib.parse
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit(
        "ERROR: PyMuPDF not found. Install it with:\n"
        "    python -m pip install pymupdf\n"
        "Then re-run this script."
    )

try:
    import requests
except ImportError:
    sys.exit(
        "ERROR: requests not found. Install it with:\n"
        "    python -m pip install requests\n"
        "Then re-run this script."
    )

# ── Configuration ─────────────────────────────────────────────────────────────

TARGET_DOMAINS = (
    "app.crackingthecryptic.com",
    "beta.sudokupad.app",
    "crackingthecryptic.com",
    "sudokupad.app",
)

# URL shortener domains whose redirects we should follow
SHORTLINK_DOMAINS = {
    "tinyurl.com", "bit.ly", "t.co", "goo.gl", "ow.ly",
    "is.gd", "buff.ly", "ift.tt", "rb.gy", "shorturl.at",
    "tiny.cc", "cutt.ly", "rebrand.ly",
}

# All GAS Leak PDFs listed on https://sudokutheory.com/gas/
PDF_LIST = [
    ("GAS Leak 01", "https://sudokutheory.com/gas/leaks/GAS_Leak_01_-_June_7_2021_-_June_26_2021.pdf"),
    ("GAS Leak 02", "https://sudokutheory.com/gas/leaks/GAS_Leak_02_-_June_27_2021_-_July_16_2021.pdf"),
    ("GAS Leak 03", "https://sudokutheory.com/gas/leaks/GAS_Leak_03_-_July_17_2021_-_August_5_2021.pdf"),
    ("GAS Leak 04", "https://sudokutheory.com/gas/leaks/GAS_Leak_04_-_August_6_2021_-_August_25_2021.pdf"),
    ("GAS Leak 05", "https://sudokutheory.com/gas/leaks/GAS_Leak_05_-_August_26_2021_-_September_14_2021.pdf"),
    ("GAS Leak 06", "https://sudokutheory.com/gas/leaks/GAS_Leak_06_-_September_15_2021_-_October_4_2021.pdf"),
    ("GAS Leak 07", "https://sudokutheory.com/gas/leaks/GAS_Leak_07_-_October_5_2021_-_October_24_2021.pdf"),
    ("GAS Leak 08", "https://sudokutheory.com/gas/leaks/GAS_Leak_08_-_October_25_2021_-_November_13_2021.pdf"),
    ("GAS Leak 09", "https://sudokutheory.com/gas/leaks/GAS_Leak_09_-_November_14_2021_-_December_3_2021.pdf"),
    ("GAS Leak 10", "https://sudokutheory.com/gas/leaks/GAS_Leak_10_-_December_4_2021_-_December_23_2021.pdf"),
    ("GAS Leak 11", "https://sudokutheory.com/gas/leaks/GAS_Leak_11_-_December_24_2021_-_January_14_2022.pdf"),
    ("GAS Leak 12", "https://sudokutheory.com/gas/leaks/GAS_Leak_12_-_January_15_2022_-_February_3_2022.pdf"),
    ("GAS Leak 13", "https://sudokutheory.com/gas/leaks/GAS_Leak_13_-_February_4_2022_-_February_28_2022.pdf"),
    ("GAS Leak 14", "https://sudokutheory.com/gas/leaks/GAS_Leak_14_-_March_2022.pdf"),
    ("GAS Leak 15", "https://sudokutheory.com/gas/leaks/GAS_Leak_15_-_April_2022.pdf"),
    ("GAS Leak 16", "https://sudokutheory.com/gas/leaks/GAS_Leak_16_-_May_2022.pdf"),
    ("GAS Leak 17", "https://sudokutheory.com/gas/leaks/GAS_Leak_17_-_June_2022.pdf"),
    ("GAS Leak 18", "https://sudokutheory.com/gas/leaks/GAS_Leak_18_-_July_2022_3.pdf"),
    ("GAS Leak 19", "https://sudokutheory.com/gas/leaks/GAS_Leak_19_-_August_2022.pdf"),
    ("GAS Leak 20", "https://sudokutheory.com/gas/leaks/GAS_Leak_20_-_September_2022.pdf"),
    ("GAS Leak 21", "https://sudokutheory.com/gas/leaks/GAS_Leak_21_-_October_2022.pdf"),
    ("GAS Leak 22", "https://sudokutheory.com/gas/leaks/GAS_Leak_22_-_November_2022.pdf"),
    ("GAS Leak 23", "https://sudokutheory.com/gas/leaks/GAS_Leak_23_-_December_2022.pdf"),
    ("GAS Leak 24", "https://sudokutheory.com/gas/leaks/GAS_Leak_24_-_January_2023.pdf"),
    ("GAS Leak 25", "https://sudokutheory.com/gas/leaks/GAS_Leak_25_-_February_2023_1.pdf"),
    ("GAS Leak 26", "https://sudokutheory.com/gas/leaks/GAS_Leak_26_-_March_2023.pdf"),
    ("GAS Leak 27", "https://sudokutheory.com/gas/leaks/GAS_Leak_27_-_April_2023.pdf"),
    ("GAS Leak 28", "https://sudokutheory.com/gas/leaks/GAS_Leak_28_-_May_2023.pdf"),
    ("GAS Leak 29", "https://sudokutheory.com/gas/leaks/GAS_Leak_29_-_June_2023.pdf"),
    ("GAS Leak 30", "https://sudokutheory.com/gas/leaks/GAS_Leak_30_-_July_2023.pdf"),
    ("GAS Leak 31", "https://sudokutheory.com/gas/leaks/GAS_Leak_31_-_August_2023_2.pdf"),
    ("GAS Leak 32", "https://sudokutheory.com/gas/leaks/GAS_Leak_32_-_September_2023.pdf"),
    ("GAS Leak 33", "https://sudokutheory.com/gas/leaks/GAS_Leak_33_-_October_2023.pdf"),
    ("GAS Leak 34", "https://sudokutheory.com/gas/leaks/Gas_Leak_34_-_November_2023.pdf"),
    ("GAS Leak 35", "https://sudokutheory.com/gas/leaks/GAS_Leak_35_-_December_2023.pdf"),
    ("GAS Leak 36", "https://sudokutheory.com/gas/leaks/GAS_Leak_36_-_January_2024.pdf"),
    ("GAS Leak 37", "https://sudokutheory.com/gas/leaks/GAS_Leak_37_-_February_2024.pdf"),
    ("GAS Leak 38", "https://sudokutheory.com/gas/leaks/GAS_Leak_38_-_March_2024_1.pdf"),
    ("GAS Leak 39", "https://sudokutheory.com/gas/leaks/GAS_Leak_39_-_April_2024.pdf"),
    ("GAS Leak 40", "https://sudokutheory.com/gas/leaks/GAS_Leak_40_-_May_2024.pdf"),
    ("GAS Leak 41", "https://sudokutheory.com/gas/leaks/GAS_Leak_41_-_June_2024.pdf"),
    ("GAS Leak 42", "https://sudokutheory.com/gas/leaks/GAS_Leak_42_-_July_2024.pdf"),
    ("GAS Leak 43", "https://sudokutheory.com/gas/leaks/GAS_Leak_43_-_August_2024.pdf"),
    ("GAS Leak 44", "https://sudokutheory.com/gas/leaks/GAS_Leak_44_-_September_2024.pdf"),
    ("GAS Leak 45", "https://sudokutheory.com/gas/leaks/GAS_Leak_45_-_October_2024.pdf"),
    ("GAS Leak 46", "https://sudokutheory.com/gas/leaks/GAS_Leak_46_-_November_2024.pdf"),
    ("GAS Leak 47", "https://sudokutheory.com/gas/leaks/GAS_Leak_47_-_December_2024.pdf"),
    ("GAS Leak 48", "https://sudokutheory.com/gas/leaks/GAS_Leak_48_-_January_2025.pdf"),
    ("GAS Leak 49", "https://sudokutheory.com/gas/leaks/GAS_Leak_49_-_February_2025.pdf"),
    ("GAS Leak 50", "https://sudokutheory.com/gas/leaks/GAS_Leak_50_-_March_2025.pdf"),
    ("GAS Leak 51", "https://sudokutheory.com/gas/leaks/GAS_Leak_51_-_April_2025.pdf"),
    ("GAS Leak 52", "https://sudokutheory.com/gas/leaks/GAS_Leak_52_-_May_2025.pdf"),
    ("GAS Leak 53", "https://sudokutheory.com/gas/leaks/GAS_Leak_53_-_June_2025.pdf"),
]

URL_PATTERN = re.compile(r"https?://[^\s\"'<>)\]]+", re.IGNORECASE)

# ── Helpers ───────────────────────────────────────────────────────────────────

def get_hostname(url: str) -> str:
    try:
        return urllib.parse.urlparse(url).netloc.lower().split(":")[0]
    except Exception:
        return ""

def is_target_url(url: str) -> bool:
    hostname = get_hostname(url)
    return any(
        hostname == domain or hostname.endswith("." + domain)
        for domain in TARGET_DOMAINS
    )

def is_shortlink(url: str) -> bool:
    return get_hostname(url) in SHORTLINK_DOMAINS

def clean_url(url: str) -> str:
    return url.rstrip(".,;:!?)'\"")

def resolve_url(url: str, session: requests.Session) -> str:
    """Follow redirects on a URL and return the final destination."""
    try:
        resp = session.head(url, allow_redirects=True, timeout=10)
        return resp.url
    except Exception:
        try:
            # Some servers reject HEAD; fall back to GET with stream
            resp = session.get(url, allow_redirects=True, timeout=10, stream=True)
            resp.close()
            return resp.url
        except Exception:
            return url  # give up, return original

# ── Core extraction ───────────────────────────────────────────────────────────

def extract_links_from_pdf_bytes(
    pdf_bytes: bytes, label: str, session: requests.Session
) -> list[dict]:
    """
    Extract all target URLs from a PDF.
    - Checks embedded hyperlink annotations and plain-text URLs.
    - Resolves shortlinks (tinyurl etc.) via HEAD requests.
    Returns list of dicts: {source, original_url, resolved_url}
    """
    # Collect all candidate URLs from the PDF (deduped)
    candidates: dict[str, str] = {}  # original_url -> 'annotation' or 'text'

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page in doc:
        # Method 1: embedded hyperlink annotations
        for link in page.get_links():
            url = clean_url(link.get("uri", ""))
            if url:
                candidates[url] = "annotation"

        # Method 2: plain-text URL regex
        for match in URL_PATTERN.finditer(page.get_text("text")):
            url = clean_url(match.group(0))
            if url and url not in candidates:
                candidates[url] = "text"
    doc.close()

    results = []
    for original_url, source_method in candidates.items():
        resolved = original_url

        if is_target_url(original_url):
            resolved = original_url
        elif is_shortlink(original_url):
            resolved = resolve_url(original_url, session)
            time.sleep(0.1)  # be polite to shortlink services
        else:
            continue  # not a target and not a shortlink — skip

        if is_target_url(resolved):
            results.append({
                "source": label,
                "url": resolved,
                "original_url": original_url if resolved != original_url else "",
            })

    return results

# ── Download ──────────────────────────────────────────────────────────────────

def download_pdf(label: str, url: str, session: requests.Session) -> bytes | None:
    try:
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        return resp.content
    except requests.RequestException as e:
        print(f"\n  ✗ Failed: {e}")
        return None

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("GAS Leak PDF Link Extractor (with shortlink resolution)")
    print("=" * 55)

    all_rows: list[dict] = []
    all_urls: set[str] = set()

    session = requests.Session()
    session.headers["User-Agent"] = "Mozilla/5.0 (compatible; GAS-link-extractor/1.0)"

    total = len(PDF_LIST)
    for i, (label, url) in enumerate(PDF_LIST, start=1):
        print(f"[{i:02d}/{total}] {label} ...", end=" ", flush=True)

        pdf_bytes = download_pdf(label, url, session)
        if pdf_bytes is None:
            continue

        rows = extract_links_from_pdf_bytes(pdf_bytes, label, session)

        new_count = 0
        for row in rows:
            all_rows.append(row)
            if row["url"] not in all_urls:
                all_urls.add(row["url"])
                new_count += 1

        print(f"✓  {len(rows)} link(s) found ({new_count} new unique)")

        if i < total:
            time.sleep(0.5)

    # ── Write outputs ─────────────────────────────────────────────────────────

    csv_path = Path("gas_links.csv")
    txt_path = Path("gas_links.txt")

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["source", "url", "original_url"])
        writer.writeheader()
        writer.writerows(all_rows)

    with txt_path.open("w", encoding="utf-8") as f:
        for url in sorted(all_urls):
            f.write(url + "\n")

    print()
    print("=" * 55)
    print(f"Done!  {len(all_rows)} total links  ({len(all_urls)} unique)")
    print(f"  → {csv_path}  (all links with source PDF)")
    print(f"  → {txt_path}  (unique links, sorted)")

if __name__ == "__main__":
    main()
