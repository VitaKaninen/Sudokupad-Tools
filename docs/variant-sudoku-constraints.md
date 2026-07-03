# Variant Sudoku Constraint Types

**Region / topology**
Classic, Diagonal / Sudoku X, Argyle, Jigsaw / Irregular, Mystery / Anti-Jigsaw, Windoku / Hyper, NRC, Extra Region, Disjoint Groups, Clone / Copy, Copycat, Toroidal / Wraparound, Box-placement, Non-9×9 sizes, Multi-grid (Samurai etc.)

**Clue-cell types**
Givens, Pencilmark givens, Even / Odd cells, High / Low cells, Quadruple, Quadruple-X / corner clues

**Local adjacency**
Kropki white dot, Kropki black dot, Numbered difference dots, Numbered ratio dots / Anti-ratio, XV, Labelled sums, Consecutive / Touchy, Nonconsecutive, Anti-Ratio (global), Greater-Than / Inequality / Futoshiki, Battenburg, Anti-Battenburg

**Lines**
Thermometer, Slow Thermometer, Renban, Anti-Renban, Nabner, German Whispers, Dutch Whispers, Whisper (parametric), Palindrome, Region Sum Line, Sum Line, Zipper Line, Between Line, Lockout Line, Parity Line, Entropic Line, Modular Line, Same Difference Line, N-Lines, Split Pea Line, Pathway, Ten Lines, Average / Mean lines, Indexing lines

**Cages**
Killer cage, Killer (repeats allowed), No-total / unknown-sum cages, Product cage, Difference / average cages

**Arrow / sum-pointer**
Arrow, Multi-cell circle (pill / obround), Double Arrow, Average arrow

**Outside clues**
Little Killer, Sandwich, Mysterious / unknown-crust Sandwich, X-Sums, Skyscraper, Outside / Frame, Frame Sums / Outside-2, Numbered Rooms, Doppelblock, Rossini

**Chess / movement**
Anti-Knight, Anti-King, Anti-Queen / Queens, Anti-leapers (Giraffe etc.), Disjoint Groups

**Single-cell / marker**
Counting Circles, Min / Max cells, Fortress, Magic Square, Mean Mini

**Dynamic / modifier**
Doublers, Negators, Modifier Cells, S-Cells, Schrödinger cells, Indexing (159 etc.)

**Overlay / pencil-puzzle hybrids**
Fog of War, Yin-Yang, Cave, Loop / Cellpath, Spiral Galaxies, Other pencil-puzzle overlays

**Negative / meta**
Negative constraint, Liar / Antithesis, Ambiguous / Multitask / Incomplete clues, Unknown-parameter meta-constraints, Ascending / starter conditions


# Variant Sudoku Constraint Types — Comprehensive Reference for the above terms

Organized by functional category, mirroring how the f-puzzles / SudokuPad constraint
menus and the CTC Catalogue tag set group things. In all cases "normal sudoku rules"
(1–N once per row, column, region) are assumed to still apply unless the variant
explicitly removes them.

**Uncertainty flags:** rules I am not fully confident of the exact definition for are
marked **[rule uncertain]**. The community invents new line/cell types faster than any
list can track, and several catalogue tags (e.g. "N-Lines", "Pathway", "Split Pea Lines")
are setter-specific without a single canonical published definition.

---

## 1. Region / topology variants (what counts as a "house")

- **Classic** — rows, columns, and the nine 3×3 boxes each hold 1–9 once.
- **Diagonal / Sudoku X / X-Sudoku** — one or both main diagonals also hold 1–9 once.
- **Argyle** — several marked diagonals (a diamond/argyle lattice) may not repeat a digit. **[exact diagonal set varies by setter]**
- **Jigsaw / Irregular / Squiggly / Geometry** — the nine regions are irregular shapes instead of 3×3 boxes.
- **Mystery / Anti-Jigsaw / Region-Construction** — regions are not given and must be deduced from other constraints.
- **Windoku / Hyper** — four extra shaded 3×3 regions (window panes) also hold 1–9.
- **NRC** — Dutch variant: four extra bold-bordered 3×3 regions in fixed offset positions.
- **Extra Region(s)** — one or more arbitrarily marked extra regions of N cells holding 1–N.
- **Disjoint Groups / Disjoint Sets** — cells occupying the same relative position within each box form a group that must hold 1–9.
- **Clone / Copy** — two or more marked regions contain the identical arrangement of digits.
- **Copycat** — a marked shape is reproduced (sometimes translated/rotated) elsewhere. **[transform rules vary]**
- **Toroidal / Wraparound** — chess/line constraints wrap across grid edges as if the grid were a torus.
- **Box-placement (Battleship-box / "Seven")** — the nine boxes must be located within a larger (e.g. 11×11) grid; cells outside any box are ignored.
- **Non-9×9 sizes** — 4×4, 6×6, 8×8, 16×16 (hexadoku), 25×25, and irregular sizes; rules scale with the digit set.
- **Multi-grid** — Samurai (5 overlapping grids), Sohei, Gattai, Windmill, twodoku/triple, "linked" puzzles sharing outside clues. Overlapping cells satisfy both grids.

