# EVA Title Generator

EVA 风格封面图生成器。支持多种尺寸、多套主题，导出高分辨率 SVG / PNG，全程无需后端。

**在线地址**：部署后填写

---

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | [Astro](https://astro.build) 5 (纯静态输出) |
| 语言 | TypeScript |
| 样式 | 原生 CSS（无框架） |
| 部署 | Cloudflare Pages |
| 字体 | 自托管（EVA 字体 + Inter fallback） |

---

## 本地开发

**环境要求**：Node.js 18+，npm / pnpm / yarn 任意一种。

```bash
# 克隆
git clone https://github.com/你的用户名/eva-title-new.git
cd eva-title-new

# 安装依赖
npm install

# 启动开发服务器（http://localhost:4321）
npm run dev

# 构建静态文件到 dist/
npm run build

# 预览构建产物
npm run preview
```

---

## 上传到 GitHub

### 首次推送

```bash
cd eva-title-new

# 初始化 git
git init
git add .
git commit -m "initial commit"

# 关联远端（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/eva-title-new.git

# 推送
git branch -M main
git push -u origin main
```

### 后续更新

```bash
git add .
git commit -m "描述本次改动"
git push
```

### `.gitignore` 建议

项目根目录创建 `.gitignore`，写入以下内容（`node_modules` 和 `dist` 不需要上传）：

```
node_modules/
dist/
.DS_Store
.env
*.local
```

---

## 部署到 Cloudflare Pages

### 方式一：连接 GitHub 仓库（推荐，自动 CI/CD）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧导航 → **Workers & Pages** → **Create** → **Pages**
3. 选择 **Connect to Git** → 授权 GitHub → 选择本仓库
4. 配置构建：

   | 项目 | 值 |
   |---|---|
   | Framework preset | **Astro** |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `/`（留空） |
   | Node.js version | `18`（Environment variables 里设 `NODE_VERSION=18`） |

5. 点击 **Save and Deploy**

部署完成后 Cloudflare 会分配一个 `*.pages.dev` 域名。

#### 已绑定仓库后如何更新站点

**推送即部署，无需任何手动操作。**

```
本地改代码 → git push → Cloudflare 自动检测到新提交 → 拉取构建 → 上线
```

整个流程约 1–2 分钟。可在 Cloudflare Dashboard → **Workers & Pages** → 你的项目 → **Deployments** 标签页实时查看构建日志和状态。

> 如果只想预览某个分支而不影响生产环境，推送到非 `main` 分支即可——Cloudflare Pages 会为每个分支生成独立的预览 URL。

---

### 方式二：直接上传 dist/（无需 GitHub）

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录
wrangler login

# 构建
npm run build

# 上传（替换 your-project-name）
wrangler pages deploy dist --project-name=your-project-name
```

首次运行会引导创建 Pages 项目，之后每次运行直接部署。

---

### 绑定自定义域名

1. Cloudflare Dashboard → **Workers & Pages** → 你的项目 → **Custom domains**
2. 填入你的域名 → **Continue**
3. 如果域名已在 Cloudflare 托管，DNS 记录自动添加；否则按提示在域名注册商处添加 CNAME 记录

---

## 项目结构

```
src/
├── components/          # Astro 组件
│   ├── ControlPanel.astro   # 左侧控制面板
│   ├── PreviewStage.astro   # 右侧预览区 + 主题条
│   ├── GeneratorShell.astro # 生成器容器
│   └── SiteFooter.astro     # 页脚
├── layouts/
│   ├── AppLayout.astro      # 生成器全屏布局
│   └── BaseLayout.astro     # 信息页布局
├── lib/
│   ├── config/
│   │   ├── formats.ts       # 输出格式定义（5:2 / 16:9 / 21:9 / 4:3 / 微信）
│   │   └── themes.ts        # 主题配置（9 套）
│   ├── generator/
│   │   ├── app.ts           # 前端交互逻辑
│   │   ├── build-svg.ts     # SVG 生成核心
│   │   ├── layout.ts        # 排版比例计算
│   │   ├── font-loader.ts   # 字体加载
│   │   ├── export-png.ts    # PNG 导出
│   │   ├── export-svg.ts    # SVG 下载
│   │   ├── ambient.ts       # 背景 3D 网格动效
│   │   └── state.ts         # 状态持久化
│   └── i18n/                # 中英双语
├── pages/
│   ├── index.astro          # 首页（生成器）
│   ├── about.astro          # 关于页
│   ├── faq.astro            # FAQ
│   └── en/                  # 英文版对应页面
└── styles/
    ├── tokens.css           # 设计 token（颜色、间距）
    ├── base.css             # 基础样式 + App Shell
    └── generator.css        # 生成器 UI 样式
```

---

## 添加新主题

编辑 `src/lib/config/themes.ts`，在 `themeOptions` 数组中添加一条：

```ts
{ id: 'mytheme', base: '#0d0d0d', accent: '#00ff88' }
```

同时在 `src/lib/i18n/zh-CN.ts` 和 `en-US.ts` 的 `themeCopy` 中补充对应名称即可。

---

## License

MIT
