import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {validatePromptPair} from '../cloudflare/prompt-validation.mjs';
const read=async name=>JSON.parse(await readFile(new URL(`../examples/${name}`,import.meta.url),'utf8'));
for(const media of ['image','video']) {
  const mega=await read(`${media}-mega-prompt.demo.json`),negative=await read(`${media}-negative-prompt.demo.json`);
  assert.deepEqual(validatePromptPair(mega,negative),{valid:true,errors:[]});
}
for(const name of await readdir(new URL('../examples/invalid/',import.meta.url))) {
  const fixture=await read(`invalid/${name}`),doc=await read(`invalid/${fixture.base}`);
  for(const m of fixture.mutations) {
    const path=m.path.slice(1).split('/').map(v=>v.replace(/~1/g,'/').replace(/~0/g,'~'));const key=path.pop();let node=doc;
    for(const k of path)node=node[k];
    if(m.op==='remove')delete node[key];else node[key]=m.value;
  }
  const isMega=doc.schemaVersion.includes('mega-prompt');
  const media=doc.mediaType;
  const mega=isMega?doc:await read(`${media}-mega-prompt.demo.json`);
  const negative=isMega?await read(`${media}-negative-prompt.demo.json`):doc;
  assert.equal(validatePromptPair(mega,negative).valid,false,name);
}
const mega=await read('video-mega-prompt.demo.json'),negative=await read('video-negative-prompt.demo.json');
negative.constraints[0].scope={type:'shot',shotRefs:['shot_missing']};
assert.equal(validatePromptPair(mega,negative).valid,false);
assert.equal(validatePromptPair(null,{}).valid,false);
const uploaded=await read('image-mega-prompt.demo.json'),uploadedNegative=await read('image-negative-prompt.demo.json');
for(const document of [uploaded,uploadedNegative]) {
  document.authorship.verificationStatus='actual_invocation_verified';
  document.authorship.invocationRef='test:verified-invocation';
}
uploaded.productLock.syntheticDemo=false;
for(const evidence of uploaded.sourceEvidence) {
  evidence.hashStatus='verified_bytes';evidence.reviewStatus='unverified';
}
assert.equal(validatePromptPair(uploaded,uploadedNegative).valid,true,'unreviewed exact product bytes can lock identity');
uploaded.sourceEvidence.find(e=>e.productEvidence).reviewStatus='rejected';
assert.equal(validatePromptPair(uploaded,uploadedNegative).valid,false,'rejected sources cannot lock identity');
console.log('PROMPT RUNTIME PASS: positive image/video pairs, all canonical invalid fixtures, dangling shot reference and null input.');
