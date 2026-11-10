import {
  aucklandToday,
  BookingResult,
  checkBooking,
  makeConfirmationId,
  MAX_PARTY_SIZE,
  hours,
  formatHours,
} from "@/lib/booking";
import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
  tool,
  isStepCount,
} from "ai";
import z from "zod";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const today = aucklandToday();

  const result = streamText({
    model: "openai/gpt-5-mini",
    instructions: `You are a friendly support assistant for Harbour Cafe in Auckland.
Today is ${today.weekday}, ${today.date} (Pacific/Auckland).
Use the getOpeningHours tool for any question about opening times.
Table bookings:
- You need name, date, time and party size (max ${MAX_PARTY_SIZE}). Notes are optional.
- If something is missing, ask for it in a short, friendly question. Never guess a name.
- Turn words like "tomorrow" or "Saturday" into a real YYYY-MM-DD date, and times into 24h HH:mm.
- Only call createBooking when you have all four details.
- If createBooking returns problems, explain them simply and help the guest pick another option.
- Never invent a confirmation id. Only use the one from the tool result.
If you don't know something, say so.`,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    tools: {
      getOpeningHours: tool({
        description: "Get Harbour Cafe's opening hours for a day of the week",
        inputSchema: z.object({
          day: z.string().describe("Day of the week, e.g. monday"),
        }),
        execute: async ({ day }) => {
          const key = day.toLowerCase();
          return {
            day,
            hours: key in hours ? formatHours(hours[key]) : "Unknown day",
          };
        },
      }),
      createBooking: tool({
        description:
          "Book a table at Harbour Cafe.  Only call this when name, date, time and party size are all known.",
        inputSchema: z.object({
          name: z.string().describe("Guest name exactly as given"),
          date: z.string().describe("Booking date as YYYY-MM-DD"),
          time: z.string().describe("Booking time as 24h HH:mm, e.g. 11:00"),
          partySize: z.number().describe("Number of guests"),
          notes: z
            .string()
            .optional()
            .describe("Extra requests, e.g. high chair"),
        }),
        execute: async (booking): Promise<BookingResult> => {
          const problems = checkBooking(booking);
          if (problems.length > 0) {
            return {
              ok: false,
              problems: problems,
            };
          }
          // No database yet. Later this is where we save to Postgres.
          return { ok: true, confirmationId: makeConfirmationId(), booking };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
