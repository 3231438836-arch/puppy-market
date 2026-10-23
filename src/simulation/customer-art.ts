import type Phaser from 'phaser';
import {customerAppearances,type CustomerAppearance} from './customer-appearance';
export const appearanceTexture=(id:string,direction:string,frame:number)=>`ordinary-${id}-${direction}-${frame}`;
/** Shared 32×40 pixel frame, original silhouettes; no runtime recolouring or per-frame canvas allocation. */
export function drawCustomer(g:Phaser.GameObjects.Graphics,a:CustomerAppearance,direction:string,step:number){
 const c=(s:string)=>Number.parseInt(s.slice(1),16),fur=c(a.fur),light=c(a.light),shirt=c(a.clothes);
 const side=direction==='left'||direction==='right',right=direction==='right',up=direction==='up';
 const rect=(color:number,x:number,y:number,w:number,h:number)=>g.fillStyle(color).fillRect(x,y,w,h);
 g.fillStyle(0x5c4c3c,.18).fillEllipse(16,36,24,5);
 // Species-specific tails and back silhouettes are drawn behind the body.
 if(a.species==='squirrel'){
  const tx=side?(right?0:22):22;
  rect(0x665747,tx+2,10,8,25);rect(fur,tx+2,6,6,4);rect(fur,tx,10,10,18);rect(fur,tx+2,28,8,6);
  rect(light,tx+3,10,4,13);rect(fur,tx+4,16,4,7);
 }
 if(a.species==='cat'){rect(fur,side?(right?4:25):25,25,3,10);rect(fur,side?(right?3:26):26,23,3,5);}
 if(a.species==='hedgehog'){
  rect(fur,4,16,24,17);for(let i=0;i<6;i++){rect(0x62584d,4+i*4,14-(i%2)*2,3,10);rect(light,5+i*4,17,1,3);}
 }
 rect(fur,9,23,15,11);
 if(a.species==='rabbit'){
  rect(fur,side?11:6,2,6,17);rect(fur,side?18:21,3,6,17);rect(0xc6a593,side?13:8,5,2,10);rect(0xc6a593,side?20:23,6,2,9);
 }else if(a.species==='cat'){
  rect(fur,5,7,7,11);rect(fur,22,7,6,11);rect(fur,7,5,3,3);rect(fur,24,5,2,3);rect(0xc39f94,7,10,3,5);rect(0xc39f94,23,10,3,5);
 }else if(a.species==='small-dog'){
  rect(fur,3,13,6,15);rect(fur,25,13,5,15);rect(0x7d6857,4,17,4,11);rect(0x7d6857,25,17,4,11);
 }else if(a.species==='squirrel'){
  rect(fur,7,8,5,10);rect(fur,22,8,5,10);rect(light,8,10,2,5);rect(light,23,10,2,5);
 }
 const headY=a.species==='duck'?12:14;
 rect(fur,side?8:6,headY,side?19:22,13);rect(fur,10,headY-2,14,17);
 if(a.species==='hedgehog'){rect(light,side?(right?17:6):9,20,side?12:17,9);rect(light,side?(right?22:4):11,23,side?7:12,5);}
 if(a.species==='hedgehog'){
  for(let i=0;i<6;i++){const x=4+i*4,y=11-(i%2)*2;rect(fur,x,y,3,6);rect(0xb9a68a,x+1,y+1,1,3);}
  rect(fur,2,18,3,13);rect(fur,28,18,3,13);rect(0xb9a68a,3,19,1,4);rect(0xb9a68a,29,19,1,4);
 }
 if(a.pattern==='calico'||a.pattern==='patch'||a.pattern==='spotted'){rect(0x927455,side?(right?9:20):6,14,7,8);rect(0x927455,18,26,4,6);}
 if(a.species==='cat'&&(a.pattern==='ginger'||a.pattern==='grey')){rect(0x786753,13,13,2,4);rect(0x786753,18,13,2,3);}
 if(a.species==='duck'&&a.pattern==='mottled')rect(0x6d7f72,9,14,14,5);
 if(!up){
  if(a.species!=='hedgehog')rect(light,side?(right?21:5):10,22,side?7:14,6);
  rect(0x403b32,side?(right?22:9):10,18,2,3);if(!side)rect(0x403b32,22,18,2,3);
  if(a.species==='duck')rect(0xbd9865,side?(right?25:2):12,23,side?6:10,4);
  else rect(0x5c4b40,side?(right?27:4):15,25,3,2);
  if(a.species==='cat'){rect(0x8d7964,side?(right?25:3):4,23,4,1);rect(0x8d7964,side?(right?25:3):24,26,4,1);}
 }
 rect(shirt,9,29,15,6);rect(light,10,35+(step===1?1:0),4,2);rect(light,20,35+(step===2?1:0),4,2);
 if(a.species==='duck'){rect(0xbd9865,8,36+(step===1?1:0),6,2);rect(0xbd9865,20,36+(step===2?1:0),6,2);}
 if(a.accessory==='scarf'){rect(0xc09b7c,8,28,17,3);rect(0xc09b7c,side?(right?10:22):21,30,3,5);}
 if(a.accessory==='backpack'){
  if(up){rect(0x6e6555,11,28,12,8);rect(0xb2a083,13,29,8,5);}else if(side){rect(0x6e6555,right?6:24,27,4,8);}else{rect(0x6e6555,10,29,2,6);rect(0x6e6555,21,29,2,6);}
 }
 if(a.accessory==='cap'){const capY=a.species==='rabbit'?13:11;rect(shirt,9,capY,15,4);rect(0x66776b,right?20:5,capY+3,9,2);}
}
export function makeCustomerTextures(scene:Phaser.Scene){
 for(const a of customerAppearances)for(const direction of ['up','down','left','right'])for(let step=0;step<3;step++){
  const g=scene.make.graphics({x:0,y:0});drawCustomer(g,a,direction,step);g.generateTexture(appearanceTexture(a.id,direction,step),32,40);g.destroy();
 }
}
