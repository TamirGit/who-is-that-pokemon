import { NextResponse } from "next/server";
import { isAuthorizedInternalRequest } from "@/lib/server/internalAuth";
import { syncPokemonDataset } from "@/lib/server/syncPokemonDataset";
import { runMigrations } from "@/lib/server/migrations";

export const runtime = "nodejs";

async function handleSync(request: Request) {
  if (!isAuthorizedInternalRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runMigrations();
    const result = await syncPokemonDataset();
    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
