"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GuessForm } from "@/components/GuessForm";
import { ResultPanel } from "@/components/ResultPanel";
import { SilhouetteCard } from "@/components/SilhouetteCard";
import {
  pickRandomPokemon,
  scoreGuess,
  updateScore,
  type GamePokemon,
  type RoundState,
  type ScoreState,
} from "@/lib/gameEngine";
import {
  buildHintMask,
  formatHintMask,
  getHintLabel,
  MAX_HINT_LEVEL,
  type HintLevel,
} from "@/lib/hints";
import { fetchGenerationPokemonPool } from "@/lib/pokemonApi";
import { GENERATIONS, type Generation } from "@/lib/generationRules";

function parseGenerations(value: string | null): Generation[] {
  if (!value) {
    return [];
  }
  const parts = value
    .split(",")
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isFinite(entry));
  const set = new Set(parts);
  return GENERATIONS.filter((generation) => set.has(generation));
}

function createRound(pool: GamePokemon[], usedIds: Set<number>): RoundState | null {
  const next = pickRandomPokemon(pool, usedIds);
  if (!next) {
    return null;
  }
  usedIds.add(next.id);
  return {
    current: next,
    revealed: false,
    isCorrect: null,
  };
}

function GamePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedGenerations = useMemo(
    () => parseGenerations(searchParams.get("generations")),
    [searchParams],
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pool, setPool] = useState<GamePokemon[]>([]);
  const [round, setRound] = useState<RoundState | null>(null);
  const [score, setScore] = useState<ScoreState>({ roundsPlayed: 0, correctGuesses: 0 });
  const [usedIds, setUsedIds] = useState<Set<number>>(new Set());
  const [hintLevel, setHintLevel] = useState<HintLevel>(0);
  const [wasSkipped, setWasSkipped] = useState(false);

  const startRound = useCallback(async () => {
    if (selectedGenerations.length === 0) {
      setError("Pick at least one generation from the home page.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const generationPool = await fetchGenerationPokemonPool(selectedGenerations);
      if (generationPool.length === 0) {
        setError("No pokemon found for your generation selection.");
        return;
      }
      const freshUsedIds = new Set<number>();
      const firstRound = createRound(generationPool, freshUsedIds);
      if (!firstRound) {
        setError("Unable to start a round.");
        return;
      }
      setPool(generationPool);
      setUsedIds(freshUsedIds);
      setRound(firstRound);
      setScore({ roundsPlayed: 0, correctGuesses: 0 });
      setHintLevel(0);
      setWasSkipped(false);
    } catch {
      setError("Unable to load pokemon data right now.");
    } finally {
      setLoading(false);
    }
  }, [selectedGenerations]);

  useEffect(() => {
    if (selectedGenerations.length === 0 || loading || round !== null || pool.length > 0 || error) {
      return;
    }
    void startRound();
  }, [selectedGenerations, loading, round, pool.length, error, startRound]);

  const onGuess = (guess: string) => {
    if (!round || round.revealed) {
      return;
    }
    const resolvedRound = scoreGuess(round, guess);
    setRound(resolvedRound);
    setScore((current) => updateScore(current, resolvedRound));
    setWasSkipped(false);
  };

  const onHint = () => {
    if (!round || round.revealed || hintLevel >= MAX_HINT_LEVEL) {
      return;
    }
    setHintLevel((current) => Math.min(current + 1, MAX_HINT_LEVEL) as HintLevel);
  };

  const onSkip = () => {
    if (!round || round.revealed) {
      return;
    }
    const skippedRound: RoundState = {
      ...round,
      revealed: true,
      isCorrect: false,
    };
    setRound(skippedRound);
    setScore((current) => updateScore(current, skippedRound));
    setWasSkipped(true);
  };

  const onNext = () => {
    const cloned = new Set(usedIds);
    const nextRound = createRound(pool, cloned);
    setUsedIds(cloned);
    setRound(nextRound);
    setHintLevel(0);
    setWasSkipped(false);
  };

  const onRestart = () => {
    setRound(null);
    setPool([]);
    setUsedIds(new Set());
    setScore({ roundsPlayed: 0, correctGuesses: 0 });
    setError(null);
    setHintLevel(0);
    setWasSkipped(false);
  };

  if (selectedGenerations.length === 0) {
    return (
      <main className="container">
        <h1>Who&apos;s That Pokemon?</h1>
        <p>No generations selected.</p>
        <button onClick={() => router.push("/")}>Back to generation selector</button>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Who&apos;s That Pokemon?</h1>
      <p>Selected generations: {selectedGenerations.map((generation) => `Gen ${generation}`).join(", ")}</p>

      {!round && loading ? <p>Loading round...</p> : null}

      {error ? <p>{error}</p> : null}

      {round && (
        <>
          <SilhouetteCard
            imageUrl={round.current.imageUrl}
            name={round.current.name}
            revealed={round.revealed}
          />
          {!round.revealed ? (
            <>
              <GuessForm onSubmit={onGuess} />
              <div className="guess-actions">
                <button onClick={onHint} disabled={hintLevel >= MAX_HINT_LEVEL}>
                  {hintLevel >= MAX_HINT_LEVEL
                    ? "All hints used"
                    : `Hint (${getHintLabel((hintLevel + 1) as 1 | 2 | 3)})`}
                </button>
                <button onClick={onSkip}>Skip</button>
              </div>
              {hintLevel > 0 ? (
                <p>
                  Hint ({getHintLabel(hintLevel as 1 | 2 | 3)}):{" "}
                  <strong className="hint-mask">
                    {formatHintMask(buildHintMask(round.current.name, hintLevel as 1 | 2 | 3))}
                  </strong>
                </p>
              ) : null}
            </>
          ) : null}
          {round.revealed && round.isCorrect !== null ? (
            <ResultPanel
              answer={round.current.name}
              outcome={round.isCorrect ? "correct" : wasSkipped ? "skipped" : "incorrect"}
              scoreText={`Score: ${score.correctGuesses}/${score.roundsPlayed}`}
              onNext={onNext}
              gameFinished={pool.length === usedIds.size}
              onRestart={onRestart}
            />
          ) : null}
        </>
      )}

      <button onClick={() => router.push("/")}>Change generations</button>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<main className="container"><p>Loading game...</p></main>}>
      <GamePageContent />
    </Suspense>
  );
}
