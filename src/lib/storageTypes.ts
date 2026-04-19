import type { Generation } from "@/lib/generationRules";

export type StoredPokemon = {
  id: number;
  name: string;
  imageUrl: string;
  types: string[];
  generation: Generation;
  updatedAt?: string;
};

export type SyncState = {
  lastSuccessAt: string | null;
  sourceCount: number;
  sourceHash: string | null;
  status: "ok" | "error" | "idle";
  lastError: string | null;
};
