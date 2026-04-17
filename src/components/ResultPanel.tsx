type Props = {
  answer: string;
  outcome: "correct" | "incorrect" | "skipped";
  scoreText: string;
  onNext: () => void;
  gameFinished: boolean;
  onRestart: () => void;
};

export function ResultPanel({
  answer,
  outcome,
  scoreText,
  onNext,
  gameFinished,
  onRestart,
}: Props) {
  const title =
    outcome === "correct" ? "Correct!" : outcome === "skipped" ? "Skipped." : "Nope!";

  return (
    <section className="result-panel">
      <p>{title}</p>
      <p>It was: {answer}</p>
      <p>{scoreText}</p>
      {gameFinished ? (
        <button onClick={onRestart}>Play again</button>
      ) : (
        <button onClick={onNext}>Next pokemon</button>
      )}
    </section>
  );
}
