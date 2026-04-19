import { describe, expect, it } from "vitest";
import {
  buildFilteredCacheKey,
  buildGenerationCacheKey,
  deserializePokemon,
  serializePokemon,
} from "@/lib/server/pokemonCache";
import type { StoredPokemon } from "@/lib/storageTypes";

describe("pokemonCache helpers", () => {
  it("builds stable keys", () => {
    expect(buildFilteredCacheKey([1, 2], 100)).toBe("pokemon:filtered:g=1,2:l=100");
    expect(buildGenerationCacheKey(9)).toBe("pokemon:generation:9");
  });

  it("serializes and deserializes pokemon lists", () => {
    const sample: StoredPokemon[] = [
      {
        id: 1,
        name: "bulbasaur",
        imageUrl: "https://example.com/1.png",
        types: ["grass", "poison"],
        generation: 1,
      },
    ];
    const raw = serializePokemon(sample);
    expect(deserializePokemon(raw)).toEqual(sample);
  });
});
