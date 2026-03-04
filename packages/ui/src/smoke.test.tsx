import { describe, expect, it } from "vitest";
import { BootstrappedBanner } from "./components/BootstrappedBanner";

describe("ui bootstrap", () => {
  it("exports the banner component", () => {
    expect(typeof BootstrappedBanner).toBe("function");
  });
});
