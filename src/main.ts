import Phaser from 'phaser';
import { StoreScene } from './scene';
import { Shift, products } from './model';
import './style.css';
const scene=new StoreScene();
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:430,height:420,backgroundColor:'#f0ddba',pixelArt:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});
const panel=document.querySelector<HTMLElement>('#controls')!;
let shift:Shift|null=null,paused=false, settled=false, message='', day=1;
let last=performance.now();
const names=(ids:string[])=>ids.length?ids.map(id=>products.find(p=>p.id===id)!.name).join(' + '):'还没选商品';
function start(){scene.nextCustomer(0);shift=new Shift();paused=false;settled=false;message='先看订单，再点下方货架。前两位顾客只买一件！';last=performance.now();render();}
function render(){
  if(!shift){panel.innerHTML=`<div class="eyebrow">WARM LITTLE CORNER SHOP</div><h1>小狗便利店</h1><p>吉娃娃店长，准备开门啦。<br>看清顾客订单，点击货架配货，再按「结账」。</p><div class="tag">120 秒营业 · 单指操作 · 无广告</div><button class="primary wide" data-action="start">开始第 ${day} 天营业 →</button><p class="muted">连续正确结账可获额外金币；配错扣 3 秒，可继续调整。<br>本次试玩进度仅保留到关闭页面。</p>`;return;}
  if(shift.closed){if(!settled){settled=true;day++;}panel.innerHTML=`<div class="eyebrow">CLOSED · 辛苦啦，店长</div><h1>今日打烊</h1><div class="summary"><p>本日收入</p><h1 data-testid="total-coins">${shift.coins} 金币</h1><div class="stats"><div class="stat">完成订单<b>${shift.served}</b></div><div class="stat">最高连击<b>${shift.bestCombo}</b></div><div class="stat">配货失误<b>${shift.mistakes}</b></div></div><p>金币已计入本日营业收入。再开一天，试试更高连击！</p></div><button class="primary wide" data-action="start">开始第 ${day} 天营业 →</button><p class="muted">P0 暂不包含升级、存档、剧情与广告。</p>`;return;}
  panel.innerHTML=`<div class="stats"><div class="stat">剩余时间<b data-testid="timer">${Math.ceil(shift.remaining)}s</b></div><div class="stat">本日金币<b data-testid="coins">${shift.coins}</b></div><div class="stat">连续正确<b data-testid="combo">${shift.combo} 连击</b></div></div><button class="pause" data-action="pause">${paused?'继续营业':'暂停'}</button><div class="eyebrow">ORDER No. ${String(shift.served+1).padStart(2,'0')}</div><div class="order"><p>${shift.served%2?'兔子':'白猫'}顾客的订单</p><strong data-testid="order" data-items="${shift.order.join(',')}">${names(shift.order)}</strong></div><div class="hint" role="status">${paused?'已暂停，点「继续营业」恢复计时。':message}</div><div class="products">${products.map(p=>`<button class="product" data-product="${p.id}" ${paused?'disabled':''}>${p.name}<small>${p.price} 金币</small></button>`).join('')}</div><div class="basket" data-testid="basket">购物篮：${names(shift.basket)} <small>(${shift.basket.length}/3)</small></div><div class="actions"><button data-action="undo">撤销</button><button data-action="clear">清空</button><button class="primary" data-action="checkout">结账 ✓</button></div>`;
}
panel.addEventListener('click',event=>{
 const button=(event.target as HTMLElement).closest('button');if(!button)return;
 const action=button.dataset.action;
 if(action==='start'){start();return;}
 if(!shift||shift.closed)return;
 if(action==='pause'){paused=!paused;last=performance.now();render();return;}
 if(paused)return;
 if(button.dataset.product){shift.select(button.dataset.product);message='核对购物篮，配齐后点击结账。';}
 if(action==='undo')shift.undo();if(action==='clear')shift.clear();
 if(action==='checkout'){
  const result=shift.checkout();
  if(!result)message='请先选择商品。';
  else if(result.correct){message=`结账成功 +${result.reward} 金币！${shift.combo>1?'连击奖励已计入。':''}`;scene.celebrate();scene.nextCustomer(shift.served);}
  else message='商品不匹配，扣 3 秒。请撤销或清空后重新配货。';
 }
 render();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&shift&&!shift.closed){paused=true;render();}last=performance.now();});
setInterval(()=>{const now=performance.now(),elapsed=(now-last)/1000;last=now;if(shift&&!paused&&!shift.closed){shift.tick(elapsed);if(shift.closed)render();else {const timer=panel.querySelector('[data-testid="timer"]');if(timer)timer.textContent=`${Math.ceil(shift.remaining)}s`;}}},100);
render();
