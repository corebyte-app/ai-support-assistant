import { generateText, Output, isStepCount } from "ai";
import { z } from "zod";
import { cafeTools } from "@/lib/tools";
import { cafeInstructions } from "@/lib/prompt";
import { aucklandToday } from "@/lib/booking";
import { sql } from "@/lib/db";
import { cases, type EvalCase } from "@/evals/cases";

const MODEL = "openai/gpt-5-mini";

async function judge(input: string, reply: string, expect: string) {
  const { output } = await generateText({
    model: MODEL,
    instructions:
      "You check a cafe chatbot's reply. Pass it only if it does what is expected. Be strict but fair.",
    output: Output.object({
      schema: z.object({
        pass: z.boolean(),
        reason: z.string().describe("One short sentence"),
      }),
    }),
    prompt: `Guest: ${input}\nBot reply: ${reply}\nExpected: ${expect}`,
  });
  return output;
}

async function trial(c: EvalCase) {
  const start = Date.now();
  const result = await generateText({
    model: MODEL,
    instructions: cafeInstructions(aucklandToday()),
    prompt: c.input,
    tools: cafeTools,
    stopWhen: isStepCount(5),
    maxOutputTokens: 1000,
  });
  const called = result.steps
    .flatMap((s) => s.toolCalls)
    .map((t) => t.toolName);
  const problems: string[] = [];
  if (c.mustCall && !called.includes(c.mustCall))
    problems.push(`did not call ${c.mustCall}`);
  for (const t of c.mustNotCall ?? [])
    if (called.includes(t)) problems.push(`called ${t}`);
  const verdict = await judge(c.input, result.text, c.expect);
  if (!verdict.pass) problems.push(verdict.reason);
  return {
    called,
    problems,
    reply: result.text,
    ms: Date.now() - start,
    tokens: result.usage.totalTokens,
  };
}

const RUNS = 3;
const PASS_AT = 2;
let passed = 0;
let n = 0;
for (const c of cases) {
  let succeeded = 0;
  for (let i = 0; i < RUNS; i++) {
    n++;
    const { called, problems, reply, ms, tokens } = await trial(c);
    const ok = problems.length === 0;
    if (ok) succeeded++;
    console.log(
      `${ok ? "✅" : "❌"} [${i + 1}/${RUNS}] ${c.input}  [${called.join(", ") || "no tools"}]  ${ms}ms  ${tokens ?? "?"} tokens`,
    );
    if (!ok) console.log(`   reply: ${reply}\n   why: ${problems.join("; ")}`);

    if (n < cases.length * RUNS)
      await new Promise((r) => setTimeout(r, 45_000)); // wait 45s: free plan allows 5 calls/min
  }
  if (succeeded >= PASS_AT) passed++;
  console.log(`${succeeded >= PASS_AT ? "✅" : "❌"} ${c.input}  ${succeeded}/${RUNS}`);
}

console.log(`\n${passed}/${cases.length} passed`);

// Next.js app doesn't need this, because the server keeps running and reuses the connection. It's only for one-off scripts like this one and your seed script.
await sql.end({ timeout: 5 }); // close the DB, wait at most 5s
process.exit(passed === cases.length ? 0 : 1);
