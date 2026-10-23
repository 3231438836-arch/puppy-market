import { Business, validBusiness } from './business';
import { ShopSimulation, canStand, type Goods, type Point, type CustomerState } from './world';
export const SESSION_KEY='puppy-mart.shop-session.v1';
export interface StoreResult<T> { value:T; writable:boolean; warning:string }
export function readStore<T>(key:string,fallback:()=>T,valid:(value:unknown)=>value is T):StoreResult<T>{
 try{const raw=localStorage.getItem(key);if(raw===null)return{value:fallback(),writable:true,warning:''};const value:unknown=JSON.parse(raw);if(valid(value))return{value,writable:true,warning:''};return{value:fallback(),writable:false,warning:'检测到不支持的本机记录，原数据已保留；本次仅临时游玩。'};}
 catch{return{value:fallback(),writable:false,warning:'无法读取本机记录，原数据未清除；本次仅临时游玩。'};}
}
export function writeStore(key:string,value:unknown,allowed=true):boolean{if(!allowed)return false;try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
const number=(n:unknown,max=1000000)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
const point=(p:unknown):p is Point=>!!p&&typeof p==='object'&&number((p as Point).x,512)&&number((p as Point).y,640)&&canStand(p as Point);
const goods=(id:unknown):id is Goods=>id==='milk'||id==='bread'||id==='rice';
export function snapshot(shop:ShopSimulation){
 return {...shop.preservedSessionFields,version:1,business:shop.business.data,player:shop.player,customer:shop.customer,customerState:shop.customerState,path:shop.path,shoppingIndex:shop.shoppingIndex,shoppingList:shop.shoppingList,warehouse:shop.warehouse,shelves:shop.shelves,carrying:shop.carrying,basket:shop.basket,scanned:shop.scanned,confirmed:shop.confirmed,cashReceived:shop.cashReceived,change:shop.change,coins:shop.coins,served:shop.served,open:shop.open,closed:shop.closed,remaining:shop.remaining};
}
export type SessionData=ReturnType<typeof snapshot>;
export function validSession(value:unknown):value is SessionData{
 if(!value||typeof value!=='object')return false;const v=value as SessionData;
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
 const shop=new ShopSimulation();for(const key of Object.keys(snapshot(shop))){if(key==='version'||key==='business')continue;Object.assign(shop,{[key]:structuredClone(v[key as keyof SessionData])});}shop.warehouse.rice??=0;shop.shelves.rice??=0;shop.business=v.business?new Business(v.business):new Business();if(!v.business)shop.business.importLegacy(shop.coins,shop.served);
 const known=new Set(Object.keys(snapshot(new ShopSimulation())));shop.preservedSessionFields=Object.fromEntries(Object.entries(v).filter(([key])=>!known.has(key)));return shop;
}
export function loadSession(key=SESSION_KEY){return readStore(key,()=>snapshot(new ShopSimulation()),validSession);}
export const isCustomerState=(s:string):s is CustomerState=>['outside','shopping','waiting-stock','queueing','leaving','gone'].includes(s);
