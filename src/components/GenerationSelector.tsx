"use client";

import { GENERATIONS, type Generation } from "@/lib/generationRules";

type Props = {
  selected: Generation[];
  onChange: (value: Generation[]) => void;
};

export function GenerationSelector({ selected, onChange }: Props) {
  const onToggle = (generation: Generation, checked: boolean) => {
    if (checked) {
      const next = new Set([...selected, generation]);
      onChange(Array.from(next));
      return;
    }
    onChange(selected.filter((entry) => entry !== generation));
  };

  return (
    <fieldset className="season-box">
      <legend>Choose generations</legend>
      <div className="season-list">
        {GENERATIONS.map((generation) => (
          <label key={generation} className="season-item">
            <input
              id={`generation-${generation}`}
              type="checkbox"
              checked={selected.includes(generation)}
              onChange={(event) => onToggle(generation, event.currentTarget.checked)}
            />
            <span>Generation {generation}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
