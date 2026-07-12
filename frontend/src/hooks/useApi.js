import { useState } from 'react';

const API_BASE = '/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // SSE 流式生成，onStep(label) 回调步骤，onContent(data) 文字完成时回调（含预览），返回最终完整数据
  async function generate(userInput, systemPrompt, imageStylePrompt, apiConfig, { onStep, onContent, chatHistory, imageSize, systemBase, imageBase64, imageMimeType, imageBase64Array, imageMimeTypeArray, signal } = {}) {
    setLoading(true);
    setError(null);
    return new Promise((resolve, reject) => {
      fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          userInput,
          systemPrompt,
          imageStylePrompt,
          systemBase,
          apiConfig,
          chatHistory,
          imageSize,
          imageBase64: imageBase64 || null,
          imageMimeType: imageMimeType || null,
          imageBase64Array: imageBase64Array || null,
          imageMimeTypeArray: imageMimeTypeArray || null
        }),
        signal,
      }).then(res => {
        if (!res.ok) {
          return res.json().then(d => { throw new Error(d.error || '生成失败'); });
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        function pump() {
          reader.read().then(({ done, value }) => {
            if (done) {
              setLoading(false);
              return;
            }
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop(); // 保留未完整的一行

            let event = null;
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                event = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (event === 'step' && onStep) onStep(data.label, data.step);
                  if (event === 'content' && onContent) onContent(data);
                  if (event === 'done') {
                    console.log('[useApi] done事件收到的data:', data);
                    setLoading(false);
                    resolve(data);
                    return;
                  }
                  if (event === 'error') {
                    setLoading(false);
                    const err = new Error(data.error || '生成失败');
                    setError(err.message);
                    reject(err);
                    return;
                  }
                } catch (_) {}
                event = null;
              }
            }
            pump();
          }).catch(err => {
            setLoading(false);
            setError(err.message);
            reject(err);
          });
        }
        pump();
      }).catch(err => {
        setLoading(false);
        setError(err.message);
        reject(err);
      });
    });
  }

  async function optimize(original, systemPrompt, apiConfig, optimizeBase) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original, systemPrompt, apiConfig, optimizeBase }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '优化失败');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function chat(userInput, systemPrompt, apiConfig, { chatBase, chatHistory, imageBase64, imageMimeType, onDelta, signal } = {}) {
    setLoading(true);
    setError(null);

    if (onDelta) {
      // 流式模式
      return new Promise((resolve, reject) => {
        fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({ userInput, systemPrompt, chatBase, apiConfig, chatHistory, imageBase64: imageBase64 || null, imageMimeType: imageMimeType || null }),
          signal,
        }).then(res => {
          if (!res.ok) {
            return res.json().then(d => { throw new Error(d.error || '聊天失败'); });
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          let fullReply = '';

          function pump() {
            reader.read().then(({ done, value }) => {
              if (done) {
                setLoading(false);
                resolve(fullReply);
                return;
              }
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split('\n');
              buf = lines.pop();

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.delta) {
                      fullReply += data.delta;
                      onDelta(data.delta);
                    }
                    if (data.done) {
                      setLoading(false);
                      resolve(fullReply);
                      return;
                    }
                    if (data.error) {
                      setLoading(false);
                      const err = new Error(data.error || '聊天失败');
                      setError(err.message);
                      reject(err);
                      return;
                    }
                  } catch (_) {}
                }
              }
              pump();
            }).catch(err => {
              setLoading(false);
              setError(err.message);
              reject(err);
            });
          }
          pump();
        }).catch(err => {
          setLoading(false);
          setError(err.message);
          reject(err);
        });
      });
    } else {
      // 非流式模式（兼容）
      try {
        const res = await fetch(`${API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userInput, systemPrompt, chatBase, apiConfig, chatHistory, imageBase64: imageBase64 || null, imageMimeType: imageMimeType || null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '聊天失败');
        return data.reply;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    }
  }

  async function fetchSuggestions(systemPrompt, systemBase, apiConfig, suggestionsBase) {
    try {
      const res = await fetch(`${API_BASE}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, systemBase, suggestionsBase, apiConfig }),
      });
      const data = await res.json();
      console.log('[fetchSuggestions] 响应:', res.status, data);
      if (!res.ok) throw new Error(data.error || '获取建议失败');
      const list = data.suggestions || [];
      if (list.length === 0) throw new Error('AI 返回了空结果');
      return list;
    } catch (err) {
      console.error('[fetchSuggestions] 失败:', err.message);
      throw err; // 让调用方处理错误
    }
  }

  async function aiRefinePrompts(userInput, apiConfig) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ai-refine-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userInput, apiConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI生成失败');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { generate, optimize, chat, fetchSuggestions, aiRefinePrompts, loading, error };
}
