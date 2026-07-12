require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({ origin: [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://localhost:5174'] }));
app.use(express.json({ limit: '20mb' }));

// 静态文件服务 - 用于提供生成的图片
app.use('/generated', express.static(path.join(__dirname, '../public/generated')));

// 前端静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 路由注册
app.use('/api', require('./routes/generate'));
app.use('/api', require('./routes/optimize'));
app.use('/api', require('./routes/regenImage'));
app.use('/api', require('./routes/editImage'));
app.use('/api', require('./routes/suggestions'));
app.use('/api', require('./routes/chat'));
app.use('/api', require('./routes/chatGenerate'));
app.use('/api', require('./routes/aiRefinePrompts'));
app.use('/api', require('./routes/download'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[xhs-agent] 后端服务已启动: http://localhost:${PORT}`);
});
