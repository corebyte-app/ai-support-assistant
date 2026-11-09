"use client";

import { useState } from "react";

type Booking = {
  name: string | null;
  date: string | null;
  time: string | null;
  partySize: number | null;
  notes: string | null;
};

type BookingResult = {
  booking: Booking;
  complete: boolean;
  missing: string[];
  invalid: string[];
  question: string | null;
};

const examples = [
  "Hi, I'm Jun, table for 4 tomorrow at 11am",
  "Table for 2 tomorrow at 11am",
  "Book a table",
  "Jun, table for 0 on Saturday at 10am",
];

export default function BookingPage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Harbour Cafe bookings</h1>
      <p className="mb-6 text-sm text-gray-500">
        Type a booking request in your own words.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="e.g. Table for 2 tomorrow at 11am, name is Jun"
          className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Send"}
        </button>
      </form>

      {/* Quick test messages */}
      <div className="mt-4 flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setMessage(ex)}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
          >
            {ex}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {result.complete ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              All details are here. (Not saved yet — that comes later.)
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              {result.question}
            </div>
          )}

          <dl className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 p-4 text-sm">
            {(["name", "date", "time", "partySize", "notes"] as const).map(
              (field) => {
                const value = result.booking[field];
                const isMissing = result.missing.includes(field);
                const isInvalid = result.invalid.includes(field);
                return (
                  <div key={field} className="contents">
                    <dt className="text-gray-500">{field}</dt>
                    <dd
                      className={`col-span-2 ${
                        isMissing || isInvalid
                          ? "text-red-600"
                          : "text-gray-900"
                      }`}
                    >
                      {value === null ? "—" : String(value)}
                      {isMissing && " (missing)"}
                      {isInvalid && " (invalid)"}
                    </dd>
                  </div>
                );
              },
            )}
          </dl>

          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Raw JSON</summary>
            <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-3">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </main>
  );
}
