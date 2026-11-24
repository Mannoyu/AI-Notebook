const byId = id => document.getElementById(id);
const root = byId('root');
const storageKey = 'offline-notes-selected-demo-v1';
const examples = [
  { id:'offline', title:'离线网页的三层缓存', updated:'2026-11-24T14:28:00', body:'离线不只是网页能打开。笔记助手需要分别验证网页资源、笔记数据和模型缓存。\n\n## 网页壳\n断网重启后要访问同一个网址，不能只测试已经打开的标签页。\n\n## 笔记与模型\n即使模型缓存被清掉，笔记仍应能读写和导出。模型试跑成功后，用一篇新笔记验证离线分析。', result:{ revision:0, summary:'网页资源、笔记数据和模型缓存各有职责，离线验收时要分开检查。', extra:'可单独清理模型缓存，确认网页和笔记不受影响。' } },
  { id:'markdown', title:'Markdown 导入边界', updated:'2026-11-24T11:09:00', body:'首版支持 UTF-8 的纯文本和 Markdown。每次导入都创建一篇独立的笔记。' },
  { id:'react', title:'React 渲染随记', updated:'2026-11-23T20:16:00', body:'渲染计算下一版界面，提交阶段才把需要的变化写到页面。' },
  { id:'scope', title:'周五产品复盘', updated:'2026-11-20T16:40:00', body:'首版先做本地笔记、总结和补充。不做账号、云同步、英语和语音。' }
].map(note=>({...note,revision:0}));
let notes = examples;
try { const cached=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(cached))notes=cached; } catch {}
let activeId, editing=true, analysisOpen=false, pending, statusTimer, runningId;
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const active = () => notes.find(note=>note.id===activeId);
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const dateLabel = date => `${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
const fmtTime = date => new Intl.DateTimeFormat('zh-CN',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
const week = date => new Intl.DateTimeFormat('zh-CN',{weekday:'short'}).format(date);
const excerpt = body => body.split('\n').map(line=>line.replace(/^\s*(?:#{1,6}|[-*])\s+/,'').trim()).find(Boolean) || '空白笔记';
function notify(message){const status=byId('status');clearTimeout(statusTimer);status.hidden=false;status.textContent=message;statusTimer=setTimeout(()=>{status.hidden=true;},3500);}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(notes));return true;}catch{notify('浏览器未能保存这次更改，请先导出 Markdown。');return false;}}
function inline(text){return escape(text).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');}
function preview(body){
  if(!body.trim())return '<p class="meta">还没有正文。切换到编辑开始写。</p>';
  return body.split(/(```[\s\S]*?```)/).map(chunk=>{
    if(chunk.startsWith('```'))return `<pre><code>${escape(chunk.replace(/^```[^\n]*\n?|\n?```$/g,''))}</code></pre>`;
    return chunk.split(/\n{2,}/).filter(part=>part.trim()).map(part=>part.split('\n').reduce((out,line,index,lines)=>{
      if(/^[-*] /.test(line)){if(!/^[-*] /.test(lines[index-1]??''))out.push('<ul>');out.push(`<li>${inline(line.slice(2))}</li>`);if(!/^[-*] /.test(lines[index+1]??''))out.push('</ul>');}
      else if(/^#{1,6} /.test(line))out.push(`<h2>${inline(line.replace(/^#+ /,''))}</h2>`);
      else if(line.trim())out.push(`<p>${inline(line)}</p>`);
      return out;
    },[]).join('')).join('');
  }).join('');
}
function indexPage(){
  const groups=new Map();
  [...notes].sort((first,second)=>new Date(second.updated)-new Date(first.updated)).forEach(note=>{
    const date=new Date(note.updated),key=dateKey(date);
    if(!groups.has(key))groups.set(key,{date,notes:[]});
    groups.get(key).notes.push(note);
  });
  return `<div class="page index"><div class="row mast"><div><h1 class="serif" tabindex="-1">笔记索引</h1><p class="meta">按最近编辑排列 · ${notes.length} 篇笔记</p></div><div class="switches"><button class="outline" data-action="import">导入 .txt / .md</button><button class="solid" data-action="new">新建笔记</button></div></div><div class="timeline">${groups.size?[...groups.values()].map(group=>`<section class="date-group"><h2 class="date-label">${dateLabel(group.date)}<small>${group.date.getFullYear()} 年 · ${week(group.date)}</small></h2><div>${group.notes.map(note=>`<button class="entry" data-note="${escape(note.id)}"><span><strong>${escape(note.title)}</strong><span class="meta">${escape(excerpt(note.body).slice(0,72))}</span></span><time>${fmtTime(new Date(note.updated))}</time></button>`).join('')}</div></section>`).join(''):'<p class="empty">还没有笔记。新建一篇，或从本机导入。</p>'}</div></div>`;
}
function analysis(note){
  const result=note.result;
  return `<div class="row"><div><h2>AI 分析</h2><p class="meta">界面演示，不运行模型</p></div><button class="solid" data-action="analyze" ${runningId||!note.body.trim()?'disabled':''}>${runningId===note.id?'生成示例中…':result?'重新生成示例':'生成示例分析'}</button></div>${result?`<p class="notice" id="stale" ${result.revision===note.revision?'hidden':''}>基于修改前的笔记</p><div class="result"><section><h3>原文总结</h3><p>${escape(result.summary)}</p></section><section><h3>模型补充</h3><p>${escape(result.extra)}</p><span class="meta">示例内容，未经联网核验</span></section></div>`:'<p class="meta end">暂无分析。这里会分别显示总结和模型补充。</p>'}`;
}
function editorPage(note){
  return `<div class="page focus"><div class="row focus-tools"><button class="outline" data-action="home">‹ 返回日期索引</button><div class="switches" aria-label="正文工具"><button data-action="edit" aria-pressed="${editing}">编辑</button><button data-action="preview" aria-pressed="${!editing}">预览</button><button class="outline" data-action="export">导出 .md</button><details class="more"><summary aria-label="更多笔记操作">···</summary><div class="popover"><button data-action="rename">重命名</button><button data-action="delete">删除笔记</button></div></details></div></div><section class="sheet" aria-labelledby="note-title"><p class="kicker">当前笔记</p><h1 id="note-title" class="serif">${escape(note.title)}</h1><p class="meta">Markdown 文档</p>${editing?`<textarea aria-label="Markdown 正文" id="draft" placeholder="写下你的笔记…">${escape(note.body)}</textarea>`:`<article class="body-copy">${preview(note.body)}</article>`}</section><div class="row bottom"><span class="status" id="draft-status" role="status">原型笔记 · 浏览器本地</span><button class="outline" data-action="toggle" aria-expanded="${analysisOpen}" aria-controls="analysis-panel">${analysisOpen?'收起分析':'展开示例分析'}</button></div><section class="bottom-panel" id="analysis-panel" ${analysisOpen?'':'hidden'}>${analysis(note)}</section></div>`;
}
function render(){const note=active();document.body.dataset.view=note?'focus':'index';root.innerHTML=note?editorPage(note):indexPage();}
function open(id){activeId=id;editing=true;analysisOpen=false;render();byId('draft')?.focus({preventScroll:true});}
function create(title,body=''){const note={id:crypto.randomUUID?.()??`${Date.now()}-${Math.random()}`,title,body,revision:0,updated:new Date().toISOString()};notes.push(note);save();open(note.id);}
function home(){if(!active())return;activeId=undefined;render();root.querySelector('h1').focus();}
function confirm(title,message,label,action,value){
  const dialog=byId('dialog');dialog.returnValue='';byId('dialog-title').textContent=title;byId('dialog-message').textContent=message;byId('dialog-ok').textContent=label;byId('dialog-label').hidden=value===undefined;byId('dialog-input').value=value??'';byId('dialog-input').required=value!==undefined;pending=action;dialog.showModal();
}
byId('dialog').addEventListener('close',()=>{const action=pending;pending=undefined;if(byId('dialog').returnValue==='confirm')action?.(byId('dialog-input').value.trim());});
byId('file').addEventListener('change',async event=>{const file=event.target.files[0];event.target.value='';if(!file)return;try{if(!/\.(md|txt)$/i.test(file.name))throw Error();create(file.name.replace(/\.(md|txt)$/i,'')||'未命名笔记',new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer()));}catch{notify('导入失败，请选择 UTF-8 编码的 .txt 或 .md 文件。');}});
root.addEventListener('input',event=>{
  const note=active();if(event.target.id!=='draft'||!note)return;
  note.body=event.target.value;note.updated=new Date().toISOString();note.revision++;
  byId('draft-status').textContent=save()?'已保存到本机':'尚未保存';
  const stale=byId('stale');if(stale)stale.hidden=false;
  const button=root.querySelector('[data-action="analyze"]');if(button)button.disabled=!!runningId||!note.body.trim();
});
function download(note){
  const result=note.result;
  const extra=result?`\n\n## AI 分析（原型示例）\n\n${result.revision!==note.revision?'> 基于修改前的笔记\n\n':''}### 原文总结\n\n${result.summary}\n\n### 模型补充\n\n${result.extra}`:'';
  const link=document.createElement('a');const url=URL.createObjectURL(new Blob([`# ${note.title}\n\n${note.body}${extra}\n`],{type:'text/markdown;charset=utf-8'}));link.href=url;link.download=`${note.title.replace(/[\\/:*?"<>|]/g,'_')}.md`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.note){open(button.dataset.note);return;}
  const note=active(),action=button.dataset.action;
  if(action==='home'){home();return;}
  if(action==='new'){create('未命名笔记');return;}
  if(action==='import'){byId('file').click();return;}
  if(!note||!action)return;
  if(action==='edit'||action==='preview'){editing=action==='edit';render();if(editing)byId('draft').focus({preventScroll:true});else root.querySelector('[data-action="preview"]').focus();}
  if(action==='toggle'){analysisOpen=!analysisOpen;byId('analysis-panel').hidden=!analysisOpen;button.setAttribute('aria-expanded',String(analysisOpen));button.textContent=analysisOpen?'收起分析':'展开示例分析';}
  if(action==='export')download(note);
  if(action==='rename')confirm('重命名笔记','输入新的标题。','保存',title=>{if(!title)return;note.title=title;note.updated=new Date().toISOString();save();render();},note.title);
  if(action==='delete')confirm('删除笔记',`删除「${note.title}」及其示例分析？`,'确认删除',()=>{notes=notes.filter(item=>item!==note);save();activeId=undefined;render();root.querySelector('h1').focus();});
  if(action==='analyze'&&!runningId&&note.body.trim()){
    const revision=note.revision,body=note.body;
    const panel=byId('analysis-panel');runningId=note.id;panel.innerHTML=analysis(note);
    setTimeout(()=>{
      if(notes.includes(note)){note.result={revision,summary:excerpt(body).slice(0,160),extra:'正式版将在本机生成补充，这里仅演示版式与结果状态。'};save();}
      runningId=undefined;const now=active(),currentPanel=byId('analysis-panel');if(now&&currentPanel)currentPanel.innerHTML=analysis(now);if(now===note)notify('示例分析已更新');
    },450);
  }
});
render();
