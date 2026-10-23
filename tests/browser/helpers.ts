import { type Page } from '@playwright/test';
import { findPath, type Point } from '../../src/simulation/world';
export async function position(page:Page):Promise<Point>{return page.locator('#game').evaluate(el=>({x:Number((el as HTMLElement).dataset.playerX),y:Number((el as HTMLElement).dataset.playerY)}));}
export async function walk(page:Page,target:Point){
 const start=await position(page);const path=findPath(start,target);
 // Use actual keyboard events through the same aisles as the customer; no state teleporting.
 const corners:Point[]=[];
 for(let i=0;i<path.length;i++){
  const before=i===0?start:path[i-1],p=path[i],after=path[i+1];
  if(!after||Math.sign(p.x-before.x)!==Math.sign(after.x-p.x)||Math.sign(p.y-before.y)!==Math.sign(after.y-p.y))corners.push(p);
 }
 for(const point of corners){
  for(const axis of ['x','y'] as const){
   const current=await position(page),difference=point[axis]-current[axis];if(Math.abs(difference)<3)continue;
   const key=axis==='x'?(difference>0?'d':'a'):(difference>0?'s':'w');
   await page.keyboard.down(key);
   try{await page.waitForFunction(({axis,target,sign})=>{const element=document.querySelector<HTMLElement>('#game')!;const value=Number(axis==='x'?element.dataset.playerX:element.dataset.playerY);return sign>0?value>=target-2:value<=target+2;},{axis,target:point[axis],sign:Math.sign(difference)},{timeout:10000,polling:'raf'});}
   finally{await page.keyboard.up(key);}
  }
 }
}
