import { createHash } from "node:crypto";
import { GENERATIONS, getGenerationByPokemonId, type Generation } from "@/lib/generationRules";
import type { StoredPokemon } from "@/lib/storageTypes";
import { withTransaction } from "@/lib/server/db";
import {
  GENERATION_POKEMON_CACHE_TTL_SECONDS,
  buildGenerationCacheKey,
  serializePokemon,
} from "@/lib/server/pokemonCache";
import { bulkUpsertPokemon, setSyncState } from "@/lib/server/pokemonRepository";
import { getRedisClient } from "@/lib/server/redis";

const TOTAL_POKEMON = 1025;
const POKE_API = "https://pokeapi.co/api/v2";
const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const DETAIL_FETCH_CONCURRENCY = 20;

type PokemonListResponse = {
  results: Array<{ name: string; url: string }>;
};

type PokemonDetailResponse = {
  id: number;
  name: string;
  types: Array<{ slot: number; type: { name: string } }>;
};

type SyncResult = {
  sourceCount: number;
  sourceHash: string;
  durationMs: number;
};

function parseIdFromUrl(url: string): number | null {
  const matches = url.match(/\/pokemon\/(\d+)\//);
  if (!matches) {
    return null;
  }
  return Number(matches[1]);
}

function generationOrThrow(id: number): Generation {
  const generation = getGenerationByPokemonId(id);
  if (!generation) {
    throw new Error(`Could not determine generation for pokemon id ${id}`);
  }
  return generation;
}

export function normalizePokemonDetail(detail: PokemonDetailResponse): StoredPokemon {
  return {
    id: detail.id,
    name: detail.name,
    imageUrl: `${SPRITE_BASE}/${detail.id}.png`,
    types: detail.types
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type.name),
    generation: generationOrThrow(detail.id),
  };
}

async function fetchPokemonList(): Promise<Array<{ id: number; name: string }>> {
  const response = await fetch(`${POKE_API}/pokemon?limit=${TOTAL_POKEMON}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pokemon list (${response.status}).`);
  }
  const payload = (await response.json()) as PokemonListResponse;
  return payload.results
    .map((entry) => {
      const id = parseIdFromUrl(entry.url);
      if (!id) {
        return null;
      }
      return { id, name: entry.name };
    })
    .filter((entry): entry is { id: number; name: string } => entry !== null);
}

async function fetchPokemonDetail(id: number): Promise<PokemonDetailResponse> {
  const response = await fetch(`${POKE_API}/pokemon/${id}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch pokemon detail for id=${id} (${response.status}).`);
  }
  return (await response.json()) as PokemonDetailResponse;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

function buildSourceHash(pokemon: StoredPokemon[]): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(pokemon));
  return hash.digest("hex");
}

async function rebuildRedisGenerationCaches(pokemon: StoredPokemon[]): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }

  const byGeneration = new Map<Generation, StoredPokemon[]>();
  for (const generation of GENERATIONS) {
    byGeneration.set(generation, []);
  }
  for (const entry of pokemon) {
    byGeneration.get(entry.generation)?.push(entry);
  }

  for (const generation of GENERATIONS) {
    const key = buildGenerationCacheKey(generation);
    const payload = serializePokemon(byGeneration.get(generation) ?? []);
    await redis.setEx(key, GENERATION_POKEMON_CACHE_TTL_SECONDS, payload);
  }

  const filteredKeys: string[] = [];
  for await (const key of redis.scanIterator({ MATCH: "pokemon:filtered:*", COUNT: 100 })) {
    filteredKeys.push(String(key));
  }
  if (filteredKeys.length > 0) {
    await redis.del(filteredKeys);
  }
}

async function runSync(): Promise<SyncResult> {
  const startedAt = Date.now();
  const pokemonList = await fetchPokemonList();
  const details = await mapWithConcurrency(pokemonList, DETAIL_FETCH_CONCURRENCY, (entry) =>
    fetchPokemonDetail(entry.id),
  );
  const normalized = details.map(normalizePokemonDetail).sort((a, b) => a.id - b.id);
  const sourceHash = buildSourceHash(normalized);

  await withTransaction(async (client) => {
    await bulkUpsertPokemon(client, normalized);
    await setSyncState(client, {
      sourceCount: normalized.length,
      sourceHash,
      status: "ok",
      lastError: null,
    });
  });

  await rebuildRedisGenerationCaches(normalized);

  return {
    sourceCount: normalized.length,
    sourceHash,
    durationMs: Date.now() - startedAt,
  };
}

export async function syncPokemonDataset(): Promise<SyncResult> {
  try {
    return await runSync();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await withTransaction(async (client) => {
      await setSyncState(client, {
        sourceCount: 0,
        sourceHash: "",
        status: "error",
        lastError: message,
      });
    }).catch(() => {
      // If DB is down, we still rethrow the original sync failure.
    });
    throw error;
  }
}
