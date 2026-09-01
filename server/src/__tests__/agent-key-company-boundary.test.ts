import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { Db } from "@soravyn/db";
import { HttpError } from "../errors.js";
vi.mock("../services/index.js",()=>({agentService:()=>({getById:async()=>({id:"11111111-1111-4111-8111-111111111111",companyId:"client-a"})}),accessService:()=>({}),approvalService:()=>({}),heartbeatService:()=>({}),issueApprovalService:()=>({}),issueService:()=>({}),secretService:()=>({}),logActivity:vi.fn()}));
import { agentRoutes } from "../routes/agents.js";
describe("Agent key operations enforce client membership",()=>{
 for(const method of ["get","post","delete"] as const){it(`denies foreign-client ${method} keys`,async()=>{
  const app=express();app.use(express.json());app.use((req,_res,next)=>{Object.assign(req,{actor:{type:"board",userId:"user-b",source:"session",isInstanceAdmin:false,companyIds:["client-b"]}});next();});app.use(agentRoutes({} as Db));app.use((err:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(err instanceof HttpError?err.status:500).json({error:err.message}));
  const path='/agents/11111111-1111-4111-8111-111111111111/keys'+(method==='delete'?'/key-a':'');expect((await request(app)[method](path).send({name:'test'})).status).toBe(403);
 });}
});
