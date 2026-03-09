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

    // Auto-scroll to the newest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle externally triggered queries (e.g. from QuickFacts)
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

        // Return cached response for identical back-to-back queries
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
        } catch {
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

    /*
     * Layout strategy:
     *  • Dashboard gives us a  flex-1 overflow-hidden flex flex-col  slot.
     *  • ChatPanel fills that slot with  flex flex-col h-full  — no 100dvh
     *    needed here (that would fight the parent and break on mobile).
     *  • The filter bar uses  position:sticky / top:0  so it stays visible.
     *  • The message list gets  flex:1  and  overflow-y:auto  for independent
     *    scrolling with momentum on iOS Safari.
     *  • The input bar uses  flex-shrink:0  and  position:sticky / bottom:0
     *    so it stays anchored when the iOS keyboard opens.
     */
    return (
        <div
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            className="bg-surface"
        >
            {/* ── FILTER BAR — always visible, never scrolls away ── */}
            <div
                style={{ position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}
                className="px-3 sm:px-5 pt-3 pb-2 bg-surface/95 backdrop-blur-md border-b border-border"
            >
                <QueryDropdown onQueryGenerated={(q) => handleSend(q)} />
            </div>

            {/* ── CHAT MESSAGES — independently scrollable ── */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch', // smooth momentum on iOS
                    scrollBehavior: 'smooth',
                }}
                className="px-3 sm:px-5 py-4 flex flex-col gap-4"
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[88%] sm:max-w-[80%] rounded-[18px] px-4 py-3 sm:px-5 sm:py-4
                                text-[14px] sm:text-[15px] leading-relaxed shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-primary text-white rounded-br-[4px]'
                                    : 'bg-card border border-border text-text rounded-bl-[4px]'
                                }`}
                        >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.role === 'assistant' && <SourceCard sources={msg.sources} />}

                            {msg.role === 'assistant' && msg.id !== 1 && (
                                <div className="flex gap-3 mt-3 pt-2 border-t border-border/40">
                                    <button
                                        onClick={() => copyToClipboard(msg.text)}
                                        className="flex items-center gap-1 text-[12px] text-text-secondary hover:text-primary transition-colors"
                                        title="Copy to clipboard"
                                    >
                                        📋 Copy
                                    </button>
                                    {msg.originalQuery && onSaveQuery && (
                                        <button
                                            onClick={() => onSaveQuery(msg.originalQuery, msg)}
                                            className="flex items-center gap-1 text-[12px] text-text-secondary hover:text-accent transition-colors"
                                            title="Save query"
                                        >
                                            💾 Save
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Invisible scroll anchor */}
                <div ref={messagesEndRef} style={{ height: 1, flexShrink: 0 }} />
            </div>

            {/* ── INPUT BAR — pinned to the bottom, survives keyboard open ── */}
            <div
                style={{ position: 'sticky', bottom: 0, flexShrink: 0, zIndex: 10 }}
                className="px-3 sm:px-5 py-3 sm:py-4 border-t border-border bg-card/80 backdrop-blur-xl"
            >
                <div className="flex items-center gap-2 sm:gap-3 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about NAV, Expense Ratio…"
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-surface border border-border rounded-xl text-[14px] sm:text-[15px]
                            focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                            transition-all placeholder:text-text-secondary/60 disabled:opacity-60"
                    />
                    <button
                        onClick={() => handleSend(input)}
                        disabled={loading || !input.trim()}
                        className="px-4 py-3 sm:px-5 bg-primary text-white rounded-xl text-[15px] font-semibold
                            hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed
                            transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
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
