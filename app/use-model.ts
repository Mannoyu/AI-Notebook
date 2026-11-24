'use client';

import { useEffect, useRef, useState } from 'react';
import { modelCache, modelManifest } from './model';

type Phase = 'checking' | 'unavailable' | 'downloadable' | 'loading' | 'warming' | 'ready' | 'failed';
type Output = { summary: string; supplement: string };
export type AnalysisPreview = Output & { status: string; rolling: boolean; phase: 'summary' | 'supplement' };
type Reply = { requestId: string; status: string; value?: unknown };
const marker = `${modelCache}:${modelManifest.revision}`;

export function useModel(offlineReady: boolean) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [detail, setDetail] = useState('');
  const [progress, setProgress] = useState(0);
  const worker = useRef<Worker | undefined>(undefined);
  const started = useRef(false);

  function request(type: string, data: object, onProgress: (reply: Reply) => void): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const instance = worker.current ??= new Worker('/inference-worker.mjs', { type: 'module' });
      const requestId = crypto.randomUUID();
      const finish = () => {
        clearTimeout(timer);
        instance.removeEventListener('message', receive);
        instance.removeEventListener('error', crashed);
      };
      const crashed = (event: ErrorEvent) => { finish(); reject(new Error(event.message || '本地推理进程无法启动')); };
      const receive = ({ data: reply }: MessageEvent<Reply>) => {
        if (reply.requestId !== requestId) return;
        if (reply.status === 'ready' || reply.status === 'complete') { finish(); resolve(reply.value); }
        else if (reply.status === 'error') { finish(); reject(new Error(String(reply.value))); }
        else onProgress(reply);
      };
      const timer = setTimeout(() => {
        finish(); instance.terminate(); worker.current = undefined;
        setPhase('failed'); reject(new Error('本地任务超时'));
      }, type === 'load' ? 15 * 60_000 : 10 * 60_000);
      instance.addEventListener('message', receive);
      instance.addEventListener('error', crashed);
      instance.postMessage({ requestId, type, ...data });
    });
  }

  async function load(download: boolean) {
    setPhase('loading'); setProgress(0); setDetail('');
    try {
      await request('load', { manifest: modelManifest, cache: modelCache, download }, (reply) => {
        if (reply.status === 'progress') setProgress(Number(reply.value));
        if (reply.status === 'warmup') setPhase('warming');
      });
      localStorage.setItem(marker, 'ready');
      setPhase('ready');
    } catch (error) {
      worker.current?.terminate(); worker.current = undefined;
      try { localStorage.removeItem(marker); } catch {}
      const cause = error instanceof Error ? error.message : String(error);
      setDetail(download ? `本地模型准备失败：${cause}` : `本地模型无法加载。联网后可手动重新下载。${cause}`);
      setPhase('failed');
    }
  }

  useEffect(() => {
    if (!offlineReady || started.current) return;
    started.current = true;
    void (async () => {
      try {
        const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: ReadonlySet<string> } | null> } }).gpu;
        const adapter = await gpu?.requestAdapter();
        if (!adapter?.features.has('shader-f16')) throw new Error('当前 WebGPU 适配器不支持模型所需的 shader-f16。');
        if (localStorage.getItem(marker) === 'ready') { await load(false); return; }
        const { quota, usage } = await navigator.storage.estimate();
        if (quota !== undefined && usage !== undefined && quota - usage < modelManifest.bytes * 1.2) throw new Error('浏览器可用空间不足。');
        setPhase('downloadable');
      } catch (error) {
        setDetail(error instanceof Error ? error.message : '设备检测失败。'); setPhase('unavailable');
      }
    })();
  }, [offlineReady]);

  function analyze(body: string, onPreview: (preview: AnalysisPreview) => void) {
    let preview: AnalysisPreview = { summary: '', supplement: '', status: '准备分析…', rolling: false, phase: 'summary' };
    onPreview(preview);
    return request('analyze', { body }, (reply) => {
      if (reply.status === 'section') {
        const { progress, final } = reply.value as { progress: number; final: boolean };
        preview = { ...preview, summary: '', status: final ? '正在生成总结…' : `正在整理原文 · 已读 ${progress}%`, rolling: !final };
      } else if (reply.status === 'summary-text') {
        preview = { ...preview, summary: String(reply.value) };
      } else if (reply.status === 'supplement') {
        preview = { ...preview, summary: String(reply.value), status: '正在生成补充…', phase: 'supplement' };
      } else if (reply.status === 'supplement-text') {
        preview = { ...preview, supplement: String(reply.value) };
      } else return;
      onPreview(preview);
    }) as Promise<Output>;
  }

  return { phase, detail, progress, download: () => load(true), analyze };
}
