import assert from 'node:assert/strict';
import {
  compileMediaInput,
  discoverMediaModels,
  extractMediaResult,
  mediaProviderInternals,
  pollMedia,
  submitMedia,
  validateProviderAssetUrl
} from '../integrations/media-providers.mjs';
import { handleMedia, mediaRuntimeInternals } from '../cloudflare/media-runtime.mjs';

const jsonResponse = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json', ...headers }
});

const promptPair = {
  megaPrompt: {
    mediaType: 'video',
    productLock: { identity:'oil sprayer', geometry:['cylinder'], materials:['glass'], packaging:['box'], logo:['locked'], exactText:['SUPER CHEF'] },
    strategy: {
      objective:'show correct use', audience:{statement:'home cooks'}, motivator:{statement:'cleaner kitchen'},
      painPoint:{statement:'oil spills'}, useCase:{statement:'coat a pan'}, hook:{mechanism:'demonstration',promise:'controlled spray'}
    },
    taste: { direction:'clean documentary', mood:['calm'], palette:['neutral'], lighting:['window'], photography:['macro'], antiGenericRules:['keep product exact'] },
    creative: {
      durationS:15, fps:30, continuityRules:['same product'], audioPolicy:{music:false},
      shots:[{shotId:'s1',startS:0,endS:15,visual:'spray pan',camera:'macro',action:'one press',continuity:['same bottle'],audio:[],textOverlays:[]}]
    },
    output: { aspectRatio:'9:16', widthPx:1080, heightPx:1920, colorSpace:'sRGB' }
  },
  negativePrompt: { constraints:[{severity:'hard',category:'product_identity',instruction:'do not alter bottle'}] }
};
const sources = [{ kind:'product', source_slot:0, data_url:'data:image/png;base64,AA==' }];

{
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url:String(url), init });
    if (String(url).endsWith('/videos/models')) return jsonResponse({ data:[{
      id:'bytedance/seedance-2.5', name:'Seedance 2.5', supported_durations:[4,8,15,30],
      supported_resolutions:['720p','1080p'], supported_aspect_ratios:['16:9','9:16'],
      pricing_skus:{'per-video-second':'0.10'}
    }] });
    return jsonResponse({ data:[{
      id:'openai/gpt-image-2.5-flare', name:'GPT Image 2.5 Flare',
      supported_parameters:{ aspect_ratio:{type:'enum',values:['1:1','9:16']}, input_references:{type:'range',min:0,max:16} }
    }] });
  };
  const env = { OPENROUTER_API_KEY:'sk-or-v1-test-key-long-enough' };
  const video = await discoverMediaModels('openrouter','video',env,{fetchImpl,allowFallback:false});
  assert.equal(video.fallbackUsed,false);
  assert.deepEqual(video.models[0].durations,[4,8,15,30]);
  assert.deepEqual(video.models[0].aspectRatios,['16:9','9:16']);
  assert.equal(video.models[0].pricing['per-video-second'],'0.10');
  const image = await discoverMediaModels('openrouter','image',env,{fetchImpl,allowFallback:false});
  assert.equal(image.models[0].supportedParameters.input_references.max,16);
  assert.equal(calls.length,2,'catalog test must exercise both image and video discovery calls');
}

