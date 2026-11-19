import {
  aucklandToday,
  BookingResult,
  checkBooking,
  makeConfirmationId,
  hours,
  formatHours,
} from "@/lib/booking";
import { searchKnowledge } from "@/lib/knowledge";
import { cafeInstructions } from "@/lib/prompt";
import { chatLimit } from "@/lib/ratelimit";
import {
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
  tool,
  isStepCount,
  isTextUIPart,
} from "ai";
import z from "zod";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";
  const res = await chatLimit.limit(ip);
  if (!res.success) {
    return new Response(
      "Too many messages. Please wait a minute and try again.",
      { status: 429 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  const last = messages.at(-1);
  const lastText =
    last?.parts
      ?.filter(isTextUIPart)
      .map((part) => part.text)
      .join("") ?? "";
  if (lastText.length > 1000) {
    return new Response(
      "Message is too long. Please keep it under 1000 characters.",
      { status: 400 },
    );
  }
  const today = aucklandToday();

  const result = streamText({
    model: "openai/gpt-5-mini",
    instructions: cafeInstructions(today),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 500,
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
      searchKnowledge: tool({
        description:
          "Search Harbour Cafe's info: menu, drinks, dietary options, kids, dogs, parking, payment, Wi-Fi, groups.",
        inputSchema: z.object({
          query: z.string().describe("The guest's question in short words"),
        }),
        execute: async ({ query }) => {
          const results = await searchKnowledge(query);
          return results.length
            ? { found: true, results: results.map((r) => r.content) }
            : { found: false };
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
