"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GenerationSelector } from "@/components/GenerationSelector";
import type { Generation } from "@/lib/generationRules";

export default function HomePage() {
  const router = useRouter();
  const [selectedGenerations, setSelectedGenerations] = useState<Generation[]>([]);
  const canStart = selectedGenerations.length > 0;

  const startGame = () => {
    if (!canStart) {
      return;
    }
    const query = encodeURIComponent(selectedGenerations.join(","));
    router.push(`/game?generations=${query}`);
  };

  return (
    <main className="container">
      <h1>Who&apos;s That Pokemon?</h1>
      <p>Pick one or more generations to create your Pokemon pool.</p>
      <GenerationSelector selected={selectedGenerations} onChange={setSelectedGenerations} />
      <p>
        Selected:{" "}
        {selectedGenerations.length === 0
          ? "None"
          : selectedGenerations.map((generation) => `Gen ${generation}`).join(", ")}
      </p>
      <button onClick={startGame} disabled={!canStart} aria-disabled={!canStart}>
        Start game
      </button>
    </main>
  );
}
