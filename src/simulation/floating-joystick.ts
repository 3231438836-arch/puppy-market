export function joystickVector(dx:number,dy:number,radius=40,sensitivity=1){const length=Math.hypot(dx,dy),deadzone=6;if(length<=deadzone)return{x:0,y:0};const magnitude=Math.min(1,(length-deadzone)/Math.max(1,radius-deadzone)*sensitivity);return{x:dx/length*magnitude,y:dy/length*magnitude};}
export function joystickOrigin(x:number,y:number,width:number,height:number,size:number){const margin=size/2+6;return{x:Math.max(margin,Math.min(width-margin,x)),y:Math.max(margin,Math.min(height-margin,y))};}
export function mountFloatingJoystick(options:{surface:HTMLElement;visual:HTMLElement;allowed:()=>boolean;size:()=>number;sensitivity:()=>number;onMove:(x:number,y:number)=>void;onRelease:()=>void}){
 const {surface,visual}=options;const stick=visual.querySelector<HTMLElement>('.stick')!;
 let pointer:number|null=null,anchor={x:0,y:0};
 function reset(){const old=pointer;pointer=null;visual.hidden=true;surface.classList.remove('floating-active');options.onMove(0,0);if(old!==null&&surface.hasPointerCapture(old))surface.releasePointerCapture(old);}
 surface.addEventListener('pointerdown',event=>{
  if(pointer!==null||!options.allowed()||event.button>0||(event.target!==surface&&!(event.target instanceof HTMLCanvasElement)))return;
  const bounds=surface.getBoundingClientRect();if(event.clientX-bounds.left>bounds.width*.58)return;
  event.preventDefault();pointer=event.pointerId;anchor={x:event.clientX,y:event.clientY};
  const origin=joystickOrigin(event.clientX-bounds.left,event.clientY-bounds.top,bounds.width,bounds.height,options.size());
  visual.style.left=origin.x+'px';visual.style.top=origin.y+'px';visual.hidden=false;stick.style.transform='translate(0,0)';surface.classList.add('floating-active');surface.setPointerCapture(event.pointerId);options.onMove(0,0);
 });
 surface.addEventListener('pointermove',event=>{if(event.pointerId!==pointer)return;event.preventDefault();const dx=event.clientX-anchor.x,dy=event.clientY-anchor.y,radius=options.size()/2-20;const input=joystickVector(dx,dy,radius,options.sensitivity());options.onMove(input.x,input.y);const length=Math.hypot(dx,dy),scale=Math.min(1,radius/(length||1));stick.style.transform=`translate(${dx*scale}px,${dy*scale}px)`;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(event,e=>{if((e as PointerEvent).pointerId===pointer){reset();options.onRelease();}});
 return reset;
}
