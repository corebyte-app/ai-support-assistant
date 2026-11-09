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

const hours: Record<string, string> = {
  monday: "7am-3pm",
  tuesday: "7am-3pm",
  wednesday: "7am-3pm",
  thursday: "7am-3pm",
  friday: "7am-3pm",
  saturday: "8am-2pm",
  sunday: "Closed",
};

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "openai/gpt-5-mini",
    instructions:
      "You are a friendly support assistant for Harbour Cafe in Auckland. Use the getOpeningHours tool for any question about opening times. If you don't know something, say so.",
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(5),
    onStepEnd: ({ toolResults }) => {
      console.log("haha", toolResults);
    },
    tools: {
      getOpeningHours: tool({
        description: "Get Harbour Cafe's opening hours for a day of the week",
        inputSchema: z.object({
          day: z.string().describe("Day of the week, e.g. monday"),
        }),
        execute: async ({ day }) => ({
          day,
          hours: hours[day.toLowerCase()] ?? "Unknown day",
        }),
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
