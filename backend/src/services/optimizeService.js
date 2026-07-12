const OpenAI = require('openai');

function getClient(apiConfig) {
  return new OpenAI({
    apiKey: apiConfig?.textApiKey || process.env.TEXT_API_KEY,
    baseURL: apiConfig?.textApiBase || process.env.TEXT_API_BASE,
  });
}

const OPTIMIZE_BASE_DEFAULT = `你是小红书算法优化专家，负责将内容升级为更高传播率的V2版本。
优化维度：
1. 标题点击率（CTR）：增强钩子、数字、情绪词
2. 封面清晰度：优化图片提示词，让主体更突出
3. 关键词密度：植入更多搜索热词
4. 正文可读性：短句化、emoji增强、分段优化
5. 敏感词过滤：替换可能限流的词汇
请严格按JSON输出，不要输出任何其他内容。`;

const OUTPUT_SCHEMA = `
输出必须是合法JSON：
{
  "analysis": "对原始内容的多维度分析，200字左右，指出具体问题和改进方向，用中文自然段落书写",
  "titles": ["优化标题1", "优化标题2", "优化标题3"],
  "body": "优化后正文",
  "tags": ["优化标签1", "优化标签2"],
  "imagePrompt": "优化后的英文图片提示词",
  "improvements": ["改进点1", "改进点2", "改进点3"]
}`;

async function optimizeContent(original, systemPrompt, apiConfig, optimizeBase) {
  const client = getClient(apiConfig);
  const model = apiConfig?.textModel || process.env.TEXT_MODEL || 'gpt-5.6-terra';
  const context = systemPrompt ? `账号风格：${systemPrompt}\n` : '';
  const systemMsg = (optimizeBase && optimizeBase.trim()) ? optimizeBase.trim() : OPTIMIZE_BASE_DEFAULT;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemMsg },
      { role: 'user', content: `${context}请对以下小红书内容进行算法优化，生成V2版本：\n\n原始标题：${original.titles.join(' / ')}\n原始正文：${original.body}\n原始标签：${original.tags.join(' ')}\n原始图片提示：${original.imagePrompt}\n\n${OUTPUT_SCHEMA}` },
    ],
    temperature: 0.75,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return {
    analysis: parsed.analysis || '',
    titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 3) : original.titles,
    body: parsed.body || original.body,
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : original.tags,
    imagePrompt: parsed.imagePrompt || original.imagePrompt,
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
  };
}

module.exports = { optimizeContent };
