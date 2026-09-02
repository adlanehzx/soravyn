// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyCompanyPrefix, extractCompanyPrefixFromPath, toCompanyRelativePath } from "../lib/company-routes";
describe("Studio company navigation",()=>{
 for(const page of ["campaigns","video","library"]){
  it(`keeps ${page} inside the selected client`,()=>{
   expect(applyCompanyPrefix(`/${page}`,"CLIENT")).toBe(`/CLIENT/${page}`);
   expect(extractCompanyPrefixFromPath(`/${page}`)).toBeNull();
   expect(toCompanyRelativePath(`/CLIENT/${page}`)).toBe(`/${page}`);
  });
 }
});
