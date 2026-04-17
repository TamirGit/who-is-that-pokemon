# Who's That Pokemon?

Generation-based Pokemon silhouette guessing game built with Next.js.

## Features

- Select one or more generations (`Gen 1` through `Gen 9`) before the game starts.
- Loads Pokemon from PokeAPI, applies generation pool filtering, and picks random entries.
- Shows each Pokemon as a black silhouette until the guess is submitted.
- Tracks score across rounds and supports replay when the pool is exhausted.

## Run locally

1. Install dependencies:
   - `npm install`
2. Start development server:
   - `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000)

## Test

- `npm run test`

## Notes on generation mapping

This implementation maps generations by national Pokedex ID ranges:

- `Gen 1`: 1-151
- `Gen 2`: 152-251
- `Gen 3`: 252-386
- `Gen 4`: 387-493
- `Gen 5`: 494-649
- `Gen 6`: 650-721
- `Gen 7`: 722-809
- `Gen 8`: 810-905
- `Gen 9`: 906-1025

Rules are centralized in `src/lib/generationRules.ts` so you can tune them without touching UI flow.
