import {describe,it,expect,vi,afterEach} from 'vitest';
import {ShopSimulation} from '../src/simulation/world';
import {snapshot} from '../src/simulation/persistence';
import {tomorrowPreview,forecastCard} from '../src/simulation/tomorrow';
import {growthSummary} from '../src/simulation/growth-ui';
import {checkCurrentBuild,compareBuild} from '../src/simulation/version-check';
afterEach(()=>vi.unstubAllGlobals());
describe('共用预告和只读版本诊断',()=>{
 it('预告直接读取真实等级、经验、商品条件，不保证明天升级、不透露未遇角色',()=>{const s=new ShopSimulation();expect(tomorrowPreview(s)).toMatchObject({day:2,level:1,xp:0,next:{level:2,remaining:15,label:'冰柜饭团货位'},goods:['牛奶','面包']});s.business.data.xp=18;expect(tomorrowPreview(s).next).toMatchObject({remaining:32,label:'柜台小花盆'});const html=forecastCard(s);expect(growthSummary(s)).toContain(html);expect(html).not.toContain('CUSTOMER');expect(html).not.toContain('小仓鼠');s.business.data.xp=50;expect(tomorrowPreview(s).next).toBeNull();expect(forecastCard(s)).toContain('当前阶段的经营内容均已解锁');});
 it('预告为纯读取，不改变经营/叙事/存档，反复打开相同内容',()=>{const s=new ShopSimulation(),saved=structuredClone(snapshot(s));expect(forecastCard(s)).toBe(forecastCard(s));expect(snapshot(s)).toEqual(saved);});
 it('版本相同、不同、旧站点缺清单分别说明，不把HTML当版本',()=>{const current={version:'0.5.1',commit:'abc1234',dirty:false};expect(compareBuild(current,current)).toContain('一致');expect(compareBuild(current,{...current,commit:'other'})).toContain('不同');expect(compareBuild(current,'<html>')).toContain('没有有效');expect(compareBuild({...current,builtAt:'2026-10-24T01:00:00Z'},{...current,builtAt:'2026-10-24T02:00:00Z'})).toContain('不同');});
 it('诊断请求绕开HTTP缓存，但不注销Service Worker或读取/删除本地存档',async()=>{const local={version:'0.5.1',commit:'abc1234',dirty:false},fetch=vi.fn(async(_url:URL|string,_options?:RequestInit)=>({ok:true,json:async()=>local})),unregister=vi.fn(),clear=vi.fn();vi.stubGlobal('location',{href:'https://example.test/puppy-market/?preview=new'});vi.stubGlobal('fetch',fetch);vi.stubGlobal('navigator',{serviceWorker:{getRegistrations:async()=>[{unregister}],controller:null}});vi.stubGlobal('localStorage',{clear});const result=await checkCurrentBuild(local);expect(result.message).toContain('一致');expect(result.worker).toContain('注册：1');expect(String(fetch.mock.calls[0][0])).toBe('https://example.test/puppy-market/version.json');expect(fetch.mock.calls[0][1]).toEqual({cache:'no-store'});expect(unregister).not.toHaveBeenCalled();expect(clear).not.toHaveBeenCalled();});
});
