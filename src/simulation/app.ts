import Phaser from 'phaser';
import { SimulationScene } from './scene';
import { loadName, normalizeName, saveName } from '../characters';
import { products } from '../model';
import { fixtures, ShopSimulation } from './world';
import { Tutorial, tutorialContent } from './tutorial';
import { loadSession, restoreSession, snapshot, writeStore, SESSION_KEY } from './persistence';
import { growthSummary, goalList } from './growth-ui';
import { Sound } from './sound';
import { type Goods } from './world';
import { LayoutController } from './layout';
import './style.css';
import './layout.css';
const layout=new LayoutController();
const sound=new Sound();let lastFeedback=0;let toastTimer=0;
const panel=document.querySelector<HTMLElement>('#controls')!;
const gameElement=document.querySelector<HTMLElement>('#game')!;
gameElement.classList.add('simulation-map');
document.querySelector('header span')!.textContent='街角便利店 · P1 教学与成长';
const scene=new SimulationScene();
const training=new URLSearchParams(location.search).get('training')==='1';
const sessionKey=training?'puppy-mart.training-session.v1':SESSION_KEY;
const storedSession=loadSession(sessionKey);
let s=restoreSession(storedSession.value);scene.shop=s;
let hasSession=false;try{hasSession=localStorage.getItem(sessionKey)!==null&&storedSession.writable;}catch{}
const tutorial=new Tutorial(training?'puppy-mart.tutorial-replay.v1':undefined,hasSession);
let notebookPage=0;
function saveProgress(){if(entered){if(!writeStore(sessionKey,snapshot(s),storedSession.writable)&&storedSession.writable)saveNotice='当前浏览器无法保存进度，请勿关闭页面。';tutorial.save();}}
function nextDay(){s=s.nextDay()??s;scene.shop=s;s.message='新的一天：'+(s.business.level>=2?'饭团已解锁，去仓库采购并放到冰柜货位。':'补货后接待顾客，完成目标可积累经验。');dialog=null;scene.modal=false;paused=false;scene.paused=false;lastSignature='';saveProgress();render();}

