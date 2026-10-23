import {test,expect,type Page} from '@playwright/test';
import {walk,position} from './helpers';
import {center} from '../../src/simulation/world';
async function choose(page:Page,orientation:'竖屏'|'横屏'){
 await page.goto('/');await page.getByRole('dialog',{name:'游玩方式',exact:true}).getByRole('button',{name:new RegExp(orientation)}).click();
 await page.getByLabel('给吉娃娃店长取个名字').fill('栗');await page.getByRole('button',{name:'进入便利店 →'}).click();await page.getByRole('button',{name:'跳过教程'}).click();
}
async function dimensions(page:Page){return page.locator('canvas').evaluate(canvas=>({width:(canvas as HTMLCanvasElement).width,height:(canvas as HTMLCanvasElement).height,cssWidth:canvas.getBoundingClientRect().width,cssHeight:canvas.getBoundingClientRect().height}));}
test('首次竖屏、偏好与尺寸设置独立保存，旋转提示不阻止游玩',async({page})=>{
 await choose(page,'竖屏');await expect(page.locator('body')).toHaveAttribute('data-orientation','portrait');
 const before=await page.evaluate(()=>localStorage.getItem('puppy-mart.shop-session.v1'));
 await page.getByRole('button',{name:'布局设置',exact:true}).click();const modal=page.getByRole('dialog',{name:'布局设置',exact:true});
 await modal.getByRole('button',{name:/横屏/}).click();await modal.getByLabel('摇杆区域').selectOption('130');await modal.getByLabel('互动按钮大小').selectOption('80');await modal.getByLabel('摇杆位置').selectOption('32');await modal.getByRole('button',{name:'返回游戏'}).click();
 await expect(page.locator('#rotation-hint')).toBeVisible();await page.getByRole('button',{name:'按当前方向继续'}).click();await expect(page.locator('#rotation-hint')).toBeHidden();
 expect((await page.locator('.joystick').boundingBox())!.width).toBe(130);expect((await page.locator('.interact-pad').boundingBox())!.width).toBe(80);
 expect(await page.evaluate(()=>localStorage.getItem('puppy-mart.shop-session.v1'))).toBe(before);
 await page.reload();await expect(page.getByRole('dialog',{name:'游玩方式',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'进入便利店 →'}).click();
 await page.getByRole('button',{name:'布局设置',exact:true}).click();await expect(page.getByLabel('互动按钮大小')).toHaveValue('80');await expect(page.getByLabel('摇杆位置')).toHaveValue('32');
});
test('横屏进入显示更宽视野，笔记打开旋转保持页码，地图不拉伸',async({page})=>{
 await page.setViewportSize({width:844,height:390});await choose(page,'横屏');await expect(page.locator('body')).toHaveAttribute('data-orientation','landscape');
 await expect.poll(async()=>(await dimensions(page)).width).toBeGreaterThan(500);const landscape=await dimensions(page);expect(Math.abs(landscape.width/landscape.height-landscape.cssWidth/landscape.cssHeight)).toBeLessThan(.03);
 const joystick=await page.locator('.joystick').boundingBox(),button=await page.locator('.interact-pad').boundingBox();expect(joystick!.x).toBeLessThan(80);expect(button!.x).toBeGreaterThan(700);
 await page.screenshot({path:'test-results/layout-landscape.png',fullPage:true});await page.getByRole('button',{name:'员工须知',exact:true}).click();await page.getByRole('button',{name:'下一页'}).click();await expect(page.getByRole('region',{name:'员工须知'})).toContainText('2 / 4');
 await page.setViewportSize({width:390,height:844});await expect(page.locator('body')).toHaveAttribute('data-orientation','portrait');await expect(page.getByRole('region',{name:'员工须知'})).toContainText('2 / 4');await page.getByRole('button',{name:'返回店铺'}).click();
 await expect.poll(async()=>(await dimensions(page)).width).toBeLessThan(landscape.width);const portrait=await dimensions(page);expect(Math.abs(portrait.width/portrait.height-portrait.cssWidth/portrait.cssHeight)).toBeLessThan(.03);
 await page.getByRole('button',{name:'按当前方向继续'}).click();await page.screenshot({path:'test-results/layout-portrait.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('拿箱后旋转继续补货，收银旋转不丢扫描进度，切回后结账',async({page})=>{
 test.setTimeout(100000);await choose(page,'竖屏');
 await walk(page,center(2,4));await page.getByRole('button',{name:'互动：仓库 · E',exact:true}).click();await page.getByRole('button',{name:'取牛奶箱',exact:true}).click();await page.getByRole('button',{name:'返回店铺'}).click();
 const carried=await position(page);await page.setViewportSize({width:844,height:390});await expect(page.locator('body')).toHaveAttribute('data-orientation','landscape');expect((await position(page)).x).toBeCloseTo(carried.x,0);await expect(page.getByTestId('stock')).toContainText('牛奶 ×3');
 await page.getByRole('button',{name:'按当前方向继续'}).click();await walk(page,center(4,9));await page.keyboard.press('e');await page.getByRole('button',{name:'开店',exact:true}).click();await walk(page,center(9,12));await expect(page.getByTestId('customer-status')).toHaveText('顾客等待结账',{timeout:20000});await page.getByRole('button',{name:'互动：收银台 · E',exact:true}).click();await page.getByRole('button',{name:'扫描下一件'}).click();
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('region',{name:'收银操作'})).toContainText('已扫描 1/1');await page.setViewportSize({width:844,height:390});await expect(page.getByRole('region',{name:'收银操作'})).toContainText('已扫描 1/1');
 await page.getByRole('button',{name:'确认总价'}).click();await page.getByRole('button',{name:'收现金 20'}).click();await page.getByRole('button',{name:'+5',exact:true}).click();await page.getByRole('button',{name:'+5',exact:true}).click();await page.getByRole('button',{name:'+2',exact:true}).click();await page.screenshot({path:'test-results/layout-cashier-landscape.png',fullPage:true});await page.getByRole('button',{name:'交付找零，完成交易'}).click();await expect(page.getByRole('status')).toContainText('+8 金币');
});
