export const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type Generation = (typeof GENERATIONS)[number];

export type PokemonLite = {
  id: number;
  name: string;
  types: string[];
};

const GENERATION_ID_RANGES: Record<Generation, readonly [number, number]> = {
  1: [1, 151],
  2: [152, 251],
  3: [252, 386],
  4: [387, 493],
  5: [494, 649],
  6: [650, 721],
  7: [722, 809],
  8: [810, 905],
  9: [906, 1025],
};

export function validateGenerationSelection(selected: Generation[]): Generation[] {
  const unique = new Set(selected);
  return GENERATIONS.filter((generation) => unique.has(generation));
}

export function pokemonMatchesGeneration(pokemon: PokemonLite, generation: Generation): boolean {
  const [minId, maxId] = GENERATION_ID_RANGES[generation];
  return pokemon.id >= minId && pokemon.id <= maxId;
}

export function filterPokemonByGenerations<T extends PokemonLite>(
  pokemon: T[],
  selected: Generation[],
): T[] {
  const valid = validateGenerationSelection(selected);
  if (valid.length === 0) {
    return [];
  }

  const seen = new Set<number>();
  const result: T[] = [];

  for (const candidate of pokemon) {
    const isInPool = valid.some((generation) => pokemonMatchesGeneration(candidate, generation));
    if (isInPool && !seen.has(candidate.id)) {
      seen.add(candidate.id);
      result.push(candidate);
    }
  }

  return result;
}
