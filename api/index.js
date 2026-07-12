const path = require('path');

// 设置环境变量，确保 dotenv 从正确的位置加载
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// 加载 backend 的依赖
const express = require('express');
const cors = require('cors');

const app = express();

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['*'],
  credentials: true
}));
app.use(express.json({ limit: '20mb' }));

// 路由处理器（直接引入路由逻辑）
const generateRouter = require('../backend/src/routes/generate');
const optimizeRouter = require('../backend/src/routes/optimize');
const regenImageRouter = require('../backend/src/routes/regenImage');
const editImageRouter = require('../backend/src/routes/editImage');
const suggestionsRouter = require('../backend/src/routes/suggestions');
const chatRouter = require('../backend/src/routes/chat');
const chatGenerateRouter = require('../backend/src/routes/chatGenerate');
const aiRefinePromptsRouter = require('../backend/src/routes/aiRefinePrompts');
const downloadRouter = require('../backend/src/routes/download');

// 注册路由
app.use('/api', generateRouter);
app.use('/api', optimizeRouter);
app.use('/api', regenImageRouter);
app.use('/api', editImageRouter);
app.use('/api', suggestionsRouter);
app.use('/api', chatRouter);
app.use('/api', chatGenerateRouter);
app.use('/api', aiRefinePromptsRouter);
app.use('/api', downloadRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 提供前端静态文件
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// 所有其他路由返回 index.html（用于 SPA 路由）
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Vercel Serverless 函数导出
module.exports = app;
