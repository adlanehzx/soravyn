import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const origin=process.env.SORAVYN_TEST_URL||'http://127.0.0.1:3202';
async function call(path,method='GET',body){const r=await fetch(`${origin}/api${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;}
const client=await call('/companies','POST',{name:`Video verification ${Date.now()}`});
const base=`/companies/${client.id}`;
await call(`${base}/studio/brand`,'PUT',{name:'SORAVYN',colors:['#9484FF'],languages:['fr']});
const campaign=await call(`${base}/studio/campaigns`,'POST',{name:'Production vérifiée',objectives:'Vérifier le rendu réel',brief:'Une courte présentation SORAVYN.'});
const job=await call(`${base}/video/campaigns/${campaign.id}/jobs`,'POST',{platform:'square',scenes:[{title:'Votre prochaine campagne',text:'Une vision claire. Une création maîtrisée.',duration:3},{title:'SORAVYN',text:'Autonomous Creative Intelligence',duration:3}]});
await writeFile('/tmp/soravyn-video-smoke.json',JSON.stringify({companyId:client.id,campaignId:campaign.id,jobId:job.id,origin}));
console.log(JSON.stringify({queued:true,jobId:job.id,companyId:client.id}));
