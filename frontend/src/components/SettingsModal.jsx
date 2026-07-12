import React, { useState } from 'react';

const SYSTEM_BASE_DEFAULT = `你是一位专业的小红书内容创作者，擅长创作高传播性的爆款内容。
请严格按照JSON格式输出，不要输出任何其他内容。`;

const OPTIMIZE_BASE_DEFAULT = `你是小红书算法优化专家，负责将内容升级为更高传播率的V2版本。
优化维度：
1. 标题点击率（CTR）：增强钩子、数字、情绪词
2. 封面清晰度：优化图片提示词，让主体更突出
3. 关键词密度：植入更多搜索热词
4. 正文可读性：短句化、emoji增强、分段优化
5. 敏感词过滤：替换可能限流的词汇
请严格按JSON输出，不要输出任何其他内容。`;

const CHAT_BASE_DEFAULT = `你是一位专业的小红书运营顾问，深度熟悉小红书平台规则、算法机制、内容运营策略和爆款方法论。你可以帮用户分析账号定位、内容方向、选题策略、标题技巧、互动提升等运营问题。
注意：你的职责是运营咨询和讨论，不负责直接生成图文内容。如果用户要求生成小红书图文内容（标题、正文、封面等），请友好地提示他点击下方的「✨ 生成图文」按钮切换到生成模式。`;

const SETTINGS_KEY = 'xhs_settings';

