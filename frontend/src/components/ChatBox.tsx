import React, { useRef, useState } from 'react';
import type { Player, Team } from '../types/fpl';

type Msg = { role: 'user' | 'assistant'; text: string };

type Props = {
    open?: boolean;
    onClose?: () => void;
    teams: Record<number, Team>;   // kept for future use
    starters: Player[];            // kept for future use
    bench: Player[];               // kept for future use
    budgetLeft: number;            // kept for future use
};

export default function ChatBox({ open = true, onClose }: Props) {
    const [messages, setMessages] = useState<Msg[]>([
        { role: 'assistant', text: 'Hi! Ask me anything about your squad, captain picks, or transfers.' }
    ]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const scrollerRef = useRef<HTMLDivElement>(null);

    const send = async () => {
        const text = input.trim();
        if (!text || busy) return;
        setMessages(m => [...m, { role: 'user', text }]);
        setInput('');
        setBusy(true);

        try {
            const res = await fetch('/v1/ask-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });

            const raw = await res.text();
            if (!res.ok) {
                let msg = raw;
                try { const j = JSON.parse(raw); msg = j.error || j.message || raw; } catch { }
                throw new Error(`HTTP ${res.status}: ${msg}`);
            }
            let reply = '(no reply)';
            try { reply = (JSON.parse(raw).reply) ?? reply; } catch { reply = raw || reply; }

            setMessages(m => [...m, { role: 'assistant', text: reply }]);
        } catch (err: any) {
            setMessages(m => [...m, { role: 'assistant', text: `Error: ${err?.message || String(err)}` }]);
        } finally {
            setBusy(false);
            requestAnimationFrame(() => {
                scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
            });
        }
    };

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); }
    };

    if (!open) return null;

    return (
        <div className="chatbox">
            <div className="chatbox-head">
                <strong>Squad chat</strong>
                <div className="spacer" />
                <button className="chatbox-close" onClick={onClose} aria-label="Close">×</button>
            </div>

            <div className="chatbox-body" ref={scrollerRef}>
                {messages.map((m, i) => (
                    <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
                ))}
            </div>

            <div className="chatbox-input">
                <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Ask about transfers, captain, fixtures… (Shift+Enter = newline)"
                />
                <button className="btn" onClick={send} disabled={busy || !input.trim()}>
                    {busy ? 'Sending…' : 'Send'}
                </button>
            </div>
        </div>
    );
}
