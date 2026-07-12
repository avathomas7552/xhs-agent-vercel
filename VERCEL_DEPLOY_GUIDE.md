# Vercel 部署指南

## 前提条件
- 已有 GitHub 账号
- 已有 Vercel 账号（可以用 GitHub 登录）

## 部署步骤

### 1. 推送代码到 GitHub

首先需要在 GitHub 创建一个新仓库，然后推送代码：

```bash
# 如果还没有关联远程仓库，添加远程仓库
git remote add origin https://github.com/你的用户名/xhs-agent.git

# 推送代码到 GitHub
git push -u origin master
```

### 2. 在 Vercel 导入项目

1. 访问 [Vercel](https://vercel.com)
2. 点击 "Add New..." → "Project"
3. 选择你刚才推送的 GitHub 仓库
4. Vercel 会自动检测到 `vercel.json` 配置文件

### 3. 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

**必需的环境变量：**
- `TEXT_API_BASE`: https://api.teamorouter.com/v1
- `TEXT_API_KEY`: sk-teamo-70adb94eb0c317f3f606cfaa69699656d3b94fa2e797de4f
- `TEXT_MODEL`: gpt-5.6-terra
- `IMAGE_API_BASE`: https://api.teamorouter.com/v1
- `IMAGE_API_KEY`: sk-teamo-70adb94eb0c317f3f606cfaa69699656d3b94fa2e797de4f
- `IMAGE_MODEL`: gpt-image-2
- `CORS_ORIGIN`: *

**设置方法：**
1. 在 Vercel 项目页面，点击 "Settings"
2. 点击左侧的 "Environment Variables"
3. 逐个添加上述环境变量
4. 选择应用到所有环境（Production, Preview, Development）

### 4. 部署

1. 点击 "Deploy" 按钮
2. 等待构建完成（大约 2-3 分钟）
3. 部署成功后，Vercel 会提供一个访问链接，例如：`https://xhs-agent.vercel.app`

### 5. 测试

访问部署后的网站，测试以下功能：
- ✅ 前端页面是否正常加载
- ✅ 输入需求后能否正常生成内容
- ✅ 图片生成功能是否正常
- ✅ 聊天功能是否正常

## 常见问题

### Q: 部署后 API 请求失败
**A:** 检查环境变量是否正确配置，特别是 API Key

### Q: 图片无法显示
**A:** Vercel serverless 函数不支持持久化存储，生成的图片需要使用外部存储（如 Cloudinary 或 AWS S3）

### Q: 构建失败
**A:** 检查 `vercel.json` 配置是否正确，确保 `frontend/package.json` 中有 `build` 脚本

## 项目结构

```
xhs-agent/
├── api/                    # Vercel Serverless 函数
│   └── index.js           # API 入口
├── backend/               # 后端代码
│   ├── src/
│   │   ├── routes/       # API 路由
│   │   └── services/     # 业务逻辑
│   └── package.json
├── frontend/              # 前端代码
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── vercel.json           # Vercel 配置
└── README.md
```

## 更新部署

每次推送代码到 GitHub 的 master 分支，Vercel 会自动重新部署。

```bash
git add .
git commit -m "更新说明"
git push
```

## 注意事项

⚠️ **重要**：
1. 不要将 `.env` 文件推送到 GitHub
2. API Key 已经硬编码在指南中，生产环境建议使用更安全的密钥管理方式
3. 图片存储是临时的，刷新后会丢失，建议集成云存储服务
