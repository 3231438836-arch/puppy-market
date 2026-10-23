import { expect, it } from 'vitest';
import { normalizeName, publicCharacter } from '../src/characters';
it('角色元数据可省略，作者私密备注不投影到玩家界面',()=>{
 expect(publicCharacter({id:'001'})).toEqual({id:'001',preferredName:undefined});
 expect(publicCharacter({id:'001',preferredName:'栗',pronouns:'待作者填写',identityNotes:'内部',relationshipNotes:'内部关系',authorNotes:'草稿'})).toEqual({id:'001',preferredName:'栗'});
});
it('名字去空白并按 Unicode 字符限制长度',()=>{expect(normalizeName('  栗  ')).toBe('栗');expect(Array.from(normalizeName('🐕'.repeat(20)))).toHaveLength(16);});
