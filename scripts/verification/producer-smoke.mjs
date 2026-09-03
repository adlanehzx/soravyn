import assert from 'node:assert/strict';
const origin=process.env.SORAVYN_TEST_URL || 'http://127.0.0.1:3201';
async function call(path,method='GET',body,expected=200){const r=await fetch(`${origin}/api${path}`,{method,headers:{'Content-Type':'application/json',Origin:origin},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;}
const a=await call('/companies','POST',{name:`Producer verification ${Date.now()}`},201);
const b=await call('/companies','POST',{name:`Boundary verification ${Date.now()}`},201);
const agent=await call(`/companies/${a.id}/agents`,'POST',{name:'Verification Producer',adapterType:'process',adapterConfig:{command:'/usr/bin/false'},runtimeConfig:{heartbeat:{enabled:false}}},201);
const other=await call(`/companies/${b.id}/agents`,'POST',{name:'Other client Producer',adapterType:'process',adapterConfig:{command:'/usr/bin/false'},runtimeConfig:{heartbeat:{enabled:false}}},201);
const base=`/companies/${a.id}/studio`;
const campaign=await call(`${base}/campaigns`,'POST',{name:'Producer handoff',objectives:'Prepare a script',brief:'French premium product introduction'},201);
await call(`${base}/campaigns/${campaign.id}/producer-task`,'POST',{agentId:other.id},422);
const task=await call(`${base}/campaigns/${campaign.id}/producer-task`,'POST',{agentId:agent.id},201);
assert.equal(task.assigneeAgentId,agent.id);assert.equal(task.status,'backlog');
await call(`${base}/campaigns/${campaign.id}/producer-task`,'POST',{agentId:agent.id},409);
assert.equal((await call(`${base}/campaigns`)).find(c=>c.id===campaign.id).producerTaskId,task.id);
for(const c of [a,b]) await call(`/companies/${c.id}`,'PATCH',{status:'archived'});
console.log(JSON.stringify({passed:true,taskId:task.id,checks:['real task persisted','correct assignee','cross-client agent rejected','duplicate rejected','campaign link persisted','backlog without execution']},null,2));
