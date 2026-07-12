const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

function getClient(apiConfig) {
  return new OpenAI({
    apiKey: apiConfig?.imageApiKey || process.env.IMAGE_API_KEY,
    baseURL: apiConfig?.imageApiBase || process.env.IMAGE_API_BASE,
    timeout: 120000, // 120秒超时，图片生成可能较慢
  });
}

// 将base64保存为静态文件并返回URL
function saveBase64AsFile(base64Data) {
  const publicDir = path.join(__dirname, '../../public/generated');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const filename = `img_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.png`;
  const filepath = path.join(publicDir, filename);

  // 从data URL中提取base64部分
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));

  // 返回完整URL（包含后端地址）
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  return `${backendUrl}/generated/${filename}`;
}

async function generateImage(imagePrompt, apiConfig, imageSize, titleText, referenceImageBase64, referenceImageMimeType) {
  const client = getClient(apiConfig);
  const model = apiConfig?.imageModel || process.env.IMAGE_MODEL || 'gpt-image-2';
  const titleInstruction = titleText
    ? `, with bold Chinese title text "${titleText}" overlaid prominently on the image`
    : ', with bold Chinese title text overlaid prominently on the cover';

  let prompt = `${imagePrompt}${titleInstruction}, vertical portrait composition, high quality Xiaohongshu social media cover photo`;

  // 限制prompt长度，避免API拒绝请求
  if (prompt.length > 1000) {
    prompt = prompt.substring(0, 1000);
    console.log('[imageService] prompt过长，已截断到1000字符');
  }

  // 使用原始尺寸，不进行映射（让API自己处理）
  const size = imageSize || '768x1024';
  console.log(`[imageService] 使用尺寸: ${size}`);

  // 构建请求参数
  const requestParams = {
    model,
    prompt,
    n: 1,
    size,
  };

  // 如果有参考图片，优先尝试使用 images.edit API（图生图）
  if (referenceImageBase64 && referenceImageMimeType) {
    try {
      console.log('[imageService] 使用参考图片，尝试调用 images.edit API');

      // 将base64保存为临时文件（OpenAI SDK需要文件路径或stream）
      const tempDir = os.tmpdir();
      const ext = referenceImageMimeType.split('/')[1] || 'png';
      const tempFile = path.join(tempDir, `ref_${Date.now()}.${ext}`);

      fs.writeFileSync(tempFile, Buffer.from(referenceImageBase64, 'base64'));

      const response = await client.images.edit({
        model,
        image: fs.createReadStream(tempFile),
        prompt,
        n: 1,
        size,
      });

      // 删除临时文件
      fs.unlinkSync(tempFile);

      const item = response.data[0];
      if (item?.url) {
        console.log('[imageService] 使用参考图片生成成功');
        return item.url;
      }
      if (item?.b64_json) {
        console.log('[imageService] 参考图片返回base64，转换为静态文件');
        const dataUrl = `data:image/png;base64,${item.b64_json}`;
        const fileUrl = saveBase64AsFile(dataUrl);
        console.log('[imageService] 保存为文件:', fileUrl);
        return fileUrl;
      }
    } catch (editErr) {
      console.warn('[imageService] images.edit失败，降级为纯prompt生成:', editErr.message);
      // 降级：如果edit不支持，继续用generate
    }
  }

  // 标准生成方式（不带参考图）
  try {
    console.log('[imageService] 使用纯prompt生成图片, size:', size);
    console.log('[imageService] prompt:', prompt.substring(0, 100) + '...');
    const response = await client.images.generate(requestParams);
    console.log('[imageService] API响应成功');
    const item = response.data[0];
    if (item?.url) {
      console.log('[imageService] 返回URL:', item.url);
      return item.url;
    }
    if (item?.b64_json) {
      console.log('[imageService] 返回base64图片，转换为静态文件');
      const dataUrl = `data:image/png;base64,${item.b64_json}`;
      const fileUrl = saveBase64AsFile(dataUrl);
      console.log('[imageService] 保存为文件:', fileUrl);
      return fileUrl;
    }
    throw new Error('图片生成接口未返回有效数据');
  } catch (err) {
    console.error('[imageService] 生成失败，错误详情:', {
      message: err.message,
      status: err.status,
      code: err.code,
      type: err.type
    });
    throw err;
  }
}

module.exports = { generateImage };