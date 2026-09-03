import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
const t=JSON.parse(await readFile('/tmp/soravyn-workflow-final.json','utf8'));const origin=process.env.SORAVYN_TEST_URL||'http://127.0.0.1:3200';
async function call(path,method='GET',body,expected=200){const r=await fetch(`${origin}/api${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
const slot=await call(`${t.workflow}/schedule`,'POST',{jobId:t.revisionId,channel:'website',scheduledAt:new Date(Date.now()+86400000).toISOString()},201);
assert.equal((await call(`${t.workflow}/schedule/${slot.id}/cancel`,'POST',{})).status,'cancelled');
await call(`${t.workflow}/schedule/${slot.id}/cancel`,'POST',{},409);
await call(`${t.workflow}/schedule/${slot.id}/delivered`,'POST',{},409);
const report=await call(`${t.workflow}/report`);assert.equal(report.schedule.find(s=>s.id===slot.id).status,'cancelled');
const file=await fetch(`${origin}/api/companies/${t.companyId}/video/jobs/${t.revisionId}/files/output.mp4`);assert.equal(file.status,200);assert.ok((await file.arrayBuffer()).byteLength>1000);
const result={passed:true,checks:['approved video scheduled','planned slot cancellation persisted','duplicate cancellation rejected','cancelled slot cannot be delivered','report retains cancelled slot','existing corrected MP4 remains downloadable'],externalPublication:false};await writeFile('doc/verification/campaign-schedule-cancel.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
