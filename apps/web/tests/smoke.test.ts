import { describe, expect, it } from "vitest";

describe("web shell", () => {
  it("has a basic sanity test", () => {
    expect("Lumio".toLowerCase()).toBe("lumio");
  });
});
