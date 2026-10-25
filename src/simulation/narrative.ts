import type {NarrativeContent} from '../author/content';
import config from '../data/narrative-test.json' with {type:'json'};
import hamster from '../data/npcs/customer-001.json' with {type:'json'};
import type {CharacterData} from '../characters';
import type {Goods} from './world';
export {config as narrativeContent};
export const CUSTOMER_001=hamster.customer.customerId;
export interface CustomerProfile extends CharacterData {customerId:string;displayName:string;spriteId:string;portraitId:string;shoppingPreferences:Goods[];visitCount:number;dialogueFlags:Record<string,boolean>;eventFlags:Record<string,boolean>;relationshipState:Record<string,string>;lastVisitDay:number}
export interface NarrativeRecord {version:1;profiles:Record<string,CustomerProfile>;active:{eventId:string;visitorId:string;nodeId:string}|null;firstDueDays?:Record<string,number>}
export interface ShelfAccess {purchased:boolean;installed:boolean;goodsReachable:boolean}
type Event=NarrativeContent['events'][number]&{trigger?:'shelf'|'checkout';requiresAccessibleShelf?:boolean;requiresDifferentVisit?:boolean};
const official=hamster as unknown as NarrativeContent;
const labels:Record<string,string>={listen:'先听对方说',brief:'保持简短',later:'这次先结账'};
export class Narrative {
 data:NarrativeRecord;
 constructor(data?:NarrativeRecord,readonly content:NarrativeContent=config as NarrativeContent){
  this.data=data?structuredClone(data):{version:1,profiles:{},active:null,firstDueDays:{[CUSTOMER_001]:2}};
 }
 private get contents(){return [this.content,official];}
 private source(id:string){return this.contents.find(c=>c.customer.customerId===id);}
 private sourceForEvent(id:string){return this.contents.find(c=>c.events.some(e=>e.eventId===id));}
 private choiceLabel(value:string){for(const nodes of Object.values(this.content.dialogues))for(const node of Object.values(nodes)){const choice=node.choices?.find(c=>c.value===value);if(choice)return choice.label;}return labels[value]??'未选择';}
 private profile(id:string){const source=this.source(id);if(!source)return null;return this.data.profiles[id]??= {...source.customer,id,shoppingPreferences:source.customer.shoppingPreferences as Goods[],visitCount:0,dialogueFlags:{},eventFlags:{},relationshipState:{},lastVisitDay:0};}
 visit(id:string,day:number,visitorId?:string){
  const p=this.profile(id);if(!p)return false;
  if(visitorId&&p.eventFlags['visited-'+visitorId])return false;
  if(visitorId)p.eventFlags['visited-'+visitorId]=true;
  p.visitCount++;p.lastVisitDay=day;return true;
 }
 /** Plan identities once; reloading a persisted plan never calls this again. */
 scheduledSpecial(day:number,random=Math.random){
  const p=this.data.profiles[CUSTOMER_001];if(day<hamster.schedule.earliestDay)return null;
  if(!p?.visitCount)return day>=(this.data.firstDueDays?.[CUSTOMER_001]??2)?CUSTOMER_001:null;
  return day-p.lastVisitDay>=hamster.schedule.minReturnGap&&random()<hamster.schedule.returnWeight?CUSTOMER_001:null;
 }
 migrateUnmetSchedule(day:number,hadSavedNarrative=true){
  if(!hadSavedNarrative||!this.data.firstDueDays)this.data.firstDueDays={[CUSTOMER_001]:Math.max(2,day+1)};
 }
 pending(id:string,day:number,trigger:'shelf'|'checkout'='checkout',access?:ShelfAccess,visitorId?:string){
  const p=this.profile(id),source=this.source(id);if(!p||!source)return null;
  return (source.events as Event[]).find(e=>
   p.visitCount>=e.minVisits&&(e.maxVisits===undefined||p.visitCount<=e.maxVisits)&&day>=e.minDay&&
   (!e.requires||p.eventFlags[e.requires])&&(e.repeatable||!p.dialogueFlags[e.eventId])&&
   (e.trigger??'checkout')===trigger&&
   (!e.requiresAccessibleShelf||!!(access?.purchased&&access.installed&&access.goodsReachable))&&
   (!e.requiresDifferentVisit||!visitorId||!p.eventFlags[e.requires+'-visitor-'+visitorId])
  )??null;
 }
 begin(id:string,visitorId:string,day:number,trigger:'shelf'|'checkout'='checkout',access?:ShelfAccess){
  if(this.data.active)return false;const event=this.pending(id,day,trigger,access,visitorId);if(!event)return false;
  this.data.active={eventId:event.eventId,visitorId,nodeId:event.entry};return true;
 }
 get event(){return this.sourceForEvent(this.data.active?.eventId??'')?.events.find(e=>e.eventId===this.data.active?.eventId);}
 get current(){
  const event=this.event,active=this.data.active;if(!event||!active)return null;
  const source=this.sourceForEvent(event.eventId)!,node=source.dialogues[event.dialogueRef][active.nodeId],profile=this.profile(event.customerId)!;
  return {...node,text:node.text.replaceAll('{previousChoice}',this.choiceLabel(profile.relationshipState.reply)),displayName:profile.preferredName||profile.displayName,portraitId:profile.portraitId,notice:source.notice,choices:node.choices??[]};
 }
 choose(index:number){const node=this.current,active=this.data.active,event=this.event,choice=node?.choices[index];if(!choice||!active||!event)return false;const p=this.profile(event.customerId)!;p.relationshipState.reply=choice.value;p.eventFlags[choice.flag]=true;active.nodeId=choice.next;return true;}
 continue(){const node=this.current;if(!node||node.choices.length)return false;const event=this.event!,active=this.data.active!,source=this.sourceForEvent(event.eventId)!;const next=source.dialogues[event.dialogueRef][active.nodeId].next;if(next){active.nodeId=next;return true;}return this.finish(false);}
 skip(){return this.finish(true);}
 private finish(skipped:boolean){
  const event=this.event,active=this.data.active;if(!event||!active)return false;
  const p=this.profile(event.customerId)!;p.dialogueFlags[event.eventId]=true;p.eventFlags[event.resultFlag]=true;
  p.eventFlags[event.resultFlag+'-visitor-'+active.visitorId]=true;
  if(skipped)p.eventFlags[event.eventId+'-skipped']=true;this.data.active=null;return true;
 }
}
export function validNarrative(value:unknown):value is NarrativeRecord{
 if(!value||typeof value!=='object')return false;const d=value as NarrativeRecord;if(d.version!==1||!d.profiles||typeof d.profiles!=='object'||Array.isArray(d.profiles))return false;
 const bools=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(x=>typeof x==='boolean');
 if(d.firstDueDays!==undefined&&(!d.firstDueDays||typeof d.firstDueDays!=='object'||Array.isArray(d.firstDueDays)||!Object.values(d.firstDueDays).every(n=>Number.isInteger(n)&&n>=2&&n<=1000000)))return false;
 for(const [id,p] of Object.entries(d.profiles)){if(!p||p.customerId!==id||typeof p.displayName!=='string'||typeof p.spriteId!=='string'||typeof p.portraitId!=='string'||!Array.isArray(p.shoppingPreferences)||!p.shoppingPreferences.every(g=>['milk','bread','rice'].includes(g))||!Number.isInteger(p.visitCount)||p.visitCount<0||!Number.isInteger(p.lastVisitDay)||p.lastVisitDay<0||!bools(p.dialogueFlags)||!bools(p.eventFlags)||!p.relationshipState||typeof p.relationshipState!=='object'||!Object.values(p.relationshipState).every(v=>typeof v==='string'))return false;}
 if(d.active!==null){const a=d.active,source=[config as NarrativeContent,official].find(c=>c.events.some(e=>e.eventId===a?.eventId)),event=source?.events.find(e=>e.eventId===a?.eventId);if(!event||!source||typeof a.visitorId!=='string'||!d.profiles[event.customerId]||!source.dialogues[event.dialogueRef][a.nodeId])return false;}
 return true;
}
