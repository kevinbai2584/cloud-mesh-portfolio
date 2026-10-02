import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface RetrievedChunk {
  title: string;
  content: string;
  metadata: {
    category: string;
    source: string;
    component: string;
  };
  score: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RetrievedChunk[];
}

interface WorkflowNode {
  id: string;
  name: string;
  sub: string;
}

const WORKFLOW_NODES: WorkflowNode[] = [
  { id: 'query_analysis', name: '1. Intent & Routing', sub: 'LangGraph Router' },
  { id: 'hybrid_retrieval', name: '2. Hybrid Retrieval', sub: 'ChromaDB + BM25' },
  { id: 'rerank', name: '3. Cross-Encoder', sub: 'Top-K Re-rank' },
  { id: 'guardrail', name: '4. Hallucination Check', sub: 'Self-Correction' },
  { id: 'generation', name: '5. Streaming Synthesis', sub: 'LLM Output' },
];

const PRESET_PROMPTS = [
  'Deep-dive into Pintos OS: How did you implement priority donation & demand paging?',
  'Explain your Event-Driven Kafka architecture and consumer rebalancing strategy.',
  'How does your LangGraph Agentic RAG handle hallucination and state persistence?',
  'Summarize your UC Berkeley EECS coursework and core competencies.',
];

function AgentStudio() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      content:
        'Hello! I am **Yu (Kevin) Bai\'s AI Digital Twin**, driven by LangGraph, FastAPI, and hybrid semantic retrieval.\n\nAsk me anything about Kevin\'s kernel subsystems, distributed Kafka pipelines, or architectural tradeoffs.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [showSourcesMap, setShowSourcesMap] = useState<Record<string, boolean>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, activeNode]);

  const toggleSources = (msgId: string) => {
    setShowSourcesMap((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isStreaming) return;

    setInput('');
    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: 'user', content: textToSend },
      { id: assistantMsgId, role: 'assistant', content: '', sources: [] },
    ]);

    setIsStreaming(true);
    setActiveNode('query_analysis');
    setCompletedNodes([]);

    try {
      const response = await fetch('http://localhost:8000/api/v1/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const event = JSON.parse(dataStr);

              // 阶段推进事件
              if (event.type === 'stage') {
                setActiveNode(event.node);
                setCompletedNodes((prev) =>
                  prev.includes(event.node) ? prev : [...prev, event.node]
                );
              }

              // 真实 RAG 切片数据事件
              if (event.type === 'sources' && event.chunks) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, sources: event.chunks } : msg
                  )
                );
              }

              // 打字机 Token 事件
              if (event.type === 'token' && event.delta) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: msg.content + event.delta }
                      : msg
                  )
                );
              }
            } catch {
              // 忽略解析碎片
            }
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content:
                  msg.content +
                  '\n\n*[Connection Notice: Unable to reach FastAPI backend on http://localhost:8000. Ensure agent-service is running.]*',
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      setActiveNode(null);
    }
  };

  return (
    <div style={{ color: '#f1f5f9', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* 模块头部栏 */}
      <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: 20, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 9999, backgroundColor: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#c084fc' }}></span>
            Federated Remote Module: mfe-agent (5003)
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 6px 0', color: '#ffffff' }}>
            Agent Studio & Digital Twin
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
            Powered by LangGraph multi-agent execution graphs, FastAPI streaming SSE, and verified systems knowledge.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: 'monospace', color: '#64748b' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isStreaming ? '#38bdf8' : '#34d399', display: 'inline-block' }}></span>
          {isStreaming ? 'LangGraph Executing...' : 'Engine Ready (FastAPI: 8000)'}
        </div>
      </div>

      {/* 动态 LangGraph 流程看板 */}
      <div
        style={{
          backgroundColor: '#070b14',
          border: '1px solid #1e293b',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.08em' }}>
            LANGGRAPH EXECUTION GRAPH & HYBRID RAG TRACE
          </span>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
            {isStreaming ? 'State Graph Active' : 'Pipeline Idle'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {WORKFLOW_NODES.map((node) => {
            const isCurrent = activeNode === node.id;
            const isDone = completedNodes.includes(node.id) && !isCurrent;

            return (
              <div
                key={node.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: isCurrent
                    ? '1px solid #38bdf8'
                    : isDone
                    ? '1px solid #10b981'
                    : '1px solid #1e293b',
                  backgroundColor: isCurrent
                    ? 'rgba(56,189,248,0.1)'
                    : isDone
                    ? 'rgba(16,185,129,0.06)'
                    : '#0f172a',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: isCurrent ? '#38bdf8' : isDone ? '#10b981' : '#64748b',
                    }}
                  >
                    {node.name}
                  </span>
                  <span style={{ fontSize: 12 }}>
                    {isCurrent ? '⚡' : isDone ? '✓' : '○'}
                  </span>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: isCurrent ? '#bae6fd' : '#475569' }}>
                  {node.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 预设提问胶囊 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {PRESET_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            disabled={isStreaming}
            onClick={() => handleSend(prompt)}
            style={{
              padding: '8px 14px',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 6,
              color: '#cbd5e1',
              fontSize: 13,
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.2s',
            }}
          >
            💬 {prompt}
          </button>
        ))}
      </div>

      {/* 对话列表区 */}
      <div
        style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 12,
          padding: 24,
          minHeight: 440,
          maxHeight: 560,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', marginBottom: 4 }}>
              {msg.role === 'user' ? 'Interviewer / Engineer' : 'Kevin AI Twin (LangGraph)'}
            </span>
            <div
              style={{
                maxWidth: '88%',
                padding: '16px 20px',
                borderRadius: 10,
                fontSize: 14,
                backgroundColor: msg.role === 'user' ? '#1e293b' : '#070b14',
                color: '#f8fafc',
                border: msg.role === 'user' ? '1px solid #334155' : '1px solid #1e293b',
                boxShadow: msg.role === 'assistant' ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
              }}
            >
              {msg.role === 'user' ? (
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{msg.content}</div>
              ) : (
                <div style={{ lineHeight: 1.7 }}>
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p style={{ margin: '0 0 12px 0' }} {...props} />,
                      strong: ({ node, ...props }) => <strong style={{ color: '#38bdf8', fontWeight: 600 }} {...props} />,
                      ol: ({ node, ...props }) => <ol style={{ margin: '0 0 12px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }} {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ margin: '0 0 12px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ color: '#cbd5e1' }} {...props} />,
                      code: ({ node, ...props }) => (
                        <code
                          style={{
                            backgroundColor: '#1e293b',
                            color: '#e2e8f0',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontFamily: 'monospace',
                            fontSize: '0.9em',
                            border: '1px solid #334155',
                          }}
                          {...props}
                        />
                      ),
                    }}
                  >
                    {msg.content || (isStreaming ? 'Executing LangGraph agent nodes...' : '')}
                  </ReactMarkdown>

                  {/* 核心亮点：RAG 真实检索来源证据卡片 */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: '1px dashed #1e293b', paddingTop: 10 }}>
                      <button
                        onClick={() => toggleSources(msg.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontFamily: 'monospace',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: 0,
                          marginBottom: 8,
                        }}
                      >
                        <span>{showSourcesMap[msg.id] ? '▼' : '▶'}</span>
                        <span>
                          RAG Retrieved Sources ({msg.sources.length} Chunks Matched)
                        </span>
                      </button>

                      {showSourcesMap[msg.id] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                          {msg.sources.map((chunk, cIdx) => (
                            <div
                              key={cIdx}
                              style={{
                                backgroundColor: '#0f172a',
                                border: '1px solid #1e293b',
                                borderRadius: 6,
                                padding: '10px 12px',
                                fontSize: 12,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ color: '#38bdf8', fontWeight: 600, fontFamily: 'monospace' }}>
                                  [{chunk.metadata.source}] {chunk.title}
                                </span>
                                <span
                                  style={{
                                    backgroundColor: 'rgba(56,189,248,0.1)',
                                    color: '#38bdf8',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                  }}
                                >
                                  Score: {chunk.score}
                                </span>
                              </div>
                              <p style={{ margin: 0, color: '#94a3b8', lineHeight: 1.5, fontSize: 12 }}>
                                {chunk.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* 底部输入框 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <input
          type="text"
          value={input}
          disabled={isStreaming}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Ask a technical architecture question (e.g. Pintos syscalls, Kafka partitions)..."
          style={{
            flex: 1,
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#ffffff',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          disabled={isStreaming || !input.trim()}
          onClick={() => handleSend()}
          style={{
            padding: '0 24px',
            backgroundColor: isStreaming ? '#334155' : '#38bdf8',
            color: isStreaming ? '#94a3b8' : '#0b0f19',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: isStreaming ? 'not-allowed' : 'pointer',
          }}
        >
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

export default AgentStudio;