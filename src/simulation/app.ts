import portraitNeutral from '../art/portraits/test-regular-neutral.svg?url';
import portraitSoft from '../art/portraits/test-regular-soft.svg?url';
import {narrativeContent} from './narrative';
import Phaser from 'phaser';
import { SimulationScene } from './scene';
import { loadName, normalizeName, saveName } from '../characters';
import { products } from '../model';
import { ShopSimulation } from './world';
import { Tutorial, tutorialContent } from './tutorial';
import { loadSession, restoreSession, snapshot, writeStore, SESSION_KEY } from './persistence';
import { growthSummary, goalList } from './growth-ui';
import { Sound } from './sound';
import { type Goods } from './world';
import { LayoutController } from './layout';
import './style.css';
import './layout.css';
import './immersive.css';
import { mountFloatingJoystick } from './floating-joystick';
const layout=new LayoutController();
let reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;try{const stored=localStorage.getItem('puppy-mart.motion.v1');if(stored!==null)reducedMotion=stored==='reduced';}catch{}
document.body.classList.toggle('reduced-motion',reducedMotion);
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
let notebookPage=0;let selectedGoods:Goods='milk';
function saveProgress(){if(entered){if(!writeStore(sessionKey,snapshot(s),storedSession.writable)&&storedSession.writable)saveNotice='当前浏览器无法保存进度，请勿关闭页面。';tutorial.save();}}
function nextDay(){s=s.nextDay()??s;scene.shop=s;s.message='新的一天：'+(s.business.level>=2?'饭团已解锁，去仓库采购并放到冰柜货位。':'补货后接待顾客，完成目标可积累经验。');dialog=null;scene.modal=false;paused=false;scene.paused=false;lastSignature='';saveProgress();render();}

