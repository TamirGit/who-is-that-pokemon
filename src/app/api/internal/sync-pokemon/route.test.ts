import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    runMigrations: vi.fn(),
    syncPokemonDataset: vi.fn(),
  };
});

vi.mock("@/lib/server/migrations", () => ({
  runMigrations: mocks.runMigrations,
}));

vi.mock("@/lib/server/syncPokemonDataset", () => ({
  syncPokemonDataset: mocks.syncPokemonDataset,
}));

import { POST } from "@/app/api/internal/sync-pokemon/route";

describe("POST /api/internal/sync-pokemon", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SYNC_API_SECRET = "test-secret";
  });

  it("returns 401 when request is unauthorized", async () => {
    const response = await POST(new Request("http://localhost/api/internal/sync-pokemon", { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("runs sync when authorized", async () => {
    mocks.syncPokemonDataset.mockResolvedValue({
      sourceCount: 1025,
      sourceHash: "abc",
      durationMs: 1000,
    });

    const response = await POST(
      new Request("http://localhost/api/internal/sync-pokemon", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret",
        },
      }),
    );

    const payload = (await response.json()) as { ok: boolean; sourceCount: number };
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.sourceCount).toBe(1025);
    expect(mocks.runMigrations).toHaveBeenCalled();
    expect(mocks.syncPokemonDataset).toHaveBeenCalled();
  });
});
