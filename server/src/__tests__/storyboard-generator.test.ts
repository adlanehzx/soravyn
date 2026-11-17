import { describe, it, expect } from "vitest";
import { resolvePlatform, resolveTemplate } from "../services/storyboard-generator.js";

describe("Storyboard Generator Unit Tests", () => {
  describe("resolvePlatform", () => {
    it("maps 16:9 or YouTube formats to youtube", () => {
      expect(resolvePlatform("Video 16:9", "YouTube")).toBe("youtube");
      expect(resolvePlatform("Format Paysage", "YouTube")).toBe("youtube");
      expect(resolvePlatform(null, "YouTube")).toBe("youtube");
    });

    it("maps Square or LinkedIn to square", () => {
      expect(resolvePlatform("Square 1:1", "LinkedIn")).toBe("square");
      expect(resolvePlatform("Carrousel", "LinkedIn")).toBe("square");
    });

    it("maps Reels or Instagram to reels", () => {
      expect(resolvePlatform("Reels 9:16", "Instagram")).toBe("reels");
    });

    it("maps Shorts to shorts", () => {
      expect(resolvePlatform("Shorts 9:16", "YouTube")).toBe("shorts");
    });

    it("maps TikTok and 9:16 vertical to tiktok by default", () => {
      expect(resolvePlatform("Short 9:16", "TikTok")).toBe("tiktok");
      expect(resolvePlatform("Vertical", "TikTok")).toBe("tiktok");
    });

    it("uses fallback when unspecified", () => {
      expect(resolvePlatform(null, null, "tiktok")).toBe("tiktok");
    });
  });

  describe("resolveTemplate", () => {
    it("resolves product template when angle or format mentions demo/product", () => {
      expect(resolveTemplate("Démonstration produit en situation", null)).toBe("product");
      expect(resolveTemplate(null, "Product Demo")).toBe("product");
    });

    it("resolves launch template when angle mentions launch/hook/nouveauté", () => {
      expect(resolveTemplate("Lancement officiel de la solution", null)).toBe("launch");
      expect(resolveTemplate("Nouveauté 2026", null)).toBe("launch");
    });

    it("defaults to editorial template", () => {
      expect(resolveTemplate("Analyse stratégique", "Format court")).toBe("editorial");
    });
  });
});
