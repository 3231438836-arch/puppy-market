import Phaser from 'phaser';
import { fixtures, ShopSimulation, TILE, WIDTH, HEIGHT } from './world';
import style from '../data/store-style.json';
export class SimulationScene extends Phaser.Scene {
  shop = new ShopSimulation();
  guideTarget: {x:number;y:number}|null=null;
  highlightPlayer=false;
  private guide!: Phaser.GameObjects.Graphics;
  activePlay = false;
  paused = false;
  modal = false;
  joystick = { x: 0, y: 0 };
  onRefresh: () => void = () => {};
  onInteract: () => void = () => {};
  private playerSprite!: Phaser.GameObjects.Image;
  private customerSprite!: Phaser.GameObjects.Image;
  private heldBox!: Phaser.GameObjects.Image;
  private stockGraphics!: Phaser.GameObjects.Graphics;
  private stockLabels: Partial<Record<'milk' | 'bread', Phaser.GameObjects.Text>> = {};
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;
  private facing = 'down';
  constructor() { super('simulation'); }
  create() {
    this.makeSprites();
    const floor = this.add.graphics();
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const wall = x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1;
      floor.fillStyle(wall ? 0x6b756b : (x + y) % 2 ? 0xe6d6b7 : 0xefdfc2).fillRect(x*TILE,y*TILE,TILE,TILE);
      if(wall) floor.fillStyle(0x8e9a89).fillRect(x*TILE,y*TILE,TILE,5);
    }
    this.label(256, 25, 'P U P P Y   M A R T', '#fff0cd');
    const zones = this.add.graphics();
    zones.fillStyle(0xcbb597).fillRect(32,32,112,132);
    zones.fillStyle(0x739189).fillRect(7*TILE,18*TILE,2*TILE,20);
    this.label(8*TILE,18*TILE+9,'入口 / 出口','#fff5dc');
    this.label(80,47,'仓库区');
    for (const f of fixtures) {
      const g = this.add.graphics().setDepth(f.y*TILE+f.h*TILE-10);
      const x=f.x*TILE,y=f.y*TILE,w=f.w*TILE,h=f.h*TILE;
      g.fillStyle(0x453c35,.15).fillRect(x+4,y+5,w,h);
      g.fillStyle(f.id==='freezer'?0x73999e:f.id==='stairs'?0x999383:0x9d7757).fillRect(x,y,w,h);
      g.fillStyle(f.id==='freezer'?0xb8d9d9:0xc7a37b).fillRect(x+3,y+3,w-6,h-9);
      if(f.id==='milk'||f.id==='bread') {
        for(let row=1;row<3;row++)g.fillStyle(0x886044).fillRect(x,y+row*32-3,w,5);
        this.stockLabels[f.id]=this.add.text(x+w/2,y-15,'',{fontSize:'11px',color:'#493a32',backgroundColor:'#fff5df'}).setOrigin(.5).setDepth(1000);
      } else if(f.id==='warehouse') {
        for(let i=0;i<3;i++){g.fillStyle(0x98704e).fillRect(x+6+i*29,y+12,23,33);g.fillStyle(0xe3c49a).fillRect(x+15+i*29,y+12,5,33);}
      } else if(f.id==='counter') {
        g.fillStyle(0x476966).fillRect(x+34,y+4,24,17);g.fillStyle(0xbcd2b8).fillRect(x+38,y+6,15,7);
        style.counterSticker.colors.forEach((c,i)=>g.fillStyle(c).fillRect(x+75,y+5+i*3,14,3));
      } else if(f.id==='stairs') {
        for(let i=0;i<5;i++)g.fillStyle(i%2?0xb6ad98:0x807c70).fillRect(x+6,y+6+i*10,w-12,7);
      } else {g.lineStyle(2,0xf4f1df).strokeRect(x+5,y+5,w-10,h-10);}
      this.label(x+w/2,y+h+10,f.label);
      zones.lineStyle(1,0x7f9e8c,.7).strokeCircle(f.spot.x,f.spot.y,12);
    }
    const book=this.add.graphics().setDepth(450);book.fillStyle(0x70523d).fillRect(258,420,18,14).fillStyle(0xe9d7ad).fillRect(260,421,14,10).fillStyle(0x9b7353).fillRect(267,421,1,10);
    this.label(240,386,'员工须知', '#70523d');
    this.guide=this.add.graphics().setDepth(1500);
    this.stockGraphics=this.add.graphics().setDepth(400);
    this.customerSprite=this.add.image(this.shop.customer.x,this.shop.customer.y,'customer-down-0').setOrigin(.5,.85).setVisible(false);
    this.heldBox=this.add.image(0,0,'crate').setVisible(false);
    this.playerSprite=this.add.image(this.shop.player.x,this.shop.player.y,'dog-down-0').setOrigin(.5,.85);
    this.cameras.main.setBounds(0,0,WIDTH*TILE,HEIGHT*TILE).startFollow(this.playerSprite,true,.15,.15).setRoundPixels(true);
    this.cursors=this.input.keyboard?.createCursorKeys();
    this.keys=this.input.keyboard?.addKeys('W,A,S,D,E',false) as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.keyboard?.on('keydown-E',(event:KeyboardEvent)=>{if(!event.repeat&&this.activePlay&&!this.paused&&!this.modal)this.onInteract();});
    window.addEventListener('blur',this.resetInput);
    this.events.once('shutdown',()=>window.removeEventListener('blur',this.resetInput));
    this.onRefresh();
  }
  resetInput = () => { this.joystick={x:0,y:0};this.input.keyboard?.resetKeys(); };
  private label(x:number,y:number,text:string,color='#574b3c') {
    return this.add.text(x,y,text,{fontSize:'11px',color,fontFamily:'sans-serif'}).setOrigin(.5).setDepth(1000);
  }
  private makeSprites() {
    const crate=this.make.graphics({x:0,y:0});
    crate.fillStyle(0x9d7650).fillRect(0,0,18,15).fillStyle(0xc4a16d).fillRect(1,1,16,12).fillStyle(0xe6d1a1).fillRect(7,1,4,12);
    crate.generateTexture('crate',18,15);crate.destroy();
    for(const animal of ['dog','customer'])for(const direction of ['up','down','left','right'])for(let step=0;step<3;step++){
      const g=this.make.graphics({x:0,y:0});
      const dog=animal==='dog',fur=dog?0xb59468:0xe1ddcb,light=dog?0xd2b68b:0xf1ecda;
      const side=direction==='left'||direction==='right',up=direction==='up';
      g.fillStyle(0x5c4c3c,.18).fillEllipse(16,35,22,7);
      g.fillStyle(fur).fillRect(10,23,12,10);
      g.fillStyle(0x8c7556).fillRect(10,32+(step===1?1:0),5,4).fillRect(18,32+(step===2?1:0),5,4);
      if(dog){
        g.fillStyle(fur).fillRect(3,2,3,6).fillRect(3,8,7,7).fillRect(5,15,9,6).fillRect(26,2,3,6).fillRect(22,8,7,7).fillRect(18,15,9,6);
        g.fillStyle(0xb48e82).fillRect(5,7,2,5).fillRect(7,12,3,6).fillRect(25,7,2,5).fillRect(22,12,3,6);
      }else{
        g.fillStyle(fur).fillRect(side?10:5,2,7,23).fillRect(side?19:21,2,7,23);
        g.fillStyle(0xb48e82).fillRect(side?12:7,5,3,9).fillRect(side?21:23,5,3,9);
      }
      g.fillStyle(fur).fillRect(side?8:5,14,side?19:23,13).fillRect(9,11,15,17);
      if(!up){
        g.fillStyle(light).fillRect(side?(direction==='right'?21:4):11,21,side?7:11,6);
        g.fillStyle(0x453a30);
        if(side)g.fillCircle(direction==='right'?22:10,18,2);else g.fillCircle(11,18,2).fillCircle(22,18,2);
        g.fillRect(side?(direction==='right'?27:4):15,23,3,2);
      }
      g.fillStyle(style.managerOutfit.shirtColor).fillRect(10,28,13,5);
      if(!up&&dog)g.fillStyle(0xb8c6ad).fillRect(side?14:12,28,side?5:9,5);
      if(up)g.fillStyle(fur).fillRect(22,29,4,3);
      g.generateTexture(`${animal}-${direction}-${step}`,32,40);g.destroy();
    }
  }
  update(time:number,delta:number) {
    if(!this.playerSprite)return;
    const dt=Math.min(delta/1000,.05),s=this.shop;
    let x=0,y=0;
    if(this.activePlay&&!this.paused&&!this.modal&&!s.closed){
      x=this.joystick.x+(this.keys?.D.isDown||this.cursors?.right.isDown?1:0)-(this.keys?.A.isDown||this.cursors?.left.isDown?1:0);
      y=this.joystick.y+(this.keys?.S.isDown||this.cursors?.down.isDown?1:0)-(this.keys?.W.isDown||this.cursors?.up.isDown?1:0);
      s.movePlayer(x,y,dt);s.tick(dt);
    }
    if(x||y)this.facing=Math.abs(x)>Math.abs(y)?x>0?'right':'left':y>0?'down':'up';
    const frame=x||y?1+Math.floor(time/150)%2:0;
    this.playerSprite.setPosition(s.player.x,s.player.y).setDepth(s.player.y).setTexture(`dog-${this.facing}-${frame}`);
    this.heldBox.setVisible(!!s.carrying).setPosition(s.player.x+11,s.player.y-5).setDepth(s.player.y+1).setTint(s.carrying?.goods==='milk'?0xecf0df:0xeac28e);
    const cx=s.customer.x-this.customerSprite.x,cy=s.customer.y-this.customerSprite.y;
    const direction=Math.abs(cx)>Math.abs(cy)?cx>0?'right':'left':cy>0?'down':'up';
    this.customerSprite.setVisible(s.customerState!=='outside'&&s.customerState!=='gone').setPosition(s.customer.x,s.customer.y).setDepth(s.customer.y).setTexture(`customer-${cx||cy?direction:'down'}-${cx||cy?1+Math.floor(time/160)%2:0}`);
    this.stockGraphics.clear();
    for(const goods of ['milk','bread'] as const){
      const f=fixtures.find(f=>f.id===goods)!;
      for(let i=0;i<s.shelves[goods];i++){
        const x=f.x*TILE+10+(i%2)*27,y=f.y*TILE+7+Math.floor(i/2)*29;
        this.stockGraphics.fillStyle(goods==='milk'?0xe8efe4:0xd7a66e).fillRect(x,y,16,20).fillStyle(goods==='milk'?0x729b9d:0x986f47).fillRect(x+3,y+8,10,5);
      }
      this.stockLabels[goods]?.setText(`${goods==='milk'?'牛奶':'面包'} ${s.shelves[goods]}/${s.capacity}`);
    }
    this.guide.clear();
    if(this.guideTarget){const p=this.guideTarget;const pulse=matchMedia('(prefers-reduced-motion: reduce)').matches?1:.8+Math.sin(time/230)*.2;
      this.guide.lineStyle(3,0xc96e43,pulse).strokeCircle(p.x,p.y,20);this.guide.fillStyle(0xb75a36,pulse).fillRect(p.x-3,p.y-43,6,14).fillTriangle(p.x-8,p.y-30,p.x+8,p.y-30,p.x,p.y-22);
      if(this.highlightPlayer)this.guide.lineStyle(2,0xffffe5).strokeRect(s.player.x-17,s.player.y-35,34,39);
    }
    const el=document.querySelector<HTMLElement>('#game')!;
    el.dataset.playerX=String(s.player.x);el.dataset.playerY=String(s.player.y);
    this.onRefresh();
  }
}
