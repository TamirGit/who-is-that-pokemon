import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredPokemon } from "@/lib/storageTypes";

const mocks = vi.hoisted(() => {
  return {
    getRedisClient: vi.fn(),
    getPokemonByGenerations: vi.fn(),
    getPokemonByGeneration: vi.fn(),
  };
});

vi.mock("@/lib/server/redis", () => ({
  getRedisClient: mocks.getRedisClient,
}));

vi.mock("@/lib/server/pokemonRepository", () => ({
  getPokemonByGenerations: mocks.getPokemonByGenerations,
  getPokemonByGeneration: mocks.getPokemonByGeneration,
}));

import { GET } from "@/app/api/pokemon/route";

const SAMPLE: StoredPokemon[] = [
  {
    id: 1,
    name: "bulbasaur",
    imageUrl: "https://example.com/1.png",
    types: ["grass", "poison"],
    generation: 1,
  },
];

describe("GET /api/pokemon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns redis source when filtered cache exists", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(SAMPLE)),
      mGet: vi.fn(),
      setEx: vi.fn(),
    };
    mocks.getRedisClient.mockResolvedValue(redis);

    const response = await GET({
      nextUrl: new URL("http://localhost/api/pokemon?generations=1&limit=1025"),
    } as never);
    const payload = (await response.json()) as { source: string; pokemon: StoredPokemon[] };

    expect(payload.source).toBe("redis");
    expect(payload.pokemon).toEqual(SAMPLE);
    expect(mocks.getPokemonByGenerations).not.toHaveBeenCalled();
  });

  it("falls back to db and repopulates cache", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      mGet: vi.fn().mockResolvedValue([null]),
      setEx: vi.fn(),
    };
    mocks.getRedisClient.mockResolvedValue(redis);
    mocks.getPokemonByGenerations.mockResolvedValue(SAMPLE);
    mocks.getPokemonByGeneration.mockResolvedValue(SAMPLE);

    const response = await GET({
      nextUrl: new URL("http://localhost/api/pokemon?generations=1&limit=1025"),
    } as never);
    const payload = (await response.json()) as { source: string; pokemon: StoredPokemon[] };

    expect(payload.source).toBe("db");
    expect(payload.pokemon).toEqual(SAMPLE);
    expect(mocks.getPokemonByGenerations).toHaveBeenCalledWith([1], 1025);
    expect(redis.setEx).toHaveBeenCalled();
  });

  it("falls back to db when generation cache payload is malformed", async () => {
    const redis = {
      get: vi.fn().mockResolvedValue(null),
      mGet: vi.fn().mockResolvedValue(["not-json"]),
      setEx: vi.fn(),
    };
    mocks.getRedisClient.mockResolvedValue(redis);
    mocks.getPokemonByGenerations.mockResolvedValue(SAMPLE);
    mocks.getPokemonByGeneration.mockResolvedValue(SAMPLE);

    const response = await GET({
      nextUrl: new URL("http://localhost/api/pokemon?generations=1&limit=1025"),
    } as never);
    const payload = (await response.json()) as { source: string; pokemon: StoredPokemon[] };

    expect(payload.source).toBe("db");
    expect(payload.pokemon).toEqual(SAMPLE);
    expect(mocks.getPokemonByGenerations).toHaveBeenCalledWith([1], 1025);
  });
});
