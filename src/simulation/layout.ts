import {readStore,writeStore} from './persistence';
export type Orientation='portrait'|'landscape';
export const LAYOUT_KEY='puppy-mart.layout.v1';
export interface LayoutPreferences {version:1;selected:boolean;preferred:Orientation;joystickSize:number;buttonSize:number;joystickInset:number;sensitivity?:number}
export function defaultLayout():LayoutPreferences{return{version:1,selected:false,preferred:'portrait',joystickSize:120,buttonSize:78,joystickInset:18,sensitivity:1};}
export function viewportOrientation(width:number,height:number):Orientation{return width>height?'landscape':'portrait';}
export function validLayout(value:unknown):value is LayoutPreferences{
 if(!value||typeof value!=='object')return false;const v=value as LayoutPreferences;
 return v.version===1&&typeof v.selected==='boolean'&&['portrait','landscape'].includes(v.preferred)&&[110,120,130].includes(v.joystickSize)&&[68,74,78,80].includes(v.buttonSize)&&[12,18,32].includes(v.joystickInset)&&(v.sensitivity===undefined||[.75,1,1.3].includes(v.sensitivity));
}
export class LayoutController {
 private saved=readStore(LAYOUT_KEY,defaultLayout,validLayout);
 preferences={...this.saved.value,sensitivity:this.saved.value.sensitivity??1};
 gameControls:()=>string=()=>'';
 onGameAction:(action:string)=>void=()=>{};
 refresh(){if(this.open)this.render();}
 open=false;
 onChange:()=>void=()=>{};
 private kind:'choice'|'settings'='choice';
 private root!:HTMLDivElement;
 private hint!:HTMLDivElement;
 private dismissed=false;
 private actual:Orientation=viewportOrientation(innerWidth,innerHeight);
 mount(){
  this.root=document.createElement('div');this.root.id='layout-modal';this.root.hidden=true;this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');document.body.append(this.root);
  this.hint=document.createElement('div');this.hint.id='rotation-hint';this.hint.hidden=true;document.querySelector('#app')!.append(this.hint);
  this.hint.addEventListener('click',()=>{this.dismissed=true;this.apply();});
  this.root.addEventListener('click',e=>{
   const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
   if(button.dataset.gameAction){this.onGameAction(button.dataset.gameAction);this.render();}
   if(button.dataset.preference){this.preferences.preferred=button.dataset.preference as Orientation;this.preferences.selected=true;this.dismissed=false;this.save();if(this.kind==='choice')this.close();else this.render();this.apply();}
   if(button.dataset.layoutClose!==undefined)this.close();
  });
  this.root.addEventListener('change',e=>{const control=e.target as HTMLSelectElement;const field=control.dataset.layoutField as 'joystickSize'|'buttonSize'|'joystickInset'|'sensitivity'|undefined;if(field){const candidate={...this.preferences,[field]:Number(control.value)};if(validLayout(candidate)){this.preferences=candidate;this.save();this.apply();}}});
  document.addEventListener('keydown',e=>{if(this.open&&this.kind==='settings'&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();}},true);
  window.addEventListener('resize',this.resize);window.addEventListener('orientationchange',this.resize);window.visualViewport?.addEventListener('resize',this.resize);
  this.apply();if(!this.preferences.selected)this.show('choice');
 }
 private resize=()=>{const actual=viewportOrientation(innerWidth,innerHeight);if(actual!==this.actual)this.dismissed=false;this.actual=actual;this.apply();};
 private save(){if(!writeStore(LAYOUT_KEY,this.preferences,this.saved.writable)&&this.saved.writable)this.saved.warning='当前浏览器无法保存布局偏好，本次仍可使用。';}
 apply(){
  document.body.dataset.orientation=this.actual;
  const style=document.documentElement.style;style.setProperty('--joystick-size',this.preferences.joystickSize+'px');style.setProperty('--interaction-size',this.preferences.buttonSize+'px');style.setProperty('--joystick-inset',this.preferences.joystickInset+'px');
  if(this.hint){this.hint.hidden=!this.preferences.selected||this.preferences.preferred===this.actual||this.dismissed;this.hint.innerHTML=`你偏好${this.preferences.preferred==='portrait'?'竖屏':'横屏'}，旋转手机可切换。<button type="button">按当前方向继续</button>`;}
  this.onChange();
 }
 show(kind:'choice'|'settings'='settings'){this.kind=kind;this.open=true;this.root.hidden=false;document.body.classList.add('layout-settings-open');this.render();this.onChange();this.root.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});}
 close(){this.open=false;this.root.hidden=true;document.body.classList.remove('layout-settings-open');this.onChange();document.querySelector<HTMLButtonElement>('#layout-settings')?.focus({preventScroll:true});}
 private render(){
  this.root.setAttribute('aria-label',this.kind==='choice'?'游玩方式':'布局设置');
  const option=(value:number,label:string,field:'joystickSize'|'buttonSize'|'joystickInset'|'sensitivity')=>`<option value="${value}" ${this.preferences[field]===value?'selected':''}>${label}</option>`;
  this.root.innerHTML=`<section class="layout-sheet"><div class="dialog-heading"><h2>${this.kind==='choice'?'选择游玩方式':'布局与操作设置'}</h2>${this.kind==='settings'?'<button data-layout-close>返回游戏</button>':''}</div><div class="layout-choices"><button data-preference="portrait" aria-pressed="${this.preferences.selected&&this.preferences.preferred==='portrait'}"><b>竖屏</b><span>随时随地轻松经营</span></button><button data-preference="landscape" aria-pressed="${this.preferences.selected&&this.preferences.preferred==='landscape'}"><b>横屏</b><span>更宽视野，双手操作</span></button></div><p>画面跟随实际窗口方向，不会强制旋转手机。横竖屏共用同一份经营进度。</p>${this.kind==='settings'?`<div class="layout-fields"><label>摇杆区域<select data-layout-field="joystickSize">${[110,120,130].map(n=>option(n,n+' px','joystickSize')).join('')}</select></label><label>互动按钮大小<select data-layout-field="buttonSize">${[68,74,78,80].map(n=>option(n,n+' px','buttonSize')).join('')}</select></label><label>摇杆灵敏度<select data-layout-field="sensitivity">${option(.75,'柔和','sensitivity')}${option(1,'标准','sensitivity')}${option(1.3,'灵敏','sensitivity')}</select></label></div>`:''}${this.kind==='settings'?this.gameControls():''}<p class="muted">${this.saved.warning||'偏好单独保存在本机，不修改库存、资金或教程。'}</p></section>`;
 }
}
