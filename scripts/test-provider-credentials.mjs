import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../cloudflare/worker.mjs';
import {credentialMetadata,saveCredential,withProviderCredentials} from '../cloudflare/provider-credentials.mjs';
const db=new DatabaseSync(':memory:');
for(const name of ['0001_auth.sql','0006_provider_credentials.sql']) db.exec(readFileSync(new URL('../cloudflare/migrations/'+name,import.meta.url),'utf8'));
class Statement {
  constructor(sql,values=[]){Object.assign(this,{sql,values});}
  bind(...values){return new Statement(this.sql,values);}
  async first(){return db.prepare(this.sql).get(...this.values)||null;}
  async all(){return {results:db.prepare(this.sql).all(...this.values)};}
  async run(){const r=db.prepare(this.sql).run(...this.values);return {success:true,meta:{changes:Number(r.changes)}};}
}
const env={AUTH_DB:{prepare:sql=>new Statement(sql),async batch(ss){const out=[];for(const s of ss)out.push(await s.run());return out;}},PROVIDER_VAULT_KEY:'ab'.repeat(32),INTERNAL_PASSWORD:'vault-local-test-password',OPENROUTER_API_KEY:'existing-environment-key-only'};
assert.equal((await credentialMetadata(env)).providers[0].source,'environment');
assert.equal((await withProviderCredentials(env)).OPENROUTER_API_KEY,env.OPENROUTER_API_KEY);
const secret='sk-or-v1-new-test-credential-never-real';
const saved=await saveCredential(env,{provider:'openrouter',apiKey:secret});
assert.equal(saved.providers[0].source,'vault');
assert.ok(!JSON.stringify(saved).includes(secret));
const first=db.prepare('SELECT * FROM provider_credentials').get();
assert.ok(!JSON.stringify(first).includes(secret));
assert.equal((await withProviderCredentials({...env})).OPENROUTER_API_KEY,secret);
assert.equal(env.OPENROUTER_API_KEY,'existing-environment-key-only');
await saveCredential(env,{provider:'openrouter',apiKey:secret});
const second=db.prepare('SELECT * FROM provider_credentials').get();
assert.notEqual(first.iv,second.iv);assert.notEqual(first.encrypted_value,second.encrypted_value);
await assert.rejects(()=>withProviderCredentials({...env,PROVIDER_VAULT_KEY:'cd'.repeat(32)}),/credential_decryption_failed/);
await assert.rejects(()=>withProviderCredentials({...env,PROVIDER_VAULT_KEY:undefined}),/credential_vault_not_ready/);
db.prepare('UPDATE provider_credentials SET provider=? WHERE provider=?').run('fal','openrouter');
await assert.rejects(()=>withProviderCredentials(env),/credential_decryption_failed/);
db.prepare('UPDATE provider_credentials SET provider=? WHERE provider=?').run('openrouter','fal');
db.prepare('UPDATE provider_credentials SET encrypted_value=?').run('AAAA');
await assert.rejects(()=>withProviderCredentials(env),/credential_decryption_failed/);
await saveCredential(env,{provider:'openrouter',apiKey:secret});
await assert.rejects(()=>saveCredential(env,{provider:'evil',apiKey:secret}),/credential_input_invalid/);
await assert.rejects(()=>saveCredential(env,{provider:'fal',apiKey:secret,endpoint:'https://evil.test'}),/credential_input_invalid/);
await assert.rejects(()=>saveCredential(env,{provider:'fal',apiKey:'a'.repeat(4097)}),/credential_format_invalid/);
await assert.rejects(()=>saveCredential(env,{provider:'fal',apiKey:secret+'\nINJECT'}),/credential_format_invalid/);
const origin='https://studio.example';
async function call(path,body,cookie='',requestOrigin=origin){return worker.fetch(new Request(origin+path,{method:body===undefined?'GET':'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),env);}
assert.equal((await call('/api/provider-credentials')).status,401);
const login=await call('/api/auth/login',{username:'team',password:env.INTERNAL_PASSWORD});
assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
assert.equal((await call('/api/provider-credentials',{provider:'fal',apiKey:secret},cookie,'https://evil.test')).status,403);
assert.equal((await call('/api/provider-credentials',{provider:'fal',apiKey:'a'.repeat(9000)},cookie)).status,413);
const response=await call('/api/provider-credentials',{provider:'fal',apiKey:secret},cookie);
assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
const body=await response.text();assert.ok(!body.includes(secret));assert.ok(!body.includes('encrypted_value'));assert.ok(!body.includes('iv'));
const metadata=await call('/api/provider-credentials',undefined,cookie);assert.equal(metadata.status,200);
const rotated='rotated-provider-key-test-only';
await saveCredential(env,{provider:'openrouter',apiKey:rotated});
assert.equal((await withProviderCredentials(env)).OPENROUTER_API_KEY,rotated);
// Key preflight must actually use the vault credential rather than the environment fallback.
const originalFetch=globalThis.fetch;let authorization;
globalThis.fetch=async(_url,options)=>{authorization=options.headers.Authorization;return new Response('{}',{status:401});};
try {const check=await call('/api/provider-preflight',{},cookie);assert.equal(check.status,200);assert.equal((await check.json()).openrouter.status,'key_rejected');assert.equal(authorization,`Bearer ${rotated}`);}finally{globalThis.fetch=originalFetch;}
console.log('PROVIDER VAULT PASS: AES-GCM persistence, nonce/AAD/tamper isolation, env override, auth/CSRF/body bounds, redaction and runtime preflight credential rotation.');
