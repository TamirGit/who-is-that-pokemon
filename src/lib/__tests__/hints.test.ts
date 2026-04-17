import { describe, expect, it } from "vitest";
import { buildHintMask, formatHintMask } from "@/lib/hints";

describe("buildHintMask", () => {
  it("reveals progressively more letters", () => {
    const hard = buildHintMask("pikachu", 1);
    const medium = buildHintMask("pikachu", 2);
    const easy = buildHintMask("pikachu", 3);

    expect(hard).toBe("pi_____");
    expect(medium).toBe("pika___");
    expect(easy).toBe("pikach_");
  });

  it("never reveals all letters", () => {
    const mask = buildHintMask("mew", 3);
    expect(mask).toBe("me_");
  });
});

describe("formatHintMask", () => {
  it("separates characters so hidden letters are countable", () => {
    expect(formatHintMask("pi_____")).toBe("p i _ _ _ _ _");
  });
});
