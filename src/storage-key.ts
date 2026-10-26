/** Published previews keep their own saves, including preferences and author drafts. */
export const previewId=typeof location==='undefined'?'':(/\/previews\/([a-zA-Z0-9_-]+)\//.exec(location.pathname)?.[1]??'');
export function storageKey(key:string){return previewId?key.replace(/^puppy-mart\./,`puppy-mart.preview-${previewId}.`):key;}
