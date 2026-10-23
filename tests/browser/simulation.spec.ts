import { test, expect, type Page } from '@playwright/test';
import { findPath, center, type Point } from '../../src/simulation/world';
async function position(page:Page):Promise<Point>{return page.locator('#game').evaluate(el=>({x:Number((el as HTMLElement).dataset.playerX),y:Number((el as HTMLElement).dataset.playerY)}));}
async function walk(page:Page,target:Point){
 const start=await position(page);const path=findPath(start,target);
 // Use actual keyboard events through the same aisles as the customer; no state teleporting.
 const corners:Point[]=[];
 for(let i=0;i<path.length;i++){
  const before=i===0?start:path[i-1],p=path[i],after=path[i+1];
  if(!after||Math.sign(p.x-before.x)!==Math.sign(after.x-p.x)||Math.sign(p.y-before.y)!==Math.sign(after.y-p.y))corners.push(p);
 }
 for(const point of corners){
  for(const axis of ['x','y'] as const){
   const current=await position(page),difference=point[axis]-current[axis];if(Math.abs(difference)<3)continue;
   const key=axis==='x'?(difference>0?'d':'a'):(difference>0?'s':'w');
   await page.keyboard.down(key);
   try{await page.waitForFunction(({axis,target,sign})=>{const element=document.querySelector<HTMLElement>('#game')!;const value=Number(axis==='x'?element.dataset.playerX:element.dataset.playerY);return sign>0?value>=target-2:value<=target+2;},{axis,target:point[axis],sign:Math.sign(difference)},{timeout:10000,polling:'raf'});}
   finally{await page.keyboard.up(key);}
  }
 }
}
test('走动、两次取箱补货、顾客购物、扫描找零、离店结算',async({page})=>{
 test.setTimeout(100000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.getByLabel('给吉娃娃店长取个名字').fill('小栗');await page.getByRole('button',{name:'进入便利店 →'}).click();
 await expect(page.locator('.joystick')).toBeVisible();
 await page.getByRole('button',{name:'开店',exact:true}).click();
 for(const goods of ['milk','bread'] as const){
  await walk(page,center(2,4));await page.getByRole('button',{name:'互动：仓库 · E',exact:true}).click();
  await page.getByRole('button',{name:goods==='milk'?'取牛奶箱':'取面包箱'}).click();await page.getByRole('button',{name:'返回店铺'}).click();
  await expect(page.getByTestId('stock')).toContainText('×3');
  await walk(page,goods==='milk'?center(4,9):center(10,9));await page.keyboard.press('e');
  await expect(page.getByRole('status')).toContainText('补货完成');
 }
 await walk(page,center(9,12));await expect(page.getByTestId('customer-status')).toHaveText('顾客等待结账',{timeout:20000});
 await page.getByRole('button',{name:'互动：收银台 · E',exact:true}).click();
 const exit=page.getByRole('button',{name:'暂离收银台'});expect(await exit.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
 await page.getByRole('button',{name:'扫描下一件'}).click();await exit.click();await page.getByRole('button',{name:'互动：收银台 · E',exact:true}).click();
 await expect(page.getByRole('region',{name:'收银操作'})).toContainText('已扫描 1/2');await page.getByRole('button',{name:'扫描下一件'}).click();
 await page.getByRole('button',{name:'确认总价'}).click();await page.getByRole('button',{name:'收现金 20'}).click();
 await page.getByRole('button',{name:'+5',exact:true}).click();await page.getByRole('button',{name:'交付找零，完成交易'}).click();
 await expect(page.getByRole('status')).toContainText('正确零钱');await page.getByRole('button',{name:'+1',exact:true}).click();
 await page.getByRole('button',{name:'交付找零，完成交易'}).click();await expect(page.getByRole('status')).toContainText('+14 金币');
 await expect(page.getByTestId('customer-status')).toHaveText('顾客已离店',{timeout:15000});
 await page.screenshot({path:'test-results/simulation-mobile.png',fullPage:true});await page.getByRole('button',{name:'打烊结算'}).click();
 await expect(page.getByRole('heading',{name:'今日打烊'})).toBeVisible();expect(errors).toEqual([]);
});
test('移动摇杆拖动与松手、暂停、名字及旧存档不变',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{localStorage.setItem('existing-game-save','keep');localStorage.setItem('puppy-mart.player-profile.v1',JSON.stringify({version:1,preferredName:'栗',futureField:{keep:true}}));});await page.reload();
 await expect(page.getByLabel('给吉娃娃店长取个名字')).toHaveValue('栗');await page.getByRole('button',{name:'进入便利店 →'}).click();
 const original=await position(page),pad=await page.locator('.joystick').boundingBox();expect(pad).not.toBeNull();
 const touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad!.x+pad!.width/2,y:pad!.y+pad!.height/2}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pad!.x+pad!.width-3,y:pad!.y+pad!.height/2}]});
 await page.waitForTimeout(500);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const moved=await position(page);expect(moved.x).toBeGreaterThan(original.x+20);await page.waitForTimeout(200);expect((await position(page)).x).toBeCloseTo(moved.x,0);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad!.x+pad!.width/2,y:pad!.y+pad!.height/2}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(100);expect((await position(page)).x).toBeCloseTo(moved.x,0);
 await page.getByRole('button',{name:'暂停',exact:true}).click();await page.keyboard.down('w');await page.waitForTimeout(250);await page.keyboard.up('w');expect((await position(page)).y).toBeCloseTo(moved.y,0);
 expect(await page.evaluate(()=>localStorage.getItem('existing-game-save'))).toBe('keep');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('puppy-mart.player-profile.v1')!).futureField)).toEqual({keep:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('320px 走动模式摇杆与互动位于视口内',async({page})=>{
 await page.setViewportSize({width:320,height:640});await page.goto('/');await page.getByLabel('给吉娃娃店长取个名字').pressSequentially('Wade');await expect(page.getByLabel('给吉娃娃店长取个名字')).toHaveValue('Wade');await page.getByRole('button',{name:'进入便利店 →'}).click();
 const pad=await page.locator('.joystick').boundingBox();expect(pad).not.toBeNull();expect(pad!.y+pad!.height).toBeLessThanOrEqual(640);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/simulation-narrow.png',fullPage:true});
});

for(const viewport of [{width:390,height:844},{width:320,height:640}])test(`手机互动弹窗关闭可达并恢复摇杆 ${viewport.width}px`,async({page})=>{
 test.setTimeout(40000);await page.setViewportSize(viewport);await page.goto('/');await page.getByLabel('给吉娃娃店长取个名字').fill('栗');await page.getByRole('button',{name:'进入便利店 →'}).click();
 await walk(page,center(2,4));await page.getByRole('button',{name:'就近互动',exact:true}).click();
 const close=page.getByRole('button',{name:'返回店铺',exact:true});const bounds=await close.boundingBox();
 await page.screenshot({path:'test-results/warehouse-dialog.png',fullPage:true});
 const unobstructed=await close.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===el||!!hit&&el.contains(hit);});expect(unobstructed).toBe(true);
 expect(bounds).not.toBeNull();expect(bounds!.y).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);
 await page.getByRole('button',{name:'取牛奶箱',exact:true}).click();const closeBounds=await close.boundingBox();await page.touchscreen.tap(closeBounds!.x+closeBounds!.width/2,closeBounds!.y+closeBounds!.height/2);
 const original=await position(page),pad=await page.locator('.joystick').boundingBox();const touch=await page.context().newCDPSession(page);
 await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pad!.x+pad!.width/2,y:pad!.y+pad!.height/2}]});
 await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:pad!.x+pad!.width-4,y:pad!.y+pad!.height/2}]});
 await page.waitForTimeout(350);await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 expect((await position(page)).x).toBeGreaterThan(original.x+15);
});
