const p=typeof location>"u"?"":/\/previews\/([a-zA-Z0-9_-]+)\//.exec(location.pathname)?.[1]??"";function a(e){return p?e.replace(/^puppy-mart\./,`puppy-mart.preview-${p}.`):e}export{p,a as s};
