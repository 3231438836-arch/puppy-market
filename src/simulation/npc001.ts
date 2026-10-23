import config from '../data/npcs/customer-001.json' with {type:'json'};
import type {NarrativeRecord,CustomerProfile} from './narrative';import type {Goods} from './world';
export const CUSTOMER_001=config.npcId;export {config as customer001Config};
export function hamsterProfile(data:NarrativeRecord):CustomerProfile{
 return data.profiles[CUSTOMER_001]??={id:CUSTOMER_001,customerId:CUSTOMER_001,displayName:config.displayName,spriteId:config.spriteId,portraitId:config.portraitId,shoppingPreferences:[config.shopping.prototypeGoods as Goods],visitCount:0,lastVisitDay:0,dialogueFlags:{},eventFlags:{},relationshipState:{life_phase:config.lifePhase}};
}
export function hamsterWeight(data:NarrativeRecord,day:number){if(day<config.schedule.earliestDay)return 0;const p=data.profiles[CUSTOMER_001];const base=p?.eventFlags[config.flags.adjusted]?config.schedule.adjustedWeight:config.schedule.baseWeight;return Math.min(config.schedule.maxWeight,base+(p&&day-p.lastVisitDay>=3?config.schedule.longAbsenceBonus:0));}
export function shelfAdjusted(data:NarrativeRecord){return data.profiles[CUSTOMER_001]?.eventFlags[config.flags.adjusted]===true;}
