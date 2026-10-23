import type {AdEnvironment} from './config';
export type PlaybackResult={kind:'completed';proof:'sdk-success-callback'}|{kind:'cancelled'|'load-failed'|'no-fill'|'unavailable'};
/** The verified platform adapter must map the documented full-watch callback here.
 * Resolving show()/load(), closing an overlay, or resuming the page is NOT completion. */
export interface RewardedVideoProvider {mode?:'development-test';environment:AdEnvironment;available():boolean;play(placementId:string,signal:AbortSignal,onProgress?:(phase:'loading'|'playing')=>void):Promise<PlaybackResult>}
/** Fail closed. No guessed window.tt/wx/TapTap APIs, no fake videos, no SDK import.
 * Replace only after the H5 SDK and completion contract have been verified. */
export class UnconfiguredTapTapProvider implements RewardedVideoProvider {
 constructor(public readonly environment:AdEnvironment){}
 available(){return false;}
 async play(_placementId:string,_signal:AbortSignal,onProgress?:(phase:'loading'|'playing')=>void):Promise<PlaybackResult>{return {kind:'unavailable'};}
}