{
  const compiled = compileMediaInput(promptPair, {
    provider:'openrouter', mediaType:'video', modelId:'bytedance/seedance-2.5',
    parameters:{duration:15,resolution:'720p',aspectRatio:'9:16'}
  }, sources);
  assert.deepEqual(compiled.frame_images,[{type:'image_url',image_url:{url:sources[0].data_url},frame_type:'first_frame'}]);
  assert.deepEqual(compiled.input_references,[{type:'image_url',image_url:{url:sources[0].data_url}}]);
  assert.equal(compiled.duration,15);
  assert.equal(compiled.resolution,'720p');
  const falSeedance = compileMediaInput(promptPair, {
    provider:'fal',mediaType:'video',modelId:'bytedance/seedance-2.5/image-to-video',
    parameters:{duration:15,totalDuration:60,resolution:'720p',aspectRatio:'9:16',generateAudio:true}
  },sources);
  assert.equal(falSeedance.image_url,sources[0].data_url);
  assert.equal(falSeedance.aspect_ratio,'auto','Seedance image-to-video derives ratio from the first frame');
  assert.equal(falSeedance.duration,'15');
  assert.equal('totalDuration' in falSeedance,false,'45/60 second planning metadata must never be sent as one provider render');
  const falReference=compileMediaInput(promptPair,{provider:'fal',mediaType:'video',modelId:'bytedance/seedance-2.5/reference-to-video',parameters:{duration:15,totalDuration:60,resolution:'720p',aspectRatio:'21:9'}},sources);
  assert.equal(falReference.aspect_ratio,'21:9');
  assert.throws(()=>compileMediaInput(promptPair,{provider:'fal',mediaType:'video',modelId:'google/gemini-omni-flash/v1.1/image-to-video',parameters:{duration:8,totalDuration:60,resolution:'720p',aspectRatio:'9:16'}},sources),error=>error?.code==='media_prompt_duration_mismatch');
  const imagePair={...promptPair,megaPrompt:{...promptPair.megaPrompt,mediaType:'image',creative:{scene:'countertop',composition:'centered',camera:'macro',subjectAction:'spray',supportingProps:[],textOverlays:[]}}};
  const falImage=compileMediaInput(imagePair,{provider:'fal',mediaType:'image',modelId:'openai/gpt-image-2.5/flare/edit',parameters:{aspectRatio:'9:16',quality:'xhigh',outputFormat:'webp'}},sources);
  assert.deepEqual({image_size:falImage.image_size,quality:falImage.quality,output_format:falImage.output_format},{image_size:'portrait_16_9',quality:'xhigh',output_format:'webp'});
}

{
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push({url:String(url),init}); return jsonResponse({request_id:'fal-job-1'},202); };
  const submitted = await submitMedia('fal','video','bytedance/seedance-2.5/image-to-video',{prompt:'x'},{FAL_KEY:'fal-key-test-long-enough'},{fetchImpl});
  assert.equal(submitted.providerJobId,'fal-job-1');
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://queue.fal.run/bytedance/seedance-2.5/image-to-video');
  assert.equal(calls[0].init.headers['X-Fal-No-Retry'],'1');
  assert.equal(mediaProviderInternals.falResultBase('openai/gpt-image-2.5/flare/edit'),'https://queue.fal.run/openai/gpt-image-2.5/flare/edit');
}

{
  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    if (String(url).endsWith('/status')) return jsonResponse({status:'COMPLETED'});
    return jsonResponse({video:{url:'https://v3b.fal.media/files/v/test.mp4'}});
  };
  const polled = await pollMedia('fal','video','google/gemini-omni-flash/v1.1/image-to-video','fal-job-1',{FAL_KEY:'fal-key-test-long-enough'},{fetchImpl});
  assert.equal(polled.status,'complete');
  assert.equal(calls.length,2);
  assert.ok(calls.every(url=>url.includes('/google/gemini-omni-flash/v1.1/image-to-video/requests/fal-job-1')));
}

{
  assert.equal(extractMediaResult('openrouter','image',{data:[{media_type:'image/png',b64_json:'AA=='}],usage:{cost:0.01}}).actualUsd,0.01);
  assert.equal(validateProviderAssetUrl('fal','https://v3b.fal.media/files/v/test.mp4').hostname,'v3b.fal.media');
  assert.equal(validateProviderAssetUrl('fal','https://storage.googleapis.com/falserverless/example_outputs/test.mp4').hostname,'storage.googleapis.com');
  assert.throws(()=>validateProviderAssetUrl('fal','https://example.com/test.mp4'),/not allowed/u);
  assert.throws(()=>extractMediaResult('openrouter','image',{data:[{media_type:'text/html',b64_json:'AA=='}]}),/not safe to serve/u);
  assert.equal(extractMediaResult('openrouter','image',{data:[{media_type:'image/png',b64_json:'A'.repeat(2_400_000)}]}).inline[0].base64.length,2_400_000,'multi-megabyte paid image output remains eligible for chunked persistence');
  assert.deepEqual(mediaRuntimeInternals.normalizeParameters('video',{segmentSeconds:15,totalDuration:60,resolution:'4K'}),{duration:15,totalDuration:60,resolution:'4K',generateAudio:false});
  assert.deepEqual(mediaRuntimeInternals.normalizeParameters('image',{quality:'xhigh',outputFormat:'webp'}),{quality:'xhigh',outputFormat:'webp'});
}

{
  const inserted=[];
  const chunkDb={prepare(sql){return {sql,values:[],bind(...values){this.values=values;return this;}};},async batch(statements){for(const statement of statements){assert.ok(statement.sql.startsWith('INSERT INTO media_result_chunks'));inserted.push(statement.values);}return statements.map(()=>({success:true}));}};
  const result={inline:[{mediaType:'image/png',base64:'A'.repeat(2_400_000)}],urls:[]};
  await mediaRuntimeInternals.persistInlineChunks({AUTH_DB:chunkDb},{id:'job_big'},result);
  assert.equal(inserted.length,3);
  assert.deepEqual(result.inline[0],{mediaType:'image/png',chunked:true,chunkCount:3,base64Chars:2_400_000});
}

