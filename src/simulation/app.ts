import {adConfig,adEnvironment,type RewardId} from '../ads/config';
import {RewardedAdService,type RewardAccount} from '../ads/service';
import {UnconfiguredTapTapProvider} from '../ads/provider';
import {renderAdPanel,adResultText,adInventory} from '../ads/ui';
import {renderTodoBook,todoPageCount,type TodoTab} from './todo-ui';
import './todo.css';
import hamsterPortrait from '../art/portraits/customer001.svg?url';
import {installNpcDrafts} from './npc-dialogues';
import {CUSTOMER_001} from './npc001';
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
const developmentAdHarness=import.meta.env.DEV&&new URLSearchParams(location.search).get('ads-test')==='1';
const advertisementEnvironment=developmentAdHarness?'taptap-test':adEnvironment(import.meta.env.VITE_AD_ENVIRONMENT);
const adSandbox=advertisementEnvironment==='taptap-test';
const isolatedProfile=()=>npcPreview||adSandbox;
const npcPreview=new URLSearchParams(location.search).get('npc-preview')==='001';
let npcDraftWarning='';const npcDraftsReady=npcPreview?import('../data/npcs/customer-001.dialogues.json').then(m=>installNpcDrafts(m.default)).catch(()=>{npcDraftWarning='草稿未加载；仍可验证取货、货位调整与营业。';}):Promise.resolve();
const training=new URLSearchParams(location.search).get('training')==='1';
const sessionKey=npcPreview?'puppy-mart.npc001-preview.v1':training?'puppy-mart.training-session.v1':adSandbox?'puppy-mart.ad-test-session.v1':SESSION_KEY;
const storedSession=loadSession(sessionKey);
let s=restoreSession(storedSession.value);s.narrative.allowDrafts=npcPreview;scene.shop=s;
let hasSession=false;try{hasSession=localStorage.getItem(sessionKey)!==null&&storedSession.writable;}catch{}
if(npcPreview){s.npcPreview=true;if(!hasSession){s.business.data.day=2;s.shelves={milk:6,bread:6,rice:0};}}
const tutorial=new Tutorial(npcPreview?'puppy-mart.npc001-tutorial-preview.v1':training?'puppy-mart.tutorial-replay.v1':adSandbox?'puppy-mart.ad-test-tutorial.v1':undefined,hasSession);
if(npcPreview)tutorial.skip();
let todoTab:TodoTab='open',todoPage=0;
let notebookPage=0;let selectedGoods:Goods='milk';
function saveProgress(){if(entered){if(!writeStore(sessionKey,snapshot(s),storedSession.writable)&&storedSession.writable)saveNotice='当前浏览器无法保存进度，请勿关闭页面。';tutorial.save();}}
let adMessage='';
function commitRewardAccount(expected:RewardAccount,next:RewardAccount){
  if(!entered||!storedSession.writable||expected.day!==s.business.data.day||expected.balance!==s.business.data.balance||JSON.stringify(expected.ledger)!==JSON.stringify(s.adRewards))return false;
  try{const raw=localStorage.getItem(sessionKey);if(raw){const saved=JSON.parse(raw);if((saved.adRewards?.revision??0)!==expected.ledger.revision||saved.business?.balance!==expected.balance||saved.business?.day!==expected.day)return false;}}
  catch{return false;}
  const candidate=structuredClone(snapshot(s));candidate.adRewards=structuredClone(next.ledger);candidate.business.balance=next.balance;
  if(!writeStore(sessionKey,candidate,storedSession.writable))return false;
  s.adRewards=structuredClone(next.ledger);s.business.data.balance=next.balance;return true;
 }
