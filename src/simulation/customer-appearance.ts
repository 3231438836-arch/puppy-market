import definitions from '../data/customer-appearances.json' with {type:'json'};
import type {Visitor} from './customer-flow';
export type CustomerAppearance=typeof definitions[number];
export const customerAppearances:readonly CustomerAppearance[]=definitions;
export function appearanceById(id:string|undefined){return customerAppearances.find(a=>a.id===id);}
/** Unknown/legacy appearance IDs fall back deterministically, without rewriting business state. */
export function appearanceFor(visitor:Pick<Visitor,'id'|'customerId'|'appearanceId'>){
 if(visitor.customerId!=='ordinary')return null;
 const hash=Array.from(visitor.id).reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,0);
 return appearanceById(visitor.appearanceId)??customerAppearances[hash%customerAppearances.length];
}
export function chooseAppearance(recent:(string|undefined)[],random=Math.random){
 const pool=customerAppearances.filter(a=>!recent.includes(a.id));const choices=pool.length?pool:customerAppearances;
 return choices[Math.min(choices.length-1,Math.floor(Math.max(0,random())*choices.length))].id;
}
export function visitorRadius(v:Pick<Visitor,'id'|'customerId'|'appearanceId'>){return appearanceFor(v)?.collisionRadius??9;}
export function visitorInteractionRange(v:Pick<Visitor,'id'|'customerId'|'appearanceId'>){return appearanceFor(v)?.interactionRange??56;}
/** All variants fit the existing one-tile aisles. Keep the established queue spacing minimum. */
export function visitorSeparation(a:Pick<Visitor,'id'|'customerId'|'appearanceId'>,b:Pick<Visitor,'id'|'customerId'|'appearanceId'>){return Math.max(24,visitorRadius(a)+visitorRadius(b)+4);}
