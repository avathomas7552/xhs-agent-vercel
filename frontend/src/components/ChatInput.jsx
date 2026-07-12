import React, { useState, useRef } from 'react';

const EXAMPLES = [
  '帮我写一篇关于春日踏青的内容',
  '我刚买了BJD娃娃，想分享开箱',
  '推荐一款保湿护肤水',
  '记录今天的咖啡馆打卡',
];

export function ChatInput({ onSubmit, loading }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  function handleSubmit() {
    if (!value.trim() || loading) return;
    onSubmit(value.trim());
    setValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function applyExample(ex) {
    setValue(ex);
    textareaRef.current?.focus();
  }

  return (
    <div style={styles.wrap}>
      {/* 示例快捷词 */}
      <div style={styles.examples}>
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => applyExample(ex)} style={styles.exampleBtn}>
            {ex}
          </button>
        ))}
      </div>

      <div style={styles.inputRow}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="告诉我你想发什么内容，我来帮你生成小红书四件套..."
          style={styles.textarea}
          rows={2}
        />
        <button onClick={handleSubmit} disabled={!value.trim() || loading} style={styles.sendBtn}>
          {loading ? '⏳' : '✨ 生成'}
        </button>
      </div>
      <div style={styles.hint}>Enter 发送 · Shift+Enter 换行</div>
    </div>
  );
}

const styles = {
  wrap: { padding: '12px 16px', background: '#fff', borderTop: '1px solid #f0f0f0' },
  examples: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 8,
    scrollbarWidth: 'none',
  },
  exampleBtn: {
    whiteSpace: 'nowrap',
    fontSize: 12,
    padding: '4px 12px',
    background: '#fff5f7',
    border: '1px solid #ffd0d8',
    borderRadius: 20,
    color: '#ff2442',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    border: '1px solid #e0e0e0',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    lineHeight: 1.5,
    color: '#333',
    background: '#fafafa',
  },
  sendBtn: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #ff2442, #ff6b84)',
    color: '#fff',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  hint: { fontSize: 11, color: '#ccc', marginTop: 4 },
};
