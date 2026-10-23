import Phaser from 'phaser';
export class StoreScene extends Phaser.Scene {
  private customer?: Phaser.GameObjects.Container;
  private dog?: Phaser.GameObjects.Container;
  constructor() { super('store'); }
  create() {
    const g = this.add.graphics();
    g.fillStyle(0xf0ddba).fillRect(0,0,430,420);
    g.fillStyle(0xc4d4ce).fillRect(0,0,430,60);
    for (let x=0;x<430;x+=43) { g.fillStyle(x%86===0?0xd97967:0xf9e6be).fillRect(x,52,43,25); }
    this.add.text(215,22,'P U P P Y   M A R T',{fontFamily:'monospace',fontSize:'22px',color:'#423d35',fontStyle:'bold'}).setOrigin(.5);
    g.fillStyle(0x92b1b3).fillRect(24,94,110,119);
    g.fillStyle(0xcce0da).fillRect(30,100,98,107);
    g.fillStyle(0xf9e8b2).fillCircle(102,125,16);
    g.fillStyle(0x74958a).fillRect(30,174,98,33);
    g.fillStyle(0xeee0c3).fillRect(76,100,5,107).fillRect(30,151,98,5);
    // Pixel shelf, with original miniature packs.
    g.fillStyle(0x8b624b).fillRect(157,96,248,123);
    g.fillStyle(0xf2c991).fillRect(164,102,234,110);
    for(let row=0;row<2;row++) {
      for(let col=0;col<8;col++) {
        const colors=[0xe8f1e7,0xe7ab69,0xeee8ce,0xd47a67];
        const x=172+col*28,y=112+row*52;
        g.fillStyle(colors[col%4]).fillRect(x,y,18,30);
        g.fillStyle(0x567876).fillRect(x+3,y+10,12,8);
        g.fillStyle(0xfff2da).fillRect(x+3,y+3,12,4);
      }
      g.fillStyle(0x966b50).fillRect(163,146+row*52,235,7);
    }
    g.fillStyle(0xddc8a6).fillRect(0,226,430,194);
    for(let y=228;y<420;y+=32) for(let x=0;x<430;x+=43) { if((x/43+(y-228)/32)%2===0) g.fillStyle(0xe7d5b7).fillRect(x,y,42,31); }
    this.customer=this.animal(117,267,'cat');
    this.dog=this.animal(310,277,'dog');
    g.fillStyle(0x694d3e).fillRect(18,308,394,91);
    g.fillStyle(0xb98c67).fillRect(18,318,394,77);
    g.fillStyle(0xe4b588).fillRect(10,300,410,22);
    g.fillStyle(0xeccba0).fillRect(30,330,370,3);
    g.fillStyle(0x5b7e79).fillRect(42,345,91,34);
    this.add.text(87,362,'OPEN',{fontFamily:'monospace',fontSize:'18px',color:'#fff1d0'}).setOrigin(.5);
    g.fillStyle(0x6c8181).fillRect(227,281,47,20).fillRect(235,254,34,30);
    g.fillStyle(0xbfd9bd).fillRect(240,259,24,15);
    g.fillStyle(0xe3bb85).fillRect(170,290,32,10);
    this.add.text(215,408,'—  一间小店，今天也请多关照  —',{fontSize:'11px',color:'#846a52'}).setOrigin(.5);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches) this.tweens.add({targets:this.dog,y:274,duration:850,yoyo:true,repeat:-1,ease:'Sine.inOut'});
  }
  private animal(x:number,y:number,kind:string) {
    const c=this.add.container(x,y),g=this.add.graphics();c.add(g);
    const dog=kind==='dog',rabbit=kind==='rabbit';
    const fur=dog?0xcf9a69: rabbit?0xd7baac:0xf2ebdc;
    g.fillStyle(0x54463d,0.14).fillEllipse(0,27,70,12);
    g.fillStyle(fur).fillRect(-22,-20,44,45);
    if(rabbit) g.fillRect(-20,-67,13,50).fillRect(7,-67,13,50);
    else { g.fillTriangle(-29,-25,-25,-59,-4,-28).fillTriangle(29,-25,25,-59,4,-28); }
    g.fillStyle(0xe2a6a0);
    if(rabbit) g.fillRect(-17,-59,7,29).fillRect(10,-59,7,29);
    else g.fillTriangle(-23,-29,-23,-49,-10,-29).fillTriangle(23,-29,23,-49,10,-29);
    g.fillStyle(fur).fillRect(-28,-31,56,42).fillRect(-21,-38,42,51);
    g.fillStyle(0x4b3b32).fillRect(-16,-19,6,8).fillRect(10,-19,6,8).fillRect(-3,-6,6,4);
    g.fillStyle(0xe6ac96).fillRect(-23,-5,9,4).fillRect(14,-5,9,4);
    g.fillStyle(dog?0x668c87:0xb68979).fillRect(-22,12,44,16);
    if(dog) g.fillStyle(0xf2e6c8).fillRect(-11,13,22,15);
    return c;
  }
  nextCustomer(served:number) {
    this.customer?.destroy();this.customer=this.animal(117,267,served%2?'rabbit':'cat');
    this.customer.alpha=0;this.tweens.add({targets:this.customer,alpha:1,duration:250});
  }
  celebrate() { if(this.dog)this.tweens.add({targets:this.dog,angle:{from:-5,to:5},duration:90,yoyo:true,repeat:2,onComplete:()=>this.dog?.setAngle(0)}); }
}
