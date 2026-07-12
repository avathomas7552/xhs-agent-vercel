const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { generateImage } = require('../services/imageService');

// 聊天模式的图片生成
router.post('/chat-generate-image', async (req, res) => {
  const { prompt, apiConfig, imageSize, referenceImages } = req.body;

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: '请提供图片描述' });
  }

  try {
    // 如果有多张参考图，只使用第一张
    const refImage = referenceImages && referenceImages.length > 0 ? referenceImages[0] : null;

    const imageUrl = await generateImage(
      prompt,
      apiConfig,
      imageSize || '1024x1024',
      null, // 不需要标题文字
      refImage?.base64,
      refImage?.mimeType
    );

    return res.json({ imageUrl });
  } catch (err) {
    console.error('[chat-generate-image] 错误:', err.message);
    return res.status(500).json({ error: err.message || '图片生成失败' });
  }
});

module.exports = router;
