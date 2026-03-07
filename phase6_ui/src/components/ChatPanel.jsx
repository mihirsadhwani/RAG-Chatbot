import { useState, useRef, useEffect } from 'react';
import SourceCard from './SourceCard';
import QueryDropdown from './QueryDropdown';
import { sendChatQuery } from '../services/api';

export default function ChatPanel({ onResultReceived, onSaveQuery, triggerQuery, onClearTrigger }) {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            text: 'Hello! I\'m your HDFC Mutual Fund assistant. Ask me about expense ratios, NAV, SIP amounts, returns, holdings, or any other factual information about HDFC fund schemes.',
            sources: [],
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

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

    const handleSend = async (queryParam) => {
        const q = (typeof queryParam === 'string' ? queryParam : input).trim();
        if (!q || loading) return;

        setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: q, sources: [] }]);
        setInput('');
        setLoading(true);

        try {
            const data = await sendChatQuery(q);
            const botMsg = { id: Date.now() + 1, role: 'assistant', text: data.answer, sources: data.sources || [], originalQuery: q };
            setMessages((prev) => [...prev, botMsg]);
            if (onResultReceived) onResultReceived(data);
        } catch (err) {
            setMessages((prev) => [
                ...prev,
                { id: Date.now() + 1, role: 'assistant', text: 'Sorry, an error occurred communicating with the backend API.', sources: [] },
            ]);
        } finally {
            setLoading(false);
        }
    };

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
        <div className="flex flex-col h-full bg-surface">
            <div className="px-6 pt-4 pb-2 z-10 sticky top-0 bg-surface/90 backdrop-blur-md">
                <QueryDropdown onQueryGenerated={(q) => handleSend(q)} />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 flex flex-col scroll-smooth">
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

                            {/* Actions for Assistant */}
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

                <div ref={messagesEndRef} className="h-4 shrink-0" />
            </div>

            <div className="px-6 py-5 border-t border-border bg-card/50 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3 max-w-4xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about NAV, Expense Ratio, Returns..."
                        disabled={loading}
                        className="flex-1 px-5 py-4 bg-surface border border-border shadow-inner rounded-2xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-text-secondary/60 disabled:opacity-60"
                    />
                    <button
                        onClick={() => handleSend(input)}
                        disabled={loading || !input.trim()}
                        className="px-6 py-4 bg-primary text-white rounded-2xl text-[15px] font-semibold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer flex items-center gap-2"
                    >
                        <span>Send</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
