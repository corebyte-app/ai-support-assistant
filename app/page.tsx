"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";

export default function Chat() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-4 sm:px-6">
      <header className="shrink-0 border-b border-border/70 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-accent text-sm font-semibold tracking-tight text-white shadow-sm shadow-accent/20">
            HC
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              Harbour Cafe
            </h1>
            <p className="text-sm text-muted">Auckland support assistant</p>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                  isUser
                    ? "rounded-br-md bg-accent text-white"
                    : "rounded-bl-md border border-border bg-surface text-foreground"
                }`}
              >
                {!isUser && (
                  <p className="mb-1 text-xs font-medium text-muted">
                    Assistant
                  </p>
                )}
                <div className="whitespace-pre-wrap">
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <span key={`${message.id}-${i}`}>{part.text}</span>
                        );
                      case "tool-getOpeningHours":
                        return (
                          <pre key={`${message.id}-${i}`}>
                            {JSON.stringify(part, null, 2)}
                          </pre>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {isBusy && (
          <div className="flex justify-start">
            <div className="rounded-3xl rounded-bl-md border border-border bg-surface px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 animate-pulse rounded-full bg-muted" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-muted [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <form
        className="shrink-0 pb-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-3xl border border-border bg-surface p-2 shadow-sm shadow-black/5">
          <input
            className="min-h-11 flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted"
            value={input}
            placeholder="Ask about hours, menu, or bookings..."
            onChange={(e) => setInput(e.currentTarget.value)}
            disabled={isBusy}
          />
          <button
            type="submit"
            disabled={!input.trim() || isBusy}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
