// Run only after explicit authorization to publish the game publicly.
// Build first: npm run build -- --base=/puppy-market/
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const git=(args,options={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',...options}).trim();
git(['diff','--exit-code']);git(['diff','--cached','--exit-code']);
const html=join(root,'dist/index.html');
if(!existsSync(html)||!readFileSync(html,'utf8').includes('/puppy-market/assets/'))throw new Error('Build the GitHub Pages base path first.');
const source=git(['rev-parse','HEAD']);
const remote=git(['ls-remote','origin','refs/heads/gh-pages']);
let parent;
if(remote){git(['fetch','origin','refs/heads/gh-pages']);parent=git(['rev-parse','FETCH_HEAD']);}
const temp=mkdtempSync(join(tmpdir(),'puppy-pages-'));
const env={...process.env,GIT_INDEX_FILE:join(temp,'index')};
try{
 writeFileSync(join(root,'dist/.nojekyll'),'');
 git(['read-tree','--empty'],{env});
 git(['--git-dir='+join(root,'.git'),'--work-tree='+join(root,'dist'),'add','--all','--force'],{cwd:join(root,'dist'),env});
 const tree=git(['write-tree'],{env});
 const commit=git(['commit-tree',tree,...(parent?['-p',parent]:[])],{input:`deploy: playable shop preview from ${source}\n`,env});
 git(['push','origin',`${commit}:refs/heads/gh-pages`]);
 console.log(`Published static branch ${commit}. Source ${source}. Pages site activation and live HTTP verification are separate.`);
}finally{rmSync(temp,{recursive:true,force:true});}
