import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useApi } from './hooks/useApi';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { SettingsModal, loadSettings } from './components/SettingsModal';
import { MyContentsModal } from './components/MyContentsModal';
import Dither from './components/Dither';

const CONTENTS_KEY = 'xhs_saved_contents';
const CHAT_DATA_KEY = 'xhs_chat_data';

function loadContents() {
  try { return JSON.parse(localStorage.getItem(CONTENTS_KEY) || '[]'); } catch { return []; }
}
function saveContents(list) {
  localStorage.setItem(CONTENTS_KEY, JSON.stringify(list.slice(0, 200)));
}
function loadChatData() {
  try { return JSON.parse(localStorage.getItem(CHAT_DATA_KEY) || '{}'); } catch { return {}; }
}
function saveChatData(chatId, messages, latestContentId) {
  const all = loadChatData();
  // loading 中的消息直接删除（不保存），避免刷新后显示"生成中断"
  const cleanMsgs = messages.map(m => {
    // 如果消息有实际内容（content、chatReply、optimizeResult、error），则认为已完成，移除loading标志
    if (m.content || m.chatReply || m.optimizeResult || m.error) {
      const { loading, stepLabel, step, partialContent, optimizeLoading, ...rest } = m;
      return rest;
    }
    // 如果消息仍在loading状态且没有内容，则不保存（返回null，后面过滤掉）
    if (m.loading) {
      return null;
    }
    // 清理base64图片
    if (m.content?.imageUrl?.startsWith('data:')) {
      return { ...m, content: { ...m.content, imageUrl: null } };
    }
    return m;
  }).filter(m => m !== null);  // 过滤掉null值
  all[String(chatId)] = { messages: cleanMsgs, latestContentId };
  const keys = Object.keys(all);
  if (keys.length > 20) {
    keys.slice(0, keys.length - 20).forEach(k => delete all[k]);
  }
  try {
    localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(all));
  } catch (e) {
    localStorage.removeItem(CHAT_DATA_KEY);
  }
}

