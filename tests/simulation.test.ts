import { describe, expect, it } from 'vitest';
import { ShopSimulation, center, fixtures, canStand, findPath, move, blocked } from '../src/simulation/world';
function at(s:ShopSimulation,id:string){s.player={...fixtures.find(f=>f.id===id)!.spot};}
function stocked(){const s=new ShopSimulation();for(const id of ['milk','bread'] as const){at(s,'warehouse');expect(s.takeBox(id)).toBe(true);at(s,id);expect(s.restock(id)).toBe(true);}return s;}
function advance(s:ShopSimulation,state:string){for(let i=0;i<2000&&!(s.customerState===state&&!s.path.length);i++){s.tick(.05);expect(canStand(s.customer)).toBe(true);}expect(s.customerState).toBe(state);expect(s.path).toHaveLength(0);}
describe('可走动便利店切片',()=>{
 it('碰撞阻挡货架、墙壁、收银台且大步移动不会穿透',()=>{
  expect(canStand(center(4,6))).toBe(false);expect(canStand(center(9,13))).toBe(false);
  const stop=move(center(3,7),200,0);expect(stop.x).toBeLessThan(4*32-8);expect(canStand(stop)).toBe(true);
  expect(move(center(1,1),-500,-500).x).toBeGreaterThanOrEqual(41);
 });
 it('路径绕开所有实体，入口可抵达所有互动点',()=>{
  for(const f of fixtures){const path=findPath(center(7,18),f.spot);expect(path.length).toBeGreaterThan(0);for(const p of path)expect(blocked(Math.floor(p.x/32),Math.floor(p.y/32))).toBe(false);}
  expect(findPath(center(7,18),center(4,6))).toEqual([]);
 });
 it('必须靠近仓库取箱，对应货架补货，库存不凭空增长',()=>{
  const s=new ShopSimulation();expect(s.takeBox('milk')).toBe(false);at(s,'warehouse');expect(s.takeBox('milk')).toBe(true);expect(s.warehouse.milk).toBe(3);expect(s.takeBox('bread')).toBe(false);
  at(s,'bread');expect(s.restock('bread')).toBe(false);at(s,'milk');expect(s.restock('milk')).toBe(true);expect(s.shelves.milk).toBe(3);expect(s.carrying).toBeNull();
  at(s,'warehouse');s.takeBox('milk');s.returnBox();expect(s.warehouse.milk).toBe(3);
 });
 it('货架容量有上限，货箱余额保留，空仓不能取箱',()=>{
  const s=new ShopSimulation();at(s,'warehouse');s.takeBox('milk');at(s,'milk');s.restock('milk');at(s,'warehouse');s.takeBox('milk');at(s,'milk');s.restock('milk');expect(s.shelves.milk).toBe(6);at(s,'warehouse');expect(s.takeBox('milk')).toBe(false);
 });
 it('空架顾客等待，补货后自主购物排队，扫描现金找零后离店',()=>{
  const s=new ShopSimulation();s.startDay();advance(s,'waiting-stock');expect(s.basket).toEqual([]);
  for(const id of ['milk','bread'] as const){at(s,'warehouse');s.takeBox(id);at(s,id);s.restock(id);}
  advance(s,'queueing');expect(s.basket).toEqual(['milk','bread']);expect(s.shelves).toEqual({milk:2,bread:2});
  expect(s.scan()).toBe(false);at(s,'counter');expect(s.confirmTotal()).toBe(false);expect(s.receiveCash()).toBe(false);
  s.scan();s.scan();expect(s.scan()).toBe(false);expect(s.confirmTotal()).toBe(true);s.receiveCash();
  s.addChange(5);expect(s.finishSale()).toBe(false);expect(s.coins).toBe(0);s.addChange(1);expect(s.finishSale()).toBe(true);expect(s.coins).toBe(14);expect(s.served).toBe(1);expect(s.finishSale()).toBe(false);
  advance(s,'gone');s.closeDay();expect(s.closed).toBe(true);
 });
 it('远离收银台不能继续交易，日终不再移动或发奖',()=>{
  const s=stocked();s.startDay();advance(s,'queueing');at(s,'counter');s.scan();s.scan();s.confirmTotal();s.receiveCash();s.player=center(2,10);expect(s.finishSale()).toBe(false);
  const old={...s.customer};s.tick(300);expect(s.closed).toBe(true);s.tick(10);expect(s.customer).toEqual(old);expect(s.coins).toBe(0);
 });
 it('归还、补货、顾客购物保持商品总量守恒',()=>{
  const s=stocked();s.startDay();advance(s,'queueing');for(const id of ['milk','bread'] as const)expect(s.warehouse[id]+s.shelves[id]+s.basket.filter(v=>v===id).length+(s.carrying?.goods===id?s.carrying.quantity:0)).toBe(6);
 });
});
