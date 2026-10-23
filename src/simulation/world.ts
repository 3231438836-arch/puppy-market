import {eligibleNpcDialogues} from './npc-dialogues';
import {CUSTOMER_001,customer001Config,hamsterProfile,hamsterWeight,shelfAdjusted} from './npc001';
import {Narrative} from './narrative';
import {arrivalPlan,freshFlow,type Visitor} from './customer-flow';
import { selectInteraction } from './interaction';
import { Business } from './business';
import products from '../data/products.json' with { type: 'json' };
export const TILE = 32, WIDTH = 16, HEIGHT = 20;
export interface Point { x: number; y: number }
export type Goods = 'milk' | 'bread' | 'rice';
export const center = (x: number, y: number): Point => ({ x: (x + .5) * TILE, y: (y + .5) * TILE });
export const fixtures = [
  { id: 'warehouse', x: 1, y: 2, w: 3, h: 2, label: '仓库', spot: center(2, 4) },
  { id: 'milk', x: 4, y: 6, w: 2, h: 3, label: '牛奶货架', spot: center(4, 9) },
  { id: 'bread', x: 10, y: 6, w: 2, h: 3, label: '面包货架', spot: center(10, 9) },
  { id: 'freezer', x: 12, y: 2, w: 2, h: 2, label: '冰柜', spot: center(12, 4) },
  { id: 'stairs', x: 9, y: 1, w: 2, h: 2, label: '员工宿舍 ↑', spot: center(9, 3) },
  { id: 'counter', x: 9, y: 15, w: 3, h: 1, label: '收银台', spot: center(10, 16) },
] as const;
export type FixtureId = typeof fixtures[number]['id'] | 'notebook' | 'entrance' | 'customer001';
export const NOTEBOOK_SPOT=center(8,16);
export const ENTRANCE_SPOT=center(7,18);
export function blocked(x: number, y: number) {
  return x < 1 || y < 1 || x >= WIDTH - 1 || y >= HEIGHT - 1 || fixtures.some(f => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h);
}
export function canStand(p: Point, radius = 9) {
  return [-radius, radius].every(dx => [-radius, radius].every(dy => !blocked(Math.floor((p.x + dx) / TILE), Math.floor((p.y + dy) / TILE))));
}
export function move(p: Point, dx: number, dy: number): Point {
  const result = { ...p };
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
  for (let i = 0; i < steps; i++) {
    if (canStand({ x: result.x + dx / steps, y: result.y })) result.x += dx / steps;
    if (canStand({ x: result.x, y: result.y + dy / steps })) result.y += dy / steps;
  }
  return result;
}
/** Four-neighbour BFS. Waypoints are always in walkable aisle cells. */
export const QUEUE_SPOTS=[center(9,14),center(10,14),center(11,14)];
export function findPath(from: Point, to: Point,occupied:Point[]=[]): Point[] {
  const start = { x: Math.floor(from.x / TILE), y: Math.floor(from.y / TILE) };
  const end = { x: Math.floor(to.x / TILE), y: Math.floor(to.y / TILE) };
  if (blocked(start.x, start.y) || blocked(end.x, end.y)) return [];
  const key = (p: Point) => `${p.x},${p.y}`;
  const queue = [start], previous = new Map<string, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(end)) {
      const path: Point[] = []; let current: Point | null = p;
      while (current && key(current) !== key(start)) { path.unshift(center(current.x, current.y)); current = previous.get(key(current)) ?? null; }
      return path;
    }
    for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
      const next = { x: p.x + dx, y: p.y + dy };
      if (!blocked(next.x, next.y) && !occupied.some(o=>Math.floor(o.x/TILE)===next.x&&Math.floor(o.y/TILE)===next.y) && !previous.has(key(next))) { previous.set(key(next), p); queue.push(next); }
    }
  }
  return [];
}
export type CustomerState = 'outside' | 'shopping' | 'waiting-stock' | 'queueing' | 'leaving' | 'gone';
export class ShopSimulation {
  business=new Business();
  flow=freshFlow();
  narrative=new Narrative();
  tutorialDay=false;
  npcPreview=false;
  preservedSessionFields:Record<string,unknown>={};
  feedback='';
  feedbackRevision=0;
  stockRevision=0;
  private announce(text:string){this.feedback=text;this.feedbackRevision++;}
  player = center(7, 15);
  facing={x:0,y:1};
  private lastInteraction:string|null=null;
  customer = center(7, 18);
  customerState: CustomerState = 'outside';
  path: Point[] = [];
  shoppingIndex = 0;
  shoppingList: Goods[] = ['milk','bread'];
  warehouse: Record<Goods, number> = { milk: 6, bread: 6, rice:0 };
  shelves: Record<Goods, number> = { milk: 0, bread: 0, rice:0 };
  readonly capacity = 6;
  carrying: { goods: Goods; quantity: number } | null = null;
  basket: Goods[] = [];
  scanned = 0;
  confirmed = false;
  cashReceived = false;
  change = 0;
  coins = 0;
  served = 0;
  open = false;
  closed = false;
  remaining = 300;
  message = '先到左上仓库取货箱，再到对应货架前补货。';
  get total() { return this.basket.reduce((sum, id) => sum + products.find(p => p.id === id)!.price, 0); }
  get tender() { return Math.max(20,Math.ceil(this.total/10)*10); }
  get changeDue() { return this.tender - this.total; }
  get hamster(){return this.flow.visitors.find(v=>v.customerId===CUSTOMER_001&&v.state!=='gone'&&v.state!=='leaving');}
  get canTalkHamster(){const v=this.hamster;return !!v&&v.shelfHelp!=='waiting'&&Math.hypot(this.player.x-v.position.x,this.player.y-v.position.y)<=56&&eligibleNpcDialogues(this.narrative.data,CUSTOMER_001,this.business.data.day,'chat',this.narrative.allowDrafts).length>0;}
  get canHearShelfDraft(){return eligibleNpcDialogues(this.narrative.data,CUSTOMER_001,this.business.data.day,'shelf',this.narrative.allowDrafts).length>0;}
  get nearby():FixtureId|null {
    const hamster=this.hamster;if(hamster?.shelfHelp==='waiting'&&Math.hypot(this.player.x-hamster.position.x,this.player.y-hamster.position.y)<=customer001Config.shelf.helpRange)return 'customer001';
    this.lastInteraction=selectInteraction(this.player,this.facing,[...fixtures.map(f=>({id:f.id,...f.spot,range:45})),{id:'notebook',...NOTEBOOK_SPOT,range:30},{id:'entrance',...ENTRANCE_SPOT,range:42}],this.lastInteraction);
    return this.lastInteraction as FixtureId|null;
  }
  movePlayer(x: number, y: number, seconds: number) {
    if (this.closed) return;
    if(x||y)this.facing=Math.abs(x)>Math.abs(y)?{x:Math.sign(x),y:0}:{x:0,y:Math.sign(y)};
    const length = Math.hypot(x, y);
    if (length > 0) this.player = move(this.player, x / Math.max(1, length) * 112 * seconds, y / Math.max(1, length) * 112 * seconds);
  }
  startDay() {
    if (this.open || this.closed) return;
    this.open = true;
    if(!this.flow.plan.length){this.flow.plan=arrivalPlan(this.business.data.day,this.tutorialDay?1:4);
      if(this.npcPreview){this.flow.plan[0].customerId=CUSTOMER_001;}
      else if(!this.tutorialDay&&Math.random()<hamsterWeight(this.narrative.data,this.business.data.day)){this.flow.plan[1+Math.floor(Math.random()*(this.flow.plan.length-1))].customerId=CUSTOMER_001;}
    }
    this.tick(.001);this.message='已开店：顾客会按计划自动到店；补货后到店员侧一键结账。';
  }
  get futureArrivals(){return this.flow.plan.filter(a=>!a.arrived).length;}
  get insideCount(){return this.flow.visitors.filter(v=>v.state!=='gone').length;}
  get departedCount(){return this.flow.visitors.filter(v=>v.state==='gone').length;}
  get canClose(){return this.open&&this.flow.plan.length>0&&this.futureArrivals===0&&this.insideCount===0;}
  get front(){return this.flow.visitors.find(v=>v.id===this.flow.queue[0]);}
  private syncLegacy(){const v=this.front??this.flow.visitors.find(v=>v.state!=='gone')??this.flow.visitors.at(-1);if(!v)return;this.customer={...v.position};this.customerState=v.state;this.path=v.path;this.basket=v.basket;this.shoppingList=v.shoppingList;this.shoppingIndex=v.shoppingIndex;}

