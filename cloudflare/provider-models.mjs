import {workflowProviderInternals} from '../integrations/workflow-providers.mjs';
const roles=['analyze','research','strategy','prompt'];
const binding=role=>`WORKFLOW_${role.toUpperCase()}_MODEL_ID`;
export class ModelSettingsError extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status;}}
async function project(env,id){
  if(typeof id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(id))throw new ModelSettingsError('project_id_invalid');
  if(!await env.AUTH_DB.prepare('SELECT id FROM production_projects WHERE id=?').bind(id).first())throw new ModelSettingsError('project_not_found',404);
}
export async function modelSettings(env,id){
  await project(env,id);
  const row=await env.AUTH_DB.prepare('SELECT * FROM provider_project_models WHERE project_id=?').bind(id).first();
  const models=row?JSON.parse(row.models_json):Object.fromEntries(roles.map(role=>[role,env[binding(role)]||workflowProviderInternals.STAGE_MODEL_POLICY[role][0]]));
  for(const role of roles)if(!workflowProviderInternals.STAGE_MODEL_POLICY[role].includes(models[role]))throw new ModelSettingsError('model_configuration_invalid',503);
  return {models,choices:workflowProviderInternals.STAGE_MODEL_POLICY,source:row?'project':'default',revision:row?Number(row.revision):0};
}
export async function saveModelSettings(env,input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['projectId','models'].includes(k)))throw new ModelSettingsError('model_settings_invalid');
  await project(env,input.projectId);
  if(!input.models||typeof input.models!=='object'||Array.isArray(input.models)||Object.keys(input.models).length!==roles.length||roles.some(role=>!workflowProviderInternals.STAGE_MODEL_POLICY[role].includes(input.models[role])))throw new ModelSettingsError('model_role_mismatch');
  const busy=await env.AUTH_DB.prepare("SELECT id FROM workflow_runs WHERE project_id=? AND (status='running' OR lease_expires_at>=?) LIMIT 1").bind(input.projectId,Math.floor(Date.now()/1000)).first();
  if(busy)throw new ModelSettingsError('workflow_busy',409);
  const current=await modelSettings(env,input.projectId);
  if(roles.every(role=>current.models[role]===input.models[role]))return current;
  const result=await env.AUTH_DB.prepare(`INSERT INTO provider_project_models(project_id,models_json,revision,updated_at)
    SELECT ?,?,1,? WHERE NOT EXISTS(SELECT 1 FROM workflow_runs WHERE project_id=? AND (status='running' OR lease_expires_at>=?))
    ON CONFLICT(project_id) DO UPDATE SET models_json=excluded.models_json,revision=provider_project_models.revision+1,updated_at=excluded.updated_at`)
    .bind(input.projectId,JSON.stringify(Object.fromEntries(roles.map(role=>[role,input.models[role]]))),Math.floor(Date.now()/1000),input.projectId,Math.floor(Date.now()/1000)).run();
  if(Number(result.meta?.changes)!==1)throw new ModelSettingsError('workflow_busy',409);
  return modelSettings(env,input.projectId);
}
export async function withProjectModels(env,id){
  const settings=await modelSettings(env,id);
  return {...env,WORKFLOW_MODEL_REVISION:settings.revision,...Object.fromEntries(roles.map(role=>[binding(role),settings.models[role]]))};
}
