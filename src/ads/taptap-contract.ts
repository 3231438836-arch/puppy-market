import type {PlaybackResult} from './provider';
/** Verified from the two author-supplied official HTML pages.
 * This is only a callback classifier, NOT SDK bootstrap or a live SDK adapter. */
export function resultFromTapClose(result:unknown):PlaybackResult{
 return result!==null&&typeof result==='object'&&(result as {isEnded?:unknown}).isEnded===true?{kind:'completed',proof:'sdk-success-callback'}:{kind:'cancelled'};
}
