"use client";

import { useState, useRef, useEffect } from "react";
import { SparklesIcon, XIcon, SendIcon, Loader2Icon, ChevronDownIcon } from "lucide-react";
import { aiChat } from "@/services/analytics";

interface Message {
    role: "user" | "assistant";
    text: string;
}

export default function AIChatPanel() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    async function send() {
        const q = input.trim();
        if (!q || loading) return;

        setMessages(prev => [...prev, { role: "user", text: q }]);
        setInput("");
        setLoading(true);
        setError(null);

        try {
            const { answer } = await aiChat(q);
            setMessages(prev => [...prev, { role: "assistant", text: answer }]);
        } catch (e: unknown) {
            const msg = e instanceof Error && e.message === "rate_limited"
                ? "Groq rate limit reached. Please wait a moment and try again."
                : "AI service unavailable. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    const SUGGESTIONS = [
        "Which jobs are due this week?",
        "Show me stale leads",
        "Which quotes haven't had a response in 7+ days?",
        "Are there any overdue jobs?",
    ];

    return (
        <>
            {/* Floating trigger button */}
            <button
                onClick={() => setOpen(o => !o)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-brand-blue text-white px-4 py-3 rounded-full shadow-lg hover:bg-brand-blue/90 transition-all"
                aria-label="AI Assistant"
            >
                <SparklesIcon className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Ask AI</span>
            </button>

            {/* Chat panel */}
            {open && (
                <div className="fixed bottom-20 right-6 z-50 w-full max-w-sm sm:max-w-md flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
                    style={{ height: "520px" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-brand-blue text-white">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4" />
                            <span className="font-semibold text-sm">PrintDuka AI</span>
                            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">Live data</span>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded transition-colors">
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                        {messages.length === 0 && (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 text-center">
                                    Ask about jobs, leads, quotes, or any business data.
                                </p>
                                <div className="space-y-1.5">
                                    {SUGGESTIONS.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => { setInput(s); inputRef.current?.focus(); }}
                                            className="w-full text-left text-xs px-3 py-2 rounded-lg border border-gray-200 hover:border-brand-blue hover:bg-blue-50 transition-colors text-gray-600"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                                        m.role === "user"
                                            ? "bg-brand-blue text-white rounded-br-sm"
                                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                                    }`}
                                >
                                    {m.role === "assistant" && (
                                        <div className="flex items-center gap-1 mb-1 text-xs text-gray-400">
                                            <SparklesIcon className="w-3 h-3" /> AI
                                        </div>
                                    )}
                                    {m.text}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2">
                                    <Loader2Icon className="w-4 h-4 text-gray-400 animate-spin" />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                {error}
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-gray-200 px-3 py-2 flex items-end gap-2">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Ask anything about your business…"
                            rows={1}
                            className="flex-1 resize-none text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue transition-colors max-h-28 overflow-y-auto"
                            style={{ lineHeight: "1.4" }}
                            disabled={loading}
                        />
                        <button
                            onClick={send}
                            disabled={!input.trim() || loading}
                            className="p-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
                        >
                            {loading
                                ? <Loader2Icon className="w-4 h-4 animate-spin" />
                                : <SendIcon className="w-4 h-4" />
                            }
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
