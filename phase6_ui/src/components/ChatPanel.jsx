import { useState, useRef, useEffect, useCallback } from 'react';
import SourceCard from './SourceCard';
import QueryDropdown from './QueryDropdown';
import { sendChatQuery } from '../services/api';
import { normalizeQuery } from '../constants/funds';

export default function ChatPanel({ onResultReceived, onSaveQuery, triggerQuery, onClearTrigger }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            text: "Hello! I'm your HDFC Mutual Fund assistant. Ask me about expense ratios, NAV, SIP amounts, returns, holdings, or any other factual information about HDFC fund schemes.",
            sources: [],
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const lastQueryRef = useRef('');
    const responseCacheRef = useRef({});

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (triggerQuery && triggerQuery.trim() !== '') {
            handleSend(triggerQuery);
            if (onClearTrigger) onClearTrigger();
        }
    }, [triggerQuery]);

    const handleSend = useCallback(async (queryParam) => {
        const rawQuery = (typeof queryParam === 'string' ? queryParam : input).trim();
        if (!rawQuery || loading) return;

        const q = normalizeQuery(rawQuery);

        if (q === lastQueryRef.current && responseCacheRef.current[q]) {
            const cached = responseCacheRef.current[q];
            setMessages((prev) => [
                ...prev,
                { id: Date.now(), role: 'user', text: rawQuery, sources: [] },
                { id: Date.now() + 1, role: 'assistant', text: cached.answer, sources: cached.sources || [], originalQuery: rawQuery },
            ]);
            if (onResultReceived) onResultReceived(cached);
            setInput('');
            return;
        }

        lastQueryRef.current = q;
        setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: rawQuery, sources: [] }]);
        setInput('');
        setLoading(true);

        try {
            const data = await sendChatQuery(q);
            responseCacheRef.current[q] = data;
            const botMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                text: data.answer,
                sources: data.sources || [],
                originalQuery: rawQuery,
            };
            setMessages((prev) => [...prev, botMsg]);
            if (onResultReceived) onResultReceived(data);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    text: 'Sorry, an error occurred communicating with the backend API.',
                    sources: [],
                },
            ]);
        } finally {
            setLoading(false);
        }
    }, [input, loading, onResultReceived]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    return (
        /* Outer wrapper: full viewport height, flex column, no overflow */
        <div
            style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}
            className="bg-surface"
        >
            {/* ── TOP: always-visible dropdown controls ── */}
            <div className="shrink-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-2 z-20 bg-surface/95 backdrop-blur-md border-b border-border">
                <QueryDropdown onQueryGenerated={(q) => handleSend(q)} />
            </div>

            {/* ── MIDDLE: independently scrollable message list ── */}
            <div
                style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
                className="px-4 sm:px-6 py-4 space-y-6 flex flex-col scroll-smooth"
            >
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                            className={`max-w-[85%] rounded-[20px] px-5 py-4 text-[15px] leading-relaxed shadow-sm transition-all
                                ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-[5px]'
                                    : 'bg-card border border-border text-text rounded-bl-[5px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]'
                                }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.role === 'assistant' && <SourceCard sources={msg.sources} />}

                            {msg.role === 'assistant' && msg.id !== 1 && (
                                <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
                                    <button
                                        onClick={() => copyToClipboard(msg.text)}
                                        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors cursor-pointer"
                                        title="Copy to clipboard"
                                    >
                                        <span>📋</span> Copy
                                    </button>
                                    {msg.originalQuery && onSaveQuery && (
                                        <button
                                            onClick={() => onSaveQuery(msg.originalQuery, msg)}
                                            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors cursor-pointer"
                                            title="Save query"
                                        >
                                            <span>💾</span> Save
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl rounded-bl-md px-6 py-5 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2.5 h-2.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2.5 h-2.5 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} className="h-4 shrink-0" />
            </div>

            {/* ── BOTTOM: pinned input bar ── */}
            <div className="shrink-0 p-3 sm:px-6 sm:py-5 border-t border-border bg-card/50 backdrop-blur-xl">
                <div className="flex items-center gap-2 sm:gap-3 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about NAV, Expense Ratio etc..."
                        disabled={loading}
                        className="flex-1 px-4 py-3 sm:px-5 sm:py-4 bg-surface border border-border shadow-inner rounded-xl sm:rounded-2xl text-[14px] sm:text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-text-secondary/60 disabled:opacity-60"
                    />
                    <button
                        onClick={() => handleSend(input)}
                        disabled={loading || !input.trim()}
                        className="px-4 py-3 sm:px-6 sm:py-4 bg-primary text-white rounded-xl sm:rounded-2xl text-[15px] font-semibold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
                    >
                        <span className="hidden sm:inline">Send</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
