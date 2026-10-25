import {test,expect,type Page} from '@playwright/test';
import {ShopSimulation} from '../../src/simulation/world';
import {snapshot,SESSION_KEY} from '../../src/simulation/persistence';
const layout={version:1,selected:true,preferred:'portrait',joystickSize:120,buttonSize:78,joystickInset:18};
function closedNight(day=1){
 const s=new ShopSimulation();s.closed=true;s.business.data.day=day;s.business.sale(['milk']);s.served=1;s.coins=8;s.warehouse.milk=4;s.shelves.milk=2;
 s.narrative.visit('test-regular',day);s.preservedSessionFields={futureField:{keep:'P2-00'}};return snapshot(s);
}
async function enter(page:Page,day=1,tutorial=false){
 await page.addInitScript(({session,layout,key,tutorial})=>{
  if(localStorage.getItem(key)===null){
   localStorage.setItem(key,JSON.stringify(session));localStorage.setItem('unrelated-game','keep');
   localStorage.setItem('puppy-mart.layout.v1',JSON.stringify(layout));
   localStorage.setItem('puppy-mart.tutorial.v1',JSON.stringify({version:1,step:tutorial?7:8,status:tutorial?'active':'completed'}));
  }
 },{session:closedNight(day),layout,key:SESSION_KEY,tutorial});
 await page.goto('/');await page.getByLabel('给吉娃娃店长取个名字').fill('栗');await page.getByRole('button',{name:'进入便利店 →'}).click();
}
async function saved(page:Page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),SESSION_KEY);}
async function touchable(page:Page,name:string){
 const button=page.getByRole('button',{name,exact:true}),box=(await button.boundingBox())!;
 expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
 const size=page.viewportSize()!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(size.width);expect(box.y+box.height).toBeLessThanOrEqual(size.height);
 await button.tap();
}
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}])test(`文字宿舍返回、刷新、触摸睡觉及重复点击 ${size.width}`,async({page})=>{
 await page.setViewportSize(size);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await enter(page);
 const before=await saved(page);await expect(page.locator('.ledger')).toContainText('今日销售额 8');
 await touchable(page,'回宿舍休息');await expect(page.getByRole('article',{name:'睡前日记'})).toContainText('唉，今天就来了一个客人。');
 await expect(page.getByRole('article',{name:'睡前日记'})).not.toContainText('认真地整理货架');
 await touchable(page,'返回结算');await expect(page.locator('.ledger')).toContainText('今日销售额 8');
 await touchable(page,'回宿舍休息');await page.reload();await page.getByRole('button',{name:'进入便利店 →'}).click();
 await expect(page.getByRole('button',{name:'回宿舍休息'})).toBeVisible();expect(await saved(page)).toEqual(before);
 await touchable(page,'回宿舍休息');
 const body=page.getByRole('article',{name:'睡前日记'});
 const cdp=await page.context().newCDPSession(page),box=(await body.boundingBox())!;

 if(size.width===320){
  expect(await body.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  const x=box.x+box.width/2,y=box.y+box.height*.8;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
  for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:y-i*22}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 await page.screenshot({path:`docs/p2-00/evening-${size.width}.png`});
 await touchable(page,'关灯睡觉 · 迎接明天');await expect(page.locator('.compact-hud')).toContainText('第2天');const after=await saved(page);
 expect(after.business.day).toBe(2);expect(after.business.balance).toBe(before.business.balance);expect(after.shelves).toEqual(before.shelves);
 expect(after.warehouse).toEqual(before.warehouse);expect(after.narrative).toEqual(before.narrative);expect(after.futureField).toEqual(before.futureField);
 await page.reload();await page.getByRole('button',{name:'进入便利店 →'}).click();expect((await saved(page)).business.day).toBe(2);
 expect(await page.evaluate(()=>localStorage.getItem('unrelated-game'))).toBe('keep');expect(errors).toEqual([]);
});
test('存储失败留在当晚不完成教程，修复后只跨日与庆祝一次',async({page})=>{
 await page.setViewportSize({width:320,height:568});await enter(page,1,true);await page.getByRole('button',{name:'回宿舍休息'}).tap();const before=await saved(page);
 await page.evaluate(key=>{
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(k===key&&JSON.parse(v).business?.day===2)throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v);};
  (window as unknown as {restoreStorage:()=>void}).restoreStorage=()=>{Storage.prototype.setItem=original;};
 },SESSION_KEY);
 await page.getByRole('button',{name:'关灯睡觉 · 迎接明天'}).tap();await expect(page.getByRole('alert')).toContainText('未能保存下一天');
 expect(await saved(page)).toEqual(before);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy-mart.tutorial.v1')!).status)).toBe('active');
 await expect(page.locator('.pixel-confetti')).toHaveCount(0);
 await page.evaluate(()=>(window as unknown as {restoreStorage:()=>void}).restoreStorage());
 // Two immediate clicks on the original button must not advance twice.
 await page.getByRole('button',{name:'关灯睡觉 · 迎接明天'}).evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click();});
 expect((await saved(page)).business.day).toBe(2);await expect(page.locator('.pixel-confetti')).toHaveCount(1);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy-mart.tutorial.v1')!).status)).toBe('completed');
 await page.waitForTimeout(1600);await expect(page.locator('.pixel-confetti')).toHaveCount(0);
 await page.reload();await page.getByRole('button',{name:'进入便利店 →'}).click();await expect(page.locator('.pixel-confetti')).toHaveCount(0);expect((await saved(page)).business.day).toBe(2);
});
test('后续日记明确占位，不按四单编造全员买到商品',async({page})=>{
 await enter(page,4);await page.getByRole('button',{name:'回宿舍休息'}).tap();const diary=page.getByRole('article',{name:'睡前日记'});
 await expect(diary).toContainText('待作者填写');await expect(diary).toContainText('第 4 天 · 今日已完成交易 1 单');
 await expect(diary).not.toContainText('大家都买到东西了');
});
test('睡觉按钮上的拖动与取消不触发，之后真实触摸仍可用',async({page})=>{
 await page.setViewportSize({width:320,height:568});await enter(page);await page.getByRole('button',{name:'回宿舍休息'}).tap();
 const button=page.getByRole('button',{name:'关灯睡觉 · 迎接明天'}),box=(await button.boundingBox())!,cdp=await page.context().newCDPSession(page);
 const x=box.x+box.width/2,y=box.y+box.height/2;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:x+30,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 expect((await saved(page)).business.day).toBe(1);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 expect((await saved(page)).business.day).toBe(1);
 await button.tap();await expect(page.locator('.compact-hud')).toContainText('第2天');
});
