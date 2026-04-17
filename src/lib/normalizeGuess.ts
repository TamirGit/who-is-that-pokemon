export function normalizeGuess(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9- ]/g, "")
    .replace(/\s+/g, " ");
}

export function isCorrectGuess(guess: string, answer: string): boolean {
  return normalizeGuess(guess) === normalizeGuess(answer);
}
