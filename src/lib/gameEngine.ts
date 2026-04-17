import { isCorrectGuess } from "@/lib/normalizeGuess";
import type { PokemonLite } from "@/lib/generationRules";

export type GamePokemon = PokemonLite & {
  imageUrl: string;
};

export type RoundState = {
  current: GamePokemon;
  revealed: boolean;
  isCorrect: boolean | null;
};

export type ScoreState = {
  roundsPlayed: number;
  correctGuesses: number;
};

export function pickRandomPokemon(pool: GamePokemon[], usedIds: Set<number>): GamePokemon | null {
  const available = pool.filter((pokemon) => !usedIds.has(pokemon.id));
  if (available.length === 0) {
    return null;
  }
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}

export function scoreGuess(round: RoundState, guess: string): RoundState {
  const isCorrect = isCorrectGuess(guess, round.current.name);
  return {
    ...round,
    revealed: true,
    isCorrect,
  };
}

export function updateScore(score: ScoreState, round: RoundState): ScoreState {
  return {
    roundsPlayed: score.roundsPlayed + 1,
    correctGuesses: score.correctGuesses + (round.isCorrect ? 1 : 0),
  };
}
