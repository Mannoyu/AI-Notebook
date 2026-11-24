# AI Notebook · 离线笔记助手

React + TypeScript + Next.js App Router 网页。首版以用户的 Windows 电脑和 Ego 浏览器为验收环境，不要求安装 App。

```sh
npm ci
npm run dev
```

开发入口为 `http://localhost:3000`。提交前运行 `npm run build` 和 `npm run typecheck`。

## 阶段交付

- 在 `dev` 分支开发，每个阶段独立验证并提交后推送到 `origin/dev`，默认不改 `main`。
- 第一阶段：应用骨架、钴蓝主题、日期索引和专注编辑的页面结构。只提供临时草稿，不声称已实现持久化、模型推理或断网重开。
- 下一阶段：完成 T01 技术验证，用真实模型和生产构建验证 Ego 下载、试跑及系统断网重开。

详见[功能规范](docs/spec.md)、[技术设计](docs/plan.md)、[实施任务](docs/tasks.md)和[原型定稿](design-selected/direction-approved.md)。