const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:430,height:420,pixelArt:true,backgroundColor:'#efdfc2',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});
const escape=(text:string)=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)).replaceAll(String.fromCharCode(34),'&quot;').replaceAll(String.fromCharCode(39),'&#39;');
let entered=false,managerName=loadName(),dialog:'warehouse'|'notebook'|'stock'|'inventory'|'tasks'|'closing'|'conversation'|null=null,lastSignature='',saveNotice='';
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
 if(s.narrative.data.active)dialog='conversation';
 if(tutorial.observe(s))saveProgress();
 scene.guideTarget=tutorial.target(s);scene.highlightPlayer=tutorial.active&&tutorial.step===0;
 scene.modal=!!dialog||layout.open||s.closed;
 document.body.classList.toggle('sim-dialog-open',!!dialog||layout.open);
 const signature=JSON.stringify([s.nearby,s.warehouse,s.shelves,s.carrying,s.customerState,s.path.length===0,s.futureArrivals,s.insideCount,s.departedCount,s.basket,s.scanned,s.confirmed,s.cashReceived,s.change,s.coins,s.served,s.open,s.closed,Math.ceil(s.remaining),s.message,dialog,paused,tutorial.record,notebookPage,selectedGoods,s.business.data,s.narrative.data,s.feedbackRevision,sound.enabled,layout.open]);
 if(s.feedbackRevision!==lastFeedback){lastFeedback=s.feedbackRevision;const toast=document.querySelector<HTMLElement>('#feedback-toast');clearTimeout(toastTimer);toast?.classList.remove('show');if(s.feedbackRevision>0){if(toast){toast.textContent=s.feedback;void toast.offsetWidth;toast.classList.add('show');toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2800);}sound.play(s.feedback.startsWith('扫描')?'scan':'sale');if(s.feedback.includes('目标完成')||s.feedback.includes('升级'))microCelebrate();}}
 if(signature===lastSignature)return;lastSignature=signature;
 const action=contextAction();
 panel.innerHTML=`<div class="compact-hud"><span>第${s.business.data.day}天</span><b>◈ ${s.business.data.balance}</b><span class="clock">${s.open?Math.floor(s.flow.elapsed/60)+':'+String(Math.floor(s.flow.elapsed%60)).padStart(2,'0'):'准备'}</span><span class="flow-counts" aria-label="每日客流">待到 ${s.futureArrivals} · 店内 ${s.insideCount} · 离店 ${s.departedCount}</span><nav><button data-do="tasks" aria-label="任务">✓</button><button data-do="inventory" aria-label="库存">▦</button><button data-do="notebook" aria-label="员工须知">▤</button><button data-do="settings" id="layout-settings" aria-label="设置">⚙</button></nav></div>${tutorial.active&&!s.closed?`<aside class="guide-chip" aria-label="新手引导"><span>${String(tutorial.step+1).padStart(2,'0')} · ${escape(tutorial.text?.short??tutorial.text?.title??'')}</span><button data-do="skip-tutorial">跳过</button></aside>`:''}${paused?'<div class="pause-chip"><button data-do="pause">继续经营</button></div>':''}${saveNotice?`<p class="save-warning">${escape(saveNotice)}</p>`:''}${action&&!dialog&&!paused&&!layout.open&&!s.closed?`<button class="interact-pad" data-do="interact" aria-label="${action}">${action}<small>E</small></button>`:''}<div id="dialog" ${dialog||s.closed?'role="dialog" aria-modal="true" aria-label="店铺互动"':''}>${s.closed?`<section class="sim-dialog summary-sheet"><div class="dialog-heading"><h2>营业结算</h2><button class="primary" data-do="next-day">${tutorial.active?'完成教程':'开始下一天'}</button></div>${growthSummary(s)}</section>`:dialogContent()}</div>`;
}
function contextAction(){switch(s.nearby){case 'notebook':return '阅读';case 'warehouse':return '拿货';case 'milk':case 'bread':return '补货';case 'freezer':return s.business.level>=2?'补货':null;case 'counter':return s.atRegister?'结账':null;case 'entrance':return !s.open?'开店':s.canClose?'打烊':null;default:return null;}}
function heading(title:string){return `<div class="dialog-heading"><h2>${title}</h2><button data-do="dismiss">返回店铺</button></div>`;}
function dialogContent(){
 if(dialog==='conversation'){
  const node=s.narrative.current;if(!node)return '';
  return `<section class="sim-dialog conversation" aria-label="顾客对话"><div class="dialog-heading"><h2>${escape(node.displayName)}</h2><button data-do="dialogue-skip">跳过对话</button></div><img class="portrait" src="${node.expression==='soft'?portraitSoft:portraitNeutral}" alt="测试熟客像素肖像"><div class="dialogue-body"><small>${escape(narrativeContent.notice)}</small><p>${escape(node.text)}</p><div class="dialogue-choices">${node.choices.length?node.choices.map((choice,index)=>`<button data-do="dialogue-choice-${index}">${escape(choice.label)}</button>`).join(''):'<button class="primary" data-do="dialogue-continue">继续</button>'}</div></div></section>`;
 }

 if(dialog==='notebook'){
  const pages=[...tutorialContent.pages,...tutorialContent.steps.map(step=>({title:step.title,text:step.text,note:'跟随场景标记实际操作，完成后自动继续。',handwriting:'教学占位'}))];const page=pages[notebookPage];
  return `<section class="sim-dialog notebook" aria-label="员工须知"><div class="dialog-heading"><h2>员工须知</h2><button data-do="dismiss">返回店铺</button></div><article class="notebook-page" key="${notebookPage}"><small>${escape(page.handwriting)} · ${notebookPage+1} / ${(tutorialContent.pages.length+tutorialContent.steps.length)}</small><h2>${escape(page.title)}</h2><p>${escape(page.text)}</p><p class="hand-note">※ ${escape(page.note)}</p></article><div class="sim-actions"><button data-do="page-prev" ${notebookPage===0?'disabled':''}>上一页</button><button data-do="page-next" ${notebookPage===(tutorialContent.pages.length+tutorialContent.steps.length)-1?'disabled':''}>下一页</button></div><p class="muted">${tutorialContent.notice}</p></section>`;
 }

 const pauseNotice=paused?'<p role="status">游戏已暂停 <button data-do="pause">继续操作</button></p>':'';
 if(dialog==='stock')return `<section class="sim-dialog">${heading(goodsName(selectedGoods)+'货架')}<p>货架 ${s.shelves[selectedGoods]}/6 · 手持 ${s.carrying?goodsName(s.carrying.goods)+' ×'+s.carrying.quantity:'无'}</p><p>从仓库拿取对应货箱后才能补货。</p><button class="primary wide" data-do="restock">确认补货</button><p role="status">${escape(s.message)}</p></section>`;
 if(dialog==='inventory')return `<section class="sim-dialog">${heading('库存与手持货箱')}<p>手持：${s.carrying?goodsName(s.carrying.goods)+' ×'+s.carrying.quantity:'无'}</p>${s.business.unlocked.map(id=>`<p>${goodsName(id)}：仓库 ${s.warehouse[id]} · 货架 ${s.shelves[id]}/6</p>`).join('')}<p>拿货请前往仓库，补货请靠近对应货架。</p></section>`;
 if(dialog==='tasks')return `<section class="sim-dialog">${heading('今日目标')}<p>店铺 Lv.${s.business.level} · ${s.business.data.xp} XP${s.business.nextLevel?' / '+s.business.nextLevel.xp:''}</p>${goalList(s).replace('<details','<details open')}<p>客流：${s.served} 单 · ${escape(s.message)}</p><p>开店与打烊请走到入口。</p></section>`;
 if(dialog==='closing')return `<section class="sim-dialog">${heading('结束今天的营业？')}<p>已完成 ${s.served} 单，销售额 ${s.coins}。打烊后查看成本、利润与明日目标。</p><button class="primary wide" data-do="close-day">打烊结算</button></section>`;
 if(dialog==='warehouse')return `<section class="sim-dialog" aria-label="仓库取货">${heading('仓库 · 每箱 3 件')}${pauseNotice}<div class="sim-actions">${s.business.unlocked.map(id=>`<button data-do="select-${id}" aria-pressed="${id===selectedGoods}">${goodsName(id)}</button>`).join('')}</div><p>${goodsName(selectedGoods)} · 仓库 ${s.warehouse[selectedGoods]} 件 · 资金 ${s.business.data.balance}</p><p>进价 ${s.business.cost(selectedGoods)} / 售价 ${products.find(p=>p.id===selectedGoods)!.price}</p><div class="sim-actions"><button data-do="take-${selectedGoods}">取${goodsName(selectedGoods)}箱</button><button data-do="buy-${selectedGoods}">采购一箱 · ${s.business.cost(selectedGoods)*3}</button><button data-do="return">放回货箱</button></div><p role="status">${escape(s.message)}</p></section>`;
 return '';
}
function interact(){
 if(!entered||paused||dialog||layout.open||s.closed)return;
 // Do not reset Phaser's E key while its keydown is being dispatched.
 if(s.nearby==='notebook'){dialog='notebook';notebookPage=0;tutorial.observe(s,'notebook');}
 else if(s.nearby==='warehouse'){dialog='warehouse';scene.modal=true;}
 else if(s.nearby==='milk'||s.nearby==='bread'){selectedGoods=s.nearby;dialog='stock';}
 else if(s.nearby==='counter'){
  if(s.atRegister&&!tutorial.active&&s.front&&s.narrative.begin(s.front.customerId,s.front.id,s.business.data.day)){dialog='conversation';}else if(s.checkout())tutorial.observe(s);else s.message='请到店员侧等待队首顾客到位。';
 } else if(s.nearby==='stairs')s.message='楼上员工宿舍入口已预留，本次切片暂不开放。';
 else if(s.nearby==='freezer'&&s.business.level>=2){selectedGoods='rice';dialog='stock';}
 else if(s.nearby==='entrance'){if(!s.open){if(tutorial.active&&tutorial.step<4)s.message='先按教学标记完成补货。';else{ s.tutorialDay=tutorial.active;s.shoppingList=tutorial.active?['milk']:s.business.unlocked;s.startDay();}}else if(s.canClose)dialog='closing';}
 else if(s.nearby==='freezer')s.message='冰柜区域已预留，本次切片仅开放牛奶与面包货架。';
 else if(!s.nearby)s.message='距离互动目标太远，请走到物体前的标记圆圈。';
 if(dialog)resetJoystick();
 saveProgress();render();
}
scene.onRefresh=render;scene.onInteract=interact;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog&&!layout.open){e.preventDefault();if(dialog==='conversation')s.narrative.skip();dismissDialog();saveProgress();render();}});
panel.addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('[data-do="interact"]')){e.preventDefault();interact();}});
panel.addEventListener('click',e=>{
 const action=(e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.do;if(!action)return;if(action==='interact'&&e.detail>0)return;
 resetMovement();
 if(action==='enter'){
  const input=panel.querySelector<HTMLInputElement>('#manager-name')!;managerName=normalizeName(input.value);
  if(!layout.preferences.selected){layout.show('choice');return;}
  if(!managerName){input.setCustomValidity('请先给店长取名。');input.reportValidity();return;}
  saveNotice=storedSession.warning||tutorial.warning||(saveName(managerName)?'':'名字暂时无法保存；当前仍可游玩。');entered=true;document.querySelector('#app')!.classList.add('playing');document.body.classList.add('immersive');scene.activePlay=true;setupJoystick();
 }else if(action==='restart'){nextDay();return;}
 else if(action==='pause'){paused=!paused;scene.paused=paused;}
 else if(action==='dialogue-skip'){s.narrative.skip();dismissDialog();}
 else if(action==='dialogue-continue'){s.narrative.continue();if(!s.narrative.data.active)dismissDialog();}
 else if(action.startsWith('dialogue-choice-'))s.narrative.choose(Number(action.slice(16)));
 else if(action==='dismiss')dismissDialog();
 else if(action==='skip-tutorial'){tutorial.skip();s.message='已跳过教程。随时打开员工须知，或选择重新学习。';}
 else if(action==='replay'){const replay=new Tutorial('puppy-mart.tutorial-replay.v1');writeStore(replay.key,{version:1,step:0,status:'active'},replay.writable);const old=loadSession('puppy-mart.training-session.v1');writeStore('puppy-mart.training-session.v1',snapshot(new ShopSimulation()),old.writable);location.href='?training=1';return;}
 else if(action==='settings'){layout.show();}
 else if(action==='tasks'||action==='inventory'){dialog=action;}
 else if(action.startsWith('select-'))selectedGoods=action.slice(7) as Goods;
 else if(action==='restock'){if(s.restock(selectedGoods)){tutorial.observe(s,'restock');dismissDialog();}}
 else if(action==='notebook'){dialog='notebook';notebookPage=0;tutorial.observe(s,'notebook');}
 else if(action==='sound')sound.toggle();
 else if(action==='page-prev')notebookPage=Math.max(0,notebookPage-1);
 else if(action==='page-next')notebookPage=Math.min((tutorialContent.pages.length+tutorialContent.steps.length)-1,notebookPage+1);
 else if(action==='next-day'){if(tutorial.observe(s,'review'))celebrate();nextDay();return;}
 else if(paused)return;
 else if(action==='open'){if(tutorial.active&&tutorial.step<4)s.message='请先跟随当前教学标记完成移动、阅读、取箱与补货。';else{if(tutorial.active)s.shoppingList=['milk'];else s.shoppingList=s.business.unlocked;s.startDay();}}
 else if(action==='interact'){interact();return;}
 else if(action.startsWith('take-')){const id=action.slice(5) as Goods;if(s.business.unlocked.includes(id)&&s.takeBox(id)){tutorial.observe(s,'take');dismissDialog();}}
 else if(action.startsWith('buy-')){const id=action.slice(4) as Goods;if(s.business.unlocked.includes(id))s.purchaseBox(id);}
 else if(action==='return')s.returnBox();
 else if(action==='close-day'){if(s.nearby==='entrance'&&s.canClose){s.closeDay();dismissDialog();}}
 saveProgress();render();
});
function microCelebrate(){if(reducedMotion)return;const burst=document.createElement('div');burst.className='micro-confetti';burst.innerHTML=Array.from({length:6},(_,i)=>`<i style="--dx:${Math.cos(i*Math.PI/3)*48}px;--dy:${Math.sin(i*Math.PI/3)*30}px"></i>`).join('');document.body.append(burst);setTimeout(()=>burst.remove(),700);}
function celebrate(){const confetti=document.createElement('div');confetti.className='pixel-confetti';confetti.setAttribute('role','status');confetti.innerHTML='<b>教程完成</b>'+ Array.from({length:navigator.hardwareConcurrency<=4?12:24},(_,i)=>`<i style="--i:${i};--dx:${Math.cos(i*Math.PI/12)*(90+(i%4)*25)}px;--dy:${Math.sin(i*Math.PI/12)*(90+(i%4)*25)}px;background:${['#ae744e','#648e7b','#e0bc71'][i%3]}"></i>`).join('');document.body.append(confetti);setTimeout(()=>confetti.remove(),1500);}
function setupJoystick(){
 const visual=document.createElement('div');visual.className='joystick';visual.hidden=true;visual.setAttribute('aria-label','浮动移动摇杆');visual.innerHTML='<span class="stick"></span>';gameElement.append(visual);
 const toast=document.createElement('div');toast.id='feedback-toast';toast.setAttribute('role','log');toast.setAttribute('aria-live','polite');document.body.append(toast);
 resetJoystick=mountFloatingJoystick({surface:gameElement,visual,allowed:()=>entered&&!paused&&!dialog&&!layout.open&&!s.closed,size:()=>layout.preferences.joystickSize,sensitivity:()=>layout.preferences.sensitivity,onMove:(x,y)=>scene.joystick={x,y},onRelease:saveProgress});
 window.addEventListener('blur',()=>{resetMovement();if(entered){paused=true;scene.paused=true;render();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){resetMovement();paused=true;scene.paused=true;saveProgress();render();}});
}

render();
setInterval(saveProgress,1000);
window.addEventListener('pagehide',saveProgress);

layout.gameControls=()=>`<div class="sim-actions"><button data-game-action="pause">${paused?'继续经营':'暂停经营'}</button><button data-game-action="sound">音效：${sound.enabled?'开':'关'}</button><button data-game-action="motion">减少动态：${reducedMotion?'开':'关'}</button><button data-game-action="replay">重新学习</button></div>`;
layout.onGameAction=action=>{if(action==='pause'){paused=!paused;scene.paused=paused;}else if(action==='sound')sound.toggle();else if(action==='motion'){reducedMotion=!reducedMotion;document.body.classList.toggle('reduced-motion',reducedMotion);try{localStorage.setItem('puppy-mart.motion.v1',reducedMotion?'reduced':'full');}catch{}}else if(action==='replay'){panel.querySelector<HTMLButtonElement>('[data-do="replay"]')?.click();const replay=new Tutorial('puppy-mart.tutorial-replay.v1');writeStore(replay.key,{version:1,step:0,status:'active'},replay.writable);const old=loadSession('puppy-mart.training-session.v1');writeStore('puppy-mart.training-session.v1',snapshot(new ShopSimulation()),old.writable);location.href='?training=1';}saveProgress();render();};
layout.onChange=()=>{resetMovement();lastSignature='';render();};
layout.mount();
let resizeFrame=0;
const resizeCanvas=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{const bounds=gameElement.getBoundingClientRect();const width=Math.floor(bounds.width),height=Math.floor(bounds.height);if(game.isBooted&&width>0&&height>0){resetMovement();game.scale.setParentSize(width,height);scene.cameras?.main?.setSize(width,height);scene.cameras?.main?.setZoom(Math.max(1,width/512,height/640));scene.cameras?.main?.centerOn(s.player.x,s.player.y);}});};
new ResizeObserver(resizeCanvas).observe(gameElement);window.addEventListener('resize',resizeCanvas);game.events.once('ready',resizeCanvas);
