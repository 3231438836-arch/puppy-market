import original from '../data/narrative-test.json' with {type:'json'};
export interface DialogueChoice {label:string;value:string;flag:string;next:string}
export interface DialogueNode {text:string;expression:'neutral'|'soft';choices?:DialogueChoice[];next?:string}
export interface NarrativeContent {notice:string;customer:{customerId:string;displayName:string;spriteId:string;portraitId:string;shoppingPreferences:('milk'|'bread'|'rice')[];preferredName?:string;pronouns?:string;relationshipNotes?:string;identityNotes?:string;authorNotes?:string};events:{eventId:string;customerId:string;minVisits:number;maxVisits?:number;minDay:number;repeatable:boolean;requires?:string;dialogueRef:string;entry:string;resultFlag:string}[];dialogues:Record<string,Record<string,DialogueNode>>}
export const defaultContent=()=>structuredClone(original) as NarrativeContent;
const object=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const str=(x:unknown)=>typeof x==='string'&&x.length>0&&x.length<=10000;
const id=(x:unknown)=>typeof x==='string'&&/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(x)&&!['constructor','prototype','__proto__'].includes(x);
export function validateContent(value:unknown):string[]{
 const errors:string[]=[];if(!object(value))return ['配置必须是 JSON 对象。'];
 const c=value.customer;if(!str(value.notice)||!object(c))return ['缺少 notice 或 customer。'];
 if(!id(c.customerId)||!str(c.displayName)||c.spriteId!=='customer'||c.portraitId!=='test-regular')errors.push('角色需有合法 ID 和名字；当前素材仅支持 customer / test-regular。');
 if(!Array.isArray(c.shoppingPreferences)||!c.shoppingPreferences.length||c.shoppingPreferences.length>3||!c.shoppingPreferences.every(x=>['milk','bread','rice'].includes(x as string)))errors.push('购物偏好只能包含 milk / bread / rice，最多三项。');
 for(const key of ['preferredName','pronouns','relationshipNotes','identityNotes','authorNotes'])if(c[key]!==undefined&&typeof c[key]!=='string')errors.push(key+' 必须是可选文本。');
 if(!object(value.dialogues)||!Array.isArray(value.events)||!value.events.length||value.events.length>50)return [...errors,'需要 dialogues 和 1–50 个事件。'];
 const dialogues=value.dialogues,seen=new Set<string>();
 for(const [ref,nodes] of Object.entries(dialogues)){
  if(!id(ref)||!object(nodes)||!Object.keys(nodes).length||Object.keys(nodes).length>100){errors.push('对话组 '+ref+' 无效或超过 100 节点。');continue;}
  for(const [name,n] of Object.entries(nodes)){
   if(!id(name)||!object(n)||!str(n.text)||!['neutral','soft'].includes(n.expression as string)){errors.push(ref+'/'+name+'：节点需合法 ID、正文与已支持表情。');continue;}
   if(n.next!==undefined&&(!id(n.next)||!Object.hasOwn(nodes,n.next as string)))errors.push(ref+'/'+name+'：下一节点不存在。');
   if(n.choices!==undefined){if(!Array.isArray(n.choices)||n.choices.length<2||n.choices.length>3)errors.push(ref+'/'+name+'：选项必须为 2–3 项。');else{const values=new Set();for(const q of n.choices){if(!object(q)||!str(q.label)||!id(q.value)||!id(q.flag)||!id(q.next)||!Object.hasOwn(nodes,q.next as string))errors.push(ref+'/'+name+'：选项文字、标记或目标无效。');else if(values.has(q.value))errors.push(ref+'/'+name+'：选项值不能重复。');else values.add(q.value);}}if(n.next!==undefined)errors.push(ref+'/'+name+'：选项与直接下一步不能同时设置。');}
  }
  // All nodes must be able to reach an end; infinite-only cycles cannot trap preview.
  const ending=new Set(Object.entries(nodes).filter(([,n])=>object(n)&&n.next===undefined&&n.choices===undefined).map(([k])=>k));
  for(let i=0;i<Object.keys(nodes).length;i++)for(const [k,n] of Object.entries(nodes)){if(!object(n))continue;const targets=Array.isArray(n.choices)?n.choices.filter(object).map(q=>q.next):n.next!==undefined?[n.next]:[];if(targets.length&&targets.every(t=>typeof t==='string'&&ending.has(t)))ending.add(k);}
  for(const k of Object.keys(nodes))if(!ending.has(k))errors.push(ref+'/'+k+'：存在无法结束的循环或无效分支。');
 }
 for(const e of value.events){if(!object(e)){errors.push('事件必须是对象。');continue;}if(!id(e.eventId)||seen.has(e.eventId as string))errors.push('事件 ID 非法或重复。');seen.add(e.eventId as string);const group=typeof e.dialogueRef==='string'?dialogues[e.dialogueRef]:null;if(e.customerId!==c.customerId||!object(group)||typeof e.entry!=='string'||!Object.hasOwn(group,e.entry))errors.push('事件 '+e.eventId+' 的角色、对话引用或入口无效。');if(!Number.isInteger(e.minVisits)||Number(e.minVisits)<1||!Number.isInteger(e.minDay)||Number(e.minDay)<1||(e.maxVisits!==undefined&&(!Number.isInteger(e.maxVisits)||Number(e.maxVisits)<Number(e.minVisits)))||typeof e.repeatable!=='boolean'||!id(e.resultFlag)||(e.requires!==undefined&&!id(e.requires)))errors.push('事件 '+e.eventId+' 的日期、次数或标记无效。');}
 return errors;
}
export function parseContent(text:string):{content:NarrativeContent|null;errors:string[]}{if(text.length>512000)return{content:null,errors:['文件超过 500 KB。']};try{const v:unknown=JSON.parse(text),errors=validateContent(v);return{content:errors.length?null:v as NarrativeContent,errors};}catch(e){return{content:null,errors:['JSON 格式错误：'+(e instanceof Error?e.message:'无法读取')]};}}
