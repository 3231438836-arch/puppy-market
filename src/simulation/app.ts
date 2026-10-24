import {renderTomorrow} from './tomorrow';
import {checkCurrentBuild} from './version-check';
import {firstNightRoaming,finishFirstShopping,manualAvailable} from './first-night';
import {manual,renderManual,manualPageCount,updateManualProgress} from './manual';
import {beginDiary,diaryText,finishSleep} from './diary';
import {renderGuestBook,guestBookPageCount} from './guest-book-ui';
import {ensureCatalog,purchaseFurniture,placeFurniture,furnitureTransaction,hasLowShelf} from './furnishings';
import {renderNight} from './furniture-ui';
import {stockWarnings,dormTarget} from './experience';
import openingLines from '../data/opening.json';
import openingPortrait from '../art/portraits/manager-opening.svg?url';
import './experience.css';
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
import { fixtures, ShopSimulation } from './world';
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
document.querySelector('header span')!.textContent='街角便利店 · v'+__BUILD_INFO__.version;
const scene=new SimulationScene();
const developmentAdHarness=import.meta.env.DEV&&new URLSearchParams(location.search).get('ads-test')==='1';
const advertisementEnvironment=developmentAdHarness?'taptap-test':adEnvironment(import.meta.env.VITE_AD_ENVIRONMENT);
const adSandbox=advertisementEnvironment==='taptap-test';
const freshPreview=new URLSearchParams(location.search).get('preview')==='new';
const isolatedProfile=()=>npcPreview||adSandbox||freshPreview;
const npcPreview=new URLSearchParams(location.search).get('npc-preview')==='001';
let npcDraftWarning='';const npcDraftsReady=npcPreview?import('../data/npcs/customer-001.dialogues.json').then(m=>installNpcDrafts(m.default)).catch(()=>{npcDraftWarning='草稿未加载；仍可验证取货、货位调整与营业。';}):Promise.resolve();
const training=new URLSearchParams(location.search).get('training')==='1';
const sessionKey=npcPreview?'puppy-mart.npc001-preview.v1':freshPreview?'puppy-mart.experience-preview.v1':training?'puppy-mart.training-session.v1':adSandbox?'puppy-mart.ad-test-session.v1':SESSION_KEY;
const storedSession=loadSession(sessionKey);
let s=restoreSession(storedSession.value);s.narrative.allowDrafts=npcPreview;scene.shop=s;
let hasSession=false;try{hasSession=localStorage.getItem(sessionKey)!==null&&storedSession.writable;}catch{}
if(hasSession&&!s.experience.introStarted)s.experience.introSeen=true;
if(npcPreview){s.npcPreview=true;if(!hasSession){s.business.data.day=2;s.shelves={milk:6,bread:6,rice:0};}}
const tutorial=new Tutorial(npcPreview?'puppy-mart.npc001-tutorial-preview.v1':freshPreview?'puppy-mart.experience-tutorial-preview.v1':training?'puppy-mart.tutorial-replay.v1':adSandbox?'puppy-mart.ad-test-tutorial.v1':undefined,hasSession);
if(npcPreview)tutorial.skip();
let todoTab:TodoTab='open',todoPage=0;
let manualPage=0,diaryPage=0;
let notebookPage=0;let selectedGoods:Goods='milk';
function saveProgress(){if(entered){if(!writeStore(sessionKey,snapshot(s),storedSession.writable)&&storedSession.writable)saveNotice=saveNotice||'当前浏览器无法保存进度，请勿关闭页面。';tutorial.save();}}
let guestPage=0,navigateToDorm=false;
let versionMessage='',workerMessage='',checkingVersion=false;
async function inspectVersion(){if(checkingVersion)return;checkingVersion=true;versionMessage='正在检查当前站点版本…';layout.refresh();const result=await checkCurrentBuild(__BUILD_INFO__);versionMessage=result.message;workerMessage=result.worker;checkingVersion=false;layout.refresh();}
function gameMenu(){const canShop=s.closed&&!firstNightRoaming(s);return `<nav class="game-menu" aria-label="游戏功能"><button data-do="tomorrow">明日预告</button><button data-do="guest-book">小镇来客簿</button>${s.firstNight.manualUnlocked?'<button data-do="manual">员工须知</button>':''}<button data-do="diary-archive">吉娃娃的日记本</button><button data-do="navigate-dorm" ${s.experience.room==='dorm'||!s.canExplore?'disabled':''}>${s.experience.room==='dorm'?'正在员工宿舍':s.canExplore?'员工宿舍方向':'员工宿舍方向 · 结算后可前往'}</button><button data-do="night-catalog" ${canShop?'':'disabled'}>夜间购物目录${canShop?'':firstNightRoaming(s)?' · 今晚已结束':' · 打烊后开放'}</button><button data-do="night-layout" ${canShop?'':'disabled'}>家具仓库与布置${canShop?'':' · 打烊后开放'}</button><button data-do="todo-book">小狗的待办事项</button></nav>`;}
let nightMessage='',selectedFurniture='';
function nightTransaction(change:(candidate:typeof s)=>string|null){const result=furnitureTransaction(s,change,c=>writeStore(sessionKey,snapshot(c),storedSession.writable),shop=>restoreSession(structuredClone(snapshot(shop))));nightMessage=result.error??'已保存。';if(!result.error){s=result.shop;s.narrative.allowDrafts=npcPreview;s.npcPreview=npcPreview;scene.shop=s;sound.play('page');resetMovement();}return !result.error;}
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
function completeSleep(){if(!s.closed||s.experience.room!=='dorm')return;const candidate=restoreSession(structuredClone(snapshot(s)));const next=finishSleep(candidate);if(!next||!writeStore(sessionKey,snapshot(next),storedSession.writable)){saveNotice='保存失败，仍停留在当前夜晚，未进入下一天。';return;}saveNotice='';s=next;s.npcPreview=npcPreview;s.narrative.allowDrafts=npcPreview;scene.shop=s;dismissDialog();paused=false;scene.paused=false;const fade=document.createElement('div');fade.className='morning-fade';document.body.append(fade);setTimeout(()=>fade.remove(),800);}
function nextDay(){if(s.business.data.day===1&&!s.firstNight.slept){if(s.furnishings.phase==='summary'&&!s.firstNight.shoppingDone){nightTransaction(c=>{ensureCatalog(c);c.furnishings.phase='catalog';return null;});}else{nightTransaction(c=>finishFirstShopping(c)?null:'当前不能结束购物');dismissDialog();}render();return;}s=s.nextDay()??s;scene.shop=s;s.message='新的一天：'+(s.business.level>=2?'饭团已解锁，去仓库采购并放到冰柜货位。':'补货后接待顾客，完成目标可积累经验。');dialog=null;scene.modal=false;paused=false;scene.paused=false;lastSignature='';saveProgress();render();}

