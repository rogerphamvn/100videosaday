import validators from './prompt-validators.generated.mjs';

export function validatePromptPair(mega,negative) {
  const errors=[];
  for(const [name,validator,value] of [['mega',validators.validateMega,mega],['negative',validators.validateNegative,negative]]) {
    if(!validator(value)) errors.push(...validator.errors.slice(0,25).map(e=>`${name}${e.instancePath}: ${e.message}`));
  }
  if(errors.length) return {valid:false,errors};
  const check=(condition,message)=>{if(!condition)errors.push(message);};
  const unique=(values,label)=>check(new Set(values).size===values.length,`duplicate ${label}`);
  const evidence=new Map(mega.sourceEvidence.map(e=>[e.evidenceId,e]));
  const claims=new Map(mega.approvedClaims.map(c=>[c.claimId,c]));
  unique([...mega.sourceEvidence.map(e=>e.evidenceId)],'evidenceId');
  unique(mega.approvedClaims.map(c=>c.claimId),'claimId');
  const refs=(list,set,label)=>list.forEach(id=>check(set.has(id),`${label}: unresolved reference ${id}`));
  for(const claim of claims.values()) refs(claim.evidenceRefs,evidence,'claim');
  for(const key of ['audience','motivator','painPoint','useCase','trend']) {
    const h=mega.strategy[key];if(!h)continue;
    refs(h.evidenceRefs,evidence,key);
    check(h.status==='untested_hypothesis'?Boolean(h.testMethod):h.evidenceRefs.length>0,`${key}: evidence or test method required`);
  }
  refs(mega.strategy.hook.claimRefs,claims,'hook');
  unique(mega.productLock.references.map(r=>r.referenceId),'referenceId');
  for(const r of mega.productLock.references) {
    const e=evidence.get(r.evidenceRef);check(Boolean(e),`productLock unresolved ${r.evidenceRef}`);if(!e)continue;
    if(['product_identity','packaging_identity','logo_identity'].includes(r.role)) {
      // Exact uploaded bytes establish visual identity, not approval of marketing claims.
      const identitySource = e.reviewStatus==='approved'||(e.reviewStatus==='unverified'&&e.hashStatus==='verified_bytes');
      check(e.productEvidence&&identitySource&&r.fidelity!=='inspiration_only','identity requires approved evidence or unreviewed verified product bytes');
      if(mega.authorship.verificationStatus==='actual_invocation_verified')check(e.hashStatus==='verified_bytes','identity hash must be verified_bytes');
    }
    if(!e.productEvidence)check(r.fidelity==='inspiration_only','non-product reference must be inspiration_only');
  }
  const fixture=mega.authorship.verificationStatus==='synthetic_fixture';
  if(fixture) {
    check(mega.productLock.syntheticDemo&&mega.authorship.invocationRef==='demo:no-actual-model-call','fixture provenance invalid');
    check(mega.sourceEvidence.every(e=>e.hashStatus==='illustrative_fixture'),'fixture evidence must be illustrative');
  } else check(!mega.authorship.invocationRef.startsWith('demo:'),'verified invocation cannot be demo');
  const [rw,rh]=mega.output.aspectRatio.split(':').map(Number);
  check(Math.abs(mega.output.widthPx/mega.output.heightPx-rw/rh)<=.002,'aspect ratio does not match dimensions');
  const creative=mega.creative;
  const shots=creative.shots||[];
  if(mega.mediaType==='video') {
    unique(shots.map(s=>s.shotId),'shotId');let end=0;
    for(const shot of shots){check(Math.abs(shot.startS-end)<1e-9&&shot.endS>shot.startS,'video timeline gap, overlap or reversed shot');end=shot.endS;}
    check(Math.abs(end-creative.durationS)<1e-9,'video duration does not match timeline');
  }
  for(const overlay of [...(creative.textOverlays||[]),...shots.flatMap(s=>s.textOverlays||[])]) {
    const claim=claims.get(overlay.claimRef);
    check(Boolean(claim)&&claim.exactText===overlay.exactText,'overlay must match approved claim exactly');
    if(claim?.allowedContexts?.length)check(claim.allowedContexts.includes('overlay'),'claim not approved for overlay');
  }
  check(negative.megaPromptId===mega.promptId&&negative.megaPromptRevision===mega.revision,'negative pair ID/revision mismatch');
  check(negative.mediaType===mega.mediaType,'negative media type mismatch');
  for(const key of ['projectId','sourceSnapshotId'])check(negative.provenance[key]===mega.provenance[key],`negative ${key} mismatch`);
  check(negative.authorship.verificationStatus===mega.authorship.verificationStatus,'pair authorship status mismatch');
  check(negative.authorship.modelFamily===mega.authorship.modelFamily,'pair model family mismatch');
  if(negative.authorship.verificationStatus==='synthetic_fixture')check(negative.authorship.invocationRef==='demo:no-actual-model-call','negative fixture invocation invalid');
  else check(!negative.authorship.invocationRef.startsWith('demo:'),'negative verified invocation cannot be demo');
  unique(negative.constraints.map(c=>c.constraintId),'constraintId');
  const required=['product_geometry','packaging','logo','text','physics','unsupported_claim',...(mega.mediaType==='video'?['continuity','audio']:[])];
  const categories=new Set(negative.constraints.map(c=>c.category));required.forEach(c=>check(categories.has(c),`negative missing ${c}`));
  const shotIds=new Set(shots.map(s=>s.shotId));
  for(const constraint of negative.constraints) {
    if(constraint.scope.type==='shot') {check(mega.mediaType==='video','shot scope on image');refs(constraint.scope.shotRefs,shotIds,'negative shot');}
    check(!(constraint.severity==='must_not'&&negative.policy.unsupportedHandling==='omit_and_report'),'must_not cannot be omitted');
  }
  return {valid:errors.length===0,errors};
}
