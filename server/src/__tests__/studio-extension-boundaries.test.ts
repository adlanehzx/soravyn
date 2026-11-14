import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { studioExtensionRoutes } from "../routes/studio-extensions.js";
import { videoCollaborationRoutes } from "../routes/video-collaboration.js";
import { clientReviewRoutes } from "../routes/client-review.js";
import { HttpError } from "../errors.js";
import { type Db } from "@soravyn/db";
const company="11111111-1111-4111-8111-111111111111";const id="22222222-2222-4222-8222-222222222222";
function app(actor:Record<string,unknown>){const app=express();app.use(express.json());app.use((req,_res,next)=>{Object.assign(req,{actor});next();});app.use(studioExtensionRoutes({} as Db));app.use(videoCollaborationRoutes({} as Db));app.use('/client-review',clientReviewRoutes({} as Db));app.use((err:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>res.status(err instanceof HttpError?err.status:500).json({error:err.message}));return app;}
describe("Extension authorization before storage access",()=>{
 for(const resource of [`/companies/${company}/studio/campaigns/${id}/creative-packs`,`/companies/${company}/studio/campaigns/${id}/copy`,`/companies/${company}/studio/campaigns/${id}/budget`,`/companies/${company}/video/jobs/${id}/notes`,`/companies/${company}/video/jobs/${id}/review-links`]){
  it(`rejects an unrelated company member for ${resource}`,async()=>{expect((await request(app({type:"board",source:"session",companyIds:[id]})).get(resource)).status).toBe(403);});
 }
 it("does not grant an agent board-only creative controls",async()=>{expect((await request(app({type:"agent",companyId:company})).post(`/companies/${company}/studio/campaigns/${id}/creative-packs`).send({platform:"square"})).status).toBe(403);});
 it("rejects missing or malformed client capability before reading any job",async()=>{for(const token of ["","guess"]){const response=await request(app({type:"none"})).get(`/client-review/${id}`).set('x-client-review',token);expect(response.status).toBe(403);}});
});
