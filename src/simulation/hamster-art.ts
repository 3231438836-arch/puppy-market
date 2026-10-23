import type Phaser from 'phaser';
/** A 22px dwarf hamster in the shared 32x40 frame; collision remains the common NPC size. */
export function makeHamsterTextures(scene:Phaser.Scene){
 const poses=[...['up','down','left','right'].flatMap(d=>[0,1,2].map(f=>({key:`hamster-${d}-${f}`,direction:d,frame:f,pose:'walk'}))),...[0,1].map(f=>({key:`hamster-reach-${f}`,direction:'up',frame:f,pose:'reach'})),{key:'hamster-inspect-0',direction:'down',frame:0,pose:'inspect'}];
 for(const p of poses){const g=scene.make.graphics({x:0,y:0}),side=p.direction==='left'||p.direction==='right',up=p.direction==='up',reach=p.pose==='reach'&&p.frame===1,dy=reach?-2:0;
  g.fillStyle(0x5c4c3c,.18).fillEllipse(16,36,22,5);
  g.fillStyle(0xa98e63).fillRect(8,29+dy,16,7).fillStyle(0xc5ad84).fillRect(6,20+dy,21,13).fillRect(9,17+dy,15,18);
  g.fillStyle(0xb59b76).fillCircle(9,18+dy,4).fillCircle(24,18+dy,4).fillStyle(0xd7c3ad).fillRect(8,16+dy,3,3).fillRect(23,16+dy,3,3);
  if(!up){g.fillStyle(0xe6ddc3).fillRect(side?(p.direction==='right'?20:6):10,27+dy,side?7:14,7);g.fillStyle(0xeee4cb);if(side)g.fillRect(p.direction==='right'?21:9,21+dy,4,2);else g.fillRect(9,21+dy,5,2).fillRect(20,21+dy,5,2);g.fillStyle(0x403b32);if(side)g.fillRect(p.direction==='right'?23:9,24+dy,2,3);else g.fillRect(11,24+dy,2,3).fillRect(21,24+dy,2,3);g.fillRect(side?(p.direction==='right'?26:6):16,29+dy,2,1);}
  g.fillStyle(0x78806b).fillRect(9,31+dy,15,5).fillStyle(0xa3a68b).fillRect(10,32+dy,4,3).fillRect(19,32+dy,4,3);g.fillStyle(0xeee0b6).fillRect(12,32+dy,1,1);
  g.fillStyle(0x806344).fillRect(23,p.pose==='inspect'?25+dy:31+dy,4,5).fillStyle(0xe4d5b1).fillRect(24,p.pose==='inspect'?26+dy:32+dy,2,3);
  if(p.pose==='reach')g.fillStyle(0xd5bf98).fillRect(5,reach?17:21,3,6).fillRect(25,reach?17:21,3,6);
  g.fillStyle(0x9c805e).fillRect(10,35+(p.frame===1?1:0),4,2).fillRect(20,35+(p.frame===2?1:0),4,2);
  g.generateTexture(p.key,32,40);g.destroy();
 }
}
