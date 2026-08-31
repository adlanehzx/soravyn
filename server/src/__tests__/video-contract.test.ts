import { describe, expect, it } from "vitest";
import { composeVideo, videoInput } from "../services/video-contract.js";
describe("Video input and composition",()=>{
 it("escapes script text instead of executing it",()=>{
  const v=composeVideo({platform:"square",scenes:[{title:'<script>alert(1)</script>',text:'<img src=x onerror="alert(1)">',duration:3}]},{name:"<brand>",colors:["red; background:url(https://evil)"]});
  expect(v.html).not.toContain('<script>alert(1)');expect(v.html).toContain('&lt;script&gt;');expect(v.html).not.toContain('url(https://evil)');expect(v.width).toBe(1080);expect(v.duration).toBe(3);
 });
 it("rejects oversized render durations",()=>{
  expect(videoInput.safeParse({platform:"youtube",scenes:Array.from({length:12},()=>({title:"Title",text:"Text",duration:15}))}).success).toBe(false);
 });
 it("does not accept commands or ownership fields",()=>{
  expect(videoInput.safeParse({platform:"square",scenes:[{title:"Title",text:"Text",duration:3}],command:"evil",companyId:"other"}).success).toBe(false);
 });
});
