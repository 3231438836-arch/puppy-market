import {readStore,writeStore} from './persistence';
interface Settings{version:1;sound:boolean;music?:number;effects?:number;muted?:boolean}
const KEY='puppy-mart.settings.v1';
export type Ambience='shop'|'dorm'|'opening';
/** Original procedural score: no samples, recordings or third-party melodies. */
const scores:Record<Ambience,number[]>={shop:[60,64,67,71,69,67,64,62,65,69,72,69,67,64,62,59],dorm:[48,55,60,64,62,55,59,62],opening:[55,62,64,67,62,60,59,55]};
export class Sound {
 private saved=readStore(KEY,():Settings=>({version:1,sound:true,music:.22,effects:.5,muted:false}),(v):v is Settings=>{if(!v||typeof v!=='object')return false;const s=v as Settings;return s.version===1&&typeof s.sound==='boolean'&&[s.music,s.effects].every(n=>n===undefined||Number.isFinite(n)&&n>=0&&n<=1)&&(s.muted===undefined||typeof s.muted==='boolean');});
 enabled=this.saved.value.sound;music=this.saved.value.music??.22;effects=this.saved.value.effects??.5;muted=this.saved.value.muted??false;
 private context:AudioContext|null=null;private channel:GainNode|null=null;private timer:ReturnType<typeof setInterval>|null=null;private next=0;private note=0;private ambience:Ambience='shop';
 private persist(){writeStore(KEY,{version:1,sound:this.enabled,music:this.music,effects:this.effects,muted:this.muted},this.saved.writable);}
 toggle(){this.enabled=!this.enabled;this.persist();}
 mute(){this.muted=!this.muted;this.volume();this.persist();}
 setVolume(kind:'music'|'effects',value:number){if(!Number.isFinite(value))return;this[kind]=Math.max(0,Math.min(1,value));this.volume();this.persist();}
 private volume(){if(this.context&&this.channel){const t=this.context.currentTime;this.channel.gain.cancelScheduledValues(t);this.channel.gain.setTargetAtTime(this.muted?0:this.music*.12,t,.15);}}
 unlock(){try{const Ctor=globalThis.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;if(!Ctor)return;this.context??=new Ctor();void this.context.resume().catch(()=>{});if(!this.channel)this.transition();if(!this.timer)this.timer=setInterval(()=>this.schedule(),150);this.schedule();}catch{/* Playback restrictions never block gameplay. */}}
 setScene(scene:Ambience){if(this.ambience===scene)return;this.ambience=scene;if(this.context)this.transition();}
 private transition(){const c=this.context!;const old=this.channel;if(old){old.gain.cancelScheduledValues(c.currentTime);old.gain.setTargetAtTime(0,c.currentTime,.2);setTimeout(()=>old.disconnect(),1300);}this.channel=c.createGain();this.channel.gain.value=0;this.channel.connect(c.destination);this.volume();this.note=0;this.next=c.currentTime+.04;}
 private tone(frequency:number,at:number,duration:number,volume:number,destination:AudioNode,type:OscillatorType='sine'){const c=this.context!;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+.025);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(destination);o.start(at);o.stop(at+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};}
 private schedule(){const c=this.context;if(!c||c.state!=='running'||!this.channel||document.hidden)return;const beat=this.ambience==='shop'?.65:.9;const notes=scores[this.ambience];if(this.next<c.currentTime)this.next=c.currentTime+.02;while(this.next<c.currentTime+.3){const note=notes[this.note%notes.length],hz=440*2**((note-69)/12);this.tone(hz,this.next,beat*.9,.34,this.channel,'triangle');if(this.note%4===0)this.tone(hz/2,this.next,beat*1.7,.25,this.channel);this.note++;this.next+=beat;}}
 suspend(){if(this.context)void this.context.suspend().catch(()=>{});}
 play(kind='scan'){if(!this.enabled||this.muted||this.effects===0)return;this.unlock();const c=this.context;if(!c)return;const sequence:Record<string,number[]>={scan:[880],sale:[660,880,1046],restock:[330,440],door:[784,659],page:[230,180],todo:[523,659,784]};try{(sequence[kind]??sequence.scan).forEach((hz,i)=>this.tone(hz,c.currentTime+i*.07,.13,this.effects*.055,c.destination,kind==='page'?'triangle':'sine'));}catch{}}
}
