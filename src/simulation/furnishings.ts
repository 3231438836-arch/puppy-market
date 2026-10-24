import definitions from '../data/furniture.json' with {type:'json'};
import type {ShopSimulation} from './world';
export const furniture=definitions;
export interface FurnitureInstance {instanceId:string;itemId:string;slot:string|null;boughtDay:number}
export interface Furnishings {version:1;breadOnLowShelf:boolean;nextId:number;phase:'summary'|'catalog'|'layout';catalogs:Record<string,string[]>;items:FurnitureInstance[];expenses:Record<string,number>}
export const freshFurnishings=():Furnishings=>({version:1,breadOnLowShelf:false,nextId:1,phase:'summary',catalogs:{},items:[],expenses:{}});
export const furnitureSlots=[
 {id:'bread-slot',room:'shop',x:352,y:249,label:'店内 · 面包货位',accept:['shelf']},
 {id:'shop-left',room:'shop',x:16,y:224,label:'店内 · 左墙陈设位',accept:['lamp','plant','clock','frame','radio']},
 {id:'shop-right',room:'shop',x:496,y:288,label:'店内 · 右墙陈设位',accept:['lamp','plant','clock','frame','radio']},
 {id:'shop-sign',room:'shop',x:176,y:16,label:'店内 · 墙面陈设位',accept:['clock','frame']},
 {id:'dorm-desk',room:'dorm',x:384,y:118,label:'宿舍 · 书桌陈设位',accept:['lamp','plant','radio','frame']},
 {id:'dorm-shelf',room:'dorm',x:392,y:274,label:'宿舍 · 置物架',accept:['plant','frame','radio','clock']},
 {id:'dorm-wall',room:'dorm',x:256,y:48,label:'宿舍 · 墙面陈设位',accept:['clock','frame']},
 {id:'dorm-rug',room:'dorm',x:256,y:420,label:'宿舍 · 地毯区域',accept:['rug']},
 {id:'dorm-chair',room:'dorm',x:464,y:144,label:'宿舍 · 窗边椅位',accept:['chair']},
] as const;
export const definitionFor=(id:string)=>furniture.find(f=>f.id===id);
export function hasLowShelf(s:ShopSimulation){return s.furnishings.items.some(i=>i.itemId==='low-shelf'&&i.slot==='bread-slot');}
export function ensureCatalog(s:ShopSimulation,random=Math.random){const f=s.furnishings,key=String(s.business.data.day);if(f.catalogs[key])return f.catalogs[key];const owned=(id:string)=>f.items.some(i=>i.itemId===id),previous=f.catalogs[String(s.business.data.day-1)]??[];
 const fixed=['lamp','plant'];if(!owned('low-shelf'))fixed.unshift('low-shelf');
 let pool=furniture.filter(i=>!fixed.includes(i.id)&&(!i.unique||!owned(i.id)));const selected=[...fixed];
 while(selected.length<5&&pool.length){const weights=pool.map(i=>i.weight*(previous.includes(i.id)?.35:1));let roll=Math.min(.999999,Math.max(0,random()))*weights.reduce((a,b)=>a+b,0);let at=pool.length-1;for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<0){at=i;break;}}selected.push(pool[at].id);pool=pool.filter((_,i)=>i!==at);}
 if(selected.length===previous.length&&selected.every(i=>previous.includes(i))){const alternative=furniture.find(i=>!selected.includes(i.id)&&(!i.unique||!owned(i.id)));if(alternative)selected[selected.length-1]=alternative.id;else if(selected.length>3)selected.pop();}
 f.catalogs[key]=selected;return selected;
}
export function purchaseFurniture(s:ShopSimulation,itemId:string){const item=definitionFor(itemId),f=s.furnishings;if(!s.closed||!item||!f.catalogs[String(s.business.data.day)]?.includes(itemId))return '当前无法购买';if(item.unique&&f.items.some(i=>i.itemId===itemId))return '已购买';if(s.business.data.balance<item.price)return '金币不足';if(f.items.length>=200)return '家具仓库已满';s.business.data.balance-=item.price;f.expenses[String(s.business.data.day)]=(f.expenses[String(s.business.data.day)]??0)+item.price;f.items.push({instanceId:'furniture-'+f.nextId++,itemId,slot:null,boughtDay:s.business.data.day});return null;}
export function placeFurniture(s:ShopSimulation,instanceId:string,slotId:string|null){if(!s.closed)return '布置仅在闭店后进行';const instance=s.furnishings.items.find(i=>i.instanceId===instanceId);if(!instance)return '家具不在仓库';if(slotId!==null){const slot=furnitureSlots.find(p=>p.id===slotId),item=definitionFor(instance.itemId);if(!slot||!item||!(slot.accept as readonly string[]).includes(item.icon))return '这个位置不适合该家具；入口、通道与事件区域不可放置';if(s.furnishings.items.some(i=>i!==instance&&i.slot===slotId))return '这个位置已有家具，请先收回';}if(instance.itemId==='low-shelf'&&slotId!==instance.slot)s.furnishings.breadOnLowShelf=false;instance.slot=slotId;s.stockRevision++;return null;}
/** Commit cash and furniture together. Failed storage never mutates the live simulation. */
export function furnitureTransaction(s:ShopSimulation,change:(candidate:ShopSimulation)=>string|null,persist:(candidate:ShopSimulation)=>boolean,clone:(s:ShopSimulation)=>ShopSimulation){try{const candidate=clone(s),error=change(candidate);if(error)return{shop:s,error};if(!persist(candidate))return{shop:s,error:'保存失败，金币与家具均未改变。'};return{shop:candidate,error:null};}catch{return{shop:s,error:'保存失败，金币与家具均未改变。'};}}
export function validFurnishings(value:unknown):value is Furnishings{if(!value||typeof value!=='object')return false;const f=value as Furnishings;const obj=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v),day=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;return f.version===1&&typeof f.breadOnLowShelf==='boolean'&&(!f.breadOnLowShelf||f.items?.some(i=>i.itemId==='low-shelf'&&i.slot==='bread-slot'))&&day(f.nextId)&&['summary','catalog','layout'].includes(f.phase)&&obj(f.catalogs)&&Object.entries(f.catalogs).every(([k,v])=>/^[1-9][0-9]*$/.test(k)&&Array.isArray(v)&&v.length<=5&&new Set(v).size===v.length&&v.every(id=>typeof id==='string'&&definitionFor(id)))&&obj(f.expenses)&&Object.entries(f.expenses).every(([k,v])=>/^[1-9][0-9]*$/.test(k)&&Number.isSafeInteger(v)&&v>=0)&&Array.isArray(f.items)&&f.items.length<=200&&f.items.every(i=>i&&/^furniture-[1-9][0-9]*$/.test(i.instanceId)&&Number(i.instanceId.slice(10))<f.nextId&&definitionFor(i.itemId)&&day(i.boughtDay)&&(i.slot===null||furnitureSlots.some(slot=>slot.id===i.slot&&(slot.accept as readonly string[]).includes(definitionFor(i.itemId)!.icon))))&&new Set(f.items.map(i=>i.instanceId)).size===f.items.length&&new Set(f.items.filter(i=>i.slot).map(i=>i.slot)).size===f.items.filter(i=>i.slot).length&&furniture.filter(i=>i.unique).every(d=>f.items.filter(i=>i.itemId===d.id).length<=1);}
