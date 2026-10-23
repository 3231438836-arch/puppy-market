import content from '../data/tutorial.json';
import { center, fixtures, type Point, type ShopSimulation } from './world';
import { readStore, writeStore } from './persistence';
export { content as tutorialContent };
export const TUTORIAL_KEY='puppy-mart.tutorial.v1';
export interface TutorialRecord {version:1;step:number;status:'active'|'completed'|'skipped'}
export class Tutorial {
 record:TutorialRecord;writable=true;warning='';
 constructor(readonly key=TUTORIAL_KEY,hasSession=true){const saved=readStore(key,():TutorialRecord=>({version:1,step:0,status:'active'}),validTutorial);this.record=saved.value;this.writable=saved.writable;this.warning=saved.warning;if(!hasSession&&this.active&&this.record.step>0)this.record.step=0;}
 get active(){return this.record.status==='active';}
 get step(){return this.record.step;}
 get text(){return content.steps[this.step];}
 observe(shop:ShopSimulation,event?:'notebook'|'take'|'restock'|'review'){
  if(!this.active)return false;let advance=false;
  switch(this.step){
   case 0:advance=Math.hypot(shop.player.x-center(7,16).x,shop.player.y-center(7,16).y)<20;break;
   case 1:advance=event==='notebook'&&shop.nearby==='notebook';break;
   case 2:advance=event==='take'&&shop.carrying?.goods==='milk';break;
   case 3:advance=event==='restock'&&shop.shelves.milk>0;break;
   case 4:advance=shop.customerState==='queueing'&&!shop.path.length;break;
   case 5:advance=shop.served>0;break;
   case 6:advance=shop.closed;break;
   case 7:advance=event==='review'&&shop.closed;break;
  }
  if(advance){this.record.step++;if(this.step===8)this.record.status='completed';this.save();}return advance;
 }
 skip(){this.record.status='skipped';this.save();}
 save(){return writeStore(this.key,this.record,this.writable);}
 target(shop:ShopSimulation):Point|null{
  if(!this.active)return null;
  if(this.step===0)return center(7,16);
  if(this.step===1)return center(7,12);
  const id=this.step===2?'warehouse':this.step===3?'milk':this.step===4?'counter':this.step===5?'counter':null;
  return id?fixtures.find(f=>f.id===id)!.spot:shop.player;
 }
}
export function validTutorial(value:unknown):value is TutorialRecord{
 if(!value||typeof value!=='object')return false;const v=value as TutorialRecord;
 return v.version===1&&Number.isInteger(v.step)&&v.step>=0&&v.step<=8&&['active','completed','skipped'].includes(v.status)&&(v.status!=='completed'||v.step===8)&&(v.status!=='active'||v.step<8);
}
