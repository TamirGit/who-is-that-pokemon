import { runMigrations } from "../src/lib/server/migrations";
import { syncPokemonDataset } from "../src/lib/server/syncPokemonDataset";
import { closeDbPool } from "../src/lib/server/db";
import { disconnectRedis } from "../src/lib/server/redis";

async function main() {
  await runMigrations();
  const result = await syncPokemonDataset();
  console.log(
    `Pokemon sync complete. count=${result.sourceCount} hash=${result.sourceHash} durationMs=${result.durationMs}`,
  );
}

main()
  .catch((error) => {
    console.error("Pokemon seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectRedis();
    await closeDbPool();
  });
