# 小红书AI内容生成助手

一句话输入 → 封面图 + 标题 + 正文 + 标签四件套 → 一键复制 → V2算法优化

## 快速启动

### 1. 配置 API Key

```bash
# 编辑 backend/.env，填入你的 uuapi.net API Key
UUAPI_KEY=your_uuapi_key_here
```

### 2. 启动（Windows）

双击 `start.bat`，或分别启动：

```bash
# 后端（新终端）
cd backend && npm install && npm run dev

# 前端（新终端）
cd frontend && npm install && npm run dev
```

### 3. 访问

打开浏览器访问 http://localhost:5173

---

## 目录结构

```
xhs-agent/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express 入口
│   │   ├── routes/
│   │   │   ├── generate.js       # POST /api/generate
│   │   │   └── optimize.js       # POST /api/optimize
│   │   └── services/
│   │       ├── contentService.js # 文本内容生成
│   │       ├── imageService.js   # GPT Image 封面生成
│   │       └── optimizeService.js# V2 算法优化
│   ├── .env                      # 环境变量（不提交）
│   └── .env.example              # 环境变量模板
└── frontend/
    └── src/
        ├── App.jsx               # 主应用（Chat UI）
        ├── hooks/useApi.js       # API 调用封装
        └── components/
            ├── ContentCard.jsx   # 四件套内容卡片
            ├── ChatInput.jsx     # 输入框组件
            └── SystemPromptPanel.jsx # 账号风格配置
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/generate` | POST | 生成四件套内容 |
| `/api/optimize` | POST | V2 算法优化 |

## 安全说明

- API Key 仅存储在 `backend/.env`，前端零接触
- 所有 AI 调用均在后端 Service 层完成
- 前端通过代理访问后端，不直接暴露后端端口
