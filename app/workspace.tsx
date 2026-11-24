'use client';

import { ArrowLeft, FileText, Plus } from 'lucide-react';
import { useState } from 'react';

export function Workspace() {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  return (
    <>
      <header className="site-header">
        <span className="wordmark"><FileText size={21} aria-hidden="true" />离线笔记</span>
        <span className="status">框架预览</span>
      </header>
      {editing ? (
        <main className="editor">
          <button className="button" type="button" onClick={() => setEditing(false)}>
            <ArrowLeft size={16} aria-hidden="true" /> 返回日期索引
          </button>
          <section className="sheet" aria-labelledby="note-title">
            <h1 id="note-title">未命名笔记</h1>
            <textarea aria-label="笔记正文" autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="写下你的笔记…" />
          </section>
          <p className="status">临时草稿 · 刷新后不保留</p>
        </main>
      ) : (
        <main className="index">
          <div className="index-heading">
            <div><h1>笔记索引</h1><p className="status">按最近编辑排列</p></div>
            <button className="button primary" type="button" onClick={() => setEditing(true)}>
              {draft ? <FileText size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
              {draft ? '继续编辑' : '新建笔记'}
            </button>
          </div>
          <p className="empty">{draft ? '1 篇临时草稿' : '还没有笔记'}</p>
        </main>
      )}
    </>
  );
}