  takeBox(goods: Goods) {
    if (this.closed || this.nearby !== 'warehouse') return false;
    if (this.carrying) { this.message = '一次只能拿一箱，先补货或把货箱放回仓库。'; return false; }
    if(!this.business.unlocked.includes(goods)){this.message='商品尚未解锁。';return false;}
    if (this.warehouse[goods] < 3) { this.message = '仓库不足一箱，不能凭空补货。'; return false; }
    this.warehouse[goods] -= 3; this.carrying = { goods, quantity: 3 };
    this.message = `拿起${products.find(p=>p.id===goods)!.name}货箱，走到对应货架前按互动补货。`; return true;
  }
  returnBox() {
    if (this.closed || this.nearby !== 'warehouse' || !this.carrying) return false;
    this.warehouse[this.carrying.goods] += this.carrying.quantity; this.carrying = null; this.message = '货箱已放回仓库。'; return true;
  }
  restock(goods: Goods) {
    if (this.closed || this.nearby !== (goods==='rice'?'freezer':goods)) return false;
    if (!this.carrying || this.carrying.goods !== goods) { this.message = '需要从仓库拿来对应商品的货箱。'; return false; }
    const amount = Math.min(this.capacity - this.shelves[goods], this.carrying.quantity);
    if (amount === 0) { this.message = '货架已满，货箱仍在手中。'; return false; }
    this.shelves[goods] += amount; this.carrying.quantity -= amount;
    if (!this.carrying.quantity) this.carrying = null;
    this.stockRevision++;const previousLevel=this.business.level;const tasks=this.business.restock();this.announce(this.business.level>previousLevel?'升级！解锁 '+(this.business.level===2?'冰柜饭团货位':'柜台小花盆'):tasks.length?'目标完成：'+tasks.join('、'):'补货完成 +'+amount);
    this.message = `补货完成 +${amount}，库存 ${this.shelves[goods]}/${this.capacity}。`; return true;
  }
  private target(v:Visitor):Point{
    if(v.state==='leaving')return v.exitStage==='door'?ENTRANCE_SPOT:center(6,17);
    if((v.state==='shopping'||v.state==='waiting-stock')&&v.entered===false)return center(13,17);
    if(v.state==='queueing')return QUEUE_SPOTS[Math.min(2,this.flow.queue.indexOf(v.id))];
    return fixtures.find(f=>f.id===(v.shoppingList[v.shoppingIndex]==='rice'?'freezer':v.shoppingList[v.shoppingIndex]))!.spot;
  }
  private route(v:Visitor,target:Point,others:Visitor[]){const origin=center(Math.floor(v.position.x/TILE),Math.floor(v.position.y/TILE));const path=findPath(origin,target,others.map(o=>o.position));if(Math.hypot(origin.x-v.position.x,origin.y-v.position.y)>1)path.unshift(origin);return path;}
  tick(seconds:number){
    if(!this.open||this.closed||seconds<=0)return;
    this.flow.elapsed+=seconds;this.remaining=Math.max(0,this.remaining-seconds);
    const active=this.flow.visitors.filter(v=>v.state!=='gone');
    const pending=this.flow.plan.find(a=>!a.arrived&&a.at<=this.flow.elapsed);
    if(pending&&active.length<3&&!active.some(v=>Math.hypot(v.position.x-ENTRANCE_SPOT.x,v.position.y-ENTRANCE_SPOT.y)<30)){
      pending.arrived=true;const customerId=pending.customerId??(pending.id.endsWith('1')?'test-regular':'ordinary');if(!this.tutorialDay)this.narrative.visit(customerId,this.business.data.day);const available=this.business.unlocked.filter(id=>this.shelves[id]>0);
      const shopping:Goods[]=customerId===CUSTOMER_001?(available.includes('bread')?['bread',...available.filter(id=>id!=='bread')].slice(0,Math.random()<.65?1:2) as Goods[]:['bread']):available.length?available.slice(0,2):['milk'] as Goods[];
      this.flow.visitors.push({id:pending.id,customerId,position:{...ENTRANCE_SPOT},entered:false,state:'shopping',path:[],shoppingList:shopping,shoppingIndex:0,basket:[],queueOrder:null,paid:false,waitSeconds:0});
    }
    // Front of queue and departing customers move first; occupancy prevents overlap.
    const ordered=[...this.flow.visitors].sort((a,b)=>(a.state==='leaving'?-10:a.queueOrder??100)-(b.state==='leaving'?-10:b.queueOrder??100));
    for(const v of ordered){
      if(v.state==='gone')continue;
      const target=this.target(v),others=this.flow.visitors.filter(o=>o.id!==v.id&&o.state!=='gone');
      if(Math.hypot(v.position.x-target.x,v.position.y-target.y)>1){
        if(!v.path.length||Math.hypot(v.path.at(-1)!.x-target.x,v.path.at(-1)!.y-target.y)>1)v.path=this.route(v,target,others);
        if(!v.path.length&&Math.floor(v.position.x/TILE)===Math.floor(target.x/TILE)&&Math.floor(v.position.y/TILE)===Math.floor(target.y/TILE))v.path=[target];
        if(v.path.length){const next=v.path[0],distance=Math.hypot(next.x-v.position.x,next.y-v.position.y),amount=Math.min(distance,seconds*62),p={x:v.position.x+(next.x-v.position.x)/(distance||1)*amount,y:v.position.y+(next.y-v.position.y)/(distance||1)*amount};
          if(canStand(p)&&!others.some(o=>Math.hypot(o.position.x-p.x,o.position.y-p.y)<24)){v.position=p;if(distance<=amount)v.path.shift();}
          else v.path=this.route(v,target,others);
        }continue;
      }
      v.path=[];
      if(v.state==='leaving'&&v.exitStage!=='door'){v.exitStage='door';continue;}
      if((v.state==='shopping'||v.state==='waiting-stock')&&v.entered===false){v.entered=true;continue;}
      if(v.state==='leaving'){v.state='gone';this.message=this.canClose?'今日客流已全部离店，可以到入口打烊。':'顾客已离店，下一位会自动到来。';continue;}
      if(v.state==='queueing'){v.waitSeconds+=seconds;continue;}
      const goods=v.shoppingList[v.shoppingIndex];
      if(v.customerId===CUSTOMER_001){
        if(!v.inspected){v.inspectSeconds=(v.inspectSeconds??0)+seconds;if(v.inspectSeconds<customer001Config.shopping.inspectSeconds)continue;v.inspected=true;}
        if(goods===customer001Config.shelf.goods&&this.shelves[goods]>0&&!shelfAdjusted(this.narrative.data)&&v.shelfHelp!=='helped'){
          const p=hamsterProfile(this.narrative.data);
          if(!p.eventFlags[customer001Config.flags.firstShelfSeen]||v.shelfHelp==='waiting'){
            p.eventFlags[customer001Config.flags.firstShelfSeen]=true;v.shelfHelp='waiting';v.shelfWaitSeconds=(v.shelfWaitSeconds??0)+seconds;
            if(v.shelfWaitSeconds<customer001Config.shelf.waitLimitSeconds)continue;
          }
          // Unassisted visitors leave without a purchase; no inventory is deducted.
          this.abandonHamster(v);continue;
        }
      }
      if(!this.shelves[goods]){v.state='waiting-stock';v.waitSeconds+=seconds;if(v.customerId===CUSTOMER_001&&v.waitSeconds>=customer001Config.shelf.waitLimitSeconds)this.abandonHamster(v);continue;}
      this.shelves[goods]--;v.basket.push(goods);v.shoppingIndex++;
      if(v.shoppingIndex>=v.shoppingList.length){v.state='queueing';v.queueOrder=this.flow.nextQueueOrder++;this.flow.queue.push(v.id);}else v.state='shopping';
    }
    this.syncLegacy();
  }
  private abandonHamster(v:Visitor){for(const goods of v.basket){if(this.shelves[goods]<this.capacity)this.shelves[goods]++;else this.warehouse[goods]++;}v.basket=[];v.shoppingIndex=0;v.shelfHelp='left-unassisted';v.state='leaving';v.exitStage='lane';v.path=[];}
  helpHamster(){const v=this.hamster;if(this.closed||this.nearby!=='customer001'||v?.shelfHelp!=='waiting')return false;v.shelfHelp='helped';const p=hamsterProfile(this.narrative.data);p.eventFlags[customer001Config.flags.met]=true;p.eventFlags[customer001Config.flags.helped]=true;this.message='已帮小仓鼠拿取商品。可在这个货架调整摆放位置。';this.announce('已帮忙取货');return true;}
  get canAdjustHamsterShelf(){return !!this.narrative.data.profiles[CUSTOMER_001]?.eventFlags[customer001Config.flags.firstShelfSeen]&&!shelfAdjusted(this.narrative.data);}
  adjustHamsterShelf(){if(this.closed||this.nearby!=='bread'||!this.canAdjustHamsterShelf)return false;hamsterProfile(this.narrative.data).eventFlags[customer001Config.flags.adjusted]=true;this.stockRevision++;this.message='面包货位已下移，小体型顾客可以自行取货。';this.announce('摆放位置已调整');return true;}
  get atRegister(){const v=this.front;return !this.closed&&this.nearby==='counter'&&!!v&&!v.paid&&Math.hypot(v.position.x-QUEUE_SPOTS[0].x,v.position.y-QUEUE_SPOTS[0].y)<2;}
  checkout(){
    const v=this.front;if(this.narrative.data.active||!this.atRegister||!v||v.paid)return false;
    const total=v.basket.reduce((n,id)=>n+products.find(p=>p.id===id)!.price,0);
    v.paid=true;if(v.customerId===CUSTOMER_001)hamsterProfile(this.narrative.data).eventFlags[customer001Config.flags.met]=true;this.flow.queue.shift();const before=this.business.level;const tasks=this.business.sale(v.basket);
    this.coins+=total;this.served++;v.state='leaving';v.exitStage='lane';v.path=[];
    this.scanned=0;this.confirmed=false;this.cashReceived=false;this.change=0;
    this.announce('结账 +'+total+' · '+(this.business.level>before?'升级！解锁 '+(this.business.level===2?'冰柜饭团货位':'柜台小花盆'):tasks.length?'目标完成：'+tasks.join('、'):'交易完成'));
    const bark=this.narrative.checkoutBark(v.customerId,this.business.data.day);if(bark)this.announce('结账 +'+total+' · 小仓鼠：'+bark);
    this.message=`交易完成 +${total} 金币，下一位自动前进。`;this.syncLegacy();return true;
  }
  scan() { if (!this.atRegister || this.confirmed || this.scanned >= this.basket.length) return false; this.scanned++;this.announce('扫描 +'+products.find(p=>p.id===this.basket[this.scanned-1])!.price+' 金币'); return true; }
  confirmTotal() { if (!this.atRegister || !this.basket.length || this.scanned !== this.basket.length) return false; this.confirmed = true; return true; }
  receiveCash() { if (!this.atRegister || !this.confirmed) return false; this.cashReceived = true; return true; }
  addChange(amount: number) { if (this.atRegister && this.cashReceived && [1, 2, 5].includes(amount) && this.change + amount <= 50) this.change += amount; }
  clearChange() { if (this.atRegister) this.change = 0; }
  /** Legacy transaction fields remain readable; current gameplay uses checkout(). */
  finishSale(){if(!this.cashReceived||this.change!==this.changeDue)return false;return this.checkout();}
  purchaseBox(goods:Goods){
    if(this.closed||this.nearby!=='warehouse')return false;
    if(!this.business.purchase(goods)){this.message='资金不足或商品未解锁，采购未扣款。';return false;}
    this.warehouse[goods]+=3;this.message=`采购${products.find(p=>p.id===goods)!.name}一箱，支出 ${this.business.cost(goods)*3} 金币。`;return true;
  }
  nextDay(){
    if(!this.closed)return null;
    const next=new ShopSimulation();next.business=new Business(this.business.data);next.business.nextDay();next.warehouse={...this.warehouse};next.shelves={...this.shelves};next.carrying=this.carrying?{...this.carrying}:null;next.preservedSessionFields={...this.preservedSessionFields};next.narrative=new Narrative(this.narrative.data,this.narrative.content,this.narrative.allowDrafts);next.npcPreview=this.npcPreview;return next;
  }
  closeDay() { if(!this.canClose)return false;this.closed=true;this.open=false;this.message='今日打烊，库存、资金与顾客记录已保留。';return true; }
}
