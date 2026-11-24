# AI Notebook · 离线笔记助手

React + TypeScript + Next.js App Router 网页。首版以用户的 Windows 电脑和 Ego 浏览器为验收环境，不要求安装 App。

```sh
npm ci
npm run dev
```

开发入口为 `http://localhost:3000`。离线网页和端侧模型使用生产构建验证：

```sh
npm run build
npm run typecheck
npm start
```

## 阶段交付

- 在 `dev` 分支开发，每个阶段独立验证并提交后推送到 `origin/dev`，默认不改 `main`。
- 网页与笔记保存在当前浏览器配置和当前站点下。首次访问等待「网页可离线使用」后，可离线记笔记。清除站点数据或换一个端口都不会保留原站点的笔记。
- AI 是可选功能。生产构建下，在「离线模型」菜单主动下载约 1.4 GB，试跑通过后才显示就绪。笔记不发送给服务端。
- 实测情况与未通过的验收项见[验收记录](docs/acceptance.md)。

详见[功能规范](docs/spec.md)、[技术设计](docs/plan.md)、[实施任务](docs/tasks.md)和[原型定稿](design-selected/direction-approved.md)。
