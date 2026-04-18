import type { PoolClient } from "pg";
import type { Generation } from "@/lib/generationRules";
import type { StoredPokemon, SyncState } from "@/lib/storageTypes";
import { query } from "@/lib/server/db";

type PokemonRow = {
  id: number;
  name: string;
  image_url: string;
  types: string[];
  generation: Generation;
  updated_at: Date;
};

type SyncStateRow = {
  last_success_at: Date | null;
  source_count: number;
  source_hash: string | null;
  status: "ok" | "error" | "idle";
  last_error: string | null;
};

function mapPokemon(row: PokemonRow): StoredPokemon {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    types: row.types,
    generation: row.generation,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getPokemonByGenerations(
  generations: Generation[],
  limit = 1025,
): Promise<StoredPokemon[]> {
  const result = await query<PokemonRow>(
    `
      SELECT id, name, image_url, types, generation, updated_at
      FROM pokemon
      WHERE generation = ANY($1::int[])
        AND id <= $2
      ORDER BY id ASC
    `,
    [generations, limit],
  );
  return result.rows.map(mapPokemon);
}

export async function getPokemonByGeneration(generation: Generation): Promise<StoredPokemon[]> {
  const result = await query<PokemonRow>(
    `
      SELECT id, name, image_url, types, generation, updated_at
      FROM pokemon
      WHERE generation = $1
      ORDER BY id ASC
    `,
    [generation],
  );
  return result.rows.map(mapPokemon);
}

export async function getPokemonCount(): Promise<number> {
  const result = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM pokemon`);
  const raw = result.rows[0]?.count ?? "0";
  return Number.parseInt(raw, 10) || 0;
}

export async function bulkUpsertPokemon(client: PoolClient, pokemon: StoredPokemon[]): Promise<void> {
  await client.query(`
    CREATE TEMP TABLE pokemon_stage (
      id INT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      types TEXT[] NOT NULL,
      generation INT NOT NULL
    ) ON COMMIT DROP
  `);

  const chunkSize = 200;
  for (let index = 0; index < pokemon.length; index += chunkSize) {
    const chunk = pokemon.slice(index, index + chunkSize);
    const values: unknown[] = [];
    const placeholders = chunk
      .map((entry, chunkIndex) => {
        const offset = chunkIndex * 5;
        values.push(entry.id, entry.name, entry.imageUrl, entry.types, entry.generation);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      })
      .join(", ");

    await client.query(
      `INSERT INTO pokemon_stage (id, name, image_url, types, generation) VALUES ${placeholders}`,
      values,
    );
  }

  await client.query(`
    INSERT INTO pokemon (id, name, image_url, types, generation, updated_at)
    SELECT id, name, image_url, types, generation, NOW()
    FROM pokemon_stage
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      image_url = EXCLUDED.image_url,
      types = EXCLUDED.types,
      generation = EXCLUDED.generation,
      updated_at = NOW()
  `);

  await client.query(`
    DELETE FROM pokemon target
    WHERE NOT EXISTS (
      SELECT 1 FROM pokemon_stage stage WHERE stage.id = target.id
    )
  `);
}

export async function setSyncState(
  client: PoolClient,
  state: { sourceCount: number; sourceHash: string; status: "ok" | "error"; lastError: string | null },
): Promise<void> {
  await client.query(
    `
      INSERT INTO sync_state (id, last_success_at, source_count, source_hash, status, last_error)
      VALUES (1, CASE WHEN $3 = 'ok' THEN NOW() ELSE NULL END, $1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        last_success_at = CASE
          WHEN EXCLUDED.status = 'ok' THEN EXCLUDED.last_success_at
          ELSE sync_state.last_success_at
        END,
        source_count = EXCLUDED.source_count,
        source_hash = EXCLUDED.source_hash,
        status = EXCLUDED.status,
        last_error = EXCLUDED.last_error
    `,
    [state.sourceCount, state.sourceHash, state.status, state.lastError],
  );
}

export async function getSyncState(): Promise<SyncState | null> {
  const result = await query<SyncStateRow>(
    `
      SELECT last_success_at, source_count, source_hash, status, last_error
      FROM sync_state
      WHERE id = 1
    `,
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    lastSuccessAt: row.last_success_at ? row.last_success_at.toISOString() : null,
    sourceCount: row.source_count,
    sourceHash: row.source_hash,
    status: row.status,
    lastError: row.last_error,
  };
}
