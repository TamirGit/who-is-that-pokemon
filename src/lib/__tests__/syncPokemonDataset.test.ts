import { describe, expect, it } from "vitest";
import { normalizePokemonDetail } from "@/lib/server/syncPokemonDataset";

describe("normalizePokemonDetail", () => {
  it("normalizes detail payload to stored pokemon shape", () => {
    const normalized = normalizePokemonDetail({
      id: 25,
      name: "pikachu",
      types: [
        { slot: 2, type: { name: "electric-secondary" } },
        { slot: 1, type: { name: "electric" } },
      ],
    });

    expect(normalized).toEqual({
      id: 25,
      name: "pikachu",
      imageUrl:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
      types: ["electric", "electric-secondary"],
      generation: 1,
    });
  });
});
