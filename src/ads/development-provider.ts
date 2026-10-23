import type {RewardedVideoProvider,PlaybackResult} from './provider';
import {resultFromTapClose} from './taptap-contract';
/** Imported only through import.meta.env.DEV && ?ads-test=1. No TapTap calls, IDs or revenue. */
export class DevelopmentRewardedProvider implements RewardedVideoProvider {
 readonly mode='development-test' as const;readonly environment='taptap-test' as const;
 available(){return true;}
 play(_placement:string,signal:AbortSignal,onProgress?:(phase:'loading'|'playing')=>void):Promise<PlaybackResult>{
  return new Promise(resolve=>{let finished=false;const overlay=document.createElement('section');overlay.className='development-ad-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','开发模拟广告');
   overlay.innerHTML='<div><h2>开发模拟广告</h2><p><b>仅用于测试 · 没有真实视频 · 不产生真实广告收益</b></p><p data-test-phase>模拟加载中</p><button data-outcome="complete" disabled>模拟完整观看成功</button><button data-outcome="cancel">模拟提前关闭</button><button data-outcome="load-failed">模拟加载失败</button><button data-outcome="no-fill">模拟无广告填充</button></div>';
   overlay.style.cssText='position:fixed;inset:0;z-index:400;background:#302b25ed;display:grid;place-items:center;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));color:#493a32;overflow:auto;touch-action:pan-y';
   const panel=overlay.firstElementChild as HTMLElement;panel.style.cssText='background:#fff1cc;border:4px double #9d704b;padding:20px;max-width:520px;max-height:100%;overflow:auto';
   overlay.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.style.cssText='display:block;width:100%;min-height:48px;margin:9px 0;padding:10px;background:#d8c49e;color:#45392d');
   const finish=(result:PlaybackResult)=>{if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',abort);overlay.remove();resolve(result);};
   const abort=()=>finish({kind:'cancelled'});
   const timer=setTimeout(()=>{if(finished||signal.aborted)return;overlay.querySelector('[data-test-phase]')!.textContent='模拟播放中（不是实际广告）';overlay.querySelector<HTMLButtonElement>('[data-outcome="complete"]')!.disabled=false;onProgress?.('playing');},150);
   overlay.addEventListener('click',e=>{const outcome=(e.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.outcome;if(!outcome)return;e.preventDefault();e.stopPropagation();if(outcome==='complete')finish(resultFromTapClose({isEnded:true}));else if(outcome==='cancel')finish(resultFromTapClose({isEnded:false}));else finish({kind:outcome as 'load-failed'|'no-fill'});});
   signal.addEventListener('abort',abort,{once:true});if(signal.aborted){abort();return;}document.body.append(overlay);onProgress?.('loading');
  });
 }
}
