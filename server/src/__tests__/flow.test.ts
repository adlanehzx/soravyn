import { describe, it, expect } from "vitest";
import {
  flowRequest,
  flowRecipe,
  flowUrl,
  checkedPrice,
  flowDirectory,
} from "../services/flow-contract.js";
describe("Flow authorization boundaries", () => {
  it("requires explicit authorization with bounded credits", () => {
    const input = {
      campaignId: "11111111-1111-4111-8111-111111111111",
      prompt: "Create a video about this campaign",
      maxCredits: 20,
      confirmCreditSpend: true,
    };
    expect(flowRequest.safeParse(input).success).toBe(true);
    expect(
      flowRequest.safeParse({ ...input, confirmCreditSpend: false }).success
    ).toBe(false);
    expect(flowRequest.safeParse({ ...input, maxCredits: 1001 }).success).toBe(
      false
    );
  });
  it("rejects off-provider and credential-bearing project URLs", () => {
    for (const url of [
      "http://flow.google.com/",
      "https://evil.test/",
      "https://flow.google.com.evil.test/",
      "https://user:pass@flow.google.com/",
      "https://labs.google/other",
      "https://flow.google.com/?token=secret",
    ])
      expect(() => flowUrl(url)).toThrow();
    expect(flowUrl("https://flow.google.com/project/example")).toContain(
      "flow.google.com"
    );
  });
  it("does not guess prices, including free/unknown or changed labels", () => {
    expect(checkedPrice("20 credits", "20 credits", 20, 20)).toBe(20);
    expect(() => checkedPrice("40 credits", "20 credits", 20, 20)).toThrow();
    expect(() => checkedPrice("20 credits", "20 credits", 20, 10)).toThrow();
  });
  it("requires explicit calibrated selectors and blocks directory traversal", () => {
    expect(
      flowRecipe.safeParse({ projectUrl: "https://flow.google.com/" }).success
    ).toBe(false);
    expect(() => flowDirectory("../../secrets")).toThrow();
  });
});
