import React, { useState } from 'react';

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button onClick={handleCopy} style={styles.copyBtn}>
      {copied ? '✓ 已复制' : `复制${label}`}
    </button>
  );
}

function DownloadBtn({ imageUrl }) {
  function handleDownload() {
    const downloadUrl = `/api/download-image?url=${encodeURIComponent(imageUrl)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'cover.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <button onClick={handleDownload} style={styles.downloadBtn}>
      ↓ 下载封面
    </button>
  );
}

export function ContentCard({ content, version = 'V1', onOptimize, optimizing }) {
  const { titles = [], body = '', tags = [], imageUrl, improvements = [] } = content;

  function copyAll() {
    const text = [
      titles[0] || '',
      '',
      body,
      '',
      tags.map(t => `#${t}`).join(' '),
    ].join('\n');
    navigator.clipboard.writeText(text);
  }

  return (
    <div style={styles.card}>
      {/* 版本标签 */}
      <div style={{ ...styles.versionBadge, background: version === 'V2' ? '#ff2442' : '#666' }}>
        {version}
      </div>

      {/* 封面图 */}
      {imageUrl && (
        <div style={styles.coverWrap}>
          <img src={imageUrl} alt="封面" style={styles.coverImg} />
          <DownloadBtn imageUrl={imageUrl} />
        </div>
      )}
      {!imageUrl && (
        <div style={styles.coverPlaceholder}>🖼️ 封面生成中...</div>
      )}

      {/* 标题区 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionLabel}>📝 标题方案</span>
          <CopyBtn text={titles[0] || ''} label="标题" />
        </div>
        {titles.map((t, i) => (
          <div key={i} style={{ ...styles.titleItem, background: i === 0 ? '#fff5f7' : '#fafafa' }}>
            <span style={styles.titleIndex}>{i + 1}</span>
            <span style={styles.titleText}>{t}</span>
          </div>
        ))}
      </div>

      {/* 正文区 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionLabel}>✍️ 正文</span>
          <CopyBtn text={body} label="正文" />
        </div>
        <div style={styles.bodyText}>{body}</div>
      </div>

      {/* 标签区 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionLabel}># 标签</span>
          <CopyBtn text={tags.map(t => `#${t}`).join(' ')} label="标签" />
        </div>
        <div style={styles.tagsWrap}>
          {tags.map((t, i) => (
            <span key={i} style={styles.tag}>#{t}</span>
          ))}
        </div>
      </div>

      {/* V2改进说明 */}
      {improvements.length > 0 && (
        <div style={styles.improvements}>
          <div style={styles.sectionLabel}>🚀 优化说明</div>
          {improvements.map((item, i) => (
            <div key={i} style={styles.improvementItem}>• {item}</div>
          ))}
        </div>
      )}

      {/* 操作栏 */}
      <div style={styles.actions}>
        <button onClick={copyAll} style={styles.copyAllBtn}>📋 一键复制全部</button>
        {version === 'V1' && onOptimize && (
          <button onClick={onOptimize} disabled={optimizing} style={styles.optimizeBtn}>
            {optimizing ? '⏳ 优化中...' : '⚡ 算法优化 V2'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
    position: 'relative',
    marginBottom: 16,
  },
  versionBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 20,
  },
  coverWrap: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    aspectRatio: '3/4',
    maxHeight: 280,
  },
  coverImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  downloadBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
  },
  coverPlaceholder: {
    background: '#f5f5f5',
    borderRadius: 12,
    height: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
  },
  section: { marginBottom: 16 },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: { fontSize: 13, fontWeight: 600, color: '#333' },
  copyBtn: {
    fontSize: 11,
    color: '#ff2442',
    background: '#fff5f7',
    border: '1px solid #ffd0d8',
    borderRadius: 20,
    padding: '3px 10px',
    fontWeight: 500,
  },
  titleItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 8,
    marginBottom: 4,
  },
  titleIndex: {
    fontSize: 11,
    color: '#ff2442',
    fontWeight: 700,
    minWidth: 16,
    paddingTop: 1,
  },
  titleText: { fontSize: 14, color: '#1a1a1a', lineHeight: 1.5 },
  bodyText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
    background: '#fafafa',
    borderRadius: 8,
    padding: '10px 12px',
    maxHeight: 200,
    overflowY: 'auto',
  },
  tagsWrap: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  tag: {
    fontSize: 12,
    color: '#ff2442',
    background: '#fff5f7',
    border: '1px solid #ffd0d8',
    borderRadius: 20,
    padding: '3px 10px',
  },
  improvements: {
    background: '#f0fff4',
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 16,
  },
  improvementItem: { fontSize: 12, color: '#22863a', marginTop: 4 },
  actions: {
    display: 'flex',
    gap: 8,
    paddingTop: 12,
    borderTop: '1px solid #f0f0f0',
  },
  copyAllBtn: {
    flex: 1,
    padding: '10px 0',
    background: '#f5f5f5',
    borderRadius: 8,
    fontSize: 13,
    color: '#333',
    fontWeight: 500,
  },
  optimizeBtn: {
    flex: 1,
    padding: '10px 0',
    background: 'linear-gradient(135deg, #ff2442, #ff6b84)',
    borderRadius: 8,
    fontSize: 13,
    color: '#fff',
    fontWeight: 600,
  },
};
