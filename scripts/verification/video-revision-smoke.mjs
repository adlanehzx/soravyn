import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const t=JSON.parse(await readFile('/tmp/soravyn-enhanced-smoke.json','utf8'));const origin=process.env.SORAVYN_TEST_URL||'http://127.0.0.1:3206';
async function call(path,method='GET',body,expected=200){const r=await fetch(`${origin}/api${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
const base=`/companies/${t.companyId}/video`;
const original=(await call(`${base}/jobs`)).find(j=>j.id===t.jobId);assert.equal(original.status,'succeeded');
const revision=await call(`${base}/jobs/${t.jobId}/revisions`,'POST',{sceneIndex:0,title:'Votre studio de création',text:'Une nouvelle direction visuelle.',note:'Vérifier la révision visuelle avec narration verrouillée.'},201);
assert.equal(revision.input.revisionOf,t.jobId);assert.equal(revision.input.scenes[0].speech,original.input.scenes[0].text);assert.equal(revision.input.scenes[0].duration,original.input.scenes[0].duration);assert.deepEqual(revision.input.scenes[1],original.input.scenes[1]);
await call(`${base}/jobs/${t.jobId}/revisions`,'POST',{sceneIndex:9,title:'Invalid',text:'Scene absent',note:'Must reject'},422);
const media=await call(`${base}/media`);assert.ok(media.some(m=>m.id===original.input.scenes[0].imageAssetId));
await writeFile('/tmp/soravyn-revision-smoke.json',JSON.stringify({...t,origin,revisionId:revision.id}));console.log(JSON.stringify({queued:true,original:t.jobId,revisionId:revision.id,checks:['clock preserved','speech locked','other scene unchanged','missing scene rejected','image in library']},null,2));
