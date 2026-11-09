import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

const bookingSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe(
      "Customer name exactly as given. null if not mentioned. Never invent a name.",
    ),
  date: z
    .string()
    .nullable()
    .describe("Booking date as YYYY-MM-DD. null if not mentioned or unclear."),
  time: z
    .string()
    .nullable()
    .describe(
      "Booking time in 24-hour HH:mm format. null if not mentioned or unclear.",
    ),
  partySize: z
    .number()
    .nullable()
    .describe("Number of guests. null if not mentioned."),
  notes: z
    .string()
    .nullable()
    .describe(
      "Any extra requests, like a high chair or window seat. null if none.",
    ),
});

type Booking = z.infer<typeof bookingSchema>;

// 2. Today's date in Auckland, e.g. "2026-11-09" and "Monday".
function getAucklandToday() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
  }).format(now); // en-CA gives YYYY-MM-DD
  const weekday = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    weekday: "long",
  }).format(now);
  return { date, weekday };
}

// 3. Our own checks. The model only fills the shape; we decide if it's complete.
const fieldLabels: Record<string, string> = {
  name: "your name",
  date: "the date",
  time: "the time",
  partySize: "the number of guests",
};

function checkBooking(booking: Booking) {
  const missing: string[] = [];
  const invalid: string[] = [];
  const isEmpty = (value: string | null) =>
    value === null || value.trim() === "";
  if (isEmpty(booking.name)) missing.push("name");
  if (isEmpty(booking.date)) missing.push("date");
  if (isEmpty(booking.time)) missing.push("time");
  if (booking.partySize === null) {
    missing.push("partySize");
  } else if (!Number.isInteger(booking.partySize) || booking.partySize < 1) {
    invalid.push("partySize");
  }
  let question: string | null = null;
  if (missing.length > 0) {
    question = `Could you tell me ${missing.map((f) => fieldLabels[f]).join(", ")}?`;
  } else if (invalid.includes("partySize")) {
    question =
      "How many guests will there be? Please give a whole number, like 2 or 4.";
  }
  return {
    complete: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    question,
  };
}

export async function POST(req: Request) {
  const { message }: { message: string } = await req.json();
  const today = getAucklandToday();

  try {
    const { output } = await generateText({
      model: "openai/gpt-5-mini",
      instructions: `You extract table booking details for Harbour Cafe in Auckland.
Today is ${today.weekday}, ${today.date} (Pacific/Auckland).
Turn words like "tomorrow" or "Saturday" into a real YYYY-MM-DD date.
If a detail is missing or unclear, return null for it. Never guess or invent details.`,
      output: Output.object({ schema: bookingSchema }),
      prompt: message,
    });

    const check = checkBooking(output);
    return Response.json({ booking: output, ...check });
  } catch (error) {
    // Only for real generation failures, not for missing details.
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("NoObjectGeneratedError:", error.cause, error.text);
      return Response.json(
        { error: "Sorry, I couldn't read that booking. Please try again." },
        { status: 500 },
      );
    }
    throw error;
  }
}
