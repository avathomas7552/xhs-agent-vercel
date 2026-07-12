import React, { useState, useRef, useEffect } from 'react';

const CHATS_KEY = 'xhs_chats';
const PINNED_KEY = 'xhs_pinned';

function loadChats() { try { return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]'); } catch { return []; } }
function saveChats(list) { localStorage.setItem(CHATS_KEY, JSON.stringify(list)); }
function loadPinned() { try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; } }
function savePinned(list) { localStorage.setItem(PINNED_KEY, JSON.stringify(list)); }

export function Sidebar({ onNewChat, currentChatId, onSelectChat, onOpenSettings, onOpenContents, savedCount }) {
  const [chats, setChats] = useState(loadChats);
  const [pinned, setPinned] = useState(loadPinned);
  const [contextMenu, setContextMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef(null);

  useEffect(() => {
    window.__addChat = (chat) => {
      setChats(prev => { const u = [chat, ...prev]; saveChats(u); return u; });
    };
    window.__updateChatTitle = (id, title) => {
      setChats(prev => { const u = prev.map(c => c.id === id ? { ...c, title } : c); saveChats(u); return u; });
    };
    return () => { delete window.__addChat; delete window.__updateChatTitle; };
  }, []);

  useEffect(() => {
    if (renaming && renameRef.current) renameRef.current.focus();
  }, [renaming]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  function handleContextMenu(e, chatId) {
    e.preventDefault(); e.stopPropagation();
    setContextMenu({ chatId, x: e.clientX, y: e.clientY });
  }

  function startRename(chatId) {
    setRenameVal(chats.find(c => c.id === chatId)?.title || '');
    setRenaming(chatId); setContextMenu(null);
  }

  function commitRename(chatId) {
    if (!renameVal.trim()) { setRenaming(null); return; }
    setChats(prev => { const u = prev.map(c => c.id === chatId ? { ...c, title: renameVal.trim() } : c); saveChats(u); return u; });
    setRenaming(null);
  }

  function deleteChat(chatId) {
    setChats(prev => { const u = prev.filter(c => c.id !== chatId); saveChats(u); return u; });
    setPinned(prev => { const u = prev.filter(id => id !== chatId); savePinned(u); return u; });
    setContextMenu(null);
    if (currentChatId === chatId) onNewChat();
  }

  function togglePin(chatId) {
    setPinned(prev => {
      const u = prev.includes(chatId) ? prev.filter(id => id !== chatId) : [chatId, ...prev];
      savePinned(u); return u;
    });
    setContextMenu(null);
  }

  const sortedChats = [
    ...chats.filter(c => pinned.includes(c.id)),
    ...chats.filter(c => !pinned.includes(c.id)),
  ];

  return (
    <div style={s.sidebar}>
      {/* Logo */}
      <div style={s.logo}>
        <div style={s.logoIcon}>✦</div>
        <div>
          <div style={s.logoTitle}>XHS Agent</div>
          <div style={s.logoSub}>小红书内容生成助手</div>
        </div>
      </div>

      {/* 新建对话 */}
      <button style={s.newChatBtn} onClick={onNewChat}>
        <span style={{ fontSize: 16, marginRight: 6 }}>＋</span> 新建对话
      </button>

      <div style={s.divider} />

      {/* 历史对话列表（占满中间剩余空间） */}
      <div style={s.listSection}>
        <div style={s.listLabel}>历史对话</div>
        {sortedChats.length === 0 && <div style={s.emptyList}>暂无对话</div>}
        {sortedChats.map(chat => (
          <div
            key={chat.id}
            style={{ ...s.chatItem, background: currentChatId === chat.id ? 'rgba(124,92,252,0.10)' : 'transparent' }}
            onClick={() => onSelectChat(chat)}
            onContextMenu={(e) => handleContextMenu(e, chat.id)}
          >
            {pinned.includes(chat.id) && <span style={s.pinIcon}>📌</span>}
            {renaming === chat.id ? (
              <input
                ref={renameRef}
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onBlur={() => commitRename(chat.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitRename(chat.id); if (e.key === 'Escape') setRenaming(null); }}
                style={s.renameInput}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                <span style={{ ...s.chatTitle, color: currentChatId === chat.id ? '#7c5cfc' : '#3d3d5c' }}>{chat.title}</span>
                <span style={s.chatTime}>{chat.time}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 底部按钮：我的内容 + 设置 */}
      <div style={s.bottomSection}>
        <div style={s.divider} />
        <div style={s.bottomBtn} onClick={onOpenContents}>
          <span style={s.menuIcon}>📄</span>
          <span>我的内容</span>
          {savedCount > 0 && <span style={s.badge}>{savedCount}</span>}
        </div>
        <div style={s.bottomBtn} onClick={onOpenSettings}>
          <span style={s.menuIcon}>⚙️</span>
          <span>设置</span>
        </div>
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div style={{ ...s.ctxMenu, top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 160) }} onClick={e => e.stopPropagation()}>
          <div style={s.ctxItem} onClick={() => startRename(contextMenu.chatId)}>✏️ 重命名</div>
          <div style={s.ctxItem} onClick={() => togglePin(contextMenu.chatId)}>
            {pinned.includes(contextMenu.chatId) ? '📌 取消置顶' : '📌 置顶'}
          </div>
          <div style={{ ...s.ctxItem, color: '#ef4444' }} onClick={() => deleteChat(contextMenu.chatId)}>🗑️ 删除</div>
        </div>
      )}
    </div>
  );
}

const s = {
  sidebar: { width: 220, minWidth: 220, background: '#f5f3ff', borderRight: '1px solid #e8e4f8', display: 'flex', flexDirection: 'column', padding: '20px 14px 12px', height: '100vh', overflow: 'hidden', position: 'relative' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoIcon: { width: 36, height: 36, background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 },
  logoTitle: { fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  logoSub: { fontSize: 10, color: '#a0a0b8' },
  newChatBtn: { background: 'linear-gradient(135deg, #7c5cfc, #a78bfa)', color: '#fff', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 600, width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' },
  divider: { height: 1, background: '#e8e4f8', margin: '0 0 10px' },
  listSection: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  listLabel: { fontSize: 11, color: '#a0a0b8', fontWeight: 600, marginBottom: 8, letterSpacing: 0.3 },
  emptyList: { fontSize: 12, color: '#ccc', textAlign: 'center', marginTop: 24 },
  chatItem: { display: 'flex', alignItems: 'center', gap: 4, padding: '7px 8px', borderRadius: 8, cursor: 'pointer', marginBottom: 1 },
  pinIcon: { fontSize: 10, flexShrink: 0 },
  chatTitle: { fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  chatTime: { fontSize: 10, color: '#b0b0c8', marginLeft: 4, whiteSpace: 'nowrap', flexShrink: 0 },
  renameInput: { flex: 1, fontSize: 12, border: '1px solid #a78bfa', borderRadius: 4, padding: '1px 4px', outline: 'none', color: '#3d3d5c', background: '#fff' },
  bottomSection: { flexShrink: 0 },
  bottomBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer', marginBottom: 2, color: '#6b6b8a' },
  menuIcon: { fontSize: 15 },
  badge: { marginLeft: 'auto', fontSize: 10, background: '#7c5cfc', color: '#fff', borderRadius: 20, padding: '1px 6px', fontWeight: 600 },
  ctxMenu: { position: 'fixed', background: '#fff', border: '1px solid #e8e4f8', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 200, minWidth: 140, padding: '4px 0' },
  ctxItem: { padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#3d3d5c', display: 'flex', alignItems: 'center', gap: 6 },
};
