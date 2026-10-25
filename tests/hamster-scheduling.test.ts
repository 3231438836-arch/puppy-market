import {describe,it,expect,vi} from 'vitest';
import {ShopSimulation,fixtures} from '../src/simulation/world';
import {Narrative,CUSTOMER_001,validNarrative} from '../src/simulation/narrative';
import {snapshot,restoreSession,validSession} from '../src/simulation/persistence';

function stocked(day=2){const s=new ShopSimulation();s.business.data.day=day;s.shelves={milk:6,bread:6,rice:0};return s;}
describe('P2-01 保底首遇与回访切片',()=>{
 it('多种随机输入第2天均恰好一位仓鼠，计划读档不重排，第1天无固定测试熟客',()=>{
  for(const random of [0,.3,.7,.999]){
   const spy=vi.spyOn(Math,'random').mockReturnValue(random);
   try{
    const first=stocked(1);first.startDay();expect(first.flow.plan.every(a=>a.customerId===undefined)).toBe(true);expect(first.flow.visitors[0].customerId).toBe('ordinary');
    const s=stocked();s.startDay();expect(s.flow.plan.filter(a=>a.customerId===CUSTOMER_001)).toHaveLength(1);
    const plan=structuredClone(s.flow.plan);const restored=restoreSession(snapshot(s));restored.startDay();expect(restored.flow.plan).toEqual(plan);
   }finally{spy.mockRestore();}
  }
 });
 it('旧第4天未相遇只迁移补登场日期、不重写当前名单；次日必见',()=>{
  const s=stocked(4);s.closed=true;s.preservedSessionFields={future:'keep'};
  const old=snapshot(s);delete old.narrative.firstDueDays;expect(validSession(old)).toBe(true);
  const restored=restoreSession(old);expect(restored.business.data.day).toBe(4);expect(restored.flow.plan).toEqual(old.flow.plan);
  expect(restored.narrative.data.firstDueDays?.[CUSTOMER_001]).toBe(5);
  const next=restored.nextDay()!;next.startDay();expect(next.flow.plan.filter(a=>a.customerId===CUSTOMER_001)).toHaveLength(1);
  expect(next.warehouse).toEqual(s.warehouse);expect(next.preservedSessionFields.future).toBe('keep');
  const older=snapshot(s) as Record<string,unknown>;delete older.narrative;expect(restoreSession(older as ReturnType<typeof snapshot>).narrative.data.firstDueDays?.[CUSTOMER_001]).toBe(5);
 });
 it('新存档第2天开门前刷新仍保底第2天；已遇见旧档不重放保底',()=>{
  const s=restoreSession(snapshot(stocked()));s.startDay();expect(s.flow.plan.some(a=>a.customerId===CUSTOMER_001)).toBe(true);
  const old=stocked(4);old.narrative.visit(CUSTOMER_001,3,'old-visit');const v=snapshot(old);delete v.narrative.firstDueDays;
  const restored=restoreSession(v);expect(restored.narrative.scheduledSpecial(5,()=>.99)).toBeNull();expect(restored.narrative.data.profiles[CUSTOMER_001].visitCount).toBe(1);
 });
 it('回访有最短间隔与概率，不无条件每天出现；同一到访ID只记一次',()=>{
  const n=new Narrative();expect(n.visit(CUSTOMER_001,2,'v1')).toBe(true);expect(n.visit(CUSTOMER_001,2,'v1')).toBe(false);
  expect(n.scheduledSpecial(3,()=>0)).toBeNull();expect(n.scheduledSpecial(4,()=>.99)).toBeNull();expect(n.scheduledSpecial(4,()=>0)).toBe(CUSTOMER_001);
  expect(n.data.profiles[CUSTOMER_001].visitCount).toBe(1);
 });
 it('实际到达货架才触发一次；对话刷新/跳过后正常取货排队收款离店',()=>{
  const spy=vi.spyOn(Math,'random').mockReturnValue(0);
  try{
   let s=stocked();s.startDay();expect(s.narrative.data.active).toBeNull();let events=0,guard=0;
   while(!s.canClose&&guard++<12000){
    s.tick(.05);
    if(s.narrative.data.active){
     events++;expect(s.narrative.data.active.eventId).toBe('customer001-first-shelf');expect(s.narrative.current!.portraitId).toBe('customer001');
     const v=s.flow.visitors.find(v=>v.id===s.narrative.data.active!.visitorId)!;expect(v.state).toBe('shopping');expect(v.basket).toEqual([]);
     const before=snapshot(s);s.tick(2);expect(snapshot(s)).toEqual(before);
     expect(validSession(before)).toBe(true);s=restoreSession(before);expect(s.narrative.data.profiles[CUSTOMER_001].visitCount).toBe(1);s.narrative.skip();
    }
    s.player={...fixtures.find(f=>f.id==='counter')!.spot};if(s.atRegister){expect(s.checkout()).toBe(true);expect(s.checkout()).toBe(false);}
   }
   expect(guard).toBeLessThan(12000);expect(events).toBe(1);expect(s.served).toBe(4);expect(s.coins).toBe(56);expect(s.departedCount).toBe(4);expect(s.closeDay()).toBe(true);
   expect(s.narrative.data.profiles[CUSTOMER_001].visitCount).toBe(1);expect(s.narrative.data.profiles[CUSTOMER_001].dialogueFlags['customer001-first-shelf']).toBe(true);
  }finally{spy.mockRestore();}
 });
 it('购买/未安装/不可达/同一次到访绝不触发翻新；后续符合条件只一次',()=>{
  const n=new Narrative();n.visit(CUSTOMER_001,2,'v1');expect(n.begin(CUSTOMER_001,'v1',2,'shelf',{purchased:true,installed:true,goodsReachable:true})).toBe(true);expect(n.data.active!.eventId).toBe('customer001-first-shelf');n.skip();n.visit(CUSTOMER_001,4,'v2');
  for(const access of [undefined,{purchased:false,installed:true,goodsReachable:true},{purchased:true,installed:false,goodsReachable:true},{purchased:true,installed:true,goodsReachable:false}])expect(n.begin(CUSTOMER_001,'v2',4,'checkout',access)).toBe(false);
  expect(n.begin(CUSTOMER_001,'v2',4,'checkout',{purchased:true,installed:true,goodsReachable:true})).toBe(true);
  expect(n.current!.text).toBe('欸？你们终于翻新啦？还真是新官上任三把火呀。');n.continue();n.visit(CUSTOMER_001,6,'v3');expect(n.begin(CUSTOMER_001,'v3',6,'checkout',{purchased:true,installed:true,goodsReachable:true})).toBe(false);
  const late=new Narrative();late.visit(CUSTOMER_001,2,'a');late.visit(CUSTOMER_001,4,'b');late.begin(CUSTOMER_001,'b',4,'shelf');late.continue();expect(late.begin(CUSTOMER_001,'b',4,'checkout',{purchased:true,installed:true,goodsReachable:true})).toBe(false);
 });
 it('旧测试熟客活动对话可恢复，新/未知档格式仍严格校验',()=>{
  const s=new ShopSimulation();s.narrative.visit('test-regular',1);s.narrative.begin('test-regular','legacy',1);
  const restored=restoreSession(snapshot(s));expect(restored.narrative.current!.portraitId).toBe('test-regular');expect(restored.narrative.current!.text).toContain('测试占位');
  expect(validNarrative({...s.narrative.data,firstDueDays:{[CUSTOMER_001]:-1}})).toBe(false);
 });
});
