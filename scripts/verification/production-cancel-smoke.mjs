import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const proof=JSON.parse(await readFile('/tmp/soravyn-foundations-proof.json','utf8'));
const origin=process.env.SORAVYN_TEST_URL||'http://127.0.0.1:3204';
async function call(path,method='GET',body,status=200){const r=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));return data;}
let requested,release;let deferred=true;let calls=0;
const started=new Promise(resolve=>requested=resolve);const gate=new Promise(resolve=>release=resolve);
const model=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);assert.ok(input.system.includes('"items"'),'Only the missing copy stage may call the model');calls++;requested();if(deferred)await gate;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({response:JSON.stringify({items:[{channel:'website',title:'Reprise après annulation',body:'Un brouillon validé structurellement.'}]})}));});
await new Promise((resolve,reject)=>{model.once('error',reject);model.listen(11436,'127.0.0.1',resolve);});
function worker(){return new Promise((resolve,reject)=>{const child=spawn('pnpm',['--filter','@soravyn/server','exec','tsx','src/video-worker.ts','--once'],{env:{...process.env,SORAVYN_VIDEO_COMPANY_ID:proof.companyId,SORAVYN_OLLAMA_MODEL:'soravyn-foundation-fixture',SORAVYN_OLLAMA_URL:'http://127.0.0.1:11436'},stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',d=>error+=d);const timer=setTimeout(()=>child.kill('SIGTERM'),40000);child.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error(error));});child.on('error',reject);});}
const jobs=`/companies/${proof.companyId}/video/jobs`;
try{
 const job=await call(`${jobs}/${proof.packId}/restart-from`,'POST',{stage:'copy'},201);const running=worker();let timer;
 try{await Promise.race([started,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Model request not observed')),20000);})]);}finally{clearTimeout(timer);}
 await call(`${jobs}/${job.id}/cancel`,'POST',{});release();await running;
 const cancelled=await call(`${jobs}/${job.id}`);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.input.pack,undefined);const interrupted=await call(`${jobs}/${job.id}/steps`);assert.equal(interrupted.find(s=>s.stage==='copy').status,'interrupted');
 deferred=false;await call(`${jobs}/${job.id}/retry`,'POST',{});await worker();const resumed=await call(`${jobs}/${job.id}`);assert.equal(resumed.status,'script_ready');assert.equal(calls,2);const steps=await call(`${jobs}/${job.id}/steps`);assert.equal(steps.find(s=>s.stage==='copy').attempts,2);assert.equal(steps.find(s=>s.stage==='strategy').attempts,0);
 const result={passed:true,jobId:job.id,checks:['cancelled while a model response was pending','late response cannot publish a pack or overwrite cancelled status','interrupted step exposed','retry reuses inherited stages and regenerates missing copy only'],model:'HTTP fixture; no external model'};
 proof.cancellation=result;await writeFile('/tmp/soravyn-foundations-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(result,null,2));
}finally{release();model.close();}
