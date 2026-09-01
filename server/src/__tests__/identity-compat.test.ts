import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { applyLegacyEnvironment } from "@soravyn/shared";
import { verifyLocalAgentJwt } from "../agent-auth-jwt.js";
import { normalizeLegacyApiFields } from "../legacy-api-compat.js";
afterEach(()=>vi.unstubAllEnvs());
function storage(seed:Record<string,string>={}){const values=new Map(Object.entries(seed));return {get length(){return values.size;},key:(i:number)=>[...values.keys()][i]??null,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};}
describe("SORAVYN upgrade compatibility",()=>{
 it("preserves canonical settings and resolves legacy priority",()=>{
  const env=applyLegacyEnvironment({SORAVYN_HOME:"/current",OPENSOUL_HOME:"/older",PAPERCLIP_HOME:"/oldest",OPENSOUL_PORT:"3201",PAPERCLIP_PORT:"3202",PAPERCLIP_API_KEY:"test"});
  expect(env.SORAVYN_HOME).toBe("/current");expect(env.SORAVYN_PORT).toBe("3201");expect(env.SORAVYN_API_KEY).toBe("test");
 });
 it("migrates browser preferences and drafts without deleting the original or overwriting new values",()=>{
  const local=storage({"opensoul.selectedCompanyId":"client-a","paperclip:issue-comment-draft:one":"Draft","opensoul.theme":"dark","soravyn.theme":"light"});
  const session=storage({"paperclip.sidebar":"closed"});
  runInNewContext(readFileSync(new URL("../../../ui/public/legacy-storage.js",import.meta.url),"utf8"),{window:{localStorage:local,sessionStorage:session}});
  expect(local.getItem("soravyn.selectedCompanyId")).toBe("client-a");expect(local.getItem("soravyn:issue-comment-draft:one")).toBe("Draft");expect(local.getItem("soravyn.theme")).toBe("light");expect(local.getItem("opensoul.theme")).toBe("dark");expect(session.getItem("soravyn.sidebar")).toBe("closed");
 });
 it("does not block startup when storage is denied",()=>{
  expect(()=>runInNewContext(readFileSync(new URL("../../../ui/public/legacy-storage.js",import.meta.url),"utf8"),{window:{get localStorage(){throw new Error("denied");},get sessionStorage(){throw new Error("denied");}}})).not.toThrow();
 });
 it("accepts a correctly signed unexpired token issued before the rebrand",()=>{
  vi.stubEnv("SORAVYN_AGENT_JWT_SECRET","compat-test-key");vi.stubEnv("SORAVYN_AGENT_JWT_ISSUER",undefined);vi.stubEnv("SORAVYN_AGENT_JWT_AUDIENCE",undefined);
  const now=Math.floor(Date.now()/1000);const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString("base64url");
  const body=`${encode({alg:"HS256"})}.${encode({sub:"agent",company_id:"client",adapter_type:"process",run_id:"run",iat:now,exp:now+60,iss:"paperclip",aud:"paperclip-api"})}`;
  const token=`${body}.${createHmac("sha256","compat-test-key").update(body).digest("base64url")}`;
  expect(verifyLocalAgentJwt(token)?.sub).toBe("agent");
  vi.stubEnv("SORAVYN_AGENT_JWT_ISSUER","custom-issuer");expect(verifyLocalAgentJwt(token)).toBeNull();
 });
 it("normalizes saved gateway settings and ignores prototype setters",()=>{
  const result=normalizeLegacyApiFields(JSON.parse('{"config":{"paperclipApiUrl":"http://localhost:3200"},"__proto__":{"polluted":true}}')) as {config:{soravynApiUrl:string}};
  expect(result.config.soravynApiUrl).toBe("http://localhost:3200");expect(({} as {polluted?:boolean}).polluted).toBeUndefined();
 });
});