const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:430,height:420,pixelArt:true,backgroundColor:'#efdfc2',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});
const escape=(text:string)=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)).replaceAll(String.fromCharCode(34),'&quot;').replaceAll(String.fromCharCode(39),'&#39;');
let entered=false,managerName=loadName(),dialog:'warehouse'|'register'|'notebook'|null=null,lastSignature='',saveNotice='';
let paused=false;
let resetJoystick: () => void = () => {};
function resetMovement(){scene.resetInput();resetJoystick();}
function dismissDialog(){dialog=null;scene.modal=false;resetMovement();}
const goodsName=(id:string)=>products.find(p=>p.id===id)!.name;
function render(){
 if(!entered){
  if(panel.querySelector('#enter-shop'))return;
  panel.innerHTML=`<div class="eyebrow">PUPPY MART · P1</div><h1>今天，走进小店</h1><label class="name-label" for="manager-name">给吉娃娃店长取个名字</label><input id="manager-name" maxlength="32" value="${escape(managerName)}" placeholder="你想怎样称呼店长？"><p class="muted">沿用本机名字；不修改已有经营存档。</p><button id="enter-shop" class="primary wide" data-do="enter">进入便利店 →</button><p>首次进入会逐步引导实际移动、补货和收银；可随时跳过或重新学习。</p><a href="?mode=classic">回到经典 P0 模式</a>`;return;
 }
 if(dialog==='register'&&!s.atRegister)dismissDialog();
 if(tutorial.observe(s))saveProgress();
 scene.guideTarget=tutorial.target(s);scene.highlightPlayer=tutorial.active&&tutorial.step===0;
 scene.modal=!!dialog||layout.open;
 document.body.classList.toggle('sim-dialog-open',!!dialog||layout.open);
 const signature=JSON.stringify([s.nearby,s.warehouse,s.shelves,s.carrying,s.customerState,s.path.length===0,s.basket,s.scanned,s.confirmed,s.cashReceived,s.change,s.coins,s.served,s.open,s.closed,Math.ceil(s.remaining),s.message,dialog,paused,tutorial.record,notebookPage,s.business.data,s.feedbackRevision,sound.enabled,layout.open]);
 if(s.feedbackRevision!==lastFeedback){lastFeedback=s.feedbackRevision;const toast=document.querySelector<HTMLElement>('#feedback-toast');clearTimeout(toastTimer);toast?.classList.remove('show');if(s.feedbackRevision>0){if(toast){toast.textContent=s.feedback;void toast.offsetWidth;toast.classList.add('show');toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2800);}sound.play(s.feedback.startsWith('扫描')?'scan':'sale');}}
 if(signature===lastSignature)return;lastSignature=signature;
 const padButton=document.querySelector<HTMLButtonElement>('.interact-pad');
 if(padButton){padButton.disabled=paused||!!dialog||s.closed;padButton.textContent=s.nearby==='notebook'?'员工须知':s.nearby==='freezer'&&s.business.level>=2?'饭团冰柜':fixtures.find(f=>f.id===s.nearby)?.label??'靠近互动';}
 if(s.closed){scene.modal=false;panel.innerHTML=`<div class="eyebrow">CLOSED · 经营结算</div>${growthSummary(s)}${tutorial.active?`<aside class="tutorial-card"><b>${escape(tutorial.text?.title??'')}</b><p>${escape(tutorial.text?.text??'')}</p></aside>`:''}<button class="primary wide" data-do="next-day">${tutorial.active?'完成教程，开始自由经营':'开始下一天'}</button><button data-do="replay">重新学习</button><a href="?mode=classic">经典模式</a>`;return;}
 const near=s.nearby==='notebook'?{label:'员工须知'}:fixtures.find(f=>f.id===s.nearby);
 const customer={outside:s.open?'等待有库存商品':'尚未开店',shopping:'顾客正在购物', 'waiting-stock':'顾客等待补货',queueing:s.path.length?'顾客前往收银台':'顾客等待结账',leaving:'顾客正在离店',gone:'顾客已离店'}[s.customerState];
 panel.innerHTML=`<div class="sim-head"><b>${training?'练习 · ':''}店长 · ${escape(managerName)}</b><span>Lv.${s.business.level} · 第${s.business.data.day}天 · ${s.business.data.balance} 资金 · ${s.business.data.xp} XP${s.business.nextLevel?' / '+s.business.nextLevel.xp:''} · ${s.open?Math.ceil(s.remaining)+'s':'开店准备'} · ${s.coins} 销售</span></div>${saveNotice?`<p class="muted">${saveNotice}</p>`:''}${tutorial.active?`<aside class="tutorial-card" aria-label="新手引导"><b>${escape(tutorial.text?.title??'')}</b><p>${escape(tutorial.text?.text??'')}</p><button data-do="skip-tutorial">跳过教程</button></aside>`:''}<p class="sim-status" data-testid="customer-status">${customer}</p><p class="sim-inventory" data-testid="stock">牛奶 ${s.shelves.milk}/6 · 面包 ${s.shelves.bread}/6 · 手持：${s.carrying?goodsName(s.carrying.goods)+' ×'+s.carrying.quantity:'无'}${s.business.level>=2?' · 饭团 '+s.shelves.rice+'/6':''}</p><p class="hint" role="status">${escape(s.message)}</p><div class="sim-actions">${!s.open?'<button class="primary" data-do="open">开店</button>':''}<button data-do="interact" ${!near||paused?'disabled':''}>${near?'互动：'+near.label:'靠近圆圈互动'} · E</button><button data-do="pause">${paused?'继续':'暂停'}</button>${s.customerState==='gone'?'<button data-do="next-customer">接待下一位</button><button data-do="close-day">打烊结算</button>':''}</div><div class="sim-actions"><button data-do="notebook">员工须知</button><button data-do="replay">重新学习</button>${training?'<a href="./">返回正式经营</a>':''}<button data-do="sound">音效：${sound.enabled?'开':'关'}</button></div>${goalList(s)}<div id="dialog" ${dialog?'role="dialog" aria-modal="true" aria-label="店铺互动"':''}>${dialogContent()}</div><p class="muted">摇杆 / WASD / 方向键移动，E 互动。视角跟随店长。<br>左上仓库 · 中间双货架 · 右下收银台 · 下方入口</p>`;
}
function dialogContent(){
 if(dialog==='notebook'){
  const page=tutorialContent.pages[notebookPage];
  return `<section class="sim-dialog notebook" aria-label="员工须知"><div class="dialog-heading"><h2>员工须知</h2><button data-do="dismiss">返回店铺</button></div><article class="notebook-page" key="${notebookPage}"><small>${escape(page.handwriting)} · ${notebookPage+1} / ${tutorialContent.pages.length}</small><h2>${escape(page.title)}</h2><p>${escape(page.text)}</p><p class="hand-note">※ ${escape(page.note)}</p></article><div class="sim-actions"><button data-do="page-prev" ${notebookPage===0?'disabled':''}>上一页</button><button data-do="page-next" ${notebookPage===tutorialContent.pages.length-1?'disabled':''}>下一页</button></div><p class="muted">${tutorialContent.notice}</p></section>`;
 }

 const pauseNotice=paused?'<p role="status">游戏已暂停 <button data-do="pause">继续操作</button></p>':'';
 if(dialog==='warehouse')return `<section class="sim-dialog" aria-label="仓库取货"><div class="dialog-heading"><h2>仓库 · 每箱 3 件</h2><button data-do="dismiss">返回店铺</button></div>${pauseNotice}<p>可用资金 ${s.business.data.balance} 金币</p>${s.business.unlocked.map(id=>`<div class="warehouse-row"><b>${goodsName(id)} · 仓库 ${s.warehouse[id]} 件</b><p>进价 ${s.business.cost(id)} / 售价 ${products.find(p=>p.id===id)!.price} / 单件毛利 ${products.find(p=>p.id===id)!.price-s.business.cost(id)}</p><div class="sim-actions"><button data-do="take-${id}">取${goodsName(id)}箱</button><button data-do="buy-${id}">采购${goodsName(id)}箱 · ${s.business.cost(id)*3}</button></div></div>`).join('')}<p class="muted">${s.business.level<2?'Lv.2 解锁冰柜饭团货位。':''}每箱三件；采购扣资金，取箱仅转移已有库存。</p><button data-do="return">放回货箱</button></section>`;
 if(dialog==='register')return `<section class="sim-dialog" aria-label="收银操作"><div class="dialog-heading"><h2>收银台 · 现金结账</h2><button data-do="dismiss">暂离收银台</button></div>${pauseNotice}<div class="register-items"><ol>${s.basket.map((id,i)=>`<li>${goodsName(id)} · ${products.find(p=>p.id===id)!.price} 金币 ${i<s.scanned?'✓ 已扫描':'待扫描'}</li>`).join('')}</ol><p>已扫描 ${s.scanned}/${s.basket.length} · 已扫描金额 ${s.basket.slice(0,s.scanned).reduce((n,id)=>n+products.find(p=>p.id===id)!.price,0)} · 合计 ${s.total} 金币</p></div><div class="register-payment"><div class="sim-actions"><button data-do="scan" ${s.confirmed||s.scanned===s.basket.length?'disabled':''}>扫描下一件</button><button data-do="confirm" ${s.scanned!==s.basket.length||s.confirmed?'disabled':''}>确认总价</button><button data-do="cash" ${!s.confirmed||s.cashReceived?'disabled':''}>收现金 ${s.tender}</button></div>${s.cashReceived?`<p>应找零 ${s.changeDue} 金币 · 已放零钱 <b data-testid="change">${s.change}</b></p><div class="sim-actions"><button data-do="change-1">+1</button><button data-do="change-2">+2</button><button data-do="change-5">+5</button><button data-do="clear-change">清空零钱</button></div><button class="primary wide" data-do="finish">交付找零，完成交易</button>`:''}</div><p class="muted">操作界面暂停营业计时。暂离后扫描进度保留。</p></section>`;
 return '';
}
function interact(){
 if(!entered||paused||dialog||layout.open||s.closed)return;
 // Do not reset Phaser's E key while its keydown is being dispatched.
 if(s.nearby==='notebook'){dialog='notebook';notebookPage=0;tutorial.observe(s,'notebook');}
 else if(s.nearby==='warehouse'){dialog='warehouse';scene.modal=true;}
 else if(s.nearby==='milk'||s.nearby==='bread'){if(s.restock(s.nearby))tutorial.observe(s,'restock');}
 else if(s.nearby==='counter'){
  if(s.atRegister){dialog='register';scene.modal=true;}
  else s.message='顾客还没有到达收银台，请先补齐两种商品。';
 } else if(s.nearby==='stairs')s.message='楼上员工宿舍入口已预留，本次切片暂不开放。';
 else if(s.nearby==='freezer'&&s.business.level>=2){s.restock('rice');}
 else if(s.nearby==='freezer')s.message='冰柜区域已预留，本次切片仅开放牛奶与面包货架。';
 else if(!s.nearby)s.message='距离互动目标太远，请走到物体前的标记圆圈。';
 if(dialog)resetJoystick();
 saveProgress();render();
}
scene.onRefresh=render;scene.onInteract=interact;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog&&!layout.open){e.preventDefault();dismissDialog();render();}});
panel.addEventListener('click',e=>{
 const action=(e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.do;if(!action)return;
 resetMovement();
 if(action==='enter'){
  const input=panel.querySelector<HTMLInputElement>('#manager-name')!;managerName=normalizeName(input.value);
  if(!layout.preferences.selected){layout.show('choice');return;}
  if(!managerName){input.setCustomValidity('请先给店长取名。');input.reportValidity();return;}
  saveNotice=storedSession.warning||tutorial.warning||(saveName(managerName)?'':'名字暂时无法保存；当前仍可游玩。');entered=true;document.querySelector('#app')!.classList.add('playing');scene.activePlay=true;setupJoystick();
 }else if(action==='restart'){nextDay();return;}
 else if(action==='pause'){paused=!paused;scene.paused=paused;}
 else if(action==='dismiss')dismissDialog();
 else if(action==='skip-tutorial'){tutorial.skip();s.message='已跳过教程。随时打开员工须知，或选择重新学习。';}
 else if(action==='replay'){const replay=new Tutorial('puppy-mart.tutorial-replay.v1');writeStore(replay.key,{version:1,step:0,status:'active'},replay.writable);const old=loadSession('puppy-mart.training-session.v1');writeStore('puppy-mart.training-session.v1',snapshot(new ShopSimulation()),old.writable);location.href='?training=1';return;}
 else if(action==='notebook'){dialog='notebook';notebookPage=0;tutorial.observe(s,'notebook');}
 else if(action==='sound')sound.toggle();
 else if(action==='page-prev')notebookPage=Math.max(0,notebookPage-1);
 else if(action==='page-next')notebookPage=Math.min(tutorialContent.pages.length-1,notebookPage+1);
 else if(action==='next-day'){tutorial.observe(s,'review');nextDay();return;}
 else if(paused)return;
 else if(action==='open'){if(tutorial.active&&tutorial.step<4)s.message='请先跟随当前教学标记完成移动、阅读、取箱与补货。';else{if(tutorial.active)s.shoppingList=['milk'];else s.shoppingList=s.business.unlocked;s.startDay();}}
 else if(action==='interact'){interact();return;}
 else if(action.startsWith('take-')){const id=action.slice(5) as Goods;if(s.business.unlocked.includes(id)&&s.takeBox(id))tutorial.observe(s,'take');}
 else if(action.startsWith('buy-')){const id=action.slice(4) as Goods;if(s.business.unlocked.includes(id))s.purchaseBox(id);}
 else if(action==='return')s.returnBox();
 else if(action==='scan')s.scan();
 else if(action==='confirm')s.confirmTotal();
 else if(action==='cash')s.receiveCash();
 else if(action.startsWith('change-'))s.addChange(Number(action.slice(7)));
 else if(action==='clear-change')s.clearChange();
 else if(action==='finish'){if(s.finishSale())dismissDialog();}
 else if(action==='next-customer'){if(tutorial.active)s.message='教学期间只接待一位，请先打烊完成教程。';else s.nextCustomer();}
 else if(action==='close-day')s.closeDay();
 saveProgress();render();
});
function setupJoystick(){
 const dock=document.createElement('div');dock.className='movement-dock';
 dock.innerHTML='<div class="joystick" role="group" aria-label="移动摇杆"><span class="stick"></span><span class="joystick-label">移动</span></div><button class="interact-pad" aria-label="就近互动">互动<br><small>E</small></button>';
 document.querySelector('#app')!.append(dock);
 const toast=document.createElement('div');toast.id='feedback-toast';toast.setAttribute('role','log');toast.setAttribute('aria-live','polite');document.body.append(toast);
 const pad=dock.querySelector<HTMLElement>('.joystick')!,stick=pad.querySelector<HTMLElement>('.stick')!;
 let pointer:number|null=null;
 function reset(){const previous=pointer;pointer=null;scene.joystick={x:0,y:0};stick.style.transform='translate(0,0)';if(previous!==null&&pad.hasPointerCapture(previous))pad.releasePointerCapture(previous);}
 resetJoystick=reset;
 function point(event:PointerEvent){
  const r=pad.getBoundingClientRect(),dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2;
  const length=Math.hypot(dx,dy),scale=Math.min(1,32/(length||1));
  scene.joystick={x:length<6?0:dx*scale/32,y:length<6?0:dy*scale/32};stick.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;
 }
 pad.addEventListener('pointerdown',e=>{if(pointer!==null||paused||dialog||layout.open||s.closed)return;pointer=e.pointerId;pad.setPointerCapture(e.pointerId);point(e);e.preventDefault();});
 pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)point(e);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,(e)=>{if((e as PointerEvent).pointerId===pointer){reset();saveProgress();}});
 dock.querySelector('button')!.addEventListener('pointerdown',e=>{e.preventDefault();interact();});
 dock.querySelector('button')!.addEventListener('click',e=>{if(e.detail===0)interact();});
 window.addEventListener('blur',()=>{reset();if(entered){paused=true;scene.paused=true;render();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){reset();paused=true;scene.paused=true;saveProgress();render();}});
}
render();
setInterval(saveProgress,1000);
window.addEventListener('pagehide',saveProgress);

const layoutButton=document.createElement('button');layoutButton.id='layout-settings';layoutButton.textContent='布局设置';layoutButton.addEventListener('click',()=>{resetMovement();layout.show();});document.querySelector('header')!.append(layoutButton);
layout.onChange=()=>{resetMovement();lastSignature='';render();};
layout.mount();
let resizeFrame=0;
const resizeCanvas=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{const bounds=gameElement.getBoundingClientRect();const width=Math.floor(bounds.width),height=Math.floor(bounds.height);if(game.isBooted&&width>0&&height>0&&(game.scale.width!==width||game.scale.height!==height)){game.scale.setParentSize(width,height);scene.cameras?.main?.setSize(width,height);}});};
new ResizeObserver(resizeCanvas).observe(gameElement);window.addEventListener('resize',resizeCanvas);game.events.once('ready',resizeCanvas);
