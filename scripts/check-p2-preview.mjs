import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const url=process.argv[2]??'http://127.0.0.1:5211/puppy-market/previews/p2-20261026/';
const prefix='puppy-mart.preview-p2-20261026.';
const key=prefix+'shop-session.v1';
const formal={'puppy-mart.shop-session.v1':'{"version":2,"protect":"formal-save"}','puppy-mart.player-profile.v1':'{"version":1,"preferredName":"正式存档名字"}','puppy-mart.layout.v1':'formal-layout-sentinel','puppy-mart.tutorial.v1':'formal-tutorial-sentinel'};
const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});
const errors=[],failed=[];
function observe(page){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push([r.status(),r.url()]);});}
try{
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
 await context.addInitScript(formal=>{for(const [k,v]of Object.entries(formal))localStorage.setItem(k,v);},formal);
 const page=await context.newPage();observe(page);const response=await page.goto(url);assert.equal(response.status(),200);
 await page.getByRole('button',{name:/^竖屏/}).tap();
 assert.match(await page.locator('.preview-notice').innerText(),/独立测试存档/);
 await page.getByLabel('给吉娃娃店长取个名字').fill('P2试玩');await page.getByRole('button',{name:'进入便利店 →'}).tap();
 await page.locator('.guide-chip').waitFor();await page.getByRole('button',{name:'跳过',exact:true}).tap();
 await page.getByRole('button',{name:'设置',exact:true}).tap();assert.match(await page.locator('.layout-sheet').innerText(),/P2 独立试玩/);
 await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'返回游戏'}).tap();
 await page.screenshot({path:'/tmp/puppy-p2-20261026/landscape.png'});
 const entries=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)));
 for(const [k,v] of Object.entries(formal))assert.equal(entries[k],v);
 const session=JSON.parse(entries[key]);assert.equal(session.business.day,1);await context.close();
 // Restore a closed-night fixture, then exercise real UI controls and refresh.
 session.closed=true;session.open=false;entries[key]=JSON.stringify(session);
 entries[prefix+'tutorial.v1']=JSON.stringify({version:1,step:8,status:'completed'});
 const night=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});
 await night.addInitScript(entries=>{if(localStorage.length===0)for(const [k,v]of Object.entries(entries))localStorage.setItem(k,v);},entries);
 const p=await night.newPage();observe(p);await p.goto(url);await p.getByRole('button',{name:'进入便利店 →'}).tap();
 await p.getByRole('button',{name:'回宿舍休息'}).tap();await p.getByRole('article',{name:'睡前日记'}).waitFor();
 const bounds=await p.getByRole('button',{name:'关灯睡觉 · 迎接明天'}).boundingBox();assert(bounds.y+bounds.height<=568);assert(bounds.height>=44);
 await p.screenshot({path:'/tmp/puppy-p2-20261026/night-320.png'});
 await p.getByRole('button',{name:'关灯睡觉 · 迎接明天'}).tap();await p.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).business.day===2,key);
 await p.reload();await p.getByRole('button',{name:'进入便利店 →'}).tap();
 const result=await p.evaluate(key=>({save:JSON.parse(localStorage.getItem(key)),entries:Object.fromEntries(Object.entries(localStorage))}),key);
 assert.equal(result.save.business.day,2);assert.equal(result.save.business.balance,session.business.balance);assert.deepEqual(result.save.shelves,session.shelves);
 for(const [k,v]of Object.entries(formal))assert.equal(result.entries[k],v);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 writeFileSync('/tmp/puppy-p2-20261026/smoke.json',JSON.stringify({url,http:200,portrait:true,landscape:true,nightToDay2:true,reload:true,formalSavesUnchanged:true,errors,failed},null,2));
 console.log('Preview production smoke passed: 320px + landscape, night→day2→reload, formal saves unchanged.');
 await night.close();
}finally{await browser.close();}
