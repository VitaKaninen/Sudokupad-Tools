# Cue recall vs catalog tags

Catalog tags are dictionary-derived and **unverified** -- this is a triage
worklist, not a bug list. Sort each row into *real cue gap* /
*correctly-not-ours* / *catalog tag noise*.

## german whisper  (`WHISPER_CUE_RE` vs tag `german_whisper`)
recall 99.0%  -  504 tagged, 499 hit, 5 missed, 61 false-positive

### MISSED (tagged, cue silent)

- [tw3nh024dy](https://sudokupad.app/tw3nh024dy) `fpuz` **Whose line is it anyways?** - whose line is it anyways? normal sudoku rules apply. on top of that:  all the lines in the grid are either: 1. renban lines (a
- [j99cp5qm7t](https://sudokupad.app/j99cp5qm7t) `fpuz` **Willkommen im Palindrom** - ...rules apply line is german palindrome where each consectuive number on the line is at least five apart and the numbers on the line are the s
- [f3FQJG6rbq](https://sudokupad.app/f3FQJG6rbq) `other` **Potpourri** - ...  digits on a green line must differ from their neighbours on the line by at least 5.  digits on a purple line must form a set of consecutiv
- [NDjdjJp2t2](https://sudokupad.app/NDjdjJp2t2) `other` **Oct 15, 2021: Shamrock** - ... apply. along green lines, digits must differ from their neighbors on the line by at least 5.
- [dfqhpy0fvc](https://sudokupad.app/dfqhpy0fvc) `sxsm` **Sprinkles Ice Cream** - ...rules apply. purple lines contain a set of consecutive digits in any order. adjacent digits on a green line must be at least 5 apart. adjace

### FALSE POSITIVE (cue fired, no tag)

- [12io305up4](https://sudokupad.app/12io305up4) `fpuz` **May 29, 2025: Countup** - ...es apply. each gray line contains an arithmetic sequence of digits, in either increasing or decreasing order. (in an arithmetic sequence, ev
- [9ecadg11io](https://sudokupad.app/9ecadg11io) `fpuz` **Nala's Toy Battle** - ... renban or they are german whisper. each line must be determined individually.  circle = odd. and there is fog
- [mhve34qn8g](https://sudokupad.app/mhve34qn8g) `fpuz` **November 10, 2022: Maximin** - november 10, 2022: maximin normal sudoku rules apply.   clues outside of the grid give the difference of the largest and
- [48jp7phsoy](https://sudokupad.app/48jp7phsoy) `other` **Think inside the box** - ...igits along a green line have a difference of at least five. box borders divide a blue line into segments with the same sum. digits on the p
- [pqttdq9MbQ](https://sudokupad.app/pqttdq9MbQ) `other` **Molino de huevos** - ...nt cells on a green line must contain one snake cell and one egg cell and these cells' digits must differ in value by at least 5. if a circl
- [r2j26yf2s3](https://sudokupad.app/r2j26yf2s3) `other` **Kaiserliche Marine 5x5** - ... by ship segments.  german fleet: all ships are german whisper lines. german whispers lines: adjacent digits along the line must have a diff
- [9R8DNm8dq6](https://sudokupad.app/9R8DNm8dq6) `other` **Buffet** - ... least two regions; german whispers (green/w): adjacent digits along a german whispers line differ by at least 5; modular lines (yellow/m): 
- [BmMjB4Dt62](https://sudokupad.app/BmMjB4Dt62) `other` **German Whisper Pentominoes** - german whisper pentominoes normal sudoku rules apply. orthogonally adjacent digits within a cage must differ by at least
- [mFgHtTDMDg](https://sudokupad.app/mFgHtTDMDg) `other` **Zoom - Layer 1** - ...hogonal neighbours. german whispers: adjacent digits along the marked lines have a difference of at least 2.
- [Mgf82DnnBH](https://sudokupad.app/Mgf82DnnBH) `other` **German Whisper Cages** - german whisper cages normal sudoku rules apply. in cages, digits cannot repeat and sum to the cage total where the cage 
- [Q3NL4tDB7p](https://sudokupad.app/Q3NL4tDB7p) `other` **Hopscotch (Remix)** - hopscotch (remix) normal sudoku rules apply. every 3x3 box contains one hidden 2x2 region called a whisper square. in a 
- [00tjfy70pd](https://sudokupad.app/00tjfy70pd) `sxsm` **Another World** - ...d digit.  sequence: lines contain digits in order with a constant difference, like 4-4-4, 5-6-7 or 9-5-1.  x-sums: clues at the edge of the 
- [3blhorinlx](https://sudokupad.app/3blhorinlx) `sxsm` **MOM DAY** - ...circle. on the pink line there must be a set of non-repeating consecutive digits in any order. adjacent digits on a green line must have a d
- [3peflzyncd](https://sudokupad.app/3peflzyncd) `sxsm` **The Answer to the Ultimate Question (or The Second Best-Kept Secret)** - ...along a pink 𝐑𝐄𝐍𝐁𝐀𝐍 line form a set of consecutive, non-repeating values in any order. cells along a green 𝐆𝐄𝐑𝐌𝐀𝐍 𝐖𝐇𝐈𝐒𝐏𝐄𝐑 line must differ i
- [3pev731294](https://sudokupad.app/3pev731294) `sxsm` **RAT RUN 23: Notable Differences** - rat run 23: notable differences normal sudoku rules apply.  aim of experiment: finkz and phinx must both reach the cupca
- [420917reil](https://sudokupad.app/420917reil) `sxsm` **German Indeuxers** - german indeuxers normal sudoku rules apply.  cells separated by an "x" sum to ten.  cells separated by a white dot are c
- [5c6uuvchca](https://sudokupad.app/5c6uuvchca) `sxsm` **21** - ...its along the green lines have a difference of at least five. the clues outside the grid show the sum of the first x digits from that direct
- [6gv40dsdo2](https://sudokupad.app/6gv40dsdo2) `sxsm` **Magic Eggs** - ...igits along a green line have a difference of at least five. digits along a purple line are a set of consecutive digits in any order with no
- [7udzz2bpg8](https://sudokupad.app/7udzz2bpg8) `sxsm` **Counting and whispering** - counting and whispering normal sudoku rules apply. digits along an arrow sum to the digit in its black circle. digits ma
- [8elcqgk9jm](https://sudokupad.app/8elcqgk9jm) `sxsm` **Squeeze Play** - ...y.  along the green line, adjacent digits must differ by at least five.  the clues outside the grid are sandwich sums: each gives the sum of
- [9kcdw4kdjl](https://sudokupad.app/9kcdw4kdjl) `sxsm` **Tee Time** - ...igits along a green line have a difference of at least five. box borders divide a blue line into segments with the same sum. a white dot joi
- [9os1agpdp7](https://sudokupad.app/9os1agpdp7) `sxsm` **German Beetles** - german beetles - normal sudoku rules apply. - each digit along a green line differs in value by at least five from its n
- [9qx3iprv0x](https://sudokupad.app/9qx3iprv0x) `sxsm` **RAT RUN 37: Fruitful** - rat run 37: fruitful fill the grid with the digits 1-9, so that in each row and column, one of the digits 1-9 is missing
- [ceyzcgb9os](https://sudokupad.app/ceyzcgb9os) `sxsm` **RAT RUN: One Year Earlier** - rat run: one year earlier for the final preliminary 'free-roam' trial, the nine shortlisted rats were placed in a 9x9 sp
- [dpsvou0v90](https://sudokupad.app/dpsvou0v90) `sxsm` **5 Pickles and a Dream** - ...d irregular region. german whispers: adjacent digits on a green line differ by at least 3. less than v: if two digits are either side of a v
- [gcme2530d6](https://sudokupad.app/gcme2530d6) `sxsm` **Colour Coordinated Sums** - colour coordinated sums normal sudoku rules apply.  the two digits on an arrow give the coordinates of a particular targ
- [hypzc2xwbi](https://sudokupad.app/hypzc2xwbi) `sxsm` **RAT RUN 18: Mirror Maze** - rat run 18: mirror maze normal sudoku rules apply.  aim of experiment: finkz the rat must reach the cupcake by finding a
- [iovwq0jc5n](https://sudokupad.app/iovwq0jc5n) `sxsm` **Exclusive Lines** - ...he lines can now be german whisper lines (adjacent digits differ by at least 5)  checkpoint 2: additionally, the lines can now be parity lin
- [j0e1hqfsp4](https://sudokupad.app/j0e1hqfsp4) `sxsm` **Stay in Your Box** - ...s apply.  invisible lines: - every box contains an invisible 'index line' whose route must be determined. - the index lines are all 9 cells 
- [j22idv1qhe](https://sudokupad.app/j22idv1qhe) `sxsm` **Sudokulike (Dynamic Fog Edition)** - ...backwards. 1->2->3: german whisper: two cells connected by a german whisper path must have a difference of at least 5. 1->2->3->4: region su
- [j5947yd09n](https://sudokupad.app/j5947yd09n) `sxsm` **Uniqueness, with a Nudge** - ...ains the value 4.   german whispers: if two cells are joined by a green line, the values must differ by at least 5.  white dots: cell values
- [james-sinclair/double-entendre](https://sudokupad.app/james-sinclair/double-entendre) `sxsm` **Double Entendre** - ... with the same sum. german whispers: along green lines, values differ from their neighbors by at least 5. renban lines: purple lines contain
- [james-sinclair/underling](https://sudokupad.app/james-sinclair/underling?setting-arrowsabovelines=1) `sxsm` **Underling** - ...wed by other rules. german whispers: along the green line, digits differ from their neighbors by at least 5. digits in cells with a shaded c
- [jaw9z4nws6](https://sudokupad.app/jaw9z4nws6) `sxsm` **Web Design** - ... away in a straight line (horizontally, vertically or diagonally.) any further and the thread will break! • two silky threads may not cross 
- [jbliq30p6u](https://sudokupad.app/jbliq30p6u) `sxsm` **Roots in the Fog** - ...ircle.  along green lines, neighboring values differ by at least 5. on each purple line, the set of values consists of consecutive integers 
- [jewe3tzhy9](https://sudokupad.app/jewe3tzhy9) `sxsm` **RAT RUN 36: Alternating Currant** - ...rm a valid 'zipper' line, with finkz and phinx at the ends and the cupcake cell in the middle.
- [jm86sbi0bb](https://sudokupad.app/jm86sbi0bb) `sxsm` **Fillomino Whispers** - fillomino whispers 𝗙𝗶𝗹𝗹𝗼𝗺𝗶𝗻𝗼. divide the grid into regions of orthogonally connected cells. regions can be upto 9 cells 
- [k39j633cdo](https://sudokupad.app/k39j633cdo) `sxsm` **Re-framed** - ...t digits on a green german whisper line must differ by at least 5. a skunkworks collaboration with nordy and riffclown.
- [k4g3ubb8qe](https://sudokupad.app/k4g3ubb8qe) `sxsm` **Yin-Yang-Yong** - ...fferent regions.  • german whisper (green): adjacent digits on a green line have a difference of at least 5.  • nabner (yellow): no two digi
- [k4zgmts5h9](https://sudokupad.app/k4zgmts5h9) `sxsm` **RAT RUN: Hit and Miss** - rat run: hit and miss normal sudoku rules apply.  aim of experiment: finkz and phinx must both reach the cupcakes by fin
- [m9qm0m5qj0](https://sudokupad.app/m9qm0m5qj0) `sxsm` **RAT RUN 22: Copyrat** - rat run 22: copyrat normal sudoku rules apply.  aim of experiment: finkz and phinx must both reach cupcakes by finding a
- [mlt4l6zcak](https://sudokupad.app/mlt4l6zcak) `sxsm` **Colour Coordinated Differences** - colour coordinated differences normal sudoku rules apply.  the two digits on an arrow give the coordinates of a particul
- [o2u3rfkurb](https://sudokupad.app/o2u3rfkurb) `sxsm` **RAT RUN 32: Veracity** - rat run 32: veracity normal sudoku rules apply.  aim of experiment: finkz and phinx must both reach cupcakes by finding 
- [pdywima58n](https://sudokupad.app/pdywima58n) `sxsm` **FEEDING FRIENDSy: It's Not Pea-sy Being Green** - ...(marked with dotted lines). ______________________________  #friendshipgoals: marty! croakz the frog has noticed a delicious fly whirring ar
- [philip-newman/2026-03-18-easy-as-17-42-67-v2](https://sudokupad.app/philip-newman/2026-03-18-easy-as-17-42-67-v2) `sxsm` **2026-03-18: Easy As 17-42-67** - ...les apply. sequence lines: digits along lines must form an arithmetic sequence: each pair of adjacent digits on the same line differ by the 
- [philip-newman/20260530-that-feeling-won](https://sudokupad.app/philip-newman/20260530-that-feeling-won) `sxsm` **2026-05-30: That Feeling Won** - ...ot repeat. sequence lines: digits along grey lines must form an arithmetic sequence: each pair of adjacent digits on the same line differ by
- [pja7uaxak9](https://sudokupad.app/pja7uaxak9) `sxsm` **RAT RUN 39: Together Apart** - rat run 39: together apart normal sudoku rules apply.   aim of experiment: finkz and phinx must both reach different cup
- [pz0m04p9ag](https://sudokupad.app/pz0m04p9ag) `sxsm` **Icy Escape** - icy escape normal sudoku rules apply.  you must find your way out of the icy cave. your path begins and ends at the corn
- [qcccbe8xug](https://sudokupad.app/qcccbe8xug) `sxsm` **5's live in Foggy Flats** - ...t digits along each german whisper line must have a difference of at least 5. digits along each thermometer must increase starting from the 
- [rfb5h314eq](https://sudokupad.app/rfb5h314eq) `sxsm` **Counting on Quiet Knights** - counting on quiet knights normal sudoku rules apply. a digit in a circle indicates how many times that digit appears in 
- [s9cv8zfe81](https://sudokupad.app/s9cv8zfe81) `sxsm` **Fives Sudoku** - fives sudoku normal sudoku rules apply. digits in cells separated by a 5 must have either a sum or difference of 5. all 
- [twqc1a8ybe](https://sudokupad.app/twqc1a8ybe) `sxsm` **Let's see where this goes** - let's see where this goes fill each row, column and box with the same 8 distinct digits from 1 to 9. the solver has to f
- [udyn0tghcs](https://sudokupad.app/udyn0tghcs) `sxsm` **RAT RUN 34: On Reflection** - ...ed with a thin pink line).
- [up5nrki10o](https://sudokupad.app/up5nrki10o) `sxsm` **RAT RUN 38: Synchronicity** - rat run 38: synchronicity normal sudoku rules apply.  aim of experiment: finkz and phinx must both reach different cupca
- [wqqeaa26jf](https://sudokupad.app/wqqeaa26jf) `sxsm` **The Whispering Forest** - ...column and region.  german whispers: adjacent digits on a green vine line must have a difference of at least 3.  knight's tour: sir doku mov
- [wxhrpva2lr](https://sudokupad.app/wxhrpva2lr) `sxsm` **RAT RUN 12: Visiting Order** - ...ct path into 'index lines'; in any box, the nth cell visited by finkz is called 'position n'. (so, for example, in box 7, r9c2 is position 1
- [xpkfq77yk0](https://sudokupad.app/xpkfq77yk0) `sxsm` **Fillominosaurus** - ...ins). a thick black line is a region border. adjacent digits on a dark green line differ by exactly 5. digits separated by a white dot are c
- [ydgn4bxilt](https://sudokupad.app/ydgn4bxilt) `sxsm` **RAT RUN 28: Hypothesis** - rat run 28: hypothesis normal sudoku rules apply.  aim of experiment: finkz and phinx must both reach different cupcakes
- [ydykj28b2l](https://sudokupad.app/ydykj28b2l) `sxsm` **Kurodoku** - kurodoku chaos construction: place the digits from 1 to 9 exactly once in every row, column, and region. regions consist
- [zsk8n4tjvw](https://sudokupad.app/zsk8n4tjvw) `sxsm` **RAT RUN 13: Triskaidekaphilia** - rat run 13: triskaidekaphilia normal sudoku rules apply.  aim of experiment: finkz the rat must reach the cupcake by fin
- [4tc1g21b3x](https://sudokupad.app/4tc1g21b3x) `sxsm` **Pentomino Islands** - pentomino islands normal sudoku rules apply. adjacent digits on any pentomino must differ in value by at least 5.

## renban  (`RENBAN_CUE_RE` vs tag `renban`)
recall 94.4%  -  428 tagged, 404 hit, 24 missed, 36 false-positive

### MISSED (tagged, cue silent)

- [james-sinclair/unveil](https://sudokupad.app/james-sinclair/unveil) `fpuz` **Unveil** - ...corner. each purple line contains a pair of consecutive digits. digits in cells separated by a v sum to 5. digits in cells separated by an x
- [luzxwziiq3](https://sudokupad.app/luzxwziiq3) `fpuz` **Entangled** - ...e cells on a purple line contain a set of non-repeating consecutive digits, but not necessarily in order.
- [5fefkfdd7i](https://sudokupad.app/5fefkfdd7i) `fpuz` **May 1, 2026: The Missing Digit** - ...es apply. each pink line contains a non-repeating set of consective digits, which may appear in any order, such as 2453. 
- [4Fj8prDdbh](https://sudokupad.app/4Fj8prDdbh) `other` **Butterfly Effect** - ...ply. digits along a line with circled ends must have values that lie between the digits in the circles on the ends of that line. the cells o
- [6JfjT3N6L2](https://sudokupad.app/6JfjT3N6L2) `other` **Soliloquy** - ...igits along a green line must differ by at least 5. digits on a purple line must form of a set of non-repeating consecutive digits. these di
- [7G22jmGTqP](https://sudokupad.app/7G22jmGTqP) `other` **Consecutive Ladder** - ...lb end. each purple line contains a set of non-repeating consecutive digits.  these digits can appear in any order.
- [bbRJNPMh6h](https://sudokupad.app/bbRJNPMh6h) `other` **First day at the gym** - ... digits on a purple line must be set of non-repeating consecutive digits. these digits can appear in any order. digits along an arrow sum to
- [D4FB6FHJm7](https://sudokupad.app/D4FB6FHJm7) `other` **The Quiet Box** - ... apply. along green lines, neighbouring digits differ by at least 5. a purple line shows a sequence of consecutive digits, not necessarily i
- [fm92h9Dn93](https://sudokupad.app/fm92h9Dn93) `other` **Hybrid** - ... rules. each purple line must contain a set of non-repeating, consecuitive digits. these digits can appear in any order.
- [Ln8JDNTH8r](https://sudokupad.app/Ln8JDNTH8r) `other` **Exclusion** - ... digits on a purple line form a non-repeating, consecutive set. these digits can appear in any order.
- [m2gNRfdF24](https://sudokupad.app/m2gNRfdF24) `other` **Ren Ban Sandwich Sudoku** - ...column. each purple line contains a set of non-repeating consecutive integers. these integers can appear in any order. an integer is any who
- [QBq6nnqHr6](https://sudokupad.app/QBq6nnqHr6) `other` **A Little Off the Top** - ... apply. each purple line contains a set of non-repeating consecutive digits.  these digits can appear in any order. neighbouring digits on a
- [qT84jPJ8b2](https://sudokupad.app/qT84jPJ8b2) `other` **Anti-Four** - ... multiple of 4. any line in the grid has a sequence of consecutive digits, not in any particular order.
- [T3ttPM3pH8](https://sudokupad.app/T3ttPM3pH8) `other` **Overlap** - ...ells along a purple line contain a non-repeating, consecutive set of digits. (these digits can appear in any order). 
- [j7qqn66P3L](https://sudokupad.app/j7qqn66P3L) `other` **Consecutive Circles Sudoku** - consecutive circles sudoku normal sudoku rules apply. each marked circle must contain a sequence of consecutive digits. 
- [1xf09aa30a](https://sudokupad.app/1xf09aa30a) `sxsm` **Lizard babies grow so fast...** - ...t digits on a green line differ by at least 5. digits on a purple line are distinct and consecutive, but may be in any order. box borders di
- [blobz/centipede](https://sudokupad.app/blobz/centipede) `sxsm` **Centipede** - centipede normal sudoku rules apply.  adjacent digits along the centipede differ by at least 5.  a digit on a mushroom i
- [blobz/offset-circles](https://sudokupad.app/blobz/offset-circles) `sxsm` **Offset Circles** - offset circles normal sudoku rules apply.  digits in black circles must appear in one of the four cells touching that ci
- [h3i7jv9pqj](https://sudokupad.app/h3i7jv9pqj) `sxsm` **For Steph** - ...arrow shape. purple lines contain consecutive digits in a random order. adjacent digits along a green line must have a difference of 5 or mo
- [jjvussx9zq](https://sudokupad.app/jjvussx9zq) `sxsm` **Brink** - ...digits along purple lines form a consecutive set. digits in cages sum to the small number printed in the corner. digits in cells separated b
- [rd6t0wcabb](https://sudokupad.app/rd6t0wcabb) `sxsm` **Simoku** - ...digits on an orange line differ by at least 4. adjacent digits on a green line differ by at least 5. the pink line contains a consecutive, n
- [xd80bvl2nu](https://sudokupad.app/xd80bvl2nu) `sxsm` **X Marks The ????** - ...s apply.     purple lines are renbens, meaning they contain a consecutive set of digits with no repeats, where the digits are not necessaril
- [zupg2dog2w](https://sudokupad.app/zupg2dog2w) `sxsm` **Taxi Rank** - taxi rank normal sudoku rules apply.  the digits along each coloured route can be read as a 6-digit 'route number', star
- [mbtq69xhsb](https://sudokupad.app/mbtq69xhsb) `sxsm` **Before You Gotta Go** - ...gits along a purple line must be continuous, but may be in any order.

### FALSE POSITIVE (cue fired, no tag)

- [9ecadg11io](https://sudokupad.app/9ecadg11io) `fpuz` **Nala's Toy Battle** - ...e. those are either renban or they are german whisper. each line must be determined individually.  circle = odd. and there is fog
- [0k1dcrcc74](https://sudokupad.app/0k1dcrcc74) `fpuz` **Big Fish** - ...hoice. ignore those renban lines, it’s not really doing anything other than make the fish. make r4c4 another shade of blue. not that one, wh
- [2q3ha7ca76](https://sudokupad.app/2q3ha7ca76) `fpuz` **July 24, 2022: Antirenban** - july 24, 2022: antirenban normal sudoku rules apply. a cage may not contain any duplicated or consecutive digits. for instance, if a 6 appe
- [oct-26-2023-run-on-renbans](https://sudokupad.app/oct-26-2023-run-on-renbans) `fpuz` **Oct. 26, 2023: Run-On Renbans** - ...t. 26, 2023: run-on renbans normal sudoku rules apply. along each line, every group of three contiguous digits must form a set of consecutiv
- [philip-newman/20231224-b1g3-crossing-the-streams-antirenban](https://sudokupad.app/philip-newman/20231224-b1g3-crossing-the-streams-antirenban) `fpuz` **2023-12-24 B1G3: Crossing the Streams** - ...ku rules apply. antirenban: digits along lines cannot repeat, and no two digits on a line can be consecutive (have a difference of 1), regar
- [philip-newman/20240916-m0nkey-m00n](https://sudokupad.app/philip-newman/20240916-m0nkey-m00n) `fpuz` **2024-09-16: M0nkey M00n** - ...ku rules apply. antirenban: digits along lines/in cages cannot repeat, and no two digits on a line/in a cage can be consecutive (have a diff
- [philip-newman/20250727-circle-gets-the-square](https://sudokupad.app/philip-newman/20250727-circle-gets-the-square) `fpuz` **2025-07-27: Circle Gets the Square** - ...ku rules apply. antirenban: digits along lines cannot repeat, and no two digits on a line can be consecutive (have a difference of 1), regar
- [56pq2tl5q6](https://sudokupad.app/56pq2tl5q6) `fpuz` **January 1, 2025: Antirenban** - ...anuary 1, 2025: antirenban normal sudoku rules apply. lines must not contain any repeated or consecutive digits. for instance, a line could 
- [4HJbTHdMfn](https://sudokupad.app/4HJbTHdMfn) `other` **Renrenbanban** - renrenbanban normal sudoku rules apply. cells separated by a knight's move (in chess) cannot contain the same digit. each c
- [9R8DNm8dq6](https://sudokupad.app/9R8DNm8dq6) `other` **Buffet** - ...pes are as follows: renban (purple/r): the digits on a renban line form a sequence of consecutive digits in any order. digits do not repeat 
- [FFhHh3HD8p](https://sudokupad.app/FFhHh3HD8p) `other` **Serial Killers** - serial killers normal sudoku rules apply.\ndigits may not repeat in a cage.\nthe totals of individual cages of the same 
- [GFR6d27hP9](https://sudokupad.app/GFR6d27hP9) `other` **Ranban Ebira** - ranban ebira normal sudoku rules apply.  digits along an arrow must sum to the digit in that arrow's circle. those digit
- [hF2gHhJb4r](https://sudokupad.app/hF2gHhJb4r) `other` **Fitting In** - fitting in normal sudoku rules apply. clues outside the grid represent the length of the largest set of consecutive digi
- [Qj9jRR9r7f](https://sudokupad.app/Qj9jRR9r7f) `other` **Region Renbanmos** - region renbanmos normal sudoku rules apply. along lines, the region sums form a consecutive ordered sequence.  for example, the
- [Tnnrj9R79p](https://sudokupad.app/Tnnrj9R79p) `other` **Kylo Ren** - .... along each purple line the cage totals form a set of consecutive numbers in any order. 
- [15rywuvxz9](https://sudokupad.app/15rywuvxz9) `sxsm` **The Composite Thread** - ...rs divide each blue line into segments. the digits on each segment of the same line must sum to the same total. (eg r2c6+r3c6=r4c7+r4c8+r4c9
- [4ecligavud](https://sudokupad.app/4ecligavud) `sxsm` **Star of Bethlehem** - ... digits on a curved line must differ by at least 4. digits on the star-shaped line must form a set of consecutive digits.
- [5or0u7cv0o](https://sudokupad.app/5or0u7cv0o) `sxsm` **The Mystery Of The Three Chameleons** - ...ave a 3 above a 9). renban lines - the values on a purple line must be a consecutive sequence (e.g. 1,2,3) in some order, with no repeats (e
- [aadq3z8j80](https://sudokupad.app/aadq3z8j80) `sxsm` **Right Twice a Day** - ...igits along a green line must differ by at least 5. each pink line contains a set of consecutive, non-repeating digits, which can appear in 
- [fx2o4cl240](https://sudokupad.app/fx2o4cl240) `sxsm` **Don't repeat yourself** - ...d) digits on a pink line form a set of consecutive digits in order. eg 123 and 321 are valid length-3 lines but 132 is not; e) digits outsid
- [iwfv5d36aw](https://sudokupad.app/iwfv5d36aw) `sxsm` **Zipper Gramophone** - ...ddle of that line.  renban lines (pink): digits on a pink 'renban line' must form a non-repeating set of consecutive digits, in any order.  
- [james-sinclair/double-entendre](https://sudokupad.app/james-sinclair/double-entendre) `sxsm` **Double Entendre** - ...bors by at least 5. renban lines: purple lines contain a non-repeating set of consecutive values in any order. values in cells separated by 
- [james-sinclair/studious](https://sudokupad.app/james-sinclair/studious) `sxsm` **Studious** - ...bors by at least 5. renban lines: purple lines contain a non-repeating set of consecutive digits in any order.  find more puzzles like this 
- [jbliq30p6u](https://sudokupad.app/jbliq30p6u) `sxsm` **Roots in the Fog** - ...ircle.  along green lines, neighboring values differ by at least 5. on each purple line, the set of values consists of consecutive integers 
- [jl4sby2gl2](https://sudokupad.app/jl4sby2gl2) `sxsm` **The one and only sum** - ...igits along a green line must differ by at least 5. neighboring digits along an orange line must differ by at least 4. a pink line contains 
- [ocw0x2hxdd](https://sudokupad.app/ocw0x2hxdd) `sxsm` **Three in the Spotlight** - ...traint (ie a single line, single dot, or single cage) must include at least one 3. three's company: every 3 must be horizontally adjacent (i
- [pc6ejr0nze](https://sudokupad.app/pc6ejr0nze) `sxsm` **Dutch Flat Mates: Pick-up Sticks** - ...d (3,6,9). • a pink renban stick must contain a set of consecutive digits, arranged in some order. • along an orange dutch whisper stick, ad
- [pnyv6sn7qm](https://sudokupad.app/pnyv6sn7qm) `sxsm` **Déjà Vu Part 1: Doublers** - ...rd region sum line, renban, nabner, thermo, kropki, xv, and quadruple rules apply, with respect to cell values.  region sum line: box border
- [q83v6obrdn](https://sudokupad.app/q83v6obrdn) `sxsm` **Full Rank Tessellation** - full rank tessellation tessellation - fill each cell (octagons and squares) with a digit from 1-9.  - cells sharing an e
- [qkmbbu7yux](https://sudokupad.app/qkmbbu7yux) `sxsm` **Lest We Forget** - ...nce of at least 5.  renban: the digits in the grey cross are from a consecutive sequence of digits.
- [r411ysr073](https://sudokupad.app/r411ysr073) `sxsm` **Foggy Fireworks** - ...igh (7,8,9) digit.  renban lines: a purple line contains a set of consecutive digits. thermometer: along a grey line, digits strictly increa
- [ydykj28b2l](https://sudokupad.app/ydykj28b2l) `sxsm` **Kurodoku** - kurodoku chaos construction: place the digits from 1 to 9 exactly once in every row, column, and region. regions consist
- [yg5hbdwc6j](https://sudokupad.app/yg5hbdwc6j) `sxsm` **Entropic Toast** - ...e like digits along renban (purple) lines. digits inside a killer cage form a set of consecutive digits in any order  -- no guessing is need
- [yjy08cqz6p](https://sudokupad.app/yjy08cqz6p) `sxsm` **∑ or μ** - ...igits on the golden line. the digits along each grey line must sum to 10. the four cells surrounding the white circle in box 6 must contain 
- [yl0n45rfll](https://sudokupad.app/yl0n45rfll) `sxsm` **Yin Yang Doubler Uniqueness** - ...d 5 (value 10) on a renban, shaded 5 can't appear anywhere else on a renban, but unshaded 5 could because it has a value of 9.  renban: valu
- [zeu960ln92](https://sudokupad.app/zeu960ln92?setting-nogrid=true) `sxsm` **Accounting Circles Tessellation** - accounting circles tessellation tessellation - fill each cell with a digit from 1-9. - cells sharing an edge can't have 

## region sum  (`REGIONSUM_CUE_RE` vs tag `region_sum`)
recall 94.5%  -  326 tagged, 308 hit, 18 missed, 41 false-positive

### MISSED (tagged, cue silent)

- [09yubsp38b](https://sudokupad.app/09yubsp38b) `fpuz` **Jörmungandr** - ...rlapping 3x3 square regions, which must be located. each region contains the digits 1-9 once each such that no digit repeats in any row or c
- [6udc6dqzii](https://sudokupad.app/6udc6dqzii) `fpuz` **Equal Color Sums** - ...ly. each continuous line segment of the same color contained in a box adds to the same value. a sum value per color. for example r4c6 = r2c7
- [NRqTD93pf7](https://sudokupad.app/NRqTD93pf7) `other` **Polygons** - ...its along an orange line have a difference of at least four. box borders break a blue line into segments with the same sum. digits inside a 
- [2hm49qMB8N](https://sudokupad.app/2hm49qMB8N) `other` **Schrödinger's Doublers** - ...he cell values on a line within a 2x3 box must be the same for each box that line passes through. eg the values of r4c2+r3c3 = the values of
- [2nqGgL8L7h](https://sudokupad.app/2nqGgL8L7h) `other` **Hangman** - ...ner. along the blue line, each line segment within a different 3x3 box must sum to the same total. clues outside the grid show the sum of th
- [fhLrBFpQFF](https://sudokupad.app/fhLrBFpQFF) `other` **Prime Time** - ...within a particular region must be the same for all of the regions the line passes through. different lines may have different sums. pairs o
- [2Q9hBtb8Dg](https://sudokupad.app/2Q9hBtb8Dg) `other` **Escalation.** - ...gonal. along a blue line, each line segment within a different 3x3 box must sum to the same total. blue lines may have different totals to o
- [bBb9qHG2gr](https://sudokupad.app/bBb9qHG2gr) `other` **The Coriolis Effect** - ...within a particular region must be the same for all of the regions the line passes through.
- [QR7MMGHpfJ](https://sudokupad.app/QR7MMGHpfJ) `other` **Parity Paradox** - ...u rules apply. each line within a 3x3 box has the same total, which is displayed in yellow in that box. (2-digit yellow totals read from lef
- [RjG3t8B9dp](https://sudokupad.app/RjG3t8B9dp) `other` **Chaotic Equality** - ... the grid into nine regions, each consisting of nine orthogonally-connected cells. each row, column and region must contain the digits 1 to 
- [zl6bvhwfmp](https://sudokupad.app/zl6bvhwfmp) `other` **May 19, 2026: Ten-Tastic** - ... digits within each region must be equal. for instance, r1c4 + r2c4 = r1c5.
- [ceyt69ga5p](https://sudokupad.app/ceyt69ga5p) `sxsm` **Decode Presented by RTX** - ... and 3x3 box.   red lines add up to 17 in each 3x3 box.  blue lines add up to 14 in each 3x3 box.   purple lines are renban lines, digits on
- [jkcqhkr4sh](https://sudokupad.app/jkcqhkr4sh?setting-nogrid=1) `sxsm` **Sudoku en rouge, jaune, bleu et noir** - ... a row or column. - regions of the same color have the same sum (white is a color). - along diagonal lines, digits increase in one direction
- [lw4yula6yt](https://sudokupad.app/lw4yula6yt) `sxsm` **Decode Presented by RTX** - ... and 3x3 box.   red lines add up to 17 in each 3x3 box.  blue lines add up to 14 in each 3x3 box.   purple lines are renban lines, digits on
- [txyhg781uz](https://sudokupad.app/txyhg781uz) `sxsm` **Slip Away** - .... digits along blue lines must sum to the same total each time it passes into a new box. digits separated by a white dot must be consecutive
- [wdzu2e0qne](https://sudokupad.app/wdzu2e0qne) `sxsm` **Six Rules Four Clues** - .... 5) along the blue line thick box boarders divide the line into segments with equal sums. when the line re-enters a box a new segment is fo
- [adkms6bibp](https://sudokupad.app/adkms6bibp) `sxsm` **Row Sum Lines** - row sum lines normal sudoku rules apply.  digits along a line sum to the same value for each row the line passes through.
- [qucvrn7k9c](https://sudokupad.app/qucvrn7k9c) `sxsm` **Stabilise** - ...gits along the blue line sum to the same total each time it enters a new box in the grid.

### FALSE POSITIVE (cue fired, no tag)

- [ykujrd1ilp](https://sudokupad.app/ykujrd1ilp) `fpuz` **The Raven** - ...within a particular region must be the same for all the regions the line passes through. different lines may have different sums. - each let
- [k4y2ak2rim](https://sudokupad.app/k4y2ak2rim) `fpuz` **Ramen** - ...se (row, column, or region), and each house contains all digits 1 through n, where n is to be determined for each house.  renban: on each pu
- [qvjh329nc0](https://sudokupad.app/qvjh329nc0) `fpuz` **Taron** - ...f a line. lines are region-subset lines: box borders divide lines into segments. if a digit appears in a segment of length n, it must appear
- [DhFTHL63t7](https://sudokupad.app/DhFTHL63t7) `other` **Galapagos** - galapagos normal sudoku rules apply. shade some cells such that all shaded cells are orthogonally connected (without cre
- [9jJDgBpLjN](https://sudokupad.app/9jJDgBpLjN) `other` **Cloaked In Nightwinds** - ...pper-left cell in a region of size x by x, where x is the digit in the circle.  digits can repeat within a region.  the digits in each regio
- [9R8DNm8dq6](https://sudokupad.app/9R8DNm8dq6) `other` **Buffet** - ...eat along a renban; region sum lines (blue/ s): the cells along a region sum line in each 3x3 box it passes through sum to the same total. r
- [hf4Jjm3H3J](https://sudokupad.app/hf4Jjm3H3J) `other` **The Song of the Serpent and the Wanderer** - ...ivide the grid into regions, each consisting of nine orthogonally connected cells. each row, column and region must contain the digits 1 to 
- [mJL2Hn6MBL](https://sudokupad.app/mJL2Hn6MBL) `other` **That's Sum Slithering** - that's sum slithering normal sudoku rules apply. a snake passes through every box exactly once. it doesn't touch itself,
- [Qj9jRR9r7f](https://sudokupad.app/Qj9jRR9r7f) `other` **Region Renbanmos** - region renbanmos normal sudoku rules apply. along lines, the region sums form a consecutive ordered sequence.  for examp
- [Td2qPdqdHj](https://sudokupad.app/Td2qPdqdHj) `other` **How Bizarre** - ...t. divide each grey line into at least two non-overlapping segments. the digits on each segment of a line sum to the same total. (different 
- [4fbMt6QrFB](https://sudokupad.app/4fbMt6QrFB) `other` **Equal Sum Lines** - equal sum lines normal sudoku rules apply. all lines have the same sum of digits. digits may repeat on lines.
- [pbj4b4j7DN](https://sudokupad.app/pbj4b4j7DN) `other` **4DoES** - 4does normal sudoku rules apply (ie place the digits 1-9, once each, in every row, column and 3x3 box.) each 3x3 box con
- [1w3s6u8q7d](https://sudokupad.app/1w3s6u8q7d) `sxsm` **Ho Ho Ho** - ...digits along a blue line must sum to the same total in each 3x3 box the line visits. adjacent digits along a red line have a difference of a
- [4yizx5451j](https://sudokupad.app/4yizx5451j) `sxsm` **Aced** - ...its along an orange line have a difference of at least four. all digits along a blue line must sum to the same total in each 3x3 box the lin
- [7exqntdae5](https://sudokupad.app/7exqntdae5) `sxsm` **Not All Who Wander Are Lost** - ...u rules apply. each line can be divided into one or more segments such that every segment in the grid sums to the same total. (for the avoid
- [817bobvnn5](https://sudokupad.app/817bobvnn5) `sxsm` **Shredded** - ...bottom). along blue lines, each segment of the line contained in a 3x3 box sums to the same total as the other segments of that line. digits
- [9qx3iprv0x](https://sudokupad.app/9qx3iprv0x) `sxsm` **RAT RUN 37: Fruitful** - rat run 37: fruitful fill the grid with the digits 1-9, so that in each row and column, one of the digits 1-9 is missing
- [ayk7228tr8](https://sudokupad.app/ayk7228tr8) `sxsm` **One Of The Two** - ...same total in every region it enters.  digits along one of the grey lines must increase from the digit in the bulb, while digits on the othe
- [etuf5ak2y4](https://sudokupad.app/etuf5ak2y4) `sxsm` **RAT RUN 8: Discontinuous** - ...(marked with dotted lines.)  aim of experiment: finkz the rat must reach the cupcake by finding a path through the maze. the path must not v
- [fi311m5b4u](https://sudokupad.app/fi311m5b4u) `sxsm` **RAT RUN 16: Schrödinger's Rat** - rat run 16: schrödinger's rat schrodinger cells: fill each row, column and box with the digits 0-9 once each. to make th
- [fjllpp2awq](https://sudokupad.app/fjllpp2awq) `sxsm` **Loopy Odysee** - loopy odysee normal sudoku rules apply. draw a one-cell-wide loop of orthogonally connected cells. the loop may touch it
- [hqa07qdm2h](https://sudokupad.app/hqa07qdm2h?setting-nogrid=true) `sxsm` **Six Hit Wonder** - ...le.  german whisper lines adjacent digits on a green line have a difference of at least 5.  entropic lines any 3 adjacent digits along a hol
- [if8eo8da5h](https://sudokupad.app/if8eo8da5h) `sxsm` **Guided Sums** - ...this line acts as a region sum line: box borders divide the line into segments with the same sum. each line must cross at least one box bord
- [iovwq0jc5n](https://sudokupad.app/iovwq0jc5n) `sxsm` **Exclusive Lines** - ...zzle, all lines are region sum lines (ie the 3x3 box borders divide the lines into segments; each segment along an individual line has the s
- [j22idv1qhe](https://sudokupad.app/j22idv1qhe) `sxsm` **Sudokulike (Dynamic Fog Edition)** - ...east 5. 1->2->3->4: region sum: box borders divided the path into segments of equal sums. 1->2->3->4->5: dutch whisper: two cells connected 
- [james-sinclair/double-entendre](https://sudokupad.app/james-sinclair/double-entendre) `sxsm` **Double Entendre** - ...e connected circle. region sum lines: box borders divide each blue line into segments with the same sum. german whispers: along green lines,
- [jl4sby2gl2](https://sudokupad.app/jl4sby2gl2) `sxsm` **The one and only sum** - ...rders dive the blue region sum line into segments with the same sum. the sum of all digits that belong to one constraint type (e.g. all digi
- [k2fdb6ghnl](https://sudokupad.app/k2fdb6ghnl) `sxsm` **obezyanka nol** - ...ery row, column and region.  shade ten cells so that there is exactly one shaded cell in each row, column and region. shaded cells cannot co
- [k4zgmts5h9](https://sudokupad.app/k4zgmts5h9) `sxsm` **RAT RUN: Hit and Miss** - rat run: hit and miss normal sudoku rules apply.  aim of experiment: finkz and phinx must both reach the cupcakes by fin
- [oj8y6yrx16](https://sudokupad.app/oj8y6yrx16?setting-foganim=1&setting-toolletter=1) `sxsm` **RAT RUN 19: Brainwaves** - rat run 19: brainwaves in this experiment, nine letters of the alphabet (to be determined) must be used to fill the grid
- [pnyv6sn7qm](https://sudokupad.app/pnyv6sn7qm) `sxsm` **Déjà Vu Part 1: Doublers** - ...its cell.  standard region sum line, renban, nabner, thermo, kropki, xv, and quadruple rules apply, with respect to cell values.  region sum
- [pyufyvwwpw](https://sudokupad.app/pyufyvwwpw) `sxsm` **Tree Squirrel** - ...ers divide the blue line into segments. each segment's total is found by summing the digits on that segment. the segment totals must increas
- [qz9m4zn7nf](https://sudokupad.app/qz9m4zn7nf) `sxsm` **Blue Arrow** - ...ide the grid into 9 regions, each consisting of 9 orthogonally connected cells. place the digits 1-9 exactly once in every row, column, and 
- [r3xtlrd6qv](https://sudokupad.app/r3xtlrd6qv) `sxsm` **Regional Differences** - regional differences normal sudoku rules apply.  box borders divide lines into segments. each sum of adjacent segments o
- [rd2kn6vy6d](https://sudokupad.app/rd2kn6vy6d) `sxsm` **Regional Heatwave** - regional heatwave normal sudoku rules apply. some of the grid is covered in fog; entering a correct digit will clear all
- [rmac5anfcn](https://sudokupad.app/rmac5anfcn) `sxsm` **How Shall We Split This?** - ...ules apply.  • each line is divided into segments at 'split points', to be discovered on certain cell edges crossed by the line. • each segm
- [tdr0ywy332](https://sudokupad.app/tdr0ywy332) `sxsm` **Global Warming** - ...it grey thermometer lines into segments. starting from the bulb, the sum of each segment must increase. additionally, within each segment, s
- [urooueeutg](https://sudokupad.app/urooueeutg) `sxsm` **Modular Zigzag** - modular zigzag normal sudoku rules apply. digits cannot repeat along the marked diagonal. every 2×2 square of cells must
- [vcncpwgckm](https://sudokupad.app/vcncpwgckm) `sxsm` **RAT RUN 14: Thermoregulation** - rat run 14: thermoregulation normal sudoku rules apply.  aim of experiment: finkz the rat must reach the cupcake by find
- [wv8l8x67dy](https://sudokupad.app/wv8l8x67dy) `sxsm` **RAT RUN 4: Borderline** - ...ath will be a valid region sum line - ie: box borders (dotted lines) will divide the path into segments which each have the same sum.
- [wxhrpva2lr](https://sudokupad.app/wxhrpva2lr) `sxsm` **RAT RUN 12: Visiting Order** - ...ct path into 'index lines'; in any box, the nth cell visited by finkz is called 'position n'. (so, for example, in box 7, r9c2 is position 1

## parity  (`PARITY_CUE_RE` vs tag `parity_line`)
recall 95.1%  -  41 tagged, 39 hit, 2 missed, 37 false-positive

### MISSED (tagged, cue silent)

- [2xq0az12ee](https://sudokupad.app/2xq0az12ee) `fpuz` **Sept. 15, 2024: Entroparity** - ...ept. 15, 2024: entroparity normal sudoku rules apply. each line contains either all odd digits, or all even digits. also, along each line, d
- [o0n73yxg22](https://sudokupad.app/o0n73yxg22) `sxsm` **Parity Fish** - parity fish normal sudoku rules apply; fill the grid with the digits 1-9 so that digits don't repeat in any row, column,

### FALSE POSITIVE (cue fired, no tag)

- [l9yuha1t36](https://sudokupad.app/l9yuha1t36) `fpuz` **10/8/23: Parity Lines Sudoku** - 10/8/23: parity lines sudoku normal sudoku rules apply. along each gray line, either all digits are odd, or all digits are even. 
- [vg889612uz](https://sudokupad.app/vg889612uz) `fpuz` **May 27, 2022: Tic Tac Toe** - ... line have the same parity (either all odd or all even). if the digits on a gray line in a region are all odd (or even), then the digit in t
- [nq4jn6skn5](https://sudokupad.app/nq4jn6skn5) `fpuz` **Ganger** - ...lines have the same parity.
- [7tph26u9ur](https://sudokupad.app/7tph26u9ur) `fpuz` **Nov 5, 2021: Parity Lines** - nov 5, 2021: parity lines normal sudoku rules apply. additionally, for each grey line in the grid, either all of the digits on it are
- [0tzabtgceq](https://sudokupad.app/0tzabtgceq) `other` **Parity loop** - parity loop normal sudoku rules apply. all even digits in the grid except the even digits in the center box form a singl
- [9ign5knige](https://sudokupad.app/9ign5knige) `other` **BIGITs** - ...e opposite even/odd parity. adjacent digits on a green line have a difference of at least 5. adjacent digits on a blue line have a differenc
- [pn2nbdselm](https://sudokupad.app/pn2nbdselm) `other` **Transmission** - ...1 to 9 once each. - parity counter lines: the digit on one endpoint of a blue line indicates the number of even digits on the line while the
- [78hbnfQjPm](https://sudokupad.app/78hbnfQjPm) `other` **Borromean Rings** - ...ring have different parity (odd/even). adjacent digits on the green ring differ by at least 5. digits on the blue line sum to the same value
- [9R8DNm8dq6](https://sudokupad.app/9R8DNm8dq6) `other` **Buffet** - ...wo of these groups; parity lines (red/p): adjacent digits along a parity line have opposite parity; ten lines (gray/t): digits along a ten l
- [GLtpHJ9MhF](https://sudokupad.app/GLtpHJ9MhF) `other` **Which Line Is It Anyway?** - ...n either direction. parity line: all digits on the line have the same parity. unlucky line: adjacent digits along the line sum to at least 1
- [jfrf3mHRbN](https://sudokupad.app/jfrf3mHRbN) `other` **Shining Loop** - ...h cells of the same parity but, when the loop crosses cage borders, the parity of the loop switches; iii) within each cage, the loop must pa
- [LqdQnHfdnM](https://sudokupad.app/LqdQnHfdnM) `other` **Parity Loop** - parity loop normal sudoku rules apply. draw a single closed loop (without branching or crossing) moving orthogonally thr
- [qJt66F2JG4](https://sudokupad.app/qJt66F2JG4) `other` **Parity Lines** - parity lines normal sudoku rules apply. each line has two circles. one of these circles gives the total number of odd di
- [06vt5y9nwu](https://sudokupad.app/06vt5y9nwu) `sxsm` **Mousetrap?** - ...ust be of different parity (odd/even).
- [11dz689p6l](https://sudokupad.app/11dz689p6l) `sxsm` **Parity Tic-Tac-Toe** - parity tic-tac-toe normal sudoku rules apply. entering correct digits may clear fog somewhere in the grid - no guessing 
- [1uv7hh848p](https://sudokupad.app/1uv7hh848p) `sxsm` **ABENNR** - ...r, even/odd**  each line in this puzzle is either a renban line or a nabner line. the solver must determine which is which.  - standard sudo
- [701zcuaz8b](https://sudokupad.app/701zcuaz8b) `sxsm` **Parity Cave** - parity cave normal sudoku rules apply. shade some cells such that all shaded cells are orthogonally connected, and all u
- [bhvl8agbtg](https://sudokupad.app/bhvl8agbtg) `sxsm` **Strange Boxes** - ...aight have the same parity, although a yellow cell is exempt from this rule. the solver must determine which parity applies to which cells i
- [gavbek5s69](https://sudokupad.app/gavbek5s69) `sxsm` **Regional Constraint Rally** - ...bors by at least 5. parity: along a red line, adjacent digits must alternate between odd and even.  constraint regions: each constraint type
- [gx4a6r7xzq](https://sudokupad.app/gx4a6r7xzq) `sxsm` **Pointer Arrow Parity Loop** - pointer arrow parity loop normal sudoku rules apply.  draw a one-cell-wide loop of orthogonally connected cells. the loop may not touc
- [h2sdbmic8x](https://sudokupad.app/h2sdbmic8x) `sxsm` **Mosaic** - ...par: digits along a parity line alternate odd/even.  nab: no two digits along a nabner line can be consecutive, regardless of their position
- [iovwq0jc5n](https://sudokupad.app/iovwq0jc5n) `sxsm` **Exclusive Lines** - ...he lines can now be parity lines (digits alternate between odd and even digits)  you have completed the puzzle when all 3 checkpoints are re
- [iwfv5d36aw](https://sudokupad.app/iwfv5d36aw) `sxsm` **Zipper Gramophone** - ...its, in any order.  parity lines (peach): digits along a peach 'parity line' must alternate between odd and even.
- [jfpmjqq6pw](https://sudokupad.app/jfpmjqq6pw) `sxsm` **Augen auf beim Rat(t)enkauf!** - ...ermo from the bulb. parity: adjacent digits on a red line differ in parity. kropki pairs: black dots indicate digits in a 1:2 ratio, white d
- [jfyralmfoe](https://sudokupad.app/jfyralmfoe) `sxsm` **Breadcrumbs** - ...g. if one cell on a parity line contains a 5, then no other cell on a parity line may contain a 5.  constraints:  a) along a red line, adjac
- [l00604nlbr](https://sudokupad.app/l00604nlbr) `sxsm` **Lupin's Loop 2 - Space Invasion** - ...along the loop, one parity forces the route to turn (making a 90° angle) while the other forces it to continue straight (making a 180° angle
- [ndo5ff4agt](https://sudokupad.app/ndo5ff4agt) `sxsm` **Limitations 8** - ... red line alternate parity (odd/even);  5) adjacent digits along a grey line have the same difference. (separate lines may have different di
- [nw6kb2aayl](https://sudokupad.app/nw6kb2aayl) `sxsm` **Snake Egg Sudoku** - snake egg sudoku normal sudoku rules apply. in addition, the grid contains four snakes, each starting and ending on the 
- [r3n9cwda1t](https://sudokupad.app/r3n9cwda1t) `sxsm` **Rip City** - ...lumn, row, and box  parity line: adjacent digits on the red line alternate between even and odd digits  white kropki dots: white dots separa
- [up5nrki10o](https://sudokupad.app/up5nrki10o) `sxsm` **RAT RUN 38: Synchronicity** - rat run 38: synchronicity normal sudoku rules apply.  aim of experiment: finkz and phinx must both reach different cupca
- [vanmy8509l](https://sudokupad.app/vanmy8509l) `sxsm` **Assembly Required** - ...tive digits along a parity line have different parity.  arrows, region sums, renbans, dutch whispers, and parity lines are not given and mus
- [w6uzuj1m0m](https://sudokupad.app/w6uzuj1m0m) `sxsm` **Befuddlement** - ...f there is a 2 on a parity line, 2 or double 1 can't appear anywhere else on a parity line, but double 2 could because it has a value of 4. 
- [wv01avmfs9](https://sudokupad.app/wv01avmfs9) `sxsm` **RAT RUN 5: Disparity** - rat run 5: disparity normal sudoku rules apply: place the digits 1-9 in each row, column, and 3x3 box (marked with dotted lines.)  aim
- [x0xwsud0hq](https://sudokupad.app/x0xwsud0hq) `sxsm` **Fibreglass Acoustic Diffusers** - ...have the same sum.  parity line: each pair of adjacent digits on the red 'a' must contain one odd and one even digit.  german whisper line: 
- [xag582l3t0](https://sudokupad.app/xag582l3t0) `sxsm` **Bits & Nibbles** - ...sudoku rules apply. parity counter lines: the two digits at the ends of each line indicate the number of odd and even digits in that line, i
- [y23lun2exp](https://sudokupad.app/y23lun2exp) `sxsm` **Parity Snakes** - parity snakes normal sudoku rules apply. digits separated by a white dot must be consecutive (not all dots are given). a
- [y697kc2umn](https://sudokupad.app/y697kc2umn) `sxsm` **Dovetail** - ...odular lines (mod), parity lines (par), german whispers (gw), double arrows (da), ten lines (ten), region sum lines (rsl), and entropic line

## zipper  (`ZIPPER_CUE_RE` vs tag `zipper`)
recall 96.9%  -  64 tagged, 62 hit, 2 missed, 7 false-positive

### MISSED (tagged, cue silent)

- [ws3dy3a8gi](https://sudokupad.app/ws3dy3a8gi) `other` **ZL GW DA** - ...igits along a green line must differ in value by at least 5. the lines and hexagons are double arrows. digits on each line sum to the same n
- [el9sus7p0o](https://sudokupad.app/el9sus7p0o) `sxsm` **Pseudo Cluedo** - ...your path: • draw a line passing through the centres of some cells to represent your journey from room to room, as you interrogate suspects 

### FALSE POSITIVE (cue fired, no tag)

- [nnf5fqru6z](https://sudokupad.app/nnf5fqru6z) `fpuz` **Zebediah Killgrave** - ...ge along a lavender line must sum to the total of the central cage.  the digit in the cell marked with a square is even.
- [bg99zmbupy](https://sudokupad.app/bg99zmbupy) `sxsm` **Across Roads** - ...alues along a green line differ by at least 5. cells an equal distance from the centre of a silver line have equal values.
- [j3hwgi98hr](https://sudokupad.app/j3hwgi98hr) `sxsm` **Copycat Collaboration** - ... r8c7, which is 9.  zippers: values an equal distance from the center of a lavender line sum to the value in the center of the line (which i
- [jewe3tzhy9](https://sudokupad.app/jewe3tzhy9) `sxsm` **RAT RUN 36: Alternating Currant** - ...bined form a valid 'zipper' line, with finkz and phinx at the ends and the cupcake cell in the middle.
- [jfyralmfoe](https://sudokupad.app/jfyralmfoe) `sxsm` **Breadcrumbs** - ...entre of a lavender zipper line must sum to the digit in the middle of that line (noted by a dot);  e) digits along a thermometer increase f
- [yiaonocy5d](https://sudokupad.app/yiaonocy5d) `sxsm` **...What?** - ...s are given. - grey lines are palindromes, i.e. digits equidistant from a grey line's center are always the same. - those are all the rules.
- [zqpxetdz7a](https://sudokupad.app/zqpxetdz7a) `sxsm` **Hungry Rabbit in the Fog** - ...he tip.  region sum line: within each box, the total value of all cells along the blue region sum line must be equal.  palindrome: along a g

## entropic  (`ENTROPIC_CUE_RE` vs tag `entropic_line`)
recall 88.9%  -  72 tagged, 64 hit, 8 missed, 17 false-positive

### MISSED (tagged, cue silent)

- [2xq0az12ee](https://sudokupad.app/2xq0az12ee) `fpuz` **Sept. 15, 2024: Entroparity** - sept. 15, 2024: entroparity normal sudoku rules apply. each line contains either all odd digits, or all even digits. also, along each li
- [ayjav37b9r](https://sudokupad.app/ayjav37b9r) `fpuz` **DDR** - ...t digits on a green line differ by at least 5. any set of three sequential cells on an orange line contains a low digit (1-3), a middle digi
- [qss44f03sx](https://sudokupad.app/qss44f03sx) `fpuz` **Year of the Snake** - ...as both modular and entropic properties.
- [26rwya5ujt](https://sudokupad.app/26rwya5ujt) `other` **June 7, 2025: Four Years** - ...ly. along each gray line, every digit is either higher than all of the digits it is directly connected to, or lower than all of the digits i
- [pTPD72D9qP](https://sudokupad.app/pTPD72D9qP) `other` **Everything in its Right Place** - ...same. one snake is “entropic”; along it, any group of 3 adjacent cells must contain one low digit (1, 2 or 3), one medium digit (4, 5 or 6) 
- [1cwnilmrp0](https://sudokupad.app/1cwnilmrp0) `sxsm` **Two Out of Three Ain't Bad** - ...tly two of modular, entropic, or parity. - modular lines: any set of three adjacent digits along a modular line has three different remainde
- [74j61weh89](https://sudokupad.app/74j61weh89) `sxsm` **The Heat Is On** - ...lumn, or box.  anti-entropy: no pair of orthogonally adjacent cells can contain digits from the same entropic set. the entropic sets are low
- [8jf1461dp3](https://sudokupad.app/8jf1461dp3) `sxsm` **Dippin' Dots** - ... and from different entropic sets (123/456/789). digits in killer cages do not repeat and must sum to the number in the top left of the cage

### FALSE POSITIVE (cue fired, no tag)

- [james-sinclair/quadrilateral](https://sudokupad.app/james-sinclair/quadrilateral) `fpuz` **Quadrilateral** - ...ition on the line). entropic lines: along orange lines, every set of three adjacent cells must contain one low digit (1-3), one middle digit
- [philip-newman/20250401-the-adult](https://sudokupad.app/philip-newman/20250401-the-adult) `fpuz` **2025-04-01: The Adult** - ...sudoku rules apply. entropic lines: along lines, each set of three cells must contain one high digit (789), one medium digit (456), and one 
- [9R8DNm8dq6](https://sudokupad.app/9R8DNm8dq6) `other` **Buffet** - ...wo of these groups; entropic lines (orange/e): each string of three adjacent cells along an entropic line contains one of 123, one of 456, a
- [tBpR8Qn727](https://sudokupad.app/tBpR8Qn727) `other` **Underground Topography** - ...digits along orange lines must have a difference of 3 or less.
- [3blhorinlx](https://sudokupad.app/3blhorinlx) `sxsm` **MOM DAY** - ...circle. on the pink line there must be a set of non-repeating consecutive digits in any order. adjacent digits on a green line must have a d
- [510jy8hqjs](https://sudokupad.app/510jy8hqjs) `sxsm` **A Night in the Entropics** - a night in the entropics normal sudoku rules apply. digits connected by a black dot have a 2 to 1 ratio. digits connected by a white do
- [6r6dcn61n3](https://sudokupad.app/6r6dcn61n3) `sxsm` **Entanglement** - ... row, column, or outlined 3x3 region. -digits along each arrow sum to the digit in the connected bulb.  -a row / column may only contain dig
- [753umuwjuz](https://sudokupad.app/753umuwjuz) `sxsm` **Method to the Madness** - ...ternating even/odd  entropy: every 3 digits has a [1,2,3], [4,5,6], and [7,8,9] digit  modular: every 3 digits has a [1,4,7], [2,5,8], and [
- [7fapjms0yv](https://sudokupad.app/7fapjms0yv) `sxsm` **Dovetail** - ... cannot repeat on a line. digits along a grey line can be broken into non-overlapping segments whose digits sum to ten. eg 71246 is a valid 
- [hrsm0gqb5o](https://sudokupad.app/hrsm0gqb5o) `sxsm` **Dutch Summer** - ...ge) 'dutch whisper' lines are also region sum lines. ie 1) adjacent digits along the a line must differ in value by at least 4; and 2) the 3
- [i7jrq9g9oz](https://sudokupad.app/i7jrq9g9oz) `sxsm` **Indifferent Neighbours!** - indifferent neighbours! normal sudoku rules apply. (ie place the digits 1-9, once each, in every row, column and 3x3 box
- [jl4sby2gl2](https://sudokupad.app/jl4sby2gl2) `sxsm` **The one and only sum** - ...cells along a peach entropic line must contain one low (123), one medium (456) and one high  (789) digit. box borders dive the blue region s
- [k4g3ubb8qe](https://sudokupad.app/k4g3ubb8qe) `sxsm` **Yin-Yang-Yong** - ...e (or the same.)  • entropic (orange): any group of 3 adjacent cells on an orange line must contain one low digit (1, 2 or 3), one medium di
- [pdnc0ckv87](https://sudokupad.app/pdnc0ckv87) `sxsm` **Junk Drawer** - ...,5,8}, or {3,6,9}.  entropic line: any three adjacent digits on a peach line cannot be from the same set of low, middle, or high digits, tha
- [r411ysr073](https://sudokupad.app/r411ysr073) `sxsm` **Foggy Fireworks** - ...ffer by at least 5. entropic lines: on an orange line, any set of three consecutive digits must contain a low (1,2,3), middle (4,5,6) and hi
- [tdr0ywy332](https://sudokupad.app/tdr0ywy332) `sxsm` **Global Warming** - ...it grey thermometer lines into segments. starting from the bulb, the sum of each segment must increase. additionally, within each segment, s
- [y3iozmwgi4](https://sudokupad.app/y3iozmwgi4) `sxsm` **String Theory** - ...gits in any order.  entropic lines: along a peach (ent) line, no digit can be within 2 cells of a digit of the same entropic class [high (78

## thermo  (`THERMO_CUE_RE` vs tag `thermo`)
recall 94.4%  -  444 tagged, 419 hit, 25 missed, 45 false-positive

### MISSED (tagged, cue silent)

- [4mlp7jvob1](https://sudokupad.app/4mlp7jvob1) `fpuz` **Wake Up!** - ...gits along the blue line sum to the same total each time it enters a new box in the grid. the digits in each circle must appear at least onc
- [33e4hyg91z](https://sudokupad.app/33e4hyg91z) `fpuz` **BYO Renbanmometers** - byo renbanmometers normal sudoku rules apply.  along renbanmometers, digits must increase from the bulb end and form a n
- [james-sinclair/polar-foil](https://sudokupad.app/james-sinclair/polar-foil) `fpuz` **Polar Foil** - polar foil see this puzzle's lmd page for detailed rules: https://logic-masters.de/raetselportal/raetsel/zeigen.php?id=0
- [plojf2h1nk](https://sudokupad.app/plojf2h1nk) `fpuz` **Even Bishops** - ...them are even. gray lines are palindromes that read the same in both directions these lines also cannot contain more than two of the same di
- [qj5fmj2art](https://sudokupad.app/qj5fmj2art) `fpuz` **Drop Bear** - ... digit.  region sum lines: region borders split blue lines into segments where the digits on each segment have the same sum. this sum may be
- [o07lderrxk](https://sudokupad.app/o07lderrxk) `fpuz` **Untitled** - untitled no rules provided for this puzzle. please check the related video or website for rules.
- [j3j5t378kj](https://sudokupad.app/j3j5t378kj) `other` **Climbing The Stairs** - climbing the stairs normal sudoku rules apply. starting in a corner, along the grey stairs the difference between the fi
- [37FhLLGT9p](https://sudokupad.app/37FhLLGT9p) `other` **Spring in the Step** - ...its on a region sum line have an equal sum within each box that the line passes through.
- [3P3mjRD2RQ](https://sudokupad.app/3P3mjRD2RQ) `other` **Odd Tri Out** - ...s mark even digits. lines are palindromes, which read the same either way.
- [3r8FmBhLH2](https://sudokupad.app/3r8FmBhLH2) `other` **Pieces** - ...8 grid. each purple line contains a set of consecutive and non-repeating digits, in any order. digits on arrows must sum to the digit in the
- [49MnD2jLrB](https://sudokupad.app/49MnD2jLrB) `other` **Killed Bulbs And Killer Cages** - ...ge. the digits on a line must increase from one end to the other.
- [dh722BmNdM](https://sudokupad.app/dh722BmNdM) `other` **Sum Foggy Quads** - ...g a blue region sum line have an equal sum within each 3x3 box the line passes through. region sum lines do not branch. each “quadruple clue
- [FF8fN88npr](https://sudokupad.app/FF8fN88npr) `other` **The Ls** - ...circle. each purple line contains a set of non-repeating consecutive digits, which can appear in any order.
- [FGHJh9tPqT](https://sudokupad.app/FGHJh9tPqT) `other` **Violet Owl** - ...apply. digits along lines separated by grey circles must have values in between those in the circles. digits along a purple line must form a
- [jBgqFmpD2g](https://sudokupad.app/jBgqFmpD2g) `other` **Arrows between Thorns** - ...sudoku rules apply. lines act both as arrows, so that numbers on a line, including the blue circle, sum to the number in the orange circle, 
- [TgFnFH8Jt8](https://sudokupad.app/TgFnFH8Jt8) `other` **Unity** - ...gits along a purple line form a set of non-repeating consecutive digits and can be in any order.
- [tgLhMqqHrm](https://sudokupad.app/tgLhMqqHrm) `other` **BYO Renbanmometers** - byo renbanmometers normal sudoku rules apply. along “renbanmometers”, digits must increase from the bulb end and form a 
- [tJ2TgrMRht](https://sudokupad.app/tJ2TgrMRht) `other` **Are Circles and Squares Pals?** - ...les apply. the grey line is a palindrome, reading the same forwards and backwards. there are no repeated digits in circles, nor in squares. 
- [tmH7BfRPpd](https://sudokupad.app/tmH7BfRPpd) `other` **ThermArrow Sudoku** - thermarrow sudoku normal sudoku rules apply. digits along arrows sum to the number in the circle, and ascend from the ar
- [3l6bzhg2ji](https://sudokupad.app/3l6bzhg2ji) `sxsm` **Tinsel and Baubles** - tinsel and baubles normal sudoku rules apply.  adjacent digits on green tinsel have a difference of at least 5.  the dig
- [7613uxdt7g](https://sudokupad.app/7613uxdt7g) `sxsm` **Quad Code** - ...digits along a grey line can be divided into one or more non-overlapping groups of adjacent cells, each of which sums to 10.  the digits in 
- [7n6wneuch2](https://sudokupad.app/7n6wneuch2) `sxsm` **Field Research** - ...g new clues.  index lines: on an index line, the digit in the nth cell along the line (starting from the diamond) indicates the position alo
- [bcurd4y01m](https://sudokupad.app/bcurd4y01m?setting-nogrid=1) `sxsm` **Hailstorm** - ...ease along the grey line from the bulb. - values outside the grid are the sum of the indicated diagonal.
- [jkcqhkr4sh](https://sudokupad.app/jkcqhkr4sh?setting-nogrid=1) `sxsm` **Sudoku en rouge, jaune, bleu et noir** - ...). - along diagonal lines, digits increase in one direction. - small square outlines all contain different digits.
- [jw1onozqhg](https://sudokupad.app/jw1onozqhg) `sxsm` **The Spider** - the spider • normal sudoku rules apply. • two cells connected by a spider leg must have a difference of at least 5. • ce

### FALSE POSITIVE (cue fired, no tag)

- [b0utbeia1e](https://sudokupad.app/b0utbeia1e) `fpuz` **July 29, 2021: Slow Thermo** - july 29, 2021: slow thermo normal sudoku rules apply.   digits along a "slow thermometer" must never decrease (starting from the circular bu
- [6d3c5yali7](https://sudokupad.app/6d3c5yali7) `fpuz` **6/24/23: Inside Philip's House** - ...u rules apply. slow thermo: digits along thermometers must not decrease (but can stay the same) from bulb to tip.
- [tqshnt1exb](https://sudokupad.app/tqshnt1exb) `fpuz` **Second Law of Thermodynamics** - second law of thermodynamics place the digits 1 to 9 in each row, column, box and region.
- [v9i79d2xyy](https://sudokupad.app/v9i79d2xyy) `fpuz` **9/1/22 - GAS: Love and Thermos** - .../22 - gas: love and thermos normal sudoku rules apply. digits in cages cannot repeat and must sum to the total given. along *slow* thermomet
- [igpr21m2co](https://sudokupad.app/igpr21m2co) `fpuz` **Multiple Madness** - ... digits along a red thermometer must strictly increase from the bulb end.
- [omtjde4f3k](https://sudokupad.app/omtjde4f3k) `fpuz` **Tannenbaumino** - ...ng a candle (i.e. a thermometer).
- [philip-newman/20241018-not-a-slow-thermo](https://sudokupad.app/philip-newman/20241018-not-a-slow-thermo) `fpuz` **2024-10-18: Not A Slow Thermo** - ...4-10-18: not a slow thermo normal sudoku rules apply. quadruples: digits in corner circles must appear in the surrounding four cells, in som
- [philip-newman/20250206-thermo-on-the-brain](https://sudokupad.app/philip-newman/20250206-thermo-on-the-brain) `fpuz` **2025-02-06: Thermo on the Brain** - 2025-02-06: thermo on the brain normal sudoku rules apply. and that's it!
- [en96i1su3o](https://sudokupad.app/en96i1su3o?setting-conflictchecker=0) `other` **Kurotto (Aqre)** - ...ere in the grid. furthermore, each cell containing a number must not be shaded, and the number in the cell represents the total count of sha
- [jMg44R2tpb](https://sudokupad.app/jMg44R2tpb) `other` **Broken Secrets** - ...ed digits). along a thermometer, digits must increase from the bulb end. cells with grey squares must contain even digits.
- [lhua5h8xvs](https://sudokupad.app/lhua5h8xvs) `other` **March 11, 2025: Sloooooow** - ...u rules apply. slow thermo: digits along thermometers must either increase or stay the same, starting at the round bulb. for instance, a the
- [muytgcj0ni](https://sudokupad.app/muytgcj0ni) `other` **Nemo** - ...ply. along a (slow) thermometer digits must increase or stay the same from the bulb to the tip.
- [pTPD72D9qP](https://sudokupad.app/pTPD72D9qP) `other` **Everything in its Right Place** - ...ne snake is a “slow thermometer”; along this line, reading from one end to the other, digits must always increase or stay the same. one snak
- [QJ2QgfFn9b](https://sudokupad.app/QJ2QgfFn9b) `other` **Slogermo** - ...5. digits on a slow thermo either increase or stay the same from the bulb end. cells within the same position in boxes cannot contain the sa
- [rMGD6f9q8n](https://sudokupad.app/rMGD6f9q8n) `other` **Drunken Fish** - ...east 5.digits along thermometers strictly increase from the bulb.the cell marked with a grey square must contain an even digit. cells with a
- [489rPm6j4f](https://sudokupad.app/489rPm6j4f) `other` **Yin-Yang Thermos** - yin-yang thermos normal sudoku rules apply. shade some cells such that all shaded cells are orthogonally connected, and all unsha
- [6nhndtjdHB](https://sudokupad.app/6nhndtjdHB) `other` **Chinese Coin** - ...lb and line form a 'thermometer' which must be populated by double-digit numbers.  each number starts with the tens-digit followed by the un
- [7NdjLLJ379](https://sudokupad.app/7NdjLLJ379) `other` **Tokyo Olympics** - ...igits. digits along thermometers ascend or repeat from the bulb (slow thermo rules). the black and yellow lines are seven segments long.
- [JNDQqQ6Bfm](https://sudokupad.app/JNDQqQ6Bfm) `other` **Bobsleigh** - ... rules apply. along thermos, numbers either increase or stay the same from the bulb to the tip(s).
- [jRhnH89mNm](https://sudokupad.app/jRhnH89mNm) `other` **Caduceus** - ...oku rules apply. furthermore, there are two snakes (snake a and b) in the grid. one is an 'equal sum line' snake (see below) and the other i
- [NJgTqnNp9j](https://sudokupad.app/NJgTqnNp9j) `other` **Just Sum Ambiguity** - ...s in box 8].\n\n furthermore, each line satisfies one of the following:\n\nentropic lines: along an entropic line any run of three cells con
- [tnHfB78T98](https://sudokupad.app/tnHfB78T98) `other` **500k Subs** - ...oku rules apply. furthermore there are 3 snakes hidden in the grid. each snake is a set of cells sharing an edge or a corner; each snake can
- [xc7i2ozu0f](https://sudokupad.app/xc7i2ozu0f) `other` **Cheese, Wine & Bread** - ...ku rules apply. all thermometers are slow thermos. digits must increase or stay the same on each step from the bulb to the tip.
- [3nkifpknc6](https://sudokupad.app/3nkifpknc6) `sxsm` **Lief, the Univeres, and Everythign** - ...t wrogn.  ambiguous thermos: digits along a gray line must strictly increase from one end to the other.  ascending starters: a clue outside 
- [d5s2c3o5j3](https://sudokupad.app/d5s2c3o5j3) `sxsm` **Lost and Found** - ...ttached bulb.  slow thermometers: digits along a thermometer must not decrease from the bulb end to the tip.  german whispers line: two cell
- [el9sus7p0o](https://sudokupad.app/el9sus7p0o) `sxsm` **Pseudo Cluedo** - ...e same (like a slow thermometer). you must never move from a higher value to a lower value.  pseudo cells: • every row, column and room has 
- [foesxbaf60](https://sudokupad.app/foesxbaf60) `sxsm` **Let's Get Kraken** - ...ips, digits along a thermometer must either increase or stay the same. adjacent digits along the green line have a difference of at least fi
- [iutvqv1ht8](https://sudokupad.app/iutvqv1ht8) `sxsm` **My First Soduko** - ...long the light grey thermomometer must increase as you move away from the end with the blub.  ditgits on a light blue arrow sum to whats in 
- [james-sinclair/halfway-there](https://sudokupad.app/james-sinclair/halfway-there) `sxsm` **Halfway There** - ...e connected circle. thermometers: values on thermometers strictly increase from the bulb. values in cells separated by a v sum to 5. values 
- [jfyralmfoe](https://sudokupad.app/jfyralmfoe) `sxsm` **Breadcrumbs** - ...  e) digits along a thermometer increase from bulb to tip;  f) a cell with arrows pointing inward must be smaller than all other cells that 
- [jl4sby2gl2](https://sudokupad.app/jl4sby2gl2) `sxsm` **The one and only sum** - ...order. along a gray thermometer, digits must strictly increase from the bulb end. each set of three consecutive cells along a peach entropic
- [llm83vvquh](https://sudokupad.app/llm83vvquh) `sxsm` **cento mani e cento occhi** - ...gits along the slow thermometer line increase or stay the same starting from its only bulb end. the position of the single bulb end is to be
- [n8gezvtat5](https://sudokupad.app/n8gezvtat5) `sxsm` **The Archer's Dozen** - ...sper line or a slow thermometer, starting from the arrow tip. the applicable rule may vary between arrows and must be deduced by the solver.
- [philip-newman/20260312-good-grief](https://sudokupad.app/philip-newman/20260312-good-grief) `sxsm` **2026-03-12: Good Grief** - ...u rules apply. slow thermo: digits along slow thermometers must increase or stay the same moving from bulb to tip.  view gas on gmpuzzles: h
- [philip-newman/20260418-slow-ride](https://sudokupad.app/philip-newman/20260418-slow-ride) `sxsm` **2026-04-18: Slow Ride** - ...u rules apply. slow thermo: digits along slow thermometers must increase or stay the same moving from bulb to tip.  view gas on gmpuzzles: h
- [pnyv6sn7qm](https://sudokupad.app/pnyv6sn7qm) `sxsm` **Déjà Vu Part 1: Doublers** - ...ne, renban, nabner, thermo, kropki, xv, and quadruple rules apply, with respect to cell values.  region sum line: box borders divide the blu
- [qcccbe8xug](https://sudokupad.app/qcccbe8xug) `sxsm` **5's live in Foggy Flats** - .... digits along each thermometer must increase starting from the bulb end. the grid is partially covered with fog. correctly placed digits wi
- [qes8ggvsi4](https://sudokupad.app/qes8ggvsi4) `sxsm` **The Hare and the Tortoise** - ...ise’s line, a ‘slow thermo’ by name, the digits can increase or just stay the same. hare’s line is a ‘fast thermo’: digits still climb, but 
- [r411ysr073](https://sudokupad.app/r411ysr073) `sxsm` **Foggy Fireworks** - ...consecutive digits. thermometer: along a grey line, digits strictly increase from bulb to tip. kropki dots: a white dot connects two consecu
- [sr3ev8r4sd](https://sudokupad.app/sr3ev8r4sd) `sxsm` **Up Up and Away** - ... rules apply.  slow thermo: digits on the slow thermo may not decrease starting at the bulb.  running start: outside clues on the slow therm
- [vcncpwgckm](https://sudokupad.app/vcncpwgckm) `sxsm` **RAT RUN 14: Thermoregulation** - rat run 14: thermoregulation normal sudoku rules apply.  aim of experiment: finkz the rat must reach the cupcake by finding a path t
- [vnxrlvh04f](https://sudokupad.app/vnxrlvh04f) `sxsm` **Anti-knight Singularis Alchemis** - ... digit. digits on a thermometer must not decrease from the bulb end. connected digits on a green line must differ by at least 5. digits in a
- [vriogscu49](https://sudokupad.app/vriogscu49) `sxsm` **Red Light, Green Light** - ...ne are distinct. furthermore, any three (not necessarily adjacent!) distinct digits {x,y,z} on a red line satisfy the triangle inequality, i
- [vw1q7megqm](https://sudokupad.app/vw1q7megqm) `sxsm` **The Slowest Snake** - ... and acts as a slow thermometer i.e. reading from one end to the other, digits on the snake increase or stay the same (the direction must be
- [z7oxi1ve8x](https://sudokupad.app/z7oxi1ve8x) `sxsm` **Thermohaline Circulation** - thermohaline circulation standard sudoku rules apply.  loop: shade some cells to form a 1-cell-wide orthogonally connect
