import { describe, expect, it } from "vitest";
import { normalizeScoutMarkdown } from "./scout-reply";

describe("scout reply markdown", () => {
  it("turns inline bullet dumps into list lines and drops headings and emoji", () => {
    const normalized = normalizeScoutMarkdown(
      "Radar 🛰️ ## Cool location: **Tile 03** **Key evidence:** - **Local deviation:** `-0.013 °C` - **Peak:** `41.898 °C`",
    );
    expect(normalized).not.toMatch(/#/);
    expect(normalized).not.toMatch(/🛰️/);
    expect(normalized).toContain("\n- **Local deviation:**");
    expect(normalized).toContain("\n- **Peak:**");
  });
});
