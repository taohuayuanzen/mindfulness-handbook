# 正念手册 · 桃源正念

基于《冥想正念手册》（Headspace Guide）的每日冥想练习工具。

## 功能

- **今日推荐** — 每日一个随机练习（基于日期 hash），支持「换一个」
- **全部练习** — 按 6 大分类分组展示 56 个练习，支持搜索与分类筛选
- **我的收藏** — 收藏喜欢的练习，localStorage 持久化
- **引导词展开** — 点击展开完整分步引导词，跟随练习

## 技术栈

纯静态单页应用，零依赖，双击即可运行。

| 层次 | 技术 |
|------|------|
| 样式 | Tailwind CSS CDN + 自定义 CSS |
| 字体 | Google Fonts（Noto Serif SC + Noto Sans SC）|
| 数据 | 内嵌 JS 数组（56 个练习）|
| 存储 | localStorage（收藏）|

## 项目结构

```
MindfulnessHandbook/
├── index.html        # 入口（HTML + 外部引用）
├── css/
│   └── style.css     # 全部样式
└── js/
    ├── data.js       # 56 个练习数据
    └── main.js       # 7 个功能模块 + 初始化
```

- **7 个 JS 模块**：DataStore、TabRouter、TodayPick、RenderEngine、SearchFilter、Favorites、GuideExpander
- **6 大分类**：坐禅(11)、行禅(6)、生活正念(18)、睡前冥想(6)、情绪与思绪(9)、视觉化与意象(6)
- **练习总数**：56 个

## 启动方式

直接双击 `index.html` 在浏览器中打开即可。也可部署到任意静态托管服务（GitHub Pages / Vercel 等）。
