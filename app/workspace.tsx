'use client';

import { ArrowLeft, Cpu, Download, FileText, MoreHorizontal, Plus, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { deleteNote, exportNote, listNotes, saveNote, type Note } from './notes';
import { useModel } from './use-model';

const timeFormat = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dateFormat = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

export function SafeMarkdown({ text }: { text: string }) {
  return <Markdown skipHtml components={{ img: () => null }}>{text}</Markdown>;
}

export function Workspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<'rename' | 'delete'>();
  const [offlineReady, setOfflineReady] = useState(false);
  const [running, setRunning] = useState(false);
  const model = useModel(offlineReady);
  const latestNotes = useRef<Note[]>([]);
  const storageQueue = useRef<Promise<unknown>>(Promise.resolve());
  const latestSave = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const current = notes.find((note) => note.id === selected);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const update = () => setOfflineReady(!!navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', update);
    update();
    void navigator.serviceWorker.register('/offline-worker.js').catch(() => undefined);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', update);
  }, []);

  useEffect(() => {
    let mounted = true;
    listNotes().then((items) => { if (mounted) { latestNotes.current = items; setNotes(items); } }, () => {
      if (mounted) { setLoadFailed(true); setError('无法读取本地笔记，请检查浏览器存储权限。'); }
    }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  function persist(note: Note) {
    const version = ++latestSave.current;
    latestNotes.current = [...latestNotes.current.filter((item) => item.id !== note.id), note];
    setNotes(latestNotes.current);
    setStatus('保存中…');
    const queued = storageQueue.current.then(() => saveNote(note));
    storageQueue.current = queued.catch(() => undefined);
    void queued.then(() => { if (version === latestSave.current) setStatus('已保存到本机'); }, () => {
      if (version === latestSave.current) setStatus('尚未保存');
      setError('写入本地失败，可以先导出正文。');
    });
  }

  function open(id: string) {
    ++latestSave.current;
    setSelected(id);
    setEditing(true);
    setStatus('');
  }

  function create(title = '未命名笔记', body = '') {
    const note = { id: crypto.randomUUID(), title, body, updated: Date.now(), revision: 0 };
    open(note.id);
    persist(note);
  }

  async function remove(note: Note) {
    latestNotes.current = latestNotes.current.filter((item) => item.id !== note.id);
    setNotes(latestNotes.current);
    setSelected(undefined);
    try {
      const queued = storageQueue.current.then(() => deleteNote(note.id));
      storageQueue.current = queued.catch(() => undefined);
      await queued;
    } catch { latestNotes.current = [...latestNotes.current, note]; setNotes(latestNotes.current); setError('删除失败，笔记仍保留。'); }
  }

  async function runAnalysis(note: Note) {
    setRunning(true);
    try {
      const result = await model.analyze(note.body);
      const latest = latestNotes.current.find((item) => item.id === note.id);
      if (latest) persist({ ...latest, analysis: { revision: note.revision, ...result } });
    } catch (error) {
      setError(`分析失败，旧结果未改动。${error instanceof Error ? error.message : ''}`);
    } finally { setRunning(false); }
  }

  const groups = new Map<string, Note[]>();
  for (const note of [...notes].sort((first, second) => second.updated - first.updated)) {
    const date = dateFormat.format(note.updated);
    groups.set(date, [...(groups.get(date) ?? []), note]);
  }

  return <>
    <header className="site-header"><span className="wordmark"><FileText size={21} aria-hidden="true" />离线笔记</span><div className="actions"><span className="status">{offlineReady ? '网页可离线使用' : '浏览器本地'}</span><details className="note-menu model-menu"><summary className="button"><Cpu size={16} aria-hidden="true" />离线模型</summary><div>
      <p className="status" role="status">{model.phase === 'ready' ? '离线模型已就绪' : model.phase === 'warming' ? '正在本机试跑…' : model.phase === 'loading' ? '正在准备模型…' : model.phase === 'downloadable' ? '预计下载约 1.4 GB' : model.detail || '等待网页离线资源就绪'}</p>
      {model.phase === 'loading' && <progress aria-label="模型下载进度" value={model.progress} max={1} />}
      {(model.phase === 'downloadable' || model.phase === 'failed') && <button className="button primary" onClick={model.download}>下载离线模型</button>}
    </div></details></div></header>
    {error && <p className="error" role="alert">{error}<button className="button" onClick={() => setError('')}>关闭</button></p>}
    {current ? <main className="editor">
      <div className="toolbar">
        <button className="button" onClick={() => setSelected(undefined)}><ArrowLeft size={16} aria-hidden="true" />返回日期索引</button>
        <div className="actions">
          <div className="segment" aria-label="正文视图"><button className="button" aria-pressed={editing} onClick={() => setEditing(true)}>编辑</button><button className="button" aria-pressed={!editing} onClick={() => setEditing(false)}>预览</button></div>
          <button className="button" onClick={() => exportNote(current)}><Download size={16} aria-hidden="true" />导出 .md</button>
          <details className="note-menu" key={current.id}><summary className="button" aria-label="更多笔记操作" title="更多笔记操作"><MoreHorizontal size={18} /></summary><div>
            <button className="button" onClick={() => setDialog('rename')}>重命名</button>
            <button className="button" onClick={() => setDialog('delete')}>删除笔记</button>
          </div></details>
        </div>
      </div>
      <section className="sheet" aria-labelledby="note-title">
        <p className="sheet-label">当前笔记</p><h1 id="note-title">{current.title}</h1>
        {editing ? <textarea key={current.id} aria-label="Markdown 正文" autoFocus value={current.body} onChange={(event) => persist({ ...current, body: event.target.value, revision: current.revision + 1, updated: Date.now() })} placeholder="写下你的笔记…" /> : <article className="markdown">{current.body.trim() ? <SafeMarkdown text={current.body} /> : <p className="status">还没有正文</p>}</article>}
      </section>
      <p className="status" role="status">{status || 'Markdown 文档'}</p>
      <details className="analysis-panel" key={current.id}><summary>AI 分析</summary>
        <div className="toolbar"><span className="status" role="status">{model.analysisProgress || (model.phase === 'ready' ? '本机处理' : '离线模型尚未就绪')}</span><button className="button primary" disabled={model.phase !== 'ready' || running || !current.body.trim()} onClick={() => void runAnalysis(current)}>{current.analysis ? '重新分析' : '分析笔记'}</button></div>
        {current.analysis && <div className="markdown">{current.analysis.revision !== current.revision && <p className="stale">基于修改前的笔记</p>}<h3>原文总结</h3><SafeMarkdown text={current.analysis.summary} /><h3>模型补充</h3><p className="status">未经联网核验</p><SafeMarkdown text={current.analysis.supplement} /></div>}
      </details>
      {dialog && <dialog ref={(element) => { modal.current = element; if (element && !element.open) element.showModal(); }} aria-labelledby="dialog-title" onClose={(event) => {
        setDialog(undefined);
        if (event.currentTarget.returnValue !== 'confirm') return;
        if (dialog === 'delete') void remove(current);
        else {
          const form = event.currentTarget.querySelector('form');
          const title = form && new FormData(form).get('title')?.toString().trim();
          if (title && title !== current.title) persist({ ...current, title, updated: Date.now() });
        }
      }}><form method="dialog">
        <h2 id="dialog-title">{dialog === 'delete' ? '删除笔记' : '重命名笔记'}</h2>
        {dialog === 'delete' ? <p>删除「{current.title}」及其分析结果？</p> : <label>笔记标题<input name="title" defaultValue={current.title} required maxLength={100} /></label>}
        <div className="actions"><button className="button" value="cancel" formNoValidate>取消</button><button className="button primary" value="confirm">{dialog === 'delete' ? '确认删除' : '保存'}</button></div>
      </form></dialog>}
    </main> : <main className="index">
      <div className="index-heading">
        <div><h1>笔记索引</h1><p className="status">按最近编辑排列 · {notes.length} 篇笔记</p></div>
        <div className="actions"><button className="button" disabled={loading || loadFailed} onClick={() => fileInput.current?.click()}><Upload size={16} aria-hidden="true" />导入 .txt / .md</button><button className="button primary" disabled={loading || loadFailed} onClick={() => create()}><Plus size={17} aria-hidden="true" />新建笔记</button></div>
      </div>
      {loading ? <p className="empty" role="status">读取本地笔记…</p> : !notes.length ? <p className="empty">{loadFailed ? '本地存储不可用' : '还没有笔记'}</p> : [...groups].map(([date, entries]) => <section className="date-group" key={date}><h2>{date}</h2><div>{entries.map((note) => <button className="entry" key={note.id} onClick={() => open(note.id)}><span><strong>{note.title}</strong><small>{note.body.split('\n').find((line) => line.trim())?.replace(/^#+\s+/, '').slice(0, 100) || '空白笔记'}</small></span><time dateTime={new Date(note.updated).toISOString()}>{timeFormat.format(note.updated)}</time></button>)}</div></section>)}
    </main>}
    <input ref={fileInput} type="file" accept=".txt,.md" hidden onChange={async (event) => {
      const input = event.currentTarget;
      const file = input.files?.[0]; input.value = '';
      if (!file) return;
      try {
        if (!/\.(?:txt|md)$/i.test(file.name)) throw new Error('unsupported file');
        const body = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
        create(file.name.replace(/\.(?:txt|md)$/i, '') || '未命名笔记', body);
      } catch { setError('导入失败，请选择 UTF-8 编码的 .txt 或 .md 文件。'); }
    }} />
  </>;
}
