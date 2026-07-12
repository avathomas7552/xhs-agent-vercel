const express = require('express');
const router = express.Router();
const { generateImage } = require('../services/imageService');

/**
 * POST /api/regen-image
 * Body: { imagePrompt: string }
 * Returns: { imageUrl }
 */
router.post('/regen-image', async (req, res) => {
  const { imagePrompt, apiConfig, imageSize, titleText } = req.body;
  if (!imagePrompt) return res.status(400).json({ error: '缺少 imagePrompt' });

  try {
    const imageUrl = await generateImage(imagePrompt, apiConfig, imageSize, titleText || null);
    return res.json({ imageUrl });
  } catch (err) {
    console.error('[regen-image] 错误:', err.message);
    return res.status(500).json({ error: err.message || '图片生成失败' });
  }
});

module.exports = router;
