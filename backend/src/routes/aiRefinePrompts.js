const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

router.post('/ai-refine-prompts', async (req, res) => {
  const { userInput, apiConfig, customSystemPrompt } = req.body;

  if (!userInput || !userInput.trim()) {
    return res.status(400).json({ error: '请输入账号定位信息' });
  }

  const client = new OpenAI({
    apiKey: apiConfig?.textApiKey || process.env.TEXT_API_KEY,
    baseURL: apiConfig?.textApiBase || process.env.TEXT_API_BASE,
  });
  const model = apiConfig?.textModel || process.env.TEXT_MODEL || 'gpt-5.6-terra';

  const systemMessage = `你是一位小红书运营专家和提示词工程师，擅长根据账号定位生成精准的配置。

你的任务：根据用户描述的账号信息，生成三个核心提示词配置。

最终输出格式要求（非常重要）：

必须严格按照以下JSON格式输出。
不要输出任何解释、标题、Markdown代码块或额外文字。
只允许输出JSON对象。

注意：JSON中的字符串值允许使用\\n进行换行，以增强可读性和分段效果。

{
  "systemPrompt": "账号风格提示词",
  "systemBase": "文案生成提示词",
  "imageStylePrompt": "封面图风格提示词"
}

禁止：
* 修改字段名称
* 增加额外字段
* 输出数组
* 输出Markdown
* 输出代码块
* 输出解释说明
* 输出任何JSON外的内容

最终结果必须是可直接被JSON Parser解析的标准JSON。

---

各提示词要求：

1. systemPrompt（账号风格提示词，600-800字，必须详细且分段清晰）
   - 详细描述账号的核心定位、目标受众、内容方向、核心价值
   - 强调创作风格、语言特点、emoji使用习惯、常用表达方式
   - 要具体、有个性，避免空泛描述，至少包含5个具体特征
   - 用第一人称"我"描述（如：我是专注...的博主）
   - 包含账号的独特优势、内容形式、互动方式、粉丝人群画像
   - 内容要分段清晰，每个要点用\\n分开，便于阅读

2. systemBase（文案生成提示词，400-600字，必须详细且分段清晰）
   - 详细定义AI的角色和背景（小红书内容创作者）
   - 强调输出JSON格式的要求和具体格式示例
   - 可以加入该垂类的特殊要求和禁忌
   - 包含选题思路、文案技巧、排版要求、互动策略
   - 保留"请严格按照JSON格式输出，不要输出任何其他内容"这句话
   - 内容要分段清晰，每个部分用\\n分开

3. imageStylePrompt（封面图风格提示词，800-1200字，必须极其详细且分段清晰）
   - 生成符合小红书点击逻辑的商业封面，而不是普通宣传海报
   - 必须包含以下要素并展开详细描述，每个要素单独成段用\\n分隔：
     * 场景环境：具体的背景设置、光线、氛围、质感、景深处理
     * 构图方式：如黄金分割、对称、对角线、三分法等具体应用和效果
     * 图片版式：竖版比例、内容区域划分、重点区域强调、空间利用
     * 标题内容：文案排版、位置、视觉层级、字号对比、行间距设置
     * 字体风格：字体选择、粗细、大小对比、间距处理、易读性
     * 色彩氛围：主色调、辅助色、渐变效果、色彩搭配比例、色值参考
     * 商业设计感：品质感、视觉冲击力、转化力、专业度、差异化元素
     * 负面限制词：具体禁止事项（文字模糊、字体粘连、笔画错乱、色彩混乱、构图松散等）
   - 字数不少于800字，每个要素用\\n分隔，确保每个要素都有深度描述
   - 用具体的设计术语和参数

示例输出格式（仅供参考，实际内容应根据用户输入生成）：

{
  "systemPrompt": "我是专注美妆护肤的博主，面向18-30岁都市女性。\\n核心定位：分享专业护肤知识和真实产品测评，帮助女性找到适合自己的护肤方案。\\n创作风格：专业亲和，既有科学依据又接地气，用简单易懂的语言讲解复杂的护肤成分。\\n标题结构：喜欢用数字+效果的结构，如「5个护肤误区」「3步拯救敏感肌」等。\\n语言特点：正文简洁易懂，多用💡🌟✨等emoji，偶尔用「yyds」「绝了」等网络用语拉近距离。\\n粉丝互动：积极回应评论，定期进行产品测评投票和护肤建议答疑。",
  "systemBase": "你是一位专业的小红书美妆护肤内容创作者，擅长创作高传播性的爆款内容。\\n角色定位：你精通护肤成分、产品功效和使用方法，能用简单易懂的语言讲清楚专业知识，同时深刻理解小红书算法和用户审美。\\n输出要求：请严格按照JSON格式输出，不要输出任何其他内容。\\n选题策略：关注热门护肤话题、季节性护肤需求、常见皮肤问题等，选择能引发共鸣的话题。\\n文案技巧：标题要有钩子和数字、正文分段清晰配合emoji、结尾要有互动引导。",
  "imageStylePrompt": "商业美妆封面设计风格指南。\\n场景环境：柔和自然光线，高级感化妆间或简约办公室背景，散焦装饰品（精油瓶、植物、镜子等）营造品质感和专业感。光线方向从45度侧照，营造立体感和高级感。\\n构图方式：采用黄金分割法则，产品或模特肌肤区域居中偏上放置，留白处放置文案信息。使用对角线引导视线从左下角指向右上角的标题区域。\\n图片版式：竖版9:16手机屏幕比例，上方30%区域预留给标题和核心文案，中间40%为视觉重点区域（产品特写、肌肤展示），下方30%为留白、logo或CTA按钮区域。\\n标题内容：大号加粗数字开头+吸睛词+效果承诺，如「3步告别干皮」「99%女性都犯的护肤错误」。标题字号应占整个图片宽度的60-80%，采用黑体或粗体显示。\\n字体风格：标题用现代无衬线体加粗（如思源黑体Bold），大小对比强烈（标题与副文案至少3:1的大小比），副文案用细体次级层级。字间距适度宽松，行间距1.5倍字高，确保易读性。\\n色彩氛围：主色调采用柔和高级色系（金色、玫瑰金、冷白、薄荷绿等），辅助色呼应品牌调性和季节感，渐变效果自然不突兀。色彩饱和度适中，避免过于艳丽或沉闷。建议采用CMYK色值，标题色与背景对比度不低于4.5:1。\\n商业设计感：整体干净专业，排版紧凑有序，有明确的视觉引导路线，极强的点击欲望和转化力。突出产品价值和效果承诺，让用户一眼就能理解内容核心。设计要有品牌统一性，体现专业美妆顾问的调性。\\n负面限制词：禁止文字模糊、字体粘连、笔画错乱、色彩混乱不协调、构图松散无重点、背景过于复杂喧宾夺主、高饱和色彩刺眼、文字排版混乱难读、留白过多显得冷淡。"
}`;

  const userMessage = `我的账号信息如下：

${userInput}

请根据以上信息，生成适合我的三个提示词配置。每个提示词内要用\\n进行分段，使内容更清晰易读。`;

  // 使用自定义提示词或默认提示词
  const finalSystemMessage = customSystemPrompt && customSystemPrompt.trim()
    ? customSystemPrompt.trim()
    : systemMessage;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: finalSystemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    // 验证响应结构
    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('API返回格式异常');
    }

    const raw = response.choices[0].message?.content;
    if (!raw) {
      console.error('[ai-refine-prompts] 完整响应:', JSON.stringify(response, null, 2));
      throw new Error('AI返回空内容');
    }

    console.log('[ai-refine-prompts] AI原始响应:', raw.substring(0, 300));

    // 提取 JSON（兼容模型可能输出markdown代码块）
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[ai-refine-prompts] 无法提取JSON，原始内容:', raw);
      throw new Error('AI返回格式错误，未找到JSON对象');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 验证返回字段
    if (!parsed.systemPrompt || !parsed.systemBase || !parsed.imageStylePrompt) {
      console.error('[ai-refine-prompts] 缺少必需字段，返回:', parsed);
      throw new Error('AI返回的JSON缺少必需字段');
    }

    return res.json({
      systemPrompt: parsed.systemPrompt.trim(),
      systemBase: parsed.systemBase.trim(),
      imageStylePrompt: parsed.imageStylePrompt.trim(),
    });
  } catch (err) {
    console.error('[ai-refine-prompts] 错误:', err.message);
    console.error('[ai-refine-prompts] 错误堆栈:', err.stack);
    return res.status(500).json({ error: err.message || 'AI生成失败，请重试' });
  }
});

module.exports = router;
