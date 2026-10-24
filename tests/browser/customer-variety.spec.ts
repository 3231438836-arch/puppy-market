import {skipOpening} from './helpers';
import {test,expect} from '@playwright/test';
import {ShopSimulation,fixtures} from '../../src/simulation/world';
import {snapshot} from '../../src/simulation/persistence';
import {walk} from './helpers';
import {mkdirSync} from 'node:fs';
const shots='docs/customer-events/screenshots';
const layout={version:1,selected:true,preferred:'portrait',joystickSize:120,buttonSize:78,joystickInset:18};
test('外观校对：六物种18组，四向动画实际渲染，手机缩放无错误',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));mkdirSync(shots,{recursive:true});
 await page.setViewportSize({width:760,height:1240});await page.goto('/previews/customers.html');await expect(page.locator('body')).toHaveAttribute('data-ready','true');await page.screenshot({path:`${shots}/appearance-front.png`,fullPage:true});
 for(const [name,key] of [['背面','up'],['左侧','left'],['右侧','right']]){await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('body')).toHaveAttribute('data-direction',key);await page.screenshot({path:`${shots}/appearance-${key}.png`,fullPage:true});}
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'正面',exact:true}).click();await expect(page.locator('canvas')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('普通顾客多外观：自动到店、横竖屏、真实排队、一键结账与离店',async({page})=>{
 test.setTimeout(100000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const s=new ShopSimulation();s.shelves={milk:6,bread:6,rice:0};s.flow.plan=Array.from({length:3},(_,i)=>({id:`variety-${i}`,customerId:'ordinary',at:i,arrived:false}));
 await page.addInitScript(({data,layout})=>{if(!localStorage.getItem('puppy-mart.shop-session.v1'))localStorage.setItem('puppy-mart.shop-session.v1',JSON.stringify(data));localStorage.setItem('puppy-mart.layout.v1',JSON.stringify(layout));localStorage.setItem('puppy-mart.tutorial.v1',JSON.stringify({version:1,step:8,status:'completed'}));},{data:snapshot(s),layout});
 await page.goto('/');await page.getByLabel('给吉娃娃店长取个名字').fill('校对');await page.getByRole('button',{name:'进入便利店 →'}).click();await skipOpening(page);await page.getByRole('button',{name:'开店',exact:true}).click();
 await expect.poll(async()=>page.locator('#game').getAttribute('data-customer-appearances'),{timeout:15000}).toMatch(/^[^,]+,[^,]+,[^,]+$/);
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy-mart.shop-session.v1')!).flow.visitors.map((v:{appearanceId:string})=>v.appearanceId));expect(new Set(before).size).toBe(3);
 await walk(page,fixtures.find(f=>f.id==='counter')!.spot);await expect(page.getByRole('button',{name:'结账',exact:true})).toBeVisible({timeout:30000});
 await page.screenshot({path:`${shots}/queue-portrait.png`});await page.setViewportSize({width:844,height:390});await page.screenshot({path:`${shots}/queue-landscape.png`});
 const samples=await page.evaluate(()=>new Promise<number[]>(resolve=>{let last=performance.now();const deltas:number[]=[];const step=(now:number)=>{deltas.push(now-last);last=now;if(deltas.length===90)resolve(deltas);else requestAnimationFrame(step);};requestAnimationFrame(step);}));
 const median=[...samples].sort((a,b)=>a-b)[45];console.log(`Chromium mobile emulation (3 visitors), median frame ${median.toFixed(2)}ms; not a physical-device benchmark`);
 for(let i=0;i<3;i++){await expect(page.getByRole('button',{name:'结账',exact:true})).toBeVisible({timeout:25000});await page.keyboard.press('e');await page.waitForTimeout(150);}
 await expect(page.getByRole('button',{name:'打烊',exact:true})).toBeEnabled({timeout:15000});await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('puppy-mart.shop-session.v1')!).flow.visitors.every((v:{paid:boolean;state:string})=>v.paid&&v.state==='gone'))).toBe(true);const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy-mart.shop-session.v1')!));expect(data.served).toBe(3);expect(data.flow.visitors.every((v:{paid:boolean;state:string})=>v.paid&&v.state==='gone')).toBe(true);expect(data.narrative.profiles).not.toHaveProperty('ordinary');
 await page.reload();await page.getByRole('button',{name:'进入便利店 →'}).click();await skipOpening(page);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy-mart.shop-session.v1')!).flow.visitors.map((v:{appearanceId:string})=>v.appearanceId))).toEqual(before);expect(errors).toEqual([]);
});

test.describe('PC场景事件',()=>{
 test.use({isMobile:false,hasTouch:false,viewport:{width:1280,height:800}});
 test('WASD移动与E键触发货架帮助、候选对话和永久调整',async({page})=>{
  test.setTimeout(60000);await page.addInitScript(layout=>localStorage.setItem('puppy-mart.layout.v1',JSON.stringify({...layout,preferred:'landscape'})),layout);
  await page.goto('/?npc-preview=001');await page.getByLabel('给吉娃娃店长取个名字').fill('PC校对');await page.getByRole('button',{name:'进入便利店 →'}).click();await skipOpening(page);await page.getByRole('button',{name:'开店',exact:true}).click();
  await expect(page.locator('#game')).toHaveAttribute('data-environment-markers','customer001-high-shelf',{timeout:25000});await walk(page,{x:336,y:336});await page.keyboard.press('e');await expect(page.getByRole('button',{name:'帮忙拿商品',exact:true})).toBeVisible();await page.getByRole('button',{name:'帮忙拿商品',exact:true}).click();await expect(page.locator('.conversation')).toBeVisible();await expect(page.locator('#game')).toHaveAttribute('data-environment-markers','');await page.getByRole('button',{name:'跳过对话'}).click();await page.keyboard.press('e');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('puppy-mart.npc001-preview.v1')!).narrative.profiles.CUSTOMER_001.eventFlags.customer001_shelf_adjusted)).toBe(true);
  await page.screenshot({path:`${shots}/event-completed-desktop.png`});
 });
});
