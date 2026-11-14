import { describe, expect, it } from "vitest";
import type { Db } from "@soravyn/db";
import type { Request, Response } from "express";
import { actorMiddleware } from "../middleware/auth.js";

describe("Explicit invalid credentials in local mode", () => {
  for (const authorization of [
    "Basic invalid",
    "Bearer ",
    "Bearer invalid-token",
  ]) {
    it(`does not inherit the local administrator for ${
      authorization.split(" ")[0]
    }`, async () => {
      const db = {
        select: () => ({ from: () => ({ where: async () => [] }) }),
      } as unknown as Db;
      const request = {
        header: (name: string) =>
          name === "authorization" ? authorization : undefined,
      } as Request;
      await actorMiddleware(db, { deploymentMode: "local_trusted" })(
        request,
        {} as Response,
        () => {}
      );
      expect(request.actor.type).toBe("none");
    });
  }
  it("keeps the documented local operator when no credentials are supplied", async () => {
    const request = { header: () => undefined } as unknown as Request;
    await actorMiddleware({} as Db, { deploymentMode: "local_trusted" })(
      request,
      {} as Response,
      () => {}
    );
    expect(request.actor).toMatchObject({
      type: "board",
      source: "local_implicit",
    });
  });
});
