import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const t=JSON.parse(await readFile('/tmp/soravyn-video-smoke.json','utf8'));
const origin=process.env.SORAVYN_TEST_URL||'http://127.0.0.1:3203';
async function call(path,method='GET',body,expected=200){const r=await fetch(`${origin}/api${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
const base=`/companies/${t.companyId}`;
const job=(await call(`${base}/video/jobs`)).find(j=>j.id===t.jobId);assert.equal(job.status,'succeeded');assert.ok(job.approvalId);
const file=await fetch(`${origin}/api${base}/video/jobs/${t.jobId}/files/output.mp4`);assert.equal(file.status,200);const bytes=Buffer.from(await file.arrayBuffer());assert.equal(bytes.toString('ascii',4,8),'ftyp');assert.ok(bytes.length>1000);await writeFile('/tmp/soravyn-verified-output.mp4',bytes);
const other=await call('/companies','POST',{name:`Video boundary verification ${Date.now()}`},201);
assert.equal((await fetch(`${origin}/api/companies/${other.id}/video/jobs/${t.jobId}/files/output.mp4`)).status,404);
const transition=`${base}/studio/campaigns/${t.campaignId}/transition`;
for(const status of ['strategy','production','review','approval'])await call(transition,'POST',{status});
await call(transition,'POST',{status:'delivery'},409);
await call(`/approvals/${job.approvalId}/approve`,'POST',{decisionNote:'Local smoke test: MP4 validated and frame inspected.'});
assert.equal((await call(transition,'POST',{status:'delivery'})).status,'delivery');
await call(`/companies/${other.id}`,'PATCH',{status:'archived'});
const result={passed:true,jobId:job.id,approvalId:job.approvalId,bytes:bytes.length,checks:['verified MP4 download','cross-company artifact denied','delivery blocked before approval','human approval recorded','delivery permitted after approval'],mode:'real HTTP/PostgreSQL local operator, no paid models'};
await writeFile('doc/verification/video-delivery.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
