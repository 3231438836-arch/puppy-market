import { describe, expect, it } from 'vitest';
import { Shift, generateOrder, sameOrder, products } from '../src/model';
describe('营业规则',()=>{
 it('订单难度渐进，仅使用开放商品',()=>{for(let n=0;n<100;n++){const order=generateOrder(n);expect(order).toHaveLength(n<2?1:n<6?2:3);expect(order.every(id=>products.some(p=>p.id===id))).toBe(true);}});
 it('比较无序订单，保留重复商品数量',()=>{expect(sameOrder(['milk','bread'],['bread','milk'])).toBe(true);expect(sameOrder(['milk','milk'],['milk','bread'])).toBe(false);expect(sameOrder(['milk'],['milk','milk'])).toBe(false);});
 it('正确结账、递增连击、奖励上限',()=>{const s=new Shift(()=>0);for(let i=1;i<=9;i++){const base=s.order.length*8;s.order.forEach(id=>s.select(id));expect(s.checkout()).toEqual({correct:true,reward:base+Math.min(i-1,5)*2});}expect(s.served).toBe(9);expect(s.bestCombo).toBe(9);});
 it('错误扣时并断连，保留篮子供修改',()=>{const s=new Shift(()=>0);s.select('milk');s.checkout();s.select('bread');expect(s.checkout()?.correct).toBe(false);expect(s.remaining).toBe(117);expect(s.combo).toBe(0);expect(s.coins).toBe(8);expect(s.basket).toEqual(['bread']);s.undo();s.select('milk');s.clear();expect(s.basket).toEqual([]);});
 it('空篮不扣时；最多三件；拒绝未知商品',()=>{const s=new Shift();expect(s.checkout()).toBeNull();s.select('invalid');for(let i=0;i<4;i++)s.select('milk');expect(s.basket).toHaveLength(3);});
 it('到时打烊，禁止重复收入和配货',()=>{const s=new Shift(()=>0);s.select('milk');s.tick(120);expect(s.closed).toBe(true);expect(s.checkout()).toBeNull();s.select('bread');expect(s.basket).toEqual(['milk']);expect(s.coins).toBe(0);});
 it('失误最后三秒也会打烊，重开状态独立',()=>{const s=new Shift(()=>0);s.tick(118);s.select('bread');s.checkout();expect(s.remaining).toBe(0);expect(s.closed).toBe(true);expect(new Shift().coins).toBe(0);});
});