let rewardedAds=new RewardedAdService(adConfig,advertisementEnvironment,new UnconfiguredTapTapProvider(advertisementEnvironment),{
 read:()=>({ledger:s.adRewards,balance:s.business.data.balance,day:s.business.data.day}),
 commit:commitRewardAccount
});
const adHarnessReady=developmentAdHarness?import('../ads/development-provider').then(({DevelopmentRewardedProvider})=>{const testConfig=structuredClone(adConfig);testConfig.enabled=true;testConfig.environments['taptap-test'].enabled=true;rewardedAds=new RewardedAdService(testConfig,'taptap-test',new DevelopmentRewardedProvider(),{read:()=>({ledger:s.adRewards,balance:s.business.data.balance,day:s.business.data.day}),commit:(expected,next)=>commitRewardAccount(expected,next)},Math.random,undefined,()=>{if(entered)render();});}):Promise.resolve();
function atomicCouponPurchase(goods:Goods){const previous=structuredClone(snapshot(s));if(!s.purchaseWithCoupon(goods))return false;if(writeStore(sessionKey,snapshot(s),storedSession.writable))return true;s=restoreSession(previous);s.narrative.allowDrafts=npcPreview;s.npcPreview=npcPreview;scene.shop=s;saveNotice='当前进度暂时无法保存，优惠券未使用。';return false;}
function nextDay(){s=s.nextDay()??s;scene.shop=s;s.message='新的一天：'+(s.business.level>=2?'饭团已解锁，去仓库采购并放到冰柜货位。':'补货后接待顾客，完成目标可积累经验。');dialog=null;scene.modal=false;paused=false;scene.paused=false;lastSignature='';saveProgress();render();}

