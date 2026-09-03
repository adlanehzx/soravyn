import assert from 'node:assert/strict';import {readFile,writeFile,open} from 'node:fs/promises';import {spawn,execFileSync} from 'node:child_process';
const t=JSON.parse(await readFile('/tmp/soravyn-workflow-smoke.json','utf8'));const origin=process.env.SORAVYN_TEST_URL||'http://127.0.0.1:3202';
async function call(path,method='GET',body,expected=200){const r=await fetch(`${origin}/api${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
const base=`/companies/${t.companyId}`;const campaign=await call(`${base}/studio/campaigns`,'POST',{name:'Cancellation verification',objectives:'Verify running render cancellation',brief:'Test-only bounded render.'},201);
const job=await call(`${base}/video/campaigns/${campaign.id}/jobs`,'POST',{platform:'square',scenes:Array.from({length:6},(_,i)=>({title:`Cancellation test ${i+1}`,text:'Production temporaire de vérification.',duration:10}))},201);
assert.equal((await call(`${base}/video/jobs/${job.id}/cancel`,'POST',{})).status,'cancelled');
assert.equal((await call(`${base}/video/jobs/${job.id}/retry`,'POST',{})).status,'queued');
const log=await open('/tmp/soravyn-cancellation-worker.log','w');const child=spawn('pnpm',['video:worker','--once'],{stdio:['ignore',log.fd,log.fd]});let exited=false;const exit=new Promise(resolve=>child.once('exit',code=>{exited=true;resolve(code);}));
try{
 let rendering=false;
 for(let i=0;i<80;i++){const current=(await call(`${base}/video/jobs`)).find(j=>j.id===job.id);if(current.status==='running'&&current.events.some(e=>['render','narration_and_render'].includes(e.stage))){const active=execFileSync('docker',['ps','--filter',`name=soravyn-${job.id}-`,'--format','{{.Names}}'],{encoding:'utf8'}).trim();if(active){rendering=true;break;}}if(current.status==='failed')throw new Error('Render failed before cancellation');await new Promise(r=>setTimeout(r,250));}
 assert.ok(rendering,'Isolated render container must be running before cancellation');
 await call(`${base}/video/jobs/${job.id}/cancel`,'POST',{});
 let timeout;const code=await Promise.race([exit,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Worker did not stop cancelled render')),20000);})]).finally(()=>clearTimeout(timeout));assert.equal(code,0);
 assert.equal((await call(`${base}/video/jobs`)).find(j=>j.id===job.id).status,'cancelled');
 assert.equal(execFileSync('docker',['ps','--filter',`name=soravyn-${job.id}-`,'--format','{{.Names}}'],{encoding:'utf8'}).trim(),'');
 const result={passed:true,jobId:job.id,checks:['queued cancellation persisted','explicit retry requeued job','actual isolated render container observed','running cancellation stopped container','lease fencing preserved cancelled status'],paidProviderCalls:false};await writeFile('doc/verification/video-cancellation.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{if(!exited)child.kill('SIGTERM');await log.close();}
