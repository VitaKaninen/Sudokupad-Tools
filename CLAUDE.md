# SudokuPad – DarkReader Fix

## Project goal
TamperMonkey userscript that fixes DarkReader / dark-theme visual issues on sudokupad.app.

## File
`sudokupad-darkreader-fix.user.js` — single-file userscript, tested on Chrome + TamperMonkey.

## Standing instructions

### Commit + push after every edit
After every version bump, immediately:
1. `git add sudokupad-darkreader-fix.user.js`
2. `git commit -m "vX.Y.Z: <short description>"`
3. `git push`

Do this automatically — do not ask for confirmation.

### Version bumps
Bump `@version` in the `==UserScript==` header for every change, using semver minor increments (2.85.0 → 2.86.0, etc.).

## Architecture notes
See memory files for detailed notes on DarkReader mechanics, script structure, and testing setup.
