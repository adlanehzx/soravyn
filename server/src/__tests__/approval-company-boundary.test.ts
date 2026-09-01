import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { Db } from "@soravyn/db";
import { HttpError } from "../errors.js";
vi.mock("../services/index.js",()=>({approvalService:()=>({getById:async()=>({id:"approval-a",companyId:"client-a"})}),heartbeatService:()=>({}),issueApprovalService:()=>({}),secretService:()=>({}),logActivity:vi.fn()}));
import { approvalRoutes } from "../routes/approvals.js";
describe("Approval decisions enforce the client boundary before mutation",()=>{
 for(const action of ["approve","reject","request-revision"]){it(`rejects foreign-client ${action}`,async()=>{
  const app=express();app.use(express.json());app.use((req,_res,next)=>{Object.assign(req,{actor:{type:"board",userId:"user-b",source:"session",isInstanceAdmin:false,companyIds:["client-b"]}});next();});app.use(approvalRoutes({} as Db));app.use((error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(error instanceof HttpError?error.status:500).json({error:error.message}));
  expect((await request(app).post(`/approvals/approval-a/${action}`).send({decisionNote:"foreign"})).status).toBe(403);
 });}
});
