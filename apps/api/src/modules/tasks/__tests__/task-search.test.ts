import { describe, expect, it } from "vitest";

import { escapeRegExp } from "../../../utils/regex.js";
import { buildTaskSearchFilter } from "../task.repository.js";

describe("escapeRegExp", () => {
  it("leaves plain text untouched", () => {
    expect(escapeRegExp("Fix login bug")).toBe("Fix login bug");
  });

  it("escapes every regex metacharacter", () => {
    expect(escapeRegExp("(a+)+$.*好吃?")).toBe(
      "\\(a\\+\\)\\+\\$\\.\\*好吃\\?",
    );
  });
});

describe("buildTaskSearchFilter", () => {
  it("builds a case-insensitive literal match on title/description", () => {
    expect(buildTaskSearchFilter("API-42 (urgent)")).toEqual([
      { title: { $regex: "API-42 \\(urgent\\)", $options: "i" } },
      {
        description: { $regex: "API-42 \\(urgent\\)", $options: "i" },
      },
    ]);
  });

  it("neutralizes ReDoS-style input", () => {
    const [clause] = buildTaskSearchFilter("(a+)+$");

    expect((clause as { title: { $regex: string } }).title.$regex).toBe(
      "\\(a\\+\\)\\+\\$",
    );
    expect(() =>
      new RegExp(
        (clause as { title: { $regex: string } }).title.$regex,
      ).test("(a+)+$"),
    ).not.toThrow();
  });
});
