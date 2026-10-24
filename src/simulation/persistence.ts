import {freshDiaries,validDiaries} from './diary';
import {migrateFirstNight,validFirstNight} from './first-night';
import {validGuestBook,migrateGuestBook} from './guest-book';
import {freshFurnishings,validFurnishings} from './furnishings';
import {validExperience,freshExperience} from './experience';
import {validAdLedger,freshAdLedger} from '../ads/reward-ledger';
import {validImprovements,freshImprovements} from './improvements';
import {validEnvironmentEvents} from './environment-events';
import {Narrative,validNarrative} from './narrative';
import {freshFlow,arrivalPlan,validFlow} from './customer-flow';
import { Business, validBusiness } from './business';
import { ShopSimulation, canStand, fixtures, type Goods, type Point, type CustomerState } from './world';
export const SESSION_KEY='puppy-mart.shop-session.v1';
export interface StoreResult<T> { value:T; writable:boolean; warning:string }
export function readStore<T>(key:string,fallback:()=>T,valid:(value:unknown)=>value is T):StoreResult<T>{
 try{const raw=localStorage.getItem(key);if(raw===null)return{value:fallback(),writable:true,warning:''};const value:unknown=JSON.parse(raw);if(valid(value))return{value,writable:true,warning:''};return{value:fallback(),writable:false,warning:'检测到不支持的本机记录，原数据已保留；本次仅临时游玩。'};}
 catch{return{value:fallback(),writable:false,warning:'无法读取本机记录，原数据未清除；本次仅临时游玩。'};}
}
export function writeStore(key:string,value:unknown,allowed=true):boolean{if(!allowed)return false;try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
const number=(n:unknown,max=1000000)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
const legacyStand=(p:Point)=>[-9,9].every(dx=>[-9,9].every(dy=>{const x=Math.floor((p.x+dx)/32),y=Math.floor((p.y+dy)/32);return x>=1&&x<15&&y>=1&&y<19&&!fixtures.some(f=>f.id==='counter'?x>=8&&x<11&&y===13:x>=f.x&&x<f.x+f.w&&y>=f.y&&y<f.y+f.h);}));
const point=(p:unknown):p is Point=>!!p&&typeof p==='object'&&number((p as Point).x,512)&&number((p as Point).y,640)&&(canStand(p as Point)||legacyStand(p as Point));
const goods=(id:unknown):id is Goods=>id==='milk'||id==='bread'||id==='rice';
export function snapshot(shop:ShopSimulation){
 return {...shop.preservedSessionFields,version:1,firstNight:shop.firstNight,diaries:shop.diaries,guestBook:shop.guestBook,furnishings:shop.furnishings,experience:shop.experience,adRewards:shop.adRewards,improvements:shop.improvements,environmentEvents:shop.environmentEvents,narrative:shop.narrative.data,flow:shop.flow,tutorialDay:shop.tutorialDay,business:shop.business.data,player:shop.player,customer:shop.customer,customerState:shop.customerState,path:shop.path,shoppingIndex:shop.shoppingIndex,shoppingList:shop.shoppingList,warehouse:shop.warehouse,shelves:shop.shelves,carrying:shop.carrying,basket:shop.basket,scanned:shop.scanned,confirmed:shop.confirmed,cashReceived:shop.cashReceived,change:shop.change,coins:shop.coins,served:shop.served,open:shop.open,closed:shop.closed,remaining:shop.remaining};
}
export type SessionData=ReturnType<typeof snapshot>;
export function validSession(value:unknown):value is SessionData{
 if(!value||typeof value!=='object')return false;const v=value as SessionData;
 if(v.firstNight!==undefined&&!validFirstNight(v.firstNight))return false;
 if(v.diaries!==undefined&&!validDiaries(v.diaries))return false;
 if(v.guestBook!==undefined&&!validGuestBook(v.guestBook))return false;
 if(v.furnishings!==undefined&&!validFurnishings(v.furnishings))return false;
 if(v.experience!==undefined&&!validExperience(v.experience))return false;
 if(v.adRewards!==undefined&&!validAdLedger(v.adRewards))return false;
 if(v.improvements!==undefined&&!validImprovements(v.improvements))return false;
 if(v.environmentEvents!==undefined&&!validEnvironmentEvents(v.environmentEvents))return false;
 if(v.narrative!==undefined&&!validNarrative(v.narrative))return false;
 if(v.flow!==undefined&&!validFlow(v.flow))return false;
 if(v.business!==undefined&&!validBusiness(v.business))return false;
 if(v.version!==1||!point(v.player)||!point(v.customer)||!['outside','shopping','waiting-stock','queueing','leaving','gone'].includes(v.customerState))return false;
 if(!Array.isArray(v.path)||v.path.length>400||!v.path.every(point)||!Array.isArray(v.shoppingList)||!v.shoppingList.length||v.shoppingList.length>3||!v.shoppingList.every(goods))return false;
 if(!Array.isArray(v.basket)||v.basket.length>3||!v.basket.every(goods)||!Number.isInteger(v.shoppingIndex)||v.shoppingIndex<0||v.shoppingIndex>v.shoppingList.length||JSON.stringify(v.basket)!==JSON.stringify(v.shoppingList.slice(0,v.shoppingIndex)))return false;
 if(!v.warehouse||!v.shelves||!(['milk','bread'] as const).every(id=>Number.isInteger(v.warehouse[id])&&number(v.warehouse[id],10000)&&Number.isInteger(v.shelves[id])&&number(v.shelves[id],6)))return false;
 if((v.warehouse.rice!==undefined&&(!Number.isInteger(v.warehouse.rice)||!number(v.warehouse.rice,10000)))||(v.shelves.rice!==undefined&&(!Number.isInteger(v.shelves.rice)||!number(v.shelves.rice,6))))return false;
 if(v.carrying!==null&&(!v.carrying||!goods(v.carrying.goods)||!Number.isInteger(v.carrying.quantity)||v.carrying.quantity<1||v.carrying.quantity>3))return false;
 if(!Number.isInteger(v.scanned)||v.scanned<0||v.scanned>v.basket.length||!number(v.change,50)||!number(v.coins)||!number(v.served,10000)||!number(v.remaining,300))return false;
 if(![v.open,v.closed,v.confirmed,v.cashReceived].every(b=>typeof b==='boolean')||(v.open&&v.closed)||(v.cashReceived&&!v.confirmed)||(v.confirmed&&v.scanned!==v.basket.length))return false;
 return true;
}
export function restoreSession(v:SessionData):ShopSimulation{
 const shop=new ShopSimulation();for(const key of Object.keys(snapshot(shop))){if(key==='version'||key==='business'||key==='flow'||key==='tutorialDay'||key==='narrative'||key==='environmentEvents'||key==='improvements'||key==='adRewards'||key==='experience'||key==='furnishings'||key==='guestBook'||key==='firstNight'||key==='diaries')continue;Object.assign(shop,{[key]:structuredClone(v[key as keyof SessionData])});}shop.warehouse.rice??=0;shop.shelves.rice??=0;shop.business=v.business?new Business(v.business):new Business();if(!v.business)shop.business.importLegacy(shop.coins,shop.served);
 shop.firstNight=structuredClone(v.firstNight??migrateFirstNight(shop.business.data.day,shop.closed));
 shop.diaries=structuredClone(v.diaries??freshDiaries());
 shop.furnishings=structuredClone(v.furnishings??freshFurnishings());
 shop.experience=structuredClone(v.experience??{...freshExperience(),introSeen:true});
 shop.adRewards=structuredClone(v.adRewards??freshAdLedger());
 shop.improvements=structuredClone(v.improvements??freshImprovements());
 shop.environmentEvents=structuredClone(v.environmentEvents??{});
 for(const record of Object.values(shop.environmentEvents))if(record.state==='in-progress')record.state='inactive';
 const flags=v.narrative?.profiles?.CUSTOMER_001?.eventFlags;
 if(flags?.customer001_first_shelf_helped||flags?.customer001_shelf_adjusted)shop.environmentEvents['customer001-high-shelf']={state:'completed',count:Math.max(1,shop.environmentEvents['customer001-high-shelf']?.count??0)};
 shop.narrative=new Narrative(v.narrative);
 shop.tutorialDay=v.tutorialDay===true;
 shop.flow=v.flow?structuredClone(v.flow):freshFlow();
 if(!v.flow&&(shop.open||shop.closed)){
  const paidCurrent=['leaving','gone'].includes(shop.customerState);const past=Math.max(0,shop.served-(paidCurrent?1:0));
  shop.flow.plan=arrivalPlan(shop.business.data.day,Math.max(1,past+1));
  for(let i=0;i<past;i++){const a=shop.flow.plan[i];a.arrived=true;shop.flow.visitors.push({id:a.id,customerId:'ordinary',position:{x:240,y:592},state:'gone',path:[],shoppingList:['milk'],shoppingIndex:1,basket:['milk'],queueOrder:null,paid:true,waitSeconds:0});}
  const a=shop.flow.plan.at(-1)!;a.arrived=shop.closed||shop.customerState!=='outside';
  if(a.arrived){const state=shop.customerState==='outside'?'gone':shop.customerState;shop.flow.visitors.push({id:a.id,customerId:'ordinary',position:{...shop.customer},state,path:[],shoppingList:[...shop.shoppingList],shoppingIndex:shop.shoppingIndex,basket:[...shop.basket],queueOrder:state==='queueing'?0:null,paid:state==='leaving'||state==='gone',waitSeconds:0});if(state==='queueing')shop.flow.queue=[a.id];}
 }
 // The register now has a real staff side. Relocate only positions covered by its new collision.
 const safe=(p:Point)=>{if(canStand(p))return p;for(let r=1;r<20;r++)for(let y=1;y<19;y++)for(let x=1;x<15;x++){const q={x:x*32+16,y:y*32+16};if(Math.hypot(q.x-p.x,q.y-p.y)<=r*32&&canStand(q))return q;}return{x:240,y:496};};
 shop.player=safe(shop.player);for(const visitor of shop.flow.visitors){const position=safe(visitor.position);if(!v.flow||position!==visitor.position)visitor.path=[];visitor.position=position;}
 shop.guestBook=structuredClone(v.guestBook??migrateGuestBook(shop.narrative.data,shop.flow));
 shop.syncImprovements();
 const known=new Set(Object.keys(snapshot(new ShopSimulation())));shop.preservedSessionFields=Object.fromEntries(Object.entries(v).filter(([key])=>!known.has(key)));return shop;
}
export function loadSession(key=SESSION_KEY){return readStore(key,()=>snapshot(new ShopSimulation()),validSession);}
export const isCustomerState=(s:string):s is CustomerState=>['outside','shopping','waiting-stock','queueing','leaving','gone'].includes(s);
