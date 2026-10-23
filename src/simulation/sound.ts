import {readStore,writeStore} from './persistence';
interface Settings{version:1;sound:boolean}
const KEY='puppy-mart.settings.v1';
const saved=readStore(KEY,():Settings=>({version:1,sound:true}),(v):v is Settings=>!!v&&typeof v==='object'&&(v as Settings).version===1&&typeof(v as Settings).sound==='boolean');
export class Sound {
 enabled=saved.value.sound;private context:AudioContext|null=null;
 toggle(){this.enabled=!this.enabled;writeStore(KEY,{...saved.value,sound:this.enabled},saved.writable);}
 play(kind='scan'){
  if(!this.enabled)return;
  try{
   const Ctor=globalThis.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!Ctor)return;
   this.context??=new Ctor();const context=this.context;void context.resume().catch(()=>{});
   const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='square';oscillator.frequency.value=kind==='scan'?880:kind==='sale'?1046:660;
   gain.gain.setValueAtTime(.035,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.09);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.1);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }catch{/* Audio restrictions must not block a transaction. */}
 }
}
