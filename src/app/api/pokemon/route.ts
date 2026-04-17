import { NextRequest, NextResponse } from "next/server";
import { filterPokemonByGenerations, GENERATIONS, type Generation } from "@/lib/generationRules";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const POKE_API = "https://pokeapi.co/api/v2";
const SPRITE_BASE =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";
const CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_DATA_PATH = path.join(process.cwd(), "data", "pokemon-cache.json");

export const runtime = "nodejs";

type PokemonListResponse = {
  results: Array<{ name: string; url: string }>;
};

type CachedPokemon = {
  id: number;
  name: string;
  types: string[];
  imageUrl: string;
};

type CacheValue = {
  expiresAt: number;
  pokemon: CachedPokemon[];
};

const responseCache = new Map<string, CacheValue>();

function parseIdFromUrl(url: string): number | null {
  const matches = url.match(/\/pokemon\/(\d+)\//);
  if (!matches) {
    return null;
  }
  return Number(matches[1]);
}

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

async function readLocalPokemonDataset(): Promise<CachedPokemon[] | null> {
  try {
    const raw = await readFile(LOCAL_DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const normalized = parsed.filter((entry): entry is CachedPokemon => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      const candidate = entry as Partial<CachedPokemon>;
      return (
        typeof candidate.id === "number" &&
        typeof candidate.name === "string" &&
        Array.isArray(candidate.types) &&
        typeof candidate.imageUrl === "string"
      );
    });
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

async function writeLocalPokemonDataset(pokemon: CachedPokemon[]): Promise<void> {
  try {
    await mkdir(path.dirname(LOCAL_DATA_PATH), { recursive: true });
    await writeFile(LOCAL_DATA_PATH, JSON.stringify(pokemon), "utf8");
  } catch {
    // Non-fatal: memory cache still works if local disk cache write fails.
  }
}

async function fetchPokemonPoolFromOrigin(limit: number): Promise<CachedPokemon[]> {
  const listRes = await fetch(`${POKE_API}/pokemon?limit=${limit}`, {
    next: { revalidate: 300 },
  });
  if (!listRes.ok) {
    throw new Error("Failed to load pokemon list.");
  }

  const listData = (await listRes.json()) as PokemonListResponse;
  const fullPool = listData.results
    .map((entry) => {
      const id = parseIdFromUrl(entry.url);
      if (!id) {
        return null;
      }
      return {
        id,
        name: entry.name,
        types: [] as string[],
        imageUrl: `${SPRITE_BASE}/${id}.png`,
      } satisfies CachedPokemon;
    })
    .filter((pokemon): pokemon is CachedPokemon => pokemon !== null);

  return fullPool;
}

async function fetchPokemonPool(limit: number): Promise<CachedPokemon[]> {
  const local = await readLocalPokemonDataset();
  if (local) {
    return local.filter((pokemon) => pokemon.id <= limit);
  }
  const pool = await fetchPokemonPoolFromOrigin(1025);
  await writeLocalPokemonDataset(pool);
  return pool.filter((pokemon) => pokemon.id <= limit);
}

export async function GET(request: NextRequest) {
  try {
    const generations = parseGenerations(request.nextUrl.searchParams.get("generations"));
    if (generations.length === 0) {
      return NextResponse.json({ error: "At least one generation is required." }, { status: 400 });
    }

    const limitParam = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "1025", 10);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 1025) : 1025;
    const cacheKey = `${generations.join(",")}|${limit}`;
    const now = Date.now();

    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({ pokemon: cached.pokemon, source: "cache" });
    }

    const pool = await fetchPokemonPool(limit);
    const generationPool = filterPokemonByGenerations(pool, generations);
    responseCache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      pokemon: generationPool,
    });

    return NextResponse.json({ pokemon: generationPool, source: "origin" });
  } catch {
    return NextResponse.json({ error: "Unable to load pokemon data." }, { status: 500 });
  }
}
