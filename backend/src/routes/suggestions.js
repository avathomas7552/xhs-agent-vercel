const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

router.post('/suggestions', async (req, res) => {
  const { systemPrompt, systemBase, suggestionsBase, apiConfig } = req.body;

  console.log('[suggestions] 收到请求 systemPrompt:', JSON.stringify(systemPrompt));
  console.log('[suggestions] apiConfig.textApiKey:', apiConfig?.textApiKey ? apiConfig.textApiKey.slice(0, 10) + '...' : '(空，使用env)');

  const client = new OpenAI({
    apiKey: apiConfig?.textApiKey || process.env.TEXT_API_KEY,
    baseURL: apiConfig?.textApiBase || process.env.TEXT_API_BASE,
  });
  const model = apiConfig?.textModel || process.env.TEXT_MODEL || 'gpt-5.6-terra';

  const accountDesc = systemPrompt || systemBase || '';

  const defaultSysMsg = accountDesc
    ? `你是一位小红书内容策划专家，熟悉以下账号定位：\n${accountDesc}\n\n根据这个账号定位，你需要提供3条创作灵感/选题建议，帮助博主找到今天可以创作的内容方向。每条建议应该是一个具体的创作话题或切入角度，15字以内，口语化自然，适合作为小红书图文内容的主题。`
    : `你是一位小红书内容策划专家，精通各类垂直领域的爆款内容策划。你需要提供3条通用创作灵感，覆盖不同场景，每条是一个具体的创作话题，15字以内，口语化自然。`;

  const sysMsg = suggestionsBase && suggestionsBase.trim()
    ? `${suggestionsBase.trim()}\n\n${accountDesc ? `账号定位：${accountDesc}` : ''}`
    : defaultSysMsg;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: sysMsg,
        },
        {
          role: 'user',
          content: accountDesc
            ? `我的小红书账号定位是：${accountDesc}\n\n请根据这个定位，生成3条今天适合创作的图文选题，要贴合账号风格和目标受众。只输出JSON，格式如下：\n{"suggestions": ["选题1", "选题2", "选题3"]}`
            : `请生成3条小红书图文选题建议，覆盖不同场景和人群，口语化自然。只输出JSON，格式如下：\n{"suggestions": ["选题1", "选题2", "选题3"]}`,
        },
      ],
      temperature: 0.9,
      max_tokens: 200,
    });

    const raw = response.choices[0].message.content;
    // 提取 JSON，兼容模型在前后输出多余文字的情况
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : {};
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
    return res.json({ suggestions });
  } catch (err) {
    console.error('[suggestions] 错误:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
