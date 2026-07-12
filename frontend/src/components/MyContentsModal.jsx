import React, { useState } from 'react';

export function MyContentsModal({ contents, onClose, onSelect }) {
  const [preview, setPreview] = useState(null);

  function handleSelect(item) {
    onSelect(item);
    onClose();
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <div>
            <div style={s.title}>我的内容</div>
            <div style={s.sub}>共 {contents.length} 条 · 自动保存</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {contents.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, color: '#999' }}>还没有生成过内容</div>
            <div style={{ fontSize: 12, color: '#ccc', marginTop: 4 }}>生成内容后会自动保存在这里</div>
          </div>
        ) : (
          <div style={s.body}>
            {/* 左侧列表 */}
            <div style={s.list}>
              {contents.map(item => (
                <div
                  key={item.id}
                  style={{ ...s.listItem, background: preview?.id === item.id ? '#f5f3ff' : '#fff', borderColor: preview?.id === item.id ? '#a78bfa' : '#f0eeff' }}
                  onClick={() => setPreview(item)}
                >
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt="" style={s.thumb} />
                    : <div style={s.thumbPlaceholder}>🖼️</div>
                  }
                  <div style={s.listMeta}>
                    <div style={s.listTitle}>{(item.titles?.[0] || '无标题').slice(0, 20)}</div>
                    <div style={s.listTime}>{item.savedAt}</div>
                    <div style={s.listTags}>{(item.tags || []).slice(0, 2).map(t => `#${t}`).join(' ')}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* 右侧预览 */}
            <div style={s.detail}>
              {!preview ? (
                <div style={s.detailEmpty}>← 点击左侧查看详情</div>
              ) : (
                <>
                  {preview.imageUrl && (
                    <div style={s.detailCover}>
                      <img src={preview.imageUrl} alt="封面" style={s.detailImg} />
                    </div>
                  )}
                  <div style={s.detailTitle}>{preview.titles?.[0]}</div>
                  {(preview.titles || []).slice(1).map((t, i) => (
                    <div key={i} style={s.detailAltTitle}>{t}</div>
                  ))}
                  <div style={s.detailBody}>{preview.body}</div>
                  <div style={s.detailTagsWrap}>
                    {(preview.tags || []).map((t, i) => <span key={i} style={s.tag}>#{t}</span>)}
                  </div>
                  <div style={s.detailActions}>
                    <button style={s.useBtn} onClick={() => handleSelect(preview)}>在预览面板中打开</button>
                    <button style={s.copyBtn} onClick={() => {
                      const text = [(preview.titles||[])[0],'',preview.body,'',(preview.tags||[]).map(t=>`#${t}`).join(' ')].join('\n');
                      navigator.clipboard.writeText(text);
                    }}>复制全部</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: 16, width: 760, maxWidth: '94vw', height: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 48px rgba(124,92,252,0.18)', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 14px', borderBottom: '1px solid #f0eeff', flexShrink: 0 },
  title: { fontSize: 17, fontWeight: 700, color: '#1a1a2e' },
  sub: { fontSize: 12, color: '#a0a0b8', marginTop: 2 },
  closeBtn: { width: 28, height: 28, borderRadius: '50%', background: '#f5f3ff', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
  list: { width: 260, borderRight: '1px solid #f0eeff', overflowY: 'auto', padding: '8px' },
  listItem: { display: 'flex', gap: 10, padding: '10px', borderRadius: 10, cursor: 'pointer', marginBottom: 6, border: '1px solid', transition: 'all 0.15s' },
  thumb: { width: 44, height: 'auto', maxHeight: 80, objectFit: 'contain', borderRadius: 6, flexShrink: 0, background: '#f0eeff' },
  thumbPlaceholder: { width: 44, height: 58, background: '#f0eeff', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  listMeta: { flex: 1, minWidth: 0 },
  listTitle: { fontSize: 12, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  listTime: { fontSize: 10, color: '#b0b0c8', marginTop: 3 },
  listTags: { fontSize: 10, color: '#7c5cfc', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  detail: { flex: 1, overflowY: 'auto', padding: '16px 20px' },
  detailEmpty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 13 },
  detailCover: { borderRadius: 10, overflow: 'hidden', marginBottom: 12, background: '#f0eeff', textAlign: 'center' },
  detailImg: { maxWidth: '100%', width: 'auto', height: 'auto', maxHeight: 320, objectFit: 'contain', display: 'inline-block', borderRadius: 8 },
  detailTitle: { fontSize: 15, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.5, marginBottom: 4 },
  detailAltTitle: { fontSize: 13, color: '#6b6b8a', lineHeight: 1.5, marginBottom: 4 },
  detailBody: { fontSize: 13, color: '#444', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: '#fafafa', borderRadius: 8, padding: '10px 12px', margin: '12px 0', maxHeight: 180, overflowY: 'auto' },
  detailTagsWrap: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 },
  tag: { fontSize: 11, color: '#7c5cfc', background: '#f0eeff', borderRadius: 20, padding: '2px 8px' },
  detailActions: { display: 'flex', gap: 8 },
  useBtn: { flex: 1, padding: '9px 0', background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' },
  copyBtn: { flex: 1, padding: '9px 0', background: '#f5f3ff', color: '#7c5cfc', borderRadius: 8, fontSize: 13, border: '1px solid #e8e4f8', cursor: 'pointer' },
};
