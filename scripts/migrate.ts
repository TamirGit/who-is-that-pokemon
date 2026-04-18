import { runMigrations } from "../src/lib/server/migrations";
import { closeDbPool } from "../src/lib/server/db";
import { disconnectRedis } from "../src/lib/server/redis";

async function main() {
  await runMigrations();
  console.log("Migrations complete.");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectRedis();
    await closeDbPool();
  });
