import { describe, expect, it } from "vitest";
import { formatUsd, toCents } from "./money";

describe("toCents", () => {
  it.each([
    ["24.95", 2495],
    ["24.9", 2490],
    ["24", 2400],
    ["0.07", 7],
    [19.99, 1999],
  ])("%s -> %d", (input, cents) => expect(toCents(input)).toBe(cents));

  it.each([["-1"], ["1.999"], ["abc"], [""], [null], [undefined]])("rejects %s", (input) =>
    expect(toCents(input as string)).toBeNull(),
  );
});

describe("formatUsd", () => {
  it("formats cents", () => expect(formatUsd(2495)).toBe("$24.95"));
});