{
  await assert.rejects(
    mediaRuntimeInternals.proxyFetch('https://trusted.example/file.svg',{},null,{MEDIA_FETCH:async()=>new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml','Content-Length':'6'}})}),
    error=>error?.code==='media_asset_type_invalid',
    'active SVG content must never be proxied from a generated asset URL'
  );
}

{
  const heldDb={
    prepare(sql){return {values:[],bind(...values){this.values=values;return this;},async first(){
      if(sql.startsWith('SELECT id FROM production_projects'))return {id:'project_1'};
      if(sql.startsWith('SELECT COUNT(*) count FROM media_runtime_jobs'))return {count:1};
      throw new Error(`Unexpected first SQL: ${sql}`);
    }};}
  };
  await assert.rejects(
    mediaRuntimeInternals.saveBudget({projectId:'project_1',totalUsd:2,maxPerJobUsd:0.5},{AUTH_DB:heldDb}),
    error=>error?.code==='media_budget_hold_unresolved'&&error?.details?.heldJobs===1,
    'raising a budget must not reactivate an envelope while a provider outcome is unresolved'
  );
  await assert.rejects(
    mediaRuntimeInternals.saveBudget({projectId:'project_1',totalUsd:2.01,maxPerJobUsd:0.5},{AUTH_DB:heldDb}),
    error=>error?.code==='validation_failed',
    'the default media project ceiling remains the previously authorized 2 USD'
  );
}

function jobRow(overrides={}) {
  return {
    id:'job_1', project_id:'project_1', node_id:'video', draft_id:'draft_1', provider:'openrouter', media_type:'video',
    model_id:'bytedance/seedance-2.5', status:'submitted', reserved_microusd:500_000, actual_microusd:null,
    provider_job_id:'provider_job_1', provider_state_json:JSON.stringify({accepted:true,pollFailures:0}), result_json:null,
    hold_reason:null, created_at:1, updated_at:1, ...overrides
  };
}

function jobDb(row) {
  return {
    async batch(statements){return statements.map(()=>({success:true}));},
    prepare(sql) {
      return {
        values:[],
        bind(...values){this.values=values;return this;},
        async first(){if(sql.startsWith('SELECT * FROM media_runtime_jobs WHERE id='))return row;throw new Error(`Unexpected first SQL: ${sql}`);},
        async run(){
          if(sql.startsWith('UPDATE media_runtime_jobs SET provider_state_json=')){
            row.provider_state_json=this.values[0];row.updated_at=this.values[1];return {success:true};
          }
          if(sql.includes("status='held'")&&sql.includes("hold_reason='media_provider_job_missing'")){
            row.status='held';row.hold_reason='media_provider_job_missing';row.updated_at=this.values[0];return {success:true};
          }
          if(sql.startsWith('UPDATE media_runtime_jobs SET status=?,actual_microusd=')){
            [row.status,row.actual_microusd,row.result_json,row.hold_reason,row.updated_at]=this.values;return {success:true};
          }
          if(sql.includes("status='held'")&&sql.includes("hold_reason='media_provider_terminal_failure'")){
            row.status='held';row.actual_microusd=this.values[0];row.provider_state_json=this.values[1];row.hold_reason='media_provider_terminal_failure';row.updated_at=this.values[2];return {success:true};
          }
          if(sql.startsWith('UPDATE media_runtime_jobs SET status=?,provider_state_json=')){
            row.status=this.values[0];row.provider_state_json=this.values[1];row.updated_at=this.values[2];return {success:true};
          }
          throw new Error(`Unexpected run SQL: ${sql}`);
        }
      };
    }
  };
}

{
  const response = await handleMedia(new Request('https://studio.example/api/media/settings?projectId=project_1'),{});
  assert.equal(response.status,503,'async handler failures must be caught and serialized');
  assert.equal((await response.json()).error,'database_not_configured');
  const missing = await handleMedia(new Request('https://studio.example/api/media/not-a-route'),{});
  assert.equal(missing.status,404);
}

{
  let providerCalls=0;
  const response = await handleMedia(new Request('https://studio.example/api/media/jobs',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({projectId:'project_1',nodeId:'video',quoteId:'quote_1',confirmationId:'quote_1',idempotencyKey:'run_1'})
  }),{WORKFLOW_MEDIA_EXECUTION_ENABLED:'false',MEDIA_FETCH:async()=>{providerCalls+=1;throw new Error('must not run');}});
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'media_execution_disabled');
  assert.equal(providerCalls,0,'disabled execution must make zero provider calls');
}

