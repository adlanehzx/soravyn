import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const origin=process.env.SORAVYN_TEST_URL||'http://127.0.0.1:3205';
async function call(path,method='GET',body,expected=200){const r=await fetch(`${origin}/api${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
const client=await call('/companies','POST',{name:`Narration verification ${Date.now()}`},201);
const base=`/companies/${client.id}`;
await call(`${base}/studio/brand`,'PUT',{name:'SORAVYN',colors:['#9484FF'],languages:['fr']});
const campaign=await call(`${base}/studio/campaigns`,'POST',{name:'Voix française et médias',objectives:'Vérification réelle du son',brief:'Courte vidéo avec voix française et image client.'},201);
// Reuse a frame extracted from SORAVYN's own earlier render, with explicit provenance.
const image=await readFile('/tmp/soravyn-video-frame.png');const form=new FormData();form.append('file',new Blob([image],{type:'image/png'}),'soravyn-owned-frame.png');
const upload=await fetch(`${origin}/api${base}/assets/images`,{method:'POST',headers:{Origin:origin},body:form});assert.equal(upload.status,201);const asset=await upload.json();
const job=await call(`${base}/video/campaigns/${campaign.id}/jobs`,'POST',{platform:'square',narration:'fr',scenes:[{title:'Votre agence créative',text:'Bienvenue chez Soravyn.',duration:5,imageAssetId:asset.assetId,imageLicense:'Original SORAVYN test composition rendered locally.'},{title:'Une vision claire',text:'Votre campagne prend vie.',duration:5}]},201);
await writeFile('/tmp/soravyn-enhanced-smoke.json',JSON.stringify({origin,companyId:client.id,campaignId:campaign.id,jobId:job.id}));console.log(JSON.stringify({queued:true,jobId:job.id,assetId:asset.assetId}));
