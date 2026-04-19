import { createClient } from "redis";

type AppRedisClient = ReturnType<typeof createClient>;

let redisClientPromise: Promise<AppRedisClient | null> | null = null;

async function connectRedis(): Promise<AppRedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  const client = createClient({ url });
  client.on("error", (error) => {
    console.error("Redis error:", error);
  });

  try {
    await client.connect();
    return client;
  } catch (error) {
    console.error("Unable to connect to Redis:", error);
    return null;
  }
}

export async function getRedisClient(): Promise<AppRedisClient | null> {
  if (!redisClientPromise) {
    redisClientPromise = connectRedis();
  }
  return redisClientPromise;
}

export async function disconnectRedis(): Promise<void> {
  if (!redisClientPromise) {
    return;
  }
  const client = await redisClientPromise;
  if (client) {
    await client.quit().catch(async () => {
      await client.disconnect();
    });
  }
  redisClientPromise = null;
}