export default function App() {
  const { generate, optimize, chat, fetchSuggestions, loading } = useApi();

  const [showSettings, setShowSettings] = useState(false);
  const [showContents, setShowContents] = useState(false);
  const [settings, setSettings] = useState(loadSettings);

  const [currentChatId, setCurrentChatId] = useState(null);
  const currentChatIdRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [latestContent, setLatestContent] = useState(null);
  const latestContentRef = useRef(null);
  const [v2Content, setV2Content] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [regenning, setRegenning] = useState(false);
  const currentAbortController = useRef(null); // 用于终止进行中的任务

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [chatMode, setChatMode] = useState('chat'); // 'generate' | 'chat'

  const [savedContents, setSavedContents] = useState(loadContents);

  // 后台任务的实时消息状态，key 为 chatId
  // 切换回某个有后台任务的 chat 时，优先使用内存状态而非 localStorage
  const bgTaskMessages = useRef({}); // { [chatId]: Message[] }
  const bgTaskContent = useRef({});  // { [chatId]: content }

  // 预览区宽度拖拽
  const [previewWidth, setPreviewWidth] = useState(368);
  const onDragStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = previewWidth;
    function onMove(e) {
      const delta = startX - e.clientX;
      setPreviewWidth(Math.max(280, Math.min(600, startW + delta)));
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [previewWidth]);

  // messages/latestContent 同步到 ref
  useEffect(() => { latestContentRef.current = latestContent; }, [latestContent]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // 自动保存当前聊天的消息到 localStorage
  useEffect(() => {
    if (currentChatIdRef.current && messages.length > 0) {
      const chatId = currentChatIdRef.current;
      const all = loadChatData();
      // 保存所有消息（包括已完成的），不删除任何东西
      const cleanMsgs = messages.map(m => {
        // 只删除正在loading的消息
        if (m.loading) return null;
        // 清理base64图片以节省空间
        if (m.content?.imageUrl?.startsWith('data:')) {
          return { ...m, content: { ...m.content, imageUrl: null } };
        }
        return m;
      }).filter(m => m !== null);

      if (cleanMsgs.length > 0) {
        all[String(chatId)] = { messages: cleanMsgs, latestContentId: latestContentRef.current?.id || all[String(chatId)]?.latestContentId || null };
        try { localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(all)); } catch (_) {}
      }
    }
  }, [messages]);

  function nowTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  function nowDate() {
    const d = new Date();
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function getApiConfig() {
    const { textApiBase, textApiKey, textModel, imageApiBase, imageApiKey, imageModel } = settings;
    const hasTextKey = textApiKey && textApiKey.trim();
    const hasImageKey = imageApiKey && imageApiKey.trim();
    if (!hasTextKey && !hasImageKey) return undefined;
    const cfg = {};
    if (hasTextKey) {
      cfg.textApiKey = textApiKey.trim();
      if (textApiBase && textApiBase.trim()) cfg.textApiBase = textApiBase.trim();
      if (textModel && textModel.trim()) cfg.textModel = textModel.trim();
    }
    if (hasImageKey) {
      cfg.imageApiKey = imageApiKey.trim();
      if (imageApiBase && imageApiBase.trim()) cfg.imageApiBase = imageApiBase.trim();
      if (imageModel && imageModel.trim()) cfg.imageModel = imageModel.trim();
    }
    return cfg;
  }

  function addToSaved(content) {
    const item = { id: Date.now(), ...content, savedAt: nowDate() };
    setSavedContents(prev => {
      const updated = [item, ...prev];
      saveContents(updated);
      return updated;
    });
    return item;
  }

  function handleNewChat() {
    const id = Date.now();
    currentChatIdRef.current = id;
    setCurrentChatId(id);
    setMessages([]);
    setLatestContent(null);
    latestContentRef.current = null;
    setV2Content(null);
    setSuggestions([]);
    setSuggestionsLoading(false);
    setChatMode('chat');
    window.__addChat?.({ id, title: '新对话', time: nowTime() });
    return id;
  }

  function handleFetchSuggestions() {
    // 直接切换到聊天模式，发送固定灵感请求
    setChatMode('chat');
    handleSubmit('不知道发什么？给我一点灵感吧。', null, 'chat');
  }

  function handleAbortTask() {
    if (currentAbortController.current) {
      currentAbortController.current.abort();
      currentAbortController.current = null;
    }
  }

  function handleSelectChat(chat) {
    const id = chat.id;
    if (currentChatIdRef.current === id) return;

    // 保存当前聊天的最新状态到 localStorage（不转换 loading → error）
    if (currentChatIdRef.current && messagesRef.current.length > 0) {
      // 只保存非 loading 的消息，loading 中的留给后台任务自己更新
      const currentId = currentChatIdRef.current;
      const all = loadChatData();
      const cleanMsgs = messagesRef.current.map(m => {
        if (m.loading) return null; // 后台任务继续管理，不覆盖
        if (m.content?.imageUrl?.startsWith('data:')) return { ...m, content: { ...m.content, imageUrl: null } };
        return m;
      }).filter(Boolean);
      // 只有当 cleanMsgs 涵盖了所有非 loading 消息时才保存
      if (cleanMsgs.length > 0) {
        all[String(currentId)] = { messages: cleanMsgs, latestContentId: latestContentRef.current?.id || all[String(currentId)]?.latestContentId || null };
        try { localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(all)); } catch (_) {}
      }
    }

    currentChatIdRef.current = id;
    setCurrentChatId(id);
    setV2Content(null);

    // 优先使用内存中的后台任务实时状态
    if (bgTaskMessages.current[id]) {
      setMessages([...bgTaskMessages.current[id]]);
      const bgContent = bgTaskContent.current[id];
      setLatestContent(bgContent || null);
      latestContentRef.current = bgContent || null;
      return;
    }

    const all = loadChatData();
    const saved = all[String(id)];
    if (saved && saved.messages?.length > 0) {
      setMessages(saved.messages);
      if (saved.latestContentId) {
        const allContents = loadContents();
        const found = allContents.find(c => c.id === saved.latestContentId);
        setLatestContent(found || null);
        latestContentRef.current = found || null;
      } else {
        setLatestContent(null);
        latestContentRef.current = null;
      }
    } else {
      setMessages([]);
      setLatestContent(null);
      latestContentRef.current = null;
    }
  }

  async function handleSubmit(userInput, imageData, forceChatMode) {
    let chatId = currentChatIdRef.current;
    if (!chatId) {
      chatId = handleNewChat();
    }
    const taskChatId = chatId;
    setV2Content(null);

    const userMsgId = Date.now();
    const placeholderId = userMsgId + 1;

    // 在状态更新前，先从 bgTaskMessages（内存）中取历史，确保读到最新状态
    const currentMessages = bgTaskMessages.current[taskChatId] || messagesRef.current;
    const chatHistorySnapshot = currentMessages.filter(
      m => (m.role === 'user' && m.text) || (m.role === 'assistant' && (m.content || m.chatReply))
    );

    // 更新消息：当前视图更新 UI，后台任务更新内存 bgTaskMessages
    function updateTaskMessages(updater) {
      if (currentChatIdRef.current === taskChatId) {
        // 当前视图：直接更新 UI
        setMessages(prev => {
          const next = typeof updater === 'function' ? updater(prev) : updater;
          // 同步更新内存备份（以防用户切走后再切回来）
          bgTaskMessages.current[taskChatId] = next;
          return next;
        });
      } else {
        // 后台任务：更新内存备份
        const prev = bgTaskMessages.current[taskChatId] || [];
        const next = typeof updater === 'function' ? updater(prev) : updater;
        bgTaskMessages.current[taskChatId] = next;
      }
    }

    // 初始化后台任务内存
    bgTaskMessages.current[taskChatId] = bgTaskMessages.current[taskChatId] || messagesRef.current.slice();

    updateTaskMessages(prev => {
      const isFirst = !prev.some(m => m.role === 'user');
      if (isFirst) {
        window.__updateChatTitle?.(taskChatId, userInput.slice(0, 16));
      }
      return [
        ...prev,
        {
          id: userMsgId,
          role: 'user',
          text: userInput,
          imageDataUrl: (imageData && !Array.isArray(imageData)) ? imageData.dataUrl : null,
          imageDataUrls: Array.isArray(imageData) ? imageData.map(img => img.dataUrl) : null,
          time: nowTime()
        },
        { id: placeholderId, role: 'assistant', loading: true, chatLoading: (forceChatMode || chatMode) === 'chat' },
      ];
    });

    // 创建 AbortController 用于终止任务
    const abortController = new AbortController();
    currentAbortController.current = abortController;

    // 聊天模式：走纯聊天 API
    if ((forceChatMode || chatMode) === 'chat') {
      try {
        const reply = await chat(userInput, settings.systemPrompt, getApiConfig(), {
          chatBase: settings.chatBase || '',
          chatHistory: chatHistorySnapshot,
          imageBase64: Array.isArray(imageData) ? imageData[0]?.base64 || null : imageData?.base64 || null,
          imageMimeType: Array.isArray(imageData) ? imageData[0]?.mimeType || null : imageData?.mimeType || null,
          signal: abortController.signal,
          onDelta: (delta) => {
            if (abortController.signal.aborted) return;
            updateTaskMessages(prev => prev.map(m =>
              m.id === placeholderId
                ? { ...m, chatReply: (m.chatReply || '') + delta }
                : m
            ));
          },
        });
        if (abortController.signal.aborted) return;
        currentAbortController.current = null;
        updateTaskMessages(prev => prev.map(m =>
          m.id === placeholderId
            ? { id: placeholderId, role: 'assistant', chatReply: reply }
            : m
        ));
      } catch (err) {
        if (abortController.signal.aborted || err.name === 'AbortError') {
          currentAbortController.current = null;
          updateTaskMessages(prev => prev.map(m =>
            m.id === placeholderId
              ? { id: placeholderId, role: 'assistant', error: '已取消' }
              : m
          ));
          return;
        }
        currentAbortController.current = null;
        updateTaskMessages(prev => prev.map(m =>
          m.id === placeholderId
            ? { id: placeholderId, role: 'assistant', error: err.message }
            : m
        ));
      }
      return;
    }

    try {
      const data = await generate(userInput, settings.systemPrompt, settings.imageStylePrompt, getApiConfig(), {
        chatHistory: chatHistorySnapshot,
        imageSize: settings.imageSize || '768x1024',
        systemBase: settings.systemBase || '',
        imageBase64Array: Array.isArray(imageData) ? imageData.map(img => img.base64) : null,
        imageMimeTypeArray: Array.isArray(imageData) ? imageData.map(img => img.mimeType) : null,
        signal: abortController.signal,
        onStep: (label, step) => {
          if (abortController.signal.aborted) return;
          updateTaskMessages(prev => prev.map(m =>
            m.id === placeholderId ? { ...m, stepLabel: label, step } : m
          ));
        },
        onContent: (content) => {
          if (abortController.signal.aborted) return;
          bgTaskContent.current[taskChatId] = { ...content, imageUrl: null };
          if (currentChatIdRef.current === taskChatId) {
            setLatestContent({ ...content, imageUrl: null });
          }
          updateTaskMessages(prev => prev.map(m =>
            m.id === placeholderId
              ? { ...m, stepLabel: '封面图生成中，请稍候...', step: 'image_gen', partialContent: content }
              : m
          ));
        },
      });

      if (abortController.signal.aborted) {
        updateTaskMessages(prev => prev.map(m =>
          m.id === placeholderId
            ? { id: placeholderId, role: 'assistant', error: '已取消' }
            : m
        ));
        return;
      }

      currentAbortController.current = null;

      const savedItem = addToSaved(data);
      const contentWithId = { ...data, id: savedItem.id };

      bgTaskContent.current[taskChatId] = contentWithId;
      if (currentChatIdRef.current === taskChatId) {
        setLatestContent(contentWithId);
        latestContentRef.current = contentWithId;
        // 生成完成后自动切回聊天模式
        setChatMode('chat');
      }

      updateTaskMessages(prev => prev.map(m =>
        m.id === placeholderId
          ? { id: placeholderId, role: 'assistant', content: contentWithId }
          : m
      ));

      // 持久化最终结果到 localStorage
      const finalMsgs = bgTaskMessages.current[taskChatId] || [];
      const cleanMsgs = finalMsgs.map(m => {
        if (m.loading) return null;  // 删除loading消息，不转为错误
        if (m.content?.imageUrl?.startsWith('data:')) return { ...m, content: { ...m.content, imageUrl: null } };
        return m;
      }).filter(m => m !== null);  // 过滤掉null值
      const all = loadChatData();
      all[String(taskChatId)] = { messages: cleanMsgs, latestContentId: contentWithId.id };
      try { localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(all)); } catch (_) {}

      // 清理内存备份
      delete bgTaskMessages.current[taskChatId];
      delete bgTaskContent.current[taskChatId];

    } catch (err) {
      if (abortController.signal.aborted || err.name === 'AbortError') {
        currentAbortController.current = null;
        updateTaskMessages(prev => prev.map(m =>
          m.id === placeholderId
            ? { id: placeholderId, role: 'assistant', error: '已取消' }
            : m
        ));
        return;
      }
      currentAbortController.current = null;
      updateTaskMessages(prev => prev.map(m =>
        m.id === placeholderId
          ? { id: placeholderId, role: 'assistant', error: err.message }
          : m
      ));
      // 持久化错误状态
      const finalMsgs = bgTaskMessages.current[taskChatId] || [];
      const all = loadChatData();
      all[String(taskChatId)] = { messages: finalMsgs, latestContentId: all[String(taskChatId)]?.latestContentId || null };
      try { localStorage.setItem(CHAT_DATA_KEY, JSON.stringify(all)); } catch (_) {}
      delete bgTaskMessages.current[taskChatId];
      delete bgTaskContent.current[taskChatId];
    }
  }

  async function handleOptimize() {
    if (!latestContent) return;
    setOptimizing(true);

    const originalContent = latestContent;
    const userMsgId = Date.now();
    const placeholderId = userMsgId + 1;

    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: '请帮我对这条内容进行分析和算法优化。',
        time: nowTime(),
        quoteContent: originalContent,
      },
      { id: placeholderId, role: 'assistant', loading: true, optimizeLoading: true },
    ]);

    const { imageUrl: _drop, ...contentWithoutImage } = originalContent;

    try {
      const v2 = await optimize(contentWithoutImage, settings.systemPrompt, getApiConfig(), settings.optimizeBase || '');
      const savedItem = addToSaved({ ...v2, isV2: true });
      const v2WithId = { ...v2, id: savedItem.id };

      setMessages(prev => prev.map(m =>
        m.id === placeholderId
          ? {
              id: placeholderId,
              role: 'assistant',
              optimizeResult: {
                analysis: v2.analysis,
                improvements: v2.improvements,
                content: v2WithId,
              },
            }
          : m
      ));
    } catch (err) {
      setMessages(prev => prev.map(m =>
        m.id === placeholderId
          ? { id: placeholderId, role: 'assistant', error: '优化失败：' + err.message }
          : m
      ));
    } finally {
      setOptimizing(false);
    }
  }

  async function handleRegenImage() {
    if (!latestContent) return;
    setRegenning(true);
    try {
      const res = await fetch('/api/regen-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt: latestContent.imagePrompt, apiConfig: getApiConfig(), imageSize: settings.imageSize || '1024x1536', titleText: (latestContent.titles || [])[0] || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '重新生成失败');
      const updated = { ...latestContent, imageUrl: data.imageUrl, imageHistory: [...(latestContent.imageHistory || (latestContent.imageUrl ? [latestContent.imageUrl] : [])), data.imageUrl] };
      setLatestContent(updated);
      latestContentRef.current = updated;
      addToSaved({ ...updated, regenAt: nowDate() });
    } catch (err) {
      alert('封面重新生成失败：' + err.message);
    } finally {
      setRegenning(false);
    }
  }

  async function handleEditImage(editRequest) {
    if (!latestContent || !editRequest.trim()) return;
    setRegenning(true);
    try {
      const res = await fetch('/api/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePrompt: latestContent.imagePrompt,
          editRequest,
          apiConfig: getApiConfig(),
          imageSize: settings.imageSize || '768x1024',
          titleText: (latestContent.titles || [])[0] || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '修改失败');
      const updated = {
        ...latestContent,
        imageUrl: data.imageUrl,
        imagePrompt: data.newPrompt || latestContent.imagePrompt,
        imageHistory: [...(latestContent.imageHistory || (latestContent.imageUrl ? [latestContent.imageUrl] : [])), data.imageUrl],
      };
      setLatestContent(updated);
      latestContentRef.current = updated;
      addToSaved({ ...updated, regenAt: nowDate() });
    } catch (err) {
      alert('封面修改失败：' + err.message);
    } finally {
      setRegenning(false);
    }
  }

  const ditherBg = useMemo(() => (
    <div style={styles.ditherBg}>
      <Dither
        waveColor={[0.48, 0.36, 0.98]}
        disableAnimation={false}
        enableMouseInteraction={true}
        mouseRadius={0.3}
        colorNum={4}
        waveAmplitude={0.29}
        waveFrequency={3}
        waveSpeed={0.05}
        pixelSize={2}
      />
    </div>
  ), []);

  return (
    <div style={styles.root}>
      {ditherBg}
      <div style={styles.panels}>
        <Sidebar
          onNewChat={handleNewChat}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onOpenSettings={() => setShowSettings(true)}
          onOpenContents={() => setShowContents(true)}
          savedCount={savedContents.length}
        />
        <ChatPanel
          messages={messages}
          loading={loading}
          onSubmit={handleSubmit}
          onAbort={handleAbortTask}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          onFetchSuggestions={handleFetchSuggestions}
          chatMode={chatMode}
          onChatModeChange={setChatMode}
          onSelectContent={(content) => {
            setLatestContent(content);
            latestContentRef.current = content;
            setV2Content(null);
          }}
        />

        <div onMouseDown={onDragStart} style={styles.resizeBar} title="拖拽调整宽度" />

        <PreviewPanel
          content={latestContent}
          optimizing={optimizing}
          regenning={regenning}
          onOptimize={handleOptimize}
          onRegenImage={handleRegenImage}
          onEditImage={handleEditImage}
          width={previewWidth}
        />

        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} onSave={setSettings} />
        )}
        {showContents && (
          <MyContentsModal
            contents={savedContents}
            onClose={() => setShowContents(false)}
            onSelect={(item) => { setLatestContent(item); latestContentRef.current = item; setV2Content(null); }}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { display: 'flex', height: '100vh', overflow: 'hidden', background: '#ece9f8', position: 'relative' },
  ditherBg: { position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' },
  panels: { position: 'relative', zIndex: 1, display: 'flex', flex: 1, height: '100vh', overflow: 'hidden' },
  resizeBar: { width: 5, cursor: 'col-resize', background: 'transparent', flexShrink: 0, borderLeft: '1px solid #e8e4f8' },
};
