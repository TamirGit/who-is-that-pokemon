import type { Generation } from "@/lib/generationRules";
import type { StoredPokemon } from "@/lib/storageTypes";

export const FILTERED_POKEMON_CACHE_TTL_SECONDS = 60;
export const GENERATION_POKEMON_CACHE_TTL_SECONDS = 60 * 60 * 24;

export function buildFilteredCacheKey(generations: Generation[], limit: number): string {
  return `pokemon:filtered:g=${generations.join(",")}:l=${limit}`;
}

export function buildGenerationCacheKey(generation: Generation): string {
  return `pokemon:generation:${generation}`;
}

export function serializePokemon(pokemon: StoredPokemon[]): string {
  return JSON.stringify(pokemon);
}

export function deserializePokemon(raw: string | null): StoredPokemon[] | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const normalized = parsed.filter((entry): entry is StoredPokemon => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      const candidate = entry as Partial<StoredPokemon>;
      return (
        typeof candidate.id === "number" &&
        typeof candidate.name === "string" &&
        Array.isArray(candidate.types) &&
        typeof candidate.imageUrl === "string" &&
        typeof candidate.generation === "number"
      );
    });
    return normalized;
  } catch {
    return null;
  }
}
