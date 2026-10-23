import config from '../data/business.json' with {type:'json'};
import products from '../data/products.json' with {type:'json'};
export {config as businessConfig};
export type TradeGoods='milk'|'bread'|'rice';
export interface DailyLedger {sales:number;purchases:number;cogs:number;orders:number;restocks:number;change:number;rewards:number;claimed:string[];sold:Record<TradeGoods,number>;costKnown:boolean}
export interface BusinessRecord {version:1;day:number;xp:number;balance:number;daily:DailyLedger}
const freshDaily=():DailyLedger=>({sales:0,purchases:0,cogs:0,orders:0,restocks:0,change:0,rewards:0,claimed:[],sold:{milk:0,bread:0,rice:0},costKnown:true});
export class Business {
 data:BusinessRecord;
 constructor(data?:BusinessRecord){this.data=data?structuredClone(data):{version:1,day:1,xp:0,balance:config.startingCash,daily:freshDaily()};}
 get level(){return [...config.levels].reverse().find(l=>this.data.xp>=l.xp)!.level;}
 get nextLevel(){return config.levels.find(l=>l.xp>this.data.xp);}
 get unlocked(){return config.goods.filter(g=>g.level<=this.level).map(g=>g.id as TradeGoods);}
 get profit(){return this.data.daily.costKnown?this.data.daily.sales-this.data.daily.cogs:null;}
 cost(id:TradeGoods){return config.goods.find(g=>g.id===id)!.cost;}
 purchase(id:TradeGoods){const total=this.cost(id)*3;if(!this.unlocked.includes(id)||this.data.balance<total)return false;this.data.balance-=total;this.data.daily.purchases+=total;return true;}
 restock(){this.data.daily.restocks++;return this.rewardGoals();}
 sale(items:TradeGoods[]){
  const daily=this.data.daily;let revenue=0;
  for(const id of items){revenue+=products.find(p=>p.id===id)!.price;daily.cogs+=this.cost(id);daily.sold[id]++;}
  daily.sales+=revenue;daily.orders++;daily.change++;this.data.balance+=revenue;this.data.xp+=8;return this.rewardGoals();
 }
 goals(){return config.goals.map(g=>({...g,current:this.data.daily[g.id as 'orders'|'restocks'|'change'],completed:this.data.daily.claimed.includes(g.id)}));}
 private rewardGoals(){
  const earned:string[]=[];
  for(const g of this.goals())if(!g.completed&&g.current>=g.target){this.data.daily.claimed.push(g.id);this.data.balance+=g.coins;this.data.xp+=g.xp;this.data.daily.rewards+=g.coins;earned.push(g.title);}
  return earned;
 }
 nextDay(){this.data.day++;this.data.daily=freshDaily();}
 importLegacy(sales:number,orders:number){this.data.balance+=sales;this.data.daily.sales=sales;this.data.daily.orders=orders;this.data.daily.costKnown=sales===0;}
}
export function validBusiness(value:unknown):value is BusinessRecord{
 if(!value||typeof value!=='object')return false;const v=value as BusinessRecord;const n=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1e9;
 if(v.version!==1||!Number.isInteger(v.day)||v.day<1||!n(v.xp)||!n(v.balance)||!v.daily)return false;
 const d=v.daily;if(!['sales','purchases','cogs','orders','restocks','change','rewards'].every(k=>n(d[k as keyof DailyLedger]))||typeof d.costKnown!=='boolean'||!d.sold||!['milk','bread','rice'].every(id=>n(d.sold[id as TradeGoods])))return false;
 return Array.isArray(d.claimed)&&d.claimed.every(id=>config.goals.some(g=>g.id===id))&&new Set(d.claimed).size===d.claimed.length;
}
