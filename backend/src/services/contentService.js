const OpenAI = require('openai');

function getClient(apiConfig) {
  return new OpenAI({
    apiKey: apiConfig?.textApiKey || process.env.TEXT_API_KEY,
    baseURL: apiConfig?.textApiBase || process.env.TEXT_API_BASE,
  });
}

const SYSTEM_BASE_DEFAULT = `你是一位专业的小红书内容创作者，擅长创作高传播性的爆款内容。
请严格按照JSON格式输出，不要输出任何其他内容。`;

const OUTPUT_SCHEMA = `
输出必须是合法JSON，结构如下：
{
  "titles": ["标题1（含emoji）", "标题2（含emoji）", "标题3（含emoji）"],
  "body": "正文内容，包含emoji，分段清晰，800字以内",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "imagePrompt": "小红书封面图中文提示词，必须用中文描述，要求包含：1. 图片拼贴方式（如左右分栏、上下布局、居中构图等），2. 标题内容与位置（画面中央/顶部/底部，具体文字内容），3. 字体风格（加粗黑体/手写体/衬线体等），4. 色彩氛围（暖色调/冷色调/高级灰/清新淡雅等），5. 商业设计感（扁平化/质感/光影/纹理等），6. 负面限制（禁止模糊、禁止文字错乱等）。整体3:4竖版构图，高清质感。"
}`;

async function generateContent(userInput, systemPrompt, imageStylePrompt, apiConfig, chatHistory, systemBase, imageBase64, imageMimeType) {
  const client = getClient(apiConfig);
  const model = apiConfig?.textModel || process.env.TEXT_MODEL || 'gpt-5.6-terra';

  const base = (systemBase && systemBase.trim()) ? systemBase.trim() : SYSTEM_BASE_DEFAULT;
  const sysMsg = systemPrompt
    ? `${base}\n\n【账号风格设定 - 必须严格遵守】\n${systemPrompt}\n\n以上账号风格是本次创作的核心约束，标题语气、正文措辞、emoji使用习惯、内容选题方向都必须符合上述风格描述。`
    : base;

  // 如果有封面图风格提示词，添加到系统消息中
  const finalSysMsg = imageStylePrompt
    ? `${sysMsg}\n\n【封面图风格要求】\n${imageStylePrompt}\n\n在生成imagePrompt时，必须融入以上封面图风格要求。`
    : sysMsg;

  // 构建多轮对话 messages
  const historyMessages = [];
  if (Array.isArray(chatHistory) && chatHistory.length > 0) {
    for (const turn of chatHistory) {
      if (turn.role === 'user' && turn.text) {
        historyMessages.push({ role: 'user', content: turn.text });
      } else if (turn.role === 'assistant' && turn.content) {
        const c = turn.content;
        const summary = `已生成内容：\n标题：${(c.titles || [])[0] || ''}\n正文摘要：${(c.body || '').slice(0, 100)}...\n标签：${(c.tags || []).join(' ')}`;
        historyMessages.push({ role: 'assistant', content: summary });
      }
    }
  }

  // 用户消息：有图片时用多模态格式，支持多张图片
  // 支持单张或多张图片
  const images = Array.isArray(imageBase64) ? imageBase64 : (imageBase64 ? [imageBase64] : []);
  const mimeTypes = Array.isArray(imageMimeType) ? imageMimeType : (imageMimeType ? [imageMimeType] : []);

  // 根据图片数量调整提示词，明确指出要参考所有图片
  let imageInstruction = '';
  if (images.length > 1) {
    imageInstruction = `\n\n【重要】已上传 ${images.length} 张参考图片，请充分分析所有图片的内容、风格、构图等特征，综合参考所有图片来生成imagePrompt，确保生成的封面图能融合所有参考图片的优点。`;
  } else if (images.length === 1) {
    imageInstruction = `\n\n【重要】已上传参考图片，请分析图片内容和风格，用这些特征来生成imagePrompt。`;
  }

  const userText = `请根据以下需求创作小红书内容${systemPrompt ? '（必须严格按照系统设定的账号风格创作）' : ''}：\n${userInput}${imageInstruction}\n\n${OUTPUT_SCHEMA}`;
  let userMessage;

  if (images.length > 0) {
    const content = [];
    // 添加所有图片
    images.forEach((img, idx) => {
      const mime = mimeTypes[idx] || 'image/jpeg';
      content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${img}` } });
    });
    // 添加文本
    content.push({ type: 'text', text: userText });
    userMessage = { role: 'user', content };
  } else {
    userMessage = { role: 'user', content: userText };
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: finalSysMsg },
      ...historyMessages,
      userMessage,
    ],
    temperature: 0.85,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return {
    titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 3) : ['✨ 内容已生成'],
    body: parsed.body || '',
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
    imagePrompt: parsed.imagePrompt || 'beautiful lifestyle photo, vertical 3:4 ratio',
  };
}

module.exports = { generateContent };
