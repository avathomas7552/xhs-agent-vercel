import React, { useState, useMemo, useEffect } from 'react';

function CopyBtn({ getText, label = '', style: extStyle }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    const text = typeof getText === 'function' ? getText() : getText;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }
  return (
    <button style={{ ...s.copyBtn, ...(copied ? s.copyBtnDone : {}), ...extStyle }} onClick={handleCopy}>
      {copied ? '✓ 已复制' : (label || '⧉')}
    </button>
  );
}

function DownloadBtn({ imageUrl }) {
  function handleDownload() {
    const downloadUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'xhs_cover.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  return (
    <button style={s.downloadBtn} onClick={handleDownload}>
      ↓
    </button>
  );
}

function Section({ label, onCopy, children, extra }) {
  return (
    <div style={ss.section}>
      <div style={ss.sectionHeader}>
        <span style={ss.sectionLabel}>{label}</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {extra}
          <CopyBtn getText={onCopy} />
        </div>
      </div>
      {children}
    </div>
  );
}

function ImageModal({ src, onClose }) {
  return (
    <div style={im.overlay} onClick={onClose}>
      <div style={im.box} onClick={e => e.stopPropagation()}>
        <img src={src} alt="封面大图" style={im.img} />
        <button style={im.closeBtn} onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

function EditImageModal({ onConfirm, onClose, disabled }) {
  const [text, setText] = useState('');
  return (
    <div style={im.overlay} onClick={onClose}>
      <div style={{ ...im.box, background: '#fff', borderRadius: 14, padding: '20px 22px', minWidth: 320, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 6 }}>✏️ 修改封面</div>
        <div style={{ fontSize: 12, color: '#a0a0b8', marginBottom: 14 }}>描述你希望如何修改封面，AI 会在原有风格基础上调整重新生成</div>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="例如：不要文字、把标题改成「夏日咖啡」、换成暖色调、背景改成室内场景..."
          style={{ width: '100%', height: 88, border: '1px solid #e8e4f8', borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box', color: '#333', lineHeight: 1.6 }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (text.trim()) onConfirm(text.trim()); } }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, border: '1px solid #e8e4f8', background: '#f5f3ff', color: '#7c5cfc', cursor: 'pointer' }} onClick={onClose}>取消</button>
          <button
            style={{ padding: '7px 18px', borderRadius: 8, fontSize: 13, border: 'none', background: text.trim() && !disabled ? '#7c5cfc' : '#d0c8f8', color: '#fff', cursor: text.trim() && !disabled ? 'pointer' : 'default', fontWeight: 600 }}
            disabled={!text.trim() || disabled}
            onClick={() => { if (text.trim()) onConfirm(text.trim()); }}
          >{disabled ? '生成中...' : '确认修改'}</button>
        </div>
      </div>
    </div>
  );
}

export function PreviewPanel({ content, optimizing, onOptimize, onRegenImage, regenning, onEditImage, width }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const imageHistory = useMemo(() => {
    if (!content) return [];
    const hist = Array.isArray(content.imageHistory) ? content.imageHistory : [];
    if (content.imageUrl && !hist.includes(content.imageUrl)) {
      return [...hist, content.imageUrl];
    }
    return hist;
  }, [content]);

  const displayImage = activeImageIdx !== null
    ? imageHistory[activeImageIdx]
    : (imageHistory.length > 0 ? imageHistory[imageHistory.length - 1] : null);

  useEffect(() => { setActiveImageIdx(null); }, [content?.id]);

  const panelStyle = { ...s.panel, width: width || 368, minWidth: width || 368 };

  if (!content) {
    return (
      <div style={panelStyle}>
        <div style={s.empty}>
          <div style={{ fontSize: 38, color: '#d0c8f8', marginBottom: 8 }}>✦</div>
          <div style={{ fontSize: 14, color: '#b0b0c8', fontWeight: 500 }}>内容预览区</div>
          <div style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>生成内容后在此展示</div>
        </div>
      </div>
    );
  }

  const titleText = (content.titles || [])[0] || '内容预览';

  return (
    <div style={panelStyle}>
      {lightboxSrc && <ImageModal src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      {showEditModal && (
        <EditImageModal
          disabled={regenning}
          onClose={() => setShowEditModal(false)}
          onConfirm={(req) => { setShowEditModal(false); onEditImage?.(req); }}
        />
      )}

      <div style={s.topbar}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s.panelTitle} title={titleText}>{titleText.slice(0, 14)}{titleText.length > 14 ? '…' : ''}</div>
          <div style={s.panelMeta}>
            {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            &nbsp;·&nbsp;{content.body?.length || 0} 字
          </div>
        </div>
        <div style={s.topActions}>
          <button style={s.iconBtn} title="重新生成封面" onClick={onRegenImage} disabled={regenning}>
            {regenning ? '…' : '↺'}
          </button>
          <CopyBtn
            getText={() => [(content.titles || [])[0] || '', '', content.body || '', '', (content.tags || []).map(t => `#${t}`).join(' ')].join('\n')}
            label="⧉"
            style={s.iconBtn}
          />
          {displayImage && (
            <DownloadBtn imageUrl={displayImage} />
          )}
        </div>
      </div>

      <div style={s.content}>
        <Section label="封面图" onCopy={() => displayImage || ''}>
          {displayImage ? (
            <div style={s.coverWrap} onClick={() => setLightboxSrc(displayImage)} title="点击查看大图">
              <img key={displayImage} src={displayImage} alt="封面" style={s.coverImg} />
              <span style={s.coverZoom}>🔍</span>
            </div>
          ) : (
            <div style={s.coverPlaceholder}>
              {regenning || optimizing ? <span style={{ color: '#a78bfa' }}>🖼️ 图片生成中…</span> : '🖼️ 暂无封面'}
            </div>
          )}

          {imageHistory.length > 1 && (
            <div style={s.historyRow}>
              {imageHistory.map((url, idx) => {
                const isActive = activeImageIdx === idx || (activeImageIdx === null && idx === imageHistory.length - 1);
                return (
                  <div
                    key={idx}
                    style={{ ...s.historyThumb, border: isActive ? '2px solid #7c5cfc' : '2px solid #e8e4f8' }}
                    onClick={() => setActiveImageIdx(idx)}
                    title={`封面 ${idx + 1}`}
                  >
                    <img src={url} alt={`封面${idx + 1}`} style={s.historyImg} />
                    <span style={s.historyIdx}>{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={s.imageActions}>
            <button style={s.regenBtn} onClick={onRegenImage} disabled={regenning}>
              {regenning ? '⏳ 生成中…' : '↺ 重新生成'}
            </button>
            <button style={s.editBtn} onClick={() => setShowEditModal(true)} disabled={regenning}>
              ✏️ 修改封面
            </button>
            {displayImage && (
              <DownloadBtn imageUrl={displayImage} />
            )}
          </div>

          {content.imagePrompt && (
            <div style={{ marginTop: 10 }}>
              <button
                style={s.promptToggleBtn}
                onClick={() => setShowPrompt(!showPrompt)}
                title={showPrompt ? '隐藏生图提示词' : '显示生图提示词'}
              >
                {showPrompt ? '隐藏提示词' : '显示提示词'}
              </button>
              {showPrompt && (
                <div style={s.promptHint}>
                  <span style={s.promptLabel}>生图提示词：</span>
                  <span style={s.promptText}>{content.imagePrompt}</span>
                </div>
              )}
            </div>
          )}
        </Section>

        <Section label="标题" onCopy={() => (content.titles || []).join('\n')}>
          {(content.titles || []).map((t, i) => (
            <div key={i} style={{ ...s.titleItem, background: i === 0 ? '#f5f3ff' : '#fafafa', border: i === 0 ? '1px solid #ede9ff' : '1px solid #f0f0f0' }}>
              <div style={s.titleLeft}>
                <span style={{ ...s.titleBadge, background: i === 0 ? '#7c5cfc' : '#bbb' }}>{i + 1}</span>
                <span style={s.titleText}>{t}</span>
              </div>
              <CopyBtn getText={() => t} style={s.copySmall} />
            </div>
          ))}
        </Section>

        <Section label="正文" onCopy={() => content.body || ''}>
          <div style={s.bodyText}>{content.body}</div>
        </Section>

        <Section label="标签" onCopy={() => (content.tags || []).map(t => `#${t}`).join(' ')}>
          <div style={s.tagsWrap}>
            {(content.tags || []).map((t, i) => (
              <span key={i} style={s.tag}>#{t}</span>
            ))}
          </div>
        </Section>
      </div>

      <div style={s.footer}>
        <button style={{ ...s.optimizeBtn, opacity: optimizing ? 0.7 : 1 }} onClick={onOptimize} disabled={optimizing}>
          {optimizing ? '⏳ 算法优化中...' : '⚡ 算法优化 ✦'}
        </button>
        <div style={s.footerNote}>优化标题、封面、关键词，让内容更容易被推荐</div>
      </div>
    </div>
  );
}

const s = {
  panel: { background: '#fff', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', flexShrink: 0 },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },
  topbar: { padding: '14px 16px', borderBottom: '1px solid #f0eeff', display: 'flex', alignItems: 'center', gap: 8 },
  panelTitle: { fontSize: 14, fontWeight: 700, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  panelMeta: { fontSize: 11, color: '#a0a0b8', marginTop: 2 },
  topActions: { display: 'flex', gap: 5, flexShrink: 0 },
  iconBtn: { width: 28, height: 28, background: '#f5f3ff', borderRadius: 6, fontSize: 13, color: '#7c5cfc', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  tabs: { display: 'flex', borderBottom: '1px solid #f0eeff', padding: '0 16px' },
  tab: { padding: '10px 14px', fontSize: 13, color: '#a0a0b8', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -1 },
  tabActive: { color: '#7c5cfc', fontWeight: 600, borderBottom: '2px solid #7c5cfc' },
  badge: { fontSize: 10, background: '#7c5cfc', color: '#fff', borderRadius: 20, padding: '1px 7px' },
  badgeGray: { fontSize: 10, background: '#e0e0e0', color: '#888', borderRadius: 20, padding: '1px 7px' },
  content: { flex: 1, overflowY: 'auto', padding: '14px 16px' },
  coverWrap: { borderRadius: 10, overflow: 'hidden', position: 'relative', background: '#f5f3ff', cursor: 'zoom-in', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  coverImg: { maxWidth: '100%', maxHeight: '500px', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' },
  coverZoom: { position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 12, padding: '2px 6px', borderRadius: 4 },
  coverPlaceholder: { height: 150, background: '#f5f3ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c4b5fd', fontSize: 14 },
  historyRow: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  historyThumb: { width: 44, height: 44, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', position: 'relative', flexShrink: 0 },
  historyImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  historyIdx: { position: 'absolute', bottom: 1, right: 3, fontSize: 9, color: '#fff', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.7)' },
  imageActions: { display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' },
  regenBtn: { flex: 1, padding: '6px 0', background: '#f5f3ff', borderRadius: 8, fontSize: 12, color: '#7c5cfc', border: '1px solid #e8e4f8', cursor: 'pointer' },
  editBtn: { flex: 1, padding: '6px 0', background: '#fff', borderRadius: 8, fontSize: 12, color: '#6b6b8a', border: '1px solid #e8e4f8', cursor: 'pointer' },
  downloadBtn: { padding: '6px 10px', background: '#7c5cfc', borderRadius: 8, fontSize: 12, color: '#fff', textAlign: 'center', textDecoration: 'none', fontWeight: 600, flexShrink: 0 },
  promptToggleBtn: { padding: '4px 10px', background: '#f5f5f5', borderRadius: 6, fontSize: 11, color: '#999', border: '1px solid #e8e8e8', cursor: 'pointer', transition: 'all 0.2s' },
  promptHint: { marginTop: 8, padding: '8px 10px', background: '#fafafa', borderRadius: 6, fontSize: 11, color: '#666', lineHeight: 1.6, wordBreak: 'break-word' },
  promptLabel: { fontWeight: 600, color: '#888', marginRight: 4 },
  promptText: { color: '#666' },
  titleItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, marginBottom: 4 },
  titleLeft: { display: 'flex', alignItems: 'flex-start', gap: 7, flex: 1 },
  titleBadge: { minWidth: 16, height: 16, borderRadius: 4, fontSize: 10, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, marginTop: 2, flexShrink: 0 },
  titleText: { fontSize: 13, color: '#1a1a2e', lineHeight: 1.5 },
  copySmall: { fontSize: 12, color: '#c4b5fd', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0 },
  bodyText: { fontSize: 13, color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#fafafa', borderRadius: 8, padding: '10px 12px' },
  tagsWrap: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: { fontSize: 12, color: '#7c5cfc', background: '#f0eeff', borderRadius: 20, padding: '3px 10px' },
  improvements: { background: '#f0fff4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginTop: 4 },
  improvTitle: { fontSize: 12, fontWeight: 600, color: '#16a34a', marginBottom: 8 },
  improvItem: { fontSize: 12, color: '#22863a', marginBottom: 4, display: 'flex', gap: 4 },
  improvDot: { color: '#4ade80', flexShrink: 0 },
  optimizeDims: { background: '#fafbff', border: '1px solid #f0eeff', borderRadius: 10, padding: '12px 14px', marginTop: 4 },
  optimizeDimsTitle: { fontSize: 12, color: '#a0a0b8', marginBottom: 10 },
  dimsList: { display: 'flex', flexDirection: 'column', gap: 8 },
  dimItem: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  dimIcon: { fontSize: 16, flexShrink: 0, marginTop: 1 },
  dimLabel: { fontSize: 12, fontWeight: 600, color: '#3d3d5c' },
  dimDesc: { fontSize: 11, color: '#a0a0b8', marginTop: 1 },
  footer: { padding: '12px 16px', borderTop: '1px solid #f0eeff' },
  optimizeBtn: { width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', letterSpacing: 1 },
  v2Footer: { display: 'flex', gap: 8, marginBottom: 8 },
  copyAllBtn: { flex: 2, padding: '10px 0', background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', borderRadius: 8, fontSize: 13, color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' },
  reoptimizeBtn: { flex: 1, padding: '10px 0', background: '#f5f3ff', borderRadius: 8, fontSize: 13, color: '#7c5cfc', border: '1px solid #e8e4f8', cursor: 'pointer' },
  footerNote: { fontSize: 11, color: '#ccc', textAlign: 'center', marginTop: 6 },
  copyBtn: { fontSize: 11, color: '#a0a0b8', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, transition: 'all 0.2s' },
  copyBtnDone: { color: '#22c55e', fontWeight: 600 },
};

const ss = {
  section: { marginBottom: 16 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sectionLabel: { fontSize: 13, fontWeight: 600, color: '#3d3d5c' },
};

const im = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  box: { position: 'relative', maxWidth: '90vw', maxHeight: '90vh' },
  img: { maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, display: 'block' },
  closeBtn: { position: 'absolute', top: -12, right: -12, width: 28, height: 28, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
};