const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:430,height:420,pixelArt:true,backgroundColor:'#efdfc2',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});
const escape=(text:string)=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)).replaceAll(String.fromCharCode(34),'&quot;').replaceAll(String.fromCharCode(39),'&#39;');
let entered=false,managerName=isolatedProfile()&&typeof s.preservedSessionFields.previewManagerName==='string'?normalizeName(s.preservedSessionFields.previewManagerName):loadName(),dialog:'warehouse'|'notebook'|'stock'|'inventory'|'tasks'|'closing'|'conversation'|'environment-event'|'todo-book'|'ad-rewards'|null=null,lastSignature='',saveNotice='';
let paused=false;let entering=false;
let dialogueTimer=0,dialogueKey='',dialogueLetters=0,dialogueRevealed=false;
let resetJoystick: () => void = () => {};
function resetMovement(){scene.resetInput();resetJoystick();}
function dismissDialog(){dialog=null;scene.modal=false;resetMovement();}
const goodsName=(id:string)=>products.find(p=>p.id===id)!.name;
function render(){
 if(!entered){
  if(panel.querySelector('#enter-shop'))return;
  panel.innerHTML=`<div class="eyebrow">PUPPY MART · ${npcPreview?'仓鼠独立预览':'P1'}</div><h1>今天，走进小店</h1><label class="name-label" for="manager-name">给吉娃娃店长取个名字</label><input id="manager-name" maxlength="32" value="${escape(managerName)}" placeholder="你想怎样称呼店长？"><p class="muted">沿用本机名字；不修改已有经营存档。</p><button id="enter-shop" class="primary wide" data-do="enter">进入便利店 →</button><p>首次进入会逐步引导实际移动、补货和收银；可随时跳过或重新学习。</p><a href="?mode=classic">回到经典 P0 模式</a>`;return;
 }
 if(s.narrative.data.active&&!s.narrative.current)s.narrative.skip();
 if(dialog==='conversation'&&!s.narrative.data.active)dismissDialog();
 if(s.narrative.data.active)dialog='conversation';
 if(tutorial.observe(s))saveProgress();
 scene.guideTarget=tutorial.target(s);scene.highlightPlayer=tutorial.active&&tutorial.step===0;
 scene.modal=!!dialog||layout.open||s.closed;
 document.body.classList.toggle('sim-dialog-open',!!dialog||layout.open);
 const signature=JSON.stringify([s.nearby,s.canTalkHamster,s.warehouse,s.shelves,s.carrying,s.customerState,s.path.length===0,s.futureArrivals,s.insideCount,s.departedCount,s.basket,s.scanned,s.confirmed,s.cashReceived,s.change,s.coins,s.served,s.open,s.closed,Math.ceil(s.remaining),s.message,dialog,paused,tutorial.record,notebookPage,selectedGoods,s.business.data,s.narrative.data,s.adRewards,rewardedAds.busy,rewardedAds.state,adMessage,s.improvements,todoTab,todoPage,s.feedbackRevision,sound.enabled,layout.open]);
 if(s.feedbackRevision!==lastFeedback){lastFeedback=s.feedbackRevision;const toast=document.querySelector<HTMLElement>('#feedback-toast');clearTimeout(toastTimer);toast?.classList.remove('show');if(s.feedbackRevision>0){if(toast){toast.textContent=s.feedback;void toast.offsetWidth;toast.classList.add('show');toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2800);}sound.play(s.feedback.startsWith('扫描')?'scan':'sale');if(s.feedback.includes('目标完成')||s.feedback.includes('升级'))microCelebrate();}}
 if(signature===lastSignature)return;lastSignature=signature;
 const action=contextAction();
 panel.innerHTML=`<div class="compact-hud"><span>第${s.business.data.day}天</span><b>◈ ${s.business.data.balance}</b><span class="clock">${s.open?Math.floor(s.flow.elapsed/60)+':'+String(Math.floor(s.flow.elapsed%60)).padStart(2,'0'):'准备'}</span><div class="business-strip"><span class="flow-counts" aria-label="每日客流">待到 ${s.futureArrivals} · 店内 ${s.insideCount} · 离店 ${s.departedCount}</span>${!s.closed?`<button class="business-toggle" data-do="business" ${paused||!!dialog||layout.open||(!s.open&&tutorial.active&&tutorial.step<4)||(s.open&&!s.canClose)?'disabled':''} title="${s.open&&!s.canClose?'等待计划顾客全部到店并离开':!s.open&&tutorial.active&&tutorial.step<4?'先完成教学补货':s.open?'查看打烊结算':'开始自动营业'}">${s.open?'打烊':'开店'}</button>`:''}</div><nav><button data-do="tasks" aria-label="任务">✓</button><button data-do="inventory" aria-label="库存">▦</button><button data-do="notebook" aria-label="员工须知">▤</button><button data-do="settings" id="layout-settings" aria-label="设置">⚙</button></nav></div>${tutorial.active&&!s.closed?`<aside class="guide-chip" aria-label="新手引导"><span>${String(tutorial.step+1).padStart(2,'0')} · ${escape(tutorial.text?.short??tutorial.text?.title??'')}</span><button data-do="skip-tutorial">跳过</button></aside>`:''}${paused?'<div class="pause-chip"><button data-do="pause">继续经营</button></div>':''}${saveNotice?`<p class="save-warning">${escape(saveNotice)}</p>`:''}${action&&!dialog&&!paused&&!layout.open&&!s.closed?`<button class="interact-pad ${action.length>2?'long-label':''}" data-do="interact" aria-label="${action}">${action}<small>E</small></button>`:''}${s.canTalkHamster&&!dialog&&!paused&&!layout.open&&!s.closed?'<button class="npc-chat-pad" data-do="npc-talk">交谈</button>':''}<div id="dialog" ${dialog||s.closed?'role="dialog" aria-modal="true" aria-label="店铺互动"':''}>${s.closed?`<section class="sim-dialog summary-sheet"><div class="dialog-heading"><h2>营业结算</h2><button class="primary" data-do="next-day">${tutorial.active?'完成教程':'开始下一天'}</button></div>${growthSummary(s)}</section>`:dialogContent()}</div>`;
 updateDialogueText();
}
function contextAction(){if(s.nearby?.startsWith('event:'))return s.nearbyEnvironmentEvent?.definition.interactionLabel??null;switch(s.nearby){case 'todo-book':return '查看待办';case 'notebook':return '阅读';case 'warehouse':return '拿货';case 'milk':return '补货';case 'bread':return s.canAdjustHamsterShelf&&s.carrying?.goods!=='bread'?'调整摆放位置':'补货';case 'freezer':return s.business.level>=2?'补货':null;case 'counter':return s.atRegister?'结账':null;case 'entrance':return null;default:return null;}}
function heading(title:string){return `<div class="dialog-heading"><h2>${title}</h2><button data-do="dismiss">返回店铺</button></div>`;}
function dialogContent(){
 if(dialog==='ad-rewards')return renderAdPanel(rewardedAds,s.adRewards,advertisementEnvironment,adMessage);
 if(dialog==='todo-book')return renderTodoBook(s,todoTab,todoPage);
 if(dialog==='environment-event'){const event=s.nearbyEnvironmentEvent;if(!event)return `<section class="sim-dialog">${heading('场景互动')}<p>这个事件目前无法互动。</p></section>`;return `<section class="sim-dialog">${heading(event.definition.interactionLabel)}<p>可以现在帮忙，也可以稍后再来。</p><button class="primary wide" data-do="environment-interact">${escape(event.definition.interactionLabel)}</button><button data-do="dismiss">稍后再来</button>${event.definition.dialogueTrigger&&s.canHearEnvironmentDialogue?'<button data-do="shelf-dialogue">听它说（草稿试读）</button>':''}</section>`;}

 if(dialog==='conversation'){
  const node=s.narrative.current;if(!node)return '';
  return `<section class="sim-dialog conversation" aria-label="顾客对话"><div class="dialog-heading"><h2>${escape(node.displayName)}</h2><button data-do="dialogue-skip">跳过对话</button></div><img class="portrait" src="${node.portraitId==='customer001'?hamsterPortrait:node.expression==='soft'?portraitSoft:portraitNeutral}" alt="${node.portraitId==='customer001'?'小仓鼠像素肖像':'测试熟客像素肖像'}"><div class="dialogue-body"><small>${escape(node.portraitId==='customer001'?(node.npcStatus==='draft'?'草稿试读 · 待作者审核':''):narrativeContent.notice)}</small><button class="dialogue-line" data-do="dialogue-advance" aria-label="${escape(node.text)}"></button><div class="dialogue-choices">${node.choices.length?node.choices.map((choice,index)=>`<button data-do="dialogue-choice-${index}">${escape(choice.label)}</button>`).join(''):'<button class="primary" data-do="dialogue-continue">显示全文</button>'}</div></div></section>`;
 }

 if(dialog==='notebook'){
  const pages=[...tutorialContent.pages,...tutorialContent.steps.map(step=>({title:step.title,text:step.text,note:'跟随场景标记实际操作，完成后自动继续。',handwriting:'教学占位'}))];const page=pages[notebookPage];
  return `<section class="sim-dialog notebook" aria-label="员工须知"><div class="dialog-heading"><h2>员工须知</h2><button data-do="dismiss">返回店铺</button></div><article class="notebook-page" key="${notebookPage}"><small>${escape(page.handwriting)} · ${notebookPage+1} / ${(tutorialContent.pages.length+tutorialContent.steps.length)}</small><h2>${escape(page.title)}</h2><p>${escape(page.text)}</p><p class="hand-note">※ ${escape(page.note)}</p></article><div class="sim-actions"><button data-do="page-prev" ${notebookPage===0?'disabled':''}>上一页</button><button data-do="page-next" ${notebookPage===(tutorialContent.pages.length+tutorialContent.steps.length)-1?'disabled':''}>下一页</button></div><p class="muted">${tutorialContent.notice}</p></section>`;
 }

 const pauseNotice=paused?'<p role="status">游戏已暂停 <button data-do="pause">继续操作</button></p>':'';
 if(dialog==='stock')return `<section class="sim-dialog">${heading(goodsName(selectedGoods)+'货架')}<p>货架 ${s.shelves[selectedGoods]}/6 · 手持 ${s.carrying?goodsName(s.carrying.goods)+' ×'+s.carrying.quantity:'无'}</p><p>从仓库拿取对应货箱后才能补货。</p><button class="primary wide" data-do="restock">确认补货</button>${selectedGoods==='bread'&&!s.canAdjustHamsterShelf&&!s.improvements.facilities['lowered-bread-slot']?`<button data-do="observe-bread" ${s.shelves.bread<=0?'disabled title="货架有货后再观察"':''}>观察货位</button>`:''}${selectedGoods==='bread'&&s.canAdjustHamsterShelf?'<button data-do="adjust-shelf">调整摆放位置</button>':''}<p role="status">${escape(s.message)}</p></section>`;
 if(dialog==='inventory')return `<section class="sim-dialog">${heading('库存与手持货箱')}<p>${adInventory(s.adRewards)}</p><button data-do="ad-rewards">可选视频奖励</button><p>手持：${s.carrying?goodsName(s.carrying.goods)+' ×'+s.carrying.quantity:'无'}</p>${s.business.unlocked.map(id=>`<p>${goodsName(id)}：仓库 ${s.warehouse[id]} · 货架 ${s.shelves[id]}/6</p>`).join('')}<p>拿货请前往仓库，补货请靠近对应货架。</p></section>`;
 if(dialog==='tasks')return `<section class="sim-dialog">${heading('今日目标')}<button data-do="todo-book">小狗的待办事项</button><p>店铺 Lv.${s.business.level} · ${s.business.data.xp} XP${s.business.nextLevel?' / '+s.business.nextLevel.xp:''}</p>${goalList(s).replace('<details','<details open')}<p>客流：${s.served} 单 · ${escape(s.message)}</p><p>使用顶部独立按钮开店或打烊；打烊需等待计划客流全部离店。</p></section>`;
 if(dialog==='closing')return `<section class="sim-dialog">${heading('结束今天的营业？')}<p>已完成 ${s.served} 单，销售额 ${s.coins}。打烊后查看成本、利润与明日目标。</p><button class="primary wide" data-do="close-day">打烊结算</button></section>`;
 if(dialog==='warehouse')return `<section class="sim-dialog" aria-label="仓库取货">${heading('仓库 · 每箱 3 件')}${pauseNotice}<div class="sim-actions">${s.business.unlocked.map(id=>`<button data-do="select-${id}" aria-pressed="${id===selectedGoods}">${goodsName(id)}</button>`).join('')}</div><p>${goodsName(selectedGoods)} · 仓库 ${s.warehouse[selectedGoods]} 件 · 资金 ${s.business.data.balance}</p><p>进价 ${s.business.cost(selectedGoods)} / 售价 ${products.find(p=>p.id===selectedGoods)!.price}</p><div class="sim-actions"><button data-do="take-${selectedGoods}">取${goodsName(selectedGoods)}箱</button><button data-do="buy-${selectedGoods}">采购一箱 · ${s.couponOffer(selectedGoods)?s.couponOffer(selectedGoods)!.net+'（用券）':s.business.cost(selectedGoods)*3}</button>${s.couponOffer(selectedGoods)?`<button data-do="buy-full-price-${selectedGoods}" ${s.business.data.balance<s.business.cost(selectedGoods)*3?'disabled':''}>保留优惠券 · 原价 ${s.business.cost(selectedGoods)*3}</button>`:''}<button data-do="return">放回货箱</button></div><p role="status">${escape(s.message)}</p></section>`;
 return '';
}
function interact(){
 if(!entered||paused||dialog||layout.open||s.closed||rewardedAds.busy)return;
 // Do not reset Phaser's E key while its keydown is being dispatched.
 if(s.nearby?.startsWith('event:')){dialog='environment-event';}
 else if(s.nearby==='todo-book'){s.syncImprovements();dialog='todo-book';todoTab='open';todoPage=0;}
 else if(s.nearby==='notebook'){dialog='notebook';notebookPage=0;tutorial.observe(s,'notebook');}
 else if(s.nearby==='warehouse'){dialog='warehouse';scene.modal=true;}
 else if(s.nearby==='milk'||s.nearby==='bread'){selectedGoods=s.nearby;if(s.nearby==='bread'&&s.canAdjustHamsterShelf&&s.carrying?.goods!=='bread')s.adjustHamsterShelf();else dialog='stock';}
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog&&!layout.open&&!rewardedAds.busy){e.preventDefault();if(dialog==='conversation')s.narrative.skip();dismissDialog();saveProgress();render();}});
panel.addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('[data-do="interact"]')){e.preventDefault();interact();}});
panel.addEventListener('click',async e=>{
 const action=(e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.do;if(!action||rewardedAds.busy)return;if(action==='interact'&&e.detail>0)return;
 resetMovement();
 if(action==='enter'){
  if(entered||entering)return;entering=true;await Promise.all([npcDraftsReady,adHarnessReady]);entering=false;
  const input=panel.querySelector<HTMLInputElement>('#manager-name')!;managerName=normalizeName(input.value);
  if(!layout.preferences.selected){layout.show('choice');return;}
  if(!managerName){input.setCustomValidity('请先给店长取名。');input.reportValidity();return;}
  saveNotice=npcDraftWarning||storedSession.warning||tutorial.warning||((isolatedProfile()||saveName(managerName))?'':'名字暂时无法保存；当前仍可游玩。');if(isolatedProfile())s.preservedSessionFields.previewManagerName=managerName;entered=true;document.querySelector('#app')!.classList.add('playing');document.body.classList.add('immersive');scene.activePlay=true;setupJoystick();saveProgress();rewardedAds.recover();
 }else if(action==='restart'){nextDay();return;}
 else if(action==='pause'){paused=!paused;scene.paused=paused;}
 else if(action==='dialogue-skip'){s.narrative.skip();dismissDialog();}
 else if(action==='dialogue-continue'||action==='dialogue-advance'){if(!dialogueRevealed){dialogueRevealed=true;updateDialogueText();}else{s.narrative.continue();if(!s.narrative.data.active)dismissDialog();}}
 else if(action.startsWith('dialogue-choice-'))s.narrative.choose(Number(action.slice(16)));
 else if(action==='dismiss')dismissDialog();
 else if(action==='skip-tutorial'){tutorial.skip();s.message='已跳过教程。随时打开员工须知，或选择重新学习。';}
 else if(action==='replay'){const replay=new Tutorial('puppy-mart.tutorial-replay.v1');writeStore(replay.key,{version:1,step:0,status:'active'},replay.writable);const old=loadSession('puppy-mart.training-session.v1');writeStore('puppy-mart.training-session.v1',snapshot(new ShopSimulation()),old.writable);location.href='?training=1';return;}
 else if(action==='settings'){layout.show();}
 else if(action==='ad-rewards'){adMessage='';dialog='ad-rewards';}
 else if(action.startsWith('watch-ad-')){const id=action.slice(9) as RewardId;if(adConfig.rewards.some(r=>r.id===id)){saveProgress();const previouslyPaused=paused;const pending=rewardedAds.watch(id);render();try{adMessage=adResultText[await pending];}finally{if(!document.hidden){paused=previouslyPaused;scene.paused=paused;}resetMovement();}}}
 else if(action.startsWith('buy-full-price-')){const id=action.slice(15) as Goods;if(s.business.unlocked.includes(id))s.purchaseBox(id);}
 else if(action==='todo-book'){s.syncImprovements();dialog='todo-book';todoTab='open';todoPage=0;}
 else if(action.startsWith('todo-tab-')){const tab=action.slice(9);if(['open','completed','future'].includes(tab)){todoTab=tab as TodoTab;todoPage=0;}}
 else if(action==='todo-prev')todoPage=Math.max(0,todoPage-1);
 else if(action==='todo-next')todoPage=Math.min(todoPageCount(s,todoTab)-1,todoPage+1);
 else if(action==='todo-lower-shelf'){if(s.adjustHamsterShelf()){todoTab='completed';todoPage=0;}}
 else if(action==='observe-bread'){if(s.observeBreadHeight()){dialog='todo-book';todoTab='open';todoPage=0;}}
 else if(action==='tasks'||action==='inventory'){dialog=action;}
 else if(action.startsWith('select-'))selectedGoods=action.slice(7) as Goods;
 else if(action==='npc-talk'){const v=s.hamster;if(v&&Math.hypot(s.player.x-v.position.x,s.player.y-v.position.y)<=56&&s.narrative.beginNpcDialogue(CUSTOMER_001,v.id,s.business.data.day,'chat'))dialog='conversation';}
 else if(action==='shelf-dialogue'){const event=s.nearbyEnvironmentEvent?.definition;const v=s.flow.visitors.find(v=>v.customerId===event?.npcId&&v.state!=='gone'&&v.state!=='leaving');if(event?.dialogueTrigger&&v&&s.narrative.beginNpcDialogue(event.npcId,v.id,s.business.data.day,event.dialogueTrigger))dialog='conversation';}
 else if(action==='environment-interact'){const event=s.nearbyEnvironmentEvent;const v=s.flow.visitors.find(v=>v.customerId===event?.definition.npcId&&v.state!=='gone'&&v.state!=='leaving');const helped=event&&s.interactEnvironmentEvent(event.definition.eventId);dismissDialog();if(helped&&v&&event.definition.dialogueTrigger&&s.narrative.beginNpcDialogue(v.customerId,v.id,s.business.data.day,event.definition.dialogueTrigger))dialog='conversation';}
 else if(action==='adjust-shelf'){if(s.adjustHamsterShelf())dismissDialog();}
 else if(action==='restock'){if(s.restock(selectedGoods)){tutorial.observe(s,'restock');dismissDialog();}}
 else if(action==='notebook'){dialog='notebook';notebookPage=0;tutorial.observe(s,'notebook');}
 else if(action==='sound')sound.toggle();
 else if(action==='page-prev')notebookPage=Math.max(0,notebookPage-1);
 else if(action==='page-next')notebookPage=Math.min((tutorialContent.pages.length+tutorialContent.steps.length)-1,notebookPage+1);
 else if(action==='next-day'){if(tutorial.observe(s,'review'))celebrate();nextDay();return;}
 else if(paused)return;
 else if(action==='business'){if(s.open){if(s.canClose)dialog='closing';}else if(!tutorial.active||tutorial.step>=4){s.tutorialDay=tutorial.active;s.shoppingList=tutorial.active?['milk']:s.business.unlocked;s.startDay();}}
 else if(action==='interact'){interact();return;}
 else if(action.startsWith('take-')){const id=action.slice(5) as Goods;if(s.business.unlocked.includes(id)&&s.takeBox(id)){tutorial.observe(s,'take');dismissDialog();}}
 else if(action.startsWith('buy-')){const id=action.slice(4) as Goods;if(s.business.unlocked.includes(id)){if(s.couponOffer(id))atomicCouponPurchase(id);else s.purchaseBox(id);}}
 else if(action==='return')s.returnBox();
 else if(action==='close-day'){if(s.canClose){s.closeDay();dismissDialog();}}
 saveProgress();render();
});
function updateDialogueText(){clearInterval(dialogueTimer);if(dialog!=='conversation'){dialogueKey='';return;}const node=s.narrative.current,button=panel.querySelector<HTMLButtonElement>('.dialogue-line');if(!node||!button)return;const key=JSON.stringify([s.narrative.data.active,node.text]);if(key!==dialogueKey){dialogueKey=key;dialogueLetters=0;dialogueRevealed=reducedMotion;}const letters=Array.from(node.text);const paint=()=>{button.textContent=dialogueRevealed?node.text:letters.slice(0,dialogueLetters).join('');const next=panel.querySelector<HTMLButtonElement>('[data-do="dialogue-continue"]');if(next)next.textContent=dialogueRevealed?'继续':'显示全文';};paint();if(!dialogueRevealed)dialogueTimer=window.setInterval(()=>{dialogueLetters+=1;if(dialogueLetters>=letters.length){dialogueRevealed=true;clearInterval(dialogueTimer);}paint();},28);}
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
