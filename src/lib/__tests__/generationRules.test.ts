import { describe, expect, it } from "vitest";
import {
  filterPokemonByGenerations,
  getGenerationByPokemonId,
  type PokemonLite,
} from "@/lib/generationRules";

const SAMPLE: PokemonLite[] = [
  { id: 1, name: "bulbasaur", types: ["grass", "poison"] },
  { id: 152, name: "chikorita", types: ["grass"] },
  { id: 387, name: "turtwig", types: ["grass"] },
  { id: 810, name: "grookey", types: ["grass"] },
];

describe("filterPokemonByGenerations", () => {
  it("returns pokemon matching one generation", () => {
    const pool = filterPokemonByGenerations(SAMPLE, [1]);
    expect(pool.map((p) => p.name)).toEqual(["bulbasaur"]);
  });

  it("supports combined generations in canonical order with dedupe", () => {
    const pool = filterPokemonByGenerations(SAMPLE, [8, 2, 8]);
    expect(pool.map((p) => p.name)).toEqual(["chikorita", "grookey"]);
  });
});

describe("getGenerationByPokemonId", () => {
  it("maps national dex boundaries correctly", () => {
    expect(getGenerationByPokemonId(151)).toBe(1);
    expect(getGenerationByPokemonId(152)).toBe(2);
    expect(getGenerationByPokemonId(905)).toBe(8);
    expect(getGenerationByPokemonId(906)).toBe(9);
    expect(getGenerationByPokemonId(2000)).toBeNull();
  });
});
