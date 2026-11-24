import { readFileSync, writeFileSync } from 'node:fs';

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8');
const css = read('../design-demos-v2/index.html').match(/<style>([\s\S]*?)<\/style>/)[1];
const extra = read('selected.css');
const script = read('selected.js');
writeFileSync(new URL('index.html', import.meta.url), `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>离线笔记｜合并原型</title><style>${css}\n${extra}</style></head>
<body data-view="index"><header class="top"><button class="wordmark" type="button" data-action="home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l3 3v15H5zM15 3v4h4M8 11h8m-8 4h8"/></svg>离线笔记</button><small>交互原型</small></header>
<main id="root"></main><input id="file" type="file" accept=".txt,.md" hidden><div id="status" role="status" aria-live="polite" hidden></div><dialog id="dialog" aria-labelledby="dialog-title"><form method="dialog"><h2 id="dialog-title"></h2><p id="dialog-message"></p><label id="dialog-label">笔记标题<input id="dialog-input" maxlength="100"></label><div class="dialog-actions"><button value="cancel" formnovalidate>取消</button><button class="solid" id="dialog-ok" value="confirm">确定</button></div></form></dialog><script>${script}</script></body></html>`);
