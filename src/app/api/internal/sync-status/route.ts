import { NextResponse } from "next/server";
import { getSyncState } from "@/lib/server/pokemonRepository";
import { isAuthorizedInternalRequest } from "@/lib/server/internalAuth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAuthorizedInternalRequest(request.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await getSyncState();
    return NextResponse.json({
      ok: true,
      state,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown status error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
