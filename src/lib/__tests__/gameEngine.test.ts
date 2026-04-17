import { describe, expect, it } from "vitest";
import { pickRandomPokemon, scoreGuess, updateScore, type RoundState } from "@/lib/gameEngine";

const POOL = [
  { id: 1, name: "bulbasaur", types: ["grass"], imageUrl: "x" },
  { id: 4, name: "charmander", types: ["fire"], imageUrl: "y" },
];

describe("gameEngine", () => {
  it("does not pick used pokemon", () => {
    const used = new Set([1]);
    const picked = pickRandomPokemon(POOL, used);
    expect(picked?.id).toBe(4);
  });

  it("scores guesses and updates score", () => {
    const round: RoundState = {
      current: POOL[0],
      revealed: false,
      isCorrect: null,
    };

    const scored = scoreGuess(round, "Bulbasaur");
    expect(scored.isCorrect).toBe(true);
    const nextScore = updateScore({ roundsPlayed: 0, correctGuesses: 0 }, scored);
    expect(nextScore).toEqual({ roundsPlayed: 1, correctGuesses: 1 });
  });
});
