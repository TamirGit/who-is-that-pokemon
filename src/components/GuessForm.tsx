"use client";

import { FormEvent, useState } from "react";

type Props = {
  disabled?: boolean;
  onSubmit: (guess: string) => void;
};

export function GuessForm({ disabled, onSubmit }: Props) {
  const [guess, setGuess] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!guess.trim()) {
      return;
    }
    onSubmit(guess);
    setGuess("");
  };

  return (
    <form className="guess-form" onSubmit={handleSubmit}>
      <input
        value={guess}
        onChange={(event) => setGuess(event.target.value)}
        placeholder="Type your guess..."
        aria-label="Guess pokemon name"
        disabled={disabled}
      />
      <button type="submit" disabled={disabled}>
        Guess
      </button>
    </form>
  );
}
