/** Scene events describe an object anchor, not an NPC speech bubble. No traffic clock is paused here. */
export type EnvironmentEventState='untriggered'|'available'|'in-progress'|'completed'|'inactive';
export interface EnvironmentEventDefinition {
 eventId:string;npcId:string;targetObjectId:string;anchorPosition:{x:number;y:number};
 triggerConditions:{npcState:string;requiresStock:boolean;seenFlag?:string};interactionLabel:string;interactionRange:number;
 repeatPolicy:'once'|'repeatable';saveKey:string;actionId:string;dialogueTrigger?:'shelf'|'chat';priority:number;
}
export type EnvironmentEventRecords=Record<string,{state:EnvironmentEventState;count:number}>;
export interface EnvironmentEventView {definition:EnvironmentEventDefinition;state:EnvironmentEventState;interactionPosition:{x:number;y:number}}
const states:EnvironmentEventState[]=['untriggered','available','in-progress','completed','inactive'];
export function validEnvironmentEvents(value:unknown):value is EnvironmentEventRecords{
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.values(value).every(v=>v&&states.includes(v.state)&&Number.isInteger(v.count)&&v.count>=0);
}
export function resolveEnvironmentEvent(definition:EnvironmentEventDefinition,records:EnvironmentEventRecords,eligible:boolean,everTriggered:boolean):EnvironmentEventState{
 const record=records[definition.saveKey];if(definition.repeatPolicy==='once'&&record?.state==='completed')return 'completed';
 // Interrupted actions recover to available only while their world condition still holds.
 if(eligible)return 'available';return everTriggered||record?'inactive':'untriggered';
}
export function beginEnvironmentEvent(view:EnvironmentEventView,records:EnvironmentEventRecords,player:{x:number;y:number}){
 const d=view.definition;if(records[d.saveKey]?.state==='in-progress')return false;if(view.state!=='available'||(d.repeatPolicy==='once'&&records[d.saveKey]?.state==='completed')||Math.hypot(player.x-view.interactionPosition.x,player.y-view.interactionPosition.y)>d.interactionRange)return false;
 records[d.saveKey]={state:'in-progress',count:records[d.saveKey]?.count??0};return true;
}
export function finishEnvironmentEvent(definition:EnvironmentEventDefinition,records:EnvironmentEventRecords,success:boolean){
 const prior=records[definition.saveKey];if(prior?.state!=='in-progress')return false;
 records[definition.saveKey]={state:success?'completed':'inactive',count:prior.count+(success?1:0)};return true;
}
/** Cap markers and separate overlapping anchors. Near, higher-priority events win. */
export function visibleEnvironmentEvents(views:EnvironmentEventView[],player:{x:number;y:number},limit=2){
 const selected:EnvironmentEventView[]=[];
 for(const v of views.filter(v=>v.state==='available').sort((a,b)=>b.definition.priority-a.definition.priority||Math.hypot(a.definition.anchorPosition.x-player.x,a.definition.anchorPosition.y-player.y)-Math.hypot(b.definition.anchorPosition.x-player.x,b.definition.anchorPosition.y-player.y))){
  if(selected.length>=Math.max(0,limit))break;
  if(!selected.some(o=>Math.hypot(o.definition.anchorPosition.x-v.definition.anchorPosition.x,o.definition.anchorPosition.y-v.definition.anchorPosition.y)<24))selected.push(v);
 }return selected;
}
