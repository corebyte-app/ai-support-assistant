import { aucklandToday } from "@/lib/booking";
import { cafeInstructions } from "@/lib/prompt";
import { chatLimit } from "@/lib/ratelimit";
import { cafeTools } from "@/lib/tools";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  isTextUIPart,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

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
    maxOutputTokens: 1000,
    stopWhen: isStepCount(5),
    tools: cafeTools,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
