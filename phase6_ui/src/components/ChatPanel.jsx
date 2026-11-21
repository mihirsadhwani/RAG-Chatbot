import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, User, Send, Copy, Check, Bookmark, Sparkles, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import SourceCard from './SourceCard';
import QueryDropdown from './QueryDropdown';
import { sendChatQuery, sendFeedback, trackEvent } from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

const SUGGESTED_CHIPS = [
  'What is the NAV of ICICI Prudential Mid Cap Fund?',
  'What is the expense ratio of SBI Small Cap Fund?',
  'What are the top holdings of Axis Flexi Cap Fund?',
  'Who manages HDFC Multi Cap Fund?',
];

export default function ChatPanel({ allFunds = [], onResultReceived, onSaveQuery, triggerQuery, onClearTrigger }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      text: "Hello! I'm your mutual fund research assistant. Ask me about NAV, SIP amounts, expense ratios, returns, holdings, or fund managers across HDFC, ICICI Prudential, SBI, Axis, and Bandhan (formerly IDFC) schemes.",
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [savedIds, setSavedIds] = useState({});
  const [ratings, setRatings] = useState({});
  const messagesEndRef = useRef(null);
  const lastQueryRef = useRef('');
  const responseCacheRef = useRef({});

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = useCallback(
    async (queryParam, sourceUi = 'chat_input') => {
      const rawQuery = (typeof queryParam === 'string' ? queryParam : input).trim();
      if (!rawQuery || loading) return;

      const historyPayload = messages
        .filter((m) => m.id !== 1)
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      lastQueryRef.current = rawQuery;
      setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: rawQuery, sources: [] }]);
      setInput('');
      setLoading(true);

      try {
        const data = await sendChatQuery(rawQuery, null, historyPayload, sourceUi);
        responseCacheRef.current[rawQuery] = data;
        const botMsg = {
          id: Date.now() + 1,
          role: 'assistant',
          text: data.answer,
          sources: data.sources || [],
          queryId: data.query_id,
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
            text: 'Unable to reach the backend RAG service. Please ensure the FastAPI server is running on port 8001.',
            sources: [],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, onResultReceived]
  );

  useEffect(() => {
    if (triggerQuery && triggerQuery.trim() !== '') {
      handleSend(triggerQuery, 'quick_action');
      if (onClearTrigger) onClearTrigger();
    }
  }, [triggerQuery, handleSend, onClearTrigger]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    trackEvent('copy_answer');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleRate = async (msg, value) => {
    if (!msg.queryId || ratings[msg.id]) return;
    setRatings((prev) => ({ ...prev, [msg.id]: value }));
    try {
      await sendFeedback(msg.queryId, value);
    } catch {
      setRatings((prev) => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
    }
  };

  const handleSave = (msg) => {
    if (onSaveQuery) {
      onSaveQuery(msg.originalQuery || 'Saved Query', {
        answer: msg.text,
        sources: msg.sources,
      });
      setSavedIds((prev) => ({ ...prev, [msg.id]: true }));
      trackEvent('save_query');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-transparent">
      {/* Top Quick Fact Builder */}
      <div className="relative z-10 mx-3 mt-3 px-3 md:px-4 pt-3 pb-3 rounded-2xl glass-toolbar shrink-0 space-y-2.5">
        <QueryDropdown funds={allFunds} onQueryGenerated={(q) => handleSend(q, 'quick_fact_builder')} />

        {messages.length <= 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground mr-1">
              <Sparkles className="w-3 h-3 text-primary" />
              Try:
            </span>
            {SUGGESTED_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSend(chip, 'suggested_chip')}
                className="glass-control text-xs px-3 py-1.5 rounded-full text-foreground/80 hover:text-primary hover:border-primary/30 transition-all cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={cn('flex items-start gap-3', isUser ? 'justify-end' : 'justify-start')}
            >
              {!isUser && (
                  <div className="w-9 h-9 rounded-full bg-white/75 border border-white/90 flex items-center justify-center text-primary shadow-sm shrink-0 mt-0.5 dark:bg-white/10 dark:border-white/10">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[88%] md:max-w-[75%] rounded-[22px] px-4 py-3.5 text-sm leading-relaxed shadow-sm',
                  isUser
                    ? 'bg-gradient-to-br from-primary to-[#3c9aff] text-primary-foreground rounded-tr-md shadow-[0_8px_22px_rgba(0,122,255,0.17)]'
                    : 'surface-card border border-white/80 text-card-foreground rounded-tl-md dark:border-white/10'
                )}
              >
                <div className="whitespace-pre-wrap break-words">{msg.text}</div>

                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-border flex flex-wrap gap-1.5">
                    {msg.sources.map((url, idx) => (
                      <SourceCard key={idx} url={url} />
                    ))}
                  </div>
                )}

                {!isUser && msg.id !== 1 && (
                  <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {onSaveQuery && (
                      <button
                        type="button"
                        onClick={() => handleSave(msg)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-2"
                      >
                        <Bookmark className={cn('w-3.5 h-3.5', savedIds[msg.id] && 'fill-primary text-primary')} />
                        <span>{savedIds[msg.id] ? 'Saved' : 'Save'}</span>
                      </button>
                    )}

                    {msg.queryId && (
                      <div className="ml-auto flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground mr-1">
                          {ratings[msg.id] ? 'Thanks for the feedback' : 'Helpful?'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRate(msg, 1)}
                          disabled={!!ratings[msg.id]}
                          aria-label="Helpful"
                          className="p-1 rounded-md hover:bg-muted cursor-pointer disabled:cursor-default"
                        >
                          <ThumbsUp className={cn('w-3.5 h-3.5', ratings[msg.id] === 1 ? 'text-emerald-500 fill-emerald-500/20' : 'text-muted-foreground')} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRate(msg, -1)}
                          disabled={!!ratings[msg.id]}
                          aria-label="Not helpful"
                          className="p-1 rounded-md hover:bg-muted cursor-pointer disabled:cursor-default"
                        >
                          <ThumbsDown className={cn('w-3.5 h-3.5', ratings[msg.id] === -1 ? 'text-red-500 fill-red-500/20' : 'text-muted-foreground')} />
                        </button>
                      </div>
                    )}
                    <Badge variant="outline" className="text-[10px] font-normal">
                      Gemini RAG
                    </Badge>
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Searching knowledge base &amp; generating answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Bar */}
      <div className="glass-toolbar relative z-10 mx-3 mb-3 p-2.5 md:p-3 rounded-2xl shrink-0">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about NAV, Expense Ratio, Holdings, Returns, or Fund Managers..."
            className="h-11 flex-1 bg-white/60 border-transparent focus-visible:bg-white/90 dark:bg-black/10"
            disabled={loading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            size="lg"
            className="h-11 rounded-xl shrink-0"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
