import type {Goods, Point, CustomerState} from './world';
export interface Visitor {appearanceId?:string;id:string;customerId:string;position:Point;state:CustomerState;path:Point[];shoppingList:Goods[];shoppingIndex:number;basket:Goods[];queueOrder:number|null;paid:boolean;waitSeconds:number;entered?:boolean;exitStage?:'lane'|'door';shelfHelp?:'waiting'|'helped'|'left-unassisted';shelfWaitSeconds?:number;inspected?:boolean;inspectSeconds?:number}
export interface Arrival {id:string;at:number;arrived:boolean;customerId?:string}
export interface CustomerFlow {version:1;elapsed:number;plan:Arrival[];visitors:Visitor[];queue:string[];nextQueueOrder:number}
export const freshFlow=():CustomerFlow=>({version:1,elapsed:0,plan:[],visitors:[],queue:[],nextQueueOrder:0});
/** Persisted jitter is generated once, never rerolled after loading. */
export function arrivalPlan(day:number,count:number,random= Math.random):Arrival[]{let at=0;return Array.from({length:count},(_,i)=>{if(i)at+=10+random()*8;return{id:`day-${day}-visit-${i+1}`,at,arrived:false};});}
export function validFlow(value:unknown):value is CustomerFlow{
 if(!value||typeof value!=='object')return false;const f=value as CustomerFlow;
 const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 const p=(v:Point)=>v&&n(v.x)&&n(v.y)&&v.x<=512&&v.y<=640;
 const goods=(v:unknown)=>['milk','bread','rice'].includes(v as string);
 if(f.version!==1||!n(f.elapsed)||!n(f.nextQueueOrder)||!Array.isArray(f.plan)||f.plan.length>50||!Array.isArray(f.visitors)||f.visitors.length>50||!Array.isArray(f.queue))return false;
 if(!f.plan.every(a=>typeof a.id==='string'&&n(a.at)&&typeof a.arrived==='boolean'&&(a.customerId===undefined||typeof a.customerId==='string'))||new Set(f.plan.map(a=>a.id)).size!==f.plan.length)return false;
 if(!f.visitors.every(v=>(v.appearanceId===undefined||(typeof v.appearanceId==='string'&&v.appearanceId.length<=80))&&typeof v.id==='string'&&typeof v.customerId==='string'&&p(v.position)&&['shopping','waiting-stock','queueing','leaving','gone'].includes(v.state)&&Array.isArray(v.path)&&v.path.length<=400&&v.path.every(p)&&Array.isArray(v.shoppingList)&&v.shoppingList.length>0&&v.shoppingList.length<=3&&v.shoppingList.every(goods)&&Number.isInteger(v.shoppingIndex)&&v.shoppingIndex>=0&&v.shoppingIndex<=v.shoppingList.length&&Array.isArray(v.basket)&&JSON.stringify(v.basket)===JSON.stringify(v.shoppingList.slice(0,v.shoppingIndex))&&typeof v.paid==='boolean'&&(!v.paid||['leaving','gone'].includes(v.state))&&n(v.waitSeconds)&&(v.shelfHelp===undefined||['waiting','helped','left-unassisted'].includes(v.shelfHelp))&&(v.shelfWaitSeconds===undefined||n(v.shelfWaitSeconds))&&(v.inspectSeconds===undefined||n(v.inspectSeconds))&&(v.inspected===undefined||typeof v.inspected==='boolean')&&(v.queueOrder===null||n(v.queueOrder))))return false;
 const ids=new Set(f.visitors.map(v=>v.id));if(f.plan.some(a=>a.arrived&&!ids.has(a.id))||ids.size!==f.visitors.length||f.visitors.some(v=>!f.plan.some(a=>a.id===v.id&&a.arrived)))return false;
 return new Set(f.queue).size===f.queue.length&&f.queue.every(id=>f.visitors.some(v=>v.id===id&&v.state==='queueing'&&!v.paid))&&f.visitors.filter(v=>v.state==='queueing').every(v=>f.queue.includes(v.id));
}