const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:430,height:420,pixelArt:true,backgroundColor:'#efdfc2',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});
const escape=(text:string)=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]!)).replaceAll(String.fromCharCode(34),'&quot;').replaceAll(String.fromCharCode(39),'&#39;');
let entered=false,managerName=isolatedProfile()&&typeof s.preservedSessionFields.previewManagerName==='string'?normalizeName(s.preservedSessionFields.previewManagerName):loadName(),dialog:'warehouse'|'notebook'|'stock'|'inventory'|'tasks'|'closing'|'conversation'|'environment-event'|'todo-book'|'ad-rewards'|'dorm-object'|'opening'|'guest-book'|'manual'|'manual-discovery'|'bed'|'diary'|'diary-archive'|'tomorrow'|null=null,lastSignature='',saveNotice='';
let paused=false;let entering=false;
let openingIndex=0,openingLetters=0,openingTimer:ReturnType<typeof setInterval>|undefined,openingReplay=false,dormObject='';
let lastArrivalCount=-1,lastArrivalDay=0;
let dialogueTimer=0,dialogueKey='',dialogueLetters=0,dialogueRevealed=false;
let resetJoystick: () => void = () => {};
function resetMovement(){scene.resetInput();resetJoystick();}
function dismissDialog(){clearInterval(openingTimer);openingTimer=undefined;dialog=null;scene.modal=false;resetMovement();}
const goodsName=(id:string)=>products.find(p=>p.id===id)!.name;
function startOpening(replay:boolean){if(!replay)s.experience.introStarted=true;openingReplay=replay;openingIndex=0;openingLetters=0;dialog='opening';resetMovement();scene.modal=true;}
function finishOpening(){if(!openingReplay)s.experience.introSeen=true;dismissDialog();saveProgress();}
function paintOpening(){const line=panel.querySelector<HTMLElement>('.opening-line');if(line)line.textContent=openingLines[openingIndex].slice(0,openingLetters);}
function updateOpeningText(){clearInterval(openingTimer);openingTimer=undefined;if(dialog!=='opening')return;paintOpening();if(openingLetters<openingLines[openingIndex].length)openingTimer=setInterval(()=>{openingLetters++;paintOpening();if(openingLetters>=openingLines[openingIndex].length)clearInterval(openingTimer);},45);}
function render(){
 if(!entered){
  if(panel.querySelector('#enter-shop'))return;
  panel.innerHTML=`<div class="eyebrow">PUPPY MART · ${npcPreview?'仓鼠独立预览':freshPreview?'全新体验独立预览':'v'+escape(__BUILD_INFO__.version)}</div><h1>今天，走进小店</h1><label class="name-label" for="manager-name">给吉娃娃店长取个名字</label><input id="manager-name" maxlength="32" value="${escape(managerName)}" placeholder="你想怎样称呼店长？"><p class="muted">沿用本机名字；不修改已有经营存档。</p><button id="enter-shop" class="primary wide" data-do="enter">进入便利店 →</button><p>首次进入会逐步引导实际移动、补货和收银；可随时跳过或重新学习。</p><a href="?mode=classic">回到经典 P0 模式</a>`;return;
 }
 if(s.diaries.pendingDay!==null)dialog='diary';
 else if(s.firstNight.discoveryLine!==null)dialog='manual-discovery';
 if(updateManualProgress(s))saveProgress();
 if(s.updateGuestBook())saveProgress();
 if(s.narrative.data.active&&!s.narrative.current)s.narrative.skip();
 if(dialog==='conversation'&&!s.narrative.data.active)dismissDialog();
 if(s.narrative.data.active)dialog='conversation';
 if(dialog!=='opening'&&s.experience.room==='shop'&&tutorial.observe(s))saveProgress();
 scene.guideTarget=navigateToDorm&&s.experience.room==='shop'?fixtures.find(f=>f.id==='stairs')!.spot:firstNightRoaming(s)&&!s.firstNight.enteredDorm&&s.experience.room==='shop'?fixtures.find(f=>f.id==='stairs')!.spot:s.experience.room==='shop'?tutorial.target(s):null;scene.highlightPlayer=!navigateToDorm&&tutorial.active&&tutorial.step===0;
 scene.modal=!!dialog||layout.open||s.closed&&!s.canExplore;
 document.body.classList.toggle('sim-dialog-open',!!dialog||layout.open);document.body.classList.toggle('sleeping',dialog==='diary');
 const signature=JSON.stringify([s.nearby,s.canTalkHamster,s.warehouse,s.shelves,s.carrying,s.customerState,s.path.length===0,s.futureArrivals,s.insideCount,s.departedCount,s.basket,s.scanned,s.confirmed,s.cashReceived,s.change,s.coins,s.served,s.open,s.closed,Math.ceil(s.remaining),s.message,dialog,paused,tutorial.record,notebookPage,selectedGoods,s.business.data,s.narrative.data,s.experience,scene.speed,openingIndex,dormObject,s.furnishings,s.guestBook,navigateToDorm,s.firstNight,s.diaries,manualPage,diaryPage,guestPage,nightMessage,selectedFurniture,s.adRewards,rewardedAds.busy,rewardedAds.state,adMessage,s.improvements,todoTab,todoPage,s.feedbackRevision,sound.enabled,layout.open,saveNotice]);
 if(s.feedbackRevision!==lastFeedback){lastFeedback=s.feedbackRevision;const toast=document.querySelector<HTMLElement>('#feedback-toast');clearTimeout(toastTimer);toast?.classList.remove('show');if(s.feedbackRevision>0){if(toast){toast.textContent=s.feedback;void toast.offsetWidth;toast.classList.add('show');toastTimer=window.setTimeout(()=>toast.classList.remove('show'),2800);}sound.play(s.feedback.startsWith('补货')?'restock':s.feedback.startsWith('待办')?'todo':s.feedback.startsWith('扫描')?'scan':'sale');if(s.feedback.includes('目标完成')||s.feedback.includes('升级'))microCelebrate();}}
 if(signature===lastSignature)return;lastSignature=signature;
 const arrived=s.flow.plan.filter(a=>a.arrived).length;if(lastArrivalCount>=0&&lastArrivalDay===s.business.data.day&&arrived>lastArrivalCount)sound.play('door');lastArrivalCount=arrived;lastArrivalDay=s.business.data.day;
 sound.setScene(dialog==='opening'?'opening':s.experience.room);
 const warnings=stockWarnings(s),empty=warnings.filter(w=>w.level==='empty');const action=contextAction();
 panel.innerHTML=`<div class="compact-hud"><span>第${s.business.data.day}天</span><b>◈ ${s.business.data.balance}</b><span class="clock">${s.open?Math.floor(s.flow.elapsed/60)+':'+String(Math.floor(s.flow.elapsed%60)).padStart(2,'0'):s.closed?'夜晚':'准备'}</span><div class="business-strip"><span class="flow-counts" aria-label="每日客流">待到 ${s.futureArrivals} · 店内 ${s.insideCount} · 离店 ${s.departedCount}</span>${!s.closed&&s.experience.room==='shop'?`<button class="business-toggle" data-do="business" ${paused||!!dialog||layout.open||(!s.open&&tutorial.active&&tutorial.step<4)||(s.open&&!s.canClose)?'disabled':''} title="${s.open&&!s.canClose?'等待计划顾客全部到店并离开':!s.open&&tutorial.active&&tutorial.step<4?'先完成教学补货':s.open?'查看打烊结算':'开始自动营业'}">${s.open?'打烊':'开店'}</button>`:''}</div><nav><button class="speed-toggle" data-do="speed" aria-label="切换游戏速度" aria-pressed="${scene.speed===2}">${scene.speed}×</button><button data-do="tasks" aria-label="任务">✓</button><button data-do="inventory" aria-label="库存">▦</button><button data-do="notebook" aria-label="操作指南">▤</button><button data-do="settings" id="layout-settings" aria-label="设置">⚙</button></nav></div>${tutorial.active&&!navigateToDorm&&!s.closed&&s.experience.room==='shop'&&dialog!=='opening'?`<aside class="guide-chip" aria-label="新手引导"><span>${String(tutorial.step+1).padStart(2,'0')} · ${escape(tutorial.text?.short??tutorial.text?.title??'')}</span><button data-do="skip-tutorial">跳过</button></aside>`:''}${firstNightRoaming(s)&&!s.firstNight.enteredDorm&&s.experience.room==='shop'&&!dialog?'<p class="night-guidance">今天的工作结束了。回宿舍休息吧。</p>':''}${!s.closed&&empty.length&&s.experience.room==='shop'&&!dialog&&!layout.open?`<button class="stock-warning" data-do="stock-warnings" aria-label="查看缺货商品">！缺货 ${empty.length}</button>`:''}${paused?'<div class="pause-chip"><button data-do="pause">继续经营</button></div>':''}${saveNotice?`<p class="save-warning">${escape(saveNotice)}</p>`:''}${action&&!dialog&&!paused&&!layout.open&&s.canExplore?`<button class="interact-pad ${action.length>2?'long-label':''}" data-do="interact" aria-label="${action}">${action}<small>E</small></button>`:''}${s.experience.room==='shop'&&s.canTalkHamster&&!dialog&&!paused&&!layout.open&&!s.closed?'<button class="npc-chat-pad" data-do="npc-talk">交谈</button>':''}<div id="dialog" ${dialog||s.closed&&!s.canExplore?'role="dialog" aria-modal="true" aria-label="店铺互动"':''}>${dialog?dialogContent():s.closed&&!s.canExplore&&s.furnishings.phase!=='summary'?renderNight(s,nightMessage,selectedFurniture):s.closed&&!s.canExplore?`<section class="sim-dialog summary-sheet"><div class="dialog-heading"><h2>营业结算</h2><button data-do="tasks" aria-label="游戏菜单">菜单</button><button class="primary" data-do="next-day">${tutorial.active?'完成教程':s.business.data.day===1&&!s.firstNight.slept?'进入夜间购物':'开始下一天'}</button></div>${growthSummary(s)}<button data-do="tomorrow">明日预告</button><p>门缝里多了一张新的商品目录。要看看吗？</p><button data-do="night-catalog">打开夜间购物目录</button><button data-do="night-layout">查看家具仓库与布置</button><p role="status">${escape(nightMessage)}</p></section>`:dialogContent()}</div>`;
 updateDialogueText();updateOpeningText();
}
function contextAction(){if(s.experience.room==='dorm'){const target=dormTarget(s.experience.dormPosition);return target==='exit'?'返回便利店':target==='bed'?(manualAvailable(s)&&!s.firstNight.discovered?'查看':'休息'):target==='desk'?'查看书桌':target==='shelf'?'查看置物架':null;}if(s.nearby?.startsWith('event:'))return s.nearbyEnvironmentEvent?.definition.interactionLabel??null;switch(s.nearby){case 'todo-book':return '查看待办';case 'notebook':return '查看操作指南';case 'warehouse':return '拿货';case 'milk':return '补货';case 'bread':return s.canAdjustHamsterShelf&&s.carrying?.goods!=='bread'?'调整摆放位置':'补货';case 'freezer':return s.business.level>=2?'补货':null;case 'counter':return s.atRegister?'结账':null;case 'stairs':return '进入宿舍';case 'entrance':return null;default:return null;}}
function heading(title:string){return `<div class="dialog-heading"><h2>${title}</h2><button data-do="dismiss">返回店铺</button></div>`;}
function dialogContent(){
 if(dialog==='tomorrow')return renderTomorrow(s);
 if(dialog==='manual')return renderManual(s,manualPage);
 if(dialog==='manual-discovery')return `<section class="sim-dialog notebook" aria-label="发现员工须知"><h2>店长</h2><p class="discovery-line">${escape(manual.discoveryLines[s.firstNight.discoveryLine??0])}</p><div class="sim-actions"><button data-do="manual-discovery-next">${s.firstNight.discoveryLine===2?'翻开手册':'继续'}</button><button data-do="manual-discovery-later">稍后再看</button></div></section>`;
 if(dialog==='bed')return `<section class="sim-dialog" aria-label="床铺"><h2>床铺</h2>${manualAvailable(s)?'<button data-do="bed-manual">查看《员工须知》</button>':''}<button data-do="sleep" ${!s.closed||s.business.data.day===1&&!s.firstNight.shoppingDone?'disabled':''}>睡觉</button><button data-do="dismiss">再待一会儿</button>${!s.closed?'<p>今天的营业还未结束。</p>':''}</section>`;
 if(dialog==='diary'){const entry=s.diaries.entries[String(s.diaries.pendingDay)]!;return `<section class="sim-dialog notebook sleep-diary" aria-label="睡前日记"><h2>吉娃娃的日记本 · 第 ${entry.day} 天</h2><p class="diary-body">${escape(diaryText(entry))}</p>${entry.status==='awaiting-author'?'<p>旧版本未保存这篇日记的正文；原有记录保持不变。</p>':''}<button class="primary wide" data-do="close-diary">合上日记</button><p role="status">${escape(saveNotice)}</p></section>`;}
 if(dialog==='diary-archive'){const entries=Object.values(s.diaries.entries).filter(e=>e.completed).sort((a,b)=>a.day-b.day),entry=entries[Math.min(diaryPage,entries.length-1)];return `<section class="sim-dialog notebook" aria-label="吉娃娃的日记本">${heading('吉娃娃的日记本')}${entry?`<h2>第 ${entry.day} 天</h2><p class="diary-body">${escape(diaryText(entry))}</p>`:'<p>还没有合上的日记。</p>'}<div class="sim-actions"><button data-do="diary-prev" ${diaryPage===0?'disabled':''}>上一页</button><button data-do="diary-next" ${diaryPage>=entries.length-1?'disabled':''}>下一页</button></div></section>`;}

 if(dialog==='guest-book')return renderGuestBook(s.guestBook,guestPage,{CUSTOMER_001:hamsterPortrait});
 if(dialog==='opening')return `<section class="sim-dialog opening" aria-label="开场独白"><div class="opening-portrait"><img src="${openingPortrait}" alt="普通黄褐色短毛吉娃娃店长像素头像"></div><button class="dialogue-line opening-line" data-do="opening-next" aria-label="开场台词"></button><div class="sim-actions"><button data-do="opening-skip">跳过开场</button><button class="primary" data-do="opening-next">继续</button></div><small>${openingIndex+1} / ${openingLines.length}</small></section>`;
 if(dialog==='dorm-object')return `<section class="sim-dialog" aria-label="宿舍设施">${heading(dormObject)}${dormObject==='书桌'?'<button data-do="diary-archive">吉娃娃的日记本</button>':''}<p>${dormObject==='床铺'?'床铺已整理。休息与恢复功能待后续开放。':dormObject==='书桌'?'书桌可放置日常物品；写作内容由作者后续填写。':'置物架已预留收藏位置；未获得的收藏品不会自动出现。'}</p></section>`;

 if(dialog==='ad-rewards')return renderAdPanel(rewardedAds,s.adRewards,advertisementEnvironment,adMessage);
 if(dialog==='todo-book')return renderTodoBook(s,todoTab,todoPage);
 if(dialog==='environment-event'){const event=s.nearbyEnvironmentEvent;if(!event)return `<section class="sim-dialog">${heading('场景互动')}<p>这个事件目前无法互动。</p></section>`;return `<section class="sim-dialog">${heading(event.definition.interactionLabel)}<p>可以现在帮忙，也可以稍后再来。</p><button class="primary wide" data-do="environment-interact">${escape(event.definition.interactionLabel)}</button><button data-do="dismiss">稍后再来</button>${event.definition.dialogueTrigger&&s.canHearEnvironmentDialogue?'<button data-do="shelf-dialogue">听它说（草稿试读）</button>':''}</section>`;}

 if(dialog==='conversation'){
  const node=s.narrative.current;if(!node)return '';
  return `<section class="sim-dialog conversation" aria-label="顾客对话"><div class="dialog-heading"><h2>${escape(node.displayName)}</h2><button data-do="dialogue-skip">跳过对话</button></div><img class="portrait" src="${node.portraitId==='customer001'?hamsterPortrait:node.expression==='soft'?portraitSoft:portraitNeutral}" alt="${node.portraitId==='customer001'?'小仓鼠像素肖像':'测试熟客像素肖像'}"><div class="dialogue-body"><small>${escape(node.portraitId==='customer001'?(node.npcStatus==='draft'?'草稿试读 · 待作者审核':''):narrativeContent.notice)}</small><button class="dialogue-line" data-do="dialogue-advance" aria-label="${escape(node.text)}"></button><div class="dialogue-choices">${node.choices.length?node.choices.map((choice,index)=>`<button data-do="dialogue-choice-${index}">${escape(choice.label)}</button>`).join(''):'<button class="primary" data-do="dialogue-continue">显示全文</button>'}</div></div></section>`;
 }

 if(dialog==='notebook'){
  const pages=[...tutorialContent.pages,...tutorialContent.steps.map(step=>({title:step.title,text:step.text,note:'跟随场景标记实际操作，完成后自动继续。',handwriting:'教学占位'}))];const page=pages[notebookPage];
  return `<section class="sim-dialog notebook" aria-label="操作指南"><div class="dialog-heading"><h2>操作指南</h2><button data-do="dismiss">返回店铺</button></div><article class="notebook-page" key="${notebookPage}"><small>${escape(page.handwriting)} · ${notebookPage+1} / ${(tutorialContent.pages.length+tutorialContent.steps.length)}</small><h2>${escape(page.title)}</h2><p>${escape(page.text)}</p><p class="hand-note">※ ${escape(page.note)}</p></article><div class="sim-actions"><button data-do="page-prev" ${notebookPage===0?'disabled':''}>上一页</button><button data-do="page-next" ${notebookPage===(tutorialContent.pages.length+tutorialContent.steps.length)-1?'disabled':''}>下一页</button></div><p class="muted">${tutorialContent.notice}</p></section>`;
 }

 const pauseNotice=paused?'<p role="status">游戏已暂停 <button data-do="pause">继续操作</button></p>':'';
 if(dialog==='stock')return `<section class="sim-dialog">${heading(goodsName(selectedGoods)+'货架')}<p>货架 ${s.shelves[selectedGoods]}/6 · 手持 ${s.carrying?goodsName(s.carrying.goods)+' ×'+s.carrying.quantity:'无'}</p><p>从仓库拿取对应货箱后才能补货。</p><button class="primary wide" data-do="restock">确认补货</button>${selectedGoods==='bread'&&!s.canAdjustHamsterShelf&&!s.improvements.facilities['lowered-bread-slot']?`<button data-do="observe-bread" ${s.shelves.bread<=0?'disabled title="货架有货后再观察"':''}>观察货位</button>`:''}${selectedGoods==='bread'&&s.canAdjustHamsterShelf?'<button data-do="adjust-shelf">调整摆放位置</button>':''}<p role="status">${escape(s.message)}</p></section>`;
 if(dialog==='inventory')return `<section class="sim-dialog">${heading('库存与手持货箱')}<p>${adInventory(s.adRewards)}</p><p>缺货 ${stockWarnings(s).filter(w=>w.level==='empty').length} 种 · 低库存 ${stockWarnings(s).filter(w=>w.level==='low').length} 种</p>${stockWarnings(s).map(w=>`<p class="stock-list ${w.level}">${goodsName(w.goods)}：${w.level==='empty'?'缺货！':'快卖完了'} · 货架 ${s.shelves[w.goods]}/6 · 仓库 ${s.warehouse[w.goods]}</p>`).join('')}<button data-do="guest-book">小镇来客簿</button><button data-do="ad-rewards">可选视频奖励</button><p>手持：${s.carrying?goodsName(s.carrying.goods)+' ×'+s.carrying.quantity:'无'}</p>${s.business.unlocked.map(id=>`<p>${goodsName(id)}：仓库 ${s.warehouse[id]} · 货架 ${s.shelves[id]}/6</p>`).join('')}<p>拿货请前往仓库，补货请靠近对应货架。</p></section>`;
 if(dialog==='tasks')return `<section class="sim-dialog">${heading('经营与游戏菜单')}${gameMenu()}<p>店铺 Lv.${s.business.level} · ${s.business.data.xp} XP${s.business.nextLevel?' / '+s.business.nextLevel.xp:''}</p>${goalList(s).replace('<details','<details open')}<p>客流：${s.served} 单 · ${escape(s.message)}</p><p>使用顶部独立按钮开店或打烊；打烊需等待计划客流全部离店。</p></section>`;
 if(dialog==='closing')return `<section class="sim-dialog">${heading('结束今天的营业？')}<p>已完成 ${s.served} 单，销售额 ${s.coins}。打烊后查看成本、利润与明日目标。</p><button class="primary wide" data-do="close-day">打烊结算</button></section>`;
 if(dialog==='warehouse')return `<section class="sim-dialog" aria-label="仓库取货">${heading('仓库 · 每箱 3 件')}${pauseNotice}<div class="sim-actions">${s.business.unlocked.map(id=>`<button data-do="select-${id}" aria-pressed="${id===selectedGoods}">${goodsName(id)}</button>`).join('')}</div><p>${goodsName(selectedGoods)} · 仓库 ${s.warehouse[selectedGoods]} 件 · 资金 ${s.business.data.balance}</p><p>进价 ${s.business.cost(selectedGoods)} / 售价 ${products.find(p=>p.id===selectedGoods)!.price}</p><div class="sim-actions"><button data-do="take-${selectedGoods}">取${goodsName(selectedGoods)}箱</button><button data-do="buy-${selectedGoods}">采购一箱 · ${s.couponOffer(selectedGoods)?s.couponOffer(selectedGoods)!.net+'（用券）':s.business.cost(selectedGoods)*3}</button>${s.couponOffer(selectedGoods)?`<button data-do="buy-full-price-${selectedGoods}" ${s.business.data.balance<s.business.cost(selectedGoods)*3?'disabled':''}>保留优惠券 · 原价 ${s.business.cost(selectedGoods)*3}</button>`:''}<button data-do="return">放回货箱</button></div><p role="status">${escape(s.message)}</p></section>`;
 return '';
}
function interact(){
 if(!entered||paused||dialog||layout.open||!s.canExplore||rewardedAds.busy)return;
 // Do not reset Phaser's E key while its keydown is being dispatched.
 if(s.experience.room==='dorm'){const target=dormTarget(s.experience.dormPosition);if(target==='exit'){s.experience.room='shop';sound.play('door');}else if(target==='bed'){dialog='bed';scene.modal=true;}else if(target){dormObject=target==='desk'?'书桌':'置物架';dialog='dorm-object';scene.modal=true;}}
 else if(s.nearby?.startsWith('event:')){dialog='environment-event';}
 else if(s.nearby==='todo-book'){s.syncImprovements();dialog='todo-book';todoTab='open';todoPage=0;}

 else if(s.nearby==='notebook'){dialog='notebook';notebookPage=0;tutorial.observe(s,'notebook');}
 else if(s.nearby==='warehouse'){dialog='warehouse';scene.modal=true;}
 else if(s.nearby==='milk'||s.nearby==='bread'){selectedGoods=s.nearby;if(s.nearby==='bread'&&s.canAdjustHamsterShelf&&s.carrying?.goods!=='bread')s.adjustHamsterShelf();else dialog='stock';}
 else if(s.nearby==='counter'){
  if(s.atRegister&&!tutorial.active&&s.front&&s.narrative.begin(s.front.customerId,s.front.id,s.business.data.day)){dialog='conversation';}else if(s.checkout())tutorial.observe(s);else s.message='请到店员侧等待队首顾客到位。';
 } else if(s.nearby==='stairs'){s.experience.room='dorm';navigateToDorm=false;if(s.firstNight.guidanceStarted)s.firstNight.enteredDorm=true;sound.play('door');resetMovement();}
 else if(s.nearby==='freezer'&&s.business.level>=2){selectedGoods='rice';dialog='stock';}
 else if(s.nearby==='entrance'){if(!s.open){if(tutorial.active&&tutorial.step<4)s.message='先按教学标记完成补货。';else{ s.tutorialDay=tutorial.active;s.shoppingList=tutorial.active?['milk']:s.business.unlocked;s.startDay();}}else if(s.canClose)dialog='closing';}
 else if(s.nearby==='freezer')s.message='冰柜区域已预留，本次切片仅开放牛奶与面包货架。';
 else if(!s.nearby)s.message='距离互动目标太远，请走到物体前的标记圆圈。';
 if(dialog)resetJoystick();
 saveProgress();render();
}
scene.onRefresh=render;scene.onInteract=interact;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&['opening','manual-discovery','diary'].includes(dialog??'')){e.preventDefault();return;}if(e.key==='Escape'&&dialog&&!layout.open&&!rewardedAds.busy){e.preventDefault();if(dialog==='conversation')s.narrative.skip();dismissDialog();saveProgress();render();}});
panel.addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('[data-do="interact"]')){e.preventDefault();interact();}});
panel.addEventListener('click',async e=>{
 const action=(e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.do;if(!action||rewardedAds.busy)return;if(dialog==='opening'&&!['opening-next','opening-skip'].includes(action))return;if(s.diaries.pendingDay!==null&&!['enter','close-diary'].includes(action))return;if(action==='interact'&&e.detail>0)return;
 resetMovement();sound.unlock();
 if(action==='enter'){
  if(entered||entering)return;entering=true;await Promise.all([npcDraftsReady,adHarnessReady]);entering=false;
  const input=panel.querySelector<HTMLInputElement>('#manager-name')!;managerName=normalizeName(input.value);
  if(!layout.preferences.selected){layout.show('choice');return;}
  if(!managerName){input.setCustomValidity('请先给店长取名。');input.reportValidity();return;}
  saveNotice=npcDraftWarning||storedSession.warning||tutorial.warning||((isolatedProfile()||saveName(managerName))?'':'名字暂时无法保存；当前仍可游玩。');if(isolatedProfile())s.preservedSessionFields.previewManagerName=managerName;entered=true;document.querySelector('#app')!.classList.add('playing');document.body.classList.add('immersive');scene.activePlay=true;setupJoystick();if(!s.experience.introSeen&&!npcPreview&&!training)startOpening(false);saveProgress();rewardedAds.recover();
 }else if(action==='restart'){nextDay();return;}
 else if(action==='bed-manual'){if(manualAvailable(s)){if(!s.firstNight.discovered){s.firstNight.discovered=true;s.firstNight.manualUnlocked=true;s.firstNight.discoveryLine=0;dialog='manual-discovery';}else{manualPage=0;dialog='manual';s.firstNight.manualRead=true;}}}
 else if(action==='manual-discovery-next'){if((s.firstNight.discoveryLine??0)<2)s.firstNight.discoveryLine=(s.firstNight.discoveryLine??0)+1;else{s.firstNight.discoveryLine=null;s.firstNight.manualRead=true;manualPage=0;dialog='manual';}}
 else if(action==='manual-discovery-later'){s.firstNight.discoveryLine=null;dismissDialog();}
 else if(action==='manual'){if(s.firstNight.manualUnlocked){manualPage=0;s.firstNight.manualRead=true;dialog='manual';}}
 else if(action==='manual-prev'){manualPage=Math.max(0,manualPage-1);sound.play('page');}
 else if(action==='manual-next'){manualPage=Math.min(manualPageCount(s)-1,manualPage+1);sound.play('page');}
 else if(action==='diary-archive'){diaryPage=0;dialog='diary-archive';}
 else if(action==='diary-prev')diaryPage=Math.max(0,diaryPage-1);
 else if(action==='diary-next')diaryPage=Math.min(Object.values(s.diaries.entries).filter(e=>e.completed).length-1,diaryPage+1);
 else if(action==='sleep'){if(s.closed&&s.experience.room==='dorm'&&(s.business.data.day!==1||s.firstNight.shoppingDone)){if(s.business.data.day===1){if(nightTransaction(c=>beginDiary(c)?null:'当日日记已经完成'))dialog='diary';}else completeSleep();}}
 else if(action==='close-diary')completeSleep();
 else if(action==='tomorrow')dialog='tomorrow';
 else if(action==='navigate-dorm'){if(s.experience.room==='shop'){navigateToDorm=true;dismissDialog();}}
 else if(action==='guest-book'){dialog='guest-book';guestPage=0;}
 else if(action==='guest-prev')guestPage=Math.max(0,guestPage-1);
 else if(action==='guest-next')guestPage=Math.min(guestBookPageCount()-1,guestPage+1);
 else if(action==='night-catalog'){if(s.closed&&!firstNightRoaming(s)&&nightTransaction(c=>{ensureCatalog(c);c.furnishings.phase='catalog';return null;}))dismissDialog();}
 else if(action==='night-layout'){if(s.closed&&!firstNightRoaming(s)&&nightTransaction(c=>{c.furnishings.phase='layout';return null;}))dismissDialog();}
 else if(action==='night-summary'){nightTransaction(c=>{c.furnishings.phase='summary';return null;});}
 else if(action.startsWith('furniture-buy-')){if(nightTransaction(c=>purchaseFurniture(c,action.slice(14)))){selectedFurniture=s.furnishings.items.at(-1)!.instanceId;sound.play('sale');nightMessage='购买成功，已放入家具仓库。';}}
 else if(action.startsWith('furniture-select-'))selectedFurniture=action.slice(17);
 else if(action.startsWith('furniture-place-')){nightTransaction(c=>placeFurniture(c,selectedFurniture,action.slice(16)));}
 else if(action==='furniture-return'){nightTransaction(c=>placeFurniture(c,selectedFurniture,null));}
 else if(action==='furniture-lower-bread'){nightTransaction(c=>{if(!hasLowShelf(c))return '请先将矮木货架放在面包货位';c.furnishings.breadOnLowShelf=true;c.stockRevision++;return null;});}
 else if(action==='speed')scene.speed=scene.speed===1?2:1;
 else if(action==='stock-warnings'){dialog='inventory';scene.modal=true;}
 else if(action==='opening-next'){if(openingLetters<openingLines[openingIndex].length){openingLetters=openingLines[openingIndex].length;paintOpening();}else if(openingIndex+1<openingLines.length){openingIndex++;openingLetters=0;lastSignature='';}else finishOpening();}
 else if(action==='opening-skip')finishOpening();
 else if(action==='pause'){paused=!paused;scene.paused=paused;}
 else if(action==='dialogue-skip'){s.narrative.skip();dismissDialog();}
 else if(action==='dialogue-continue'||action==='dialogue-advance'){if(!dialogueRevealed){dialogueRevealed=true;updateDialogueText();}else{s.narrative.continue();if(!s.narrative.data.active)dismissDialog();}}
 else if(action.startsWith('dialogue-choice-'))s.narrative.choose(Number(action.slice(16)));
 else if(action==='dismiss')dismissDialog();
 else if(action==='skip-tutorial'){tutorial.skip();s.message='已跳过教程。随时打开操作指南，或选择重新学习。';}
 else if(action==='replay'){const replay=new Tutorial('puppy-mart.tutorial-replay.v1');writeStore(replay.key,{version:1,step:0,status:'active'},replay.writable);const old=loadSession('puppy-mart.training-session.v1');writeStore('puppy-mart.training-session.v1',snapshot(new ShopSimulation()),old.writable);location.href='?training=1';return;}
 else if(action==='settings'){layout.show();}
 else if(action==='ad-rewards'){adMessage='';dialog='ad-rewards';}
 else if(action.startsWith('watch-ad-')){const id=action.slice(9) as RewardId;if(adConfig.rewards.some(r=>r.id===id)){saveProgress();const previouslyPaused=paused;const pending=rewardedAds.watch(id);render();try{adMessage=adResultText[await pending];}finally{if(!document.hidden){paused=previouslyPaused;scene.paused=paused;}resetMovement();}}}
 else if(action.startsWith('buy-full-price-')){const id=action.slice(15) as Goods;if(s.business.unlocked.includes(id))s.purchaseBox(id);}
 else if(action==='todo-book'){s.syncImprovements();dialog='todo-book';todoTab='open';todoPage=0;}
 else if(action.startsWith('todo-tab-')){const tab=action.slice(9);if(['open','completed','future'].includes(tab)){todoTab=tab as TodoTab;todoPage=0;}}
 else if(action==='todo-prev')todoPage=Math.max(0,todoPage-1);
 else if(action==='todo-next')todoPage=Math.min(todoPageCount(s,todoTab)-1,todoPage+1);
 else if(action==='todo-lower-shelf'){if(s.adjustHamsterShelf()){sound.play('todo');todoTab='completed';todoPage=0;}}
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
 else if(action==='page-prev'){notebookPage=Math.max(0,notebookPage-1);sound.play('page');}
 else if(action==='page-next'){notebookPage=Math.min((tutorialContent.pages.length+tutorialContent.steps.length)-1,notebookPage+1);sound.play('page');}
 else if(action==='next-day'){if(tutorial.observe(s,'review'))celebrate();nextDay();return;}
 else if(paused)return;
 else if(action==='business'){if(s.open){if(s.canClose)dialog='closing';}else if(!tutorial.active||tutorial.step>=4){s.tutorialDay=tutorial.active;s.shoppingList=tutorial.active?['milk']:s.business.unlocked;s.startDay();}}
 else if(action==='interact'){interact();return;}
 else if(action.startsWith('take-')){const id=action.slice(5) as Goods;if(s.business.unlocked.includes(id)&&s.takeBox(id)){tutorial.observe(s,'take');dismissDialog();}}
 else if(action.startsWith('buy-')){const id=action.slice(4) as Goods;if(s.business.unlocked.includes(id)){if(s.couponOffer(id))atomicCouponPurchase(id);else s.purchaseBox(id);}}
 else if(action==='return')s.returnBox();
 else if(action==='close-day'){if(s.canClose){s.closeDay();sound.play('sale');dismissDialog();}}
 saveProgress();render();
});
function updateDialogueText(){clearInterval(dialogueTimer);if(dialog!=='conversation'){dialogueKey='';return;}const node=s.narrative.current,button=panel.querySelector<HTMLButtonElement>('.dialogue-line');if(!node||!button)return;const key=JSON.stringify([s.narrative.data.active,node.text]);if(key!==dialogueKey){dialogueKey=key;dialogueLetters=0;dialogueRevealed=reducedMotion;}const letters=Array.from(node.text);const paint=()=>{button.textContent=dialogueRevealed?node.text:letters.slice(0,dialogueLetters).join('');const next=panel.querySelector<HTMLButtonElement>('[data-do="dialogue-continue"]');if(next)next.textContent=dialogueRevealed?'继续':'显示全文';};paint();if(!dialogueRevealed)dialogueTimer=window.setInterval(()=>{dialogueLetters+=1;if(dialogueLetters>=letters.length){dialogueRevealed=true;clearInterval(dialogueTimer);}paint();},28);}
function microCelebrate(){if(reducedMotion)return;const burst=document.createElement('div');burst.className='micro-confetti';burst.innerHTML=Array.from({length:6},(_,i)=>`<i style="--dx:${Math.cos(i*Math.PI/3)*48}px;--dy:${Math.sin(i*Math.PI/3)*30}px"></i>`).join('');document.body.append(burst);setTimeout(()=>burst.remove(),700);}
function celebrate(){const confetti=document.createElement('div');confetti.className='pixel-confetti';confetti.setAttribute('role','status');confetti.innerHTML='<b>教程完成</b>'+ Array.from({length:navigator.hardwareConcurrency<=4?12:24},(_,i)=>`<i style="--i:${i};--dx:${Math.cos(i*Math.PI/12)*(90+(i%4)*25)}px;--dy:${Math.sin(i*Math.PI/12)*(90+(i%4)*25)}px;background:${['#ae744e','#648e7b','#e0bc71'][i%3]}"></i>`).join('');document.body.append(confetti);setTimeout(()=>confetti.remove(),1500);}
function setupJoystick(){
 const visual=document.createElement('div');visual.className='joystick';visual.hidden=true;visual.setAttribute('aria-label','浮动移动摇杆');visual.innerHTML='<span class="stick"></span>';gameElement.append(visual);
 const toast=document.createElement('div');toast.id='feedback-toast';toast.setAttribute('role','log');toast.setAttribute('aria-live','polite');document.body.append(toast);
 resetJoystick=mountFloatingJoystick({surface:gameElement,visual,allowed:()=>entered&&!paused&&!dialog&&!layout.open&&s.canExplore,size:()=>layout.preferences.joystickSize,sensitivity:()=>layout.preferences.sensitivity,onMove:(x,y)=>scene.joystick={x,y},onRelease:saveProgress});
 window.addEventListener('blur',()=>{resetMovement();if(entered){paused=true;scene.paused=true;render();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){sound.suspend();resetMovement();paused=true;scene.paused=true;saveProgress();render();}});
}

scene.onStockWarning=()=>{if(!rewardedAds.busy){dialog='inventory';resetMovement();render();}};
render();
setInterval(saveProgress,1000);
window.addEventListener('pagehide',saveProgress);

layout.gameControls=()=>`<button data-game-action="tomorrow">明日预告</button>${s.firstNight.manualUnlocked?'<button data-game-action="manual">员工须知</button>':''}<button data-game-action="guest-book">小镇来客簿</button><div class="sound-sliders"><label>音乐音量<input aria-label="音乐音量" data-audio="music" type="range" min="0" max="100" value="${Math.round(sound.music*100)}"></label><label>音效音量<input aria-label="音效音量" data-audio="effects" type="range" min="0" max="100" value="${Math.round(sound.effects*100)}"></label></div><button data-game-action="mute">静音：${sound.muted?'开':'关'}</button><button data-game-action="opening">重看开场</button><div class="sim-actions"><button data-game-action="pause">${paused?'继续经营':'暂停经营'}</button><button data-game-action="sound">音效：${sound.enabled?'开':'关'}</button><button data-game-action="motion">减少动态：${reducedMotion?'开':'关'}</button><button data-game-action="replay">重新学习</button></div><p class="build-meta" aria-label="游戏版本">PUPPY MART v${escape(__BUILD_INFO__.version)}<br>Build: ${escape(__BUILD_INFO__.buildDate)}（日本时间）<br>Commit: ${escape(__BUILD_INFO__.shortCommit)}<br>进度：第 ${s.business.data.day} 天 · Level ${s.business.level} · ${s.experience.room==='dorm'?'宿舍':'便利店'}<br>存档：${npcPreview?'仓鼠预览':freshPreview?'独立新档':training?'教学复习':adSandbox?'广告测试':'正常经营'}<br>${__BUILD_INFO__.dirty?'工作区测试构建 · 尚含未提交修改':'已提交源码构建'}</p><button data-game-action="version-check" ${checkingVersion?'disabled':''}>检查当前版本（保留存档）</button><p class="version-check-result" role="status">${escape(versionMessage)} ${escape(workerMessage)}</p>`;
document.addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(input.dataset.audio==='music'||input.dataset.audio==='effects'){sound.unlock();sound.setVolume(input.dataset.audio,Number(input.value)/100);}});
layout.onGameAction=action=>{sound.unlock();if(action==='version-check'){void inspectVersion();}else if(action==='tomorrow'){layout.close();dialog='tomorrow';}else if(action==='manual'){layout.close();if(s.firstNight.manualUnlocked){dialog='manual';manualPage=0;s.firstNight.manualRead=true;}}else if(action==='guest-book'){layout.close();dialog='guest-book';guestPage=0;}else if(action==='opening'){layout.close();startOpening(true);}else if(action==='mute')sound.mute();else if(action==='pause'){paused=!paused;scene.paused=paused;}else if(action==='sound')sound.toggle();else if(action==='motion'){reducedMotion=!reducedMotion;document.body.classList.toggle('reduced-motion',reducedMotion);try{localStorage.setItem('puppy-mart.motion.v1',reducedMotion?'reduced':'full');}catch{}}else if(action==='replay'){panel.querySelector<HTMLButtonElement>('[data-do="replay"]')?.click();const replay=new Tutorial('puppy-mart.tutorial-replay.v1');writeStore(replay.key,{version:1,step:0,status:'active'},replay.writable);const old=loadSession('puppy-mart.training-session.v1');writeStore('puppy-mart.training-session.v1',snapshot(new ShopSimulation()),old.writable);location.href='?training=1';}saveProgress();render();};
layout.onChange=()=>{resetMovement();lastSignature='';render();};
layout.mount();
let resizeFrame=0;
const resizeCanvas=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{const bounds=gameElement.getBoundingClientRect();const width=Math.floor(bounds.width),height=Math.floor(bounds.height);if(game.isBooted&&width>0&&height>0){resetMovement();game.scale.setParentSize(width,height);scene.cameras?.main?.setSize(width,height);scene.cameras?.main?.setZoom(Math.max(1,width/512,height/640));scene.cameras?.main?.centerOn(s.player.x,s.player.y);}});};
new ResizeObserver(resizeCanvas).observe(gameElement);window.addEventListener('resize',resizeCanvas);game.events.once('ready',resizeCanvas);
