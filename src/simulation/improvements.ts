import config from '../data/improvements.json' with {type:'json'};
export {config as improvementContent};
export type TodoSource='customer-request'|'observation'|'existing-improvement';
export interface TodoEntry {status:'open'|'completed';source:TodoSource;discoveredDay:number;completedDay:number|null;temporaryHelpDay:number|null}
export interface ImprovementRecord {version:1;entries:Record<string,TodoEntry>;facilities:Record<string,{installedDay:number}>}
export const freshImprovements=():ImprovementRecord=>({version:1,entries:{},facilities:{}});
export const improvementTask=(id:string)=>config.tasks.find(t=>t.id===id&&t.enabled);
export function discoverImprovement(record:ImprovementRecord,id:string,source:TodoSource,day:number){
 if(!improvementTask(id)||record.entries[id])return false;
 record.entries[id]={status:'open',source,discoveredDay:day,completedDay:null,temporaryHelpDay:null};return true;
}
export function noteTemporaryHelp(record:ImprovementRecord,id:string,day:number){const entry=record.entries[id];if(!entry||entry.temporaryHelpDay!==null)return false;entry.temporaryHelpDay=day;return true;}
/** Only called from a verified world improvement or migration, never a checkbox click. */
export function installImprovement(record:ImprovementRecord,id:string,day:number){
 const task=improvementTask(id);if(!task?.facilityId)return false;
 discoverImprovement(record,id,'existing-improvement',day);
 const entry=record.entries[id];if(entry.status==='completed'&&record.facilities[task.facilityId])return false;
 record.facilities[task.facilityId]??={installedDay:day};entry.status='completed';entry.completedDay??=day;return true;
}
export function validImprovements(value:unknown):value is ImprovementRecord{
 if(!value||typeof value!=='object')return false;const v=value as ImprovementRecord;
 const obj=(x:unknown)=>!!x&&typeof x==='object'&&!Array.isArray(x),day=(x:unknown)=>Number.isInteger(x)&&Number(x)>=1&&Number(x)<=1000000;
 if(v.version!==1||!obj(v.entries)||!obj(v.facilities))return false;
 if(!Object.values(v.entries).every(e=>e&&['open','completed'].includes(e.status)&&['customer-request','observation','existing-improvement'].includes(e.source)&&day(e.discoveredDay)&&(e.temporaryHelpDay===null||day(e.temporaryHelpDay)&&e.temporaryHelpDay>=e.discoveredDay)&&(e.status==='open'?e.completedDay===null:day(e.completedDay)&&e.completedDay!>=e.discoveredDay)))return false;
 if(!Object.values(v.facilities).every(f=>f&&day(f.installedDay)))return false;
 // Known completed tasks require a real persisted facility. Preserve unknown future task IDs.
 return config.tasks.filter(t=>t.enabled&&t.facilityId).every(t=>!v.entries[t.id]||v.entries[t.id].status!=='completed'||!!v.facilities[t.facilityId!]);
}
