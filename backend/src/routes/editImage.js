const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { generateImage } = require('../services/imageService');

/**
 * POST /api/edit-image
 * Body: { imagePrompt, editRequest, apiConfig, imageSize, titleText }
 * 先让 AI 把用户的修改要求融入原 prompt，再重新生成图片
 */
router.post('/edit-image', async (req, res) => {
  const { imagePrompt, editRequest, apiConfig, imageSize, titleText } = req.body;
  if (!editRequest || !editRequest.trim()) {
    return res.status(400).json({ error: '请输入修改要求' });
  }

  const client = new OpenAI({
    apiKey: apiConfig?.textApiKey || process.env.TEXT_API_KEY,
    baseURL: apiConfig?.textApiBase || process.env.TEXT_API_BASE,
  });
  const model = apiConfig?.textModel || process.env.TEXT_MODEL || 'gpt-5.6-terra';

  try {
    // 用 LLM 把修改要求融入原始 prompt
    const promptRes = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: '你是一位专业的图片提示词工程师。用户会给你一个已有的图片生成提示词和修改要求，请你将修改要求融入原提示词，输出一个新的完整提示词。只输出提示词本身，不加任何解释。',
        },
        {
          role: 'user',
          content: `原始提示词：${imagePrompt || '小红书封面图'}\n\n用户修改要求：${editRequest}\n\n请输出融合后的新提示词（英文为主，可包含中文内容说明）：`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const newPrompt = promptRes.choices[0].message.content.trim();
    console.log('[edit-image] 新提示词:', newPrompt);

    const imageUrl = await generateImage(newPrompt, apiConfig, imageSize, titleText || null);
    return res.json({ imageUrl, newPrompt });
  } catch (err) {
    console.error('[edit-image] 错误:', err.message);
    return res.status(500).json({ error: err.message || '封面修改失败' });
  }
});

module.exports = router;
