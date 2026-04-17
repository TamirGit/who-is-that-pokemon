export const MAX_HINT_LEVEL = 3;

export type HintLevel = 0 | 1 | 2 | 3;

const HINT_LABELS: Record<Exclude<HintLevel, 0>, string> = {
  1: "Hard",
  2: "Medium",
  3: "Easy",
};

export function getHintLabel(level: Exclude<HintLevel, 0>): string {
  return HINT_LABELS[level];
}

export function buildHintMask(name: string, level: Exclude<HintLevel, 0>): string {
  const normalized = name.trim().toLowerCase();
  const chars = normalized.split("");
  const letterIndexes = chars
    .map((char, index) => ({ char, index }))
    .filter((entry) => /[a-z]/.test(entry.char))
    .map((entry) => entry.index);

  if (letterIndexes.length === 0) {
    return normalized;
  }

  const maxRevealableLetters = Math.max(1, letterIndexes.length - 1);
  const targetRevealCount = Math.max(
    1,
    Math.min(
      maxRevealableLetters,
      Math.ceil((maxRevealableLetters * level) / MAX_HINT_LEVEL),
    ),
  );

  const revealIndexes = new Set<number>([
    letterIndexes[0],
    ...letterIndexes.slice(1, targetRevealCount),
  ]);

  return chars
    .map((char, index) => {
      if (!/[a-z]/.test(char)) {
        return char;
      }
      return revealIndexes.has(index) ? char : "_";
    })
    .join("");
}

export function formatHintMask(mask: string): string {
  return mask.split("").join(" ");
}
