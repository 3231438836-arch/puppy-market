export interface InteractionPoint {id:string;x:number;y:number;range:number}
export function selectInteraction(player:{x:number;y:number},facing:{x:number;y:number},points:InteractionPoint[],previous:string|null=null):string|null{
 const candidates=points.map(p=>{const dx=p.x-player.x,dy=p.y-player.y,distance=Math.hypot(dx,dy);const alignment=distance? (dx*facing.x+dy*facing.y)/distance:1;return{...p,distance,score:distance-alignment*9};}).filter(p=>p.distance<=p.range+(p.id===previous?4:0)).sort((a,b)=>a.score-b.score);
 const best=candidates[0];if(!best)return null;const prior=candidates.find(p=>p.id===previous);
 return prior&&prior.score<=best.score+6?prior.id:best.id;
}
