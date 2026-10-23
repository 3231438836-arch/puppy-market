import config from '../data/npcs/customer-001.json' with {type:'json'};
import type {NarrativeRecord,CustomerProfile} from './narrative';import type {Goods} from './world';
export const CUSTOMER_001=config.npcId;export {config as customer001Config};
export const npcDefinitions:Record<string,typeof config>={[CUSTOMER_001]:config};
/** Content registry only. Persistent NPC state stays in the existing NarrativeRecord. */
export function npcProfile(data:NarrativeRecord,id:string):CustomerProfile|null{
 const definition=Object.hasOwn(npcDefinitions,id)?npcDefinitions[id]:undefined;if(!definition)return null;
 return data.profiles[id]??={id,customerId:id,displayName:definition.displayName,spriteId:definition.spriteId,portraitId:definition.portraitId,shoppingPreferences:[definition.shopping.prototypeGoods as Goods],visitCount:0,lastVisitDay:0,dialogueFlags:{},eventFlags:{},relationshipState:{life_phase:definition.lifePhase}};
}
export function hamsterProfile(data:NarrativeRecord){return npcProfile(data,CUSTOMER_001)!;}
export function hamsterWeight(data:NarrativeRecord,day:number){if(day<config.schedule.earliestDay)return 0;const p=data.profiles[CUSTOMER_001];const base=p?.eventFlags[config.flags.adjusted]?config.schedule.adjustedWeight:config.schedule.baseWeight;return Math.min(config.schedule.maxWeight,base+(p&&day-p.lastVisitDay>=3?config.schedule.longAbsenceBonus:0));}
export function shelfAdjusted(data:NarrativeRecord){return data.profiles[CUSTOMER_001]?.eventFlags[config.flags.adjusted]===true;}
