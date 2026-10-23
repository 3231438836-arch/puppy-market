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
  { id: 'counter', x: 8, y: 13, w: 3, h: 1, label: '收银台', spot: center(9, 12) },
] as const;
export type FixtureId = typeof fixtures[number]['id'] | 'notebook' | 'entrance';
export const NOTEBOOK_SPOT=center(7,12);
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
export function findPath(from: Point, to: Point): Point[] {
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
      if (!blocked(next.x, next.y) && !previous.has(key(next))) { previous.set(key(next), p); queue.push(next); }
    }
  }
  return [];
}
export type CustomerState = 'outside' | 'shopping' | 'waiting-stock' | 'queueing' | 'leaving' | 'gone';
export class ShopSimulation {
  business=new Business();
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
  get nearby():FixtureId|null {
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
    this.open = true;this.spawnFromStock();
    this.message = '已开店：顾客会自行购物。空架会让顾客等待，记得补齐牛奶和面包。';
  }
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
  private spawnFromStock(){
    let available=this.shoppingList.filter(id=>this.business.unlocked.includes(id)&&this.shelves[id]>0);
    if(!available.length)available=this.business.unlocked.filter(id=>this.shelves[id]>0);
    if(!available.length)return false;
    this.shoppingList=available;this.customerState='shopping';this.routeToShelf();return true;
  }
  private routeToShelf() {
    const goods = this.shoppingList[this.shoppingIndex];
    this.path = findPath(this.customer, fixtures.find(f => f.id === (goods==='rice'?'freezer':goods))!.spot);
  }
  tick(seconds: number) {
    if (!this.open || this.closed || seconds <= 0) return;
    this.remaining = Math.max(0, this.remaining - seconds);
    if (!this.remaining) { this.closeDay(); return; }
    if(this.customerState==='outside'){this.spawnFromStock();if(this.customerState==='outside')return;}
    let distance = seconds * 62;
    while (this.path.length && distance > 0) {
      const target = this.path[0], length = Math.hypot(target.x - this.customer.x, target.y - this.customer.y);
      if (length <= distance) { this.customer = { ...target }; this.path.shift(); distance -= length; }
      else { this.customer.x += (target.x - this.customer.x) / length * distance; this.customer.y += (target.y - this.customer.y) / length * distance; distance = 0; }
    }
    if (this.path.length) return;
    if (this.customerState === 'shopping' || this.customerState === 'waiting-stock') {
      const goods = this.shoppingList[this.shoppingIndex];
      if (!this.shelves[goods]) { this.customerState = 'waiting-stock'; return; }
      this.shelves[goods]--; this.basket.push(goods); this.shoppingIndex++;
      if (this.shoppingIndex < this.shoppingList.length) { this.customerState = 'shopping'; this.routeToShelf(); }
      else { this.customerState = 'queueing'; this.path = findPath(this.customer, center(9, 14)); }
    } else if (this.customerState === 'leaving') { this.customerState = 'gone'; this.message = '顾客已离店，完整经营体验完成！可以继续练习补货或打烊。'; }
  }
  get atRegister() { return !this.closed && this.nearby === 'counter' && this.customerState === 'queueing' && !this.path.length; }
  scan() { if (!this.atRegister || this.confirmed || this.scanned >= this.basket.length) return false; this.scanned++;this.announce('扫描 +'+products.find(p=>p.id===this.basket[this.scanned-1])!.price+' 金币'); return true; }
  confirmTotal() { if (!this.atRegister || !this.basket.length || this.scanned !== this.basket.length) return false; this.confirmed = true; return true; }
  receiveCash() { if (!this.atRegister || !this.confirmed) return false; this.cashReceived = true; return true; }
  addChange(amount: number) { if (this.atRegister && this.cashReceived && [1, 2, 5].includes(amount) && this.change + amount <= 50) this.change += amount; }
  clearChange() { if (this.atRegister) this.change = 0; }
  finishSale() {
    if (!this.atRegister || !this.cashReceived || this.change !== this.changeDue) { this.message = '请逐件扫描、确认总价并找回正确零钱。'; return false; }
    const beforeLevel=this.business.level;const tasks=this.business.sale(this.basket);this.announce(this.business.level>beforeLevel?'升级！解锁 '+(this.business.level===2?'冰柜饭团货位':'柜台小花盆'):tasks.length?'目标完成：'+tasks.join('、'):'结账成功 +'+this.total);
    this.coins += this.total; this.served++; this.customerState = 'leaving'; this.path = findPath(this.customer, center(7, 18));
    this.message = `交易完成 +${this.total} 金币，顾客正在离店。`; return true;
  }
  purchaseBox(goods:Goods){
    if(this.closed||this.nearby!=='warehouse')return false;
    if(!this.business.purchase(goods)){this.message='资金不足或商品未解锁，采购未扣款。';return false;}
    this.warehouse[goods]+=3;this.message=`采购${products.find(p=>p.id===goods)!.name}一箱，支出 ${this.business.cost(goods)*3} 金币。`;return true;
  }
  nextCustomer(){
    if(!this.open||this.closed||this.customerState!=='gone')return false;
    const available=this.business.unlocked.filter(id=>this.shelves[id]>0);
    if(!available.length){this.message='已解锁货架都缺货，请先补货再接待。';return false;}
    this.shoppingList=available.slice(0,3);this.shoppingIndex=0;this.basket=[];this.scanned=0;this.confirmed=false;this.cashReceived=false;this.change=0;this.customer=center(7,18);this.customerState='shopping';this.routeToShelf();return true;
  }
  nextDay(){
    if(!this.closed)return null;
    const next=new ShopSimulation();next.business=new Business(this.business.data);next.business.nextDay();next.warehouse={...this.warehouse};next.shelves={...this.shelves};next.carrying=this.carrying?{...this.carrying}:null;next.preservedSessionFields={...this.preservedSessionFields};return next;
  }
  closeDay() { this.closed = true; this.open = false; this.message = '今日打烊，库存与货箱保留在本次体验中；没有改动任何已有存档。'; }
}
