import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  describeLocalInstancePaths,
  expandHomePrefix,
  resolveSoravynHomeDir,
  resolveSoravynInstanceId,
} from "../config/home.js";

const ORIGINAL_ENV = { ...process.env };

describe("home path resolution", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it("defaults to ~/.soravyn for a clean home", () => {
    vi.spyOn(fs,"existsSync").mockReturnValue(false);
    delete process.env.SORAVYN_HOME;
    delete process.env.SORAVYN_INSTANCE_ID;

    const paths = describeLocalInstancePaths();
    expect(paths.homeDir).toBe(path.resolve(os.homedir(), ".soravyn"));
    expect(paths.instanceId).toBe("default");
    expect(paths.configPath).toBe(path.resolve(os.homedir(), ".soravyn", "instances", "default", "config.json"));
  });

  it("supports SORAVYN_HOME and explicit instance ids", () => {
    process.env.SORAVYN_HOME = "~/soravyn-home";

    const home = resolveSoravynHomeDir();
    expect(home).toBe(path.resolve(os.homedir(), "soravyn-home"));
    expect(resolveSoravynInstanceId("dev_1")).toBe("dev_1");
  });

  it("rejects invalid instance ids", () => {
    expect(() => resolveSoravynInstanceId("bad/id")).toThrow(/Invalid instance id/);
  });

  it("expands ~ prefixes", () => {
    expect(expandHomePrefix("~")).toBe(os.homedir());
    expect(expandHomePrefix("~/x/y")).toBe(path.resolve(os.homedir(), "x/y"));
  });
});
