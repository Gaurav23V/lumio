import { describe, expect, it } from "vitest";

describe("desktop shell", () => {
  it("has a basic sanity test", () => {
    expect("desktop".toUpperCase()).toBe("DESKTOP");
  });
});
