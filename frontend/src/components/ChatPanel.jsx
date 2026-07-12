import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export function ChatPanel({ messages, loading, onSubmit, onAbort, onSelectContent, suggestions, suggestionsLoading, onFetchSuggestions, chatMode, onChatModeChange }) {
  const [input, setInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]); // 改为数组
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // 用于查看大图的状态
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function processImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    // 压缩图片到合理大小以加快上传和 API 响应速度
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSize = 1024; // 最大边长限制

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 转为 JPEG 格式，质量 0.8
        canvas.toBlob((blob) => {
          const compressedReader = new FileReader();
          compressedReader.onload = (e) => {
            const dataUrl = e.target.result;
            const base64 = dataUrl.split(',')[1];
            setUploadedImages(prev => [...prev, { dataUrl, base64, mimeType: 'image/jpeg', name: file.name, id: Date.now() + Math.random() }]);
          };
          compressedReader.readAsDataURL(blob);
        }, 'image/jpeg', 0.8);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function handleImageSelect(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(file => processImageFile(file));
    e.target.value = '';
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) processImageFile(file);
        break;
      }
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    });
  }

  function handleSend() {
    if ((!input.trim() && uploadedImages.length === 0) || loading) return;
    const text = input.trim() || (uploadedImages.length > 0 ? '请分析这些图片' : '');
    // 传递所有图片数据
    const imagesData = uploadedImages.length > 0 ? uploadedImages.map(img => ({
      base64: img.base64,
      mimeType: img.mimeType,
      dataUrl: img.dataUrl
    })) : null;
    onSubmit(text, imagesData);
    setInput('');
    setUploadedImages([]);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleCopy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      // 可以添加提示"已复制"
    }).catch(err => {
      console.error('复制失败:', err);
    });
  }

  return (
    <div style={s.panel}>
      {/* 顶部工具栏 */}
      <div style={s.topbar}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#3d3d5c' }}>对话</div>
      </div>

      {/* 消息区 */}
      <div style={s.messages}>
        {messages.length === 0 && (
          <div style={s.empty}>
            <div style={s.emptyIcon}>✦</div>
            <div style={s.emptyTitle}>告诉我你想创作什么内容</div>
            <div style={s.emptyDesc}>我会帮你生成小红书封面 · 标题 · 正文 · 标签</div>
            <div style={s.suggestions}>
              {suggestionsLoading ? (
                <div style={ss.suggestLoading}>✦ AI 正在生成创作建议...</div>
              ) : suggestions && suggestions[0] === '__error__' ? (
                <div style={ss.suggestError}>
                  <div>生成建议失败，请检查 API 配置</div>
                  <button style={ss.refreshBtn} onClick={onFetchSuggestions}>↺ 重试</button>
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <>
                  {suggestions.map(item => (
                    <button key={item} style={ss.suggestBtn} onClick={() => { onSubmit(item); }}>{item}</button>
                  ))}
                  <button style={ss.refreshBtn} onClick={onFetchSuggestions}>↺ 换一批</button>
                </>
              ) : (
                <button style={ss.inspirationBtn} onClick={onFetchSuggestions}>
                  💡 没有灵感？让 AI 给点建议吧！
                </button>
              )}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' && (
              <>
                <div style={s.userMsgRow}>
                  <div style={s.userBubble}>
                    {msg.quoteContent && (
                      <div style={s.quoteCard}>
                        {msg.quoteContent.imageUrl && (
                          <img src={msg.quoteContent.imageUrl} alt="封面" style={s.quoteThumb} />
                        )}
                        <div style={s.quoteBody}>
                          <div style={s.quoteTitle}>{(msg.quoteContent.titles || [])[0] || '图文内容'}</div>
                          <div style={s.quoteDesc}>{(msg.quoteContent.body || '').slice(0, 30)}…</div>
                        </div>
                      </div>
                    )}
                    {msg.imageDataUrls && msg.imageDataUrls.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                        {msg.imageDataUrls.map((url, idx) => (
                          <img key={idx} src={url} alt={`参考图${idx + 1}`} style={s.userImageThumb} onClick={() => setPreviewImage(url)} />
                        ))}
                      </div>
                    )}
                    {msg.imageDataUrl && (
                      <img src={msg.imageDataUrl} alt="参考图" style={s.userImageThumb} onClick={() => setPreviewImage(msg.imageDataUrl)} />
                    )}
                    {msg.text}
                  </div>
                  <div style={s.userAvatar}>J</div>
                </div>
                <div style={{ ...s.msgTime, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  <button style={s.userCopyBtn} onClick={() => handleCopy(msg.text)} title="复制消息">⧉</button>
                  <span>{msg.time}</span>
                </div>
              </>
            )}
            {msg.role === 'assistant' && (
              <div style={s.assistantRow}>
                <div style={s.assistantAvatar}>✦</div>
                <div style={s.assistantContent}>
                  {msg.loading && (
                    msg.chatLoading ? (
                      <div style={s.chatLoadingBubble}>
                        <ChatLoadingDots />
                      </div>
                    ) : (
                    <div style={s.loadingBubble}>
                      <LoadingDots />
                      <div style={s.loadingSteps}>
                        {msg.optimizeLoading ? (
                          <>
                            <LoadingStep label="读取原始内容" done />
                            <LoadingStep label="算法优化分析" done={false} active />
                            <LoadingStep label="生成优化版本" done={false} />
                          </>
                        ) : (
                          <>
                            <LoadingStep label="深度分析需求" done={!!msg.step} />
                            <LoadingStep label="生成标题 · 正文 · 标签" done={msg.step === 'image_gen'} active={msg.step === 'text_done' || (!msg.step)} />
                            <LoadingStep label="AI 绘制封面图" done={false} active={msg.step === 'image_gen'} />
                          </>
                        )}
                      </div>
                      {msg.stepLabel && (
                        <div style={s.stepLabel}>{msg.stepLabel}</div>
                      )}
                      {msg.partialContent && (
                        <div style={s.partialPreview}>
                          <div style={s.partialTitle}>{msg.partialContent.titles?.[0]}</div>
                          <div style={s.partialBody}>{(msg.partialContent.body || '').slice(0, 80)}...</div>
                          <div style={s.partialHint}>封面图生成中，右侧预览区将自动更新 →</div>
                        </div>
                      )}
                    </div>
                    )
                  )}
                  {msg.error && <div style={s.errorBubble}>⚠️ {msg.error}</div>}
                  {msg.content && (
                    <div style={{ ...s.assistantBubble, position: 'relative' }}>
                      <div style={s.assistantText}>好的，已为你生成内容！点击下方卡片可在预览区查看。</div>
                      <div
                        style={s.linkCard}
                        onClick={() => onSelectContent?.(msg.content)}
                        title="点击在预览区查看此内容"
                      >
                        <div style={s.linkCardLeft}>
                          {msg.content.imageUrl ? (
                            <img src={msg.content.imageUrl} alt="封面" style={s.linkCardThumb} />
                          ) : (
                            <div style={s.linkCardThumbEmpty}>🖼️</div>
                          )}
                        </div>
                        <div style={s.linkCardBody}>
                          <div style={s.linkCardTitle}>{(msg.content.titles || [])[0] || '查看生成内容'}</div>
                          <div style={s.linkCardDesc}>{(msg.content.body || '').slice(0, 45)}{msg.content.body?.length > 45 ? '…' : ''}</div>
                          <div style={s.linkCardMeta}>
                            {(msg.content.tags || []).slice(0, 3).map(t => (
                              <span key={t} style={s.linkCardTag}>#{t}</span>
                            ))}
                          </div>
                        </div>
                        <div style={s.linkCardArrow}>›</div>
                      </div>
                      <button style={s.assistantCopyBtn} onClick={() => handleCopy('好的，已为你生成内容！点击下方卡片可在预览区查看。')} title="复制消息">⧉</button>
                    </div>
                  )}
                  {msg.optimized && (
                    <div style={{ ...s.assistantBubble, marginTop: 10 }}>
                      <div style={s.v2Badge}>⚡ V2 算法优化版本已生成</div>
                    </div>
                  )}
                  {msg.optimizeResult && (
                    <div style={{ ...s.assistantBubble, position: 'relative' }}>
                      <div style={s.analysisBubble}>
                        <div style={s.analysisTitle}>✦ 内容分析</div>
                        <div style={s.analysisText}>{msg.optimizeResult.analysis}</div>
                        {msg.optimizeResult.improvements?.length > 0 && (
                          <div style={s.improvList}>
                            {msg.optimizeResult.improvements.map((item, i) => (
                              <div key={i} style={s.improvItem}><span style={s.improvDot}>•</span>{item}</div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={s.assistantText} onClick={() => onSelectContent?.(msg.optimizeResult.content)}>优化版本已生成，点击下方卡片查看：</div>
                      <div
                        style={s.linkCard}
                        onClick={() => onSelectContent?.(msg.optimizeResult.content)}
                        title="点击在预览区查看优化版本"
                      >
                        <div style={s.linkCardLeft}>
                          {msg.optimizeResult.content.imageUrl ? (
                            <img src={msg.optimizeResult.content.imageUrl} alt="封面" style={s.linkCardThumb} />
                          ) : (
                            <div style={s.linkCardThumbEmpty}>⚡</div>
                          )}
                        </div>
                        <div style={s.linkCardBody}>
                          <div style={{ ...s.linkCardTitle, color: '#7c5cfc' }}>{(msg.optimizeResult.content.titles || [])[0] || '查看优化版本'}</div>
                          <div style={s.linkCardDesc}>{(msg.optimizeResult.content.body || '').slice(0, 45)}…</div>
                          <div style={s.linkCardMeta}>
                            {(msg.optimizeResult.content.tags || []).slice(0, 3).map(t => (
                              <span key={t} style={{ ...s.linkCardTag, background: '#f0eeff' }}>#{t}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ ...s.linkCardArrow, color: '#7c5cfc' }}>›</div>
                      </div>
                      <button style={s.assistantCopyBtn} onClick={() => handleCopy(msg.optimizeResult.analysis)} title="复制分析">⧉</button>
                    </div>
                  )}
                  {msg.chatReply && (
                    <div style={{ ...s.assistantBubble, position: 'relative' }}>
                      <div style={s.chatReplyText}>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p style={{ margin: '0 0 8px 0', lineHeight: 1.8 }}>{children}</p>,
                            h1: ({ children }) => <h1 style={{ fontSize: 16, fontWeight: 700, margin: '12px 0 6px', color: '#1a1a2e' }}>{children}</h1>,
                            h2: ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 700, margin: '10px 0 5px', color: '#1a1a2e' }}>{children}</h2>,
                            h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 4px', color: '#3d3d5c' }}>{children}</h3>,
                            ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '6px 0' }}>{children}</ul>,
                            ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '6px 0' }}>{children}</ol>,
                            li: ({ children }) => <li style={{ margin: '3px 0', lineHeight: 1.7 }}>{children}</li>,
                            strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#3d3d5c' }}>{children}</strong>,
                            em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#6b6b8a' }}>{children}</em>,
                            code: ({ inline, children }) => inline
                              ? <code style={{ background: '#ede9ff', color: '#7c5cfc', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' }}>{children}</code>
                              : <pre style={{ background: '#f0eeff', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', overflowX: 'auto', margin: '8px 0' }}><code>{children}</code></pre>,
                            blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid #c4b5fd', paddingLeft: 10, margin: '8px 0', color: '#6b6b8a' }}>{children}</blockquote>,
                            hr: () => <hr style={{ border: 'none', borderTop: '1px solid #ede9ff', margin: '10px 0' }} />,
                          }}
                        >{msg.chatReply}</ReactMarkdown>
                      </div>
                      <button style={s.assistantCopyBtn} onClick={() => handleCopy(msg.chatReply)} title="复制消息">⧉</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div style={s.inputArea}>
        <div style={s.modeBar}>
          <button
            style={{ ...s.generateBtn, ...(chatMode === 'generate' ? s.generateBtnActive : {}) }}
            onClick={() => onChatModeChange(chatMode === 'generate' ? 'chat' : 'generate')}
          >✨ 生成图文</button>
        </div>
        <div style={s.inputBox}>
          {uploadedImages.length > 0 && (
            <div style={s.imagePreviewRow}>
              {uploadedImages.map((img) => (
                <div key={img.id} style={s.imagePreviewWrap}>
                  <img src={img.dataUrl} alt="参考图" style={s.imagePreviewThumb} />
                  <button style={s.imagePreviewRemove} onClick={() => setUploadedImages(prev => prev.filter(i => i.id !== img.id))} title="移除图片">✕</button>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            placeholder={chatMode === 'chat' ? (uploadedImages.length > 0 ? '描述你想问的（留空则直接分析图片）...' : '有什么想聊的，或者需要我帮你头脑风暴？') : (uploadedImages.length > 0 ? '描述这张参考图的用途（留空则直接分析）...' : '告诉我你想创作的内容...')}
            style={{ ...s.textarea, ...(isDragging ? s.textareaDragging : {}) }}
            rows={2}
          />
          <div style={s.inputToolbar}>
            <div style={s.inputTools} />
            <div style={s.inputRight}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleImageSelect}
              />
              <button
                style={{ ...s.attachBtn, color: uploadedImages.length > 0 ? '#7c5cfc' : '#a0a0b8', background: uploadedImages.length > 0 ? '#f0eeff' : '#fff', border: uploadedImages.length > 0 ? '1px solid #c4b5fd' : '1px solid #e8e4f8' }}
                onClick={() => fileInputRef.current?.click()}
                title="上传参考图"
              >
                ⊕
              </button>
              <button
                onClick={loading ? onAbort : handleSend}
                disabled={!loading && (!input.trim() && uploadedImages.length === 0)}
                style={{
                  ...s.sendBtn,
                  background: loading ? '#f44336' : ((input.trim() || uploadedImages.length > 0) ? '#7c5cfc' : '#d0c8f8')
                }}
                title={loading ? '终止' : '发送'}
              >
                {loading ? '■' : '➤'}
              </button>
            </div>
          </div>
        </div>
        <div style={s.disclaimer}>内容由 AI 生成，仅供参考，请注意甄别</div>
      </div>

      {/* 图片预览模态框 */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="预览图"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: 8,
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              cursor: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function LoadingStep({ label, done, active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
      <span style={{ width: 14, height: 14, borderRadius: '50%', background: done ? '#22c55e' : active ? '#7c5cfc' : '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 }}>
        {done ? '✓' : active ? '…' : ''}
      </span>
      <span style={{ fontSize: 11, color: done ? '#22c55e' : active ? '#7c5cfc' : '#bbb' }}>{label}</span>
    </div>
  );
}

function ChatLoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 0.25, 0.5].map((delay, i) => (
        <span key={i} style={{ width: 6, height: 6, background: '#a78bfa', borderRadius: '50%', display: 'inline-block', animation: `bounce 1.4s ${delay}s infinite ease-in-out` }} />
      ))}
      <span style={{ fontSize: 12, color: '#a78bfa', marginLeft: 5, fontStyle: 'italic' }}>正在思考...</span>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}


function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <span key={i} style={{ width: 7, height: 7, background: '#7c5cfc', borderRadius: '50%', display: 'inline-block', animation: `bounce 1.2s ${delay}s infinite ease-in-out` }} />
      ))}
      <span style={{ fontSize: 12, color: '#aaa', marginLeft: 4 }}>AI 正在生成...</span>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

const s = {
  panel: { flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #e8e4f8', height: '100vh', overflow: 'hidden' },
  topbar: { padding: '14px 20px', borderBottom: '1px solid #f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modelSelector: { display: 'flex', alignItems: 'center', gap: 6, background: '#f5f3ff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' },
  modelDot: { color: '#7c5cfc', fontSize: 14 },
  sysPromptBtn: { fontSize: 12, background: '#f5f3ff', borderRadius: 8, padding: '6px 12px', border: '1px solid', cursor: 'pointer' },
  messages: { flex: 1, overflowY: 'auto', padding: '24px 20px' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 8 },
  emptyIcon: { fontSize: 36, color: '#c4b5fd', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: 600, color: '#3d3d5c' },
  emptyDesc: { fontSize: 13, color: '#a0a0b8' },
  suggestions: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, width: '100%', maxWidth: 320 },
  userMsgRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 6, marginBottom: 2 },
  userBubble: { maxWidth: '68%', background: '#7c5cfc', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '10px 14px', fontSize: 14, lineHeight: 1.6 },
  userCopyBtn: { background: 'transparent', border: 'none', color: '#ccc', fontSize: 11, cursor: 'pointer', padding: 0, transition: 'color 0.2s' },
  msgCopyBtn: { width: 24, height: 24, background: 'transparent', border: 'none', color: '#ccc', fontSize: 12, cursor: 'pointer', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' },
  userAvatar: { width: 30, height: 30, background: 'linear-gradient(135deg, #7c5cfc, #c4b5fd)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 },
  msgTime: { textAlign: 'right', fontSize: 11, color: '#ccc', marginBottom: 18, paddingRight: 42 },
  assistantRow: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  assistantAvatar: { width: 30, height: 30, background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, flexShrink: 0 },
  assistantContent: { flex: 1, minWidth: 0 },
  assistantBubble: { maxWidth: '85%' },
  assistantCopyBtn: { position: 'absolute', bottom: -18, left: 0, width: 20, height: 20, background: 'transparent', border: 'none', color: '#ccc', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' },
  assistantText: { fontSize: 13, color: '#555', marginBottom: 8 },
  loadingBubble: { background: '#f5f3ff', borderRadius: '4px 16px 16px 16px', padding: '12px 14px', display: 'inline-block', maxWidth: '85%' },
  loadingSteps: { marginTop: 8 },
  stepLabel: { fontSize: 11, color: '#7c5cfc', marginTop: 8, fontStyle: 'italic' },
  partialPreview: { marginTop: 10, background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #ede9ff' },
  partialTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 },
  partialBody: { fontSize: 12, color: '#666', lineHeight: 1.5 },
  partialHint: { fontSize: 11, color: '#a78bfa', marginTop: 6, textAlign: 'right' },
  errorBubble: { background: '#fff5f5', border: '1px solid #fecdd3', borderRadius: '4px 16px 16px 16px', padding: '10px 14px', fontSize: 13, color: '#dc2626' },
  linkCard: { display: 'flex', alignItems: 'center', gap: 10, background: '#f8f7ff', border: '1px solid #ede9ff', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', maxWidth: '85%' },
  linkCardLeft: { flexShrink: 0 },
  linkCardThumb: { width: 48, height: 64, objectFit: 'cover', borderRadius: 6, display: 'block' },
  linkCardThumbEmpty: { width: 48, height: 64, background: '#ede9ff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  linkCardBody: { flex: 1, minWidth: 0 },
  linkCardTitle: { fontSize: 13, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  linkCardDesc: { fontSize: 11, color: '#888', marginTop: 4, lineHeight: 1.5 },
  linkCardMeta: { display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' },
  linkCardTag: { fontSize: 10, color: '#7c5cfc', background: '#f0eeff', borderRadius: 20, padding: '1px 6px' },
  linkCardArrow: { fontSize: 20, color: '#c4b5fd', flexShrink: 0, fontWeight: 300 },
  summaryHint: { fontSize: 11, color: '#a0a0b8', marginTop: 8, textAlign: 'right' },
  v2Badge: { display: 'inline-block', background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20 },
  inputArea: { borderTop: '1px solid #f0eeff', padding: '12px 16px', background: '#fff' },
  modeBar: { display: 'flex', gap: 6, marginBottom: 8 },
  generateBtn: { padding: '5px 14px', borderRadius: 20, fontSize: 12, border: '1px solid #e8e4f8', background: '#f5f3ff', color: '#7c5cfc', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' },
  generateBtnActive: { border: '1px solid #7c5cfc', background: '#7c5cfc', color: '#fff' },
  inputBox: { background: '#f8f7ff', border: '1px solid #e8e4f8', borderRadius: 12, padding: '10px 12px' },
  textarea: { width: '100%', border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', resize: 'none', color: '#333', background: 'transparent', lineHeight: 1.6, minHeight: 40, transition: 'background 0.2s' },
  textareaDragging: { background: '#f0eeff', outline: '2px dashed #7c5cfc', outlineOffset: -2 },
  inputToolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  inputTools: { display: 'flex', gap: 6 },
  toolBtn: { fontSize: 12, color: '#6b6b8a', background: '#fff', borderRadius: 20, padding: '4px 10px', border: '1px solid #e8e4f8' },
  inputRight: { display: 'flex', gap: 6, alignItems: 'center' },
  attachBtn: { width: 30, height: 30, background: '#fff', borderRadius: '50%', fontSize: 14, border: '1px solid #e8e4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 30, height: 30, borderRadius: '50%', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' },
  disclaimer: { fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 8 },
  imagePreviewRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, padding: '6px 4px' },
  imagePreviewWrap: { position: 'relative', flexShrink: 0 },
  imagePreviewThumb: { width: 48, height: 48, objectFit: 'cover', borderRadius: 6, display: 'block', border: '1px solid #e8e4f8' },
  imagePreviewRemove: { position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: '50%', background: '#ff6b6b', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  imagePreviewName: { fontSize: 11, color: '#a0a0b8', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userImageThumb: { width: '100%', maxWidth: 70, borderRadius: 8, display: 'block', marginBottom: 6, objectFit: 'cover', cursor: 'pointer' },
  quoteThumb: { width: 32, height: 42, objectFit: 'cover', borderRadius: 4, flexShrink: 0 },
  quoteBody: { flex: 1, minWidth: 0 },
  quoteTitle: { fontSize: 11, fontWeight: 600, color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  quoteDesc: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  analysisBubble: { background: '#f8f7ff', border: '1px solid #ede9ff', borderRadius: '4px 12px 12px 12px', padding: '12px 14px', marginBottom: 10 },
  analysisTitle: { fontSize: 12, fontWeight: 700, color: '#7c5cfc', marginBottom: 8 },
  analysisText: { fontSize: 13, color: '#444', lineHeight: 1.7, whiteSpace: 'pre-wrap' },
  improvList: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 },
  improvItem: { fontSize: 12, color: '#555', display: 'flex', gap: 5 },
  chatReplyText: { fontSize: 13, color: '#333', lineHeight: 1.8, background: '#f8f7ff', borderRadius: '4px 12px 12px 12px', padding: '10px 14px' },
  chatLoadingBubble: { background: '#f5f3ff', borderRadius: '4px 16px 16px 16px', padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 8 },
};

const ss = {
  suggestBtn: { textAlign: 'left', fontSize: 12, color: '#6b6b8a', background: '#f5f3ff', border: '1px solid #e8e4f8', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', lineHeight: 1.4 },
  suggestLoading: { fontSize: 12, color: '#a78bfa', background: '#f5f3ff', border: '1px solid #e8e4f8', borderRadius: 8, padding: '8px 12px', lineHeight: 1.4, fontStyle: 'italic' },
  suggestError: { fontSize: 12, color: '#dc2626', background: '#fff5f5', border: '1px solid #fecdd3', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6 },
  inspirationBtn: { fontSize: 13, color: '#7c5cfc', background: '#f5f3ff', border: '1.5px dashed #c4b5fd', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', lineHeight: 1.4, marginTop: 4 },
  refreshBtn: { fontSize: 11, color: '#a78bfa', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' },
};
