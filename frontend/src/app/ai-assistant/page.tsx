'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '../../lib/api';
import { Bot, Send, User, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';

const SUGGESTED_QUERIES = [
  'Show me the current status of BSB-2771.',
  'What is the latest activity on BSB-2652?',
  'Which of these five cards are inactive?',
  'Why is BSB-2559 at risk?',
  'What happened on BSB-2606 today?',
  'Show me all recent commits for BSB-2690.',
  'Which cards are waiting for QA?',
  'Which cards are missing unit tests?',
  'Which developer has the highest workload?',
  'Which cards have had no activity for 2 days?',
  "Give me today's BSB sprint summary.",
];

function AIAssistantContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get('prompt') || '';

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string; timestamp: Date; source?: string }[]
  >([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI Project Management Assistant for Jira Project BSB. I retrieve structured telemetry from PostgreSQL and Jira/Git without hallucinating data. Ask me anything about sprint progress, the 5 priority cards (BSB-2771, BSB-2652, BSB-2559, BSB-2606, BSB-2690), developer activity, QA readiness, or risks.',
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { role: 'user' as const, content: query, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { question: query });
      const assistantMsg = {
        role: 'assistant' as const,
        content: res.data.answer,
        timestamp: new Date(),
        source: res.data.source,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to query project data. Please verify your backend server connection.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">
              Tool-Grounded AI
            </span>
            <span className="text-xs text-slate-400 font-medium">PostgreSQL & Jira API Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI PM Project Assistant</h1>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>No Hallucination Policy Enforced</span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
              }`}
            >
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed space-y-1 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
              <div
                className={`text-[10px] pt-1 flex items-center justify-between ${
                  m.role === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                <span>
                  {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {m.source && <span className="font-mono text-[9px] uppercase">[{m.source}]</span>}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
              Querying live PostgreSQL database & Jira state...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Queries */}
      <div className="pt-3 pb-2">
        <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-blue-400" />
          <span>Suggested PM Questions:</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
          {SUGGESTED_QUERIES.slice(0, 5).map((q) => (
            <button
              key={q}
              onClick={() => handleSendMessage(q)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white whitespace-nowrap transition"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 pt-2 border-t border-slate-800"
      >
        <input
          type="text"
          placeholder="Ask about cards (e.g. 'Show status of BSB-2771'), sprint metrics, inactivity..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 transition disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

export default function AIAssistantPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-xs text-slate-400">
          Loading AI Assistant...
        </div>
      }
    >
      <AIAssistantContent />
    </Suspense>
  );
}
