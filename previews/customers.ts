import Phaser from 'phaser';
import {makeCustomerTextures,appearanceTexture} from '../src/simulation/customer-art';
import {customerAppearances} from '../src/simulation/customer-appearance';
let direction='down';
class Gallery extends Phaser.Scene{
 sprites:Phaser.GameObjects.Image[]=[];
 create(){makeCustomerTextures(this);customerAppearances.forEach((a,i)=>{const x=120+(i%3)*240,y=90+Math.floor(i/3)*170;
  this.sprites.push(this.add.image(x,y,appearanceTexture(a.id,'down',0)).setScale(3));
  this.add.text(x,y+65,`${a.label} · ${a.pattern}`,{fontSize:'16px',color:'#574b3c'}).setOrigin(.5);
 });document.body.dataset.ready='true';}
 update(time:number){this.sprites.forEach((sprite,i)=>sprite.setTexture(appearanceTexture(customerAppearances[i].id,direction,1+Math.floor(time/200)%2)));}
}
new Phaser.Game({type:Phaser.AUTO,parent:'gallery',width:720,height:1040,pixelArt:true,backgroundColor:'#efdfc2',scene:[Gallery],audio:{noAudio:true}});
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(b=>b.onclick=()=>{direction=b.dataset.direction!;document.body.dataset.direction=direction;});
