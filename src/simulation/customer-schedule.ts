import type {Arrival} from './customer-flow';
import type {ShopSimulation,Goods} from './world';
import {chooseAppearance} from './customer-appearance';
import {CUSTOMER_001,hamsterWeight} from './npc001';
/** Weekday is relative to game day 1; no fictional weather is assigned without a weather system. */
export function dailySchedule(s:ShopSimulation,random=Math.random):Arrival[]{const draw=()=>Math.max(0,Math.min(.999999,random())),day=s.business.data.day,weekend=(day-1)%7>=5,count=Math.min(6,3+Math.floor(draw()*3)+(weekend?1:0));let elapsed=0;const history=[...s.experience.appearanceHistory];
 const plan:Arrival[]=Array.from({length:count},(_,i)=>{if(i){const burst=draw();elapsed+=burst<.25?4+draw()*5:burst>.8?24+draw()*18:10+draw()*12;}const appearanceId=chooseAppearance(history,draw);history.push(appearanceId);const unlocked=s.business.unlocked;const stocked=unlocked.filter(id=>s.shelves[id]>0);const candidates=stocked.length?stocked:unlocked;const quantity=1+Math.floor(draw()*3);const shoppingList:Goods[]=Array.from({length:quantity},()=>candidates[Math.floor(draw()*candidates.length)]);return{id:`day-${day}-visit-${i+1}`,at:elapsed,arrived:false,customerId:'ordinary',appearanceId,shoppingList};});
 const hamster=s.narrative.data.profiles[CUSTOMER_001],regular=s.narrative.data.profiles['test-regular'];const specials:string[]=[];
 if((!hamster||day-hamster.lastVisitDay>=2)&&draw()<hamsterWeight(s.narrative.data,day))specials.push(CUSTOMER_001);
 if((!regular||day-regular.lastVisitDay>=2)&&draw()<.12)specials.push('test-regular');
 for(const customerId of specials){const choices=plan.filter(p=>p.customerId==='ordinary'),slot=choices[Math.floor(draw()*choices.length)];if(!slot)continue;slot.customerId=customerId;delete slot.appearanceId;if(customerId===CUSTOMER_001)slot.shoppingList=['bread'];}
 // Prevent identical first ordinary appearance across neighbouring days without rerolling an existing plan.
 const previous=s.experience.previousOrder??[],order=plan.map(p=>p.customerId==='ordinary'?p.appearanceId!:(p.customerId??'ordinary'));
 if(order.length===previous.length&&order.every((v,i)=>v===previous[i])){const slot=plan.find(p=>p.customerId==='ordinary');if(slot)slot.appearanceId=chooseAppearance([...history,...order],draw);}
 s.experience.previousOrder=plan.map(p=>p.customerId==='ordinary'?p.appearanceId!:(p.customerId??'ordinary'));return plan;
}
