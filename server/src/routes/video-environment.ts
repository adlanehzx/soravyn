import { videoImage } from "../services/video-contract.js";
import { Router } from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { assertBoard, assertCompanyAccess } from "./authz.js";

const execute = promisify(execFile);
async function probe(command: string, args: string[]) {
  try {
    const { stdout, stderr } = await execute(command, args, {
      timeout: 5000, maxBuffer: 32_768,
      env: { PATH: process.env.PATH, HOME: process.env.HOME },
    });
    return { available: true, version: (stdout || stderr).split("\n")[0] };
  } catch {
    return { available: false, version: null };
  }
}

export function videoEnvironmentRoutes() {
  const router = Router();
  router.get("/companies/:companyId/video/environment", async (req, res) => {
    assertCompanyAccess(req, req.params.companyId as string);
    assertBoard(req);
    const [ffmpeg, ffprobe, chromium, docker] = await Promise.all([
      probe("ffmpeg", ["-version"]), probe("ffprobe", ["-version"]),
      probe("chromium", ["--version"]), probe("docker", ["info", "--format", "{{.ServerVersion}}"]),
    ]);
    const image = await probe("docker", ["image", "inspect", "--format", "{{.Id}}", videoImage()]);
    res.json({
      node: { available: Number(process.versions.node.split(".")[0]) >= 22, version: process.versions.node },
      ffmpeg, ffprobe, chromium, sandbox: docker,
      hyperframes: { available: image.available, requiredVersion: "0.6.91", reason: image.available ? undefined : "Build the isolated rendering image with pnpm video:image" },
      narration: { available: image.available, reason: "eSpeak French/English in the video image; image presence does not verify its contents" },
      generationEnabled: false,
      reason: "Queued renders require the separate video worker; its liveness is not verified by this diagnostic",
    });
  });
  return router;
}
