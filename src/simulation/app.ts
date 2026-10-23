import Phaser from 'phaser';
import { SimulationScene } from './scene';
import { loadName, normalizeName, saveName } from '../characters';
import { products } from '../model';
import { fixtures } from './world';
import './style.css';
const panel=document.querySelector<HTMLElement>('#controls')!;
const gameElement=document.querySelector<HTMLElement>('#game')!;
gameElement.classList.add('simulation-map');
document.querySelector('header span')!.textContent='街角便利店 · v3 走动试玩';
const scene=new SimulationScene(),s=scene.shop;
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:430,height:420,pixelArt:true,backgroundColor:'#efdfc2',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});
const escape=(text:string)=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)).replaceAll(String.fromCharCode(34),'&quot;').replaceAll(String.fromCharCode(39),'&#39;');
let entered=false,managerName=loadName(),dialog:'warehouse'|'register'|null=null,lastSignature='',saveNotice='';
let paused=false;
let resetJoystick: () => void = () => {};
function resetMovement(){scene.resetInput();resetJoystick();}
function dismissDialog(){dialog=null;scene.modal=false;resetMovement();}
const goodsName=(id:string)=>products.find(p=>p.id===id)!.name;
function render(){
 if(!entered){
  if(panel.querySelector('#enter-shop'))return;
  panel.innerHTML=`<div class="eyebrow">WALKABLE SHOP · v3 垂直切片</div><h1>今天，走进小店</h1><label class="name-label" for="manager-name">给吉娃娃店长取个名字</label><input id="manager-name" maxlength="32" value="${escape(managerName)}" placeholder="你想怎样称呼店长？"><p class="muted">沿用本机名字；不修改已有经营存档。</p><button id="enter-shop" class="primary wide" data-do="enter">进入便利店 →</button><details open><summary>员工须知 · 操作占位教程</summary><p>① 摇杆或 WASD / 方向键移动，走到物件前的圆圈。<br>② 左上仓库取一箱牛奶，到牛奶架前补货；面包同理。<br>③ 开店后顾客会购物，缺货时会等待。<br>④ 走到收银台上侧，逐件扫描、确认总价、收现金、找零。<br>本次仅一名顾客，5 分钟营业；完成后可提前打烊。</p><p class="muted">这是操作测试文本，正式《员工须知》待作者填写。</p></details><a href="?mode=classic">回到经典 P0 模式</a>`;return;
 }
 if(dialog==='register'&&!s.atRegister)dismissDialog();
 scene.modal=!!dialog;
 document.body.classList.toggle('sim-dialog-open',!!dialog);
 const signature=JSON.stringify([s.nearby,s.warehouse,s.shelves,s.carrying,s.customerState,s.path.length===0,s.basket,s.scanned,s.confirmed,s.cashReceived,s.change,s.coins,s.served,s.open,s.closed,Math.ceil(s.remaining),s.message,dialog,paused]);
 if(signature===lastSignature)return;lastSignature=signature;
 const padButton=document.querySelector<HTMLButtonElement>('.interact-pad');
 if(padButton)padButton.disabled=!s.nearby||paused||!!dialog||s.closed;
 if(s.closed){scene.modal=false;panel.innerHTML=`<div class="eyebrow">CLOSED</div><h1>今日打烊</h1><p>收入 <strong>${s.coins}</strong> 金币 · 完成 ${s.served} 单</p><p>牛奶架 ${s.shelves.milk}/6，面包架 ${s.shelves.bread}/6。<br>仓库剩余：牛奶 ${s.warehouse.milk}，面包 ${s.warehouse.bread}。</p><p>切片不包含升级或经营存档；已有本机数据未改动。</p><button class="primary wide" data-do="restart">重新体验切片</button><a href="?mode=classic">经典模式</a>`;return;}
 const near=fixtures.find(f=>f.id===s.nearby);
 const customer={outside:'尚未开店',shopping:'顾客正在购物', 'waiting-stock':'顾客等待补货',queueing:s.path.length?'顾客前往收银台':'顾客等待结账',leaving:'顾客正在离店',gone:'顾客已离店'}[s.customerState];
 panel.innerHTML=`<div class="sim-head"><b>店长 · ${escape(managerName)}</b><span>${s.open?Math.ceil(s.remaining)+'s':'开店准备'} · ${s.coins} 金币</span></div>${saveNotice?`<p class="muted">${saveNotice}</p>`:''}<p class="sim-status" data-testid="customer-status">${customer}</p><p class="sim-inventory" data-testid="stock">牛奶 ${s.shelves.milk}/6 · 面包 ${s.shelves.bread}/6 · 手持：${s.carrying?goodsName(s.carrying.goods)+' ×'+s.carrying.quantity:'无'}</p><p class="hint" role="status">${escape(s.message)}</p><div class="sim-actions">${!s.open?'<button class="primary" data-do="open">开店</button>':''}<button data-do="interact" ${!near||paused?'disabled':''}>${near?'互动：'+near.label:'靠近圆圈互动'} · E</button><button data-do="pause">${paused?'继续':'暂停'}</button>${s.customerState==='gone'?'<button data-do="close-day">打烊结算</button>':''}</div><div id="dialog" ${dialog?'role="dialog" aria-modal="true" aria-label="店铺互动"':''}>${dialogContent()}</div><p class="muted">摇杆 / WASD / 方向键移动，E 互动。视角跟随店长。<br>左上仓库 · 中间双货架 · 右下收银台 · 下方入口</p>`;
}
function dialogContent(){
 const pauseNotice=paused?'<p role="status">游戏已暂停 <button data-do="pause">继续操作</button></p>':'';
 if(dialog==='warehouse')return `<section class="sim-dialog" aria-label="仓库取货"><div class="dialog-heading"><h2>仓库 · 每箱 3 件</h2><button data-do="dismiss">返回店铺</button></div>${pauseNotice}<p>仓库牛奶 ${s.warehouse.milk} 件，面包 ${s.warehouse.bread} 件</p><div class="sim-actions"><button data-do="take-milk">取牛奶箱</button><button data-do="take-bread">取面包箱</button><button data-do="return">放回货箱</button></div><p class="muted">取好货箱后，按上方「返回店铺」继续移动。</p></section>`;
 if(dialog==='register')return `<section class="sim-dialog" aria-label="收银操作"><div class="dialog-heading"><h2>收银台 · 现金结账</h2><button data-do="dismiss">暂离收银台</button></div>${pauseNotice}<ol>${s.basket.map((id,i)=>`<li>${goodsName(id)} · ${products.find(p=>p.id===id)!.price} 金币 ${i<s.scanned?'✓ 已扫描':'待扫描'}</li>`).join('')}</ol><p>已扫描 ${s.scanned}/${s.basket.length} · 合计 ${s.total} 金币</p><div class="sim-actions"><button data-do="scan" ${s.confirmed||s.scanned===s.basket.length?'disabled':''}>扫描下一件</button><button data-do="confirm" ${s.scanned!==s.basket.length||s.confirmed?'disabled':''}>确认总价</button><button data-do="cash" ${!s.confirmed||s.cashReceived?'disabled':''}>收现金 ${s.tender}</button></div>${s.cashReceived?`<p>应找零 ${s.changeDue} 金币 · 已放零钱 <b data-testid="change">${s.change}</b></p><div class="sim-actions"><button data-do="change-1">+1</button><button data-do="change-2">+2</button><button data-do="change-5">+5</button><button data-do="clear-change">清空零钱</button></div><button class="primary wide" data-do="finish">交付找零，完成交易</button>`:''}<p class="muted">操作界面暂停营业计时。暂离后扫描进度保留。</p></section>`;
 return '';
}
function interact(){
 if(!entered||paused||dialog||s.closed)return;
 // Do not reset Phaser's E key while its keydown is being dispatched.
 resetJoystick();
 if(s.nearby==='warehouse'){dialog='warehouse';scene.modal=true;}
 else if(s.nearby==='milk'||s.nearby==='bread')s.restock(s.nearby);
 else if(s.nearby==='counter'){
  if(s.atRegister){dialog='register';scene.modal=true;}
  else s.message='顾客还没有到达收银台，请先补齐两种商品。';
 } else if(s.nearby==='stairs')s.message='楼上员工宿舍入口已预留，本次切片暂不开放。';
 else if(s.nearby==='freezer')s.message='冰柜区域已预留，本次切片仅开放牛奶与面包货架。';
 render();
}
scene.onRefresh=render;scene.onInteract=interact;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog){e.preventDefault();dismissDialog();render();}});
panel.addEventListener('click',e=>{
 const action=(e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.do;if(!action)return;
 resetMovement();
 if(action==='enter'){
  const input=panel.querySelector<HTMLInputElement>('#manager-name')!;managerName=normalizeName(input.value);
  if(!managerName){input.setCustomValidity('请先给店长取名。');input.reportValidity();return;}
  saveNotice=saveName(managerName)?'':'名字暂时无法保存；当前仍可游玩。';entered=true;scene.activePlay=true;setupJoystick();
 }else if(action==='restart'){location.reload();return;}
 else if(action==='pause'){paused=!paused;scene.paused=paused;}
 else if(action==='dismiss')dismissDialog();
 else if(paused)return;
 else if(action==='open')s.startDay();
 else if(action==='interact'){interact();return;}
 else if(action==='take-milk')s.takeBox('milk');
 else if(action==='take-bread')s.takeBox('bread');
 else if(action==='return')s.returnBox();
 else if(action==='scan')s.scan();
 else if(action==='confirm')s.confirmTotal();
 else if(action==='cash')s.receiveCash();
 else if(action.startsWith('change-'))s.addChange(Number(action.slice(7)));
 else if(action==='clear-change')s.clearChange();
 else if(action==='finish'){if(s.finishSale())dismissDialog();}
 else if(action==='close-day')s.closeDay();
 render();
});
function setupJoystick(){
 const dock=document.createElement('div');dock.className='movement-dock';
 dock.innerHTML='<div class="joystick" role="group" aria-label="移动摇杆"><span class="stick"></span><span class="joystick-label">移动</span></div><button class="interact-pad" aria-label="就近互动">互动<br><small>E</small></button>';
 document.querySelector('#app')!.append(dock);
 const pad=dock.querySelector<HTMLElement>('.joystick')!,stick=pad.querySelector<HTMLElement>('.stick')!;
 let pointer:number|null=null;
 function reset(){const previous=pointer;pointer=null;scene.joystick={x:0,y:0};stick.style.transform='translate(0,0)';if(previous!==null&&pad.hasPointerCapture(previous))pad.releasePointerCapture(previous);}
 resetJoystick=reset;
 function point(event:PointerEvent){
  const r=pad.getBoundingClientRect(),dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2;
  const length=Math.hypot(dx,dy),scale=Math.min(1,32/(length||1));
  scene.joystick={x:length<6?0:dx*scale/32,y:length<6?0:dy*scale/32};stick.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
 }
 pad.addEventListener('pointerdown',e=>{if(pointer!==null||paused||dialog||s.closed)return;pointer=e.pointerId;pad.setPointerCapture(e.pointerId);point(e);e.preventDefault();});
 pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)point(e);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,reset);
 dock.querySelector('button')!.addEventListener('click',interact);
 window.addEventListener('blur',()=>{reset();if(entered){paused=true;scene.paused=true;render();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();paused=true;scene.paused=true;render();}});
}
render();
