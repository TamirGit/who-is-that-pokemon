import { runMigrations } from "../src/lib/server/migrations";
import { getPokemonCount } from "../src/lib/server/pokemonRepository";
import { syncPokemonDataset } from "../src/lib/server/syncPokemonDataset";
import { closeDbPool } from "../src/lib/server/db";
import { disconnectRedis } from "../src/lib/server/redis";

async function main() {
  await runMigrations();
  const existingCount = await getPokemonCount();

  if (existingCount > 0) {
    console.log(`Bootstrap complete. Existing pokemon rows found: ${existingCount}. Skipping sync.`);
    return;
  }

  const result = await syncPokemonDataset();
  console.log(
    `Bootstrap sync complete. count=${result.sourceCount} hash=${result.sourceHash} durationMs=${result.durationMs}`,
  );
}

main()
  .catch((error) => {
    console.error("Bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectRedis();
    await closeDbPool();
  });
