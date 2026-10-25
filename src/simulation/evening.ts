import firstDay from '../data/diary-first-day.json' with {type:'json'};
import {type ShopSimulation} from './world';

/** Only recorded facts may select author text. P2-00 has no shelf-tidying event. */
export function eveningDiary(day:number,served:number){
 const blocks=day===firstDay.day?firstDay.blocks.filter(block=>
  !block.when?.shelvesTidied&&(!block.when?.singleCustomer||served===1)
 ).map(block=>block.text):['待作者填写：当天的睡前日记。'];
 return {title:day===firstDay.day?firstDay.title:`第 ${day} 天 · 睡前日记`,
  status:day===firstDay.day?firstDay.status:'placeholder',
  facts:`第 ${day} 天 · 今日已完成交易 ${served} 单`,blocks};
}

/** Stage next morning without mutating the current night; apply only after saving. */
export function sleepToNextDay(current:ShopSimulation,persist:(next:ShopSimulation)=>boolean){
 const next=current.nextDay();
 if(!next)return null;
 try{return persist(next)?next:null;}catch{return null;}
}
