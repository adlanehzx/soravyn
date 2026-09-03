import assert from 'node:assert/strict';
const origin = process.env.SORAVYN_TEST_URL || 'http://127.0.0.1:3200';
async function call(path, method='GET', body) {
 const response = await fetch(`${origin}/api${path}`, {method, headers:{'Content-Type':'application/json', Origin:origin}, body:body ? JSON.stringify(body):undefined});
 const data=await response.json();
 assert.ok(response.ok, `${method} ${path}: ${response.status} ${JSON.stringify(data)}`); return data;
}
const client = await call('/companies','POST',{name:`SORAVYN verification ${Date.now()}`});
const base=`/companies/${client.id}/studio`;
await call(`${base}/brand`,'PUT',{name:'Verification brand',tone:'Premium',languages:['fr'],colors:['#9484FF']});
assert.equal((await call(`${base}/brand`)).tone,'Premium');
const campaign=await call(`${base}/campaigns`,'POST',{name:'Verification campaign',objectives:'Present the product',brief:'Create a French product video.'});
assert.equal(campaign.status,'brief');
for(const status of ['strategy','production','review','approval']) assert.equal((await call(`${base}/campaigns/${campaign.id}/transition`,'POST',{status})).status,status);
assert.ok((await call(`${base}/campaigns`)).some(c=>c.id===campaign.id));
await call(`/companies/${client.id}`,'PATCH',{status:'archived'});
console.log(JSON.stringify({passed:true,clientId:client.id,campaignId:campaign.id,note:'Real HTTP and PostgreSQL; local operator mode. Verification client archived.'},null,2));
