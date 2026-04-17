import type { GamePokemon } from "@/lib/gameEngine";
import type { Generation } from "@/lib/generationRules";

export async function fetchGenerationPokemonPool(
  selectedGenerations: Generation[],
  limit = 1025,
): Promise<GamePokemon[]> {
  const query = new URLSearchParams({
    generations: selectedGenerations.join(","),
    limit: String(limit),
  });
  const response = await fetch(`/api/pokemon?${query.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load generation-filtered pokemon.");
  }
  const payload = (await response.json()) as { pokemon: GamePokemon[] };
  return payload.pokemon;
}
