import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/pokemon/route";
import { runMigrations } from "@/lib/server/migrations";
import { closeDbPool, query } from "@/lib/server/db";
import { disconnectRedis, getRedisClient } from "@/lib/server/redis";

const hasIntegrationEnv = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const describeIf = hasIntegrationEnv ? describe : describe.skip;

async function clearRedisKeys(): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }
  await redis.flushAll();
}

describeIf("GET /api/pokemon (integration, real DB + Redis)", () => {
  beforeAll(async () => {
    await runMigrations();
  });

  beforeEach(async () => {
    await query("TRUNCATE TABLE pokemon RESTART IDENTITY CASCADE");
    await clearRedisKeys();

    await query(
      `
        INSERT INTO pokemon (id, name, image_url, types, generation, updated_at)
        VALUES
          (1, 'bulbasaur', 'https://example.com/1.png', ARRAY['grass','poison']::text[], 1, NOW()),
          (4, 'charmander', 'https://example.com/4.png', ARRAY['fire']::text[], 1, NOW()),
          (152, 'chikorita', 'https://example.com/152.png', ARRAY['grass']::text[], 2, NOW())
      `,
    );
  });

  afterAll(async () => {
    await disconnectRedis();
    await closeDbPool();
  });

  it("returns expected payload and serves from redis on repeated call", async () => {
    const request = {
      nextUrl: new URL("http://localhost/api/pokemon?generations=1,2&limit=200"),
    } as never;

    const first = await GET(request);
    const firstPayload = (await first.json()) as {
      source: string;
      pokemon: Array<{ id: number; generation: number }>;
    };
    expect(["db", "redis"]).toContain(firstPayload.source);
    expect(firstPayload.pokemon.map((entry) => entry.id)).toEqual([1, 4, 152]);

    const second = await GET(request);
    const secondPayload = (await second.json()) as {
      source: string;
      pokemon: Array<{ id: number; generation: number }>;
    };
    expect(secondPayload.source).toBe("redis");
    expect(secondPayload.pokemon.map((entry) => entry.id)).toEqual([1, 4, 152]);
  });

  it("returns only selected generations and applies id limit", async () => {
    const request = {
      nextUrl: new URL("http://localhost/api/pokemon?generations=2&limit=151"),
    } as never;

    const response = await GET(request);
    const payload = (await response.json()) as { pokemon: Array<{ id: number }> };
    expect(payload.pokemon).toEqual([]);
  });
});
