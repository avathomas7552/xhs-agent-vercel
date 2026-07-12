const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

router.post('/chat', async (req, res) => {
  const { userInput, systemPrompt, chatBase, apiConfig, chatHistory, imageBase64, imageMimeType } = req.body;

  if (!userInput || !userInput.trim()) {
    return res.status(400).json({ error: '请输入内容' });
  }

  const wantsSSE = req.headers.accept?.includes('text/event-stream');
  console.log('[chat] Accept header:', req.headers.accept, '| wantsSSE:', wantsSSE);

  const client = new OpenAI({
    apiKey: apiConfig?.textApiKey || process.env.TEXT_API_KEY,
    baseURL: apiConfig?.textApiBase || process.env.TEXT_API_BASE,
  });
  const model = apiConfig?.textModel || process.env.TEXT_MODEL || 'gpt-5.6-terra';

  const defaultBase = `你是一位专业的小红书运营顾问和AI助手，深度熟悉小红书平台规则、算法机制、内容运营策略和爆款方法论。

你的能力包括：
1. 回答运营咨询：账号定位、内容方向、选题策略、标题技巧、互动提升等
2. 生成图片：当用户要求生成、创作、画图时，你需要用JSON格式回复图片生成指令
3. 分析和理解用户上传的图片

**图片生成指令格式：**
当用户要求生成图片时，你必须严格按照以下JSON格式回复（不要有任何其他文字）：
\`\`\`json
{
  "action": "generate_image",
  "prompt": "详细的英文图片描述，包含风格、构图、色彩等细节",
  "useReference": false
}
\`\`\`

如果用户上传了参考图并要求基于它生成，设置 "useReference": true

**示例：**
用户："帮我画一张猫咪的图片"
你的回复：
\`\`\`json
{
  "action": "generate_image",
  "prompt": "A cute fluffy cat sitting on a windowsill, warm sunlight, cozy home interior, soft focus, high quality photography",
  "useReference": false
}
\`\`\`

如果用户要求生成小红书图文内容（标题、正文、封面等完整内容），请提示他点击「✨ 生成图文」按钮切换到生成模式。`;


  const base = chatBase && chatBase.trim() ? chatBase.trim() : defaultBase;
  const sysMsg = systemPrompt ? `${base}\n\n该用户的账号定位：${systemPrompt}` : base;

  const historyMessages = [];
  if (Array.isArray(chatHistory)) {
    for (const turn of chatHistory) {
      if (turn.role === 'user' && turn.text) {
        historyMessages.push({ role: 'user', content: turn.text });
      } else if (turn.role === 'assistant' && turn.chatReply) {
        historyMessages.push({ role: 'assistant', content: turn.chatReply });
      }
    }
  }

  // 构造用户消息：有图片时用多模态格式
  let userMessage;
  if (imageBase64) {
    const mimeType = imageMimeType || 'image/jpeg';
    userMessage = {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${imageBase64}` },
        },
        { type: 'text', text: userInput },
      ],
    };
  } else {
    userMessage = { role: 'user', content: userInput };
  }

  if (wantsSSE) {
    // 流式返回
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const stream = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: sysMsg },
          ...historyMessages,
          userMessage,
        ],
        temperature: 0.85,
        max_tokens: 1200,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      console.error('[chat] 流式错误:', err.message);
      res.write(`data: ${JSON.stringify({ error: err.message || '聊天失败' })}\n\n`);
      res.end();
    }
  } else {
    // 非流式（兼容）
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: sysMsg },
          ...historyMessages,
          userMessage,
        ],
        temperature: 0.85,
        max_tokens: 1200,
      });

      const reply = response.choices[0].message.content;
      return res.json({ reply });
    } catch (err) {
      console.error('[chat] 错误:', err.message);
      return res.status(500).json({ error: err.message || '聊天失败，请重试' });
    }
  }
});

module.exports = router;
