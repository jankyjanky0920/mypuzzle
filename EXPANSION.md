# Puzzle expansion recovery checkpoint

Status: incomplete implementation; production stays at v4.2.0.
Base: 34ea63d092cb77664c3146ed4757a01b268d28b9.

## Accepted scope
- Add 23 normal-level non-Sudoku puzzle kinds, matching the larger/higher-point source board sizes.
- No new Sudoku implementation. Keep existing nineteen Sudoku kinds and their test composition unchanged.
- New puzzle test: twenty distinct kinds, 120 minutes, one question per kind, optional existing standard Sudoku, no special Sudoku variants.
- Both tests: generate a downloadable printable PDF, start timer only after preparation succeeds.
- Digital entry, pen input, native paper answer formats, persistent local progress, backup/export, verified replenishment.
- Every complete puzzle must be unique and solvable by a replayable, sound, branch-free logical propagation trace. Branching allowed only in generation and independent validation.

## Kinds and source sizes
crossmath 3x3; selfSkeleton 15x10; mastermind 5 digits; fillomino 13x13; abcPlace 6x6; placeProduct 10x10; mukkonn 12x12; nanro 10x10; starBattle 12x12; aibeya 10x10; snake 10x10; canalView 11x11; consecutiveQuads 7x7; battleship 10x10; heterocut 8x8; gardenKakuro 11x11; tapa 15x15; balanceLoop 15x15; statuePark 12x12; building 7x7; kurotto 15x15; galaxies 14x14; yajilin 15x15.

## Rule details that must not be lost
Crossmath evaluates left-to-right. Product uses WHITE-run products; pieces cannot touch even at corners. Aibeya area is strictly BETWEEN its two numbers. Star answers are gaps between the two stars; no fixed starting stars. Snake permits an ordinary L bend. Garden empty cells cannot share an edge. Balance circles compare distances to the next bend, with no Masyu rule. Statue permits corner contact and requires connected white cells. Kurotto has no global connectivity/no-2x2 restriction. Yajilin rays pass other clue cells. Heterocut free shapes are all distinct up to rotation/reflection. Fillomino permits clue-free regions and multiple equal clues in a region.

## Native paper answers
Crossmath: fixed diagonal 3 digits. Mastermind: entire 5-digit code. Battleship: ten diagonal cells, ship length or X. ABC: 4 letters or X. Skeleton: 4 letter counts. Regions: 4 areas. Loops: 4 bend counts. StarBattle: 4 column star gaps. Other kinds: 4 cell values or line counts; keep multi-digit answers in separate fields.

## Recovery
The earlier uncommitted expansion modules were lost when the execution environment reset. Original PDF copies are also absent from the current local upload directory. Rule/size/answer review notes above survive in the conversation. Never present missing code as completed work. Checkpoint new source on this branch frequently; do not update production main until implementation and verification are complete.
