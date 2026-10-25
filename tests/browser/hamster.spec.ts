import {test,expect} from '@playwright/test';
import {ShopSimulation,fixtures} from '../../src/simulation/world';
import {snapshot,SESSION_KEY} from '../../src/simulation/persistence';
import {CUSTOMER_001} from '../../src/simulation/narrative';
import {walk} from './helpers';
for(const width of [320,390])test(`第2天保底仓鼠真实购物、货架首遇、刷新、结账 ${width}`,async({page})=>{
 test.setTimeout(65000);await page.setViewportSize({width,height:844});const s=new ShopSimulation();s.business.data.day=2;s.shelves={milk:6,bread:6,rice:0};s.player={...fixtures.find(f=>f.id==='bread')!.spot};
 const originalRandom=Math.random;try{Math.random=()=>0;s.startDay();}finally{Math.random=originalRandom;}
 await page.addInitScript(({v,key})=>{
  if(!localStorage.getItem(key)){
   localStorage.setItem(key,JSON.stringify(v));localStorage.setItem('puppy-mart.player-profile.v1',JSON.stringify({version:1,preferredName:'栗'}));
   localStorage.setItem('puppy-mart.tutorial.v1',JSON.stringify({version:1,step:8,status:'completed'}));
   localStorage.setItem('puppy-mart.layout.v1',JSON.stringify({version:1,selected:true,preferred:'portrait',joystickSize:120,buttonSize:78,joystickInset:18}));
  }
 },{v:snapshot(s),key:SESSION_KEY});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.getByRole('button',{name:'进入便利店 →'}).click();
 const dialogue=page.getByRole('region',{name:'顾客对话'});await expect(dialogue).toBeVisible({timeout:25000});
 await expect(dialogue.getByRole('img',{name:'小仓鼠临时像素肖像'})).toBeVisible();await expect(dialogue).toContainText('待作者填写');
 const state=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SESSION_KEY);expect(state.flow.plan.filter((a:{customerId?:string})=>a.customerId===CUSTOMER_001)).toHaveLength(1);expect(state.narrative.profiles[CUSTOMER_001].visitCount).toBe(1);
 expect(state.flow.visitors.find((v:{customerId:string})=>v.customerId===CUSTOMER_001).basket).toEqual([]);
 const box=(await dialogue.getByRole('button',{name:'继续',exact:true}).boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);expect(box.x+box.width).toBeLessThanOrEqual(width);
 await page.screenshot({path:`docs/p2-01/first-shelf-${width}.png`});
 await page.reload();await page.getByRole('button',{name:'进入便利店 →'}).click();await expect(dialogue).toBeVisible();await dialogue.getByRole('button',{name:'跳过对话'}).tap();await walk(page,fixtures.find(f=>f.id==='counter')!.spot);
 await expect(page.getByRole('button',{name:'结账',exact:true})).toBeVisible({timeout:20000});await page.getByRole('button',{name:'结账',exact:true}).tap();await expect(dialogue).toHaveCount(0);
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).served,SESSION_KEY)).toBe(1);
 await expect.poll(()=>page.locator('#game').evaluate(el=>JSON.parse((el as HTMLElement).dataset.customers!).find((v:{customerId:string})=>v.customerId==='CUSTOMER_001')?.state),{timeout:15000}).toBe('gone');
 await page.reload();await page.getByRole('button',{name:'进入便利店 →'}).click();const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SESSION_KEY);
 expect(after.narrative.profiles[CUSTOMER_001].visitCount).toBe(1);expect(after.narrative.profiles[CUSTOMER_001].dialogueFlags['customer001-first-shelf']).toBe(true);expect(after.business.daily.sales).toBe(14);expect(errors).toEqual([]);
});
test('旧第4天闭店档保持账本，睡觉后第5天自动补登场',async({page})=>{
 const s=new ShopSimulation();s.business.data.day=4;s.closed=true;s.shelves={milk:6,bread:6,rice:0};const v=snapshot(s);delete v.narrative.firstDueDays;
 await page.addInitScript(({v,key})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(v));localStorage.setItem('puppy-mart.layout.v1',JSON.stringify({version:1,selected:true,preferred:'portrait',joystickSize:120,buttonSize:78,joystickInset:18}));localStorage.setItem('puppy-mart.tutorial.v1',JSON.stringify({version:1,step:8,status:'completed'}));}},{v,key:SESSION_KEY});
 await page.goto('/');await page.getByLabel('给吉娃娃店长取个名字').fill('栗');await page.getByRole('button',{name:'进入便利店 →'}).click();await page.getByRole('button',{name:'回宿舍休息'}).tap();await page.getByRole('button',{name:'关灯睡觉 · 迎接明天'}).tap();await page.getByRole('button',{name:'开店',exact:true}).tap();
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SESSION_KEY);expect(after.business.day).toBe(5);expect(after.business.balance).toBe(60);expect(after.flow.plan.filter((a:{customerId?:string})=>a.customerId===CUSTOMER_001)).toHaveLength(1);expect(after.narrative.profiles[CUSTOMER_001]?.visitCount??0).toBe(after.flow.plan.find((a:{customerId?:string})=>a.customerId===CUSTOMER_001).arrived?1:0);
});
