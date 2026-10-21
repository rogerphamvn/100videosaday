// Shared-team credential vault. Only ciphertext is persisted; no read-secret API.
const PROVIDERS = Object.freeze({openrouter:'OPENROUTER_API_KEY',fal:'FAL_KEY',replicate:'REPLICATE_API_TOKEN'});
const encoder = new TextEncoder();
export class CredentialError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}
const encode = bytes => btoa(String.fromCharCode(...bytes));
const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
function configured(value) { return typeof value === 'string' && value.trim().length >= 16; }
function masterReady(env) { return typeof env.PROVIDER_VAULT_KEY === 'string' && /^[a-f\d]{64}$/iu.test(env.PROVIDER_VAULT_KEY); }
async function masterKey(env) {
  if (!masterReady(env)) throw new CredentialError('credential_vault_not_ready');
  return crypto.subtle.importKey('raw', Uint8Array.from(env.PROVIDER_VAULT_KEY.match(/../gu), x=>parseInt(x,16)), 'AES-GCM', false, ['encrypt','decrypt']);
}
const aad = provider => encoder.encode(`creative-hook-lab:provider-credential:v1:${provider}`);
async function rows(env) {
  if (!env.AUTH_DB) throw new CredentialError('credential_store_unavailable');
  try { return (await env.AUTH_DB.prepare('SELECT provider, encrypted_value, iv, key_version, updated_at FROM provider_credentials').all()).results || []; }
  catch { throw new CredentialError('credential_store_unavailable'); }
}
export async function credentialMetadata(env) {
  const stored = await rows(env);
  return {vaultReady:masterReady(env),providers:Object.entries(PROVIDERS).map(([provider,binding])=>{
    const row=stored.find(item=>item.provider===provider);
    return {provider,configured:Boolean(row)||configured(env[binding]),source:row?'vault':configured(env[binding])?'environment':'none',...(row?{updatedAt:row.updated_at}: {})};
  })};
}
export async function saveCredential(env, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k=>!['provider','apiKey'].includes(k)) || !Object.hasOwn(PROVIDERS,input.provider)) throw new CredentialError('credential_input_invalid',400);
  const value=typeof input.apiKey==='string'?input.apiKey.trim():'';
  if (value.length<16 || value.length>4096 || /[^\x21-\x7e]/u.test(value)) throw new CredentialError('credential_format_invalid',400);
  const key=await masterKey(env), iv=crypto.getRandomValues(new Uint8Array(12));
  const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(input.provider),tagLength:128},key,encoder.encode(value));
  try {
    await env.AUTH_DB.prepare(`INSERT INTO provider_credentials (provider,encrypted_value,iv,key_version,updated_at) VALUES (?,?,?,1,?)
      ON CONFLICT(provider) DO UPDATE SET encrypted_value=excluded.encrypted_value,iv=excluded.iv,key_version=1,updated_at=excluded.updated_at`)
      .bind(input.provider,encode(new Uint8Array(encrypted)),encode(iv),Math.floor(Date.now()/1000)).run();
  } catch { throw new CredentialError('credential_store_unavailable'); }
  return credentialMetadata(env);
}
export async function withProviderCredentials(env, providers = Object.keys(PROVIDERS)) {
  const stored=(await rows(env)).filter(row=>providers.includes(row.provider));
  if (!stored.length) return env;
  const key=await masterKey(env), overlay={...env};
  for (const row of stored) {
    if (!Object.hasOwn(PROVIDERS,row.provider)||row.key_version!==1) throw new CredentialError('credential_decryption_failed');
    try {
      const iv=decode(row.iv);
      if(iv.length!==12) throw new Error('iv');
      const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad(row.provider),tagLength:128},key,decode(row.encrypted_value));
      const value=new TextDecoder('utf-8',{fatal:true}).decode(clear);
      if(!configured(value)) throw new Error('format');
      overlay[PROVIDERS[row.provider]]=value;
    } catch { throw new CredentialError('credential_decryption_failed'); }
  }
  return overlay;
}
