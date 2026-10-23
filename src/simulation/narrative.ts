import config from '../data/narrative-test.json' with {type:'json'};
import type {CharacterData} from '../characters';
import type {Goods} from './world';
export {config as narrativeContent};
export interface CustomerProfile extends CharacterData {customerId:string;displayName:string;spriteId:string;portraitId:string;shoppingPreferences:Goods[];visitCount:number;dialogueFlags:Record<string,boolean>;eventFlags:Record<string,boolean>;relationshipState:Record<string,string>;lastVisitDay:number}
export interface NarrativeRecord {version:1;profiles:Record<string,CustomerProfile>;active:{eventId:string;visitorId:string;nodeId:string}|null}
interface Choice {label:string;value:string;flag:string;next:string}
interface Node {text:string;expression:string;choices?:Choice[];next?:string}
const dialogues=config.dialogues as Record<string,Record<string,Node>>;
const labels:Record<string,string>={listen:'先听对方说',brief:'保持简短',later:'这次先结账'};
export class Narrative {
 data:NarrativeRecord;
 constructor(data?:NarrativeRecord){this.data=data?structuredClone(data):{version:1,profiles:{},active:null};}
 private profile(id:string){if(id!==config.customer.customerId)return null;return this.data.profiles[id]??= {...config.customer,id,shoppingPreferences:config.customer.shoppingPreferences as Goods[],visitCount:0,dialogueFlags:{},eventFlags:{},relationshipState:{},lastVisitDay:0};}
 visit(id:string,day:number){const p=this.profile(id);if(p){p.visitCount++;p.lastVisitDay=day;}}
 pending(id:string,day:number){const p=this.profile(id);if(!p)return null;return config.events.find(e=>e.customerId===id&&p.visitCount>=e.minVisits&&(!('maxVisits' in e)||p.visitCount<=e.maxVisits!)&&day>=e.minDay&&(!('requires' in e)||p.eventFlags[e.requires!])&&(e.repeatable||!p.dialogueFlags[e.eventId]))??null;}
 begin(id:string,visitorId:string,day:number){if(this.data.active)return false;const event=this.pending(id,day);if(!event)return false;this.data.active={eventId:event.eventId,visitorId,nodeId:event.entry};return true;}
 get event(){return config.events.find(e=>e.eventId===this.data.active?.eventId);}
 get current(){const event=this.event,active=this.data.active;if(!event||!active)return null;const node=dialogues[event.dialogueRef][active.nodeId];const profile=this.profile(event.customerId)!;return{...node,text:node.text.replaceAll('{previousChoice}',labels[profile.relationshipState.reply]??'未选择'),displayName:profile.displayName,portraitId:profile.portraitId,choices:node.choices??[]};}
 choose(index:number){const node=this.current,active=this.data.active,event=this.event,choice=node?.choices[index];if(!choice||!active||!event)return false;const p=this.profile(event.customerId)!;p.relationshipState.reply=choice.value;p.eventFlags[choice.flag]=true;active.nodeId=choice.next;return true;}
 continue(){const node=this.current;if(!node||node.choices.length)return false;const event=this.event!,active=this.data.active!;const next=dialogues[event.dialogueRef][active.nodeId].next;if(next){active.nodeId=next;return true;}return this.finish(false);}
 skip(){return this.finish(true);}
 private finish(skipped:boolean){const event=this.event;if(!event)return false;const p=this.profile(event.customerId)!;p.dialogueFlags[event.eventId]=true;p.eventFlags[event.resultFlag]=true;if(skipped)p.eventFlags[event.eventId+'-skipped']=true;this.data.active=null;return true;}
}
export function validNarrative(value:unknown):value is NarrativeRecord{
 if(!value||typeof value!=='object')return false;const d=value as NarrativeRecord;if(d.version!==1||!d.profiles||typeof d.profiles!=='object'||Array.isArray(d.profiles))return false;
 const bools=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(x=>typeof x==='boolean');
 for(const [id,p] of Object.entries(d.profiles)){if(!p||p.customerId!==id||typeof p.displayName!=='string'||typeof p.spriteId!=='string'||typeof p.portraitId!=='string'||!Array.isArray(p.shoppingPreferences)||!p.shoppingPreferences.every(g=>['milk','bread','rice'].includes(g))||!Number.isInteger(p.visitCount)||p.visitCount<0||!Number.isInteger(p.lastVisitDay)||p.lastVisitDay<0||!bools(p.dialogueFlags)||!bools(p.eventFlags)||!p.relationshipState||typeof p.relationshipState!=='object'||!Object.values(p.relationshipState).every(v=>typeof v==='string'))return false;}
 if(d.active!==null){const a=d.active,event=config.events.find(e=>e.eventId===a?.eventId);if(!event||typeof a.visitorId!=='string'||!d.profiles[event.customerId]||!dialogues[event.dialogueRef][a.nodeId])return false;}
 return true;
}
