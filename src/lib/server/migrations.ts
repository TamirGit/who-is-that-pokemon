import { query } from "@/lib/server/db";

const MIGRATIONS: string[] = [
  `
    CREATE TABLE IF NOT EXISTS pokemon (
      id INT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      types TEXT[] NOT NULL,
      generation INT NOT NULL CHECK (generation BETWEEN 1 AND 9),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS sync_state (
      id INT PRIMARY KEY CHECK (id = 1),
      last_success_at TIMESTAMPTZ,
      source_count INT NOT NULL DEFAULT 0,
      source_hash TEXT,
      status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'ok', 'error')),
      last_error TEXT
    )
  `,
  `
    INSERT INTO sync_state (id, status)
    VALUES (1, 'idle')
    ON CONFLICT (id) DO NOTHING
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_pokemon_generation ON pokemon(generation)
  `,
];

export async function runMigrations(): Promise<void> {
  for (const sql of MIGRATIONS) {
    await query(sql);
  }
}
