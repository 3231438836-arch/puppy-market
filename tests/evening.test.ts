import {describe,it,expect} from 'vitest';
import {eveningDiary,sleepToNextDay} from '../src/simulation/evening';
import {ShopSimulation} from '../src/simulation/world';
import {snapshot,restoreSession,validSession} from '../src/simulation/persistence';

describe('P2-00 文字宿舍与跨日',()=>{
 it('首日原文按真实交易数筛选，不假设已整理货架',()=>{
  for(const served of [0,1,4]){
   const diary=eveningDiary(1,served),text=diary.blocks.join('\n');
   expect(diary.status).toBe('approved');expect(diary.facts).toContain(`${served} 单`);
   expect(text.includes('唉，今天就来了一个客人。')).toBe(served===1);
   expect(text).not.toContain('今天已经很认真地整理货架');
   expect(text).toContain('明天再看看。');
  }
 });
 it('后续只有明确占位和事实，不编造忙碌/买到商品或正式剧情',()=>{
  for(const served of [0,1,4]){
   const diary=eveningDiary(2,served);expect(diary.status).toBe('placeholder');
   expect(diary.blocks).toEqual(['待作者填写：当天的睡前日记。']);expect(diary.facts).toContain(`${served} 单`);
  }
 });
 it('保存失败或抛异常均不改变当夜、账本、库存和未知字段',()=>{
  const s=new ShopSimulation();s.closed=true;s.business.sale(['milk']);s.preservedSessionFields={futureField:{keep:true}};
  const before=snapshot(s);
  expect(sleepToNextDay(s,()=>false)).toBeNull();expect(snapshot(s)).toEqual(before);
  expect(sleepToNextDay(s,()=>{throw Error('quota');})).toBeNull();expect(snapshot(s)).toEqual(before);
 });
 it('保存成功后只跨一天，保留资金库存与熟客记忆，再次睡觉拒绝',()=>{
  const s=new ShopSimulation();s.closed=true;s.business.sale(['milk']);s.narrative.visit('test-regular',1);s.preservedSessionFields={futureField:'keep'};
  const before=snapshot(s);let saved:ReturnType<typeof snapshot>|undefined;
  const next=sleepToNextDay(s,candidate=>{saved=snapshot(candidate);return true;})!;
  expect(snapshot(s)).toEqual(before);expect(validSession(saved)).toBe(true);
  expect(next.business.data.day).toBe(2);expect(next.business.data.balance).toBe(s.business.data.balance);
  expect(next.warehouse).toEqual(s.warehouse);expect(next.shelves).toEqual(s.shelves);
  expect(next.narrative.data).toEqual(s.narrative.data);expect((saved as unknown as Record<string,unknown>).futureField).toBe('keep');
  expect(sleepToNextDay(next,()=>{throw Error('must not write');})).toBeNull();
  expect(restoreSession(saved!).business.data.day).toBe(2);
 });
 it('旧版无 business/flow/narrative 记录仍可读取，未关店不能睡觉',()=>{
  const v=snapshot(new ShopSimulation()) as Record<string,unknown>;delete v.business;delete v.flow;delete v.narrative;v.extra='retained';
  expect(validSession(v)).toBe(true);const s=restoreSession(v as ReturnType<typeof snapshot>);
  expect(sleepToNextDay(s,()=>{throw Error('must not save');})).toBeNull();
  s.closed=true;expect(sleepToNextDay(s,()=>true)!.preservedSessionFields.extra).toBe('retained');
 });
});