{
  let providerCalls=0;
  const existing=jobRow({node_id:'image',quote_id:'quote_existing'});
  const db={prepare(sql){return {values:[],bind(...values){this.values=values;return this;},async first(){
    if(sql.startsWith('SELECT id FROM production_projects'))return {id:'project_1'};
    if(sql.startsWith('SELECT * FROM media_runtime_jobs WHERE project_id='))return existing;
    throw new Error(`Unexpected first SQL: ${sql}`);
  }};}};
  const response=await handleMedia(new Request('https://studio.example/api/media/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:'project_1',nodeId:'video',quoteId:'quote_new',confirmationId:'quote_new',idempotencyKey:'same_key'})}),{
    AUTH_DB:db,WORKFLOW_MEDIA_EXECUTION_ENABLED:'true',MEDIA_FETCH:async()=>{providerCalls+=1;throw new Error('must not run');}
  });
  assert.equal(response.status,409);
  assert.equal((await response.json()).error,'media_idempotency_conflict');
  assert.equal(providerCalls,0);
}

{
  const row=jobRow();
  const response=await handleMedia(new Request('https://studio.example/api/media/jobs/job_1/poll',{method:'POST'}),{
    AUTH_DB:jobDb(row),OPENROUTER_API_KEY:'sk-or-v1-test-key-long-enough',MEDIA_FETCH:async()=>jsonResponse({error:'temporary'},503)
  });
  assert.equal(response.status,502);
  assert.equal((await response.json()).error,'media_poll_retryable');
  assert.equal(row.status,'submitted','a read failure must keep the existing provider job retryable');
  assert.equal(JSON.parse(row.provider_state_json).pollFailures,1);
}

{
  const row=jobRow();
  const response=await handleMedia(new Request('https://studio.example/api/media/jobs/job_1/poll',{method:'POST'}),{
    AUTH_DB:jobDb(row),OPENROUTER_API_KEY:'sk-or-v1-test-key-long-enough',
    MEDIA_FETCH:async()=>jsonResponse({id:'provider_job_1',status:'failed',usage:{cost:0.12}})
  });
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.job.status,'held','a terminal provider failure may still have charged and must keep the reserve held');
  assert.equal(body.job.actualUsd,0.12);
  assert.equal(body.job.holdReason,'media_provider_terminal_failure');
}

for (const scenario of [
  {name:'within reserve',usage:{cost:0.25,is_byok:false},expectedStatus:'complete',expectedReason:null},
  {name:'over reserve',usage:{cost:0.75,is_byok:false},expectedStatus:'held',expectedReason:'media_actual_cost_exceeded_reserve'},
  {name:'BYOK rejected',usage:{cost:0.25,is_byok:true},expectedStatus:'held',expectedReason:'openrouter_byok_disallowed'},
  {name:'billing unknown',usage:{cost:0.25},expectedStatus:'held',expectedReason:'openrouter_billing_mode_unverified'}
]) {
  const row=jobRow();
  const response=await handleMedia(new Request('https://studio.example/api/media/jobs/job_1/poll',{method:'POST'}),{
    AUTH_DB:jobDb(row),OPENROUTER_API_KEY:'sk-or-v1-test-key-long-enough',WORKFLOW_PILOT_BILLING_MODE:'openrouter_credits',
    MEDIA_FETCH:async()=>jsonResponse({id:'provider_job_1',status:'completed',usage:scenario.usage,unsigned_urls:['/api/v1/videos/provider_job_1/content?index=0']})
  });
  assert.equal(response.status,200,scenario.name);
  const body=await response.json();
  assert.equal(body.job.status,scenario.expectedStatus,scenario.name);
  assert.equal(body.job.holdReason,scenario.expectedReason,scenario.name);
  assert.equal(body.job.assets.length,scenario.expectedStatus==='complete'?1:1,'held output metadata remains recoverable but asset route stays gated');
}

console.log('MEDIA RUNTIME PASS: assertions cover live catalog contracts, provider-specific request shapes, nested fal queue paths, canonical OpenRouter references, execution-off zero-fetch, retryable polling without resubmit, unresolved-budget holds, and credit/cost holds.');