const DEFAULT_SETTINGS = {
  systemPrompt: '',
  imageStylePrompt: '小红书高点击率商业封面风格：竖版3:4构图，居中式标题排版，标题使用大号加粗黑体，副标题用细体小字，底部透明渐变条放置卖点文案，右下角设置圆角按钮CTA。色彩以暖色调或高级灰为主，整体设计感强，扁平化风格，避免过度装饰。禁止文字模糊、字体粘连、笔画错乱。', // 新增：封面图风格提示词
  systemBase: '',
  optimizeBase: '',
  chatBase: '',
  textApiBase: 'https://api.teamorouter.com/v1',
  textApiKey: '',
  textModel: 'gpt-5.6-terra',
  imageApiBase: 'https://api.teamorouter.com/v1',
  imageApiKey: '',
  imageModel: 'gpt-image-2',
  imageSize: '768x1024',
};

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function SettingsModal({ onClose, onSave }) {
  const [form, setForm] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [showTextKey, setShowTextKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);
  const [activeTab, setActiveTab] = useState('prompt');
  const [aiInput, setAiInput] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(form));
    onSave(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  }

  // 导出配置
  function handleExport() {
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      settings: form,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xhs-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 验证导入的配置
  function validateImportedConfig(data) {
    const MAX_STRING_LENGTH = 10000;
    const validImageSizes = ['768x1024', '1024x1024', '682x1024', '1024x768', '1024x682'];
    const validModels = ['gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.6-sol', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'];

    // 检查基本结构
    if (!data || typeof data !== 'object') {
      return { valid: false, error: '不是有效的JSON对象' };
    }
    if (!data.settings || typeof data.settings !== 'object') {
      return { valid: false, error: '缺少 settings 字段' };
    }

    const settings = data.settings;
    const typeChecks = {
      systemPrompt: 'string',
      imageStylePrompt: 'string',
      systemBase: 'string',
      optimizeBase: 'string',
      chatBase: 'string',
      textApiBase: 'string',
      textApiKey: 'string',
      textModel: 'string',
      imageApiBase: 'string',
      imageApiKey: 'string',
      imageModel: 'string',
      imageSize: 'string',
    };

    // 类型验证
    for (const [key, expectedType] of Object.entries(typeChecks)) {
      if (settings[key] !== undefined && typeof settings[key] !== expectedType) {
        return { valid: false, error: `字段 ${key} 类型错误，应为 ${expectedType}` };
      }
    }

    // 长度限制
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
        return { valid: false, error: `字段 ${key} 长度超出限制（最大${MAX_STRING_LENGTH}字符）` };
      }
    }

    // 枚举值验证
    if (settings.imageSize && !validImageSizes.includes(settings.imageSize)) {
      return { valid: false, error: `imageSize 值无效: ${settings.imageSize}` };
    }
    if (settings.textModel && !validModels.includes(settings.textModel)) {
      return { valid: false, error: `textModel 值无效: ${settings.textModel}` };
    }

    // URL格式验证
    try {
      if (settings.textApiBase) new URL(settings.textApiBase);
      if (settings.imageApiBase) new URL(settings.imageApiBase);
    } catch {
      return { valid: false, error: 'API Base URL 格式无效' };
    }

    return { valid: true };
  }

  // 导入配置
  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const validation = validateImportedConfig(data);
        if (!validation.valid) {
          alert(`配置文件格式错误：${validation.error}`);
          return;
        }

        const confirmed = confirm(
          '确定要导入此配置吗？\n\n' +
          '导入后将替换当前所有设置（不会立即保存）。\n' +
          '你可以检查后再点击"保存配置"。'
        );

        if (confirmed) {
          setForm(prev => ({
            ...DEFAULT_SETTINGS,
            ...data.settings,
          }));
          alert('配置已导入到表单，请检查后点击"保存配置"');
        }
      } catch (err) {
        alert(`导入失败：${err.message}`);
      }
    };
    input.click();
  }

  // AI生成配置
  async function handleAiGenerate() {
    if (!aiInput.trim()) {
      alert('请先描述你的账号定位和风格');
      return;
    }

    setAiGenerating(true);
    setAiResult(null);

    try {
      const apiConfig = {
        textApiKey: form.textApiKey?.trim(),
        textApiBase: form.textApiBase?.trim(),
        textModel: form.textModel?.trim(),
      };

      const response = await fetch('/api/ai-refine-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: aiInput,
          apiConfig,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI生成失败');

      setAiResult(data);
    } catch (err) {
      alert('AI生成失败：' + err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  // 一键填充提示词
  function handleFillPrompts() {
    if (!aiResult) return;

    const confirmed = confirm(
      '确定要将AI生成的配置填充到表单吗？\n\n' +
      '这将替换当前的「账号风格」、「文案生成提示词」和「封面图风格提示词」。\n' +
      '（不会立即保存，你可以检查后再保存）'
    );

    if (confirmed) {
      setForm(prev => ({
        ...prev,
        systemPrompt: aiResult.systemPrompt,
        systemBase: aiResult.systemBase,
        imageStylePrompt: aiResult.imageStylePrompt,
      }));
      setActiveTab('prompt');
      alert('已填充到表单，请切换页签检查后保存');
    }
  }

  const systemBaseValue = form.systemBase || SYSTEM_BASE_DEFAULT;
  const optimizeBaseValue = form.optimizeBase || OPTIMIZE_BASE_DEFAULT;
  const chatBaseValue = form.chatBase || CHAT_BASE_DEFAULT;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <div style={s.title}>设置</div>
            <div style={s.sub}>配置保存在本地，刷新不丢失</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={s.tabs}>
          {['ai-helper', 'prompt', 'system-base', 'optimize-base', 'chat-base', 'text-api', 'image-api'].map(t => (
            <div key={t} style={{ ...s.tab, ...(activeTab === t ? s.tabActive : {}) }} onClick={() => setActiveTab(t)}>
              {{
                'ai-helper': 'AI 助手',
                prompt: '账号风格',
                'system-base': '生成提示词',
                'optimize-base': '优化提示词',
                'chat-base': '聊天提示词',
                'text-api': '文字 API',
                'image-api': '图片 API'
              }[t]}
            </div>
          ))}
        </div>

        <div style={s.body}>
          {activeTab === 'ai-helper' && (
            <>
              <div style={s.aiIntro}>📝 <strong>AI 智能配置助手</strong><br/>描述你的账号定位和风格，AI 将自动生成三个核心提示词配置，助你快速上手。</div>
              <div style={s.fieldDesc}><strong>请描述：</strong>账号定位、目标受众、内容风格、语言特点等</div>
              <textarea
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                placeholder="例如：&#10;- 账号定位：美妆护肤博主&#10;- 目标受众：18-30岁都市女性&#10;- 内容风格：专业亲和，分享实用护肤知识和产品测评&#10;- 语言特点：简洁易懂，多用emoji"
                style={s.textarea}
                rows={8}
                disabled={aiGenerating}
              />
              <div style={s.charCount}>{aiInput.length} 字</div>

<button
                style={{...s.aiGenerateBtn, ...(aiGenerating ? s.aiGenerateBtnDisabled : {})}}
                onClick={handleAiGenerate}
                disabled={aiGenerating || !aiInput.trim()}
              >
                {aiGenerating ? '✨ AI 生成中...' : '✨ AI 生成配置'}
              </button>
              {aiResult && (
                <div style={s.aiResultBox}>
                  <div style={s.aiResultHeader}>✓ 生成完成！请确认后一键填充</div>
                  <div style={s.aiResultItem}>
                    <div style={s.aiResultLabel}>📌 账号风格提示词</div>
                    <div style={s.aiResultContent}>{aiResult.systemPrompt}</div>
                  </div>
                  <div style={s.aiResultItem}>
                    <div style={s.aiResultLabel}>📝 文案生成提示词</div>
                    <div style={s.aiResultContent}>{aiResult.systemBase}</div>
                  </div>
                  <div style={s.aiResultItem}>
                    <div style={s.aiResultLabel}>🎨 封面图风格提示词</div>
                    <div style={s.aiResultContent}>{aiResult.imageStylePrompt}</div>
                  </div>
                  <div style={s.aiResultActions}>
                    <button style={s.aiRegenBtn} onClick={handleAiGenerate}>重新生成</button>
                    <button style={s.aiFillBtn} onClick={handleFillPrompts}>一键填充到表单</button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'prompt' && (
            <>
              <div style={s.fieldDesc}>
                <strong>作用范围：</strong>影响「生成图文」和「V2优化」功能<br/>
                <strong>控制内容：</strong>标题风格、正文语气、emoji使用习惯、内容选题方向<br/>
                <strong>使用建议：</strong>描述你的账号定位、目标受众、创作风格，AI会自动带入每次生成
              </div>
              <textarea
                value={form.systemPrompt}
                onChange={e => set('systemPrompt', e.target.value)}
                placeholder="例如：我是专注 BJD 球关节人偶的博主，风格清冷文艺偏日系，用语细腻温柔，标题喜欢冲突感结构，正文多用 emoji，标签以娃娃相关为主..."
                style={s.textarea}
                rows={9}
              />
              <div style={s.charCount}>{form.systemPrompt.length} 字</div>
              {form.systemPrompt && <button style={s.clearBtn} onClick={() => set('systemPrompt', '')}>清除</button>}
            </>
          )}

          {activeTab === 'system-base' && (
            <>
              <div style={s.warnBox}>
                ⚠️ <strong>注意：</strong>请不要删除或修改「JSON格式输出」相关要求，否则生成会报错。只修改角色定位部分即可。
              </div>
              <div style={s.fieldDesc}>
                <strong>作用范围：</strong>「生成图文」功能的底层系统提示词<br/>
                <strong>控制内容：</strong>AI的角色定位、输出格式规则<br/>
                <strong>使用建议：</strong>一般不需要修改，留空使用默认值即可
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ ...s.fieldDesc, marginBottom: 8, fontWeight: 'bold' }}>📝 文案生成提示词</div>
                <textarea
                  value={systemBaseValue}
                  onChange={e => set('systemBase', e.target.value === SYSTEM_BASE_DEFAULT ? '' : e.target.value)}
                  style={{ ...s.textarea, fontFamily: 'monospace', fontSize: 12 }}
                  rows={4}
                />
                <div style={s.charCount}>{systemBaseValue.length} 字</div>
                {form.systemBase && (
                  <button style={s.clearBtn} onClick={() => set('systemBase', '')}>恢复默认</button>
                )}
              </div>

              <div style={{ marginTop: 24 }}>
                <div style={{ ...s.fieldDesc, marginBottom: 8, fontWeight: 'bold' }}>🎨 封面图风格提示词</div>
                <div style={{ ...s.fieldDesc, marginBottom: 8, fontSize: 12, color: '#888' }}>
                  描述你希望的封面图风格，例如：简约清新、扁平化设计、柔和色调、温暖氛围等
                </div>
                <textarea
                  value={form.imageStylePrompt}
                  onChange={e => set('imageStylePrompt', e.target.value)}
                  placeholder="例如：简约清新风格，浅色背景，扁平化设计，柔和色调，温暖少女氛围，高级质感"
                  style={s.textarea}
                  rows={4}
                />
                <div style={s.charCount}>{form.imageStylePrompt.length} 字</div>
                {form.imageStylePrompt && (
                  <button style={s.clearBtn} onClick={() => set('imageStylePrompt', '')}>清除</button>
                )}
              </div>
            </>
          )}

          {activeTab === 'optimize-base' && (
            <>
              <div style={s.warnBox}>
                ⚠️ <strong>注意：</strong>请不要删除或修改「JSON格式输出」相关要求，否则优化会报错。
              </div>
              <div style={s.fieldDesc}>
                <strong>作用范围：</strong>「V2优化」功能的系统提示词<br/>
                <strong>控制内容：</strong>优化维度（标题CTR、封面清晰度、关键词密度等）<br/>
                <strong>使用建议：</strong>留空使用默认值，或根据需求调整优化侧重点
              </div>
              <textarea
                value={optimizeBaseValue}
                onChange={e => set('optimizeBase', e.target.value === OPTIMIZE_BASE_DEFAULT ? '' : e.target.value)}
                style={{ ...s.textarea, fontFamily: 'monospace', fontSize: 12 }}
                rows={9}
              />
              <div style={s.charCount}>{optimizeBaseValue.length} 字</div>
              {form.optimizeBase && (
                <button style={s.clearBtn} onClick={() => set('optimizeBase', '')}>恢复默认</button>
              )}
            </>
          )}

          {activeTab === 'chat-base' && (
            <>
              <div style={s.fieldDesc}>
                <strong>作用范围：</strong>「聊天讨论」模式<br/>
                <strong>控制内容：</strong>AI的运营顾问角色定位<br/>
                <strong>使用建议：</strong>留空使用默认值，或自定义顾问角色特点
              </div>
              <textarea
                value={chatBaseValue}
                onChange={e => set('chatBase', e.target.value === CHAT_BASE_DEFAULT ? '' : e.target.value)}
                style={{ ...s.textarea, fontFamily: 'monospace', fontSize: 12 }}
                rows={8}
              />
              <div style={s.charCount}>{chatBaseValue.length} 字</div>
              {form.chatBase && (
                <button style={s.clearBtn} onClick={() => set('chatBase', '')}>恢复默认</button>
              )}
            </>
          )}

          {activeTab === 'text-api' && (
            <>
              <div style={s.sectionNote}>用于生成标题、正文、标签、V2优化</div>
              <Field label="Base URL">
                <input value={form.textApiBase} onChange={e => set('textApiBase', e.target.value)} placeholder="https://api.teamorouter.com/v1" style={s.input} />
              </Field>
              <Field label="API Key">
                <div style={s.keyRow}>
                  <input type={showTextKey ? 'text' : 'password'} value={form.textApiKey} onChange={e => set('textApiKey', e.target.value)} placeholder="sk-..." style={{ ...s.input, flex: 1 }} />
                  <button style={s.eyeBtn} onClick={() => setShowTextKey(v => !v)}>{showTextKey ? '🙈' : '👁️'}</button>
                </div>
                {form.textApiKey && <div style={s.keyMask}>{form.textApiKey.slice(0, 8)}{'*'.repeat(12)}</div>}
              </Field>
              <Field label="模型">
                <select value={form.textModel} onChange={e => set('textModel', e.target.value)} style={s.select}>
                  <option value="gpt-5.6-terra">gpt-5.6-terra（默认）</option>
                  <option value="gpt-5.6-luna">gpt-5.6-luna</option>
                  <option value="gpt-5.6-sol">gpt-5.6-sol</option>
                  <option value="gpt-5.5">gpt-5.5（不推荐）</option>
                  <option value="gpt-5.4">gpt-5.4（不推荐）</option>
                  <option value="gpt-5.4-mini">gpt-5.4-mini（不推荐）</option>
                </select>
              </Field>
              <div style={s.apiNote}>⚠️ Key 仅存本地，由后端服务发出请求，不经第三方。</div>
            </>
          )}

          {activeTab === 'image-api' && (
            <>
              <div style={s.sectionNote}>用于生成封面图</div>
              <Field label="Base URL">
                <input value={form.imageApiBase} onChange={e => set('imageApiBase', e.target.value)} placeholder="https://api.teamorouter.com/v1" style={s.input} />
              </Field>
              <Field label="API Key">
                <div style={s.keyRow}>
                  <input type={showImageKey ? 'text' : 'password'} value={form.imageApiKey} onChange={e => set('imageApiKey', e.target.value)} placeholder="sk-..." style={{ ...s.input, flex: 1 }} />
                  <button style={s.eyeBtn} onClick={() => setShowImageKey(v => !v)}>{showImageKey ? '🙈' : '👁️'}</button>
                </div>
                {form.imageApiKey && <div style={s.keyMask}>{form.imageApiKey.slice(0, 8)}{'*'.repeat(12)}</div>}
              </Field>
              <Field label="模型">
                <div style={{ padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: 13, color: '#666' }}>
                  gpt-image-2（固定）
                </div>
              </Field>
              <Field label="封面尺寸">
                <div style={s.sizeGroup}>
                  {[
                    { value: '768x1024', label: '3:4', desc: '推荐' },
                    { value: '1024x1024', label: '1:1', desc: '' },
                    { value: '682x1024', label: '2:3', desc: '' },
                    { value: '1024x768', label: '4:3', desc: '' },
                    { value: '1024x682', label: '3:2', desc: '' },
                  ].map(opt => (
                    <div
                      key={opt.value}
                      style={{ ...s.sizeOpt, ...(form.imageSize === opt.value ? s.sizeOptActive : {}) }}
                      onClick={() => set('imageSize', opt.value)}
                    >
                      <div style={s.sizeLabel}>{opt.label}</div>
                      {opt.desc && <div style={s.sizeDesc}>{opt.desc}</div>}
                    </div>
                  ))}
                </div>
              </Field>
              <div style={s.apiNote}>⚠️ Key 仅存本地，由后端服务发出请求，不经第三方。</div>
            </>
          )}
        </div>

        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onClose}>取消</button>
          <div style={{display: 'flex', gap: 6}}>
            <button style={s.actionBtn} onClick={handleExport} title="导出配置为JSON文件">📥 导出</button>
            <button style={s.actionBtn} onClick={handleImport} title="从JSON文件导入配置">📤 导入</button>
          </div>
          <div style={{ flex: 1 }} />
          <button style={{ ...s.saveBtn, background: saved ? '#22c55e' : 'linear-gradient(135deg, #7c5cfc, #a78bfa)' }} onClick={handleSave}>
            {saved ? '✓ 已保存' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={f.field}>
      <div style={f.label}>{label}</div>
      {children}
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: 16, width: 640, maxWidth: '96vw', height: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 48px rgba(124,92,252,0.18)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 0', flexShrink: 0 },
  title: { fontSize: 17, fontWeight: 700, color: '#1a1a2e' },
  sub: { fontSize: 12, color: '#a0a0b8', marginTop: 2 },
  closeBtn: { width: 28, height: 28, borderRadius: '50%', background: '#f5f3ff', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888' },
  tabs: { display: 'flex', padding: '14px 24px 0', borderBottom: '1px solid #f0eeff', flexShrink: 0 },
  tab: { padding: '8px 10px', fontSize: 12, color: '#a0a0b8', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1, whiteSpace: 'nowrap' },
  tabActive: { color: '#7c5cfc', fontWeight: 600, borderBottom: '2px solid #7c5cfc' },
  body: { flex: 1, overflowY: 'auto', padding: '20px 24px' },
  fieldDesc: { fontSize: 13, color: '#6b6b8a', lineHeight: 1.6, marginBottom: 12 },
  sectionNote: { fontSize: 12, color: '#a0a0b8', background: '#f8f7ff', borderRadius: 8, padding: '7px 10px', marginBottom: 16 },
  textarea: { width: '100%', border: '1.5px solid #e8e4f8', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', color: '#333', lineHeight: 1.7 },
  charCount: { textAlign: 'right', fontSize: 11, color: '#ccc', marginTop: 4 },
  clearBtn: { fontSize: 12, color: '#bbb', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 },
  warnBox: { fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6, marginBottom: 12 },
  input: { width: '100%', border: '1.5px solid #e8e4f8', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: '#333' },
  keyRow: { display: 'flex', gap: 6, alignItems: 'center' },
  eyeBtn: { width: 34, height: 34, background: '#f5f3ff', border: '1px solid #e8e4f8', borderRadius: 8, cursor: 'pointer', fontSize: 14, flexShrink: 0 },
  keyMask: { fontSize: 11, color: '#a0a0b8', marginTop: 4, fontFamily: 'monospace' },
  select: { width: '100%', border: '1.5px solid #e8e4f8', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', color: '#333', background: '#fff', cursor: 'pointer' },
  apiNote: { fontSize: 11, color: '#a0a0b8', background: '#f8f7ff', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5, marginTop: 8 },
  sizeGroup: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  sizeOpt: { minWidth: 80, border: '1.5px solid #e8e4f8', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', textAlign: 'center', background: '#fafafa' },
  sizeOptActive: { border: '1.5px solid #7c5cfc', background: '#f5f3ff' },
  sizeLabel: { fontSize: 13, fontWeight: 600, color: '#3d3d5c' },
  sizeDesc: { fontSize: 10, color: '#a78bfa', marginTop: 2 },
  aiIntro: { fontSize: 13, color: '#6b6b8a', lineHeight: 1.7, background: '#f0edff', borderRadius: 10, padding: '12px 14px', marginBottom: 16 },
  aiGenerateBtn: { width: '100%', padding: '12px', marginTop: 12, marginBottom: 20, background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  aiGenerateBtnDisabled: { background: '#ccc', cursor: 'not-allowed' },
  aiResultBox: { background: '#fafff9', border: '2px solid #86efac', borderRadius: 10, padding: 16, marginTop: 20 },
  aiResultHeader: { fontSize: 14, fontWeight: 600, color: '#166534', marginBottom: 16 },
  aiResultItem: { marginBottom: 16 },
  aiResultLabel: { fontSize: 13, fontWeight: 600, color: '#3d3d5c', marginBottom: 6 },
  aiResultContent: { fontSize: 13, color: '#555', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  aiResultActions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 },
  aiRegenBtn: { padding: '8px 16px', background: '#f5f3ff', border: '1px solid #e8e4f8', borderRadius: 8, fontSize: 13, color: '#7c5cfc', cursor: 'pointer' },
  aiFillBtn: { padding: '8px 20px', background: 'linear-gradient(135deg, #22c55e, #4ade80)', border: 'none', borderRadius: 8, fontSize: 13, color: '#fff', fontWeight: 600, cursor: 'pointer' },
  footer: { display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid #f0eeff', flexShrink: 0 },
  cancelBtn: { padding: '8px 18px', background: '#f5f3ff', borderRadius: 8, fontSize: 13, color: '#7c5cfc', border: '1px solid #e8e4f8', cursor: 'pointer' },
  actionBtn: { padding: '6px 12px', background: '#f9f9fb', borderRadius: 6, fontSize: 12, color: '#666', border: '1px solid #e0e0e0', cursor: 'pointer' },
  saveBtn: { padding: '8px 22px', borderRadius: 8, fontSize: 13, color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' },
};

const f = {
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: 600, color: '#3d3d5c', marginBottom: 6 },
};