---

## 2. Clue-cell / given-cell types

- **Givens** — standard fixed digits.
- **Pencilmark givens** — a cell is restricted to a stated candidate subset.
- **Even / Odd (parity) cells** — a shaded cell must contain an even (or odd) digit.
- **High / Low cells** — a shaded cell must be high (6–9) or low (1–4); 5 handling varies. **[band definition varies]**
- **Quadruple** — a circle on a 4-cell junction lists digits that must all appear among those four cells.
- **Quadruple-X / corner clues** — sum or other property of the four surrounding cells.

---

## 3. Local adjacency constraints (between neighboring cells)

- **Kropki — white dot** — the two cells differ by 1 (consecutive).
- **Kropki — black dot** — the two cells are in ratio 1:2.
- **Numbered difference dots** — a labelled dot gives the exact difference.
- **Numbered ratio dots / Anti-ratio** — a labelled dot gives the ratio; anti-ratio forbids a stated ratio.
- **XV** — an X between cells means they sum to 10; a V means they sum to 5.
- **XV-X / labelled sums** — other labelled pairwise sums.
- **Consecutive (Touchy)** — all orthogonally adjacent consecutive pairs are marked (with negative constraint, unmarked = not consecutive).
- **Nonconsecutive (global)** — no two orthogonally adjacent cells may be consecutive.
- **Anti-Ratio / Non-ratio (global)** — no two orthogonal neighbors may be in 1:2 ratio.
- **Greater-Than / Inequality / Futoshiki** — an inequality sign on an edge shows which neighbor is larger.
- **Battenburg** — a 2×2 marker requires the four cells to alternate parity (checkerboard odd/even) around it.
- **Anti-Battenburg** — the four cells around the marker may *not* form a parity checkerboard.

---

## 4. Line constraints (the largest and fastest-growing family)

