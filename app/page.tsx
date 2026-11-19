"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import type { BookingResult } from "@/lib/booking";
import type { KnowledgeResult } from "@/lib/knowledge";

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
                        if (part.state === "output-available") return null;
                        return (
                          <p
                            key={`${message.id}-${i}`}
                            className="my-2 text-xs text-muted"
                          >
                            Checking opening hours...
                          </p>
                        );
                      case "tool-searchKnowledge": {
                        const key = `${message.id}-${i}`;
                        if (part.state !== "output-available") {
                          return (
                            <p key={key} className="my-2 text-xs text-muted">
                              Searching cafe info...
                            </p>
                          );
                        }
                        const result = part.output as KnowledgeResult;
                        if (!result.found) return null;
                        return (
                          <div
                            key={key}
                            className="my-2 flex flex-wrap gap-1 text-xs text-muted"
                          >
                            <span>Sources:</span>
                            {result.results.map((r) => (
                              <span
                                key={r.title}
                                className="rounded-full border border-border px-2"
                              >
                                {r.title}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      case "tool-createBooking": {
                        const key = `${message.id}-${i}`;

                        if (part.state === "output-error") {
                          return (
                            <p key={key} className="my-2 text-xs text-red-600">
                              Booking error: {part.errorText}
                            </p>
                          );
                        }

                        if (part.state !== "output-available") {
                          return (
                            <p key={key} className="my-2 text-xs text-muted">
                              Checking the booking...
                            </p>
                          );
                        }

                        const result = part.output as BookingResult;

                        if (result.ok) {
                          const b = result.booking;
                          return (
                            <div
                              key={key}
                              className="my-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
                            >
                              <p className="font-semibold">
                                Booked ✓ {result.confirmationId}
                              </p>
                              <p>
                                {b.name}, {b.partySize}{" "}
                                {b.partySize === 1 ? "guest" : "guests"},{" "}
                                {b.date} at {b.time}
                              </p>
                              {b.notes && <p>Notes: {b.notes}</p>}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={key}
                            className="my-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
                          >
                            <p className="font-semibold">Not booked</p>
                            <ul className="list-disc pl-4">
                              {result.problems.map((p) => (
                                <li key={p}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      }
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
