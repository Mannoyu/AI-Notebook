# AI Notebook · 离线笔记助手

在浏览器里记录、导入和分析 Markdown 笔记。AI 功能可选：下载模型后，可用 WebGPU 在本机流式生成总结和补充，不调用云端推理 API，也不上传笔记。无需安装 App；不下载模型也能使用笔记功能。

**技术栈**：React · TypeScript · Next.js App Router · Transformers.js · WebGPU · Web Worker · Service Worker · IndexedDB

## 功能演示

1. 新建笔记，或导入 UTF-8 编码的 `.txt` / `.md` 文件。正文自动保存，可切换 Markdown 编辑与预览。
2. 打开「离线模型」菜单。浏览器通过 WebGPU、`shader-f16` 和可估算的存储空间检查后，可手动下载约 1.4 GB 的模型。通过本机试跑才显示就绪。
3. 点击「分析笔记」。宽屏下左侧保留原文，右侧先后流式展示原文总结与模型补充；分析过程中仍可编辑笔记。
4. 导出 `.md`，包含当前原文和最近一次成功的分析。如果正文已修改，导出也会标注分析基于旧版本。

## 实现要点

| 难点 | 实现 |
| --- | --- |
| 浏览器内流式推理 | 在 [Web Worker](public/inference-worker.mjs) 中通过 Transformers.js + WebGPU 运行 DeepSeek-R1-Distill-Qwen-1.5B ONNX（`q4f16`）。用 `TextStreamer` 回传可见正文，把进度、草稿与最终结果区分开，不显示模型推理过程。 |
| 长文超出单轮预算 | 用实际 tokenizer 计算提示词、滚动摘要、下一段原文和生成预留，尽量按段落切分。压缩后生成结构化总结，补充单独生成；原始笔记不变。 |
| 分离三类本地数据 | [Service Worker](scripts/offline-worker.js) 预缓存生产网页、Worker 与运行时；模型文件使用独立缓存；[IndexedDB](app/notes.ts) 保存笔记和最终分析。网页壳换版不清理模型和笔记。 |
| 分析期间的状态一致性 | [工作区](app/workspace.tsx) 将结果绑定到分析启动时的正文版本。继续编辑会使分析标记为过时；删除后不恢复笔记；失败重跑不覆盖旧结果。流式草稿不保存、不导出。 |

## 本地运行

需要 Node.js `>=20.9.0`。普通笔记功能可用开发模式预览：

```sh
npm ci
npm run dev
```

打开 `http://localhost:3000`。要体验 Service Worker 缓存和端侧模型，使用生产构建：

```sh
npm run build
npm run typecheck
npm start
```

模型首次下载需要联网。在「网页可离线使用」和「离线模型已就绪」分别出现后，可使用已经缓存的功能。重开请使用**同一个浏览器配置、同一个地址和端口**；换来源不会带走笔记，清除站点数据可能删除笔记和缓存。

## 验收与限制

- **已验证**：在 Windows + Ego 上完成真实 WebGPU 推理、双栏流式输出、结果刷新回读，以及模拟离线后从缓存加载模型并分析新笔记。
- **尚未验证**：系统断网后完整重启浏览器，以及 Chrome、Edge 和移动端兼容性。WebGPU 不可用或模型未就绪时，仍可编辑并导出笔记。
- **生成质量**：当前模型在对照样本中可能过度归因，长文可能遗漏细节，输出需要人工核对。具体样本与结果见[验收记录](docs/acceptance.md)。

## 设计文档

[功能规范](docs/spec.md) · [技术设计](docs/plan.md) · [实施任务](docs/tasks.md) · [原型定稿](design-selected/direction-approved.md)

浏览器端模型集成参考 Hugging Face 的 [DeepSeek-R1 WebGPU 示例](https://github.com/huggingface/transformers.js-examples/tree/main/deepseek-r1-webgpu)；项目聚焦笔记流程、本地存储、离线缓存和流式交互。
