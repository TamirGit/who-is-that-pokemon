import { NextRequest, NextResponse } from "next/server";
import { GENERATIONS, type Generation } from "@/lib/generationRules";
import type { StoredPokemon } from "@/lib/storageTypes";
import { getRedisClient } from "@/lib/server/redis";
import {
  FILTERED_POKEMON_CACHE_TTL_SECONDS,
  GENERATION_POKEMON_CACHE_TTL_SECONDS,
  buildFilteredCacheKey,
  buildGenerationCacheKey,
  deserializePokemon,
  serializePokemon,
} from "@/lib/server/pokemonCache";
import { getPokemonByGeneration, getPokemonByGenerations } from "@/lib/server/pokemonRepository";

export const runtime = "nodejs";

function parseGenerations(value: string | null): Generation[] {
  if (!value) {
    return [];
  }
  const requested = new Set<number>(
    value
      .split(",")
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((item) => Number.isFinite(item)),
  );
  return GENERATIONS.filter((generation) => requested.has(generation));
}

function limitPokemon(pokemon: StoredPokemon[], limit: number): StoredPokemon[] {
  return pokemon.filter((entry) => entry.id <= limit);
}

async function getFromGenerationCaches(
  generations: Generation[],
  limit: number,
): Promise<StoredPokemon[] | null> {
  const redis = await getRedisClient();
  if (!redis) {
    return null;
  }

  const keys = generations.map((generation) => buildGenerationCacheKey(generation));
  const cachedRows = await redis.mGet(keys);

  const entries: StoredPokemon[] = [];
  for (const row of cachedRows) {
    if (row === null) {
      return null;
    }
    const parsed = deserializePokemon(row);
    if (parsed === null) {
      return null;
    }
    entries.push(...parsed);
  }
  return limitPokemon(entries, limit);
}

async function repopulateGenerationCaches(generations: Generation[]): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }

  for (const generation of generations) {
    const pokemon = await getPokemonByGeneration(generation);
    await redis.setEx(
      buildGenerationCacheKey(generation),
      GENERATION_POKEMON_CACHE_TTL_SECONDS,
      serializePokemon(pokemon),
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const generations = parseGenerations(request.nextUrl.searchParams.get("generations"));
    if (generations.length === 0) {
      return NextResponse.json({ error: "At least one generation is required." }, { status: 400 });
    }

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "1025", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1025) : 1025;
    const filteredKey = buildFilteredCacheKey(generations, limit);
    const redis = await getRedisClient();

    if (redis) {
      const cachedFiltered = await redis.get(filteredKey);
      const parsed = deserializePokemon(cachedFiltered);
      if (parsed) {
        return NextResponse.json({ pokemon: parsed, source: "redis" });
      }
    }

    const fromGenerationCache = await getFromGenerationCaches(generations, limit);
    if (fromGenerationCache) {
      if (redis) {
        await redis.setEx(
          filteredKey,
          FILTERED_POKEMON_CACHE_TTL_SECONDS,
          serializePokemon(fromGenerationCache),
        );
      }
      return NextResponse.json({ pokemon: fromGenerationCache, source: "redis" });
    }

    const fromDb = await getPokemonByGenerations(generations, limit);
    await repopulateGenerationCaches(generations);

    if (redis) {
      await redis.setEx(filteredKey, FILTERED_POKEMON_CACHE_TTL_SECONDS, serializePokemon(fromDb));
    }

    return NextResponse.json({ pokemon: fromDb, source: "db" });
  } catch (error) {
    console.error("Pokemon route failed:", error);
    return NextResponse.json({ error: "Unable to load pokemon data." }, { status: 500 });
  }
}
