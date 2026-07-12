const express = require('express');
const router = express.Router();
const { generateContent } = require('../services/contentService');
const { generateImage } = require('../services/imageService');

// 分步生成：先返回文字，再生成图片（SSE流式）
router.post('/generate', async (req, res) => {
  const { userInput, systemPrompt, imageStylePrompt, systemBase, apiConfig, chatHistory, imageSize, imageBase64, imageMimeType, imageBase64Array, imageMimeTypeArray } = req.body;

  if (!userInput || !userInput.trim()) {
    return res.status(400).json({ error: '请输入内容需求' });
  }

  // 支持多张图片：优先使用数组，如果没有则使用单张
  const images = imageBase64Array || (imageBase64 ? [imageBase64] : null);
  const mimeTypes = imageMimeTypeArray || (imageMimeType ? [imageMimeType] : null);

  // 检测客户端是否支持 SSE（通过 accept 头）
  const wantsSSE = req.headers['accept'] === 'text/event-stream';

  if (wantsSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    function send(event, data) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
    // 心跳：每 15 秒发一个注释行，防止代理/浏览器因空闲断开 SSE 连接
    const heartbeat = setInterval(() => { res.write(': ping\n\n'); }, 15000);

    try {
      send('step', { step: 'thinking', label: '深度分析你的需求...' });
      const content = await generateContent(userInput, systemPrompt, imageStylePrompt, apiConfig, chatHistory, systemBase, images, mimeTypes);
      send('step', { step: 'text_done', label: '文案生成完成，正在创作封面图...' });
      send('content', content);

      let imageUrl = null;
      try {
        // 生成封面图时，如果有多张参考图，优先使用第一张进行图生图，因为 API 只支持单张参考图
        // 但 contentService 中的 imagePrompt 已经综合分析了所有图片
        const refImage = images && images.length > 0 ? images[0] : null;
        const refMimeType = mimeTypes && mimeTypes.length > 0 ? mimeTypes[0] : null;
        imageUrl = await generateImage(content.imagePrompt, apiConfig, imageSize, (content.titles || [])[0], refImage, refMimeType);
        console.log('[generate] generateImage返回的imageUrl:', imageUrl);
      } catch (imgErr) {
        console.warn('[generate] 图片生成失败:', imgErr.message);
      }

      clearInterval(heartbeat);
      console.log('[generate] 准备发送done事件，imageUrl:', imageUrl);
      send('done', {
        titles: content.titles,
        body: content.body,
        tags: content.tags,
        imageUrl,
        imagePrompt: content.imagePrompt,
      });
      res.end();
    } catch (err) {
      clearInterval(heartbeat);
      send('error', { error: err.message || '生成失败，请重试' });
      res.end();
    }
  } else {
    // 普通 JSON 请求（兼容）
    try {
      const content = await generateContent(userInput, systemPrompt, imageStylePrompt, apiConfig, chatHistory, systemBase, imageBase64, imageMimeType);
      let imageUrl = null;
      try {
        imageUrl = await generateImage(content.imagePrompt, apiConfig, imageSize, (content.titles || [])[0], imageBase64, imageMimeType);
      } catch (imgErr) {
        console.warn('[generate] 图片生成失败，跳过:', imgErr.message);
      }
      return res.json({
        titles: content.titles,
        body: content.body,
        tags: content.tags,
        imageUrl,
        imagePrompt: content.imagePrompt,
      });
    } catch (err) {
      console.error('[generate] 错误:', err.message);
      return res.status(500).json({ error: err.message || '生成失败，请重试' });
    }
  }
});

module.exports = router;
