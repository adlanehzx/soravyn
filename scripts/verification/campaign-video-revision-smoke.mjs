import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';
const t=JSON.parse(await readFile('/tmp/soravyn-workflow-smoke.json','utf8'));const origin=process.env.SORAVYN_TEST_URL||t.origin;
async function call(path,method='GET',body,expected=200){const r=await fetch(`${origin}/api${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,`${path}: ${JSON.stringify(data)}`);return data;}
const base=`/companies/${t.companyId}`;const job=(await call(`${base}/video/jobs`)).find(j=>j.id===t.jobId);assert.equal(job.status,'succeeded');
assert.equal((await call(`${base}/studio/campaigns`)).find(c=>c.id===t.campaignId).status,'review');
await call(`${t.workflow}/schedule`,'POST',{jobId:t.jobId,channel:'manual',scheduledAt:new Date().toISOString()},409);
await call(`/approvals/${job.approvalId}/reject`,'POST',{decisionNote:'Réviser le titre de la première scène et conserver la voix.'});
let view=await call(t.workflow);assert.equal(view.corrections.length,1);const correction=view.corrections[0];assert.equal((await call(`/issues/${correction.taskId}`)).status,'backlog');
const revision=await call(`${base}/video/jobs/${t.jobId}/revisions`,'POST',{sceneIndex:0,title:'SORAVYN — votre agence',text:'Bienvenue dans votre studio marketing.',note:'Correction demandée par la validation humaine.'},201);
assert.equal(revision.input.deliverableId,job.input.deliverableId);
view=await call(t.workflow);assert.equal(view.deliverables.find(d=>d.id===job.input.deliverableId).videoJobId,revision.id);
await call(`${base}/video/jobs/${t.jobId}/revisions`,'POST',{sceneIndex:0,title:'Obsolete',text:'Do not branch',note:'Must reject stale source'},409);
await writeFile('/tmp/soravyn-workflow-final.json',JSON.stringify({...t,origin,revisionId:revision.id,correctionTaskId:correction.taskId}));console.log(JSON.stringify({passed:true,revisionId:revision.id,checks:['render moved campaign to review','unapproved schedule denied','video refusal created real correction task','revision linked as current deliverable','obsolete version branching denied']},null,2));
