# 每日AI科技新闻

自动抓取国内外 AI/科技最新资讯，通过 AI 精选排名并生成分析，一站式浏览每日行业动态。

## 功能

- **28+ 信息源** — 覆盖海外媒体、国内媒体、大厂官方博客、社区、学术平台、搜索引擎
- **AI 精选排名** — 一次 AI 调用从所有原始内容中智能挑选 Top 5，按 6 个板块分类并打分
- **AI 深度分析** — 对精选内容自动生成事件简介、行业解读、客观细节、可信度评分
- **实时进度条** — 抓取过程实时显示进度和日志
- **后台管理** — 可视化仪表盘、一键全流程、新闻管理（勾选/删除/导出）
- **Markdown 导出** — 精选日报导出 / 原始链接导出 / 选中文章原文全文导出
- **API 配置界面** — 后台可视化修改 AI 模型、API Key 等配置

## 6 大板块

| 板块 | 说明 |
|------|------|
| 今日最重要的五条新闻 | 当天最重要的 AI/科技综合新闻 |
| 模型与产品 | AI 模型发布、产品更新 |
| 开发者和 AI 工具 | 框架、工具链、开发者生态 |
| 开源研究 | 开源项目、学术论文 |
| 商业、芯片与融资 | 商业动态、芯片、投融资 |
| 政策、安全与行业动态 | 政策法规、AI 安全、行业趋势 |

## 技术栈

- **框架：** Next.js 16 (App Router)
- **语言：** TypeScript
- **数据库：** SQLite (Prisma ORM)
- **AI：** 兼容 OpenAI 格式的 API（通义千问 / DeepSeek / OpenAI 等）
- **爬虫：** RSS / REST API / 网页抓取（cheerio）
- **样式：** Tailwind CSS
- **运行环境：** Node.js 18+

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

```bash
npx prisma db push
```

### 3. 配置 API Key

在后台 `http://localhost:3000/admin` → API 配置 页面填写，或直接编辑 `admin-config.json`：

```json
{
  "AI_API_KEY": "sk-xxx",
  "AI_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "AI_MODEL": "qwen-plus"
}
```

### 4. 启动

```bash
npm run go
```

访问 `http://localhost:3000`

### 5. 登录后台

`http://localhost:3000/admin`

默认账号：`admin` / `密码：123456`

## 工作流程

后台仪表盘提供三步流程按钮：

```
① 抓取 → ② AI 排名 → ③ AI 分析
```

或一键全流程。

抓取时实时显示进度条和日志。排名后未选中的内容自动删除，不浪费 Token。

## 命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run go` | 启动开发服务器（同 dev） |
| `npm run crawl` | 仅抓取原始数据 |
| `npm run rank` | AI 排名精选 |
| `npm run analyze` | AI 深度分析 |
| `npm run pipeline` | 全流程：抓取 → 排名 → 分析 |
| `npm run build` | 构建生产版本 |

## 项目结构

```
dailynews/
├── prisma/schema.prisma    # 数据库模型
├── scripts/
│   ├── crawl.ts            # 爬虫脚本
│   ├── rank.ts             # AI 排名脚本
│   └── analyze.ts          # AI 分析脚本
├── src/
│   ├── app/
│   │   ├── page.tsx        # 首页
│   │   ├── layout.tsx      # 根布局
│   │   ├── admin/          # 后台管理页面
│   │   └── api/            # API 路由
│   ├── components/
│   │   ├── Card.tsx        # 新闻卡片组件
│   │   └── Header.tsx      # 页面头部
│   └── lib/
│       ├── ai.ts           # AI 分析模块
│       ├── db.ts           # 数据库客户端
│       ├── types.ts        # 类型定义
│       └── crawlers/       # 爬虫实现
│           ├── index.ts    # 爬虫注册
│           ├── _rss.ts     # RSS 工具函数
│           ├── techcrunch.ts
│           ├── theverge.ts
│           ├── ...         # 各信息源爬虫
│           └── academic.ts # 学术平台
└── proxy.ts                # 路由鉴权
```

## 信息源列表（21 个）

| 板块 | 来源 |
|------|------|
| 海外媒体 | TechCrunch, The Verge, MIT Tech Review, WIRED, VentureBeat, CNET, Reuters |
| 国内媒体 | 36氪, 量子位, 钛媒体 |
| 官方博客 | OpenAI, Google DeepMind, Meta AI, Anthropic, Microsoft Azure AI, NVIDIA |
| 社区 | Hacker News, 知乎热榜, Reddit ML |
| 学术 | HuggingFace Daily |
| 搜索引擎 | Google News, Bing News, 百度新闻 |

## License

MIT
