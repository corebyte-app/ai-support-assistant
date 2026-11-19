import { embed } from "ai";
import { sql } from "@/lib/db";

export async function searchKnowledge(query: string) {
  // Same model as the seed script, so the numbers are comparable
  const { embedding } = await embed({
    model: "voyage/voyage-4-lite",
    value: query,
  });

  const rows = await sql<{ content: string; similarity: number }[]>`
    select content,
           1 - (embedding <=> ${JSON.stringify(embedding)}::extensions.vector) as similarity
    from documents
    order by embedding <=> ${JSON.stringify(embedding)}::extensions.vector
    limit 3
  `;

  // Drop weak matches so the bot doesn't use unrelated text
  return rows.filter((r) => r.similarity > 0.3);
}
