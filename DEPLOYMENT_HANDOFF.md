# XHS Agent 部署交接文档

## 项目基本信息
- **项目名称**：小红书AI内容生成助手（XHS Agent）
- **GitHub 仓库**：https://github.com/avathomas7552/xhs-agent
- **Railway 项目 ID**：3761d9ae-bec1-4314-8b13-fe5129b19606
- **Railway 项目链接**：https://railway.com/project/3761d9ae-bec1-4314-8b13-fe5129b19606

---

## 项目结构
```
xhs-agent/
├── backend/                 # Node.js Express 后端
│   ├── package.json
│   ├── src/
│   │   └── index.js        # 主入口
│   └── .env.example
├── frontend/               # React + Vite 前端
│   ├── package.json
│   ├── src/
│   └── dist/              # 构建输出目录
├── README.md
├── start.bat
├── railway.toml           # ✅ 已创建
└── Dockerfile             # ✅ 已创建
```

---

## 当前部署状态

### ✅ 已完成
1. ✅ GitHub 仓库创建和代码上传
2. ✅ Railway 账户注册和授权
3. ✅ Railway 项目创建
4. ✅ GitHub 仓库连接到 Railway
5. ✅ 创建 railway.toml 配置文件
6. ✅ 创建 Dockerfile

### ❌ 遇到的问题
1. **构建失败**：Railpack could not determine how to build the app
   - 原因：项目根目录没有 package.json，有两个子文件夹 (backend/ 和 frontend/)
   - 解决方案：已添加 railway.toml 和 Dockerfile

---

## 需要手动上传的文件到 GitHub

### 文件1：railway.toml
**位置**：项目根目录
**内容**：
```toml
[build]
builder = "dockerfile"

[deploy]
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

### 文件2：Dockerfile
**位置**：项目根目录
**内容**：
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制 backend
COPY backend ./backend
COPY frontend ./frontend

# 安装后端依赖
WORKDIR /app/backend
RUN npm install

# 安装前端依赖并构建
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# 返回后端目录
WORKDIR /app/backend

# 暴露端口
EXPOSE 3000

# 启动后端服务
CMD ["npm", "start"]
```

---

## 后续部署步骤

### 1️⃣ 上传这两个文件到 GitHub
- 访问：https://github.com/avathomas7552/xhs-agent
- 点 **"Add file"** → **"Upload files"**
- 上传 `railway.toml` 和 `Dockerfile` 到项目根目录
- 提交更改

### 2️⃣ 触发 Railway 重新构建
- 文件上传后，Railway 会自动检测代码变化
- 自动触发新的构建部署
- 约 5-15 分钟完成

### 3️⃣ 检查部署状态
- 访问 Railway 项目：https://railway.com/project/3761d9ae-bec1-4314-8b13-fe5129b19606
- 查看 **Deployments** 标签
- 如果显示绿色 ✅，说明部署成功

### 4️⃣ 获取访问 URL
- 部署成功后，点 **"Networking"** 标签
- 点 **"Generate Domain"** 生成公开访问链接
- URL 格式：`https://xhs-agent-xxx.railway.app`

---

## 项目配置信息

### 后端配置
- **主文件**：backend/src/index.js
- **启动命令**：npm start
- **依赖**：
  - Express（Web 框架）
  - Anthropic SDK（Claude AI）
  - OpenAI SDK
  - CORS（跨域支持）
  - Dotenv（环境变量）

### 前端配置
- **框架**：React 18 + Vite
- **构建命令**：npm run build
- **输出目录**：frontend/dist
- **依赖**：
  - React Three Fiber（3D支持）
  - React Markdown

---

## 用户配置（部署后需要）

### 用户需要在前端输入的配置
用户自己在网站上输入（不需要在部署时提供）：
- **Anthropic API Key**（用于 Claude AI）
- **OpenAI API Key**（用于 GPT）

项目设计：用户在界面上输入 API Key，前端将请求发送到后端，后端调用 AI API。

---

## 问题排查

### 如果部署仍然失败
1. 查看 **Build Logs** 中的具体错误信息
2. 常见问题：
   - npm install 失败 → 检查 package.json 依赖是否有问题
   - 前端构建失败 → 检查 src/ 文件是否有语法错误
   - 后端启动失败 → 检查 backend/src/index.js 是否有问题

### 部署成功但无法访问
1. 检查 **Networking** 中是否生成了域名
2. 检查防火墙/代理设置
3. 在 Railway 项目中查看 **Console** 日志，看后端是否正常运行

---

## 重要提醒
- GitHub 仓库已连接到 Railway，任何推送到 main 分支的代码都会自动触发构建
- 如果需要修改代码，本地修改后 git push 到 GitHub，Railway 会自动重新构建
- Railway 免费额度为 $5/月，小项目足够使用

---

## 快速检查清单
- [ ] railway.toml 文件已上传到 GitHub 根目录
- [ ] Dockerfile 文件已上传到 GitHub 根目录
- [ ] Railway 自动触发了新的构建
- [ ] 构建成功（Build Logs 显示绿色）
- [ ] 在 Networking 中生成了访问域名
- [ ] 可以通过域名访问前端页面
- [ ] 前端页面加载正常

---

**交接时间**：2026-07-12
**交接人**：Claude Code
**接手人**：CODEX
