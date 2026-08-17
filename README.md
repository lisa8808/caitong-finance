# 财瞳金融

React 18、TypeScript、Vite 构建的金融行情与智能分析应用。项目包含桌面端、移动端和本地行情 API。

## 环境要求

- Node.js 18+
- npm
- macOS 或 Linux Shell

行情服务所需配置放在 `.env.local`，可参考 `.env.example`。请勿将真实 Token 提交到代码仓库。

## 一键启动

项目根目录提供了完整启动脚本 [`start.sh`](./start.sh)，会自动完成以下操作：

1. 检查 Node.js 和 npm。
2. 缺少依赖时自动执行 `npm install`。
3. 检查前端和 API 端口是否被占用。
4. 同时启动 Vite 前端和本地行情 API。
5. 按 `Ctrl+C` 时统一停止前后端服务。

```bash
cd /Users/apps/AI-caitong
./start.sh
```

也可以通过 npm 启动：

```bash
npm run start:local
```

默认访问地址：

- 前端：http://localhost:8686/caitong-finance/
- 行情 API：http://localhost:8787
- API 健康检查：http://localhost:8787/health

## 自定义启动参数

可以通过环境变量修改监听地址和端口：

```bash
APP_HOST=0.0.0.0 FRONTEND_PORT=8686 API_PORT=8787 ./start.sh
```

可用变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `APP_HOST` | `127.0.0.1` | 前端监听地址 |
| `FRONTEND_PORT` | `8686` | 前端端口 |
| `API_PORT` | `8787` | 本地行情 API 端口 |
| `VITE_API_BASE_URL` | `http://APP_HOST:API_PORT` | 前端访问 API 的地址 |

## 手动启动

安装依赖：

```bash
npm install
```

同时启动前端和 API：

```bash
npm run dev
```

仅启动行情 API：

```bash
npm run dev:api
```

## 停止服务

使用 `start.sh` 或 `npm run start:local` 启动时，在当前终端按：

```text
Ctrl+C
```

脚本会同时停止前端和行情 API。

## 验证服务

检查前端：

```bash
curl -I http://localhost:8686/caitong-finance/
```

检查行情 API：

```bash
curl http://localhost:8787/health
```

## 构建与预览

生产构建：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

构建产物输出到 `dist/`，桌面入口为 `index.html`，移动端入口为 `mobile.html`。

## 端口占用排查

```bash
lsof -nP -iTCP:8686 -sTCP:LISTEN
lsof -nP -iTCP:8787 -sTCP:LISTEN
```

如果端口已被其他项目占用，请停止对应进程，或通过 `FRONTEND_PORT`、`API_PORT` 指定其他端口。