- **Thermometer** — digits strictly increase from the bulb.
- **Slow Thermometer** — digits never decrease from the bulb (≥ each step).
- **Renban** — digits form a set of consecutive non-repeating digits in any order.
- **Anti-Renban** — the line's digits do **not** form a consecutive set. **[some setters require a "gap"; rule uncertain]**
- **Nabner** — no two digits on the line are equal or consecutive with each other (anywhere on the line).
- **German Whispers** — adjacent digits differ by at least 5.
- **Dutch Whispers** — adjacent digits differ by at least 4.
- **Whisper (parametric)** — adjacent digits differ by at least a stated value.
- **Palindrome** — the line reads identically in both directions.
- **Region Sum Line** — the line's digits sum to the same total within each box segment it crosses.
- **Sum Line** — segment sums along the line are equal (the general/region-sum family). **[catalogue lists "Sum Lines" separately from "Region Sum Lines"; boundary varies]**
- **Zipper Line** — digits equidistant from the line's center sum to a constant (the center cell's value, or a stated value).
- **Between Line** — interior digits fall strictly between the two endpoint (circle) values.
- **Lockout Line** — interior digits lie strictly outside the range of the two diamond endpoints, which must themselves differ by at least 4.
- **Parity Line** — digits alternate odd/even along the line.
- **Entropic Line** — every three consecutive cells contain one low (1–3), one medium (4–6), and one high (7–9) digit.
- **Modular Line** — every three consecutive cells contain one digit from each residue class mod 3 (e.g. {1,4,7}/{2,5,8}/{3,6,9}).
- **Same Difference Line** — consecutive pairs along the line all share an equal difference. **[rule uncertain — may apply per-pair vs. whole line]**
- **N-Lines** — catalogued constraint; **[no single canonical definition I'm confident of — verify per puzzle]**.
- **Split Pea Line** — setter-specific line. **[rule uncertain]**
- **Pathway** — catalogued line/region constraint. **[rule uncertain]**
- **Ten Lines / multiple lines** — adjacent pairs (or segments) sum to a multiple of 10. **[verify per puzzle]**
- **Average / Mean lines** — a marked cell equals the average of the others. **[rule uncertain]**
- **Indexing lines** — line encodes positional/indexing relationships. **[setter-specific]**

> Note on whispers/renban symmetry: a whisper or renban line alone never forces a unique
> solution, because mapping every digit X → 10−X preserves both — useful for break-in reasoning.

---

## 5. Cage constraints

- **Killer cage** — digits sum to the cage total and do not repeat within the cage.
- **Killer (repeats allowed)** — sum given but repeats permitted (rarer).
- **No-total / unknown-sum cages** — cages with no printed total; the value is deduced (a meta-constraint).
- **Product cage** — digits multiply to the stated value. **[less standardized]**
- **Difference / average cages** — cage property is a difference or average rather than a sum. **[setter-specific]**

---

## 6. Arrow / sum-pointer constraints

- **Arrow** — digits along the shaft sum to the digit in the attached circle.
- **Multi-cell circle (pill / obround)** — the circle holds a 2- (or 3-) digit number read along it, which the shaft sums to.
- **Double Arrow** — the two endpoint circles sum to the total of the digits between them.
- **Average arrow / other pointer variants** — **[setter-specific]**.

---

## 7. Outside-the-grid clues

- **Little Killer** — digits along the indicated diagonal sum to the clue (repeats allowed).
- **Sandwich** — sum of digits between the 1 and the 9 (or between two stated "crust" digits) in that row/column.
- **Mysterious / unknown-crust Sandwich** — crust digits are not 1/9 and must be deduced. **[verify per puzzle]**
- **X-Sums** — the first X cells (X = the nearest digit) sum to the clue.
- **Skyscraper** — the clue counts how many digits are "visible" as increasing skyscrapers from that side.
- **Outside / Frame** — the clue lists digits that must appear within the first few cells.
- **Frame Sums / Outside-2** — sum of (or placement within) the first two cells.
- **Numbered Rooms** — the clue equals the digit found in the position indexed by the first cell's digit.
- **Doppelblock** — two cells per row/column are "blocked"; the clue is the sum of digits between them.
- **Rossini** — an outside arrow shows the order/inequality direction of the first three cells. **[verify per puzzle]**

---

## 8. Chess / movement ("anti-") constraints

- **Anti-Knight** — cells a knight's move apart may not hold the same digit.
- **Anti-King** — cells a king's move (diagonal touch) apart may not hold the same digit.
- **Anti-Queen / Queens** — a chosen digit (often 8 or 9) acts as a queen; no two of it share a queen line. **[which digit varies]**
- **Other anti-leapers** — Anti-Giraffe (1,4), Anti-(1,3)/camel, etc., generalizing the knight rule. **[niche]**
- **Disjoint Groups** — (also listed under regions) a chess-like positional house constraint.

---

## 9. Single-cell / marker constraints

- **Counting Circles** — any digit in a circle equals the number of circles that contain that digit.
- **Min / Max cells** — a marked cell is strictly less / greater than all its orthogonal neighbors.
- **Fortress** — shaded cells are greater than each orthogonal neighbor.
- **Magic Square** — a marked 3×3 area forms a magic square (all rows/cols/diagonals equal sum).
- **Mean Mini / "Mean"** — a marked cell equals the mean of stated neighbors. **[rule uncertain]**

---

## 10. Dynamic / digit-modifier constraints (value ≠ digit)

- **Doublers** — one marked cell per region (or row/col) counts as twice its digit for sums and uniqueness handling. **[scope varies]**
- **Negators** — one marked cell counts as the negative of its digit.
- **Modifier Cells** — cells carry +/× modifiers applied to their digit. **[setter-specific]**
- **S-Cells** — catalogued modifier type. **[rule uncertain]**
- **Schrödinger cells** — a cell holds two digits simultaneously (both count for their houses).
- **Indexing (e.g. 159 / column- or row-indexing)** — the digit in a designated column points to where a value sits in its row (positional self-reference).

---

## 11. Overlay / pencil-puzzle hybrids (a second puzzle layered on the grid)

- **Fog of War** — the grid is hidden; cells reveal as correct digits are placed.
- **Yin-Yang** — every cell is one of two colors; each color is orthogonally connected and no 2×2 is monochrome. Digits then keyed to color.
- **Cave** — a connected "cave" / wall shading constraint drives digit logic.
- **Loop / Cellpath / Pathway loop** — a single non-self-touching loop through cells.
- **Spiral Galaxies** — 180°-rotationally-symmetric galaxy regions overlaid on the grid.
- **Other pencil-puzzle overlays** — Star Battle, Nurikabe, Fillomino, Aquarium, Norinori, Tapa, Sashigane, etc., used as the shading layer with digits keyed to the shape solution.

---

## 12. Negative constraints & meta-constraints (about the clues themselves)

- **Negative constraint** — every instance of a clue type is given, so absence of a marker is itself information (e.g. all kropki dots shown, all XV pairs shown).
- **Antithesis / Liar** — exactly one clue (or one per row, etc.) is false and must be identified.
- **Ambiguous / Multitask / Incomplete clues** — a marker's type is not stated and must be deduced (it could be any of several constraint types).
- **Unknown-parameter meta-constraints** — a cage sum, a line's identity (palindrome vs. renban), or similar is left undetermined and solved for.
- **Ascending / starter conditions** — global ordering or seed conditions catalogued as their own tags (e.g. "Ascending Starters"). **[setter-specific]**

---

## Practical notes for corpus tagging

- Many published puzzles combine 3–6 of these, so single-tag classification will miss puzzles; multi-tag (as the CTC Catalogue does) maps better to reality.
- The line family (§4), outside-clue family (§7), and modifier family (§10) are where new
  inventions appear most often — expect to add rows there over time.
- For the flagged **[rule uncertain]** items, pull the exact rule text from the specific
  puzzle's rules string rather than trusting a generic definition; setters frequently reuse
  a name with a tweaked rule.
