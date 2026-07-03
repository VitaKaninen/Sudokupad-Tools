#!/usr/bin/env python3
"""PostToolUse hook: enforce that a userscript's header @version matches its
SCRIPT_VERSION constant.

Why: the header @version drives cross-machine update propagation, and the
SCRIPT_VERSION constant drives window.spdrVersion (the only reliable "which
build is live" signal in-browser). They are supposed to be identical, but have
silently drifted before (header advanced while the constant stuck). This turns
that advisory CLAUDE.md rule into deterministic enforcement.

Behaviour: fires after Edit/Write/MultiEdit. If the edited file is a *.user.js
that contains BOTH an `// @version` header and a `SCRIPT_VERSION = '...'`
constant, and they disagree, it exits 2 with an explanatory message on stderr
(which Claude Code feeds back to Claude so it fixes the mismatch). In every
other case — different file, only one marker present, parse failure, anything
unexpected — it exits 0 and stays out of the way. Fail-open by design: a broken
hook must never block ordinary editing.
"""

import sys
import re
import json


def main():
    # Read the PostToolUse payload from stdin. Anything malformed -> pass.
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    file_path = tool_input.get("file_path") or ""
    if not file_path.endswith(".user.js"):
        return 0

    try:
        with open(file_path, "r", encoding="utf-8") as fh:
            text = fh.read()
    except Exception:
        return 0

    # Header version: a userscript metadata line like `// @version 3.16.4`
    header = re.search(r"^//\s*@version\s+(\S+)", text, re.MULTILINE)
    # Constant: `var SCRIPT_VERSION = '3.16.4';` (single or double quotes)
    const = re.search(r"SCRIPT_VERSION\s*=\s*['\"]([^'\"]+)['\"]", text)

    # Only enforce when BOTH markers exist; otherwise this file isn't in scope.
    if not (header and const):
        return 0

    h, c = header.group(1), const.group(1)
    if h == c:
        return 0

    name = file_path.replace("\\", "/").rsplit("/", 1)[-1]
    sys.stderr.write(
        "VERSION MISMATCH in {name}: header @version is {h} but the "
        "SCRIPT_VERSION constant is {c}. These MUST be identical "
        "(@version drives update propagation; SCRIPT_VERSION drives "
        "window.spdrVersion). Set both to the same value before continuing.\n"
        .format(name=name, h=h, c=c)
    )
    return 2


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        # Absolute last resort: never let an unexpected error block an edit.
        sys.exit(0)
