import type {AdEnvironment,RewardDefinition,RewardId} from './config';
export interface RewardGrant {kind:RewardId;amount:number;materialId?:string;couponSubsidy?:number}
export interface RewardReceipt {source:'platform'|'development-test';rewardId:RewardId;environment:Exclude<AdEnvironment,'web'>;day:number;grant:RewardGrant}
export interface AdLedger {version:1;revision:number;coupons:Record<string,number>;materials:Record<string,number>;days:Record<string,{total:number;byReward:Partial<Record<RewardId,number>>;coins:number;couponSubsidies:number}>;receipts:Record<string,RewardReceipt>;pending:({id:string}&RewardReceipt)|null}
export const freshAdLedger=():AdLedger=>({version:1,revision:0,coupons:{},materials:{},days:{},receipts:{},pending:null});
export function chooseReward(definition:RewardDefinition,random=Math.random):RewardGrant{
 const grant:RewardGrant={kind:definition.kind,amount:definition.amount};if(definition.kind==='coupon')grant.couponSubsidy=definition.couponSubsidy;
 if(definition.kind==='materials'){let roll=Math.min(.999999999,Math.max(0,random()))*definition.pool.reduce((n,p)=>n+p.weight,0);grant.materialId=definition.pool.at(-1)!.id;for(const p of definition.pool){roll-=p.weight;if(roll<0){grant.materialId=p.id;break;}}}return grant;
}
export function ledgerDay(ledger:AdLedger,day:number){return ledger.days[String(day)]??={total:0,byReward:{},coins:0,couponSubsidies:0};}
export function applyInventoryGrant(ledger:AdLedger,grant:RewardGrant){if(grant.kind==='coupon'){const key=String(grant.couponSubsidy);ledger.coupons[key]=(ledger.coupons[key]??0)+grant.amount;}else if(grant.kind==='materials')ledger.materials[grant.materialId!]=(ledger.materials[grant.materialId!]??0)+grant.amount;}
export function validAdLedger(value:unknown):value is AdLedger{
 if(!value||typeof value!=='object')return false;const v=value as AdLedger;
 const obj=(o:unknown)=>!!o&&typeof o==='object'&&!Array.isArray(o),n=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0&&Number(x)<=1e9,day=(x:unknown)=>n(x)&&Number(x)>=1;
 const grant=(g:RewardGrant)=>g&&['coupon','materials','coins'].includes(g.kind)&&n(g.amount)&&g.amount>0&&(g.kind!=='coupon'||day(g.couponSubsidy))&&(g.kind!=='materials'||['wood','cloth','paint'].includes(g.materialId!));
 const receipt=(r:RewardReceipt)=>r&&['platform','development-test'].includes(r.source)&&['coupon','materials','coins'].includes(r.rewardId)&&r.rewardId===r.grant?.kind&&['taptap-test','taptap-production'].includes(r.environment)&&day(r.day)&&grant(r.grant);
 if(v.version!==1||!n(v.revision)||!obj(v.coupons)||!obj(v.materials)||!obj(v.days)||!obj(v.receipts))return false;
 if(!Object.entries(v.coupons).every(([key,count])=>/^[1-9][0-9]{0,3}$/.test(key)&&n(count))||!Object.entries(v.materials).every(([key,count])=>['wood','cloth','paint'].includes(key)&&n(count)))return false;
 if(!Object.entries(v.days).every(([key,d])=>/^[1-9][0-9]*$/.test(key)&&d&&n(d.total)&&n(d.coins)&&n(d.couponSubsidies)&&obj(d.byReward)&&Object.entries(d.byReward).every(([id,count])=>['coupon','materials','coins'].includes(id)&&n(count))&&Object.values(d.byReward).reduce((sum,x)=>sum+(x??0),0)===d.total))return false;
 if(!Object.entries(v.receipts).every(([id,r])=>id.length>0&&id.length<=128&&receipt(r)))return false;
 return v.pending===null||!!v.pending&&typeof v.pending.id==='string'&&v.pending.id.length>0&&v.pending.id.length<=128&&!Object.hasOwn(v.receipts,v.pending.id)&&receipt(v.pending);
}
