import { expect, it } from 'vitest';
import { normalizeName, publicCharacter } from '../src/characters';
it('角色元数据可省略，作者私密备注不投影到玩家界面',()=>{
 expect(publicCharacter({id:'001'})).toEqual({id:'001',preferredName:undefined});
 expect(publicCharacter({id:'001',preferredName:'栗',pronouns:'待作者填写',identityNotes:'内部',relationshipNotes:'内部关系',authorNotes:'草稿'})).toEqual({id:'001',preferredName:'栗'});
});
it('名字去空白并按 Unicode 字符限制长度',()=>{expect(normalizeName('  栗  ')).toBe('栗');expect(Array.from(normalizeName('🐕'.repeat(20)))).toHaveLength(16);});

it('更新名字保留扩展字段，不覆盖新版本或损坏记录',async()=>{
 const { vi }=await import('vitest');const { saveName, PLAYER_PROFILE_KEY }=await import('../src/characters');
 let raw=JSON.stringify({version:1,preferredName:'旧名',futureField:{coins:9}});
 vi.stubGlobal('localStorage',{getItem:(key:string)=>key===PLAYER_PROFILE_KEY?raw:null,setItem:(_key:string,value:string)=>{raw=value;}});
 try{
  expect(saveName('新名')).toBe(true);expect(JSON.parse(raw)).toEqual({version:1,preferredName:'新名',futureField:{coins:9}});
  raw=JSON.stringify({version:2,precious:'saved'});const newer=raw;expect(saveName('不能覆盖')).toBe(false);expect(raw).toBe(newer);
  raw='broken';expect(saveName('不能覆盖')).toBe(false);expect(raw).toBe('broken');
 }finally{vi.unstubAllGlobals();}
});
