const express = require('express');
const router = express.Router();
const { optimizeContent } = require('../services/optimizeService');
const { generateImage } = require('../services/imageService');

router.post('/optimize', async (req, res) => {
  const { original, systemPrompt, optimizeBase, apiConfig } = req.body;

  if (!original || !original.body) {
    return res.status(400).json({ error: '请提供原始内容' });
  }

  try {
    const v2 = await optimizeContent(original, systemPrompt, apiConfig, optimizeBase);

    let imageUrl = null;
    try {
      imageUrl = await generateImage(v2.imagePrompt, apiConfig);
    } catch (imgErr) {
      console.warn('[optimize] 图片生成失败，跳过:', imgErr.message);
    }

    return res.json({
      analysis: v2.analysis,
      titles: v2.titles,
      body: v2.body,
      tags: v2.tags,
      imageUrl,
      imagePrompt: v2.imagePrompt,
      improvements: v2.improvements,
    });
  } catch (err) {
    console.error('[optimize] 错误:', err.message);
    return res.status(500).json({ error: err.message || '优化失败，请重试' });
  }
});

module.exports = router;
