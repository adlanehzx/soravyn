import { afterEach, describe, expect, it, vi } from "vitest";
import { generateVideoScript, localScriptConfig } from "../services/video-script.js";
afterEach(()=>vi.unstubAllEnvs());
describe("Local script provider (mocked HTTP)",()=>{
 it("rejects nonlocal provider endpoints",()=>{vi.stubEnv("SORAVYN_OLLAMA_URL","https://example.com");expect(()=>localScriptConfig()).toThrow();});
 it("validates the model response and fixes the requested format",async()=>{
  vi.stubEnv("SORAVYN_OLLAMA_MODEL","test-model");vi.stubEnv("SORAVYN_OLLAMA_URL","http://127.0.0.1:11434");
  const fake=vi.fn().mockResolvedValue(new Response(JSON.stringify({response:JSON.stringify({platform:"youtube",scenes:[{title:"Title",text:"Text",duration:4}]})})));
  const script=await generateVideoScript({brand:"Client"},"square",fake as typeof fetch);expect(script.platform).toBe("square");expect(script.scenes).toHaveLength(1);
  expect(JSON.parse(fake.mock.calls[0][1].body).stream).toBe(false);
 });
 it("rejects executable fields returned by a model",async()=>{
  vi.stubEnv("SORAVYN_OLLAMA_MODEL","test-model");vi.stubEnv("SORAVYN_OLLAMA_URL","http://127.0.0.1:11434");
  const fake=vi.fn().mockResolvedValue(new Response(JSON.stringify({response:JSON.stringify({platform:"square",scenes:[{title:"X",text:"Y",duration:4}],command:"evil"})})));
  await expect(generateVideoScript({},"square",fake as typeof fetch)).rejects.toThrow();
 });
});
