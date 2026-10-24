import {emptyEnvironmentFacts} from './environment-dialogue';
import {eligibleNpcDialogues,npcDialogue,pickNpcDialogue,type NpcDialogue} from './npc-dialogues';
import {npcDefinitions,npcProfile} from './npc001';
import type {NarrativeContent} from '../author/content';
import config from '../data/narrative-test.json' with {type:'json'};
import type {CharacterData} from '../characters';
import type {Goods} from './world';
export {config as narrativeContent};
export interface CustomerProfile extends CharacterData {customerId:string;displayName:string;spriteId:string;portraitId:string;shoppingPreferences:Goods[];visitCount:number;dialogueFlags:Record<string,boolean>;eventFlags:Record<string,boolean>;relationshipState:Record<string,string>;lastVisitDay:number;dialogueHistory?:Record<string,{count:number;lastDay:number}>}
export interface NarrativeRecord {version:1;profiles:Record<string,CustomerProfile>;active:{eventId:string;visitorId:string;nodeId:string}|null}
interface Choice {label:string;value:string;flag:string;next:string}
interface Node {text:string;expression:string;choices?:Choice[];next?:string}
const dialogues=config.dialogues as Record<string,Record<string,Node>>;
const labels:Record<string,string>={listen:'先听对方说',brief:'保持简短',later:'这次先结账'};
export class Narrative {
 environment=emptyEnvironmentFacts();
 data:NarrativeRecord;
 constructor(data?:NarrativeRecord,readonly content:NarrativeContent=config as NarrativeContent,public allowDrafts=false){this.data=data?structuredClone(data):{version:1,profiles:{},active:null};}
 private choiceLabel(value:string){for(const nodes of Object.values(this.content.dialogues))for(const node of Object.values(nodes)){const choice=node.choices?.find(c=>c.value===value);if(choice)return choice.label;}return labels[value]??'未选择';}
 private profile(id:string){if(id!==this.content.customer.customerId)return null;return this.data.profiles[id]??= {...this.content.customer,id,shoppingPreferences:this.content.customer.shoppingPreferences as Goods[],visitCount:0,dialogueFlags:{},eventFlags:{},relationshipState:{},lastVisitDay:0};}
 visit(id:string,day:number){const p=npcProfile(this.data,id)??this.profile(id);if(p){p.visitCount++;p.lastVisitDay=day;}}
 pending(id:string,day:number){const p=this.profile(id);if(!p)return null;return this.content.events.find(e=>e.customerId===id&&p.visitCount>=e.minVisits&&(!('maxVisits' in e)||p.visitCount<=e.maxVisits!)&&day>=e.minDay&&(!('requires' in e)||p.eventFlags[e.requires!])&&(e.repeatable||!p.dialogueFlags[e.eventId]))??null;}
 begin(id:string,visitorId:string,day:number){if(this.data.active)return false;const event=this.pending(id,day);if(!event)return false;this.data.active={eventId:event.eventId,visitorId,nodeId:event.entry};return true;}
 get event(){return this.content.events.find(e=>e.eventId===this.data.active?.eventId);}
 private rememberNpcDialogue(chosen:NpcDialogue,day:number){const p=npcProfile(this.data,chosen.npcId)!;Object.assign(p.eventFlags,chosen.effects?.eventFlags??{});p.dialogueHistory??={};const prior=p.dialogueHistory[chosen.dialogueId];p.dialogueHistory[chosen.dialogueId]={count:(prior?.count??0)+1,lastDay:day};if(chosen.trigger!=='shelf')p.relationshipState.lastChatVisit=String(p.visitCount);}
 beginNpcDialogue(npcId:string,visitorId:string,day:number,trigger:'shelf'|'chat',random=Math.random){if(this.data.active)return false;const chosen=pickNpcDialogue(eligibleNpcDialogues(this.data,npcId,day,trigger,this.allowDrafts,this.environment),random);if(!chosen)return false;this.rememberNpcDialogue(chosen,day);this.data.active={eventId:`npc:${npcId}:${chosen.dialogueId}`,visitorId,nodeId:'0'};return true;}
 checkoutBark(npcId:string,day:number,random=Math.random){if(random()>=.25)return null;const chosen=pickNpcDialogue(eligibleNpcDialogues(this.data,npcId,day,'checkout',this.allowDrafts,this.environment).filter(d=>d.lines.length===1),random);if(!chosen)return null;this.rememberNpcDialogue(chosen,day);return chosen.lines[0];}
 get current(){if(this.data.active?.eventId.startsWith('npc:')){const entry=npcDialogue(this.data.active.eventId.split(':')[2],this.allowDrafts,this.data.active.eventId.split(':')[1]),p=this.data.profiles[this.data.active.eventId.split(':')[1]];if(!entry||!p||typeof entry.lines[Number(this.data.active.nodeId)]!=='string')return null;return{text:entry.lines[Number(this.data.active.nodeId)],expression:'neutral',displayName:p.preferredName||p.displayName,portraitId:p.portraitId,choices:[] as Choice[],npcStatus:entry.status};}const event=this.event,active=this.data.active;if(!event||!active)return null;const node=this.content.dialogues[event.dialogueRef][active.nodeId];const profile=this.profile(event.customerId)!;return{...node,text:node.text.replaceAll('{previousChoice}',this.choiceLabel(profile.relationshipState.reply)),displayName:profile.preferredName||profile.displayName,portraitId:profile.portraitId,npcStatus:undefined,choices:node.choices??[]};}
 choose(index:number){const node=this.current,active=this.data.active,event=this.event,choice=node?.choices[index];if(!choice||!active||!event)return false;const p=this.profile(event.customerId)!;p.relationshipState.reply=choice.value;p.eventFlags[choice.flag]=true;active.nodeId=choice.next;return true;}
 continue(){if(this.data.active?.eventId.startsWith('npc:')){const entry=npcDialogue(this.data.active.eventId.split(':')[2],this.allowDrafts,this.data.active.eventId.split(':')[1]);if(entry&&Number(this.data.active.nodeId)+1<entry.lines.length){this.data.active.nodeId=String(Number(this.data.active.nodeId)+1);return true;}return this.finishNpc();}const node=this.current;if(!node||node.choices.length)return false;const event=this.event!,active=this.data.active!;const next=this.content.dialogues[event.dialogueRef][active.nodeId].next;if(next){active.nodeId=next;return true;}return this.finish(false);}
 skip(){if(this.data.active?.eventId.startsWith('npc:'))return this.finishNpc();return this.finish(true);}
 private finishNpc(){if(!this.data.active)return false;const npcId=this.data.active.eventId.split(':')[1],p=this.data.profiles[npcId],definition=npcDefinitions[npcId];if(p&&definition){p.eventFlags[definition.flags.met]=true;p.dialogueFlags[this.data.active.eventId]=true;}this.data.active=null;return true;}
 private finish(skipped:boolean){const event=this.event;if(!event)return false;const p=this.profile(event.customerId)!;p.dialogueFlags[event.eventId]=true;p.eventFlags[event.resultFlag]=true;if(skipped)p.eventFlags[event.eventId+'-skipped']=true;this.data.active=null;return true;}
}
export function validNarrative(value:unknown):value is NarrativeRecord{
 if(!value||typeof value!=='object')return false;const d=value as NarrativeRecord;if(d.version!==1||!d.profiles||typeof d.profiles!=='object'||Array.isArray(d.profiles))return false;
 const bools=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.values(v).every(x=>typeof x==='boolean');
 for(const [id,p] of Object.entries(d.profiles)){if(!p||p.customerId!==id||typeof p.displayName!=='string'||typeof p.spriteId!=='string'||typeof p.portraitId!=='string'||!Array.isArray(p.shoppingPreferences)||!p.shoppingPreferences.every(g=>['milk','bread','rice'].includes(g))||!Number.isInteger(p.visitCount)||p.visitCount<0||!Number.isInteger(p.lastVisitDay)||p.lastVisitDay<0||!bools(p.dialogueFlags)||!bools(p.eventFlags)||!p.relationshipState||typeof p.relationshipState!=='object'||!Object.values(p.relationshipState).every(v=>typeof v==='string'))return false;if(p.dialogueHistory!==undefined&&(!p.dialogueHistory||typeof p.dialogueHistory!=='object'||Array.isArray(p.dialogueHistory)||!Object.values(p.dialogueHistory).every(h=>h&&Number.isInteger(h.count)&&h.count>=0&&Number.isInteger(h.lastDay)&&h.lastDay>=0)))return false;}
 if(d.active!==null&&d.active?.eventId?.startsWith('npc:')){const a=d.active;if(!/^npc:CUSTOMER_[0-9]{3}:[a-z][a-z0-9-]{0,79}$/.test(a.eventId)||!/^([0-9]|1[0-9])$/.test(a.nodeId)||typeof a.visitorId!=='string'||!npcDefinitions[a.eventId.split(':')[1]]||!d.profiles[a.eventId.split(':')[1]])return false;}
 else if(d.active!==null){const a=d.active,event=config.events.find(e=>e.eventId===a?.eventId);if(!event||typeof a.visitorId!=='string'||!d.profiles[event.customerId]||!dialogues[event.dialogueRef][a.nodeId])return false;}
 return true;
}
