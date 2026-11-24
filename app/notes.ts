export type Analysis = { revision: number; summary: string; supplement: string };
export type Note = { id: string; title: string; body: string; updated: number; revision: number; analysis?: Analysis };

let connection: Promise<IDBDatabase> | undefined;

function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('ai-notebook', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('notes', { keyPath: 'id' });
    request.onerror = () => { connection = undefined; reject(request.error); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
  });
}

async function transact<Result>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<Result>) {
  const db = await database();
  return new Promise<Result>((resolve, reject) => {
    const transaction = db.transaction('notes', mode);
    const request = run(transaction.objectStore('notes'));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onabort = () => reject(transaction.error ?? request.error);
  });
}

export const listNotes = () => transact<Note[]>('readonly', (store) => store.getAll());
export const saveNote = (note: Note) => transact('readwrite', (store) => store.put(note));
export const deleteNote = (id: string) => transact('readwrite', (store) => store.delete(id));

export function exportNote(note: Note) {
  const result = note.analysis;
  const extra = result ? `\n\n## AI 分析\n\n${result.revision !== note.revision ? '> 基于修改前的笔记\n\n' : ''}### 原文总结\n\n${result.summary}\n\n### 模型补充（未经联网核验）\n\n${result.supplement}` : '';
  const url = URL.createObjectURL(new Blob([`# ${note.title}\n\n${note.body}${extra}\n`], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${note.title.replace(/[<>:"/\\|?*]/g, '_')}.md`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
