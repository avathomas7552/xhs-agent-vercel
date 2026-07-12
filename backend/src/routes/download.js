const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

router.get('/download-image', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: '缺少url参数' });
  }

  try {
    // 验证URL是否有效
    const imageUrl = new URL(url);
    const protocol = imageUrl.protocol === 'https:' ? https : http;

    protocol.get(url, (response) => {
      // 检查状态码
      if (response.statusCode !== 200) {
        return res.status(response.statusCode).json({ error: '获取图片失败' });
      }

      // 设置响应头以支持下载
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="xhs_cover.png"');

      // 流式传输
      response.pipe(res);
    }).on('error', (err) => {
      console.error('[download-image] 错误:', err.message);
      res.status(500).json({ error: '下载失败：' + err.message });
    });
  } catch (err) {
    console.error('[download-image] URL验证失败:', err.message);
    res.status(400).json({ error: '无效的URL' });
  }
});

module.exports = router;
