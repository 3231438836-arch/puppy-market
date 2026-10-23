import {validAdConfig,type AdConfig,type AdEnvironment,type RewardId} from './config';
import {chooseReward,applyInventoryGrant,ledgerDay,type AdLedger,type RewardReceipt} from './reward-ledger';
import type {RewardedVideoProvider,PlaybackResult} from './provider';
export interface RewardAccount {ledger:AdLedger;balance:number;day:number}
export interface RewardStore {read():RewardAccount;commit(expected:RewardAccount,next:RewardAccount):boolean}
export type RewardResult='granted'|'unavailable'|'busy'|'daily-limit'|'cancelled'|'load-failed'|'no-fill'|'timed-out'|'save-failed'|'interrupted';
export type AdState='idle'|'loading'|'playing'|'completed'|'closed-early'|'load-failed'|'no-fill'|'unavailable'|'timed-out'|'save-failed'|'interrupted';
/** getRandomValues also works for local HTTP phone previews where randomUUID may be unavailable. */
export function rewardTransactionId(){const bytes=crypto.getRandomValues(new Uint8Array(16));return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export class RewardedAdService {
 busy=false;state:AdState='idle';
 private phase(state:AdState){this.state=state;try{this.onStateChange();}catch{/* UI observers cannot interrupt reward persistence. */}}
 constructor(private config:AdConfig,private environment:AdEnvironment,private provider:RewardedVideoProvider,private store:RewardStore,private random=Math.random,private makeId:()=>string=rewardTransactionId,private onStateChange:()=>void=()=>{}){}
 availability(id:RewardId):RewardResult|'ready'{
  try{if(this.busy||this.store.read().ledger.pending)return 'busy';
  const c=this.config;if(!validAdConfig(c))return 'unavailable';const r=c.rewards.find(r=>r.id===id),e=c.environments[this.environment];
  if(!validAdConfig(c)||!c.enabled||this.environment==='web'||!e?.enabled||!r?.enabled||(!e.placements[id]&&this.provider.mode!=='development-test')||(this.provider.mode==='development-test'&&this.environment!=='taptap-test')||this.provider.environment!==this.environment||!this.provider.available())return 'unavailable';
  const account=this.store.read(),d=account.ledger.days[String(account.day)];return (d?.total??0)>=c.dailyLimit||(d?.byReward[id]??0)>=r.dailyLimit?'daily-limit':'ready';}catch{return 'unavailable';}
 }
 /** Interrupted playback never grants on refresh. A full callback cannot be inferred from pending data. */
 recover(){const before=structuredClone(this.store.read());if(!before.ledger.pending)return true;const next=structuredClone(before);next.ledger.pending=null;next.ledger.revision++;return this.store.commit(before,next);}
 async watch(id:RewardId):Promise<RewardResult>{
  const available=this.availability(id);if(available!=='ready')return available;
  this.busy=true;this.phase('loading');const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
  let transaction:string|undefined;
  try{
   const before=structuredClone(this.store.read()),next=structuredClone(before);transaction=this.makeId();
   if(!transaction||Object.hasOwn(next.ledger.receipts,transaction)){this.phase('save-failed');return 'save-failed';}
   const receipt:RewardReceipt={source:this.provider.mode==='development-test'?'development-test':'platform',rewardId:id,day:before.day,environment:this.environment as Exclude<AdEnvironment,'web'>,grant:chooseReward(this.config.rewards.find(r=>r.id===id)!,this.random)};
   next.ledger.pending={id:transaction,...receipt};next.ledger.revision++;
   if(!this.store.commit(before,next)){this.phase('save-failed');return 'save-failed';}
   let result:PlaybackResult|{kind:'timed-out'};
   try{result=await Promise.race([this.provider.play(this.config.environments[this.environment].placements[id]??'',controller.signal,phase=>{if(!controller.signal.aborted&&this.busy)this.phase(phase);}),new Promise<{kind:'timed-out'}>(resolve=>{timer=setTimeout(()=>resolve({kind:'timed-out'}),this.config.timeoutMs);})]);}catch{result={kind:'load-failed'};}
   const current=structuredClone(this.store.read());if(current.ledger.pending?.id!==transaction||Object.hasOwn(current.ledger.receipts,transaction)||current.day!==receipt.day){this.clearPending(transaction);this.phase('interrupted');return 'interrupted';}
   if(result?.kind!=='completed'||result.proof!=='sdk-success-callback'){this.clearPending(transaction);this.phase(result?.kind==='cancelled'?'closed-early':result?.kind==='no-fill'?'no-fill':result?.kind==='timed-out'?'timed-out':result?.kind==='unavailable'?'unavailable':'load-failed');return result?.kind==='cancelled'||result?.kind==='no-fill'||result?.kind==='unavailable'||result?.kind==='timed-out'?result.kind:'load-failed';}
   const granted=structuredClone(current);granted.ledger.pending=null;granted.ledger.receipts[transaction]=receipt;granted.ledger.revision++;
   const d=ledgerDay(granted.ledger,receipt.day);d.total++;d.byReward[id]=(d.byReward[id]??0)+1;applyInventoryGrant(granted.ledger,receipt.grant);
   if(receipt.grant.kind==='coins'){granted.balance+=receipt.grant.amount;d.coins+=receipt.grant.amount;}
   if(!this.store.commit(current,granted)){this.clearPending(transaction);this.phase('save-failed');return 'save-failed';}this.phase('completed');return 'granted';
  }catch{if(transaction)try{this.clearPending(transaction);}catch{}this.phase('save-failed');return 'save-failed';}finally{if(timer!==undefined)clearTimeout(timer);controller.abort();this.busy=false;}
 }
 private clearPending(id:string){const before=structuredClone(this.store.read());if(before.ledger.pending?.id!==id)return;const next=structuredClone(before);next.ledger.pending=null;next.ledger.revision++;this.store.commit(before,next);}
}
